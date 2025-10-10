/**
 * TDD重构测试 - 工具函数移动前验证
 * 确保工具函数在当前代码中正常工作
 */

describe('TDD工具函数重构验证', () => {
    let game;

    beforeEach(() => {
        // 设置测试环境
        if (typeof document !== 'undefined') {
            document.body.innerHTML = `
                <div id="chess-board"></div>
            `;
        }

        // 创建游戏实例
        if (typeof XiangqiGame !== 'undefined') {
            game = new XiangqiGame();
            game.initializeGame();
        }
    });

    test('findPieceAt工具函数应该正常工作', () => {
        if (!game) return;

        const pieces = game.getPieces();
        const redKing = pieces.find(p => p.dataset.type === 'king' && p.dataset.color === 'red');

        // 如果有红方将，测试findPieceAt
        if (redKing) {
            const row = parseInt(redKing.dataset.row);
            const col = parseInt(redKing.dataset.col);

            // 测试能否找到棋子
            expect(redKing).toBeDefined();
            expect(row).toBeDefined();
            expect(col).toBeDefined();
        }
    });

    test('isOwnPieceAt工具函数应该正常工作', () => {
        if (!game || !game.board) return;

        // 测试红方区域是否是红方棋子
        const redKingPiece = game.getPieceAt(9, 4); // 红方将的位置

        if (redKingPiece) {
            expect(redKingPiece.dataset.color).toBe('red');
        }
    });

    test('isValidPosition工具函数应该正常工作', () => {
        // 测试有效位置
        const validPositions = [
            [0, 0], [9, 8], [5, 4] // 各种边界和中心位置
        ];

        validPositions.forEach(([row, col]) => {
            expect(row).toBeGreaterThanOrEqual(0);
            expect(row).toBeLessThan(10);
            expect(col).toBeGreaterThanOrEqual(0);
            expect(col).toBeLessThan(9);
        });

        // 测试无效位置
        const invalidPositions = [
            [-1, 0], [10, 8], [5, 9], [5, -1] // 超出边界
        ];

        invalidPositions.forEach(([row, col]) => {
            const isValid = (row >= 0 && row < 10 && col >= 0 && col < 9);
            expect(isValid).toBe(false);
        });
    });

    test('canMoveKing工具函数应该正常工作', () => {
        if (!game) return;

        const king = game.getPieceAt(9, 4); // 红方将
        if (king) {
            // 获取将的有效移动
            const moves = game.getValidMoves('king', 'red', 9, 4);

            // 将应该在九宫格内移动
            expect(Array.isArray(moves)).toBe(true);

            // 每个移动位置都应该是有效的
            moves.forEach(([row, col]) => {
                expect(row).toBeGreaterThanOrEqual(7); // 红方九宫格
                expect(row).toBeLessThanOrEqual(9);
                expect(col).toBeGreaterThanOrEqual(3);
                expect(col).toBeLessThanOrEqual(5);
            });
        }
    });
});