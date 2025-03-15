/**
 * Socket.js
 * 
 * Manages WebSocket connections and events for the game,
 * providing a centralized interface for all real-time
 * communication between client and server.
 */
class Socket {
    /**
     * Initialize socket connection
     * @param {Game} game - Reference to the main game instance
     * @param {Object} options - Configuration options
     */
    constructor(game, options = {}) {
        this.game = game;
        this.options = Object.assign({
            reconnectDelay: 3000,
            maxReconnectAttempts: 5,
            debug: false
        }, options);
        
        this.socket = null;
        this.reconnectAttempts = 0;
        this.connected = false;
        this.eventHandlers = {};
        
        // Bind methods to this instance
        this.onConnect = this.onConnect.bind(this);
        this.onDisconnect = this.onDisconnect.bind(this);
        this.onError = this.onError.bind(this);
        this.emit = this.emit.bind(this);
        this.on = this.on.bind(this);
        
        // Initialize connection
        this.init();
    }
    
    /**
     * Initialize socket connection and set up core event handlers
     */
    init() {
        this.debug('Initializing socket connection...');
        
        // Create socket.io connection to the current server
        this.socket = io.connect(window.location.origin, {
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            autoConnect: true
        });
        
        // Make socket globally available (for backward compatibility)
        window.socket = this.socket;
        
        // Set up core socket event handlers
        this.socket.on('connect', this.onConnect);
        this.socket.on('disconnect', this.onDisconnect);
        this.socket.on('error', this.onError);
        this.socket.on('connect_error', (error) => {
            this.debug('Connection error:', error);
        });
        
        // Set up game-specific event handlers
        this.setupGameEvents();
    }
    
    /**
     * Set up game-specific socket event handlers
     */
    setupGameEvents() {
        // Login events
        this.socket.on('loginSuccess', data => this.handleLoginSuccess(data));
        this.socket.on('loginFailed', data => this.handleLoginFailed(data));
        
        // Player events
        this.socket.on('playerList', data => this.handlePlayerList(data));
        this.socket.on('playerDisconnected', username => this.handlePlayerDisconnected(username));
        this.socket.on('playerJoined', username => this.handlePlayerJoined(username));
        
        // Chat events
        this.socket.on('chatMessage', msg => this.handleChatMessage(msg));
        
        // Leaderboard events
        this.socket.on('leaderboardData', data => this.handleLeaderboardData(data));
        
        // World update events
        this.socket.on('worldUpdate', data => this.handleWorldUpdate(data));
        
        this.debug('Game event handlers set up');
    }
    
    /**
     * Emit an event to the server
     * @param {string} event - Event name
     * @param {any} data - Event data
     */
    emit(event, data) {
        if (this.socket && this.connected) {
            this.socket.emit(event, data);
            this.debug(`Emitted event: ${event}`, data);
        } else {
            this.debug(`Failed to emit event: ${event} - Socket not connected`);
        }
    }
    
    /**
     * Register a custom event handler
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    on(event, callback) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        
        this.eventHandlers[event].push(callback);
        
        // Also register with socket.io if we're connected
        if (this.socket) {
            this.socket.on(event, callback);
        }
        
        this.debug(`Registered handler for event: ${event}`);
    }
    
    /**
     * Remove a custom event handler
     * @param {string} event - Event name
     * @param {Function} callback - Event callback to remove
     */
    off(event, callback) {
        if (this.eventHandlers[event]) {
            // Remove from our internal handlers
            this.eventHandlers[event] = this.eventHandlers[event].filter(
                handler => handler !== callback
            );
            
            // Also remove from socket.io if we're connected
            if (this.socket) {
                this.socket.off(event, callback);
            }
            
            this.debug(`Removed handler for event: ${event}`);
        }
    }
    
    /**
     * Handle socket connection event
     */
    onConnect() {
        this.connected = true;
        this.reconnectAttempts = 0;
        
        this.debug('Socket connected');
        
        // Auto-login if we have a token
        if (this.game.auth && this.game.auth.token) {
            this.debug('Auto-login with token');
            this.login(null, null, this.game.auth.token);
        }
    }
    
