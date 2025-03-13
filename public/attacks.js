// Attack System for the game
// Contains different attack types and their implementations

// Initialize global variables for rock hit effects if they don't exist
window.hitRocks = window.hitRocks || new Set();
window.rockHitTimes = window.rockHitTimes || new Map();
window.rockHitDuration = window.rockHitDuration || 500; // How long rocks show hit effect (ms)
window.rockParticles = window.rockParticles || [];

class Attack {
    constructor(player, ctx) {
        this.player = player;
        this.ctx = ctx;
        this.isActive = false;
        this.startTime = 0;
        this.cooldown = 0;
        this.maxCooldown = 800; // Default cooldown in ms
        this.direction = 0;
    }
    
    // Start the attack
    start(direction) {
        if (this.cooldown > 0) return false;
        
        this.isActive = true;
        this.startTime = Date.now();
        this.cooldown = this.maxCooldown;
        this.direction = direction;
        return true;
    }
    
    // Update attack state
    update(deltaTime) {
        // Update cooldown
        if (this.cooldown > 0) {
            this.cooldown -= deltaTime;
            if (this.cooldown < 0) this.cooldown = 0;
        }
        
        // Check if attack is finished
        if (this.isActive) {
            const elapsed = Date.now() - this.startTime;
            if (elapsed >= this.getDuration()) {
                this.isActive = false;
            }
        }
    }
    
    // Draw the attack
    draw(cameraX, cameraY) {
        // Base class doesn't draw anything
    }
    
    // Check for hits
    checkHits(targets) {
        // Base class doesn't hit anything
        return [];
    }
    
    // Get attack duration
    getDuration() {
        return 300; // Default duration in ms
    }
    
    // Get attack progress (0 to 1)
    getProgress() {
        if (!this.isActive) return 0;
        const elapsed = Date.now() - this.startTime;
        return Math.min(elapsed / this.getDuration(), 1);
    }
    
    // Get cooldown progress (0 to 1)
    getCooldownProgress() {
        return this.cooldown / this.maxCooldown;
    }
}

class PickaxeAttack extends Attack {
    constructor(player, ctx) {
        super(player, ctx);
        this.maxCooldown = 800; // ms
        this.range = 110; // Maximum reach
        this.length = 50; // Length of the pickaxe
        this.hitChecked = false;
        this.baseDamage = 5; // Base damage is now 5
        this.hitSound = new Audio('sounds/hit.mp3'); // Load hit sound
        this.hitSound.volume = 0.3; // Set volume to 30%
    }
    
    getDuration() {
        return 400; // ms
    }
    
    start(direction) {
        if (!super.start(direction)) return false;
        
        this.hitChecked = false;
        
        // Schedule hit check at 90% through the swing - when pickaxe reaches the target
        setTimeout(() => {
            if (this.isActive) {
                this.checkHits();
                this.hitChecked = true;
            }
        }, this.getDuration() * 0.9);
        
        return true;
    }
    
