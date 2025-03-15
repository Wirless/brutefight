/**
 * PlayerManager.js
 * 
 * Handles player-related functionality including movement,
 * player data management, and player progression.
 */
class PlayerManager {
    /**
     * @param {Game} game - The main game instance
     */
    constructor(game) {
        this.game = game;
        this.player = game.myPlayer;
        this.username = game.username;
        this.lastMovementMessageTime = 0;
        this.distanceMoved = 0;
        this.MOVEMENT_DISTANCE_THRESHOLD = 500;
        this.MOVEMENT_MESSAGE_INTERVAL = 30000; // 30 seconds
        this.MOVEMENT_SPEED = 240; // Pixels per second
        this.PLAYER_COLLISION_RADIUS = 10;
    }

    /**
     * Update player position based on velocity
     * @param {Object} velocity - Velocity vector {x, y}
     * @param {number} deltaTime - Time since last update in ms
     * @returns {boolean} - Whether player moved
     */
    updatePosition(velocity, deltaTime) {
        if (!this.player) return false;
        
        const seconds = deltaTime / 1000;
        const moveDistance = this.MOVEMENT_SPEED * seconds;
        
        let moved = false;
        
        // Check velocity directly
        if (velocity.x !== 0 || velocity.y !== 0) {
            // Calculate position before movement
            const oldX = this.player.x;
            const oldY = this.player.y;
            
            // Calculate new position
            const newX = this.player.x + velocity.x * moveDistance;
            const newY = this.player.y + velocity.y * moveDistance;
            
            // Check for ore collisions
            if (!this.game.checkOreCollisions(newX, newY)) {
                // No collision, update position
                this.player.x = newX;
                this.player.y = newY;
            } else {
                // Try moving only in X direction
                if (!this.game.checkOreCollisions(newX, oldY)) {
                    this.player.x = newX;
                }
                // Try moving only in Y direction
                else if (!this.game.checkOreCollisions(oldX, newY)) {
                    this.player.y = newY;
                }
                // If both directions cause collisions, check if we need to push the player
                else {
                    const newPosition = this.game.oreManager.handlePlayerCollision(
                        oldX, oldY, this.PLAYER_COLLISION_RADIUS
                    );
                    if (newPosition) {
                        this.player.x = newPosition.x;
                        this.player.y = newPosition.y;
                    }
                }
            }
            
            // Calculate distance moved
            const dx = this.player.x - oldX;
            const dy = this.player.y - oldY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Accumulate distance for movement messages
            this.distanceMoved += distance;
            
            // Check if we should show a movement message
            this.checkMovementMessage();
            
            // Check if we should generate more ores
            this.checkOreGeneration();
            
            moved = true;
        }
        
        return moved;
    }

    /**
     * Check if we should show a movement message
     */
    checkMovementMessage() {
        const now = Date.now();
        if (this.distanceMoved > this.MOVEMENT_DISTANCE_THRESHOLD && 
            now - this.lastMovementMessageTime > this.MOVEMENT_MESSAGE_INTERVAL) {
            
            // Generate a movement message
            const directions = [];
            if (this.game.keys.w) directions.push('north');
            if (this.game.keys.s) directions.push('south');
            if (this.game.keys.a) directions.push('west');
            if (this.game.keys.d) directions.push('east');
            
            let direction = directions.join('-');
            if (!direction) direction = 'around';
            
            const messages = [
                `${this.username} is traveling ${direction}...`,
                `${this.username} has moved ${Math.round(this.distanceMoved)} units since last update.`,
                `${this.username} continues their journey across the world.`,
                `${this.username}'s position: [${Math.round(this.player.x)}, ${Math.round(this.player.y)}]`
            ];
            
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            
            // Add movement message to chat
            this.game.chatManager.addMessage({
                type: 'movement',
                message: randomMessage
            });
            
            // Reset tracking
            this.distanceMoved = 0;
            this.lastMovementMessageTime = now;
        }
    }

    /**
     * Check if we should generate more ores based on player movement
     */
    checkOreGeneration() {
        // Every 500 units of movement, generate some new ores
        if (Math.floor(this.distanceMoved / 500) > 0) {
            this.game.oreManager.generateOresAroundPosition(
                this.player.x, 
                this.player.y, 
                5, 
                this.player.x, 
                this.player.y
            );
            this.distanceMoved = this.distanceMoved % 500;
        }
    }

    /**
     * Apply effects from equipped items
     */
    applyEquipmentEffects() {
        if (!this.player || !window.equipmentManager) return;
        
        // Apply effects from all equipped items
        for (const slotName in window.equipmentManager.slots) {
            const item = window.equipmentManager.slots[slotName];
            if (item && item.applyEffects) {
                item.applyEffects(this.player);
            }
        }
    }

