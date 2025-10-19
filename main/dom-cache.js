/**
 * DOMCacheManager - DOM缓存管理系统 v2.1
 *
 * 解决25+次DOM查询的性能问题，提供智能DOM元素缓存和批量更新
 * 修复内存泄漏问题，完善事件监听器管理
 *
 * @fileoverview DOM缓存管理系统
 * @version 2.1.0
 * @author Claude Code Review System
 * @since 2024-10-11
 */
/**
 * DOM缓存管理系统
 */
class DOMCacheManager {
    constructor(options = {}) {
        // 配置选项
        this.options = {
            maxCacheSize: options.maxCacheSize || 500,
            enableBatching: options.enableBatching !== false,
            batchDelay: options.batchDelay || 16, // 一帧的时间
 enableMemoryCleanup: options.enableMemoryCleanup !== false,
            cleanupInterval: options.cleanupInterval || 30000, // 30秒
            ...options
        };

        // DOM元素缓存
        this.elementCache = new Map();
        this.styleCache = new Map();
        this.classCache = new Map();

        // 批量操作队列
        this.batchQueue = {
            updates: [],
            creations: [],
            deletions: []
        };

        // 事件监听器管理
        this.eventListeners = new Map(); // 存储所有事件监听器引用
        this.activeTimers = new Set(); // 存储所有定时器ID

        // 性能统计
        this.stats = {
            cacheHits: 0,
            cacheMisses: 0,
            domQueries: 0,
            batchedOperations: 0,
            registeredListeners: 0,
            cleanedListeners: 0,
            memoryCleanups: 0
        };

        // 内存管理
        this.weakRefs = new Set(); // 存储弱引用
        this.isCleanupScheduled = false;

        // 设置定时清理
        if (this.options.enableMemoryCleanup) {
            this.startMemoryCleanup();
        }
    }

    /**
     * 获取DOM元素（带缓存）
     * @param {string} selector - CSS选择器
     * @param {Element} parent - 父元素，默认为document
     * @returns {Element|null} DOM元素
     */
    getElement(selector, parent = document) {
        const cacheKey = `${parent.nodeName || 'document'}:${selector}`;

        // 检查缓存
        const cached = this.elementCache.get(cacheKey);
        if (cached && this.isElementValid(cached)) {
            this.stats.cacheHits++;
            return cached;
        }

        // 执行DOM查询
        this.stats.domQueries++;
        this.stats.cacheMisses++;

        const element = parent.querySelector(selector);

        if (element) {
            // 缓存元素
            if (this.elementCache.size >= this.options.maxCacheSize) {
                this.cleanupOldestCache();
            }
            this.elementCache.set(cacheKey, element);

            // 添加弱引用以便垃圾回收
            this.weakRefs.add(new WeakRef(element));
        }

        return element;
    }

    /**
     * 获取多个DOM元素（带缓存）
     * @param {string} selector - CSS选择器
     * @param {Element} parent - 父元素，默认为document
     * @returns {NodeList} DOM元素列表
     */
    getElements(selector, parent = document) {
        this.stats.domQueries++;
        return parent.querySelectorAll(selector);
    }

    /**
     * 缓存样式信息
     * @param {Element} element - DOM元素
     * @param {string} property - 样式属性
     * @param {string} value - 样式值（可选，设置时使用）
     * @returns {string} 样式值
     */
    cacheStyle(element, property, value) {
        const elementId = this.getElementId(element);
        const cacheKey = `${elementId}:${property}`;

        if (value !== undefined) {
            // 设置并缓存样式
            element.style[property] = value;
            this.styleCache.set(cacheKey, value);
            return value;
        } else {
            // 获取样式，优先从缓存获取
            const cached = this.styleCache.get(cacheKey);
            if (cached !== undefined) {
                this.stats.cacheHits++;
                return cached;
            }

            // 从DOM获取样式
            this.stats.cacheMisses++;
            const computedValue = getComputedStyle(element)[property];
            this.styleCache.set(cacheKey, computedValue);
            return computedValue;
        }
    }

