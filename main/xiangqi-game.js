"use strict";
/**
 * XiangqiGame - 中国象棋主控制器（重构版）
 *
 * 整合所有功能模块，提供统一的对外接口
 * 从原来的3548行chess.js重构而来，模块化架构
 *
 * @fileoverview 中国象棋主控制器
 * @version 2.1.0
 * @author Claude Code Review System
 * @since 2024-10-11
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.XiangqiGame = void 0;
const chess_engine_js_1 = require("./chess-engine.js");
const chess_validator_js_1 = require("./chess-validator.js");
const error_recovery_js_1 = require("./error-recovery.js");
const chess_ui_js_1 = require("./chess-ui.js");
const chess_notation_parser_js_1 = require("./chess-notation-parser.js");
const audio_manager_js_1 = require("./audio-manager.js");
const performance_cache_js_1 = require("./performance-cache.js");
const security_js_1 = require("./security.js");
/**
 * 中国象棋主控制器
 * 整合引擎、验证器、UI、音频等功能模块
 */
class XiangqiGame {
    constructor() {
        // 游戏状态
        this.isReplaying = false;
        this.replayTimer = null;
        this.replayIndex = 0;
        this.replayMoves = [];

        // 数据加载状态
        this.gamesData = [];
        this.currentGameIndex = 0;

        // 内存管理：事件监听器追踪
        this.eventListeners = new Set(); // 存储所有事件监听器引用
        this.activeTimers = new Set(); // 存储所有定时器ID
        this.activeCleanupCallbacks = new Set(); // 存储清理回调

        // 性能监控
        this.performanceMetrics = {
            startTime: Date.now(),
            memoryUsage: 0,
            activeTimersCount: 0,
            eventListenersCount: 0
        };

        // 内存清理标志
        this.isDestroyed = false;
        // 性能优化：缓存系统
        this.cache = new performance_cache_js_1.PerformanceCache();
        // 安全防护系统
        this.security = new security_js_1.SecurityManager();
        // 核心模块初始化
        this.engine = new chess_engine_js_1.ChessEngine({ cache: this.cache });
        this.validator = new chess_validator_js_1.ChessValidator({ cache: this.cache });
        this.errorRecovery = new error_recovery_js_1.ErrorRecovery();
        this.notationParser = new chess_notation_parser_js_1.ChessNotationParser();
        this.audioManager = new audio_manager_js_1.AudioManager();
        // UI控制器（最后初始化，依赖其他模块）
        this.ui = new chess_ui_js_1.ChessUI(this.engine, this.audioManager, {
            cache: this.cache,
            security: this.security
        });
        // 初始化
        this.initialize();
    }
    /**
     * 初始化游戏
     * @private
     */
    async initialize() {
        try {
            // 加载棋谱数据
            await this.loadGamesData();
            // 初始化UI
            this.ui.renderBoard();
            // 设置全局访问
            window.xiangqiGame = this;
            console.log('中国象棋游戏初始化完成');
        }
        catch (error) {
            console.error('游戏初始化失败:', error);
        }
    }
    /**
     * 加载棋谱数据（仅使用爬取的分类数据）
     * @private
     */
    async loadGamesData() {
        try {
            // 只加载分类棋谱数据
            const response = await fetch('./main/data/classified-games.json');
            if (response.ok) {
                const data = await response.json();
                this.gamesData = data.games || data || [];
                console.log(`已加载 ${this.gamesData.length} 个分类棋谱记录`);
                return;
            }
        }
        catch (error) {
            console.error('加载分类棋谱数据失败:', error);
        }
        // 如果无法加载分类数据，设置为空数组
        this.gamesData = [];
        console.warn('未找到分类棋谱数据，请确保爬虫已生成数据文件');
    }
    /**
     * 加载并播放随机分类棋局
     */
    async loadRandomGame() {
        if (this.gamesData.length === 0) {
            console.warn('没有可用的棋谱数据');
            return;
        }
        try {
            // 停止当前回放
            if (this.isReplaying) {
                this.stopReplay();
            }
            // 选择随机棋局
            this.currentGameIndex = Math.floor(Math.random() * this.gamesData.length);
            const gameData = this.gamesData[this.currentGameIndex];
            // 验证并处理棋谱数据
            const validationResult = this.validateGameData(gameData);
            if (!validationResult.valid) {
                console.warn('棋谱数据验证失败:', validationResult.errors);
                if (this.getErrorSeverity(validationResult.errors) === 'critical') {
                    return;
                }
            }
            // 加载有效移动
            this.replayMoves = validationResult.normalizedMoves || [];
            this.replayIndex = 0;
            // 切换到记谱演示模式
            this.ui.setGameMode('notation');
            // 开始自动回放
            this.startAutoReplay();
        }
        catch (error) {
            console.error('加载随机棋局失败:', error);
        }
    }
    /**
     * 验证棋谱数据
     * @param gameData - 棋谱数据
     * @returns 验证结果
     * @private
     */
    validateGameData(gameData) {
        try {
            // 提取移动数据
            const moves = this.extractMovesFromGameData(gameData);
            // 使用验证器验证
            return this.validator.validateMoveSequence(moves);
        }
        catch (error) {
            const err = error;
            return {
                valid: false,
                totalMoves: 0,
                validMoves: 0,
                errorMoves: 1,
                errors: [{
                        code: 'VALIDATION_EXCEPTION',
                        message: `数据验证异常: ${err.message}`,
                        moveIndex: -1,
                        layer: 'critical',
                        severity: 'critical'
                    }],
                warnings: []
            };
        }
    }
    /**
     * 从棋谱数据提取移动数组
     * @param gameData - 棋谱数据
     * @returns 移动数组
     * @private
     */
    extractMovesFromGameData(gameData) {
        if (!gameData || typeof gameData !== 'object') {
            return [];
        }
        const dataObj = gameData;
        // 处理 different 数据格式
        if (Array.isArray(gameData)) {
            return gameData;
        }
        // 处理 gameData.moves 格式
        if (Array.isArray(dataObj.moves)) {
            return dataObj.moves;
        }
        // 处理会移动记录等其他格式
        if (dataObj.notations || dataObj.moves_text) {
            const notationText = (dataObj.notations || dataObj.moves_text || '');
            return this.notationParser.parseGame(notationText).moves;
        }
        // 处理单个移动
        if (dataObj.pieceType && dataObj.toPos) {
            return [dataObj];
        }
        return [];
    }
    /**
     * 开始自动回放
     * @private
     */
    startAutoReplay() {
        if (this.replayMoves.length === 0) {
            console.log('没有可回放的移动');
            return;
        }
        this.isReplaying = true;
        this.replayIndex = 0;
        // 重置棋盘
        this.engine.reset();
        this.ui.renderBoard();
        // 开始定时回放
        this.scheduleNextMove();
    }
    /**
     * 安排下一步移动 - 内存安全版本
     * @private
     */
    scheduleNextMove() {
        if (!this.isReplaying || this.replayIndex >= this.replayMoves.length || this.isDestroyed) {
            this.completeReplay();
            return;
        }

        // 清理现有定时器
        this.clearReplayTimer();

        // 创建新定时器并追踪
        this.replayTimer = window.setTimeout(() => {
            this.activeTimers.delete(this.replayTimer);
            this.replayTimer = null;
            this.playNextMove();
        }, 1000); // 1秒间隔

        // 添加到活动定时器集合
        if (this.replayTimer) {
            this.activeTimers.add(this.replayTimer);
            this.updatePerformanceMetrics();
        }
    }
    /**
     * 播放下一步移动
     * @private
     */
    async playNextMove() {
        if (!this.isReplaying || this.replayIndex >= this.replayMoves.length) {
            return;
        }
        try {
            const move = this.replayMoves[this.replayIndex];
            // 查找要移动的棋子
            const piece = this.findPieceForMove(move);
            if (!piece) {
                console.warn(`找不到第${this.replayIndex + 1}步的棋子`, move);
                this.replayIndex++;
                this.scheduleNextMove();
                return;
            }
            // 执行移动
            const success = this.engine.movePiece(piece, move.toPos);
            if (success) {
                this.ui.renderBoard();
                this.ui.afterMove(this.engine.getGameState());
            }
            else {
                console.warn(`第${this.replayIndex + 1}步移动失败`, move);
            }
            this.replayIndex++;
            this.scheduleNextMove();
        }
        catch (error) {
            console.error(`播放第${this.replayIndex + 1}步时出错:`, error);
            this.replayIndex++;
            this.scheduleNextMove();
        }
    }
    /**
     * 根据移动数据查找棋子
     * @param move - 移动数据
     * @returns 找到的棋子
     * @private
     */
    findPieceForMove(move) {
        // 优先通过位置查找
        if (move.fromPos) {
            const piece = this.engine.getPieceAtByColor(move.fromPos, move.color);
            if (piece)
                return piece;
        }
        // 通过棋子类型和颜色查找
        const pieces = this.engine.getPiecesByColor(move.color).filter(p => p.type === move.pieceType);
        if (pieces.length === 1) {
            return pieces[0];
        }
        // 如果找到多个，选择位置最合理的
        // 这里可以添加更复杂的选择逻辑
        return pieces[0] || null;
    }
    /**
     * 完成回放 - 内存安全版本
     * @private
     */
    completeReplay() {
        this.isReplaying = false;
        this.clearReplayTimer();
        console.log('棋谱回放完成');
    }

