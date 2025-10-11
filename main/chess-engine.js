/**
 * Chess Engine - 中国象棋核心游戏引擎
 *
 * 负责核心游戏逻辑、棋子管理、移动验证等基础功能
 * 从原来的chess.js中提取的核心业务逻辑
 *
 * @fileoverview 游戏核心引擎
 * @version 2.1.0
 * @author Claude Code Review System
 * @since 2024-10-11
 */

/**
 * @typedef {import('./types').PlayerColor} PlayerColor
 * @typedef {import('./types').PieceType} PieceType
 * @typedef {import('./types').Position} Position
 * @typedef {import('./types').ChessPiece} ChessPiece
 * @typedef {import('./types').Move} Move
 * @typedef {import('./types').GameState} GameState
 */

/**
 * 中国象棋核心游戏引擎
 */
class ChessEngine {
    constructor(options = {}) {
        /**
         * @private
         * @type {PlayerColor}
         */
        this.currentPlayer = 'red';

        /**
         * @private
         * @type {Array<ChessPiece>}
         */
        this.pieces = [];

        /**
         * @private
         * @type {Array<Move>}
         */
        this.moveHistory = [];

        /**
         * @private
         * @type {boolean}
         */
        this.gameActive = true;

        /**
         * @private
         * @type {number}
         */
        this.moveCount = 0;

        // 性能优化：缓存系统
        this.cache = options.cache || null;

        // 初始化棋盘
        this.initializeBoard();
    }

    /**
     * 初始化棋盘和棋子
     * @private
     */
    initializeBoard() {
        this.pieces = this.createInitialPieces();
        this.currentPlayer = 'red';
        this.moveHistory = [];
        this.gameActive = true;
        this.moveCount = 0;
    }

    /**
     * 创建初始棋子布局
     * @private
     * @returns {Array<ChessPiece>}
     */
    createInitialPieces() {
        const pieces = [];

        // 红方棋子
        const redPieces = [
            { type: '車', positions: [[9, 0], [9, 8]] },
            { type: '馬', positions: [[9, 1], [9, 7]] },
            { type: '相', positions: [[9, 2], [9, 6]] },
            { type: '仕', positions: [[9, 3], [9, 5]] },
            { type: '帥', positions: [[9, 4]] },
            { type: '炮', positions: [[7, 1], [7, 7]] },
            { type: '兵', positions: [[6, 0], [6, 2], [6, 4], [6, 6], [6, 8]] }
        ];

        // 黑方棋子
        const blackPieces = [
            { type: '車', positions: [[0, 0], [0, 8]] },
            { type: '馬', positions: [[0, 1], [0, 7]] },
            { type: '象', positions: [[0, 2], [0, 6]] },
            { type: '士', positions: [[0, 3], [0, 5]] },
            { type: '将', positions: [[0, 4]] },
            { type: '砲', positions: [[2, 1], [2, 7]] },
            { type: '卒', positions: [[3, 0], [3, 2], [3, 4], [3, 6], [3, 8]] }
        ];

        // 创建红方棋子
        redPieces.forEach(({ type, positions }) => {
            positions.forEach((position, index) => {
                pieces.push({
                    id: `red-${type}-${index}`,
                    type,
                    color: 'red',
                    position: { row: position[0], col: position[1] }
                });
            });
        });

        // 创建黑方棋子
        blackPieces.forEach(({ type, positions }) => {
            positions.forEach((position, index) => {
                pieces.push({
                    id: `black-${type}-${index}`,
                    type,
                    color: 'black',
                    position: { row: position[0], col: position[1] }
                });
            });
        });

        return pieces;
    }

    /**
     * 获取当前位置的棋子
     * @param {Position} position
     * @returns {ChessPiece|null}
     */
    getPieceAt(position) {
        // 使用缓存优化位置查找
        if (this.cache) {
            const cached = this.cache.positionCache(position);
            if (cached !== null) {
                return cached;
            }
        }

        const piece = this.pieces.find(piece =>
            piece.position.row === position.row &&
            piece.position.col === position.col
        ) || null;

        // 缓存结果
        if (this.cache) {
            this.cache.positionCache(position, piece);
        }

        return piece;
    }

