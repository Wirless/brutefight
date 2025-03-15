/**
 * Entities Module Index
 * 
 * Exports all entity-related classes and functionality
 */

import Ore, { StoneOre, CopperOre, IronOre, GoldOre, DiamondOre } from './Ore.js';
import ExperienceOrb from './ExperienceOrb.js';
import Item from './Item.js';
import Player from './Player.js';
import Tree from './Tree.js';


// Re-export all entities
export { 
    Ore,
    StoneOre,
    CopperOre,
    IronOre,
    GoldOre,
    DiamondOre,
    ExperienceOrb,
    Item,
    Player,
    Tree
};

// Default export for backward compatibility
export default {
    Ore,
    StoneOre,
    CopperOre,
    IronOre,
    GoldOre,
    DiamondOre,
    ExperienceOrb,
    Item,
    Player,
    Tree
}; 