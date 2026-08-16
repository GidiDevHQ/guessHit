const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

app.get('/favicon.ico', (req, res) => {
  res.sendStatus(204);
});

const sessions = {};

function generateSessionId(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjklmnpqrstuvwxyz0123456789';
  let sessionId = '';
  for (let i = 0; i < 4; i++) {
    sessionId += chars[Math.floor(Math.random() * chars.length)];
  } 
  return sessionId;
}

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    
    // Find and handle sessions where this player was a member
    for (const sessionId in sessions) {
      const session = sessions[sessionId];
      const playerIndex = session.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        // Remove player from session
        session.players.splice(playerIndex, 1);
        
        // If session is empty, delete it
        if (session.players.length === 0) {
          delete sessions[sessionId];
          console.log(`Session ${sessionId} deleted (no players left)`);
        } else {
          // Adjust master index if necessary
          if (session.masterIndex >= session.players.length) {
            session.masterIndex = 0;
          }
          
          // Notify remaining players
          io.to(sessionId).emit('playerLeft', {
            players: session.players,
            currentMaster: session.players[session.masterIndex].id
          });
          
          // If game was in progress and only one player left, end the game
          if (session.phase === 'playing' && session.players.length < 2) {
            session.phase = 'lobby';
            io.to(sessionId).emit('gameEnded', {
              reason: 'Not enough players',
              session
            });
          }
        }
        break;
      }
    }
  });

  socket.on('createSession', (data, callback) => {
    if (!data || !data.name) {
      return callback({ success: false, error: 'Name is required to create a session.' });
    }

    const sessionId = generateSessionId();
    const session = {
      sessionId,
      masterIndex: 0,
      players: [{ id: socket.id, name: data.name, score: 0, attemptsLeft: 3 }],
      phase: 'lobby',
      question: '',
      answer: '',
      startTime: null,
      duration: 60,
      timer: null
    };

    sessions[sessionId] = session;
    socket.join(sessionId);

    console.log('Session created:', sessionId, 'by', socket.id);
    callback({ success: true, sessionId, session });
  });

  socket.on('joinSession', (data, callback) => {
    if (!data || !data.sessionId || !data.name) {
      return callback({ success: false, error: 'Session ID and name are required.' });
    }

    const session = sessions[data.sessionId];
    
    if (!session) {
      return callback({ success: false, error: 'Session not found.' });
    }

    if (session.phase === 'playing') {
      return callback({ success: false, error: 'Game is in progress. Cannot join now.' });
    }

    // Check if player already in session
    const existingPlayer = session.players.find(p => p.id === socket.id);
    if (existingPlayer) {
      return callback({ success: false, error: 'You are already in this session.' });
    }

    const player = { id: socket.id, name: data.name, score: 0, attemptsLeft: 3 };
    session.players.push(player);
    socket.join(data.sessionId);

    console.log(`Player ${socket.id} joined session ${data.sessionId}`);
    
    // Notify all players in the session
    io.to(data.sessionId).emit('playerJoined', {
      player,
      players: session.players,
      currentMaster: session.players[session.masterIndex].id
    });

    callback({ success: true, session });
  });

  socket.on('setQuestion', (data, callback) => {
    if (!data || !data.sessionId || !data.question || !data.answer) {
      return callback({ success: false, error: 'Session ID, question, and answer are required.' });
    }

    const session = sessions[data.sessionId];
    
    if (!session) {
      return callback({ success: false, error: 'Session not found.' });
    }

    // Check if player is the game master
    if (session.players[session.masterIndex].id !== socket.id) {
      return callback({ success: false, error: 'Only the game master can set the question.' });
    }

    if (session.phase !== 'lobby') {
      return callback({ success: false, error: 'Cannot set question while game is in progress.' });
    }

    session.question = data.question;
    session.answer = data.answer.toLowerCase().trim();

    console.log(`Question set for session ${data.sessionId}`);
    callback({ success: true });
  });

  socket.on('startGame', (data, callback) => {
    if (!data || !data.sessionId) {
      return callback({ success: false, error: 'Session ID is required.' });
    }

    const session = sessions[data.sessionId];
    
    if (!session) {
      return callback({ success: false, error: 'Session not found.' });
    }

    // Check if player is the game master
    if (session.players[session.masterIndex].id !== socket.id) {
      return callback({ success: false, error: 'Only the game master can start the game.' });
    }

    if (session.players.length < 2) {
      return callback({ success: false, error: 'At least 2 players are required to start the game.' });
    }

    if (!session.question || !session.answer) {
      return callback({ success: false, error: 'Question and answer must be set before starting.' });
    }

    if (session.phase === 'playing') {
      return callback({ success: false, error: 'Game is already in progress.' });
    }

    // Reset attempts for all players
    session.players.forEach(player => {
      player.attemptsLeft = 3;
    });

    session.phase = 'playing';
    session.startTime = Date.now();

    // Start game timer
    session.timer = setTimeout(() => {
      if (session.phase === 'playing') {
        session.phase = 'lobby';
        
        // Notify all players that time expired
        io.to(data.sessionId).emit('timeExpired', {
          answer: session.answer,
          players: session.players
        });

        // Move to next game master
        session.masterIndex = (session.masterIndex + 1) % session.players.length;
        session.question = '';
        session.answer = '';

        io.to(data.sessionId).emit('nextMaster', {
          currentMaster: session.players[session.masterIndex].id,
          masterName: session.players[session.masterIndex].name,
          players: session.players
        });
      }
    }, session.duration * 1000);

    console.log(`Game started in session ${data.sessionId}`);
    
    // Notify all players that game has started
    io.to(data.sessionId).emit('gameStarted', {
      question: session.question,
      duration: session.duration,
      players: session.players
    });

    callback({ success: true });
  });

  socket.on('submitGuess', (data, callback) => {
    if (!data || !data.sessionId || !data.guess) {
      return callback({ success: false, error: 'Session ID and guess are required.' });
    }

    const session = sessions[data.sessionId];
    
    if (!session) {
      return callback({ success: false, error: 'Session not found.' });
    }

    if (session.phase !== 'playing') {
      return callback({ success: false, error: 'Game is not in progress.' });
    }

    const player = session.players.find(p => p.id === socket.id);
    
    if (!player) {
      return callback({ success: false, error: 'You are not in this session.' });
    }

    // Check if player is the game master
    if (session.players[session.masterIndex].id === socket.id) {
      return callback({ success: false, error: 'Game master cannot submit guesses.' });
    }

    if (player.attemptsLeft <= 0) {
      return callback({ success: false, error: 'No attempts left.' });
    }

    const guess = data.guess.toLowerCase().trim();
    const isCorrect = guess === session.answer;

    player.attemptsLeft--;

    // Broadcast guess to all players
    io.to(data.sessionId).emit('guessSubmitted', {
      playerName: player.name,
      attemptsLeft: player.attemptsLeft
    });

    if (isCorrect) {
      // Player won!
      player.score += 10;
      session.phase = 'lobby';

      // Clear timer
      if (session.timer) {
        clearTimeout(session.timer);
        session.timer = null;
      }

      // Notify all players of the win
      io.to(data.sessionId).emit('playerWon', {
        winnerId: player.id,
        winnerName: player.name,
        answer: session.answer,
        players: session.players
      });

      // Move to next game master
      session.masterIndex = (session.masterIndex + 1) % session.players.length;
      session.question = '';
      session.answer = '';

      io.to(data.sessionId).emit('nextMaster', {
        currentMaster: session.players[session.masterIndex].id,
        masterName: session.players[session.masterIndex].name,
        players: session.players
      });

      callback({ success: true, correct: true });
    } else {
      callback({ success: true, correct: false, attemptsLeft: player.attemptsLeft });
    }
  });

  socket.on('leaveSession', (data, callback) => {
    if (!data || !data.sessionId) {
      return callback({ success: false, error: 'Session ID is required.' });
    }

    const session = sessions[data.sessionId];
    
    if (!session) {
      return callback({ success: false, error: 'Session not found.' });
    }

    const playerIndex = session.players.findIndex(p => p.id === socket.id);
    
    if (playerIndex === -1) {
      return callback({ success: false, error: 'You are not in this session.' });
    }

    // Remove player from session
    session.players.splice(playerIndex, 1);
    socket.leave(data.sessionId);

    console.log(`Player ${socket.id} left session ${data.sessionId}`);

    // If session is empty, delete it
    if (session.players.length === 0) {
      if (session.timer) {
        clearTimeout(session.timer);
      }
      delete sessions[data.sessionId];
      console.log(`Session ${data.sessionId} deleted (no players left)`);
      return callback({ success: true });
    }

    // Adjust master index if necessary
    if (session.masterIndex >= session.players.length) {
      session.masterIndex = 0;
    }

    // Notify remaining players
    io.to(data.sessionId).emit('playerLeft', {
      players: session.players,
      currentMaster: session.players[session.masterIndex].id
    });

    // If game was in progress and only one player left, end the game
    if (session.phase === 'playing' && session.players.length < 2) {
      if (session.timer) {
        clearTimeout(session.timer);
        session.timer = null;
      }
      session.phase = 'lobby';
      io.to(data.sessionId).emit('gameEnded', {
        reason: 'Not enough players',
        session
      });
    }

    callback({ success: true });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});