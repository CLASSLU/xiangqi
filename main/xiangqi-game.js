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

import { ChessEngine } from './chess-engine.js';
import { ChessValidator } from './chess-validator.js';
import { ErrorRecovery } from './error-recovery.js';
import { ChessUI } from './chess-ui.js';
import { ChessNotationParser } from './chess-notation-parser.js';
import { AudioManager } from './audio-manager.js';
import { PerformanceCache } from './performance-cache.js';
import { SecurityManager } from './security.js';

/**
 * @typedef {import('./types').PlayerColor} PlayerColor
 * @typedef {import('./types').ChessGameData} ChessGameData
 * @typedef {import('./types').GameState} GameState
 * @typedef {import('./types').Move} Move
 */

/**
 * 中国象棋主控制器
 * 整合引擎、验证器、UI、音频等功能模块
 */
class XiangqiGame {
    constructor() {
        // 性能优化：缓存系统
        this.cache = new PerformanceCache();

        // 安全防护系统
        this.security = new SecurityManager();

        // 核心模块初始化
        this.engine = new ChessEngine({ cache: this.cache });
        this.validator = new ChessValidator({ cache: this.cache });
        this.errorRecovery = new ErrorRecovery();
        this.notationParser = new ChessNotationParser();
        this.audioManager = new AudioManager();

        // UI控制器（最后初始化，依赖其他模块）
        this.ui = new ChessUI(this.engine, this.audioManager, {
            cache: this.cache,
            security: this.security
        });

        // 游戏状态
        this.isReplaying = false;
        this.replayTimer = null;
        this.replayIndex = 0;
        this.replayMoves = [];

        // 数据加载状态
        this.gamesData = [];
        this.currentGameIndex = 0;

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

        } catch (error) {
            console.error('游戏初始化失败:', error);
        }
    }

    /**
     * 加载棋谱数据
     * @private
     */
    async loadGamesData() {
        try {
            // 尝试加载分类棋谱数据
            const response = await fetch('./main/data/classified-games.json');
            if (response.ok) {
                const data = await response.json();
                this.gamesData = data.games || data || [];
                console.log(`已加载 ${this.gamesData.length} 个棋谱记录`);
                return;
            }
        } catch (error) {
            console.warn('加载分类棋谱数据失败，尝试加载经典数据:', error);
        }

        // 回退到经典数据
        try {
            const response = await fetch('./main/data/classic_openings.json');
            if (response.ok) {
                const data = await response.json();
                this.gamesData = Array.isArray(data) ? data : Object.values(data);
                console.log(`已加载 ${this.gamesData.length} 个经典棋谱记录`);
            }
        } catch (error) {
            console.warn('加载经典棋谱数据失败:', error);
            this.gamesData = [];
        }
    }

    /**
     * 加载并播放随机经典棋局
     */
    async loadRandomClassicGame() {
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

        } catch (error) {
            console.error('加载随机棋局失败:', error);
        }
    }

    /**
     * 验证棋谱数据
     * @param {unknown} gameData - 棋谱数据
     * @returns {ValidationResult} 验证结果
     * @private
     */
    validateGameData(gameData) {
        try {
            // 提取移动数据
            const moves = this.extractMovesFromGameData(gameData);

            // 使用验证器验证
            return this.validator.validateMoveSequence(moves);

        } catch (error) {
            return {
                valid: false,
                totalMoves: 0,
                validMoves: 0,
                errorMoves: 1,
                errors: [{
                    code: 'VALIDATION_EXCEPTION',
                    message: `数据验证异常: ${error.message}`,
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
     * @param {unknown} gameData - 棋谱数据
     * @returns {Move[]} 移动数组
     * @private
     */
    extractMovesFromGameData(gameData) {
        if (!gameData || typeof gameData !== 'object') {
            return [];
        }

        // 处理 different 数据格式
        if (Array.isArray(gameData)) {
            return gameData;
        }

        // 处理 gameData.moves 格式
        if (Array.isArray(gameData.moves)) {
            return gameData.moves;
        }

        // 处理会移动记录等其他格式
        if (gameData.notations || gameData.moves_text) {
            const notationText = gameData.notations || gameData.moves_text || '';
            return this.notationParser.parseGame(notationText).moves;
        }

        // 处理单个移动
        if (gameData.pieceType && gameData.toPos) {
            return [gameData];
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
     * 安排下一步移动
     * @private
     */
    scheduleNextMove() {
        if (!this.isReplaying || this.replayIndex >= this.replayMoves.length) {
            this.completeReplay();
            return;
        }

        this.replayTimer = setTimeout(() => {
            this.playNextMove();
        }, 1000); // 1秒间隔
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
            } else {
                console.warn(`第${this.replayIndex + 1}步移动失败`, move);
            }

            this.replayIndex++;
            this.scheduleNextMove();

        } catch (error) {
            console.error(`播放第${this.replayIndex + 1}步时出错:`, error);
            this.replayIndex++;
            this.scheduleNextMove();
        }
    }

    /**
     * 根据移动数据查找棋子
     * @param {Move} move - 移动数据
     * @returns {ChessPiece|null} 找到的棋子
     * @private
     */
    findPieceForMove(move) {
        // 优先通过位置查找
        if (move.fromPos) {
            const piece = this.engine.getPieceAtByColor(move.fromPos, move.color);
            if (piece) return piece;
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
     * 完成回放
     * @private
     */
    completeReplay() {
        this.isReplaying = false;
        if (this.replayTimer) {
            clearTimeout(this.replayTimer);
            this.replayTimer = null;
        }
        console.log('棋谱回放完成');
    }

    /**
     * 停止回放
     */
    stopReplay() {
        if (this.isReplaying) {
            this.isReplaying = false;
            if (this.replayTimer) {
                clearTimeout(this.replayTimer);
                this.replayTimer = null;
            }
            console.log('停止自动回放');
        }
    }

    /**
     * 切换回放状态
     */
    toggleReplay() {
        if (this.isReplaying) {
            this.stopReplay();
        } else if (this.replayMoves.length > 0) {
            this.startAutoReplay();
        }
    }

    /**
     * 切换暂停状态
     */
    togglePause() {
        if (this.isReplaying) {
            this.stopReplay();
        } else if (this.replayMoves.length > 0 && this.replayIndex < this.replayMoves.length) {
            this.isReplaying = true;
            this.scheduleNextMove();
        }
    }

    /**
     * 解析记谱法输入
     * @param {string} notation - 记谱法文本
     * @returns {boolean} 解析是否成功
     */
    parseNotation(notation) {
        try {
            const result = this.notationParser.parseMove(notation);
            if (result.success) {
                console.log('解析成功:', result.move);
                return true;
            } else {
                console.warn('解析失败:', result.error);
                return false;
            }
        } catch (error) {
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
     * 重置游戏
     */
    reset() {
        this.stopReplay();
        this.engine.reset();
        this.ui.renderBoard();
        this.ui.clearSelection();
        this.ui.setGameMode('game');
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
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    // 保持向后兼容性
    if (!window.xiangqiGame) {
        window.XiangqiGame = XiangqiGame;
        window.xiangqiGame = new XiangqiGame();
    }
});

// 导出模块（对于ES6模块环境）
export { XiangqiGame };