/**
 * Movement Validators - 移动验证器集合
 *
 * 为中国象棋各种棋子的移动规则提供独立的验证器
 * 减少主引擎的复杂度，提高代码可维护性
 *
 * @fileoverview 移动验证器模块
 * @version 2.1.0
 * @author Claude Code Review System
 * @since 2024-10-12
 */

import type { ChessPiece, Position } from './types';

/**
 * 九宫格限制检查器
 */
class PalaceConstraints {
    /**
     * 检查位置是否在九宫格内
     * @param {Position} position - 位置
     * @param {'red'|'black'} color - 棋子颜色
     * @returns {boolean}
     */
    public static isInPalace(position: Position, color: 'red' | 'black'): boolean {
        const palaceRows = color === 'red' ? [7, 8, 9] : [0, 1, 2];
        const palaceCols = [3, 4, 5];

        return palaceRows.includes(position.row) && palaceCols.includes(position.col);
    }

    /**
     * 获取指定颜色的九宫格范围
     * @param {'red'|'black'} color - 棋子颜色
     * @returns {Object} 九宫格范围
     */
    public static getPalaceBounds(color: 'red' | 'black'): {
        rows: number[];
        cols: number[];
    } {
        return {
            rows: color === 'red' ? [7, 8, 9] : [0, 1, 2],
            cols: [3, 4, 5]
        };
    }
}

/**
 * 路径检查器 - 用于检查移动路径上的障碍物
 */
class PathChecker {
    /**
     * 检查直线移动路径是否有障碍
     * @param {Position} from - 起始位置
     * @param {Position} to - 目标位置
     * @param {Function} getPieceAt - 获取位置棋子的函数
     * @returns {boolean} 是否路径通畅
     */
    public static isStraightPathClear(
        from: Position,
        to: Position,
        getPieceAt: (position: Position) => ChessPiece | null
    ): boolean {
        if (from.row === to.row) {
            // 横向移动
            const minCol = Math.min(from.col, to.col);
            const maxCol = Math.max(from.col, to.col);
            for (let col = minCol + 1; col < maxCol; col++) {
                if (getPieceAt({ row: from.row, col })) return false;
            }
        } else if (from.col === to.col) {
            // 纵向移动
            const minRow = Math.min(from.row, to.row);
            const maxRow = Math.max(from.row, to.row);
            for (let row = minRow + 1; row < maxRow; row++) {
                if (getPieceAt({ row, col: from.col })) return false;
            }
        } else {
            return false; // 不是直线移动
        }

        return true;
    }

    /**
     * 计算直线路径上的棋子数量
     * @param {Position} from - 起始位置
     * @param {Position} to - 目标位置
     * @param {Function} getPieceAt - 获取位置棋子的函数
     * @returns {number} 障碍物数量
     */
    public static countPiecesOnPath(
        from: Position,
        to: Position,
        getPieceAt: (position: Position) => ChessPiece | null
    ): number {
        let count = 0;

        if (from.row === to.row) {
            const minCol = Math.min(from.col, to.col);
            const maxCol = Math.max(from.col, to.col);
            for (let col = minCol + 1; col < maxCol; col++) {
                if (getPieceAt({ row: from.row, col })) count++;
            }
        } else if (from.col === to.col) {
            const minRow = Math.min(from.row, to.row);
            const maxRow = Math.max(from.row, to.row);
            for (let row = minRow + 1; row < maxRow; row++) {
                if (getPieceAt({ row, col: from.col })) count++;
            }
        }

        return count;
    }
}

/**
 * 将帅移动验证器
 */
class KingMovementValidator {
    /**
     * 验证将帅移动是否合法
     * @param {ChessPiece} piece - 将帅棋子
     * @param {Position} toPosition - 目标位置
     * @returns {boolean}
     */
    public static validate(piece: ChessPiece, toPosition: Position): boolean {
        const { position: from } = piece;
        const rowDiff = Math.abs(toPosition.row - from.row);
        const colDiff = Math.abs(toPosition.col - from.col);

        // 将帅只能在九宫格内移动一格
        if (rowDiff + colDiff !== 1) return false;

        // 检查九宫格限制
        return PalaceConstraints.isInPalace(toPosition, piece.color);
    }
}

