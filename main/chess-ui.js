/**
 * Chess UI - 中国象棋界面控制模块
 *
 * 从原来的chess.js中提取UI相关功能
 * 专注于界面渲染、用户交互、DOM操作
 *
 * @fileoverview 界面控制系统
 * @version 2.1.0
 * @author Claude Code Review System
 * @since 2024-10-11
 */

/**
 * @typedef {import('./types').PlayerColor} PlayerColor
 * @typedef {import('./types').ChessPiece} ChessPiece
 * @typedef {import('./types').GameState} GameState
 * @typedef {import('./types').Position} Position
 */

/**
 * 中国象棋界面控制器
 */
class ChessUI {
    constructor(engine, audioManager, options = {}) {
        this.engine = engine;
        this.audioManager = audioManager;

        // 性能优化：缓存系统
        this.cache = options.cache || null;

        // 安全防护
        this.security = options.security || new SecurityManager();

        // DOM缓存
        this.elements = this.initializeUIElements();

        // UI状态
        this.selectedPiece = null;
        this possibleMoves = [];
        this.gameMode = 'game'; // 'game' | 'notation'

        // 初始化事件监听
        this.setupEventListeners();
    }

    /**
     * 初始化UI元素引用
     * @private
     * @returns {Object} DOM元素对象
     */
    initializeUIElements() {
        return {
            board: document.querySelector('.board'),
            pieces: document.getElementById('pieces'),
            actionButtons: {
                classic: document.getElementById('loadClassicGame'),
                replay: document.getElementById('replayBtn'),
                pause: document.getElementById('pauseBtn'),
                reset: document.getElementById('resetBtn')
            },
            displays: {
                currentPlayer: document.getElementById('currentPlayer'),
                gamePhase: document.getElementById('gamePhase'),
                recordSteps: document.getElementById('recordSteps')
            },
            inputs: {
                notation: document.getElementById('notationInput'),
                gameId: document.getElementById('gameId')
            }
        };
    }

    /**
     * 设置事件监听器
     * @private
     */
    setupEventListeners() {
        // 棋子点击事件委托
        this.elements.pieces.addEventListener('click', (e) => {
            const pieceElement = e.target.closest('.piece');
            if (pieceElement) {
                this.handlePieceClick(pieceElement);
            }
        });

        // 棋格点击事件委托
        this.elements.board.addEventListener('click', (e) => {
            const boardSquare = e.target.closest('.board-square');
            if (boardSquare) {
                this.handleBoardClick(boardSquare);
            }
        });

        // 按钮事件
        Object.entries(this.elements.actionButtons).forEach(([name, button]) => {
            if (button) {
                button.addEventListener('click', () => this.handleButtonClick(name));
            }
        });

        // 记谱法输入事件
        if (this.elements.inputs.notation) {
            this.elements.inputs.notation.addEventListener('change', () => {
                this.handleNotationChange();
            });
        }
    }

    /**
     * 渲染棋盘
     */
    renderBoard() {
        this.clearBoard();
        const pieces = this.engine.pieces;

        pieces.forEach(piece => {
            this.renderPiece(piece);
        });

        this.updateGamePhase();
        this.updateCurrentPlayer();
    }

    /**
     * 渲染单个棋子
     * @param {ChessPiece} piece - 棋子对象
     * @private
     */
    renderPiece(piece) {
        const pieceElement = this.createPieceElement(piece);
        this.elements.pieces.appendChild(pieceElement);
    }

    /**
     * 创建棋子DOM元素
     * @param {ChessPiece} piece - 棋子对象
     * @returns {HTMLElement} 棋子元素
     * @private
     */
    createPieceElement(piece) {
        const pieceElement = this.createTextElement('div', [
            `piece ${piece.color}`,
            piece.type
        ]);

        // 设置位置样式
        pieceElement.style.setProperty('--row', piece.position.row);
        pieceElement.style.setProperty('--col', piece.position.col);

        // 添加数据属性
        pieceElement.dataset.pieceId = piece.id;
        pieceElement.dataset.color = piece.color;
        pieceElement.dataset.type = piece.type;
        pieceElement.dataset.row = piece.position.row;
        pieceElement.dataset.col = piece.position.col;

        return pieceElement;
    }

    /**
     * 清空棋盘
     * @private
     */
    clearBoard() {
        if (this.elements.pieces) {
            this.elements.pieces.innerHTML = '';
        }
    }

