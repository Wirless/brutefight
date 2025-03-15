/**
 * Item.js
 * 
 * Base class for all items in the game.
 * Handles item properties, rendering, and interactions.
 */
class Item {
    /**
     * @param {Object} options - Item options
     */
    constructor(options = {}) {
        // Core properties
        this.id = options.id || `item_${Math.floor(Math.random() * 1000000)}`;
        this.name = options.name || 'Unknown Item';
        this.type = options.type || 'misc';
        this.description = options.description || 'An item of unknown origin.';
        
        // Appearance
        this.icon = options.icon || null;
        this.color = options.color || '#888';
        this.size = options.size || 32;
        
        // Game properties
        this.stackable = options.stackable || false;
        this.maxStack = options.maxStack || 1;
        this.count = options.count || 1;
        this.value = options.value || 1;
        this.weight = options.weight || 1;
        this.rarity = options.rarity || 'common'; // common, uncommon, rare, epic, legendary
        
        // State
        this.equipped = false;
        this.slot = options.slot || null;
        
        // World position (when dropped in world)
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.inWorld = options.inWorld || false;
        
        // Animation (when in world)
        this.animationOffset = Math.random() * Math.PI * 2;
        this.bobAmount = options.bobAmount || 3;
        this.bobSpeed = options.bobSpeed || 0.002;
        this.rotation = options.rotation || 0;
        this.rotationSpeed = options.rotationSpeed || 0;
        
        // Effects
        this.effects = options.effects || [];
        
        // Requirements
        this.requirements = options.requirements || null;
        
        // Stats
        this.stats = options.stats || null;
    }
    
    /**
     * Copy the item
     * @returns {Item} - A new copy of the item
     */
    clone() {
        return new this.constructor(this);
    }
    
    /**
     * Update item state
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        if (this.inWorld) {
            // Update rotation
            if (this.rotationSpeed !== 0) {
                this.rotation += this.rotationSpeed * deltaTime;
            }
        }
    }
    
    /**
     * Draw the item in the world
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     */
    draw(ctx, screenX, screenY) {
        if (!this.inWorld) return;
        
        // Calculate bobbing effect
        const time = Date.now() * this.bobSpeed;
        const bobY = Math.sin(time + this.animationOffset) * this.bobAmount;
        
        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(
            screenX,
            screenY + this.size / 2,
            this.size / 2,
            this.size / 4,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // Apply rotation and bobbing
        ctx.save();
        ctx.translate(screenX, screenY + bobY);
        ctx.rotate(this.rotation);
        
        // Draw item
        if (this.icon) {
            // If there's an image, try to load and draw it
            const img = new Image();
            img.src = this.icon;
            
            // Check if the image is loaded
            if (img.complete) {
                ctx.drawImage(img, -this.size / 2, -this.size / 2, this.size, this.size);
            } else {
                // Fall back to a colored square if image not loaded
                this.drawFallback(ctx);
            }
        } else {
            // Draw a colored square with the item's first letter
            this.drawFallback(ctx);
        }
        
        // Draw count if stacked
        if (this.stackable && this.count > 1) {
            this.drawCount(ctx);
        }
        
        ctx.restore();
        
        // Draw item name when in world
        if (this.inWorld) {
            this.drawName(ctx, screenX, screenY);
        }
    }
    
    /**
     * Draw a fallback representation of the item
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawFallback(ctx) {
        // Draw colored square
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.getRarityBorderColor();
        ctx.lineWidth = 2;
        
        // Draw with rounded corners
        ctx.beginPath();
        ctx.roundRect(-this.size / 2, -this.size / 2, this.size, this.size, 4);
        ctx.fill();
        ctx.stroke();
        
        // Draw first letter of item name
        ctx.fillStyle = '#ffffff';
        ctx.font = `${this.size / 2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.name.charAt(0), 0, 0);
    }
    
    /**
     * Draw the item count
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawCount(ctx) {
        // Draw count background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.arc(this.size / 3, this.size / 3, this.size / 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw count text
        ctx.fillStyle = '#ffffff';
        ctx.font = `${this.size / 4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.count.toString(), this.size / 3, this.size / 3);
    }
    
    /**
     * Draw the item name when in world
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     */
    drawName(ctx, screenX, screenY) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Add shadow to make text readable
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        // Draw item name
        ctx.fillText(this.name, screenX, screenY - this.size / 2 - 10);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }
    
