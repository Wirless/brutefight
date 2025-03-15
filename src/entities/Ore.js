/**
 * Ore.js
 * 
 * Represents an ore entity in the game world,
 * handling ore properties, rendering, and interactions.
 */
class Ore {
    /**
     * @param {Object} options - Ore options
     */
    constructor(options = {}) {
        // Core properties
        this.id = options.id || Math.floor(Math.random() * 1000000);
        this.type = options.type || 'stone';
        this.name = options.name || 'Stone';
        this.x = options.x || 0;
        this.y = options.y || 0;
        
        // Appearance
        this.color = options.color || '#888';
        this.radius = options.radius || 20;
        this.borderColor = options.borderColor || '#666';
        
        // Gameplay properties
        this.health = options.health || 100;
        this.maxHealth = options.maxHealth || 100;
        this.hardness = options.hardness || 1;
        this.yield = options.yield || 1;
        this.expValue = options.expValue || 5;
        this.respawnTime = options.respawnTime || 60000; // 60 seconds
        
        // State
        this.broken = false;
        this.lastHitTime = 0;
        this.hitEffectDuration = 500; // ms
        
        // Animation
        this.animationOffset = Math.random() * Math.PI * 2;
        this.wobbleAmount = options.wobbleAmount || 0.2;
        this.wobbleSpeed = options.wobbleSpeed || 0.001;
    }
    
    /**
     * Update ore state
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // Update hit effect
        if (Date.now() - this.lastHitTime > this.hitEffectDuration) {
            // No longer showing hit effect
        }
    }
    
    /**
     * Draw the ore
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     */
    draw(ctx, screenX, screenY) {
        if (this.broken) return;
        
        // Calculate wobble effect
        const time = Date.now() * this.wobbleSpeed;
        const wobbleX = Math.sin(time + this.animationOffset) * this.wobbleAmount;
        const wobbleY = Math.cos(time + this.animationOffset * 0.7) * this.wobbleAmount;
        
        // Is the ore being hit?
        const isHit = Date.now() - this.lastHitTime < this.hitEffectDuration;
        
        // Draw ore shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(
            screenX,
            screenY + this.radius - 5,
            this.radius * 0.8,
            this.radius * 0.4,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // Draw ore body with wobble
        this.drawOreBody(ctx, screenX + wobbleX, screenY + wobbleY, isHit);
        
        // Draw health bar if damaged
        if (this.health < this.maxHealth) {
            this.drawHealthBar(ctx, screenX, screenY);
        }
        
        // Draw hit effect
        if (isHit) {
            this.drawHitEffect(ctx, screenX, screenY);
        }
    }
    
