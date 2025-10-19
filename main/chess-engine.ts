/**
 * Chess Engine - 中国象棋核心游戏引擎
 *
 * 负责核心游戏逻辑、棋子管理、移动验证等基础功能
 * 从原来的chess.js中提取的核心业务逻辑
 *
 * @fileoverview 游戏核心引擎
 * @version 2.1.0
 * @author Claude Code Review System
 * @since 2024-10-11
 */

import type {
    PlayerColor,
    PieceType,
    Position,
    ChessPiece,
    Move,
    GameState
} from './types';

/**
 * 引擎配置选项
 */
interface EngineOptions {
    cache?: PerformanceCache | null;
}

/**
 * 性能缓存接口
 */
interface PerformanceCache {
    positionCache(position: Position, result?: ChessPiece | null): ChessPiece | null;
}

/**
 * 中国象棋核心游戏引擎
 */
class ChessEngine {
    private currentPlayer: PlayerColor = 'red';
    private pieces: ChessPiece[] = [];
    private moveHistory: Move[] = [];
    private gameActive: boolean = true;
    private moveCount: number = 0;
    private cache: PerformanceCache | null = null;

    constructor(options: EngineOptions = {}) {
        // 性能优化：缓存系统
        this.cache = options.cache || null;

        // 初始化棋盘
        this.initializeBoard();
    }

    /**
     * 初始化棋盘和棋子
     * @private
     */
    private initializeBoard(): void {
        this.pieces = this.createInitialPieces();
        this.currentPlayer = 'red';
        this.moveHistory = [];
        this.gameActive = true;
        this.moveCount = 0;
    }

    /**
     * 创建初始棋子布局
     * @private
     * @returns {ChessPiece[]}
     */
    private createInitialPieces(): ChessPiece[] {
        const pieces: ChessPiece[] = [];

        // 红方棋子
        const redPieces = [
            { type: '車' as PieceType, positions: [[9, 0], [9, 8]] },
            { type: '馬' as PieceType, positions: [[9, 1], [9, 7]] },
            { type: '相' as PieceType, positions: [[9, 2], [9, 6]] },
            { type: '仕' as PieceType, positions: [[9, 3], [9, 5]] },
            { type: '帥' as PieceType, positions: [[9, 4]] },
            { type: '炮' as PieceType, positions: [[7, 1], [7, 7]] },
            { type: '兵' as PieceType, positions: [[6, 0], [6, 2], [6, 4], [6, 6], [6, 8]] }
        ];

        // 黑方棋子
        const blackPieces = [
            { type: '車' as PieceType, positions: [[0, 0], [0, 8]] },
            { type: '馬' as PieceType, positions: [[0, 1], [0, 7]] },
            { type: '象' as PieceType, positions: [[0, 2], [0, 6]] },
            { type: '士' as PieceType, positions: [[0, 3], [0, 5]] },
            { type: '将' as PieceType, positions: [[0, 4]] },
            { type: '砲' as PieceType, positions: [[2, 1], [2, 7]] },
            { type: '卒' as PieceType, positions: [[3, 0], [3, 2], [3, 4], [3, 6], [3, 8]] }
        ];

        // 创建红方棋子
        redPieces.forEach(({ type, positions }) => {
            positions.forEach((position, index) => {
                pieces.push({
                    id: `red-${type}-${index}`,
                    type,
                    color: 'red',
                    position: { row: position[0], col: position[1] }
                });
            });
        });

        // 创建黑方棋子
        blackPieces.forEach(({ type, positions }) => {
            positions.forEach((position, index) => {
                pieces.push({
                    id: `black-${type}-${index}`,
                    type,
                    color: 'black',
                    position: { row: position[0], col: position[1] }
                });
            });
        });

        return pieces;
    }