    /**
     * Draw the item in an inventory slot
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} slotSize - Size of the inventory slot
     */
    drawInSlot(ctx, x, y, slotSize) {
        const itemSize = slotSize * 0.8;
        
        // Draw item
        if (this.icon) {
            // If there's an image, try to load and draw it
            const img = new Image();
            img.src = this.icon;
            
            // Check if the image is loaded
            if (img.complete) {
                ctx.drawImage(img, x + (slotSize - itemSize) / 2, y + (slotSize - itemSize) / 2, itemSize, itemSize);
            } else {
                // Fall back to a colored square if image not loaded
                this.drawSlotFallback(ctx, x, y, slotSize, itemSize);
            }
        } else {
            // Draw a colored square with the item's first letter
            this.drawSlotFallback(ctx, x, y, slotSize, itemSize);
        }
        
        // Draw count if stacked
        if (this.stackable && this.count > 1) {
            this.drawSlotCount(ctx, x, y, slotSize);
        }
    }
    
    /**
     * Draw a fallback representation of the item in a slot
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} slotSize - Size of the inventory slot
     * @param {number} itemSize - Size of the item
     */
    drawSlotFallback(ctx, x, y, slotSize, itemSize) {
        const padding = (slotSize - itemSize) / 2;
        
        // Draw colored square
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.getRarityBorderColor();
        ctx.lineWidth = 2;
        
        // Draw with rounded corners
        ctx.beginPath();
        ctx.roundRect(x + padding, y + padding, itemSize, itemSize, 4);
        ctx.fill();
        ctx.stroke();
        
        // Draw first letter of item name
        ctx.fillStyle = '#ffffff';
        ctx.font = `${itemSize / 2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.name.charAt(0), x + slotSize / 2, y + slotSize / 2);
    }
    
    /**
     * Draw the item count in a slot
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} slotSize - Size of the inventory slot
     */
    drawSlotCount(ctx, x, y, slotSize) {
        // Draw count background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.arc(x + slotSize * 0.75, y + slotSize * 0.75, slotSize * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw count text
        ctx.fillStyle = '#ffffff';
        ctx.font = `${slotSize * 0.3}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.count.toString(), x + slotSize * 0.75, y + slotSize * 0.75);
    }
    
    /**
     * Get the border color based on rarity
     * @returns {string} - Color code
     */
    getRarityBorderColor() {
        switch (this.rarity) {
            case 'common':
                return '#aaaaaa';
            case 'uncommon':
                return '#1eff00';
            case 'rare':
                return '#0070dd';
            case 'epic':
                return '#a335ee';
            case 'legendary':
                return '#ff8000';
            default:
                return '#aaaaaa';
        }
    }
    
    /**
     * Get the color of the rarity text
     * @returns {string} - Color code
     */
    getRarityColor() {
        return this.getRarityBorderColor();
    }
    
    /**
     * Check if the item can be equipped by a player
     * @param {Player} player - The player to check requirements for
     * @returns {boolean} - Whether the player meets requirements
     */
    canBeEquippedBy(player) {
        if (!this.requirements) {
            return true;
        }
        
        // Check level requirement
        if (this.requirements.level && player.level < this.requirements.level) {
            return false;
        }
        
        // Check stat requirements
        if (this.requirements.strength && player.attributes && player.attributes.strength < this.requirements.strength) {
            return false;
        }
        
        if (this.requirements.dexterity && player.attributes && player.attributes.dexterity < this.requirements.dexterity) {
            return false;
        }
        
        if (this.requirements.intelligence && player.attributes && player.attributes.intelligence < this.requirements.intelligence) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Apply effects to a player when equipped
     * @param {Player} player - The player to apply effects to
     */
    applyEffects(player) {
        if (this.stats) {
            // Apply stat bonuses
            for (const stat in this.stats) {
                if (player[stat] !== undefined) {
                    player[stat] += this.stats[stat];
                }
            }
        }
        
        // Apply special effects
        for (const effect of this.effects) {
            if (effect.type === 'buff' && effect.apply) {
                effect.apply(player);
            }
        }
    }
    
    /**
     * Remove effects from a player when unequipped
     * @param {Player} player - The player to remove effects from
     */
    removeEffects(player) {
        if (this.stats) {
            // Remove stat bonuses
            for (const stat in this.stats) {
                if (player[stat] !== undefined) {
                    player[stat] -= this.stats[stat];
                }
            }
        }
        
        // Remove special effects
        for (const effect of this.effects) {
            if (effect.type === 'buff' && effect.remove) {
                effect.remove(player);
            }
        }
    }
    
    /**
     * Use the item
     * @param {Player} player - The player using the item
     * @returns {boolean} - Whether the item was used successfully
     */
    use(player) {
        // Default use behavior does nothing
        console.log(`${player.username} used ${this.name}`);
        return true;
    }
    
    /**
     * Drop the item in the world
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    drop(x, y) {
        this.x = x;
        this.y = y;
        this.inWorld = true;
        
        // Give some random velocity for a more natural drop
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5;
        this.rotationSpeed = (Math.random() - 0.5) * 3;
    }
    
    /**
     * Pick up the item from the world
     */
    pickup() {
        this.inWorld = false;
    }
    
    /**
     * Create item tooltip HTML
     * @returns {HTMLElement} - Tooltip element
     */
    createTooltip() {
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'item-tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        tooltip.style.border = `2px solid ${this.getRarityColor()}`;
        tooltip.style.borderRadius = '5px';
        tooltip.style.padding = '10px';
        tooltip.style.color = 'white';
        tooltip.style.zIndex = '1000';
        tooltip.style.width = '200px';
        tooltip.style.pointerEvents = 'none';
        
        // Item name with rarity color
        const itemName = document.createElement('div');
        itemName.className = 'item-name';
        itemName.textContent = this.name;
        itemName.style.color = this.getRarityColor();
        itemName.style.fontWeight = 'bold';
        itemName.style.fontSize = '16px';
        itemName.style.marginBottom = '5px';
        tooltip.appendChild(itemName);
        
        // Item type
        if (this.type) {
            const itemType = document.createElement('div');
            itemType.className = 'item-type';
            itemType.textContent = this.type.charAt(0).toUpperCase() + this.type.slice(1);
            itemType.style.color = '#aaa';
            itemType.style.fontSize = '12px';
            itemType.style.marginBottom = '5px';
            tooltip.appendChild(itemType);
        }
        
        // Item description
        if (this.description) {
            const itemDesc = document.createElement('div');
            itemDesc.className = 'item-description';
            itemDesc.textContent = this.description;
            itemDesc.style.fontSize = '14px';
            itemDesc.style.marginBottom = '10px';
            tooltip.appendChild(itemDesc);
        }
        
        // Item stats
        if (this.stats) {
            const statsDiv = document.createElement('div');
            statsDiv.className = 'item-stats';
            statsDiv.style.borderTop = '1px solid #555';
            statsDiv.style.paddingTop = '5px';
            statsDiv.style.marginBottom = '5px';
            
            for (const statName in this.stats) {
                const value = this.stats[statName];
                const formattedName = statName.charAt(0).toUpperCase() + statName.slice(1).replace(/([A-Z])/g, ' $1');
                
                const stat = document.createElement('div');
                stat.className = 'item-stat';
                stat.textContent = `${formattedName}: ${value > 0 ? '+' : ''}${value}`;
                stat.style.color = value > 0 ? '#8aff8a' : '#ff8a8a';
                statsDiv.appendChild(stat);
            }
            
            tooltip.appendChild(statsDiv);
        }
        
        // Item requirements
        if (this.requirements) {
            const reqDiv = document.createElement('div');
            reqDiv.className = 'item-requirements';
            reqDiv.style.borderTop = '1px solid #555';
            reqDiv.style.paddingTop = '5px';
            
            const reqTitle = document.createElement('div');
            reqTitle.textContent = 'Requirements:';
            reqTitle.style.marginBottom = '3px';
            reqDiv.appendChild(reqTitle);
            
            for (const reqName in this.requirements) {
                const formattedName = reqName.charAt(0).toUpperCase() + reqName.slice(1);
                
                const req = document.createElement('div');
                req.className = 'item-requirement';
                req.textContent = `${formattedName}: ${this.requirements[reqName]}`;
                req.style.color = '#ff8a8a';
                reqDiv.appendChild(req);
            }
            
            tooltip.appendChild(reqDiv);
        }
        
        // Item value
        if (this.value) {
            const valueDiv = document.createElement('div');
            valueDiv.className = 'item-value';
            valueDiv.style.borderTop = '1px solid #555';
            valueDiv.style.paddingTop = '5px';
            valueDiv.style.marginTop = '5px';
            valueDiv.textContent = `Value: ${this.value} coins`;
            valueDiv.style.color = '#ffcc00';
            tooltip.appendChild(valueDiv);
        }
        
        return tooltip;
    }
    
    /**
     * Position a tooltip near a target element
     * @param {HTMLElement} tooltip - The tooltip element
     * @param {HTMLElement} target - The target element
     */
    positionTooltip(tooltip, target) {
        const rect = target.getBoundingClientRect();
        
        // Position to the right of target by default
        tooltip.style.left = `${rect.right + 10}px`;
        tooltip.style.top = `${rect.top}px`;
        
        // Check if tooltip would go off-screen to the right
        if (rect.right + 10 + tooltip.offsetWidth > window.innerWidth) {
            // Position to the left of target instead
            tooltip.style.left = `${rect.left - tooltip.offsetWidth - 10}px`;
        }
        
        // Check if tooltip would go off-screen at the bottom
        if (rect.top + tooltip.offsetHeight > window.innerHeight) {
            // Adjust vertical position to fit on screen
            tooltip.style.top = `${window.innerHeight - tooltip.offsetHeight - 10}px`;
        }
    }
    
    /**
     * Compare this item with another item
     * @param {Item} otherItem - The item to compare with
     * @returns {Object} - Comparison results
     */
    compareWith(otherItem) {
        if (!otherItem || otherItem.type !== this.type) {
            return null;
        }
        
        const comparison = {
            better: {},
            worse: {},
            same: {}
        };
        
        // Compare stats
        if (this.stats && otherItem.stats) {
            // Combine all stat keys from both items
            const allStats = new Set([
                ...Object.keys(this.stats),
                ...Object.keys(otherItem.stats)
            ]);
            
            for (const stat of allStats) {
                const thisValue = this.stats[stat] || 0;
                const otherValue = otherItem.stats[stat] || 0;
                
                if (thisValue > otherValue) {
                    comparison.better[stat] = thisValue - otherValue;
                } else if (thisValue < otherValue) {
                    comparison.worse[stat] = otherValue - thisValue;
                } else if (thisValue !== 0) {
                    comparison.same[stat] = thisValue;
                }
            }
        }
        
        return comparison;
    }
    
    /**
     * Serialize the item for storage or networking
     * @returns {Object} - Serialized item data
     */
    serialize() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            description: this.description,
            icon: this.icon,
            color: this.color,
            stackable: this.stackable,
            maxStack: this.maxStack,
            count: this.count,
            value: this.value,
            weight: this.weight,
            rarity: this.rarity,
            equipped: this.equipped,
            slot: this.slot,
            stats: this.stats,
            requirements: this.requirements
        };
    }
    
    /**
     * Deserialize item data
     * @param {Object} data - Serialized item data
     * @returns {Item} - This instance for chaining
     */
    deserialize(data) {
        Object.assign(this, data);
        return this;
    }
}