    /**
     * 获取指定位置和颜色的棋子
     * @param {Position} position
     * @param {PlayerColor} color
     * @returns {ChessPiece|null}
     */
    getPieceAtByColor(position, color) {
        const piece = this.getPieceAt(position);
        return piece && piece.color === color ? piece : null;
    }

    /**
     * 获取指定颜色的所有棋子
     * @param {PlayerColor} color
     * @returns {Array<ChessPiece>}
     */
    getPiecesByColor(color) {
        return this.pieces.filter(piece => piece.color === color);
    }

    /**
     * 获取指定类型的棋子
     * @param {PieceType} type
     * @param {PlayerColor} color
     * @returns {Array<ChessPiece>}
     */
    getPiecesByType(type, color) {
        return this.pieces.filter(piece =>
            piece.type === type && piece.color === color
        );
    }

    /**
     * 移动棋子
     * @param {ChessPiece} piece
     * @param {Position} toPosition
     * @returns {boolean}
     */
    movePiece(piece, toPosition) {
        if (!this.gameActive) {
            return false;
        }

        if (!this.isValidMove(piece, toPosition)) {
            return false;
        }

        // 记录移动
        const move = {
            color: piece.color,
            pieceType: piece.type,
            fromPos: { ...piece.position },
            toPos: { ...toPosition },
            notation: this.generateMoveNotation(piece, toPosition)
        };

        // 检查是否吃子
        const targetPiece = this.getPieceAt(toPosition);
        if (targetPiece) {
            this.removePiece(targetPiece);
        }

        // 执行移动
        piece.position = { ...toPosition };
        this.moveHistory.push(move);
        this.moveCount++;

        // 切换玩家
        this.switchPlayer();

        return true;
    }

    /**
     * 验证移动是否合法
     * @param {ChessPiece} piece
     * @param {Position} toPosition
     * @returns {boolean}
     */
    isValidMove(piece, toPosition) {
        // 基础验证
        if (!piece || !toPosition) return false;
        if (piece.color !== this.currentPlayer) return false;

        // 位置验证
        if (toPosition.row < 0 || toPosition.row > 9) return false;
        if (toPosition.col < 0 || toPosition.col > 8) return false;

        // 不能吃自己的棋子
        const targetPiece = this.getPieceAt(toPosition);
        if (targetPiece && targetPiece.color === piece.color) return false;

        // 调用相应的移动规则验证
        return this.validatePieceMovement(piece, toPosition);
    }

    /**
     * 验证棋子移动规则
     * @private
     * @param {ChessPiece} piece
     * @param {Position} toPosition
     * @returns {boolean}
     */
    validatePieceMovement(piece, toPosition) {
        const { type, position: from } = piece;
        const rowDiff = toPosition.row - from.row;
        const colDiff = toPosition.col - from.col;

        switch (type) {
            case '帥':
            case '将':
                return this.validateKingMove(piece, toPosition);
            case '仕':
            case '士':
                return this.validateAdvisorMove(piece, toPosition);
            case '相':
            case '象':
                return this.validateElephantMove(piece, toPosition);
            case '馬':
                return this.validateHorseMove(piece, toPosition);
            case '車':
                return this.validateRookMove(piece, toPosition);
            case '炮':
            case '砲':
                return this.validateCannonMove(piece, toPosition);
            case '兵':
            case '卒':
                return this.validateSoldierMove(piece, toPosition);
            default:
                return false;
        }
    }

    /**
     * 验证将帅移动
     * @private
     */
    validateKingMove(piece, toPosition) {
        const { position: from } = piece;
        const rowDiff = Math.abs(toPosition.row - from.row);
        const colDiff = Math.abs(toPosition.col - from.col);

        // 将帅只能在九宫格内移动一格
        if (rowDiff + colDiff !== 1) return false;

        // 九宫格限制
        const palaceRows = piece.color === 'red' ? [7, 8, 9] : [0, 1, 2];
        const palaceCols = [3, 4, 5];

        if (!palaceRows.includes(toPosition.row) || !palaceCols.includes(toPosition.col)) {
            return false;
        }

        return true;
    }

    /**
     * 验证士的移动
     * @private
     */
    validateAdvisorMove(piece, toPosition) {
        const { position: from } = piece;
        const rowDiff = Math.abs(toPosition.row - from.row);
        const colDiff = Math.abs(toPosition.col - from.col);

        // 士只能斜走一格
        if (rowDiff !== 1 || colDiff !== 1) return false;

        // 九宫格限制
        const palaceRows = piece.color === 'red' ? [7, 8, 9] : [0, 1, 2];
        const palaceCols = [3, 4, 5];

        if (!palaceRows.includes(toPosition.row) || !palaceCols.includes(toPosition.col)) {
            return false;
        }

        return true;
    }

