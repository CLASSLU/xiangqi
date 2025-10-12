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
import { GameStateManager, GameMode } from './game-state-manager.js';

import type {
    ChessGameData,
    GameState,
    Move,
    ValidationResult,
    ValidationErrorInterface,
    UIConfig,
    IPerformanceCache,
    ChessPiece
} from './types';

/**
 * UI选项接口
 */
interface UIOptions extends UIConfig {}

/**
 * 装载的棋谱数据类型
 */
type GamesData = ChessGameData[];

/**
 * 中国象棋主控制器
 * 整合引擎、验证器、UI、音频等功能模块
 */
class XiangqiGame {
    private readonly cache: IPerformanceCache;
    private readonly security: SecurityManager;
    private readonly engine: ChessEngine;
    private readonly validator: ChessValidator;
    private readonly errorRecovery: ErrorRecovery;
    private readonly notationParser: ChessNotationParser;
    private readonly audioManager: AudioManager;
    private readonly ui: ChessUI;
    private readonly stateManager: GameStateManager;

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

        // 游戏状态管理器（集中管理所有状态）
        this.stateManager = new GameStateManager();

        // UI控制器（最后初始化，依赖其他模块）
        this.ui = new ChessUI(this.engine, this.audioManager, {
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
    private async initialize(): Promise<void> {
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
     * 加载棋谱数据（仅使用爬取的分类数据）
     * @private
     */
    private async loadGamesData(): Promise<void> {
        try {
            // 只加载分类棋谱数据
            const response = await fetch('./main/data/classified-games.json');
            if (response.ok) {
                const data = await response.json();
                const gamesData = data.games || data || [];

                // 使用状态管理器管理数据
                this.stateManager.setGamesData(gamesData);
                console.log(`已加载 ${gamesData.length} 个分类棋谱记录`);
                return;
            }
        } catch (error) {
            console.error('加载分类棋谱数据失败:', error);
        }

        // 如果无法加载分类数据，设置为空数组
        this.stateManager.setGamesData([]);
        console.warn('未找到分类棋谱数据，请确保爬虫已生成数据文件');
    }

    /**
     * 加载并播放随机分类棋局
     */
    public async loadRandomGame(): Promise<void> {
        if (!this.stateManager.hasGameData()) {
            console.warn('没有可用的棋谱数据');
            return;
        }

        try {
            // 停止当前回放
            this.stateManager.stopReplay();

            // 获取随机棋局
            const gameData = this.stateManager.getRandomGameData();
            if (!gameData) return;

            // 验证并处理棋谱数据
            const validationResult = this.validateGameData(gameData);

            if (!validationResult.valid) {
                console.warn('棋谱数据验证失败:', validationResult.errors);
                if (this.getErrorSeverity(validationResult.errors) === 'critical') {
                    return;
                }
            }

            // 设置回放数据
            const validMoves = validationResult.normalizedMoves || [];
            this.stateManager.setReplayMoves(validMoves);

            // 切换到记谱演示模式
            this.stateManager.setMode(GameMode.NOTATION);
            this.ui.setGameMode('notation');

            // 开始自动回放
            this.startAutoReplay();

        } catch (error) {
            console.error('加载随机棋局失败:', error);
        }
    }

    /**
     * 验证棋谱数据
     * @param gameData - 棋谱数据
     * @returns 验证结果
     * @private
     */
    private validateGameData(gameData: unknown): ValidationResult {
        try {
            // 提取移动数据
            const moves = this.extractMovesFromGameData(gameData);

            // 使用验证器验证
            return this.validator.validateMoveSequence(moves);

        } catch (error) {
            const err = error as Error;
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
                } as ValidationErrorInterface],
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
    private extractMovesFromGameData(gameData: unknown): Move[] {
        if (!gameData || typeof gameData !== 'object') {
            return [];
        }

        const dataObj = gameData as Record<string, unknown>;

        // 处理 different 数据格式
        if (Array.isArray(gameData)) {
            return gameData as Move[];
        }

        // 处理 gameData.moves 格式
        if (Array.isArray(dataObj.moves)) {
            return dataObj.moves as Move[];
        }

        // 处理会移动记录等其他格式
        if (dataObj.notations || dataObj.moves_text) {
            const notationText = (dataObj.notations || dataObj.moves_text || '') as string;
            return this.notationParser.parseGame(notationText).moves;
        }

        // 处理单个移动
        if (dataObj.pieceType && dataObj.toPos) {
            return [dataObj as unknown as Move];
        }

        return [];
    }

    /**
     * 开始自动回放
     * @private
     */
    private startAutoReplay(): void {
        // 重置棋盘
        this.engine.reset();
        this.ui.renderBoard();

        // 使用状态管理器开始自动回放
        const replayStepCallback = () => this.executeReplayStep();
        this.stateManager.startAutoReplay(replayStepCallback);
    }

    /**
     * 执行回放步骤
     * @private
     */
    private async executeReplayStep(): Promise<void> {
        try {
            const currentMove = this.stateManager.getCurrentReplayMove();
            if (!currentMove) return;

            // 查找要移动的棋子
            const piece = this.findPieceForMove(currentMove);
            if (!piece) {
                console.warn(`找不到第${this.stateManager.getReplayState().replayIndex + 1}步的棋子`, currentMove);
                this.stateManager.nextReplayStep();
                return;
            }

            // 执行移动
            const success = this.engine.movePiece(piece, currentMove.toPos);
            if (success) {
                this.ui.renderBoard();
                this.ui.afterMove(this.engine.getGameState());

                // 前进到下一步
                this.stateManager.nextReplayStep();
            } else {
                console.warn(`第${this.stateManager.getReplayState().replayIndex + 1}步移动失败`, currentMove);
                this.stateManager.nextReplayStep();
            }

        } catch (error) {
            console.error(`播放第${this.stateManager.getReplayState().replayIndex + 1}步时出错:`, error);
            this.stateManager.nextReplayStep();
        }
    }

    /**
     * 根据移动数据查找棋子
     * @param move - 移动数据
     * @returns 找到的棋子
     * @private
     */
    private findPieceForMove(move: Move): ChessPiece | null {
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
     * 停止回放
     */
    public stopReplay(): void {
        this.stateManager.stopReplay();
    }

    /**
     * 切换回放状态
     */
    public toggleReplay(): void {
        if (this.stateManager.getReplayState().isReplaying) {
            this.stateManager.stopReplay();
        } else if (this.stateManager.getReplayState().replayMoves.length > 0) {
            this.startAutoReplay();
        }
    }

    /**
     * 切换暂停状态
     */
    public togglePause(): void {
        const replayStepCallback = () => this.executeReplayStep();
        this.stateManager.toggleReplayPause(replayStepCallback);
    }

    /**
     * 解析记谱法输入
     * @param notation - 记谱法文本
     * @returns 解析是否成功
     */
    public parseNotation(notation: string): boolean {
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
    private getErrorSeverity(errors: ValidationErrorInterface[]): string {
        return this.errorRecovery.getErrorSeverity(errors);
    }

    /**
     * 获取当前游戏状态
     * @returns {GameState} 游戏状态
     */
    public getGameState(): GameState {
        return this.engine.getGameState();
    }

    /**
     * 重置游戏
     */
    public reset(): void {
        this.stateManager.stopReplay();
        this.stateManager.resetReplay();
        this.stateManager.setMode(GameMode.GAME);

        this.engine.reset();
        this.ui.renderBoard();
        this.ui.clearSelection();
        this.ui.setGameMode('game');
    }

    /**
     * 导出游戏状态
     * @returns {string} JSON格式的游戏状态
     */
    public exportGame(): string {
        return this.engine.exportGame();
    }

    /**
     * 导入游戏状态
     * @param {string} gameStateJSON - JSON格式的游戏状态
     * @returns {boolean} 导入是否成功
     */
    public importGame(gameStateJSON: string): boolean {
        const success = this.engine.importGame(gameStateJSON);
        if (success) {
            this.ui.renderBoard();
        }
        return success;
    }

    // 公共访问器，用于调试和监控
    public get ReplayMoves(): Move[] {
        return [...this.stateManager.getReplayState().replayMoves];
    }

    public get ReplayIndex(): number {
        return this.stateManager.getReplayState().replayIndex;
    }

    public get IsReplaying(): boolean {
        return this.stateManager.getReplayState().isReplaying;
    }

    public get GamesData(): GamesData {
        return [...this.stateManager.getDataState().gamesData];
    }

    // 新增：状态摘要访问器
    public get StateSummary() {
        return this.stateManager.getStateSummary();
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
export { XiangqiGame, type UIOptions, type GamesData };