    /**
     * 处理棋子点击
     * @param {HTMLElement} pieceElement - 被点击的棋子元素
     * @private
     */
    handlePieceClick(pieceElement) {
        const piece = this.getPieceFromElement(pieceElement);

        if (!piece || !this.engine.gameActive) {
            return;
        }

        // 只能选择当前玩家的棋子
        if (piece.color !== this.engine.currentPlayer) {
            return;
        }

        // 选择或取消选择棋子
        if (this.selectedPiece?.id === piece.id) {
            this.clearSelection();
        } else {
            this.selectPiece(piece);
        }
    }

    /**
     * 处理棋盘点击
     * @param {HTMLElement} boardSquare - 被点击的棋格
     * @private
     */
    handleBoardClick(boardSquare) {
        if (!this.selectedPiece || !this.engine.gameActive) {
            return;
        }

        const position = this.extractPositionFromSquare(boardSquare);
        if (!position) {
            return;
        }

        this.attemptMove(this.selectedPiece, position);
    }

    /**
     * 选择棋子
     * @param {ChessPiece} piece - 棋子对象
     * @private
     */
    selectPiece(piece) {
        this.clearSelection();

        // 保存选中状态
        this.selectedPiece = piece;
        this.possibleMoves = this.calculatePossibleMoves(piece);

        // 更新UI状态
        this.updatePieceSelection(piece.id, true);
        this.highlightPossibleMoves(this.possibleMoves);

        // 播放选择音效
        this.audioManager.playSound('pieceSelect');
    }

    /**
     * 清除选择状态
     * @private
     */
    clearSelection() {
        if (this.selectedPiece) {
            this.updatePieceSelection(this.selectedPiece.id, false);
            this.clearHighlights();
            this.selectedPiece = null;
            this.possibleMoves = [];
        }
    }

    /**
     * 尝试移动棋子
     * @param {ChessPiece} piece - 棋子
     * @param {Position} toPosition - 目标位置
     * @private
     */
    attemptMove(piece, toPosition) {
        const success = this.engine.movePiece(piece, toPosition);

        if (success) {
            const currentState = this.engine.getGameState();
            this.afterMove(currentState);
        } else {
            // 播放错误反馈音（如果有）
            console.warn('移动无效');
        }

        this.clearSelection();
    }

    /**
     * 移动后处理
     * @param {GameState} state - 游戏状态
     * @private
     */
    afterMove(state) {
        // 重渲染棋盘
        this.renderBoard();

        // 播放音效
        const lastMove = state.moveHistory[state.moveHistory.length - 1];
        if (lastMove) {
            const isCapture = this.wasCapture(lastMove);
            this.audioManager.playSound(isCapture ? 'pieceCapture' : 'pieceMove');
        }

        // 检查将军状态
        if (state.isCheck[state.currentTurn]) {
            this.audioManager.playSound('check');
            this.showCheckMessage();
        }
    }

    /**
     * 更新棋子选中状态
     * @param {string} pieceId - 棋子ID
     * @param {boolean} selected - 是否选中
     * @private
     */
    updatePieceSelection(pieceId, selected) {
        const pieceElement = this.elements.pieces.querySelector(`[data-piece-id="${pieceId}"]`);
        if (pieceElement) {
            if (selected) {
                pieceElement.classList.add('selected');
            } else {
                pieceElement.classList.remove('selected');
            }
        }
    }

    /**
     * 高亮可能的移动位置
     * @param {Position[]} positions - 位置数组
     * @private
     */
    highlightPossibleMoves(positions) {
        positions.forEach(position => {
            const cell = this.elements.board.querySelector(
                `[data-row="${position.row}"][data-col="${position.col}"]`
            );
            if (cell) {
                cell.classList.add('possible-move');
            }
        });
    }

    /**
     * 清除高亮
     * @private
     */
    clearHighlights() {
        const highlightedCells = this.elements.board.querySelectorAll('.possible-move');
        highlightedCells.forEach(cell => cell.classList.remove('possible-move'));
    }

    /**
     * 计算可能的移动位置（简化版）
     * @param {ChessPiece} piece - 棋子
     * @returns {Position[]} 可能位置数组
     * @private
     */
    calculatePossibleMoves(piece) {
        const moves = [];

        // 遍历所有位置，检查是否为有效移动
        for (let row = 0; row <= 9; row++) {
            for (let col = 0; col <= 8; col++) {
                const position = { row, col };
                if (this.engine.isValidMove(piece, position)) {
                    moves.push(position);
                }
            }
        }

        return moves;
    }

