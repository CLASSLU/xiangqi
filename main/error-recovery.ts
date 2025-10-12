/**
 * ErrorRecovery - 错误恢复系统
 *
 * 提供棋谱数据错误恢复和修复功能
 * 重构版本：分解超长函数，降低复杂度
 *
 * @fileoverview 错误恢复系统
 * @version 2.1.0
 * @author Claude Code Review System
 * @since 2024-10-12
 */

import type {
    Move,
    ValidationErrorInterface,
    RecoveryOptions,
    RecoveryResult,
    RecoveryAction,
    RecoveryReport,
    RecoverySummary,
    RecoveryDetails
} from './types';

/**
 * 恢复策略管理器
 */
class RecoveryStrategyManager {
    /**
     * 创建默认恢复选项
     * @returns {RecoveryOptions}
     */
    public static createDefaultOptions(): RecoveryOptions {
        return {
            autoFix: true,
            faultTolerant: true,
            preserveSequence: true,
            maxRecoveryAttempts: 3
        };
    }
}

/**
 * 恢复处理器
 */
class RecoveryProcessor {
    /**
     * 处理所有错误
     * @param {ValidationErrorInterface[]} errors - 错误列表
     * @param {Move[]} currentMoves - 当前移动数组
     * @param {RecoveryOptions} options - 恢复选项
     * @returns {ProcessedRecoveryResult} 处理结果
     */
    public static processErrors(
        errors: ValidationErrorInterface[],
        currentMoves: Move[],
        options: RecoveryOptions
    ): ProcessedRecoveryResult {
        const recoveredMoves = [...currentMoves];
        const successfulRecoveries: RecoveryAction[] = [];
        const failedRecoveries: RecoveryAction[] = [];
        const skippedMoves: number[] = [];

        // 逐个处理错误
        for (const error of errors) {
            const processor = new SingleErrorProcessor(recoveredMoves, options);
            const recoveryAction = processor.processError(error);

            if (recoveryAction.success) {
                successfulRecoveries.push(recoveryAction);
                // 更新恢复后的移动数组
                recoveredMoves.splice(0, recoveredMoves.length, ...recoveryAction.moves);
            } else {
                failedRecoveries.push(recoveryAction);
                if (error.moveIndex >= 0) {
                    skippedMoves.push(error.moveIndex);
                }
            }
        }

        return {
            recoveredMoves,
            successfulRecoveries,
            failedRecoveries,
            skippedMoves
        };
    }
}

/**
 * 处理过的恢复结果
 */
interface ProcessedRecoveryResult {
    recoveredMoves: Move[];
    successfulRecoveries: RecoveryAction[];
    failedRecoveries: RecoveryAction[];
    skippedMoves: number[];
}

/**
 * 单个错误处理器
 */
class SingleErrorProcessor {
    private readonly moves: Move[];
    private readonly options: RecoveryOptions;

    constructor(moves: Move[], options: RecoveryOptions) {
        this.moves = [...moves];
        this.options = options;
    }

    /**
     * 处理单个错误
     * @param {ValidationErrorInterface} error - 错误信息
     * @returns {RecoveryAction} 恢复动作
     */
    public processError(error: ValidationErrorInterface): RecoveryAction {
        let action: RecoveryAction = this.createInitialAction(error);

        try {
            action = this.executeRecoveryStrategy(error);
        } catch (recoveryError) {
            action = this.handleRecoveryException(action, recoveryError);
        }

        return action;
    }

    /**
     * 创建初始恢复动作
     * @private
     */
    private createInitialAction(error: ValidationErrorInterface): RecoveryAction {
        return {
            success: false,
            originalError: error,
            moves: [...this.moves],
            action: 'unknown',
            message: '',
            recommendation: 'continue'
        };
    }

    /**
     * 执行恢复策略
     * @private
     */
    private executeRecoveryStrategy(error: ValidationErrorInterface): RecoveryAction {
        const strategy = this.getRecoveryStrategy(error.code);
        return strategy.recover(error, this.moves);
    }

