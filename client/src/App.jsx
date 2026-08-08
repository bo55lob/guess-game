import { useState, useEffect } from "react";
import socket from "./socket";

function App() {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [joinedRoom, setJoinedRoom] = useState("");
  const [answer, setAnswer] = useState("");
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentTurn, setCurrentTurn] = useState("");
  const [question, setQuestion] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionAnswers, setQuestionAnswers] = useState([]);
  const [guessPlayer, setGuessPlayer] = useState("");
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState("");
  const [winner, setWinner] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    socket.on("playersUpdated", setPlayers);

    socket.on("gameStarted", ({ currentPlayer }) => {
      setGameStarted(true);
      setCurrentTurn(currentPlayer);
      setWinner("");
      setMessage("");
    });

    socket.on("newQuestion", (data) => {
      setCurrentQuestion(data);
      setQuestionAnswers([]);
      setMessage("");
    });

    socket.on("questionAnswers", setQuestionAnswers);

    socket.on("nextTurn", ({ player }) => {
      setCurrentTurn(player);
      setCurrentQuestion(null);
      setQuestionAnswers([]);
      setGuessPlayer("");
      setMessage("");
    });

    socket.on("guessResult", ({ message }) => setMessage(message));

    socket.on("gameWinner", ({ winner }) => setWinner(winner));

    socket.on("questionHistory", setHistory);

    socket.on("errorMessage", (error) => setMessage(error));

    return () => {
      socket.off("playersUpdated");
      socket.off("gameStarted");
      socket.off("newQuestion");
      socket.off("questionAnswers");
      socket.off("nextTurn");
      socket.off("guessResult");
      socket.off("gameWinner");
      socket.off("questionHistory");
      socket.off("errorMessage");
    };
  }, []);

  function createRoom() {
    socket.emit("createRoom", name);
    socket.once("roomCreated", (code) => setJoinedRoom(code));
  }

  function joinRoom() {
    socket.emit("joinRoom", {
      roomCode: room.toUpperCase(),
      playerName: name,
    });
    setJoinedRoom(room.toUpperCase());
  }

  function submitAnswer() {
    socket.emit("submitAnswer", {
      roomCode: joinedRoom,
      answer,
    });
  }

  function startGame() {
    socket.emit("startGame", joinedRoom);
  }

  function askQuestion() {
    if (!question.trim()) return;

    socket.emit("askQuestion", {
      roomCode: joinedRoom,
      question,
    });
    setQuestion("");
  }

  function answerQuestion(value) {
    socket.emit("answerQuestion", {
      roomCode: joinedRoom,
      answer: value,
    });
  }

  function makeGuess() {
    if (!guessPlayer || !guess.trim()) return;

    socket.emit("makeGuess", {
      roomCode: joinedRoom,
      targetPlayer: guessPlayer,
      guess,
    });
    setGuess("");
    setGuessPlayer("");
  }

  const isMyTurn = currentTurn === name;
  const activePlayers = players.filter((p) => !p.eliminated);

  return (
    <div>
      <h1>Guess Game</h1>

      {!joinedRoom ? (
        <>
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <button onClick={createRoom}>Create Room</button>

          <br />

          <input
            placeholder="Room code"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />

          <button onClick={joinRoom}>Join Room</button>
        </>
      ) : !gameStarted ? (
        <>
          <h2>Room: {joinedRoom}</h2>

          <input
            placeholder="Secret answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />

          <button onClick={submitAnswer}>Ready</button>

          <h3>Players</h3>
          {players.map((p) => (
            <p key={p.id}>
              {p.name} {p.ready ? "✅" : "⏳"}
            </p>
          ))}

          {players.length > 0 && players.every((p) => p.ready) && (
            <button onClick={startGame}>Start Game</button>
          )}
        </>
      ) : (
        <>
          {winner ? (
            <h1>🎉 {winner} wins!</h1>
          ) : (
            <>
              <h2>
                {isMyTurn ? "🎯 Your turn" : `${currentTurn}'s turn`}
              </h2>

              {currentQuestion && (
                <>
                  <h3>{currentQuestion.player} asks:</h3>
                  <h2>{currentQuestion.question}</h2>

                  {currentQuestion.player !== name &&
                    !currentQuestion.answers?.some((a) => a.player === name) && (
                      <div>
                        <button onClick={() => answerQuestion("Yes")}>Yes</button>
                        <button onClick={() => answerQuestion("No")}>No</button>
                        <button onClick={() => answerQuestion("Maybe")}>Maybe</button>
                      </div>
                    )}

                  {questionAnswers.length > 0 && (
                    <div>
                      <h3>Answers</h3>
                      {questionAnswers.map((a, index) => (
                        <p key={index}>
                          {a.player}: {a.answer}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              )}

              {isMyTurn && !currentQuestion && (
                <>
                  <h3>Ask a question</h3>
                  <input
                    placeholder="Ask question..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                  />
                  <button onClick={askQuestion}>Ask</button>

                  <h3>Or make a guess</h3>
                  <select
                    value={guessPlayer}
                    onChange={(e) => setGuessPlayer(e.target.value)}
                  >
                    <option value="">Select player</option>
                    {activePlayers
                      .filter((p) => p.name !== name)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>

                  <input
                    placeholder="Their answer"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                  />

                  <button onClick={makeGuess}>Guess</button>
                </>
              )}

              {!isMyTurn && !currentQuestion && (
                <p>Waiting for {currentTurn} to ask a question or make a guess...</p>
              )}

              <p>{message}</p>
            </>
          )}

          <h2>📜 History</h2>
          {history.map((item, index) => (
            <div key={index}>
              <b>{item.asker}</b>
              <p>{item.question}</p>
              {item.answers.map((a, i) => (
                <p key={i}>
                  {a.player}: {a.answer}
                </p>
              ))}
              <hr />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default App;
