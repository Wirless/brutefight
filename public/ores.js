// Ore System for the game
// Contains different ore types and their implementations

class Ore {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.width = options.width || 40;
        this.height = options.height || 60;
        this.health = options.health || 100;
        this.maxHealth = this.health;
        this.color = options.color || '#555555';
        this.points = [];
        this.collisionBox = {
            left: x - this.width / 2,
            right: x + this.width / 2,
            top: y - this.height / 2,
            bottom: y + this.height / 2
        };
        this.isHit = false;
        this.lastHitTime = 0;
        this.hitDuration = 500; // ms
        this.experience = options.experience || 5; // Default experience per ore
        this.generateShape();
    }
    
    generateShape() {
        // Generate random shape points (5-8 points)
        const pointCount = 5 + Math.floor(Math.random() * 4);
        
        for (let j = 0; j < pointCount; j++) {
            // Generate points around the perimeter of the ore
            const pointAngle = (j / pointCount) * Math.PI * 2;
            
            // Add some randomness to the radius to create irregular shapes
            const radiusX = this.width / 2 * (0.8 + Math.random() * 0.4);
            const radiusY = this.height / 2 * (0.8 + Math.random() * 0.4);
            
            this.points.push({
                x: this.x + Math.cos(pointAngle) * radiusX,
                y: this.y + Math.sin(pointAngle) * radiusY
            });
        }
    }
    
    draw(ctx, cameraX, cameraY) {
        // Check if ore is visible on screen (with some buffer)
        const screenX = this.x - Math.floor(cameraX);
        const screenY = this.y - Math.floor(cameraY);
        
        if (screenX + this.width / 2 < 0 || screenX - this.width / 2 > ctx.canvas.width ||
            screenY + this.height / 2 < 0 || screenY - this.height / 2 > ctx.canvas.height) {
            return; // Skip ores that are off-screen
        }
        
        // Draw the ore shape
        ctx.fillStyle = this.color;
        ctx.beginPath();
        
        // Draw the ore shape using its points
        if (this.points.length > 0) {
            const firstPoint = this.points[0];
            ctx.moveTo(
                firstPoint.x - Math.floor(cameraX),
                firstPoint.y - Math.floor(cameraY)
            );
            
            for (let j = 1; j < this.points.length; j++) {
                const point = this.points[j];
                ctx.lineTo(
                    point.x - Math.floor(cameraX),
                    point.y - Math.floor(cameraY)
                );
            }
            
            // Close the path back to the first point
            ctx.closePath();
        }
        
        // Fill and stroke the ore
        ctx.fill();
        
        // Add a darker stroke for definition
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Add texture/detail specific to the ore type
        this.drawTexture(ctx, screenX, screenY, cameraX, cameraY);
        
        // Draw hit effect if recently hit
        this.drawHitEffect(ctx, cameraX, cameraY);
        
        // Draw health bar if damaged
        if (this.health < this.maxHealth) {
            this.drawHealthBar(ctx, screenX, screenY);
        }
    }
    
    drawTexture(ctx, screenX, screenY, cameraX, cameraY) {
        // Base class just adds some generic details
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        for (let j = 0; j < 5; j++) {
            const detailX = this.x - this.width / 3 + Math.random() * this.width / 1.5 - Math.floor(cameraX);
            const detailY = this.y - this.height / 3 + Math.random() * this.height / 1.5 - Math.floor(cameraY);
            const detailSize = 2 + Math.random() * 5;
            
            ctx.beginPath();
            ctx.arc(detailX, detailY, detailSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawHitEffect(ctx, cameraX, cameraY) {
        if (!this.isHit) return;
        
        const now = Date.now();
        const timeSinceHit = now - this.lastHitTime;
        
        if (timeSinceHit < this.hitDuration) {
            // Draw hit effect (glow)
            const alpha = 0.7 * (1 - timeSinceHit / this.hitDuration);
            
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.getHitColor();
            
            // Draw glow effect
            if (this.points.length > 0) {
                ctx.beginPath();
                const firstPoint = this.points[0];
                ctx.moveTo(
                    firstPoint.x - Math.floor(cameraX),
                    firstPoint.y - Math.floor(cameraY)
                );
                
                for (let j = 1; j < this.points.length; j++) {
                    const point = this.points[j];
                    ctx.lineTo(
                        point.x - Math.floor(cameraX),
                        point.y - Math.floor(cameraY)
                    );
                }
                
                ctx.closePath();
                ctx.fill();
            }
            
            ctx.restore();
        } else {
            // Hit effect expired
            this.isHit = false;
        }
    }
    
    drawHealthBar(ctx, screenX, screenY) {
        const barWidth = this.width * 0.8;
        const barHeight = 6;
        const barX = screenX - barWidth / 2;
        const barY = screenY - this.height / 2 - 15;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health fill
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = this.getHealthColor(healthPercent);
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
    
    getHealthColor(percent) {
        if (percent > 0.6) return 'rgb(0, 200, 0)'; // Green
        if (percent > 0.3) return 'rgb(200, 200, 0)'; // Yellow
        return 'rgb(200, 0, 0)'; // Red
    }
    
    getHitColor() {
        return 'rgba(255, 0, 0, 0.3)'; // Default red glow
    }
    
    hit(damage) {
        this.health -= damage || 10;
        this.isHit = true;
        this.lastHitTime = Date.now();
        
        // Check if destroyed
        if (this.health <= 0) {
            this.health = 0;
            return true; // Destroyed
        }
        return false; // Not destroyed
    }
    
    generateParticles() {
        // Base method for generating hit particles
        // To be implemented by subclasses
        return [];
    }
    
    getDrops() {
        // Stone drops stone resources
        return {
            resources: [
                {
                    type: 'rocks',
                    amount: 1 + Math.floor(Math.random() * 3),
                    name: 'Rock',
                    description: 'A common rock mined from stone.',
                    icon: 'rock-svg'
                }
            ],
            experience: this.experience
        };
    }
    
    checkCollision(x, y, radius) {
        // Quick bounding box check
        if (x + radius > this.collisionBox.left &&
            x - radius < this.collisionBox.right &&
            y + radius > this.collisionBox.top &&
            y - radius < this.collisionBox.bottom) {
            
            // For more accurate collision, check distance to center
            const dx = x - this.x;
            const dy = y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If player is too close to ore center, collision detected
            if (distance < (this.width + this.height) / 4 + radius) {
                return true; // Collision detected
            }
        }
        
        return false; // No collision
    }
}

class Stone extends Ore {
    constructor(x, y) {
        super(x, y, {
            width: 30 + Math.random() * 50,
            height: 30 + Math.random() * 50,
            health: 50 + Math.random() * 50,
            color: '#777777',
            experience: 5 + Math.floor(Math.random() * 3) // 5-7 exp per stone
        });
        
        // Stone-specific properties
        this.stoneType = Math.floor(Math.random() * 3); // 0: granite, 1: limestone, 2: basalt
        this.crackLevel = 0; // 0-3, increases as health decreases
    }
    
    static getRandomStoneColor() {
        const colors = [
            '#555555', // Medium gray
            '#666666', // Light gray
            '#444444', // Dark gray
            '#505050', // Slate gray
            '#595959'  // Charcoal gray
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    drawTexture(ctx, screenX, screenY, cameraX, cameraY) {
        // Add stone-specific texture
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        
        // Add cracks based on damage level
        this.updateCrackLevel();
        
        if (this.crackLevel > 0) {
            // Draw cracks
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.lineWidth = 1;
            
            const crackCount = 2 + this.crackLevel * 2;
            for (let i = 0; i < crackCount; i++) {
                const startX = screenX - this.width / 3 + Math.random() * this.width / 1.5;
                const startY = screenY - this.height / 3 + Math.random() * this.height / 1.5;
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                
                // Create a jagged line (crack)
                let currentX = startX;
                let currentY = startY;
                const segments = 2 + Math.floor(Math.random() * 3);
                
                for (let j = 0; j < segments; j++) {
                    const length = 5 + Math.random() * 10;
                    const angle = Math.random() * Math.PI * 2;
                    
                    currentX += Math.cos(angle) * length;
                    currentY += Math.sin(angle) * length;
                    
                    ctx.lineTo(currentX, currentY);
                }
                
                ctx.stroke();
            }
        }
        
        // Add some texture details
        for (let j = 0; j < 5; j++) {
            const detailX = this.x - this.width / 3 + Math.random() * this.width / 1.5 - Math.floor(cameraX);
            const detailY = this.y - this.height / 3 + Math.random() * this.height / 1.5 - Math.floor(cameraY);
            const detailSize = 2 + Math.random() * 5;
            
            ctx.beginPath();
            ctx.arc(detailX, detailY, detailSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    updateCrackLevel() {
        const healthPercent = this.health / this.maxHealth;
        
        if (healthPercent <= 0.25) this.crackLevel = 3;
        else if (healthPercent <= 0.5) this.crackLevel = 2;
        else if (healthPercent <= 0.75) this.crackLevel = 1;
        else this.crackLevel = 0;
    }
    
    generateParticles() {
        const particles = [];
        
        // Generate stone particles - now with more white square sparks
        const particleCount = 30 + Math.floor(Math.random() * 15);
        
        for (let i = 0; i < particleCount; i++) {
            // Random position around the impact point
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.width / 3;
            
            // Determine particle type and color
            const particleType = Math.random();
            let color, shape;
            
            if (particleType < 0.6) {
                // White square sparks (60%)
                const brightness = 220 + Math.random() * 35;
                color = `rgb(${brightness}, ${brightness}, ${brightness})`;
                shape = 'square';
            } else if (particleType < 0.85) {
                // Yellow sparks (25%)
                color = `rgb(255, ${200 + Math.random() * 55}, 0)`;
                shape = Math.random() < 0.5 ? 'square' : 'circle';
            } else {
                // Red sparks (15%)
                color = `rgb(${200 + Math.random() * 55}, ${50 + Math.random() * 30}, ${20 + Math.random() * 30})`;
                shape = Math.random() < 0.5 ? 'square' : 'circle';
            }
            
            // Create smaller, faster particles with shorter lifespans
            particles.push({
                x: this.x + Math.cos(angle) * distance,
                y: this.y + Math.sin(angle) * distance,
                // Higher velocity for spark effect
                vx: Math.cos(angle) * (2 + Math.random() * 4),
                vy: Math.sin(angle) * (2 + Math.random() * 4) - Math.random() * 2,
                // Smaller size for sparks
                size: 0.5 + Math.random() * 1.5,
                // Shorter lifetime for sparks
                life: 200 + Math.random() * 300,
                created: Date.now(),
                color: color,
                shape: shape
            });
        }
        
        // Add a few larger rock fragments
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.width / 4;
            
            particles.push({
                x: this.x + Math.cos(angle) * distance,
                y: this.y + Math.sin(angle) * distance,
                vx: Math.cos(angle) * (1 + Math.random() * 2),
                vy: Math.sin(angle) * (1 + Math.random() * 2) - Math.random() * 3,
                size: 1.5 + Math.random() * 2,
                life: 400 + Math.random() * 300,
                created: Date.now(),
                color: this.color, // Use the rock's color
                shape: 'circle'
            });
        }
        
        return particles;
    }
    
    getDrops() {
        return {
            resources: [
                {
                    type: 'rocks',
                    amount: 1 + Math.floor(Math.random() * 3),
                    name: 'Stone',
                    description: 'A common rock mined from stone.',
                    icon: 'rock-svg'
                }
            ],
            experience: this.experience
        };
    }
}

// Export the ore classes
window.Ores = {
    Ore,
    Stone
};

// Define SVG icons for resources
window.ResourceIcons = {
    'rock-svg': `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M20.5,9.5 L12,4 L3.5,9.5 L3.5,14.5 L12,20 L20.5,14.5 Z" 
              stroke="#333" stroke-width="1" fill="#777"/>
        <path d="M7,10 L10,12 L8,14 L5,13 Z" 
              stroke="#333" stroke-width="0.5" fill="#999"/>
        <path d="M14,11 L17,10 L16,14 L13,15 Z" 
              stroke="#333" stroke-width="0.5" fill="#999"/>
    </svg>`
};