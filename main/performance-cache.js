"use strict";
/**
 * PerformanceCache - 高性能缓存系统 v2.1
 *
 * 提供游戏引擎的全面性能优化缓存功能
 * 解决O(n³)验证复杂度问题，支持大数据场景 (103,800条棋谱)
 * 内置LRU策略、内存管理和性能监控
 *
 * @fileoverview 高性能缓存系统
 * @version 2.1.0
 * @author Claude Code Review System
 * @since 2024-10-11
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceCache = void 0;

/**
 * 验证缓存项
 */
class ValidationCacheItem {
    constructor(result, dependencies = []) {
        this.result = result;
        this.dependencies = dependencies;
        this.timestamp = Date.now();
        this.accessCount = 1;
        this.lastAccessed = Date.now();
    }

    updateAccess() {
        this.accessCount++;
        this.lastAccessed = Date.now();
    }

    isExpired(maxAge = 300000) { // 5分钟默认过期
        return Date.now() - this.timestamp > maxAge;
    }
}

/**
 * 性能缓存系统
 */
class PerformanceCache {
    constructor(options = {}) {
        // 配置选项
        this.options = {
            maxValidationCacheSize: options.maxValidationCacheSize || 10000,
            maxPositionCacheSize: options.maxPositionCacheSize || 1000,
            maxMoveCacheSize: options.maxMoveCacheSize || 5000,
            enableIntelligentCache: options.enableIntelligentCache !== false,
            enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
            cacheEvictionPolicy: options.cacheEvictionPolicy || 'lru', // lru, lfu, ttl
            maxCacheAge: options.maxCacheAge || 300000, // 5分钟
            memoryThreshold: options.memoryThreshold || 0.8, // 80%内存使用率阈值
            ...options
        };

        // 核心缓存存储
        this.positionCacheMap = new Map();
        this.moveCacheMap = new Map();
        this.validationCacheMap = new Map();
        this.gameStateCache = new Map();
        this.canonicalPositionCache = new Map(); // 规范化位置缓存

        // 依赖关系追踪
        this.dependencyGraph = new Map();
        this.reverseDependencyGraph = new Map();

        // 性能统计
        this.stats = {
            validationCacheHits: 0,
            validationCacheMisses: 0,
            positionCacheHits: 0,
            positionCacheMisses: 0,
            moveCacheHits: 0,
            moveCacheMisses: 0,
            gameStateHits: 0,
            gameStateMisses: 0,
            cacheEvictions: 0,
            dependencyInvalidations: 0,
            memoryCleanups: 0,
            totalQueries: 0,
            averageQueryTime: 0,
            peakMemoryUsage: 0,
            cacheHitRatios: {
                validation: '0%',
                position: '0%',
                move: '0%',
                gameState: '0%'
            }
        };

        // 性能监控
        this.queryTimes = [];
        this.performanceTimer = null;
        this.monitoringInterval = null;

        // 内存管理
        this.lastMemoryCleanup = Date.now();
        this.isValidating = false; // 防止递归验证

        // 启动性能监控
        if (this.options.enablePerformanceMonitoring) {
            this.startPerformanceMonitoring();
        }
    }
    /**
     * 智能验证缓存 - 解决O(n³)复杂度问题
     * @param {string} validationKey - 验证缓存键
     * @param {Object} validationParams - 验证参数
     * @param {Function} computeFunction - 计算函数
     * @returns {any} 验证结果
     */
    intelligentValidationCache(validationKey, validationParams, computeFunction) {
        const startTime = performance.now();
        this.stats.totalQueries++;

        try {
            // 生成规范化缓存键
            const canonicalKey = this.canonicalizeValidationKey(validationKey, validationParams);

            // 检查缓存
            const cachedItem = this.validationCacheMap.get(canonicalKey);
            if (cachedItem && !cachedItem.isExpired(this.options.maxCacheAge)) {
                this.stats.validationCacheHits++;
                cachedItem.updateAccess();
                this.recordQueryTime(performance.now() - startTime);
                return cachedItem.result;
            }

            // 缓存未命中，执行计算
            this.stats.validationCacheMisses++;

            // 检查依赖失效
            if (this.isDependencyInvalidated(canonicalKey)) {
                this.invalidateDependentCache(canonicalKey);
            }

            // 执行计算函数
            const result = computeFunction();

            // 缓存结果
            if (this.validationCacheMap.size >= this.options.maxValidationCacheSize) {
                this.evictValidationCache();
            }

            const cacheItem = new ValidationCacheItem(result, this.extractDependencies(validationParams));
            this.validationCacheMap.set(canonicalKey, cacheItem);
            this.updateDependencyGraph(canonicalKey, cacheItem.dependencies);

            this.recordQueryTime(performance.now() - startTime);
            return result;

        } catch (error) {
            console.error('验证缓存错误:', error);
            this.stats.validationCacheMisses++;
            throw error;
        }
    }