    /**
     * 获取恢复策略
     * @private
     */
    private getRecoveryStrategy(errorCode: string): RecoveryStrategy {
        switch (errorCode) {
            case 'MISSING_REQUIRED_FIELD':
                return new MissingFieldRecoveryStrategy();
            case 'INVALID_POSITION_FORMAT':
                return new PositionFormatRecoveryStrategy();
            case 'INVALID_MOVE_SEQUENCE':
                return new SequenceErrorRecoveryStrategy();
            default:
                return new UnknownErrorRecoveryStrategy();
        }
    }

    /**
     * 处理恢复异常
     * @private
     */
    private handleRecoveryException(action: RecoveryAction, recoveryError: unknown): RecoveryAction {
        action.message = `恢复过程失败: ${recoveryError instanceof Error ? recoveryError.message : '未知错误'}`;
        action.recommendation = 'skip';
        return action;
    }
}

/**
 * 恢复策略接口
 */
interface RecoveryStrategy {
    recover(error: ValidationErrorInterface, moves: Move[]): RecoveryAction;
}

/**
 * 缺失字段恢复策略
 */
class MissingFieldRecoveryStrategy implements RecoveryStrategy {
    recover(error: ValidationErrorInterface, moves: Move[]): RecoveryAction {
        const action: RecoveryAction = {
            success: false,
            originalError: error,
            moves: [...moves],
            action: 'field_repair',
            message: '',
            recommendation: 'continue'
        };

        if (error.moveIndex >= 0 && error.moveIndex < moves.length) {
            const move = moves[error.moveIndex];

            // 尝试修复缺失字段
            if (!move.notation) {
                move.notation = this.generateDefaultNotation(move);
                action.success = true;
                action.message = `已生成默认记谱: ${move.notation}`;
            }
        }

        return action;
    }

    private generateDefaultNotation(move: Move): string {
        return `${move.pieceType}-${move.fromPos?.row || 0},${move.fromPos?.col || 0}-to-${move.toPos?.row || 0},${move.toPos?.col || 0}`;
    }
}

/**
 * 位置格式恢复策略
 */
class PositionFormatRecoveryStrategy implements RecoveryStrategy {
    recover(error: ValidationErrorInterface, moves: Move[]): RecoveryAction {
        return {
            success: false,
            originalError: error,
            moves: [...moves],
            action: 'position_repair',
            message: '位置格式错误无法自动修复',
            recommendation: 'skip'
        };
    }
}

/**
 * 序列错误恢复策略
 */
class SequenceErrorRecoveryStrategy implements RecoveryStrategy {
    recover(error: ValidationErrorInterface, moves: Move[]): RecoveryAction {
        return {
            success: false,
            originalError: error,
            moves: [...moves],
            action: 'sequence_repair',
            message: '序列错误修复暂未实现',
            recommendation: 'skip'
        };
    }
}

/**
 * 未知错误恢复策略
 */
class UnknownErrorRecoveryStrategy implements RecoveryStrategy {
    recover(error: ValidationErrorInterface, moves: Move[]): RecoveryAction {
        return {
            success: false,
            originalError: error,
            moves: [...moves],
            action: 'unknown',
            message: `未知错误类型: ${error.code}`,
            recommendation: 'skip'
        };
    }
}

/**
 * 质量评分器
 */
class QualityScoreCalculator {
    /**
     * 计算恢复质量分数
     * @param {RecoveryResult} result - 恢复结果
     * @returns {number} 质量分数
     */
    public static calculate(result: RecoveryResult): number {
        // 基础分数减去失败恢复的影响
        let score = 100;
        score -= result.failedRecoveries.length * 10; // 每个失败恢复扣10分
        score += result.successfulRecoveries.length * 5; // 每个成功恢复加5分

        return Math.max(0, Math.min(100, score));
    }
}

/**
 * 恢复报告生成器
 */
