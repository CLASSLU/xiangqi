/**
 * BoardRenderer - 棋盘渲染模块
 * 负责棋盘绘制、棋子创建、位置标记等渲染功能
 */

class BoardRenderer {
    constructor(xiangqiGame) {
        this.game = xiangqiGame;
        this.board = null;
        this.cellSize = 70; // 标准格子大小
    }

    /**
     * 创建棋盘
     * @param {HTMLElement} container - 棋盘容器
     * @param {number} size - 格子大小
     */
    createBoard(container, size = 70) {
        this.board = container || this.game.board;
        this.cellSize = size;

        if (!this.board) {
            console.warn('棋盘容器不存在');
            return;
        }

        // 创建棋盘格子
        this.createBoardCells();
        this.drawChessBoardLines();
        this.drawPalaceDiagonals();
        this.addPositionMarks();
        this.createRiverElement();

        console.log('✅ 棋盘创建完成');
    }

    /**
     * 创建棋盘格子
     */
    createBoardCells() {
        const rows = 10;
        const cols = 9;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.style.position = 'absolute';
                cell.style.left = col * this.cellSize + 'px';
                cell.style.top = row * this.cellSize + 'px';
                cell.style.width = this.cellSize + 'px';
                cell.style.height = this.cellSize + 'px';

                this.board.appendChild(cell);
            }
        }
    }

    /**
     * 绘制棋盘线条
     */
    drawChessBoardLines() {
        // 横线
        for (let row = 0; row < 10; row++) {
            const line = document.createElement('div');
            line.className = 'board-line horizontal';
            line.style.position = 'absolute';
            line.style.left = '0px';
            line.style.top = row * this.cellSize + 'px';
            line.style.width = (8 * this.cellSize) + 'px';
            line.style.height = '2px';
            line.style.backgroundColor = '#000000';
            this.board.appendChild(line);
        }

        // 竖线（河界处断开）
        for (let col = 0; col < 9; col++) {
            // 上半部分竖线
            const topLine = document.createElement('div');
            topLine.className = 'board-line vertical-top';
            topLine.style.position = 'absolute';
            topLine.style.left = col * this.cellSize + 'px';
            topLine.style.top = '0px';
            topLine.style.width = '2px';
            topLine.style.height = (4 * this.cellSize) + 'px';
            topLine.style.backgroundColor = '#000000';
            this.board.appendChild(topLine);

            // 下半部分竖线
            const bottomLine = document.createElement('div');
            bottomLine.className = 'board-line vertical-bottom';
            bottomLine.style.position = 'absolute';
            bottomLine.style.left = col * this.cellSize + 'px';
            bottomLine.style.top = (5 * this.cellSize) + 'px';
            bottomLine.style.width = '2px';
            bottomLine.style.height = (4 * this.cellSize) + 'px';
            bottomLine.style.backgroundColor = '#000000';
            this.board.appendChild(bottomLine);
        }

        // 边线竖线（完整）
        for (let col of [0, 8]) {
            const sideLine = document.createElement('div');
            sideLine.className = 'board-line vertical-side';
            sideLine.style.position = 'absolute';
            sideLine.style.left = col * this.cellSize + 'px';
            sideLine.style.top = '0px';
            sideLine.style.width = '2px';
            sideLine.style.height = (9 * this.cellSize) + 'px';
            sideLine.style.backgroundColor = '#000000';
            this.board.appendChild(sideLine);
        }
    }

    /**
     * 绘制九宫格对角线
     */
    drawPalaceDiagonals() {
        if (!this.board) return;

        const lineColor = '#000000';
        const lineWidth = '2px';

        // 中国象棋九宫格对角线
        // 黑方九宫格：行0-2，列3-5 （上方）
        this.drawDiagonalLine(3, 0, 5, 2, lineColor, lineWidth); // 黑方左上到右下
        this.drawDiagonalLine(5, 0, 3, 2, lineColor, lineWidth); // 黑方右上到左下

        // 红方九宫格：行7-9，列3-5 （下方）
        this.drawDiagonalLine(3, 7, 5, 9, lineColor, lineWidth); // 红方左上到右下
        this.drawDiagonalLine(5, 7, 3, 9, lineColor, lineWidth); // 红方右上到左下
    }

    /**
     * 绘制对角线的辅助方法
     * @param {number} startCol - 起始列
     * @param {number} startRow - 起始行
     * @param {number} endCol - 结束列
     * @param {number} endRow - 结束行
     * @param {string} color - 线条颜色
     * @param {string} width - 线条宽度
     */
    drawDiagonalLine(startCol, startRow, endCol, endRow, color, width) {
        const startX = startCol * this.cellSize;
        const startY = startRow * this.cellSize;
        const endX = endCol * this.cellSize;
        const endY = endRow * this.cellSize;

        const line = document.createElement('div');
        line.className = 'diagonal-line';
        line.style.position = 'absolute';
        line.style.left = startX + 'px';
        line.style.top = startY + 'px';

        // 计算差值
        const deltaX = endX - startX;
        const deltaY = endY - startY;

        // 计算线条长度和角度
        const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;

        // 设置线条样式
        line.style.width = length + 'px';
        line.style.height = width;
        line.style.backgroundColor = color;
        line.style.transformOrigin = '0 0';
        line.style.transform = `rotate(${angle}deg)`;
        line.style.pointerEvents = 'none';
        line.style.zIndex = '2';

        this.board.appendChild(line);
    }

    /**
     * 添加位置标记
     */
    addPositionMarks() {
        this._addCannonAndSoldierMarks();
        this._addRiverMarks();
    }

    /**
     * 添加炮位和兵位标记
     */
    _addCannonAndSoldierMarks() {
        const cannonPositions = [
            [2, 1], [2, 7], [7, 1], [7, 7]  // 炮位
        ];

        const soldierPositions = [
            [3, 0], [3, 2], [3, 4], [3, 6], [3, 8],  // 黑方兵位
            [6, 0], [6, 2], [6, 4], [6, 6], [6, 8]   // 红方兵位
        ];

        cannonPositions.forEach(([row, col]) => {
            this.addCannonMark(row, col);
        });

        soldierPositions.forEach(([row, col]) => {
            this.addSoldierMark(row, col);
        });
    }

    /**
     * 添加炮位十字标记
     * @param {number} row - 行
     * @param {number} col - 列
     */
    addCannonMark(row, col) {
        if (!this.board) return;

        const mark = document.createElement('div');
        mark.className = 'cannon-cross';
        mark.style.position = 'absolute';
        mark.style.left = (col * this.cellSize - 10) + 'px';  // 居中对齐
        mark.style.top = (row * this.cellSize - 10) + 'px';   // 居中对齐
        mark.style.pointerEvents = 'none';
        mark.style.zIndex = '3';
        this.board.appendChild(mark);
    }

    /**
     * 添加兵位十字标记
     * @param {number} row - 行
     * @param {number} col - 列
     */
    addSoldierMark(row, col) {
        if (!this.board) return;

        const mark = document.createElement('div');
        mark.className = 'soldier-cross';
        mark.style.position = 'absolute';
        mark.style.left = (col * this.cellSize - 8) + 'px';  // 居中对齐
        mark.style.top = (row * this.cellSize - 8) + 'px';   // 居中对齐
        mark.style.pointerEvents = 'none';
        mark.style.zIndex = '3';
        this.board.appendChild(mark);
    }

    /**
     * 添加河界标记
     */
    _addRiverMarks() {
        const riverLabel = document.createElement('div');
        riverLabel.className = 'river-label';
        riverLabel.style.position = 'absolute';
        riverLabel.style.left = (1 * this.cellSize) + 'px';
        riverLabel.style.top = (4.35 * this.cellSize) + 'px';
        riverLabel.style.width = (6 * this.cellSize) + 'px';
        riverLabel.style.height = (0.3 * this.cellSize) + 'px';
        riverLabel.style.textAlign = 'center';
        riverLabel.style.fontSize = '20px';
        riverLabel.style.color = '#8B4513';
        riverLabel.style.fontWeight = 'bold';
        riverLabel.style.pointerEvents = 'none';
        riverLabel.style.zIndex = '3';
        riverLabel.textContent = '楚河     汉界';
        this.board.appendChild(riverLabel);
    }

    /**
     * 创建河界元素
     */
    createRiverElement() {
        if (!this.board) return;

        const river = document.createElement('div');
        river.className = 'river';
        river.style.position = 'absolute';
        river.style.left = '0px';
        river.style.top = (4 * this.cellSize) + 'px';
        river.style.width = (8 * this.cellSize) + 'px';
        river.style.height = this.cellSize + 'px';
        river.style.backgroundColor = '#f0e68c';
        river.style.opacity = '0.3';
        river.style.zIndex = '1';
        this.board.appendChild(river);
    }

    /**
     * 设置棋子
     * @param {Array} pieces - 棋子数组
     */
    setupPieces(pieces) {
        if (!pieces) {
            pieces = this._getDefaultPieceSetup();
        }

        // 使用BoardRenderer的createPiece方法创建棋子，但保持game.pieces数组
        this.game.pieces = pieces.map(piece => {
            // 如果game的createPiece方法可用，使用它；否则使用BoardRenderer的
            if (typeof this.game.createPiece === 'function') {
                return this.game.createPiece(piece);
            } else {
                return this.createPiece(piece);
            }
        });
        console.log(`✅ 棋子设置完成，共${this.game.pieces.length}个棋子`);
    }

    /**
     * 获取默认棋子设置
     */
    _getDefaultPieceSetup() {
        return [
            // 黑方棋子
            { type: 'rook', color: 'black', row: 0, col: 0, char: '車' },
            { type: 'horse', color: 'black', row: 0, col: 1, char: '馬' },
            { type: 'elephant', color: 'black', row: 0, col: 2, char: '象' },
            { type: 'advisor', color: 'black', row: 0, col: 3, char: '士' },
            { type: 'king', color: 'black', row: 0, col: 4, char: '將' },
            { type: 'advisor', color: 'black', row: 0, col: 5, char: '士' },
            { type: 'elephant', color: 'black', row: 0, col: 6, char: '象' },
            { type: 'horse', color: 'black', row: 0, col: 7, char: '馬' },
            { type: 'rook', color: 'black', row: 0, col: 8, char: '車' },
            { type: 'cannon', color: 'black', row: 2, col: 1, char: '砲' },
            { type: 'cannon', color: 'black', row: 2, col: 7, char: '砲' },
            { type: 'soldier', color: 'black', row: 3, col: 0, char: '卒' },
            { type: 'soldier', color: 'black', row: 3, col: 2, char: '卒' },
            { type: 'soldier', color: 'black', row: 3, col: 4, char: '卒' },
            { type: 'soldier', color: 'black', row: 3, col: 6, char: '卒' },
            { type: 'soldier', color: 'black', row: 3, col: 8, char: '卒' },

            // 红方棋子
            { type: 'rook', color: 'red', row: 9, col: 0, char: '車' },
            { type: 'horse', color: 'red', row: 9, col: 1, char: '馬' },
            { type: 'elephant', color: 'red', row: 9, col: 2, char: '相' },
            { type: 'advisor', color: 'red', row: 9, col: 3, char: '仕' },
            { type: 'king', color: 'red', row: 9, col: 4, char: '帥' },
            { type: 'advisor', color: 'red', row: 9, col: 5, char: '仕' },
            { type: 'elephant', color: 'red', row: 9, col: 6, char: '相' },
            { type: 'horse', color: 'red', row: 9, col: 7, char: '馬' },
            { type: 'rook', color: 'red', row: 9, col: 8, char: '車' },
            { type: 'cannon', color: 'red', row: 7, col: 1, char: '炮' },
            { type: 'cannon', color: 'red', row: 7, col: 7, char: '炮' },
            { type: 'soldier', color: 'red', row: 6, col: 0, char: '兵' },
            { type: 'soldier', color: 'red', row: 6, col: 2, char: '兵' },
            { type: 'soldier', color: 'red', row: 6, col: 4, char: '兵' },
            { type: 'soldier', color: 'red', row: 6, col: 6, char: '兵' },
            { type: 'soldier', color: 'red', row: 6, col: 8, char: '兵' }
        ];
    }

    /**
     * 创建棋子
     * @param {Object} pieceData - 棋子数据
     */
    createPiece(pieceData) {
        if (!this.board) {
            console.warn('棋盘未初始化，无法创建棋子');
            return null;
        }

        const piece = document.createElement('div');
        piece.className = 'piece';
        piece.dataset.type = pieceData.type;
        piece.dataset.color = pieceData.color;
        piece.dataset.row = pieceData.row;
        piece.dataset.col = pieceData.col;
        piece.textContent = pieceData.char;

        // 设置棋子样式
        this._applyPieceStyles(piece, pieceData);

        // 添加事件监听器
        this._addPieceEventListeners(piece);

        this.board.appendChild(piece);
        return piece;
    }

    /**
     * 应用棋子样式
     * @param {HTMLElement} piece - 棋子元素
     * @param {Object} pieceData - 棋子数据
     */
    _applyPieceStyles(piece, pieceData) {
        const isRed = pieceData.color === 'red';

        piece.style.position = 'absolute';
        piece.style.left = pieceData.col * this.cellSize + 'px';
        piece.style.top = pieceData.row * this.cellSize + 'px';
        piece.style.width = (this.cellSize - 10) + 'px';
        piece.style.height = (this.cellSize - 10) + 'px';
        piece.style.margin = '5px';
        piece.style.borderRadius = '50%';
        piece.style.display = 'flex';
        piece.style.alignItems = 'center';
        piece.style.justifyContent = 'center';
        piece.style.fontSize = '24px';
        piece.style.fontWeight = 'bold';
        piece.style.cursor = 'pointer';
        piece.style.userSelect = 'none';

        // 颜色设置
        if (isRed) {
            piece.style.backgroundColor = '#ff6b6b';
            piece.style.color = '#8B0000';
            piece.style.border = '2px solid #8B0000';
        } else {
            piece.style.backgroundColor = '#4a4a4a';
            piece.style.color = '#ffffff';
            piece.style.border = '2px solid #000000';
        }

        piece.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
        piece.style.zIndex = '10';
    }

    /**
     * 添加棋子事件监听器
     * @param {HTMLElement} piece - 棋子元素
     */
    _addPieceEventListeners(piece) {
        // 添加点击事件
        piece.addEventListener('click', (e) => {
            if (this.game.handlePieceClick) {
                this.game.handlePieceClick(piece);
            }
        });

        // 添加悬停效果
        piece.addEventListener('mouseenter', () => {
            if (this.game.selectedPiece !== piece) {
                piece.style.transform = 'scale(1.05)';
                piece.style.boxShadow = '0 4px 10px rgba(0,0,0,0.5)';
            }
        });

        piece.addEventListener('mouseleave', () => {
            if (this.game.selectedPiece !== piece) {
                piece.style.transform = 'scale(1)';
                piece.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
            }
        });
    }

    /**
     * 高亮选中的棋子
     * @param {HTMLElement} piece - 要高亮的棋子
     */
    highlightPiece(piece) {
        if (!piece) return;

        piece.style.border = '3px solid #ffff00';
        piece.style.boxShadow = '0 0 15px rgba(255,255,0,0.7)';
        piece.style.transform = 'scale(1.1)';
    }

    /**
     * 取消棋子高亮
     * @param {HTMLElement} piece - 要取消高亮的棋子
     */
    unhighlightPiece(piece) {
        if (!piece) return;

        const isRed = piece.dataset.color === 'red';
        piece.style.border = isRed ? '2px solid #8B0000' : '2px solid #000000';
        piece.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
        piece.style.transform = 'scale(1)';
    }

    /**
     * 清除所有高亮
     */
    clearAllHighlights() {
        if (this.game && this.game.pieces) {
            this.game.pieces.forEach(piece => {
                this.unhighlightPiece(piece);
            });
        }
        // 同时清除移动指示器
        this.clearMoveIndicators();
    }

    /**
     * 显示有效移动位置
     * @param {Array} positions - 有效位置数组
     */
    showValidMoves(positions) {
        if (!positions || !Array.isArray(positions)) return;

        positions.forEach(([row, col]) => {
            const indicator = document.createElement('div');
            indicator.className = 'move-indicator';
            indicator.style.position = 'absolute';
            indicator.style.left = (col * this.cellSize + this.cellSize / 2 - 15) + 'px';
            indicator.style.top = (row * this.cellSize + this.cellSize / 2 - 15) + 'px';
            indicator.style.width = '30px';
            indicator.style.height = '30px';
            indicator.style.borderRadius = '50%';
            indicator.style.backgroundColor = 'rgba(0,255,0,0.5)';
            indicator.style.border = '2px solid #00ff00';
            indicator.style.pointerEvents = 'auto';
            indicator.style.cursor = 'pointer';
            indicator.style.zIndex = '5';

            // 添加点击事件
            indicator.addEventListener('click', () => {
                if (this.game.handleValidMoveClick) {
                    this.game.handleValidMoveClick(indicator);
                }
            });

            this.board.appendChild(indicator);
        });
    }

    /**
     * 清除所有移动指示器
     */
    clearMoveIndicators() {
        if (!this.board) return;

        const indicators = this.board.querySelectorAll('.move-indicator');
        indicators.forEach(indicator => indicator.remove());
    }

    /**
     * 获取棋子汉字
     * @param {string} type - 棋子类型
     * @param {string} color - 棋子颜色
     */
    getPieceCharacter(type, color) {
        const pieces = {
            'red': {
                'king': '帥', 'advisor': '仕', 'elephant': '相',
                'horse': '馬', 'rook': '車', 'cannon': '炮', 'soldier': '兵'
            },
            'black': {
                'king': '將', 'advisor': '士', 'elephant': '象',
                'horse': '馬', 'rook': '車', 'cannon': '砲', 'soldier': '卒'
            }
        };

        return pieces[color]?.[type] || type;
    }

    /**
     * 移动棋子动画
     * @param {HTMLElement} piece - 棋子元素
     * @param {number} toRow - 目标行
     * @param {number} toCol - 目标列
     */
    animatePieceMove(piece, toRow, toCol) {
        if (!piece) return;

        piece.style.transition = 'all 0.3s ease-in-out';
        piece.style.left = toCol * this.cellSize + 'px';
        piece.style.top = toRow * this.cellSize + 'px';
        piece.dataset.row = toRow;
        piece.dataset.col = toCol;

        // 动画完成后移除transition
        setTimeout(() => {
            piece.style.transition = '';
        }, 300);
    }
}

// 导出模块
if (typeof window !== 'undefined') {
    window.BoardRenderer = BoardRenderer;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BoardRenderer;
}