function QuestionHistory({ history }) {
  return (
    <section className="panel history-panel">
      <div className="panel-heading"><div><span className="panel-label">QUESTION HISTORY</span><h2>What we've learned</h2></div><span className="count-badge">{history.length}</span></div>
      {history.length === 0 ? <p className="empty-history">No questions yet. The game starts when the first player asks one.</p> : <div className="history-list">{[...history].reverse().map((item, index) => <div className="history-card" key={`${item.asker}-${item.question}-${index}`}><div className="history-question"><span>{item.asker}</span><strong>“{item.question}”</strong></div><div className="history-answers">{item.answers.map((a) => <span key={a.player} className="history-answer"><b>{a.player}</b> {a.answer}</span>)}</div></div>)}</div>}
    </section>
  );
}

export default QuestionHistory;
