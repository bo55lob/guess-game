function QuestionPanel({ currentQuestion, questionAnswers, pendingPlayers, isEliminated, isAsking, hasAnswered, onAnswer }) {
  const responseTotal = questionAnswers.length + pendingPlayers.length;
  return (
    <section className="panel question-panel">
      <div className="question-meta"><span className="panel-label">CURRENT QUESTION</span><span className="response-count">{questionAnswers.length}/{responseTotal} answered</span></div>
      <p className="asker">{currentQuestion.player} asks:</p>
      <h2 className="question-text">“{currentQuestion.question}”</h2>
      {isEliminated && <div className="waiting-message eliminated-message">💀 You have been eliminated. You can watch the question and see everyone's answers, but you cannot answer.</div>}
      {!isEliminated && !isAsking && !hasAnswered && <div className="answer-area"><p className="instruction">What is your answer?</p><div className="answer-buttons"><button onClick={() => onAnswer("Yes")}>Yes</button><button onClick={() => onAnswer("No")}>No</button><button onClick={() => onAnswer("Maybe")}>Maybe</button></div></div>}
      {!isEliminated && !isAsking && hasAnswered && <div className="waiting-message success-message">✓ Your answer is locked in. Waiting for the others.</div>}
      {!isEliminated && isAsking && <div className="waiting-message">👀 Waiting for everyone else to answer.</div>}
      <div className="response-list">
        <div className="response-heading">Responses</div>
        {questionAnswers.map((a) => <div className="response-row answered" key={a.player}><span className="response-icon">✓</span><span className="response-player">{a.player}</span><strong>{a.answer}</strong></div>)}
        {pendingPlayers.map((player) => <div className="response-row pending" key={player}><span className="response-icon">…</span><span className="response-player">{player}</span><span>Waiting for answer</span></div>)}
      </div>
    </section>
  );
}

export default QuestionPanel;
