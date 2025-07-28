const pieces = {
    white: {
        king: '♔', queen: '♕', rook: '♖',
        bishop: '♗', knight: '♘', pawn: '♙'
    },
    black: {
        king: '♚', queen: '♛', rook: '♜',
        bishop: '♝', knight: '♞', pawn: '♟'
    }
};

let board = [];
let currentPlayer = 'white';
let selectedSquare = null;
let gameHistory = [];
let capturedPieces = { white: [], black: [] };
let lastMove = null;
let kingPositions = { white: [7, 4], black: [0, 4] };

function initBoard() {
    board = Array(8).fill().map(() => Array(8).fill(null));
    const order = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    for (let i = 0; i < 8; i++) {
        board[0][i] = { color: 'black', type: order[i] };
        board[1][i] = { color: 'black', type: 'pawn' };
        board[6][i] = { color: 'white', type: 'pawn' };
        board[7][i] = { color: 'white', type: order[i] };
    }
    kingPositions = { white: [7, 4], black: [0, 4] };
}

function renderBoard() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;
            if (board[row][col]) {
                const piece = document.createElement('span');
                piece.className = 'piece';
                piece.textContent = pieces[board[row][col].color][board[row][col].type];
                square.appendChild(piece);
            }
            square.addEventListener('click', () => handleSquareClick(row, col));
            boardEl.appendChild(square);
        }
    }
    if (lastMove) {
        document.querySelector(`[data-row="${lastMove.from[0]}"][data-col="${lastMove.from[1]}"]`).classList.add('last-move');
        document.querySelector(`[data-row="${lastMove.to[0]}"][data-col="${lastMove.to[1]}"]`).classList.add('last-move');
    }
    if (isInCheck(currentPlayer)) {
        const kingPos = kingPositions[currentPlayer];
        document.querySelector(`[data-row="${kingPos[0]}"][data-col="${kingPos[1]}"]`).classList.add('in-check');
    }
}

function handleSquareClick(row, col) {
    if (selectedSquare) {
        if (selectedSquare.row === row && selectedSquare.col === col) {
            clearSelection();
            return;
        }
        if (isValidMove(selectedSquare.row, selectedSquare.col, row, col)) {
            makeMove(selectedSquare.row, selectedSquare.col, row, col);
            clearSelection();
            return;
        }
        clearSelection();
    }
    if (board[row][col] && board[row][col].color === currentPlayer) {
        selectedSquare = { row, col };
        highlightPossibleMoves(row, col);
    }
    console.log("Clicked:", row, col, board[row][col]);
}

function clearSelection() {
    selectedSquare = null;
    document.querySelectorAll('.square').forEach(sq => {
        sq.classList.remove('selected', 'possible-move');
    });
}

function highlightPossibleMoves(row, col) {
    // Do NOT call clearSelection() here
    document.querySelector(`[data-row="${row}"][data-col="${col}"]`).classList.add('selected');
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (isValidMove(row, col, r, c)) {
                document.querySelector(`[data-row="${r}"][data-col="${c}"]`).classList.add('possible-move');
            }
        }
    }
}

function isValidMove(fromRow, fromCol, toRow, toCol) {
    if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return false;
    const piece = board[fromRow][fromCol];
    if (!piece || piece.color !== currentPlayer) return false;
    const targetPiece = board[toRow][toCol];
    if (targetPiece && targetPiece.color === piece.color) return false;
    if (!isPieceValidMove(piece.type, fromRow, fromCol, toRow, toCol)) return false;
    const tempBoard = JSON.parse(JSON.stringify(board));
    tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol];
    tempBoard[fromRow][fromCol] = null;
    let tempKingPos = kingPositions[currentPlayer];
    if (piece.type === 'king') {
        tempKingPos = [toRow, toCol];
    }
    return !wouldBeInCheck(tempBoard, currentPlayer, tempKingPos);
}

