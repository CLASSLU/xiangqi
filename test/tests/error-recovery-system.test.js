// 错误恢复系统Jest测试
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
eval(fs.readFileSync(path.join(__dirname, '../../main/error-recovery-system.js'), 'utf8'));

describe('错误恢复系统测试', () => {
    let recoverySystem;

    beforeEach(() => {
        recoverySystem = new ErrorRecoverySystem();
    });

    test('ErrorRecoverySystem类正确初始化', () => {
        expect(recoverySystem).toBeDefined();
        expect(recoverySystem.recoveryStrategies).toBeDefined();
        expect(recoverySystem.recoveryLog).toBeDefined();
        expect(recoverySystem.faultToleranceMode !== undefined).toBe(true);
    });

    test('recoverFromValidationErrors方法存在且可调用', () => {
        const mockErrors = [
            {
                code: 'DATA_MISSING_FIELDS',
                message: 'Missing required fields',
                moveIndex: 0,
                layer: 'DATA'
            }
        ];
        const mockMoves = [
            {
                pieceType: '车',
                pieceColor: 'red',
                from: { row: 9, col: 0 },
                to: { row: 7, col: 0 },
                notation: '车九进七'
            }
        ];

        const result = recoverySystem.recoverFromValidationErrors(mockErrors, mockMoves, {
            autoFix: true,
            faultTolerant: true
        });

        expect(result).toBeDefined();
        expect(typeof result.originalMoves).toBe('object');
        expect(typeof result.recoveredMoves).toBe('object');
        expect(Array.isArray(result.successfulRecoveries)).toBe(true);
        expect(Array.isArray(result.failedRecoveries)).toBe(true);
    });

    test('错误恢复策略矩阵包含必要策略', () => {
        const requiredStrategies = [
            'DATA_MISSING_FIELDS',
            'DATA_INVALID_FORMAT',
            'DATA_OUT_OF_BOUNDS',
            'RULES_ILLEGAL_MOVE',
            'RULES_PIECE_NOT_FOUND',
            'GAME_STATE_INCONSISTENT',
            'SEQUENCE_BREAK',
            'SEQUENCE_REDUNDANT'
        ];

        requiredStrategies.forEach(strategy => {
            expect(recoverySystem.recoveryStrategies.has(strategy)).toBe(true);
        });
    });

    test('calculateQualityScore方法返回有效分数', () => {
        const mockRecoveryResult = {
            originalMoves: new Array(10),
            recoveredMoves: new Array(8),
            successfulRecoveries: [
                { originalError: { code: 'DATA_MISSING_FIELDS' } }
            ],
            failedRecoveries: [
                { originalError: { code: 'RULES_ILLEGAL_MOVE' } }
            ]
        };

        const score = recoverySystem.calculateQualityScore(mockRecoveryResult);
        expect(typeof score).toBe('number');
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
    });

    test('setFaultTolerance方法切换容错模式', () => {
        // 初始状态
        expect(recoverySystem.faultToleranceMode !== undefined).toBe(true);

        // 切换到容错模式
        recoverySystem.setFaultTolerance(true);
        expect(recoverySystem.faultToleranceMode).toBe(true);

        // 切换回严格模式
        recoverySystem.setFaultTolerance(false);
        expect(recoverySystem.faultToleranceMode).toBe(false);
    });

    test('getRecoveryLog和clearRecoveryLog方法正常工作', () => {
        // 初始日志为空
        expect(recoverySystem.getRecoveryLog()).toEqual([]);

        // 清除日志（空操作，不报错）
        recoverySystem.clearRecoveryLog();
        expect(recoverySystem.getRecoveryLog()).toEqual([]);
    });

    test('exportRecoveryReport方法支持不同格式', () => {
        const mockRecoveryResult = {
            recoveryReport: {
                summary: {
                    totalMoves: 10,
                    recoveredMoves: 8,
                    successRate: 80,
                    qualityScore: 85
                },
                recoveries: {
                    successful: [],
                    failed: []
                },
                recommendations: []
            }
        };

        // JSON格式（默认）
        const jsonReport = recoverySystem.exportRecoveryReport(mockRecoveryResult);
        expect(typeof jsonReport).toBe('object');

        // 文本格式
        const textReport = recoverySystem.exportRecoveryReport(mockRecoveryResult, 'text');
        expect(typeof textReport).toBe('string');
    });

    test('格式化文本报告包含必要信息', () => {
        const mockRecoveryResult = {
            recoveryReport: {
                summary: {
                    totalMoves: 5,
                    recoveredMoves: 4,
                    successRate: 80,
                    qualityScore: 75
                },
                recoveries: {
                    successful: [
                        { action: 'auto_fix', message: '自动修复成功' }
                    ],
                    failed: [
                        { errorType: 'RULES_ILLEGAL_MOVE', message: '无法修复' }
                    ]
                },
                recommendations: ['建议检查数据源']
            }
        };

        const textReport = recoverySystem.formatRecoveryReportAsText(mockRecoveryResult);
        expect(textReport).toContain('棋谱错误恢复报告');
        expect(textReport).toContain('总览:');
        expect(textReport).toContain('成功恢复:');
        expect(textReport).toContain('恢复失败:');
        expect(textReport).toContain('建议:');
    });
});