    /**
     * 批量验证缓存 - 优化大数据场景
     * @param {Array} validationRequests - 验证请求数组
     * @param {Function} batchComputeFunction - 批量计算函数
     * @returns {Array} 验证结果数组
     */
    batchValidationCache(validationRequests, batchComputeFunction) {
        const startTime = performance.now();
        const results = [];
        const uncachedRequests = [];
        const cacheMappings = [];

        // 第一轮：检查缓存
        validationRequests.forEach((request, index) => {
            const canonicalKey = this.canonicalizeValidationKey(request.key, request.params);
            const cachedItem = this.validationCacheMap.get(canonicalKey);

            if (cachedItem && !cachedItem.isExpired(this.options.maxCacheAge)) {
                results[index] = cachedItem.result;
                this.stats.validationCacheHits++;
                cachedItem.updateAccess();
            } else {
                uncachedRequests.push({ ...request, canonicalKey, originalIndex: index });
                this.stats.validationCacheMisses++;
            }
        });

        // 第二轮：批量计算未缓存的项
        if (uncachedRequests.length > 0) {
            const batchResults = batchComputeFunction(uncachedRequests.map(r => r.params));

            // 批量缓存新结果
            uncachedRequests.forEach((request, index) => {
                const result = batchResults[index];
                results[request.originalIndex] = result;

                // 缓存结果
                if (this.validationCacheMap.size >= this.options.maxValidationCacheSize) {
                    this.evictValidationCache();
                }

                const cacheItem = new ValidationCacheItem(result, this.extractDependencies(request.params));
                this.validationCacheMap.set(request.canonicalKey, cacheItem);
                this.updateDependencyGraph(request.canonicalKey, cacheItem.dependencies);
            });
        }

        this.recordQueryTime(performance.now() - startTime);
        return results;
    }

    /**
     * 游戏状态缓存 - 避免重复状态计算
     * @param {string} stateKey - 状态键
     * @param {Function} computeFunction - 计算函数
     * @returns {any} 游戏状态
     */
    gameStateCache(stateKey, computeFunction) {
        const startTime = performance.now();
        this.stats.totalQueries++;

        const cached = this.gameStateCache.get(stateKey);
        if (cached && !cached.isExpired(this.options.maxCacheAge)) {
            this.stats.gameStateHits++;
            cached.updateAccess();
            this.recordQueryTime(performance.now() - startTime);
            return cached.result;
        }

        this.stats.gameStateMisses++;
        const result = computeFunction();

        if (this.gameStateCache.size >= this.options.maxPositionCacheSize) {
            this.evictGameStateCache();
        }

        const cacheItem = new ValidationCacheItem(result);
        this.gameStateCache.set(stateKey, cacheItem);

        this.recordQueryTime(performance.now() - startTime);
        return result;
    }

