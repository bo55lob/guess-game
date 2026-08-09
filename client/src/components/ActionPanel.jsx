function ActionPanel({ turnActionLocked, guessReveal, question, setQuestion, onAskQuestion, guessPlayer, setGuessPlayer, guess, setGuess, activePlayers, name, onOpenGuess }) {
  const disabled = turnActionLocked || Boolean(guessReveal);
  return (
    <section className="panel action-panel">
      <span className="panel-label">YOUR TURN</span>
      <h2>{turnActionLocked ? "Guess submitted" : "Choose your move"}</h2>
      <p className="muted">{turnActionLocked ? "Your guess has used this turn. Waiting for the reveal." : "You can either ask a question to gather information or make a guess."}</p>
      <div className="action-card"><h3>Ask a question</h3><div className="inline-form"><input placeholder="e.g. Is your character human?" value={question} onChange={(e) => setQuestion(e.target.value)} disabled={disabled} /><button className="primary-button" onClick={onAskQuestion} disabled={disabled}>Ask</button></div></div>
      <div className="action-divider"><span>OR</span></div>
      <div className="action-card guess-card"><h3>Make a guess</h3><div className="guess-form"><select value={guessPlayer} onChange={(e) => setGuessPlayer(e.target.value)} disabled={disabled}><option value="">Choose a player</option>{activePlayers.filter((p) => p.name !== name).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input placeholder="Their secret answer" value={guess} onChange={(e) => setGuess(e.target.value)} disabled={disabled} /><button className="primary-button" onClick={onOpenGuess} disabled={disabled || !guessPlayer || !guess.trim()}>Make Guess</button></div></div>
    </section>
  );
}

export default ActionPanel;
