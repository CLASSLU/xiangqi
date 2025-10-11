/**
 * 错误恢复系统 - 棋谱播放容错机制
 *
 * 功能：
 * 1. 智能错误分类和恢复策略
 * 2. 多种恢复模式支持
 * 3. 详细的恢复日志记录
 * 4. 容错播放模式
 * 5. 质量评估系统
 */

class ErrorRecoverySystem {
    constructor() {
        this.recoveryStrategies = new Map();
        this.recoveryLog = [];
        this.qualityMetrics = new Map();
        this.faultToleranceMode = false;

        this.initializeRecoveryStrategies();
    }

    /**
     * 初始化恢复策略
     */
    initializeRecoveryStrategies() {
        // Data层错误恢复策略
        this.recoveryStrategies.set('DATA_MISSING_FIELDS', {
            severity: 'medium',
            autoFixable: true,
            strategy: 'auto_fix',
            description: '尝试从上下文推断缺失字段'
        });

        this.recoveryStrategies.set('DATA_INVALID_FORMAT', {
            severity: 'high',
            autoFixable: false,
            strategy: 'skip_or_replace',
            description: '跳过或替换无效格式数据'
        });

        this.recoveryStrategies.set('DATA_OUT_OF_BOUNDS', {
            severity: 'medium',
            autoFixable: true,
            strategy: 'auto_clamp',
            description: '自动调整到边界内'
        });

        // Rules层错误恢复策略
        this.recoveryStrategies.set('RULES_ILLEGAL_MOVE', {
            severity: 'high',
            autoFixable: false,
            strategy: 'skip_with_log',
            description: '跳过非法移动并记录'
        });

        this.recoveryStrategies.set('RULES_PIECE_NOT_FOUND', {
            severity: 'medium',
            autoFixable: true,
            strategy: 'find_similar_piece',
            description: '查找相似棋子进行移动'
        });

        // Game层错误恢复策略
        this.recoveryStrategies.set('GAME_STATE_INCONSISTENT', {
            severity: 'high',
            autoFixable: false,
            strategy: 'restore_from_history',
            description: '从历史状态恢复'
        });

        // Sequence层错误恢复策略
        this.recoveryStrategies.set('SEQUENCE_BREAK', {
            severity: 'medium',
            autoFixable: true,
            strategy: 'bridge_sequence',
            description: '尝试建立连续序列'
        });

        this.recoveryStrategies.set('SEQUENCE_REDUNDANT', {
            severity: 'low',
            autoFixable: true,
            strategy: 'remove_redundant',
            description: '移除冗余步骤'
        });
    }

    /**
     * 处理验证错误并恢复
     * @param {Array} validationErrors - 验证错误列表
     * @param {Array} moves - 原始移动数据
     * @param {Object} options - 恢复选项
     * @returns {Object} 恢复结果
     */
    recoverFromValidationErrors(validationErrors, moves, options = {}) {
        const recoveryOptions = {
            autoFix: options.autoFix !== false,
            faultTolerant: options.faultTolerant !== false,
            preserveSequence: options.preserveSequence !== false,
            maxRecoveryAttempts: options.maxRecoveryAttempts || 3,
            ...options
        };

        console.log(`🔧 开始错误恢复 - 共${validationErrors.length}个错误`);

        const recoveryResult = {
            originalMoves: moves,
            recoveredMoves: [...moves],
            successfulRecoveries: [],
            failedRecoveries: [],
            skippedMoves: [],
            qualityScore: 0,
            recoveryReport: null
        };

        // 按错误严重性和可修复性排序
        const sortedErrors = this.sortErrorsByPriority(validationErrors);

        for (const error of sortedErrors) {
            const recovery = this.tryRecoverError(error, recoveryResult.recoveredMoves, recoveryOptions);

            this.logRecoveryAttempt(error, recovery);

            if (recovery.success) {
                recoveryResult.successfulRecoveries.push(recovery);
                recoveryResult.recoveredMoves = recovery.moves;
            } else {
                recoveryResult.failedRecoveries.push(recovery);

                if (recovery.recommendation === 'skip') {
                    recoveryResult.recoveredMoves = recovery.moves;
                    recoveryResult.skippedMoves.push(error.moveIndex);
                }
            }
        }

        // 计算质量评分
        recoveryResult.qualityScore = this.calculateQualityScore(recoveryResult);

        // 生成恢复报告
        recoveryResult.recoveryReport = this.generateRecoveryReport(recoveryResult);

        console.log(`✅ 错误恢复完成 - 成功: ${recoveryResult.successfulRecoveries.length}, 失败: ${recoveryResult.failedRecoveries.length}`);

        return recoveryResult;
    }

