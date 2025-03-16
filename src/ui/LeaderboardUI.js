/**
 * LeaderboardUI.js
 * 
 * Handles the rendering and interaction with the game leaderboard
 */
class LeaderboardUI {
    /**
     * Create a new leaderboard UI
     * @param {Game} game - The main game instance
     * @param {Object} options - Configuration options
     */
    constructor(game, options = {}) {
        this.game = game;
        this.options = Object.assign({
            maxPlayers: 10,
            position: { top: '100px', left: '10px' },
            width: '200px'
        }, options);
        
        this.leaderboardPanel = null;
        this.leaderboardList = null;
        this.isVisible = false;
        this.leaderboardData = [];
        
        // Initialize UI
        this.init();
    }
    
    /**
     * Initialize the leaderboard UI
     */
    init() {
        this.createLeaderboardPanel();
        this.restoreWindowPosition();
    }
    
    /**
     * Create the leaderboard panel
     */
    createLeaderboardPanel() {
        // Create leaderboard container
        const leaderboardPanel = document.createElement('div');
        leaderboardPanel.id = 'leaderboardPanel';
        leaderboardPanel.className = 'leaderboard-panel';
        
        // Style the panel
        Object.assign(leaderboardPanel.style, {
            position: 'fixed',
            top: this.options.position.top,
            left: this.options.position.left,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            border: '1px solid rgb(0, 233, 150)',
            width: this.options.width,
            zIndex: '998',
            boxShadow: '0 0 10px rgba(0, 233, 150, 0.3)',
            transition: 'opacity 0.3s ease, transform 0.3s ease'
        });
        
        // Create header with title and close button
        const header = this.createHeader();
        leaderboardPanel.appendChild(header);
        
        // Create leaderboard list
        const leaderboardList = document.createElement('ul');
        leaderboardList.id = 'leaderboardList';
        leaderboardList.className = 'leaderboard-list';
        
        // Style the list
        Object.assign(leaderboardList.style, {
            listStyle: 'none',
            padding: '0',
            margin: '0',
            maxHeight: '300px',
            overflowY: 'auto'
        });
        
        // Add to panel
        leaderboardPanel.appendChild(leaderboardList);
        
        // Add to DOM
        document.getElementById('gamePanel').appendChild(leaderboardPanel);
        
        // Make draggable
        this.makeDraggable(leaderboardPanel, header);
        
        // Store references
        this.leaderboardPanel = leaderboardPanel;
        this.leaderboardList = leaderboardList;
        
        // Initially visible
        this.show();
    }
    
    /**
     * Create the header for the leaderboard
     * @returns {HTMLElement} The header element
     */
    createHeader() {
        const header = document.createElement('div');
        header.className = 'leaderboard-header';
        
        // Style the header
        Object.assign(header.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            borderBottom: '1px solid rgb(0, 233, 150)',
            paddingBottom: '5px',
            cursor: 'move'
        });
        
        // Add title
        const title = document.createElement('div');
        title.textContent = 'Top Players';
        title.style.fontWeight = 'bold';
        header.appendChild(title);
        
        // Add refresh button
        const refreshButton = document.createElement('button');
        refreshButton.innerHTML = '&#x21bb;'; // Refresh icon
        
        // Style the refresh button
        Object.assign(refreshButton.style, {
            backgroundColor: 'transparent',
            border: 'none',
            color: 'rgb(0, 233, 150)',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '2px 5px',
            margin: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        });
        
        // Add refresh functionality
        refreshButton.addEventListener('click', () => {
            this.requestUpdate();
        });
        
        // Add tooltip
        refreshButton.title = 'Refresh leaderboard';
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        
        // Style the close button
        Object.assign(closeButton.style, {
            backgroundColor: 'transparent',
            border: 'none',
            color: 'rgb(0, 233, 150)',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '2px 5px',
            margin: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        });
        
        // Add close functionality
        closeButton.addEventListener('click', () => {
            this.toggle();
        });
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '5px';
        buttonContainer.appendChild(refreshButton);
        buttonContainer.appendChild(closeButton);
        
        header.appendChild(buttonContainer);
        
