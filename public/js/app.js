const socket = io();
let currentSession = null;
let myPlayerId = null;
let gameTimer = null;

// ============================================
// SCREEN MANAGEMENT
// ============================================

function showScreen(screenId) {
  document.querySelectorAll('.lobby-screen, .game-screen').forEach(el => {
    el.classList.add('hidden');
  });
  document.getElementById(screenId).classList.remove('hidden');
}

function showError(message) {
  const errorEl = document.getElementById('errorMessage');
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
  setTimeout(() => errorEl.classList.add('hidden'), 5000);
}

// ============================================
// MESSAGE HANDLING
// ============================================

function addLobbyMessage(message, type = 'system') {
  const messagesEl = document.getElementById('lobbyMessages');
  const msgEl = document.createElement('div');
  msgEl.className = `chat-message ${type}`;
  msgEl.textContent = message;
  messagesEl.appendChild(msgEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addGameMessage(message, type = 'system') {
  const messagesEl = document.getElementById('gameMessages');
  const msgEl = document.createElement('div');
  msgEl.className = `chat-message ${type}`;
  msgEl.textContent = message;
  messagesEl.appendChild(msgEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ============================================
// PLAYER LIST MANAGEMENT
// ============================================

function updatePlayersList(players, masterId, inGame = false) {
  const listEl = document.getElementById(inGame ? 'gamePlayersList' : 'playersList');
  listEl.innerHTML = '';
  
  players.forEach(player => {
    const isMaster = player.id === masterId;
    const isMe = player.id === myPlayerId;
    
    const playerEl = document.createElement('div');
    playerEl.className = `player-item ${isMaster ? 'master' : ''}`;
    
    const nameEl = document.createElement('span');
    nameEl.className = 'player-name';
    nameEl.textContent = isMe ? `${player.name} (You)` : player.name;
    
    if (isMaster) {
      const badge = document.createElement('span');
      badge.className = 'master-badge';
      badge.textContent = '👑 Game Master';
      nameEl.appendChild(badge);
    }
    
    const scoreEl = document.createElement('span');
    scoreEl.className = 'player-score';
    scoreEl.textContent = `${player.score} pts`;
    
    playerEl.appendChild(nameEl);
    playerEl.appendChild(scoreEl);
    listEl.appendChild(playerEl);
  });

  document.getElementById('playerCount').textContent = players.length;
}

// ============================================
// SESSION ACTIONS
// ============================================

function createSession() {
  const name = document.getElementById('playerName').value.trim();
  if (!name) {
    showError('Please enter your name');
    return;
  }

  socket.emit('createSession', { name }, (response) => {
    if (response.success) {
      currentSession = response.session;
      myPlayerId = socket.id;
      showLobby();
    } else {
      showError(response.error);
    }
  });
}

function joinSession() {
  const name = document.getElementById('playerName').value.trim();
  const sessionId = document.getElementById('sessionIdInput').value.trim().toUpperCase();
  
  if (!name) {
    showError('Please enter your name');
    return;
  }
  
  if (!sessionId) {
    showError('Please enter a game code');
    return;
  }

  socket.emit('joinSession', { sessionId, name }, (response) => {
    if (response.success) {
      currentSession = response.session;
      myPlayerId = socket.id;
      showLobby();
    } else {
      showError(response.error);
    }
  });
}

function showLobby() {
  showScreen('lobbyScreen');
  document.getElementById('sessionCode').textContent = currentSession.sessionId;
  
  const isMaster = currentSession.players[currentSession.masterIndex].id === myPlayerId;
  
  if (isMaster) {
    document.getElementById('masterControls').classList.remove('hidden');
    document.getElementById('playerWaiting').classList.add('hidden');
  } else {
    document.getElementById('masterControls').classList.add('hidden');
    document.getElementById('playerWaiting').classList.remove('hidden');
    document.getElementById('masterName').textContent = currentSession.players[currentSession.masterIndex].name;
  }
  
  updatePlayersList(currentSession.players, currentSession.players[currentSession.masterIndex].id);
  addLobbyMessage('Welcome to the game! Waiting for more players...');
}

function leaveSession() {
  if (!currentSession) return;
  
  socket.emit('leaveSession', { sessionId: currentSession.sessionId }, (response) => {
    if (response.success) {
      currentSession = null;
      myPlayerId = null;
      showScreen('initialScreen');
      document.getElementById('playerName').value = '';
      document.getElementById('sessionIdInput').value = '';
    }
  });
}

// ============================================
// GAME ACTIONS
// ============================================

function startGame() {
  const question = document.getElementById('questionInput').value.trim();
  const answer = document.getElementById('answerInput').value.trim();
  
  if (!question || !answer) {
    showError('Please enter both question and answer');
    return;
  }

  socket.emit('setQuestion', { sessionId: currentSession.sessionId, question, answer }, (response) => {
    if (response.success) {
      socket.emit('startGame', { sessionId: currentSession.sessionId }, (response) => {
        if (!response.success) {
          showError(response.error);
        }
      });
    } else {
      showError(response.error);
    }
  });
}

function submitGuess() {
  const guess = document.getElementById('guessInput').value.trim();
  
  if (!guess) {
    showError('Please enter your guess');
    return;
  }

  socket.emit('submitGuess', { sessionId: currentSession.sessionId, guess }, (response) => {
    if (response.success) {
      document.getElementById('guessInput').value = '';
      
      if (response.correct) {
        addGameMessage('🎉 Correct! You won!', 'winner');
        document.getElementById('playerInput').classList.add('hidden');
      } else {
        addGameMessage(`❌ Incorrect. ${response.attemptsLeft} attempts left.`, 'error');
        updateAttemptsDisplay(response.attemptsLeft);
        
        if (response.attemptsLeft === 0) {
          document.getElementById('playerInput').classList.add('hidden');
          addGameMessage('No attempts left. Waiting for other players...', 'system');
        }
      }
    } else {
      showError(response.error);
    }
  });
}

function updateAttemptsDisplay(attempts) {
  const attemptsEl = document.getElementById('attemptsDisplay');
  attemptsEl.textContent = `Attempts left: ${attempts}`;
  attemptsEl.className = attempts <= 1 ? 'attempts-left low' : 'attempts-left';
}

// ============================================
// SOCKET EVENT HANDLERS
// ============================================

socket.on('connect', () => {
  document.getElementById('statusText').textContent = 'Connected';
  myPlayerId = socket.id;
});

socket.on('disconnect', () => {
  document.getElementById('statusText').textContent = 'Disconnected';
});

socket.on('playerJoined', (data) => {
  if (currentSession) {
    currentSession.players = data.players;
    updatePlayersList(data.players, data.currentMaster);
    addLobbyMessage(`${data.player.name} joined the game`, 'system');
  }
});

socket.on('playerLeft', (data) => {
  if (currentSession) {
    currentSession.players = data.players;
    currentSession.masterIndex = currentSession.players.findIndex(p => p.id === data.currentMaster);
    
    if (currentSession.phase === 'lobby') {
      updatePlayersList(data.players, data.currentMaster);
      addLobbyMessage('A player left the game', 'system');
      
      const isMaster = data.currentMaster === myPlayerId;
      if (isMaster) {
        document.getElementById('masterControls').classList.remove('hidden');
        document.getElementById('playerWaiting').classList.add('hidden');
      } else {
        document.getElementById('masterControls').classList.add('hidden');
        document.getElementById('playerWaiting').classList.remove('hidden');
        document.getElementById('masterName').textContent = currentSession.players[currentSession.masterIndex].name;
      }
    } else {
      updatePlayersList(data.players, data.currentMaster, true);
      addGameMessage('A player left the game', 'system');
    }
  }
});

socket.on('gameStarted', (data) => {
  if (currentSession) {
    currentSession.phase = 'playing';
    currentSession.players = data.players;
    
    showScreen('gameScreen');
    document.getElementById('gameSessionCode').textContent = currentSession.sessionId;
    document.getElementById('gameQuestion').textContent = data.question;
    
    const isMaster = currentSession.players[currentSession.masterIndex].id === myPlayerId;
    
    if (isMaster) {
      document.getElementById('masterView').classList.remove('hidden');
      document.getElementById('playerInput').classList.add('hidden');
    } else {
      document.getElementById('masterView').classList.add('hidden');
      document.getElementById('playerInput').classList.remove('hidden');
      updateAttemptsDisplay(3);
    }
    
    updatePlayersList(data.players, currentSession.players[currentSession.masterIndex].id, true);
    addGameMessage('Game started! Good luck!', 'system');
    
    // Start countdown timer
    let timeLeft = data.duration;
    document.getElementById('timeRemaining').textContent = timeLeft;
    
    gameTimer = setInterval(() => {
      timeLeft--;
      document.getElementById('timeRemaining').textContent = timeLeft;
      
      if (timeLeft <= 0) {
        clearInterval(gameTimer);
      }
    }, 1000);
  }
});

socket.on('guessSubmitted', (data) => {
  addGameMessage(`${data.playerName} made a guess (${data.attemptsLeft} attempts left)`, 'system');
});

socket.on('playerWon', (data) => {
  if (currentSession) {
    currentSession.phase = 'lobby';
    currentSession.players = data.players;
    
    if (gameTimer) {
      clearInterval(gameTimer);
      gameTimer = null;
    }
    
    const isWinner = data.winnerId === myPlayerId;
    
    if (isWinner) {
      addGameMessage(`🎉 You won! The answer was: ${data.answer}`, 'winner');
    } else {
      addGameMessage(`${data.winnerName} won! The answer was: ${data.answer}`, 'winner');
    }
    
    updatePlayersList(data.players, currentSession.players[currentSession.masterIndex].id, true);
    
    setTimeout(() => {
      addGameMessage('Returning to lobby...', 'system');
      setTimeout(() => showLobby(), 2000);
    }, 3000);
  }
});

socket.on('timeExpired', (data) => {
  if (currentSession) {
    currentSession.phase = 'lobby';
    currentSession.players = data.players;
    
    if (gameTimer) {
      clearInterval(gameTimer);
      gameTimer = null;
    }
    
    addGameMessage(`⏰ Time's up! The answer was: ${data.answer}`, 'system');
    updatePlayersList(data.players, currentSession.players[currentSession.masterIndex].id, true);
    
    setTimeout(() => {
      addGameMessage('Returning to lobby...', 'system');
      setTimeout(() => showLobby(), 2000);
    }, 3000);
  }
});

socket.on('nextMaster', (data) => {
  if (currentSession) {
    currentSession.players = data.players;
    currentSession.masterIndex = currentSession.players.findIndex(p => p.id === data.currentMaster);
    addLobbyMessage(`${data.masterName} is now the Game Master!`, 'system');
  }
});

socket.on('gameEnded', (data) => {
  if (currentSession) {
    currentSession.phase = 'lobby';
    
    if (gameTimer) {
      clearInterval(gameTimer);
      gameTimer = null;
    }
    
    addGameMessage(`Game ended: ${data.reason}`, 'system');
    
    setTimeout(() => {
      showLobby();
    }, 2000);
  }
});
