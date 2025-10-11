/**
 * LayeredValidator 分层验证架构
 * 实现多层次的棋谱移动验证系统
 *
 * 验证层次：
 * 1. 数据层验证 - 数据格式、类型、边界检查
 * 2. 规则层验证 - 棋子移动规则、特殊规则验证
 * 3. 游戏层验证 - 游戏状态、将军检查、胜败判定
 * 4. 棋谱层验证 - 棋谱连续性、历史一致性验证
 */

class LayeredValidator {
    constructor() {
        // 数据验证器
        this.dataValidator = new ChessDataValidator();

        // 验证配置
        this.validationConfig = {
            strictMode: true,
            enableGameRules: true,
            enableChessRules: true,
            enableSequenceCheck: true,
            maxErrors: 50
        };

        // 验证层级定义
        this.VALIDATION_LAYERS = {
            DATA: 1,      // 数据层
            RULES: 2,     // 规则层
            GAME: 3,      // 游戏层
            SEQUENCE: 4   // 棋谱层
        };
    }

    /**
     * 主要验证入口 - 验证单个移动
     * @param {Object} move - 移动数据
     * @param {Object} context - 验证上下文
     * @returns {Object} 验证结果
     */
    validateMove(move, context = {}) {
        const {
            board = null,
            gameState = null,
            moveHistory = [],
            layer = null
        } = context;

        const results = {
            valid: true,
            errors: [],
            warnings: [],
            layerResults: {}
        };

        try {
            // 第一层：数据验证
            if (!layer || layer <= this.VALIDATION_LAYERS.DATA) {
                const dataResult = this.validateDataLayer(move);
                results.layerResults.data = dataResult;

                if (!dataResult.valid) {
                    results.valid = false;
                    results.errors.push(...dataResult.errors);
                    if (this.validationConfig.strictMode) {
                        return results;
                    }
                }

                if (dataResult.warnings) {
                    results.warnings.push(...dataResult.warnings);
                }
            }

            // 第二层：规则验证
            if (!layer || layer <= this.VALIDATION_LAYERS.RULES) {
                const rulesResult = this.validateRulesLayer(move, context);
                results.layerResults.rules = rulesResult;

                if (!rulesResult.valid) {
                    results.valid = false;
                    results.errors.push(...rulesResult.errors);
                    if (this.validationConfig.strictMode) {
                        return results;
                    }
                }

                if (rulesResult.warnings) {
                    results.warnings.push(...rulesResult.warnings);
                }
            }

            // 第三层：游戏验证
            if (!layer || layer <= this.VALIDATION_LAYERS.GAME) {
                const gameResult = this.validateGameLayer(move, context);
                results.layerResults.game = gameResult;

                if (!gameResult.valid) {
                    results.valid = false;
                    results.errors.push(...gameResult.errors);
                    if (this.validationConfig.strictMode) {
                        return results;
                    }
                }

                if (gameResult.warnings) {
                    results.warnings.push(...gameResult.warnings);
                }
            }

            // 第四层：棋谱序列验证
            if (!layer || layer <= this.VALIDATION_LAYERS.SEQUENCE) {
                const sequenceResult = this.validateSequenceLayer(move, context);
                results.layerResults.sequence = sequenceResult;

                if (!sequenceResult.valid) {
                    results.valid = false;
                    results.errors.push(...sequenceResult.errors);
                }

                if (sequenceResult.warnings) {
                    results.warnings.push(...sequenceResult.warnings);
                }
            }

        } catch (error) {
            results.valid = false;
            results.errors.push(`验证过程中发生异常: ${error.message}`);
        }

        return results;
    }

    /**
     * 验证棋步序列
     * @param {Array} moves - 移动序列
     * @param {Object} context - 验证上下文
     * @returns {Object} 验证结果
     */
    validateMoveSequence(moves, context = {}) {
        if (!Array.isArray(moves)) {
            return {
                valid: false,
                errors: ['移动数据必须是数组'],
                layerResults: {}
            };
        }

        const sequenceResults = [];
        const allErrors = [];
        const allWarnings = [];
        let validCount = 0;

        // 逐个验证每个移动
        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];
            const moveContext = {
                ...context,
                moveIndex: i,
                moveHistory: moves.slice(0, i) // 之前的移动历史
            };

