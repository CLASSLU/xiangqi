/**
 * ChessDataValidator 模块
 * 统一的棋谱数据验证、标准化和转换系统
 * 支持多种数据格式的输入验证和标准化输出
 */

class ChessDataValidator {
    constructor() {
        // 标准化的数据格式定义
        this.STANDARD_FORMAT = {
            color: 'string',      // 'red' | 'black'
            pieceType: 'string',  // 'king' | 'rook' | 'horse' | 'cannon' | 'elephant' | 'advisor' | 'soldier'
            fromPos: 'array',     // [row: number, col: number]
            toPos: 'array',       // [row: number, col: number]
            notation: 'string'    // optional, 棋谱记谱法
        };

        // 有效棋子类型
        this.VALID_PIECE_TYPES = ['king', 'rook', 'horse', 'cannon', 'elephant', 'advisor', 'soldier'];

        // 有效颜色
        this.VALID_COLORS = ['red', 'black'];

        // 棋盘边界
        this.BOARD_BOUNDS = {
            row: { min: 0, max: 9 },
            col: { min: 0, max: 8 }
        };
    }

    /**
     * 验证单个棋步数据的完整性和合法性
     * @param {any} move - 待验证的棋步数据
     * @param {Object} options - 验证选项
     * @returns {Object} 验证结果 {valid, errors, normalizedMove}
     */
    validateMove(move, options = {}) {
        const { strict = true, autoFix = false } = options;
        const errors = [];

        try {
            // 第一步：标准化数据格式
            const normalizedMove = this.normalizeMove(move, { autoFix });

            if (!normalizedMove) {
                errors.push('数据格式无法标准化');
                return { valid: false, errors, normalizedMove: null };
            }

            // 第二步：验证必需字段
            const fieldValidation = this.validateRequiredFields(normalizedMove);
            if (!fieldValidation.valid) {
                errors.push(...fieldValidation.errors);
                if (strict) {
                    return { valid: false, errors, normalizedMove: null };
                }
            }

            // 第三步：验证字段类型和值范围
            const valueValidation = this.validateFieldValues(normalizedMove);
            if (!valueValidation.valid) {
                errors.push(...valueValidation.errors);
                if (strict) {
                    return { valid: false, errors, normalizedMove: null };
                }
            }

            // 第四步：验证坐标合理性
            const coordinateValidation = this.validateCoordinates(normalizedMove);
            if (!coordinateValidation.valid) {
                errors.push(...coordinateValidation.errors);
                if (strict) {
                    return { valid: false, errors, normalizedMove: null };
                }
            }

            // 第五步：验证棋谱一致性（如果提供了notation）
            if (normalizedMove.notation) {
                const notationValidation = this.validateNotationConsistency(normalizedMove);
                if (!notationValidation.valid) {
                    errors.push(...notationValidation.errors);
                    // 记谱法错误不阻止验证通过，但会记录警告
                }
            }

            const warnings = [];

            // 第五步：验证棋谱一致性（如果提供了notation）
            if (normalizedMove.notation) {
                const notationResult = this.validateNotationConsistency(normalizedMove);
                if (!notationResult.valid) {
                    errors.push(...notationResult.errors);
                }
                // 记录警告
                if (notationResult.warnings) {
                    warnings.push(...notationResult.warnings);
                }
            }

            return {
                valid: errors.length === 0,
                errors,
                normalizedMove,
                warnings
            };

        } catch (error) {
            errors.push(`验证过程中发生错误: ${error.message}`);
            return { valid: false, errors, normalizedMove: null };
        }
    }

    /**
     * 验证棋步数组/序列
     * @param {Array} moves - 棋步数组
     * @param {Object} options - 验证选项
     * @returns {Object} 验证结果 {valid, errors, normalizedMoves, statistics}
     */
    validateMoveSequence(moves, options = {}) {
        const { strict = true, autoFix = true, maxErrors = 10 } = options;

        if (!Array.isArray(moves)) {
            return {
                valid: false,
                errors: ['棋步数据必须是数组'],
                normalizedMoves: [],
                statistics: null
            };
        }

        const normalizedMoves = [];
        const allErrors = [];
        const warnings = [];
        let validCount = 0;

        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];
            const result = this.validateMove(move, { strict, autoFix });

