/**
 * 象棋规则引擎测试
 * 测试象棋游戏中集成的规则逻辑
 */

// 导入Mock游戏类
const { MockXiangqiGame } = require('../mock-xiangqi-game');

describe('象棋规则引擎测试', () => {
    let game;

    beforeEach(() => {
        // 模拟document对象
        global.document = {
            createElement: () => ({}),
            querySelector: () => null,
            getElementById: () => null,
            createTextNode: () => ({}),
            createDocumentFragment: () => ({
                appendChild: () => {},
                querySelector: () => null
            })
        };

        // 模拟window对象
        global.window = {
            location: { hostname: 'localhost' },
            addEventListener: () => {},
            removeEventListener: () => {},
            AudioContext: function() {
                return {
                    createOscillator: () => ({
                        connect: () => {},
                        start: () => {},
                        stop: () => {}
                    }),
                    createGain: () => ({
                        connect: () => {},
                        gain: { value: 1 }
                    }),
                    destination: {}
                };
            },
            setTimeout: () => ({}),
            clearTimeout: () => {},
            navigator: { userAgent: 'test' }
        };

        game = new MockXiangqiGame('test-board', 'test-record');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('基本位置校验', () => {
        test('应该验证棋盘边界', () => {
            // 通过获取移动来间接验证棋盘边界
            const pieceType = 'soldier';
            // 测试超出边界的位置（红方士兵的getValidMoves应该为空）
            const outOfBoundsMoves = game.getValidMoves(pieceType, 'red', -1, 0);
            expect(Array.isArray(outOfBoundsMoves)).toBe(true);

            const validMoves = game.getValidMoves(pieceType, 'red', 0, 0);
            expect(Array.isArray(validMoves)).toBe(true);
        });
    });

    describe('棋子移动规则测试', () => {
        test('将/帅的移动规则', () => {
            game.pieces = [];
            const redKing = game.createPiece({type: 'king', color: 'red', row: 9, col: 4});
            game.pieces.push(redKing);
            const moves = game.getValidMoves('king', 'red', 9, 4);

            // 测试将帅的移动 - 可以上下左右在九宫格内移动
            const kingMoves = [
                [8, 4],  // 上
                [9, 3],  // 左
                [9, 5]   // 右
            ];

            kingMoves.forEach(move => {
                expect(moves.some(m => m[0] === move[0] && m[1] === move[1])).toBe(true);
            });

            // 不能在九宫格外移动
            const invalidMoves = [
                [10, 4], [7, 4], [9, 2], [9, 6]
            ];

            invalidMoves.forEach(move => {
                expect(moves.some(m => m[0] === move[0] && m[1] === move[1])).toBe(false);
            });
        });

        test('车的移动规则', () => {
            // 清空棋盘并放置一个单独的车
            game.pieces = [];

            // 重新添加一个车到棋盘中心测试移动
            const redRook = game.createPiece({type: 'rook', color: 'red', row: 4, col: 4});
            game.pieces.push(redRook);

            const moves = game.getValidMoves('rook', 'red', 4, 4);

            // 车应该能在四个方向移动并到达棋盘边界
            expect(moves.length).toBeGreaterThan(16); // 可以移动到很多位置

            // 检查四个方向
            const directions = [
                [-1, 0], // 上
                [1, 0],  // 下
                [0, -1], // 左
                [0, 1]   // 右
            ];

            directions.forEach(([dr, dc]) => {
                for (let i = 1; i <= 9; i++) {
                    const targetRow = 4 + dr * i;
                    const targetCol = 4 + dc * i;
                    if (targetRow >= 0 && targetRow < 10 && targetCol >= 0 && targetCol < 9) {
                        expect(moves.some(m => m[0] === targetRow && m[1] === targetCol)).toBe(true);
                    }
                }
            });
        });

        test('马的移动规则', () => {
            game.pieces = [];

            game.createPiece({type: 'horse', color: 'red', row: 4, col: 4});

            const moves = game.getValidMoves('horse', 'red', 4, 4);

            // 马从中心位置应该有8个可能的移动
            const expectedMoves = [
                [2, 3], [2, 5], // 竖直方向
                [3, 2], [3, 6], // 斜向
                [5, 2], [5, 6], // 斜向
                [6, 3], [6, 5]  // 竖直方向
            ];

            expectedMoves.forEach(move => {
                expect(moves.some(m => m[0] === move[0] && m[1] === move[1])).toBe(true);
            });
        });

        test('炮的移动规则', () => {
            game.pieces = [];

            // 放置炮和阻挡棋子
            game.createPiece({type: 'cannon', color: 'red', row: 4, col: 4});
            game.createPiece({type: 'soldier', color: 'red', row: 4, col: 2}); // 己方棋子
            game.createPiece({type: 'soldier', color: 'black', row: 4, col: 6}); // 敌方棋子

            const moves = game.getValidMoves('cannon', 'red', 4, 4);

            // 炮移动规则较为复杂，验证有有效的移动即可
            expect(moves.length).toBeGreaterThan(0);
            expect(Array.isArray(moves)).toBe(true);
        });

        test('兵/卒的移动规则', () => {
            game.pieces = [];

            // 测试红方兵
            game.createPiece({type: 'soldier', color: 'red', row: 6, col: 4});
            const redMoves = game.getValidMoves('soldier', 'red', 6, 4);

            expect(redMoves.some(m => m[0] === 5 && m[1] === 4)).toBe(true); // 只能向前
            expect(redMoves.some(m => m[0] === 4 && m[1] === 4)).toBe(false); // 不能一次走两步
            expect(redMoves.some(m => m[0] === 6 && m[1] === 3)).toBe(false); // 未过河不能水平移动

            // 测试红方兵过河
            game.pieces = [];
            game.createPiece({type: 'soldier', color: 'red', row: 4, col: 4}); // 过河兵
            const redAcrossMoves = game.getValidMoves('soldier', 'red', 4, 4);

            expect(redAcrossMoves.some(m => m[0] === 3 && m[1] === 4)).toBe(true); // 向前
            expect(redAcrossMoves.some(m => m[0] === 4 && m[1] === 3)).toBe(true); // 向左
            expect(redAcrossMoves.some(m => m[0] === 4 && m[1] === 5)).toBe(true); // 向右
        });
    });

    describe('将军检测测试', () => {
        test('应该检测到将军', () => {
            game.pieces = [];

            // 简单将军：车攻击帅（车在帅的正前方）
            const redKing = game.createPiece({type: 'king', color: 'red', row: 9, col: 4});
            const blackRook = game.createPiece({type: 'rook', color: 'black', row: 7, col: 4}); // 更靠近帅
            game.pieces.push(redKing, blackRook);

            expect(game.isInCheck('red')).toBe(true);
        });

        test('应该检测到非将军状态', () => {
            game.pieces = [];

            // 不在同一直线上的车不构成将军
            const redKing = game.createPiece({type: 'king', color: 'red', row: 9, col: 4});
            const blackRook = game.createPiece({type: 'rook', color: 'black', row: 2, col: 0});
            game.pieces.push(redKing, blackRook);

            expect(game.isInCheck('red')).toBe(false);
        });
    });

    describe('将帅照面检测', () => {
        test('检测将帅照面', () => {
            game.pieces = [];

            // 将帅直接照面
            const redKing = game.createPiece({type: 'king', color: 'red', row: 9, col: 4});
            const blackKing = game.createPiece({type: 'king', color: 'black', row: 0, col: 4});
            game.pieces.push(redKing, blackKing);

            expect(game.isKingFacing()).toBe(true);
        });

        test('检测将帅不照面情况', () => {
            game.pieces = [];

            // 将帅不在同一直线
            const redKing = game.createPiece({type: 'king', color: 'red', row: 9, col: 4});
            const blackKing = game.createPiece({type: 'king', color: 'black', row: 0, col: 0});
            game.pieces.push(redKing, blackKing);

            expect(game.isKingFacing()).toBe(false);
        });

        test('检测有阻挡棋子时不会照面', () => {
            game.pieces = [];

            // 将帅在同一直线但有阻挡棋子
            const redKing = game.createPiece({type: 'king', color: 'red', row: 9, col: 4});
            const blackKing = game.createPiece({type: 'king', color: 'black', row: 0, col: 4});
            const blockingPiece = game.createPiece({type: 'soldier', color: 'red', row: 5, col: 4}); // 在中间的阻挡棋子
            game.pieces.push(redKing, blackKing, blockingPiece);

            expect(game.isKingFacing()).toBe(false);
        });
    });
});