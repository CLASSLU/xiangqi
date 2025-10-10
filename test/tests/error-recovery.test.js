/**
 * 错误恢复功能测试套件
 * 测试 ChessNotationParserV2 的 NotationParseError 和错误恢复机制
 */

const { ChessNotationParserV2, NotationParseError } = require('../../main/chess-notation-parser-v2.js');

describe('NotationParseError 错误类测试', () => {
    let parser;

    beforeEach(() => {
        parser = new ChessNotationParserV2();
    });

    test('NotationParseError 基本属性', () => {
        const error = new NotationParseError('测试错误', '炮二平五', {type: 'test'});

        expect(error.name).toBe('NotationParseError');
        expect(error.message).toBe('测试错误');
        expect(error.notation).toBe('炮二平五');
        expect(error.context.type).toBe('test');
        expect(error.timestamp).toBeDefined();
    });

    test('NotationParseError.getDetails() 方法', () => {
        const error = new NotationParseError('测试错误', '炮二平五', {type: 'test'});
        const details = error.getDetails();

        expect(details.name).toBe('NotationParseError');
        expect(details.message).toBe('测试错误');
        expect(details.notation).toBe('炮二平五');
        expect(details.context.type).toBe('test');
        expect(details.timestamp).toBeDefined();
        expect(details.stack).toBeDefined();
    });

    test('NotationParseError.getUserMessage() 方法', () => {
        const errorWithNotation = new NotationParseError('无效格式', '炮二平五');
        const errorWithoutNotation = new NotationParseError('无效格式');

        expect(errorWithNotation.getUserMessage()).toBe('棋谱 "炮二平五" 解析失败：无效格式');
        expect(errorWithoutNotation.getUserMessage()).toBe('无效格式');
    });

    test('NotationParseError.isErrorType() 方法', () => {
        const error = new NotationParseError('测试错误', '炮二平五', {type: 'invalid_road'});

        expect(error.isErrorType('invalid_road')).toBe(true);
        expect(error.isErrorType('other_type')).toBe(false);
        expect(error.isErrorType()).toBe(false);
    });
});

describe('错误恢复功能测试', () => {
    let parser;
    let testBoard;

    beforeEach(() => {
        parser = new ChessNotationParserV2();
        testBoard = createTestBoard();
    });

    function createTestBoard() {
        const board = Array(10).fill(null).map(() => Array(9).fill(null));

        // 设置完整的红方棋局
        board[9][0] = {type: 'rook', color: 'red'};    // 车九
        board[9][1] = {type: 'horse', color: 'red'};    // 马八
        board[9][2] = {type: 'elephant', color: 'red'}; // 象七
        board[9][3] = {type: 'advisor', color: 'red'};  // 士六
        board[9][4] = {type: 'king', color: 'red'};     // 帅五
        board[9][5] = {type: 'advisor', color: 'red'};  // 士四
        board[9][6] = {type: 'elephant', color: 'red'}; // 象三
        board[9][7] = {type: 'horse', color: 'red'};    // 马二
        board[9][8] = {type: 'rook', color: 'red'};    // 车一

        board[7][1] = {type: 'cannon', color: 'red'};   // 炮八
        board[7][7] = {type: 'cannon', color: 'red'};   // 炮二

        board[6][0] = {type: 'soldier', color: 'red'};  // 兵九
        board[6][2] = {type: 'soldier', color: 'red'};  // 兵七
        board[6][4] = {type: 'soldier', color: 'red'};  // 兵五
        board[6][6] = {type: 'soldier', color: 'red'};  // 兵三
        board[6][8] = {type: 'soldier', color: 'red'};  // 兵一

        return board;
    }

    test('全角数字恢复', () => {
        const result = parser.parseNotation('炮８平五', 'red', testBoard);

        expect(result.pieceType).toBe('cannon');
        expect(result.fromPos).toEqual({row: 7, col: 1});
        expect(result.action).toBe('平');
        expect(result.notation).toBe('炮８平五');
    });

    test('标准棋谱解析（控制测试）', () => {
        const result = parser.parseNotation('马八进七', 'red', testBoard);

        expect(result.pieceType).toBe('horse');
        expect(result.fromPos).toEqual({row: 9, col: 1});  // 马八路对应col=1
        expect(result.action).toBe('进');
        expect(result.notation).toBe('马八进七');
    });

    test('错误类型验证 - 无效棋谱格式', () => {
        try {
            parser.parseNotation('无效格式', 'red', testBoard);
            fail('应该抛出错误');
        } catch (error) {
            expect(error).toBeInstanceOf(NotationParseError);
            expect(error.context.type).toBe('recovery_failed');
            expect(error.message).toContain('已尝试 4 种恢复策略');
        }
    });

    test('递归保护机制', () => {
        // 测试在恢复过程中的递归保护
        const spy = jest.spyOn(console, 'log').mockImplementation(() => {});

        // 触发错误恢复
        try {
            parser.parseNotation('完全无效的棋谱格式', 'red', testBoard);
        } catch (error) {
            // 验证没有无限递归
            expect(error.context.type).toBe('recovery_failed');
        }

        spy.mockRestore();
    });

    test('错误恢复状态清理', () => {
        // 第一次失败
        try {
            parser.parseNotation('无效棋谱', 'red', testBoard);
        } catch (error) {
            expect(error).toBeInstanceOf(NotationParseError);
        }

        // 第二次应该正常工作，没有残留状态
        const result = parser.parseNotation('马八进七', 'red', testBoard);
        expect(result.pieceType).toBe('horse');
    });
});

describe('性能监控测试', () => {
    let parser;
    let testBoard;

    beforeEach(() => {
        parser = new ChessNotationParserV2();
        testBoard = createTestBoard();
    });

    function createTestBoard() {
        const board = Array(10).fill(null).map(() => Array(9).fill(null));

        // 设置完整的红方棋局
        board[9][0] = {type: 'rook', color: 'red'};
        board[9][7] = {type: 'horse', color: 'red'};
        board[7][7] = {type: 'cannon', color: 'red'};
        board[7][1] = {type: 'cannon', color: 'red'};
        board[6][4] = {type: 'soldier', color: 'red'};
        board[9][8] = {type: 'rook', color: 'red'};
        board[9][1] = {type: 'horse', color: 'red'};

        return board;
    }

    test('性能指标收集', () => {
        // 执行几次解析
        parser.parseNotation('炮二平五', 'red', testBoard);
        try {
            parser.parseNotation('无效棋谱', 'red', testBoard);
        } catch (error) {
            // 忽略错误，只关心指标
        }

        const metrics = parser.getPerformanceMetrics();

        expect(metrics.totalParses).toBeGreaterThanOrEqual(2);
        expect(metrics.errors).toBeGreaterThanOrEqual(1);
        expect(metrics.successRate).toBeDefined();
        expect(metrics.cacheHitRate).toBeDefined();
        expect(metrics.averageTime).toBeDefined();
    });

    test('缓存功能测试', () => {
        const notation = '炮二平五';
        const color = 'red';

        // 第一次解析
        const result1 = parser.parseNotation(notation, color, testBoard);

        // 第二次相同解析应该使用缓存
        const result2 = parser.parseNotation(notation, color, testBoard);

        expect(result1).toEqual(result2);

        const metrics = parser.getPerformanceMetrics();
        expect(metrics.cacheHits).toBeGreaterThanOrEqual(1);
    });
});