    /**
     * 停止回放 - 内存安全版本
     */
    stopReplay() {
        if (this.isReplaying) {
            this.isReplaying = false;
            this.clearReplayTimer();
            console.log('停止自动回放');
        }
    }

    /**
     * 清理回放定时器
     * @private
     */
    clearReplayTimer() {
        if (this.replayTimer !== null) {
            clearTimeout(this.replayTimer);
            this.activeTimers.delete(this.replayTimer);
            this.replayTimer = null;
            this.updatePerformanceMetrics();
        }
    }

    /**
     * 安全的事件监听器添加
     * @param {Element} element - 目标元素
     * @param {string} event - 事件类型
     * @param {Function} handler - 事件处理函数
     * @param {Object} options - 事件选项
     * @returns {Function} 移除监听器的函数
     */
    addSafeEventListener(element, event, handler, options = {}) {
        if (this.isDestroyed) {
            console.warn('尝试在已销毁的游戏实例上添加事件监听器');
            return () => {};
        }

        const wrappedHandler = (eventObject) => {
            try {
                if (!this.isDestroyed) {
                    handler.call(this, eventObject);
                }
            } catch (error) {
                console.error(`事件处理错误 (${event} on ${element.tagName}):`, error);
            }
        };

        element.addEventListener(event, wrappedHandler, options);

        // 存储监听器信息以便清理
        const listenerInfo = {
            element,
            event,
            handler: wrappedHandler,
            originalHandler: handler,
            options
        };

        this.eventListeners.add(listenerInfo);
        this.updatePerformanceMetrics();

        // 返回清理函数
        return () => {
            this.removeEventListener(listenerInfo);
        };
    }