class RecoveryReportGenerator {
    /**
     * 生成恢复报告
     * @param {RecoveryResult} result - 恢复结果
     * @returns {RecoveryReport} 恢复报告
     */
    public static generate(result: RecoveryResult): RecoveryReport {
        const summary = this.createSummary(result);
        const details = this.createDetails(result);
        const recommendations = this.generateRecommendations(result);

        return {
            summary,
            recoveries: details,
            recommendations
        };
    }

    /**
     * 创建摘要
     * @private
     */
    private static createSummary(result: RecoveryResult): RecoverySummary {
        return {
            totalMoves: result.originalMoves.length,
            recoveredMoves: result.recoveredMoves.length,
            successRate: result.originalMoves.length > 0
                ? (result.successfulRecoveries.length / result.originalMoves.length) * 100
                : 0,
            qualityScore: result.qualityScore
        };
    }

    /**
     * 创建详情
     * @private
     */
    private static createDetails(result: RecoveryResult): RecoveryDetails {
        return {
            successful: result.successfulRecoveries.map(r => ({
                action: r.action,
                message: r.message,
                errorType: r.originalError.code
            })),
            failed: result.failedRecoveries.map(r => ({
                errorType: r.originalError.code,
                message: r.message
            }))
        };
    }

    /**
     * 生成建议
     * @private
     */
    private static generateRecommendations(result: RecoveryResult): string[] {
        const recommendations: string[] = [];

        if (result.failedRecoveries.length > 0) {
            recommendations.push('建议检查失败的错误和对应的移动数据');
        }
        if (result.qualityScore < 80) {
            recommendations.push('建议手动验证恢复后的数据质量');
        }

        return recommendations;
    }
}

/**
 * 错误恢复系统 - 重构后版本
 */
class ErrorRecovery {

    /**
     * 执行错误恢复
     * @param {Move[]} originalMoves - 原始移动数组
     * @param {ValidationError[]} errors - 错误列表
     * @param {RecoveryOptions} options - 恢复选项
     * @returns {RecoveryResult} 恢复结果
     */
    public recoverFromErrors(
        originalMoves: Move[],
        errors: ValidationErrorInterface[],
        options: RecoveryOptions = RecoveryStrategyManager.createDefaultOptions()
    ): RecoveryResult {
        const result: RecoveryResult = {
            originalMoves: [...originalMoves],
            recoveredMoves: [...originalMoves],
            successfulRecoveries: [],
            failedRecoveries: [],
            skippedMoves: [],
            qualityScore: 100,
            recoveryReport: null
        };

        try {
            // 使用恢复处理器处理错误
            const processedResult = RecoveryProcessor.processErrors(errors, result.recoveredMoves, options);

            // 更新结果
            result.recoveredMoves = processedResult.recoveredMoves;
            result.successfulRecoveries = processedResult.successfulRecoveries;
            result.failedRecoveries = processedResult.failedRecoveries;
            result.skippedMoves = processedResult.skippedMoves;

            // 计算质量分数
            result.qualityScore = QualityScoreCalculator.calculate(result);

            // 生成恢复报告
            result.recoveryReport = RecoveryReportGenerator.generate(result);

        } catch (error) {
            console.error('错误恢复过程中发生异常:', error);
            result.recoveredMoves = originalMoves; // 回滚到原始数据
        }

        return result;
    }

    /**
     * 获取错误严重程度
     * @param {ValidationError[]} errors - 错误列表
     * @returns {string} 最高严重程度
     */
    public getErrorSeverity(errors: ValidationErrorInterface[]): string {
        if (errors.length === 0) return 'none';

        const severityLevels = ['low', 'medium', 'high', 'critical'] as const;
        for (const level of severityLevels.slice().reverse()) { // 从高到低检查
            if (errors.some(error => error.severity === level)) {
                return level;
            }
        }

        return 'low';
    }

    // Note: 旧的恢复方法已被重构为策略模式，大幅降低了圈复杂度
// 详见上面的策略类：MissingFieldRecoveryStrategy, PositionFormatRecoveryStrategy 等
}

export { ErrorRecovery };