/**
 * 士的移动验证器
 */
class AdvisorMovementValidator {
    /**
     * 验证士的移动是否合法
     * @param {ChessPiece} piece - 士棋子
     * @param {Position} toPosition - 目标位置
     * @returns {boolean}
     */
    public static validate(piece: ChessPiece, toPosition: Position): boolean {
        const { position: from } = piece;
        const rowDiff = Math.abs(toPosition.row - from.row);
        const colDiff = Math.abs(toPosition.col - from.col);

        // 士只能斜走一格
        if (rowDiff !== 1 || colDiff !== 1) return false;

        // 检查九宫格限制
        return PalaceConstraints.isInPalace(toPosition, piece.color);
    }
}

/**
 * 象的移动验证器
 */
class ElephantMovementValidator {
    /**
     * 验证象的移动是否合法
     * @param {ChessPiece} piece - 象棋子
     * @param {Position} toPosition - 目标位置
     * @param {Function} getPieceAt - 获取位置棋子的函数
     * @returns {boolean}
     */
    public static validate(
        piece: ChessPiece,
        toPosition: Position,
        getPieceAt: (position: Position) => ChessPiece | null
    ): boolean {
        const { position: from } = piece;
        const rowDiff = Math.abs(toPosition.row - from.row);
        const colDiff = Math.abs(toPosition.col - from.col);

        // 象只能走田字（斜走两格）
        if (rowDiff !== 2 || colDiff !== 2) return false;

        // 象不能过河
        if (piece.color === 'red' && toPosition.row < 5) return false;
        if (piece.color === 'black' && toPosition.row > 4) return false;

        // 检查象眼是否被堵
        const elephantEyeRow = from.row + (toPosition.row - from.row) / 2;
        const elephantEyeCol = from.col + (toPosition.col - from.col) / 2;
        const elephantEye: Position = { row: elephantEyeRow, col: elephantEyeCol };

        return !getPieceAt(elephantEye);
    }
}

/**
 * 马的移动验证器
 */
class HorseMovementValidator {
    /**
     * 验证马的移动是否合法
     * @param {ChessPiece} piece - 马棋子
     * @param {Position} toPosition - 目标位置
     * @param {Function} getPieceAt - 获取位置棋子的函数
     * @returns {boolean}
     */
    public static validate(
        piece: ChessPiece,
        toPosition: Position,
        getPieceAt: (position: Position) => ChessPiece | null
    ): boolean {
        const { position: from } = piece;
        const rowDiff = Math.abs(toPosition.row - from.row);
        const colDiff = Math.abs(toPosition.col - from.col);

        // 马走日字
        if (!((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2))) {
            return false;
        }

        // 检查马腿是否被蹩
        if (rowDiff === 2) {
            const legRow = from.row + (toPosition.row > from.row ? 1 : -1);
            const legPos: Position = { row: legRow, col: from.col };
            return !getPieceAt(legPos);
        } else {
            const legCol = from.col + (toPosition.col > from.col ? 1 : -1);
            const legPos: Position = { row: from.row, col: legCol };
            return !getPieceAt(legPos);
        }
    }
}

/**
 * 车的移动验证器
 */
class RookMovementValidator {
    /**
     * 验证车的移动是否合法
     * @param {ChessPiece} piece - 车棋子
     * @param {Position} toPosition - 目标位置
     * @param {Function} getPieceAt - 获取位置棋子的函数
     * @returns {boolean}
     */
    public static validate(
        piece: ChessPiece,
        toPosition: Position,
        getPieceAt: (position: Position) => ChessPiece | null
    ): boolean {
        const { position: from } = piece;

        // 车只能走直线
        if (from.row !== toPosition.row && from.col !== toPosition.col) return false;

        // 检查路径是否有障碍
        return PathChecker.isStraightPathClear(from, toPosition, getPieceAt);
    }
}