    /**
     * Draw the body of the ore
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {boolean} isHit - Whether the ore is being hit
     */
    drawOreBody(ctx, x, y, isHit) {
        // Base shape
        ctx.fillStyle = isHit ? this.getHitColor() : this.color;
        ctx.beginPath();
        ctx.arc(x, y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Add some texture based on ore type
        this.drawOreTexture(ctx, x, y);
    }
    
    /**
     * Draw texture details on the ore
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    drawOreTexture(ctx, x, y) {
        ctx.save();
        ctx.clip(); // Clip to ore circle
        
        // Draw texture based on ore type
        switch (this.type) {
            case 'stone':
                this.drawStoneTexture(ctx, x, y);
                break;
            case 'copper':
                this.drawCopperTexture(ctx, x, y);
                break;
            case 'iron':
                this.drawIronTexture(ctx, x, y);
                break;
            case 'gold':
                this.drawGoldTexture(ctx, x, y);
                break;
            case 'diamond':
                this.drawDiamondTexture(ctx, x, y);
                break;
            default:
                // No special texture
                break;
        }
        
        ctx.restore();
    }
    
    /**
     * Draw stone texture
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    drawStoneTexture(ctx, x, y) {
        // Add some grainy texture
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        
        // Use a consistent random pattern based on ore ID
        const seed = this.id % 1000;
        
        for (let i = 0; i < 10; i++) {
            const angle = (seed * 0.1 + i * 0.6) * Math.PI * 2;
            const distance = (seed * 0.01 + i * 0.1) * this.radius * 0.8;
            
            const spotX = x + Math.cos(angle) * distance;
            const spotY = y + Math.sin(angle) * distance;
            const spotSize = this.radius * 0.2;
            
            ctx.beginPath();
            ctx.arc(spotX, spotY, spotSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    /**
     * Draw copper texture
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    drawCopperTexture(ctx, x, y) {
        // Add copper vein patterns
        ctx.strokeStyle = '#c77';
        ctx.lineWidth = 3;
        
        const seed = this.id % 1000;
        
        for (let i = 0; i < 3; i++) {
            const angleStart = (seed * 0.1 + i * 1.1) * Math.PI * 2;
            const angleEnd = angleStart + Math.PI * 0.5;
            
            ctx.beginPath();
            ctx.arc(
                x, 
                y, 
                this.radius * 0.6, 
                angleStart, 
                angleEnd
            );
            ctx.stroke();
        }
    }
    
    /**
     * Draw iron texture
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    drawIronTexture(ctx, x, y) {
        // Add iron fleck patterns
        ctx.fillStyle = '#aaa';
        
        const seed = this.id % 1000;
        
        for (let i = 0; i < 6; i++) {
            const angle = (seed * 0.1 + i * 0.9) * Math.PI * 2;
            const distance = (seed * 0.01 + i * 0.15) * this.radius * 0.7;
            
            const spotX = x + Math.cos(angle) * distance;
            const spotY = y + Math.sin(angle) * distance;
            
            ctx.beginPath();
            ctx.moveTo(spotX, spotY);
            ctx.lineTo(spotX + 5, spotY + 3);
            ctx.lineTo(spotX + 2, spotY + 7);
            ctx.lineTo(spotX - 3, spotY + 4);
            ctx.closePath();
            ctx.fill();
        }
    }
    
    /**
     * Draw gold texture
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    drawGoldTexture(ctx, x, y) {
        // Add gold shimmer
        ctx.fillStyle = '#ffda7a';
        
        const seed = this.id % 1000;
        const time = Date.now() * 0.002;
        
        for (let i = 0; i < 8; i++) {
            const angle = (seed * 0.1 + i * 0.8 + time * 0.1) * Math.PI * 2;
            const distance = (seed * 0.01 + i * 0.12) * this.radius * 0.7;
            
            const spotX = x + Math.cos(angle) * distance;
            const spotY = y + Math.sin(angle) * distance;
            const spotSize = 2 + Math.sin(time + i) * 1.5;
            
            ctx.beginPath();
            ctx.arc(spotX, spotY, spotSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    /**
     * Draw diamond texture
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    drawDiamondTexture(ctx, x, y) {
        // Add diamond sparkles
        const seed = this.id % 1000;
        const time = Date.now() * 0.003;
        
        for (let i = 0; i < 5; i++) {
            const angle = (seed * 0.1 + i * 1.3) * Math.PI * 2;
            const distance = (seed * 0.01 + i * 0.17) * this.radius * 0.6;
            
            const spotX = x + Math.cos(angle) * distance;
            const spotY = y + Math.sin(angle) * distance;
            
            // Draw diamond sparkle
            const sparkleSize = 4 + Math.sin(time + i * 0.7) * 2;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.drawStar(ctx, spotX, spotY, 4, sparkleSize, sparkleSize * 0.4);
            
            // Add blue tint
            ctx.fillStyle = 'rgba(100, 200, 255, 0.5)';
            this.drawStar(ctx, spotX, spotY, 4, sparkleSize * 0.6, sparkleSize * 0.2);
        }
    }
    
    /**
     * Draw a star shape
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} cx - Center X position
     * @param {number} cy - Center Y position
     * @param {number} spikes - Number of spikes
     * @param {number} outerRadius - Outer radius
     * @param {number} innerRadius - Inner radius
     */
    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }
    