    /**
     * 移除事件监听器
     * @param {Object} listenerInfo - 监听器信息
     * @private
     */
    removeEventListener(listenerInfo) {
        if (!listenerInfo || this.isDestroyed) {
            return;
        }

        const { element, event, handler, options } = listenerInfo;
        element.removeEventListener(event, handler, options);
        this.eventListeners.delete(listenerInfo);
        this.updatePerformanceMetrics();
    }

    /**
     * 安全的定时器创建
     * @param {Function} callback - 回调函数
     * @param {number} delay - 延迟时间
     * @param {...any} args - 回调参数
     * @returns {number} 定时器ID
     */
    safeSetTimeout(callback, delay, ...args) {
        if (this.isDestroyed) {
            console.warn('尝试在已销毁的游戏实例上创建定时器');
            return null;
        }

        const wrappedCallback = () => {
            this.activeTimers.delete(timerId);
            this.updatePerformanceMetrics();

            if (!this.isDestroyed) {
                try {
                    callback.apply(this, args);
                } catch (error) {
                    console.error('定时器回调执行错误:', error);
                }
            }
        };

        const timerId = window.setTimeout(wrappedCallback, delay);

        if (timerId) {
            this.activeTimers.add(timerId);
            this.updatePerformanceMetrics();
        }

        return timerId;
    }

