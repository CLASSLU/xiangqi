"use strict";
/**
 * ChessValidator - 高性能棋谱验证器 v2.1
 *
 * 提供棋谱数据验证和错误修复功能
 * 使用智能缓存系统解决O(n³)复杂度问题
 * 支持大数据场景 (103,800条棋谱) 的高效验证
 *
 * @fileoverview 高性能棋谱验证器
 * @version 2.1.0
 * @author Claude Code Review System
 * @since 2024-10-11
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChessValidator = void 0;
const performance_cache_js_1 = require("./performance-cache.js");
/**
 * 高性能棋谱验证器
 */
class ChessValidator {
    constructor(options = {}) {
        // 性能缓存系统
        this.cache = options.cache || new performance_cache_js_1.PerformanceCache({
            maxValidationCacheSize: options.maxValidationCacheSize || 10000,
            enableIntelligentCache: true,
            enablePerformanceMonitoring: true
        });

        // 配置选项
        this.options = {
            enableBatching: options.enableBatching !== false,
            batchSize: options.batchSize || 100,
            strictMode: options.strictMode !== false,
            enableEarlyExit: options.enableEarlyExit !== false,
            maxErrors: options.maxErrors || 100,
            ...options
        };

        // 验证性能统计
        this.validationStats = {
            totalValidations: 0,
            batchValidations: 0,
            earlyExits: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averageValidationTime: 0,
            lastValidationDuration: 0
        };
    }
    /**
     * 高性能移动序列验证 - 解决O(n³)复杂度问题
     * @param {Move[]} moves - 移动数组
     * @param {ValidationOptions} options - 验证选项
     * @returns {ValidationResult} 验证结果
     */
    validateMoveSequence(moves, options = {}) {
        const startTime = performance.now();
        this.validationStats.totalValidations++;

        const defaultOptions = {
            strict: true,
            autoFix: false,
            maxErrors: 100,
            faultTolerant: false,
            preserveSequence: true,
            enableCache: true,
            batchSize: this.options.batchSize
        };
        const mergedOptions = { ...defaultOptions, ...options };

        const result = {
            valid: true,
            totalMoves: moves.length,
            validMoves: 0,
            errorMoves: 0,
            errors: [],
            warnings: [],
            layerStatistics: {},
            normalizedMoves: [],
            performanceMetrics: {
                validationTime: 0,
                cacheHitRatio: '0%',
                optimizations: []
            }
        };

        try {
            // 第1层：快速前置检查 - O(1)
            if (!this.validateInputStructure(moves, result)) {
                this.updateValidationStats(performance.now() - startTime, false);
                return result;
            }

            // 第2层：智能批量验证 - O(n) 通过缓存优化
            if (mergedOptions.enableCache && this.options.enableBatching && moves.length > 10) {
                return this.batchValidateMoves(moves, mergedOptions, startTime, result);
            }

            // 第3层：增量验证 - 支持早期退出
            if (mergedOptions.enableEarlyExit) {
                return this.incrementalValidateMoves(moves, mergedOptions, startTime, result);
            }

            // 第4层：传统验证（兼容模式）
            return this.standardValidateMoves(moves, mergedOptions, startTime, result);

        } catch (error) {
            const err = error;
            result.valid = false;
            result.errors.push({
                code: 'VALIDATION_EXCEPTION',
                message: `验证过程中发生异常: ${err.message}`,
                moveIndex: -1,
                layer: 'system',
                severity: 'critical'
            });

            this.updateValidationStats(performance.now() - startTime, false);
            return result;
        }
    }

