/**
 * 中国象棋棋谱解析器
 * 实现标准的中国象棋记谱法解析，正确处理红黑双方坐标差异
 */

class ChessNotationParser {
    constructor() {
        // 棋子类型映射
        this.pieceTypeMap = {
            '车': 'rook', '車': 'rook',
            '马': 'horse', '馬': 'horse',
            '炮': 'cannon', '砲': 'cannon',
            '相': 'elephant', '象': 'elephant',
            '仕': 'advisor', '士': 'advisor',
            '帅': 'king', '将': 'king',
            '兵': 'soldier', '卒': 'soldier'
        };

        // 数字映射（中文数字转阿拉伯数字）
        this.numberMap = {
            '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
            '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
        };

        // 初始化标准棋盘布局
        this.initializeStandardBoard();
    }

    /**
     * 初始化标准棋盘布局
     */
    initializeStandardBoard() {
        this.standardLayout = {
            red: {
                king: [{row: 9, col: 4}],
                advisor: [{row: 9, col: 3}, {row: 9, col: 5}],
                elephant: [{row: 9, col: 2}, {row: 9, col: 6}],
                horse: [{row: 9, col: 1}, {row: 9, col: 7}],
                rook: [{row: 9, col: 0}, {row: 9, col: 8}],
                cannon: [{row: 7, col: 1}, {row: 7, col: 7}],
                soldier: [{row: 6, col: 0}, {row: 6, col: 2}, {row: 6, col: 4}, {row: 6, col: 6}, {row: 6, col: 8}]
            },
            black: {
                king: [{row: 0, col: 4}],
                advisor: [{row: 0, col: 3}, {row: 0, col: 5}],
                elephant: [{row: 0, col: 2}, {row: 0, col: 6}],
                horse: [{row: 0, col: 1}, {row: 0, col: 7}],
                rook: [{row: 0, col: 0}, {row: 0, col: 8}],
                cannon: [{row: 2, col: 1}, {row: 2, col: 7}],
                soldier: [{row: 3, col: 0}, {row: 3, col: 2}, {row: 3, col: 4}, {row: 3, col: 6}, {row: 3, col: 8}]
            }
        };
    }

    /**
     * 路码转换 - 红黑双方路码系统差异处理
     * @param {string} color - 'red' 或 'black'
     * @param {number} road - 路码（1-9）
     * @returns {number} 转换后的列坐标（0-8）
     */
    roadToColumn(color, road) {
        if (road < 1 || road > 9) {
            throw new Error(`无效路码: ${road}`);
        }

        if (color === 'red') {
            // 红方：从右向左数，第1路=第8列, 第2路=第7列(右边马), 第9路=第0列(左边车)
            // 确保"二路马"是指右边的马（第7列）
            return 9 - road;
        } else if (color === 'black') {
            // 黑方：从自己的视角看，1路在左边(0列)，9路在右边(8列)
            // 路码1-9对应列0-8（从左到右）
            return road - 1;
        } else {
            throw new Error(`无效颜色: ${color}`);
        }
    }

    /**
     * 列坐标转路码
     * @param {string} color - 'red' 或 'black'
     * @param {number} col - 列坐标（0-8）
     * @returns {number} 路码（1-9）
     */
    columnToRoad(color, col) {
        if (col < 0 || col > 8) {
            throw new Error(`无效列坐标: ${col}`);
        }

        if (color === 'red') {
            // 红方：列8-0对应路码1-9
            return 9 - col;
        } else if (color === 'black') {
            // 黑方：列0-8对应路码1-9
            return col + 1;
        } else {
            throw new Error(`无效颜色: ${color}`);
        }
    }