    /**
     * 安全的间隔定时器创建
     * @param {Function} callback - 回调函数
     * @param {number} interval - 间隔时间
     * @param {...any} args - 回调参数
     * @returns {number} 定时器ID
     */
    safeSetInterval(callback, interval, ...args) {
        if (this.isDestroyed) {
            console.warn('尝试在已销毁的游戏实例上创建间隔定时器');
            return null;
        }

        const wrappedCallback = () => {
            if (!this.isDestroyed) {
                try {
                    callback.apply(this, args);
                } catch (error) {
                    console.error('间隔定时器回调执行错误:', error);
                }
            }
        };

        const timerId = window.setInterval(wrappedCallback, interval);

        if (timerId) {
            this.activeTimers.add(timerId);
            this.updatePerformanceMetrics();
        }

        return timerId;
    }

    /**
     * 清理定时器
     * @param {number} timerId - 定时器ID
     */
    clearTimer(timerId) {
        if (timerId) {
            clearTimeout(timerId);
            clearInterval(timerId);
            this.activeTimers.delete(timerId);
            this.updatePerformanceMetrics();
        }
    }

    /**
     * 更新性能指标
     * @private
     */
    updatePerformanceMetrics() {
        this.performanceMetrics.activeTimersCount = this.activeTimers.size;
        this.performanceMetrics.eventListenersCount = this.eventListeners.size;

        if (performance && performance.memory) {
            this.performanceMetrics.memoryUsage = performance.memory.usedJSHeapSize;
        }
    }

    /**
     * 获取内存使用统计
     * @returns {Object} 内存统计信息
     */
    getMemoryStats() {
        this.updatePerformanceMetrics();

        const cacheStats = this.cache ? this.cache.getPerformanceStats() : null;
        const uiStats = this.ui ? this.ui.getPerformanceStats() : null;

        return {
            timestamp: new Date().toISOString(),
            uptime: Date.now() - this.performanceMetrics.startTime,
            memory: {
                used: this.performanceMetrics.memoryUsage,
                limit: (performance && performance.memory) ? performance.memory.jsHeapSizeLimit : null,
                usageMB: (this.performanceMetrics.memoryUsage / 1024 / 1024).toFixed(2)
            },
            activeResources: {
                timers: this.performanceMetrics.activeTimersCount,
                eventListeners: this.performanceMetrics.eventListenersCount,
                cleanupCallbacks: this.activeCleanupCallbacks.size
            },
            cache: cacheStats,
            ui: uiStats,
            gameState: {
                isReplaying: this.isReplaying,
                replayMovesCount: this.replayMoves.length,
                gamesDataCount: this.gamesData.length
            }
        };
    }

