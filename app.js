/**
 * Tic-Tac-Toe Application Controller
 * Manages game state, UI events, animations, and diagnostics.
 */

// Game state variables
let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X'; // Current player's turn ('X' or 'O')
let gameActive = true;
let humanPlayer = 'X'; // The symbol the human player selected
let aiPlayer = 'O';    // The symbol the AI plays
let scores = { X: 0, O: 0, draws: 0 };

// Load persistent scores from localStorage if available
if (localStorage.getItem('ttt_scores')) {
    try {
        scores = JSON.parse(localStorage.getItem('ttt_scores'));
    } catch (e) {
        console.error("Failed to parse scores from localStorage", e);
    }
}

// DOM Elements
const boardEl = document.getElementById('board');
const cells = document.querySelectorAll('.cell');
const statusCard = document.getElementById('game-status-card');
const statusIndicator = document.getElementById('game-status-indicator');
const statusText = document.getElementById('game-status-text');

// Controls
const selectGameMode = document.getElementById('game-mode');
const selectDifficulty = document.getElementById('ai-difficulty');
const selectFirstMove = document.getElementById('first-move');
const selectAlgorithm = document.getElementById('ai-algorithm');
const btnPlayAsX = document.getElementById('play-as-x');
const btnPlayAsO = document.getElementById('play-as-o');
const btnRestart = document.getElementById('btn-restart');
const btnResetScores = document.getElementById('btn-reset-scores');
const toggleEvals = document.getElementById('toggle-evals');

// Side panels / Groups
const difficultyGroup = document.getElementById('difficulty-group');
const sideGroup = document.getElementById('side-group');

// Metrics
const elNodesCount = document.getElementById('nodes-count');
const elPrunesCount = document.getElementById('prunes-count');
const elSearchTime = document.getElementById('search-time');
const elMaxDepth = document.getElementById('max-depth');

// Scores UI
const elScoreX = document.getElementById('score-x');
const elScoreO = document.getElementById('score-o');
const elScoreDraws = document.getElementById('score-draws');

// SVG Templates
const X_TEMPLATE = `
<svg class="mark x-mark" viewBox="0 0 100 100">
    <path class="line-1" d="M25,25 L75,75" />
    <path class="line-2" d="M75,25 L25,75" />
</svg>
`;

const O_TEMPLATE = `
<svg class="mark o-mark" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="28" />
</svg>
`;

const GHOST_X = `
<svg class="ghost-mark x-mark" viewBox="0 0 100 100">
    <path d="M25,25 L75,75" style="fill:none; stroke:var(--accent-x); stroke-width:14; stroke-linecap:round;" />
    <path d="M75,25 L25,75" style="fill:none; stroke:var(--accent-x); stroke-width:14; stroke-linecap:round;" />
</svg>
`;

const GHOST_O = `
<svg class="ghost-mark o-mark" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="28" style="fill:none; stroke:var(--accent-o); stroke-width:14; stroke-linecap:round;" />
</svg>
`;

/**
 * Initialize application events and view
 */
function init() {
    setupEventListeners();
    updateScoreboard();
    restartGame();
}

/**
 * Attaches event listeners to the controls and the board
 */