function isPieceValidMove(type, fromRow, fromCol, toRow, toCol) {
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;
    const absRowDiff = Math.abs(rowDiff);
    const absColDiff = Math.abs(colDiff);
    switch (type) {
        case 'pawn':
            const direction = currentPlayer === 'white' ? -1 : 1;
            const startRow = currentPlayer === 'white' ? 6 : 1;
            if (colDiff === 0) {
                if (rowDiff === direction && !board[toRow][toCol]) return true;
                if (fromRow === startRow && rowDiff === 2 * direction && !board[toRow][toCol]) return true;
            } else if (absColDiff === 1 && rowDiff === direction) {
                return board[toRow][toCol] && board[toRow][toCol].color !== currentPlayer;
            }
            return false;
        case 'rook':
            return (rowDiff === 0 || colDiff === 0) && isPathClear(fromRow, fromCol, toRow, toCol);
        case 'bishop':
            return absRowDiff === absColDiff && isPathClear(fromRow, fromCol, toRow, toCol);
        case 'queen':
            return (rowDiff === 0 || colDiff === 0 || absRowDiff === absColDiff) && isPathClear(fromRow, fromCol, toRow, toCol);
        case 'knight':
            return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);
        case 'king':
            return absRowDiff <= 1 && absColDiff <= 1;
    }
    return false;
}

function isPathClear(fromRow, fromCol, toRow, toCol) {
    const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
    const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;
    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;
    while (currentRow !== toRow || currentCol !== toCol) {
        if (board[currentRow][currentCol]) return false;
        currentRow += rowStep;
        currentCol += colStep;
    }
    return true;
}

function makeMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    const capturedPiece = board[toRow][toCol];
    gameHistory.push({
        from: [fromRow, fromCol],
        to: [toRow, toCol],
        piece: { ...piece },
        captured: capturedPiece ? { ...capturedPiece } : null,
        board: JSON.parse(JSON.stringify(board))
    });
    if (capturedPiece) {
        capturedPieces[capturedPiece.color].push(capturedPiece.type);
        updateCapturedPieces();
    }
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = null;
    if (piece.type === 'king') {
        kingPositions[piece.color] = [toRow, toCol];
    }
    lastMove = { from: [fromRow, fromCol], to: [toRow, toCol] };
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    updateGameStatus();
    renderBoard();
    updateMoveHistory();
}

function isInCheck(color) {
    return wouldBeInCheck(board, color, kingPositions[color]);
}