    /**
     * 执行内存清理
     */
    performMemoryCleanup() {
        if (this.isDestroyed) {
            return;
        }

        const startTime = performance.now();
        let cleanedItems = 0;

        // 清理已完成的定时器
        this.activeTimers.forEach(timerId => {
            this.clearTimer(timerId);
            cleanedItems++;
        });

        // 清理无效的事件监听器
        const validListeners = new Set();
        this.eventListeners.forEach(listenerInfo => {
            try {
                const { element } = listenerInfo;
                if (element && document.contains(element)) {
                    validListeners.add(listenerInfo);
                } else {
                    this.removeEventListener(listenerInfo);
                    cleanedItems++;
                }
            } catch (error) {
                // 元素已经无效，移除监听器
                this.removeEventListener(listenerInfo);
                cleanedItems++;
            }
        });
        this.eventListeners = validListeners;

        // 清理模块缓存
        if (this.cache) {
            this.cache.forceMemoryCleanup();
            cleanedItems++;
        }

        // 执行清理回调
        this.activeCleanupCallbacks.forEach(callback => {
            try {
                callback();
                cleanedItems++;
            } catch (error) {
                console.error('清理回调执行错误:', error);
            }
        });
        this.activeCleanupCallbacks.clear();

        const duration = performance.now() - startTime;
        console.log(`内存清理完成，清理 ${cleanedItems} 项，耗时: ${duration.toFixed(2)}ms`);

        // 更新统计
        this.updatePerformanceMetrics();

        return {
            cleanedItems,
            duration,
            memoryStats: this.getMemoryStats()
        };
    }
    /**
     * 切换回放状态
     */
    toggleReplay() {
        if (this.isReplaying) {
            this.stopReplay();
        }
        else if (this.replayMoves.length > 0) {
            this.startAutoReplay();
        }
    }
    /**
     * 切换暂停状态
     */
    togglePause() {
        if (this.isReplaying) {
            this.stopReplay();
        }
        else if (this.replayMoves.length > 0 && this.replayIndex < this.replayMoves.length) {
            this.isReplaying = true;
            this.scheduleNextMove();
        }
    }
    /**
     * 解析记谱法输入
     * @param notation - 记谱法文本
     * @returns 解析是否成功
     */
    parseNotation(notation) {
        try {
            const result = this.notationParser.parseMove(notation);
            if (result.success) {
                console.log('解析成功:', result.move);
                return true;
            }
            else {
                console.warn('解析失败:', result.error);
                return false;
            }
        }
        catch (error) {
            console.error('解析记谱法时出错:', error);
            return false;
        }
    }
    /**
     * 获取错误严重程度
     * @param {ValidationError[]} errors - 错误列表
     * @returns {string} 严重程度
     * @private
     */
    getErrorSeverity(errors) {
        return this.errorRecovery.getErrorSeverity(errors);
    }
    /**
     * 获取当前游戏状态
     * @returns {GameState} 游戏状态
     */
    getGameState() {
        return this.engine.getGameState();
    }
    /**
     * 重置游戏 - 内存安全版本
     */
    reset() {
        this.stopReplay();

        // 清理当前状态
        this.replayMoves = [];
        this.replayIndex = 0;
        this.currentGameIndex = 0;

        // 重置游戏引擎
        if (this.engine) {
            this.engine.reset();
        }

        // 重置UI
        if (this.ui) {
            this.ui.renderBoard();
            this.ui.clearSelection();
            this.ui.setGameMode('game');
        }

        console.log('游戏已重置');
    }

