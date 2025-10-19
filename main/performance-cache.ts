/**
 * PerformanceCache - 性能缓存系统
 *
 * 提供游戏引擎的性能优化缓存功能
 *
 * @fileoverview 性能缓存系统
 * @version 2.1.0
 * @author Claude Code Review System
 * @since 2024-10-11
 */

import type { ChessPiece, Position } from './types';

/**
 * 性能缓存系统
 */
class PerformanceCache {
    private positionCacheMap = new Map<string, ChessPiece | null>();
    private moveCacheMap = new Map<string, boolean>();

    /**
     * 位置缓存
     * @param {Position} position
     * @param {ChessPiece|null} result
     * @returns {ChessPiece|null}
     */
    public positionCache(position: Position, result?: ChessPiece | null): ChessPiece | null {
        const key = `${position.row},${position.col}`;

        if (result !== undefined) {
            // 设置缓存
            this.positionCacheMap.set(key, result);
            return result;
        } else {
            // 获取缓存
            const cached = this.positionCacheMap.get(key);
            return cached !== undefined ? cached : null;
        }
    }

    /**
     * 移动验证结果缓存
     * @param {string} key
     * @param {boolean} result
     * @returns {boolean|undefined}
     */
    public moveCache(key: string, result?: boolean): boolean | undefined {
        if (result !== undefined) {
            this.moveCacheMap.set(key, result);
            return result;
        } else {
            return this.moveCacheMap.get(key);
        }
    }

    /**
     * 清除所有缓存
     */
    public clear(): void {
        this.positionCacheMap.clear();
        this.moveCacheMap.clear();
    }

    /**
     * 获取缓存统计信息
     * @returns {object} 缓存统计数据
     */
    public getStats(): {
        positionCacheSize: number;
        moveCacheSize: number;
    } {
        return {
            positionCacheSize: this.positionCacheMap.size,
            moveCacheSize: this.moveCacheMap.size
        };
    }
}

export { PerformanceCache };