// Specialized item types
class WeaponItem extends Item {
    constructor(options = {}) {
        super({
            type: 'weapon',
            ...options
        });
        
        // Weapon-specific properties
        this.damage = options.damage || 10;
        this.attackSpeed = options.attackSpeed || 1.0;
        this.range = options.range || 1.0;
        this.damageType = options.damageType || 'physical';
        
        // Update stats to include weapon-specific stats
        this.stats = {
            ...this.stats,
            damage: this.damage,
            attackSpeed: this.attackSpeed,
            range: this.range
        };
    }
}

class ToolItem extends Item {
    constructor(options = {}) {
        super({
            type: 'tool',
            ...options
        });
        
        // Tool-specific properties
        this.efficiency = options.efficiency || 1.0;
        this.durability = options.durability || 100;
        this.maxDurability = options.maxDurability || 100;
        this.toolType = options.toolType || 'pickaxe'; // pickaxe, axe, shovel, etc.
        this.tier = options.tier || 1; // 1: wood, 2: stone, 3: iron, 4: gold, 5: diamond
        
        // Update stats to include tool-specific stats
        this.stats = {
            ...this.stats,
            efficiency: this.efficiency
        };
    }
    
    /**
     * Use the tool
     * @param {Player} player - The player using the tool
     * @returns {boolean} - Whether the tool was used successfully
     */
    use(player) {
        // Reduce durability
        this.durability -= 1;
        
        // Check if broken
        if (this.durability <= 0) {
            this.durability = 0;
            console.log(`${player.username}'s ${this.name} broke!`);
            return false;
        }
        
        return true;
    }
    
