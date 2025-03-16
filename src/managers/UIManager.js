/**
 * UIManager.js
 * 
 * Manages all UI elements in the game, including player list,
 * and other interface components.
 */
class UIManager {
    /**
     * @param {Game} game - The main game instance
     */
    constructor(game) {
        this.game = game;
        
        // Initialize UI elements
        this.createPlayerCountTab();
        this.stylePlayersList();
        // Leaderboard is now handled by LeaderboardUI
        
        // Register global access
        window.uiManager = this;
    }
    
    /**
     * Create the player count tab
     */
    createPlayerCountTab() {
        const playerCountTab = document.createElement('div');
        playerCountTab.id = 'playerCountTab';
        playerCountTab.className = 'player-count-tab';
        playerCountTab.style.position = 'fixed';
        playerCountTab.style.top = '0';
        playerCountTab.style.right = '20px';
        playerCountTab.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        playerCountTab.style.color = 'white';
        playerCountTab.style.padding = '5px 15px';
        playerCountTab.style.borderRadius = '0 0 5px 5px';
        playerCountTab.style.fontSize = '14px';
        playerCountTab.style.fontWeight = 'bold';
        playerCountTab.style.cursor = 'pointer';
        playerCountTab.style.zIndex = '100';
        playerCountTab.style.display = 'flex';
        playerCountTab.style.alignItems = 'center';
        playerCountTab.style.gap = '5px';
        
        // Add player icon
        const playerIcon = document.createElement('span');
        playerIcon.textContent = '👥';
        playerIcon.style.fontSize = '16px';
        playerCountTab.appendChild(playerIcon);
        
        // Add player count
        const playerCount = document.createElement('span');
        playerCount.id = 'playerCount';
        playerCount.textContent = '0';
        playerCountTab.appendChild(playerCount);
        
        // When clicked, toggle the player list
        playerCountTab.addEventListener('click', () => {
            const playersList = document.getElementById('playersList');
            if (playersList.style.display === 'none') {
                playersList.style.display = 'block';
            } else {
                playersList.style.display = 'none';
            }
        });
        
        document.body.appendChild(playerCountTab);
        this.playerCountTab = playerCountTab;
    }
    
    /**
     * Style the existing player list
     */
    stylePlayersList() {
        const playersList = document.getElementById('playersList');
        if (playersList) {
            playersList.style.position = 'fixed';
            playersList.style.top = '30px'; // Position below the tab
            playersList.style.right = '20px';
            playersList.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            playersList.style.border = '1px solid #444';
            playersList.style.borderRadius = '5px';
            playersList.style.padding = '10px';
            playersList.style.minWidth = '150px';
            playersList.style.maxHeight = '300px';
            playersList.style.overflowY = 'auto';
            playersList.style.zIndex = '99';
            playersList.style.display = 'none'; // Hidden by default
        }
        this.playersList = playersList;
    }
    
    /**
     * Create the login/register UI
     */
    createLoginUI() {
        // Create register panel
        const registerPanel = document.createElement('div');
        registerPanel.id = 'registerPanel';
        registerPanel.className = 'login-panel';
        registerPanel.style.display = 'none';
        
        // Create register panel content
        registerPanel.innerHTML = `
            <h2>Create Account</h2>
            <div class="form-group">
                <label for="regUsernameInput">Username:</label>
                <input type="text" id="regUsernameInput" placeholder="Choose a username">
            </div>
            <div class="form-group">
                <label for="regEmailInput">Email:</label>
                <input type="email" id="regEmailInput" placeholder="Enter your email">
            </div>
            <div class="form-group">
                <label for="regPasswordInput">Password:</label>
                <input type="password" id="regPasswordInput" placeholder="Choose a password">
            </div>
            <div class="form-group">
                <label for="regConfirmPasswordInput">Confirm Password:</label>
                <input type="password" id="regConfirmPasswordInput" placeholder="Confirm your password">
            </div>
            <div class="button-group">
                <button id="registerButton">Register</button>
                <button id="backToLoginButton">Back to Login</button>
            </div>
            <div id="registerStatus" class="status-message"></div>
        `;
        
        // Add register panel to body
        document.body.appendChild(registerPanel);
        
        // Add event listeners
        document.getElementById('registerButton').addEventListener('click', () => this.register());
        document.getElementById('backToLoginButton').addEventListener('click', () => {
            registerPanel.style.display = 'none';
            document.getElementById('loginPanel').style.display = 'block';
        });
        
        // Add "Register" link to login panel
        const loginPanel = document.getElementById('loginPanel');
        const createAccountLink = document.createElement('div');
        createAccountLink.className = 'create-account-link';
        createAccountLink.innerHTML = '<a href="#" id="createAccountLink">Create an Account</a>';
        loginPanel.appendChild(createAccountLink);
        
        document.getElementById('createAccountLink').addEventListener('click', (e) => {
            e.preventDefault();
            loginPanel.style.display = 'none';
            registerPanel.style.display = 'block';
        });
        
        this.registerPanel = registerPanel;
    }
    
