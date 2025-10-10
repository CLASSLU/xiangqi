/**
 * ErrorHandler 模块
 * 全局错误处理机制 - 统一错误捕获和处理
 */

class ErrorHandler {
    constructor(options = {}) {
        // 配置选项
        this.maxQueueSize = options.maxQueueSize || 100;
        this.enableConsoleLogging = options.enableConsoleLogging !== false;
        this.enableUserNotification = options.enableUserNotification !== false;
        this.window = options.window || (typeof window !== 'undefined' ? window : null);

        // 错误队列和回调
        this.errorQueue = [];
        this.errorCallbacks = new Set();

        // 错误统计
        this.errorStats = {
            totalErrors: 0,
            errorsByType: {},
            lastErrorTime: null
        };

        // 错误频率监控
        this.errorTimestamps = [];

        // 递归保护
        this.isProcessingError = false;

        // 自动绑定全局错误处理
        if (options.setupGlobalHandlers !== false) {
            this.setupGlobalErrorHandling();
        }
    }

    /**
     * 设置全局错误处理
     */
    setupGlobalErrorHandling() {
        if (typeof window !== 'undefined') {
            // 捕获未处理的JavaScript错误
            window.addEventListener('error', (event) => {
                this.capture(event.error || new Error(event.message), {
                    type: 'javascript',
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
            });

            // 捕获未处理的Promise拒绝
            window.addEventListener('unhandledrejection', (event) => {
                this.capture(event.reason || new Error('Unhandled Promise Rejection'), {
                    type: 'promise'
                });
            });
        }
    }

    /**
     * 捕获错误
     * @param {Error|String|Object} error - 错误对象
     * @param {Object} context - 错误上下文信息
     */
    capture(error, context = {}) {
        // 递归保护
        if (this.isProcessingError) {
            return;
        }

        try {
            this.isProcessingError = true;

            // 标准化错误对象
            const standardError = this.standardizeError(error);

            // 创建错误数据
            const errorType = this.categorizeError(standardError, context);
            const errorData = {
                id: this.generateErrorId(),
                timestamp: Date.now(),
                message: standardError.message,
                stack: standardError.stack,
                type: errorType,
                category: errorType, // 兼容测试期望的字段名
                severity: context.severity || this.determineSeverity(standardError, context),
                context: {
                    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js',
                    url: typeof window !== 'undefined' ? window.location?.href : 'Test Environment',
                    ...context
                }
            };

            // 添加到队列
            this.addToQueue(errorData);

            // 更新统计
            this.updateStats(errorData);

            // 处理错误
            this.processError(errorData);

        } catch (processingError) {
            // 错误处理器自身出错了，降级处理
            this.fallbackErrorLog(error, processingError);
        } finally {
            this.isProcessingError = false;
        }
    }

    /**
     * 带分类的错误捕获
     * @param {string} category - 错误分类
     * @param {Error|String|Object} error - 错误对象
     * @param {Object} context - 错误上下文信息
     */
    captureWithCategory(category, error, context = {}) {
        this.capture(error, { ...context, category });
    }

    /**
     * 标准化错误对象
     * @param {Error|String|Object} error - 原始错误
     * @returns {Error} 标准化的错误对象
     */
    standardizeError(error) {
        if (error instanceof Error) {
            return error;
        }

        if (typeof error === 'string') {
            return new Error(error);
        }

        if (error && typeof error === 'object') {
            if (error.message) {
                const standardError = new Error(error.message);
                standardError.stack = error.stack;
                return standardError;
            }

            return new Error(JSON.stringify(error));
        }

        if (error === null || error === undefined) {
            return new Error('Null or undefined error');
        }

        return new Error(String(error));
    }

    /**
     * 错误分类
     * @param {Error} error - 错误对象
     * @param {Object} context - 错误上下文
     * @returns {string} 错误分类
     */
    categorizeError(error, context) {
        // 优先使用上下文中的分类
        if (context.category) {
            return context.category;
        }

        // 根据上下文类型分类
        if (context.type === 'javascript') return 'javascript';
        if (context.type === 'promise') return 'promise';
        if (context.type === 'network') return 'network';

        // 根据错误名称分类
        const errorName = error.name.toLowerCase();
        if (errorName.includes('type')) return 'type';
        if (errorName.includes('reference')) return 'reference';
        if (errorName.includes('syntax')) return 'syntax';
        if (errorName.includes('range')) return 'range';

        // 根据错误消息分类
        const message = error.message.toLowerCase();
        if (message.includes('network') || message.includes('fetch')) return 'network';
        if (message.includes('permission')) return 'permission';
        if (message.includes('quota')) return 'quota';

        return 'general';
    }

    /**
     * 确定错误严重性
     * @param {Error} error - 错误对象
     * @param {Object} context - 错误上下文
     * @returns {string} 严重性级别 ('low', 'medium', 'high', 'critical')
     */
    determineSeverity(error, context) {
        if (context.severity) {
            return context.severity;
        }

        // 网络错误通常是中等严重性
        if (context.type === 'network' || error.message.includes('fetch')) {
            return 'medium';
        }

        // JavaScript语法或引用错误是高严重性
        if (error.name.includes('SyntaxError') || error.name.includes('ReferenceError')) {
            return 'high';
        }

        // Promise拒绝可能是中等严重性
        if (context.type === 'promise') {
            return 'medium';
        }

        return 'low';
    }

    /**
     * 添加错误到队列
     * @param {Object} errorData - 错误数据
     */
    addToQueue(errorData) {
        // 新的错误添加到队列前面（最新的在前）
        this.errorQueue.unshift(errorData);

        // 限制队列大小，移除最旧的（在末尾的）
        if (this.errorQueue.length > this.maxQueueSize) {
            this.errorQueue.pop();
        }

        // 更新错误时间戳列表（用于频率监控）
        this.errorTimestamps.push(errorData.timestamp);
        if (this.errorTimestamps.length > 100) {
            this.errorTimestamps.shift();
        }
    }

    /**
     * 更新错误统计
     * @param {Object} errorData - 错误数据
     */
    updateStats(errorData) {
        this.errorStats.totalErrors++;
        this.errorStats.lastErrorTime = errorData.timestamp;

        // 按类型统计
        if (!this.errorStats.errorsByType[errorData.type]) {
            this.errorStats.errorsByType[errorData.type] = 0;
        }
        this.errorStats.errorsByType[errorData.type]++;
    }

    /**
     * 处理错误
     * @param {Object} errorData - 错误数据
     */
    processError(errorData) {
        // 控制台日志
        if (this.enableConsoleLogging && typeof console !== 'undefined') {
            console.error('全局错误捕获:', errorData.message, errorData);
        }

        // 用户通知
        if (this.enableUserNotification && this.window && this.window.showMessage) {
            const userMessage = this.getUserFriendlyMessage(errorData);
            this.window.showMessage(userMessage, 'error');
        }

        // 执行回调
        this.notifyCallbacks(errorData);
    }

    /**
     * 获取用户友好的错误消息
     * @param {Object} errorData - 错误数据
     * @returns {string} 用户友好的消息
     */
    getUserFriendlyMessage(errorData) {
        switch (errorData.type) {
            case 'network':
                return '网络连接出现问题，请检查网络后重试';
            case 'permission':
                return '权限不足，请检查浏览器权限设置';
            case 'quota':
                return '存储空间不足，请清理浏览器数据';
            default:
                return '遇到错误，请刷新页面重试';
        }
    }

    /**
     * 通知所有错误回调
     * @param {Object} errorData - 错误数据
     */
    notifyCallbacks(errorData) {
        this.errorCallbacks.forEach(callback => {
            try {
                callback(errorData);
            } catch (callbackError) {
                // 防止回调中的错误导致无限递归
                console.error('错误回调失败:', callbackError);
            }
        });
    }

    /**
     * 降级错误日志
     * @param {*} originalError - 原始错误
     * @param {*} processingError - 处理错误
     */
    fallbackErrorLog(originalError, processingError) {
        try {
            console.error('ErrorHandler内部错误:', processingError);
            console.error('原始错误:', originalError);
            if (typeof console !== 'undefined' && console.error) {
                console.error('原始错误:', originalError);
            }
        } catch (e) {
            // 最后的保护，静默失败
        }
    }

    /**
     * 生成错误ID
     * @returns {string} 唯一错误ID
     */
    generateErrorId() {
        return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 注册错误回调
     * @param {Function} callback - 回调函数
     */
    onError(callback) {
        if (typeof callback === 'function') {
            this.errorCallbacks.add(callback);
        }
    }

    /**
     * 移除错误回调
     * @param {Function} callback - 回调函数
     */
    offError(callback) {
        this.errorCallbacks.delete(callback);
    }

    /**
     * 获取错误历史
     * @returns {Array} 错误历史深拷贝
     */
    getErrorHistory() {
        return this.errorQueue.map(error => ({
            ...error,
            context: { ...error.context }
        }));
    }

    /**
     * 获取错误统计信息
     * @returns {Object} 错误统计
     */
    getStats() {
        return {
            ...this.errorStats,
            queueSize: this.errorQueue.length,
            callbackCount: this.errorCallbacks.size
        };
    }

    /**
     * 获取错误频率信息
     * @param {number} windowMs - 时间窗口（毫秒），默认最后100个错误
     * @returns {Array} 错误时间戳数组
     */
    getErrorFrequency(windowMs = 60000) {
        const now = Date.now();
        return this.errorTimestamps.filter(timestamp =>
            now - timestamp <= windowMs
        );
    }

    /**
     * 清除错误历史
     */
    clear() {
        this.errorQueue = [];
        this.errorTimestamps = [];
        this.errorStats = {
            totalErrors: 0,
            errorsByType: {},
            lastErrorTime: null
        };
    }

    /**
     * 销毁错误处理器
     */
    destroy() {
        this.clear();
        this.errorCallbacks.clear();

        // 移除全局事件监听器
        if (typeof window !== 'undefined') {
            // 注意：由于使用了匿名函数，无法精确移除监听器
            // 实际应用中可以考虑保存监听器引用
        }
    }
}

// 导出到全局作用域
if (typeof window !== 'undefined') {
    window.ErrorHandler = ErrorHandler;
}

// 导出供模块系统使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ErrorHandler };
}