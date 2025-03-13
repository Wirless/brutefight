# Multiplayer 2D Game

A simple multiplayer 2D game with real-time player movement using Node.js, Express, and Socket.io.

## Features

- Real-time multiplayer communication using WebSockets (Socket.io)
- Player login system with unique usernames
- Infinite world with automatic map generation
- Player movement with WASD keys
- Player data persistence using JSON files in the server's accounts directory
- Save file integrity verification (cloud save vs. local save)
- Minimap for navigation
- Canvas-based 2D rendering

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later recommended)
- npm (included with Node.js)

## Installation

1. Clone this repository or download the source code
2. Navigate to the project directory in your terminal
3. Install the dependencies:

```bash
npm install
```

## Running the Game Server

Start the server:

```bash
npm start
```

For development with auto-restart on file changes:

```bash
npm run dev
```

## How to Play

1. Open your web browser and go to `http://127.0.0.1` or `http://localhost`
2. Enter a username to join the game
3. Use WASD to move your character around the infinite world
4. Your position is saved automatically
5. Open multiple browser tabs to see other players moving in real-time

## Project Structure

- `server.js` - Main server file handling WebSocket connections and game logic
- `public/` - Client-side files
  - `index.html` - Game HTML structure
  - `game.js` - Client-side game logic and rendering
- `playername.json` - Main player data reference file
- `accounts/` - Directory containing individual player save files

## Player Data

Player data is stored in both `playername.json` and individual files in the `accounts/` directory, including:
- Player positions (x, y coordinates)
- Player colors
- Player stats (HP, Mana, attributes, etc.)

## Save File Integrity

The game verifies local save data against server save data:
- If a local save exists, it's sent to the server during login
- The server compares it with its own save data
- If they don't match, the server forces the client to download the cloud save

## Next Steps / Todo

- Add collision detection
- Implement game objects and interactions
- Add chat functionality
- Create game rooms for multiple separate games
- Add detailed player statistics and progression
- Implement combat system 