    /**
     * Repair the tool
     * @param {number} amount - Amount to repair
     * @returns {number} - Actual amount repaired
     */
    repair(amount) {
        const oldDurability = this.durability;
        this.durability = Math.min(this.maxDurability, this.durability + amount);
        return this.durability - oldDurability;
    }
}

class ArmorItem extends Item {
    constructor(options = {}) {
        super({
            type: 'armor',
            ...options
        });
        
        // Armor-specific properties
        this.defense = options.defense || 5;
        this.armorSlot = options.armorSlot || 'body'; // head, body, legs, feet
        this.armorSet = options.armorSet || null;
        
        // Update slot to match armor slot
        this.slot = this.armorSlot;
        
        // Update stats to include armor-specific stats
        this.stats = {
            ...this.stats,
            defense: this.defense
        };
    }
}

class ConsumableItem extends Item {
    constructor(options = {}) {
        super({
            type: 'consumable',
            stackable: true,
            maxStack: 20,
            ...options
        });
        
        // Consumable-specific properties
        this.healAmount = options.healAmount || 0;
        this.manaAmount = options.manaAmount || 0;
        this.staminaAmount = options.staminaAmount || 0;
        this.duration = options.duration || 0;
        this.cooldown = options.cooldown || 1000; // ms
        this.lastUsed = 0;
    }
    