    /**
     * Draw the health bar
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     */
    drawHealthBar(ctx, screenX, screenY) {
        const barWidth = this.radius * 2;
        const barHeight = 6;
        const barX = screenX - barWidth / 2;
        const barY = screenY - this.radius - 15;
        
        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health fill
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#0f0' : (healthPercent > 0.25 ? '#ff0' : '#f00');
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    }
    
    /**
     * Draw hit effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     */
    drawHitEffect(ctx, screenX, screenY) {
        // Calculate hit effect intensity (0-1)
        const timeSinceHit = Date.now() - this.lastHitTime;
        const intensity = 1 - (timeSinceHit / this.hitEffectDuration);
        
        // Draw glow effect
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(
            screenX, screenY, this.radius * 0.5,
            screenX, screenY, this.radius * 1.5
        );
        
        gradient.addColorStop(0, `rgba(255, 255, 0, ${0.3 * intensity})`);
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.arc(screenX, screenY, this.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw cracks
        ctx.strokeStyle = `rgba(0, 0, 0, ${0.7 * intensity})`;
        ctx.lineWidth = 2;
        
        const crackCount = 3 + Math.floor(3 * (1 - this.health / this.maxHealth));
        
        for (let i = 0; i < crackCount; i++) {
            const angle = (Math.PI * 2 * i / crackCount) + 
                        (0.2 * Math.sin(Date.now() / 100 + i));
            
            ctx.beginPath();
            ctx.moveTo(
                screenX + Math.cos(angle) * this.radius * 0.3,
                screenY + Math.sin(angle) * this.radius * 0.3
            );
            ctx.lineTo(
                screenX + Math.cos(angle) * this.radius * 0.9,
                screenY + Math.sin(angle) * this.radius * 0.9
            );
            ctx.stroke();
        }
    }
    
    /**
     * Get color to use when the ore is hit
     * @returns {string} - Color value
     */
    getHitColor() {
        // Flash between white and regular color
        const timeSinceHit = Date.now() - this.lastHitTime;
        const intensity = 1 - (timeSinceHit / this.hitEffectDuration);
        const flashSpeed = 0.1;
        
        if (Math.sin(timeSinceHit * flashSpeed) > 0) {
            return 'white';
        } else {
            return this.color;
        }
    }
    
    /**
     * Take damage from a source
     * @param {number} damage - Amount of damage
     * @param {Object} source - Source of the damage
     * @returns {boolean} - Whether the ore was destroyed
     */
    takeDamage(damage, source) {
        // Register hit
        this.lastHitTime = Date.now();
        
        // Apply damage
        this.health -= damage;
        
        // Check if destroyed
        if (this.health <= 0) {
            this.health = 0;
            this.break();
            return true;
        }
        
        return false;
    }
    
    /**
     * Break the ore
     */
    break() {
        this.broken = true;
        this.generateParticles(true);
        
        // Schedule respawn
        setTimeout(() => {
            this.respawn();
        }, this.respawnTime);
    }
    
    /**
     * Respawn the ore
     */
    respawn() {
        this.health = this.maxHealth;
        this.broken = false;
    }
    
    /**
     * Generate particles when the ore is hit or broken
     * @param {boolean} isBreaking - Whether the ore is breaking (more particles)
     * @returns {Array} - Array of particle objects
     */
    generateParticles(isBreaking = false) {
        const particles = [];
        const particleCount = isBreaking ? 15 : 5;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            const size = 2 + Math.random() * 4;
            const life = 500 + Math.random() * 1000;
            
            particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                color: this.color,
                life: life,
                maxLife: life,
                gravity: 0.05 + Math.random() * 0.1
            });
        }
        
        return particles;
    }
    
    /**
     * Check if a point is inside this ore
     * @param {number} x - X position to check
     * @param {number} y - Y position to check
     * @returns {boolean} - Whether the point is inside
     */
    containsPoint(x, y) {
        if (this.broken) return false;
        
        const dx = this.x - x;
        const dy = this.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance <= this.radius;
    }
    
    /**
     * Get distance from a point to this ore
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {number} - Distance to the point
     */
    distanceTo(x, y) {
        const dx = this.x - x;
        const dy = this.y - y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Get collision boundaries
     * @returns {Object} - Collision bounds { minX, maxX, minY, maxY }
     */
    getBounds() {
        return {
            minX: this.x - this.radius,
            maxX: this.x + this.radius,
            minY: this.y - this.radius,
            maxY: this.y + this.radius
        };
    }
}

