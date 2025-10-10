/**
 * UIEventHandler 模块
 * 专门负责用户界面事件处理
 * 包括事件监听器管理、棋子选择、移动交互、用户反馈
 */

class UIEventHandler {
    constructor(dependencies = {}) {
        // 注入依赖
        this.game = dependencies.game || null;
        this.gameState = dependencies.gameState || null;
        this.moveValidator = dependencies.moveValidator || null;
        this.audioManager = dependencies.audioManager || null;

        // 状态管理
        this.selectedPiece = null;
        this.eventListeners = new Map();
        this.lastListenerId = 0;

        // 状态标志
        this.isEnabled = true;
        this.isProcessing = false;
    }

    /**
     * 初始化UI事件处理
     * @param {HTMLElement} board - 棋盘元素
     */
    initialize(board) {
        if (!board) return;

        // 绑定棋盘主要事件
        this.bindBoardEvents(board);

        // 如果有游戏实例，绑定按钮事件
        if (this.game) {
            this.bindButtonEvents();
        }
    }

    /**
     * 绑定棋盘事件
     * @param {HTMLElement} board - 棋盘元素
     */
    bindBoardEvents(board) {
        // 主要点击事件
        this.registerEventListener(board, 'click', (e) => {
            if (!this.isEnabled || this.isProcessing) return;
            if (this.game && this.game.gameOver) return;

            try {
                this.isProcessing = true;
                const piece = e.target.closest('.piece');
                const cell = e.target.closest('.cell');

                if (piece) {
                    this.handlePieceClick(piece);
                } else if (cell && this.selectedPiece) {
                    this.handleCellClick(cell);
                } else if (e.target.classList.contains('valid-move') && this.selectedPiece) {
                    // 处理移动指示器的点击
                    this.handleValidMoveClick(e.target);
                }
            } finally {
                this.isProcessing = false;
            }
        });

        // 鼠标悬停事件（可选的视觉反馈）
        this.registerEventListener(board, 'mouseover', (e) => {
            if (!this.isEnabled) return;

            const piece = e.target.closest('.piece');
            if (piece && this.game) {
                const pieceColor = piece.dataset.color;
                if (pieceColor === this.game.currentPlayer) {
                    // 可选棋子的悬停效果
                    piece.style.cursor = 'pointer';
                }
            }
        });
    }

    /**
     * 绑定按钮事件
     */
    bindButtonEvents() {
        const buttons = [
            { id: 'newGame', handler: () => this.game.resetGame() },
            { id: 'undo', handler: () => this.game.undoMove() },
            { id: 'hint', handler: () => this.showHint() },
            { id: 'showGameRecords', handler: () => this.game.showRecordPanel() },
            { id: 'audioToggle', handler: () => this.toggleAudio() }
        ];

        buttons.forEach(({ id, handler }) => {
            const button = document.getElementById(id);
            if (button) {
                this.registerEventListener(button, 'click', handler);
            }
        });
    }

    /**
     * 处理棋子点击事件
     * @param {HTMLElement} piece - 棋子元素
     */
    handlePieceClick(piece) {
        try {
            // 防御性检查：确保piece和dataset存在
            if (!piece || !piece.dataset) {
                console.warn('无效的棋子元素，忽略点击');
                return;
            }

            const pieceColor = piece.dataset.color;

            if (pieceColor === (this.game ? this.game.currentPlayer : 'red')) {
                // 选择自己的棋子
                this.selectPiece(piece);
            } else if (this.selectedPiece) {
                // 尝试吃子
                this.tryCapture(piece);
            }
        } catch (error) {
            console.error('处理棋子点击时出错:', error);
        }
    }

    /**
     * 选择棋子
     * @param {HTMLElement} piece - 棋子元素
     */
    selectPiece(piece) {
        try {
            // 清除之前的选择
            this.clearSelection();

            this.selectedPiece = piece;

            // 设置选中状态样式
            this.setPieceSelection(piece);

            // 显示可移动位置
            this.showValidMoves(piece);

            // 音效反馈
            if (this.audioManager) {
                this.audioManager.playPieceSelect();
            }

            // 调用游戏对象的方法（如果存在）
            if (this.game && typeof this.game.selectPiece === 'function') {
                this.game.selectPiece(piece);
            }
        } catch (error) {
            console.error('选择棋子时出错:', error);
        }
    }

    /**
     * 清除选择状态
     */
    clearSelection() {
        try {
            // 清除棋子选中样式
            this.clearPieceSelection(this.selectedPiece);

            this.selectedPiece = null;

            // 清除移动提示点
            this.clearMoveIndicators(this.game ? this.game.board : null);
        } catch (error) {
            console.error('清除选择时出错:', error);
        }
    }

