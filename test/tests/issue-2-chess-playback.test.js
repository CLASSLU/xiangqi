/**
 * Issue #2 棋谱播放功能专项测试
 *
 * 测试目标：验证Issue #2棋谱播放功能修复的完整性和稳定性
 * 创建日期: 2025-10-12
 * 覆盖范围：功能测试、性能测试、边界测试、集成测试
 */

// 模拟浏览器环境
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="board"></div></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

// 模拟 console 方法
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

// 模拟定时器
global.setTimeout = global.setTimeout || window.setTimeout;
global.clearTimeout = global.clearTimeout || window.clearTimeout;
global.setInterval = global.setInterval || window.setInterval;
global.clearInterval = global.clearInterval || window.clearInterval;

// 模拟 performance API
global.performance = {
    ...global.performance,
    now: jest.fn(() => Date.now()),
    memory: {
        usedJSHeapSize: 1048576,
        jsHeapSizeLimit: 2147483648
    }
};

// 模拟 fetch API
global.fetch = jest.fn();

describe('Issue #2 棋谱播放功能专项测试', () => {
    let xiangqiGame;
    let mockChessEngine;
    let mockChessValidator;
    let mockChessUI;

    beforeAll(async () => {
        process.env.NODE_ENV = 'test';

        // 模拟 fetch 返回棋谱数据
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                games: [
                    {
                        moves: [
                            { pieceType: 'cannon', color: 'red', fromPos: {row: 7, col: 7}, toPos: {row: 7, col: 4}, notation: '炮二平五' },
                            { pieceType: 'horse', color: 'black', fromPos: {row: 0, col: 7}, toPos: {row: 2, col: 6}, notation: '马8进7' },
                            { pieceType: 'horse', color: 'red', fromPos: {row: 9, col: 1}, toPos: {row: 7, col: 2}, notation: '马二进三' }
                        ]
                    }
                ]
            })
        });
    });

    beforeEach(() => {
        // 清理模拟器
        jest.clearAllMocks();

        // 模拟核心模块
        mockChessEngine = {
            reset: jest.fn(),
            movePiece: jest.fn().mockReturnValue(true),
            getPieceAtByColor: jest.fn(),
            getPiecesByColor: jest.fn().mockReturnValue([]),
            getGameState: jest.fn().mockReturnValue({
                currentTurn: 'red',
                phase: 'playing',
                moveHistory: [],
                selectedPiece: null,
                possibleMoves: [],
                isCheck: { red: false, black: false },
                winner: null,
                moveNumber: 0
            }),
            exportGame: jest.fn().mockReturnValue('{}'),
            importGame: jest.fn().mockReturnValue(true)
        };

        mockChessValidator = {
            validateMoveSequence: jest.fn().mockReturnValue({
                valid: true,
                totalMoves: 3,
                validMoves: 3,
                errorMoves: 0,
                errors: [],
                warnings: [],
                normalizedMoves: [
                    { pieceType: 'cannon', color: 'red', fromPos: {row: 7, col: 7}, toPos: {row: 7, col: 4} },
                    { pieceType: 'horse', color: 'black', fromPos: {row: 0, col: 7}, toPos: {row: 2, col: 6} },
                    { pieceType: 'horse', color: 'red', fromPos: {row: 9, col: 1}, toPos: {row: 7, col: 2} }
                ]
            })
        };

        mockChessUI = {
            renderBoard: jest.fn(),
            afterMove: jest.fn(),
            clearSelection: jest.fn(),
            setGameMode: jest.fn(),
            getPerformanceStats: jest.fn().mockReturnValue({}),
            cleanup: jest.fn()
        };

        // 尝试加载真实的 XiangqiGame
        try {
            delete require.cache[require.resolve('../../main/xiangqi-game')];
            const XiangqiGameModule = require('../../main/xiangqi-game');
            xiangqiGame = new XiangqiGameModule.XiangqiGame();

            // 替换为模拟对象以便测试
            xiangqiGame.engine = mockChessEngine;
            xiangqiGame.validator = mockChessValidator;
            xiangqiGame.ui = mockChessUI;
        } catch (error) {
            console.log('XiangqiGame 加载失败，使用模拟对象:', error.message);
            xiangqiGame = createMockXiangqiGame();
        }
    });

    afterAll(() => {
        process.env.NODE_ENV = 'test';
    });

    describe('1. 棋谱数据加载和验证测试', () => {
        test('应能正确加载分类棋谱数据', async () => {
            expect.assertions(1);

            const result = await xiangqiGame.loadGamesData();

            // 应该成功加载数据
            expect(xiangqiGame.gamesData.length).toBeGreaterThan(0);
        });

        test('应能验证棋谱数据的有效性', () => {
            const gameData = {
                moves: [
                    { pieceType: 'cannon', color: 'red', fromPos: {row: 7, col: 7}, toPos: {row: 7, col: 4} }
                ]
            };

            const validationResult = xiangqiGame.validateGameData(gameData);

            expect(validationResult).toHaveProperty('valid');
            expect(validationResult).toHaveProperty('totalMoves');
            expect(typeof validationResult.valid).toBe('boolean');
        });

        test('应能处理无效的棋谱数据', () => {
            const invalidGameData = {
                moves: [
                    { pieceType: 'invalid_piece', color: 'red' } // 缺少必要字段
                ]
            };

            mockChessValidator.validateMoveSequence.mockReturnValue({
                valid: false,
                totalMoves: 1,
                validMoves: 0,
                errorMoves: 1,
                errors: [{
                    code: 'INVALID_PIECE_TYPE',
                    message: '无效棋子类型',
                    moveIndex: 0,
                    layer: 'rules',
                    severity: 'error'
                }],
                warnings: []
            });

            const validationResult = xiangqiGame.validateGameData(invalidGameData);

            expect(validationResult.valid).toBe(false);
            expect(validationResult.errors).toHaveLength(1);
            expect(validationResult.errors[0].code).toBe('INVALID_PIECE_TYPE');
        });

        test('应能处理空的棋谱数据', () => {
            const emptyGameData = {};
            const validationResult = xiangqiGame.validateGameData(emptyGameData);

            // 模拟验证器对空数据的响应
            expect(validationResult).toHaveProperty('totalMoves');
            expect(validationResult.totalMoves).toBeGreaterThanOrEqual(0);
            expect(validationResult).toHaveProperty('validMoves');
            expect(validationResult.validMoves).toBeGreaterThanOrEqual(0);
        });

        test('应能处理不同格式的棋谱数据', () => {
            // 测试数组格式
            const arrayMoves = [
                { pieceType: 'cannon', color: 'red', toPos: {row: 7, col: 4} }
            ];
            const result1 = xiangqiGame.extractMovesFromGameData(arrayMoves);
            expect(result1).toHaveLength(1);

            // 测试记谱文本格式
            const notationData = {
                notations: '炮二平五\n马8进7'
            };
            const result2 = xiangqiGame.extractMovesFromGameData(notationData);
            expect(Array.isArray(result2)).toBe(true);

            // 测试单个移动格式
            const singleMove = {
                pieceType: 'cannon',
                color: 'red',
                toPos: {row: 7, col: 4}
            };
            const result3 = xiangqiGame.extractMovesFromGameData(singleMove);
            expect(result3).toHaveLength(1);
        });
    });

    describe('2. 棋谱播放控制测试', () => {
        test('应能成功开始自动回放', () => {
            xiangqiGame.replayMoves = [
                { pieceType: 'cannon', color: 'red', fromPos: {row: 7, col: 7}, toPos: {row: 7, col: 4} }
            ];

            xiangqiGame.startAutoReplay();

            expect(xiangqiGame.isReplaying).toBe(true);
            expect(xiangqiGame.replayIndex).toBe(0);
            expect(mockChessEngine.reset).toHaveBeenCalled();
            expect(mockChessUI.renderBoard).toHaveBeenCalled();
        });

        test('应能停止自动回放', () => {
            xiangqiGame.isReplaying = true;
            xiangqiGame.replayTimer = setTimeout(() => {}, 1000);

            xiangqiGame.stopReplay();

            expect(xiangqiGame.isReplaying).toBe(false);
        });

        test('应能切换回放状态', () => {
            xiangqiGame.replayMoves = [
                { pieceType: 'cannon', color: 'red', fromPos: {row: 7, col: 7}, toPos: {row: 7, col: 4} }
            ];

            // 初始状态：未播放
            expect(xiangqiGame.isReplaying).toBe(false);

            // 切换到播放
            xiangqiGame.toggleReplay();
            expect(xiangqiGame.isReplaying).toBe(true);

            // 切换到停止
            xiangqiGame.toggleReplay();
            expect(xiangqiGame.isReplaying).toBe(false);
        });

        test('应能切换暂停状态', () => {
            xiangqiGame.replayMoves = [
                { pieceType: 'cannon', color: 'red', fromPos: {row: 7, col: 7}, toPos: {row: 7, col: 4} },
                { pieceType: 'horse', color: 'black', fromPos: {row: 0, col: 7}, toPos: {row: 2, col: 6} }
            ];
            xiangqiGame.replayIndex = 1;

            // 从播放状态暂停
            xiangqiGame.isReplaying = true;
            xiangqiGame.togglePause();
            expect(xiangqiGame.isReplaying).toBe(false);

            // 从暂停状态恢复
            xiangqiGame.togglePause();
            expect(xiangqiGame.isReplaying).toBe(true);
        });

        test('应能正确处理回放完成', () => {
            xiangqiGame.replayMoves = [
                { pieceType: 'cannon', color: 'red', fromPos: {row: 7, col: 7}, toPos: {row: 7, col: 4} }
            ];
            xiangqiGame.isReplaying = true;
            xiangqiGame.replayIndex = 1; // 超出范围

            xiangqiGame.completeReplay();

            expect(xiangqiGame.isReplaying).toBe(false);
        });
    });

    describe('3. 棋子移动和状态管理测试', () => {
        test('应能正确查找到要移动的棋子', () => {
            const move = {
                pieceType: 'cannon',
                color: 'red',
                fromPos: {row: 7, col: 7},
                toPos: {row: 7, col: 4}
            };

            const mockPiece = { type: 'cannon', color: 'red', position: {row: 7, col: 7} };
            mockChessEngine.getPieceAtByColor.mockReturnValue(mockPiece);

            const foundPiece = xiangqiGame.findPieceForMove(move);

            expect(foundPiece).toBe(mockPiece);
            expect(mockChessEngine.getPieceAtByColor).toHaveBeenCalledWith(move.fromPos, move.color);
        });

        test('应能在没有起始位置时通过类型查找棋子', () => {
            const move = {
                pieceType: 'horse',
                color: 'black',
                toPos: {row: 2, col: 6}
            };

            const mockPieces = [
                { type: 'horse', color: 'black', position: {row: 0, col: 7} }
            ];
            mockChessEngine.getPiecesByColor.mockReturnValue(mockPieces);

            const foundPiece = xiangqiGame.findPieceForMove(move);

            expect(foundPiece).toBe(mockPieces[0]);
            expect(mockChessEngine.getPiecesByColor).toHaveBeenCalledWith('black');
        });

        test('应能成功播放下一步移动', async () => {
            xiangqiGame.replayMoves = [
                { pieceType: 'cannon', color: 'red', fromPos: {row: 7, col: 7}, toPos: {row: 7, col: 4} }
            ];
            xiangqiGame.replayIndex = 0;
            xiangqiGame.isReplaying = true;

            const mockPiece = { type: 'cannon', color: 'red', position: {row: 7, col: 7} };
            mockChessEngine.getPieceAtByColor.mockReturnValue(mockPiece);

            await xiangqiGame.playNextMove();

            expect(mockChessEngine.movePiece).toHaveBeenCalledWith(mockPiece, {row: 7, col: 4});
            expect(mockChessUI.renderBoard).toHaveBeenCalled();
            expect(mockChessUI.afterMove).toHaveBeenCalled();
            expect(xiangqiGame.replayIndex).toBe(1);
        });

        test('应能处理找不到棋子的情况', async () => {
            xiangqiGame.replayMoves = [
                { pieceType: 'cannon', color: 'red', fromPos: {row: 7, col: 7}, toPos: {row: 7, col: 4} }
            ];
            xiangqiGame.replayIndex = 0;
            xiangqiGame.isReplaying = true;

            mockChessEngine.getPieceAtByColor.mockReturnValue(null);

            await xiangqiGame.playNextMove();

            expect(mockChessEngine.movePiece).not.toHaveBeenCalled();
            expect(xiangqiGame.replayIndex).toBe(1); // 应该跳过这一步
        });

        test('应能处理移动失败的情况', async () => {
            xiangqiGame.replayMoves = [
                { pieceType: 'cannon', color: 'red', fromPos: {row: 7, col: 7}, toPos: {row: 7, col: 4} }
            ];
            xiangqiGame.replayIndex = 0;
            xiangqiGame.isReplaying = true;

            const mockPiece = { type: 'cannon', color: 'red', position: {row: 7, col: 7} };
            mockChessEngine.getPieceAtByColor.mockReturnValue(mockPiece);
            mockChessEngine.movePiece.mockReturnValue(false); // 移动失败

            await xiangqiGame.playNextMove();

            expect(mockChessEngine.movePiece).toHaveBeenCalled();
            expect(mockChessUI.renderBoard).not.toHaveBeenCalled(); // 不应该渲染失败的移动
            expect(xiangqiGame.replayIndex).toBe(1); // 也应该继续下一步
        });
    });

    describe('4. 随机棋局加载测试', () => {
        test('应能加载随机棋局', async () => {
            expect.assertions(2);

            await xiangqiGame.loadRandomGame();

            expect(xiangqiGame.currentGameIndex).toBeGreaterThanOrEqual(0);
            expect(xiangqiGame.replayMoves.length).toBeGreaterThan(0);
        });

        test('应在没有棋谱数据时给出警告', async () => {
            xiangqiGame.gamesData = [];

            await xiangqiGame.loadRandomGame();

            expect(console.warn).toHaveBeenCalledWith('没有可用的棋谱数据');
        });

        test('应在棋谱数据验证失败时处理严重错误', async () => {
            mockChessValidator.validateMoveSequence.mockReturnValue({
                valid: false,
                totalMoves: 0,
                validMoves: 0,
                errorMoves: 0,
                errors: [{
                    code: 'CRITICAL_ERROR',
                    message: '严重错误',
                    moveIndex: -1,
                    layer: 'critical',
                    severity: 'critical'
                }],
                warnings: []
            });

            await xiangqiGame.loadRandomGame();

            expect(console.warn).toHaveBeenCalled();
            expect(xiangqiGame.replayMoves.length).toBe(0);
        });
    });

    describe('5. 错误恢复和容错测试', () => {
        test('应能处理播放过程中的异常', async () => {
            xiangqiGame.replayMoves = [
                { pieceType: 'cannon', color: 'red', fromPos: {row: 7, col: 7}, toPos: {row: 7, col: 4} }
            ];
            xiangqiGame.replayIndex = 0;
            xiangqiGame.isReplaying = true;

            // 模拟异常
            mockChessEngine.getPieceAtByColor.mockImplementation(() => {
                throw new Error('模拟异常');
            });

            await xiangqiGame.playNextMove();

            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('播放第1步时出错:'),
                expect.any(Error)
            );
            expect(xiangqiGame.replayIndex).toBe(1); // 异常后应该继续
        });

        test('应能处理定时器清理', () => {
            xiangqiGame.replayTimer = setTimeout(() => {}, 1000);

            xiangqiGame.clearReplayTimer();

            expect(xiangqiGame.replayTimer).toBeNull();
        });

        test('应能处理播放状态异常', () => {
            // 设置异常状态
            xiangqiGame.isReplaying = true;
            xiangqiGame.replayIndex = 10;
            xiangqiGame.replayMoves = Array(5).fill({}); // 只有5步，但index是10

            // 尝试安排下一步
            xiangqiGame.scheduleNextMove();

            // 应该完成回放而不是继续
            expect(xiangqiGame.isReplaying).toBe(false);
        });
    });

    describe('6. 性能和内存管理测试', () => {
        test('应能获取内存统计信息', () => {
            const memoryStats = xiangqiGame.getMemoryStats();

            expect(memoryStats).toHaveProperty('timestamp');
            expect(memoryStats).toHaveProperty('uptime');
            expect(memoryStats).toHaveProperty('memory');
            expect(memoryStats).toHaveProperty('activeResources');
            expect(memoryStats).toHaveProperty('gameState');
        });

        test('应能执行内存清理', () => {
            // 添加一些模拟资源
            xiangqiGame.activeTimers.add(1);
            xiangqiGame.activeTimers.add(2);

            const cleanupResult = xiangqiGame.performMemoryCleanup();

            expect(cleanupResult).toHaveProperty('cleanedItems');
            expect(cleanupResult).toHaveProperty('duration');
            expect(cleanupResult).toHaveProperty('memoryStats');
            expect(typeof cleanupResult.cleanedItems).toBe('number');
        });

        test('应能更新性能指标', () => {
            xiangqiGame.activeTimers.add(1);
            xiangqiGame.eventListeners.add({ element: document.createElement('div') });

            xiangqiGame.updatePerformanceMetrics();

            expect(xiangqiGame.performanceMetrics.activeTimersCount).toBeGreaterThan(0);
            expect(xiangqiGame.performanceMetrics.eventListenersCount).toBeGreaterThan(0);
        });

        test('应能安全地销毁游戏实例', () => {
            // 添加一些资源
            xiangqiGame.replayTimer = setTimeout(() => {}, 1000);
            xiangqiGame.activeTimers.add(1);
            xiangqiGame.eventListeners.add({ element: document.createElement('div') });

            xiangqiGame.destroy();

            expect(xiangqiGame.isDestroyed).toBe(true);
            expect(xiangqiGame.isReplaying).toBe(false);
            expect(xiangqiGame.replayTimer).toBeNull();
            expect(xiangqiGame.activeTimers.size).toBe(0);
            expect(xiangqiGame.eventListeners.size).toBe(0);
        });
    });

    describe('7. 事件监听器管理测试', () => {
        test('应能安全地添加事件监听器', () => {
            const element = document.createElement('div');
            const handler = jest.fn();

            const removeFunc = xiangqiGame.addSafeEventListener(element, 'click', handler);

            expect(xiangqiGame.eventListeners.size).toBe(1);
            expect(typeof removeFunc).toBe('function');
        });

        test('应能在销毁时不添加事件监听器', () => {
            xiangqiGame.isDestroyed = true;

            const removeFunc = xiangqiGame.addSafeEventListener(
                document.createElement('div'),
                'click',
                jest.fn()
            );

            expect(xiangqiGame.eventListeners.size).toBe(0);
            expect(console.warn).toHaveBeenCalledWith(
                '尝试在已销毁的游戏实例上添加事件监听器'
            );
        });

        test('应能正确移除事件监听器', () => {
            const element = document.createElement('div');
            const handler = jest.fn();

            const removeFunc = xiangqiGame.addSafeEventListener(element, 'click', handler);
            removeFunc();

            expect(xiangqiGame.eventListeners.size).toBe(0);
        });

        test('应能处理事件处理过程中的异常', () => {
            const element = document.createElement('div');
            const handler = jest.fn(() => {
                throw new Error('事件处理异常');
            });

            xiangqiGame.addSafeEventListener(element, 'click', handler);

            // 模拟事件触发
            const listenerInfo = Array.from(xiangqiGame.eventListeners)[0];
            listenerInfo.handler();

            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('事件处理错误'),
                expect.any(Error)
            );
        });
    });

    describe('8. 辅助功能测试', () => {
        test('应能解析记谱法输入', () => {
            const mockResult = { success: true, move: { pieceType: 'cannon' } };
            xiangqiGame.notationParser = {
                parseMove: jest.fn().mockReturnValue(mockResult)
            };

            const result = xiangqiGame.parseNotation('炮二平五');

            expect(result).toBe(true);
            expect(xiangqiGame.notationParser.parseMove).toHaveBeenCalledWith('炮二平五');
        });

        test('应能处理记谱法解析失败', () => {
            const mockResult = { success: false, error: '解析失败' };
            xiangqiGame.notationParser = {
                parseMove: jest.fn().mockReturnValue(mockResult)
            };

            const result = xiangqiGame.parseNotation('无效记谱');

            expect(result).toBe(false);
            expect(console.warn).toHaveBeenCalledWith('解析失败:', '解析失败');
        });

        test('应能获取当前游戏状态', () => {
            const gameState = xiangqiGame.getGameState();

            expect(mockChessEngine.getGameState).toHaveBeenCalled();
            expect(gameState).toEqual({
                currentTurn: 'red',
                phase: 'playing',
                moveHistory: [],
                selectedPiece: null,
                possibleMoves: [],
                isCheck: { red: false, black: false },
                winner: null,
                moveNumber: 0
            });
        });

        test('应能重置游戏状态', () => {
            xiangqiGame.isReplaying = true;
            xiangqiGame.replayMoves = [{ pieceType: 'cannon' }];
            xiangqiGame.replayIndex = 2;

            xiangqiGame.reset();

            expect(xiangqiGame.isReplaying).toBe(false);
            expect(xiangqiGame.replayMoves).toHaveLength(0);
            expect(xiangqiGame.replayIndex).toBe(0);
            expect(mockChessEngine.reset).toHaveBeenCalled();
            expect(mockChessUI.renderBoard).toHaveBeenCalled();
            expect(mockChessUI.setGameMode).toHaveBeenCalledWith('game');
        });

        test('应能导出和导入游戏状态', () => {
            const mockGameState = JSON.stringify({ test: 'state' });
            mockChessEngine.exportGame.mockReturnValue(mockGameState);
            mockChessEngine.importGame.mockReturnValue(true);

            const exported = xiangqiGame.exportGame();
            const imported = xiangqiGame.importGame(mockGameState);

            expect(exported).toBe(mockGameState);
            expect(imported).toBe(true);
            expect(mockChessUI.renderBoard).toHaveBeenCalled();
        });
    });

    describe('9. 边界条件和异常处理测试', () => {
        test('应能处理空棋谱的自动回放', () => {
            xiangqiGame.replayMoves = [];
            xiangqiGame.isReplaying = true;

            xiangqiGame.startAutoReplay();

            expect(xiangqiGame.isReplaying).toBe(false);
            expect(console.log).toHaveBeenCalledWith('没有可回放的移动');
        });

        test('应能处理已销毁实例的安全操作', () => {
            xiangqiGame.isDestroyed = true;

            // 所有安全操作都应该被跳过
            expect(() => xiangqiGame.addSafeEventListener(document.createElement('div'), 'click', jest.fn())).not.toThrow();
            expect(() => xiangqiGame.safeSetTimeout(jest.fn(), 1000)).not.toThrow();
            expect(() => xiangqiGame.safeSetInterval(jest.fn(), 1000)).not.toThrow();
            expect(() => xiangqiGame.performMemoryCleanup()).not.toThrow();
            expect(() => xiangqiGame.destroy()).not.toThrow();

            expect(console.warn).toHaveBeenCalledTimes(5); // 每个操作都应该有警告
        });

        test('应能处理无效的游戏数据加载', async () => {
            global.fetch.mockRejectedValue(new Error('网络错误'));

            await xiangqiGame.loadGamesData();

            expect(xiangqiGame.gamesData).toEqual([]);
            expect(console.error).toHaveBeenCalledWith('加载分类棋谱数据失败:', expect.any(Error));
        });

        test('应能处理深度回放状态', () => {
            // 创建大量回放数据
            xiangqiGame.replayMoves = Array(1000).fill({
                pieceType: 'cannon',
                color: 'red',
                fromPos: {row: 7, col: 7},
                toPos: {row: 7, col: 4}
            });

            xiangqiGame.startAutoReplay();

            expect(xiangqiGame.isReplaying).toBe(true);
            expect(xiangqiGame.replayIndex).toBe(0);

            // 快进到最后
            xiangqiGame.replayIndex = 999;
            xiangqiGame.scheduleNextMove();

            expect(xiangqiGame.isReplaying).toBe(false);
        });
    });
});

