/**
 * Error Recovery - 简化的错误恢复系统
 *
 * 从原来的573行error-recovery-system.js简化而来
 * 专注于核心错误恢复功能，移除过度工程化
 *
 * @fileoverview 简化错误恢复器
 * @version 2.1.0
 * @author Claude Code Review System
 * @since 2024-10-11
 */

/**
 * @typedef {import('./types').ValidationError} ValidationError
 * @typedef {import('./types').ChessGameData} ChessGameData
 * @typedef {import('./types').Move} Move
 */

/**
 * 简化的错误恢复器
 * 实用性强，易于维护
 */
class ErrorRecovery {
    constructor() {
        this.recoveryStrategies = {
            // 核心恢复策略
            autoFix: new AutoFixStrategy(),
            skipMove: new SkipMoveStrategy(),
            // 数据修复策略
            repairNotation: new RepairNotationStrategy(),
            normalizePositions: new NormalizePositionsStrategy()
        };
    }

    /**
     * 尝试恢复错误数据
     * @param {ValidationError[]} errors - 错误列表
     * @param {ChessGameData|Move[]} data - 原始数据
     * @returns {Object} 恢复结果 {success: boolean, data: any, report: string}
     */
    async recover(errors, data) {
        if (!errors || errors.length === 0) {
            return { success: true, data, report: '无需恢复处理' };
        }

        const report = ['开始错误恢复...'];
        let recoveredData = data;
        let success = false;

        // 按优先级尝试恢复策略
        const strategies = ['skipMove', 'autoFix', 'repairNotation', 'normalizePositions'];

        for (const strategyName of strategies) {
            const strategy = this.recoveryStrategies[strategyName];

            if (strategy.canHandle(errors)) {
                try {
                    const result = await strategy.execute(recoveredData, errors);

                    if (result.success) {
                        recoveredData = result.data;
                        success = true;
                        report.push(`✅ ${strategyName} 策略成功`);
                        break;
                    } else {
                        report.push(`❌ ${strategyName} 策略失败: ${result.error}`);
                    }
                } catch (error) {
                    report.push(`⚠️ ${strategyName} 策略异常: ${error.message}`);
                }
            }
        }

        if (!success) {
            report.push('🔒 所有恢复策略均失败，返回原始数据');
        }

        return {
            success,
            data: recoveredData,
            report: report.join('\n')
        };
    }

    /**
     * 获取错误严重程度
     * @param {ValidationError[]} errors - 错误列表
     * @returns {string} 严重程度: 'low', 'medium', 'high', 'critical'
     */
    getErrorSeverity(errors) {
        if (!errors || errors.length === 0) return 'low';

        const severityCount = { critical: 0, high: 0, medium: 0, low: 0 };

        errors.forEach(error => {
            const severity = error.severity || 'medium';
            severityCount[severity]++;
        });

        if (severityCount.critical > 0) return 'critical';
        if (severityCount.high > 0) return 'high';
        if (severityCount.medium > 2) return 'high';
        if (severityCount.medium > 0) return 'medium';
        return 'low';
    }
}

/**
 * 自动修复策略
 */
class AutoFixStrategy {
    canHandle(errors) {
        return errors.some(e => e.code === 'INVALID_POSITION' || e.code === 'INVALID_COLOR');
    }

    async execute(data, errors) {
        try {
            if (Array.isArray(data)) {
                const fixedData = data.map(item => this.fixItem(item, errors));
                return { success: true, data: fixedData };
            } else {
                const fixedData = this.fixItem(data, errors);
                return { success: true, data: fixedData };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    fixItem(item, errors) {
        const fixed = { ...item || {} };

        // 修复位置格式
        if (fixed.fromPos && Array.isArray(fixed.fromPos)) {
            fixed.fromPos = { row: fixed.fromPos[0], col: fixed.fromPos[1] };
        }
        if (fixed.toPos && Array.isArray(fixed.toPos)) {
            fixed.toPos = { row: fixed.toPos[0], col: fixed.toPos[1] };
        }

        // 修复颜色默认值
        if (!fixed.color && ['red', 'black'].includes(fixed.pieceColor)) {
            fixed.color = fixed.pieceColor;
        } else if (!fixed.color) {
            fixed.color = 'red';
        }

        return fixed;
    }
}

/**
 * 跳过策略
 */
class SkipMoveStrategy {
    canHandle(errors) {
        return errors.length > 5; // 错误过多时跳过
    }

    async execute(data, errors) {
        try {
            if (Array.isArray(data)) {
                // 过滤掉有严重错误的项
                const validData = data.filter((item, index) => {
                    return !errors.some(e => e.moveIndex === index && e.severity === 'critical');
                });
                return { success: true, data: validData };
            } else {
                return { success: false, error: '单个数据无法跳过' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

/**
 * 记谱法修复策略
 */
class RepairNotationStrategy {
    canHandle(errors) {
        return errors.some(e => e.code === 'MISSING_NOTATION' || e.code === 'INVALID_NOTATION');
    }

    async execute(data, errors) {
        try {
            const repairNotation = (item) => {
                const fixed = { ...item };
                if (!fixed.notation || fixed.notation.trim() === '') {
                    fixed.notation = `${fixed.pieceType || 'unknown'} ${fixed.color || 'red'}`;
                }
                return fixed;
            };

            if (Array.isArray(data)) {
                const fixedData = data.map(repairNotation);
                return { success: true, data: fixedData };
            } else {
                const fixedData = repairNotation(data);
                return { success: true, data: fixedData };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

/**
 * 位置标准化策略
 */
class NormalizePositionsStrategy {
    canHandle(errors) {
        return errors.some(e => e.code === 'INVALID_POSITION');
    }

    async execute(data, errors) {
        try {
            const normalizePosition = (pos) => {
                if (typeof pos === 'string') {
                    const parts = pos.split(/[,，]/);
                    if (parts.length === 2) {
                        const row = parseInt(parts[0].trim());
                        const col = parseInt(parts[1].trim());
                        if (!isNaN(row) && !isNaN(col)) {
                            return { row, col };
                        }
                    }
                }
                return pos;
            };

            const normalizeItem = (item) => {
                const fixed = { ...item };
                if (fixed.fromPos) fixed.fromPos = normalizePosition(fixed.fromPos);
                if (fixed.toPos) fixed.toPos = normalizePosition(fixed.toPos);
                return fixed;
            };

            if (Array.isArray(data)) {
                const fixedData = data.map(normalizeItem);
                return { success: true, data: fixedData };
            } else {
                const fixedData = normalizeItem(data);
                return { success: true, data: fixedData };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ErrorRecovery, AutoFixStrategy, SkipMoveStrategy, RepairNotationStrategy, NormalizePositionsStrategy };
}