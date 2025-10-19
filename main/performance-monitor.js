/**
 * PerformanceMonitor - 性能监控系统 v2.1
 *
 * 提供全面的性能监控和指标收集功能
 * 支持大数据场景的性能分析和建议生成
 *
 * @fileoverview 性能监控系统
 * @version 2.1.0
 * @author Claude Code Review System
 * @since 2024-10-11
 */

/**
 * 性能监控指标类型
 */
const MetricTypes = {
    VALIDATION_TIME: 'validation_time',
    MEMORY_USAGE: 'memory_usage',
    CACHE_HIT_RATIO: 'cache_hit_ratio',
    DOM_OPERATION_TIME: 'dom_operation_time',
    BATCH_PROCESSING_TIME: 'batch_processing_time',
    EVENT_HANDLER_TIME: 'event_handler_time'
};

/**
 * 性能预警级别
 */
const AlertLevels = {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'critical'
};

/**
 * 性能监控系统
 */
class PerformanceMonitor {
    constructor(options = {}) {
        this.options = {
            enableAutoLogging: options.enableAutoLogging !== false,
            enableAlerts: options.enableAlerts !== false,
            logInterval: options.logInterval || 30000, // 30秒
            maxMetricsHistory: options.maxMetricsHistory || 1000,
            alertThresholds: {
                validationTime: 100, // 100ms
                memoryUsage: 450, // 450MB
                cacheHitRatio: 50, // 50%
                domOperationTime: 50, // 50ms
                batchProcessingTime: 500 // 500ms
            },
            ...options
        };

        // 指标存储
        this.metrics = new Map();
        this.history = [];
        this.alerts = [];
        this.startTime = Date.now();

        // 性能计算缓存
        this.calculations = new Map();
        this.lastCalculationTime = 0;

        // 自动日志定时器
        this.logTimer = null;

        // 监控状态
        this.isActive = true;
        this.sessionId = this.generateSessionId();

        // 初始化监控
        this.initializeMonitoring();
    }

    /**
     * 初始化监控系统
     * @private
     */
    initializeMonitoring() {
        // 启动自动日志
        if (this.options.enableAutoLogging) {
            this.startAutoLogging();
        }

        // 监控内存使用
        this.monitorMemoryUsage();

        // 监控页面性能
        this.observePagePerformance();

        console.log(`性能监控已启动，会话ID: ${this.sessionId}`);
    }

    /**
     * 记录性能指标
     * @param {string} type - 指标类型
     * @param {number} value - 指标值
     * @param {Object} metadata - 元数据
     */
    recordMetric(type, value, metadata = {}) {
        if (!this.isActive) {
            return;
        }

        const timestamp = Date.now();
        const metric = {
            id: this.generateMetricId(),
            type,
            value,
            timestamp,
            metadata,
            sessionId: this.sessionId
        };

        // 存储指标
        if (!this.metrics.has(type)) {
            this.metrics.set(type, []);
        }

        const typeMetrics = this.metrics.get(type);
        typeMetrics.push(metric);

        // 限制历史记录大小
        if (typeMetrics.length > this.options.maxMetricsHistory) {
            typeMetrics.splice(0, typeMetrics.length - this.options.maxMetricsHistory);
        }

        // 添加到全局历史
        this.history.push(metric);
        if (this.history.length > this.options.maxMetricsHistory * 5) {
            this.history.splice(0, this.history.length - this.options.maxMetricsHistory * 5);
        }

        // 检查预警
        if (this.options.enableAlerts) {
            this.checkAlerts(metric);
        }

        // 自动日志记录
        if (this.options.enableAutoLogging && this.shouldLogMetric(metric)) {
            this.logMetric(metric);
        }
    }

