# Guess Hit - Real-time Multiplayer Guessing Game

A fun, real-time multiplayer guessing game where players take turns being the Game Master and creating questions for others to guess.

## Features

✅ **All Requirements Implemented:**

1. ✅ Chat-like game session interface
2. ✅ Create game sessions (Game Master role)
3. ✅ Join game sessions before game starts
4. ✅ View number of connected players in real-time
5. ✅ Game Master can create questions with answers
6. ✅ Game requires 2+ players to start
7. ✅ Players get 3 attempts to guess the answer
8. ✅ Cannot join while game is in progress
9. ✅ Game ends when a player wins or time expires (60 seconds)
10. ✅ Winner gets 10 points and all players see the result
11. ✅ Players can see each other's scores
12. ✅ Rotating Game Master system
13. ✅ Session cleanup when all players leave

## How to Play

### Starting the Game

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Open the game in your browser:**
   Navigate to `http://localhost:3000`

### Creating a Game Session

1. Enter your name
2. Click "Create New Game"
3. You'll become the first Game Master
4. Share the 4-character game code with friends

### Joining a Game Session

1. Enter your name
2. Enter the game code
3. Click "Join Game"
4. Wait for the Game Master to start

### Playing as Game Master

1. Create a question and answer
2. Click "Start Game" when at least 2 players are present
3. Watch as players try to guess your answer
4. After the round ends, another player becomes Game Master

### Playing as a Player

1. Read the question when the game starts
2. Enter your guess
3. You have 3 attempts and 60 seconds
4. First correct answer wins 10 points!
5. Take turns being the Game Master

## Game Rules

- **Minimum Players:** 2 players required to start
- **Time Limit:** 60 seconds per round
- **Attempts:** 3 attempts per player per round
- **Scoring:** 10 points for correct answer
- **Turn System:** Game Master rotates after each round
- **Session Management:** Game deleted when all players leave

## Tech Stack

- **Backend:** Node.js, Express, Socket.io
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Real-time Communication:** WebSockets via Socket.io

## Project Structure

```
guessHit/
├── server.js           # Main server file with game logic
├── public/
│   └── index.html      # Frontend UI with chat interface
├── package.json        # Dependencies
└── README.md          # This file
```

## Socket Events

### Client → Server
- `createSession` - Create a new game session
- `joinSession` - Join an existing session
- `setQuestion` - Set question and answer (Game Master only)
- `startGame` - Start the game (Game Master only)
- `submitGuess` - Submit a guess
- `leaveSession` - Leave the current session

### Server → Client
- `playerJoined` - New player joined
- `playerLeft` - Player left the session
- `gameStarted` - Game round started
- `guessSubmitted` - Player submitted a guess
- `playerWon` - A player won the round
- `timeExpired` - Time ran out
- `nextMaster` - New Game Master assigned
- `gameEnded` - Game ended (not enough players)

## Development

To modify the game:

1. **Server Logic:** Edit `server.js`
   - Session management
   - Game rules
   - Socket event handlers

2. **Frontend UI:** Edit `public/index.html`
   - User interface
   - Client-side socket handlers
   - Styling

## Future Enhancements

- Custom time limits
- Different game modes
- Leaderboards
- Sound effects
- Mobile-optimized UI
- Private/public sessions
- Spectator mode

## License

ISC

---

Made with ❤️ for fun multiplayer gaming!
