// Experience Orb System
// Green orbs that fly to the player and give experience

class ExperienceOrb {
    constructor(x, y, amount = 1) {
        this.x = x;
        this.y = y;
        this.amount = amount;
        
        // Scale the radius based on experience amount
        // Base size is 5, with larger orbs for more experience
        const sizeMultiplier = Math.min(2.5, 1 + (amount / 10)); // Cap at 2.5x size
        this.radius = (5 + Math.random() * 3) * sizeMultiplier;
        
        this.collected = false;
        this.collectRadius = 50; // Initial collection radius
        
        // Visual properties - adjust color based on amount
        const greenIntensity = Math.min(255, 200 + (amount * 5));
        this.color = `rgb(0, ${greenIntensity}, 100)`;
        this.opacity = 0.7 + Math.random() * 0.3;
        this.glowSize = 3 * sizeMultiplier;
        
        // Movement properties - larger orbs move a bit slower
        this.speed = (0.1 + Math.random() * 0.2) / Math.sqrt(sizeMultiplier);
        this.maxSpeed = 7 / Math.sqrt(sizeMultiplier);
        this.acceleration = 1.05;
        this.vx = 0;
        this.vy = 0;
        
        // Set up a random initial position offset
        const angle = Math.random() * Math.PI * 2;
        const distance = 5 + Math.random() * 15;
        this.x += Math.cos(angle) * distance;
        this.y += Math.sin(angle) * distance;
        
        // Add some initial velocity away from the center
        this.vx = Math.cos(angle) * (1 + Math.random() * 2);
        this.vy = Math.sin(angle) * (1 + Math.random() * 2);
        
        // Particle effect properties
        this.particles = [];
        this.lastParticleTime = 0;
        this.particleInterval = 100 + Math.random() * 100;
    }
    
    update(playerX, playerY, deltaTime) {
        if (this.collected) return true;
        
        // Calculate distance to player
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
        
        // If player is within collection radius, move towards player
        if (distanceToPlayer < this.collectRadius) {
            // Normalize direction vector
            const length = Math.max(0.1, Math.sqrt(dx * dx + dy * dy));
            const ndx = dx / length;
            const ndy = dy / length;
            
            // Accelerate towards player
            this.vx += ndx * this.speed * (deltaTime / 16);
            this.vy += ndy * this.speed * (deltaTime / 16);
            
            // Increase speed over time as it gets closer
            this.speed *= this.acceleration;
            this.speed = Math.min(this.speed, this.maxSpeed);
            
            // Increase collection radius as the orb starts moving toward the player
            this.collectRadius = Math.min(this.collectRadius * 1.01, 150);
        } else {
            // Slow down when not being attracted to player
            this.vx *= 0.98;
            this.vy *= 0.98;
            
            // Add some gentle floating motion
            this.vx += (Math.random() - 0.5) * 0.05;
            this.vy += (Math.random() - 0.5) * 0.05;
        }
        
        // Apply velocity
        this.x += this.vx;
        this.y += this.vy;
        
        // Check if we've reached the player
        if (distanceToPlayer < 20) {
            // Give experience to player
            if (window.playerProgression) {
                window.playerProgression.addExperience(this.amount);
            }
            
            // Mark as collected
            this.collected = true;
            
            // Create collection particles
            this.createCollectionParticles();
            
            return true; // Indicates this orb should be removed
        }
        
        // Create trail particles occasionally
        const now = Date.now();
        if (now - this.lastParticleTime > this.particleInterval) {
            this.createTrailParticle();
            this.lastParticleTime = now;
        }
        
        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.life -= deltaTime;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            
            // Move particle
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Fade out
            particle.opacity = particle.life / particle.maxLife;
        }
        
