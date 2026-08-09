import PlayerList from "./PlayerList";

function WaitingRoom({ darkMode, themeToggle, joinedRoom, answer, setAnswer, onSubmitAnswer, players, onStartGame }) {
  const everyoneReady = players.length > 0 && players.every((p) => p.ready);
  return (
    <div className={`app-shell ${darkMode ? "theme-dark" : "theme-light"}`}>
      <header className="game-header compact-header">
        <div><span className="eyebrow">ROOM</span><h1>{joinedRoom}</h1></div>
        <div className="header-actions"><div className="room-badge">Waiting for players</div>{themeToggle}</div>
      </header>
      <main className="waiting-layout">
        <section className="panel secret-panel">
          <span className="panel-label">YOUR SECRET</span><h2>Choose your answer</h2>
          <p className="muted">This is what the other players are trying to discover.</p>
          <div className="inline-form"><input placeholder="Secret answer" value={answer} onChange={(e) => setAnswer(e.target.value)} /><button className="primary-button" onClick={onSubmitAnswer}>Ready</button></div>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><span className="panel-label">PLAYERS</span><h2>Who's here?</h2></div><span className="count-badge">{players.length}</span></div>
          <PlayerList players={players} showStatus />
          {everyoneReady && <button className="primary-button full-button" onClick={onStartGame}>Start Game</button>}
        </section>
      </main>
    </div>
  );
}

export default WaitingRoom;