    /**
     * 记录验证性能
     * @param {Object} validationData - 验证数据
     */
    recordValidation(validationData) {
        const {
            moveCount,
            duration,
            cacheHits,
            cacheMisses,
            errors,
            warnings
        } = validationData;

        // 记录验证时间
        this.recordMetric(MetricTypes.VALIDATION_TIME, duration, {
            moveCount,
            timePerMove: moveCount > 0 ? duration / moveCount : 0,
            complexity: this.calculateComplexity(moveCount)
        });

        // 记录缓存命中率
        const totalCacheOps = cacheHits + cacheMisses;
        if (totalCacheOps > 0) {
            const hitRatio = (cacheHits / totalCacheOps) * 100;
            this.recordMetric(MetricTypes.CACHE_HIT_RATIO, hitRatio, {
                hits: cacheHits,
                misses: cacheMisses,
                totalOps: totalCacheOps
            });
        }

        // 记录复杂度指标
        if (moveCount > 1000) {
            this.recordMetric('large_dataset_validation', duration, {
                moveCount,
                efficiency: this.calculateValidationEfficiency(moveCount, duration)
            });
        }
    }

    /**
     * 记录DOM操作性能
     * @param {string} operation - 操作类型
     * @param {number} duration - 持续时间
     * @param {Object} details - 详细信息
     */
    recordDOMOperation(operation, duration, details = {}) {
        this.recordMetric(MetricTypes.DOM_OPERATION_TIME, duration, {
            operation,
            elements: details.elementCount || 1,
            batchSize: details.batchSize || 1,
            cacheHit: details.cacheHit || false
        });

        // 记录批量操作
        if (details.batchSize && details.batchSize > 1) {
            this.recordMetric(MetricTypes.BATCH_PROCESSING_TIME, duration, {
                batchSize: details.batchSize,
                timePerItem: duration / details.batchSize,
                operation
            });
        }
    }

    /**
     * 监控内存使用
     * @private
     */
    monitorMemoryUsage() {
        if (!performance.memory) {
            return;
        }

        const recordMemoryUsage = () => {
            if (!this.isActive) {
                return;
            }

            const memoryInfo = performance.memory;
            const usedMB = memoryInfo.usedJSHeapSize / 1024 / 1024;
            const limitMB = memoryInfo.jsHeapSizeLimit / 1024 / 1024;

            this.recordMetric(MetricTypes.MEMORY_USAGE, usedMB, {
                total: memoryInfo.totalJSHeapSize / 1024 / 1024,
                limit: limitMB,
                usageRatio: usedMB / limitMB,
                pressure: this.calculateMemoryPressure(usedMB, limitMB)
            });
        };

        // 立即记录一次
        recordMemoryUsage();

        // 定期记录
        this.memoryMonitorInterval = setInterval(recordMemoryUsage, 5000); // 每5秒
    }