        return false; // Not collected yet
    }
    
    draw(ctx, cameraX, cameraY) {
        if (this.collected) return;
        
        // Convert world coordinates to screen coordinates
        const screenX = this.x - Math.floor(cameraX);
        const screenY = this.y - Math.floor(cameraY);
        
        // Don't draw if off screen
        if (screenX < -50 || screenX > ctx.canvas.width + 50 || 
            screenY < -50 || screenY > ctx.canvas.height + 50) {
            return;
        }
        
        // Draw trail particles
        for (const particle of this.particles) {
            const particleScreenX = particle.x - Math.floor(cameraX);
            const particleScreenY = particle.y - Math.floor(cameraY);
            
            ctx.globalAlpha = particle.opacity * 0.7;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particleScreenX, particleScreenY, particle.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Reset alpha
        ctx.globalAlpha = 1;
        
        // Draw glow
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius + this.glowSize, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
            screenX, screenY, this.radius,
            screenX, screenY, this.radius + this.glowSize
        );
        gradient.addColorStop(0, `rgba(0, 255, 100, ${this.opacity})`);
        gradient.addColorStop(1, 'rgba(0, 255, 100, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw orb
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(screenX - this.radius * 0.3, screenY - this.radius * 0.3, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        // Reset alpha
        ctx.globalAlpha = 1;
    }
    
    createTrailParticle() {
        this.particles.push({
            x: this.x,
            y: this.y,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: 1 + Math.random() * 2,
            color: 'rgb(0, 255, 100)',
            opacity: 0.7,
            life: 300 + Math.random() * 200,
            maxLife: 500
        });
    }
    
    createCollectionParticles() {
        // Create particle burst when collected
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            this.particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                radius: 2 + Math.random() * 2,
                color: 'rgb(0, 255, 100)',
                opacity: 1,
                life: 300 + Math.random() * 200,
                maxLife: 500
            });
        }
    }
}

class ExperienceOrbManager {
    constructor() {
        this.orbs = [];
    }
    
    createOrb(x, y, amount = 1) {
        const orb = new ExperienceOrb(x, y, amount);
        this.orbs.push(orb);
        return orb;
    }
    
    createOrbBurst(x, y, count, totalAmount) {
        const orbs = [];
        
        // Create a distribution of experience amounts
        // Make some orbs larger than others for visual appeal
        let remainingExp = totalAmount;
        let remainingOrbs = count;
        
        // Create orbs in a circular pattern
        for (let i = 0; i < count; i++) {
            // Calculate how much experience this orb should get
            let orbExp;
            
            if (i === count - 1) {
                // Last orb gets all remaining experience
                orbExp = remainingExp;
            } else {
                // Randomize experience distribution
                // Larger orbs for more visual appeal
                const avgExpPerOrb = remainingExp / remainingOrbs;
                
                if (i === 0 && count > 2) {
                    // Make the first orb larger (30-50% of total)
                    orbExp = Math.floor(totalAmount * (0.3 + Math.random() * 0.2));
                } else {
                    // Randomize other orbs
                    orbExp = Math.max(1, Math.floor(avgExpPerOrb * (0.5 + Math.random())));
                }
                
                // Ensure we don't exceed remaining experience
                orbExp = Math.min(orbExp, remainingExp);
            }
            
            // Create the orb with calculated experience
            const orb = this.createOrb(x, y, orbExp);
            orbs.push(orb);
            
            // Update remaining values
            remainingExp -= orbExp;
            remainingOrbs--;
        }
        
        return orbs;
    }
    
    update(playerX, playerY, deltaTime) {
        for (let i = this.orbs.length - 1; i >= 0; i--) {
            const orb = this.orbs[i];
            if (orb.update(playerX, playerY, deltaTime)) {
                // If the orb was collected, remove it
                this.orbs.splice(i, 1);
            }
        }
    }
    
    draw(ctx, cameraX, cameraY) {
        for (const orb of this.orbs) {
            orb.draw(ctx, cameraX, cameraY);
        }
    }
}

// Make it available globally
window.ExperienceOrbManager = ExperienceOrbManager; 