    /**
     * 完全销毁游戏实例 - 清理所有资源
     */
    destroy() {
        if (this.isDestroyed) {
            console.warn('游戏实例已被销毁');
            return;
        }

        console.log('开始销毁游戏实例...');
        const startTime = performance.now();

        // 设置销毁标志
        this.isDestroyed = true;

        // 停止所有活动
        this.stopReplay();

        // 清理所有定时器
        this.activeTimers.forEach(timerId => {
            clearTimeout(timerId);
            clearInterval(timerId);
        });
        this.activeTimers.clear();
        this.replayTimer = null;

        // 清理所有事件监听器
        this.eventListeners.forEach(listenerInfo => {
            try {
                const { element, event, handler, options } = listenerInfo;
                element.removeEventListener(event, handler, options);
            } catch (error) {
                console.error('清理事件监听器时出错:', error);
            }
        });
        this.eventListeners.clear();

        // 执行清理回调
        this.activeCleanupCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('执行清理回调时出错:', error);
            }
        });
        this.activeCleanupCallbacks.clear();

        // 清理模块资源
        if (this.cache) {
            this.cache.cleanup();
        }

        if (this.ui) {
            if (typeof this.ui.cleanup === 'function') {
                this.ui.cleanup();
            }
        }

        if (this.engine) {
            if (typeof this.engine.cleanup === 'function') {
                this.engine.cleanup();
            }
        }

        if (this.validator) {
            if (typeof this.validator.cleanup === 'function') {
                this.validator.cleanup();
            }
        }

        if (this.audioManager) {
            if (typeof this.audioManager.cleanup === 'function') {
                this.audioManager.cleanup();
            }
        }

        // 清理数据
        this.replayMoves = [];
        this.gamesData = [];

        // 移除全局引用
        if (window.xiangqiGame === this) {
            delete window.xiangqiGame;
        }
        if (window.XiangqiGame === XiangqiGame) {
            delete window.XiangqiGame;
        }

        const duration = performance.now() - startTime;
        console.log(`游戏实例销毁完成，耗时: ${duration.toFixed(2)}ms`);
    }

    /**
     * 添加清理回调
     * @param {Function} callback - 清理回调函数
     * @returns {Function} 移除回调的函数
     */
    addCleanupCallback(callback) {
        if (this.isDestroyed) {
            return () => {};
        }

        this.activeCleanupCallbacks.add(callback);
        return () => {
            this.activeCleanupCallbacks.delete(callback);
        };
    }
    /**
     * 导出游戏状态
     * @returns {string} JSON格式的游戏状态
     */
    exportGame() {
        return this.engine.exportGame();
    }
    /**
     * 导入游戏状态
     * @param {string} gameStateJSON - JSON格式的游戏状态
     * @returns {boolean} 导入是否成功
     */
    importGame(gameStateJSON) {
        const success = this.engine.importGame(gameStateJSON);
        if (success) {
            this.ui.renderBoard();
        }
        return success;
    }
    // 公共访问器，用于调试和监控
    get ReplayMoves() {
        return [...this.replayMoves];
    }
    get ReplayIndex() {
        return this.replayIndex;
    }
    get IsReplaying() {
        return this.isReplaying;
    }
    get GamesData() {
        return [...this.gamesData];
    }
}
exports.XiangqiGame = XiangqiGame;
// 初始化游戏 - 内存安全版本
document.addEventListener('DOMContentLoaded', () => {
    // 保持向后兼容性
    if (!window.xiangqiGame && !window.XiangqiGame) {
        const game = new XiangqiGame();

        // 添加页面卸载时的清理
        const cleanupHandler = game.addSafeEventListener(
            window,
            'beforeunload',
            () => {
                console.log('页面卸载，清理游戏资源');
                game.destroy();
            }
        );

        // 添加页面隐藏时的内存清理
        game.addSafeEventListener(
            document,
            'visibilitychange',
            () => {
                if (document.hidden) {
                    // 页面隐藏时执行轻量级清理
                    game.performMemoryCleanup();
                }
            }
        );

        // 设置全局访问
        window.XiangqiGame = XiangqiGame;
        window.xiangqiGame = game;

        // 添加性能监控间隔
        game.safeSetInterval(() => {
            if (!document.hidden) {
                const memoryStats = game.getMemoryStats();

                // 内存使用预警
                if (memoryStats.memory && parseFloat(memoryStats.memory.usageMB) > 450) {
                    console.warn(`内存使用较高: ${memoryStats.memory.usageMB}MB，执行清理`);
                    game.performMemoryCleanup();
                }

                // 资源泄漏预警
                if (memoryStats.activeResources.timers > 20) {
                    console.warn(`活动定时器过多: ${memoryStats.activeResources.timers}个`);
                }

                if (memoryStats.activeResources.eventListeners > 50) {
                    console.warn(`事件监听器过多: ${memoryStats.activeResources.eventListeners}个`);
                }
            }
        }, 30000); // 每30秒检查一次
    }
});
//# sourceMappingURL=xiangqi-game.js.map