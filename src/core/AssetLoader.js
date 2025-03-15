/**
 * AssetLoader.js
 * 
 * Handles preloading and management of game assets
 * including images, sounds, and other resources.
 */
class AssetLoader {
    /**
     * @param {Game} game - The main game instance
     */
    constructor(game) {
        this.game = game;
        
        // Storage for loaded assets
        this.images = {};
        this.sounds = {};
        this.sprites = {};
        this.fonts = {};
        
        // Track loading progress
        this.totalAssets = 0;
        this.loadedAssets = 0;
        this.loadingErrors = 0;
        
        // Asset paths
        this.assetPaths = {
            images: {
                // UI elements
                uiBackground: 'images/ui/background.png',
                uiButton: 'images/ui/button.png',
                uiPanel: 'images/ui/panel.png',
                
                // Items
                pickaxeWooden: 'sprites/pickaxe_wooden.png',
                pickaxeStone: 'sprites/pickaxe_stone.png',
                pickaxeIron: 'sprites/pickaxe_iron.png',
                axeWooden: 'sprites/axe_wooden.png',
                axeStone: 'sprites/axe_stone.png',
                
                // Placeholders for missing sprites
                pickaxePlaceholder: 'sprites/pickaxe_placeholder.png',
                axePlaceholder: 'sprites/axe_placeholder.png'
            },
            sounds: {
                // UI sounds
                buttonClick: 'sounds/click.mp3',
                buttonHover: 'sounds/hover.mp3',
                
                // Game sounds
                miningHit: 'sounds/hit.mp3',
                miningHit2: 'sounds/hit2.mp3',
                levelUp: 'sounds/level_up.mp3',
                itemPickup: 'sounds/pickup.mp3'
            },
            fonts: {
                main: 'fonts/main.woff2',
                pixelated: 'fonts/pixelated.woff2'
            }
        };
        
        // Default fallback assets (for missing assets)
        this.fallbackImage = null;
        this.fallbackSound = null;
        
        // Make globally available
        window.assetLoader = this;
    }
    
    /**
     * Initialize the asset loader
     * @returns {Promise} - Promise that resolves when initialization is complete
     */
    init() {
        console.log('Initializing AssetLoader...');
        
        // Create a loading screen
        this.createLoadingScreen();
        
        // Create fallback assets
        this.createFallbackAssets();
        
        return Promise.resolve();
    }
    
    /**
     * Preload all game assets
     * @param {Function} progressCallback - Callback for loading progress
     * @returns {Promise} - Promise that resolves when all assets are loaded
     */
    preloadAll(progressCallback = null) {
        return new Promise((resolve, reject) => {
            console.log('Preloading all assets...');
            
            // Count total assets
            this.countTotalAssets();
            
            // Create progress tracking
            let lastReportedProgress = 0;
            const updateProgress = () => {
                this.loadedAssets++;
                const progress = Math.floor((this.loadedAssets / this.totalAssets) * 100);
                
                // Update loading screen
                this.updateLoadingScreen(progress);
                
                // Call progress callback if provided and if progress has changed
                if (progressCallback && progress > lastReportedProgress) {
                    progressCallback(progress, this.totalAssets, this.loadedAssets, this.loadingErrors);
                    lastReportedProgress = progress;
                }
                
                // Check if all assets are loaded
                if (this.loadedAssets + this.loadingErrors >= this.totalAssets) {
                    console.log(`Asset loading complete. Loaded: ${this.loadedAssets}, Errors: ${this.loadingErrors}`);
                    
                    // Hide loading screen
                    this.hideLoadingScreen();
                    
                    // Resolve the promise
                    resolve({
                        success: this.loadingErrors === 0,
                        loaded: this.loadedAssets,
                        errors: this.loadingErrors,
                        total: this.totalAssets
                    });
                }
            };
            
            // Load each type of asset
            this.preloadImages(updateProgress);
            this.preloadSounds(updateProgress);
            this.preloadFonts(updateProgress);
            
            // Handle case where there are no assets to load
            if (this.totalAssets === 0) {
                console.log('No assets to preload.');
                this.hideLoadingScreen();
                resolve({
                    success: true,
                    loaded: 0,
                    errors: 0,
                    total: 0
                });
            }
        });
    }
    