    /**
     * 解析棋谱文本
     * @param {string} notation - 棋谱文本，如 "炮二平五"
     * @param {string} color - 'red' 或 'black'
     * @param {Array} currentBoard - 当前棋盘状态
     * @returns {Object} 解析结果 {pieceType, fromPos, toPos, action}
     */
    parseNotation(notation, color, currentBoard) {
        // 提取棋谱各部分
        const match = notation.match(/([车马炮相仕兵卒帅將馬砲])([一二三四五六七八九十\d]+)([进平退])([一二三四五六七八九十\d]+)/);
        if (!match) {
            throw new Error(`无效棋谱格式: ${notation}`);
        }

        const [, pieceChar, fromRoadStr, action, toStr] = match;

        // 转换为标准格式
        const pieceType = this.pieceTypeMap[pieceChar];
        const fromRoad = this.parseChineseNumber(fromRoadStr);
        const toInfo = this.parseChineseNumber(toStr);
        const fromCol = this.roadToColumn(color, fromRoad);

        // 根据当前棋盘状态找到对应的棋子
        const piecePositions = this.findPiecePositions(pieceType, color, fromCol, currentBoard);

        if (piecePositions.length === 0) {
            throw new Error(`未找到棋子: ${color} ${pieceType} 在路码 ${fromRoad}`);
        }

        if (piecePositions.length > 1) {
            // 如果有多个棋子在同一路码上，需要根据动作和目标位置进一步确定
            return this.disambiguateMultiplePieces(piecePositions, action, toInfo, color, pieceType);
        } else {
            // 只有一个棋子，直接计算目标位置
            return this.calculateTargetPosition(piecePositions[0], action, toInfo, color, pieceType);
        }
    }

    /**
     * 解析中文数字或阿拉伯数字
     * @param {string} numStr - 数字字符串
     * @returns {number} 数值
     */
    parseChineseNumber(numStr) {
        if (/\d+/.test(numStr)) {
            return parseInt(numStr);
        }
        return this.numberMap[numStr] || parseInt(numStr);
    }

