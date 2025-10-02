/**
 * 棋谱解析器测试
 */

const ChessNotationParser = require('../../main/chess-notation-parser');

describe('ChessNotationParser 测试', () => {
    let parser;

    beforeEach(() => {
        parser = new ChessNotationParser();
    });

    describe('基础坐标转换测试', () => {
        test('红方路码转换为列坐标', () => {
            expect(parser.roadToColumn('red', 1)).toBe(8); // 红方1路是右边第8列
            expect(parser.roadToColumn('red', 5)).toBe(4);
            expect(parser.roadToColumn('red', 9)).toBe(0); // 红方9路是左边第0列
        });

        test('黑方路码转换为列坐标', () => {
            expect(parser.roadToColumn('black', 1)).toBe(0);
            expect(parser.roadToColumn('black', 5)).toBe(4);
            expect(parser.roadToColumn('black', 9)).toBe(8);
        });

        test('列坐标转换为红方路码', () => {
            expect(parser.columnToRoad('red', 8)).toBe(1); // 红方右边第8列是1路
            expect(parser.columnToRoad('red', 4)).toBe(5);
            expect(parser.columnToRoad('red', 0)).toBe(9); // 红方左边第0列是9路
        });

        test('列坐标转换为黑方路码', () => {
            expect(parser.columnToRoad('black', 0)).toBe(1);
            expect(parser.columnToRoad('black', 4)).toBe(5);
            expect(parser.columnToRoad('black', 8)).toBe(9);
        });
    });

    describe('棋谱解析测试', () => {
        test('解析红方移动: 炮二平五', () => {
            const board = parser.createInitialBoard();
            const result = parser.parseNotation('炮二平五', 'red', board);

            expect(result.pieceType).toBe('cannon');
            expect(result.fromPos).toEqual({row: 7, col: 7}); // 红方炮2路对应第7列（右数第2路）
            expect(result.toPos).toEqual({row: 7, col: 4});
            expect(result.action).toBe('平');
        });

        test('解析黑方移动: 马8进7', () => {
            const board = parser.createInitialBoard();
            const result = parser.parseNotation('马8进7', 'black', board);

            expect(result.pieceType).toBe('horse');
            expect(result.fromPos).toEqual({row: 0, col: 7});
            expect(result.toPos).toEqual({row: 2, col: 6});
            expect(result.action).toBe('进');
        });

        test('解析兵的移动: 兵七进一', () => {
            const board = parser.createInitialBoard();
            const result = parser.parseNotation('兵七进一', 'red', board);

            expect(result.pieceType).toBe('soldier');
            expect(result.fromPos).toEqual({row: 6, col: 2}); // 红方兵7路对应第2列（右数第7路）
            expect(result.toPos).toEqual({row: 5, col: 2});
            expect(result.action).toBe('进');
        });

        test('解析复杂移动: 车一平二', () => {
            const board = parser.createInitialBoard();
            const result = parser.parseNotation('车一平二', 'red', board);

            expect(result.pieceType).toBe('rook');
            expect(result.fromPos).toEqual({row: 9, col: 8}); // 红方车1路对应第8列（最右边）
            expect(result.toPos).toEqual({row: 9, col: 7});
            expect(result.action).toBe('平');
        });
    });

    describe('完整序列解析测试', () => {
        test('中炮对屏风马序列解析', () => {
            const standardNotations = [
                "炮二平五",
                "马8进7",
                "马二进三",
                "马2进3",
                "车一平二",
                "车9平8",
                "兵七进一",
                "卒7进1"
            ];

            const parsedMoves = parser.parseNotationSequence(standardNotations);

            expect(parsedMoves).toHaveLength(8);
            expect(parsedMoves[0].notation).toBe('炮二平五');
            expect(parsedMoves[0].color).toBe('red');
            expect(parsedMoves[0].pieceType).toBe('cannon');

            expect(parsedMoves[1].notation).toBe('马8进7');
            expect(parsedMoves[1].color).toBe('black');
            expect(parsedMoves[1].pieceType).toBe('horse');

            expect(parsedMoves[7].notation).toBe('卒7进1');
            expect(parsedMoves[7].color).toBe('black');
            expect(parsedMoves[7].pieceType).toBe('soldier');
        });

        test('解析序列验证', () => {
            const standardNotations = [
                "炮二平五",
                "马8进7",
                "马二进三"
            ];

            const parsedMoves = parser.parseNotationSequence(standardNotations);
            const validation = parser.validateNotation(parsedMoves);

            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });
    });

    describe('错误处理测试', () => {
        test('无效棋谱格式', () => {
            const board = parser.createInitialBoard();
            expect(() => {
                parser.parseNotation('无效棋谱', 'red', board);
            }).toThrow('无效棋谱格式');
        });

        test('无效路码', () => {
            const board = parser.createInitialBoard();
            expect(() => {
                parser.parseNotation('炮十平五', 'red', board);
            }).toThrow('无效路码');
        });

        test('无效颜色', () => {
            expect(() => {
                parser.roadToColumn('invalid', 1);
            }).toThrow('无效颜色');
        });

        test('无效列坐标', () => {
            expect(() => {
                parser.columnToRoad('red', 10);
            }).toThrow('无效列坐标');
        });
    });
});