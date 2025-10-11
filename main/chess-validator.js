/**
 * Chess Validator - 简化的中国象棋验证器
 *
 * 从原来的layered-validator.js简化而来，专注于核心验证功能
 * 移除过度工程化的4层架构，保留实用的基础验证
 *
 * @fileoverview 简化验证器
 * @version 2.1.0
 * @author Claude Code Review System
 * @since 2024-10-11
 */

/**
 * @typedef {import('./types').PlayerColor} PlayerColor
 * @typedef {import('./types').PieceType} PieceType
 * @typedef {import('./types').Position} Position
 * @typedef {import('./types').Move} Move
 * @typedef {import('./types').ChessGameData} ChessGameData
 * @typedef {import('./types').ValidationOptions} ValidationOptions
 * @typedef {import('./types').ValidationResult} ValidationResult
 * @typedef {import('./types').ValidationError} ValidationError
 * @typedef {import('./types').ValidationWarning} ValidationWarning
 */

/**
 * 简化的中国象棋验证器
 * 专注于实用性，移除过度工程化功能
 */
class ChessValidator {
    constructor(options = {}) {
        /**
         * @private
         * 基础验证配置
         */
        this.config = {
            strict: false,
            autoFix: true,
            maxErrors: 10,
            skipOnError: true,
            ...options
        };

        // 性能优化：缓存系统
        this.cache = options.cache || null;

        /**
         * @private
         * 有效棋子类型映射（简化版本）
         */
        this.pieceTypeMap = {
            帥: 'king', 将: 'king',
            仕: 'advisor', 士: 'advisor',
            相: 'elephant', 象: 'elephant',
            馬: 'horse', 马: 'horse',
            車: 'rook', 车: 'rook',
            炮: 'cannon', 砲: 'cannon',
            兵: 'soldier', 卒: 'soldier'
        };

        /**
         * @private
         * 有效颜色
         */
        this.validColors = ['red', 'black'];

        /**
         * @private
         * 基础错误代码
         */
        this.errorCodes = {
            INVALID_COLOR: 'INVALID_COLOR',
            INVALID_PIECE_TYPE: 'INVALID_PIECE_TYPE',
            INVALID_POSITION: 'INVALID_POSITION',
            MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
            INVALID_MOVE_DIRECTION: 'INVALID_MOVE_DIRECTION'
        };
    }

    /**
     * 验证单个移动数据
     * @param {unknown} moveData
     * @param {ValidationOptions} options
     * @returns {ValidationResult}
     */
    validateMove(moveData, options = {}) {
        const config = { ...this.config, ...options };

        // 使用缓存优化验证
        if (this.cache && moveData) {
            const cacheKey = this.cache.generateValidationKey(this.normalizeMove(moveData, false));
            const cached = this.cache.validationCache(cacheKey);
            if (cached !== null) {
                return cached;
            }
        }

        const errors = [];
        const warnings = [];

        try {
            // 类型检查
            if (!moveData || typeof moveData !== 'object') {
                errors.push(this.createError(
                    this.errorCodes.MISSING_REQUIRED_FIELD,
                    '移动数据必须是有效的对象',
                    -1,
                    'data'
                ));
                const result = this.createResult(false, 0, 0, errors, warnings);
                if (this.cache && moveData) {
                    this.cache.validationCache(this.cache.generateValidationKey(moveData), result);
                }
                return result;
            }

            const move = this.normalizeMove(moveData, config.autoFix);

            // 基础字段验证
            const fieldErrors = this.validateRequiredFields(move);
            errors.push(...fieldErrors);

            // 如果字段验证失败，提前返回
            if (fieldErrors.length > 0 && !config.strict) {
                return this.createResult(false, 1, fieldErrors.length, errors, warnings);
            }

            // 值验证
            const valueErrors = this.validateFieldValues(move);
            errors.push(...valueErrors);

            // 位置验证
            const positionErrors = this.validatePositions(move);
            errors.push(...positionErrors);

            // 移动逻辑验证
            if (errors.length === 0) {
                const logicErrors = this.validateMoveLogic(move);
                errors.push(...logicErrors);
            }

            // 生成警告
            const moveWarnings = this.generateWarnings(move);
            warnings.push(...moveWarnings);

            const isValid = errors.length === 0 || config.skipOnError;
            const validMoves = isValid ? 1 : 0;
            const errorMoves = isValid ? 0 : errors.length;

            return this.createResult(isValid, 1, errorMoves, errors, warnings, [move]);

        } catch (error) {
            errors.push(this.createError(
                'VALIDATION_EXCEPTION',
                `验证过程中发生异常: ${error.message}`,
                -1,
                'critical'
            ));

            return this.createResult(false, 1, 1, errors, warnings);
        }
    }

