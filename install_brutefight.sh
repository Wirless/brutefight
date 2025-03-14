#!/bin/bash

# BruteFight Installation Script for Ubuntu 24.04
# This script installs and configures BruteFight to run on port 4444

# Exit on error
set -e

# Print colored messages
print_green() {
    echo -e "\e[32m$1\e[0m"
}

print_yellow() {
    echo -e "\e[33m$1\e[0m"
}

print_red() {
    echo -e "\e[31m$1\e[0m"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_red "Please do not run this script as root or with sudo."
    exit 1
fi

# Welcome message
print_green "==================================================="
print_green "       BruteFight Installation for Ubuntu 24.04"
print_green "==================================================="
print_green "This script will install BruteFight and configure it to run on port 4444."
echo ""

# Update package lists
print_yellow "Updating package lists..."
sudo apt update

# Install Node.js and npm
print_yellow "Installing Node.js and npm..."
if ! command -v node &> /dev/null; then
    print_yellow "Node.js not found. Installing..."
    sudo apt install -y nodejs npm
else
    print_green "Node.js is already installed."
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 14 ]; then
    print_yellow "Node.js version is too old. Installing newer version..."
    sudo apt install -y curl
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Verify Node.js installation
print_green "Node.js version: $(node -v)"
print_green "npm version: $(npm -v)"

# Install Git if not already installed
if ! command -v git &> /dev/null; then
    print_yellow "Installing Git..."
    sudo apt install -y git
else
    print_green "Git is already installed."
fi

# Create game directory
print_yellow "Creating game directory..."
GAME_DIR="$HOME/brutefight"
mkdir -p "$GAME_DIR"
cd "$GAME_DIR"

# Clone or copy the repository
if [ -d ".git" ]; then
    print_yellow "Repository already exists. Pulling latest changes..."
    git pull
else
    print_yellow "Cloning repository..."
    # If you have a repository, uncomment the next line and replace the URL
    # git clone https://github.com/yourusername/brutefight.git .
    
    # If you're copying files from the current directory
    print_yellow "Copying files from current directory..."
    cp -r "$(dirname "$(readlink -f "$0")")"/* .
fi

# Install dependencies
print_yellow "Installing Node.js dependencies..."
npm install express socket.io

# Configure port
print_yellow "Configuring port to 4444..."
CONFIG_FILE="config.json"

if [ -f "$CONFIG_FILE" ]; then
    # Update existing config file
    TMP_FILE=$(mktemp)
    jq '.game.port = 4444' "$CONFIG_FILE" > "$TMP_FILE"
    mv "$TMP_FILE" "$CONFIG_FILE"
else
    # Create new config file
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
}' > "$CONFIG_FILE"
fi

# Create accounts directory
print_yellow "Creating accounts directory..."
mkdir -p accounts

# Create a systemd service file
print_yellow "Creating systemd service file..."
SERVICE_FILE="$HOME/brutefight.service"
echo "[Unit]
Description=BruteFight Game Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$GAME_DIR
ExecStart=$(which node) server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target" > "$SERVICE_FILE"

print_yellow "Installing systemd service..."
sudo mv "$SERVICE_FILE" /etc/systemd/system/brutefight.service
sudo systemctl daemon-reload
sudo systemctl enable brutefight

# Open firewall port
print_yellow "Configuring firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 4444/tcp
    print_green "Firewall port 4444 opened."
else
    print_yellow "UFW firewall not installed. Skipping firewall configuration."
fi

# Start the service
print_yellow "Starting BruteFight service..."
sudo systemctl start brutefight
sleep 2
SERVICE_STATUS=$(sudo systemctl is-active brutefight)

if [ "$SERVICE_STATUS" = "active" ]; then
    print_green "BruteFight service is running!"
else
    print_red "BruteFight service failed to start. Check logs with: sudo journalctl -u brutefight"
fi

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

print_green "==================================================="
print_green "       BruteFight Installation Complete!"
print_green "==================================================="
print_green "You can access the game at: http://$SERVER_IP:4444"
print_green "Or locally at: http://localhost:4444"
print_green ""
print_green "Service management commands:"
print_green "  Start:   sudo systemctl start brutefight"
print_green "  Stop:    sudo systemctl stop brutefight"
print_green "  Restart: sudo systemctl restart brutefight"
print_green "  Status:  sudo systemctl status brutefight"
print_green "  Logs:    sudo journalctl -u brutefight"
print_green ""
print_green "Installation directory: $GAME_DIR"
print_green "===================================================" 