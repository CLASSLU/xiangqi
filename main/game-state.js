/**
 * GameState 模块
 * 游戏状态管理模块 - 负责纯数据状态管理
 */

class GameState {
    /**
     * 构造函数
     * @param {Object} initialState - 可选的初始状态
     */
    constructor(initialState = {}) {
        // 基本游戏状态
        this.currentPlayer = initialState.currentPlayer || 'red';
        this.selectedPiece = initialState.selectedPiece || null;
        this.pieces = initialState.pieces || [];
        this.capturedRed = initialState.capturedRed || [];
        this.capturedBlack = initialState.capturedBlack || [];
        this.gameOver = initialState.gameOver || false;
        this.gamePhase = initialState.gamePhase || 'playing';
        this.moveHistory = initialState.moveHistory || [];

        // 事件监听器
        this.eventListeners = new Map();

        // 性能优化：棋子位置索引
        this.pieceIndex = new Map();
        this.rebuildIndex();
    }

    /**
     * 重建棋子位置索引
     */
    rebuildIndex() {
        this.pieceIndex.clear();
        this.pieces.forEach(piece => {
            const key = `${piece.dataset.row}-${piece.dataset.col}`;
            this.pieceIndex.set(key, piece);
        });
    }

    /**
     * 重置游戏状态
     */
    reset() {
        this.currentPlayer = 'red';
        this.selectedPiece = null;
        this.pieces = [];
        this.capturedRed = [];
        this.capturedBlack = [];
        this.gameOver = false;
        this.gamePhase = 'playing';
        this.moveHistory = [];

        this.pieceIndex.clear();
        this.emit('stateChanged', { action: 'reset' });
    }