    /**
     * Use the consumable
     * @param {Player} player - The player using the item
     * @returns {boolean} - Whether the item was used successfully
     */
    use(player) {
        // Check cooldown
        const now = Date.now();
        if (now - this.lastUsed < this.cooldown) {
            console.log(`${this.name} is on cooldown`);
            return false;
        }
        
        // Apply effects
        if (this.healAmount > 0 && player.health < player.maxHealth) {
            player.health = Math.min(player.maxHealth, player.health + this.healAmount);
            console.log(`${player.username} healed for ${this.healAmount}`);
        }
        
        if (this.manaAmount > 0 && player.mana < player.maxMana) {
            player.mana = Math.min(player.maxMana, player.mana + this.manaAmount);
            console.log(`${player.username} restored ${this.manaAmount} mana`);
        }
        
        if (this.staminaAmount > 0 && player.stamina < player.maxStamina) {
            player.stamina = Math.min(player.maxStamina, player.stamina + this.staminaAmount);
            console.log(`${player.username} restored ${this.staminaAmount} stamina`);
        }
        
        // Add temporary effects if any
        if (this.effects.length > 0) {
            for (const effect of this.effects) {
                if (effect.apply) {
                    effect.apply(player);
                    
                    // Schedule effect removal if it has a duration
                    if (this.duration > 0 && effect.remove) {
                        setTimeout(() => {
                            effect.remove(player);
                        }, this.duration);
                    }
                }
            }
        }
        
        // Update last used time
        this.lastUsed = now;
        
        // Reduce count
        this.count--;
        
        // Remove from inventory if all used up
        return this.count <= 0;
    }
}