    /**
     * Handle user registration
     */
    register() {
        const username = document.getElementById('regUsernameInput').value.trim();
        const email = document.getElementById('regEmailInput').value.trim();
        const password = document.getElementById('regPasswordInput').value;
        const confirmPassword = document.getElementById('regConfirmPasswordInput').value;
        const registerStatus = document.getElementById('registerStatus');
        
        // Basic validation
        if (!username || !email || !password || !confirmPassword) {
            registerStatus.textContent = 'All fields are required.';
            return;
        }
        
        if (password !== confirmPassword) {
            registerStatus.textContent = 'Passwords do not match.';
            return;
        }
        
        // Show loading message
        registerStatus.textContent = 'Creating account...';
        
        // Send registration request
        fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Registration successful
                registerStatus.textContent = 'Account created! You can now login.';
                
                // Auto-fill login
                document.getElementById('usernameInput').value = username;
                
                // Go back to login after a delay
                setTimeout(() => {
                    this.registerPanel.style.display = 'none';
                    document.getElementById('loginPanel').style.display = 'block';
                }, 2000);
            } else {
                // Registration failed
                registerStatus.textContent = data.message || 'Registration failed.';
            }
        })
        .catch(error => {
            console.error('Error registering:', error);
            registerStatus.textContent = 'Error registering account.';
        });
    }
    
    /**
     * Update the player list and count
     * @param {Object} players - Object containing all players
     * @param {string} currentUsername - Current player's username
     */
    updatePlayersList(players, currentUsername) {
        // Update the player count in the tab
        const playerCount = document.getElementById('playerCount');
        const count = Object.keys(players).length;
        playerCount.textContent = count;
        
        // Update the player list itself
        const playersListItems = document.getElementById('playersListItems');
        if (!playersListItems) return;
        
        playersListItems.innerHTML = '';
        for (const playerName in players) {
            const li = document.createElement('li');
            li.textContent = playerName;
            if (playerName === currentUsername) {
                li.textContent += ' (You)';
                li.style.fontWeight = 'bold';
                li.style.color = 'rgb(255, 100, 100)';
            }
            playersListItems.appendChild(li);
        }
    }
    
    /**
     * Show a save indicator when the game is saved
     */
    showSaveIndicator() {
        // Create or get the save indicator
        let saveIndicator = document.getElementById('saveIndicator');
        
        if (!saveIndicator) {
            saveIndicator = document.createElement('div');
            saveIndicator.id = 'saveIndicator';
            saveIndicator.style.position = 'fixed';
            saveIndicator.style.bottom = '10px';
            saveIndicator.style.right = '10px';
            saveIndicator.style.backgroundColor = 'rgba(0, 233, 150, 0.8)';
            saveIndicator.style.color = 'white';
            saveIndicator.style.padding = '5px 10px';
            saveIndicator.style.borderRadius = '5px';
            saveIndicator.style.fontSize = '12px';
            saveIndicator.style.fontWeight = 'bold';
            saveIndicator.style.zIndex = '9999';
            saveIndicator.style.opacity = '0';
            saveIndicator.style.transition = 'opacity 0.3s ease';
            document.body.appendChild(saveIndicator);
        }
        
        // Update text and show
        saveIndicator.textContent = 'Game Saved!';
        saveIndicator.style.opacity = '1';
        
        // Hide after 2 seconds
        setTimeout(() => {
            saveIndicator.style.opacity = '0';
        }, 2000);
    }
    
    /**
     * Create a notification message that appears briefly
     * @param {string} message - The message to display
     * @param {string} type - The type of notification ('success', 'error', 'info')
     * @param {number} duration - How long to display the notification in ms
     */
    showNotification(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `game-notification ${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.position = 'fixed';
        notification.style.top = '60px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.fontWeight = 'bold';
        notification.style.zIndex = '9999';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        
        // Set color based on type
        switch (type) {
            case 'success':
                notification.style.backgroundColor = 'rgba(0, 233, 150, 0.9)';
                notification.style.color = 'white';
                break;
            case 'error':
                notification.style.backgroundColor = 'rgba(233, 0, 50, 0.9)';
                notification.style.color = 'white';
                break;
            default: // info
                notification.style.backgroundColor = 'rgba(0, 150, 233, 0.9)';
                notification.style.color = 'white';
        }
        
        // Add to the document
        document.body.appendChild(notification);
        
        // Show the notification
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Hide and remove after duration
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, duration);
    }
    
    /**
     * Make an element draggable
     * @param {HTMLElement} element - The element to make draggable
     * @param {HTMLElement} dragHandle - The element that serves as a drag handle
     */
    makeDraggable(element, dragHandle = null) {
        const handle = dragHandle || element;
        
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;
        
        // Set cursor style for the handle
        handle.style.cursor = 'move';
        
        // Mouse down event - start dragging
        handle.addEventListener('mousedown', (e) => {
            // Only allow left-click dragging
            if (e.button !== 0) return;
            
            isDragging = true;
            
            // Calculate the offset of the mouse cursor from the element's top-left corner
            const rect = element.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            
            // Bring to front
            element.style.zIndex = '1000';
            
            // Prevent text selection during drag
            e.preventDefault();
        });
        
        // Mouse move event - move the element
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            // Calculate new position
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            
            // Apply new position
            element.style.left = `${x}px`;
            element.style.top = `${y}px`;
        });
        
        // Mouse up event - stop dragging
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                
                // Save the position if this is a known element type
                if (element.id === 'leaderboardPanel') {
                    this.saveWindowPosition('leaderboard', element);
                } else if (element.id === 'equipmentPanel') {
                    this.saveWindowPosition('equipment', element);
                } else if (element.id === 'inventoryPanel') {
                    this.saveWindowPosition('inventory', element);
                }
            }
        });
    }
    
    /**
     * Save window position to localStorage
     * @param {string} windowName - Name/identifier for the window
     * @param {HTMLElement} element - The element whose position to save
     */
    saveWindowPosition(windowName, element) {
        const rect = element.getBoundingClientRect();
        const position = {
            left: rect.left,
            top: rect.top
        };
        
        try {
            localStorage.setItem(`window_pos_${windowName}`, JSON.stringify(position));
        } catch (err) {
            console.error(`Error saving window position for ${windowName}:`, err);
        }
    }
    
    /**
     * Restore window position from localStorage
     * @param {string} windowName - Name/identifier for the window
     * @param {HTMLElement} element - The element to position
     */
    restoreWindowPosition(windowName, element) {
        try {
            const positionStr = localStorage.getItem(`window_pos_${windowName}`);
            if (positionStr) {
                const position = JSON.parse(positionStr);
                
                // Check if position is within viewport
                if (position.left >= 0 && position.left <= window.innerWidth - 100 &&
                    position.top >= 0 && position.top <= window.innerHeight - 100) {
                    element.style.left = `${position.left}px`;
                    element.style.top = `${position.top}px`;
                }
            }
        } catch (err) {
            console.error(`Error restoring window position for ${windowName}:`, err);
        }
    }
    
    /**
     * Add a pulse effect to an element
     * @param {HTMLElement} element - The element to add the effect to
     */
    addPulseEffect(element) {
        // Store original border
        const originalBorder = element.style.border;
        const originalBoxShadow = element.style.boxShadow;
        
        // Add pulse animation
        element.style.animation = 'pulse 2s infinite';
        element.style.border = '2px solid rgb(0, 233, 150)';
        element.style.boxShadow = '0 0 10px rgba(0, 233, 150, 0.7)';
        
        // Add pulse keyframes if not already added
        if (!document.getElementById('pulseKeyframes')) {
            const style = document.createElement('style');
            style.id = 'pulseKeyframes';
            style.innerHTML = `
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(0, 233, 150, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(0, 233, 150, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(0, 233, 150, 0); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Return a function to remove the effect
        return () => {
            element.style.animation = '';
            element.style.border = originalBorder;
            element.style.boxShadow = originalBoxShadow;
        };
    }
    
    /**
     * Remove all UI elements and clean up
     */
    cleanup() {
        // Remove player count tab
        if (this.playerCountTab && this.playerCountTab.parentNode) {
            this.playerCountTab.parentNode.removeChild(this.playerCountTab);
        }
        
        // Remove register panel
        if (this.registerPanel && this.registerPanel.parentNode) {
            this.registerPanel.parentNode.removeChild(this.registerPanel);
        }
        
        // We don't need to clean up leaderboard panel here - LeaderboardUI handles that
    }
}

// Make the UIManager class globally available for backward compatibility
window.UIManager = UIManager;

// Add default export
export default UIManager; 