        return header;
    }
    
    /**
     * Request leaderboard update from server
     */
    requestUpdate() {
        if (this.game.socket) {
            this.game.socket.requestLeaderboard();
        }
    }
    
    /**
     * Update the leaderboard with new data
     * @param {Array} leaderboardData - Array of player data for the leaderboard
     * @param {string} currentUsername - Current player's username
     */
    update(leaderboardData, currentUsername) {
        if (!this.leaderboardList) return;
        
        // Store for later use
        this.leaderboardData = leaderboardData;
        
        // Clear existing list
        this.leaderboardList.innerHTML = '';
        
        // Limit to max players
        const displayData = leaderboardData.slice(0, this.options.maxPlayers);
        
        // Add each player to the list
        displayData.forEach((player, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'leaderboard-item';
            
            // Style the list item
            Object.assign(listItem.style, {
                padding: '5px 10px',
                marginBottom: '5px',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                transition: 'background-color 0.2s ease'
            });
            
            // Highlight current player
            if (player.username === currentUsername) {
                listItem.style.backgroundColor = 'rgba(255, 100, 100, 0.3)';
                listItem.style.border = '1px solid red';
            } else {
                listItem.style.backgroundColor = 'rgba(0, 233, 150, 0.1)';
                listItem.style.border = '1px solid rgba(0, 233, 150, 0.3)';
            }
            
            // Hover effect
            listItem.addEventListener('mouseenter', () => {
                listItem.style.backgroundColor = player.username === currentUsername
                    ? 'rgba(255, 100, 100, 0.4)'
                    : 'rgba(0, 233, 150, 0.2)';
            });
            
            listItem.addEventListener('mouseleave', () => {
                listItem.style.backgroundColor = player.username === currentUsername
                    ? 'rgba(255, 100, 100, 0.3)'
                    : 'rgba(0, 233, 150, 0.1)';
            });
            
            // Create rank badge
            const rankBadge = document.createElement('span');
            rankBadge.className = 'rank-badge';
            rankBadge.textContent = `#${index + 1}`;
            
            // Style the rank badge
            Object.assign(rankBadge.style, {
                marginRight: '8px',
                fontWeight: 'bold',
                color: index === 0 ? 'gold' : (index === 1 ? 'silver' : (index === 2 ? '#cd7f32' : 'white')),
                minWidth: '25px',
                textAlign: 'center'
            });
            
            // Create player info
            const playerInfo = document.createElement('span');
            playerInfo.className = 'player-info';
            playerInfo.style.flex = '1';
            
            // Create level badge
            const levelBadge = document.createElement('span');
            levelBadge.className = 'level-badge';
            levelBadge.textContent = player.level;
            
            // Style the level badge
            Object.assign(levelBadge.style, {
                display: 'inline-block',
                backgroundColor: 'rgba(0, 233, 150, 0.8)',
                color: 'black',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                textAlign: 'center',
                lineHeight: '20px',
                marginRight: '5px',
                fontWeight: 'bold',
                fontSize: '12px'
            });
            
            // Create player name element
            const playerName = document.createElement('span');
            playerName.textContent = player.username;
            playerName.style.fontWeight = 'bold';
            
            // Add player name and level badge
            playerInfo.appendChild(levelBadge);
            playerInfo.appendChild(playerName);
            
            // If player has a title, add it
            if (player.title && player.title !== 'Newcomer') {
                const titleElement = document.createElement('div');
                titleElement.textContent = player.title;
                titleElement.style.fontSize = '11px';
                titleElement.style.opacity = '0.8';
                titleElement.style.marginTop = '2px';
                playerInfo.appendChild(titleElement);
            }
            
            // Assemble list item
            listItem.appendChild(rankBadge);
            listItem.appendChild(playerInfo);
            
            // Create XP bar if there's experience data
            if (player.experience !== undefined && player.nextLevelExperience !== undefined) {
                const xpBar = this.createXPBar(player.experience, player.nextLevelExperience);
                xpBar.style.marginTop = '3px';
                listItem.appendChild(xpBar);
            }
            
            this.leaderboardList.appendChild(listItem);
        });
        
        // Show if not visible
        if (!this.isVisible) {
            this.show();
        }
    }
    
    /**
     * Create an XP progress bar
     * @param {number} current - Current XP
     * @param {number} max - XP needed for next level
     * @returns {HTMLElement} The XP bar element
     */
    createXPBar(current, max) {
        const container = document.createElement('div');
        container.className = 'xp-bar-container';
        
        // Style the container
        Object.assign(container.style, {
            width: '100%',
            height: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '2px',
            overflow: 'hidden',
            marginTop: '5px'
        });
        
        // Create progress element
        const progress = document.createElement('div');
        progress.className = 'xp-bar-progress';
        
        // Calculate percentage
        const percentage = Math.min(100, Math.max(0, (current / max) * 100));
        
        // Style the progress
        Object.assign(progress.style, {
            height: '100%',
            width: `${percentage}%`,
            backgroundColor: 'rgb(0, 233, 150)',
            transition: 'width 0.5s ease'
        });
        
        container.appendChild(progress);
        return container;
    }
    
    /**
     * Make the leaderboard panel draggable
     * @param {HTMLElement} element - The element to make draggable
     * @param {HTMLElement} handle - The drag handle
     */
    makeDraggable(element, handle) {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;
        
        // Mouse down on the handle
        handle.addEventListener('mousedown', (e) => {
            // Only allow left-click dragging
            if (e.button !== 0) return;
            
            isDragging = true;
            
            // Calculate the offset of the mouse cursor from the element's top-left corner
            const rect = element.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            
            // Prevent text selection during drag
            e.preventDefault();
        });
        
        // Mouse move - move the element
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            // Calculate new position
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            
            // Ensure the element stays within viewport
            const maxX = window.innerWidth - element.offsetWidth;
            const maxY = window.innerHeight - element.offsetHeight;
            const newX = Math.max(0, Math.min(maxX, x));
            const newY = Math.max(0, Math.min(maxY, y));
            
            // Apply new position
            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
        });
        
        // Mouse up - stop dragging
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.saveWindowPosition();
            }
        });
    }
    
    /**
     * Toggle the leaderboard visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * Show the leaderboard
     */
    show() {
        if (!this.leaderboardPanel) return;
        
        this.leaderboardPanel.style.display = 'block';
        this.leaderboardPanel.style.opacity = '0';
        this.leaderboardPanel.style.transform = 'scale(0.95)';
        
        // Trigger animation
        setTimeout(() => {
            this.leaderboardPanel.style.opacity = '1';
            this.leaderboardPanel.style.transform = 'scale(1)';
        }, 10);
        
        this.isVisible = true;
    }
    
    /**
     * Hide the leaderboard
     */
    hide() {
        if (!this.leaderboardPanel) return;
        
        this.leaderboardPanel.style.opacity = '0';
        this.leaderboardPanel.style.transform = 'scale(0.95)';
        
        // Wait for animation to complete
        setTimeout(() => {
            this.leaderboardPanel.style.display = 'none';
        }, 300);
        
        this.isVisible = false;
    }
    
    /**
     * Save the window position to localStorage
     */
    saveWindowPosition() {
        if (!this.leaderboardPanel) return;
        
        const position = {
            left: this.leaderboardPanel.style.left,
            top: this.leaderboardPanel.style.top
        };
        
        try {
            localStorage.setItem('leaderboardWindowPosition', JSON.stringify(position));
        } catch (error) {
            console.error('Error saving leaderboard window position:', error);
        }
    }
    
    /**
     * Restore the window position from localStorage
     */
    restoreWindowPosition() {
        try {
            const savedPosition = localStorage.getItem('leaderboardWindowPosition');
            if (savedPosition && this.leaderboardPanel) {
                const position = JSON.parse(savedPosition);
                
                if (position.left && position.left !== 'auto') {
                    this.leaderboardPanel.style.left = position.left;
                }
                
                if (position.top && position.top !== 'auto') {
                    this.leaderboardPanel.style.top = position.top;
                }
            }
        } catch (error) {
            console.error('Error restoring leaderboard window position:', error);
        }
    }
}

export default LeaderboardUI; 