    /**
     * 获取当前位置的棋子
     * @param {Position} position
     * @returns {ChessPiece|null}
     */
    public getPieceAt(position: Position): ChessPiece | null {
        // 使用缓存优化位置查找
        if (this.cache) {
            const cached = this.cache.positionCache(position);
            if (cached !== null) {
                return cached;
            }
        }

        const piece = this.pieces.find(piece =>
            piece.position.row === position.row &&
            piece.position.col === position.col
        ) || null;

        // 缓存结果
        if (this.cache) {
            this.cache.positionCache(position, piece);
        }

        return piece;
    }

    /**
     * 获取指定位置和颜色的棋子
     * @param {Position} position
     * @param {PlayerColor} color
     * @returns {ChessPiece|null}
     */
    public getPieceAtByColor(position: Position, color: PlayerColor): ChessPiece | null {
        const piece = this.getPieceAt(position);
        return piece && piece.color === color ? piece : null;
    }

    /**
     * 获取指定颜色的所有棋子
     * @param {PlayerColor} color
     * @returns {ChessPiece[]}
     */
    public getPiecesByColor(color: PlayerColor): ChessPiece[] {
        return this.pieces.filter(piece => piece.color === color);
    }

    /**
     * 获取指定类型的棋子
     * @param {PieceType} type
     * @param {PlayerColor} color
     * @returns {ChessPiece[]}
     */
    public getPiecesByType(type: PieceType, color: PlayerColor): ChessPiece[] {
        return this.pieces.filter(piece =>
            piece.type === type && piece.color === color
        );
    }

    /**
     * 移动棋子
     * @param {ChessPiece} piece
     * @param {Position} toPosition
     * @returns {boolean}
     */
    public movePiece(piece: ChessPiece, toPosition: Position): boolean {
        if (!this.gameActive) {
            return false;
        }

        if (!this.isValidMove(piece, toPosition)) {
            return false;
        }

        // 记录移动
        const move: Move = {
            color: piece.color,
            pieceType: piece.type,
            fromPos: { ...piece.position },
            toPos: { ...toPosition },
            notation: this.generateMoveNotation(piece, toPosition)
        };

        // 检查是否吃子
        const targetPiece = this.getPieceAt(toPosition);
        if (targetPiece) {
            this.removePiece(targetPiece);
        }

        // 执行移动
        piece.position = { ...toPosition };
        this.moveHistory.push(move);
        this.moveCount++;

        // 切换玩家
        this.switchPlayer();

        return true;
    }

    /**
     * 验证移动是否合法
     * @param {ChessPiece} piece
     * @param {Position} toPosition
     * @returns {boolean}
     */
    public isValidMove(piece: ChessPiece, toPosition: Position): boolean {
        // 基础验证
        if (!piece || !toPosition) return false;
        if (piece.color !== this.currentPlayer) return false;

        // 位置验证
        if (toPosition.row < 0 || toPosition.row > 9) return false;
        if (toPosition.col < 0 || toPosition.col > 8) return false;

        // 不能吃自己的棋子
        const targetPiece = this.getPieceAt(toPosition);
        if (targetPiece && targetPiece.color === piece.color) return false;

        // 调用相应的移动规则验证
        return this.validatePieceMovement(piece, toPosition);
    }

    /**
     * 验证棋子移动规则
     * @private
     * @param {ChessPiece} piece
     * @param {Position} toPosition
     * @returns {boolean}
     */
    private validatePieceMovement(piece: ChessPiece, toPosition: Position): boolean {
        // 使用验证器工厂验证移动
        const { MovementValidatorFactory } = require('./movement-validators.js');
        return MovementValidatorFactory.validatePieceMovement(
            piece,
            toPosition,
            (position: any) => this.getPieceAt(position)
        );
    }

    // Note: 具体的棋子移动验证方法已移动到 movement-validators.ts 模块中
// 这大幅减少了主引擎的代码复杂度和行数