    /**
     * 观察页面性能
     * @private
     */
    observePagePerformance() {
        // 监控长任务
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        if (entry.duration > 50) { // 长于50ms的任务
                            this.recordMetric('long_task', entry.duration, {
                                name: entry.name,
                                startTime: entry.startTime,
                                type: entry.entryType
                            });
                        }
                    });
                });

                observer.observe({ entryTypes: ['longtask'] });
                this.performanceObserver = observer;
            } catch (error) {
                console.warn('无法观察长任务性能:', error);
            }
        }
    }

    /**
     * 计算复杂度
     * @param {number} moveCount - 移动数量
     * @returns {string} 复杂度级别
     * @private
     */
    calculateComplexity(moveCount) {
        if (moveCount < 100) return 'low';
        if (moveCount < 1000) return 'medium';
        if (moveCount < 10000) return 'high';
        return 'extreme';
    }

    /**
     * 计算验证效率
     * @param {number} moveCount - 移动数量
     * @param {number} duration - 持续时间
     * @returns {number} 效率分数
     * @private
     */
    calculateValidationEfficiency(moveCount, duration) {
        const movesPerMs = moveCount / Math.max(1, duration);
        return Math.min(100, movesPerMs * 1000); // 转换为100分制
    }

    /**
     * 计算内存压力
     * @param {number} usedMB - 已使用内存(MB)
     * @param {number} limitMB - 内存限制(MB)
     * @returns {string} 压力级别
     * @private
     */
    calculateMemoryPressure(usedMB, limitMB) {
        const ratio = usedMB / limitMB;
        if (ratio < 0.5) return 'low';
        if (ratio < 0.7) return 'medium';
        if (ratio < 0.9) return 'high';
        return 'critical';
    }

    /**
     * 检查预警
     * @param {Object} metric - 指标
     * @private
     */
    checkAlerts(metric) {
        const threshold = this.options.alertThresholds[metric.type];
        if (!threshold) {
            return;
        }

        let level, message;
        if (metric.value > threshold * 2) {
            level = AlertLevels.CRITICAL;
            message = `${metric.type} 严重超标: ${metric.value.toFixed(2)} (阈值: ${threshold})`;
        } else if (metric.value > threshold) {
            level = AlertLevels.WARNING;
            message = `${metric.type} 超标: ${metric.value.toFixed(2)} (阈值: ${threshold})`;
        } else {
            return; // 无预警
        }

        this.addAlert(level, message, metric);
    }

    /**
     * 添加预警
     * @param {string} level - 预警级别
     * @param {string} message - 预警消息
     * @param {Object} metric - 相关指标
     * @private
     */
    addAlert(level, message, metric) {
        const alert = {
            id: this.generateAlertId(),
            level,
            message,
            timestamp: Date.now(),
            metric,
            sessionId: this.sessionId,
            resolved: false
        };

        this.alerts.push(alert);

        // 限制预警历史
        if (this.alerts.length > 100) {
            this.alerts.splice(0, this.alerts.length - 100);
        }

        // 输出预警
        this.outputAlert(alert);
    }

    /**
     * 输出预警
     * @param {Object} alert - 预警对象
     * @private
     */
    outputAlert(alert) {
        const method = alert.level === AlertLevels.CRITICAL ? 'error' :
                      alert.level === AlertLevels.WARNING ? 'warn' : 'log';

        console[method](`[${alert.level.toUpperCase()}] ${alert.message}`, alert.metric);
    }

    /**
     * 获取性能统计
     * @returns {Object} 性能统计
     */
    getPerformanceStats() {
        const stats = {
            sessionId: this.sessionId,
            uptime: Date.now() - this.startTime,
            timestamp: new Date().toISOString(),
            summary: {},
            detailed: {},
            alerts: this.getRecentAlerts(),
            recommendations: []
        };

        // 计算各类型指标的统计信息
        this.metrics.forEach((metrics, type) => {
            if (metrics.length === 0) {
                return;
            }

            const values = metrics.map(m => m.value);
            stats.detailed[type] = {
                count: values.length,
                min: Math.min(...values),
                max: Math.max(...values),
                avg: values.reduce((sum, val) => sum + val, 0) / values.length,
                latest: values[values.length - 1],
                trend: this.calculateTrend(values.slice(-10)) // 最近10个的趋势
            };
        });

        // 生成摘要信息
        stats.summary = this.generateSummary(stats.detailed);

        // 生成建议
        stats.recommendations = this.generateRecommendations(stats.detailed);

        return stats;
    }

    /**
     * 计算趋势
     * @param {Array} values - 值数组
     * @returns {string} 趋势
     * @private
     */
    calculateTrend(values) {
        if (values.length < 2) {
            return 'stable';
        }

        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));

        const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

        const change = (secondAvg - firstAvg) / firstAvg;

        if (Math.abs(change) < 0.05) return 'stable';
        return change > 0 ? 'increasing' : 'decreasing';
    }

    /**
     * 生成摘要
     * @param {Object} detailed - 详细统计
     * @returns {Object} 摘要信息
     * @private
     */
    generateSummary(detailed) {
        const summary = {
            overallHealth: 0,
            criticalIssues: 0,
            warnings: 0,
            efficiency: 0
        };

        // 基于各指标计算健康分数
        let healthScore = 100;
        let factors = 0;

        if (detailed[MetricTypes.VALIDATION_TIME]) {
            const avgTime = detailed[MetricTypes.VALIDATION_TIME].avg;
            healthScore -= Math.max(0, (avgTime - 50) * 0.5); // 超过50ms开始扣分
            factors++;

            if (avgTime > 100) summary.criticalIssues++;
            else if (avgTime > 75) summary.warnings++;
        }

        if (detailed[MetricTypes.MEMORY_USAGE]) {
            const avgMemory = detailed[MetricTypes.MEMORY_USAGE].avg;
            if (avgMemory > 400) summary.criticalIssues++;
            else if (avgMemory > 300) summary.warnings++;
            factors++;

            // 内存效率
            summary.memoryEfficiency = Math.max(0, 100 - (avgMemory - 100) * 0.25);
        }

        if (detailed[MetricTypes.CACHE_HIT_RATIO]) {
            const avgHitRatio = detailed[MetricTypes.CACHE_HIT_RATIO].avg;
            if (avgHitRatio < 30) summary.criticalIssues++;
            else if (avgHitRatio < 50) summary.warnings++;
            factors++;

            // 缓存效率
            summary.cacheEfficiency = avgHitRatio;
        }

        summary.overallHealth = Math.max(0, Math.min(100, healthScore));
        summary.efficiency = this.calculateOverallEfficiency(detailed);

        return summary;
    }

    /**
     * 计算整体效率
     * @param {Object} detailed - 详细统计
     * @returns {number} 效率分数
     * @private
     */
    calculateOverallEfficiency(detailed) {
        let efficiency = 100;
        let factors = 0;

        // 验证效率因子
        if (detailed[MetricTypes.VALIDATION_TIME]) {
            const avgTime = detailed[MetricTypes.VALIDATION_TIME].avg;
            efficiency -= Math.max(0, (avgTime - 50) * 0.3);
            factors++;
        }

        // 缓存效率因子
        if (detailed[MetricTypes.CACHE_HIT_RATIO]) {
            const hitRatio = detailed[MetricTypes.CACHE_HIT_RATIO].avg;
            efficiency = efficiency * 0.6 + hitRatio * 0.4;
            factors++;
        }

        // 内存效率因子
        if (detailed[MetricTypes.MEMORY_USAGE]) {
            const avgMemory = detailed[MetricTypes.MEMORY_USAGE].avg;
            if (avgMemory > 200) {
                efficiency -= (avgMemory - 200) * 0.05;
            }
            factors++;
        }

        return Math.max(0, Math.min(100, efficiency));
    }

    /**
     * 生成优化建议
     * @param {Object} detailed - 详细统计
     * @returns {Array} 建议列表
     * @private
     */
    generateRecommendations(detailed) {
        const recommendations = [];

        // 验证性能建议
        if (detailed[MetricTypes.VALIDATION_TIME]) {
            const avgTime = detailed[MetricTypes.VALIDATION_TIME].avg;
            if (avgTime > 100) {
                recommendations.push({
                    type: 'performance',
                    priority: 'high',
                    message: '验证时间过长，建议启用批量验证或增加缓存大小',
                    impact: 'validation_time'
                });
            }
        }

        // 缓存优化建议
        if (detailed[MetricTypes.CACHE_HIT_RATIO]) {
            const hitRatio = detailed[MetricTypes.CACHE_HIT_RATIO].avg;
            if (hitRatio < 50) {
                recommendations.push({
                    type: 'cache',
                    priority: 'medium',
                    message: '缓存命中率偏低，建议调整缓存策略或增加容量',
                    impact: 'cache_hit_ratio'
                });
            }
        }

        // 内存优化建议
        if (detailed[MetricTypes.MEMORY_USAGE]) {
            const avgMemory = detailed[MetricTypes.MEMORY_USAGE].avg;
            if (avgMemory > 400) {
                recommendations.push({
                    type: 'memory',
                    priority: 'high',
                    message: '内存使用过高，建议执行垃圾回收或清理缓存',
                    impact: 'memory_usage'
                });
            }
        }

        return recommendations;
    }

    /**
     * 获取最近预警
     * @param {number} count - 数量
     * @returns {Array} 预警列表
     */
    getRecentAlerts(count = 10) {
        return this.alerts
            .filter(alert => !alert.resolved)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, count);
    }

    /**
     * 启动自动日志
     * @private
     */
    startAutoLogging() {
        this.logTimer = setInterval(() => {
            if (this.isActive) {
                this.logPerformanceSummary();
            }
        }, this.options.logInterval);
    }

    /**
     * 记录性能摘要
     * @private
     */
    logPerformanceSummary() {
        const stats = this.getPerformanceStats();

        console.group(`性能监控报告 - ${new Date().toLocaleTimeString()}`);
        console.log(`会话: ${stats.sessionId}`);
        console.log(`运行时间: ${(stats.uptime / 1000).toFixed(1)}s`);
        console.log(`健康评分: ${stats.summary.overallHealth.toFixed(1)}/100`);

        if (stats.summary.criticalIssues > 0) {
            console.warn(`严重问题: ${stats.summary.criticalIssues}个`);
        }

        if (stats.summary.warnings > 0) {
            console.warn(`警告: ${stats.summary.warnings}个`);
        }

        if (stats.recommendations.length > 0) {
            console.log('优化建议:');
            stats.recommendations.forEach(rec => {
                console.log(`- [${rec.priority.toUpperCase()}] ${rec.message}`);
            });
        }

        console.groupEnd();
    }

    /**
     * 记录指标
     * @param {Object} metric - 指标
     * @private
     */
    logMetric(metric) {
        console.debug(`性能指标 [${metric.type}]: ${metric.value.toFixed(2)}ms`, metric.metadata);
    }

    /**
     * 判断是否应该记录指标
     * @param {Object} metric - 指标
     * @returns {boolean} 是否记录
     * @private
     */
    shouldLogMetric(metric) {
        // 只记录异常值或重要指标
        const thresholds = this.options.alertThresholds;
        return metric.value > (thresholds[metric.type] || 0) * 0.5;
    }

    /**
     * 启动性能监控
     */
    start() {
        this.isActive = true;
        console.log('性能监控已启动');
    }

    /**
     * 停止性能监控
     */
    stop() {
        this.isActive = false;

        if (this.logTimer) {
            clearInterval(this.logTimer);
            this.logTimer = null;
        }

        if (this.memoryMonitorInterval) {
            clearInterval(this.memoryMonitorInterval);
            this.memoryMonitorInterval = null;
        }

        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
            this.performanceObserver = null;
        }

        console.log('性能监控已停止');
    }

    /**
     * 清理资源
     */
    cleanup() {
        this.stop();
        this.metrics.clear();
        this.history = [];
        this.alerts = [];
        this.calculations.clear();
        console.log('性能监控系统已清理');
    }

    /**
     * 生成会话ID
     * @returns {string} 会话ID
     * @private
     */
    generateSessionId() {
        return 'perf_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 生成指标ID
     * @returns {string} 指标ID
     * @private
     */
    generateMetricId() {
        return 'metric_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
    }

    /**
     * 生成预警ID
     * @returns {string} 预警ID
     * @private
     */
    generateAlertId() {
        return 'alert_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PerformanceMonitor, MetricTypes, AlertLevels };
} else if (typeof window !== 'undefined') {
    window.PerformanceMonitor = PerformanceMonitor;
    window.MetricTypes = MetricTypes;
    window.AlertLevels = AlertLevels;
}