// Create specific ore types as subclasses
class StoneOre extends Ore {
    constructor(x, y) {
        super({
            type: 'stone',
            name: 'Stone',
            x: x,
            y: y,
            color: '#aaa',
            borderColor: '#888',
            radius: 20,
            health: 100,
            maxHealth: 100,
            hardness: 1,
            yield: 1,
            expValue: 5,
            respawnTime: 60000, // 1 minute
            wobbleAmount: 0.2
        });
    }
}

class CopperOre extends Ore {
    constructor(x, y) {
        super({
            type: 'copper',
            name: 'Copper',
            x: x,
            y: y,
            color: '#d27d2c',
            borderColor: '#a15a1e',
            radius: 22,
            health: 150,
            maxHealth: 150,
            hardness: 2,
            yield: 1,
            expValue: 8,
            respawnTime: 90000, // 1.5 minutes
            wobbleAmount: 0.15
        });
    }
}

class IronOre extends Ore {
    constructor(x, y) {
        super({
            type: 'iron',
            name: 'Iron',
            x: x,
            y: y,
            color: '#a19d94',
            borderColor: '#7a7671',
            radius: 25,
            health: 200,
            maxHealth: 200,
            hardness: 3,
            yield: 1,
            expValue: 12,
            respawnTime: 120000, // 2 minutes
            wobbleAmount: 0.1
        });
    }
}

class GoldOre extends Ore {
    constructor(x, y) {
        super({
            type: 'gold',
            name: 'Gold',
            x: x,
            y: y,
            color: '#ffd700',
            borderColor: '#b09000',
            radius: 18,
            health: 100,
            maxHealth: 100,
            hardness: 4,
            yield: 1,
            expValue: 15,
            respawnTime: 180000, // 3 minutes
            wobbleAmount: 0.25
        });
    }
}

class DiamondOre extends Ore {
    constructor(x, y) {
        super({
            type: 'diamond',
            name: 'Diamond',
            x: x,
            y: y,
            color: '#88c0ee',
            borderColor: '#6491ba',
            radius: 16,
            health: 250,
            maxHealth: 250,
            hardness: 5,
            yield: 1,
            expValue: 25,
            respawnTime: 300000, // 5 minutes
            wobbleAmount: 0.3
        });
    }
}

// Export ore types globally
window.Ore = Ore;
window.StoneOre = StoneOre;
window.CopperOre = CopperOre;
window.IronOre = IronOre;
window.GoldOre = GoldOre;
window.DiamondOre = DiamondOre;

// Create a namespace for all ore types - modify to work with OreManager
window.Ores = {
    // OreManager expects functions that take (x,y) parameters
    stone: (x, y) => new StoneOre(x, y),
    copper: (x, y) => new CopperOre(x, y),
    iron: (x, y) => new IronOre(x, y), 
    gold: (x, y) => new GoldOre(x, y),
    diamond: (x, y) => new DiamondOre(x, y)
}; 

// Export the ore classes individually for ES modules
export { 
    Ore,
    StoneOre,
    CopperOre,
    IronOre,
    GoldOre,
    DiamondOre
};

export default Ore;