    /**
     * 验证移动序列
     * @param {unknown[]} movesData
     * @param {ValidationOptions} options
     * @returns {ValidationResult}
     */
    validateMoveSequence(movesData, options = {}) {
        const config = { ...this.config, ...options };
        const errors = [];
        const warnings = [];
        const normalizedMoves = [];

        if (!Array.isArray(movesData)) {
            errors.push(this.createError(
                this.errorCodes.MISSING_REQUIRED_FIELD,
                '移动数据必须是数组格式',
                -1,
                'data'
            ));
            return this.createResult(false, 0, 0, errors, warnings);
        }

        let validMoves = 0;
        let errorMoves = 0;

        // 逐个验证移动
        for (let i = 0; i < movesData.length; i++) {
            if (errors.length >= config.maxErrors) {
                warnings.push({
                    code: 'VALIDATION_LIMIT_REACHED',
                    message: `达到最大错误限制 (${config.maxErrors})，停止后续验证`,
                    moveIndex: i,
                    layer: 'sequence'
                });
                break;
            }

            const moveResult = this.validateMove(movesData[i], config);
            normalizedMoves.push(...(moveResult.normalizedMoves || []));

            if (moveResult.valid) {
                validMoves++;
            } else {
                errorMoves++;
                errors.push(...moveResult.errors);
            }

            warnings.push(...moveResult.warnings);
        }

        // 序列级别验证
        const sequenceErrors = this.validateSequenceConsistency(normalizedMoves);
        errors.push(...sequenceErrors);

        const isValid = errors.length === 0 || config.skipOnError;
        const totalMoves = movesData.length;

        return this.createResult(isValid, totalMoves, errorMoves, errors, warnings, normalizedMoves);
    }

    /**
     * 标准化移动数据格式
     * @private
     * @param {unknown} moveData
     * @param {boolean} autoFix
     * @returns {Move}
     */
    normalizeMove(moveData, autoFix = true) {
        const move = { ...(moveData || {}) };

        // 标准化棋子类型
        if (this.pieceTypeMap[move.pieceType]) {
            move.pieceType = this.pieceTypeMap[move.pieceType];
        }

        // 标准化位置格式
        if (move.fromPos && Array.isArray(move.fromPos)) {
            move.fromPos = {
                row: move.fromPos[0],
                col: move.fromPos[1]
            };
        }

        if (move.toPos && Array.isArray(move.toPos)) {
            move.toPos = {
                row: move.toPos[0],
                col: move.toPos[1]
            };
        }

        // 自动修复默认值
        if (autoFix) {
            move.notation = move.notation || `${move.pieceType || 'unknown'} move`;
            move.color = move.color || 'red';
        }

        return move;
    }

    /**
     * 验证必需字段
     * @private
     * @param {Move} move
     * @returns {ValidationError[]}
     */
    validateRequiredFields(move) {
        const errors = [];
        const requiredFields = ['pieceType', 'color'];

        requiredFields.forEach(field => {
            if (!move[field]) {
                errors.push(this.createError(
                    this.errorCodes.MISSING_REQUIRED_FIELD,
                    `缺少必需字段: ${field}`,
                    -1,
                    'data'
                ));
            }
        });

        return errors;
    }

    /**
     * 验证字段值
     * @private
     * @param {Move} move
     * @returns {ValidationError[]}
     */
    validateFieldValues(move) {
        const errors = [];

        // 验证颜色
        if (!this.validColors.includes(move.color)) {
            errors.push(this.createError(
                this.errorCodes.INVALID_COLOR,
                `无效的颜色: ${move.color}，必须是 ${this.validColors.join(' 或 ')}`,
                -1,
                'data'
            ));
        }

        // 验证棋子类型
        if (move.pieceType && !Object.values(this.pieceTypeMap).includes(move.pieceType)) {
            errors.push(this.createError(
                this.errorCodes.INVALID_PIECE_TYPE,
                `无效的棋子类型: ${move.pieceType}`,
                -1,
                'data'
            ));
        }

        return errors;
    }

    /**
     * 验证位置数据
     * @private
     * @param {Move} move
     * @returns {ValidationError[]}
     */
    validatePositions(move) {
        const errors = [];

        // 验证起始位置
        if (move.fromPos && !this.isValidPosition(move.fromPos)) {
            errors.push(this.createError(
                this.errorCodes.INVALID_POSITION,
                `无效的起始位置: (${move.fromPos.row}, ${move.fromPos.col})`,
                -1,
                'data'
            ));
        }

        // 验证目标位置
        if (move.toPos && !this.isValidPosition(move.toPos)) {
            errors.push(this.createError(
                this.errorCodes.INVALID_POSITION,
                `无效的目标位置: (${move.toPos.row}, ${move.toPos.col})`,
                -1,
                'data'
            ));
        }

        return errors;
    }

