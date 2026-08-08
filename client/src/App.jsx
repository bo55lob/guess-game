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
  const [pendingPlayers, setPendingPlayers] = useState([]);
  const [answeredPlayers, setAnsweredPlayers] = useState([]);
  const [guessPlayer, setGuessPlayer] = useState("");
  const [guess, setGuess] = useState("");
  const [guessConfirmation, setGuessConfirmation] = useState(null);
  const [message, setMessage] = useState("");
  const [winner, setWinner] = useState("");
  const [history, setHistory] = useState([]);
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
      setMessage("");
    });

    socket.on("guessResult", ({ correct, guesser, target, guess: submittedGuess, message: resultMessage }) => {
      setMessage(resultMessage);
      setGuessConfirmation(null);
      setGuess("");
      setGuessPlayer("");
    });
    socket.on("gameWinner", ({ winner }) => setWinner(winner));
    socket.on("questionHistory", setHistory);
    socket.on("errorMessage", (error) => setMessage(error));

    return () => {
      socket.off("playersUpdated");
      socket.off("gameStarted");
      socket.off("questionProgress");
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
    if (!question.trim() || !isMyTurn) return;
    socket.emit("askQuestion", { roomCode: joinedRoom, question });
    setQuestion("");
  }

  function answerQuestion(value) {
    socket.emit("answerQuestion", { roomCode: joinedRoom, answer: value });
  }

  function openGuessConfirmation() {
    if (!isMyTurn || !guessPlayer || !guess.trim()) return;
    const target = activePlayers.find((player) => player.id === guessPlayer);
    if (!target) return;

    setGuessConfirmation({
      targetName: target.name,
      targetId: target.id,
      guess: guess.trim(),
    });
  }

  function confirmGuess() {
    if (!guessConfirmation || !isMyTurn) return;

    socket.emit("makeGuess", {
      roomCode: joinedRoom,
      targetPlayer: guessConfirmation.targetId,
      guess: guessConfirmation.guess,
    });
  }

  const isMyTurn = currentTurn === name;
  const activePlayers = players.filter((p) => !p.eliminated);
  const eliminatedPlayers = players.filter((p) => p.eliminated);
  const hasAnswered = answeredPlayers.includes(name);
  const isAsking = currentQuestion?.player === name;
  const responseTotal = questionAnswers.length + pendingPlayers.length;

  const themeToggle = (
    <button
      className="theme-toggle"
      onClick={() => setDarkMode((value) => !value)}
      aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
      title={`Switch to ${darkMode ? "light" : "dark"} mode`}
    >
      <span>{darkMode ? "☀️" : "🌙"}</span>
      {darkMode ? "Light" : "Dark"}
    </button>
  );

  if (!joinedRoom) {
    return (
      <div className={`app-shell lobby-shell ${darkMode ? "theme-dark" : "theme-light"}`}>
        <header className="game-header">
          <div><span className="eyebrow">DEDUCTION GAME</span><h1>Guess Game</h1><p>Ask questions. Read the answers. Find their secret.</p></div>
          {themeToggle}
        </header>
        <main className="lobby-card">
          <h2>Join a game</h2><p className="muted">Create a room for your friends or enter an existing room code.</p>
          <label>Your name</label><input placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="lobby-actions"><button className="primary-button" onClick={createRoom} disabled={!name.trim()}>Create Room</button></div>
          <div className="divider"><span>OR</span></div>
          <label>Room code</label><div className="inline-form"><input placeholder="ABCDE" value={room} maxLength={5} onChange={(e) => setRoom(e.target.value.toUpperCase())} /><button onClick={joinRoom} disabled={!name.trim() || room.length !== 5}>Join Room</button></div>
        </main>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className={`app-shell ${darkMode ? "theme-dark" : "theme-light"}`}>
        <header className="game-header compact-header"><div><span className="eyebrow">ROOM</span><h1>{joinedRoom}</h1></div><div className="header-actions"><div className="room-badge">Waiting for players</div>{themeToggle}</div></header>
        <main className="waiting-layout">
          <section className="panel secret-panel"><span className="panel-label">YOUR SECRET</span><h2>Choose your answer</h2><p className="muted">This is what the other players are trying to discover.</p><div className="inline-form"><input placeholder="Secret answer" value={answer} onChange={(e) => setAnswer(e.target.value)} /><button className="primary-button" onClick={submitAnswer}>Ready</button></div></section>
          <section className="panel"><div className="panel-heading"><div><span className="panel-label">PLAYERS</span><h2>Who's here?</h2></div><span className="count-badge">{players.length}</span></div><div className="player-list">{players.map((p) => <div className="player-row" key={p.id}><span className="player-avatar">{p.name.charAt(0).toUpperCase()}</span><span>{p.name}</span><span className={p.ready ? "status ready" : "status waiting"}>{p.ready ? "Ready" : "Not ready"}</span></div>)}</div>{players.length > 0 && players.every((p) => p.ready) && <button className="primary-button full-button" onClick={startGame}>Start Game</button>}</section>
        </main>
      </div>
    );
  }

  return (
    <div className={`app-shell game-shell ${darkMode ? "theme-dark" : "theme-light"}`}>
      <header className="game-header compact-header"><div><span className="eyebrow">GUESS GAME</span><h1>Room {joinedRoom}</h1></div><div className="header-actions"><div className={isMyTurn ? "turn-badge your-turn" : "turn-badge"}>{isMyTurn ? "🎯 Your turn" : `${currentTurn}'s turn`}</div>{themeToggle}</div></header>

      {winner ? (
        <main className="winner-panel"><div className="winner-icon">🏆</div><span className="eyebrow">GAME OVER</span><h2>{winner} wins!</h2><p className="muted">They were the last player standing.</p></main>
      ) : (
        <main className="game-layout">
          <aside className="sidebar"><section className="panel"><div className="panel-heading"><div><span className="panel-label">PLAYERS</span><h2>In the game</h2></div><span className="count-badge">{activePlayers.length}</span></div><div className="player-list">{activePlayers.map((p) => <div className={p.name === currentTurn ? "player-row current-player" : "player-row"} key={p.id}><span className="player-avatar">{p.name.charAt(0).toUpperCase()}</span><span className="player-name">{p.name}{p.name === name && <small>YOU</small>}</span>{p.name === currentTurn && <span className="turn-dot">●</span>}</div>)}</div>{eliminatedPlayers.length > 0 && <div className="eliminated-section"><span className="panel-label">ELIMINATED</span>{eliminatedPlayers.map((p) => <div className="player-row eliminated" key={p.id}><span className="player-avatar">{p.name.charAt(0).toUpperCase()}</span><span>{p.name}</span><span>💀</span></div>)}</div>}</section></aside>

          <section className="main-column">
            {currentQuestion ? (
              <section className="panel question-panel"><div className="question-meta"><span className="panel-label">CURRENT QUESTION</span><span className="response-count">{questionAnswers.length}/{responseTotal} answered</span></div><p className="asker">{currentQuestion.player} asks:</p><h2 className="question-text">“{currentQuestion.question}”</h2>
                {!isAsking && !hasAnswered && <div className="answer-area"><p className="instruction">What is your answer?</p><div className="answer-buttons"><button onClick={() => answerQuestion("Yes")}>Yes</button><button onClick={() => answerQuestion("No")}>No</button><button onClick={() => answerQuestion("Maybe")}>Maybe</button></div></div>}
                {!isAsking && hasAnswered && <div className="waiting-message success-message">✓ Your answer is locked in. Waiting for the others.</div>}
                {isAsking && <div className="waiting-message">👀 Waiting for everyone else to answer.</div>}
                <div className="response-list"><div className="response-heading">Responses</div>{questionAnswers.map((a) => <div className="response-row answered" key={a.player}><span className="response-icon">✓</span><span className="response-player">{a.player}</span><strong>{a.answer}</strong></div>)}{pendingPlayers.map((player) => <div className="response-row pending" key={player}><span className="response-icon">…</span><span className="response-player">{player}</span><span>Waiting for answer</span></div>)}</div>
              </section>
            ) : isMyTurn ? (
              <section className="panel action-panel"><span className="panel-label">YOUR TURN</span><h2>What do you want to do?</h2><p className="muted">Ask a question to gather information, or make a guess if you think you know someone's secret.</p>
                <div className="action-card"><h3>Ask a question</h3><div className="inline-form"><input placeholder="e.g. Is your character human?" value={question} onChange={(e) => setQuestion(e.target.value)} /><button className="primary-button" onClick={askQuestion}>Ask</button></div></div>
                <div className="action-divider"><span>OR</span></div>
                <div className="action-card guess-card"><h3>Make a guess</h3><div className="guess-form"><select value={guessPlayer} onChange={(e) => setGuessPlayer(e.target.value)}><option value="">Choose a player</option>{activePlayers.filter((p) => p.name !== name).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input placeholder="Their secret answer" value={guess} onChange={(e) => setGuess(e.target.value)} /><button className="primary-button" onClick={openGuessConfirmation} disabled={!guessPlayer || !guess.trim()}>Make Guess</button></div></div>
              </section>
            ) : (
              <section className="panel waiting-turn-panel"><div className="waiting-icon">👀</div><span className="panel-label">WAITING</span><h2>{currentTurn}'s turn</h2><p className="muted">They can ask a question or make a guess. Watch the history and plan your next move.</p></section>
            )}

            {message && <div className="game-message">{message}</div>}

            <section className="panel history-panel"><div className="panel-heading"><div><span className="panel-label">QUESTION HISTORY</span><h2>What we've learned</h2></div><span className="count-badge">{history.length}</span></div>{history.length === 0 ? <p className="empty-history">No questions yet. The game starts when the first player asks one.</p> : <div className="history-list">{[...history].reverse().map((item, index) => <div className="history-card" key={`${item.asker}-${item.question}-${index}`}><div className="history-question"><span>{item.asker}</span><strong>“{item.question}”</strong></div><div className="history-answers">{item.answers.map((a) => <span key={a.player} className="history-answer"><b>{a.player}</b> {a.answer}</span>)}</div></div>)}</div>}</section>
          </section>
        </main>
      )}

      {guessConfirmation && isMyTurn && (
        <div className="guess-modal-backdrop" role="presentation">
          <div className="guess-modal" role="dialog" aria-modal="true" aria-labelledby="guess-confirm-title">
            <span className="panel-label">CONFIRM GUESS</span>
            <h2 id="guess-confirm-title">Are you sure?</h2>
            <p>You are guessing that <strong>{guessConfirmation.targetName}</strong>'s secret is:</p>
            <div className="guess-preview">“{guessConfirmation.guess}”</div>
            <p className="muted">This will use your turn.</p>
            <div className="modal-actions"><button onClick={() => setGuessConfirmation(null)}>Cancel</button><button className="primary-button" onClick={confirmGuess}>Make Guess</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
