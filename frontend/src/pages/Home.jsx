import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const [playerName, setPlayerName] = useState('');
  const navigate = useNavigate();

  const createRoom = () => {
    if (!playerName.trim()) return;
    const roomId = Math.random().toString(36).substring(2, 9);
    navigate(`/room/${roomId}`, { state: { playerName } });
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    const roomId = e.target.roomId.value;
    if (roomId) {
      navigate(`/room/${roomId}`, { state: { playerName } });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-3xl font-bold mb-6 text-center">🤣 Try Not to Laugh </h1>
        
        <div className="mb-4">
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white"
          />
        </div>

        <button
          onClick={createRoom}
          className="w-full bg-blue-600 text-white p-2 rounded mb-4 hover:bg-blue-700"
        >
          Create New Room
        </button>

        <form onSubmit={joinRoom} className="space-y-4">
          <input
            name="roomId"
            type="text"
            placeholder="Enter Room ID"
            className="w-full p-2 rounded bg-gray-700 text-white"
          />
          <button
            type="submit"
            className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700"
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
}

export default Home;