    draw(cameraX, cameraY) {
        if (!this.isActive) return;
        
        const ctx = this.ctx;
        const progress = this.getProgress();
        
        // Calculate screen position
        const screenX = this.player.x - Math.floor(cameraX);
        const screenY = this.player.y - Math.floor(cameraY);
        
        // Use the cursor direction directly
        const swingDirection = this.direction;
        
        // Calculate swing position
        // Start from one side (-1), pass through center (0), end at other side (1)
        const swingPosition = -1 + progress * 2; // Goes from -1 to 1
        
        // Calculate handle length based on position
        // Shortest at center, longest at sides
        const handleLength = this.length * Math.abs(swingPosition);
        
        // Calculate handle direction
        // If swingPosition is negative, we're on the starting side (opposite cursor)
        // If swingPosition is positive, we're on the ending side (toward cursor)
        const handleDirection = swingPosition < 0 ? swingDirection + Math.PI : swingDirection;
        
        // Calculate handle end position
        const handleEndX = screenX + Math.cos(handleDirection) * handleLength;
        const handleEndY = screenY + Math.sin(handleDirection) * handleLength;
        
        // Draw wooden handle
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(handleEndX, handleEndY);
        ctx.strokeStyle = '#8B4513'; // Brown
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Draw metal pickaxe head
        const headLength = 12;
        const headEndX = handleEndX + Math.cos(handleDirection) * headLength;
        const headEndY = handleEndY + Math.sin(handleDirection) * headLength;
        
        // Draw the metal head
        ctx.beginPath();
        ctx.moveTo(handleEndX, handleEndY);
        ctx.lineTo(headEndX, headEndY);
        ctx.strokeStyle = '#A9A9A9'; // Gray
        ctx.lineWidth = 5;
        ctx.stroke();
        
        // Draw swing path
        if (progress > 0.05 && progress < 0.95) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            
            // Draw line from start to end position
            const startX = screenX + Math.cos(swingDirection + Math.PI) * this.length;
            const startY = screenY + Math.sin(swingDirection + Math.PI) * this.length;
            const endX = screenX + Math.cos(swingDirection) * this.length;
            const endY = screenY + Math.sin(swingDirection) * this.length;
            
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
        
        // Draw impact effect when hitting at the end of the swing
        if (progress > 0.9 && this.hitChecked) {
            // Draw impact flash at the end of the pickaxe
            const impactSize = 15;
            const impactAlpha = 0.7 - (progress - 0.9) * 7; // Fades quickly
            
            ctx.beginPath();
            ctx.arc(headEndX, headEndY, impactSize, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${impactAlpha})`;
            ctx.fill();
            
            // Draw impact lines
            const lineCount = 5;
            for (let i = 0; i < lineCount; i++) {
                const lineAngle = swingDirection + (Math.random() - 0.5) * Math.PI;
                const lineLength = 5 + Math.random() * 10;
                
                ctx.beginPath();
                ctx.moveTo(headEndX, headEndY);
                ctx.lineTo(
                    headEndX + Math.cos(lineAngle) * lineLength,
                    headEndY + Math.sin(lineAngle) * lineLength
                );
                ctx.strokeStyle = `rgba(255, 220, 150, ${impactAlpha})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }
    
    checkHits() {
        if (!this.isActive || !window.ores || this.hitChecked) return [];
        
        const hitOres = [];
        
        // Use cursor direction directly
        const swingDirection = this.direction;
        
        // Check each ore
        for (let i = 0; i < window.ores.length; i++) {
            const ore = window.ores[i];
            
            // Calculate distance from ore to player
            const dx = ore.x - this.player.x;
            const dy = ore.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Calculate angle to ore
            const angleToOre = Math.atan2(dy, dx);
            
            // Calculate angle difference to swing direction
            let angleDiff = angleToOre - swingDirection;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            // Check if ore is within range and in the direction of the cursor
            // Only check in the forward direction (toward cursor), not the opposite side
            if (distance < this.range && Math.abs(angleDiff) < Math.PI/6) {
                // Calculate damage based on player's strength
                const strengthMultiplier = this.player.strength || 1;
                const damage = this.baseDamage * strengthMultiplier;
                
                // Ore is hit!
                const destroyed = ore.hit(damage);
                
                // Play hit sound
                this.playHitSound();
                
                // Generate particles
                const particles = ore.generateParticles();
                if (particles.length > 0) {
                    window.rockParticles.push(...particles);
                }
                
                // If ore is destroyed, handle drops and remove it
                if (destroyed) {
                    const drops = ore.getDrops();
                    console.log(`Ore destroyed! Drops:`, drops);
                    // TODO: Add drops to player inventory
                    
                    // Remove the ore
                    window.ores.splice(i, 1);
                    i--; // Adjust index since we removed an item
                }
                
                hitOres.push(i);
                console.log(`Hit ore at (${ore.x}, ${ore.y}), health: ${ore.health}, damage: ${damage}`);
            }
        }
        
        return hitOres;
    }
    
    playHitSound() {
        // Clone the sound to allow multiple overlapping sounds
        const sound = this.hitSound.cloneNode();
        
        // Add some pitch variation
        sound.playbackRate = 0.9 + Math.random() * 0.2;
        
        // Play the sound
        sound.play().catch(err => {
            // Handle autoplay restrictions
            console.log('Sound play failed:', err);
        });
    }
}

class AxeAttack extends Attack {
    constructor(player, ctx) {
        super(player, ctx);
        this.maxCooldown = 600; // ms - faster than pickaxe
        this.range = 90; // Shorter range than pickaxe
        this.length = 45; // Length of the axe
        this.hitChecked = false;
    }
    
