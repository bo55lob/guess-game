function GuessReveal({ guessReveal }) {
  if (!guessReveal) return null;
  const final = guessReveal.countdown === 0;
  return <div className="guess-reveal-backdrop"><div className={`guess-reveal ${final ? "reveal-final" : ""}`}><span className="reveal-eyebrow">GUESS REVEAL</span><div className="reveal-guesser">{guessReveal.guesser} thinks they know...</div><div className="reveal-target">{guessReveal.target}</div><div className="reveal-guess">“{guessReveal.guess}”</div><div className={`reveal-countdown ${final ? "reveal-result" : ""}`} style={final ? { display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", lineHeight: 1.1, overflowWrap: "anywhere", whiteSpace: "normal" } : undefined}>{final ? (guessReveal.correct ? "CORRECT" : "INCORRECT") : guessReveal.countdown}</div></div></div>;
}

export default GuessReveal;