    /**
     * 尝试恢复单个错误
     * @param {Object} error - 验证错误
     * @param {Array} moves - 当前移动列表
     * @param {Object} options - 恢复选项
     * @returns {Object} 恢复结果
     */
    tryRecoverError(error, moves, options) {
        const strategy = this.recoveryStrategies.get(error.code);

        if (!strategy) {
            return this.createRecoveryResult(false, error, moves, 'unknown_error', '未知错误类型');
        }

        switch (strategy.strategy) {
            case 'auto_fix':
                return this.autoFixError(error, moves, options);

            case 'auto_clamp':
                return this.clampOutOfBoundsError(error, moves, options);

            case 'find_similar_piece':
                return this.findSimilarPieceError(error, moves, options);

            case 'restore_from_history':
                return this.restoreFromHistoryError(error, moves, options);

            case 'bridge_sequence':
                return this.bridgeSequenceError(error, moves, options);

            case 'remove_redundant':
                return this.removeRedundantError(error, moves, options);

            case 'skip_or_replace':
                return strategy.autoFixable && options.autoFix ?
                    this.replaceInvalidError(error, moves, options) :
                    this.skipWithError(error, moves, options);

            case 'skip_with_log':
                return this.skipWithError(error, moves, options);

            default:
                return this.createRecoveryResult(false, error, moves, 'no_strategy', '无恢复策略');
        }
    }

    /**
     * 自动修复错误
     */
    autoFixError(error, moves, options) {
        try {
            const fixedMove = this.attemptAutoFix(error.move, error);
            const fixedMoves = [...moves];
            fixedMoves[error.moveIndex] = fixedMove;

            return this.createRecoveryResult(true, error, fixedMoves, 'auto_fix', '自动修复成功');
        } catch (fixError) {
            return this.createRecoveryResult(false, error, moves, 'auto_fix_failed', `自动修复失败: ${fixError.message}`);
        }
    }

    /**
     * 边界值钳制修复
     */
    clampOutOfBoundsError(error, moves, options) {
        const fixedMove = this.clampMoveCoordinates(error.move);
        const fixedMoves = [...moves];
        fixedMoves[error.moveIndex] = fixedMove;

        return this.createRecoveryResult(true, error, fixedMoves, 'clamp_fix', '边界值钳制修复');
    }

    /**
     * 查找相似棋子
     */
    findSimilarPieceError(error, moves, options) {
        const similarMove = this.findSimilarPieceMove(error.move, moves.slice(0, error.moveIndex));

        if (similarMove) {
            const fixedMoves = [...moves];
            fixedMoves[error.moveIndex] = similarMove;

            return this.createRecoveryResult(true, error, fixedMoves, 'similar_piece', '找到相似棋子');
        } else {
            return this.skipWithError(error, moves, options);
        }
    }

    /**
     * 从历史状态恢复
     */
    restoreFromHistoryError(error, moves, options) {
        const restoredIndex = this.findLastValidState(moves, error.moveIndex);

        if (restoredIndex >= 0 && restoredIndex < moves.length - 1) {
            const adjustedMoves = moves.slice(0, restoredIndex + 1);
            return this.createRecoveryResult(true, error, adjustedMoves, 'history_restore', '从历史状态恢复');
        }

        return this.skipWithError(error, moves, options);
    }

    /**
     * 桥接序列中断
     */
    bridgeSequenceError(error, moves, options) {
        const bridgeMove = this.createBridgeMove(error.move, moves);

        if (bridgeMove) {
            const bridgedMoves = [...moves];
            bridgedMoves[error.moveIndex] = bridgeMove;

            return this.createRecoveryResult(true, error, bridgedMoves, 'sequence_bridge', '序列桥接成功');
        }

        return this.skipWithError(error, moves, options);
    }

    /**
     * 移除冗余步骤
     */
    removeRedundantError(error, moves, options) {
        const filteredMoves = moves.filter((move, index) => index !== error.moveIndex);

        return this.createRecoveryResult(true, error, filteredMoves, 'remove_redundant', '移除冗余步骤');
    }

