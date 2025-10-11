// chess.js
// 中国象棋游戏主类（兼容性入口文件）
//
// v2.1.0 - 模块化重构版本
// 原来的3548行巨型文件已被拆分为以下模块：
// - chess-engine.js - 游戏核心引擎
// - chess-validator.js - 数据验证器
// - chess-ui.js - 界面控制器
// - xiangqi-game.js - 主控制器
// - error-recovery.js - 错误恢复系统
// - chess-notation-parser.js - 记谱法解析器
//
// 本文件保持向后兼容性，仅作为入口点重定向

/**
 * @fileoverview 中国象棋游戏主类（兼容性入口）
 * @version 2.1.0
 * @author Claude Code Review System
 * @since 2024-10-11
 */

/**
 * @typedef {import('./types').PlayerColor} PlayerColor
 * @typedef {import('./types').PieceType} PieceType
 * @typedef {import('./types').Position} Position
 * @typedef {import('./types').ChessPiece} ChessPiece
 * @typedef {import('./types').Move} Move
 * @typedef {import('./types').GameState} GameState
 * @typedef {import('./types').ChessGameData} ChessGameData
 * @typedef {import('./types').ValidationOptions} ValidationOptions
 * @typedef {import('./types').ValidationResult} ValidationResult
 */

// ==================== 兼容性说明 ====================
// 为了保持向后兼容性，本文件提供以下兼容性功能：

/**
 * 验证棋谱数据的完整性和有效性（兼容性函数）
 * @param {import('./types').ChessGameData} gameData - 棋谱数据对象
 * @returns {Array<import('./types').Move>} 验证后的有效棋步数组
 */
function validateGameDataStructure(gameData) {
    console.warn('使用兼容性函数 validateGameDataStructure，建议迁移到 ChessValidator.validateMoveSequence');

    // 简单的兼容性实现
    if (!gameData || !gameData.moves || !Array.isArray(gameData.moves)) {
        return [];
    }

    return gameData.moves.filter(move => move && move.pieceType && move.toPos);
}

/**
 * @deprecated 此函数仅在编译时提供类型信息，运行时已迁移到专用模块
 * 原来的巨型类实现已被拆分为多个专用模块以提高可维护性
 */
class XiangqiGame {
    constructor() {
        console.warn('使用兼容性构造函数，系统将自动迁移到新的模块化架构');

        // 如果已经初始化了新版本，直接引用
        if (window.xiangqiGame) {
            return window.xiangqiGame;
        }

        // 否则提供基础的兼容性对象
        console.warn('正在使用兼容性模式，某些高级功能可能不可用');
        this.currentPlayer = 'red';
        this.gamePhase = 'playing';
        this.isReplaying = false;

        // 延迟加载新版本
        this.initializeNewVersion();
    }

    async initializeNewVersion() {
        try {
            // 动态加载新版本
            if (!window.XiangqiGame) {
                console.log('正在加载模块化版本...');
                // 将在新版本中自动初始化
            }
        } catch (error) {
            console.error('无法加载新版本:', error);
        }
    }

    // 兼容性方法 - 简化实现

    loadRandomClassicGame() {
        console.warn('兼容性模式的 loadRandomClassicGame，建议升级到模块化版本');
        if (window.xiangqiGame) {
            window.xiangqiGame.loadRandomClassicGame();
        }
    }

    reset() {
        console.warn('兼容性模式的 reset');
        if (window.xiangqiGame) {
            window.xiangqiGame.reset();
        } else {
            this.currentPlayer = 'red';
            this.gamePhase = 'playing';
            this.isReplaying = false;
        }
    }

    getGameState() {
        if (window.xiangqiGame) {
            return window.xiangqiGame.getGameState();
        }

        return {
            currentTurn: this.currentPlayer,
            phase: this.gamePhase,
            moveHistory: [],
            selectedPiece: null,
            possibleMoves: [],
            isCheck: { red: false, black: false },
            winner: null,
            moveNumber: 0
        };
    }
}

// ==================== 全局设置 ====================
// 确保全局对象存在
window.XiangqiGame = XiangqiGame;

// 等待DOM加载后再初始化（延迟到新版本加载）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM已准备，等待模块化架构加载...');
    });
} else {
    console.log('DOM已完成，等待模块化架构加载...');
}