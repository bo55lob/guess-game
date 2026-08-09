function Lobby({ darkMode, themeToggle, name, setName, room, setRoom, onCreateRoom, onJoinRoom }) {
  return (
    <div className={`app-shell lobby-shell ${darkMode ? "theme-dark" : "theme-light"}`}>
      <header className="game-header">
        <div><span className="eyebrow">DEDUCTION GAME</span><h1>Guess Game</h1><p>Ask questions. Read the answers. Find their secret.</p></div>
        {themeToggle}
      </header>
      <main className="lobby-card">
        <h2>Join a game</h2>
        <p className="muted">Create a room for your friends or enter an existing room code.</p>
        <label>Your name</label>
        <input placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="lobby-actions"><button className="primary-button" onClick={onCreateRoom} disabled={!name.trim()}>Create Room</button></div>
        <div className="divider"><span>OR</span></div>
        <label>Room code</label>
        <div className="inline-form">
          <input placeholder="ABCDE" value={room} maxLength={5} onChange={(e) => setRoom(e.target.value.toUpperCase())} />
          <button onClick={onJoinRoom} disabled={!name.trim() || room.length !== 5}>Join Room</button>
        </div>
      </main>
    </div>
  );
}

export default Lobby;
