const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
    },
});


const rooms = {};



io.on("connection", (socket) => {

    console.log("Player connected:", socket.id);



    // CREATE ROOM
    socket.on("createRoom", (playerName) => {

        const roomCode = Math.random()
            .toString(36)
            .substring(2, 7)
            .toUpperCase();


        rooms[roomCode] = {
            started: false,

            currentTurn: 0,

            currentQuestion: null,

            answers: [],

            questionHistory: [],

            players: [
                {
                    id: socket.id,
                    name: playerName,
                    answer: "",
                    ready: false,
                    eliminated: false,
                }
            ]

        };


        socket.join(roomCode);


        socket.emit(
            "roomCreated",
            roomCode
        );


        io.to(roomCode).emit(
            "playersUpdated",
            getPublicPlayers(rooms[roomCode])
        );


        console.log(
            `${playerName} created ${roomCode}`
        );

    });




    // JOIN ROOM
    socket.on(
        "joinRoom",
        ({ roomCode, playerName }) => {


            const room = rooms[roomCode];


            if (!room) {

                socket.emit(
                    "errorMessage",
                    "Room does not exist"
                );

                return;
            }



            room.players.push({

                id: socket.id,

                name: playerName,

                answer: "",

                ready: false,

                eliminated: false,

            });



            socket.join(roomCode);



            io.to(roomCode).emit(
                "playersUpdated",
                getPublicPlayers(room)
            );



            console.log(
                `${playerName} joined ${roomCode}`
            );

        }
    );






    // SUBMIT ANSWER
    socket.on(
        "submitAnswer",
        ({ roomCode, answer }) => {


            const room = rooms[roomCode];

            if (!room) return;



            const player =
                room.players.find(
                    p => p.id === socket.id
                );



            if (!player) return;



            player.answer = answer;

            player.ready = true;



            io.to(roomCode).emit(
                "playersUpdated",
                getPublicPlayers(room)
            );


            console.log(
                `${player.name} is ready`
            );

        }
    );







    // START GAME
    socket.on(
        "startGame",
        (roomCode) => {


            const room = rooms[roomCode];


            if (!room) return;



            const everyoneReady =
                room.players.length > 0 &&
                room.players.every(
                    p => p.ready
                );



            if (!everyoneReady) {

                socket.emit(
                    "errorMessage",
                    "Not everyone is ready"
                );

                return;
            }




            room.started = true;

            room.currentTurn = 0;



            io.to(roomCode).emit(
                "gameStarted",
                {
                    currentPlayer:
                    room.players[0].name
                }
            );



            console.log(
                `Game started in ${roomCode}`
            );

        }
    );








    // ASK QUESTION
    socket.on(
    "askQuestion",
    ({ roomCode, question }) => {


        const room = rooms[roomCode];

        if (!room) return;


        const currentPlayer =
            room.players[
                room.currentTurn
            ];


        if (currentPlayer.id !== socket.id) {
            return;
        }


        room.currentQuestion = {
            asker: currentPlayer.name,
            question: question,
            answers: []
        };


        room.answers = [];


        io.to(roomCode).emit(
            "newQuestion",
            {
                player: currentPlayer.name,
                question: question
            }
        );


    }
);









    // ANSWER QUESTION
    socket.on(
    "answerQuestion",
    ({ roomCode, answer }) => {


        const room = rooms[roomCode];

        if (!room) return;



        const player =
            room.players.find(
                p => p.id === socket.id
            );


        if (!player) return;



        room.answers.push({

            player: player.name,

            answer: answer

        });



        room.currentQuestion.answers.push({

            player: player.name,

            answer: answer

        });



        io.to(roomCode).emit(
            "questionAnswers",
            room.answers
        );



        const activePlayers =
            room.players.filter(
                p => !p.eliminated
            );



        if (
            room.answers.length ===
            activePlayers.length - 1
        ) {


            room.questionHistory.push(
                room.currentQuestion
            );


            io.to(roomCode).emit(
                "questionHistory",
                room.questionHistory
            );



            room.currentTurn =
                (
                    room.currentTurn + 1
                )
                %
                room.players.length;



            room.currentQuestion = null;



            io.to(roomCode).emit(
                "nextTurn",
                {
                    player:
                    room.players[
                        room.currentTurn
                    ].name
                }
            );


        }


    }
);









    // MAKE GUESS
    socket.on(
    "makeGuess",
    ({ roomCode, targetPlayer, guess }) => {


        const room = rooms[roomCode];

        if (!room) return;


        const target = room.players.find(
            p => p.id === targetPlayer
        );


        if (!target) return;



        const correct =
            target.answer.toLowerCase()
            === guess.toLowerCase();



        if (correct) {


            target.eliminated = true;



            io.to(roomCode).emit(
                "guessResult",
                {
                    message:
                    `${target.name} was eliminated!`
                }
            );



            const remaining =
                room.players.filter(
                    p => !p.eliminated
                );



            // WIN CONDITION
            if (remaining.length === 1) {


                io.to(roomCode).emit(
                    "gameWinner",
                    {
                        winner:
                        remaining[0].name
                    }
                );


                return;

            }



        } else {


            io.to(roomCode).emit(
                "guessResult",
                {
                    message:
                    "Wrong guess!"
                }
            );


        }



        io.to(roomCode).emit(
            "playersUpdated",
            getPublicPlayers(room)
        );

    }
);








    // DISCONNECT
    socket.on(
        "disconnect",
        () => {


            console.log(
                "Disconnected:",
                socket.id
            );



            for (
                const roomCode in rooms
            ) {


                rooms[roomCode].players =
                rooms[roomCode].players.filter(
                    p => p.id !== socket.id
                );



                if (
                    rooms[roomCode].players.length === 0
                ) {

                    delete rooms[roomCode];

                }

            }

        }
    );


});







function getPublicPlayers(room) {

    return room.players.map(
        player => ({

            id: player.id,

            name: player.name,

            ready: player.ready,

            eliminated: player.eliminated,

        })
    );

}







server.listen(
    3001,
    () => {

        console.log(
            "Server running on port 3001"
        );

    }
);