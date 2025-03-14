/**
 * main.js
 * 
 * Main entry point for the game. Initializes all game systems
 * and starts the game.
 */

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('BruteFight - Initializing Game...');
    
    // Check if browser supports required features
    if (!checkBrowserSupport()) {
        showBrowserSupportError();
        return;
    }
    
    // Preload assets
    preloadAssets(() => {
        // Create and initialize the game
        const game = new Game();
        
        // Make game globally available
        window.game = game;
        
        // Initialize game
        game.init();
        
        console.log('Game initialized successfully!');
    });
});

/**
 * Check if the browser supports required features
 * @returns {boolean} - Whether browser is supported
 */
function checkBrowserSupport() {
    // Check for canvas support
    const canvas = document.createElement('canvas');
    const hasCanvas = !!(canvas.getContext && canvas.getContext('2d'));
    
    // Check for WebSocket support
    const hasWebSocket = 'WebSocket' in window;
    
    // Check for localStorage support
    let hasLocalStorage = false;
    try {
        hasLocalStorage = 'localStorage' in window && window.localStorage !== null;
    } catch (e) {
        // localStorage might be disabled
    }
    
    return hasCanvas && hasWebSocket && hasLocalStorage;
}

/**
 * Show an error message if browser isn't supported
 */
function showBrowserSupportError() {
    const gamePanel = document.getElementById('gamePanel');
    const loginPanel = document.getElementById('loginPanel');
    
    if (loginPanel) {
        loginPanel.style.display = 'none';
    }
    
    if (gamePanel) {
        gamePanel.innerHTML = `
            <div class="browser-error">
                <h2>Browser Not Supported</h2>
                <p>Your browser doesn't support all the features required to play BruteFight.</p>
                <p>Please try using a modern browser like Chrome, Firefox, or Edge.</p>
            </div>
        `;
        gamePanel.style.display = 'block';
    }
}

/**
 * Preload all required game assets
 * @param {Function} callback - Function to call when preloading is complete
 */
function preloadAssets(callback) {
    console.log('Preloading assets...');
    
    // Assets to preload
    const assets = {
        images: [
            'sprites/axe.png',
            'sprites/pickaxe_placeholder.png'
        ],
        sounds: [
            'sounds/hit.mp3',
            'sounds/hit2.mp3'
        ]
    };
    
    // Count total assets and loaded assets
    const totalAssets = assets.images.length + assets.sounds.length;
    let loadedAssets = 0;
    
    // Function to call when an asset is loaded
    function assetLoaded() {
        loadedAssets++;
        
        // If all assets are loaded, call the callback
        if (loadedAssets >= totalAssets) {
            console.log('All assets loaded successfully!');
            callback();
        }
    }
    
    // Preload images
    assets.images.forEach(imagePath => {
        const img = new Image();
        img.onload = assetLoaded;
        img.onerror = () => {
            console.warn(`Failed to load image: ${imagePath}`);
            assetLoaded(); // Count as loaded even if it failed
        };
        img.src = imagePath;
    });
    
    // Preload sounds
    assets.sounds.forEach(soundPath => {
        const sound = new Audio();
        sound.addEventListener('canplaythrough', assetLoaded, { once: true });
        sound.addEventListener('error', () => {
            console.warn(`Failed to load sound: ${soundPath}`);
            assetLoaded(); // Count as loaded even if it failed
        });
        sound.src = soundPath;
        // Preload but don't play
        sound.load();
    });
    
    // If there are no assets to load, call the callback immediately
    if (totalAssets === 0) {
        callback();
    }
} 