    /**
     * Count total number of assets
     */
    countTotalAssets() {
        this.totalAssets = 0;
        
        // Count images
        for (const key in this.assetPaths.images) {
            this.totalAssets++;
        }
        
        // Count sounds
        for (const key in this.assetPaths.sounds) {
            this.totalAssets++;
        }
        
        // Count fonts
        for (const key in this.assetPaths.fonts) {
            this.totalAssets++;
        }
        
        console.log(`Total assets to load: ${this.totalAssets}`);
    }
    
    /**
     * Preload all images
     * @param {Function} onAssetLoaded - Callback when an asset is loaded
     */
    preloadImages(onAssetLoaded) {
        for (const key in this.assetPaths.images) {
            const path = this.assetPaths.images[key];
            const img = new Image();
            
            img.onload = () => {
                this.images[key] = img;
                console.log(`Loaded image: ${key}`);
                onAssetLoaded();
            };
            
            img.onerror = (err) => {
                console.error(`Failed to load image: ${key} (${path})`, err);
                this.loadingErrors++;
                // Use fallback image
                this.images[key] = this.fallbackImage;
                onAssetLoaded();
            };
            
            // Start loading
            img.src = path;
        }
    }
    
    /**
     * Preload all sounds
     * @param {Function} onAssetLoaded - Callback when an asset is loaded
     */
    preloadSounds(onAssetLoaded) {
        for (const key in this.assetPaths.sounds) {
            const path = this.assetPaths.sounds[key];
            const sound = new Audio();
            
            sound.addEventListener('canplaythrough', () => {
                this.sounds[key] = sound;
                console.log(`Loaded sound: ${key}`);
                onAssetLoaded();
            }, { once: true });
            
            sound.addEventListener('error', (err) => {
                console.error(`Failed to load sound: ${key} (${path})`, err);
                this.loadingErrors++;
                // Use fallback sound
                this.sounds[key] = this.fallbackSound;
                onAssetLoaded();
            });
            
            // Start loading
            sound.src = path;
            sound.load();
        }
    }
    
    /**
     * Preload all fonts
     * @param {Function} onAssetLoaded - Callback when an asset is loaded
     */
    preloadFonts(onAssetLoaded) {
        for (const key in this.assetPaths.fonts) {
            const path = this.assetPaths.fonts[key];
            
            // Create a font face
            const fontFace = new FontFace(key, `url(${path})`);
            
            fontFace.load().then((loadedFace) => {
                // Add the font to the document
                document.fonts.add(loadedFace);
                this.fonts[key] = loadedFace;
                console.log(`Loaded font: ${key}`);
                onAssetLoaded();
            }).catch((err) => {
                console.error(`Failed to load font: ${key} (${path})`, err);
                this.loadingErrors++;
                onAssetLoaded();
            });
        }
    }
    
    /**
     * Create fallback assets for missing assets
     */
    createFallbackAssets() {
        // Create a fallback image
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = 64;
        fallbackCanvas.height = 64;
        const ctx = fallbackCanvas.getContext('2d');
        
        // Draw a placeholder pattern (checkerboard)
        ctx.fillStyle = '#FF00FF'; // Magenta
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#000000'; // Black
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillRect(32, 32, 32, 32);
        
        // Add text
        ctx.fillStyle = '#FFFFFF'; // White
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Missing', 32, 28);
        ctx.fillText('Asset', 32, 40);
        
        // Create an image from the canvas
        this.fallbackImage = new Image();
        this.fallbackImage.src = fallbackCanvas.toDataURL('image/png');
        
        // Create a fallback sound (short beep)
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.value = 440;
            gainNode.gain.value = 0.1;
            
            // Create audio element from oscillator
            const beepDestination = audioContext.createMediaStreamDestination();
            oscillator.connect(beepDestination);
            
            // Record a short beep
            const recorder = new MediaRecorder(beepDestination.stream);
            const chunks = [];
            
            recorder.ondataavailable = e => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
                this.fallbackSound = new Audio(URL.createObjectURL(blob));
            };
            