    /**
     * 位置缓存
     * @param {Position} position
     * @param {ChessPiece|null} result
     * @returns {ChessPiece|null}
     */
    positionCache(position, result) {
        const key = `${position.row},${position.col}`;
        this.stats.totalQueries++;

        if (result !== undefined) {
            // 设置缓存
            if (this.positionCacheMap.size >= this.options.maxPositionCacheSize) {
                this.evictPositionCache();
            }
            this.positionCacheMap.set(key, result);
            return result;
        } else {
            // 获取缓存
            const cached = this.positionCacheMap.get(key);
            if (cached !== undefined) {
                this.stats.positionCacheHits++;
                return cached;
            } else {
                this.stats.positionCacheMisses++;
                return null;
            }
        }
    }
    /**
     * 移动验证结果缓存
     * @param {string} key
     * @param {boolean} result
     * @returns {boolean|undefined}
     */
    moveCache(key, result) {
        this.stats.totalQueries++;

        if (result !== undefined) {
            // 设置缓存
            if (this.moveCacheMap.size >= this.options.maxMoveCacheSize) {
                this.evictMoveCache();
            }
            this.moveCacheMap.set(key, result);
            return result;
        } else {
            // 获取缓存
            const cached = this.moveCacheMap.get(key);
            if (cached !== undefined) {
                this.stats.moveCacheHits++;
                return cached;
            } else {
                this.stats.moveCacheMisses++;
                return undefined;
            }
        }
    }

    /**
     * 规范化验证键
     * @param {string} validationKey - 原始验证键
     * @param {Object} validationParams - 验证参数
     * @returns {string} 规范化的键
     * @private
     */
    canonicalizeValidationKey(validationKey, validationParams) {
        const serializedParams = JSON.stringify(validationParams, (key, value) => {
            // 对特殊对象进行规范化处理
            if (value && typeof value === 'object') {
                if (value.row !== undefined && value.col !== undefined) {
                    // 位置对象
                    return `pos:${value.row},${value.col}`;
                }
                if (Array.isArray(value)) {
                    // 数组排序以避免顺序问题
                    return value.slice().sort();
                }
            }
            return value;
        });
        return `${validationKey}:${this.hashString(serializedParams)}`;
    }

    /**
     * 简单字符串哈希
     * @param {string} str - 要哈希的字符串
     * @returns {string} 哈希值
     * @private
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * 提取验证参数的依赖项
     * @param {Object} validationParams - 验证参数
     * @returns {Array} 依赖项数组
     * @private
     */
    extractDependencies(validationParams) {
        const dependencies = [];

        if (validationParams.position) {
            dependencies.push(`position:${validationParams.position.row},${validationParams.position.col}`);
        }

        if (validationParams.gameState) {
            dependencies.push(`gameState:${this.hashObject(validationParams.gameState)}`);
        }

        if (validationParams.moveSequence) {
            dependencies.push(`moveSequence:${validationParams.moveSequence.length}`);
        }

        return dependencies;
    }

    /**
     * 简单对象哈希
     * @param {Object} obj - 要哈希的对象
     * @returns {string} 哈希值
     * @private
     */
    hashObject(obj) {
        return this.hashString(JSON.stringify(obj, Object.keys(obj).sort()));
    }

    /**
     * 更新依赖图
     * @param {string} cacheKey - 缓存键
     * @param {Array} dependencies - 依赖项
     * @private
     */
    updateDependencyGraph(cacheKey, dependencies) {
        this.dependencyGraph.set(cacheKey, dependencies);

        dependencies.forEach(dep => {
            if (!this.reverseDependencyGraph.has(dep)) {
                this.reverseDependencyGraph.set(dep, []);
            }
            this.reverseDependencyGraph.get(dep).push(cacheKey);
        });
    }

    /**
     * 检查依赖是否失效
     * @param {string} cacheKey - 缓存键
     * @returns {boolean} 是否失效
     * @private
     */
    isDependencyInvalidated(cacheKey) {
        const dependencies = this.dependencyGraph.get(cacheKey);
        if (!dependencies) return false;

        return dependencies.some(dep => !this.isDependencyValid(dep));
    }

    /**
     * 检查单个依赖是否有效
     * @param {string} dependency - 依赖项
     * @returns {boolean} 是否有效
     * @private
     */
    isDependencyValid(dependency) {
        // 简化实现，实际应该根据依赖类型检查
        return true;
    }