    /**
     * 移除棋子
     * @private
     * @param {ChessPiece} piece
     */
    private removePiece(piece: ChessPiece): void {
        const index = this.pieces.indexOf(piece);
        if (index > -1) {
            this.pieces.splice(index, 1);
        }
    }

    /**
     * 切换当前玩家
     * @private
     */
    private switchPlayer(): void {
        this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
    }

    /**
     * 生成移动记谱法
     * @private
     * @param {ChessPiece} piece
     * @param {Position} toPosition
     * @returns {string}
     */
    private generateMoveNotation(piece: ChessPiece, toPosition: Position): string {
        const { type } = piece;
        const action = this.getPieceAt(toPosition) ? '吃' : '平';
        const targetNotation = this.positionToNotation(toPosition);

        return `${type}${action}${targetNotation}`;
    }

    /**
     * 位置转换为记谱法
     * @private
     * @param {Position} position
     * @returns {string}
     */
    private positionToNotation(position: Position): string {
        // 简化的记谱法转换
        return `${position.row},${position.col}`;
    }

    /**
     * 检查是否被将军
     * @param {PlayerColor} color
     * @returns {boolean}
     */
    public isInCheck(color: PlayerColor): boolean {
        const kingType = color === 'red' ? '帥' : '将';
        const king = this.getPiecesByType(kingType, color)[0];
        if (!king) return false;

        const opponentColor = color === 'red' ? 'black' : 'red';
        const opponentPieces = this.getPiecesByColor(opponentColor);

        return opponentPieces.some(piece => {
            return this.validatePieceMovement(piece, king.position);
        });
    }

    /**
     * 检查是否将帅照面
     * @returns {boolean}
     */
    public areKingsFacing(): boolean {
        const redKing = this.getPiecesByType('帥', 'red')[0];
        const blackKing = this.getPiecesByType('将', 'black')[0];

        if (!redKing || !blackKing) return false;
        if (redKing.position.col !== blackKing.position.col) return false;

        // 检查两将之间是否有棋子
        const minRow = Math.min(redKing.position.row, blackKing.position.row);
        const maxRow = Math.max(redKing.position.row, blackKing.position.row);

        for (let row = minRow + 1; row < maxRow; row++) {
            if (this.getPieceAt({ row, col: redKing.position.col })) return false;
        }

        return true;
    }

    /**
     * 获取当前游戏状态
     * @returns {GameState}
     */
    public getGameState(): GameState {
        return {
            currentTurn: this.currentPlayer,
            phase: this.gameActive ? 'playing' : 'ended',
            moveHistory: [...this.moveHistory],
            selectedPiece: null,
            possibleMoves: [],
            isCheck: {
                red: this.isInCheck('red'),
                black: this.isInCheck('black')
            },
            winner: null,
            moveNumber: this.moveCount
        };
    }

    /**
     * 重置游戏
     */
    public reset(): void {
        this.initializeBoard();
    }

    /**
     * 导出游戏状态为JSON
     * @returns {string}
     */
    public exportGame(): string {
        return JSON.stringify({
            currentPlayer: this.currentPlayer,
            moveHistory: this.moveHistory,
            moveCount: this.moveCount,
            pieces: this.pieces.map(piece => ({
                id: piece.id,
                type: piece.type,
                color: piece.color,
                position: piece.position
            }))
        });
    }

    /**
     * 从JSON导入游戏状态
     * @param {string} gameStateJSON
     * @returns {boolean}
     */
    public importGame(gameStateJSON: string): boolean {
        try {
            const gameState = JSON.parse(gameStateJSON);
            this.currentPlayer = gameState.currentPlayer;
            this.moveHistory = gameState.moveHistory || [];
            this.moveCount = gameState.moveCount || 0;
            this.pieces = gameState.pieces || [];
            this.gameActive = true;
            return true;
        } catch (error) {
            console.error('导入游戏状态失败:', error);
            return false;
        }
    }
}

// 导出模块
export { ChessEngine, type EngineOptions, type PerformanceCache };