function wouldBeInCheck(testBoard, color, kingPos) {
    const opponent = color === 'white' ? 'black' : 'white';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = testBoard[row][col];
            if (piece && piece.color === opponent) {
                if (canPieceAttack(piece.type, row, col, kingPos[0], kingPos[1], testBoard)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function canPieceAttack(type, fromRow, fromCol, toRow, toCol, testBoard) {
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;
    const absRowDiff = Math.abs(rowDiff);
    const absColDiff = Math.abs(colDiff);
    switch (type) {
        case 'pawn':
            const direction = testBoard[fromRow][fromCol].color === 'white' ? -1 : 1;
            return absColDiff === 1 && rowDiff === direction;
        case 'rook':
            return (rowDiff === 0 || colDiff === 0) && isPathClearForBoard(fromRow, fromCol, toRow, toCol, testBoard);
        case 'bishop':
            return absRowDiff === absColDiff && isPathClearForBoard(fromRow, fromCol, toRow, toCol, testBoard);
        case 'queen':
            return (rowDiff === 0 || colDiff === 0 || absRowDiff === absColDiff) && isPathClearForBoard(fromRow, fromCol, toRow, toCol, testBoard);
        case 'knight':
            return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);
        case 'king':
            return absRowDiff <= 1 && absColDiff <= 1;
    }
    return false;
}

function isPathClearForBoard(fromRow, fromCol, toRow, toCol, testBoard) {
    const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
    const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;
    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;
    while (currentRow !== toRow || currentCol !== toCol) {
        if (testBoard[currentRow][currentCol]) return false;
        currentRow += rowStep;
        currentCol += colStep;
    }
    return true;
}

function updateGameStatus() {
    const statusEl = document.getElementById('status');
    if (isInCheck(currentPlayer)) {
        if (isCheckmate()) {
            statusEl.textContent = `Checkmate! ${currentPlayer === 'white' ? 'Black' : 'White'} wins!`;
            statusEl.style.color = '#ff4757';
        } else {
            statusEl.textContent = `${capitalize(currentPlayer)} is in check!`;
            statusEl.style.color = '#ff6b6b';
        }
    } else if (isStalemate()) {
        statusEl.textContent = 'Stalemate! Draw!';
        statusEl.style.color = '#ffa502';
    } else {
        statusEl.textContent = `${capitalize(currentPlayer)} to move`;
        statusEl.style.color = '#333';
    }
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function isCheckmate() {
    return !hasLegalMoves();
}

function isStalemate() {
    return !isInCheck(currentPlayer) && !hasLegalMoves();
}

function hasLegalMoves() {
    for (let fromRow = 0; fromRow < 8; fromRow++) {
        for (let fromCol = 0; fromCol < 8; fromCol++) {
            const piece = board[fromRow][fromCol];
            if (piece && piece.color === currentPlayer) {
                for (let toRow = 0; toRow < 8; toRow++) {
                    for (let toCol = 0; toCol < 8; toCol++) {
                        if (isValidMove(fromRow, fromCol, toRow, toCol)) {
                            return true;
                        }
                    }
                }
            }
        }
    }
    return false;
}

function updateCapturedPieces() {
    const whiteEl = document.getElementById('captured-white');
    const blackEl = document.getElementById('captured-black');
    whiteEl.innerHTML = 'White captured: ' +
        capturedPieces.white.map(p => `<span class="captured-piece">${pieces.black[p]}</span>`).join('');
    blackEl.innerHTML = 'Black captured: ' +
        capturedPieces.black.map(p => `<span class="captured-piece">${pieces.white[p]}</span>`).join('');
}

function updateMoveHistory() {
    const historyEl = document.getElementById('history');
    const moves = [];
    for (let i = 0; i < gameHistory.length; i += 2) {
        const moveNum = Math.floor(i / 2) + 1;
        const whiteMove = gameHistory[i];
        const blackMove = gameHistory[i + 1];
        let moveText = `${moveNum}. ${formatMove(whiteMove)}`;
        if (blackMove) {
            moveText += ` ${formatMove(blackMove)}`;
        }
        moves.push(moveText);
    }
    historyEl.textContent = moves.join(' ');
}

function formatMove(move) {
    const piece = move.piece.type === 'pawn' ? '' : move.piece.type.charAt(0).toUpperCase();
    const from = String.fromCharCode(97 + move.from[1]) + (8 - move.from[0]);
    const to = String.fromCharCode(97 + move.to[1]) + (8 - move.to[0]);
    const capture = move.captured ? 'x' : '';
    return `${piece}${from}${capture}${to}`;
}

function newGame() {
    initBoard();
    currentPlayer = 'white';
    selectedSquare = null;
    gameHistory = [];
    capturedPieces = { white: [], black: [] };
    lastMove = null;
    clearSelection();
    updateCapturedPieces();
    updateGameStatus();
    renderBoard();
    document.getElementById('history').textContent = '';
}

function undoMove() {
    if (gameHistory.length === 0) return;
    const last = gameHistory.pop();
    board = last.board;
    if (last.captured) {
        const capturedColor = last.captured.color;
        const index = capturedPieces[capturedColor].lastIndexOf(last.captured.type);
        if (index > -1) capturedPieces[capturedColor].splice(index, 1);
    }
    kingPositions = { white: [7, 4], black: [0, 4] };
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.type === 'king') {
                kingPositions[piece.color] = [row, col];
            }
        }
    }
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    clearSelection();
    updateCapturedPieces();
    updateGameStatus();
    renderBoard();
    updateMoveHistory();
}

function toggleHistory() {
    const historyEl = document.getElementById('history');
    historyEl.style.display = historyEl.style.display === 'none' ? 'block' : 'none';
}

window.addEventListener("DOMContentLoaded", () => {
  newGame();
});