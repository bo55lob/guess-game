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

  const [guessPlayer, setGuessPlayer] = useState("");
  const [guess, setGuess] = useState("");

  const [message, setMessage] = useState("");

  const [winner, setWinner] = useState("");

  const [history, setHistory] = useState([]);


  useEffect(() => {

    socket.on("playersUpdated", (players) => {
      setPlayers(players);
    });


    socket.on("gameStarted", ({currentPlayer}) => {
      setGameStarted(true);
      setCurrentTurn(currentPlayer);
    });


    socket.on("newQuestion", (data) => {
      setCurrentQuestion(data);
    });


    socket.on("nextTurn", ({player}) => {
      setCurrentTurn(player);
      setCurrentQuestion(null);
    });


    socket.on("guessResult", (data) => {
      setMessage(data.message);
    });

    socket.on("gameWinner", ({winner})=>{
      setWinner(winner);
    });

    socket.on("questionHistory", (history)=>{
      setHistory(history);
    });
        
    return () => {
      socket.off("playersUpdated");
      socket.off("gameStarted");
      socket.off("newQuestion");
      socket.off("nextTurn");
      socket.off("guessResult");
      socket.off("gameWinner");
      socket.off("questionHistory");
    };

  }, []);




  function createRoom() {

    socket.emit(
      "createRoom",
      name
    );


    socket.on(
      "roomCreated",
      code => setJoinedRoom(code)
    );

  }




  function joinRoom() {

    socket.emit(
      "joinRoom",
      {
        roomCode: room,
        playerName: name
      }
    );

    setJoinedRoom(room);

  }





  function submitAnswer() {

    socket.emit(
      "submitAnswer",
      {
        roomCode: joinedRoom,
        answer: answer
      }
    );

  }





  function startGame() {

    socket.emit(
      "startGame",
      joinedRoom
    );

  }





  function askQuestion() {

    socket.emit(
      "askQuestion",
      {
        roomCode: joinedRoom,
        question: question
      }
    );

    setQuestion("");

  }





  function answerQuestion(value) {

    socket.emit(
      "answerQuestion",
      {
        roomCode: joinedRoom,
        answer:value
      }
    );

  }





  function makeGuess() {

    socket.emit(
      "makeGuess",
      {
        roomCode: joinedRoom,
        targetPlayer: guessPlayer,
        guess: guess
      }
    );

    setGuess("");

  }




  return (

    <div>


      <h1>Guess Game</h1>



      {!joinedRoom ? (

        <>

          <input
            placeholder="Name"
            value={name}
            onChange={e=>setName(e.target.value)}
          />

          <button onClick={createRoom}>
            Create Room
          </button>


          <br/>


          <input
            placeholder="Room code"
            value={room}
            onChange={e=>setRoom(e.target.value)}
          />

          <button onClick={joinRoom}>
            Join Room
          </button>

        </>


      ) : !gameStarted ? (

        <>

          <h2>
            Room: {joinedRoom}
          </h2>


          <input
            placeholder="Secret answer"
            value={answer}
            onChange={e=>setAnswer(e.target.value)}
          />


          <button onClick={submitAnswer}>
            Ready
          </button>



          <h3>Players</h3>

          {
            players.map((p)=>(

              <p key={p.id}>
                {p.name}
                {" "}
                {p.ready ? "✅":"⏳"}
              </p>

            ))
          }



          {
            players.length > 0 &&
            players.every(p=>p.ready) &&

            <button onClick={startGame}>
              Start Game
            </button>
          }


        </>



      ) : (


        <>

          <h2>
            Current turn: {currentTurn}
          </h2>
          <h2>
📜 History
</h2>

{
history.map((item,index)=>(

<div key={index}>

<b>{item.asker}</b>

<p>
{item.question}
</p>

{
item.answers.map((a,i)=>(

<p key={i}>
{a.player}: {a.answer}
</p>

))
}

<hr/>

</div>

))
}
          
           {
            winner &&
            <h1>
              🎉 {winner} wins!
            </h1>
          }  

          {
            currentQuestion &&

            <>

              <h3>
                {currentQuestion.player} asks:
              </h3>

              <h2>
                {currentQuestion.question}
              </h2>



              {
                currentQuestion.player !== name &&

                <div>

                  <button onClick={()=>
                    answerQuestion("Yes")
                  }>
                    Yes
                  </button>


                  <button onClick={()=>
                    answerQuestion("No")
                  }>
                    No
                  </button>


                  <button onClick={()=>
                    answerQuestion("Maybe")
                  }>
                    Maybe
                  </button>

                </div>
              }

            </>

          }



          {
            currentTurn === name &&
            !currentQuestion &&

            <>

              <input
                placeholder="Ask question..."
                value={question}
                onChange={e=>setQuestion(e.target.value)}
              />


              <button onClick={askQuestion}>
                Ask
              </button>

            </>

          }





          <h3>Make Guess</h3>


          <select
            value={guessPlayer}
            onChange={e=>setGuessPlayer(e.target.value)}
          >

            <option value="">
              Select player
            </option>


            {
              players
              .filter(
                p =>
                p.name !== name &&
                !p.eliminated
              )
              .map(p=>(

                <option
                  key={p.id}
                  value={p.id}
                >
                  {p.name}
                </option>

              ))
            }

          </select>



          <input
            placeholder="Their answer"
            value={guess}
            onChange={e=>setGuess(e.target.value)}
          />


          <button onClick={makeGuess}>
            Guess
          </button>



          <p>
            {message}
          </p>


        </>

      )}

    </div>

  );

}

export default App;