            const result = this.validateMove(move, moveContext);
            sequenceResults.push(result);

            if (result.valid) {
                validCount++;
            } else {
                allErrors.push(...result.errors.map(e => `步骤${i + 1}: ${e}`));
                // 限制错误数量
                if (allErrors.length >= this.validationConfig.maxErrors) {
                    allErrors.push(`... (还有 ${moves.length - i - 1} 个错误未显示)`);
                    break;
                }
            }

            allWarnings.push(...result.warnings.map(w => `步骤${i + 1}: ${w}`));
        }

        // 序列级别验证
        const sequenceValidation = this.validateSequenceConsistency(sequenceResults, context);

        const statistics = {
            total: moves.length,
            valid: validCount,
            invalid: moves.length - validCount,
            validRate: (validCount / moves.length * 100).toFixed(2) + '%'
        };

        return {
            valid: allErrors.length === 0 && sequenceValidation.valid,
            errors: allErrors,
            warnings: allWarnings,
            sequenceResults,
            statistics,
            sequenceValidation
        };
    }

    /**
     * 第一层：数据验证
     * @param {Object} move - 移动数据
     * @returns {Object} 验证结果
     */
    validateDataLayer(move) {
        const result = this.dataValidator.validateMove(move, {
            strict: this.validationConfig.strictMode,
            autoFix: false // 在验证阶段不自动修复
        });

        return {
            layer: 'data',
            valid: result.valid,
            errors: result.errors || [],
            warnings: result.warnings || [],
            normalizedMove: result.normalizedMove
        };
    }

    /**
     * 第二层：规则验证
     * @param {Object} move - 移动数据
     * @param {Object} context - 验证上下文
     * @returns {Object} 验证结果
     */
    validateRulesLayer(move, context) {
        const errors = [];
        const warnings = [];

        const { board, gameState } = context;

        if (!move.fromPos || !move.toPos || !move.pieceType || !move.color) {
            errors.push('移动数据不完整，无法进行规则验证');
            return { layer: 'rules', valid: false, errors };
        }

        const [fromRow, fromCol] = move.fromPos;
        const [toRow, toCol] = move.toPos;

        // 1. 基本移动规则验证
        const basicRuleResult = this.validateBasicMoveRules(move);
        if (!basicRuleResult.valid) {
            errors.push(...basicRuleResult.errors);
        }
        warnings.push(...basicRuleResult.warnings || []);

        // 2. 棋子特殊规则验证
        const specialRuleResult = this.validateSpecialPieceRules(move, context);
        if (!specialRuleResult.valid) {
            errors.push(...specialRuleResult.errors);
        }
        warnings.push(...specialRuleResult.warnings || []);

        // 3. 路径障碍验证
        const pathResult = this.validateMovePath(move, context);
        if (!pathResult.valid) {
            errors.push(...pathResult.errors);
        }
        warnings.push(...pathResult.warnings || []);

        return {
            layer: 'rules',
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 第三层：游戏验证
     * @param {Object} move - 移动数据
     * @param {Object} context - 验证上下文
     * @returns {Object} 验证结果
     */
    validateGameLayer(move, context) {
        const errors = [];
        const warnings = [];

        const { board, gameState } = context;

        if (!gameState || !board) {
            warnings.push('缺少游戏状态无法进行完整验证');
            return { layer: 'game', valid: true, errors, warnings };
        }

        // 1. 棋子存在性验证
        const pieceExistsResult = this.validatePieceExists(move, board);
        if (!pieceExistsResult.valid) {
            errors.push(...pieceExistsResult.errors);
        }

        // 2. 移动合法性验证（使用move-validator）
        const legalMoveResult = this.validateLegalMove(move, gameState);
        if (!legalMoveResult.valid) {
            errors.push(...legalMoveResult.errors);
        }

        // 3. 将军检查
        const checkResult = this.validateKingSafety(move, context);
        if (!checkResult.valid) {
            errors.push(...checkResult.errors);
        }
        warnings.push(...checkResult.warnings || []);

        // 4. 游戏规则合规性
        const gameRuleResult = this.validateGameRules(move, context);
        if (!gameRuleResult.valid) {
            errors.push(...gameRuleResult.errors);
        }
        warnings.push(...gameRuleResult.warnings || []);

        return {
            layer: 'game',
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 第四层：棋谱序列验证
     * @param {Object} move - 当前移动
     * @param {Object} context - 验证上下文
     * @returns {Object} 验证结果
     */
    validateSequenceLayer(move, context) {
        const errors = [];
        const warnings = [];

        const { moveHistory = [], moveIndex = 0 } = context;

        // 1. 回合顺序验证
        const turnOrderResult = this.validateTurnOrder(move, moveIndex);
        if (!turnOrderResult.valid) {
            errors.push(...turnOrderResult.errors);
        }

        // 2. 棋谱连续性验证
        const continuityResult = this.validateMoveContinuity(move, moveHistory);
        if (!continuityResult.valid) {
            errors.push(...continuityResult.errors);
        }
        warnings.push(...continuityResult.warnings || []);

        // 3. 棋子状态一致性验证
        const consistencyResult = this.validatePieceConsistency(move, moveHistory);
        if (!consistencyResult.valid) {
            errors.push(...consistencyResult.errors);
        }

        return {
            layer: 'sequence',
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 基本移动规则验证
     */
    validateBasicMoveRules(move) {
        const errors = [];
        const warnings = [];

        const { fromPos, toPos, pieceType, color } = move;
        const [fromRow, fromCol] = fromPos;
        const [toRow, toCol] = toPos;

        // 不能原地不动
        if (fromRow === toRow && fromCol === toCol) {
            errors.push('棋子不能原地不动');
        }

        // 基本棋子移动距离验证
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);

        switch (pieceType) {
            case 'soldier':
                // 兵/卒基本移动限制
                if (color === 'red' && toRow > fromRow) {
                    errors.push('红兵不能后退');
                }
                if (color === 'black' && toRow < fromRow) {
                    errors.push('黑卒不能后退');
                }
                // 过河前不能横移
                const riverRow = color === 'red' ? 4 : 5;
                if ((color === 'red' && fromRow >= riverRow && colDiff > 0) ||
                    (color === 'black' && fromRow <= riverRow && colDiff > 0)) {
                    errors.push(`${color === 'red' ? '兵' : '卒'}未过河不能横移`);
                }
                break;
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    /**
     * 棋子特殊规则验证
     */
    validateSpecialPieceRules(move, context) {
        const errors = [];
        const warnings = [];

        const { fromPos, toPos, pieceType, color } = move;
        const [fromRow, fromCol] = fromPos;
        const [toRow, toCol] = toPos;
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);

        switch (pieceType) {
            case 'horse':
                // 马走日字
                if (!((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2))) {
                    errors.push('马必须走日字');
                }
                break;

            case 'elephant':
                // 象走田字
                if (!(rowDiff === 2 && colDiff === 2)) {
                    errors.push('象必须走田字');
                }
                // 不能过河
                if ((color === 'red' && toRow < 5) || (color === 'black' && toRow > 4)) {
                    errors.push('象不能过河');
                }
                break;

            case 'advisor':
                // 士走斜线
                if (!(rowDiff === 1 && colDiff === 1)) {
                    errors.push('士必须走斜线');
                }
                // 不能出宫
                if (toCol < 3 || toCol > 5) {
                    errors.push('士不能出宫');
                }
                if ((color === 'red' && (toRow < 7 || toRow > 9)) ||
                    (color === 'black' && (toRow < 0 || toRow > 2))) {
                    errors.push('士不能出宫');
                }
                break;

            case 'king':
                // 将走一步
                if (rowDiff + colDiff !== 1) {
                    errors.push('将只能走一步');
                }
                // 不能出宫
                if (toCol < 3 || toCol > 5) {
                    errors.push('将不能出宫');
                }
                if ((color === 'red' && (toRow < 7 || toRow > 9)) ||
                    (color === 'black' && (toRow < 0 || toRow > 2))) {
                    errors.push('将不能出宫');
                }
                break;

            case 'cannon':
            case 'rook':
                // 车炮直线移动
                if (rowDiff > 0 && colDiff > 0) {
                    errors.push(`${pieceType === 'cannon' ? '炮' : '车'}只能直线移动`);
                }
                break;

            case 'soldier':
                // 兵/卒移动限制
                const maxStep = 1;
                if (rowDiff > maxStep || colDiff > maxStep) {
                    errors.push(`${color === 'red' ? '兵' : '卒'}一次只能移动一步`);
                }
                break;
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    /**
     * 移动路径验证
     */
    validateMovePath(move, context) {
        const errors = [];
        const warnings = [];

        const { board } = context;
        if (!board) {
            warnings.push('缺少棋盘信息无法验证路径');
            return { valid: true, errors, warnings };
        }

        const { fromPos, toPos, pieceType } = move;
        const [fromRow, fromCol] = fromPos;
        const [toRow, toCol] = toPos;

        // 检查路径是否清晰（除马象外）
        if (!['horse', 'elephant', 'advisor', 'king', 'soldier'].includes(pieceType)) {
            const pathBlocked = this.isPathBlocked(fromPos, toPos, board);
            if (pathBlocked) {
                errors.push('移动路径被阻挡');
            }
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    /**
     * 棋子存在性验证
     */
    validatePieceExists(move, board) {
        const errors = [];

        const { fromPos, color, pieceType } = move;
        const [fromRow, fromCol] = fromPos;

        // 检查起始位置是否有对应棋子
        if (board[fromRow] && board[fromRow][fromCol]) {
            const piece = board[fromRow][fromCol];
            if (piece.color !== color || piece.type !== pieceType) {
                errors.push(`起始位置(${fromRow},${fromCol})的棋子不匹配: 期望${color} ${pieceType}, 实际${piece.color} ${piece.type}`);
            }
        } else {
            errors.push(`起始位置(${fromRow},${fromCol})没有棋子`);
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * 合法移动验证（使用move-validator）
     */
    validateLegalMove(move, gameState) {
        const errors = [];

        // 这里需要调用move-validator的isValidMove方法
        if (gameState && gameState.moveValidator) {
            try {
                const [fromRow, fromCol] = move.fromPos;
                const [toRow, toCol] = move.toPos;

                // 构造棋子数据
                const piece = gameState.getPieceAt(fromRow, fromCol);
                if (piece) {
                    const isLegal = gameState.moveValidator.isValidMove(
                        toRow, toCol, piece, gameState
                    );

                    if (!isLegal) {
                        errors.push('移动不符合中国象棋规则');
                    }
                }
            } catch (error) {
                errors.push(`规则验证失败: ${error.message}`);
            }
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * 将军安全验证
     */
    validateKingSafety(move, context) {
        const errors = [];
        const warnings = [];

        const { board, moveHistory } = context;
        if (!board) {
            warnings.push('缺少棋盘信息无法验证将军情况');
            return { valid: true, errors, warnings };
        }

        // 模拟移动并检查是否造成将军
        const tempBoard = this.simulateMove(move, board);
        if (this.isKingInCheck(tempBoard, move.color === 'red' ? 'black' : 'red')) {
            errors.push('此移动会导致己方被将军');
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    /**
     * 游戏规则验证
     */
    validateGameRules(move, context) {
        const errors = [];
        const warnings = [];

        // 检查是否会导致将帅照面
        const tempBoard = this.simulateMove(move, context.board);
        if (this.areKingsFacing(tempBoard)) {
            errors.push('将帅不能照面');
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    /**
     * 回合顺序验证
     */
    validateTurnOrder(move, moveIndex) {
        const errors = [];
        const expectedColor = moveIndex % 2 === 0 ? 'red' : 'black';

        if (move.color !== expectedColor) {
            errors.push(`回合顺序错误: 第${moveIndex + 1}步应该是${expectedColor}方，却是${move.color}方`);
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * 棋谱连续性验证
     */
    validateMoveContinuity(move, moveHistory) {
        const errors = [];
        const warnings = [];

        if (moveHistory.length > 0) {
            const lastMove = moveHistory[moveHistory.length - 1];

            // 检查棋子位置连续性
            if (lastMove) {
                const expectedFromPos = lastMove.toPos;
                const actualFromPos = move.fromPos;

                if (expectedFromPos[0] !== actualFromPos[0] || expectedFromPos[1] !== actualFromPos[1]) {
                    warnings.push(`棋子位置不连续: 期望从${expectedFromPos}开始，实际从${actualFromPos}开始`);
                }
            }
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    /**
     * 棋子状态一致性验证
     */
    validatePieceConsistency(move, moveHistory) {
        const errors = [];

        // 这里可以实现更复杂的棋子状态追踪
        // 例如检查棋子是否已经被吃掉等

        return { valid: errors.length === 0, errors };
    }

    /**
     * 序列一致性验证
     */
    validateSequenceConsistency(sequenceResults, context) {
        const errors = [];
        const warnings = [];

        // 检查成功率
        const successCount = sequenceResults.filter(r => r.valid).length;
        const totalCount = sequenceResults.length;
        const successRate = (successCount / totalCount * 100).toFixed(2);

        if (parseFloat(successRate) < 50) {
            errors.push(`棋谱成功率过低: ${successRate}% (${successCount}/${totalCount})`);
        } else if (parseFloat(successRate) < 80) {
            warnings.push(`棋谱成功率较低: ${successRate}%`);
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    /**
     * 检查路径是否被阻挡
     */
    isPathBlocked(fromPos, toPos, board) {
        const [fromRow, fromCol] = fromPos;
        const [toRow, toCol] = toPos;

        // 获取路径上的所有坐标（不包括起点和终点）
        const path = this.getPath(fromPos, toPos);

        for (const [row, col] of path) {
            if (board[row][col] !== null) {
                return true; // 路径被阻挡
            }
        }

        return false;
    }

    /**
     * 获取移动路径
     */
    getPath(fromPos, toPos) {
        const [fromRow, fromCol] = fromPos;
        const [toRow, toCol] = toPos;
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

    /**
     * 模拟移动
     */
    simulateMove(move, board) {
        if (!board) return null;

        // 深拷贝棋盘数组
        const newBoard = board.map(row => [...row]);

        const [fromRow, fromCol] = move.fromPos;
        const [toRow, toCol] = move.toPos;

        // 执行移动
        newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
        newBoard[fromRow][fromCol] = null;

        return newBoard;
    }

    /**
     * 检查是否将军
     */
    isKingInCheck(board, color) {
        // 这里需要实现将军检查逻辑
        // 由于比较复杂，暂时返回false
        return false;
    }

    /**
     * 检查将帅是否照面
     */
    areKingsFacing(board) {
        // 这里需要实现将帅照面检查逻辑
        // 由于比较复杂，暂时返回false
        return false;
    }

    /**
     * 设置验证配置
     */
    setValidationConfig(config) {
        this.validationConfig = { ...this.validationConfig, ...config };
    }

    /**
     * 获取验证统计信息
     */
    getValidationStatistics(results) {
        return {
            totalLayers: Object.keys(results.layerResults || {}).length,
            passedLayers: Object.values(results.layerResults || {}).filter(r => r.valid).length,
            totalErrors: results.errors.length,
            totalWarnings: results.warnings.length
        };
    }
}

// 导出到全局作用域
if (typeof window !== 'undefined') {
    window.LayeredValidator = LayeredValidator;
}

// 导出供模块系统使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LayeredValidator };
}