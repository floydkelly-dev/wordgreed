        // --- Firebase Imports ---
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        // --- DOM Elements ---
        const gridContainer = document.getElementById('game-grid');
        const musicPlayer = document.getElementById('background-music');
        const playerNameInput = document.getElementById('player-name-input');

        // --- Firebase State ---
        let auth, db, userId;
        let isFirebaseConnected = false;

        // --- Game Data & State ---
        let coins = 0, bagsOfMoney = 0, draggedTile = null, playerData = {}, currentLevel = 1;
        const totalGameTime = 600;
        let timeRemaining = totalGameTime, mainTimerInterval = null, prizeSpawnerTimeout = null;
        let diamondSequenceTimeout = null, puzzles = [], trophyCollectedThisLevel = false;
        let diamondCollectedThisLevel = false, currentDiamondValue = 20000000;
        let solveButtonClicks = 0, solveButtonCooldown = 0, solveButtonTimerInterval = null;
        let isGamePaused = true, isGameOver = false, timeSinceLastSolve = 0;
        let scoreDecayInterval = null, impTimeout = null, isFrozen = false, thawTimeout = null;
        let jackpotEventAvailable = true, specialJackpotTimeout = null, specialCashEmojiSpawned = false;
        let timedEvents = { sixMin: true, threeMin: true, heartEvent1: true, heartEvent2: true };
        let isSpecialAnimationActive = false;
        let startModalAnimationInterval = null, maxSameEmoji = 4, isDraggingBomb = false;
        let lastVolume = 0.5, solveButtonPulseManager = null;
        let freezeAnimationInterval = null, heartAnimationInterval = null, gameOverAnimationInterval = null;
        let badgesModalAnimationInterval = null;
        let endgameJackpotActive = false;
        let levelGoodies = [];
        let selectedTrade = null;
        let selectedDonation = null;
        
        // --- Playlist Data ---
        const songDatabase = [
            { id: '001', title: 'Word Greed', filename: 'wordgreed001.mp3' },
            { id: '002', title: 'Diamond Focus', filename: 'wordgreed002.mp3' },
            { id: '003', title: 'Elevated Echoes', filename: 'wordgreed003.mp3' },
            { id: '004', title: 'Smooth Vibes', filename: 'wordgreed004.mp3' },
            { id: '005', title: 'Cash Flow', filename: 'wordgreed005.mp3' },
            { id: '006', title: 'Golden Glow', filename: 'wordgreed006.mp3' },
            { id: '007', title: 'Rich Shadows', filename: 'wordgreed007.mp3' },
            { id: '008', title: 'Reversal of Fortune', filename: 'wordgreed008.mp3' },
            { id: '009', title: 'Ascending Choices', filename: 'wordgreed009.mp3' }
        ];
        let verifiedPlaylist = [], userPlaylist = [], originalUserPlaylist = [];
        let currentTrackIndex = 0, isShuffled = false;
        const musicBaseURL = 'https://raw.githubusercontent.com/floydkelly-dev/wordgreed/main/public/';
        const mutedIconHref = 'https://raw.githubusercontent.com/floydkelly-dev/wordgreed/main/public/WordGreedSiteIcon.png';
        const speakerSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M 20 40 L 40 40 L 60 20 L 60 80 L 40 60 L 20 60 Z" fill="white" stroke="black" stroke-width="2"/><path d="M 70 30 C 80 40, 80 60, 70 70" stroke="white" stroke-width="5" fill="none"/><path d="M 80 20 C 95 35, 95 65, 80 80" stroke="white" stroke-width="5" fill="none"/></svg>`;
        const speakerIconHref = `data:image/svg+xml,${encodeURIComponent(speakerSVG)}`;

        // --- Word Bank & Prize Data ---
        const prizeEmojis = [ { emoji: '🎁', value: 1500000, type: 'coins' }, { emoji: '🏆', value: 3500000, type: 'trophy' }, { emoji: '💎', value: 20000000, type: 'diamond' }, { emoji: '💣', value: 0, type: 'game_over' }, { emoji: '💣', value: 0, type: 'green_bomb' }, { emoji: '⭐', value: 5000, type: 'coins' }, { emoji: '⚡', value: 20000, type: 'lightning' }, { emoji: '❄️', value: 0, type: 'freeze' }, { emoji: '🔥', value: 400, type: 'fire_column'}, { emoji: '💰', value: 1000000, type: 'cash_money' } ];
        const nonsenseFreebies = ['🌭','🥞','🍕','🍔','🍟','🍗','🥠','🍩', '🍰', '🍭', '🍋‍🟩', '🧋', '🍷', '🍫', '☕', '🍪'];
        const puzzleLayouts = [ { length: 5, indices: [11, 12, 13, 14, 15] }, { length: 7, indices: [28, 29, 30, 31, 32, 33, 34] }, { length: 7, indices: [46, 47, 48, 49, 50, 51, 52] }, { length: 5, indices: [65, 66, 67, 68, 69] } ];
        const trades = [
            { id: 'trade001', name: '10 🌭 for 1 Food Truck', cost: { '🌭': 10 }, reward: { type: 'inventory', item: '🚚', amount: 1 } },
            { id: 'trade002', name: '15 🥞 for 1 Diner', cost: { '🥞': 15 }, reward: { type: 'inventory', item: '🏛️', amount: 1 } },
            { id: 'trade003', name: '20 🍕 for 1 Pizzeria', cost: { '🍕': 20 }, reward: { type: 'inventory', item: '🍕', amount: 1 } },
            { id: 'trade004', name: '25 🍔 for 1 Burger Chain', cost: { '🍔': 25 }, reward: { type: 'inventory', item: '🍔', amount: 1 } },
            { id: 'trade005', name: '30 🍟 for 1 Potato Farm', cost: { '🍟': 30 }, reward: { type: 'inventory', item: '🥔', amount: 1 } },
            { id: 'trade006', name: '25 🍗 for 1 Chicken Farm', cost: { ' ': 25 }, reward: { type: 'inventory', item: '🐔', amount: 1 } },
            { id: 'trade007', name: '20 🥠 for 1 Chip Plant', cost: { '🥠': 20 }, reward: { type: 'inventory', item: '💽', amount: 1 } },
            { id: 'trade008', name: '15 🍩 for 1 Donut Shop', cost: { '🍩': 15 }, reward: { type: 'inventory', item: '🍩', amount: 1 } },
            { id: 'trade009', name: '10 🍰 for 1 TV Show', cost: { '🍰': 10 }, reward: { type: 'inventory', item: '📺', amount: 1 } },
            { id: 'trade010', name: '5 🍭 for 1 Candy Vendor', cost: { '🍭': 5 }, reward: { type: 'inventory', item: '🍬', amount: 1 } },
            { id: 'trade011', name: '2 🍋‍🟩 for 2M Money Bags', cost: { '🍋‍🟩': 2 }, reward: { type: 'bags', amount: 2000000 } },
            { id: 'trade012', name: '1 🧋 for 2K Coins', cost: { '🧋': 1 }, reward: { type: 'coins', amount: 2000 } },
            { id: 'trade013', name: '1 🍷 for 1 Restaurant', cost: { '🍷': 1 }, reward: { type: 'inventory', item: '🍷', amount: 1 } },
            { id: 'trade014', name: '10 🍫 for 1 Candy Factory', cost: { '🍫': 10 }, reward: { type: 'inventory', item: '🏭', amount: 1 } },
            { id: 'trade015', name: '20 ☕ for 1 Headache', cost: { '☕': 20 }, reward: { type: 'inventory', item: '🤕', amount: 1 } },
            { id: 'trade016', name: '25 🍪 for 2 Gold Mines', cost: { '🍪': 25 }, reward: { type: 'inventory', item: '⛏️', amount: 2 } }
        ];
        const inventoryItemNames = {
            '🚚': 'Food Truck', '🏛️': 'Diner', '🍕': 'Pizzeria', '🍔': 'Burger Chain',
            '🥔': 'Potato Farm', '🐔': 'Chicken Farm', '💽': 'Chip Plant', '🍩': 'Donut Shop',
            '📺': 'TV Show', '🍬': 'Candy Vendor', '🍷': 'Restaurant', '🏭': 'Candy Factory',
            '🤕': 'Headache', '⛏️': 'Gold Mine'
        };
        const tips = [
            "💡 Tip! The green bomb is your friend! Drag it anywhere and drop on a word to auto solve.",
            "💡 Another Tip! The green bomb has a range of 9 squares and will capture all freebies!",
            "💡 Tip! If you lose a big chunk of coins during game play, keep playing and in seconds be rich again!",
            "💡 Tip! The green checkmark is your friend to quick solve.",
            "💡 Wow! Another tip for you. Use the green checkmark to break an ice level with ease!"
        ];
        let currentTipIndex = 0;
        
        // --- Game Logic Functions ---
        function generatePuzzlesForLevel() {
            puzzles = [];
            // Access wordList from the global window scope, where wordlist.js should place it.
            let availableWords = [...window.wordList];
            puzzleLayouts.forEach(layout => {
                const wordsOfLength = availableWords.filter(w => w.length === layout.length);
                if (wordsOfLength.length > 0) {
                    const word = wordsOfLength[Math.floor(Math.random() * wordsOfLength.length)];
                    puzzles.push({ word: word, indices: layout.indices, solved: false });
                    availableWords = availableWords.filter(w => w !== word); 
                }
            });
        }
        
        function startLevel() {
            document.getElementById('level-display').textContent = currentLevel;
            trophyCollectedThisLevel = false;
            diamondCollectedThisLevel = false;
            solveButtonClicks = 0;
            timeSinceLastSolve = 0;
            clearTimeout(diamondSequenceTimeout);
            clearTimeout(thawTimeout);
            const iconsContainer = document.getElementById('greed-icons-container');
            iconsContainer.innerHTML = '';
            generatePuzzlesForLevel();
            initializeGrid();
        }

        function initializeGrid() {
            gridContainer.innerHTML = '';
            puzzles.forEach(p => p.scrambled = shuffleWord(p.word));
            const allPuzzleIndices = puzzles.flatMap(p => p.indices);

            for (let i = 0; i < 81; i++) {
                const tile = document.createElement('div');
                tile.classList.add('w-10', 'h-10', 'md:w-11', 'md:h-11', 'flex', 'items-center', 'justify-center', 'text-2xl', 'font-bold', 'rounded-lg', 'select-none');
                tile.id = `tile-${i}`;

                if (allPuzzleIndices.includes(i)) {
                    for (const puzzle of puzzles) {
                        if (puzzle.indices.includes(i)) {
                            const letterIndex = puzzle.indices.indexOf(i);
                            tile.textContent = puzzle.scrambled[letterIndex];
                            tile.classList.add('word-puzzle-tile');
                            tile.dataset.puzzleIndex = puzzles.indexOf(puzzle);
                            tile.draggable = true;
                            addDragListeners(tile);
                            break;
                        }
                    }
                } else if (i === 40) {
                    tile.id = 'jackpot-square';
                    tile.classList.add('bg-amber-500', 'border-2', 'border-amber-300', 'text-4xl');
                    tile.textContent = '💰';
                    tile.addEventListener('click', onJackpotClick);
                } else {
                    tile.classList.add('bg-slate-900/50', 'border', 'border-slate-800/50');
                }
                gridContainer.appendChild(tile);
            }
        }

        function shuffleWord(word) {
            let array = word.split('');
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            let shuffled = array.join('');
            return shuffled === word ? shuffleWord(word) : shuffled;
        }

        function addDragListeners(tile) {
            tile.addEventListener('dragstart', handleDragStart);
            tile.addEventListener('dragover', handleDragOver);
            tile.addEventListener('drop', handleDrop);
            tile.addEventListener('dragend', handleDragEnd);
        }

        function handleDragStart(e) {
            if (timeRemaining <= 0) return;
            draggedTile = e.target;
            setTimeout(() => e.target.classList.add('dragging'), 0);
            if (draggedTile.dataset.prizeType === 'green_bomb') {
                isDraggingBomb = true;
                document.getElementById('bomb-drag-preview').style.display = 'block';
            }
        }

        function handleDragOver(e) { 
            e.preventDefault(); 
            if (isDraggingBomb) {
                const targetTile = e.target.closest('#game-grid > div');
                if (targetTile) {
                    const preview = document.getElementById('bomb-drag-preview');
                    const rect = targetTile.getBoundingClientRect();
                    const gridRect = gridContainer.getBoundingClientRect();
                    const size = rect.width;
                    preview.style.width = `${size * 3}px`;
                    preview.style.height = `${size * 3}px`;
                    preview.style.left = `${rect.left - gridRect.left - size}px`;
                    preview.style.top = `${rect.top - gridRect.top - size}px`;
                }
            }
        }

        function handleDrop(e) {
            e.preventDefault();
            const dropTarget = e.target.closest('#game-grid > div');
            if (!dropTarget) return;

            if (isDraggingBomb && draggedTile) {
                startGreenBombSequence(dropTarget);
                draggedTile.textContent = '';
                draggedTile.classList.remove('prize-tile', 'green-bomb');
                draggedTile.draggable = false;
            }
            else if (dropTarget.classList.contains('word-puzzle-tile') && 
                draggedTile && draggedTile.classList.contains('word-puzzle-tile') &&
                dropTarget.dataset.puzzleIndex === draggedTile.dataset.puzzleIndex &&
                draggedTile !== dropTarget && !dropTarget.classList.contains('solved')) {
                const tempText = draggedTile.textContent;
                draggedTile.textContent = dropTarget.textContent;
                dropTarget.textContent = tempText;
                checkAllPuzzles();
            }
        }
        
        function handleDragEnd(e) { 
            e.target.classList.remove('dragging'); 
            if (isDraggingBomb) {
                isDraggingBomb = false;
                document.getElementById('bomb-drag-preview').style.display = 'none';
            }
            draggedTile = null;
        }

        function checkAllPuzzles() {
            let allWordsOnBoardAreSolved = true;
            puzzles.forEach((puzzle) => {
                if (!puzzle.solved) {
                    let currentWord = '';
                    puzzle.indices.forEach(index => { currentWord += document.getElementById(`tile-${index}`).textContent; });
                    if (currentWord === puzzle.word) {
                        puzzle.solved = true;
                        timeSinceLastSolve = 0;
                        coins += 10000;
                        updateScoreDisplay();
                        flashScore('gain');
                        const middleTileIndex = puzzle.indices[Math.floor(puzzle.indices.length / 2)];
                        const startTile = document.getElementById(`tile-${middleTileIndex}`);
                        if (!isFrozen) {
                            triggerCoinAnimation(startTile, document.getElementById('coins-display'));
                        }
                        puzzle.indices.forEach(index => {
                            const tile = document.getElementById(`tile-${index}`);
                            tile.classList.add('solved');
                            tile.draggable = false;
                        });
                    } else {
                        allWordsOnBoardAreSolved = false;
                    }
                }
            });

            if (allWordsOnBoardAreSolved && puzzles.length > 0) {
                if (isFrozen) endFreeze();
                coins += 100000;
                updateScoreDisplay();
                flashScore('gain');
                showEventText("Level Up!");
                flashLevelPanel();
                currentLevel++;
                setTimeout(() => startLevel(), 1500);
            }
        }

        function formatScore(num) {
            if (num < 1000) return num.toString();
            const si = [
                { value: 1E12, symbol: "T" }, { value: 1E9, symbol: "B" },
                { value: 1E6, symbol: "M" }, { value: 1E3, symbol: "K" }
            ];
            const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
            for (let i = 0; i < si.length; i++) {
                if (num >= si[i].value) {
                    return (num / si[i].value).toFixed(1).replace(rx, "$1") + si[i].symbol;
                }
            }
            return num.toLocaleString();
        }

        function updateScoreDisplay() {
            bagsOfMoney = Math.floor(coins * 0.01);
            document.getElementById('coins-display').textContent = coins.toLocaleString();
            document.getElementById('bags-of-money-display').textContent = bagsOfMoney.toLocaleString();
            document.getElementById('coins-display').classList.remove('score-decay');
        }

        function flashScore(type = 'gain') {
            const coinsDisplay = document.getElementById('coins-display');
            const flashClass = type === 'gain' ? 'gain-flash' : 'deduct-flash';
            coinsDisplay.classList.remove('gain-flash', 'deduct-flash');
            void coinsDisplay.offsetWidth;
            coinsDisplay.classList.add(flashClass);
            setTimeout(() => { coinsDisplay.classList.remove(flashClass); }, 800);
        }

        function flashBagsPanel() {
            const bagsDisplay = document.getElementById('bags-of-money-display');
            bagsDisplay.classList.add('deduct-flash');
            setTimeout(() => { bagsDisplay.classList.remove('deduct-flash'); }, 1200);
        }

        function flashLevelPanel() {
            const levelDisplay = document.getElementById('level-display');
            levelDisplay.classList.add('level-flash');
            setTimeout(() => { levelDisplay.classList.remove('level-flash'); }, 1500);
        }
        
        function updateTimer() {
            if (timeRemaining > 0 && !isGamePaused) {
                timeRemaining--;
                timeSinceLastSolve++;
                const minutes = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
                const seconds = (timeRemaining % 60).toString().padStart(2, '0');
                document.getElementById('timer-display').textContent = `${minutes}:${seconds}`;

                if (timeRemaining === 580 && !specialCashEmojiSpawned) {
                    specialCashEmojiSpawned = true;
                    spawnSpecialCashEmoji();
                }
                if (timeRemaining === 360 && timedEvents.sixMin) {
                    timedEvents.sixMin = false;
                    spawnImp();
                }
                if (timeRemaining === 180 && timedEvents.threeMin) {
                    timedEvents.threeMin = false;
                    spawnImp();
                }
                if (timeRemaining === 300 && jackpotEventAvailable) {
                    jackpotEventAvailable = false;
                    activateSpecialJackpot();
                }
                if (timeRemaining <= 5 && timeRemaining > 0 && !isGameOver) {
                    activateEndgameJackpot();
                }
                if (timeRemaining === 480 && timedEvents.heartEvent1) {
                    timedEvents.heartEvent1 = false;
                    spawnHeartAnimation();
                }
                if (timeRemaining === 120 && timedEvents.heartEvent2) {
                    timedEvents.heartEvent2 = false;
                    spawnHeartAnimation();
                }
            } else if (timeRemaining <= 0) {
                endGame();
            }
        }
        
        function activateSpecialJackpot() {
            const jackpotSquare = document.getElementById('jackpot-square');
            jackpotSquare.classList.add('wild-pulse');
            const specialJackpotHandler = () => {
                GJACKVARNUM = 0;
                coins += 50000000;
                updateScoreDisplay();
                flashScore('gain');
                showEventText('💰 50,000,000 💰');
                
                jackpotSquare.classList.remove('wild-pulse');
                clearTimeout(specialJackpotTimeout);
                jackpotSquare.removeEventListener('click', specialJackpotHandler);
            };
            jackpotSquare.addEventListener('click', specialJackpotHandler);
            specialJackpotTimeout = setTimeout(() => {
                jackpotSquare.classList.remove('wild-pulse');
                jackpotSquare.removeEventListener('click', specialJackpotHandler);
            }, 15000);
        }

        function activateEndgameJackpot() {
            if (endgameJackpotActive || isGameOver) return;
            endgameJackpotActive = true;

            const jackpotSquare = document.getElementById('jackpot-square');
            jackpotSquare.classList.add('endgame-pulse');

            const endgameJackpotHandler = () => {
                if (isGameOver) return; 
                coins += 1000000000;
                updateScoreDisplay();
                showEventText("Jackpot!", true, true);
                jackpotSquare.classList.remove('endgame-pulse');
            };

            jackpotSquare.addEventListener('click', endgameJackpotHandler, { once: true });
        }

        function triggerCoinAnimation(startElement, endElement) {
            const startRect = startElement.getBoundingClientRect();
            const endRect = endElement.getBoundingClientRect();
            const startX = startRect.left + startRect.width / 2;
            const startY = startRect.top + startRect.height / 2;
            const endX = endRect.left + endRect.width / 2;
            const endY = endRect.top + endRect.height / 2;
            const controlX = startX + (endX - startX) / 2;
            const controlY = startY - 100;
            const curve = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;

            for (let i = 0; i < 15; i++) {
                const coin = document.createElement('div');
                coin.classList.add('coin');
                coin.style.animation = `fly-along-path 0.8s cubic-bezier(0.4, 0, 0.9, 0.5) forwards`;
                coin.style.offsetPath = `path('${curve}')`;
                coin.style.animationDelay = `${Math.random() * 0.3}s`;
                document.body.appendChild(coin);
                setTimeout(() => coin.remove(), 1100);
            }
        }

        function triggerBigCoinAnimation(startElement, endElement) {
            const startRect = startElement.getBoundingClientRect();
            const endRect = endElement.getBoundingClientRect();
            const startX = startRect.left + startRect.width / 2;
            const startY = startRect.top + startRect.height / 2;
            const endX = endRect.left + endRect.width / 2;
            const endY = endRect.top + endRect.height / 2;
            const controlX = startX + (endX - startX) / 2;
            const controlY = startY - 100;
            const curve = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
            
            const coin = document.createElement('div');
            coin.classList.add('coin');
            coin.style.animation = `big-coin-tumble 0.8s ease-out forwards, fly-along-path 0.8s ease-out forwards`;
            coin.style.offsetPath = `path('${curve}')`;
            document.body.appendChild(coin);
            setTimeout(() => coin.remove(), 800);
        }

        function triggerCoinImplosion(originElement) {
            const originRect = originElement.getBoundingClientRect();
            const endRect = document.getElementById('coins-display').getBoundingClientRect();
            const centerX = originRect.left + originRect.width / 2;
            const centerY = originRect.top + originRect.height / 2;
            const endX = endRect.left + endRect.width / 2;
            const endY = endRect.top + endRect.height / 2;
            const startRadius = 100;

            for (let i = 0; i < 20; i++) {
                const coin = document.createElement('div');
                coin.classList.add('coin');
                const angle = (i / 20) * (2 * Math.PI);
                const startX = centerX + Math.cos(angle) * startRadius;
                const startY = centerY + Math.sin(angle) * startRadius;
                const controlX = startX + (endX - startX) / 2 + (Math.random() - 0.5) * 200;
                const controlY = startY + (endY - startY) / 2 + (Math.random() - 0.5) * 200;
                const curve = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
                coin.style.offsetPath = `path('${curve}')`;
                coin.style.animation = `coin-swirl-in 1s cubic-bezier(0.5, 0, 0.9, 0.5) forwards`;
                coin.style.animationDelay = `${Math.random() * 0.3}s`;
                document.body.appendChild(coin);
                setTimeout(() => coin.remove(), 1300);
            }
        }

        function onSolveButtonClick() {
            if (timeRemaining <= 0 || solveButtonCooldown > 0) return;
            GJACKVARNUM = 0;

            const unsolvedPuzzles = puzzles.filter(p => !p.solved);
            if (unsolvedPuzzles.length === 0) return;

            const solveButton = document.getElementById('solve-button');
            solveButton.classList.remove('big-pulse');
            timeSinceLastSolve = 0;
            solveButtonClicks++;
            triggerCoinImplosion(document.getElementById('solve-button'));
            coins -= 200000;
            updateScoreDisplay();
            flashScore('deduct');

            const puzzleToSolve = unsolvedPuzzles[Math.floor(Math.random() * unsolvedPuzzles.length)];
            puzzleToSolve.indices.forEach((tileIndex, letterIndex) => {
                document.getElementById(`tile-${tileIndex}`).textContent = puzzleToSolve.word[letterIndex];
            });
            checkAllPuzzles();

            if (solveButtonClicks >= 4) {
                startSolveButtonCooldown();
            }
        }

        function startSolveButtonCooldown() {
            solveButtonCooldown = 60;
            const solveButton = document.getElementById('solve-button');
            solveButton.disabled = true;
            solveButton.classList.remove('text-3xl');
            solveButton.classList.add('cooldown-timer');
            
            solveButtonTimerInterval = setInterval(() => {
                if (solveButtonCooldown > 0) {
                    solveButtonCooldown--;
                    solveButton.textContent = `0:${solveButtonCooldown.toString().padStart(2, '0')}`;
                } else {
                    clearInterval(solveButtonTimerInterval);
                    solveButton.textContent = '✅';
                    solveButton.classList.remove('cooldown-timer');
                    solveButton.classList.add('text-3xl');
                    solveButton.disabled = false;
                    solveButtonClicks = 0;
                }
            }, 1000);
        }

        let GJACKVARNUM = 0;
        function onJackpotClick(event) {
            const jackpotSquare = event.currentTarget;
            if (jackpotSquare.classList.contains('cooldown') || jackpotSquare.classList.contains('wild-pulse') || jackpotSquare.classList.contains('endgame-pulse')) return;

            timeSinceLastSolve = 0;
            GJACKVARNUM++;
            coins += 50000;
            updateScoreDisplay();
            flashScore('gain');
            triggerCoinAnimation(jackpotSquare, document.getElementById('coins-display'));

            if (GJACKVARNUM === 4) {
                showEventText("Yep! You're Greedy!");
            } else if (GJACKVARNUM === 8) {
                showEventText("Get outta here!");
            } else if (GJACKVARNUM >= 12) {
                coins = Math.floor(coins / 2);
                updateScoreDisplay();
                flashScore('deduct');
                flashBagsPanel();
                GJACKVARNUM = 0;
                jackpotSquare.classList.add('cooldown');
                setTimeout(() => {
                    jackpotSquare.classList.remove('cooldown');
                }, 15000);
            }
        }

        function scheduleNextPrizeSpawn() {
            if (timeRemaining <= 0 || isGamePaused || isFrozen || isSpecialAnimationActive) return;
            
            const timeElapsed = totalGameTime - timeRemaining;
            const progress = timeElapsed / totalGameTime;
            const maxDelay = 2500;
            const minDelay = 100;
            const currentDelay = minDelay + (maxDelay - minDelay) * Math.pow(1 - progress, 3);

            prizeSpawnerTimeout = setTimeout(() => {
                if (levelGoodies.length > 0 && Math.random() < 0.1) { // 10% chance for a goodie
                    spawnSpecialGoodie();
                } else {
                    spawnPrizeEmoji();
                }
                scheduleNextPrizeSpawn();
            }, currentDelay);
        }

        function spawnSpecialGoodie() {
            if (isGamePaused || isGameOver || levelGoodies.length === 0) return;

            const allPuzzleIndices = puzzles.flatMap(p => p.indices);
            let emptyTiles = [];
            for(let i=0; i<81; i++) {
                if (!allPuzzleIndices.includes(i) && i !== 40) {
                    const tile = document.getElementById(`tile-${i}`);
                    if (!tile.textContent) {
                        emptyTiles.push(tile);
                    }
                }
            }
            if (emptyTiles.length === 0) return;
            const tile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
            
            // Clean the tile before use
            const newTile = tile.cloneNode(false);
            tile.parentNode.replaceChild(newTile, tile);

            const goodieIndex = Math.floor(Math.random() * levelGoodies.length);
            const goodieEmoji = levelGoodies.splice(goodieIndex, 1)[0];

            newTile.textContent = goodieEmoji;
            newTile.classList.add('prize-tile', 'cash-money-prize');

            const clickHandler = () => {
                // Immediately neutralize the tile to prevent race conditions
                newTile.textContent = '';
                newTile.classList.remove('prize-tile', 'cash-money-prize');
                clearTimeout(despawnTimer);

                // Then, perform game logic
                coins += 1000000;
                updateScoreDisplay();
                flashScore('gain');
                triggerCoinAnimation(newTile, document.getElementById('coins-display'));

                if (!playerData.nonsenseFreebiesCollected[goodieEmoji]) {
                    playerData.nonsenseFreebiesCollected[goodieEmoji] = 0;
                }
                playerData.nonsenseFreebiesCollected[goodieEmoji]++;
                savePlayerProfile();
            };

            const despawnTimer = setTimeout(() => {
                levelGoodies.push(goodieEmoji);
                newTile.textContent = '';
                newTile.classList.remove('prize-tile', 'cash-money-prize');
                newTile.removeEventListener('click', clickHandler);
            }, 8000);

            newTile.addEventListener('click', clickHandler, { once: true });
        }

        function spawnPrizeEmoji() {
            if (timeRemaining <= 0 || isGamePaused || isFrozen) return;

            const allPuzzleIndices = puzzles.flatMap(p => p.indices);
            let emptyTiles = [];
            for(let i=0; i<81; i++) {
                if (!allPuzzleIndices.includes(i) && i !== 40) {
                    const tile = document.getElementById(`tile-${i}`);
                    if (!tile.textContent) {
                        emptyTiles.push(tile);
                    }
                }
            }
            // BUG FIX: If the board is full, clear a few random tiles to make space
            if (emptyTiles.length === 0) {
                const nonPuzzleTiles = [];
                 for(let i=0; i<81; i++) {
                    if (!allPuzzleIndices.includes(i) && i !== 40) {
                        nonPuzzleTiles.push(document.getElementById(`tile-${i}`));
                    }
                }
                for (let i = 0; i < 3; i++) {
                    if (nonPuzzleTiles.length > 0) {
                        const randomTile = nonPuzzleTiles.splice(Math.floor(Math.random() * nonPuzzleTiles.length), 1)[0];
                        if (randomTile) {
                             randomTile.textContent = '';
                             randomTile.className = 'w-10 h-10 md:w-11 md:h-11 flex items-center justify-center text-2xl font-bold rounded-lg select-none bg-slate-900/50 border border-slate-800/50';
                             emptyTiles.push(randomTile);
                        }
                    }
                }
                if (emptyTiles.length === 0) return; // Still no space, so we give up for this cycle
            }

            const tile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
            
            // Clean the tile before use
            const newTile = tile.cloneNode(false);
            tile.parentNode.replaceChild(newTile, tile);
            
            let prizePool = prizeEmojis.filter(p => p.type !== 'cash_money');
            
            const prize = prizePool[Math.floor(Math.random() * prizePool.length)];

            newTile.textContent = prize.emoji;
            newTile.dataset.prizeValue = prize.value;
            newTile.dataset.prizeType = prize.type;
            newTile.classList.add('prize-tile');
            if (prize.type === 'game_over') newTile.classList.add('red-bomb');
            else if (prize.type === 'green_bomb') {
                newTile.classList.add('green-bomb');
                newTile.draggable = true;
                addDragListeners(newTile);
            }
            else if (prize.type === 'fire_column') newTile.classList.add('fire-bomb');
            
            const clickHandler = () => {
                GJACKVARNUM = 0;
                timeSinceLastSolve = 0;
                
                // Immediately clear the despawn timer
                clearTimeout(despawnTimer);

                if (newTile.dataset.prizeType === 'game_over') { 
                    endGame(true); 
                } 
                else if (newTile.dataset.prizeType === 'diamond') { startDiamondSequence(newTile); } 
                else if (newTile.dataset.prizeType === 'green_bomb') { startGreenBombSequence(newTile); }
                else if (newTile.dataset.prizeType === 'fire_column') { startFireColumnSequence(newTile); }
                else if (newTile.dataset.prizeType === 'freeze') { startFreezeSequence(); }
                else if (newTile.dataset.prizeType === 'lightning') {
                    coins = 0;
                    coins += parseInt(newTile.dataset.prizeValue);
                    updateScoreDisplay();
                    flashBagsPanel();
                    triggerCoinAnimation(newTile, document.getElementById('coins-display'));
                }
                else {
                    coins += parseInt(newTile.dataset.prizeValue);
                    updateScoreDisplay();
                    flashScore('gain');
                    triggerCoinAnimation(newTile, document.getElementById('coins-display'));
                    if (newTile.dataset.prizeType === 'trophy' && !trophyCollectedThisLevel) {
                        trophyCollectedThisLevel = true;
                        updateGreedPanelWithTrophy();
                        showEventText("Oh Yeah!");
                    }
                }
                // Clean up the tile after processing, unless it's a dragged bomb
                if (newTile.dataset.prizeType !== 'green_bomb' || !isDraggingBomb) {
                    newTile.textContent = '';
                    newTile.className = 'w-10 h-10 md:w-11 md:h-11 flex items-center justify-center text-2xl font-bold rounded-lg select-none bg-slate-900/50 border border-slate-800/50';
                }
            };

            const despawnTimer = setTimeout(() => {
                newTile.textContent = '';
                newTile.className = 'w-10 h-10 md:w-11 md:h-11 flex items-center justify-center text-2xl font-bold rounded-lg select-none bg-slate-900/50 border border-slate-800/50';
                newTile.removeEventListener('click', clickHandler);
            }, 5000);

            newTile.addEventListener('click', clickHandler, { once: true });
        }

        function spawnSpecialCashEmoji() {
             if (isGamePaused || isGameOver || isFrozen) return;
            const allPuzzleIndices = puzzles.flatMap(p => p.indices);
            const emptyTiles = [];
            for(let i=0; i<81; i++) {
                if (!allPuzzleIndices.includes(i) && i !== 40) {
                    const tile = document.getElementById(`tile-${i}`);
                    if (!tile.textContent) emptyTiles.push(tile);
                }
            }
            if (emptyTiles.length === 0) return;
            const tile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
            const prize = prizeEmojis.find(p => p.type === 'cash_money');
            tile.textContent = prize.emoji;
            tile.dataset.prizeValue = prize.value;
            tile.dataset.prizeType = prize.type;
            tile.classList.add('prize-tile', 'cash-money-prize');
            
            const clickHandler = () => {
                GJACKVARNUM = 0;
                coins += parseInt(tile.dataset.prizeValue);
                updateScoreDisplay();
                flashScore('gain');
                showEventText('💰 1,000,000 💰', true);
                tile.textContent = '';
                tile.classList.remove('prize-tile', 'cash-money-prize');
            };
            tile.addEventListener('click', clickHandler, { once: true });
        }

        function spawnImp() {
            if (isGamePaused || isGameOver || isFrozen) return;
            const allPuzzleIndices = puzzles.flatMap(p => p.indices);
            const emptyTiles = [];
            for(let i=0; i<81; i++) {
                if (!allPuzzleIndices.includes(i) && i !== 40) {
                    const tile = document.getElementById(`tile-${i}`);
                    if (!tile.textContent) emptyTiles.push(tile);
                }
            }
            if (emptyTiles.length === 0) return;
            const tile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
            tile.innerHTML = `<div class="w-full h-full flex items-center justify-center prize-tile red-bomb">😈</div>`;
            const impElement = tile.firstChild;

            const clickHandler = () => {
                GJACKVARNUM = 0;
                coins = 0;
                updateScoreDisplay();
                showEventText("Ha ha!");
                tile.innerHTML = '';
                tile.classList.remove('prize-tile', 'red-bomb');
                clearTimeout(despawnTimer);
            };

            const despawnTimer = setTimeout(() => {
                tile.innerHTML = '';
                tile.classList.remove('prize-tile', 'red-bomb');
                impElement.removeEventListener('click', clickHandler, { once: true });
            }, 10000);
            impElement.addEventListener('click', clickHandler, { once: true });
        }

        function updateGreedPanelWithTrophy() {
            const iconsContainer = document.getElementById('greed-icons-container');
            const trophyElement = document.createElement('div');
            trophyElement.classList.add('greed-icon');
            trophyElement.textContent = '🏆';
            trophyElement.addEventListener('click', () => {
                showEventText("You're so greedy!");
            });
            iconsContainer.appendChild(trophyElement);
        }
        
        function updateGreedPanelWithDiamond() {
            if (diamondCollectedThisLevel) return;
            diamondCollectedThisLevel = true;
            const iconsContainer = document.getElementById('greed-icons-container');
            const diamondElement = document.createElement('div');
            diamondElement.classList.add('greed-icon');
            diamondElement.textContent = '💎';
            diamondElement.addEventListener('click', () => {
                showEventText("Diamonds, oh yeah!");
            });
            iconsContainer.appendChild(diamondElement);
        }

        function showEventText(text, greenGlow = false, longFlash = false) {
            if (isGamePaused && !longFlash) return;
            const eventTextContainer = document.getElementById('event-text-container');
            const eventText = document.getElementById('event-text');
            eventText.innerHTML = text;
            eventText.classList.toggle('green-glow', greenGlow);
            eventText.classList.toggle('long-flash', longFlash);
            
            eventTextContainer.classList.remove('hidden');
            const duration = longFlash ? 4000 : 2000;
            setTimeout(() => {
                eventTextContainer.classList.add('hidden');
                eventText.classList.remove('green-glow', 'long-flash');
            }, duration);
        }

        function startDiamondSequence(clickedTile) {
            isSpecialAnimationActive = true;
            coins += currentDiamondValue;
            updateScoreDisplay();
            flashScore('gain');
            showEventText("Diamonds, oh yeah!");
            currentDiamondValue = Math.floor(currentDiamondValue / 2);
            updateGreedPanelWithDiamond();

            document.querySelectorAll('.prize-tile').forEach(t => {
                if (t !== clickedTile) { 
                    t.textContent = ''; 
                    t.className = 'w-10 h-10 md:w-11 md:h-11 flex items-center justify-center text-2xl font-bold rounded-lg select-none bg-slate-900/50 border border-slate-800/50';
                }
            });

            const allPuzzleIndices = puzzles.flatMap(p => p.indices);
            const diamondTiles = [];
            for(let i=0; i<81; i++) {
                if (!allPuzzleIndices.includes(i) && i !== 40) {
                    const tile = document.getElementById(`tile-${i}`);
                    if(tile) {
                        tile.textContent = '💎';
                        tile.classList.add('temp-diamond');
                        diamondTiles.push(tile);
                    }
                }
            }

            diamondSequenceTimeout = setTimeout(() => {
                triggerVortexAnimation(diamondTiles);
            }, 2000);
        }

        function triggerVortexAnimation(diamondTiles) {
            const vortexCenterEl = document.getElementById('jackpot-square');
            if (!vortexCenterEl) return;
            const vortexCenter = vortexCenterEl.getBoundingClientRect();
            const endX = vortexCenter.left + vortexCenter.width / 2;
            const endY = vortexCenter.top + vortexCenter.height / 2;

            diamondTiles.forEach(tile => {
                if (!tile || !document.body.contains(tile)) return;
                const startRect = tile.getBoundingClientRect();
                const startX = startRect.left;
                const startY = startRect.top;

                const flyingDiamond = document.createElement('div');
                flyingDiamond.textContent = '💎';
                flyingDiamond.classList.add('temp-diamond');
                flyingDiamond.style.position = 'absolute';
                flyingDiamond.style.left = `${startX}px`;
                flyingDiamond.style.top = `${startY}px`;
                flyingDiamond.style.zIndex = '200';
                flyingDiamond.style.setProperty('--start-x', `0px`);
                flyingDiamond.style.setProperty('--start-y', `0px`);
                flyingDiamond.style.setProperty('--end-x', `${endX - startX}px`);
                flyingDiamond.style.setProperty('--end-y', `${endY - startY}px`);
                flyingDiamond.style.animation = `diamond-vortex 1s ease-in forwards`;
                document.body.appendChild(flyingDiamond);

                tile.textContent = '';
                tile.className = 'w-10 h-10 md:w-11 md:h-11 flex items-center justify-center text-2xl font-bold rounded-lg select-none bg-slate-900/50 border border-slate-800/50';
                setTimeout(() => { flyingDiamond.remove(); }, 1000);
            });

            setTimeout(() => {
                 isSpecialAnimationActive = false;
                 scheduleNextPrizeSpawn();
            }, 1500);
        }
        
        function getAdjacentIndices(index) {
            const indices = [];
            const row = Math.floor(index / 9);
            const col = index % 9;
            for (let r = -1; r <= 1; r++) {
                for (let c = -1; c <= 1; c++) {
                    const newRow = row + r;
                    const newCol = col + c;
                    if (newRow >= 0 && newRow < 9 && newCol >= 0 && newCol < 9) {
                        indices.push(newRow * 9 + newCol);
                    }
                }
            }
            return indices;
        }

        function startGreenBombSequence(bombTile) {
            playerData.greenBombsUsed++; // Increment badge counter
            const bombIndex = parseInt(bombTile.id.split('-')[1]);
            const adjacentIndices = getAdjacentIndices(bombIndex);
            
            adjacentIndices.forEach(index => {
                const adjTile = document.getElementById(`tile-${index}`);
                if (adjTile) {
                    if (adjTile.classList.contains('prize-tile')) {
                        const prizeValue = parseInt(adjTile.dataset.prizeValue) || 0;
                        if (prizeValue > 0) {
                            coins += prizeValue;
                            triggerCoinAnimation(adjTile, document.getElementById('coins-display'));
                        }
                        if (adjTile.classList.contains('cash-money-prize')) {
                            const goodieEmoji = adjTile.textContent;
                            if (!playerData.nonsenseFreebiesCollected[goodieEmoji]) {
                                playerData.nonsenseFreebiesCollected[goodieEmoji] = 0;
                            }
                            playerData.nonsenseFreebiesCollected[goodieEmoji]++;
                        }
                        adjTile.textContent = '';
                        adjTile.className = 'w-10 h-10 md:w-11 md:h-11 flex items-center justify-center text-2xl font-bold rounded-lg select-none bg-slate-900/50 border border-slate-800/50';
                    } else if (adjTile.classList.contains('word-puzzle-tile') && !adjTile.classList.contains('solved')) {
                        const puzzleIndex = parseInt(adjTile.dataset.puzzleIndex);
                        const puzzle = puzzles[puzzleIndex];
                        const letterIndex = puzzle.indices.indexOf(index);
                        const correctLetter = puzzle.word[letterIndex];
                        
                        for (const i of puzzle.indices) {
                            const sourceTile = document.getElementById(`tile-${i}`);
                            if (sourceTile && sourceTile.textContent === correctLetter) {
                                const tempText = adjTile.textContent;
                                adjTile.textContent = sourceTile.textContent;
                                sourceTile.textContent = tempText;
                                break;
                            }
                        }
                        coins += 1;
                        triggerBigCoinAnimation(adjTile, document.getElementById('coins-display'));
                    }
                }
            });
            setTimeout(() => {
                updateScoreDisplay();
                checkAllPuzzles();
                savePlayerProfile(); // Save after using the bomb
            }, 100);
        }

        function startFireColumnSequence(fireTile) {
            const fireIndex = parseInt(fireTile.id.split('-')[1]);
            const column = fireIndex % 9;
            let collectedFromColumn = 0;

            for (let i = column; i < 81; i += 9) {
                const tileInColumn = document.getElementById(`tile-${i}`);
                if (tileInColumn && tileInColumn !== fireTile) { 
                    if (tileInColumn.classList.contains('prize-tile')) {
                        const prizeValue = parseInt(tileInColumn.dataset.prizeValue) || 0;
                        if (prizeValue > 0) {
                            collectedFromColumn += prizeValue;
                            triggerCoinAnimation(tileInColumn, document.getElementById('coins-display'));
                        }
                        tileInColumn.textContent = '';
                        tileInColumn.className = 'w-10 h-10 md:w-11 md:h-11 flex items-center justify-center text-2xl font-bold rounded-lg select-none bg-slate-900/50 border border-slate-800/50';

                    } else if (tileInColumn.classList.contains('word-puzzle-tile') && !tileInColumn.classList.contains('solved')) {
                        const puzzleIndex = parseInt(tileInColumn.dataset.puzzleIndex);
                        const puzzle = puzzles[puzzleIndex];
                        const letterIndex = puzzle.indices.indexOf(i);
                        const correctLetter = puzzle.word[letterIndex];
                        
                        if (tileInColumn.textContent !== correctLetter) {
                            for (const sourceIndex of puzzle.indices) {
                                const sourceTile = document.getElementById(`tile-${sourceIndex}`);
                                if (sourceTile && sourceTile.textContent === correctLetter) {
                                    const tempText = tileInColumn.textContent;
                                    tileInColumn.textContent = sourceTile.textContent;
                                    sourceTile.textContent = tempText;
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            const fireBombValue = parseInt(fireTile.dataset.prizeValue) || 400;
            coins += fireBombValue + collectedFromColumn;
            
            updateScoreDisplay();
            flashScore('gain');
            checkAllPuzzles();
        }

        function endGame(isBomb = false) {
            isGameOver = true;
            const jackpotSquare = document.getElementById('jackpot-square');
            if (jackpotSquare) {
                jackpotSquare.classList.remove('endgame-pulse');
            }
            saveGameResult(); // This now increments gamesPlayed
            checkAndAwardBadges(coins); // Check for new badges at the end of the game
            clearInterval(mainTimerInterval);
            clearTimeout(prizeSpawnerTimeout);
            clearTimeout(diamondSequenceTimeout);
            clearInterval(scoreDecayInterval);
            clearTimeout(impTimeout);
            endFreeze(); // Ensure freeze effect is cleared
            endHeartAnimation(); // Ensure heart effect is cleared
            clearInterval(solveButtonPulseManager);
            timeRemaining = 0;
            document.getElementById('timer-display').textContent = "00:00";
            triggerSwirlAnimation();
            setTimeout(showGameOverModal, 1500);
        }

        function triggerSwirlAnimation() {
            const elementsToSwirl = document.querySelectorAll('#game-grid > div');
            const vortexCenterEl = document.getElementById('jackpot-square');
            if (!vortexCenterEl) return;
            const vortexCenter = vortexCenterEl.getBoundingClientRect();
            const endX = vortexCenter.left + vortexCenter.width / 2;
            const endY = vortexCenter.top + vortexCenter.height / 2;

            elementsToSwirl.forEach(el => {
                if (el.textContent) {
                    const startRect = el.getBoundingClientRect();
                    const startX = startRect.left;
                    const startY = startRect.top;
                    const flyingEl = el.cloneNode(true);
                    flyingEl.style.position = 'absolute';
                    flyingEl.style.left = `${startX}px`;
                    flyingEl.style.top = `${startY}px`;
                    flyingEl.style.zIndex = '200';
                    flyingEl.style.margin = '0';
                    flyingEl.style.setProperty('--start-x', `0px`);
                    flyingEl.style.setProperty('--start-y', `0px`);
                    flyingEl.style.setProperty('--end-x', `${endX - startX}px`);
                    flyingEl.style.setProperty('--end-y', `${endY - startY}px`);
                    flyingEl.style.animation = `game-over-swirl 1.5s ease-in forwards`;
                    document.body.appendChild(flyingEl);
                    el.textContent = '';
                    el.className = 'w-10 h-10 md:w-11 md:h-11 flex items-center justify-center text-2xl font-bold rounded-lg select-none bg-slate-900/50 border border-slate-800/50';
                }
            });
        }

        function showGameOverModal() {
            document.getElementById('final-coins-display').textContent = coins.toLocaleString();
            document.getElementById('final-bags-display').textContent = bagsOfMoney.toLocaleString();
            const gameOverModal = document.getElementById('game-over-modal');
            gameOverModal.classList.remove('hidden');

            const animationContainer = document.body;

            gameOverAnimationInterval = setInterval(() => { 
                const animations = ['🪙', '❄️', '❤️'];
                const animationChar = animations[Math.floor(Math.random() * animations.length)];
                
                const el = document.createElement('div');
                el.textContent = animationChar;
                el.style.left = `${Math.random() * 100}%`;
                el.style.animationDuration = `${Math.random() * 2 + 3}s`;
                el.style.fontSize = `${Math.random() * 1 + 0.5}rem`;
                el.style.position = 'fixed';
                el.style.top = '-5%';
                el.style.zIndex = '100';

                if (animationChar === '🪙') el.classList.add('falling-coin');
                else if (animationChar === '❄️') el.classList.add('falling-snowflake');
                else if (animationChar === '❤️') el.classList.add('falling-heart');

                animationContainer.appendChild(el);
                setTimeout(() => el.remove(), 5000);

            }, 200);
        }
        
        function pauseGame() {
            isGamePaused = true;
            clearInterval(mainTimerInterval);
            clearTimeout(prizeSpawnerTimeout);
            clearInterval(scoreDecayInterval);
            clearTimeout(impTimeout);
            document.querySelectorAll('.ice-block').forEach(block => block.style.display = 'none');
        }

        function resumeGame() {
            if (isGameOver) return;
            isGamePaused = false;
            mainTimerInterval = setInterval(updateTimer, 1000);
            if (!isFrozen) {
                scheduleNextPrizeSpawn();
            }
            scoreDecayInterval = setInterval(handleScoreDecay, 1000);
            if (isFrozen) {
                document.querySelectorAll('.ice-block').forEach(block => block.style.display = 'block');
            }
        }

        function handleScoreDecay() {
            if (isGamePaused || isGameOver) return;
            if (timeSinceLastSolve > 20) {
                const decayAmount = Math.floor(Math.pow(timeSinceLastSolve - 19, 1.5) * 10);
                coins -= decayAmount;
                if (coins < 0) coins = 0;
                updateScoreDisplay();
                document.getElementById('coins-display').classList.add('score-decay');
            } else {
                document.getElementById('coins-display').classList.remove('score-decay');
            }
        }

        function startFreezeSequence() {
            isFrozen = true;
            clearTimeout(prizeSpawnerTimeout);
            clearTimeout(impTimeout);
            
            // Clear any existing freeze animation before starting a new one
            clearInterval(freezeAnimationInterval);

            freezeAnimationInterval = setInterval(() => {
                const snowflake = document.createElement('div');
                snowflake.classList.add('falling-snowflake');
                snowflake.textContent = '❄️';
                snowflake.style.left = `${Math.random() * 100}%`;
                snowflake.style.animationDuration = `${Math.random() * 3 + 4}s`;
                snowflake.style.fontSize = `${Math.random() * 1 + 0.75}rem`;
                document.body.appendChild(snowflake);
                setTimeout(() => snowflake.remove(), 7000);
            }, 200);

            const frozenTiles = [];
            document.querySelectorAll('#game-grid > div:not(.word-puzzle-tile)').forEach(tile => {
                const rect = tile.getBoundingClientRect();
                const iceBlock = document.createElement('div');
                iceBlock.className = 'ice-block';
                iceBlock.style.width = `${rect.width}px`;
                iceBlock.style.height = `${rect.height}px`;
                iceBlock.style.left = `${rect.left}px`;
                iceBlock.style.top = `${rect.top}px`;
                document.body.appendChild(iceBlock);
                frozenTiles.push(iceBlock);
            });

            thawTimeout = setTimeout(() => {
                const thawDuration = 15000;
                if (frozenTiles.length === 0) {
                    endFreeze();
                    return;
                }
                const thawIntervalTime = thawDuration / frozenTiles.length;
                
                function thawNext() {
                    if (frozenTiles.length > 0) {
                        const tileToThaw = frozenTiles.shift();
                        if (tileToThaw) {
                            tileToThaw.remove();
                        }
                        setTimeout(thawNext, thawIntervalTime);
                    } else {
                        endFreeze();
                    }
                }
                thawNext();
            }, 15000);
        }

        function endFreeze() {
            clearInterval(freezeAnimationInterval);
            freezeAnimationInterval = null;
            clearTimeout(thawTimeout);
            isFrozen = false;
            document.querySelectorAll('.ice-block').forEach(block => block.remove());
            if (!isGamePaused && !isGameOver) {
                setTimeout(() => scheduleNextPrizeSpawn(), 500);
            }
        }
        
        function spawnHeartAnimation() {
            if (heartAnimationInterval) return; // Don't start if already running
            heartAnimationInterval = setInterval(() => {
                const heart = document.createElement('div');
                heart.classList.add('falling-heart');
                heart.textContent = '❤️';
                heart.style.left = `${Math.random() * 100}%`;
                heart.style.animationDuration = `${Math.random() * 4 + 5}s`;
                heart.style.fontSize = `${Math.random() * 1 + 0.75}rem`;
                document.body.appendChild(heart);
                setTimeout(() => heart.remove(), 9000);
            }, 500);
            setTimeout(endHeartAnimation, 8000); // Let it run for 8 seconds
        }

        function endHeartAnimation() {
            clearInterval(heartAnimationInterval);
            heartAnimationInterval = null;
        }

        function startGame() {
            musicPlayer.muted = true;
            playTrack(currentTrackIndex);
            musicPlayer.play().catch(e => console.error("Audio play failed on initial click:", e));

            const todayStr = new Date().toISOString().split('T')[0];
            if (playerData.lastLoginDate !== todayStr) {
                showWelcomeBonus();
            } else {
                actuallyStartGame();
            }
        }

        function actuallyStartGame() {
            musicPlayer.muted = false;
            musicPlayer.volume = lastVolume;
            document.getElementById('volume-slider').value = lastVolume;
            updateVolumeIcon(lastVolume);
            
            document.getElementById('start-modal').classList.add('hidden');
            document.getElementById('game-container').classList.remove('hidden');
            document.getElementById('game-container').classList.add('flex');
            clearInterval(startModalAnimationInterval);
            isGamePaused = false;
            mainTimerInterval = setInterval(updateTimer, 1000);
            scoreDecayInterval = setInterval(handleScoreDecay, 1000);
            scheduleNextPrizeSpawn();
            clearInterval(solveButtonPulseManager); 
            solveButtonPulseManager = setInterval(() => {
                if (isGamePaused || isGameOver) return;
                const solveButton = document.getElementById('solve-button');
                const unsolvedPuzzles = puzzles.filter(p => !p.solved);
                if (unsolvedPuzzles.length > 0 && timeSinceLastSolve >= 30) {
                    solveButton.classList.add('big-pulse');
                    setTimeout(() => {
                        solveButton.classList.remove('big-pulse');
                    }, 10000);
                    timeSinceLastSolve = 0;
                }
            }, 1000);
        }

        function restartGame() {
            clearInterval(gameOverAnimationInterval);
            gameOverAnimationInterval = null;
            document.getElementById('game-over-modal').classList.add('hidden');
            coins = 0;
            bagsOfMoney = 0;
            currentLevel = 1;
            timeRemaining = totalGameTime;
            isGameOver = false;
            isGamePaused = false;
            trophyCollectedThisLevel = false;
            diamondCollectedThisLevel = false;
            currentDiamondValue = 20000000;
            solveButtonClicks = 0;
            solveButtonCooldown = 0;
            timeSinceLastSolve = 0;
            isFrozen = false;
            jackpotEventAvailable = true;
            specialCashEmojiSpawned = false;
            timedEvents = { sixMin: true, threeMin: true, heartEvent1: true, heartEvent2: true };
            isSpecialAnimationActive = false; // BUG FIX: Reset this state on restart
            endgameJackpotActive = false;
            
            clearInterval(mainTimerInterval);
            clearTimeout(prizeSpawnerTimeout);
            clearTimeout(diamondSequenceTimeout);
            clearInterval(solveButtonTimerInterval);
            clearInterval(scoreDecayInterval);
            clearTimeout(impTimeout);
            clearTimeout(thawTimeout);
            clearInterval(solveButtonPulseManager);
            endFreeze();
            endHeartAnimation();

            levelGoodies = [...nonsenseFreebies];
            document.getElementById('timer-display').textContent = "10:00";
            const solveButton = document.getElementById('solve-button');
            solveButton.textContent = '✅';
            solveButton.classList.remove('cooldown-timer', 'big-pulse');
            solveButton.classList.add('text-3xl');
            solveButton.disabled = false;
            updateScoreDisplay();
            startLevel(); 
            mainTimerInterval = setInterval(updateTimer, 1000);
            scoreDecayInterval = setInterval(handleScoreDecay, 1000);
            scheduleNextPrizeSpawn();
            
            solveButtonPulseManager = setInterval(() => {
                if (isGamePaused || isGameOver) return;
                const solveButton = document.getElementById('solve-button');
                const unsolvedPuzzles = puzzles.filter(p => !p.solved);
                if (unsolvedPuzzles.length > 0 && timeSinceLastSolve >= 30) {
                    solveButton.classList.add('big-pulse');
                    setTimeout(() => {
                        solveButton.classList.remove('big-pulse');
                    }, 10000);
                    timeSinceLastSolve = 0;
                }
            }, 1000);
        }

        function playNextTrack() {
            if (userPlaylist.length === 0) return;
            const nextIndex = (currentTrackIndex + 1) % userPlaylist.length;
            playTrack(nextIndex);
        }

        function playPreviousTrack() {
            if (userPlaylist.length === 0) return;
            const prevIndex = (currentTrackIndex - 1 + userPlaylist.length) % userPlaylist.length;
            playTrack(prevIndex);
        }

        function playTrack(index) {
            if (userPlaylist.length === 0 || index < 0 || index >= userPlaylist.length) return;
            currentTrackIndex = index;
            const trackName = userPlaylist[currentTrackIndex];
            musicPlayer.src = musicBaseURL + trackName;
            
            const playPromise = musicPlayer.play();

            if (playPromise !== undefined) {
                playPromise.then(_ => {
                    updateNowPlayingIndicator();
                }).catch(error => {
                    if (error.name !== 'AbortError') {
                         console.error("Audio play failed for " + trackName + ":", error);
                    }
                });
            }
        }
        
        function setupAudioControls() {
            const volumeSlider = document.getElementById('volume-slider');
            const volumeToggleButton = document.getElementById('volume-toggle-button');
            const playlistPlayPauseBtn = document.getElementById('playlist-play-pause');
            const playlistNextBtn = document.getElementById('playlist-next');
            const playlistPrevBtn = document.getElementById('playlist-prev');
            const playlistShuffleBtn = document.getElementById('playlist-shuffle');

            volumeSlider.value = lastVolume;
            updateVolumeIcon(musicPlayer.volume);

            volumeSlider.addEventListener('input', (e) => {
                const newVolume = parseFloat(e.target.value);
                musicPlayer.volume = newVolume;
                updateVolumeIcon(newVolume);
                if (newVolume > 0) {
                    lastVolume = newVolume;
                }
            });

            volumeToggleButton.addEventListener('click', () => {
                if (musicPlayer.volume > 0) {
                    musicPlayer.volume = 0;
                    volumeSlider.value = 0;
                    updateVolumeIcon(0);
                } else {
                    musicPlayer.volume = lastVolume;
                    volumeSlider.value = lastVolume;
                    updateVolumeIcon(lastVolume);
                }
            });

            playlistPlayPauseBtn.addEventListener('click', () => {
                if (musicPlayer.paused) {
                    musicPlayer.play();
                } else {
                    musicPlayer.pause();
                }
            });
            playlistNextBtn.addEventListener('click', playNextTrack);
            playlistPrevBtn.addEventListener('click', playPreviousTrack);
            playlistShuffleBtn.addEventListener('click', toggleShuffle);

            musicPlayer.addEventListener('play', updatePlayPauseIcon);
            musicPlayer.addEventListener('pause', updatePlayPauseIcon);

            updatePlayPauseIcon();
        }

        function updatePlayPauseIcon() {
            const playlistPlayPauseBtn = document.getElementById('playlist-play-pause');
            if (musicPlayer.paused) {
                playlistPlayPauseBtn.innerHTML = `<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path></svg>`;
            } else {
                playlistPlayPauseBtn.innerHTML = `<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M5.75 4.5a.75.75 0 00-.75.75v10.5a.75.75 0 001.5 0V5.25a.75.75 0 00-.75-.75zM14.25 4.5a.75.75 0 00-.75.75v10.5a.75.75 0 001.5 0V5.25a.75.75 0 00-.75-.75z"></path></svg>`;
            }
        }

        function toggleShuffle() {
            isShuffled = !isShuffled;
            document.getElementById('playlist-shuffle').classList.toggle('shuffle-active', isShuffled);
            
            if (isShuffled) {
                const currentTrackFilename = userPlaylist[currentTrackIndex];
                for (let i = userPlaylist.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [userPlaylist[i], userPlaylist[j]] = [userPlaylist[j], userPlaylist[i]];
                }
                currentTrackIndex = userPlaylist.findIndex(filename => filename === currentTrackFilename);
            } else {
                const currentTrackFilename = userPlaylist[currentTrackIndex];
                userPlaylist = [...originalUserPlaylist];
                currentTrackIndex = userPlaylist.findIndex(filename => filename === currentTrackFilename);
            }
            updateNowPlayingIndicator();
        }

        function updateVolumeIcon(volume) {
            const volumeToggleButton = document.getElementById('volume-toggle-button');
            const favicon = document.getElementById('favicon');
            
            if (volume === 0) {
                volumeToggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
                favicon.href = mutedIconHref;
            } else {
                 volumeToggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
                 favicon.href = speakerIconHref;
            }
        }

        function updateNowPlayingIndicator() {
            document.querySelectorAll('.playlist-item').forEach((item) => {
                item.classList.remove('now-playing');
                const trackTitle = item.querySelector('.song-title').textContent;
                const currentTrackTitle = songDatabase.find(t => t.filename === userPlaylist[currentTrackIndex])?.title;
                if (trackTitle === currentTrackTitle) {
                    item.classList.add('now-playing');
                }
            });
        }

        function populatePlaylistModal() {
            const container = document.getElementById('playlist-container');
            container.innerHTML = '';
            verifiedPlaylist.forEach(track => {
                const item = document.createElement('div');
                item.className = 'playlist-item';
                item.innerHTML = `
                    <span class="song-title">${track.title}</span>
                    <span class="now-playing-indicator">Now Playing...</span>
                `;
                container.appendChild(item);
                item.addEventListener('click', () => {
                    const trackFilename = track.filename;
                    const playIndex = userPlaylist.findIndex(filename => filename === trackFilename);
                    if (playIndex !== -1) {
                        playTrack(playIndex);
                    }
                });
            });
            updateNowPlayingIndicator();
        }
        
        async function buildVerifiedPlaylist() {
            const checkTrack = async (track) => {
                try {
                    const response = await fetch(musicBaseURL + track.filename, { method: 'HEAD' });
                    return response.ok;
                } catch (error) {
                    console.error("Network error checking track:", track.filename, error);
                    return false;
                }
            };
            const checks = songDatabase.map(track => checkTrack(track));
            const results = await Promise.all(checks);
            verifiedPlaylist = songDatabase.filter((_, index) => results[index]);
            userPlaylist = verifiedPlaylist.map(track => track.filename);
            originalUserPlaylist = [...userPlaylist];
        }
        
        // --- Player Data & Store Logic (LocalStorage with Firebase Sync) ---
        function getDefaultPlayerData() {
            return {
                userId: userId || 'local', // Use 'local' if no userId yet
                name: 'Player',
                moneyBags: 0,
                highScore: 0,
                unlockedSkins: ['default'],
                activeSkin: 'default',
                lastLoginDate: null,
                lastDailyClaim: null,
                claimedDays: [],
                nonsenseFreebiesCollected: {},
                inventory: {},
                unlockedBadges: [],
                gamesPlayed: 0,
                greenBombsUsed: 0,
            };
        }

        function loadPlayerFromLocalStorage() {
            const savedData = localStorage.getItem('wordGreedPlayerData');
            if (savedData) {
                playerData = { ...getDefaultPlayerData(), ...JSON.parse(savedData) };
                 if (!playerData.unlockedBadges) playerData.unlockedBadges = [];
                 if (!playerData.gamesPlayed) playerData.gamesPlayed = 0;
                 if (!playerData.greenBombsUsed) playerData.greenBombsUsed = 0;
            } else {
                playerData = getDefaultPlayerData();
            }
            applyTheme(playerData.activeSkin);
            populateSetupModal();
            displayBadges(); // Display badges on load
        }
        
        async function syncWithFirebase() {
            if (!isFirebaseConnected || !userId) return;

            const playerDocRef = doc(db, "players", userId);
            try {
                const docSnap = await getDoc(playerDocRef);
                if (docSnap.exists()) {
                    const cloudData = docSnap.data();
                    // Simple merge: cloud data takes precedence for scores and bags
                    playerData.highScore = Math.max(playerData.highScore || 0, cloudData.highScore || 0);
                    playerData.moneyBags = Math.max(playerData.moneyBags || 0, cloudData.moneyBags || 0);
                    playerData.gamesPlayed = Math.max(playerData.gamesPlayed || 0, cloudData.gamesPlayed || 0);
                    playerData.greenBombsUsed = Math.max(playerData.greenBombsUsed || 0, cloudData.greenBombsUsed || 0);
                    // Merge badges
                    const localBadges = new Set(playerData.unlockedBadges || []);
                    const cloudBadges = new Set(cloudData.unlockedBadges || []);
                    playerData.unlockedBadges = Array.from(new Set([...localBadges, ...cloudBadges]));
                    
                    console.log("Player data synced with Firebase.");
                }
                // Always save the latest (potentially merged) data back to Firebase
                await savePlayerProfile();
                displayBadges(); // Re-display badges after sync
            } catch (error) {
                console.error("Error syncing with Firestore:", error);
            }
        }

        async function savePlayerProfile() {
            localStorage.setItem('wordGreedPlayerData', JSON.stringify(playerData));
            if (isFirebaseConnected && userId) {
                const playerDocRef = doc(db, "players", userId);
                try {
                    const dataToSave = JSON.parse(JSON.stringify(playerData));
                    await setDoc(playerDocRef, dataToSave, { merge: true });
                } catch (error) {
                    console.error("Error saving player profile to Firestore:", error);
                }
            }
        }

        // --- Trading Post & Riches Logic ---
        function canAffordAnyTrade() {
            return trades.some(trade => {
                const costItem = Object.keys(trade.cost)[0];
                const costAmount = trade.cost[costItem];
                const playerAmount = playerData.nonsenseFreebiesCollected[costItem] || 0;
                return playerAmount >= costAmount;
            });
        }

        function updateTradeButtonPulse() {
            const tradeButton = document.getElementById('trade-goodies-button');
            if (tradeButton) {
                if (canAffordAnyTrade()) {
                    tradeButton.classList.add('trade-button-pulse');
                } else {
                    tradeButton.classList.remove('trade-button-pulse');
                }
            }
        }

        function openTradingPost() {
            document.getElementById('setup-modal').classList.add('hidden');
            populateTradingPost();
            document.getElementById('trading-post-modal').classList.remove('hidden');
        }

        function populateTradingPost() {
            const container = document.getElementById('available-trades-container');
            container.innerHTML = '';
            selectedTrade = null;
            updateTradePreview();
            document.getElementById('execute-trade-button').disabled = true;

            trades.forEach(trade => {
                const costItem = Object.keys(trade.cost)[0];
                const costAmount = trade.cost[costItem];
                const playerAmount = playerData.nonsenseFreebiesCollected[costItem] || 0;

                if (playerAmount >= costAmount) {
                    const item = document.createElement('div');
                    item.className = 'trade-item p-4 rounded-lg text-center cursor-pointer';
                    const rewardItem = trade.reward.item || (trade.reward.type === 'bags' ? '💰' : '🪙');
                    item.innerHTML = `
                        <div class="text-2xl">${costItem} ➜ ${rewardItem}</div>
                        <div class="text-sm font-bold">${trade.name}</div>
                    `;
                    item.addEventListener('click', () => {
                        document.querySelectorAll('.trade-item').forEach(el => el.classList.remove('selected'));
                        item.classList.add('selected');
                        selectedTrade = trade;
                        updateTradePreview();
                        document.getElementById('execute-trade-button').disabled = false;
                    });
                    container.appendChild(item);
                }
            });
        }

        function updateTradePreview() {
            const emojiEl = document.getElementById('trade-preview-emoji');
            const nameEl = document.getElementById('trade-preview-name');
            if (selectedTrade) {
                const rewardItem = selectedTrade.reward.item || (selectedTrade.reward.type === 'bags' ? '💰' : '🪙');
                const rewardName = selectedTrade.name.split(' for ')[1];
                emojiEl.textContent = rewardItem;
                nameEl.textContent = `Get: ${rewardName}`;
            } else {
                emojiEl.textContent = '❔';
                nameEl.textContent = 'Select a Trade';
            }
        }

        function executeTrade() {
            if (!selectedTrade) return;

            const costItem = Object.keys(selectedTrade.cost)[0];
            const costAmount = selectedTrade.cost[costItem];
            const playerAmount = playerData.nonsenseFreebiesCollected[costItem] || 0;

            if (playerAmount >= costAmount) {
                playerData.nonsenseFreebiesCollected[costItem] -= costAmount;

                if (selectedTrade.reward.type === 'bags') {
                    playerData.moneyBags += selectedTrade.reward.amount;
                } else if (selectedTrade.reward.type === 'coins') {
                    coins += selectedTrade.reward.amount;
                    updateScoreDisplay();
                } else if (selectedTrade.reward.type === 'inventory') {
                    const rewardItem = selectedTrade.reward.item;
                    playerData.inventory[rewardItem] = (playerData.inventory[rewardItem] || 0) + selectedTrade.reward.amount;
                }

                showEventText("Trade Successful!", true);
                savePlayerProfile();
                populateTradingPost();
                populateSetupModal();
                selectedTrade = null;
                updateTradePreview();
                document.getElementById('execute-trade-button').disabled = true;
            } else {
                showEventText("Not enough items!", false);
            }
        }
        
        function populateRichesModal() {
            const container = document.getElementById('riches-inventory');
            container.innerHTML = '';
            const inventory = playerData.inventory || {};
            const items = Object.keys(inventory);

            if (items.length === 0) {
                container.innerHTML = `<p class="col-span-full text-center text-slate-400">You have no special riches yet. Trade for them at the Trading Post!</p>`;
            } else {
                items.forEach(item => {
                    const count = inventory[item];
                    const name = inventoryItemNames[item] || 'Unknown Item';
                    const itemEl = document.createElement('div');
                    itemEl.className = 'riches-card';
                    itemEl.innerHTML = `
                        <div class="text-5xl">${item}</div>
                        <div class="text-md font-bold mt-2">${name}</div>
                        <div class="text-sm text-slate-300">x${count}</div>
                    `;
                    container.appendChild(itemEl);
                });
            }
            
            const netWorthPanel = document.getElementById('net-worth-panel');
            netWorthPanel.innerHTML = calculateNetWorth();
        }

        function calculateNetWorth() {
            const totalItems = Object.values(playerData.inventory || {}).reduce((a, b) => a + b, 0);
            const uniqueItemTypes = Object.keys(playerData.inventory || {}).length;
            const totalBags = playerData.moneyBags || 0;
            let description = "";

            if (totalItems === 0 && totalBags < 100000) {
                description = "Your financial portfolio consists mainly of pocket lint and a half-hearted IOU. Keep trading!";
            } else if (uniqueItemTypes <= 2 && totalBags < 1000000) {
                description = "You're a specialist! You've clearly cornered the market on... well, *something*. Your cash flow is a respectable trickle, but your focus is admirable.";
            } else if (uniqueItemTypes > 2 && totalBags < 5000000) {
                description = "A diversified portfolio! Your assets are spread wisely across various sectors of the emoji economy. You're officially 'financially intriguing'.";
            } else if (totalItems > 10 && totalBags < 20000000) {
                description = "You've built a small but powerful empire. Your name is whispered in the boardrooms of digital diners and virtual food trucks. Your cash flow is a mighty river.";
            } else if (totalItems > 20 && totalBags >= 20000000) {
                description = "Your net worth requires scientific notation to express. You don't have cash flow; you have a cash tsunami. Your financial advisor is a well-dressed parrot you taught to squawk 'Buy!'.";
            } else {
                description = "Your financial situation is an enigma, wrapped in a riddle, and coated in chocolate. Keep up the good work, whatever it is you're doing!";
            }

            return `<h3 class="text-lg font-bold text-amber-300">Net Worth Analysis</h3><p class="text-slate-300 mt-2">${description}</p>`;
        }
        
        function populateSetupModal() {
            const nameInput = document.getElementById('player-name-input');
            nameInput.value = playerData.name || 'Player';
            nameInput.classList.toggle('invalid-input', !playerData.name?.trim());
            document.getElementById('total-bags-display').textContent = (playerData.moneyBags || 0).toLocaleString();
            document.getElementById('high-score-display').textContent = (playerData.highScore || 0).toLocaleString();
            
            const userIdDisplay = document.getElementById('user-id-display');
            if (userId && isFirebaseConnected) {
                userIdDisplay.textContent = `userId: ${userId}`;
            } else {
                userIdDisplay.textContent = 'Offline Mode';
            }

            populateThemeStore();
            populateNonsenseFreebies();
            updateTradeButtonPulse();
        }

        function populateNonsenseFreebies() {
            const container = document.getElementById('nonsense-freebies-container');
            container.innerHTML = '';
            nonsenseFreebies.forEach(freebie => {
                const count = playerData.nonsenseFreebiesCollected?.[freebie] || 0;
                const item = document.createElement('div');
                item.className = 'freebie-item';
                
                const isTradable = trades.some(trade => {
                    const costItem = Object.keys(trade.cost)[0];
                    const costAmount = trade.cost[costItem];
                    return freebie === costItem && count >= costAmount;
                });

                if (isTradable) {
                    item.classList.add('tradable');
                }

                item.innerHTML = `
                    <div>${freebie}</div>
                    <div class="freebie-count">${count}</div>
                `;
                container.appendChild(item);
            });
        }

        function applyTheme(themeId) {
            document.body.className = 'text-white flex items-center justify-center min-h-screen p-4';
            if (themeId !== 'default') {
                document.body.classList.add(`theme-${themeId}`);
            }
        }

        const themes = [
            { id: 'default', name: 'Purple Haze', cost: 0, colors: ['#a78bfa', '#8b5cf6'] },
            { id: 'blue', name: 'Ocean Blue', cost: 1000000, colors: ['#60a5fa', '#3b82f6'] },
            { id: 'green', name: 'Emerald City', cost: 3000000, colors: ['#4ade80', '#22c55e'] },
            { id: 'red', name: 'Ruby Rush', cost: 5000000, colors: ['#f87171', '#ef4444'] },
            { id: 'christmas', name: 'Christmas', cost: 7000000, colors: ['#dc2626', '#166534'] },
            { id: 'halloween', name: 'Halloween', cost: 9000000, colors: ['#f97316', '#4a044e'] },
            { id: 'winter', name: 'Winter', cost: 11000000, colors: ['#67e8f9', '#0c4a6e'] },
            { id: 'beach', name: 'Beach', cost: 13000000, colors: ['#fde047', '#2dd4bf'] },
            { id: 'grove', name: 'Grove Palms', cost: 15000000, colors: ['#22c55e', '#f59e0b'] },
            { id: 'dark-purple', name: 'Dark Purples', cost: 20000000, colors: ['#5b21b6', '#4c1d95'] },
            { id: 'grayscale', name: 'Grayscale', cost: 25000000, colors: ['#6b7280', '#374151'] },
            { id: 'stage-lights', name: 'Stage Lights', cost: 30000000, colors: ['#ec4899', '#8b5cf6'] },
            { id: 'dark-aqua', name: 'Dark Aqua', cost: 35000000, colors: ['#2dd4bf', '#0d9488'] },
            { id: 'brownstone', name: 'Brownstone', cost: 40000000, colors: ['#a16207', '#854d0e'] }
        ];

        function populateThemeStore() {
            const container = document.getElementById('theme-store-container');
            container.innerHTML = '';
            themes.forEach(theme => {
                const isUnlocked = playerData.unlockedSkins?.includes(theme.id);
                const isActive = playerData.activeSkin === theme.id;
                const item = document.createElement('div');
                item.className = `theme-item p-2 rounded-lg flex flex-col items-center justify-start ${isActive ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`;
                item.style.background = `linear-gradient(145deg, ${theme.colors[0]}, ${theme.colors[1]})`;
                item.dataset.themeId = theme.id;
                
                let costHTML = isUnlocked ? '<span class="text-xs text-green-300">Unlocked</span>' : `<span class="text-xs">💰 ${theme.cost.toLocaleString()}</span>`;
                item.innerHTML = `
                    <div class="w-full text-center pt-2">
                        <span class="font-bold text-sm">${theme.name}</span>
                        ${costHTML}
                    </div>
                `;

                if (isUnlocked) {
                    item.addEventListener('click', () => {
                        playerData.activeSkin = theme.id;
                        applyTheme(theme.id);
                        savePlayerProfile();
                        populateThemeStore();
                    });
                } else {
                    item.addEventListener('click', () => {
                        if (playerData.moneyBags >= theme.cost) {
                            playerData.moneyBags -= theme.cost;
                            playerData.unlockedSkins.push(theme.id);
                            playerData.activeSkin = theme.id;
                            applyTheme(theme.id);
                            savePlayerProfile();
                            populateSetupModal();
                        } else {
                            const needed = theme.cost - playerData.moneyBags;
                            showEventText(`Need ${needed.toLocaleString()} more 💰!`);
                        }
                    });
                }
                container.appendChild(item);
            });
        }

        function showWelcomeBonus() {
            const bonusCoins = Math.floor(Math.random() * 49001) + 1000;
            const bonusBags = Math.floor(Math.random() * 11);
            
            const container = document.getElementById('bonus-rewards-container');
            container.innerHTML = `
                <div class="bonus-item text-center">
                    <div class="text-5xl">🪙</div>
                    <div class="text-xl font-bold">${bonusCoins.toLocaleString()}</div>
                </div>
                <div class="bonus-item text-center" style="animation-delay: 0.2s;">
                    <div class="text-5xl">💰</div>
                    <div class="text-xl font-bold">${bonusBags.toLocaleString()}</div>
                </div>
            `;
            
            for (let i = 0; i < 2; i++) {
                const randomFreebie = nonsenseFreebies[Math.floor(Math.random() * nonsenseFreebies.length)];
                const randomQty = Math.floor(Math.random() * 4) + 1;
                const freebieEl = document.createElement('div');
                freebieEl.className = 'bonus-item text-center';
                freebieEl.style.animationDelay = `${0.4 + i * 0.2}s`;
                freebieEl.innerHTML = `
                    <div class="text-5xl">${randomFreebie}</div>
                    <div class="text-xl font-bold">x${randomQty}</div>
                `;
                container.appendChild(freebieEl);
                playerData.nonsenseFreebiesCollected[randomFreebie] = (playerData.nonsenseFreebiesCollected[randomFreebie] || 0) + randomQty;
            }
            
            document.getElementById('welcome-bonus-modal').classList.remove('hidden');

            document.getElementById('claim-bonus-button').onclick = () => {
                playerData.moneyBags += bonusBags;
                coins += bonusCoins;
                updateScoreDisplay();
                playerData.lastLoginDate = new Date().toISOString().split('T')[0];
                savePlayerProfile();
                document.getElementById('welcome-bonus-modal').classList.add('hidden');
                actuallyStartGame();
            };
        }

        const dailyRewards = Array.from({ length: 31 }, (_, i) => {
            const day = i + 1;
            const coinReward = Math.floor(1000 * Math.pow(day, 2.5));
            const bagReward = Math.floor(5 * Math.pow(day, 1.5));
            let bonus = 1;
            if (day === 7 || day === 21) bonus = 2;
            if (day === 10 || day === 20 || day === 30) bonus = 3;
            return { day, coins: coinReward, bags: bagReward, bonus: bonus };
        });
        dailyRewards[30] = { day: 31, coins: 100000000, bags: 5000, bonus: 3 };

        function populateCalendar() {
            const grid = document.getElementById('calendar-grid');
            grid.innerHTML = '';
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const todayDay = today.getDate();

            for (let i = 1; i <= 35; i++) {
                if (i <= dailyRewards.length) {
                    const reward = dailyRewards[i - 1];
                    const dayEl = document.createElement('div');
                    dayEl.classList.add('calendar-day');
                    const isClaimed = playerData.claimedDays?.includes(reward.day);
                    const isToday = reward.day === todayDay;

                    dayEl.innerHTML = `
                        <div class="day-number">${reward.day}</div>
                        <div class="reward-text">🪙 ${formatScore(reward.coins * reward.bonus)}</div>
                        <div class="reward-text">💰 ${formatScore(reward.bags * reward.bonus)}</div>
                    `;

                    if (reward.bonus === 2) dayEl.classList.add('double-bonus');
                    if (reward.bonus === 3) dayEl.classList.add('triple-bonus');

                    if (isClaimed) {
                        dayEl.classList.add('claimed');
                        dayEl.innerHTML += '<div class="text-xs font-bold mt-1">CLAIMED</div>';
                    } else if (isToday && playerData.lastDailyClaim !== todayStr) {
                        dayEl.classList.add('today');
                        dayEl.addEventListener('click', () => claimDailyReward(reward));
                    } else if (isToday && playerData.lastDailyClaim === todayStr) {
                        dayEl.classList.add('today', 'claimed');
                        dayEl.innerHTML += '<div class="text-xs font-bold mt-1">CLAIMED</div>';
                    } else if (reward.day > todayDay) {
                        dayEl.classList.add('future');
                    } else {
                        dayEl.classList.add('past-day');
                    }
                    grid.appendChild(dayEl);
                } else if (i === 32) {
                    const legendEl = document.createElement('div');
                    legendEl.id = 'calendar-legend';
                    legendEl.className = 'text-xs text-center greed-panel p-2 rounded-lg flex flex-col justify-center items-center';
                    legendEl.style.gridColumn = 'span 4';
                    legendEl.innerHTML = `
                        <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full border-2 border-yellow-300"></div> 2x Bonus</div>
                        <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full border-2 border-red-500"></div> 3x Bonus</div>
                    `;
                    grid.appendChild(legendEl);
                }
            }
        }

        function claimDailyReward(reward) {
            const todayStr = new Date().toISOString().split('T')[0];
            if (playerData.lastDailyClaim === todayStr || playerData.claimedDays.includes(reward.day)) {
                showEventText("Already Claimed Today!");
                return;
            }

            const randomFreebie = nonsenseFreebies[Math.floor(Math.random() * nonsenseFreebies.length)];
            playerData.nonsenseFreebiesCollected[randomFreebie] = (playerData.nonsenseFreebiesCollected[randomFreebie] || 0) + 1;
            
            playerData.moneyBags += (reward.bags * reward.bonus);
            coins += (reward.coins * reward.bonus);
            updateScoreDisplay();
            showEventText(`+${randomFreebie} Claimed!<br>New Prizes Tomorrow!`, true, true);

            playerData.claimedDays.push(reward.day);
            playerData.lastDailyClaim = todayStr;
            savePlayerProfile();
            
            populateCalendar();
        }
        
        function saveGameResult() {
            playerData.moneyBags += bagsOfMoney;
            if (coins > playerData.highScore) {
                playerData.highScore = coins;
            }
            playerData.gamesPlayed++;
            savePlayerProfile();
        }

        // --- Tips Carousel Logic ---
        function populateTipsCarousel() {
            const container = document.getElementById('tip-card-container');
            container.innerHTML = '';
            tips.forEach((tip, index) => {
                const card = document.createElement('div');
                card.className = 'tip-card';
                card.textContent = tip;
                if (index === currentTipIndex) {
                    card.classList.add('active');
                }
                container.appendChild(card);
            });
        }

        function showTip(index) {
            const cards = document.querySelectorAll('.tip-card');
            cards.forEach((card, i) => {
                card.classList.toggle('active', i === index);
            });
        }

        function nextTip() {
            currentTipIndex = (currentTipIndex + 1) % tips.length;
            showTip(currentTipIndex);
        }

        function prevTip() {
            currentTipIndex = (currentTipIndex - 1 + tips.length) % tips.length;
            showTip(currentTipIndex);
        }
        
        // --- Badge Logic ---
        const badges = [
            { id: 'first_play', name: 'First Play', emoji: '🩶', condition: (p) => p.gamesPlayed >= 1, description: 'Play your first game.' },
            { id: 'frequent_player', name: 'Frequent Player', emoji: '💛', condition: (p) => p.gamesPlayed >= 5, description: 'Play 5 total games.' },
            { id: 'veteran_player', name: 'Veteran Player', emoji: '💙', condition: (p) => p.gamesPlayed >= 25, description: 'Play 25 total games.' },
            { id: 'expert', name: 'Expert', emoji: '💜', score: 1000000000, description: 'Score 1 billion coins in a single game.' },
            { id: 'demolitionist', name: 'Drag-n-Drop', emoji: '💚', condition: (p) => p.greenBombsUsed >= 1000, description: 'Use 1,000 green bombs.' },
            { id: 'philanthropist', name: 'Caring', emoji: '💖', condition: (p) => p.unlockedBadges.includes('philanthropist'), description: 'Donate a rich to charity.' },
        ];

        function checkAndAwardBadges(finalScore) {
            let newBadgeEarned = false;
            badges.forEach(badge => {
                if (!playerData.unlockedBadges.includes(badge.id)) {
                    let earned = false;
                    if (badge.score && finalScore >= badge.score) {
                        earned = true;
                    } else if (badge.condition && badge.condition(playerData)) {
                        earned = true;
                    }
                    if (earned) {
                        playerData.unlockedBadges.push(badge.id);
                        newBadgeEarned = true;
                        showEventText(`Badge Unlocked: ${badge.name}!`, true);
                    }
                }
            });
            if (newBadgeEarned) {
                displayBadges();
                savePlayerProfile();
            }
        }

        function displayBadges() {
            const panel = document.getElementById('badges-panel');
            panel.innerHTML = ''; // Clear previous badges
            
            const badgeOrder = ['first_play', 'frequent_player', 'veteran_player', 'expert', 'demolitionist', 'philanthropist'];
            const unlockedBadgeSet = new Set(playerData.unlockedBadges || []);
            
            badgeOrder.forEach(badgeId => {
                if (unlockedBadgeSet.has(badgeId)) {
                    const badgeData = badges.find(b => b.id === badgeId);
                    if (badgeData) {
                        const badgeEl = document.createElement('div');
                        badgeEl.className = 'badge-item';
                        badgeEl.textContent = badgeData.emoji;
                        panel.appendChild(badgeEl);
                    }
                }
            });
        }
        
        function populateBadgesModal() {
            const container = document.getElementById('badges-info-container');
            container.innerHTML = '';
            const unlockedBadgeSet = new Set(playerData.unlockedBadges || []);

            badges.forEach(badge => {
                const isUnlocked = unlockedBadgeSet.has(badge.id);
                const card = document.createElement('div');
                card.className = 'badge-info-card';
                if (!isUnlocked) {
                    card.classList.add('locked');
                }
                card.innerHTML = `
                    <div class="badge-info-emoji">${badge.emoji}</div>
                    <div>
                        <h4 class="font-bold text-lg">${isUnlocked ? badge.name : '???'}</h4>
                        <p class="text-sm text-slate-300">${isUnlocked ? badge.description : 'Unlock this badge to see details.'}</p>
                    </div>
                `;
                container.appendChild(card);
            });
        }

        // --- Giving Modal Logic ---
        function openGivingModal() {
            document.getElementById('trading-post-modal').classList.add('hidden');
            populateGivingModal();
            document.getElementById('giving-modal').classList.remove('hidden');
        }

        function populateGivingModal() {
            const container = document.getElementById('giving-inventory');
            container.innerHTML = '';
            selectedDonation = null;
            document.getElementById('execute-give-button').disabled = true;
            document.getElementById('giving-confirmation-text').textContent = 'Select an item from your riches to donate and earn a badge!';


            const inventory = playerData.inventory || {};
            const items = Object.keys(inventory);

            if (items.length === 0) {
                container.innerHTML = `<p class="col-span-full text-center text-slate-400">You have nothing to give! Acquire some riches first.</p>`;
                return;
            }

            items.forEach(item => {
                const count = inventory[item];
                if (count > 0) {
                    const name = inventoryItemNames[item] || 'Item';
                    const itemEl = document.createElement('div');
                    itemEl.className = 'giving-item p-2 rounded-lg text-center cursor-pointer';
                    itemEl.innerHTML = `
                        <div class="text-4xl">${item}</div>
                        <div class="text-xs font-bold">${name}</div>
                        <div class="text-xs text-slate-400">x${count}</div>
                    `;
                    itemEl.addEventListener('click', () => {
                        document.querySelectorAll('.giving-item').forEach(el => el.classList.remove('selected'));
                        itemEl.classList.add('selected');
                        selectedDonation = item;
                        document.getElementById('execute-give-button').disabled = false;
                        if(count > 1) {
                            document.getElementById('giving-confirmation-text').textContent = `You are donating one ${name}.`;
                        } else {
                            document.getElementById('giving-confirmation-text').textContent = 'Select an item from your riches to donate and earn a badge!';
                        }
                    });
                    container.appendChild(itemEl);
                }
            });
        }

        function executeGive() {
            if (!selectedDonation) return;

            if (playerData.inventory[selectedDonation] > 0) {
                playerData.inventory[selectedDonation]--;

                if (!playerData.unlockedBadges.includes('philanthropist')) {
                    playerData.unlockedBadges.push('philanthropist');
                    showEventText("Badge Unlocked: Caring!", true, true);
                    displayBadges();
                } else {
                    showEventText("Thank you for your generosity!", true);
                }
                
                savePlayerProfile();
                populateGivingModal(); // Refresh the view
            }
        }

        async function initGame() {
            loadPlayerFromLocalStorage();
            await buildVerifiedPlaylist();
            if (userPlaylist.length > 0) {
                currentTrackIndex = Math.floor(Math.random() * userPlaylist.length);
            }
            musicPlayer.addEventListener('ended', playNextTrack);
            playerNameInput.disabled = false;
            playerNameInput.placeholder = "Enter Name";
            levelGoodies = [...nonsenseFreebies];
            startLevel();
            updateScoreDisplay();
            setupAudioControls();
            populatePlaylistModal();
            populateTipsCarousel();
            startModalAnimationInterval = setInterval(() => { 
                const startModal = document.getElementById('start-modal');
                if (!startModal || startModal.classList.contains('hidden')) {
                    clearInterval(startModalAnimationInterval);
                    return;
                };
                const coin = document.createElement('div');
                coin.classList.add('falling-coin');
                coin.textContent = '🪙';
                coin.style.left = `${Math.random() * 100}%`;
                coin.style.animationDuration = `${Math.random() * 2 + 3}s`;
                coin.style.fontSize = `${Math.random() * 1 + 0.5}rem`;
                startModal.appendChild(coin);
                setTimeout(() => coin.remove(), 5000);
             }, 300);

            try {
                let config;
                if (typeof window.firebaseConfig !== 'undefined') {
                    config = window.firebaseConfig;
                } else {
                    config = {
                        apiKey: "%FIREBASE_API_KEY%",
                        authDomain: "%FIREBASE_AUTH_DOMAIN%",
                        projectId: "%FIREBASE_PROJECT_ID%",
                        storageBucket: "%FIREBASE_STORAGE_BUCKET%",
                        messagingSenderId: "%FIREBASE_MESSAGING_SENDER_ID%",
                        appId: "%FIREBASE_APP_ID%",
                        measurementId: "%FIREBASE_MEASUREMENT_ID%"
                    };
                }
                if (!config.apiKey || config.apiKey.startsWith('%')) {
                    throw new Error("Firebase config not found. Running in offline mode.");
                }
                const app = initializeApp(config);
                auth = getAuth(app);
                db = getFirestore(app);
                onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        userId = user.uid;
                        isFirebaseConnected = true;
                        await syncWithFirebase();
                    } else {
                        try {
                            const userCredential = await signInAnonymously(auth);
                            userId = userCredential.user.uid;
                            isFirebaseConnected = true;
                            await syncWithFirebase();
                        } catch (error) {
                            console.warn("Anonymous sign-in failed. Game will continue in offline mode.", error.message);
                            isFirebaseConnected = false;
                        }
                    }
                });
            } catch (e) {
                console.warn(e.message);
                isFirebaseConnected = false;
            }

            // --- Global Event Listeners ---
            document.getElementById('start-game-button').addEventListener('click', startGame);
            document.getElementById('play-again-button').addEventListener('click', restartGame);
            document.getElementById('help-button').addEventListener('click', () => {
                pauseGame();
                document.getElementById('help-modal').classList.remove('hidden');
            });
            document.getElementById('close-help-button').addEventListener('click', () => {
                document.getElementById('help-modal').classList.add('hidden');
                resumeGame();
            });
            document.getElementById('solve-button').addEventListener('click', onSolveButtonClick);
            document.getElementById('about-button').addEventListener('click', () => {
                document.getElementById('help-modal').classList.add('hidden');
                document.getElementById('about-modal').classList.remove('hidden');
            });
            document.getElementById('close-about-button').addEventListener('click', () => {
                document.getElementById('about-modal').classList.add('hidden');
                document.getElementById('help-modal').classList.remove('hidden');
            });
            document.getElementById('playlist-button').addEventListener('click', () => {
                document.getElementById('help-modal').classList.add('hidden');
                populatePlaylistModal();
                document.getElementById('playlist-modal').classList.remove('hidden');
            });
            document.getElementById('close-playlist-button').addEventListener('click', () => {
                document.getElementById('playlist-modal').classList.add('hidden');
                document.getElementById('help-modal').classList.remove('hidden');
            });
            document.getElementById('setup-button').addEventListener('click', () => {
                document.getElementById('help-modal').classList.add('hidden');
                populateSetupModal();
                document.getElementById('setup-modal').classList.remove('hidden');
            });
            document.getElementById('close-setup-button').addEventListener('click', () => {
                document.getElementById('setup-modal').classList.add('hidden');
                document.getElementById('help-modal').classList.remove('hidden');
            });
            document.getElementById('reset-progress-button').addEventListener('click', () => {
                document.getElementById('confirm-reset-modal').classList.remove('hidden');
            });
            document.getElementById('cancel-reset-button').addEventListener('click', () => {
                document.getElementById('confirm-reset-modal').classList.add('hidden');
            });
            document.getElementById('confirm-reset-button').addEventListener('click', async () => {
                playerData = getDefaultPlayerData();
                await savePlayerProfile();
                populateSetupModal();
                applyTheme('default');
                document.getElementById('confirm-reset-modal').classList.add('hidden');
            });
            document.querySelectorAll('.difficulty-button').forEach(button => {
                button.addEventListener('click', (e) => {
                    document.querySelectorAll('.difficulty-button').forEach(btn => btn.classList.remove('difficulty-active'));
                    const clickedButton = e.currentTarget;
                    clickedButton.classList.add('difficulty-active');
                    if (clickedButton.id === 'difficulty-easy') maxSameEmoji = 8;
                    else if (clickedButton.id === 'difficulty-medium') maxSameEmoji = 4;
                    else if (clickedButton.id === 'difficulty-hard') maxSameEmoji = 2;
                    else maxSameEmoji = 4;
                });
            });
            document.getElementById('daily-rewards-button').addEventListener('click', () => {
                document.getElementById('help-modal').classList.add('hidden');
                populateCalendar();
                document.getElementById('daily-rewards-modal').classList.remove('hidden');
            });
            document.getElementById('close-daily-rewards-button').addEventListener('click', () => {
                document.getElementById('daily-rewards-modal').classList.add('hidden');
                document.getElementById('help-modal').classList.remove('hidden');
            });
            document.getElementById('trade-goodies-button')?.addEventListener('click', openTradingPost);
            document.getElementById('execute-trade-button').addEventListener('click', executeTrade);
            document.getElementById('close-trading-post-button').addEventListener('click', () => {
                document.getElementById('trading-post-modal').classList.add('hidden');
                populateSetupModal(); // Refresh setup modal on close
                document.getElementById('setup-modal').classList.remove('hidden');
            });
            document.getElementById('riches-button').addEventListener('click', () => {
                document.getElementById('setup-modal').classList.add('hidden');
                populateRichesModal();
                document.getElementById('riches-modal').classList.remove('hidden');
            });
            document.getElementById('close-riches-button').addEventListener('click', () => {
                document.getElementById('riches-modal').classList.add('hidden');
                populateSetupModal(); // Refresh setup modal on close
                document.getElementById('setup-modal').classList.remove('hidden');
            });
            document.getElementById('player-name-input').addEventListener('blur', (e) => {
                playerData.name = e.target.value.trim() || 'Player';
                e.target.classList.toggle('invalid-input', !e.target.value.trim());
                savePlayerProfile();
            });
            document.getElementById('tips-button').addEventListener('click', () => {
                document.getElementById('help-modal').classList.add('hidden');
                document.getElementById('tips-modal').classList.remove('hidden');
            });
            document.getElementById('close-tips-button').addEventListener('click', () => {
                document.getElementById('tips-modal').classList.add('hidden');
                document.getElementById('help-modal').classList.remove('hidden');
            });
            document.getElementById('badges-button').addEventListener('click', () => {
                document.getElementById('help-modal').classList.add('hidden');
                populateBadgesModal();
                const badgesModal = document.getElementById('badges-modal');
                badgesModal.classList.remove('hidden');
                
                clearInterval(badgesModalAnimationInterval);
                badgesModalAnimationInterval = setInterval(() => { 
                    const trophy = document.createElement('div');
                    trophy.classList.add('falling-trophy');
                    trophy.textContent = '🏆';
                    trophy.style.left = `${Math.random() * 100}%`;
                    trophy.style.animationDuration = `${Math.random() * 2 + 3}s`;
                    trophy.style.fontSize = `${Math.random() * 1 + 0.5}rem`;
                    badgesModal.querySelector('.glass-panel').appendChild(trophy);
                    setTimeout(() => trophy.remove(), 5000);
                }, 300);
            });
            document.getElementById('close-badges-button').addEventListener('click', () => {
                document.getElementById('badges-modal').classList.add('hidden');
                document.getElementById('help-modal').classList.remove('hidden');
                clearInterval(badgesModalAnimationInterval);
            });
            document.getElementById('carousel-next').addEventListener('click', nextTip);
            document.getElementById('carousel-prev').addEventListener('click', prevTip);
            document.getElementById('privacy-policy-button').addEventListener('click', async () => {
                document.getElementById('about-modal').classList.add('hidden');
                document.getElementById('privacy-modal').classList.remove('hidden');
                const policyContainer = document.getElementById('privacy-policy-content');
                try {
                    const response = await fetch('https://raw.githubusercontent.com/floydkelly-dev/wordgreed/main/public/PrivacyPolicy.html');
                    if (!response.ok) throw new Error('Network response was not ok');
                    const policyHTML = await response.text();
                    policyContainer.innerHTML = policyHTML;
                } catch (error) {
                    console.error('Failed to fetch privacy policy:', error);
                    policyContainer.textContent = 'Could not load the privacy policy. Please try again later.';
                }
            });
            document.getElementById('close-privacy-button').addEventListener('click', () => {
                document.getElementById('privacy-modal').classList.add('hidden');
                document.getElementById('about-modal').classList.remove('hidden');
            });
            document.getElementById('copy-userid-button').addEventListener('click', () => {
                const textToCopy = userId;
                if (textToCopy) {
                    const textArea = document.createElement("textarea");
                    textArea.value = textToCopy;
                    document.body.appendChild(textArea);
                    textArea.select();
                    try {
                        document.execCommand('copy');
                        showEventText("User ID Copied!");
                    } catch (err) {
                        console.error('Failed to copy text: ', err);
                    }
                    document.body.removeChild(textArea);
                }
            });
            // Giving Modal Listeners
            document.getElementById('give-button').addEventListener('click', openGivingModal);
            document.getElementById('close-giving-button').addEventListener('click', () => {
                document.getElementById('giving-modal').classList.add('hidden');
                populateTradingPost(); // Refresh trading post on close
                document.getElementById('trading-post-modal').classList.remove('hidden');
            });
            document.getElementById('execute-give-button').addEventListener('click', executeGive);
        }
window.onload = initGame;