    /**
     * 查找指定类型和颜色的棋子位置（含容错机制）
     * @param {string} pieceType - 棋子类型
     * @param {string} color - 颜色
     * @param {number} targetCol - 目标列
     * @param {Array} board - 棋盘状态
     * @returns {Array} 棋子位置数组 [{row, col}]
     */
    findPiecePositions(pieceType, color, targetCol, board) {
        const positions = [];

        // 首先尝试精确匹配
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row] && board[row][col] &&
                    board[row][col].type === pieceType &&
                    board[row][col].color === color &&
                    col === targetCol) {
                    positions.push({row, col});
                }
            }
        }

        // 如果没有找到棋子，尝试容错匹配（从相邻路码寻找）
        if (positions.length === 0) {
            const searchRange = 2; // 搜索范围：前后各2列
            for (let offset = -searchRange; offset <= searchRange; offset++) {
                if (offset === 0) continue; // 跳过已搜索过的精确位置

                const alternativeCol = targetCol + offset;
                if (alternativeCol < 0 || alternativeCol >= 9) continue;

                for (let row = 0; row < 10; row++) {
                    if (board[row] && board[row][alternativeCol] &&
                        board[row][alternativeCol].type === pieceType &&
                        board[row][alternativeCol].color === color) {
                        positions.push({row, col: alternativeCol});
                    }
                }

                // 如果在相邻列中找到，停止搜索
                if (positions.length > 0) {
                    console.log(`   ⚠️  在路码${this.columnToRoad(color, targetCol)}(列${targetCol})未找到${color} ${pieceType}，从相邻路码${this.columnToRoad(color, alternativeCol)}(列${alternativeCol})找到`);
                    break;
                }
            }
        }

        return positions;
    }

    /**
     * 解决棋子歧义（多个棋子在同一列）
     * @param {Array} positions - 棋子位置数组
     * @param {string} action - 动作（进/退/平）
     * @param {number} toInfo - 目标信息
     * @param {string} color - 颜色
     * @param {string} pieceType - 棋子类型
     * @returns {Object} 解析结果
     */
    disambiguateMultiplePieces(positions, action, toInfo, color, pieceType) {
        // 对于大多数情况，选择最前方或最后方的棋子
        if (color === 'red') {
            // 红方：行号小的是前方
            positions.sort((a, b) => a.row - b.row);
        } else {
            // 黑方：行号大的是前方
            positions.sort((a, b) => b.row - a.row);
        }

        // 选择第一个位置的棋子（最前方的）
        const selectedPosition = positions[0];
        return this.calculateTargetPosition(selectedPosition, action, toInfo, color, pieceType);
    }

    /**
     * 计算目标位置
     * @param {Object} fromPos - 起始位置 {row, col}
     * @param {string} action - 动作（进/退/平）
     * @param {number} toInfo - 目标信息
     * @param {string} color - 颜色
     * @param {string} pieceType - 棋子类型
     * @returns {Object} 解析结果 {pieceType, fromPos, toPos, action}
     */
    calculateTargetPosition(fromPos, action, toInfo, color, pieceType) {
        let toRow, toCol;

        // 首先验证起始位置的合法性
        if (fromPos.row < 0 || fromPos.row > 9 || fromPos.col < 0 || fromPos.col > 8) {
            throw new Error(`起始位置超出棋盘范围: (${fromPos.row}, ${fromPos.col})`);
        }

        // 验证toInfo参数的合法性
        if (typeof toInfo !== 'number' || toInfo < 0 || toInfo > 9) {
            throw new Error(`无效的目标参数: ${toInfo}`);
        }

        if (action === '平') {
            // 横向移动：toInfo表示目标路码
            toCol = this.roadToColumn(color, toInfo);
            toRow = fromPos.row;
        } else if (action === '进' || action === '退') {
            // 对于进退移动，toInfo可以是步数或路码，需要根据上下文判断
            if (pieceType === 'horse') {
                // 马的特殊处理：toInfo表示目标路码
                toCol = this.roadToColumn(color, toInfo);
                // 马走日字，需要计算行
                const colDiff = Math.abs(toCol - fromPos.col);
                if (colDiff === 1) {
                    // 横向移动1格，纵向移动2格
                    toRow = color === 'red' ? fromPos.row - 2 : fromPos.row + 2;
                } else if (colDiff === 2) {
                    // 横向移动2格，纵向移动1格
                    toRow = color === 'red' ? fromPos.row - 1 : fromPos.row + 1;
                } else {
                    throw new Error('马的移动规则错误');
                }

                // 对于"退"动作，方向相反
                if (action === '退') {
                    toRow = color === 'red' ? fromPos.row + (fromPos.row - toRow) : fromPos.row - (toRow - fromPos.row);
                }
            } else if (pieceType === 'rook' || pieceType === 'cannon' || pieceType === 'soldier') {
                // 车、炮、兵：toInfo表示步数，强化边界检查
                const steps = toInfo;
                if (steps < 0 || steps > 9) {
                    throw new Error(`无效的移动步数: ${steps}`);
                }

                if (color === 'red') {
                    // 红方：进是行号减少，退是行号增加
                    toRow = action === '进' ? fromPos.row - steps : fromPos.row + steps;
                } else {
                    // 黑方：进是行号增加，退是行号减少
                    toRow = action === '进' ? fromPos.row + steps : fromPos.row - steps;
                }
                toCol = fromPos.col;
            } else if (pieceType === 'elephant') {
                // 象：toInfo表示目标路码
                toCol = this.roadToColumn(color, toInfo);
                // 象走田字
                const colDiff = toCol - fromPos.col;
                toRow = color === 'red' ? fromPos.row - 2 : fromPos.row + 2;
                // 对于黑方象"进"，实际上是向上移动，行号减少
                if (color === 'black' && action === '进') {
                    toRow = fromPos.row - 2;
                }
                // 检查是否符合田字移动
                if (Math.abs(colDiff) !== 2) {
                    throw new Error('象的移动规则错误');
                }
            } else if (pieceType === 'advisor' || pieceType === 'king') {
                // 士、将："一进一"等不同格式
                // "帅五进一"：第5路，前进1步（列移动1步）
                // "帅五平六"：第5路，平移到第6路（列移动到6，行不变）

                // 确定目标列：如果动作是\"平\"，则toInfo是目标路码；如果是\"进\"或\"退\"，通常是1步
                if (action === '平') {
                    toCol = this.roadToColumn(color, toInfo);
                    toRow = fromPos.row; // 行数不变
                } else {
                    // "进"或"退"
                    if (toInfo > 3) {
                        throw new Error(`将/士移动步数过大: ${toInfo}`);
                    }

                    // 区分两种模式：步进移动 或 斜对角线移动（可通过路码变化判断）
                    const targetCol = this.roadToColumn(color, toInfo);
                    const colDiff = Math.abs(targetCol - fromPos.col);

                    if (colDiff === 0) {
                        // 没有移动路码，只有纵向移动（将/帅的直线移动）
                        toCol = fromPos.col;
                        if (color === 'red') {
                            toRow = action === '进' ? fromPos.row - toInfo : fromPos.row + toInfo;
                        } else {
                            toRow = action === '进' ? fromPos.row + toInfo : fromPos.row - toInfo;
                        }
                    } else if (colDiff === 1) {
                        // 士的对角线移动（路码变化1）
                        toCol = targetCol;
                        if (color === 'red') {
                            toRow = action === '进' ? fromPos.row - 1 : fromPos.row + 1;
                        } else {
                            toRow = action === '进' ? fromPos.row + 1 : fromPos.row - 1;
                        }
                    } else {
                        throw new Error('将/士的移动规则错误');
                    }
                }
            } else {
                // 默认处理：toInfo表示步数
                const steps = toInfo;
                if (steps < 0 || steps > 9) {
                    throw new Error(`无效的移动步数: ${steps}`);
                }

                if (color === 'red') {
                    toRow = action === '进' ? fromPos.row - steps : fromPos.row + steps;
                } else {
                    toRow = action === '进' ? fromPos.row + steps : fromPos.row - steps;
                }
                toCol = fromPos.col;
            }
        }

        // 严格的边界检查 - 不再进行容错调整，而是直接报错
        if (toRow < 0 || toRow > 9 || toCol < 0 || toCol > 8) {
            throw new Error(`目标位置(${toRow},${toCol})超出棋盘范围 - 棋谱: ${color} ${pieceType} ${action}${toInfo}`);
        }

        return {
            pieceType,
            fromPos: {row: fromPos.row, col: fromPos.col},
            toPos: {row: toRow, col: toCol},
            action
        };
    }

    /**
     * 将棋谱数组转换为标准格式
     * @param {Array} notations - 棋谱数组 ["炮二平五", "马8进7", ...]
     * @returns {Array} 标准格式数组 [{color, pieceType, fromPos, toPos, notation}, ...]
     */
    parseNotationSequence(notations) {
        const result = [];
        let currentBoard = this.createInitialBoard();

        for (let i = 0; i < notations.length; i++) {
            const notation = notations[i];
            const color = i % 2 === 0 ? 'red' : 'black';

            try {
                const move = this.parseNotation(notation, color, currentBoard);

                result.push({
                    color,
                    pieceType: move.pieceType,
                    fromPos: [move.fromPos.row, move.fromPos.col],
                    toPos: [move.toPos.row, move.toPos.col],
                    notation
                });

                // 更新棋盘状态
                this.updateBoard(currentBoard, move);

            } catch (error) {
                console.error(`解析棋谱失败: ${notation}`, error.message);
                throw error;
            }
        }

        return result;
    }

    /**
     * 创建初始棋盘
     * @returns {Array} 棋盘状态
     */
    createInitialBoard() {
        const board = Array(10).fill(null).map(() => Array(9).fill(null));

        // 放置红方棋子
        Object.entries(this.standardLayout.red).forEach(([pieceType, positions]) => {
            positions.forEach(pos => {
                board[pos.row][pos.col] = {type: pieceType, color: 'red'};
            });
        });

        // 放置黑方棋子
        Object.entries(this.standardLayout.black).forEach(([pieceType, positions]) => {
            positions.forEach(pos => {
                board[pos.row][pos.col] = {type: pieceType, color: 'black'};
            });
        });

        return board;
    }

    /**
     * 更新棋盘状态
     * @param {Array} board - 棋盘状态
     * @param {Object} move - 移动信息
     */
    updateBoard(board, move) {
        const {fromPos, toPos, pieceType} = move;

        // 移动棋子
        board[toPos.row][toPos.col] = board[fromPos.row][fromPos.col];
        board[fromPos.row][fromPos.col] = null;
    }

    /**
     * 验证棋谱的正确性
     * @param {Array} parsedMoves - 解析后的移动数组
     * @returns {Object} 验证结果 {valid, errors}
     */
    validateNotation(parsedMoves) {
        const errors = [];
        let board = this.createInitialBoard();

        for (let i = 0; i < parsedMoves.length; i++) {
            const move = parsedMoves[i];
            const {color, pieceType, fromPos, toPos, notation} = move;

            try {
                // 检查起始位置是否有对应棋子 - fromPos是数组格式[row, col]
                const piece = board[fromPos[0]][fromPos[1]];

                if (!piece || piece.type !== pieceType || piece.color !== color) {
                    errors.push(`第${i + 1}步 ${notation}: 起始位置 (${fromPos[0]}, ${fromPos[1]}) 没有 ${color} ${pieceType}`);
                    continue;
                }

                // 检查移动是否合法（根据棋子类型）
                if (!this.isValidMove(piece, fromPos, toPos, board)) {
                    errors.push(`第${i + 1}步 ${notation}: 非法移动`);
                    continue;
                }

                // 执行移动
                board[toPos[0]][toPos[1]] = board[fromPos[0]][fromPos[1]];
                board[fromPos[0]][fromPos[1]] = null;

            } catch (error) {
                errors.push(`第${i + 1}步 ${notation}: ${error.message}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 检查移动是否合法（简化版）
     * @param {Object} piece - 棋子信息
     * @param {Array} fromPos - 起始位置 [row, col]
     * @param {Array} toPos - 目标位置 [row, col]
     * @param {Array} board - 棋盘状态
     * @returns {boolean} 是否合法
     */
    isValidMove(piece, fromPos, toPos, board) {
        const fromRow = fromPos[0];
        const fromCol = fromPos[1];
        const toRow = toPos[0];
        const toCol = toPos[1];

        // 基本边界检查
        if (toRow < 0 || toRow > 9 || toCol < 0 || toCol > 8) {
            return false;
        }

        // 不能吃己方棋子
        const targetPiece = board[toRow][toCol];
        if (targetPiece && targetPiece.color === piece.color) {
            return false;
        }

        // 根据棋子类型检查移动规则（简化版）
        switch (piece.type) {
            case 'rook':
                // 车只能直线移动
                if (fromRow !== toRow && fromCol !== toCol) return false;
                return this.isPathClear(fromPos, toPos, board);

            case 'horse':
                // 马走日字
                const rowDiff = Math.abs(toRow - fromRow);
                const colDiff = Math.abs(toCol - fromCol);
                return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);

            case 'cannon':
                // 炮直线移动
                if (fromRow !== toRow && fromCol !== toCol) return false;
                const path = this.getPath(fromPos, toPos);
                const obstacles = path.filter(([r, c]) => board[r][c] !== null).length;
                if (targetPiece) {
                    // 吃子需要隔一个棋子
                    return obstacles === 1;
                } else {
                    // 移动需要路径畅通
                    return obstacles === 0;
                }

            default:
                // 其他棋子的简化检查
                return true;
        }
    }

    /**
     * 检查路径是否畅通
     * @param {Array} fromPos - 起始位置
     * @param {Array} toPos - 目标位置
     * @param {Array} board - 棋盘状态
     * @returns {boolean} 是否畅通
     */
    isPathClear(fromPos, toPos, board) {
        const path = this.getPath(fromPos, toPos);
        return path.every(([row, col]) => board[row][col] === null);
    }

    /**
     * 获取两点之间的路径
     * @param {Array|Object} fromPos - 起始位置 {row, col} 或 [row, col]
     * @param {Array|Object} toPos - 目标位置 {row, col} 或 [row, col]
     * @returns {Array} 路径数组
     */
    getPath(fromPos, toPos) {
        // 处理两种可能的位置格式：对象 {row, col} 或数组 [row, col]
        const fromRow = Array.isArray(fromPos) ? fromPos[0] : (fromPos.row || fromPos[0]);
        const fromCol = Array.isArray(fromPos) ? fromPos[1] : (fromPos.col || fromPos[1]);
        const toRow = Array.isArray(toPos) ? toPos[0] : (toPos.row || toPos[0]);
        const toCol = Array.isArray(toPos) ? toPos[1] : (toPos.col || toPos[1]);

        const path = [];

        if (fromRow === toRow) {
            // 横向移动
            const start = Math.min(fromCol, toCol) + 1;
            const end = Math.max(fromCol, toCol);
            for (let col = start; col < end; col++) {
                path.push([fromRow, col]);
            }
        } else if (fromCol === toCol) {
            // 纵向移动
            const start = Math.min(fromRow, toRow) + 1;
            const end = Math.max(fromRow, toRow);
            for (let row = start; row < end; row++) {
                path.push([row, fromCol]);
            }
        }

        return path;
    }
}

// 导出解析器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChessNotationParser;
} else if (typeof window !== 'undefined') {
    window.ChessNotationParser = ChessNotationParser;
}