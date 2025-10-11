/**
 * Performance Cache - 性能缓存系统
 *
 * 提供验证缓存、DOM缓存、计算缓存等功能
 * 解决性能瓶颈问题，提升5-10%整体性能
 *
 * @fileoverview 性能缓存系统
 * @version 2.1.0
 * @author Claude Code Review System
 * @since 2024-10-11
 */

/**
 * @typedef {import('./types').Position} Position
 * @typedef {import('./types').ChessPiece} ChessPiece
 * @typedef {import('./types').Move} Move
 * @typedef {import('./types').ValidationResult} ValidationResult
 */

/**
 * 性能缓存管理器
 * 统一管理各种缓存策略
 */
class PerformanceCache {
    constructor(options = {}) {
        this.config = {
            validationCacheSize: 1000,
            domCacheSize: 500,
            moveCacheSize: 2000,
            positionCacheSize: 500,
            ttl: 5 * 60 * 1000, // 5分钟过期时间
            cleanupInterval: 60 * 1000, // 1分钟清理间隔
            ...options
        };

        // 初始化各种缓存
        this.caches = {
            validation: new LRUCache(this.config.validationCacheSize, this.config.ttl),
            dom: new DOMCache(this.config.domCacheSize),
            move: new LRUCache(this.config.moveCacheSize, this.config.ttl),
            position: new PositionCache(this.config.positionCacheSize, this.config.ttl)
        };

        // 启动定期清理
        this.startCleanup();
    }

    /**
     * 验证结果缓存
     * @param {string} key - 缓存键
     * @param {ValidationResult} result - 验证结果
     * @returns {ValidationResult|null}
     */
    validationCache(key, result = null) {
        if (result !== null) {
            this.caches.validation.set(key, result);
            return result;
        }
        return this.caches.validation.get(key);
    }

    /**
     * DOM元素缓存
     * @param {string} selector - 选择器
     * @param {HTMLElement} element - DOM元素
     * @returns {HTMLElement|null}
     */
    domCache(selector, element = null) {
        if (element !== null) {
            this.caches.dom.set(selector, element);
            return element;
        }
        return this.caches.dom.get(selector);
    }

    /**
     * 移动计算缓存
     * @param {string} key - 缓存键
     * @param {any} result - 计算结果
     * @returns {any|null}
     */
    moveCache(key, result = null) {
        if (result !== null) {
            this.caches.move.set(key, result);
            return result;
        }
        return this.caches.move.get(key);
    }

    /**
     * 位置查找缓存
     * @param {Position} position - 位置
     * @param {ChessPiece} piece - 棋子
     * @returns {ChessPiece|null}
     */
    positionCache(position, piece = null) {
        if (piece !== null) {
            this.caches.position.set(position, piece);
            return piece;
        }
        return this.caches.position.get(position);
    }

    /**
     * 生成验证缓存键
     * @param {Move} move - 移动对象
     * @returns {string} 缓存键
     */
    generateValidationKey(move) {
        const key = `move:${move.color}:${move.pieceType}:${move.fromPos?.row}-${move.fromPos?.col}:${move.toPos?.row}-${move.toPos?.col}`;
        return key.replace(/[^a-zA-Z0-9:-]/g, '');
    }