    /**
     * 显示棋子的有效移动
     * @param {HTMLElement} piece - 棋子元素
     */
    showValidMoves(piece) {
        if (!this.moveValidator || !this.gameState || !this.game) return;

        try {
            const type = piece.dataset.type;
            const color = piece.dataset.color;
            const row = parseInt(piece.dataset.row);
            const col = parseInt(piece.dataset.col);

            // 获取有效移动
            const validMoves = this.moveValidator.getValidMoves(type, color, row, col, this.gameState);

            // 显示移动指示器
            validMoves.forEach(([moveRow, moveCol]) => {
                const indicator = this.createMoveIndicator(moveRow, moveCol);
                if (this.game.board) {
                    this.game.board.appendChild(indicator);
                }
            });
        } catch (error) {
            console.error('显示有效移动时出错:', error);
        }
    }

    /**
     * 创建移动指示器
     * @param {number} row - 行
     * @param {number} col - 列
     * @returns {HTMLElement} 移动指示器元素
     */
    createMoveIndicator(row, col) {
        const indicator = document.createElement('div');
        indicator.className = 'valid-move';
        indicator.style.cssText = `
            position: absolute;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: rgba(0, 255, 0, 0.6);
            border: 1px solid #00ff00;
            cursor: pointer;
            z-index: 10;
            pointer-events: auto;
        `;

        // 计算指示器位置（使用CSS Grid定位）
        const cellSize = 50; // 假设每个格子50px
        const boardLeft = 25; // 棋盘左边距
        const boardTop = 25; // 棋盘上边距

        indicator.style.left = `${boardLeft + col * cellSize + cellSize / 2 - 4}px`;
        indicator.style.top = `${boardTop + (9 - row) * cellSize + cellSize / 2 - 4}px`;

        // 添加点击事件
        const onClick = () => {
            this.handleValidMoveClick(indicator);
        };

        this.registerEventListener(indicator, 'click', onClick);

        // 悬停效果
        this.registerEventListener(indicator, 'mouseenter', () => {
            indicator.style.background = 'rgba(0, 255, 0, 0.9)';
            indicator.style.transform = 'scale(1.2)';
        });

        this.registerEventListener(indicator, 'mouseleave', () => {
            indicator.style.background = 'rgba(0, 255, 0, 0.6)';
            indicator.style.transform = 'scale(1)';
        });

        return indicator;
    }

