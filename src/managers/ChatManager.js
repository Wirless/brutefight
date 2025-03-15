/**
 * ChatManager.js
 * 
 * Manages chat functionality including message display,
 * filtering, and user interaction.
 */
class ChatManager {
    /**
     * @param {Game} game - The main game instance
     */
    constructor(game) {
        this.game = game;
        this.messages = [];
        this.currentTab = 'all';
        this.unreadMessages = 0;
        this.isChatFocused = false;
        
        // DOM elements
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendButton = document.getElementById('sendButton');
        this.chatTabs = document.querySelectorAll('.chatTab');
        this.chatUnread = document.getElementById('chatUnread');
        
        // Initialize the chat
        this.init();
    }
    
    /**
     * Initialize chat functionality
     */
    init() {
        // Set up event listeners
        this.setupEventListeners();
        
        // Set initial active tab
        this.setActiveTab('all');
    }
    
    /**
     * Set up event listeners for chat functionality
     */
    setupEventListeners() {
        // Chat input focus
        this.chatInput.addEventListener('focus', () => {
            this.isChatFocused = true;
            this.game.isChatFocused = true;
            this.chatInput.style.outline = '2px solid rgb(255, 100, 100)';
            this.game.updateDebugInfo();
        });
        
        // Chat input blur
        this.chatInput.addEventListener('blur', () => {
            this.isChatFocused = false;
            this.game.isChatFocused = false;
            this.chatInput.style.outline = '2px solid rgb(0, 233, 150)';
            this.game.updateDebugInfo();
        });
        
        // Chat input keypress
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
                // Clicking elsewhere after sending a message should return focus to game
                document.activeElement.blur();
                this.isChatFocused = false;
                this.game.isChatFocused = false;
            }
        });
        
        // Send button click
        this.sendButton.addEventListener('click', () => {
            this.sendMessage();
            // Clicking send button should return focus to game
            this.chatInput.blur();
            this.isChatFocused = false;
            this.game.isChatFocused = false;
            // Re-enable movement
            this.game.canvas.focus();
        });
        
        // Chat tab switching
        this.chatTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.setActiveTab(tab.dataset.tab);
            });
        });
    }
    
    /**
     * Set the active chat tab
     * @param {string} tabName - Name of the tab to activate
     */
    setActiveTab(tabName) {
        // Remove active class from all tabs
        this.chatTabs.forEach(t => t.classList.remove('active'));
        
        // Add active class to clicked tab
        const activeTab = Array.from(this.chatTabs).find(t => t.dataset.tab === tabName);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // Update current tab
        this.currentTab = tabName;
        
        // Filter messages based on tab
        this.filterMessages();
        
        // Reset unread counter when switching to All tab
        if (this.currentTab === 'all') {
            this.unreadMessages = 0;
            this.chatUnread.style.display = 'none';
            this.chatUnread.textContent = '0';
        }
    }
    
    /**
     * Send a chat message
     */
    sendMessage() {
        const message = this.chatInput.value.trim();
        if (message) {
            // Send message to server using the Socket module
            if (this.game.socket) {
                this.game.socket.sendChatMessage(message, this.game.username);
            }
            
            // Clear input
            this.chatInput.value = '';
        }
    }
    
    /**
     * Add a message to the chat
     * @param {Object} msg - Message object {type, message, username?}
     */
    addMessage(msg) {
        // Add message to array
        this.messages.push(msg);
        
        // Limit chat history to 100 messages
        if (this.messages.length > 100) {
            this.messages.shift();
        }
        
        // Check if we should increment unread counter
        if (!this.isChatFocused && this.currentTab !== 'all' && msg.type !== 'system') {
            this.unreadMessages++;
            this.chatUnread.textContent = this.unreadMessages;
            this.chatUnread.style.display = 'inline-block';
        }
        
        // Update the chat display
        this.filterMessages();
    }
    
    /**
     * Filter chat messages based on current tab
     */
    filterMessages() {
        // Clear chat container
        this.chatMessages.innerHTML = '';
        
        // Filter messages
        const filteredMessages = this.currentTab === 'all' 
            ? this.messages 
            : this.messages.filter(msg => msg.type === this.currentTab);
        
        // Add messages to chat container
        filteredMessages.forEach(msg => {
            const messageElement = document.createElement('div');
            messageElement.className = `chatMessage ${msg.type}`;
            
            switch (msg.type) {
                case 'system':
                    messageElement.textContent = msg.message;
                    break;
                case 'movement':
                    messageElement.textContent = msg.message;
                    break;
                default:
                    // User message
                    const usernameSpan = document.createElement('span');
                    usernameSpan.className = msg.username === this.game.username ? 'username self' : 'username';
                    usernameSpan.textContent = msg.username + ': ';
                    
                    messageElement.appendChild(usernameSpan);
                    messageElement.appendChild(document.createTextNode(msg.message));
            }
            
            this.chatMessages.appendChild(messageElement);
        });
        
        // Scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    /**
     * Clear all chat messages
     */
    clearMessages() {
        this.messages = [];
        this.chatMessages.innerHTML = '';
    }
    
    /**
     * Check if chat input is focused
     * @returns {boolean} whether chat input is focused
     */
    isInputFocused() {
        return this.isChatFocused;
    }
}

// Make the ChatManager class globally available for backward compatibility
window.ChatManager = ChatManager;

// Add default export
export default ChatManager; 