function setupEventListeners() {
    // Cell clicks
    cells.forEach(cell => {
        cell.addEventListener('click', handleCellClick);
        cell.addEventListener('mouseenter', handleCellHoverEnter);
        cell.addEventListener('mouseleave', handleCellHoverLeave);
    });

    // Control changes
    selectGameMode.addEventListener('change', () => {
        const mode = selectGameMode.value;
        if (mode === 'human-human') {
            difficultyGroup.style.opacity = '0.35';
            difficultyGroup.style.pointerEvents = 'none';
            sideGroup.style.opacity = '0.35';
            sideGroup.style.pointerEvents = 'none';
        } else {
            difficultyGroup.style.opacity = '1';
            difficultyGroup.style.pointerEvents = 'auto';
            sideGroup.style.opacity = '1';
            sideGroup.style.pointerEvents = 'auto';
        }
        restartGame();
    });

    selectDifficulty.addEventListener('change', restartGame);
    selectFirstMove.addEventListener('change', restartGame);
    selectAlgorithm.addEventListener('change', () => {
        // Recalculate cell evaluations if option is changed mid-game
        if (gameActive) {
            calculateAndDrawMoveScores();
        }
    });

    // Toggle Play As side
    btnPlayAsX.addEventListener('click', () => {
        if (humanPlayer !== 'X') {
            humanPlayer = 'X';
            aiPlayer = 'O';
            btnPlayAsX.classList.add('active');
            btnPlayAsO.classList.remove('active');
            restartGame();
        }
    });

    btnPlayAsO.addEventListener('click', () => {
        if (humanPlayer !== 'O') {
            humanPlayer = 'O';
            aiPlayer = 'X';
            btnPlayAsO.classList.add('active');
            btnPlayAsX.classList.remove('active');
            restartGame();
        }
    });

    // Restart and Reset
    btnRestart.addEventListener('click', restartGame);
    btnResetScores.addEventListener('click', resetScores);

    // Toggle Score overlay checkbox
    toggleEvals.addEventListener('change', () => {
        if (toggleEvals.checked) {
            boardEl.classList.add('show-evals');
            calculateAndDrawMoveScores();
        } else {
            boardEl.classList.remove('show-evals');
            clearScoresOverlay();
        }
    });
}

/**
 * Restarts the round, clearing board array and UI
 */
function restartGame() {
    board = ['', '', '', '', '', '', '', '', ''];
    gameActive = true;
    
    // Reset UI cell elements
    cells.forEach(cell => {
        cell.innerHTML = '';
        cell.className = 'cell'; // clears 'taken' and 'win-highlight'
    });

    // Clear metrics
    updateMetricsUI({ nodes: 0, prunes: 0, time: '0.00', depth: 0 });

    // Enable/disable overlays
    if (toggleEvals.checked) {
        boardEl.classList.add('show-evals');
    } else {
        boardEl.classList.remove('show-evals');
    }

    // Determine starting player
    const mode = selectGameMode.value;
    const startSetting = selectFirstMove.value;

    if (mode === 'human-human') {
        currentPlayer = 'X'; // Always X starts in human-human
    } else if (mode === 'ai-ai') {
        currentPlayer = 'X'; // AI-AI starts with X
    } else {
        // Human vs AI
        if (startSetting === 'player') {
            currentPlayer = humanPlayer;
        } else if (startSetting === 'ai') {
            currentPlayer = aiPlayer;
        } else {
            // Random
            currentPlayer = Math.random() < 0.5 ? 'X' : 'O';
        }
    }

    updateStatusUI();

    // Trigger initial calculations
    if (gameActive) {
        calculateAndDrawMoveScores();
    }

    // If starting player is AI (and not human-human), trigger AI move
    if (gameActive && isAiTurn()) {
        setTimeout(makeAiMove, 600); // Small delay to feel natural
    }
}

/**
 * Resets score trackers
 */
function resetScores() {
    scores = { X: 0, O: 0, draws: 0 };
    localStorage.setItem('ttt_scores', JSON.stringify(scores));
    updateScoreboard();
}

/**
 * Updates scoreboard UI values
 */
function updateScoreboard() {
    elScoreX.textContent = scores.X;
    elScoreO.textContent = scores.O;
    elScoreDraws.textContent = scores.draws;
}

/**
 * Checks if it is currently the AI's turn
 */
function isAiTurn() {
    const mode = selectGameMode.value;
    if (mode === 'human-human') return false;
    if (mode === 'ai-ai') return true;
    
    // Human vs AI
    return currentPlayer === aiPlayer;
}

/**
 * Handles cell click events (Human player actions)
 */
