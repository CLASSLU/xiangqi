// 分层验证器Jest测试
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// 设置浏览器环境
const dom = new JSDOM('<!DOCTYPE html><div id="app"></div>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

// 加载必要的模块
eval(fs.readFileSync(path.join(__dirname, '../../main/constants.js'), 'utf8').replace(/export/g, ''));
eval(fs.readFileSync(path.join(__dirname, '../../main/utils.js'), 'utf8').replace(/export/g, ''));
eval(fs.readFileSync(path.join(__dirname, '../../main/chess-data-validator.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../../main/layered-validator.js'), 'utf8'));

describe('分层验证器测试', () => {
    let validator;

    beforeEach(() => {
        validator = new LayeredValidator();
    });

    test('LayeredValidator类正确初始化', () => {
        expect(validator).toBeDefined();
        expect(validator.VALIDATION_LAYERS).toBeDefined();
        expect(validator.VALIDATION_LAYERS.DATA).toBe(1);
        expect(validator.VALIDATION_LAYERS.RULES).toBe(2);
        expect(validator.VALIDATION_LAYERS.GAME).toBe(3);
        expect(validator.VALIDATION_LAYERS.SEQUENCE).toBe(4);
    });

    test('validateMoveSequence方法存在且可调用', () => {
        const mockMoves = [
            {
                pieceType: '车',
                pieceColor: 'red',
                from: { row: 9, col: 0 },
                to: { row: 7, col: 0 },
                notation: '车九进七'
            }
        ];

        const result = validator.validateMoveSequence(mockMoves, {
            strict: true,
            autoFix: false
        });

        expect(result).toBeDefined();
        expect(typeof result.totalMoves).toBe('number');
        expect(typeof result.validMoves).toBe('number');
        expect(Array.isArray(result.errors)).toBe(true);
    });

    test('validateMove方法返回正确结构', () => {
        const move = {
            pieceType: '马',
            pieceColor: 'black',
            from: { row: 0, col: 1 },
            to: { row: 2, col: 2 },
            notation: '马2进3'
        };

        const result = validator.validateMove(move, { strict: false });

        expect(result).toBeDefined();
        expect(typeof result.valid).toBe('boolean');
        expect(Array.isArray(result.errors)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
        expect(result.layer).toBeDefined();
    });

    test('验证层统计功能正常', () => {
        const movesWithErrors = [
            {
                pieceType: '炮',
                pieceColor: 'red',
                from: { row: 7, col: 1 },
                to: { row: 7, col: 4 },
                notation: '炮二平五'
            },
            {
                // 故意的错误数据
                pieceType: 'invalid',
                pieceColor: 'blue',
                from: { row: -1, col: 10 },
                to: { row: 20, col: -5 },
                notation: 'invalid'
            }
        ];

        const result = validator.validateMoveSequence(movesWithErrors, {
            strict: false,
            autoFix: true
        });

        expect(result.layerStatistics).toBeDefined();
        expect(typeof result.layerStatistics).toBe('object');
    });

    test('formatValidationReport方法存在', () => {
        const mockResult = {
            totalMoves: 2,
            validMoves: 1,
            errorMoves: 1,
            errors: [{ message: 'Test error' }],
            warnings: [],
            layerStatistics: { DATA: { total: 2, passed: 1, errors: 1 } }
        };

        const hasFormatMethod = typeof validator.formatValidationReport === 'function';
        expect(hasFormatMethod).toBe(true);

        if (hasFormatMethod) {
            const report = validator.formatValidationReport(mockResult);
            expect(typeof report).toBe('string');
        }
    });

    test('处理空数组输入', () => {
        const result = validator.validateMoveSequence([], {
            strict: true,
            autoFix: false
        });

        expect(result.totalMoves).toBe(0);
        expect(result.validMoves).toBe(0);
        expect(result.errorMoves).toBe(0);
        expect(result.errors.length).toBe(0);
    });
});