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

## Installation on Ubuntu 24.04

### Quick Installation (Recommended)

For a quick and automated installation that configures BruteFight to run on port 4444, use the installation script:

```bash
# Make the script executable
chmod +x install_brutefight.sh

# Run the installation script
./install_brutefight.sh
```

This script will:
1. Install Node.js and npm if not already installed
2. Create a directory for the game
3. Install required dependencies
4. Configure the game to run on port 4444
5. Set up a systemd service so the game runs in the background
6. Open the firewall port
7. Start the game server

After installation, you can access the game at:
- Local access: http://localhost:4444
- Remote access: http://YOUR_SERVER_IP:4444

### Manual Installation

If you prefer to install manually, follow these steps:

1. Install Node.js and npm:
   ```bash
   sudo apt update
   sudo apt install -y nodejs npm
   ```

2. Create a directory for the game:
   ```bash
   mkdir -p ~/brutefight
   cd ~/brutefight
   ```

3. Copy all game files to this directory

4. Install dependencies:
   ```bash
   npm install express socket.io
   ```

5. Configure the port to 4444:
   ```bash
   # Make the script executable
   chmod +x set_port.sh
   
   # Run the script to change the port
   ./set_port.sh
   ```

6. Create the accounts directory:
   ```bash
   mkdir -p accounts
   ```

7. Start the server:
   ```bash
   node server.js
   ```

For more detailed installation instructions, see the [LINUX_INSTALL.md](LINUX_INSTALL.md) file.

## Managing the Game Server

If you used the automated installation script, the game runs as a systemd service. You can manage it with these commands:

```bash
# Start the server
sudo systemctl start brutefight

# Stop the server
sudo systemctl stop brutefight

# Restart the server
sudo systemctl restart brutefight

# Check server status
sudo systemctl status brutefight

# View server logs
sudo journalctl -u brutefight
```

## Manual Start

If you prefer to run the server manually:

```bash
cd ~/brutefight
node server.js
```

To keep it running after you close the terminal:

```bash
cd ~/brutefight
nohup node server.js > brutefight.log 2>&1 &
```

## Troubleshooting

If you encounter issues:

1. Check if the port is already in use:
   ```bash
   sudo lsof -i :4444
   ```

2. Check server logs:
   ```bash
   sudo journalctl -u brutefight
   ```

3. Verify Node.js is installed correctly:
   ```bash
   node --version
   npm --version
   ```

4. Make sure the firewall allows connections to port 4444:
   ```bash
   sudo ufw status
   ```

For more troubleshooting tips, see the [LINUX_INSTALL.md](LINUX_INSTALL.md) file. 