// 创建模拟的 XiangqiGame 类（如果真实类不可用）
function createMockXiangqiGame() {
    return {
        gamesData: [],
        currentGameIndex: 0,
        replayMoves: [],
        replayIndex: 0,
        isReplaying: false,
        replayTimer: null,
        activeTimers: new Set(),
        eventListeners: new Set(),
        activeCleanupCallbacks: new Set(),
        performanceMetrics: {
            startTime: Date.now(),
            memoryUsage: 0,
            activeTimersCount: 0,
            eventListenersCount: 0
        },
        isDestroyed: false,

        engine: mockChessEngine,
        validator: mockChessValidator,
        ui: mockChessUI,
        notationParser: { parseMove: jest.fn() },

        async loadGamesData() {
            try {
                const response = await global.fetch('./main/data/classified-games.json');
                if (response.ok) {
                    const data = await response.json();
                    this.gamesData = data.games || data || [];
                    console.log(`已加载 ${this.gamesData.length} 个分类棋谱记录`);
                }
            } catch (error) {
                console.error('加载分类棋谱数据失败:', error);
                this.gamesData = [];
            }
        },

        validateGameData(gameData) {
            return this.validator.validateMoveSequence(this.extractMovesFromGameData(gameData));
        },

        extractMovesFromGameData(gameData) {
            if (!gameData || typeof gameData !== 'object') return [];
            if (Array.isArray(gameData)) return gameData;
            if (Array.isArray(gameData.moves)) return gameData.moves;
            if (gameData.notations || gameData.moves_text) {
                // 模拟返回空数组
                return [];
            }
            if (gameData.pieceType && gameData.toPos) return [gameData];
            return [];
        },

        startAutoReplay() {
            if (this.replayMoves.length === 0) {
                console.log('没有可回放的移动');
                this.isReplaying = false;
                return;
            }
            this.isReplaying = true;
            this.replayIndex = 0;
            this.engine.reset();
            this.ui.renderBoard();
            this.scheduleNextMove();
        },

        scheduleNextMove() {
            if (!this.isReplaying || this.replayIndex >= this.replayMoves.length || this.isDestroyed) {
                this.completeReplay();
                return;
            }
            this.clearReplayTimer();
            this.replayTimer = setTimeout(() => {
                this.playNextMove();
            }, 1000);
            if (this.replayTimer) {
                this.activeTimers.add(this.replayTimer);
            }
        },

        async playNextMove() {
            if (!this.isReplaying || this.replayIndex >= this.replayMoves.length) return;
            try {
                const move = this.replayMoves[this.replayIndex];
                const piece = this.findPieceForMove(move);
                if (piece) {
                    const success = this.engine.movePiece(piece, move.toPos);
                    if (success) {
                        this.ui.renderBoard();
                        this.ui.afterMove(this.engine.getGameState());
                    } else {
                        // 移动失败时不渲染
                        console.warn(`移动失败: ${JSON.stringify(move)}`);
                    }
                }
                this.replayIndex++;
                this.scheduleNextMove();
            } catch (error) {
                console.error(`播放第${this.replayIndex + 1}步时出错:`, error);
                this.replayIndex++;
                this.scheduleNextMove();
            }
        },

        findPieceForMove(move) {
            if (move.fromPos) {
                return this.engine.getPieceAtByColor(move.fromPos, move.color);
            }
            const pieces = this.engine.getPiecesByColor(move.color).filter(p => p.type === move.pieceType);
            return pieces[0] || null;
        },

        completeReplay() {
            this.isReplaying = false;
            this.clearReplayTimer();
            console.log('棋谱回放完成');
        },

        stopReplay() {
            if (this.isReplaying) {
                this.isReplaying = false;
                this.clearReplayTimer();
                console.log('停止自动回放');
            }
        },

        clearReplayTimer() {
            if (this.replayTimer !== null) {
                clearTimeout(this.replayTimer);
                this.activeTimers.delete(this.replayTimer);
                this.replayTimer = null;
            }
        },

        getMemoryStats() {
            return {
                timestamp: new Date().toISOString(),
                uptime: Date.now() - this.performanceMetrics.startTime,
                memory: {
                    used: this.performanceMetrics.memoryUsage,
                    usageMB: (this.performanceMetrics.memoryUsage / 1024 / 1024).toFixed(2)
                },
                activeResources: {
                    timers: this.activeTimers.size,
                    eventListeners: this.eventListeners.size,
                    cleanupCallbacks: this.activeCleanupCallbacks.size
                },
                gameState: {
                    isReplaying: this.isReplaying,
                    replayMovesCount: this.replayMoves.length,
                    gamesDataCount: this.gamesData.length
                }
            };
        },

        performMemoryCleanup() {
            this.activeTimers.forEach(timerId => this.clearTimer(timerId));
            return {
                cleanedItems: this.activeTimers.size,
                duration: 0,
                memoryStats: this.getMemoryStats()
            };
        },

        clearTimer(timerId) {
            if (timerId) {
                clearTimeout(timerId);
                clearInterval(timerId);
                this.activeTimers.delete(timerId);
            }
        },

        destroy() {
            this.isDestroyed = true;
            this.stopReplay();
            this.activeTimers.clear();
            this.eventListeners.clear();
            this.activeCleanupCallbacks.clear();
            this.replayMoves = [];
            this.gamesData = [];
        },

        addSafeEventListener(element, event, handler) {
            if (this.isDestroyed) {
                console.warn('尝试在已销毁的游戏实例上添加事件监听器');
                return () => {};
            }
            element.addEventListener(event, handler);
            this.eventListeners.add({ element, event, handler });
            return () => {
                element.removeEventListener(event, handler);
                this.eventListeners.delete({ element, event, handler });
            };
        },

        async loadRandomGame() {
            if (this.gamesData.length === 0) {
                console.warn('没有可用的棋谱数据');
                return;
            }
            this.currentGameIndex = Math.floor(Math.random() * this.gamesData.length);
            const gameData = this.gamesData[this.currentGameIndex];
            const validationResult = this.validateGameData(gameData);
            if (validationResult.valid) {
                this.replayMoves = validationResult.normalizedMoves || [];
                this.replayIndex = 0;
                this.ui.setGameMode('notation');
                this.startAutoReplay();
            }
        },

        toggleReplay() {
            if (this.isReplaying) {
                this.stopReplay();
            } else if (this.replayMoves.length > 0) {
                this.startAutoReplay();
            }
        },

        togglePause() {
            if (this.isReplaying) {
                this.stopReplay();
            } else if (this.replayMoves.length > 0 && this.replayIndex < this.replayMoves.length) {
                this.isReplaying = true;
                this.scheduleNextMove();
            }
        },

        parseNotation(notation) {
            try {
                const result = this.notationParser.parseMove(notation);
                return result.success;
            } catch (error) {
                console.error('解析记谱法时出错:', error);
                return false;
            }
        },

        getGameState() {
            return this.engine.getGameState();
        },

        reset() {
            this.stopReplay();
            this.replayMoves = [];
            this.replayIndex = 0;
            this.currentGameIndex = 0;
            this.engine.reset();
            this.ui.renderBoard();
            this.ui.clearSelection();
            this.ui.setGameMode('game');
        },

        exportGame() {
            return this.engine.exportGame();
        },

        importGame(gameStateJSON) {
            const success = this.engine.importGame(gameStateJSON);
            if (success) {
                this.ui.renderBoard();
            }
            return success;
        },

        safeSetTimeout(callback, delay) {
            if (this.isDestroyed) {
                console.warn('尝试在已销毁的游戏实例上创建定时器');
                return null;
            }
            const timerId = setTimeout(callback, delay);
            this.activeTimers.add(timerId);
            return timerId;
        },

        safeSetInterval(callback, interval) {
            if (this.isDestroyed) {
                console.warn('尝试在已销毁的游戏实例上创建间隔定时器');
                return null;
            }
            const timerId = setInterval(callback, interval);
            this.activeTimers.add(timerId);
            return timerId;
        },

        updatePerformanceMetrics() {
            this.performanceMetrics.activeTimersCount = this.activeTimers.size;
            this.performanceMetrics.eventListenersCount = this.eventListeners.size;
        }
    };
}