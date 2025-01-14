const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Game rooms storage
const gameRooms = new Map();

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join room
  socket.on('joinRoom', ({ roomId, playerName }) => {
    const room = gameRooms.get(roomId) || {
      players: [],
      currentTurn: 0,
      scores: {},
      timer: 30,
      totalTurn: 0,
      smilingPlayer: [],
      isGameStarted: false
    };

    // Add player to room
    const player = {
      id: socket.id,
      name: playerName,
      score: 0
    };
    
    room.players.push(player);
    room.scores[socket.id] = 0;
    gameRooms.set(roomId, room);
    
    socket.join(roomId);
    io.to(roomId).emit('playerJoined', { players: room.players, scores: room.scores });
    const usersInThisRoom = room.players.filter(id => id !== socket.id)
    socket.emit('all users', usersInThisRoom);
  });


  // Start game
  socket.on('startGame', ({roomId, rounds = 1}) => {
    const room = gameRooms.get(roomId);
    if (room) {
      room.isGameStarted = true;
      room.currentTurn = 0;
      room.timer = 30;
      room.players.forEach((player) => {
        room.scores[player.id] = 0;
      })
      room.totalTurn = room.players.length * rounds;
      room.timerInterval = setInterval(() => {
        room.timer--;
        
        // Emit timer update
        io.to(roomId).emit('timerUpdate', room.timer);
        
        // Handle timer end
        if (room.timer <= 0) {
          room.totalTurn--;
          // Move to next player
          room.currentTurn = (room.currentTurn + 1) % room.players.length;
          room.timer = 30;
          room.smilingPlayer = [];
          
          // Emit turn change
          io.to(roomId).emit('turnChange', {
            scores: room.scores,
            currentPlayer: room.players[room.currentTurn].id,
            smilingPlayer: [],
            timer: room.timer
          });

          if (room.totalTurn === 0) {
            clearInterval(room.timerInterval);
            io.to(roomId).emit('endGame', room.scores);
          }
        }


      }, 1000);
      
      io.to(roomId).emit('gameStarted', {
        currentPlayer: room.players[0].id,
        timer: room.timer
      });
    }
    else {
      console.log("room not found")
    }
  });

  // Handle smile detection
  socket.on('smileDetected', ({ roomId }) => {
    const room = gameRooms.get(roomId);
    if (room && room.players[room.currentTurn].id != socket.id) {
      // Award points to currentTurn players
          const currentPlayerId = room.players[room.currentTurn].id;
          const isExist = room.smilingPlayer.includes(socket.id)
          if(!isExist){
            room.scores[currentPlayerId] += 1;
            room.smilingPlayer.push(socket.id)
            io.to(roomId).emit('updateSmilePlayer', {
              scores: room.scores,
              smilingPlayer: room.smilingPlayer
            });
          }
            
          
      
    }
  });

  socket.on("nextTurn",({roomId}) => {
    const room = gameRooms.get(roomId);
    if(room && room.players[room.currentTurn].id === socket.id){
      room.currentTurn = (room.currentTurn + 1) % room.players.length;
      io.to(roomId).emit('turnChange', {
        scores: room.scores,
        currentPlayer: room.players[room.currentTurn].id,
        smilingPlayer: [],
        timer: room.timer
      });
    }
  })

  // simple-peer
  socket.on("sending signal", payload => {
    io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
  })

  socket.on("returning signal", payload => {
    io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
  })

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Clean up player from rooms
    for (const [roomId, room] of gameRooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        delete room.scores[socket.id];
        if (room.players.length === 0) {
          if (room.timerInterval) {
            clearInterval(room.timerInterval);
          }
          gameRooms.delete(roomId);
        } else {
          // If current player left, move to next player
          if (room.isGameStarted && room.players[room.currentTurn].id === socket.id) {
            room.currentTurn = (room.currentTurn + 1) % room.players.length;
            room.timer = 30;
            room.smilingPlayer = [];
            io.to(roomId).emit('turnChange', {
              scores: room.scores,
              currentPlayer: room.players[room.currentTurn].id,
              smilingPlayer: [],
              timer: room.timer
            });
          }
          io.to(roomId).emit('playerLeft', {
            players: room.players,
            scores: room.scores
          });
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});