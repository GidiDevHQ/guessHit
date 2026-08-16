# Guess Hit 🎯

A real-time multiplayer guessing game where players take turns being the Game Master and creating questions for others to guess.

## Features

- Real-time multiplayer gameplay with WebSockets
- Rotating Game Master system
- Session-based games with unique codes
- 3 attempts per player, 60-second time limit
- Live score tracking and leaderboard
- Chat-like interface with real-time updates

## Tech Stack

- **Backend:** Node.js, Express, Socket.io
- **Frontend:** Vanilla JavaScript, HTML5, CSS3

## Installation

```bash
# Install dependencies
npm install

# Start the server
npm start
```

The game will be available at `http://localhost:3000`

## How to Play

### Creating a Game
1. Enter your name
2. Click "Create New Game"
3. Share the 4-character game code with friends
4. Set a question and answer as Game Master
5. Start the game when at least 2 players have joined

### Joining a Game
1. Enter your name
2. Enter the game code
3. Wait for the Game Master to start
4. Guess the answer (3 attempts, 60 seconds)

### Scoring
- First correct answer: **10 points**
- After each round, a new player becomes Game Master
- Session ends when all players leave

## Deployment

The app is ready to deploy to Heroku, Railway, or Render.

### Quick Deploy to Railway (Free):
1. Push to GitHub
2. Go to [railway.app](https://railway.app)
3. Connect your repository
4. Deploy automatically

### Quick Deploy to Heroku:
```bash
heroku create your-app-name
git push heroku main
heroku open
```

The server uses `process.env.PORT` for dynamic port assignment.

## Project Structure

```
guessHit/
├── server.js              # Backend with game logic
├── public/
│   ├── index.html        # HTML structure
│   ├── css/
│   │   └── styles.css    # Styling
│   └── js/
│       └── app.js        # Client-side logic
├── package.json
├── .gitignore
├── .env.example
├── Procfile              # Heroku config
├── vercel.json           # Vercel config
└── render.yaml           # Render config
```

## Environment Variables

Create a `.env` file (see `.env.example`):

```
PORT=3000
NODE_ENV=development
```

## License

ISC

---

Built with ❤️ for multiplayer fun!