/**
 * 炮的移动验证器
 */
class CannonMovementValidator {
    /**
     * 验证炮的移动是否合法
     * @param {ChessPiece} piece - 炮棋子
     * @param {Position} toPosition - 目标位置
     * @param {Function} getPieceAt - 获取位置棋子的函数
     * @returns {boolean}
     */
    public static validate(
        piece: ChessPiece,
        toPosition: Position,
        getPieceAt: (position: Position) => ChessPiece | null
    ): boolean {
        const { position: from } = piece;
        const targetPiece = getPieceAt(toPosition);

        // 炮只能走直线
        if (from.row !== toPosition.row && from.col !== toPosition.col) return false;

        // 计算路径上的棋子数量
        const piecesBetween = PathChecker.countPiecesOnPath(from, toPosition, getPieceAt);

        // 炮的移动规则
        if (targetPiece) {
            // 吃子必须隔一个棋子
            return piecesBetween === 1;
        } else {
            // 移动不能有障碍
            return piecesBetween === 0;
        }
    }
}

/**
 * 兵/卒的移动验证器
 */
class SoldierMovementValidator {
    /**
     * 验证兵/卒的移动是否合法
     * @param {ChessPiece} piece - 兵/卒棋子
     * @param {Position} toPosition - 目标位置
     * @returns {boolean}
     */
    public static validate(piece: ChessPiece, toPosition: Position): boolean {
        const { position: from } = piece;
        const rowDiff = toPosition.row - from.row;
        const colDiff = Math.abs(toPosition.col - from.col);

        if (piece.color === 'red') {
            // 红兵向上走
            if (rowDiff > 0) return false; // 不能后退
            if (Math.abs(rowDiff) + colDiff !== 1) return false; // 只能走一格

            // 过河前只能前进
            if (from.row > 4 && colDiff > 0) return false;
        } else {
            // 黑卒向下走
            if (rowDiff < 0) return false; // 不能后退
            if (Math.abs(rowDiff) + colDiff !== 1) return false; // 只能走一格

            // 过河前只能前进
            if (from.row < 5 && colDiff > 0) return false;
        }

        return true;
    }
}

/**
 * 移动验证工厂 - 统一的验证入口
 */
export class MovementValidatorFactory {
    /**
     * 验证棋子移动是否合法
     * @param {ChessPiece} piece - 要移动的棋子
     * @param {Position} toPosition - 目标位置
     * @param {Function} getPieceAt - 获取位置棋子的函数
     * @returns {boolean}
     */
    public static validatePieceMovement(
        piece: ChessPiece,
        toPosition: Position,
        getPieceAt: (position: Position) => ChessPiece | null
    ): boolean {
        const { type } = piece;

        switch (type) {
            case '帥':
            case '将':
                return KingMovementValidator.validate(piece, toPosition);
            case '仕':
            case '士':
                return AdvisorMovementValidator.validate(piece, toPosition);
            case '相':
            case '象':
                return ElephantMovementValidator.validate(piece, toPosition, getPieceAt);
            case '馬':
                return HorseMovementValidator.validate(piece, toPosition, getPieceAt);
            case '車':
                return RookMovementValidator.validate(piece, toPosition, getPieceAt);
            case '炮':
            case '砲':
                return CannonMovementValidator.validate(piece, toPosition, getPieceAt);
            case '兵':
            case '卒':
                return SoldierMovementValidator.validate(piece, toPosition);
            default:
                return false;
        }
    }
}

// 导出所有验证器和工具类
export {
    PalaceConstraints,
    PathChecker,
    KingMovementValidator,
    AdvisorMovementValidator,
    ElephantMovementValidator,
    HorseMovementValidator,
    RookMovementValidator,
    CannonMovementValidator,
    SoldierMovementValidator
};