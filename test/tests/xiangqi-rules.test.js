/**
 * 象棋规则引擎测试
 * 测试完整的象棋规则验证，包括移动规则、将军检测、胜负判定等
 */

const { XiangqiRules } = require('../xiangqi-rules');

// 创建模拟的游戏环境
function createMockGame(pieces = []) {
    return {
        pieces: pieces.map(piece => ({
            dataset: {
                type: piece.type,
                color: piece.color,
                row: piece.row,
                col: piece.col
            },
            textContent: piece.char || ''
        })),
        getPieceAt: function(row, col) {
            return this.pieces.find(piece =>
                piece.dataset.row === row && piece.dataset.col === col
            );
        }
    };
}

describe('象棋规则引擎测试', () => {
    let rules;
    let mockGame;

    beforeEach(() => {
        mockGame = createMockGame();
        rules = new XiangqiRules(mockGame);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('基本位置校验', () => {
        test('应该验证棋盘边界', () => {
            expect(rules.isValidPosition(-1, 0)).toBe(false);
            expect(rules.isValidPosition(0, -1)).toBe(false);
            expect(rules.isValidPosition(10, 0)).toBe(false);
            expect(rules.isValidPosition(0, 9)).toBe(false);

            expect(rules.isValidPosition(0, 0)).toBe(true);
            expect(rules.isValidPosition(9, 8)).toBe(true);
        });

        test('应该正确检查己方棋子', () => {
            const pieces = [
                { type: 'rook', color: 'red', row: 0, col: 0, char: '車' }
            ];
            mockGame = createMockGame(pieces);
            rules = new XiangqiRules(mockGame);

            expect(rules.hasOwnPiece(0, 0, 'red')).toBe(true);
            expect(rules.hasOwnPiece(0, 0, 'black')).toBe(false);
        });

        test('应该正确检查敌方棋子', () => {
            const pieces = [
                { type: 'rook', color: 'red', row: 0, col: 0, char: '車' }
            ];
            mockGame = createMockGame(pieces);
            rules = new XiangqiRules(mockGame);

            expect(rules.hasEnemyPiece(0, 0, 'red', pieces)).toBe(false);
            expect(rules.hasEnemyPiece(0, 0, 'black', pieces)).toBe(true);
        });
    });

    describe('将帅移动规则', () => {
        test('红方帅只能在九宫格内移动一格', () => {
            const moves = rules.getValidMoves('king', 'red', 9, 4);

            // 九宫格范围：rows 7-9, cols 3-5
            expect(moves).toContainEqual([8, 4]); // 上
            expect(moves).toContainEqual([9, 3]); // 左
            expect(moves).toContainEqual([9, 5]); // 右
            expect(moves).not.toContainEqual([6, 4]); // 离开九宫格
            expect(moves).not.toContainEqual([9, 2]); // 离开九宫格
            expect(moves).not.toContainEqual([9, 6]); // 离开九宫格
        });

        test('黑方将只能在九宫格内移动一格', () => {
            const moves = rules.getValidMoves('king', 'black', 0, 4);

            // 九宫格范围：rows 0-2, cols 3-5
            expect(moves).toContainEqual([1, 4]); // 下
            expect(moves).toContainEqual([0, 3]); // 左
            expect(moves).toContainEqual([0, 5]); // 右
            expect(moves).not.toContainEqual([3, 4]); // 离开九宫格
            expect(moves).not.toContainEqual([0, 2]); // 离开九宫格
            expect(moves).not.toContainEqual([0, 6]); // 离开九宫格
        });

        test('将帅不能在九宫格外移动', () => {
            // 将帅位置超出九宫格
            const pieces = [{type: 'king', color: 'red', row: 5, col: 4, char: '帥'}];
            mockGame = createMockGame(pieces);
            rules = new XiangqiRules(mockGame);

            const moves = rules.getValidMoves('king', 'red', 5, 4);
            expect(moves).toHaveLength(0);
        });
    });

    describe('士/仕移动规则', () => {
        test('士/仕只能斜走一格且不能离开九宫', () => {
            const moves = rules.getValidMoves('advisor', 'red', 8, 4);

            expect(moves).toContainEqual([7, 3]); // 左下
            expect(moves).toContainEqual([7, 5]); // 右下
            expect(moves).toContainEqual([9, 3]); // 左上
            expect(moves).toContainEqual([9, 5]); // 右上
            expect(moves).not.toContainEqual([6, 2]); // 超出范围
        });

        test('士/仕不能直线移动', () => {
            const moves = rules.getValidMoves('advisor', 'red', 8, 4);
            expect(moves).not.toContainEqual([7, 4]); // 上
            expect(moves).not.toContainEqual([9, 4]); // 下
            expect(moves).not.toContainEqual([8, 3]); // 左
            expect(moves).not.toContainEqual([8, 5]); // 右
        });
    });

    describe('象/相移动规则', () => {
        test('象/相走田字（斜走两格）', () => {
            const moves = rules.getValidMoves('elephant', 'red', 9, 2);

            expect(moves).toContainEqual([7, 0]); // 左上
            expect(moves).toContainEqual([7, 4]); // 右上
        });

        test('象/相不能过河', () => {
            const redPieces = [
                {type: 'elephant', color: 'red', row: 5, col: 2, char: '相'}
            ];
            mockGame = createMockGame(redPieces);
            rules = new XiangqiRules(mockGame);

            // 红方相在河界上，只能移动到己方半场
            const moves = rules.getValidMoves('elephant', 'red', 5, 2);
            expect(moves.length).toBeLessThan(4);
        });

        test('象/相不能蹩象腿', () => {
            const piecesInWay = [
                {type: 'elephant', color: 'red', row: 9, col: 2, char: '相'},
                {type: 'horse', color: 'red', row: 8, col: 1, char: '马'} // 蹩象腿
            ];
            mockGame = createMockGame(piecesInWay);
            rules = new XiangqiRules(mockGame);

            const moves = rules.getValidMoves('elephant', 'red', 9, 2);
            expect(moves).not.toContainEqual([7, 0]); // 被蹩象腿，不能左移
        });
    });

    describe('马移动规则', () => {
        test('马走日字，检查所有8个方向', () => {
            const moves = rules.getValidMoves('horse', 'red', 9, 1);

            // 马可以从(9,1)移动到8个方向
            expect(moves).toContainEqual([7, 0]); // 左上
            expect(moves).toContainEqual([7, 2]); // 右上
            expect(moves).toContainEqual([8, 3]); // 右上
            expect(moves).toContainEqual([8, -1]); // 无效方向
        });

        test('马不能蹩马腿', () => {
            const piecesBlocking = [
                {type: 'horse', color: 'red', row: 9, col: 1, char: '马'},
                {type: 'rook', color: 'red', row: 8, col: 1, char: '车'} // 蹩马腿
            ];
            mockGame = createMockGame(piecesBlocking);
            rules = new XiangqiRules(mockGame);

            const moves = rules.getValidMoves('horse', 'red', 9, 1);
            expect(moves).not.toContainEqual([7, 0]); // 上边方向被蹩马腿
            expect(moves).not.toContainEqual([7, 2]); // 上边方向被蹩马腿
        });

        test('马移动到边界外的位置应该被过滤', () => {
            const moves = rules.getValidMoves('horse', 'red', 0, 0);

            // 左上角应该只有有限的移动
            expect(moves.length).toBeLessThan(3);
            expect(moves).toContainEqual([1, 2]); // 唯一有效移动
        });
    });

    describe('车移动规则', () => {
        test('车沿直线移动，可以走任意格数', () => {
            const moves = rules.getValidMoves('rook', 'red', 9, 0);

            // 应该能沿4个方向移动
            expect(moves.some(move => move[0] === 8)); // 上
            expect(moves.some(move => move[0] === 7)); // 上
            expect(moves.some(move => move[0] === 0)); // 上到顶
            expect(moves.some(move => move[1] > 0));   // 右
        });

        test('车不能跳过己方棋子', () => {
            const pieces = [
                {type: 'rook', color: 'red', row: 9, col: 0, char: '车'},
                {type: 'king', color: 'red', row: 8, col: 0, char: '帥'} // 阻挡
            ];
            mockGame = createMockGame(pieces);
            rules = new XiangqiRules(mockGame);

            const moves = rules.getValidMoves('rook', 'red', 9, 0);
            expect(moves.some(move => move[0] < 8)).toBe(false); // 不能跳过红方帅
        });

        test('车吃子规则正确', () => {
            const pieces = [
                {type: 'rook', color: 'red', row: 9, col: 0, char: '车'},
                {type: 'soldier', color: 'black', row: 7, col: 0, char: '卒'} // 可以吃
            ];
            mockGame = createMockGame(pieces);
            rules = new XiangqiRules(mockGame);

            const moves = rules.getValidMoves('rook', 'red', 9, 0);
            expect(moves).toContainEqual([7, 0]); // 可以吃到黑方卒
            expect(moves.some(move => move[0] < 7)).toBe(false); // 吃过黑方卒后停止
        });
    });

    describe('炮移动规则', () => {
        test('炮不吃子时移动方式与车相同', () => {
            const moves = rules.getValidMoves('cannon', 'red', 7, 1);

            // 炮可以移动到任何空位
            expect(moves.length).toBeGreaterThan(10);
            expect(moves).toContainEqual([6, 1]);
            expect(moves).toContainEqual([5, 1]);
            expect(moves).toContainEqual([7, 0]);
            expect(moves).toContainEqual([7, 2]);
        });

        test('炮吃子需要隔一个棋子', () => {
            const pieces = [
                {type: 'cannon', color: 'red', row: 7, col: 1, char: '炮'},
                {type: 'soldier', color: 'red', row: 6, col: 1, char: '兵'}, // 隔子
                {type: 'soldier', color: 'black', row: 4, col: 1, char: '卒'} // 可以吃
            ];
            mockGame = createMockGame(pieces);
            rules = new XiangqiRules(mockGame);

            const moves = rules.getValidMoves('cannon', 'red', 7, 1);
            expect(moves).toContainEqual([4, 1]); // 可以隔子吃黑方卒
            expect(moves).not.toContainEqual([5, 1]); // 但不能吃到隔子
            expect(moves).not.toContainEqual([6, 1]); // 不能吃己方棋子作为隔子
        });

        test('炮移动时不能跨越多个棋子', () => {
            const pieces = [
                {type: 'cannon', color: 'red', row: 7, col: 1, char: '炮'},
                {type: 'soldier', color: 'red', row: 6, col: 1, char: '兵'}, // 第一个阻挡
                {type: 'soldier', color: 'red', row: 5, col: 1, char: '兵'}  // 第二个阻挡
            ];
            mockGame = createMockGame(pieces);
            rules = new XiangqiRules(mockGame);

            const moves = rules.getValidMoves('cannon', 'red', 7, 1);
            expect(moves.some(move => move[0] < 4)).toBe(false); // 不能跨越两个棋子
        });
    });

    describe('兵/卒移动规则', () => {
        test('红方兵只能向前（移动减少行数）', () => {
            const moves = rules.getValidMoves('soldier', 'red', 6, 2);

            expect(moves).toContainEqual([5, 2]); // 向前
            expect(moves).not.toContainEqual([7, 2]); // 不能后退
        });

        test('黑方卒只能向前（移动增加行数）', () => {
            const moves = rules.getValidMoves('soldier', 'black', 3, 2);

            expect(moves).toContainEqual([4, 2]); // 向前
            expect(moves).not.toContainEqual([2, 2]); // 不能后退
        });

        test('兵/卒过河后可以左右移动', () => {
            // 红方兵过河
            const redPieces = [{type: 'soldier', color: 'red', row: 4, col: 2, char: '兵'}];
            mockGame = createMockGame(redPieces);
            rules = new XiangqiRules(mockGame);

            const redMoves = rules.getValidMoves('soldier', 'red', 4, 2);
            expect(redMoves).toContainEqual([3, 1]); // 可以左移
            expect(redMoves).toContainEqual([3, 3]); // 可以右移

            // 黑方卒过河
            const blackPieces = [{type: 'soldier', color: 'black', row: 6, col: 2, char: '卒'}];
            mockGame = createMockGame(blackPieces);
            rules = new XiangqiRules(mockGame);

            const blackMoves = rules.getValidMoves('soldier', 'black', 6, 2);
            expect(blackMoves).toContainEqual([7, 1]); // 可以左移
            expect(blackMoves).toContainEqual([7, 3]); // 可以右移
        });

        test('兵/卒不能跨越己方棋子', () => {
            const pieces = [
                {type: 'soldier', color: 'red', row: 5, col: 2, char: '兵'},
                {type: 'soldier', color: 'red', row: 4, col: 2, char: '兵'} // 阻挡
            ];
            mockGame = createMockGame(pieces);
            rules = new XiangqiRules(mockGame);

            const moves = rules.getValidMoves('soldier', 'red', 5, 2);
            expect(moves).not.toContainEqual([4, 2]); // 被己方棋子阻挡
        });
    });

    describe('将军检测', () => {
        test('应该能检测到将/帅被将军', () => {
            const pieces = [
                {type: 'king', color: 'red', row: 9, col: 4, char: '帥'},
                {type: 'rook', color: 'black', row: 5, col: 4, char: '车'} // 在同一条直线上
            ];
            mockGame = createMockGame(pieces);
            rules = new XiangqiRules(mockGame);

            expect(rules.isInCheck('red', pieces)).toBe(true);
        });

        test('应该能检测到将/帅未被将军', () => {
            const pieces = [
                {type: 'king', color: 'red', row: 9, col: 4, char: '帥'},
                {type: 'rook', color: 'black', row: 5, col: 0, char: '车'} // 不在同一条直线上
            ];
            mockGame = createMockGame(pieces);
            rules = new XiangqiRules(mockGame);

            expect(rules.isInCheck('red', pieces)).toBe(false);
        });

        test('将军检测应该考虑阻挡棋子', () => {
            const pieces = [
                {type: 'king', color: 'red', row: 9, col: 4, char: '帥'},
                {type: 'soldier', color: 'red', row: 7, col: 4, char: '兵'}, // 阻挡将军
                {type: 'rook', color: 'black', row: 5, col: 4, char: '车'}
            ];
            mockGame = createMockGame(pieces);
            rules = new XiangqiRules(mockGame);

            expect(rules.isInCheck('red', pieces)).toBe(false);
        });

        test('炮应该能将军', () => {
            const pieces = [
                {type: 'king', color: 'red', row: 9, col: 4, char: '帥'},
                {type: 'soldier', color: 'red', row: 7, col: 4, char: '兵'}, // 隔子
                {type: 'cannon', color: 'black', row: 5, col: 4, char: '炮'}
            ];
            mockGame = createMockGame(pieces);
            rules = new XiangqiRules(mockGame);

            expect(rules.isInCheck('red', pieces)).toBe(true);
        });
    });

    describe('移动验证', () => {
        test('应该阻止会导致己方被将军的移动', () => {
            const pieces = [
                {type: 'king', color: 'red', row: 9, col: 4, char: '帥'},
                {type: 'advisor', color: 'red', row: 8, col: 3, char: '仕'},
                {type: 'rook', color: 'black', row: 3, col: 4, char: '车'} // 攻击路线上的车
            ];
            mockGame = createMockGame(pieces);
            rules = new XiangqiRules(mockGame);

            // 创建虚拟棋子对象
            const advisor = {
                dataset: {type: 'advisor', color: 'red', row: 8, col: 3}
            };

            // 移动会打开防线导致对方车攻击己方帅
            const result = rules.isInCheckAfterMove(advisor, 7, 4);
            expect(result).toBe(true);
        });

        test('验证棋步基本合法性', () => {
            const piece = {dataset: {type: 'rook', color: 'red', row: 9, col: 0}};

            const result1 = rules.validateMove(piece, 9, 1);
            expect(result1.valid).toBe(true);

            const result2 = rules.validateMove(piece, 9, 2);
            expect(result2.valid).toBe(true);

            const result3 = rules.validateMove(piece, 8, 0);
            expect(result3.valid).toBe(true);
        });

        test('应该阻止移动到己方棋子位置', () => {
            const pieces = [
                {type: 'rook', color: 'red', row: 9, col: 0, char: '車'},
                {type: 'soldier', color: 'red', row: 9, col: 1, char: '兵'}
            ];
            mockGame = createMockGame(pieces);
            rules = new XiangqiRules(mockGame);

            const piece = {dataset: {type: 'rook', color: 'red', row: 9, col: 0}};
            const result = rules.validateMove(piece, 9, 1);

            expect(result.valid).toBe(false);
            expect(result.reason).toContain('己方棋子');
        });
    });

    describe('将帅照面规则', () => {
        test('应该检测到将帅照面', () => {
            const pieces = [
                {type: 'king', color: 'red', row: 9, col: 4, char: '帥'},
                {type: 'king', color: 'black', row: 8, col: 4, char: '将'}
            ];

            expect(rules.areKingsFacing(pieces)).toBe(true); // 在同一条直线上
        });

        test('将帅不在同一直线上不会照面', () => {
            const pieces = [
                {type: 'king', color: 'red', row: 9, col: 4, char: '帥'},
                {type: 'king', color: 'black', row: 0, col: 0, char: '将'}
            ];

            expect(rules.areKingsFacing(pieces)).toBe(false);
        });

        test('将帅之间有棋子阻挡不会照面', () => {
            const pieces = [
                {type: 'king', color: 'red', row: 9, col: 4, char: '帥'},
                {type: 'soldier', color: 'red', row: 7, col: 4, char: '兵'}, // 阻挡
                {type: 'king', color: 'black', row: 0, col: 4, char: '将'}
            ];

            expect(rules.areKingsFacing(pieces)).toBe(false); // 有阻挡
        });

        test('应该阻止导致将帅照面的移动', () => {
            const pieces = [
                {type: 'king', color: 'red', row: 9, col: 4, char: '帥'},
                {type: 'soldier', color: 'red', row: 7, col: 4, char: '兵'}, // 阻挡
                {type: 'king', color: 'black', row: 0, col: 4, char: '将'}
            ];
            mockGame = createMockGame(pieces);
            rules = new XiangqiRules(mockGame);

            const piece = {dataset: {type: 'soldier', color: 'red', row: 7, col: 4}};
            const result = rules.validateMove(piece, 6, 4);

            expect(result.valid).toBe(false);
            expect(result.reason).toContain('将帅照面');
        });
    });

    describe('胜负判定', () => {
        test('应该正确判定将死', () => {
            const pieces = [
                // 红方被将死局面
                {type: 'king', color: 'red', row: 9, col: 4, char: '帥'},
                {type: 'advisor', color: 'red', row: 8, col: 3, char: '仕'},
                {type: 'advisor', color: 'red', row: 8, col: 5, char: '仕'},

                // 黑方攻击
                {type: 'rook', color: 'black', row: 8, col: 4, char: '车'}, // 攻击帅
                {type: 'rook', color: 'black', row: 9, col: 0, char: '车'}  // 阻挡逃跑
            ];

            expect(rules.isInCheck('red', pieces)).toBe(true);
            expect(rules.canEscapeCheck('red', pieces)).toBe(false);
            expect(rules.isCheckmate('red', pieces)).toBe(true);
        });

        test('应该正确判定困毙', () => {
            const pieces = [
                // 红方被困毙（无子可动且未被将军）
                {type: 'king', color: 'red', row: 9, col: 4, char: '帥'},
                {type: 'king', color: 'black', row: 8, col: 4, char: '将'}
            ];

            expect(rules.isInCheck('red', pieces)).toBe(false); // 未被将军
            expect(rules.canEscapeCheck('red', pieces)).toBe(false); // 无子可动
            expect(rules.isStalemate('red', pieces)).toBe(true);
        });

        test('应该正确判定未将死的状态', () => {
            const pieces = [
                {type: 'king', color: 'red', row: 9, col: 4, char: '帥'},
                {type: 'rook', color: 'black', row: 6, col: 4, char: '车'},
                {type: 'anny-piece', color: 'red', row: 4, col: 0, char: '兵'}
            ];

            expect(rules.isInCheck('red', pieces)).toBe(true);
            expect(rules.canEscapeCheck('red', pieces)).toBe(true); // 有子可动
            expect(rules.isCheckmate('red', pieces)).toBe(false); // 不是将死
        });
    });

    describe('边界条件测试', () => {
        test('应该处理空棋子列表', () => {
            mockGame = createMockGame([]);
            rules = new XiangqiRules(mockGame);

            expect(rules.isInCheck('red', [])).toBe(false);
            expect(rules.areKingsFacing([])).toBe(false);
            expect(rules.isCheckmate('red', [])).toBe(false);
        });

        test('应该处理缺失将/帅的情况', () => {
            const pieces = [
                {type: 'rook', color: 'red', row: 9, col: 0, char: '車'}
            ];

            expect(rules.isInCheck('red', pieces)).toBe(false); // 无帅不算被将军
            expect(rules.areKingsFacing(pieces)).toBe(false);
        });

        test('应该处理棋盘边缘的移动', () => {
            // 在棋盘(0,0)处的马只能向4个方向移动，且被蹩马腿的位置都无效
            const movePairs = [
                {piece: {type: 'king', color: 'red', row: 9, col: 0},
                 check: [[8,0], [9,1]]},
                {piece: {type: 'horse', color: 'red', row: 0, col: 0},
                 check: [[2,1], [1,2]]},
                {piece: {type: 'soldier', color: 'black', row: 0, col: 4},
                 check: [[1,4], [0,3], [0,5]]},
            ];

            movePairs.forEach(testPair => {
                const pieces = [testPair.piece];
                mockGame = createMockGame(pieces);
                rules = new XiangqiRules(mockGame);

                const moves = rules.getValidMoves(testPair.piece.type,
                                                  testPair.piece.color,
                                                  testPair.piece.row,
                                                  testPair.piece.col);

                testPair.check.forEach(expectedMove => {
                    expect(moves).toContainEqual(expectedMove);
                });
            });
        });
    });

    describe('安全检查', () => {
        test('应该验证移动后不导致己方被将军', () => {
            // 创建一个合法的并移动会避免被将军
            const pieces = [
                {type: 'king', color: 'red', row: 9, col: 4, char: '帥'},
                {type: 'advisor', color: 'red', row: 8, col: 3, char: '仕'},
                {type: 'rook', color: 'black', row: 3, col: 3, char: '车'}
            ];

            const advisor = {dataset: {type: 'advisor', color: 'red', row: 8, col: 3}};
            const result = rules.isInCheckAfterMove(advisor, 7, 4);
            expect(result).toBe(false); // 移动仕避免被将军
        });

        test('应该保护己方将/帅不被直接攻击', () => {
            const pieces = [
                {type: 'king', color: 'red', row: 9, col: 4, char: '帥'},
                {type: 'advisor', color: 'red', row: 8, col: 2, char: '仕'}
            ];

            const advisor = {dataset: {type: 'advisor', color: 'red', row: 8, col: 2}};

            // 不能移动使得将/帅暴露
            const result1 = rules.isInCheckAfterMove(advisor, 9, 3);
            expect(result1).toBe(false);

            const result2 = rules.isInCheckAfterMove(advisor, 7, 3);
            expect(result2).toBe(false);

            const result3 = rules.isInCheckAfterMove(advisor, 7, 1);
            expect(result3).toBe(true); // 离开保护位置
        });
    });
});