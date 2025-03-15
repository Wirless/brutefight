brutefight/
├── public/
│   ├── index.html
│   ├── styles/
│   └── assets/
│       ├── sprites/
│       └── sounds/
├── src/
│   ├── core/
│   │   ├── Game.js
│   │   ├── AssetLoader.js
│   │   └── index.js
│   ├── managers/
│   │   ├── EquipmentManager.js
│   │   ├── InventoryManager.js
│   │   ├── PlayerManager.js
│   │   ├── ChatManager.js
│   │   ├── UIManager.js
│   │   ├── OreManager.js
│   │   └── index.js
│   ├── ui/
│   │   ├── EquipmentUI.js
│   │   ├── InventoryUI.js
│   │   ├── LeaderboardUI.js
│   │   └── index.js
│   ├── rendering/
│   │   ├── MinimapRenderer.js
│   │   ├── Renderer.js
│   │   └── index.js
│   ├── network/
│   │   ├── Socket.js
│   │   └── index.js
│   ├── entities/
│   │   ├── Player.js
│   │   ├── ExperienceOrb.js
│   │   ├── Item.js
│   │   ├── Ore.js
│   │   └── index.js
│   ├── systems/
│   │   ├── ores.js
│   │   ├── attacks.js
│   │   ├── playerProgression.js
│   │   ├── experienceOrbs.js
│   │   ├── skills.js
│   │   └── index.js
│   └── main.js
├── server.js
└── package.json

## Module References

### Core Components
- `Game.js`: Central controller that initializes and coordinates all systems
  - Imports from: UI modules, managers, systems, entities
  - References: Almost everything (EquipmentManager, TreeSystem, OreManager, etc.)

### Entity Relationships
- `Tree.js` defines the base `Tree` class and various tree types (OakTree, BirchTree, etc.)
  - Used by: TreeManager, TreeSystem
- `Ore.js` defines ore types and properties
  - Used by: OreManager, ores.js system

### Manager Dependencies
- `TreeManager.js` manages tree instances and spawning
  - Uses: Tree.js entities
  - Used by: TreeSystem, Game.js
- `OreManager.js` manages ore instances and spawning
  - Uses: Ore.js entities
  - Used by: Game.js, attacks.js

### System Relationships
- `trees.js` provides TreeSystem which bridges Game and TreeManager
  - Imports: TreeManager.js
  - Used by: Game.js
- `attacks.js` handles player attacks against trees, ores, etc.
  - Uses: OreManager, TreeManager
  - Used by: Game.js

### Rendering Chain
- `Renderer.js` handles main game rendering
  - Used by: Game.js
- `MinimapRenderer.js` handles minimap UI
  - Used by: Game.js

### Network Flow
- `Socket.js` handles communication with server
  - Used by: Game.js