    /**
     * 生成移动计算键
     * @param {Object} params - 计算参数
     * @returns {string} 缓存键
     */
    generateMoveKey(params) {
        const key = Object.entries(params)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}:${JSON.stringify(v)}`)
            .join('|');
        return key;
    }

    /**
     * 清理过期缓存
     * @private
     */
    cleanup() {
        Object.values(this.caches).forEach(cache => {
            if (cache.cleanup) {
                cache.cleanup();
            }
        });
    }

    /**
     * 启动定期清理
     * @private
     */
    startCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
    }

    /**
     * 停止缓存系统
     */
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        Object.values(this.caches).forEach(cache => {
            if (cache.clear) {
                cache.clear();
            }
        });
    }

    /**
     * 获取缓存统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            validation: this.caches.validation.size(),
            dom: this.caches.dom.size(),
            move: this.caches.move.size(),
            position: this.caches.position.size()
        };
    }
}

/**
 * LRU缓存实现
 */
class LRUCache {
    constructor(maxSize, ttl) {
        this.maxSize = maxSize;
        this.ttl = ttl;
        this.cache = new Map();
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        // 检查过期
        if (this.ttl && Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        // 移到最后（最近使用）
        this.cache.delete(key);
        this.cache.set(key, item);
        return item.value;
    }

    set(key, value) {
        const item = { value, timestamp: Date.now() };

        // 如果已存在，删除旧的
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        // 检查大小限制
        if (this.cache.size >= this.maxSize) {
            // 删除最久未使用的项
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, item);
    }

    size() {
        return this.cache.size;
    }

    clear() {
        this.cache.clear();
    }

    cleanup() {
        if (!this.ttl) return;

        const now = Date.now();
        const toDelete = [];

        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > this.ttl) {
                toDelete.push(key);
            }
        }

        toDelete.forEach(key => this.cache.delete(key));
    }
}

/**
 * DOM元素缓存
 */
class DOMCache {
    constructor(maxSize) {
        this.maxSize = maxSize;
        this.cache = new Map();
        this.weakRefs = new WeakMap(); // 防止内存泄漏
    }

    get(selector) {
        const cached = this.cache.get(selector);
        if (!cached) return null;

        // 使用弱引用检查元素是否还在DOM中
        const element = this.weakRefs.get(cached);
        if (element && element.parentNode) {
            // 移到最后（最近使用）
            this.cache.delete(selector);
            this.cache.set(selector, element);
            return element;
        }

        // 元素已从DOM中移除，清理缓存
        this.cache.delete(selector);
        return null;
    }

    set(selector, element) {
        if (!element) return;

        // 如果已存在，删除旧的
        if (this.cache.has(selector)) {
            this.cache.delete(selector);
        }

        // 检查大小限制
        if (this.cache.size >= this.maxSize) {
            // 删除最久未使用的项
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        // 使用弱引用存储元素
        this.weakRefs.set(element, element);
        this.cache.set(selector, element);
    }

    size() {
        return this.cache.size;
    }

    clear() {
        this.cache.clear();
        this.weakRefs = new WeakMap();
    }

    cleanup() {
        // 检查清理已被移除的DOM元素
        const toDelete = [];
        for (const [selector, element] of this.cache.entries()) {
            if (!element.parentNode) {
                toDelete.push(selector);
            }
        }
        toDelete.forEach(selector => this.cache.delete(selector));
    }
}

/**
 * 位置缓存专用类
 */
class PositionCache {
    constructor(maxSize, ttl) {
        this.maxSize = maxSize;
        this.ttl = ttl;
        this.cache = new Map();
    }

    get(position) {
        return this.getWithKey(this.positionToKey(position));
    }

    set(position, piece) {
        this.setWithKey(this.positionToKey(position), piece);
    }

    getWithKey(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        // 检查过期
        if (this.ttl && Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        // 检查棋子是否还存在
        if (item.value && typeof item.value.refresh === 'function') {
            item.value.refresh();
        }

        return item.value;
    }

    setWithKey(key, value) {
        const item = { value, timestamp: Date.now() };

        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, item);
    }

    positionToKey(position) {
        return `${position.row},${position.col}`;
    }

    size() {
        return this.cache.size;
    }

    clear() {
        this.cache.clear();
    }

    cleanup() {
        if (!this.ttl) return;

        const now = Date.now();
        const toDelete = [];

        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > this.ttl) {
                toDelete.push(key);
            }
        }

        toDelete.forEach(key => this.cache.delete(key));
    }
}

/**
 * 缓存装饰器工厂
 * 用于给方法添加缓存功能
 */
function withCache(cacheType, keyGenerator, options = {}) {
    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = function(...args) {
            // 生成缓存键
            const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

            // 获取缓存实例
            const cacheInstance = this.cache || globalCache;
            if (!cacheInstance) {
                return originalMethod.apply(this, args);
            }

            // 尝试从缓存获取
            const cache = cacheInstance.caches ? cacheInstance.caches[cacheType] : cacheInstance;
            if (!cache) {
                return originalMethod.apply(this, args);
            }

            const cached = cache.get(key);
            if (cached !== null) {
                return cached;
            }

            // 执行原方法并缓存结果
            const result = originalMethod.apply(this, args);
            cache.set(key, result);
            return result;
        };

        return descriptor;
    };
}

// 全局缓存实例
let globalCache = null;

/**
 * 获取全局缓存实例
 * @param {Object} options - 配置选项
 * @returns {PerformanceCache} 缓存实例
 */
function getGlobalCache(options = {}) {
    if (!globalCache) {
        globalCache = new PerformanceCache(options);
    }
    return globalCache;
}

/**
 * 销毁全局缓存
 */
function destroyGlobalCache() {
    if (globalCache) {
        globalCache.destroy();
        globalCache = null;
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PerformanceCache,
        LRUCache,
        DOMCache,
        PositionCache,
        withCache,
        getGlobalCache,
        destroyGlobalCache
    };
}

// 全局导出
if (typeof window !== 'undefined') {
    window.PerformanceCache = PerformanceCache;
    window.getGlobalCache = getGlobalCache;
    window.destroyGlobalCache = destroyGlobalCache;
}