    /**
     * 批量移动验证 - 高性能处理大数据场景
     * @param {Move[]} moves - 移动数组
     * @param {ValidationOptions} options - 验证选项
     * @param {number} startTime - 开始时间
     * @param {ValidationResult} result - 结果对象
     * @returns {ValidationResult} 验证结果
     * @private
     */
    batchValidateMoves(moves, options, startTime, result) {
        this.validationStats.batchValidations++;

        // 按批次处理移动
        const batches = this.createValidationBatches(moves, options.batchSize);
        let batchIndex = 0;

        const validationRequests = [];
        const batchMapping = [];

        // 准备批量验证请求
        batches.forEach((batch, bIndex) => {
            batch.forEach((move, mIndex) => {
                const originalIndex = batchIndex + mIndex;
                validationRequests.push({
                    key: `validateMove_${originalIndex}`,
                    params: {
                        move,
                        index: originalIndex,
                        strict: options.strict,
                        context: this.extractMoveContext(moves, originalIndex)
                    },
                    originalIndex
                });
                batchMapping.push({ batchIndex: bIndex, originalIndex });
            });
            batchIndex += batch.length;
        });

        // 执行批量验证缓存查询
        const batchResults = this.cache.batchValidationCache(
            validationRequests,
            (params) => this.computeMoveValidation(params)
        );

        // 处理批量结果
        this.processBatchResults(batchResults, result, options);

        // 记录性能指标
        const duration = performance.now() - startTime;
        result.performanceMetrics = {
            validationTime: duration,
            cacheHitRatio: this.getCacheHitRatio(),
            optimizations: ['batch_validation', 'intelligent_cache']
        };

        this.updateValidationStats(duration, result.valid);
        this.validationStats.batchValidations++;
        return result;
    }

    /**
     * 增量验证 - 支持早期退出优化
     * @param {Move[]} moves - 移动数组
     * @param {ValidationOptions} options - 验证选项
     * @param {number} startTime - 开始时间
     * @param {ValidationResult} result - 结果对象
     * @returns {ValidationResult} 验证结果
     * @private
     */
    incrementalValidateMoves(moves, options, startTime, result) {
        const maxErrorRate = 0.1; // 10%错误率阈值
        const checkInterval = Math.min(50, Math.max(10, Math.floor(moves.length * 0.1)));

        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];

            // 使用智能缓存验证单个移动
            const moveValidation = this.validateSingleMoveWithCache(move, i, options);

