const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "http://localhost:5173" },
});

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
            players: [{
                id: socket.id,
                name: playerName,
                answer: "",
                ready: false,
                eliminated: false,
            }],
        };

        socket.join(roomCode);
        socket.emit("roomCreated", roomCode);
        io.to(roomCode).emit("playersUpdated", getPublicPlayers(rooms[roomCode]));
        console.log(`${playerName} created ${roomCode}`);
    });

    socket.on("joinRoom", ({ roomCode, playerName }) => {
        const room = rooms[roomCode];
        if (!room) {
            socket.emit("errorMessage", "Room does not exist");
            return;
        }
        if (room.started) {
            socket.emit("errorMessage", "Game has already started");
            return;
        }

        room.players.push({ id: socket.id, name: playerName, answer: "", ready: false, eliminated: false });
        socket.join(roomCode);
        io.to(roomCode).emit("playersUpdated", getPublicPlayers(room));
        console.log(`${playerName} joined ${roomCode}`);
    });

    socket.on("submitAnswer", ({ roomCode, answer }) => {
        const room = rooms[roomCode];
        if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player || room.started) return;
        player.answer = answer.trim();
        player.ready = player.answer.length > 0;
        io.to(roomCode).emit("playersUpdated", getPublicPlayers(room));
    });

    socket.on("startGame", (roomCode) => {
        const room = rooms[roomCode];
        if (!room) return;
        const everyoneReady = room.players.length > 0 && room.players.every(p => p.ready);
        if (!everyoneReady) {
            socket.emit("errorMessage", "Not everyone is ready");
            return;
        }
        room.started = true;
        room.finished = false;
        room.currentTurn = 0;
        io.to(roomCode).emit("gameStarted", { currentPlayer: room.players[room.currentTurn].name });
    });

    socket.on("askQuestion", ({ roomCode, question }) => {
        const room = rooms[roomCode];
        if (!room || !room.started || room.finished || room.guessRevealActive) return;
        const currentPlayer = room.players[room.currentTurn];
        if (!currentPlayer || currentPlayer.eliminated || currentPlayer.id !== socket.id) return;
        if (room.currentQuestion || !question.trim()) return;
        room.currentQuestion = { asker: currentPlayer.name, question: question.trim(), answers: [], answeredBy: [] };
        room.answers = [];
        emitQuestionProgress(roomCode, room);
    });

    socket.on("answerQuestion", ({ roomCode, answer }) => {
        const room = rooms[roomCode];
        if (!room || !room.currentQuestion || room.finished || room.guessRevealActive) return;
        const player = room.players.find(p => p.id === socket.id);
        const currentPlayer = room.players[room.currentTurn];
        if (!player || player.eliminated || !currentPlayer || player.id === currentPlayer.id) return;
        if (room.currentQuestion.answeredBy.includes(player.id)) return;
        if (!["Yes", "No", "Maybe"].includes(answer)) return;

        room.currentQuestion.answeredBy.push(player.id);
        room.currentQuestion.answers.push({ player: player.name, answer });
        room.answers.push({ player: player.name, answer });
        emitQuestionProgress(roomCode, room);

        const activePlayers = room.players.filter(p => !p.eliminated);
        if (room.answers.length === activePlayers.length - 1) {
            room.questionHistory.push(room.currentQuestion);
            io.to(roomCode).emit("questionHistory", room.questionHistory);
            room.currentQuestion = null;
            room.answers = [];
            advanceTurn(room);
            emitTurn(roomCode, room);
        }
    });

    socket.on("makeGuess", ({ roomCode, targetPlayer, guess }) => {
        const room = rooms[roomCode];
        if (!room || !room.started || room.finished || room.guessRevealActive) return;

        const currentPlayer = room.players[room.currentTurn];
        if (!currentPlayer || currentPlayer.eliminated || currentPlayer.id !== socket.id) return;
        if (room.currentQuestion) return;

        const target = room.players.find(p => p.id === targetPlayer);
        if (!target || target.eliminated || target.id === socket.id) return;
        if (!guess || !guess.trim()) return;

        const cleanGuess = guess.trim();
        const correct = target.answer.trim().toLowerCase() === cleanGuess.toLowerCase();

        room.guessRevealActive = true;

        // Everyone gets the same dramatic reveal. The actual result is deliberately
        // withheld until the countdown has finished.
        io.to(roomCode).emit("guessRevealStart", {
            guesser: currentPlayer.name,
            target: target.name,
            guess: cleanGuess,
            duration: 3,
        });

        setTimeout(() => {
            const activeRoom = rooms[roomCode];
            if (!activeRoom || activeRoom.finished) return;

            room.guessRevealActive = false;

            if (correct) {
                target.eliminated = true;
                io.to(roomCode).emit("guessResult", {
                    correct: true,
                    guesser: currentPlayer.name,
                    target: target.name,
                    guess: cleanGuess,
                    message: `${currentPlayer.name} correctly guessed ${target.name}'s answer!`,
                });
                io.to(roomCode).emit("playersUpdated", getPublicPlayers(room));

                const remaining = room.players.filter(p => !p.eliminated);
                if (remaining.length === 1) {
                    room.finished = true;
                    io.to(roomCode).emit("gameWinner", { winner: remaining[0].name });
                    return;
                }

                room.currentTurn = findNextActiveIndex(room, room.currentTurn);
                emitTurn(roomCode, room);
            } else {
                io.to(roomCode).emit("guessResult", {
                    correct: false,
                    guesser: currentPlayer.name,
                    target: target.name,
                    guess: cleanGuess,
                    message: `${currentPlayer.name} guessed ${target.name}'s answer incorrectly.`,
                });
                advanceTurn(room);
                emitTurn(roomCode, room);
            }
        }, 3000);
    });

    socket.on("disconnect", () => {
        console.log("Disconnected:", socket.id);
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            const wasCurrentPlayer = room.players[room.currentTurn]?.id === socket.id;
            room.players = room.players.filter(p => p.id !== socket.id);
            if (room.players.length === 0) {
                delete rooms[roomCode];
                continue;
            }
            if (room.started && wasCurrentPlayer && !room.guessRevealActive) {
                room.currentTurn = findNextActiveIndex(room, room.currentTurn - 1);
                room.currentQuestion = null;
                room.answers = [];
                emitTurn(roomCode, room);
            }
            io.to(roomCode).emit("playersUpdated", getPublicPlayers(room));
        }
    });
});

