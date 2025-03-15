/**
 * Renderer.js
 * 
 * Handles all game rendering functionality including
 * floor, players, ores, particles, and UI elements.
 */
class Renderer {
    /**
     * @param {Game} game - The main game instance
     */
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.minimapCtx = game.minimapCtx;
        this.cameraX = game.cameraX;
        this.cameraY = game.cameraY;
        
        // Constants
        this.TILE_SIZE = game.TILE_SIZE;
        this.GRASS_TILE_SIZE = 64;
        this.PLAYER_SIZE = 32;
        
        // Grass rendering
        this.grassColors = [
            '#3a5e3a', // Dark green
            '#4a7a4a', // Medium green
            '#5c8a5c', // Light green
            '#2e4e2e', // Very dark green
            '#6b9a6b'  // Very light green
        ];
        this.grassPatterns = [];
        
        // Generate grass patterns
        this.generateGrassPatterns();
    }
    
    /**
     * Generate pre-rendered grass patterns for performance
     */
    generateGrassPatterns() {
        for (let i = 0; i < 5; i++) {
            const pattern = document.createElement('canvas');
            pattern.width = this.GRASS_TILE_SIZE;
            pattern.height = this.GRASS_TILE_SIZE;
            const patternCtx = pattern.getContext('2d');
            
            // Fill with base color
            patternCtx.fillStyle = this.grassColors[0];
            patternCtx.fillRect(0, 0, this.GRASS_TILE_SIZE, this.GRASS_TILE_SIZE);
            
            // Add some random grass details
            for (let j = 0; j < 10; j++) {
                const x = Math.random() * this.GRASS_TILE_SIZE;
                const y = Math.random() * this.GRASS_TILE_SIZE;
                const size = 2 + Math.random() * 4;
                patternCtx.fillStyle = this.grassColors[Math.floor(Math.random() * this.grassColors.length)];
                patternCtx.beginPath();
                patternCtx.arc(x, y, size, 0, Math.PI * 2);
                patternCtx.fill();
            }
            
            this.grassPatterns.push(pattern);
        }
    }
    
    /**
     * Render the floor/ground
     * @param {number} cameraX - Camera X position
     * @param {number} cameraY - Camera Y position
     */
    renderFloor(cameraX, cameraY) {
        // Update camera position from game if not provided
        this.cameraX = cameraX || this.game.cameraX;
        this.cameraY = cameraY || this.game.cameraY;
        
        // Calculate visible tile range for larger grid
        const startTileX = Math.floor(this.cameraX / this.TILE_SIZE);
        const startTileY = Math.floor(this.cameraY / this.TILE_SIZE);
        const endTileX = startTileX + Math.ceil(this.game.canvas.width / this.TILE_SIZE) + 1;
        const endTileY = startTileY + Math.ceil(this.game.canvas.height / this.TILE_SIZE) + 1;
        
        // Calculate visible grass tile range
        const startGrassTileX = Math.floor(this.cameraX / this.GRASS_TILE_SIZE);
        const startGrassTileY = Math.floor(this.cameraY / this.GRASS_TILE_SIZE);
        const endGrassTileX = startGrassTileX + Math.ceil(this.game.canvas.width / this.GRASS_TILE_SIZE) + 1;
        const endGrassTileY = startGrassTileY + Math.ceil(this.game.canvas.height / this.GRASS_TILE_SIZE) + 1;
    
        // First draw the base color
        this.ctx.fillStyle = this.grassColors[0];
        this.ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
        
        // Draw grass tiles with variation
        for (let x = startGrassTileX; x <= endGrassTileX; x++) {
            for (let y = startGrassTileY; y <= endGrassTileY; y++) {
                const screenX = x * this.GRASS_TILE_SIZE - Math.floor(this.cameraX);
                const screenY = y * this.GRASS_TILE_SIZE - Math.floor(this.cameraY);
                
                // Use a deterministic but varied pattern based on position
                const patternIndex = Math.abs((x * 7 + y * 13) % this.grassPatterns.length);
                this.ctx.drawImage(
                    this.grassPatterns[patternIndex], 
                    screenX, 
                    screenY, 
                    this.GRASS_TILE_SIZE, 
                    this.GRASS_TILE_SIZE
                );
            }
        }
        
        // Draw grid lines - make them more subtle for grass
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
        this.ctx.lineWidth = 1;
        
        // Vertical grid lines
        for (let x = startTileX; x <= endTileX; x++) {
            const screenX = x * this.TILE_SIZE - Math.floor(this.cameraX);
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, 0);
            this.ctx.lineTo(screenX, this.game.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal grid lines
        for (let y = startTileY; y <= endTileY; y++) {
            const screenY = y * this.TILE_SIZE - Math.floor(this.cameraY);
            this.ctx.beginPath();
            this.ctx.moveTo(0, screenY);
            this.ctx.lineTo(this.game.canvas.width, screenY);
            this.ctx.stroke();
        }
    }
    
    /**
     * Render a single player
     * @param {number} x - Player X position
     * @param {number} y - Player Y position
     * @param {string} color - Player color
     * @param {string} name - Player name
     * @param {boolean} isCurrentPlayer - Whether this is the current player
     * @param {number} level - Player level
     * @param {string} title - Player title
     */
    renderPlayer(x, y, color, name, isCurrentPlayer, level, title) {
        // Convert world coordinates to screen coordinates
        const screenX = x - Math.floor(this.cameraX);
        const screenY = y - Math.floor(this.cameraY);
        
        // Only draw if player is visible on screen (with some buffer)
        if (screenX < -this.PLAYER_SIZE || screenX > this.game.canvas.width + this.PLAYER_SIZE || 
            screenY < -this.PLAYER_SIZE || screenY > this.game.canvas.height + this.PLAYER_SIZE) {
            return;
        }
        
        // Draw player square
        this.ctx.fillStyle = isCurrentPlayer ? 'red' : color;
        this.ctx.fillRect(
            screenX - this.PLAYER_SIZE/2, 
            screenY - this.PLAYER_SIZE/2, 
            this.PLAYER_SIZE, 
            this.PLAYER_SIZE
        );
        
        // Draw player border
        this.ctx.strokeStyle = isCurrentPlayer ? '#000' : '#555';
        this.ctx.lineWidth = isCurrentPlayer ? 3 : 1;
        this.ctx.strokeRect(
            screenX - this.PLAYER_SIZE/2, 
            screenY - this.PLAYER_SIZE/2, 
            this.PLAYER_SIZE, 
            this.PLAYER_SIZE
        );
        
        // Draw player title if available
        if (title) {
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = 'rgb(0, 233, 150)';
            
            // Create an outline effect for the title
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 3;
            this.ctx.strokeText(title, screenX, screenY - 40);
            this.ctx.fillText(title, screenX, screenY - 40);
        }
        
        // Draw player name with level
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = isCurrentPlayer ? 'white' : '#EEE';
        
        // Format name with level
        const displayName = level ? `[${level}] ${name}` : name;
        
        // Create an outline effect for the name
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 3;
        this.ctx.strokeText(displayName, screenX, screenY - 20);
        this.ctx.fillText(displayName, screenX, screenY - 20);
        
        // Draw indicator for current player
        if (isCurrentPlayer) {
            this.ctx.font = '12px Arial';
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 2;
            this.ctx.strokeText('(You)', screenX, screenY - 5);
            this.ctx.fillStyle = 'white';
            this.ctx.fillText('(You)', screenX, screenY - 5);
        }
    }
    
    /**
     * Render all players
     * @param {Object} players - All players in the game
     * @param {string} currentUsername - Current player's username
     */
    renderPlayers(players, currentUsername) {
        for (const playerName in players) {
            const player = players[playerName];
            const isCurrentPlayer = playerName === currentUsername;
            
            // For the current player, use the local position for smoother movement
            const drawX = isCurrentPlayer ? this.game.myPlayer.x : player.x;
            const drawY = isCurrentPlayer ? this.game.myPlayer.y : player.y;
            
            this.renderPlayer(
                drawX,
                drawY,
                player.color,
                playerName,
                isCurrentPlayer,
                player.level,
                player.title
            );
        }
    }
    
    /**
     * Render particles (rock debris, etc.)
     */
    renderParticles() {
        const now = Date.now();
        
        for (const particle of window.rockParticles) {
            const screenX = particle.x - Math.floor(this.cameraX);
            const screenY = particle.y - Math.floor(this.cameraY);
            
            // Skip if off-screen
            if (screenX < 0 || screenX > this.game.canvas.width || 
                screenY < 0 || screenY > this.game.canvas.height) {
                continue;
            }
            
            // Calculate opacity based on remaining life
            const lifeRatio = 1 - (now - particle.created) / particle.life;
            const alpha = lifeRatio;
            
            // Set fill style with proper alpha
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = alpha;
            
            // Draw particle based on shape
            if (particle.shape === 'square') {
                // Draw square particle
                const halfSize = particle.size / 2;
                this.ctx.fillRect(screenX - halfSize, screenY - halfSize, particle.size, particle.size);
            } else {
                // Draw circular particle (default)
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Reset global alpha
            this.ctx.globalAlpha = 1.0;
        }
    }
    
    /**
     * Render the minimap
     */
    renderMinimap() {
        const mapWidth = this.game.minimapCanvas.width;
        const mapHeight = this.game.minimapCanvas.height;
        
        // Scale factor for the minimap (1 pixel = 50 world units)
        const scale = 50;
        
        // Clear minimap
        this.minimapCtx.fillStyle = 'rgba(0, 150, 80, 0.3)';
        this.minimapCtx.fillRect(0, 0, mapWidth, mapHeight);
        
        // Add some grass texture to minimap
        this.minimapCtx.globalAlpha = 0.3;
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * mapWidth;
            const y = Math.random() * mapHeight;
            const size = 1 + Math.random() * 3;
            this.minimapCtx.fillStyle = this.grassColors[Math.floor(Math.random() * this.grassColors.length)];
            this.minimapCtx.beginPath();
            this.minimapCtx.arc(x, y, size, 0, Math.PI * 2);
            this.minimapCtx.fill();
        }
        this.minimapCtx.globalAlpha = 1.0;
        
        // Calculate the center of the minimap
        const centerX = mapWidth / 2;
        const centerY = mapHeight / 2;
        
        // Draw minimap grid (optional)
        this.minimapCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.minimapCtx.lineWidth = 1;
        
        // Draw grid lines
        for (let x = 0; x <= mapWidth; x += 10) {
            this.minimapCtx.beginPath();
            this.minimapCtx.moveTo(x, 0);
            this.minimapCtx.lineTo(x, mapHeight);
            this.minimapCtx.stroke();
        }
        
        for (let y = 0; y <= mapHeight; y += 10) {
            this.minimapCtx.beginPath();
            this.minimapCtx.moveTo(0, y);
            this.minimapCtx.lineTo(mapWidth, y);
            this.minimapCtx.stroke();
        }
        
        // Draw all players on minimap
        for (const playerName in this.game.players) {
            const player = this.game.players[playerName];
            const isCurrentPlayer = playerName === this.game.username;
            
            // Convert world position to minimap position (relative to the current player)
            const playerX = centerX + (player.x - this.game.myPlayer.x) / scale;
            const playerY = centerY + (player.y - this.game.myPlayer.y) / scale;
            
            // Only draw if within minimap bounds
            if (playerX >= 0 && playerX <= mapWidth && playerY >= 0 && playerY <= mapHeight) {
                // Draw player dot
                this.minimapCtx.fillStyle = isCurrentPlayer ? 'red' : player.color;
                this.minimapCtx.beginPath();
                this.minimapCtx.arc(playerX, playerY, isCurrentPlayer ? 4 : 3, 0, Math.PI * 2);
                this.minimapCtx.fill();
                
                // Draw player name on minimap (only if it's the current player)
                if (isCurrentPlayer) {
                    this.minimapCtx.fillStyle = 'white';
                    this.minimapCtx.font = '8px Arial';
                    this.minimapCtx.textAlign = 'center';
                    this.minimapCtx.fillText('YOU', playerX, playerY - 5);
                }
            }
        }
        
        // Draw a border around the viewport area
        const viewportWidth = this.game.canvas.width / scale;
        const viewportHeight = this.game.canvas.height / scale;
        this.minimapCtx.strokeStyle = 'white';
        this.minimapCtx.lineWidth = 1;
        this.minimapCtx.strokeRect(
            centerX - viewportWidth / 2,
            centerY - viewportHeight / 2,
            viewportWidth,
            viewportHeight
        );
    }
    
    /**
     * Render the entire game scene
     */
    render() {
        // Update camera position from game
        this.cameraX = this.game.cameraX;
        this.cameraY = this.game.cameraY;
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.game.canvas.width, this.game.canvas.height);
        
        // Draw floor
        this.renderFloor(this.cameraX, this.cameraY);
        
        // Draw ores
        this.game.oreManager.drawOres(this.ctx, this.cameraX, this.cameraY);
        
        // Draw particles
        this.renderParticles();
        
        // Draw experience orbs
        if (window.expOrbManager) {
            window.expOrbManager.draw(this.ctx, this.cameraX, this.cameraY);
        }
        
        // Draw all players
        this.renderPlayers(this.game.players, this.game.username);
        
        // Draw attack effect
        this.renderAttackEffect();
        
        // Update minimap
        this.renderMinimap();
    }
    
    /**
     * Render attack effect
     */
    renderAttackEffect() {
        if (this.game.currentAttack) {
            this.game.currentAttack.draw(this.cameraX, this.cameraY);
        }
    }
    
    /**
     * Preload all sprites used in the game
     */
    preloadSprites() {
        const sprites = [
            'sprites/axe.png',
            'sprites/pickaxe_placeholder.png'
        ];
        
        console.log('Preloading sprites...');
        
        sprites.forEach(spritePath => {
            const img = new Image();
            img.src = spritePath;
            img.onload = () => console.log(`Loaded sprite: ${spritePath}`);
            img.onerror = () => console.warn(`Failed to load sprite: ${spritePath}`);
        });
    }
}

// Make the Renderer class globally available
window.Renderer = Renderer; 

//add default export
export default Renderer;