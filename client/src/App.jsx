import { useState, useEffect } from "react";
import socket from "./socket";
import Lobby from "./components/Lobby";
import WaitingRoom from "./components/WaitingRoom";
import PlayerList from "./components/PlayerList";
import QuestionPanel from "./components/QuestionPanel";
import ActionPanel from "./components/ActionPanel";
import QuestionHistory from "./components/QuestionHistory";
import GuessConfirmationModal from "./components/GuessConfirmationModal";
import GuessReveal from "./components/GuessReveal";
import SecretsReveal from "./components/SecretsReveal";

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
  const [pendingPlayers, setPendingPlayers] = useState([]);
  const [answeredPlayers, setAnsweredPlayers] = useState([]);
  const [guessPlayer, setGuessPlayer] = useState("");
  const [guess, setGuess] = useState("");
  const [guessConfirmation, setGuessConfirmation] = useState(null);
  const [turnActionLocked, setTurnActionLocked] = useState(false);
  const [guessReveal, setGuessReveal] = useState(null);
  const [message, setMessage] = useState("");
  const [winner, setWinner] = useState("");
  const [history, setHistory] = useState([]);
  const [showSecrets, setShowSecrets] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("guess-game-theme");
    return saved ? saved === "dark" : true;
  });

  useEffect(() => {
    localStorage.setItem("guess-game-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    socket.on("playersUpdated", setPlayers);
    socket.on("gameStarted", ({ currentPlayer }) => {
      setGameStarted(true);
      setCurrentTurn(currentPlayer);
      setWinner("");
      setMessage("");
      setTurnActionLocked(false);
      setShowSecrets(false);
    });
    socket.on("questionProgress", (data) => {
      setCurrentQuestion({ player: data.player, question: data.question, answers: data.answers });
      setQuestionAnswers(data.answers);
      setPendingPlayers(data.pendingPlayers);
      setAnsweredPlayers(data.answeredPlayers);
      setMessage("");
    });
    socket.on("nextTurn", ({ player }) => {
      setCurrentTurn(player);
      setCurrentQuestion(null);
      setQuestionAnswers([]);
      setPendingPlayers([]);
      setAnsweredPlayers([]);
      setGuessPlayer("");
      setGuess("");
      setGuessConfirmation(null);
      setTurnActionLocked(false);
    });
    socket.on("guessRevealStart", ({ guesser, target, guess: submittedGuess, correct, duration }) => {
      setGuessReveal({ guesser, target, guess: submittedGuess, correct, countdown: duration || 3 });
      setMessage("");
    });
    socket.on("guessResult", ({ message: resultMessage, correct }) => {
      setGuessReveal((current) => current ? { ...current, countdown: 0, correct } : null);
      setMessage(resultMessage);
      setGuessConfirmation(null);
      setGuess("");
      setGuessPlayer("");
      setTimeout(() => setGuessReveal(null), 1600);
    });
    socket.on("gameWinner", ({ winner: gameWinner }) => setWinner(gameWinner));
    socket.on("questionHistory", setHistory);
    socket.on("errorMessage", (error) => {
      setMessage(error);
      setTurnActionLocked(false);
    });

    return () => {
      ["playersUpdated", "gameStarted", "questionProgress", "nextTurn", "guessRevealStart", "guessResult", "gameWinner", "questionHistory", "errorMessage"].forEach((event) => socket.off(event));
    };
  }, []);

  useEffect(() => {
    if (!guessReveal || guessReveal.countdown <= 0) return;
    const timer = setTimeout(() => {
      setGuessReveal((current) => current ? { ...current, countdown: current.countdown - 1 } : null);
    }, 1000);
    return () => clearTimeout(timer);
  }, [guessReveal]);

  function createRoom() {
    socket.emit("createRoom", name);
    socket.once("roomCreated", (code) => setJoinedRoom(code));
  }

  function joinRoom() {
    socket.emit("joinRoom", { roomCode: room.toUpperCase(), playerName: name });
    setJoinedRoom(room.toUpperCase());
  }

  function submitAnswer() {
    socket.emit("submitAnswer", { roomCode: joinedRoom, answer });
  }

  function startGame() {
    socket.emit("startGame", joinedRoom);
  }

  function askQuestion() {
    if (!question.trim() || !isMyTurn || turnActionLocked || guessReveal) return;
    socket.emit("askQuestion", { roomCode: joinedRoom, question });
    setQuestion("");
  }

  function answerQuestion(value) {
    if (isEliminated || isAsking || guessReveal) return;
    socket.emit("answerQuestion", { roomCode: joinedRoom, answer: value });
  }

  function openGuessConfirmation() {
    if (!isMyTurn || turnActionLocked || !guessPlayer || !guess.trim() || currentQuestion || guessReveal) return;
    const target = activePlayers.find((player) => player.id === guessPlayer);
    if (target) setGuessConfirmation({ targetName: target.name, targetId: target.id, guess: guess.trim() });
  }

  function confirmGuess() {
    if (!guessConfirmation || !isMyTurn || turnActionLocked || currentQuestion || guessReveal) return;
    setTurnActionLocked(true);
    socket.emit("makeGuess", {
      roomCode: joinedRoom,
      targetPlayer: guessConfirmation.targetId,
      guess: guessConfirmation.guess,
    });
  }

  const isMyTurn = currentTurn === name;
  const activePlayers = players.filter((p) => !p.eliminated);
  const eliminatedPlayers = players.filter((p) => p.eliminated);
  const me = players.find((p) => p.name === name);
  const isEliminated = Boolean(me?.eliminated);
  const hasAnswered = answeredPlayers.includes(name);
  const isAsking = currentQuestion?.player === name;

  const themeToggle = (
    <button
      className="theme-toggle"
      onClick={() => setDarkMode((value) => !value)}
      aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
    >
      <span>{darkMode ? "☀️" : "🌙"}</span>
      {darkMode ? "Light" : "Dark"}
    </button>
  );

  if (!joinedRoom) {
    return (
      <Lobby
        darkMode={darkMode}
        themeToggle={themeToggle}
        name={name}
        setName={setName}
        room={room}
        setRoom={setRoom}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
      />
    );
  }

  if (!gameStarted) {
    return (
      <WaitingRoom
        darkMode={darkMode}
        themeToggle={themeToggle}
        joinedRoom={joinedRoom}
        answer={answer}
        setAnswer={setAnswer}
        onSubmitAnswer={submitAnswer}
        players={players}
        onStartGame={startGame}
      />
    );
  }

  return (
    <div className={`app-shell game-shell ${darkMode ? "theme-dark" : "theme-light"}`}>
      <header className="game-header compact-header">
        <div>
          <span className="eyebrow">GUESS GAME</span>
          <h1>Room {joinedRoom}</h1>
        </div>
        <div className="header-actions">
          <div className={isMyTurn ? "turn-badge your-turn" : "turn-badge"}>
            {isMyTurn ? "🎯 Your turn" : `${currentTurn}'s turn`}
          </div>
          {themeToggle}
        </div>
      </header>

      {winner ? (
        <main className="winner-panel">
          <div className="winner-icon">🏆</div>
          <span className="eyebrow">GAME OVER</span>
          <h2>{winner} wins!</h2>
          <p className="muted">They were the last player standing.</p>
        </main>
      ) : (
        <main className="game-layout">
          <aside className="sidebar">
            <section className="panel">
              <div className="panel-heading">
                <div><span className="panel-label">PLAYERS</span><h2>In the game</h2></div>
                <span className="count-badge">{activePlayers.length}</span>
              </div>

              <PlayerList players={activePlayers} currentTurn={currentTurn} name={name} />

              {eliminatedPlayers.length > 0 && (
                <div className="eliminated-section">
                  <span className="panel-label">ELIMINATED</span>
                  {eliminatedPlayers.map((p) => (
                    <div className="player-row eliminated" key={p.id}>
                      <span className="player-avatar">{p.name.charAt(0).toUpperCase()}</span>
                      <span>{p.name}</span>
                      <span>💀</span>
                    </div>
                  ))}
                </div>
              )}

              {isEliminated && (
                <SecretsReveal
                  players={players}
                  name={name}
                  showSecrets={showSecrets}
                  setShowSecrets={setShowSecrets}
                />
              )}
            </section>
          </aside>

          <section className="main-column">
            {currentQuestion ? (
              <QuestionPanel
                currentQuestion={currentQuestion}
                questionAnswers={questionAnswers}
                pendingPlayers={pendingPlayers}
                isEliminated={isEliminated}
                isAsking={isAsking}
                hasAnswered={hasAnswered}
                onAnswer={answerQuestion}
              />
            ) : isMyTurn ? (
              <ActionPanel
                turnActionLocked={turnActionLocked}
                guessReveal={guessReveal}
                question={question}
                setQuestion={setQuestion}
                onAskQuestion={askQuestion}
                guessPlayer={guessPlayer}
                setGuessPlayer={setGuessPlayer}
                guess={guess}
                setGuess={setGuess}
                activePlayers={activePlayers}
                name={name}
                onOpenGuess={openGuessConfirmation}
              />
            ) : (
              <section className="panel waiting-turn-panel">
                <div className="waiting-icon">👀</div>
                <span className="panel-label">WAITING</span>
                <h2>{currentTurn}'s turn</h2>
                <p className="muted">They can ask a question or make a guess. Watch the history and plan your next move.</p>
              </section>
            )}

            {message && <div className="game-message">{message}</div>}

            <QuestionHistory history={history} />
          </section>
        </main>
      )}

      <GuessConfirmationModal
        guessConfirmation={guessConfirmation && isMyTurn && !currentQuestion && !turnActionLocked && !guessReveal ? guessConfirmation : null}
        onCancel={() => setGuessConfirmation(null)}
        onConfirm={confirmGuess}
      />

      <GuessReveal guessReveal={guessReveal} />
    </div>
  );
}

export default App;