    /**
     * 更新游戏阶段显示
     * @private
     */
    updateGamePhase() {
        if (this.elements.displays.gamePhase) {
            const state = this.engine.getGameState();
            this.elements.displays.gamePhase.textContent =
                this.gameMode === 'game' ? '游戏模式' : '棋谱演示';
            this.elements.displays.gamePhase.dataset.phase = state.phase;
        }
    }

    /**
     * 更新当前玩家显示
     * @private
     */
    updateCurrentPlayer() {
        if (this.elements.displays.currentPlayer) {
            const state = this.engine.getGameState();
            this.elements.displays.currentPlayer.textContent =
                state.currentTurn === 'red' ? '红方' : '黑方';
            this.elements.displays.currentPlayer.dataset.player = state.currentTurn;
        }
    }

    /**
     * 显示将军提示
     * @private
     */
    showCheckMessage() {
        const state = this.engine.getGameState();
        const playerName = state.currentTurn === 'red' ? '红方' : '黑方';
        console.log(`${playerName}被将军！`);
    }

    /**
     * 处理按钮点击
     * @param {string} action - 动作名称
     * @private
     */
    handleButtonClick(action) {
        switch (action) {
            case 'classic':
                this.loadRandomClassicGame();
                break;
            case 'replay':
                this.toggleReplay();
                break;
            case 'pause':
                this.togglePause();
                break;
            case 'reset':
                this.resetGame();
                break;
        }
    }

    /**
     * 加载随机经典棋局
     * @private
     */
    loadRandomClassicGame() {
        // 触发主应用加载经典棋局
        if (window.xiangqiGame && window.xiangqiGame.loadRandomClassicGame) {
            window.xiangqiGame.loadRandomClassicGame();
        }
    }

    /**
     * 切换回放状态
     * @private
     */
    toggleReplay() {
        // 触发主应用切换回放
        if (window.xiangqiGame && window.xiangqiGame.toggleReplay) {
            window.xiangqiGame.toggleReplay();
        }
    }

    /**
     * 切换暂停状态
     * @private
     */
    togglePause() {
        // 触发主应用切换暂停
        if (window.xiangqiGame && window.xiangqiGame.togglePause) {
            window.xiangqiGame.togglePause();
        }
    }

    /**
     * 重置游戏
     * @private
     */
    resetGame() {
        this.engine.reset();
        this.renderBoard();
        this.clearSelection();
    }

    /**
     * 处理记谱法输入变化
     * @private
     */
    handleNotationChange() {
        const input = this.elements.inputs.notation.value.trim();
        if (input && window.xiangqiGame && window.xiangqiGame.parseNotation) {
            window.xiangqiGame.parseNotation(input);
        }
    }

    /**
     * 从DOM元素获取棋子对象
     * @param {HTMLElement} element - 棋子元素
     * @returns {ChessPiece|null} 棋子对象
     * @private
     */
    getPieceFromElement(element) {
        const pieceId = element.dataset.pieceId;
        return this.engine.pieces.find(p => p.id === pieceId) || null;
    }

    /**
     * 从棋格元素提取位置
     * @param {HTMLElement} cell - 棋格元素
     * @returns {Position|null} 位置对象
     * @private
     */
    extractPositionFromSquare(cell) {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        return !isNaN(row) && !isNaN(col) ? { row, col } : null;
    }

    /**
     * 检查是否为吃子移动
     * @param {any} move - 移动对象
     * @returns {boolean} 是否吃子
     * @private
     */
    wasCapture(move) {
        // 简化判断：检查记谱法是否包含"吃"
        return move.notation && move.notation.includes('吃');
    }

    /**
     * 安全创建文本元素
     * @param {string} tag - 标签名
     * @param {string[]} classes - 类名数组
     * @param {string} text - 文本内容
     * @returns {HTMLElement} DOM元素
     * @private
     */
    createTextElement(tag, classes, text) {
        // 使用安全模块创建DOM元素
        return this.security.createElement(tag, classes, text);
    }

    /**
     * 设置游戏模式
     * @param {string} mode - 游戏模式
     */
    setGameMode(mode) {
        this.gameMode = mode;
        this.updateGamePhase();
    }

    /**
     * 获取当前选中棋子
     * @returns {ChessPiece|null} 当前选中的棋子
     */
    getSelectedPiece() {
        return this.selectedPiece;
    }

    /**
     * 获取可能的移动位置
     * @returns {Position[]} 可能的移动位置
     */
    getPossibleMoves() {
        return [...this.possibleMoves];
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChessUI;
}