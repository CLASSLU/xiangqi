"use strict";
/**
 * ErrorRecovery - 错误恢复系统
 *
 * 提供棋谱数据错误恢复和修复功能
 *
 * @fileoverview 错误恢复系统
 * @version 2.1.0
 * @author Claude Code Review System
 * @since 2024-10-11
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorRecovery = void 0;
/**
 * 错误恢复系统
 */
class ErrorRecovery {
    /**
     * 执行错误恢复
     * @param {Move[]} originalMoves - 原始移动数组
     * @param {ValidationError[]} errors - 错误列表
     * @param {RecoveryOptions} options - 恢复选项
     * @returns {RecoveryResult} 恢复结果
     */
    recoverFromErrors(originalMoves, errors, options = {
        autoFix: true,
        faultTolerant: true,
        preserveSequence: true,
        maxRecoveryAttempts: 3
    }) {
        const result = {
            originalMoves: [...originalMoves],
            recoveredMoves: [...originalMoves],
            successfulRecoveries: [],
            failedRecoveries: [],
            skippedMoves: [],
            qualityScore: 100,
            recoveryReport: null
        };
        try {
            // 逐个处理错误
            for (const error of errors) {
                const recoveryAction = this.attemptRecovery(error, result.recoveredMoves, options);
                if (recoveryAction.success) {
                    result.successfulRecoveries.push(recoveryAction);
                    // 更新恢复后的移动数组
                    result.recoveredMoves = [...recoveryAction.moves];
                }
                else {
                    result.failedRecoveries.push(recoveryAction);
                    if (error.moveIndex >= 0) {
                        result.skippedMoves.push(error.moveIndex);
                    }
                }
            }
            // 计算质量分数
            result.qualityScore = this.calculateQualityScore(result);
            // 生成恢复报告
            result.recoveryReport = this.generateRecoveryReport(result);
        }
        catch (error) {
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
    getErrorSeverity(errors) {
        if (errors.length === 0)
            return 'none';
        const severityLevels = ['low', 'medium', 'high', 'critical'];
        for (const level of severityLevels.slice().reverse()) { // 从高到低检查
            if (errors.some(error => error.severity === level)) {
                return level;
            }
        }
        return 'low';
    }
    /**
     * 尝试恢复单个错误
     * @private
     * @param {ValidationError} error - 错误信息
     * @param {Move[]} currentMoves - 当前移动数组
     * @param {RecoveryOptions} options - 恢复选项
     */
    attemptRecovery(error, currentMoves, _options) {
        let action = {
            success: false,
            originalError: error,
            moves: [...currentMoves],
            action: 'unknown',
            message: '',
            recommendation: 'continue'
        };
        try {
            switch (error.code) {
                case 'MISSING_REQUIRED_FIELD':
                    action = this.recoverMissingField(error, currentMoves);
                    break;
                case 'INVALID_POSITION_FORMAT':
                    action = this.recoverPositionFormat(error, currentMoves);
                    break;
                case 'INVALID_MOVE_SEQUENCE':
                    action = this.recoverSequenceError(error, currentMoves);
                    break;
                default:
                    action.message = `未知错误类型: ${error.code}`;
                    action.recommendation = 'skip';
                    break;
            }
        }
        catch (recoveryError) {
            action.message = `恢复过程失败: ${recoveryError instanceof Error ? recoveryError.message : '未知错误'}`;
            action.recommendation = 'skip';
        }
        return action;
    }
    /**
     * 恢复缺失字段错误
     * @private
     */
    recoverMissingField(error, currentMoves) {
        const action = {
            success: false,
            originalError: error,
            moves: [...currentMoves],
            action: 'field_repair',
            message: '',
            recommendation: 'continue'
        };
        if (error.moveIndex >= 0 && error.moveIndex < currentMoves.length) {
            const move = currentMoves[error.moveIndex];
            // 尝试修复缺失字段
            if (!move.notation) {
                move.notation = this.generateDefaultNotation(move);
                action.success = true;
                action.message = `已生成默认记谱: ${move.notation}`;
            }
            if (action.success) {
                action.moves = [...currentMoves];
            }
        }
        return action;
    }
    /**
     * 恢复位置格式错误
     * @private
     */
    recoverPositionFormat(error, currentMoves) {
        const action = {
            success: false,
            originalError: error,
            moves: [...currentMoves],
            action: 'position_repair',
            message: '',
            recommendation: 'continue'
        };
        // 简化的位置恢复逻辑
        action.message = '位置格式错误无法自动修复';
        action.recommendation = 'skip';
        return action;
    }
    /**
     * 恢复序列错误
     * @private
     */
    recoverSequenceError(error, currentMoves) {
        const action = {
            success: false,
            originalError: error,
            moves: [...currentMoves],
            action: 'sequence_repair',
            message: '',
            recommendation: 'continue'
        };
        // 简化的序列恢复逻辑
        action.message = '序列错误修复暂未实现';
        action.recommendation = 'skip';
        return action;
    }
    /**
     * 生成默认记谱
     * @private
     */
    generateDefaultNotation(move) {
        return `${move.pieceType}-${move.fromPos?.row || 0},${move.fromPos?.col || 0}-to-${move.toPos?.row || 0},${move.toPos?.col || 0}`;
    }
    /**
     * 计算质量分数
     * @private
     */
    calculateQualityScore(result) {
        // 基础分数减去失败恢复的影响
        let score = 100;
        score -= result.failedRecoveries.length * 10; // 每个失败恢复扣10分
        score += result.successfulRecoveries.length * 5; // 每个成功恢复加5分
        return Math.max(0, Math.min(100, score));
    }
    /**
     * 生成恢复报告
     * @private
     */
    generateRecoveryReport(result) {
        const summary = {
            totalMoves: result.originalMoves.length,
            recoveredMoves: result.recoveredMoves.length,
            successRate: result.originalMoves.length > 0
                ? (result.successfulRecoveries.length / result.originalMoves.length) * 100
                : 0,
            qualityScore: result.qualityScore
        };
        const details = {
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
        const recommendations = [];
        if (result.failedRecoveries.length > 0) {
            recommendations.push('建议检查失败的错误和对应的移动数据');
        }
        if (result.qualityScore < 80) {
            recommendations.push('建议手动验证恢复后的数据质量');
        }
        return {
            summary,
            recoveries: details,
            recommendations
        };
    }
}
exports.ErrorRecovery = ErrorRecovery;
//# sourceMappingURL=error-recovery.js.map