    /**
     * 缓存类名信息
     * @param {Element} element - DOM元素
     * @param {string} operation - 操作类型：'add', 'remove', 'toggle', 'has'
     * @param {string} className - 类名
     * @param {boolean} force - 强制设置（toggle时使用）
     * @returns {boolean|string} 操作结果
     */
    cacheClass(element, operation, className, force) {
        const elementId = this.getElementId(element);
        const cacheKey = `${elementId}:classes`;

        // 确保类名缓存存在
        if (!this.classCache.has(cacheKey)) {
            this.classCache.set(cacheKey, new Set(element.className.split(' ').filter(Boolean)));
        }

        const classSet = this.classCache.get(cacheKey);
        let result;

        switch (operation) {
            case 'add':
                if (!classSet.has(className)) {
                    element.classList.add(className);
                    classSet.add(className);
                }
                result = true;
                break;

            case 'remove':
                if (classSet.has(className)) {
                    element.classList.remove(className);
                    classSet.delete(className);
                }
                result = true;
                break;

            case 'toggle':
                if (classSet.has(className)) {
                    element.classList.remove(className);
                    classSet.delete(className);
                    result = false;
                } else {
                    element.classList.add(className);
                    classSet.add(className);
                    result = true;
                }
                // 强制设置
                if (force !== undefined) {
                    if (force && !classSet.has(className)) {
                        element.classList.add(className);
                        classSet.add(className);
                        result = true;
                    } else if (!force && classSet.has(className)) {
                        element.classList.remove(className);
                        classSet.delete(className);
                        result = false;
                    }
                }
                break;

            case 'has':
                result = classSet.has(className);
                break;

            default:
                throw new Error(`Unsupported class operation: ${operation}`);
        }

        return result;
    }

    /**
     * 批量DOM更新
     * @param {Function} updateFunction - 更新函数
     * @param {number} delay - 延迟时间（可选）
     */
    batchUpdate(updateFunction, delay = this.options.batchDelay) {
        if (!this.options.enableBatching) {
            updateFunction();
            return;
        }

        // 将更新函数加入队列
        this.batchQueue.updates.push({ fn: updateFunction, timestamp: Date.now() });

        // 安排批量执行
        this.scheduleBatchExecution(delay);
        this.stats.batchedOperations++;
    }

    /**
     * 批量创建元素
     * @param {Object} config - 元素配置
     * @returns {Element} 创建的元素
     */
    batchCreate(config) {
        if (!this.options.enableBatching) {
            return this.createElementImmediate(config);
        }

        this.batchQueue.creations.push({ config, timestamp: Date.now() });
        this.scheduleBatchExecution();
        return null; // 实际创建在批量执行中进行
    }

    /**
     * 批量删除元素
     * @param {Element} element - 要删除的元素
     */
    batchDelete(element) {
        if (!this.options.enableBatching) {
            this.deleteElementImmediate(element);
            return;
        }

        this.batchQueue.deletions.push({ element, timestamp: Date.now() });
        this.scheduleBatchExecution();
    }

    /**
     * 安排批量执行
     * @param {number} delay - 延迟时间
     * @private
     */
    scheduleBatchExecution(delay = this.options.batchDelay) {
        if (this.batchTimer) {
            return; // 已安排执行
        }

        this.batchTimer = window.setTimeout(() => {
            this.executeBatch();
            this.batchTimer = null;
        }, delay);

        this.activeTimers.add(this.batchTimer);
    }

    /**
     * 执行批量操作
     * @private
     */
    executeBatch() {
        const startTime = performance.now();

        // 执行创建操作
        this.batchQueue.creations.forEach(({ config }) => {
            this.createElementImmediate(config);
        });

        // 执行更新操作
        this.batchQueue.updates.forEach(({ fn }) => {
            fn();
        });

        // 执行删除操作
        this.batchQueue.deletions.forEach(({ element }) => {
            this.deleteElementImmediate(element);
        });

        // 清空队列
        this.batchQueue = {
            updates: [],
            creations: [],
            deletions: []
        };

        // 记录性能
        const executionTime = performance.now() - startTime;
        console.log(`批量DOM操作完成，耗时: ${executionTime.toFixed(2)}ms`);
    }

