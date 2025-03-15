/**
 * Equipment Module Index
 * 
 * Exports all equipment-related classes and functionality
 */

import Inventory from './Inventory.js';

// Create an Equipment namespace object for backward compatibility
const Equipment = {
    Inventory
};

// Make the Equipment object globally available
window.Equipment = Equipment;

// Export classes individually
export {
    Inventory
};

// Export the Equipment namespace as default
export default Equipment; 