    getDuration() {
        return 250; // ms - faster swing than pickaxe
    }
    
    start(direction) {
        if (!super.start(direction)) return false;
        
        this.hitChecked = false;
        
        // Schedule hit check at 50% through the swing (middle of side swing)
        setTimeout(() => {
            if (this.isActive) {
                this.checkHits();
                this.hitChecked = true;
            }
        }, this.getDuration() * 0.5);
        
        return true;
    }
    
    draw(cameraX, cameraY) {
        if (!this.isActive) return;
        
        const ctx = this.ctx;
        const progress = this.getProgress();
        
        // Calculate screen position
        const screenX = this.player.x - Math.floor(cameraX);
        const screenY = this.player.y - Math.floor(cameraY);
        
        // Calculate swing angle based on progress
        // For axe: Side to side swing
        const swingStartAngle = this.direction - Math.PI * 0.4; // Start from left
        const swingEndAngle = this.direction + Math.PI * 0.4; // End at right
        const currentSwingAngle = swingStartAngle + (swingEndAngle - swingStartAngle) * progress;
        
        // Draw axe based on current swing angle
        const handleLength = this.length;
        const handleEndX = screenX + Math.cos(currentSwingAngle) * handleLength;
        const handleEndY = screenY + Math.sin(currentSwingAngle) * handleLength;
        
        // Draw wooden handle
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(handleEndX, handleEndY);
        ctx.strokeStyle = '#8B4513'; // Brown
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw axe head
        // Calculate perpendicular angle for the axe blade
        const perpAngle = currentSwingAngle + Math.PI / 2;
        const bladeLength = 15;
        
        // Axe blade points
        const bladeTopX = handleEndX + Math.cos(perpAngle) * bladeLength;
        const bladeTopY = handleEndY + Math.sin(perpAngle) * bladeLength;
        const bladeBottomX = handleEndX - Math.cos(perpAngle) * bladeLength;
        const bladeBottomY = handleEndY - Math.sin(perpAngle) * bladeLength;
        
        // Draw axe blade
        ctx.beginPath();
        ctx.moveTo(bladeTopX, bladeTopY);
        ctx.lineTo(bladeBottomX, bladeBottomY);
        ctx.strokeStyle = '#A9A9A9'; // Gray
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Draw swing trail
        if (progress > 0.1 && progress < 0.9) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            
            // Draw arc from start position to current position
            ctx.arc(screenX, screenY, handleLength * 0.8, swingStartAngle, currentSwingAngle);
            ctx.stroke();
        }
    }
    
    checkHits() {
        // Similar to pickaxe but with different parameters
        if (!this.isActive || !window.ores || this.hitChecked) return [];
        
        const hitOres = [];
        
        // Calculate attack area (wider arc for axe)
        const attackAngle = Math.PI * 0.6; // 108 degree attack arc (wider than pickaxe)
        
        // Check each ore
        for (let i = 0; i < window.ores.length; i++) {
            const ore = window.ores[i];
            
            // Calculate distance and angle to ore
            const dx = ore.x - this.player.x;
            const dy = ore.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            
            // Normalize angle difference
            let angleDiff = angle - this.direction;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            // Check if ore is within attack range and angle
            if (distance < this.range && Math.abs(angleDiff) < attackAngle / 2) {
                // Ore is hit!
                const damage = 10 + Math.floor(Math.random() * 5);
                const destroyed = ore.hit(damage);
                
                // Generate wood-like particles instead of rock sparks
                const particles = ore.generateParticles();
                if (particles.length > 0) {
                    window.rockParticles.push(...particles);
                }
                
                // If ore is destroyed, handle drops and remove it
                if (destroyed) {
                    const drops = ore.getDrops();
                    console.log(`Ore destroyed! Drops:`, drops);
                    // TODO: Add drops to player inventory
                    
                    // Remove the ore
                    window.ores.splice(i, 1);
                    i--; // Adjust index since we removed an item
                }
                
                hitOres.push(i);
                console.log(`Hit ore with axe at (${ore.x}, ${ore.y}), health: ${ore.health}`);
            }
        }
        
        return hitOres;
    }
}

// Export the attack classes
window.Attacks = {
    Attack,
    PickaxeAttack,
    AxeAttack
}; 