    /**
     * Handle socket disconnection event
     */
    onDisconnect() {
        this.connected = false;
        
        this.debug('Socket disconnected');
        
        // Show disconnection message to user
        this.showDisconnectionMessage();
        
        // Attempt to reconnect if we haven't exceeded max attempts
        if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
            this.reconnectAttempts++;
            
            this.debug(`Attempting to reconnect (${this.reconnectAttempts}/${this.options.maxReconnectAttempts})...`);
            
            setTimeout(() => {
                this.init();
            }, this.options.reconnectDelay);
        } else {
            this.debug('Max reconnect attempts reached');
        }
    }
    
    /**
     * Handle socket error event
     * @param {Error} error - Socket error
     */
    onError(error) {
        this.debug('Socket error:', error);
    }
    
    /**
     * Show disconnection message to user
     */
    showDisconnectionMessage() {
        // Create or get the disconnection message element
        let disconnectMessage = document.getElementById('disconnectMessage');
        
        if (!disconnectMessage) {
            disconnectMessage = document.createElement('div');
            disconnectMessage.id = 'disconnectMessage';
            disconnectMessage.style.position = 'fixed';
            disconnectMessage.style.top = '50%';
            disconnectMessage.style.left = '50%';
            disconnectMessage.style.transform = 'translate(-50%, -50%)';
            disconnectMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            disconnectMessage.style.color = 'white';
            disconnectMessage.style.padding = '20px';
            disconnectMessage.style.borderRadius = '10px';
            disconnectMessage.style.zIndex = '9999';
            disconnectMessage.style.textAlign = 'center';
            disconnectMessage.style.boxShadow = '0 0 20px rgba(255, 0, 0, 0.5)';
            disconnectMessage.style.border = '2px solid red';
            disconnectMessage.style.maxWidth = '80%';
            
            // Add a close button
            const closeButton = document.createElement('button');
            closeButton.textContent = 'Close';
            closeButton.style.marginTop = '15px';
            closeButton.style.padding = '5px 15px';
            closeButton.style.backgroundColor = '#333';
            closeButton.style.color = 'white';
            closeButton.style.border = '1px solid #555';
            closeButton.style.borderRadius = '5px';
            closeButton.style.cursor = 'pointer';
            
            closeButton.addEventListener('click', () => {
                disconnectMessage.style.display = 'none';
            });
            
            disconnectMessage.appendChild(document.createElement('br'));
            disconnectMessage.appendChild(closeButton);
            
            document.body.appendChild(disconnectMessage);
        }
        
        // Update message content
        disconnectMessage.innerHTML = `
            <h3>Connection Lost</h3>
            <p>Lost connection to the server. Attempting to reconnect...</p>
            <p>Attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts}</p>
            <button id="closeDisconnectMsg" style="margin-top: 15px; padding: 5px 15px; background-color: #333; color: white; border: 1px solid #555; border-radius: 5px; cursor: pointer;">Close</button>
        `;
        
        // Add event listener to the close button
        document.getElementById('closeDisconnectMsg').addEventListener('click', () => {
            disconnectMessage.style.display = 'none';
        });
        
        // Show the message
        disconnectMessage.style.display = 'block';
    }
    
    /**
     * Handle successful login response
     * @param {Object} data - Login success data
     */
    handleLoginSuccess(data) {
        this.debug('Login successful:', data);
        
        // Forward to game
        if (this.game && this.game.handleLoginSuccess) {
            this.game.handleLoginSuccess(data);
        }
    }
    
    /**
     * Handle failed login response
     * @param {Object} data - Login failure data
     */
    handleLoginFailed(data) {
        this.debug('Login failed:', data);
        
        // Forward to game
        if (this.game && this.game.handleLoginFailed) {
            this.game.handleLoginFailed(data);
        }
    }
    
    /**
     * Handle player list update
     * @param {Object} data - Player list data
     */
    handlePlayerList(data) {
        this.debug('Player list updated:', Object.keys(data).length, 'players');
        
        // Forward to game
        if (this.game && this.game.handlePlayerList) {
            this.game.handlePlayerList(data);
        }
    }
    
    /**
     * Handle player disconnection
     * @param {string} username - Disconnected player's username
     */
    handlePlayerDisconnected(username) {
        this.debug('Player disconnected:', username);
        
        // Forward to game
        if (this.game && this.game.handlePlayerDisconnected) {
            this.game.handlePlayerDisconnected(username);
        }
    }
    
    /**
     * Handle player joined
     * @param {string} username - Joined player's username
     */
    handlePlayerJoined(username) {
        this.debug('Player joined:', username);
        
        // Forward to game
        if (this.game && this.game.handlePlayerJoined) {
            this.game.handlePlayerJoined(username);
        }
    }
    
    /**
     * Handle chat message
     * @param {Object} msg - Chat message data
     */
    handleChatMessage(msg) {
        this.debug('Chat message received:', msg);
        
        // Forward to game
        if (this.game && this.game.handleChatMessage) {
            this.game.handleChatMessage(msg);
        }
    }
    
    /**
     * Handle leaderboard data
     * @param {Array} data - Leaderboard data
     */
    handleLeaderboardData(data) {
        this.debug('Leaderboard data received:', data.length, 'entries');
        
        // Forward to game
        if (this.game && this.game.handleLeaderboardData) {
            this.game.handleLeaderboardData(data);
        }
    }
    
    /**
     * Handle world update
     * @param {Object} data - World update data
     */
    handleWorldUpdate(data) {
        this.debug('World update received');
        
        // Forward to game
        if (this.game && this.game.handleWorldUpdate) {
            this.game.handleWorldUpdate(data);
        }
    }
    
    /**
     * Send player movement to server
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    sendMovement(x, y) {
        this.emit('move', { x, y });
    }
    
    /**
     * Send player data update to server
     * @param {Object} data - Player data to update
     */
    sendPlayerUpdate(data) {
        this.emit('updatePlayerData', data);
    }
    
    /**
     * Send chat message to server
     * @param {string} message - Message content
     * @param {string} username - Sender username
     * @param {string} type - Message type
     */
    sendChatMessage(message, type = 'user') {
        this.emit('chatMessage', { message, type });
    }
    
    /**
     * Request leaderboard data from server
     */
    requestLeaderboard() {
        this.emit('requestLeaderboard');
    }
    
    /**
     * Send login request to server
     * @param {string} username - Username
     * @param {string} password - Password
     * @param {string} token - Auth token (optional)
     */
    login(username, password, token = null) {
        // Try to get local save data
        let localSave = null;
        try {
            const savedData = localStorage.getItem('playerSave');
            if (savedData) {
                localSave = JSON.parse(savedData);
                this.debug('Found local save data for', localSave.username);
            }
        } catch (err) {
            this.debug('Error loading local save:', err);
        }
        
        // Send login request with credentials and local save
        this.emit('login', { 
            username, 
            password, 
            token,
            localSave 
        });
        
        this.debug('Login request sent for', username || 'token auth');
    }
    
    /**
     * Output debug messages if debugging is enabled
     * @param {...any} args - Arguments to log
     */
    debug(...args) {
        if (this.options.debug) {
            console.log('[Socket]', ...args);
        }
    }
    
    /**
     * Disconnect the socket
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Export the Socket class
export default Socket; 