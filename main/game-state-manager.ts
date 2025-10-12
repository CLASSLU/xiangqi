/**
 * Game State Manager - 游戏状态管理器
 *
 * 专门负责管理中国象棋的游戏状态，包括模式切换、回放控制等
 * 从主控制器中提取状态管理逻辑，降低复杂度
 *
 * @fileoverview 游戏状态管理器
 * @version 2.1.0
 * @author Claude Code Review System
 * @since 2024-10-12
 */

import type { Move } from './types';

/**
 * 游戏模式枚举
 */
export enum GameMode {
    GAME = 'game',           // 游戏模式
    NOTATION = 'notation',   // 记谱演示模式
    DEMONSTRATION = 'demonstration' // 棋谱演示模式
}

/**
 * 回放状态接口
 */
export interface ReplayState {
    isReplaying: boolean;
    replayIndex: number;
    replayMoves: Move[];
    replayTimer: number | null;
    replaySpeed: number; // 毫秒
    autoPlay: boolean;
}

/**
 * 数据加载状态
 */
export interface DataLoadState {
    gamesData: any[];
    currentGameIndex: number;
    isDataLoaded: boolean;
    loadError: string | null;
}

/**
 * 游戏状态管理器
 */
export class GameStateManager {
    private currentMode: GameMode = GameMode.GAME;
    private replayState: ReplayState;
    private dataState: DataLoadState;

    constructor() {
        // 初始化回放状态
        this.replayState = {
            isReplaying: false,
            replayIndex: 0,
            replayMoves: [],
            replayTimer: null,
            replaySpeed: 1000, // 默认1秒间隔
            autoPlay: false
        };

        // 初始化数据状态
        this.dataState = {
            gamesData: [],
            currentGameIndex: 0,
            isDataLoaded: false,
            loadError: null
        };
    }

    /**
     * 切换游戏模式
     * @param {GameMode} mode - 目标模式
     */
    public setMode(mode: GameMode): void {
        // 从回放模式切换时停止回放
        if (this.currentMode === GameMode.NOTATION && mode !== GameMode.NOTATION) {
            this.stopReplay();
        }

        this.currentMode = mode;
        console.log(`游戏模式切换到: ${mode}`);
    }

    /**
     * 获取当前游戏模式
     * @returns {GameMode}
     */
    public getMode(): GameMode {
        return this.currentMode;
    }

    /**
     * 检查是否为记谱模式
     * @returns {boolean}
     */
    public isNotationMode(): boolean {
        return this.currentMode === GameMode.NOTATION;
    }

    /**
     * 检查是否为游戏模式
     * @returns {boolean}
     */
    public isGameMode(): boolean {
        return this.currentMode === GameMode.GAME;
    }

    // ==================== 回放状态管理 ====================

    /**
     * 设置回放数据
     * @param {Move[]} moves - 回放的移动数组
     */
    public setReplayMoves(moves: Move[]): void {
        this.replayState.replayMoves = [...moves];
        this.replayState.replayIndex = 0;
    }

    /**
     * 获取当前回放移动
     * @returns {Move|null}
     */
    public getCurrentReplayMove(): Move | null {
        const { replayIndex, replayMoves } = this.replayState;
        if (replayIndex >= 0 && replayIndex < replayMoves.length) {
            return replayMoves[replayIndex];
        }
        return null;
    }

    /**
     * 获取下一个回放移动
     * @returns {Move|null}
     */
    public getNextReplayMove(): Move | null {
        const { replayIndex, replayMoves } = this.replayState;
        const nextIndex = replayIndex + 1;
        if (nextIndex < replayMoves.length) {
            return replayMoves[nextIndex];
        }
        return null;
    }

    /**
     * 前进到下一步
     * @returns {boolean}
     */
    public nextReplayStep(): boolean {
        const nextMove = this.getNextReplayMove();
        if (nextMove) {
            this.replayState.replayIndex++;
            return true;
        }
        return false;
    }

    /**
     * 检查回放是否完成
     * @returns {boolean}
     */
    public isReplayComplete(): boolean {
        const { replayIndex, replayMoves } = this.replayState;
        return replayIndex >= replayMoves.length;
    }

    /**
     * 重置回放状态
     */
    public resetReplay(): void {
        this.stopReplay();
        this.replayState.replayIndex = 0;
        this.replayState.autoPlay = false;
    }

    /**
     * 开始自动回放
     * @param {Function} onStep - 每步执行的回调函数
     */
    public startAutoReplay(onStep: () => void): void {
        if (this.replayState.replayMoves.length === 0) {
            console.log('没有可回放的移动');
            return;
        }

        this.replayState.isReplaying = true;
        this.replayState.autoPlay = true;
        this.scheduleReplayStep(onStep);
    }

