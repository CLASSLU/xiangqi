/**
 * 棋谱解析器专项测试
 * 测试ChessNotationParser的完整功能
 */

// 模拟DOM环境
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

// 创建虚拟DOM环境
const dom = new JSDOM(`<!DOCTYPE html><html><body><div class="board"></div></body></html>`);
global.document = dom.window.document;
global.window = dom.window;

// 导入棋谱解析器
const ChessNotationParser = require('../../main/chess-notation-parser');

describe('棋谱解析器功能测试', () => {
    let parser;

    beforeEach(() => {
        parser = new ChessNotationParser();
    });

    describe('基础坐标系统测试', () => {
        test('红方路码转换正确', () => {
            // 红方：路码1-9对应列8-0（从右到左）
            expect(parser.roadToColumn('red', 1)).toBe(8);  // 第1路对应列8
            expect(parser.roadToColumn('red', 5)).toBe(4);  // 第5路对应列4
            expect(parser.roadToColumn('red', 9)).toBe(0);  // 第9路对应列0

            // 反向转换测试
            expect(parser.columnToRoad('red', 8)).toBe(1);
            expect(parser.columnToRoad('red', 4)).toBe(5);
            expect(parser.columnToRoad('red', 0)).toBe(9);
        });

        test('黑方路码转换正确', () => {
            // 黑方：路码1-9对应列0-8（从左到右）
            expect(parser.roadToColumn('black', 1)).toBe(0);  // 第1路对应列0
            expect(parser.roadToColumn('black', 5)).toBe(4);  // 第5路对应列4
            expect(parser.roadToColumn('black', 9)).toBe(8);  // 第9路对应列8

            // 反向转换测试
            expect(parser.columnToRoad('black', 0)).toBe(1);
            expect(parser.columnToRoad('black', 4)).toBe(5);
            expect(parser.columnToRoad('black', 8)).toBe(9);
        });

        test('红黑双方坐标对称', () => {
            // 红红第N路应该对应黑方第(10-N)路，但都在同一列
            for (let road = 1; road <= 9; road++) {
                const redCol = parser.roadToColumn('red', road);
                const blackCol = parser.roadToColumn('black', 10 - road);
                expect(redCol).toBe(blackCol);
            }
        });

        test('无效路码处理', () => {
            expect(() => parser.roadToColumn('red', 0)).toThrow('无效路码');
            expect(() => parser.roadToColumn('red', 10)).toThrow('无效路码');
            expect(() => parser.roadToColumn('red', 15)).toThrow('无效路码');
            expect(() => parser.roadToColumn('invalid', 1)).toThrow('无效颜色');
        });
    });

    describe('单个棋谱解析测试', () => {
        let board;

        beforeEach(() => {
            board = parser.createInitialBoard();
        });

        test('炮二平五解析正确', () => {
            const result = parser.parseNotation('炮二平五', 'red', board);

            expect(result.pieceType).toBe('cannon');
            expect(result.fromPos).toEqual({row: 7, col: 7});
            expect(result.toPos).toEqual({row: 7, col: 4});
            expect(result.action).toBe('平');
        });

        test('马8进7解析正确', () => {
            const result = parser.parseNotation('马8进7', 'black', board);

            expect(result.pieceType).toBe('horse');
            expect(result.fromPos).toEqual({row: 0, col: 7});
            expect(result.toPos).toEqual({row: 2, col: 6});
            expect(result.action).toBe('进');
        });

        test('车一平二解析正确', () => {
            const result = parser.parseNotation('车一平二', 'red', board);

            expect(result.pieceType).toBe('rook');
            expect(result.fromPos).toEqual({row: 9, col: 8});
            expect(result.toPos).toEqual({row: 9, col: 7});
            expect(result.action).toBe('平');
        });

        test('兵七进一解析正确', () => {
            const result = parser.parseNotation('兵七进一', 'red', board);

            expect(result.pieceType).toBe('soldier');
            // 兵七进一：第7路的兵，红方第7路对应列2
            expect(result.fromPos).toEqual({row: 6, col: 2});
            expect(result.toPos).toEqual({row: 5, col: 2});
            expect(result.action).toBe('进');
        });

        test('卒3进1解析正确', () => {
            const result = parser.parseNotation('卒3进一', 'black', board);

            expect(result.pieceType).toBe('soldier');
            expect(result.fromPos).toEqual({row: 3, col: 2});
            expect(result.toPos).toEqual({row: 4, col: 2});
            expect(result.action).toBe('进');
        });

        test('无效棋谱格式处理', () => {
            expect(() => parser.parseNotation('无效棋谱', 'red', board)).toThrow('无效棋谱格式');
            expect(() => parser.parseNotation('炮十平五', 'red', board)).toThrow('无效路码');
            expect(() => parser.parseNotation('马二进三', 'blue', board)).toThrow('无效颜色');
        });
    });

    describe('完整棋局解析测试', () => {
        test('中炮对屏风马解析', () => {
            const notations = [
                '炮二平五', '马8进7', '马二进三', '马2进3', '车一平二', '车9平8'
            ];

            const parsedMoves = parser.parseNotationSequence(notations);

            expect(parsedMoves).toHaveLength(6);

            // 验证第一步
            expect(parsedMoves[0]).toEqual({
                color: 'red',
                pieceType: 'cannon',
                fromPos: [7, 7],
                toPos: [7, 4],
                notation: '炮二平五'
            });

            // 验证第二步
            expect(parsedMoves[1]).toEqual({
                color: 'black',
                pieceType: 'horse',
                fromPos: [0, 7],
                toPos: [2, 6],
                notation: '马8进7'
            });

            // 验证颜色交替
            expect(parsedMoves[0].color).toBe('red');
            expect(parsedMoves[1].color).toBe('black');
            expect(parsedMoves[2].color).toBe('red');
        });

        test('顺炮布局解析', () => {
            const notations = [
                '炮二平五', '炮8平5', '马二进三', '马8进7', '车一平二', '车9进1'
            ];

            const parsedMoves = parser.parseNotationSequence(notations);

            expect(parsedMoves).toHaveLength(6);

            // 验证黑方炮移动
            expect(parsedMoves[1]).toEqual({
                color: 'black',
                pieceType: 'cannon',
                fromPos: [2, 7],
                toPos: [2, 4],
                notation: '炮8平5'
            });
        });
    });

    describe('棋谱验证功能测试', () => {
        test('合法棋谱验证通过', () => {
            const parsedMoves = [
                {
                    color: 'red',
                    pieceType: 'cannon',
                    fromPos: [7, 7],
                    toPos: [7, 4],
                    notation: '炮二平五'
                },
                {
                    color: 'black',
                    pieceType: 'horse',
                    fromPos: [0, 7],
                    toPos: [2, 6],
                    notation: '马8进7'
                }
            ];

            const validation = parser.validateNotation(parsedMoves);
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        test('非法移动被检测到', () => {
            // 创建一个非法的移动：车斜着走
            const parsedMoves = [
                {
                    color: 'red',
                    pieceType: 'rook',
                    fromPos: [9, 0],
                    toPos: [8, 1],  // 车不能斜着走
                    notation: '车斜着走'
                }
            ];

            const validation = parser.validateNotation(parsedMoves);
            expect(validation.valid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
            expect(validation.errors[0]).toContain('非法移动');
        });

        test('超出棋盘的移动被检测到', () => {
            const parsedMoves = [
                {
                    color: 'red',
                    pieceType: 'soldier',
                    fromPos: [6, 0],
                    toPos: [-1, 0],  // 超出棋盘
                    notation: '兵出界'
                }
            ];

            const validation = parser.validateNotation(parsedMoves);
            expect(validation.valid).toBe(false);
            expect(validation.errors[0]).toContain('非法移动');
        });
    });

    describe('中文数字解析测试', () => {
        test('中文数字转换正确', () => {
            expect(parser.parseChineseNumber('一')).toBe(1);
            expect(parser.parseChineseNumber('二')).toBe(2);
            expect(parser.parseChineseNumber('五')).toBe(5);
            expect(parser.parseChineseNumber('九')).toBe(9);
            expect(parser.parseChineseNumber('十')).toBe(10);
        });

        test('阿拉伯数字解析正确', () => {
            expect(parser.parseChineseNumber('1')).toBe(1);
            expect(parser.parseChineseNumber('5')).toBe(5);
            expect(parser.parseChineseNumber('10')).toBe(10);
        });

        test('混合使用中文和阿拉伯数字', () => {
            const notations1 = ['炮二平五', '马8进7'];
            const notations2 = ['炮2平5', '马八进7'];

            const parsed1 = parser.parseNotationSequence(notations1);
            const parsed2 = parser.parseNotationSequence(notations2);

            // 两种记谱法应该解析出相同的结果
            expect(parsed1[0].fromPos).toEqual(parsed2[0].fromPos);
            expect(parsed1[0].toPos).toEqual(parsed2[0].toPos);
            expect(parsed1[1].fromPos).toEqual(parsed2[1].fromPos);
            expect(parsed1[1].toPos).toEqual(parsed2[1].toPos);
        });
    });

    describe('棋子类型映射测试', () => {
        test('常用棋子字符都能识别', () => {
            const board = parser.createInitialBoard();

            // 测试常用棋子
            const result1 = parser.parseNotation('炮二平五', 'red', board);
            expect(result1.pieceType).toBe('cannon');

            const result2 = parser.parseNotation('马二进三', 'red', board);
            expect(result2.pieceType).toBe('horse');

            const result3 = parser.parseNotation('车一平二', 'red', board);
            expect(result3.pieceType).toBe('rook');

            const result4 = parser.parseNotation('相三进五', 'red', board);
            expect(result4.pieceType).toBe('elephant');

            const result5 = parser.parseNotation('仕四进五', 'red', board);
            expect(result5.pieceType).toBe('advisor');
        });

        test('所有棋子类型都能正确映射', () => {
            const pieceTypes = Object.keys(parser.pieceTypeMap);
            expect(pieceTypes).toContain('车');
            expect(pieceTypes).toContain('马');
            expect(pieceTypes).toContain('炮');
            expect(pieceTypes).toContain('相');
            expect(pieceTypes).toContain('仕');
            expect(pieceTypes).toContain('帅');
            expect(pieceTypes).toContain('兵');
        });
    });

    describe('错误处理和边界情况测试', () => {
        test('空棋谱处理', () => {
            const parsedMoves = parser.parseNotationSequence([]);
            expect(parsedMoves).toHaveLength(0);
        });

        test('部分错误的棋谱序列', () => {
            const notations = [
                '炮二平五',    // 合法
                '无效棋谱',    // 非法
                '马8进7'      // 合法
            ];

            // 应该在遇到错误时抛出异常
            expect(() => parser.parseNotationSequence(notations)).toThrow();
        });

        test('棋盘边界检查', () => {
            const board = parser.createInitialBoard();

            // 测试超出边界的情况
            expect(() => parser.parseNotation('车一平十', 'red', board)).toThrow();
            expect(() => parser.parseNotation('马一进十', 'red', board)).toThrow();
        });

        test('起始位置没有棋子', () => {
            const board = parser.createInitialBoard();

            // 清空某个位置
            board[7][7] = null;

            // 尝试移动这个位置的棋子应该失败
            expect(() => parser.parseNotation('炮二平五', 'red', board)).toThrow('未找到棋子');
        });
    });
});