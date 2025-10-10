/**
 * MoveValidator 模块
 * 专门负责中国象棋移动验证的核心逻辑
 * 包括将军检测、有效移动计算、移动规则验证
 */

class MoveValidator {
    constructor(dependencies = {}) {
        // 注入依赖（主要是chessGame的实例用于某些辅助方法）
        this.chessGame = dependencies.chessGame || null;
    }

    /**
     * 检测指定颜色是否被将军
     * @param {string} color - 'red' 或 'black'
     * @param {Object} gameState - 游戏状态对象
     * @returns {boolean} 是否被将军
     */
    isInCheck(color, gameState) {
        // 找到将/帅的位置
        let kingPos = null;
        for (const [key, piece] of gameState.pieceIndex.entries()) {
            if (piece.type === 'king' && piece.color === color) {
                kingPos = {
                    row: piece.row,
                    col: piece.col
                };
                break;
            }
        }

        // 如果找不到将/帅，返回false
        if (!kingPos) return false;

        // 检查是否有敌方棋子可以攻击到将/帅
        const enemyColor = color === 'red' ? 'black' : 'red';
        for (const [key, enemyPiece] of gameState.pieceIndex.entries()) {
            if (enemyPiece.color === enemyColor) {
                // 获取敌方棋子的所有可能移动
                const enemyMoves = this.getValidMoves(
                    enemyPiece.type,
                    enemyPiece.color,
                    enemyPiece.row,
                    enemyPiece.col,
                    gameState
                );

                // 检查是否有移动可以攻击到将/帅
                for (const [moveRow, moveCol] of enemyMoves) {
                    if (moveRow === kingPos.row && moveCol === kingPos.col) {
                        return true; // 被将军
                    }
                }
            }
        }

        return false; // 没有被将军
    }

    /**
     * 获取棋子的有效移动列表
     * @param {string} type - 棋子类型
     * @param {string} color - 棋子颜色
     * @param {number} row - 当前行
     * @param {number} col - 当前列
     * @param {Object} gameState - 游戏状态
     * @returns {Array} 有效移动数组 [[row1, col1], [row2, col2], ...]
     */
    getValidMoves(type, color, row, col, gameState) {
        const moves = [];

        switch (type) {
            case 'king':
                return this.getKingMoves(row, col, color, gameState);

            case 'advisor':
                return this.getAdvisorMoves(row, col, color, gameState);

            case 'elephant':
                return this.getElephantMoves(row, col, color, gameState);

            case 'horse':
                return this.getHorseMoves(row, col, color, gameState);

            case 'rook':
                return this.getRookMoves(row, col, color, gameState);

            case 'cannon':
                return this.getCannonMoves(row, col, color, gameState);

            case 'soldier':
                return this.getSoldierMoves(row, col, color, gameState);

            default:
                return [];
        }
    }

