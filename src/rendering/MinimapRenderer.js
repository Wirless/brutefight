/**
 * MinimapRenderer.js
 * 
 * Handles rendering of the game minimap, showing player position
 * and other relevant game entities in a condensed view.
 */
class MinimapRenderer {
    /**
     * Initialize the minimap renderer
     * @param {Game} game - Reference to the main game object
     */
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('minimapCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scale = 0.1; // Scale factor for minimap (1/10 of main view)
        this.visible = true;
        
        // Bind methods
        this.render = this.render.bind(this);
        this.toggle = this.toggle.bind(this);
        
        // Initialize minimap size
        this.resizeMinimap();
        
        // Add event listener for window resize
        window.addEventListener('resize', () => this.resizeMinimap());
    }
    
    /**
     * Resize the minimap based on window size
     */
    resizeMinimap() {
        this.canvas.width = 150;
        this.canvas.height = 150;
    }
    
    /**
     * Toggle minimap visibility
     */
    toggle() {
        this.visible = !this.visible;
        this.canvas.style.display = this.visible ? 'block' : 'none';
    }
    
    /**
     * Render the minimap
     */
    render() {
        if (!this.visible || !this.game.myPlayer) return;
        
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw minimap background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw border
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
        
        // Calculate center of minimap
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Draw player position (center of minimap)
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw other players
        if (this.game.players) {
            for (const playerName in this.game.players) {
                // Skip current player (already drawn at center)
                if (playerName === this.game.username) continue;
                
                const player = this.game.players[playerName];
                const relativeX = (player.x - this.game.myPlayer.x) * this.scale + centerX;
                const relativeY = (player.y - this.game.myPlayer.y) * this.scale + centerY;
                
                // Only draw if within minimap bounds
                if (relativeX >= 0 && relativeX <= canvas.width && 
                    relativeY >= 0 && relativeY <= canvas.height) {
                    ctx.fillStyle = player.color || '#0ff';
                    ctx.beginPath();
                    ctx.arc(relativeX, relativeY, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        // Draw ores if available
        if (this.game.oreManager && this.game.oreManager.getOres) {
            const ores = this.game.oreManager.getOres();
            ctx.fillStyle = '#888';
            
            for (const ore of ores) {
                const relativeX = (ore.x - this.game.myPlayer.x) * this.scale + centerX;
                const relativeY = (ore.y - this.game.myPlayer.y) * this.scale + centerY;
                
                // Only draw if within minimap bounds
                if (relativeX >= 0 && relativeX <= canvas.width && 
                    relativeY >= 0 && relativeY <= canvas.height) {
                    ctx.fillRect(relativeX - 1, relativeY - 1, 2, 2);
                }
            }
        }
        
        // Draw viewport rectangle (what's visible on main canvas)
        const viewWidth = this.game.canvas.width * this.scale;
        const viewHeight = this.game.canvas.height * this.scale;
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            centerX - viewWidth / 2,
            centerY - viewHeight / 2,
            viewWidth,
            viewHeight
        );
    }
}

// Make class available globally
window.MinimapRenderer = MinimapRenderer;

// Export the class
export default MinimapRenderer; 