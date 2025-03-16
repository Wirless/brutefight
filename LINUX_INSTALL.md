# BruteFight - Linux Installation Guide

This guide will help you install and run BruteFight on Ubuntu 24.04 using port 4444.

## Prerequisites


or just do massive skip with winscp and drag and drop without having to create multi directories like a twat or use git for everything. 


### 1. Install Node.js and npm

```bash
# Update your package lists
sudo apt update

# Install Node.js and npm
sudo apt install -y nodejs npm

# Verify installation
node --version
npm --version
```

If you need a newer version of Node.js than what's in the Ubuntu repositories, you can use the NodeSource repository:

```bash
# Install curl if not already installed
sudo apt install -y curl

# Add NodeSource repository (for Node.js 18.x - adjust version as needed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js and npm
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 2. Install Git (if not already installed)

```bash
sudo apt install -y git
```

## Installation Steps

### 1. Clone the BruteFight Repository

```bash
# Create a directory for your game (optional)
mkdir -p ~/games
cd ~/games

# Clone the repository (replace with your actual repository URL if different)
git clone https://github.com/yourusername/brutefight.git
cd brutefight
```

### 2. Install Dependencies

```bash
# Install required Node.js packages
npm install express socket.io
```

## Configuration

### 1. Configure the Game Port

Edit the `config.json` file to set the port to 4444:

```bash
# If config.json doesn't exist yet, create it
echo '{
  "features": {
    "showOfflinePlayers": false
  },
  "game": {
    "port": 4444
  },
  "players": {
    "spawnX": 5000,
    "spawnY": 5000,
    "defaultSpeed": 5
  }
}' > config.json
```

Alternatively, you can edit the `server.js` file to change the default port:

```bash
# Open server.js in a text editor
nano server.js

# Find the line that sets the PORT variable (near the end of the file)
# Change it to:
# const PORT = process.env.PORT || config.game?.port || 4444;
```

### 2. Create Required Directories

```bash
# Create the accounts directory if it doesn't exist
mkdir -p accounts
```

## Running the Game

### 1. Start the Server

```bash
# Start the server
node server.js
```

You should see output similar to:
```
Server running on port 4444
Open your browser and go to http://localhost:4444 or http://127.0.0.1:4444
Show offline players: Disabled
```

### 2. Running as a Background Service (Optional)

If you want to keep the game running after you close your terminal, you can use `nohup` or create a systemd service.

#### Using nohup:

```bash
nohup node server.js > brutefight.log 2>&1 &
echo $! > brutefight.pid
```

To stop the server:
```bash
kill $(cat brutefight.pid)
```

#### Creating a systemd service:

Create a service file:

```bash
sudo nano /etc/systemd/system/brutefight.service
```

Add the following content (adjust paths as needed):

```
[Unit]
Description=BruteFight Game Server
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/games/brutefight
ExecStart=/usr/bin/node server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable brutefight
sudo systemctl start brutefight
```

Check status:

```bash
sudo systemctl status brutefight
```

## Accessing the Game

Once the server is running, you can access the game by opening a web browser and navigating to:

```
http://YOUR_SERVER_IP:4444
```

If you're accessing it from the same machine, you can use:

```
http://localhost:4444
```

## Firewall Configuration

If you're running a firewall, you'll need to open port 4444:

```bash
sudo ufw allow 4444/tcp
```

## Troubleshooting

### Port Already in Use

If you see an error like "Error: listen EADDRINUSE: address already in use :::4444", it means the port is already being used by another application. You can either:

1. Change the port in your configuration
2. Find and stop the process using the port:
   ```bash
   sudo lsof -i :4444
   sudo kill <PID>
   ```

### Permission Issues

If you encounter permission issues:

```bash
# Make sure you have the right permissions for the directory
chmod -R 755 ~/games/brutefight
```

### Node.js Version Issues

If you encounter compatibility issues with Node.js:

```bash
# Install Node Version Manager (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

# Restart your terminal or source your profile
source ~/.bashrc

# Install and use a specific Node.js version
nvm install 18
nvm use 18
```

## Updating the Game

To update the game to the latest version:

```bash
cd ~/games/brutefight
git pull
npm install  # In case dependencies have changed
```

If you're running it as a systemd service, restart it:

```bash
sudo systemctl restart brutefight
``` 