            if (result.valid) {
                normalizedMoves.push(result.normalizedMove);
                validCount++;
                if (result.warnings) {
                    warnings.push(...result.warnings.map(w => `步骤${i + 1}: ${w}`));
                }
            } else {
                allErrors.push(...result.errors.map(e => `步骤${i + 1}: ${e}`));

                // 限制错误数量避免过多输出
                if (allErrors.length >= maxErrors) {
                    allErrors.push(`... (还有 ${moves.length - i - 1} 个错误未显示)`);
                    break;
                }
            }
        }

        const statistics = {
            total: moves.length,
            valid: validCount,
            invalid: moves.length - validCount,
            validRate: (validCount / moves.length * 100).toFixed(2) + '%'
        };

        return {
            valid: allErrors.length === 0,
            errors: allErrors,
            warnings,
            normalizedMoves,
            statistics
        };
    }

    /**
     * 标准化棋步数据格式
     * @param {any} move - 输入的棋步数据
     * @param {Object} options - 标准化选项
     * @returns {Object|null} 标准化后的棋步对象或null
     */
    normalizeMove(move, options = {}) {
        const { autoFix = false } = options;

        if (!move || typeof move !== 'object') {
            return null;
        }

        // 格式1: [color, pieceType, [fromRow, fromCol], [toRow, toCol], notation]
        if (Array.isArray(move) && move.length >= 4) {
            const [color, pieceType, fromPos, toPos, notation] = move;

            if (!this.isValidColor(color) || !this.isValidPieceType(pieceType)) {
                return null;
            }

            if (!Array.isArray(fromPos) || !Array.isArray(toPos) ||
                fromPos.length !== 2 || toPos.length !== 2) {
                return null;
            }

            return {
                color,
                pieceType,
                fromPos: [...fromPos],
                toPos: [...toPos],
                notation: notation || null
            };
        }

        // 格式2: {color, pieceType, fromPos: [row, col], toPos: [row, col], notation}
        if (move.fromPos && move.toPos && Array.isArray(move.fromPos) && Array.isArray(move.toPos)) {
            if (!this.isValidColor(move.color) || !this.isValidPieceType(move.pieceType)) {
                return null;
            }

            if (move.fromPos.length !== 2 || move.toPos.length !== 2) {
                return null;
            }

            return {
                color: move.color,
                pieceType: move.pieceType,
                fromPos: [...move.fromPos],
                toPos: [...move.toPos],
                notation: move.notation || null
            };
        }

        // 格式3: {color, pieceType, from: {row, col}, to: {row, col}, notation}
        if (move.from && move.to && typeof move.from === 'object' && typeof move.to === 'object') {
            if (!this.isValidColor(move.color) || !this.isValidPieceType(move.pieceType)) {
                return null;
            }

            if (move.from.row === undefined || move.from.col === undefined ||
                move.to.row === undefined || move.to.col === undefined) {
                return null;
            }

            return {
                color: move.color,
                pieceType: move.pieceType,
                fromPos: [move.from.row, move.from.col],
                toPos: [move.to.row, move.to.col],
                notation: move.notation || null
            };
        }

        // 格式4: 尝试容错修复
        if (autoFix) {
            return this.attemptAutoFix(move);
        }

        return null;
    }

    /**
     * 验证必需字段
     * @param {Object} move - 标准化的棋步对象
     * @returns {Object} 验证结果
     */
    validateRequiredFields(move) {
        const errors = [];
        const requiredFields = Object.keys(this.STANDARD_FORMAT);

        for (const field of requiredFields) {
            if (field !== 'notation' && (move[field] === undefined || move[field] === null)) {
                errors.push(`缺少必需字段: ${field}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 验证字段值类型和范围
     * @param {Object} move - 标准化的棋步对象
     * @returns {Object} 验证结果
     */
    validateFieldValues(move) {
        const errors = [];

        // 验证颜色
        if (!this.isValidColor(move.color)) {
            errors.push(`无效的颜色: ${move.color}`);
        }

        // 验证棋子类型
        if (!this.isValidPieceType(move.pieceType)) {
            errors.push(`无效的棋子类型: ${move.pieceType}`);
        }

        // 验证记谱法（如果存在）
        if (move.notation && typeof move.notation !== 'string') {
            errors.push(`记谱法必须是字符串，收到: ${typeof move.notation}`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 验证坐标是否合法
     * @param {Object} move - 标准化的棋步对象
     * @returns {Object} 验证结果
     */
    validateCoordinates(move) {
        const errors = [];

        // 验证fromPos
        const fromValidation = this.validateCoordinatePair(move.fromPos, 'fromPos');
        errors.push(...fromValidation.errors);

        // 验证toPos
        const toValidation = this.validateCoordinatePair(move.toPos, 'toPos');
        errors.push(...toValidation.errors);

        // 验证移动合理性（不能原地不动）
        if (move.fromPos[0] === move.toPos[0] && move.fromPos[1] === move.toPos[1]) {
            errors.push('起始位置和目标位置不能相同');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 验证坐标对
     * @param {Array} coord - 坐标数组 [row, col]
     * @param {string} fieldName - 字段名称
     * @returns {Object} 验证结果
     */
    validateCoordinatePair(coord, fieldName) {
        const errors = [];

        if (!Array.isArray(coord) || coord.length !== 2) {
            errors.push(`${fieldName} 必须是包含两个元素的数组 [row, col]`);
            return { valid: false, errors };
        }

        const [row, col] = coord;

        // 类型检查
        if (!Number.isInteger(row) || !Number.isInteger(col)) {
            errors.push(`${fieldName} 坐标必须是整数，收到: [${row}, ${col}]`);
            return { valid: false, errors };
        }

        // 检查NaN和无穷大
        if (isNaN(row) || isNaN(col) || !isFinite(row) || !isFinite(col)) {
            errors.push(`${fieldName} 坐标包含无效数值: [${row}, ${col}]`);
            return { valid: false, errors };
        }

        // 边界检查
        if (row < this.BOARD_BOUNDS.row.min || row > this.BOARD_BOUNDS.row.max) {
            errors.push(`${fieldName} 行坐标超出范围 (${row})，应在 ${this.BOARD_BOUNDS.row.min}-${this.BOARD_BOUNDS.row.max} 之间`);
        }

        if (col < this.BOARD_BOUNDS.col.min || col > this.BOARD_BOUNDS.col.max) {
            errors.push(`${fieldName} 列坐标超出范围 (${col})，应在 ${this.BOARD_BOUNDS.col.min}-${this.BOARD_BOUNDS.col.max} 之间`);
        }

        // 极端值检查
        if (Math.abs(row) > 50 || Math.abs(col) > 50) {
            errors.push(`${fieldName} 坐标出现极端值 [${row}, ${col}]，可能存在累积计算错误`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 验证记谱法一致性（基础检查）
     * @param {Object} move - 标准化的棋步对象
     * @returns {Object} 验证结果
     */
    validateNotationConsistency(move) {
        const warnings = [];

        if (!move.notation) {
            return { valid: true, warnings };
        }

        // 基础记谱法格式检查
        const notationPattern = /^[\u4e00-\u9fff]+$/;
        if (!notationPattern.test(move.notation)) {
            warnings.push(`记谱法格式异常: ${move.notation}`);
        }

        return {
            valid: true,
            warnings
        };
    }

    /**
     * 尝试自动修复数据格式
     * @param {any} move - 输入数据
     * @returns {Object|null} 修复后的数据或null
     */
    attemptAutoFix(move) {
        // 这里可以实现更多的自动修复逻辑
        // 目前返回null，表示无法修复
        console.warn('无法自动修复数据格式:', move);
        return null;
    }

    /**
     * 检查颜色是否有效
     * @param {string} color - 颜色
     * @returns {boolean}
     */
    isValidColor(color) {
        return this.VALID_COLORS.includes(color);
    }

    /**
     * 检查棋子类型是否有效
     * @param {string} pieceType - 棋子类型
     * @returns {boolean}
     */
    isValidPieceType(pieceType) {
        return this.VALID_PIECE_TYPES.includes(pieceType);
    }

    /**
     * 获取验证统计信息
     * @param {Object} validationResult - 验证结果
     * @returns {string} 格式化的统计信息
     */
    formatValidationReport(validationResult) {
        if (!validationResult.statistics) {
            return '无统计信息';
        }

        const { total, valid, invalid, validRate } = validationResult.statistics;
        let report = `验证统计: ${valid}/${total} (${validRate})`;

        if (validationResult.errors.length > 0) {
            report += `\n错误数量: ${validationResult.errors.length}`;
        }

        if (validationResult.warnings && validationResult.warnings.length > 0) {
            report += `\n警告数量: ${validationResult.warnings.length}`;
        }

        return report;
    }
}

// 导出到全局作用域
if (typeof window !== 'undefined') {
    window.ChessDataValidator = ChessDataValidator;
}

// 导出供模块系统使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChessDataValidator };
}