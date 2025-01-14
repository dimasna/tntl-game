import React, { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import * as faceapi from 'face-api.js';


const Video = (props) => {
  const ref = useRef();

  useEffect(() => {
    props.peer.on("stream", stream => {

      ref.current.srcObject = stream;
    })
  }, []);

  return <video
    ref={ref}
    autoPlay
    playsInline
    muted={!props.isCurrentTurn}
    className={`w-full h-full object-cover ${props.isSmileDetected ? 'filter-red' : ''
      }`}
  />

}

function GameRoom() {
  const { roomId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const playerName = state?.playerName;

  const [rounds, setRounds] = useState(1);
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [timer, setTimer] = useState(30);
  const [gameStarted, setGameStarted] = useState(false);
  // const [isSmileDetected, setIsSmileDetected] = useState(false);
  const [smilingPlayers, setSmilingPlayers] = useState([]);

  // simple-peer
  const [peers, setPeers] = useState([]);
  const socketRef = useRef(null);
  const userVideo = useRef(null);
  const peersRef = useRef([]);


  useEffect(() => {
    if (!playerName) {
      navigate('/');
      return;
    }

    // Initialize socket connection
    socketRef.current = io.connect(process.env.VITE_API_BASE_URL);

    // Load face-api models
    const loadModels = async () => {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceExpressionNet.loadFromUri('/models')
      ]);
    };
    loadModels();

    // Initialize video stream
    let stream;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(userStream => {
        stream = userStream;
        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }
        // Join room
        socketRef.current.emit('joinRoom', { roomId, playerName });

        // Listen for timer updates and turn changes from server
        socketRef.current.on('timerUpdate', (newTimer) => {
          setTimer(newTimer);
        });

        socketRef.current.on('turnChange', ({ currentPlayer: newPlayer, timer: newTimer, scores: newScores, smilingPlayer }) => {
          setCurrentPlayer(newPlayer);
          setTimer(newTimer);
          setScores(newScores);
          setSmilingPlayers(smilingPlayer);
        });

        socketRef.current.on("all users", users => {
          // console.log("users", users);
          // Clean up existing peers
          peersRef.current.forEach(({ peer }) => peer.destroy());
          peersRef.current = [];
          const peers = [];
          users.forEach(userID => {
            if (userID.id !== socketRef.current.id) {
              const peer = createPeer(userID.id, socketRef.current.id, stream);
              peersRef.current.push({
                peerID: userID.id,
                name: userID.name,
                peer,
              });
              peers.push(peer);
            }
          });
          setPeers(peers);
        });

        socketRef.current.on('playerJoined', ({ players: newPlayers, scores: newScores }) => {
          setPlayers(newPlayers);
          setScores(newScores);
        });

        socketRef.current.on("user joined", payload => {
          if (payload.callerID !== socketRef.current.id) {
            const existingPeer = peersRef.current.find(p => p.peerID === payload.callerID);
            if (!existingPeer) {
              const peer = addPeer(payload.signal, payload.callerID, stream);
              peersRef.current.push({
                peerID: payload.callerID,
                peer,
              });
              setPeers(users => [...users, peer]);
            }
          }
        });

        socketRef.current.on("receiving returned signal", payload => {
          const item = peersRef.current.find(p => p.peerID === payload.id);
          if (item) {
            item.peer.signal(payload.signal);
          }
        });

        socketRef.current.on("user left", userId => {
          const peerIndex = peersRef.current.findIndex(p => p.peerID === userId);
          if (peerIndex !== -1) {
            peersRef.current[peerIndex].peer.destroy();
            peersRef.current.splice(peerIndex, 1);
            setPeers(peers => peers.filter(peer => peer.peerID !== userId));
          }
        });

      })
      .catch(err => console.error('Error accessing camera:', err));

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      peersRef.current.forEach(({ peer }) => {
        peer.destroy();
      });
      peersRef.current = [];
      setPeers([]);
      if (userVideo.current) {
        userVideo.current?.getTracks().forEach(track => track.stop());
      }
      if (socketRef.current) {
        console.log("socket closed")
        socketRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.on('gameStarted', ({ currentPlayer: firstPlayer, timer: initialTimer }) => {

      setGameStarted(true);
      setScores((prevScores) => {
        const updatedScores = { ...prevScores };
        players.forEach((player) => {

          updatedScores[player.id] = 0;

        });
        return updatedScores;
      })
      setCurrentPlayer(firstPlayer);
      setTimer(initialTimer);
    });

    socketRef.current.on('endGame', ({ currentPlayer: firstPlayer, timer: initialTimer }) => {

      setGameStarted(false);
      setCurrentPlayer(firstPlayer);
      setTimer(initialTimer);
    });

    socketRef.current.on('turnChange', ({ scores: newScores, currentPlayer: nextPlayer, smilingPlayer, timer: newTimer }) => {
      setScores(newScores);
      setCurrentPlayer(nextPlayer);
      setTimer(newTimer);
      setSmilingPlayers(smilingPlayer)
    });

    socketRef.current.on('updateSmilePlayer', ({ scores: newScores, smilingPlayer: newSmilingPlayers }) => {
      setScores(newScores);
      setSmilingPlayers(newSmilingPlayers)
    });

    socketRef.current.on('playerLeft', ({ players: remainingPlayers, scores: updatedScores }) => {
      setPlayers(remainingPlayers);
      setScores(updatedScores);
    });
  }, [socketRef.current]);

  // Smile detection
  useEffect(() => {
    if (!userVideo.current || !gameStarted || socketRef.current.id == currentPlayer) return;

    const detectSmile = async () => {
      const detections = await faceapi
        .detectSingleFace(userVideo.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (detections && detections.expressions.happy > 0.8) {

        socketRef.current.emit('smileDetected', { roomId });
      }
    };

    const interval = setInterval(detectSmile, 100);
    return () => clearInterval(interval);
  }, [gameStarted, currentPlayer]);

  // Timer
  // Timer and turns are now managed server-side
  // All timer and turn updates are received through socket events

  function createPeer(userToSignal, callerID, stream) {
    const peer = new SimplePeer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on("signal", signal => {
      socketRef.current.emit("sending signal", { userToSignal, callerID, signal })
    })

    return peer;
  }

  function addPeer(incomingSignal, callerID, stream) {
    const peer = new SimplePeer({
      initiator: false,
      trickle: false,
      stream,
    })

    peer.on("signal", signal => {
      socketRef.current.emit("returning signal", { signal, callerID })
    })

    peer.signal(incomingSignal);

    return peer;
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">


<nav className="bg-white border-gray-200 dark:bg-gray-900">
  <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto py-4">
        <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">🤣 TNTL GAME</span>
  </div>

</nav>
<div className='divide-y-4 divide-slate-400/25'></div>

        {/* Game Header */}
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Room: {roomId}</h1>
          <div className="text-xl">Timer: {timer}s</div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Video Grid */}
          <div key={1} className="col-span-9 grid grid-cols-3 gap-4">
            <div

              className={`relative rounded-lg overflow-hidden ${currentPlayer === socketRef.current?.id ? 'ring-4 ring-yellow-400' : ''
                }`}
            >
              <video
                ref={userVideo}
                autoPlay
                playsInline
                muted={currentPlayer !== socketRef.current?.id}
                className={`w-full h-full object-cover ${smilingPlayers.includes(socketRef.current?.id) ? 'filter-red' : ''
                  }`}
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                {playerName}
              </div>
              {currentPlayer === socketRef.current?.id && (<div className="absolute top-2 left-2 bg-yellow-400 text-black px-2 py-1 rounded-full text-sm">
                Current Turn
              </div>)}
            </div>
            {peersRef.current.map((peer, index) => {
              return <div
                key={peer.peerID}
                className={`relative rounded-lg overflow-hidden ${currentPlayer === peer.peerID ? 'ring-4 ring-yellow-400' : ''
                  }`}
              >
                <Video peer={peer.peer} isSmileDetected={smilingPlayers.includes(peer.peerID)} isCurrentTurn={currentPlayer === peer.peerID} />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                  {players.find(p => p.id === peer.peerID)?.name}
                </div>
                {currentPlayer === peer.peerID && (
                  <div className="absolute top-2 left-2 bg-yellow-400 text-black px-2 py-1 rounded-full text-sm">
                    Current Turn
                  </div>
                )}
              </div>
            })
            }
          </div>

          {/* Leaderboard */}
          <div className="col-span-3 bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
            <div className="space-y-2">
              {players
                .sort((a, b) => scores[b.id] - scores[a.id])
                .map((player) => (
                  <div
                    key={player.id}
                    className="flex justify-between items-center bg-gray-700 p-2 rounded"
                  >
                    <span>{player.name}</span>
                    <span className="font-bold">{scores[player.id]}</span>
                  </div>
                ))}
            </div>

            {!gameStarted && players.length >= 2 && socketRef.current?.id === players[0].id && (
              <div className="mt-4">
                <label className="block mb-2">Rounds:</label>
                <input
                  type="number"
                  value={rounds}
                  onChange={(e) => setRounds(parseInt(e.target.value))}
                  placeholder='e.g 1'
                  className="w-full p-2 border rounded text-black"
                />

                <button
                  onClick={() => socketRef.current.emit('startGame', { roomId, rounds })}
                  className="mt-4 w-full bg-green-600 text-white p-2 rounded hover:bg-green-700"
                >
                  Start Game
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameRoom;