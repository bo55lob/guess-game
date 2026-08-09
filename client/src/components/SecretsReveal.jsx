function SecretsReveal({ players, name, showSecrets, setShowSecrets }) {
  if (!players.some((p) => p.name !== name)) return null;
  const revealedPlayers = players.filter((p) => p.name !== name);
  return <div className="eliminated-answers"><span className="panel-label">SECRETS</span><p className="muted">You have been eliminated. You can choose to reveal everyone's secret answers.</p><button className="primary-button full-button" onClick={() => setShowSecrets((value) => !value)}>{showSecrets ? "Hide all answers" : "Reveal all answers"}</button>{showSecrets && <div className="secret-answers-list">{revealedPlayers.map((p) => <div className="secret-answer-row" key={p.id}><span className="player-avatar">{p.name.charAt(0).toUpperCase()}</span><div><strong>{p.name}</strong><span>{p.answer || "No answer"}</span></div></div>)}</div>}</div>;
}

export default SecretsReveal;