    /**
     * 跳过错误步骤
     */
    skipWithError(error, moves, options) {
        if (options.faultTolerant) {
            const skippedMoves = moves.filter((move, index) => index !== error.moveIndex);
            return this.createRecoveryResult(true, error, skippedMoves, 'skip', '跳过错误步骤');
        } else {
            return this.createRecoveryResult(false, error, moves, 'skip_forbidden', '不容错模式下无法跳过');
        }
    }

    /**
     * 替换无效数据
     */
    replaceInvalidError(error, moves, options) {
        const replacementMove = this.createReplacementMove(error.move);

        if (replacementMove) {
            const replacedMoves = [...moves];
            replacedMoves[error.moveIndex] = replacementMove;

            return this.createRecoveryResult(true, error, replacedMoves, 'replace', '替换无效数据');
        }

        return this.skipWithError(error, moves, options);
    }

    /**
     * 创建恢复结果
     */
    createRecoveryResult(success, error, moves, action, message) {
        return {
            success,
            originalError: error,
            moves,
            action,
            message,
            recommendation: success ? 'continue' : 'skip'
        };
    }

    /**
     * 记录恢复尝试
     */
    logRecoveryAttempt(error, recovery) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            error: {
                code: error.code,
                message: error.message,
                moveIndex: error.moveIndex,
                layer: error.layer
            },
            recovery: {
                success: recovery.success,
                action: recovery.action,
                message: recovery.message
            }
        };

        this.recoveryLog.push(logEntry);
        console.log(`📝 恢复记录: ${error.code} -> ${recovery.action}: ${recovery.message}`);
    }

    /**
     * 计算质量评分
     */
    calculateQualityScore(recoveryResult) {
        const totalMoves = recoveryResult.originalMoves.length;
        const remainingMoves = recoveryResult.recoveredMoves.length;
        const successfulRecoveries = recoveryResult.successfulRecoveries.length;

        let score = 100;

        // 基础分：保留的移动比例
        score = score * (remainingMoves / totalMoves);

        // 恢复成功加分
        score += successfulRecoveries * 5;

        // 严重错误扣分
        const severeErrors = recoveryResult.failedRecoveries.filter(failure =>
            this.recoveryStrategies.get(failure.originalError.code)?.severity === 'high'
        ).length;
        score -= severeErrors * 15;

        return Math.max(0, Math.min(100, Math.round(score)));
    }

    /**
     * 生成恢复报告
     */
    generateRecoveryReport(recoveryResult) {
        const report = {
            summary: {
                totalMoves: recoveryResult.originalMoves.length,
                recoveredMoves: recoveryResult.recoveredMoves.length,
                successRate: Math.round((recoveryResult.successfulRecoveries.length /
                    (recoveryResult.successfulRecoveries.length + recoveryResult.failedRecoveries.length)) * 100) || 0,
                qualityScore: recoveryResult.qualityScore
            },
            recoveries: {
                successful: recoveryResult.successfulRecoveries.map(r => ({
                    action: r.action,
                    message: r.message,
                    errorType: r.originalError.code
                })),
                failed: recoveryResult.failedRecoveries.map(r => ({
                    errorType: r.originalError.code,
                    message: r.message
                }))
            },
            recommendations: this.generateRecommendations(recoveryResult)
        };

        return report;
    }

    /**
     * 生成恢复建议
     */
    generateRecommendations(recoveryResult) {
        const recommendations = [];

        if (recoveryResult.qualityScore < 50) {
            recommendations.push('棋谱质量较低，建议人工审核');
        }

        if (recoveryResult.failedRecoveries.length > 0) {
            recommendations.push('存在无法恢复的错误，考虑跳过相关步骤');
        }

        if (recoveryResult.skippedMoves.length > recoveryResult.originalMoves.length * 0.3) {
            recommendations.push('跳过步骤过多，建议检查棋谱数据源');
        }

        const commonErrors = this.getMostCommonErrors(recoveryResult);
        if (commonErrors.length > 0) {
            recommendations.push(`常见错误类型: ${commonErrors.slice(0, 3).join(', ')}`);
        }

        return recommendations;
    }

    /**
     * 按优先级排序错误
     */
    sortErrorsByPriority(errors) {
        return errors.sort((a, b) => {
            const strategyA = this.recoveryStrategies.get(a.code);
            const strategyB = this.recoveryStrategies.get(b.code);

            // 优先处理自动修复的错误
            if (strategyA?.autoFixable && !strategyB?.autoFixable) return -1;
            if (!strategyA?.autoFixable && strategyB?.autoFixable) return 1;

            // 按严重性排序
            const severityOrder = { 'low': 1, 'medium': 2, 'high': 3 };
            const severityA = severityOrder[strategyA?.severity] || 2;
            const severityB = severityOrder[strategyB?.severity] || 2;

            return severityB - severityA;
        });
    }

    /**
     * 工具方法 - 钳制移动坐标
     */
    clampMoveCoordinates(move) {
        return {
            ...move,
            from: {
                row: Math.max(0, Math.min(9, move.from?.row || 0)),
                col: Math.max(0, Math.min(8, move.from?.col || 0))
            },
            to: {
                row: Math.max(0, Math.min(9, move.to?.row || 0)),
                col: Math.max(0, Math.min(8, move.to?.col || 0))
            }
        };
    }

    /**
     * 工具方法 - 获取最常见错误
     */
    getMostCommonErrors(recoveryResult) {
        const errorCounts = {};

        [...recoveryResult.successfulRecoveries, ...recoveryResult.failedRecoveries].forEach(recovery => {
            const errorType = recovery.originalError.code;
            errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
        });

        return Object.entries(errorCounts)
            .sort(([,a], [,b]) => b - a)
            .map(([type]) => type);
    }

    /**
     * 设置容错模式
     */
    setFaultTolerance(enabled) {
        this.faultToleranceMode = enabled;
        console.log(`🔧 容错模式: ${enabled ? '开启' : '关闭'}`);
    }

    /**
     * 获取恢复日志
     */
    getRecoveryLog() {
        return [...this.recoveryLog];
    }

    /**
     * 清除恢复日志
     */
    clearRecoveryLog() {
        this.recoveryLog = [];
    }

    /**
     * 导出恢复报告
     */
    exportRecoveryReport(recoveryResult, format = 'json') {
        if (format === 'text') {
            return this.formatRecoveryReportAsText(recoveryResult);
        }

        return recoveryResult.recoveryReport;
    }

    /**
     * 格式化文本报告
     */
    formatRecoveryReportAsText(recoveryResult) {
        const report = recoveryResult.recoveryReport;

        let text = `=== 棋谱错误恢复报告 ===`;
        text += `\n`;
        text += `\n📊 总览:`;
        text += `\n  原始移动数: ${report.summary.totalMoves}`;
        text += `\n  恢复后移动数: ${report.summary.recoveredMoves}`;
        text += `\n  恢复成功率: ${report.summary.successRate}%`;
        text += `\n  质量评分: ${report.summary.qualityScore}/100`;

        text += `\n\n✅ 成功恢复 (${report.recoveries.successful.length}):`;
        report.recoveries.successful.forEach(recovery => {
            text += `\n  • ${recovery.action}: ${recovery.message}`;
        });

        text += `\n\n❌ 恢复失败 (${report.recoveries.failed.length}):`;
        report.recoveries.failed.forEach(failure => {
            text += `\n  • ${failure.errorType}: ${failure.message}`;
        });

        text += `\n\n💡 建议:`;
        report.recommendations.forEach(rec => {
            text += `\n  • ${rec}`;
        });

        return text;
    }

    // 占位方法 - 这些方法需要根据具体情况实现
    attemptAutoFix(move, error) {
        console.log(`尝试自动修复: ${error.message}`);
        return move; // 简化实现
    }

    findSimilarPieceMove(move, previousMoves) {
        console.log(`查找相似棋子: ${move.notation}`);
        return null; // 简化实现
    }

    findLastValidState(moves, errorIndex) {
        return errorIndex - 1; // 简化实现
    }

    createBridgeMove(move, moves) {
        console.log(`创建桥接移动: ${move.notation}`);
        return null; // 简化实现
    }

    createReplacementMove(move) {
        console.log(`创建替换移动: ${move.notation}`);
        return {
            pieceType: '兵',
            pieceColor: 'red',
            from: { row: 6, col: 4 },
            to: { row: 5, col: 4 },
            notation: '兵五进一'
        }; // 示例实现
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorRecoverySystem;
}