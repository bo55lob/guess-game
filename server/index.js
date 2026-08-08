const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const clientDist = path.join(__dirname, "../client/dist");
app.use(express.static(clientDist));
app.get("/health", (req, res) => res.status(200).send("ok"));
app.get("*", (req, res) => res.sendFile(path.join(clientDist, "index.html")));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });

const rooms = {};

io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    socket.on("createRoom", (playerName) => {
        const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        rooms[roomCode] = {
            started: false,
            finished: false,
            currentTurn: 0,
            currentQuestion: null,
            guessRevealActive: false,
            answers: [],
            questionHistory: [],
            players: [{ id: socket.id, name: playerName, answer: "", ready: false, eliminated: false }],
        };
        socket.join(roomCode);
        socket.emit("roomCreated", roomCode);
        io.to(roomCode).emit("playersUpdated", rooms[roomCode].players);
    });

    socket.on("joinRoom", ({ roomCode, playerName }) => {
        const room = rooms[roomCode];
        if (!room) return socket.emit("errorMessage", "Room not found.");
        if (room.started) return socket.emit("errorMessage", "Game already started.");
        if (room.players.some((player) => player.name.toLowerCase() === playerName.toLowerCase())) return socket.emit("errorMessage", "That name is already taken.");
        room.players.push({ id: socket.id, name: playerName, answer: "", ready: false, eliminated: false });
        socket.join(roomCode);
        io.to(roomCode).emit("playersUpdated", room.players);
    });

    socket.on("submitAnswer", ({ roomCode, answer }) => {
        const room = rooms[roomCode];
        const player = room?.players.find((p) => p.id === socket.id);
        if (!room || !player || !answer?.trim()) return;
        player.answer = answer.trim();
        player.ready = true;
        io.to(roomCode).emit("playersUpdated", room.players);
    });

    socket.on("startGame", (roomCode) => {
        const room = rooms[roomCode];
        if (!room || room.started || room.players.length < 2 || !room.players.every((p) => p.ready)) return;
        room.started = true;
        room.currentTurn = 0;
        io.to(roomCode).emit("gameStarted", { currentPlayer: room.players[room.currentTurn].name });
    });

    socket.on("askQuestion", ({ roomCode, question }) => {
        const room = rooms[roomCode];
        if (!room || !room.started || room.finished || room.guessRevealActive) return;
        const asker = room.players[room.currentTurn];
        if (!asker || asker.id !== socket.id || asker.eliminated || room.currentQuestion || !question?.trim()) return;
        room.currentQuestion = { player: asker.name, question: question.trim(), answers: [] };
        room.answers = [];
        io.to(roomCode).emit("questionProgress", { player: asker.name, question: room.currentQuestion.question, answers: [], pendingPlayers: room.players.filter((p) => !p.eliminated && p.id !== asker.id).map((p) => p.name), answeredPlayers: [] });
    });

    socket.on("answerQuestion", ({ roomCode, answer }) => {
        const room = rooms[roomCode];
        if (!room || !room.currentQuestion || room.finished) return;
        const player = room.players.find((p) => p.id === socket.id);
        const asker = room.players.find((p) => p.name === room.currentQuestion.player);
        if (!player || player.eliminated || !asker || player.id === asker.id || !["Yes", "No", "Maybe"].includes(answer) || room.answers.some((a) => a.player === player.name)) return;
        room.answers.push({ player: player.name, answer });
        room.currentQuestion.answers = room.answers;
        const pendingPlayers = room.players.filter((p) => !p.eliminated && p.id !== asker.id && !room.answers.some((a) => a.player === p.name)).map((p) => p.name);
        io.to(roomCode).emit("questionProgress", { player: asker.name, question: room.currentQuestion.question, answers: room.answers, pendingPlayers, answeredPlayers: room.answers.map((a) => a.player) });
        if (pendingPlayers.length === 0) {
            room.questionHistory.push({ asker: asker.name, question: room.currentQuestion.question, answers: room.answers });
            io.to(roomCode).emit("questionHistory", room.questionHistory);
            room.currentQuestion = null;
            advanceTurn(room, roomCode);
        }
    });

    socket.on("makeGuess", ({ roomCode, targetPlayer, guess }) => {
        const room = rooms[roomCode];
        if (!room || !room.started || room.finished || room.guessRevealActive || room.currentQuestion) return;
        const guesser = room.players[room.currentTurn];
        const target = room.players.find((p) => p.id === targetPlayer);
        if (!guesser || guesser.id !== socket.id || guesser.eliminated || !target || target.eliminated || target.id === guesser.id || !guess?.trim()) return;
        room.guessRevealActive = true;
        io.to(roomCode).emit("guessRevealStart", { guesser: guesser.name, target: target.name, guess: guess.trim(), duration: 3 });
        setTimeout(() => {
            const correct = target.answer.trim().toLowerCase() === guess.trim().toLowerCase();
            if (correct) target.eliminated = true;
            io.to(roomCode).emit("playersUpdated", room.players);
            io.to(roomCode).emit("guessResult", { correct, message: correct ? `${guesser.name} guessed correctly! ${target.name} has been eliminated.` : `${guesser.name}'s guess was wrong. ${target.name} stays in the game.` });
            room.guessRevealActive = false;
            const activePlayers = room.players.filter((p) => !p.eliminated);
            if (activePlayers.length <= 1) {
                room.finished = true;
                if (activePlayers[0]) io.to(roomCode).emit("gameWinner", { winner: activePlayers[0].name });
                return;
            }
            advanceTurn(room, roomCode);
        }, 3000);
    });

    socket.on("disconnect", () => {
        for (const [roomCode, room] of Object.entries(rooms)) {
            const index = room.players.findIndex((p) => p.id === socket.id);
            if (index !== -1) {
                room.players.splice(index, 1);
                if (room.players.length === 0) delete rooms[roomCode];
                else {
                    if (room.currentTurn >= room.players.length) room.currentTurn = 0;
                    io.to(roomCode).emit("playersUpdated", room.players);
                }
            }
        }
    });

    function advanceTurn(room, roomCode) {
        const activePlayers = room.players.filter((p) => !p.eliminated);
        if (activePlayers.length <= 1) return;
        const currentPlayerId = room.players[room.currentTurn]?.id;
        let index = activePlayers.findIndex((p) => p.id === currentPlayerId);
        index = index === -1 ? 0 : (index + 1) % activePlayers.length;
        room.currentTurn = room.players.findIndex((p) => p.id === activePlayers[index].id);
        io.to(roomCode).emit("nextTurn", { player: activePlayers[index].name });
    }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