    /**
     * 切换当前玩家
     */
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
        this.emit('playerSwitched', {
            currentPlayer: this.currentPlayer
        });
        this.emit('stateChanged', { action: 'playerSwitched', currentPlayer: this.currentPlayer });
    }

    /**
     * 获取当前玩家
     */
    getPlayer() {
        return this.currentPlayer;
    }

    /**
     * 检查游戏是否结束
     */
    isGameOver() {
        return this.gameOver;
    }

    /**
     * 结束游戏
     * @param {string} winner - 获胜方
     */
    endGame(winner) {
        this.gameOver = true;
        this.emit('gameEnded', { winner });
        this.emit('stateChanged', { action: 'gameEnded', winner });
    }

    /**
     * 添加棋子
     * @param {Object} piece - 棋子对象
     */
    addPiece(piece) {
        if (!piece || !piece.dataset) {
            throw new Error('Invalid piece object');
        }

        // 检查位置是否已被占用
        const key = `${piece.dataset.row}-${piece.dataset.col}`;
        if (this.pieceIndex.has(key)) {
            throw new Error(`Position (${piece.dataset.row}, ${piece.dataset.col}) is already occupied`);
        }

        this.pieces.push(piece);
        this.pieceIndex.set(key, piece);
        this.emit('pieceAdded', { piece });
    }

    /**
     * 移除棋子
     * @param {Object} piece - 棋子对象
     */
    removePiece(piece) {
        if (!piece || !piece.dataset) {
            throw new Error('Invalid piece object');
        }

        const pieceIndex = this.pieces.indexOf(piece);
        if (pieceIndex === -1) {
            throw new Error('Piece not found in game state');
        }

        const key = `${piece.dataset.row}-${piece.dataset.col}`;
        this.pieceIndex.delete(key);
        this.pieces.splice(pieceIndex, 1);
        this.emit('pieceRemoved', { piece });
    }

    /**
     * 移动棋子
     * @param {Object} piece - 棋子对象
     * @param {Object} from - 起始位置 {row, col}
     * @param {Object} to - 目标位置 {row, col}
     * @param {Object} capturedPiece - 被吃的棋子（可选）
     */
    movePiece(piece, from, to, capturedPiece = null) {
        if (!piece || !from || !to) {
            throw new Error('Invalid move parameters');
        }

        // 更新棋子位置数据
        piece.dataset.row = to.row.toString();
        piece.dataset.col = to.col.toString();

        // 移除旧位置的索引，添加新位置的索引
        const oldKey = `${from.row}-${from.col}`;
        const newKey = `${to.row}-${to.col}`;
        this.pieceIndex.delete(oldKey);
        this.pieceIndex.set(newKey, piece);

        // 记录移动历史
        const moveRecord = {
            pieceType: piece.dataset.type,
            pieceColor: piece.dataset.color,
            pieceChar: piece.textContent,
            from,
            to,
            notation: piece.dataset.notation || piece.textContent,
            capturedPiece: capturedPiece ? {
                type: capturedPiece.dataset.type,
                color: capturedPiece.dataset.color,
                char: capturedPiece.textContent
            } : null,
            timestamp: Date.now()
        };

        this.moveHistory.push(moveRecord);

        // 记录吃子
        if (capturedPiece) {
            this.addCapture(capturedPiece.dataset.color, capturedPiece.textContent);
            this.removePiece(capturedPiece);
        }

        this.emit('pieceMoved', { piece, from, to, capturedPiece, moveRecord });
        this.emit('stateChanged', {
            action: 'movePiece',
            piece,
            from,
            to,
            capturedPiece,
            moveRecord
        });
    }

    /**
     * 获取指定位置的棋子
     * @param {number} row - 行
     * @param {number} col - 列
     * @returns {Object|null} 棋子对象或null
     */
    getPieceAt(row, col) {
        const key = `${row}-${col}`;
        return this.pieceIndex.get(key) || null;
    }

    /**
     * 添加被吃的棋子
     * @param {string} color - 棋子颜色
     * @param {string} piece - 棋子字符
     */
    addCapture(color, piece) {
        if (color === 'red') {
            this.capturedRed.push(piece);
        } else if (color === 'black') {
            this.capturedBlack.push(piece);
        }
        this.emit('pieceCaptured', { color, piece });
    }

    /**
     * 获取被吃的棋子列表
     * @param {string} color - 棋子颜色
     * @returns {Array} 被吃棋子数组
     */
    getCapturedPieces(color) {
        if (color === 'red') {
            return [...this.capturedRed];
        } else if (color === 'black') {
            return [...this.capturedBlack];
        }
        return [];
    }

    /**
     * 获取移动历史
     * @returns {Array} 移动历史数组
     */
    getMoveHistory() {
        return [...this.moveHistory];
    }

    /**
     * 清除移动历史
     */
    clearMoveHistory() {
        this.moveHistory = [];
        this.emit('stateChanged', { action: 'clearMoveHistory' });
    }

    /**
     * 设置游戏阶段
     * @param {string} phase - 游戏阶段 ('playing'|'demonstration')
     */
    setGamePhase(phase) {
        if (['playing', 'demonstration'].includes(phase)) {
            this.gamePhase = phase;
            this.emit('gamePhaseChanged', { phase });
            this.emit('stateChanged', { action: 'gamePhaseChanged', phase });
        }
    }

    /**
     * 获取游戏阶段
     * @returns {string} 当前游戏阶段
     */
    getGamePhase() {
        return this.gamePhase;
    }

    /**
     * 导出状态为JSON
     * @returns {string} JSON字符串
     */
    export() {
        const state = {
            currentPlayer: this.currentPlayer,
            selectedPiece: this.selectedPiece,
            pieces: this.pieces.map(piece => ({
                id: piece.id,
                type: piece.dataset.type,
                color: piece.dataset.color,
                row: piece.dataset.row,
                col: piece.dataset.col,
                notation: piece.dataset.notation,
                textContent: piece.textContent
            })),
            capturedRed: [...this.capturedRed],
            capturedBlack: [...this.capturedBlack],
            gameOver: this.gameOver,
            gamePhase: this.gamePhase,
            moveHistory: this.getMoveHistory()
        };
        return JSON.stringify(state);
    }

    /**
     * 从JSON导入状态
     * @param {string} stateJson - JSON状态字符串
     */
    import(stateJson) {
        try {
            const state = JSON.parse(stateJson);
            this.currentPlayer = state.currentPlayer || 'red';
            this.selectedPiece = state.selectedPiece || null;
            this.capturedRed = state.capturedRed || [];
            this.capturedBlack = state.capturedBlack || [];
            this.gameOver = state.gameOver || false;
            this.gamePhase = state.gamePhase || 'playing';
            this.moveHistory = state.moveHistory || [];

            // 重新构建棋子数组和索引
            this.pieces = [];
            this.pieceIndex.clear();

            if (state.pieces && Array.isArray(state.pieces)) {
                state.pieces.forEach(pieceData => {
                    const piece = {
                        id: pieceData.id,
                        dataset: {
                            type: pieceData.type,
                            color: pieceData.color,
                            row: pieceData.row.toString(),
                            col: pieceData.col.toString(),
                            notation: pieceData.notation || ''
                        },
                        textContent: pieceData.textContent
                    };
                    this.pieces.push(piece);
                    const key = `${pieceData.row}-${pieceData.col}`;
                    this.pieceIndex.set(key, piece);
                });
            }

            this.emit('stateImported', state);
            this.emit('stateChanged', { action: 'imported' });

        } catch (error) {
            throw new Error(`Failed to import state: ${error.message}`);
        }
    }

    /**
     * 添加事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * 移除事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const callbacks = this.eventListeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * 触发事件
     * @private
     */
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event callback for ${event}:`, error);
                }
            });
        }
    }

    /**
     * 获取状态统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            totalPieces: this.pieces.length,
            redPieces: this.pieces.filter(p => p.dataset.color === 'red').length,
            blackPieces: this.pieces.filter(p => p.dataset.color === 'black').length,
            movesPlayed: this.moveHistory.length,
            capturedRedCount: this.capturedRed.length,
            capturedBlackCount: this.capturedBlack.length,
            currentPlayer: this.currentPlayer,
            gamePhase: this.gamePhase,
            gameOver: this.gameOver
        };
    }
}

// 导出到全局作用域
if (typeof window !== 'undefined') {
    window.GameState = GameState;
}

// 导出供测试使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameState };
}