function findNextActiveIndex(room, fromIndex) {
    if (room.players.length === 0) return 0;
    for (let offset = 1; offset <= room.players.length; offset++) {
        const index = (fromIndex + offset + room.players.length) % room.players.length;
        if (!room.players[index].eliminated) return index;
    }
    return 0;
}

function advanceTurn(room) { room.currentTurn = findNextActiveIndex(room, room.currentTurn); }

function emitTurn(roomCode, room) {
    const currentPlayer = room.players[room.currentTurn];
    if (!currentPlayer) return;
    io.to(roomCode).emit("nextTurn", { player: currentPlayer.name });
}

function emitQuestionProgress(roomCode, room) {
    const currentPlayer = room.players[room.currentTurn];
    const activeResponders = room.players.filter(p => !p.eliminated && p.id !== currentPlayer?.id);
    const answeredIds = new Set(room.currentQuestion.answeredBy);
    io.to(roomCode).emit("questionProgress", {
        player: room.currentQuestion.asker,
        question: room.currentQuestion.question,
        answers: room.currentQuestion.answers,
        pendingPlayers: activeResponders.filter(p => !answeredIds.has(p.id)).map(p => p.name),
        answeredPlayers: activeResponders.filter(p => answeredIds.has(p.id)).map(p => p.name),
        totalResponders: activeResponders.length,
    });
}

function getPublicPlayers(room) {
    return room.players.map(player => ({ id: player.id, name: player.name, ready: player.ready, eliminated: player.eliminated }));
}

server.listen(3001, () => { console.log("Server running on port 3001"); });