function handleCellClick(e) {
    const index = parseInt(e.target.closest('.cell').getAttribute('data-index'));

    // Block clicks if slot is taken, game is over, or AI is currently thinking
    if (board[index] !== '' || !gameActive || isAiTurn()) {
        return;
    }

    makeMove(index, currentPlayer);

    if (gameActive) {
        // If human-human, continue. If human-ai, trigger AI move
        if (selectGameMode.value === 'human-ai') {
            setTimeout(makeAiMove, 600); // Simulated delay for visualizer & pacing
        }
    }
}

/**
 * Executes a move, drawing it, verifying game end states, and changing turns.
 */
function makeMove(index, player) {
    board[index] = player;
    
    // Draw mark
    const cell = document.getElementById(`cell-${index}`);
    cell.classList.add('taken');
    cell.innerHTML = player === 'X' ? X_TEMPLATE : O_TEMPLATE;

    // Remove any ghost marks or hover states
    const ghost = cell.querySelector('.ghost-mark');
    if (ghost) ghost.remove();

    // Check terminal states
    if (checkWinner(board, player)) {
        handleGameOver(player);
        return;
    }

    if (isBoardFull(board)) {
        handleGameOver('draw');
        return;
    }

    // Switch turns
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateStatusUI();

    // Calculate next options evaluation scores (only if humans can play next)
    if (gameActive) {
        calculateAndDrawMoveScores();
    }
}

/**
 * Triggered when it is the AI's turn to play
 */
function makeAiMove() {
    if (!gameActive) return;

    const usePruning = selectAlgorithm.value === 'minimax-pruning';
    const difficulty = selectDifficulty.value;
    
    // We compute AI moves relative to their current symbol
    const opponent = currentPlayer === 'X' ? 'O' : 'X';

    // Get move using minimax.js engine
    const decision = getBestMove(board, currentPlayer, opponent, usePruning, difficulty);
    
    // Update metrics UI
    updateMetricsUI(decision.metrics);

    if (decision.bestMove !== null) {
        // Update grid overlays to reflect AI's evaluation of all cells
        if (toggleEvals.checked) {
            drawEvaluationScores(decision.scores);
        }

        // Add visual indicator of AI target choice just before placing
        const cell = document.getElementById(`cell-${decision.bestMove}`);
        cell.classList.add('ai-thinking');

        setTimeout(() => {
            cell.classList.remove('ai-thinking');
            makeMove(decision.bestMove, currentPlayer);

            // If game is still active and mode is AI vs AI, trigger next AI turn
            if (gameActive && selectGameMode.value === 'ai-ai') {
                setTimeout(makeAiMove, 800);
            }
        }, 300); // 300ms confirmation flash
    }
}

/**
 * Computes evaluation scores from the perspective of the current player
 * and draws overlays on the empty cells.
 */
function calculateAndDrawMoveScores() {
    if (!toggleEvals.checked || !gameActive) {
        clearScoresOverlay();
        return;
    }

    // If it is AI's turn, we let the main AI computation supply scores,
    // otherwise we run a local calculation for the human's options.
    if (isAiTurn()) {
        // AI does its own scoring inside makeAiMove, so we skip human-re-calc here
        return;
    }

    const opponent = currentPlayer === 'X' ? 'O' : 'X';
    const usePruning = selectAlgorithm.value === 'minimax-pruning';
    
    // We evaluate as if we are the current player (maximizing)
    const scores = {};
    for (let i = 0; i < 9; i++) {
        if (board[i] === '') {
            board[i] = currentPlayer;
            // Run minimax from perspective of opponent (minimizer) at depth 1
            const score = minimax(board, 1, false, currentPlayer, opponent, usePruning, -Infinity, Infinity, 9);
            board[i] = '';
            scores[i] = score;
        }
    }

    drawEvaluationScores(scores);
}

/**
 * Draws the scores overlay on empty cells
 */