    /**
     * 将/帅的移动规则
     */
    getKingMoves(row, col, color, gameState) {
        const moves = [];

        // 基本四个方向移动
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (const [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;

            // 检查是否在宫内
            if (this.isInPalace(newRow, newCol, color)) {
                // 检查目标位置是否有己方棋子
                if (!gameState.isOwnPieceAt(newRow, newCol, color)) {
                    moves.push([newRow, newCol]);
                }
            }
        }

        // 检查将帅照面（对面将帅在同一直线且中间无棋子）
        this.addKingFaceToFaceMoves(moves, row, col, color, gameState);

        return moves;
    }

    /**
     * 士的移动规则
     */
    getAdvisorMoves(row, col, color, gameState) {
        const moves = [];

        // 土的移动：斜走一格
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

        for (const [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;

            // 检查是否在宫内
            if (this.isInPalace(newRow, newCol, color)) {
                // 检查目标位置是否有己方棋子
                if (!gameState.isOwnPieceAt(newRow, newCol, color)) {
                    moves.push([newRow, newCol]);
                }
            }
        }

        return moves;
    }

    /**
     * 相/象的移动规则
     */
    getElephantMoves(row, col, color, gameState) {
        const moves = [];

        // 相/象的移动：走田字（2x2对角）
        const directions = [[-2, -2], [-2, 2], [2, -2], [2, 2]];

        for (const [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;
            const midRow = row + dRow / 2; // 田字中心
            const midCol = col + dCol / 2;

            // 检查目标位置是否有效
            if (newRow >= 0 && newRow <= 9 && newCol >= 0 && newCol <= 8) {
                // 检查是否过河
                if (!this.isAcrossRiver(newRow, color)) {
                    // 检查田字中心是否有棋子（塞象眼）
                    if (!gameState.getPieceAt(midRow, midCol)) {
                        // 检查目标位置是否有己方棋子
                        if (!gameState.isOwnPieceAt(newRow, newCol, color)) {
                            moves.push([newRow, newCol]);
                        }
                    }
                }
            }
        }

        return moves;
    }

    /**
     * 马的移动规则
     */
    getHorseMoves(row, col, color, gameState) {
        const moves = [];

        // 马的移动：日字
        const movePatterns = [
            [-2, -1], [-2, 1],  // 向上
            [-1, -2], [-1, 2],  // 向左上
            [1, -2], [1, 2],    // 向左下
            [2, -1], [2, 1]     // 向下
        ];

        for (const [dRow, dCol] of movePatterns) {
            const newRow = row + dRow;
            const newCol = col + dCol;

            // 检查目标位置是否在棋盘内
            if (newRow >= 0 && newRow <= 9 && newCol >= 0 && newCol <= 8) {
                // 检查马腿是否被堵
                let legBlocked = false;

                if (Math.abs(dRow) === 2) {
                    // 竖日字，检查竖向马腿
                    const legRow = row + dRow / 2;
                    legBlocked = !!gameState.getPieceAt(legRow, col);
                } else {
                    // 横日字，检查横向马腿
                    const legCol = col + dCol / 2;
                    legBlocked = !!gameState.getPieceAt(row, legCol);
                }

                if (!legBlocked) {
                    // 检查目标位置是否有己方棋子
                    if (!gameState.isOwnPieceAt(newRow, newCol, color)) {
                        moves.push([newRow, newCol]);
                    }
                }
            }
        }

        return moves;
    }

    /**
     * 车的移动规则
     */
    getRookMoves(row, col, color, gameState) {
        const moves = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // 上下左右

        for (const [dRow, dCol] of directions) {
            let newRow = row + dRow;
            let newCol = col + dCol;

            // 沿着方向移动直到遇到障碍或边界
            while (newRow >= 0 && newRow <= 9 && newCol >= 0 && newCol <= 8) {
                const piece = gameState.getPieceAt(newRow, newCol);

                if (piece) {
                    if (piece.color !== color) {
                        // 遇到敌方棋子，可以吃掉并停止
                        moves.push([newRow, newCol]);
                    }
                    // 遇到己方棋子，直接停止
                    break;
                } else {
                    // 空位，可以移动
                    moves.push([newRow, newCol]);
                }

                newRow += dRow;
                newCol += dCol;
            }
        }

        return moves;
    }

    /**
     * 炮的移动规则
     */
    getCannonMoves(row, col, color, gameState) {
        const moves = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // 上下左右

        for (const [dRow, dCol] of directions) {
            let newRow = row + dRow;
            let newCol = col + dCol;
            let skipCount = 0; // 跳过的棋子数量

            // 沿着方向移动直到边界
            while (newRow >= 0 && newRow <= 9 && newCol >= 0 && newCol <= 8) {
                const piece = gameState.getPieceAt(newRow, newCol);

                if (piece) {
                    skipCount++;
                    if (skipCount === 2) {
                        // 第二个棋子必须是敌方棋子才能吃
                        if (piece.color !== color) {
                            moves.push([newRow, newCol]);
                        }
                        // 不能跳过两个棋子
                        break;
                    }
                } else if (skipCount === 0) {
                    // 没有跳过棋子时，可以移动到空位
                    moves.push([newRow, newCol]);
                }
                // 等待跳过一个棋子后，只有吃子才能移动

                newRow += dRow;
                newCol += dCol;
            }
        }

        return moves;
    }

    /**
     * 兵/卒的移动规则
     */
    getSoldierMoves(row, col, color, gameState) {
        const moves = [];

        // 确定前进方向
        const forward = color === 'red' ? 1 : -1;

        // 前进移动
        const newRow = row + forward;
        if (newRow >= 0 && newRow <= 9) {
            if (!gameState.isOwnPieceAt(newRow, col, color)) {
                moves.push([newRow, col]);
            }
        }

        // 检查是否过河
        const isAcrossRiver = this.isAcrossRiver(row, color);

        if (isAcrossRiver) {
            // 过河后可以横移
            // 向左移动
            if (col > 0 && !gameState.isOwnPieceAt(row, col - 1, color)) {
                moves.push([row, col - 1]);
            }
            // 向右移动
            if (col < 8 && !gameState.isOwnPieceAt(row, col + 1, color)) {
                moves.push([row, col + 1]);
            }
        }

        return moves;
    }

    /**
     * 验证移动是否有效（综合验证包括将军检测）
     * @param {number} targetRow - 目标行
     * @param {number} targetCol - 目标列
     * @param {Object} selectedPiece - 当前选中的棋子
     * @param {Object} gameState - 游戏状态
     * @returns {boolean} 移动是否有效
     */
    isValidMove(targetRow, targetCol, selectedPiece, gameState) {
        if (!selectedPiece) return false;

        const { type, color, row, col } = selectedPiece;

        // 基本移动验证：目标位置是否在有效移动列表中
        const validMoves = this.getValidMoves(type, color, row, col, gameState);
        const isValidBasicMove = validMoves.some(([r, c]) => r === targetRow && c === targetCol);

        if (!isValidBasicMove) return false;

        // 检查移动后是否会让自己被将军（禁止送将）
        if (this.wouldBeInCheckAfterMove(selectedPiece, targetRow, targetCol, gameState)) {
            return false;
        }

        return true;
    }

    /**
     * 预测移动后是否会处于将军状态
     * @param {Object} piece - 要移动的棋子
     * @param {number} targetRow - 目标行
     * @param {number} targetCol - 目标列
     * @param {Object} gameState - 游戏状态
     * @returns {boolean} 是否会被将军
     */
    wouldBeInCheckAfterMove(piece, targetRow, targetCol, gameState) {
        // 创建临时游戏状态来模拟移动
        const tempGameState = this.createTemporaryGameState(gameState);

        // 执行移动
        tempGameState.updatePiecePosition(piece.row, piece.col, targetRow, targetCol);

        // 如果目标位置有敌方棋子，移除它
        const targetPiece = tempGameState.getPieceAt(targetRow, targetCol);
        if (targetPiece && targetPiece.color !== piece.color) {
            tempGameState.removePieceAt(targetRow, targetCol);
        }

        // 检查移动后是否被将军
        return this.isInCheck(piece.color, tempGameState);
    }

    /**
     * 辅助方法：检查是否在宫内
     */
    isInPalace(row, col, color) {
        if (color === 'red') {
            return row >= 0 && row <= 2 && col >= 3 && col <= 5;
        } else {
            return row >= 7 && row <= 9 && col >= 3 && col <= 5;
        }
    }

    /**
     * 辅助方法：检查是否过河
     */
    isAcrossRiver(row, color) {
        return color === 'red' ? row >= 5 : row <= 4;
    }

    /**
     * 尝试添加将帅照面的移动（特殊规则）
     */
    addKingFaceToFaceMoves(moves, row, col, color, gameState) {
        const enemyColor = color === 'red' ? 'black' : 'red';
        let enemyKingPos = null;

        // 找到敌方将/帅位置
        for (const [key, piece] of gameState.pieceIndex.entries()) {
            if (piece.type === 'king' && piece.color === enemyColor) {
                enemyKingPos = { row: piece.row, col: piece.col };
                break;
            }
        }

        if (enemyKingPos && col === enemyKingPos.col) {
            // 将帅在同一列
            let blocked = false;

            // 检查中间是否有其他棋子
            const start = Math.min(row, enemyKingPos.row) + 1;
            const end = Math.max(row, enemyKingPos.row);

            for (let r = start; r < end; r++) {
                if (gameState.getPieceAt(r, col)) {
                    blocked = true;
                    break;
                }
            }

            // 如果中间没有棋子，将帅照面，不能这样移动
            if (!blocked) {
                // 在标准规则中，将帅照面是输棋，所以这种移动是不允许的
                // 这里返回空数组表示可以移动到敌方将帅位置（吃掉）
                return [[enemyKingPos.row, enemyKingPos.col]];
            }
        }

        return moves;
    }

    /**
     * 创建临时游戏状态用于模拟移动
     */
    createTemporaryGameState(originalState) {
        return {
            pieceIndex: new Map(originalState.pieceIndex),

            getPieceAt(row, col) {
                return this.pieceIndex.get(`${row}-${col}`) || null;
            },

            isOwnPieceAt(row, col, color) {
                const piece = this.getPieceAt(row, col);
                return piece && piece.color === color;
            },

            updatePiecePosition(oldRow, oldCol, newRow, newCol) {
                const piece = this.getPieceAt(oldRow, oldCol);
                if (piece) {
                    this.pieceIndex.delete(`${oldRow}-${oldCol}`);
                    this.pieceIndex.set(`${newRow}-${newCol}`, {
                        ...piece,
                        row: newRow,
                        col: newCol
                    });
                }
            },

            removePieceAt(row, col) {
                this.pieceIndex.delete(`${row}-${col}`);
            }
        };
    }
}

// 导出到全局作用域
if (typeof window !== 'undefined') {
    window.MoveValidator = MoveValidator;
}

// 导出供模块系统使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MoveValidator };
}