/*
 * Color Water Sort Game
 * Core Logic & UI Handling
 */

const COLORS = [
    'var(--color-red)', 'var(--color-blue)', 'var(--color-green)',
    'var(--color-yellow)', 'var(--color-orange)', 'var(--color-purple)',
    'var(--color-cyan)', 'var(--color-pink)', 'var(--color-gray)', 'var(--color-brown)'
];

class Game {
    constructor() {
        this.level = 1;
        this.maxLevels = 20;
        this.tubes = []; // Array of arrays (stacks of colors)
        this.selectedTubeIndex = -1;
        this.isAnimating = false;
        this.history = []; // For undo (optional, but good for structure)

        // DOM Elements
        this.screens = {
            menu: document.getElementById('main-menu'),
            levelSelect: document.getElementById('level-select'),
            game: document.getElementById('game-board')
        };
        this.ui = {
            tubesContainer: document.getElementById('tubes-container'),
            levelIndicator: document.getElementById('level-indicator'),
            levelsGrid: document.getElementById('levels-grid'),
            winModal: document.getElementById('win-modal')
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderLevelSelection();
    }

    setupEventListeners() {
        // Menu Navigation
        document.getElementById('btn-play').addEventListener('click', () => {
            // Resume last level or go to level select? Let's go to level select for clarity
            this.switchScreen('levelSelect');
        });

        document.getElementById('btn-back-menu').addEventListener('click', () => this.switchScreen('menu'));
        document.getElementById('btn-back-levels').addEventListener('click', () => this.switchScreen('levelSelect'));

        // Game Controls
        document.getElementById('btn-reset').addEventListener('click', () => this.startLevel(this.level));

        // Modal Controls
        document.getElementById('btn-next-level').addEventListener('click', () => {
            this.hideModal();
            if (this.level < this.maxLevels) {
                this.startLevel(this.level + 1);
            } else {
                this.switchScreen('levelSelect');
            }
        });

        document.getElementById('btn-menu-win').addEventListener('click', () => {
            this.hideModal();
            this.switchScreen('levelSelect');
        });
    }

    switchScreen(screenName) {
        Object.values(this.screens).forEach(s => {
            s.classList.add('hidden');
            s.classList.remove('active');
        });
        this.screens[screenName].classList.remove('hidden');
        this.screens[screenName].classList.add('active');

        if (screenName === 'levelSelect') {
            this.renderLevelSelection();
        }
    }

    // --- Level Generation Logic ---

    generateLevel(levelNum) {
        // Difficulty scaling
        // Level 1-5: 3-4 tubes, 2-3 colors
        // Level 6-10: 5-7 tubes, 4-5 colors
        // Level 11-20: 8-12 tubes, 6-9 colors

        let numColors, numTubes, numEmpty;

        if (levelNum <= 3) { numColors = 3; numEmpty = 2; }
        else if (levelNum <= 7) { numColors = 4; numEmpty = 2; }
        else if (levelNum <= 12) { numColors = 6; numEmpty = 2; }
        else if (levelNum <= 16) { numColors = 8; numEmpty = 2; }
        else { numColors = 9; numEmpty = 2; } // Max difficulty

        numTubes = numColors + numEmpty;

        // Create sorted tubes first
        let tubes = [];
        for (let i = 0; i < numColors; i++) {
            // Each tube has 4 segments of the same color
            tubes.push([i, i, i, i]);
        }
        // Add empty tubes
        for (let i = 0; i < numEmpty; i++) {
            tubes.push([]);
        }

        // Shuffle logic: Perform random valid moves to mix them up
        // This ensures the level is solvable
        let movesToMake = levelNum * 5 + 10; // More shuffles for higher levels
        let safetyCounter = 0;

        while (movesToMake > 0 && safetyCounter < 1000) {
            let from = Math.floor(Math.random() * numTubes);
            let to = Math.floor(Math.random() * numTubes);

            if (from !== to && tubes[from].length > 0 && tubes[to].length < 4) {
                tubes[to].push(tubes[from].pop());
                movesToMake--;
            }
            safetyCounter++;
        }

        return { tubes, numColors };
    }

    startLevel(levelNum) {
        this.level = levelNum;
        this.ui.levelIndicator.textContent = `Level ${levelNum}`;

        const levelData = this.generateLevel(levelNum);
        this.tubes = levelData.tubes; // Array of arrays of color indices
        this.selectedTubeIndex = -1;

        this.switchScreen('game');
        this.renderGame();
    }

    // --- Game Logic ---

    handleTubeClick(index) {
        if (this.isAnimating) return;

        if (this.selectedTubeIndex === -1) {
            // Select source
            if (this.tubes[index].length > 0) {
                this.selectedTubeIndex = index;
                this.renderGame();
            }
        } else {
            // Select destination
            if (this.selectedTubeIndex === index) {
                // Deselect
                this.selectedTubeIndex = -1;
                this.renderGame();
            } else {
                // Attempt move
                if (this.isValidMove(this.selectedTubeIndex, index)) {
                    this.moveDisc(this.selectedTubeIndex, index);
                } else {
                    // Invalid move, just deselect or shake (visual feedback todo)
                    this.selectedTubeIndex = -1;
                    this.renderGame();
                }
            }
        }
    }

    isValidMove(fromIndex, toIndex) {
        const fromTube = this.tubes[fromIndex];
        const toTube = this.tubes[toIndex];

        console.log(`Checking move from ${fromIndex} to ${toIndex}`);
        console.log('From:', [...fromTube], 'To:', [...toTube]);

        if (fromTube.length === 0) { console.log('Fail: Source empty'); return false; }
        if (toTube.length === 4) { console.log('Fail: Dest full'); return false; }

        const colorToMove = fromTube[fromTube.length - 1];

        // If dest is empty, any color can go there
        if (toTube.length === 0) return true;

        const topColorDest = toTube[toTube.length - 1];

        console.log(`Color to move: ${colorToMove}, Dest top: ${topColorDest}`);

        // Colors must match
        if (colorToMove !== topColorDest) { console.log('Fail: Colors mismatch'); return false; }

        return true;
    }

    async moveDisc(fromIndex, toIndex) {
        this.isAnimating = true;

        const fromTube = this.tubes[fromIndex];
        const toTube = this.tubes[toIndex];
        const colorToMove = fromTube[fromTube.length - 1]; // Get top disc color

        // Calculate how many discs to move
        let countToMove = 0;
        for (let i = fromTube.length - 1; i >= 0; i--) {
            if (fromTube[i] === colorToMove) countToMove++;
            else break;
        }

        // Calculate available space
        let spaceInDest = 4 - toTube.length;
        let actualMove = Math.min(countToMove, spaceInDest);

        // Visual Animation
        const tubes = this.ui.tubesContainer.children;
        const fromEl = tubes[fromIndex];
        const toEl = tubes[toIndex];

        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        const animationPromises = [];

        // Move multiple discs simultaneously with stagger
        for (let i = 0; i < actualMove; i++) {
            // Get the actual disc element to move (last child - i)
            // Since we aren't removing them from DOM yet, we need to pick from the end backwards
            // But wait, if we don't remove them, 'lastElementChild' is always the same.
            // We need to target specific children.
            const discIndex = fromEl.children.length - 1 - i;
            const discToMove = fromEl.children[discIndex];

            if (!discToMove) break;

            const discRect = discToMove.getBoundingClientRect();

            // Create a flying disc clone for animation
            const flyingDisc = discToMove.cloneNode(true);
            flyingDisc.style.position = 'fixed';
            flyingDisc.style.left = `${discRect.left}px`;
            flyingDisc.style.top = `${discRect.top}px`;
            flyingDisc.style.width = `${discRect.width}px`;
            flyingDisc.style.height = `${discRect.height}px`;
            flyingDisc.style.zIndex = 1000 + i; // Ensure stacking order
            flyingDisc.style.transition = 'top 0.2s ease-in-out, left 0.2s ease-in-out'; // Slightly smoother
            document.body.appendChild(flyingDisc);

            // Hide original immediately
            discToMove.style.opacity = '0';

            // Animation Sequence for this specific disc
            const animateOneDisc = async (disc, index) => {
                // Stagger delay
                await new Promise(r => setTimeout(r, index * 50));

                // 2. Lift Up
                const safeTop = fromRect.top - 50 - (index * 10); // Stagger height slightly too? Maybe not needed, but looks cool
                disc.style.top = `${fromRect.top - 60}px`; // Unified lift height

                await new Promise(r => setTimeout(r, 150));

                // 3. Move Horizontally
                const targetLeft = toRect.left + (toRect.width - discRect.width) / 2;
                disc.style.left = `${targetLeft}px`;

                await new Promise(r => setTimeout(r, 150));

                // 4. Drop Down
                const currentDiscsInTarget = toTube.length + index; // Account for discs already moved in this batch (logically)
                const discHeight = 42;
                const bottomOffset = 10;
                const targetDropTop = toRect.bottom - bottomOffset - ((currentDiscsInTarget + 1) * discHeight);

                disc.style.top = `${targetDropTop}px`;

                await new Promise(r => setTimeout(r, 200)); // Drop takes a bit longer to settle

                // Cleanup this disc visual
                document.body.removeChild(disc);
            };

            animationPromises.push(animateOneDisc(flyingDisc, i));
        }

        // Wait for ALL animations to complete
        await Promise.all(animationPromises);

        // 5. Update Data Model & DOM (Batch update)
        // Remove from source DOM
        for (let i = 0; i < actualMove; i++) {
            if (fromEl.lastElementChild) fromEl.removeChild(fromEl.lastElementChild);
        }

        // Add to target DOM & Model
        for (let i = 0; i < actualMove; i++) {
            const color = fromTube.pop();
            toTube.push(color);

            const newDisc = document.createElement('div');
            newDisc.className = 'water';
            newDisc.style.backgroundColor = COLORS[color];
            toEl.appendChild(newDisc);
        }

        this.selectedTubeIndex = -1;
        this.renderGame(); // Re-render to ensure clean state
        this.isAnimating = false;

        // Check win
        if (this.checkWin()) {
            setTimeout(() => this.showWinModal(), 200);
        }
    }

    checkWin() {
        // Win if all tubes are either empty or full with same color
        for (let tube of this.tubes) {
            if (tube.length === 0) continue;
            if (tube.length !== 4) return false; // Not full

            const firstColor = tube[0];
            for (let color of tube) {
                if (color !== firstColor) return false; // Mixed colors
            }
        }
        return true;
    }

    // --- Rendering ---

    renderLevelSelection() {
        this.ui.levelsGrid.innerHTML = '';
        // Assuming levels unlock sequentially. For now, unlock all or track progress.
        // Let's use localStorage for progress
        const maxUnlocked = parseInt(localStorage.getItem('waterSort_maxLevel')) || 1;

        for (let i = 1; i <= this.maxLevels; i++) {
            const btn = document.createElement('div');
            btn.className = `level-btn ${i > maxUnlocked ? 'locked' : ''} ${i < maxUnlocked ? 'completed' : ''}`;
            btn.textContent = i;

            if (i <= maxUnlocked) {
                btn.addEventListener('click', () => this.startLevel(i));
            }

            this.ui.levelsGrid.appendChild(btn);
        }
    }

    renderGame() {
        this.ui.tubesContainer.innerHTML = '';

        this.tubes.forEach((tube, index) => {
            const tubeEl = document.createElement('div');
            tubeEl.className = `tube ${index === this.selectedTubeIndex ? 'selected' : ''}`;
            tubeEl.onclick = () => this.handleTubeClick(index);

            // Render water segments
            // We render from bottom to top visually, but DOM order depends on CSS flex-direction
            // CSS is flex-direction: column-reverse, so first child is bottom.

            tube.forEach(colorIndex => {
                const water = document.createElement('div');
                water.className = 'water';
                water.style.backgroundColor = COLORS[colorIndex];
                // water.style.height = '25%'; // Removed: Controlled by CSS for discs
                tubeEl.appendChild(water);
            });

            this.ui.tubesContainer.appendChild(tubeEl);
        });
    }

    showWinModal() {
        // Save progress
        const currentMax = parseInt(localStorage.getItem('waterSort_maxLevel')) || 1;
        if (this.level >= currentMax && this.level < this.maxLevels) {
            localStorage.setItem('waterSort_maxLevel', this.level + 1);
        }

        // Update text
        const h2 = this.ui.winModal.querySelector('h2');
        const p = this.ui.winModal.querySelector('p');

        if (this.level === this.maxLevels) {
            h2.textContent = "Game Completed!";
            p.textContent = "You've mastered all levels!";
            document.getElementById('btn-next-level').style.display = 'none';
        } else {
            h2.textContent = "Level Complete!";
            p.textContent = "Great job!";
            document.getElementById('btn-next-level').style.display = 'block';
        }

        this.ui.winModal.classList.remove('hidden');
    }

    hideModal() {
        this.ui.winModal.classList.add('hidden');
    }
}

// Start Game
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