function drawEvaluationScores(scoreMap) {
    cells.forEach((cell, idx) => {
        // Remove existing overlay
        const existing = cell.querySelector('.eval-score');
        if (existing) existing.remove();

        if (board[idx] === '' && scoreMap[idx] !== undefined) {
            const val = scoreMap[idx];
            
            // Format output label
            let scoreText = val.toString();
            if (val > 0) scoreText = '+' + val;
            
            // Assign class based on score value
            let scoreClass = 'score-draw';
            if (val > 0) scoreClass = 'score-win';
            if (val < 0) scoreClass = 'score-loss';

            const span = document.createElement('span');
            span.className = `eval-score ${scoreClass}`;
            span.textContent = scoreText;
            cell.appendChild(span);
        }
    });
}

/**
 * Removes score overlays from cells
 */
function clearScoresOverlay() {
    document.querySelectorAll('.eval-score').forEach(el => el.remove());
}

/**
 * Handle game over win/draw state
 */
function handleGameOver(result) {
    gameActive = false;
    clearScoresOverlay();

    statusCard.className = 'glass-panel status-card';

    if (result === 'draw') {
        scores.draws++;
        statusText.textContent = "It's a Draw!";
        statusCard.classList.add('won-draw');
    } else {
        scores[result]++;
        statusText.textContent = `Player ${result} Wins!`;
        statusCard.classList.add(`won-${result.toLowerCase()}`);

        // Highlight winning cells
        highlightWinningCells(result);
    }

    // Save scores
    localStorage.setItem('ttt_scores', JSON.stringify(scores));
    updateScoreboard();
}

/**
 * Finds the winning index path and highlights them
 */
function highlightWinningCells(winner) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    winPatterns.forEach(pattern => {
        if (pattern.every(idx => board[idx] === winner)) {
            pattern.forEach(idx => {
                document.getElementById(`cell-${idx}`).classList.add('win-highlight');
            });
        }
    });
}

/**
 * Updates status text and styles
 */
function updateStatusUI() {
    statusCard.className = 'glass-panel status-card';
    
    if (currentPlayer === 'X') {
        statusCard.classList.add('turn-x');
        if (selectGameMode.value === 'human-ai') {
            statusText.textContent = humanPlayer === 'X' ? 'Your Turn (X)' : 'AI Turn (X)...';
        } else if (selectGameMode.value === 'ai-ai') {
            statusText.textContent = 'AI X Turn...';
        } else {
            statusText.textContent = 'Player X Turn';
        }
    } else {
        statusCard.classList.add('turn-o');
        if (selectGameMode.value === 'human-ai') {
            statusText.textContent = humanPlayer === 'O' ? 'Your Turn (O)' : 'AI Turn (O)...';
        } else if (selectGameMode.value === 'ai-ai') {
            statusText.textContent = 'AI O Turn...';
        } else {
            statusText.textContent = 'Player O Turn';
        }
    }
}

/**
 * Updates diagnostic stats UI
 */
function updateMetricsUI(metrics) {
    elNodesCount.textContent = metrics.nodes.toLocaleString();
    elPrunesCount.textContent = metrics.prunes.toLocaleString();
    elSearchTime.textContent = metrics.time;
    elMaxDepth.textContent = metrics.depth;
}

/**
 * Handles ghost marks when hover enter
 */
function handleCellHoverEnter(e) {
    const cell = e.target.closest('.cell');
    const index = parseInt(cell.getAttribute('data-index'));

    if (board[index] !== '' || !gameActive || isAiTurn()) {
        return;
    }

    cell.innerHTML = currentPlayer === 'X' ? GHOST_X : GHOST_O;
}

/**
 * Handles clearing hover states on leave
 */
function handleCellHoverLeave(e) {
    const cell = e.target.closest('.cell');
    const index = parseInt(cell.getAttribute('data-index'));

    if (board[index] === '' && gameActive) {
        cell.innerHTML = '';
        // Re-inject score overlay if toggle is on
        calculateAndDrawMoveScores();
    }
}

// Start app
document.addEventListener('DOMContentLoaded', init);
window.addEventListener('load', () => {
    // Fallback if DOMContentLoaded already fired
    if (document.readyState === 'complete') {
        init();
    }
});
