/**
 * Minimax Game Engine for Tic-Tac-Toe
 * Contains search algorithms and diagnostic counters.
 */

// Metrics trackers
let nodesCount = 0;
let prunesCount = 0;
let maxDepthCount = 0;

/**
 * Checks if a specific player has won the game.
 * @param {Array} board - The 3x3 board array
 * @param {string} player - 'X' or 'O'
 * @returns {boolean} True if player won
 */
function checkWinner(board, player) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    return winPatterns.some(pattern => 
        pattern.every(index => board[index] === player)
    );
}

/**
 * Checks if the board is completely full.
 * @param {Array} board - The 3x3 board array
 * @returns {boolean} True if board is full
 */
function isBoardFull(board) {
    return board.every(cell => cell !== '');
}

/**
 * Evaluates the board static score for terminal states.
 * @param {Array} board - The 3x3 board array
 * @param {string} aiPlayer - AI player mark ('X' or 'O')
 * @param {string} opponent - Opponent player mark ('O' or 'X')
 * @param {number} depth - Current search depth
 * @returns {number|null} Score (null if not terminal)
 */
function evaluateBoard(board, aiPlayer, opponent, depth) {
    if (checkWinner(board, aiPlayer)) {
        return 10 - depth; // Prefer quicker wins
    }
    if (checkWinner(board, opponent)) {
        return depth - 10; // Opponent win is bad, prefer delaying it
    }
    if (isBoardFull(board)) {
        return 0; // Draw
    }
    return null; // Not terminal
}

/**
 * The core recursive Minimax search function.
 */
function minimax(board, depth, isMaximizing, aiPlayer, opponent, usePruning, alpha, beta, depthLimit) {
    nodesCount++;
    if (depth > maxDepthCount) {
        maxDepthCount = depth;
    }

    // Terminal check
    const score = evaluateBoard(board, aiPlayer, opponent, depth);
    if (score !== null) {
        return score;
    }

    // Depth limit reached (used for Medium difficulty)
    if (depth >= depthLimit) {
        // Return heuristic score (0 is neutral)
        return 0;
    }

    const nextPlayer = isMaximizing ? aiPlayer : opponent;

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                board[i] = aiPlayer;
                const scoreEval = minimax(board, depth + 1, false, aiPlayer, opponent, usePruning, alpha, beta, depthLimit);
                board[i] = '';
                maxEval = Math.max(maxEval, scoreEval);
                
                if (usePruning) {
                    alpha = Math.max(alpha, scoreEval);
                    if (beta <= alpha) {
                        prunesCount++;
                        break; // Prune branch
                    }
                }
            }
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                board[i] = opponent;
                const scoreEval = minimax(board, depth + 1, true, aiPlayer, opponent, usePruning, alpha, beta, depthLimit);
                board[i] = '';
                minEval = Math.min(minEval, scoreEval);
                
                if (usePruning) {
                    beta = Math.min(beta, scoreEval);
                    if (beta <= alpha) {
                        prunesCount++;
                        break; // Prune branch
                    }
                }
            }
        }
        return minEval;
    }
}

/**
 * Calculates the best move for the AI, tracking algorithm metrics.
 * @param {Array} board - The 3x3 board array
 * @param {string} aiPlayer - AI player mark
 * @param {string} opponent - Opponent player mark
 * @param {boolean} usePruning - Use Alpha-Beta pruning
 * @param {string} difficulty - 'easy', 'medium', 'unbeatable'
 * @returns {Object} Move details including coordinates, cell scores, and metrics
 */
function getBestMove(board, aiPlayer, opponent, usePruning, difficulty) {
    const startTime = performance.now();
    
    // Reset counters
    nodesCount = 0;
    prunesCount = 0;
    maxDepthCount = 0;

    const availableMoves = [];
    for (let i = 0; i < 9; i++) {
        if (board[i] === '') availableMoves.push(i);
    }

    // Edge case: No moves available
    if (availableMoves.length === 0) {
        return { bestMove: null, scores: {}, metrics: { nodes: 0, prunes: 0, time: 0, depth: 0 } };
    }

    // Set search depth limit based on difficulty
    let depthLimit = 9; // Unbeatable (full depth)
    if (difficulty === 'medium') {
        depthLimit = 2; // Medium (looks 2 moves ahead)
    }

    // Easy mode: Choose random move, but still simulate minimax score at depth 1 for visualizer
    if (difficulty === 'easy') {
        const randomIndex = Math.floor(Math.random() * availableMoves.length);
        const randomMove = availableMoves[randomIndex];
        
        // Calculate dummy scores at depth 1 for empty cells so visualizer shows values
        const scores = {};
        availableMoves.forEach(index => {
            scores[index] = 0;
        });

        const endTime = performance.now();
        return {
            bestMove: randomMove,
            scores: scores,
            metrics: {
                nodes: 1,
                prunes: 0,
                time: (endTime - startTime).toFixed(2),
                depth: 1
            }
        };
    }

    // Calculate minimax values for all available moves
    let bestScore = -Infinity;
    let bestMoves = [];
    const cellScores = {};

    for (let i = 0; i < 9; i++) {
        if (board[i] === '') {
            board[i] = aiPlayer;
            // First move check
            const score = minimax(
                board, 
                1, // Start depth at 1
                false, // Next turn is Minimizer (human)
                aiPlayer, 
                opponent, 
                usePruning, 
                -Infinity, 
                Infinity, 
                depthLimit
            );
            board[i] = '';
            
            cellScores[i] = score;

            if (score > bestScore) {
                bestScore = score;
                bestMoves = [i];
            } else if (score === bestScore) {
                bestMoves.push(i);
            }
        }
    }

    // Select randomly among equivalent best moves to make AI play less predictably
    const chosenMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    const endTime = performance.now();

    return {
        bestMove: chosenMove,
        scores: cellScores,
        metrics: {
            nodes: nodesCount,
            prunes: prunesCount,
            time: (endTime - startTime).toFixed(2),
            depth: maxDepthCount
        }
    };
}