    /**
     * Add experience to player
     * @param {number} amount - Amount of experience to add
     * @param {string} source - Source of the experience (e.g., "mining", "woodcutting")
     */
    addExperience(amount, source) {
        if (!this.player) return;
        
        // Add to player's total experience
        this.player.experience = (this.player.experience || 0) + amount;
        
        // Check for level up
        this.checkLevelUp();
        
        // Add to skill experience if source is specified
        if (source && this.player.skills && this.player.skills[source]) {
            this.player.skills[source].experience = 
                (this.player.skills[source].experience || 0) + amount;
            
            // Check for skill level up
            this.checkSkillLevelUp(source);
        }
    }

    /**
     * Check if player has leveled up
     */
    checkLevelUp() {
        if (!this.player) return;
        
        // Calculate level based on experience
        const level = this.calculateLevel(this.player.experience);
        
        // Check if level increased
        if (level > this.player.level) {
            const oldLevel = this.player.level;
            this.player.level = level;
            
            // Calculate new max experience for next level
            this.player.maxExperience = this.calculateExperienceForLevel(level + 1);
            
            // Show level up message
            this.game.chatManager.addMessage({
                type: 'system',
                message: `${this.username} has reached level ${level}!`
            });
            
            // Handle level up rewards/bonuses
            this.handleLevelUpRewards(oldLevel, level);
        }
    }

    /**
     * Check if a skill has leveled up
     * @param {string} skillName - Name of the skill to check
     */
    checkSkillLevelUp(skillName) {
        if (!this.player || !this.player.skills || !this.player.skills[skillName]) return;
        
        const skill = this.player.skills[skillName];
        
        // Calculate skill level based on experience
        const level = this.calculateSkillLevel(skill.experience);
        
        // Check if skill level increased
        if (level > skill.level) {
            const oldLevel = skill.level;
            skill.level = level;
            
            // Calculate new max experience for next level
            skill.maxExperience = this.calculateExperienceForLevel(level + 1);
            
            // Show skill level up message
            this.game.chatManager.addMessage({
                type: 'system',
                message: `${this.username}'s ${skillName} skill has reached level ${level}!`
            });
            
            // Handle skill level up rewards/bonuses
            this.handleSkillLevelUpRewards(skillName, oldLevel, level);
        }
    }

    /**
     * Calculate player level based on experience
     * @param {number} experience - Total experience points
     * @returns {number} - Player level
     */
    calculateLevel(experience) {
        // Simple level calculation: level = sqrt(experience / 100)
        return Math.floor(Math.sqrt(experience / 100)) + 1;
    }

    /**
     * Calculate skill level based on experience
     * @param {number} experience - Skill experience points
     * @returns {number} - Skill level
     */
    calculateSkillLevel(experience) {
        // Similar calculation as player level but can be adjusted
        return Math.floor(Math.sqrt(experience / 50)) + 1;
    }

    /**
     * Calculate experience required for a specific level
     * @param {number} level - Target level
     * @returns {number} - Experience required
     */
    calculateExperienceForLevel(level) {
        // Inverse of level calculation: experience = (level - 1)^2 * 100
        return Math.pow(level - 1, 2) * 100;
    }

    /**
     * Handle rewards and bonuses for leveling up
     * @param {number} oldLevel - Previous level
     * @param {number} newLevel - New level
     */
    handleLevelUpRewards(oldLevel, newLevel) {
        // Increase player capacity with level
        this.player.capacity = 100 + (newLevel - 1) * 10;
        
        // Add any special rewards for milestone levels
        if (newLevel % 5 === 0) {
            // Milestone level (5, 10, 15, etc.)
            this.game.chatManager.addMessage({
                type: 'system',
                message: `${this.username} has reached a milestone level and gained a special bonus!`
            });
            
            // Additional rewards could be added here
        }
    }

    /**
     * Handle rewards and bonuses for skill leveling up
     * @param {string} skillName - Name of the skill
     * @param {number} oldLevel - Previous level
     * @param {number} newLevel - New level
     */
    handleSkillLevelUpRewards(skillName, oldLevel, newLevel) {
        // Add any skill-specific bonuses
        switch(skillName) {
            case 'mining':
                this.game.chatManager.addMessage({
                    type: 'system',
                    message: `Mining efficiency increased!`
                });
                break;
            case 'woodcutting':
                this.game.chatManager.addMessage({
                    type: 'system',
                    message: `Woodcutting efficiency increased!`
                });
                break;
            // Add other skills as needed
        }
    }

    /**
     * Synchronize player data with server
     */
    syncWithServer() {
        if (!this.player || !this.game.socket) return;
        
        // Send current player data to server using the Socket module
        this.game.socket.sendPlayerUpdate({
            x: this.player.x,
            y: this.player.y,
            experience: this.player.experience,
            level: this.player.level,
            maxExperience: this.player.maxExperience,
            capacity: this.player.capacity,
            resources: this.player.resources,
            skills: this.player.skills,
            inventory: this.player.inventory,
            equipped: this.player.equipped
        });
    }
}

// Make the PlayerManager class globally available for backward compatibility
window.PlayerManager = PlayerManager;

// Add default export
export default PlayerManager;