    /**
     * 处理棋盘格子点击
     * @param {HTMLElement} cell - 格子元素
     */
    handleCellClick(cell) {
        if (!this.selectedPiece || !this.moveValidator) return;

        try {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);

            const selectedPieceData = {
                type: this.selectedPiece.dataset.type,
                color: this.selectedPiece.dataset.color,
                row: parseInt(this.selectedPiece.dataset.row),
                col: parseInt(this.selectedPiece.dataset.col)
            };

            // 验证移动是否有效
            if (this.moveValidator.isValidMove(row, col, selectedPieceData, this.gameState)) {
                this.executeMove(this.selectedPiece, row, col);
            } else {
                // 无效移动，清除选择
                this.clearSelection();
            }
        } catch (error) {
            console.error('处理格子点击时出错:', error);
        }
    }

    /**
     * 处理移动指示器点击
     * @param {HTMLElement} target - 移动指示器元素
     */
    handleValidMoveClick(target) {
        if (!this.selectedPiece || !this.moveValidator) return;

        try {
            // 从指示器计算目标位置
            const indicatorRect = target.getBoundingClientRect();
            const boardRect = this.game.board.getBoundingClientRect();

            const col = Math.floor((indicatorRect.left + 4 - boardRect.left - 25) / 50);
            const row = 9 - Math.floor((indicatorRect.top + 4 - boardRect.top - 25) / 50);

            const selectedPieceData = {
                type: this.selectedPiece.dataset.type,
                color: this.selectedPiece.dataset.color,
                row: parseInt(this.selectedPiece.dataset.row),
                col: parseInt(this.selectedPiece.dataset.col)
            };

            // 验证移动
            if (this.moveValidator.isValidMove(row, col, selectedPieceData, this.gameState)) {
                this.executeMove(this.selectedPiece, row, col);
            }
        } catch (error) {
            console.error('处理移动指示器点击时出错:', error);
        }
    }

    /**
     * 执行移动
     * @param {HTMLElement} piece - 要移动的棋子
     * @param {number} targetRow - 目标行
     * @param {number} targetCol - 目标列
     */
    executeMove(piece, targetRow, targetCol) {
        if (!this.game) return;

        try {
            // 检查目标位置是否有敌方棋子
            const targetPiece = this.gameState.getPieceAt(targetRow, targetCol);

            if (targetPiece && targetPiece.color !== piece.dataset.color) {
                // 吃子
                this.tryCapture(piece, targetRow, targetCol);
            } else {
                // 普通移动
                this.tryMove(piece, targetRow, targetCol);
            }

            // 清除选择状态
            this.clearSelection();
        } catch (error) {
            console.error('执行移动时出错:', error);
        }
    }

    /**
     * 尝试移动棋子
     * @param {HTMLElement} piece - 棋子元素
     * @param {number} targetRow - 目标行
     * @param {number} targetCol - 目标列
     */
    tryMove(piece, targetRow, targetCol) {
        if (this.game && typeof this.game.tryMove === 'function') {
            this.game.tryMove(piece, targetRow, targetCol);
        }

        // 音效反馈
        if (this.audioManager) {
            this.audioManager.playPieceMove();
        }
    }

    /**
     * 尝试吃子
     * @param {HTMLElement} piece - 己方棋子
     * @param {number} targetRow - 目标行（可选）
     * @param {number} targetCol - 目标列（可选）
     */
    tryCapture(piece, targetRow, targetCol) {
        if (targetRow !== undefined && targetCol !== undefined && this.game) {
            // 基于位置吃子
            const targetPiece = this.gameState.getPieceAt(targetRow, targetCol);
            if (targetPiece && targetPiece.color !== piece.dataset.color) {
                if (this.game.tryCapture) {
                    this.game.tryCapture(piece, targetRow, targetCol);
                }
            }
        } else if (typeof this.game.tryCapture === 'function') {
            // 直接传入目标棋子元素吃子
            this.game.tryCapture(piece);
        }

        // 音效反馈
        if (this.audioManager) {
            this.audioManager.playPieceCapture();
        }
    }

    /**
     * 注册事件监听器
     * @param {HTMLElement} element - DOM元素
     * @param {string} eventType - 事件类型
     * @param {Function} handler - 事件处理函数
     * @param {Object} options - 事件选项
     * @returns {string} 监听器ID
     */
    registerEventListener(element, eventType, handler, options = {}) {
        if (!element || typeof handler !== 'function') return null;

        const id = `listener_${++this.lastListenerId}`;

        element.addEventListener(eventType, handler, options);

        this.eventListeners.set(id, {
            element,
            eventType,
            handler,
            options
        });

        return id;
    }

    /**
     * 移除事件监听器
     * @param {string} listenerId - 监听器ID
     */
    unregisterEventListener(listenerId) {
        const listenerInfo = this.eventListeners.get(listenerId);
        if (listenerInfo) {
            listenerInfo.element.removeEventListener(
                listenerInfo.eventType,
                listenerInfo.handler,
                listenerInfo.options
            );
            this.eventListeners.delete(listenerId);
        }
    }

    /**
     * 清理所有事件监听器
     */
    cleanupListeners() {
        this.eventListeners.forEach((listenerInfo, id) => {
            listenerInfo.element.removeEventListener(
                listenerInfo.eventType,
                listenerInfo.handler,
                listenerInfo.options
            );
        });
        this.eventListeners.clear();
        this.lastListenerId = 0;
    }

    /**
     * 清除移动指示器
     * @param {HTMLElement} board - 棋盘元素
     */
    clearMoveIndicators(board) {
        if (!board) return;

        const indicators = board.querySelectorAll('.valid-move');
        indicators.forEach(indicator => {
            // 移除相关的事件监听器
            const listenerId = this.findListenerIdForElement(indicator);
            if (listenerId) {
                this.unregisterEventListener(listenerId);
            }

            // 移除DOM元素
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        });
    }

    /**
     * 查找元素对应的监听器ID
     * @param {HTMLElement} element - DOM元素
     * @returns {string|null} 监听器ID
     */
    findListenerIdForElement(element) {
        for (const [id, listenerInfo] of this.eventListeners.entries()) {
            if (listenerInfo.element === element) {
                return id;
            }
        }
        return null;
    }

    /**
     * 设置棋子选中状态
     * @param {HTMLElement} piece - 棋子元素
     */
    setPieceSelection(piece) {
        if (piece) {
            piece.classList.add('selected');
        }
    }

    /**
     * 清除棋子选中状态
     * @param {HTMLElement} piece - 棋子元素
     */
    clearPieceSelection(piece) {
        if (piece) {
            piece.classList.remove('selected');
        }
    }

    /**
     * 启用/禁用事件处理
     * @param {boolean} enabled - 是否启用
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }

    /**
     * 获取当前选中的棋子
     * @returns {HTMLElement|null} 选中的棋子元素
     */
    getSelectedPiece() {
        return this.selectedPiece;
    }

    /**
     * 检查是否有棋子被选中
     * @returns {boolean} 是否有选中状态
     */
    hasSelection() {
        return this.selectedPiece !== null;
    }

    /**
     * 显示提示（如果有相关实现）
     */
    showHint() {
        // 可以在这里实现提示功能
        if (this.game && typeof this.game.showHint === 'function') {
            this.game.showHint();
        }
    }

    /**
     * 切换音频设置
     */
    toggleAudio() {
        if (this.game && typeof this.game.toggleAudio === 'function') {
            this.game.toggleAudio();
        } else if (this.audioManager && typeof this.audioManager.enabled !== 'undefined') {
            this.audioManager.enabled = !this.audioManager.enabled;
        }
    }

    /**
     * 销毁事件处理器
     */
    destroy() {
        this.clearSelection();
        this.cleanupListeners();
        this.selectedPiece = null;
        this.isEnabled = false;
        this.isProcessing = false;
    }
}

// 导出到全局作用域
if (typeof window !== 'undefined') {
    window.UIEventHandler = UIEventHandler;
}

// 导出供模块系统使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UIEventHandler };
}