    /**
     * 失效依赖缓存
     * @param {string} cacheKey - 缓存键
     * @private
     */
    invalidateDependentCache(cacheKey) {
        const dependencies = this.dependencyGraph.get(cacheKey);
        if (!dependencies) return;

        dependencies.forEach(dep => {
            const dependentKeys = this.reverseDependencyGraph.get(dep) || [];
            dependentKeys.forEach(key => {
                if (this.validationCacheMap.has(key)) {
                    this.validationCacheMap.delete(key);
                    this.stats.dependencyInvalidations++;
                }
            });
        });
    }

    /**
     * 缓存淘汰策略
     * @private
     */
    evictValidationCache() {
        switch (this.options.cacheEvictionPolicy) {
            case 'lru':
                this.evictLRU(this.validationCacheMap);
                break;
            case 'lfu':
                this.evictLFU(this.validationCacheMap);
                break;
            case 'ttl':
                this.evictTTL(this.validationCacheMap);
                break;
            default:
                this.evictLRU(this.validationCacheMap);
        }
        this.stats.cacheEvictions++;
    }

    /**
     * LRU淘汰算法
     * @param {Map} cacheMap - 缓存映射
     * @private
     */
    evictLRU(cacheMap) {
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, item] of cacheMap) {
            if (item.lastAccessed < oldestTime) {
                oldestTime = item.lastAccessed;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            cacheMap.delete(oldestKey);
            this.cleanupDependencies(oldestKey);
        }
    }

    /**
     * LFU淘汰算法
     * @param {Map} cacheMap - 缓存映射
     * @private
     */
    evictLFU(cacheMap) {
        let leastUsedKey = null;
        let leastUsedCount = Infinity;

        for (const [key, item] of cacheMap) {
            if (item.accessCount < leastUsedCount) {
                leastUsedCount = item.accessCount;
                leastUsedKey = key;
            }
        }

        if (leastUsedKey) {
            cacheMap.delete(leastUsedKey);
            this.cleanupDependencies(leastUsedKey);
        }
    }

    /**
     * TTL淘汰算法
     * @param {Map} cacheMap - 缓存映射
     * @private
     */
    evictTTL(cacheMap) {
        const now = Date.now();
        for (const [key, item] of cacheMap) {
            if (item.isExpired(this.options.maxCacheAge)) {
                cacheMap.delete(key);
                this.cleanupDependencies(key);
            }
        }
    }

    /**
     * 清理依赖关系
     * @param {string} cacheKey - 缓存键
     * @private
     */
    cleanupDependencies(cacheKey) {
        const dependencies = this.dependencyGraph.get(cacheKey);
        if (dependencies) {
            dependencies.forEach(dep => {
                const dependentKeys = this.reverseDependencyGraph.get(dep) || [];
                const index = dependentKeys.indexOf(cacheKey);
                if (index > -1) {
                    dependentKeys.splice(index, 1);
                }
            });
        }
        this.dependencyGraph.delete(cacheKey);
    }

    /**
     * 位置缓存淘汰
     * @private
     */
    evictPositionCache() {
        const keysToDelete = Array.from(this.positionCacheMap.keys()).slice(0, Math.floor(this.options.maxPositionCacheSize * 0.2));
        keysToDelete.forEach(key => this.positionCacheMap.delete(key));
        this.stats.cacheEvictions++;
    }

    /**
     * 移动缓存淘汰
     * @private
     */
    evictMoveCache() {
        const keysToDelete = Array.from(this.moveCacheMap.keys()).slice(0, Math.floor(this.options.maxMoveCacheSize * 0.2));
        keysToDelete.forEach(key => this.moveCacheMap.delete(key));
        this.stats.cacheEvictions++;
    }

    /**
     * 游戏状态缓存淘汰
     * @private
     */
    evictGameStateCache() {
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, item] of this.gameStateCache) {
            if (item.lastAccessed < oldestTime) {
                oldestTime = item.lastAccessed;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.gameStateCache.delete(oldestKey);
        }
        this.stats.cacheEvictions++;
    }
    /**
     * 记录查询时间
     * @param {number} queryTime - 查询时间
     * @private
     */
    recordQueryTime(queryTime) {
        this.queryTimes.push(queryTime);

        // 只保留最近1000次查询的时间
        if (this.queryTimes.length > 1000) {
            this.queryTimes = this.queryTimes.slice(-1000);
        }

        // 更新平均查询时间
        this.stats.averageQueryTime = this.queryTimes.reduce((sum, time) => sum + time, 0) / this.queryTimes.length;

        // 更新缓存命中率
        this.updateCacheHitRatios();
    }

    /**
     * 更新缓存命中率
     * @private
     */
    updateCacheHitRatios() {
        const validationHits = this.stats.validationCacheHits;
        const validationMisses = this.stats.validationCacheMisses;
        this.stats.cacheHitRatios.validation = validationHits + validationMisses > 0 ?
            ((validationHits / (validationHits + validationMisses)) * 100).toFixed(2) + '%' : '0%';

        const positionHits = this.stats.positionCacheHits;
        const positionMisses = this.stats.positionCacheMisses;
        this.stats.cacheHitRatios.position = positionHits + positionMisses > 0 ?
            ((positionHits / (positionHits + positionMisses)) * 100).toFixed(2) + '%' : '0%';

        const moveHits = this.stats.moveCacheHits;
        const moveMisses = this.stats.moveCacheMisses;
        this.stats.cacheHitRatios.move = moveHits + moveMisses > 0 ?
            ((moveHits / (moveHits + moveMisses)) * 100).toFixed(2) + '%' : '0%';

        const gameStateHits = this.stats.gameStateHits;
        const gameStateMisses = this.stats.gameStateMisses;
        this.stats.cacheHitRatios.gameState = gameStateHits + gameStateMisses > 0 ?
            ((gameStateHits / (gameStateHits + gameStateMisses)) * 100).toFixed(2) + '%' : '0%';
    }

    /**
     * 启动性能监控
     * @private
     */
    startPerformanceMonitoring() {
        this.monitoringInterval = window.setInterval(() => {
            this.performPerformanceCheck();
        }, 30000); // 每30秒检查一次

        // 监控内存使用
        if (performance.memory) {
            this.performanceTimer = window.setInterval(() => {
                this.monitorMemoryUsage();
            }, 10000); // 每10秒检查一次
        }
    }

    /**
     * 执行性能检查
     * @private
     */
    performPerformanceCheck() {
        // 检查缓存大小是否超出限制
        if (this.validationCacheMap.size > this.options.maxValidationCacheSize * 0.9) {
            console.warn('验证缓存接近容量上限，触发清理');
            this.evictValidationCache();
        }

        // 检查性能指标
        if (this.stats.averageQueryTime > 50) { // 50ms阈值
            console.warn('平均查询时间过高:', this.stats.averageQueryTime.toFixed(2) + 'ms');
        }

        // 检查内存使用并触发清理
        const now = Date.now();
        if (now - this.lastMemoryCleanup > 60000) { // 1分钟清理一次
            this.performMemoryCleanup();
            this.lastMemoryCleanup = now;
        }
    }

    /**
     * 监控内存使用
     * @private
     */
    monitorMemoryUsage() {
        if (!performance.memory) return;

        const memoryUsage = performance.memory.usedJSHeapSize;
        this.stats.peakMemoryUsage = Math.max(this.stats.peakMemoryUsage, memoryUsage);

        // 如果内存使用超过阈值，触发清理
        const memoryLimit = performance.memory.jsHeapSizeLimit * this.options.memoryThreshold;
        if (memoryUsage > memoryLimit) {
            console.warn(`内存使用过高: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB，触发清理`);
            this.performMemoryCleanup();
        }
    }

    /**
     * 执行内存清理
     * @private
     */
    performMemoryCleanup() {
        const startTime = performance.now();
        let cleanedItems = 0;

        // 清理过期的缓存项
        cleanedItems += this.cleanupExpiredCache(this.validationCacheMap);
        cleanedItems += this.cleanupExpiredCache(this.gameStateCache);

        // 如果仍然紧张，进行更深度的清理
        if (this.getTotalCacheSize() > this.options.maxValidationCacheSize * 0.8) {
            this.performDeepCleanup();
        }

        this.stats.memoryCleanups++;
        const duration = performance.now() - startTime;
        console.log(`内存清理完成，清理 ${cleanedItems} 项，耗时: ${duration.toFixed(2)}ms`);
    }

    /**
     * 清理过期缓存
     * @param {Map} cacheMap - 缓存映射
     * @returns {number} 清理的项目数
     * @private
     */
    cleanupExpiredCache(cacheMap) {
        let cleanedCount = 0;
        const now = Date.now();

        for (const [key, item] of cacheMap) {
            if (item.isExpired(this.options.maxCacheAge)) {
                cacheMap.delete(key);
                this.cleanupDependencies(key);
                cleanedCount++;
            }
        }

        return cleanedCount;
    }

    /**
     * 执行深度清理
     * @private
     */
    performDeepCleanup() {
        // 将所有缓存大小减少到50%
        const targetSize = Math.floor(this.options.maxValidationCacheSize * 0.5);

        while (this.validationCacheMap.size > targetSize) {
            this.evictValidationCache();
        }

        while (this.gameStateCache.size > Math.floor(this.options.maxPositionCacheSize * 0.5)) {
            this.evictGameStateCache();
        }
    }

    /**
     * 获取总缓存大小
     * @returns {number} 总大小
     * @private
     */
    getTotalCacheSize() {
        return this.validationCacheMap.size +
               this.gameStateCache.size +
               this.positionCacheMap.size +
               this.moveCacheMap.size;
    }

    /**
     * 清除所有缓存
     */
    clear() {
        this.positionCacheMap.clear();
        this.moveCacheMap.clear();
        this.validationCacheMap.clear();
        this.gameStateCache.clear();
        this.canonicalPositionCache.clear();
        this.dependencyGraph.clear();
        this.reverseDependencyGraph.clear();
        this.queryTimes = [];

        // 重置统计信息
        Object.keys(this.stats).forEach(key => {
            if (typeof this.stats[key] === 'number') {
                this.stats[key] = 0;
            } else if (typeof this.stats[key] === 'string' && this.stats[key].includes('%')) {
                this.stats[key] = '0%';
            }
        });
    }

    /**
     * 强制执行内存清理
     */
    forceMemoryCleanup() {
        this.performMemoryCleanup();
    }

    /**
     * 获取详细性能统计
     * @returns {Object} 性能统计
     */
    getPerformanceStats() {
        return {
            ...this.stats,
            cacheSizes: {
                validation: this.validationCacheMap.size,
                gameState: this.gameStateCache.size,
                position: this.positionCacheMap.size,
                move: this.moveCacheMap.size,
                canonical: this.canonicalPositionCache.size,
                total: this.getTotalCacheSize()
            },
            memoryUsage: performance.memory ? {
                used: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
                total: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
                limit: (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + 'MB',
                peak: (this.stats.peakMemoryUsage / 1024 / 1024).toFixed(2) + 'MB'
            } : null,
            efficiency: {
                hitRatio: this.calculateOverallHitRatio(),
                memoryEfficiency: this.calculateMemoryEfficiency(),
                queryEfficiency: this.calculateQueryEfficiency()
            }
        };
    }

    /**
     * 计算总体命中率
     * @returns {number} 命中率百分比
     * @private
     */
    calculateOverallHitRatio() {
        const totalHits = this.stats.validationCacheHits +
                         this.stats.positionCacheHits +
                         this.stats.moveCacheHits +
                         this.stats.gameStateHits;
        const totalQueries = totalHits +
                           this.stats.validationCacheMisses +
                           this.stats.positionCacheMisses +
                           this.stats.moveCacheMisses +
                           this.stats.gameStateMisses;

        return totalQueries > 0 ? (totalHits / totalQueries * 100) : 0;
    }

    /**
     * 计算内存效率
     * @returns {number} 内存效率 (0-100)
     * @private
     */
    calculateMemoryEfficiency() {
        const totalCache = this.getTotalCacheSize();
        const maxCache = this.options.maxValidationCacheSize +
                        this.options.maxPositionCacheSize +
                        this.options.maxMoveCacheSize;

        if (maxCache === 0) return 100;
        return Math.max(0, 100 - (totalCache / maxCache * 100));
    }

    /**
     * 计算查询效率
     * @returns {number} 查询效率分数
     * @private
     */
    calculateQueryEfficiency() {
        // 基于平均查询时间和命中率的综合评分
        const timeScore = Math.max(0, 100 - this.stats.averageQueryTime); // 100ms为满分
        const hitScore = this.calculateOverallHitRatio();
        return (timeScore * 0.6 + hitScore * 0.4);
    }

    /**
     * 获取性能报告
     * @returns {Object} 性能报告
     */
    getPerformanceReport() {
        const stats = this.getPerformanceStats();

        return {
            timestamp: new Date().toISOString(),
            summary: {
                overallHealth: this.calculateOverallHealth(),
                performanceScore: this.calculatePerformanceScore(),
                recommendations: this.generateRecommendations(stats)
            },
            detailed: stats,
            alerts: this.generateAlerts(stats)
        };
    }

    /**
     * 计算整体健康评分
     * @returns {number} 健康评分 (0-100)
     * @private
     */
    calculateOverallHealth() {
        const hitRatio = this.calculateOverallHitRatio();
        const memoryEfficiency = this.calculateMemoryEfficiency();
        const queryEfficiency = this.calculateQueryEfficiency();

        return Math.round((hitRatio * 0.4 + memoryEfficiency * 0.3 + queryEfficiency * 0.3));
    }

    /**
     * 计算性能评分
     * @returns {number} 性能评分 (0-100)
     * @private
     */
    calculatePerformanceScore() {
        const healthScore = this.calculateOverallHealth();
        const penaltyCount = this.stats.cacheEvictions + this.stats.dependencyInvalidations;
        const penaltyScore = Math.max(0, 100 - penaltyCount * 0.1);

        return Math.round(healthScore * 0.8 + penaltyScore * 0.2);
    }

    /**
     * 生成优化建议
     * @param {Object} stats - 性能统计
     * @returns {Array} 建议列表
     * @private
     */
    generateRecommendations(stats) {
        const recommendations = [];

        if (parseFloat(stats.efficiency.hitRatio) < 70) {
            recommendations.push('缓存命中率较低，建议增加缓存大小或优化缓存策略');
        }

        if (stats.efficiency.memoryEfficiency < 60) {
            recommendations.push('内存使用效率偏低，建议调整缓存容量或清理策略');
        }

        if (stats.averageQueryTime > 50) {
            recommendations.push('平均查询时间过长，建议优化算法或增加缓存层');
        }

        if (stats.cacheEvictions > 100) {
            recommendations.push('缓存淘汰频繁，建议增加最大缓存容量');
        }

        return recommendations;
    }

    /**
     * 生成警告信息
     * @param {Object} stats - 性能统计
     * @returns {Array} 警告列表
     * @private
     */
    generateAlerts(stats) {
        const alerts = [];

        if (stats.memoryUsage && parseFloat(stats.memoryUsage.used) > 400) {
            alerts.push({
                level: 'warning',
                message: `内存使用过高: ${stats.memoryUsage.used}`,
                suggestion: '考虑清理缓存或增加内存限制'
            });
        }

        if (stats.averageQueryTime > 100) {
            alerts.push({
                level: 'critical',
                message: `查询响应时间过长: ${stats.averageQueryTime.toFixed(2)}ms`,
                suggestion: '立即检查算法效率'
            });
        }

        return alerts;
    }

    /**
     * 获取简单缓存统计信息（向后兼容）
     * @returns {object} 缓存统计数据
     */
    getStats() {
        return {
            positionCacheSize: this.positionCacheMap.size,
            moveCacheSize: this.moveCacheMap.size
        };
    }

    /**
     * 停止性能监控
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        if (this.performanceTimer) {
            clearInterval(this.performanceTimer);
            this.performanceTimer = null;
        }
    }

    /**
     * 资源清理
     */
    cleanup() {
        this.stopMonitoring();
        this.clear();
        console.log('性能缓存系统已完全清理');
    }
}
exports.PerformanceCache = PerformanceCache;
//# sourceMappingURL=performance-cache.js.map