    /**
     * 验证象的移动
     * @private
     */
    validateElephantMove(piece, toPosition) {
        const { position: from } = piece;
        const rowDiff = Math.abs(toPosition.row - from.row);
        const colDiff = Math.abs(toPosition.col - from.col);

        // 象只能走田字（斜走两格）
        if (rowDiff !== 2 || colDiff !== 2) return false;

        // 象不能过河
        if (piece.color === 'red' && toPosition.row < 5) return false;
        if (piece.color === 'black' && toPosition.row > 4) return false;

        // 检查象眼是否被堵
        const elephantEyeRow = from.row + (toPosition.row - from.row) / 2;
        const elephantEyeCol = from.col + (toPosition.col - from.col) / 2;
        const elephantEye = { row: elephantEyeRow, col: elephantEyeCol };

        if (this.getPieceAt(elephantEye)) return false;

        return true;
    }

    /**
     * 验证马的移动
     * @private
     */
    validateHorseMove(piece, toPosition) {
        const { position: from } = piece;
        const rowDiff = Math.abs(toPosition.row - from.row);
        const colDiff = Math.abs(toPosition.col - from.col);

        // 马走日字
        if (!((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2))) {
            return false;
        }

        // 检查马腿是否被蹩
        if (rowDiff === 2) {
            const legRow = from.row + (toPosition.row > from.row ? 1 : -1);
            const legPos = { row: legRow, col: from.col };
            if (this.getPieceAt(legPos)) return false;
        } else {
            const legCol = from.col + (toPosition.col > from.col ? 1 : -1);
            const legPos = { row: from.row, col: legCol };
            if (this.getPieceAt(legPos)) return false;
        }

        return true;
    }

    /**
     * 验证车的移动
     * @private
     */
    validateRookMove(piece, toPosition) {
        const { position: from } = piece;

        // 车只能走直线
        if (from.row !== toPosition.row && from.col !== toPosition.col) return false;

        // 检查路径是否有障碍
        if (from.row === toPosition.row) {
            const minCol = Math.min(from.col, toPosition.col);
            const maxCol = Math.max(from.col, toPosition.col);
            for (let col = minCol + 1; col < maxCol; col++) {
                if (this.getPieceAt({ row: from.row, col })) return false;
            }
        } else {
            const minRow = Math.min(from.row, toPosition.row);
            const maxRow = Math.max(from.row, toPosition.row);
            for (let row = minRow + 1; row < maxRow; row++) {
                if (this.getPieceAt({ row, col: from.col })) return false;
            }
        }

        return true;
    }

    /**
     * 验证炮的移动
     * @private
     */
    validateCannonMove(piece, toPosition) {
        const { position: from } = piece;
        const targetPiece = this.getPieceAt(toPosition);

        // 炮只能走直线
        if (from.row !== toPosition.row && from.col !== toPosition.col) return false;

        // 计算路径上的棋子数量
        let piecesBetween = 0;

        if (from.row === toPosition.row) {
            const minCol = Math.min(from.col, toPosition.col);
            const maxCol = Math.max(from.col, toPosition.col);
            for (let col = minCol + 1; col < maxCol; col++) {
                if (this.getPieceAt({ row: from.row, col })) piecesBetween++;
            }
        } else {
            const minRow = Math.min(from.row, toPosition.row);
            const maxRow = Math.max(from.row, toPosition.row);
            for (let row = minRow + 1; row < maxRow; row++) {
                if (this.getPieceAt({ row, col: from.col })) piecesBetween++;
            }
        }

        // 炮的移动规则
        if (targetPiece) {
            // 吃子必须隔一个棋子
            return piecesBetween === 1;
        } else {
            // 移动不能有障碍
            return piecesBetween === 0;
        }
    }