// Export item classes globally
window.Item = Item;
window.WeaponItem = WeaponItem;
window.ToolItem = ToolItem;
window.ArmorItem = ArmorItem;
window.ConsumableItem = ConsumableItem;

// Create example items
window.ExampleItems = {
    // Weapons
    woodenSword: new WeaponItem({
        name: 'Wooden Sword',
        description: 'A basic wooden sword. Better than nothing.',
        color: '#8B4513',
        damage: 5,
        value: 10,
        rarity: 'common'
    }),
    ironSword: new WeaponItem({
        name: 'Iron Sword',
        description: 'A sturdy iron sword.',
        color: '#CECECE',
        damage: 10,
        value: 50,
        rarity: 'uncommon'
    }),
    
    // Tools
    woodenPickaxe: new ToolItem({
        name: 'Wooden Pickaxe',
        description: 'A simple wooden pickaxe. Can mine basic ores.',
        color: '#8B4513',
        toolType: 'pickaxe',
        tier: 1,
        efficiency: 1.0,
        durability: 60,
        value: 15,
        rarity: 'common'
    }),
    stonePickaxe: new ToolItem({
        name: 'Stone Pickaxe',
        description: 'A stone pickaxe. More durable than wood.',
        color: '#808080',
        toolType: 'pickaxe',
        tier: 2,
        efficiency: 1.5,
        durability: 120,
        value: 30,
        rarity: 'common'
    }),
    ironPickaxe: new ToolItem({
        name: 'Iron Pickaxe',
        description: 'An iron pickaxe. Can mine most ores efficiently.',
        color: '#CECECE',
        toolType: 'pickaxe',
        tier: 3,
        efficiency: 2.0,
        durability: 250,
        value: 75,
        rarity: 'uncommon'
    }),
    
    // Armor
    leatherHelmet: new ArmorItem({
        name: 'Leather Helmet',
        description: 'A basic helmet made of leather.',
        color: '#8B4513',
        armorSlot: 'head',
        defense: 2,
        value: 20,
        rarity: 'common'
    }),
    ironChestplate: new ArmorItem({
        name: 'Iron Chestplate',
        description: 'A sturdy chestplate made of iron.',
        color: '#CECECE',
        armorSlot: 'body',
        defense: 6,
        value: 80,
        rarity: 'uncommon'
    }),
    
    // Consumables
    healthPotion: new ConsumableItem({
        name: 'Health Potion',
        description: 'Restores 50 health.',
        color: '#FF0000',
        healAmount: 50,
        value: 25,
        rarity: 'common'
    }),
    manaPotion: new ConsumableItem({
        name: 'Mana Potion',
        description: 'Restores 50 mana.',
        color: '#0000FF',
        manaAmount: 50,
        value: 25,
        rarity: 'common'
    })
}; 

export default Item;