            recorder.start();
            oscillator.start();
            
            // Stop after 200ms
            setTimeout(() => {
                oscillator.stop();
                recorder.stop();
            }, 200);
        } catch (err) {
            console.error('Failed to create fallback sound:', err);
            // Create an empty Audio element as fallback for the fallback
            this.fallbackSound = new Audio();
        }
    }
    
    /**
     * Create a loading screen
     */
    createLoadingScreen() {
        // Create loading screen element
        this.loadingScreen = document.createElement('div');
        this.loadingScreen.id = 'loading-screen';
        this.loadingScreen.style.position = 'fixed';
        this.loadingScreen.style.top = '0';
        this.loadingScreen.style.left = '0';
        this.loadingScreen.style.width = '100%';
        this.loadingScreen.style.height = '100%';
        this.loadingScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.loadingScreen.style.color = 'white';
        this.loadingScreen.style.display = 'flex';
        this.loadingScreen.style.flexDirection = 'column';
        this.loadingScreen.style.justifyContent = 'center';
        this.loadingScreen.style.alignItems = 'center';
        this.loadingScreen.style.zIndex = '9999';
        
        // Create loading title
        const title = document.createElement('h1');
        title.textContent = 'BruteFight';
        title.style.fontSize = '32px';
        title.style.marginBottom = '20px';
        title.style.fontWeight = 'bold';
        title.style.color = 'rgb(0, 233, 150)';
        this.loadingScreen.appendChild(title);
        
        // Create loading text
        const loadingText = document.createElement('div');
        loadingText.textContent = 'Loading game assets...';
        loadingText.style.marginBottom = '20px';
        this.loadingScreen.appendChild(loadingText);
        
        // Create progress bar container
        const progressContainer = document.createElement('div');
        progressContainer.style.width = '300px';
        progressContainer.style.height = '20px';
        progressContainer.style.backgroundColor = '#333';
        progressContainer.style.borderRadius = '10px';
        progressContainer.style.overflow = 'hidden';
        this.loadingScreen.appendChild(progressContainer);
        
        // Create progress bar
        this.progressBar = document.createElement('div');
        this.progressBar.style.width = '0%';
        this.progressBar.style.height = '100%';
        this.progressBar.style.backgroundColor = 'rgb(0, 233, 150)';
        this.progressBar.style.transition = 'width 0.3s ease';
        progressContainer.appendChild(this.progressBar);
        
        // Create progress text
        this.progressText = document.createElement('div');
        this.progressText.textContent = '0%';
        this.progressText.style.marginTop = '5px';
        this.loadingScreen.appendChild(this.progressText);
        
        // Add to document
        document.body.appendChild(this.loadingScreen);
    }
    
    /**
     * Update the loading screen progress
     * @param {number} progress - Progress percentage (0-100)
     */
    updateLoadingScreen(progress) {
        if (this.progressBar && this.progressText) {
            this.progressBar.style.width = `${progress}%`;
            this.progressText.textContent = `${progress}%`;
        }
    }
    
    /**
     * Hide the loading screen
     */
    hideLoadingScreen() {
        if (this.loadingScreen) {
            // Fade out the loading screen
            this.loadingScreen.style.transition = 'opacity 0.5s ease';
            this.loadingScreen.style.opacity = '0';
            
            // Remove after animation
            setTimeout(() => {
                if (this.loadingScreen.parentNode) {
                    this.loadingScreen.parentNode.removeChild(this.loadingScreen);
                }
            }, 500);
        }
    }
    
    /**
     * Get an image asset
     * @param {string} key - The key of the image
     * @returns {HTMLImageElement} - The image element
     */
    getImage(key) {
        if (this.images[key]) {
            return this.images[key];
        } else {
            console.warn(`Image not found: ${key}, using fallback`);
            return this.fallbackImage;
        }
    }
    
    /**
     * Get a sound asset
     * @param {string} key - The key of the sound
     * @returns {HTMLAudioElement} - The audio element
     */
    getSound(key) {
        if (this.sounds[key]) {
            // Clone the audio to allow multiple plays
            return this.sounds[key].cloneNode();
        } else {
            console.warn(`Sound not found: ${key}, using fallback`);
            return this.fallbackSound.cloneNode();
        }
    }
    
    /**
     * Play a sound
     * @param {string} key - The key of the sound
     * @param {number} volume - The volume (0-1)
     */
    playSound(key, volume = 1.0) {
        const sound = this.getSound(key);
        sound.volume = volume;
        sound.play().catch(err => {
            console.warn(`Failed to play sound: ${key}`, err);
        });
    }
    
    /**
     * Load a specific asset on demand
     * @param {string} type - The type of asset ('image', 'sound', 'font')
     * @param {string} key - The key to store the asset under
     * @param {string} path - The path to the asset
     * @returns {Promise} - Promise that resolves when the asset is loaded
     */
    loadAsset(type, key, path) {
        return new Promise((resolve, reject) => {
            switch (type) {
                case 'image':
                    const img = new Image();
                    img.onload = () => {
                        this.images[key] = img;
                        resolve(img);
                    };
                    img.onerror = (err) => {
                        console.error(`Failed to load image: ${key} (${path})`, err);
                        reject(err);
                    };
                    img.src = path;
                    break;
                    
                case 'sound':
                    const sound = new Audio();
                    sound.addEventListener('canplaythrough', () => {
                        this.sounds[key] = sound;
                        resolve(sound);
                    }, { once: true });
                    sound.addEventListener('error', (err) => {
                        console.error(`Failed to load sound: ${key} (${path})`, err);
                        reject(err);
                    });
                    sound.src = path;
                    sound.load();
                    break;
                    
                case 'font':
                    const fontFace = new FontFace(key, `url(${path})`);
                    fontFace.load().then((loadedFace) => {
                        document.fonts.add(loadedFace);
                        this.fonts[key] = loadedFace;
                        resolve(loadedFace);
                    }).catch((err) => {
                        console.error(`Failed to load font: ${key} (${path})`, err);
                        reject(err);
                    });
                    break;
                    
                default:
                    reject(new Error(`Unknown asset type: ${type}`));
            }
        });
    }
    
    /**
     * Create a sprite sheet from an image
     * @param {string} key - The key to store the sprite sheet under
     * @param {string} imageKey - The key of the image to use
     * @param {number} frameWidth - Width of each frame
     * @param {number} frameHeight - Height of each frame
     * @param {number} numFrames - Number of frames
     * @param {number} startFrame - Starting frame index
     */
    createSpriteSheet(key, imageKey, frameWidth, frameHeight, numFrames, startFrame = 0) {
        const image = this.getImage(imageKey);
        
        // Calculate number of columns and rows
        const columns = Math.floor(image.width / frameWidth);
        const rows = Math.ceil(numFrames / columns);
        
        // Store the sprite sheet
        this.sprites[key] = {
            image: image,
            frameWidth: frameWidth,
            frameHeight: frameHeight,
            numFrames: numFrames,
            columns: columns,
            rows: rows,
            startFrame: startFrame,
            
            // Method to draw a specific frame
            drawFrame: (ctx, frameIndex, x, y, width, height) => {
                if (frameIndex >= numFrames) {
                    console.warn(`Invalid frame index: ${frameIndex}, max: ${numFrames - 1}`);
                    frameIndex = 0;
                }
                
                const adjustedFrameIndex = frameIndex + startFrame;
                const column = adjustedFrameIndex % columns;
                const row = Math.floor(adjustedFrameIndex / columns);
                
                ctx.drawImage(
                    image,
                    column * frameWidth,
                    row * frameHeight,
                    frameWidth,
                    frameHeight,
                    x,
                    y,
                    width || frameWidth,
                    height || frameHeight
                );
            }
        };
        
        return this.sprites[key];
    }
    
    /**
     * Get a sprite sheet
     * @param {string} key - The key of the sprite sheet
     * @returns {Object} - The sprite sheet object
     */
    getSpriteSheet(key) {
        if (this.sprites[key]) {
            return this.sprites[key];
        } else {
            console.warn(`Sprite sheet not found: ${key}`);
            return null;
        }
    }
}

// Make the AssetLoader class globally available
window.AssetLoader = AssetLoader; 

export default AssetLoader;