    /**
     * 验证兵/卒的移动
     * @private
     */
    validateSoldierMove(piece, toPosition) {
        const { position: from } = piece;
        const rowDiff = toPosition.row - from.row;
        const colDiff = Math.abs(toPosition.col - from.col);

        if (piece.color === 'red') {
            // 红兵向上走
            if (rowDiff > 0) return false; // 不能后退
            if (Math.abs(rowDiff) + colDiff !== 1) return false; // 只能走一格

            // 过河前只能前进
            if (from.row > 4 && colDiff > 0) return false;
        } else {
            // 黑卒向下走
            if (rowDiff < 0) return false; // 不能后退
            if (Math.abs(rowDiff) + colDiff !== 1) return false; // 只能走一格

            // 过河前只能前进
            if (from.row < 5 && colDiff > 0) return false;
        }

        return true;
    }

    /**
     * 移除棋子
     * @private
     * @param {ChessPiece} piece
     */
    removePiece(piece) {
        const index = this.pieces.indexOf(piece);
        if (index > -1) {
            this.pieces.splice(index, 1);
        }
    }

    /**
     * 切换当前玩家
     * @private
     */
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
    }

    /**
     * 生成移动记谱法
     * @private
     * @param {ChessPiece} piece
     * @param {Position} toPosition
     * @returns {string}
     */
    generateMoveNotation(piece, toPosition) {
        const { type, position: from } = piece;
        const action = this.getPieceAt(toPosition) ? '吃' : '平';
        const targetNotation = this.positionToNotation(toPosition);

        return `${type}${action}${targetNotation}`;
    }

    /**
     * 位置转换为记谱法
     * @private
     * @param {Position} position
     * @returns {string}
     */
    positionToNotation(position) {
        // 简化的记谱法转换
        return `${position.row},${position.col}`;
    }

    /**
     * 检查是否被将军
     * @param {PlayerColor} color
     * @returns {boolean}
     */
    isInCheck(color) {
        const king = this.getPiecesByType('color' === 'red' ? '帥' : '将', color)[0];
        if (!king) return false;

        const opponentColor = color === 'red' ? 'black' : 'red';
        const opponentPieces = this.getPiecesByColor(opponentColor);

        return opponentPieces.some(piece => {
            return this.validatePieceMovement(piece, king.position);
        });
    }

    /**
     * 检查是否将帅照面
     * @returns {boolean}
     */
    areKingsFacing() {
        const redKing = this.getPiecesByType('帥', 'red')[0];
        const blackKing = this.getPiecesByType('将', 'black')[0];

        if (!redKing || !blackKing) return false;
        if (redKing.position.col !== blackKing.position.col) return false;

        // 检查两将之间是否有棋子
        const minRow = Math.min(redKing.position.row, blackKing.position.row);
        const maxRow = Math.max(redKing.position.row, blackKing.position.row);

        for (let row = minRow + 1; row < maxRow; row++) {
            if (this.getPieceAt({ row, col: redKing.position.col })) return false;
        }

        return true;
    }

    /**
     * 获取当前游戏状态
     * @returns {GameState}
     */
    getGameState() {
        return {
            currentTurn: this.currentPlayer,
            phase: this.gameActive ? 'playing' : 'ended',
            moveHistory: [...this.moveHistory],
            selectedPiece: null,
            possibleMoves: [],
            isCheck: {
                red: this.isInCheck('red'),
                black: this.isInCheck('black')
            },
            winner: null,
            moveNumber: this.moveCount
        };
    }

    /**
     * 重置游戏
     */
    reset() {
        this.initializeBoard();
    }

    /**
     * 导出游戏状态为JSON
     * @returns {string}
     */
    exportGame() {
        return JSON.stringify({
            currentPlayer: this.currentPlayer,
            moveHistory: this.moveHistory,
            moveCount: this.moveCount,
            pieces: this.pieces.map(piece => ({
                id: piece.id,
                type: piece.type,
                color: piece.color,
                position: piece.position
            }))
        });
    }

    /**
     * 从JSON导入游戏状态
     * @param {string} gameStateJSON
     * @returns {boolean}
     */
    importGame(gameStateJSON) {
        try {
            const gameState = JSON.parse(gameStateJSON);
            this.currentPlayer = gameState.currentPlayer;
            this.moveHistory = gameState.moveHistory || [];
            this.moveCount = gameState.moveCount || 0;
            this.pieces = gameState.pieces || [];
            this.gameActive = true;
            return true;
        } catch (error) {
            console.error('导入游戏状态失败:', error);
            return false;
        }
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChessEngine;
}