/**
 * ChessValidator - 棋谱验证器
 *
 * 提供棋谱数据验证和错误修复功能
 *
 * @fileoverview 棋谱验证器
 * @version 2.1.0
 * @author Claude Code Review System
 * @since 2024-10-11
 */

import type {
    Move,
    ValidationOptions,
    ValidationResult,
    ValidationErrorInterface,
    ValidatorConfig,
    IPerformanceCache
} from './types';

/**
 * 验证器配置选项
 */
interface ValidatorOptions extends ValidatorConfig {}

/**
 * 性能缓存接口
 */
interface PerformanceCache extends IPerformanceCache {}

/**
 * 棋谱验证器
 */
class ChessValidator {
    private cache: PerformanceCache | null = null;

    constructor(options: ValidatorOptions = {}) {
        this.cache = options.cache || null;
    }

    /**
     * 验证移动序列
     * @param {Move[]} moves - 移动数组
     * @param {ValidationOptions} options - 验证选项
     * @returns {ValidationResult} 验证结果
     */
    public validateMoveSequence(moves: Move[], options: ValidationOptions = {}): ValidationResult {
        const defaultOptions: ValidationOptions = {
            strict: true,
            autoFix: false,
            maxErrors: 100,
            faultTolerant: false,
            preserveSequence: true
        };

        const mergedOptions = { ...defaultOptions, ...options };

        const result: ValidationResult = {
            valid: true,
            totalMoves: moves.length,
            validMoves: 0,
            errorMoves: 0,
            errors: [],
            warnings: [],
            layerStatistics: {},
            normalizedMoves: []
        };

        try {
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
                return result;
            }

            // 验证每个移动
            for (let i = 0; i < moves.length; i++) {
                const move = moves[i];
                const moveValidation = this.validateSingleMove(move, i);

                if (moveValidation.isValid) {
                    result.validMoves++;
                    if (result.normalizedMoves) {
                        result.normalizedMoves.push(moveValidation.normalizedMove!);
                    }
                } else {
                    result.errorMoves++;
                    result.errors.push(...moveValidation.errors);

                    if (!mergedOptions.faultTolerant) {
                        result.valid = false;
                    }
                }

                if (result.errors.length >= (mergedOptions.maxErrors || 100)) {
                    break;
                }
            }

            // 最终有效性判断
            if (result.errorMoves === 0) {
                result.valid = true;
            } else if (result.errorMoves > 0 && mergedOptions.strict) {
                result.valid = false;
            }

        } catch (error) {
            const err = error as Error;
            result.valid = false;
            result.errors.push({
                code: 'VALIDATION_EXCEPTION',
                message: `验证过程中发生异常: ${err.message}`,
                moveIndex: -1,
                layer: 'system',
                severity: 'critical'
            });
        }

        return result;
    }

    /**
     * 验证单个移动
     * @private
     * @param {Move} move - 移动数据
     * @param {number} index - 索引
     */
    private validateSingleMove(move: unknown, index: number): {
        isValid: boolean;
        errors: ValidationErrorInterface[];
        normalizedMove?: Move;
    } {
        const errors: ValidationErrorInterface[] = [];

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

        const moveObj = move as Record<string, unknown>;

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

        return {
            isValid: errors.length === 0,
            errors,
            normalizedMove: moveObj as unknown as Move
        };
    }

    /**
     * 验证位置格式
     * @private
     * @param {unknown} position - 位置数据
     */
    private validatePosition(position: unknown): boolean {
        if (!position || typeof position !== 'object') {
            return false;
        }

        const pos = position as Record<string, unknown>;
        return (
            typeof pos.row === 'number' &&
            typeof pos.col === 'number' &&
            pos.row >= 0 && pos.row <= 9 &&
            pos.col >= 0 && pos.col <= 8
        );
    }

    /**
     * 获取验证统计信息
     */
    public getValidationStats(): Record<string, unknown> {
        return {
            validatorVersion: '2.1.0',
            cacheEnabled: this.cache !== null,
            supportedValidationLayers: ['structure', 'semantic', 'system']
        };
    }
}

export { ChessValidator, type ValidatorOptions };