    /**
     * 验证位置是否在棋盘范围内
     * @private
     * @param {Position} position
     * @returns {boolean}
     */
    isValidPosition(position) {
        return position &&
               typeof position.row === 'number' &&
               typeof position.col === 'number' &&
               position.row >= 0 && position.row <= 9 &&
               position.col >= 0 && position.col <= 8;
    }

    /**
     * 验证移动逻辑
     * @private
     * @param {Move} move
     * @returns {ValidationError[]}
     */
    validateMoveLogic(move) {
        const errors = [];

        // 检查移动距离是否合理
        if (move.fromPos && move.toPos) {
            const rowDiff = Math.abs(move.toPos.row - move.fromPos.row);
            const colDiff = Math.abs(move.toPos.col - move.fromPos.col);

            // 检查是否有实际移动
            if (rowDiff === 0 && colDiff === 0) {
                errors.push(this.createError(
                    'NO_MOVE',
                    '棋子没有移动',
                    -1,
                    'logic'
                ));
            }

            // 检查移动距离是否过大（可能是数据错误）
            if (rowDiff > 10 || colDiff > 10) {
                errors.push(this.createError(
                    'INVALID_MOVE_DISTANCE',
                    '移动距离过大，可能是数据错误',
                    -1,
                    'logic'
                ));
            }
        }

        return errors;
    }

    /**
     * 验证序列一致性
     * @private
     * @param {Move[]} moves
     * @returns {ValidationError[]}
     */
    validateSequenceConsistency(moves) {
        const errors = [];

        if (moves.length === 0) return errors;

        // 检查颜色交替
        for (let i = 1; i < moves.length; i++) {
            if (moves[i].color === moves[i-1].color) {
                errors.push(this.createError(
                    'INVALID_COLOR_SEQUENCE',
                    `第${i+1}步颜色序列错误: 连续${moves[i].color}色移动`,
                    i,
                    'sequence'
                ));
            }
        }

        // 检查棋子分布的合理性
        const pieceTypes = moves.map(m => m.pieceType).filter(Boolean);
        const uniquePieceTypes = new Set(pieceTypes);
        if (uniquePieceTypes.size > 7) {
            errors.push(this.createError(
                'EXCESSIVE_PIECE_TYPES',
                `棋谱中包含过多不同类型的棋子: ${uniquePieceTypes.size}`,
                -1,
                'sequence'
            ));
        }

        return errors;
    }

    /**
     * 生成警告信息
     * @private
     * @param {Move} move
     * @returns {ValidationWarning[]}
     */
    generateWarnings(move) {
        const warnings = [];

        // 检查记谱法缺失
        if (!move.notation || move.notation.trim() === '') {
            warnings.push({
                code: 'MISSING_NOTATION',
                message: '缺少棋谱记谱法',
                moveIndex: -1,
                layer: 'data',
                move
            });
        }

        return warnings;
    }

    /**
     * 创建错误对象
     * @private
     * @param {string} code
     * @param {string} message
     * @param {number} moveIndex
     * @param {string} layer
     * @returns {ValidationError}
     */
    createError(code, message, moveIndex, layer) {
        return {
            code,
            message,
            moveIndex,
            layer,
            severity: 'medium'
        };
    }

    /**
     * 创建验证结果
     * @private
     * @param {boolean} valid
     * @param {number} totalMoves
     * @param {number} errorMoves
     * @param {ValidationError[]} errors
     * @param {ValidationWarning[]} warnings
     * @param {Move[]} normalizedMoves
     * @returns {ValidationResult}
     */
    createResult(valid, totalMoves, errorMoves, errors, warnings, normalizedMoves = []) {
        return {
            valid,
            totalMoves,
            validMoves: totalMoves - errorMoves,
            errorMoves,
            errors,
            warnings,
            normalizedMoves: normalizedMoves.length > 0 ? normalizedMoves : undefined
        };
    }

    /**
     * 格式化验证报告
     * @param {ValidationResult} result
     * @returns {string}
     */
    formatValidationReport(result) {
        if (!result) return '无验证结果';

        let report = '\n=== 验证报告 ===\n';
        report += `总移动数: ${result.totalMoves}\n`;
        report += `有效移动: ${result.validMoves}\n`;
        report += `错误移动: ${result.errorMoves}\n`;

        if (result.errors.length > 0) {
            report += '\n错误详情:\n';
            result.errors.forEach((error, i) => {
                report += `${i + 1}. [${error.severity}] ${error.code}: ${error.message}\n`;
            });
        }

        if (result.warnings.length > 0) {
            report += '\n警告详情:\n';
            result.warnings.forEach((warning, i) => {
                report += `${i + 1}. ${warning.code}: ${warning.message}\n`;
            });
        }

        report += '\n状态: ' + (result.valid ? '✅ 通过' : '❌ 失败') + '\n';
        return report;
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChessValidator;
}