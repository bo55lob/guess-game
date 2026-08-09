function PlayerList({ players, currentTurn, name, showStatus = false }) {
  return (
    <div className="player-list">
      {players.map((p) => (
        <div className={p.name === currentTurn ? "player-row current-player" : "player-row"} key={p.id}>
          <span className="player-avatar">{p.name.charAt(0).toUpperCase()}</span>
          <span className="player-name">{p.name}{p.name === name && <small>YOU</small>}</span>
          {showStatus ? <span className={p.ready ? "status ready" : "status waiting"}>{p.ready ? "Ready" : "Not ready"}</span> : p.name === currentTurn && <span className="turn-dot">●</span>}
        </div>
      ))}
    </div>
  );
}

export default PlayerList;
