function GuessConfirmationModal({ guessConfirmation, onCancel, onConfirm }) {
  if (!guessConfirmation) return null;
  return <div className="guess-modal-backdrop"><div className="guess-modal"><span className="panel-label">CONFIRM GUESS</span><h2>Are you sure?</h2><p>You are guessing that <strong>{guessConfirmation.targetName}</strong>'s secret is:</p><div className="guess-preview">“{guessConfirmation.guess}”</div><p className="muted">This will use your turn.</p><div className="modal-actions"><button onClick={onCancel}>Cancel</button><button className="primary-button" onClick={onConfirm}>Make Guess</button></div></div></div>;
}

export default GuessConfirmationModal;
