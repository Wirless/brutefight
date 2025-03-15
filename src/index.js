/**
 * Main entry point for the BruteFight game
 * 
 * Imports and initializes all necessary components
 */

// Import modules
import './managers';
import './systems';
import './ui';
import './equipment';
import './entities';

// Import main Game class
import Game from './core/Game.js';

// Initialize the game when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check for saved auth token
    const authToken = localStorage.getItem('authToken');
    
    // Initialize static objects for game
    window.hitRocks = new Set();
    window.rockHitTimes = new Map();
    window.rockParticles = [];
    window.rockHitDuration = 300; // ms
    
    // Create game instance with options
    const game = new Game({
        authToken,
        debug: true // Enable debug mode
    });
    
    // Initialize game
    game.init();
    
    // Make game globally available
    window.game = game;
    
    console.log('Game initialized');
}); 