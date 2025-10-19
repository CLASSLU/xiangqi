/**
 * Mock XiangqiGame for testing
 * 提供简化版的象棋游戏类用于测试环境
 */

function MockXiangqiGame(boardId, recordId) {
    this.boardId = boardId;
    this.recordId = recordId;
    this.pieces = [];
    this.currentPlayer = 'red';
    this.board = document.createElement('div');

    // 添加数据属性到棋子对象
    this.addPieceAttributes = function(piece) {
        // 添加dataset属性用于测试
        piece.dataset = {
            color: piece.color,
            type: piece.type,
            row: piece.row.toString(),
            col: piece.col.toString(),
            id: piece.id
        };

        // 添加style属性用于测试
        piece.style = {
            left: `${piece.col * 60}px`,
            top: `${piece.row * 60}px`
        };

        // 创建DOM元素
        piece.element = document.createElement('div');
        piece.element.className = `piece ${piece.color}`;
        piece.element.textContent = piece.char;
        piece.element.style.cssText = this.getGridPosition(piece.row, piece.col);
        piece.element.dataset = {...piece.dataset};

        // 添加textContent属性用于测试
        piece.textContent = piece.char;

        // 添加remove方法
        piece.remove = function() {
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        };
    };

    // 初始化棋盘
    this.initializeBoard = function() {
        this.pieces = [];
        // 红方棋子
        const redPieces = [
            {type: 'king', color: 'red', row: 9, col: 4, id: 'red-king', char: '帥'},
            {type: 'advisor', color: 'red', row: 9, col: 3, id: 'red-advisor-1', char: '仕'},
            {type: 'advisor', color: 'red', row: 9, col: 5, id: 'red-advisor-2', char: '仕'},
            {type: 'elephant', color: 'red', row: 9, col: 2, id: 'red-elephant-1', char: '相'},
            {type: 'elephant', color: 'red', row: 9, col: 6, id: 'red-elephant-2', char: '相'},
            {type: 'horse', color: 'red', row: 9, col: 1, id: 'red-horse-1', char: '馬'},
            {type: 'horse', color: 'red', row: 9, col: 7, id: 'red-horse-2', char: '馬'},
            {type: 'rook', color: 'red', row: 9, col: 0, id: 'red-rook-1', char: '車'},
            {type: 'rook', color: 'red', row: 9, col: 8, id: 'red-rook-2', char: '車'},
            {type: 'cannon', color: 'red', row: 7, col: 1, id: 'red-cannon-1', char: '炮'},
            {type: 'cannon', color: 'red', row: 7, col: 7, id: 'red-cannon-2', char: '炮'},
            {type: 'soldier', color: 'red', row: 6, col: 0, id: 'red-soldier-1', char: '兵'},
            {type: 'soldier', color: 'red', row: 6, col: 2, id: 'red-soldier-2', char: '兵'},
            {type: 'soldier', color: 'red', row: 6, col: 4, id: 'red-soldier-3', char: '兵'},
            {type: 'soldier', color: 'red', row: 6, col: 6, id: 'red-soldier-4', char: '兵'},
            {type: 'soldier', color: 'red', row: 6, col: 8, id: 'red-soldier-5', char: '兵'}
        ];

        // 黑方棋子
        const blackPieces = [
            {type: 'king', color: 'black', row: 0, col: 4, id: 'black-king', char: '將'},
            {type: 'advisor', color: 'black', row: 0, col: 3, id: 'black-advisor-1', char: '士'},
            {type: 'advisor', color: 'black', row: 0, col: 5, id: 'black-advisor-2', char: '士'},
            {type: 'elephant', color: 'black', row: 0, col: 2, id: 'black-elephant-1', char: '象'},
            {type: 'elephant', color: 'black', row: 0, col: 6, id: 'black-elephant-2', char: '象'},
            {type: 'horse', color: 'black', row: 0, col: 1, id: 'black-horse-1', char: '馬'},
            {type: 'horse', color: 'black', row: 0, col: 7, id: 'black-horse-2', char: '馬'},
            {type: 'rook', color: 'black', row: 0, col: 0, id: 'black-rook-1', char: '車'},
            {type: 'rook', color: 'black', row: 0, col: 8, id: 'black-rook-2', char: '車'},
            {type: 'cannon', color: 'black', row: 2, col: 1, id: 'black-cannon-1', char: '砲'},
            {type: 'cannon', color: 'black', row: 2, col: 7, id: 'black-cannon-2', char: '砲'},
            {type: 'soldier', color: 'black', row: 3, col: 0, id: 'black-soldier-1', char: '卒'},
            {type: 'soldier', color: 'black', row: 3, col: 2, id: 'black-soldier-2', char: '卒'},
            {type: 'soldier', color: 'black', row: 3, col: 4, id: 'black-soldier-3', char: '卒'},
            {type: 'soldier', color: 'black', row: 3, col: 6, id: 'black-soldier-4', char: '卒'},
            {type: 'soldier', color: 'black', row: 3, col: 8, id: 'black-soldier-5', char: '卒'}
        ];

        // 合并并为每个棋子添加属性
        [...redPieces, ...blackPieces].forEach(piece => {
            this.addPieceAttributes(piece);
            this.pieces.push(piece);
            if (this.board) {
                this.board.appendChild(piece.element);
            }
        });
    };

    // 创建棋子
    this.createPiece = function(options) {
        const piece = {
            type: options.type,
            color: options.color,
            row: options.row,
            col: options.col,
            id: options.id || `${options.color}-${options.type}-${Date.now()}`,
            char: options.char || options.type,
            remove: function() {
                // 模拟DOM移除
                if (this.element && this.element.parentNode) {
                    this.element.parentNode.removeChild(this.element);
                }
            }
        };

        // 创建DOM元素
        piece.element = document.createElement('div');
        piece.element.className = `piece ${piece.color}`;
        piece.element.textContent = piece.char;
        piece.element.style.cssText = this.getGridPosition(piece.row, piece.col);

        // 添加dataset属性用于测试
        piece.element.dataset = {
            color: piece.color,
            type: piece.type,
            row: piece.row.toString(),
            col: piece.col.toString(),
            id: piece.id
        };

        // 直接在piece对象上添加dataset属性
        piece.dataset = {
            color: piece.color,
            type: piece.type,
            row: piece.row.toString(),
            col: piece.col.toString(),
            id: piece.id
        };

        // 添加style属性用于测试
        piece.style = {
            left: `${piece.col * 60}px`,
            top: `${piece.row * 60}px`
        };

        // 添加textContent属性用于测试
        piece.textContent = piece.char;

        // 注意：不在这里push，让调用者控制
        if (this.board) {
            this.board.appendChild(piece.element);
        }

        return piece;
    };

    // 获取网格位置样式
    this.getGridPosition = function(row, col) {
        const baseSize = 60;
        const top = row * baseSize;
        const left = col * baseSize;
        return `position: absolute; top: ${top}px; left: ${left}px;`;
    };

    // 获取有效移动
    this.getValidMoves = function(pieceType, color, row, col) {
        const moves = [];

        switch (pieceType) {
            case 'soldier': // 兵/卒
                if (color === 'red') {
                    if (row > 0) moves.push([row - 1, col]); // 向前
                    if (row <= 4) { // 过河可以横移
                        if (col > 0) moves.push([row, col - 1]);
                        if (col < 8) moves.push([row, col + 1]);
                    }
                } else { // black
                    if (row < 9) moves.push([row + 1, col]); // 向前
                    if (row >= 5) { // 过河可以横移
                        if (col > 0) moves.push([row, col - 1]);
                        if (col < 8) moves.push([row, col + 1]);
                    }
                }
                break;

            case 'king': // 将/帅
                const kingMoves = [
                    [row - 1, col], [row + 1, col],
                    [row, col - 1], [row, col + 1]
                ];

                kingMoves.forEach(([r, c]) => {
                    if (color === 'black') {
                        if (r >= 0 && r <= 2 && c >= 3 && c <= 5) {
                            moves.push([r, c]);
                        }
                    } else {
                        if (r >= 7 && r <= 9 && c >= 3 && c <= 5) {
                            moves.push([r, c]);
                        }
                    }
                });
                break;

            case 'advisor': // 士/仕
                const advisorMoves = [
                    [row - 1, col - 1], [row - 1, col + 1],
                    [row + 1, col - 1], [row + 1, col + 1]
                ];

                advisorMoves.forEach(([r, c]) => {
                    if (color === 'black') {
                        if (r >= 0 && r <= 2 && c >= 3 && c <= 5) {
                            moves.push([r, c]);
                        }
                    } else {
                        if (r >= 7 && r <= 9 && c >= 3 && c <= 5) {
                            moves.push([r, c]);
                        }
                    }
                });
                break;

            case 'elephant': // 象/相
                const elephantMoves = [
                    [row - 2, col - 2], [row - 2, col + 2],
                    [row + 2, col - 2], [row + 2, col + 2]
                ];

                elephantMoves.forEach(([r, c]) => {
                    // 象不能过河
                    if (color === 'red' && r >= 5 && r <= 9 && c >= 0 && c <= 8) {
                        moves.push([r, c]);
                    } else if (color === 'black' && r >= 0 && r <= 4 && c >= 0 && c <= 8) {
                        moves.push([r, c]);
                    }
                });
                break;

            case 'horse': // 马
                const horseMoves = [
                    [row - 2, col - 1], [row - 2, col + 1],
                    [row - 1, col - 2], [row - 1, col + 2],
                    [row + 1, col - 2], [row + 1, col + 2],
                    [row + 2, col - 1], [row + 2, col + 1]
                ];

                horseMoves.forEach(([r, c]) => {
                    if (r >= 0 && r < 10 && c >= 0 && c < 9) {
                        moves.push([r, c]);
                    }
                });
                break;

            case 'rook': // 车
                for (let i = 1; i < 10; i++) {
                    if (row + i < 10) moves.push([row + i, col]); // 下
                    if (row - i >= 0) moves.push([row - i, col]); // 上
                    if (col + i < 9) moves.push([row, col + i]); // 右
                    if (col - i >= 0) moves.push([row, col - i]); // 左
                }
                break;

            case 'cannon': // 炮
                for (let i = 1; i < 10; i++) {
                    if (row + i < 10) moves.push([row + i, col]);
                    if (row - i >= 0) moves.push([row - i, col]);
                    if (col + i < 9) moves.push([row, col + i]);
                    if (col - i >= 0) moves.push([row, col - i]);
                }
                break;
        }

        // 过滤超出棋盘的移动
        return moves.filter(([r, c]) => r >= 0 && r < 10 && c >= 0 && c < 9);
    };

    // 检查是否在将军状态
    this.isInCheck = function(color) {
        const king = this.pieces.find(p => p.type === 'king' && p.color === color);
        if (!king) return false;

        const enemyRooks = this.pieces.filter(p => p.type === 'rook' && p.color !== color);
        return enemyRooks.some(rook => {
            return (rook.row === king.row || rook.col === king.col);
        });
    };

    // 检查将帅是否照面
    this.isKingFacing = function() {
        const redKing = this.pieces.find(p => p.type === 'king' && p.color === 'red');
        const blackKing = this.pieces.find(p => p.type === 'king' && p.color === 'black');

        if (!redKing || !blackKing) return false;
        if (redKing.col !== blackKing.col) return false;

        // 检查两个国王之间是否有阻挡
        for (let row = Math.min(redKing.row, blackKing.row) + 1;
             row < Math.max(redKing.row, blackKing.row); row++) {
            if (this.pieces.some(p => p.row === row && p.col === redKing.col && p.type !== 'king')) {
                return false;
            }
        }

        return true;
    };

    // 获取指定位置的棋子
    this.getPieceAt = function(row, col) {
        return this.pieces.find(p => p.row === row && p.col === col) || null;
    };

    // 检查游戏是否结束
    this.checkGameOver = function() {
        const redKing = this.pieces.find(p => p.type === 'king' && p.color === 'red');
        const blackKing = this.pieces.find(p => p.type === 'king' && p.color === 'black');

        if (!redKing) {
            this.gameOver = true;
            this.winner = 'black';
        } else if (!blackKing) {
            this.gameOver = true;
            this.winner = 'red';
        }
    };

    // 吃子 - 支持传棋子对象或坐标
    this.capturePiece = function(pieceOrRow, col) {
        let targetPiece;

        if (typeof pieceOrRow === 'object' && pieceOrRow !== null) {
            // 传入的是棋子对象
            targetPiece = pieceOrRow;
        } else {
            // 传入的是坐标
            const row = pieceOrRow;
            targetPiece = this.pieces.find(p => p.row === row && p.col === col);
        }

        if (targetPiece) {
            const pieceIndex = this.pieces.indexOf(targetPiece);
            if (pieceIndex !== -1) {
                this.pieces.splice(pieceIndex, 1);
                if (targetPiece.element && targetPiece.element.parentNode) {
                    targetPiece.element.parentNode.removeChild(targetPiece.element);
                }

                // 添加到俘获数组
                if (targetPiece.color === 'black') {
                    this.capturedBlack.push(targetPiece.char);
                } else {
                    this.capturedRed.push(targetPiece.char);
                }

                return targetPiece;
            }
        }
        return null;
    };

    // 重置游戏
    this.resetGame = function() {
        this.gameOver = false;
        this.winner = null;
        this.currentPlayer = 'red';
        this.moveHistory = [];
        this.capturedRed = [];
        this.capturedBlack = [];
        this.initializeBoard();
    };

    // 设置名局功能 - 移除经典棋局，重定向到分类面板
    this.setupFamousGame = async function(gameName) {
        // 直接重定向到爬取的棋谱分类数据
        await this.showClassificationPanel();
    };

    // 显示记录面板
    this.showRecordPanel = async function() {
        // Mock UI method - 在测试环境中模拟显示面板
        await this.showClassificationPanel();
        return true;
    };

    // 设置固定游戏按钮
    this.setupFixedGameButtons = function() {
        // Mock UI method - 在测试环境中模拟设置按钮
        if (typeof document !== 'undefined') {
            const recordButtons = document.getElementById('recordButtons');
            if (recordButtons) {
                recordButtons.innerHTML = '<div class="loading-message">正在加载棋谱分类...</div>';
            }
        }
        return true;
    };

    // 显示分类面板
    this.showClassificationPanel = async function() {
        // Mock UI method - 在测试环境中模拟显示分类面板
        if (this.loadClassifiedGameDatabase) {
            await this.loadClassifiedGameDatabase();
        }
        return true;
    };

    // 加载并播放经典游戏 - 重定向到爬取的棋谱分类数据
    this.loadAndPlayClassicGame = async function(gameIndex) {
        // 直接重定向到爬取的棋谱分类数据
        await this.showClassificationPanel();
        return { success: true, gameIndex: gameIndex };
    };

    // 加载分类游戏数据库
    this.loadClassifiedGameDatabase = async function() {
        // Mock method - 在测试环境中模拟数据加载
        return Promise.resolve(null);
    };

    // 加载并播放棋谱数据（用于真实数据测试）
    this.loadAndPlayClassicGameWithData = function(title, moves) {
        this.resetGame();
        this.gamePhase = 'demonstration';

        if (!moves || !Array.isArray(moves)) {
            return true;
        }

        moves.forEach(moveData => {
            // 验证数据格式
            if (moveData && moveData.color && moveData.pieceType &&
                moveData.fromPos && moveData.toPos && moveData.notation) {
                this.moveHistory.push({
                    pieceType: moveData.pieceType,
                    pieceColor: moveData.color,
                    from: moveData.fromPos,
                    to: moveData.toPos,
                    notation: moveData.notation
                });
            }
        });

        return true;
    };

    // 初始化游戏（用于真实数据测试）
    this.initializeGame = function() {
        this.resetGame();
    };

    // 游戏阶段
    this.gamePhase = 'playing';

    // 游戏状态初始化
    this.gameOver = false;
    this.winner = null;
    this.moveHistory = [];
    this.capturedRed = [];
    this.capturedBlack = [];

    // 初始化
    this.initializeBoard();
}

module.exports = { MockXiangqiGame };