    /**
     * 立即创建元素
     * @param {Object} config - 元素配置
     * @returns {Element} 创建的元素
     * @private
     */
    createElementImmediate(config) {
        const {
            tagName = 'div',
            attributes = {},
            styles = {},
            classes = [],
            textContent = '',
            innerHTML = '',
            parent = null
        } = config;

        const element = document.createElement(tagName);

        // 设置属性
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });

        // 设置样式
        Object.entries(styles).forEach(([property, value]) => {
            element.style[property] = value;
        });

        // 设置类名
        classes.forEach(className => {
            element.classList.add(className);
        });

        // 设置内容
        if (textContent) {
            element.textContent = textContent;
        } else if (innerHTML) {
            element.innerHTML = innerHTML;
        }

        // 添加到父元素
        if (parent) {
            parent.appendChild(element);
        }

        return element;
    }

    /**
     * 立即删除元素
     * @param {Element} element - 要删除的元素
     * @private
     */
    deleteElementImmediate(element) {
        if (!element || !element.parentNode) {
            return;
        }

        // 清理相关缓存
        this.cleanupElementCache(element);

        // 移除事件监听器
        this.removeAllListenersFromElement(element);

        // 删除元素
        element.parentNode.removeChild(element);
    }

    /**
     * 添加事件监听器（自动管理）
     * @param {Element} element - 目标元素
     * @param {string} event - 事件类型
     * @param {Function} handler - 事件处理函数
     * @param {Object} options - 事件选项
     * @returns {Function} 移除监听器的函数
     */
    addEventListener(element, event, handler, options = {}) {
        const wrappedHandler = this.wrapEventHandler(handler, element, event);

        element.addEventListener(event, wrappedHandler, options);

        // 存储监听器引用以便后续清理
        const listenerKey = this.generateListenerKey(element, event);
        if (!this.eventListeners.has(listenerKey)) {
            this.eventListeners.set(listenerKey, []);
        }

        const listenerInfo = {
            element,
            event,
            handler: wrappedHandler,
            originalHandler: handler,
            options
        };

        this.eventListeners.get(listenerKey).push(listenerInfo);
        this.stats.registeredListeners++;

        // 返回清理函数
        return () => this.removeEventListener(element, event, handler);
    }

    /**
     * 移除事件监听器
     * @param {Element} element - 目标元素
     * @param {string} event - 事件类型
     * @param {Function} handler - 原始处理函数
     */
    removeEventListener(element, event, handler) {
        const listenerKey = this.generateListenerKey(element, event);
        const listeners = this.eventListeners.get(listenerKey);

        if (!listeners) {
            return;
        }

        const listenerIndex = listeners.findIndex(l => l.originalHandler === handler);
        if (listenerIndex !== -1) {
            const listenerInfo = listeners[listenerIndex];
            element.removeEventListener(event, listenerInfo.handler, listenerInfo.options);
            listeners.splice(listenerIndex, 1);
            this.stats.cleanedListeners++;

            // 如果没有更多监听器，删除缓存项
            if (listeners.length === 0) {
                this.eventListeners.delete(listenerKey);
            }
        }
    }

    /**
     * 移除元素上的所有事件监听器
     * @param {Element} element - 目标元素
     */
    removeAllListenersFromElement(element) {
        for (const [listenerKey, listeners] of this.eventListeners) {
            const elementListeners = listeners.filter(l => l.element === element);

            elementListeners.forEach(listenerInfo => {
                element.removeEventListener(listenerInfo.event, listenerInfo.handler, listenerInfo.options);
                this.stats.cleanedListeners++;
            });

            // 从列表中移除
            const remainingListeners = listeners.filter(l => l.element !== element);
            if (remainingListeners.length === 0) {
                this.eventListeners.delete(listenerKey);
            } else {
                this.eventListeners.set(listenerKey, remainingListeners);
            }
        }
    }

    /**
     * 包装事件处理函数以便调试和管理
     * @param {Function} handler - 原始处理函数
     * @param {Element} element - 目标元素
     * @param {string} event - 事件类型
     * @returns {Function} 包装后的处理函数
     * @private
     */
    wrapEventHandler(handler, element, event) {
        return function(eventObject) {
            try {
                return handler.call(this, eventObject);
            } catch (error) {
                console.error(`事件处理错误 (${event} on ${element.tagName}):`, error);
            }
        };
    }

    /**
     * 生成监听器键
     * @param {Element} element - 目标元素
     * @param {string} event - 事件类型
     * @returns {string} 监听器键
     * @private
     */
    generateListenerKey(element, event) {
        const elementId = this.getElementId(element);
        return `${elementId}:${event}`;
    }

    /**
     * 获取元素ID
     * @param {Element} element - DOM元素
     * @returns {string} 元素ID
     * @private
     */
    getElementId(element) {
        if (element.id) {
            return `#${element.id}`;
        }

        if (element.className) {
            const classes = element.className.split(' ').join('.');
            return `${element.tagName.toLowerCase()}.${classes}`;
        }

        return `${element.tagName.toLowerCase()}`;
    }

    /**
     * 检查元素是否有效（仍在DOM中）
     * @param {Element} element - DOM元素
     * @returns {boolean} 是否有效
     * @private
     */
    isElementValid(element) {
        return element && document.contains(element);
    }

    /**
     * 清理最旧的缓存项
     * @private
     */
    cleanupOldestCache() {
        const entries = Array.from(this.elementCache.entries());
        const toDelete = entries.slice(0, Math.floor(entries.length * 0.2)); // 删除20%最旧的缓存

        toDelete.forEach(([key]) => {
            this.elementCache.delete(key);
        });
    }

    /**
     * 清理元素相关缓存
     * @param {Element} element - DOM元素
     * @private
     */
    cleanupElementCache(element) {
        const elementId = this.getElementId(element);

        // 清理元素缓存
        for (const [key] of this.elementCache) {
            if (key.includes(elementId)) {
                this.elementCache.delete(key);
            }
        }

        // 清理样式缓存
        for (const [key] of this.styleCache) {
            if (key.includes(elementId)) {
                this.styleCache.delete(key);
            }
        }

        // 清理类名缓存
        for (const [key] of this.classCache) {
            if (key.includes(elementId)) {
                this.classCache.delete(key);
            }
        }
    }

    /**
     * 启动内存清理
     * @private
     */
    startMemoryCleanup() {
        this.cleanupTimer = window.setInterval(() => {
            this.performMemoryCleanup();
        }, this.options.cleanupInterval);

        this.activeTimers.add(this.cleanupTimer);
    }

    /**
     * 执行内存清理
     * @private
     */
    performMemoryCleanup() {
        const startTime = performance.now();
        let cleanedCount = 0;

        // 清理无效的弱引用
        const validWeakRefs = new Set();
        for (const weakRef of this.weakRefs) {
            const element = weakRef.deref();
            if (element && this.isElementValid(element)) {
                validWeakRefs.add(weakRef);
            } else {
                cleanedCount++;
            }
        }
        this.weakRefs = validWeakRefs;

        // 清理无效的元素缓存
        const validElements = new Map();
        for (const [key, element] of this.elementCache) {
            if (this.isElementValid(element)) {
                validElements.set(key, element);
            } else {
                cleanedCount++;
            }
        }
        this.elementCache = validElements;

        // 清理过期的样式缓存（简单的LRU策略）
        if (this.styleCache.size > this.options.maxCacheSize) {
            const entries = Array.from(this.styleCache.entries());
            const toKeep = entries.slice(-Math.floor(this.options.maxCacheSize * 0.8));
            this.styleCache = new Map(toKeep);
            cleanedCount += entries.length - toKeep.length;
        }

        this.stats.memoryCleanups++;
        const duration = performance.now() - startTime;
        console.log(`内存清理完成，清理了 ${cleanedCount} 项，耗时: ${duration.toFixed(2)}ms`);
    }

    /**
     * 立即执行内存清理
     */
    forceMemoryCleanup() {
        this.performMemoryCleanup();
    }

    /**
     * 清理所有资源
     */
    cleanup() {
        // 清理定时器
        this.activeTimers.forEach(timerId => {
            clearTimeout(timerId);
            clearInterval(timerId);
        });
        this.activeTimers.clear();

        // 移除所有事件监听器
        for (const [listenerKey, listeners] of this.eventListeners) {
            listeners.forEach(listenerInfo => {
                const { element, event, handler, options } = listenerInfo;
                element.removeEventListener(event, handler, options);
                this.stats.cleanedListeners++;
            });
        }
        this.eventListeners.clear();

        // 清空缓存
        this.elementCache.clear();
        this.styleCache.clear();
        this.classCache.clear();
        this.weakRefs.clear();

        // 清空批量队列
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
        this.batchQueue = {
            updates: [],
            creations: [],
            deletions: []
        };

        console.log('DOM缓存管理器已完全清理');
    }

    /**
     * 获取性能统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            cacheHitRatio: this.stats.cacheHits + this.stats.cacheMisses > 0 ?
                (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100).toFixed(2) + '%' : '0%',
            cacheSizes: {
                elements: this.elementCache.size,
                styles: this.styleCache.size,
                classes: this.classCache.size
            },
            activeTimers: this.activeTimers.size,
            queuedOperations: this.batchQueue.updates.length +
                             this.batchQueue.creations.length +
                             this.batchQueue.deletions.length,
            memoryEfficiency: this.calculateMemoryEfficiency()
        };
    }

    /**
     * 计算内存效率
     * @returns {number} 内存效率 (0-100)
     * @private
     */
    calculateMemoryEfficiency() {
        const totalCache = this.elementCache.size + this.styleCache.size + this.classCache.size;
        if (totalCache === 0) return 100;

        const efficiency = Math.max(0, 100 - (totalCache / this.options.maxCacheSize * 100));
        return Math.round(efficiency);
    }

    /**
     * 获取性能报告
     * @returns {Object} 性能报告
     */
    getPerformanceReport() {
        const stats = this.getStats();

        return {
            timestamp: new Date().toISOString(),
            stats,
            recommendations: this.generateRecommendations(),
            healthScore: this.calculateHealthScore()
        };
    }

    /**
     * 生成优化建议
     * @returns {string[]} 建议列表
     * @private
     */
    generateRecommendations() {
        const recommendations = [];
        const hitRatio = parseFloat(this.stats.cacheHitRatio) || 0;

        if (hitRatio < 70) {
            recommendations.push('DOM缓存命中率较低，建议优化缓存策略或增加缓存大小');
        }

        if (this.stats.activeTimers > 10) {
            recommendations.push('活动定时器过多，可能存在内存泄漏风险');
        }

        if (this.stats.queuedOperations > 50) {
            recommendations.push('批量操作队列积压，建议调整批处理延迟');
        }

        return recommendations;
    }

    /**
     * 计算健康评分
     * @returns {number} 健康评分 (0-100)
     * @private
     */
    calculateHealthScore() {
        const hitRatio = parseFloat(this.stats.cacheHitRatio) || 0;
        const memoryScore = this.calculateMemoryEfficiency();
        const timerScore = Math.max(0, 100 - this.stats.activeTimers * 5);

        return Math.round((hitRatio * 0.4 + memoryScore * 0.4 + timerScore * 0.2));
    }
}

export { DOMCacheManager };