    /**
     * 停止自动回放
     */
    public stopReplay(): void {
        if (this.replayState.replayTimer !== null) {
            clearTimeout(this.replayState.replayTimer);
            this.replayState.replayTimer = null;
        }
        this.replayState.isReplaying = false;
        this.replayState.autoPlay = false;
    }

    /**
     * 切换回放暂停状态
     * @param {Function} onStep - 恢复播放时的回调函数
     */
    public toggleReplayPause(onStep: () => void): void {
        if (this.replayState.isReplaying) {
            this.stopReplay();
        } else if (this.replayState.autoPlay && !this.isReplayComplete()) {
            this.replayState.isReplaying = true;
            this.scheduleReplayStep(onStep);
        }
    }

    /**
     * 设置回放速度
     * @param {number} speed - 回放间隔（毫秒）
     */
    public setReplaySpeed(speed: number): void {
        this.replayState.replaySpeed = Math.max(100, Math.min(5000, speed));
    }

    /**
     * 获取回放状态
     * @returns {ReplayState}
     */
    public getReplayState(): ReplayState {
        return { ...this.replayState };
    }

    /**
     * 安排下一步回放
     * @private
     */
    private scheduleReplayStep(onStep: () => void): void {
        if (!this.replayState.isReplaying || this.isReplayComplete()) {
            this.completeReplay();
            return;
        }

        this.replayState.replayTimer = window.setTimeout(() => {
            if (this.replayState.isReplaying) {
                onStep();
            }
        }, this.replayState.replaySpeed);
    }

    /**
     * 完成回放
     * @private
     */
    private completeReplay(): void {
        this.replayState.isReplaying = false;
        this.replayState.autoPlay = false;
        if (this.replayState.replayTimer !== null) {
            clearTimeout(this.replayState.replayTimer);
            this.replayState.replayTimer = null;
        }
        console.log('回放完成');
    }

    // ==================== 数据状态管理 ====================

    /**
     * 设置棋谱数据
     * @param {any[]} gamesData - 棋谱数据数组
     */
    public setGamesData(gamesData: any[]): void {
        this.dataState.gamesData = [...gamesData];
        this.dataState.isDataLoaded = true;
        this.dataState.loadError = null;
        console.log(`已加载 ${gamesData.length} 个棋谱记录`);
    }

    /**
     * 获取当前棋局索引
     * @returns {number}
     */
    public getCurrentGameIndex(): number {
        return this.dataState.currentGameIndex;
    }

    /**
     * 设置当前棋局索引
     * @param {number} index - 棋局索引
     */
    public setCurrentGameIndex(index: number): void {
        const maxIndex = this.dataState.gamesData.length - 1;
        this.dataState.currentGameIndex = Math.max(0, Math.min(index, maxIndex));
    }

    /**
     * 获取当前棋局数据
     * @returns {any|null}
     */
    public getCurrentGameData(): any | null {
        const { gamesData, currentGameIndex } = this.dataState;
        if (currentGameIndex >= 0 && currentGameIndex < gamesData.length) {
            return gamesData[currentGameIndex];
        }
        return null;
    }

    /**
     * 获取随机棋局数据
     * @returns {any|null}
     */
    public getRandomGameData(): any | null {
        if (this.dataState.gamesData.length === 0) return null;

        const randomIndex = Math.floor(Math.random() * this.dataState.gamesData.length);
        this.dataState.currentGameIndex = randomIndex;
        return this.dataState.gamesData[randomIndex];
    }

    /**
     * 获取棋谱数据状态
     * @returns {DataLoadState}
     */
    public getDataState(): DataLoadState {
        return { ...this.dataState };
    }

    /**
     * 检查是否有可用的棋谱数据
     * @returns {boolean}
     */
    public hasGameData(): boolean {
        return this.dataState.gamesData.length > 0;
    }

    /**
     * 获取棋谱总数
     * @returns {number}
     */
    public getGamesCount(): number {
        return this.dataState.gamesData.length;
    }

    /**
     * 清理资源
     */
    public dispose(): void {
        this.stopReplay();
        this.replayState.replayMoves = [];
        this.dataState.gamesData = [];
        console.log('游戏状态管理器已清理');
    }

    /**
     * 获取完整的游戏状态摘要
     * @returns {Object} 状态摘要
     */
    public getStateSummary(): {
        mode: GameMode;
        replayProgress: { current: number; total: number; percentage: number };
        dataStatus: { loaded: boolean; count: number; currentGame: number };
    } {
        const { replayIndex, replayMoves } = this.replayState;
        const replayProgress = {
            current: replayIndex,
            total: replayMoves.length,
            percentage: replayMoves.length > 0 ? (replayIndex / replayMoves.length) * 100 : 0
        };

        const dataStatus = {
            loaded: this.dataState.isDataLoaded,
            count: this.dataState.gamesData.length,
            currentGame: this.dataState.currentGameIndex
        };

        return {
            mode: this.currentMode,
            replayProgress,
            dataStatus
        };
    }
}

// 类型和枚举已在前面导出，无需重复导出