            if (moveValidation.isValid) {
                result.validMoves++;
                if (result.normalizedMoves) {
                    result.normalizedMoves.push(moveValidation.normalizedMove);
                }
            } else {
                result.errorMoves++;
                result.errors.push(...moveValidation.errors);

                // 检查是否需要早期退出
                if (!options.faultTolerant) {
                    result.valid = false;
                }

                // 增量检查机制
                if ((i + 1) % checkInterval === 0) {
                    const currentErrorRate = result.errorMoves / (i + 1);
                    if (currentErrorRate > maxErrorRate) {
                        this.validationStats.earlyExits++;
                        result.warnings.push({
                            code: 'EARLY_EXIT',
                            message: `错误率过高 (${(currentErrorRate * 100).toFixed(1)}%)，触发早期退出优化`,
                            moveIndex: i,
                            layer: 'performance',
                            severity: 'info'
                        });
                        break;
                    }

                    // 错误数量检查
                    if (result.errors.length >= options.maxErrors) {
                        this.validationStats.earlyExits++;
                        break;
                    }
                }
            }
        }

        // 最终有效性判断
        this.finalizeValidationResult(result, options);

        // 记录性能指标
        const duration = performance.now() - startTime;
        result.performanceMetrics = {
            validationTime: duration,
            cacheHitRatio: this.getCacheHitRatio(),
            optimizations: ['incremental_validation', 'early_exit']
        };

        this.updateValidationStats(duration, result.valid);
        return result;
    }

    /**
     * 标准验证 - 兼容模式
     * @param {Move[]} moves - 移动数组
     * @param {ValidationOptions} options - 验证选项
     * @param {number} startTime - 开始时间
     * @param {ValidationResult} result - 结果对象
     * @returns {ValidationResult} 验证结果
     * @private
     */
    standardValidateMoves(moves, options, startTime, result) {
        // 验证每个移动
        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];
            const moveValidation = this.validateSingleMoveWithCache(move, i, options);

            if (moveValidation.isValid) {
                result.validMoves++;
                if (result.normalizedMoves) {
                    result.normalizedMoves.push(moveValidation.normalizedMove);
                }
            } else {
                result.errorMoves++;
                result.errors.push(...moveValidation.errors);
                if (!options.faultTolerant) {
                    result.valid = false;
                }
            }

            // 错误数量检查
            if (result.errors.length >= options.maxErrors) {
                break;
            }
        }

        // 最终有效性判断
        this.finalizeValidationResult(result, options);

        // 记录性能指标
        const duration = performance.now() - startTime;
        result.performanceMetrics = {
            validationTime: duration,
            cacheHitRatio: this.getCacheHitRatio(),
            optimizations: ['standard_validation']
        };

        this.updateValidationStats(duration, result.valid);
        return result;
    }
    /**
     * 输入结构验证 - O(1) 快速检查
     * @param {Move[]} moves - 移动数组
     * @param {ValidationResult} result - 结果对象
     * @returns {boolean} 是否通过检查
     * @private
     */
    validateInputStructure(moves, result) {
        // 基础结构验证
        if (!Array.isArray(moves)) {
            result.valid = false;
            result.errors.push({
                code: 'INVALID_INPUT_TYPE',
                message: '移动数据必须是数组格式',
                moveIndex: -1,
                layer: 'structure',
                severity: 'critical'
            });
            return false;
        }

        // 空数组检查
        if (moves.length === 0) {
            result.warnings.push({
                code: 'EMPTY_MOVE_SEQUENCE',
                message: '移动序列为空',
                moveIndex: -1,
                layer: 'structure',
                severity: 'info'
            });
            return true;
        }

        // 大数据场景预警
        if (moves.length > 50000) {
            result.warnings.push({
                code: 'LARGE_DATA_SET',
                message: `移动序列较大 (${moves.length} 步)，将启用高性能优化模式`,
                moveIndex: -1,
                layer: 'performance',
                severity: 'info'
            });
        }

        return true;
    }

    /**
     * 创建验证批次
     * @param {Move[]} moves - 移动数组
     * @param {number} batchSize - 批次大小
     * @returns {Array} 批次数组
     * @private
     */
    createValidationBatches(moves, batchSize) {
        const batches = [];
        for (let i = 0; i < moves.length; i += batchSize) {
            batches.push(moves.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * 提取移动上下文
     * @param {Move[]} moves - 移动数组
     * @param {number} index - 当前索引
     * @returns {Object} 上下文信息
     * @private
     */
    extractMoveContext(moves, index) {
        return {
            previousMove: index > 0 ? moves[index - 1] : null,
            moveNumber: index + 1,
            totalMoves: moves.length,
            sequencePrefix: moves.slice(Math.max(0, index - 2), index)
        };
    }

    /**
     * 计算移动验证结果
     * @param {Object} params - 验证参数
     * @returns {Object} 验证结果
     * @private
     */
    computeMoveValidation(params) {
        const { move, index, strict, context } = params;
        return this.validateSingleMoveInternal(move, index, strict, context);
    }

    /**
     * 处理批量验证结果
     * @param {Array} batchResults - 批量结果
     * @param {ValidationResult} result - 结果对象
     * @param {ValidationOptions} options - 验证选项
     * @private
     */
    processBatchResults(batchResults, result, options) {
        batchResults.forEach((validationResult, index) => {
            if (validationResult.isValid) {
                result.validMoves++;
                if (result.normalizedMoves) {
                    result.normalizedMoves.push(validationResult.normalizedMove);
                }
            } else {
                result.errorMoves++;
                result.errors.push(...validationResult.errors);

                if (!options.faultTolerant) {
                    result.valid = false;
                }

                // 错误数量检查
                if (result.errors.length >= options.maxErrors) {
                    return;
                }
            }
        });
    }

    /**
     * 最终化验证结果
     * @param {ValidationResult} result - 结果对象
     * @param {ValidationOptions} options - 验证选项
     * @private
     */
    finalizeValidationResult(result, options) {
        // 最终有效性判断
        if (result.errorMoves === 0) {
            result.valid = true;
        } else if (result.errorMoves > 0 && options.strict) {
            result.valid = false;
        }

        // 生成层级统计
        result.layerStatistics = this.generateLayerStatistics(result.errors);
    }

    /**
     * 生成层级统计
     * @param {Array} errors - 错误数组
     * @returns {Object} 层级统计
     * @private
     */
    generateLayerStatistics(errors) {
        const stats = {
            structure: 0,
            semantic: 0,
            system: 0,
            performance: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            info: 0
        };

        errors.forEach(error => {
            if (stats[error.layer] !== undefined) {
                stats[error.layer]++;
            }
            if (stats[error.severity] !== undefined) {
                stats[error.severity]++;
            }
        });

        return stats;
    }

    /**
     * 带缓存的单个移动验证
     * @param {Move} move - 移动数据
     * @param {number} index - 索引
     * @param {ValidationOptions} options - 验证选项
     * @returns {Object} 验证结果
     * @private
     */
    validateSingleMoveWithCache(move, index, options) {
        const cacheKey = `validateMove_${index}_${JSON.stringify(move)}`;
        const context = this.extractMoveContext([move], 0);

        return this.cache.intelligentValidationCache(
            cacheKey,
            { move, index, strict: options.strict, context },
            () => this.computeMoveValidation({ move, index, strict: options.strict, context })
        );
    }

    /**
     * 验证单个移动
     * @private
     * @param {Move} move - 移动数据
     * @param {number} index - 索引
     */
    validateSingleMove(move, index) {
        return this.validateSingleMoveInternal(move, index, true, null);
    }

    /**
     * 内部单个移动验证实现
     * @private
     * @param {Move} move - 移动数据
     * @param {number} index - 索引
     * @param {boolean} strict - 严格模式
     * @param {Object} context - 上下文信息
     */
    validateSingleMoveInternal(move, index, strict = true, context = null) {
        const errors = [];
        if (!move || typeof move !== 'object') {
            errors.push({
                code: 'INVALID_MOVE_FORMAT',
                message: '移动数据格式无效',
                moveIndex: index,
                layer: 'structure',
                severity: 'high'
            });
            return { isValid: false, errors };
        }
        const moveObj = move;
        // 检查必需字段
        const requiredFields = ['color', 'pieceType', 'fromPos', 'toPos'];
        for (const field of requiredFields) {
            if (!(field in moveObj)) {
                errors.push({
                    code: 'MISSING_REQUIRED_FIELD',
                    message: `缺少必需字段: ${field}`,
                    moveIndex: index,
                    layer: 'structure',
                    severity: 'high'
                });
            }
        }
        if (errors.length > 0) {
            return { isValid: false, errors };
        }

        // 类型检查
        if (moveObj.color !== 'red' && moveObj.color !== 'black') {
            errors.push({
                code: 'INVALID_PLAYER_COLOR',
                message: '玩家颜色必须是 red 或 black',
                moveIndex: index,
                layer: 'semantic',
                severity: 'medium'
            });
        }

        // 位置验证
        if (moveObj.fromPos !== undefined && !this.validatePosition(moveObj.fromPos)) {
            errors.push({
                code: 'INVALID_FROM_POSITION',
                message: '起始位置格式无效',
                moveIndex: index,
                layer: 'semantic',
                severity: 'high'
            });
        }

        if (moveObj.toPos !== undefined && !this.validatePosition(moveObj.toPos)) {
            errors.push({
                code: 'INVALID_TO_POSITION',
                message: '目标位置格式无效',
                moveIndex: index,
                layer: 'semantic',
                severity: 'high'
            });
        }

        // 上下文相关验证（如果提供）
        if (strict && context) {
            this.validateWithContext(moveObj, index, context, errors);
        }

        return {
            isValid: errors.length === 0,
            errors,
            normalizedMove: this.normalizeMove(moveObj)
        };
    }

    /**
     * 基于上下文的验证
     * @param {Move} move - 移动数据
     * @param {number} index - 索引
     * @param {Object} context - 上下文
     * @param {Array} errors - 错误数组
     * @private
     */
    validateWithContext(move, index, context, errors) {
        // 验证移动序列的合理性
        if (context.previousMove) {
            // 检查连续移动的颜色交替
            if (context.previousMove.color === move.color) {
                errors.push({
                    code: 'INVALID_COLOR_SEQUENCE',
                    message: '连续移动的颜色应该交替',
                    moveIndex: index,
                    layer: 'semantic',
                    severity: 'medium'
                });
            }
        }

        // 验证移动的基本合理性
        if (move.fromPos && move.toPos) {
            // 检查移动是否有效（相同位置）
            if (move.fromPos.row === move.toPos.row && move.fromPos.col === move.toPos.col) {
                errors.push({
                    code: 'INVALID_MOVE_DISTANCE',
                    message: '起始位置和目标位置不能相同',
                    moveIndex: index,
                    layer: 'semantic',
                    severity: 'medium'
                });
            }
        }
    }

    /**
     * 规范化移动对象
     * @param {Move} move - 移动对象
     * @returns {Move} 规范化的移动对象
     * @private
     */
    normalizeMove(move) {
        return {
            color: move.color,
            pieceType: move.pieceType,
            fromPos: move.fromPos ? { ...move.fromPos } : undefined,
            toPos: move.toPos ? { ...move.toPos } : undefined,
            notation: move.notation,
            timestamp: move.timestamp || Date.now()
        };
    }
    /**
     * 验证位置格式
     * @private
     * @param {unknown} position - 位置数据
     */
    validatePosition(position) {
        // 使用缓存验证位置
        if (!position || typeof position !== 'object') {
            return false;
        }

        const pos = position;
        const cacheKey = `validatePosition_${pos.row}_${pos.col}`;

        return this.cache.intelligentValidationCache(
            cacheKey,
            { position: pos },
            () => {
                return (typeof pos.row === 'number' &&
                        typeof pos.col === 'number' &&
                        pos.row >= 0 && pos.row <= 9 &&
                        pos.col >= 0 && pos.col <= 8);
            }
        );
    }

    /**
     * 更新验证统计
     * @param {number} duration - 验证耗时
     * @param {boolean} valid - 是否有效
     * @private
     */
    updateValidationStats(duration, valid) {
        this.validationStats.lastValidationDuration = duration;

        // 更新平均验证时间
        if (this.validationStats.totalValidations === 1) {
            this.validationStats.averageValidationTime = duration;
        } else {
            const alpha = 0.1; // 指数移动平均系数
            this.validationStats.averageValidationTime =
                alpha * duration + (1 - alpha) * this.validationStats.averageValidationTime;
        }

        // 更新缓存统计
        const cacheStats = this.cache.getPerformanceStats();
        this.validationStats.cacheHits = cacheStats.validationCacheHits;
        this.validationStats.cacheMisses = cacheStats.validationCacheMisses;
    }

    /**
     * 获取缓存命中率
     * @returns {string} 命中率百分比
     * @private
     */
    getCacheHitRatio() {
        const total = this.validationStats.cacheHits + this.validationStats.cacheMisses;
        if (total === 0) return '0%';
        return ((this.validationStats.cacheHits / total) * 100).toFixed(2) + '%';
    }

    /**
     * 获取详细验证统计信息
     * @returns {Object} 统计信息
     */
    getValidationStats() {
        const cacheStats = this.cache ? this.cache.getPerformanceStats() : null;

        return {
            validatorVersion: '2.1.0',
            cacheEnabled: this.cache !== null,
            supportedValidationLayers: ['structure', 'semantic', 'system', 'performance'],
            performance: {
                ...this.validationStats,
                efficiency: this.calculateValidationEfficiency()
            },
            cache: cacheStats ? {
                hitRatio: this.getCacheHitRatio(),
                totalHits: cacheStats.validationCacheHits,
                totalMisses: cacheStats.validationCacheMisses,
                cacheSize: cacheStats.cacheSizes.validation
            } : null,
            options: this.options
        };
    }

    /**
     * 计算验证效率
     * @returns {number} 效率评分 (0-100)
     * @private
     */
    calculateValidationEfficiency() {
        const avgTime = this.validationStats.averageValidationTime;
        const timeScore = Math.max(0, 100 - avgTime * 2); // 50ms为满分

        const hitRatio = parseFloat(this.getCacheHitRatio()) || 0;
        const cacheScore = hitRatio;

        const earlyExitRate = this.validationStats.earlyExits / Math.max(1, this.validationStats.totalValidations);
        const optimizationScore = earlyExitRate * 100;

        return Math.round((timeScore * 0.4 + cacheScore * 0.4 + optimizationScore * 0.2));
    }

    /**
     * 获取性能报告
     * @returns {Object} 性能报告
     */
    getPerformanceReport() {
        const validationStats = this.getValidationStats();
        const cacheReport = this.cache ? this.cache.getPerformanceReport() : null;

        return {
            timestamp: new Date().toISOString(),
            validator: {
                efficiency: validationStats.performance.efficiency,
                averageTime: validationStats.performance.averageValidationTime.toFixed(2) + 'ms',
                totalValidations: validationStats.performance.totalValidations,
                optimizations: {
                    batchValidation: validationStats.performance.batchValidations,
                    earlyExits: validationStats.performance.earlyExits,
                    cacheHits: validationStats.performance.cacheHits
                }
            },
            cache: cacheReport,
            recommendations: this.generateOptimizationRecommendations(validationStats)
        };
    }

    /**
     * 生成优化建议
     * @param {Object} stats - 验证统计
     * @returns {Array} 建议列表
     * @private
     */
    generateOptimizationRecommendations(stats) {
        const recommendations = [];

        if (stats.performance.averageValidationTime > 100) {
            recommendations.push({
                type: 'performance',
                message: '平均验证时间过长，建议启用批量验证或增加缓存大小',
                priority: 'high'
            });
        }

        if (parseFloat(this.getCacheHitRatio()) < 50) {
            recommendations.push({
                type: 'cache',
                message: '缓存命中率偏低，建议优化缓存策略或增加缓存容量',
                priority: 'medium'
            });
        }

        if (stats.performance.earlyExits / stats.performance.totalValidations < 0.1) {
            recommendations.push({
                type: 'optimization',
                message: '早期退出使用率偏低，建议启用早期退出优化以提升大数据场景性能',
                priority: 'low'
            });
        }

        if (!stats.options.enableBatching && stats.performance.totalValidations > 1000) {
            recommendations.push({
                type: 'feature',
                message: '大量数据验证场景，建议启用批量验证功能',
                priority: 'medium'
            });
        }

        return recommendations;
    }

    /**
     * 配置验证器选项
     * @param {Object} newOptions - 新选项
     */
    configure(newOptions) {
        this.options = { ...this.options, ...newOptions };

        // 重新配置缓存（如果需要）
        if (newOptions.maxValidationCacheSize && this.cache) {
            this.cache.options.maxValidationCacheSize = newOptions.maxValidationCacheSize;
        }
    }

    /**
     * 清理资源
     */
    cleanup() {
        if (this.cache) {
            this.cache.cleanup();
        }

        // 重置统计
        Object.keys(this.validationStats).forEach(key => {
            if (typeof this.validationStats[key] === 'number') {
                this.validationStats[key] = 0;
            }
        });
    }

    /**
     * 重置验证器
     */
    reset() {
        if (this.cache) {
            this.cache.clear();
        }

        this.validationStats = {
            totalValidations: 0,
            batchValidations: 0,
            earlyExits: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averageValidationTime: 0,
            lastValidationDuration: 0
        };
    }
}
exports.ChessValidator = ChessValidator;
//# sourceMappingURL=chess-validator.js.map