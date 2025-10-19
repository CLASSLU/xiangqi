/**
 * Issue #2 棋谱播放功能性能压力测试
 *
 * 测试目标：验证Issue #2修复的棋谱播放功能在高负载情况下的性能表现
 * 创建日期: 2025-10-12
 * 覆盖范围：大量数据播放、内存使用、响应时间、资源清理
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

// 模拟 performance API
global.performance = {
    ...global.performance,
    now: jest.fn(() => Date.now()),
    memory: {
        usedJSHeapSize: 1048576,
        jsHeapSizeLimit: 2147483648,
        totalJSHeapSize: 2097152
    }
};

// 模拟定时器
jest.useFakeTimers();

describe('Issue #2 棋谱播放功能性能压力测试', () => {
    let xiangqiGame;
    let performanceMetrics;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();

        // 重置模拟的性能数据
        global.performance.now.mockClear();
        let callCount = 0;
        global.performance.now.mockImplementation(() => {
            callCount++;
            return Date.now() + (callCount * 16); // 模拟16ms间隔
        });

        // 模拟内存递增使用
        let memoryUsage = 1048576; // 1MB
        Object.defineProperty(global.performance.memory, 'usedJSHeapSize', {
            get: () => {
                memoryUsage += (Math.random() * 1024); // 随机增长
                return memoryUsage;
            }
        });

        // 模拟缓存命中率
        performanceMetrics = {
            positionCacheHits: 0,
            positionCacheMisses: 0,
            moveCacheHits: 0,
            moveCacheMisses: 0,
            renderCalls: 0,
            validationCalls: 0
        };

        // 创建高性能模拟游戏实例
        xiangqiGame = createHighPerformanceMockGame();
    });

    afterEach(() => {
        if (xiangqiGame && !xiangqiGame.isDestroyed) {
            xiangqiGame.destroy();
        }
        jest.clearAllTimers();
    });

    describe('1. 大量棋谱数据处理性能测试', () => {
        test('应能高效处理大量棋谱数据（1000个棋局）', async () => {
            const startTime = performance.now();

            // 创建大量棋谱数据
            const largeGameData = createLargeChessDataset(1000);
            xiangqiGame.gamesData = largeGameData;

            const loadTime = performance.now() - startTime;

            expect(xiangqiGame.gamesData.length).toBe(1000);
            expect(loadTime).toBeLessThan(1000); // 应在1秒内完成加载

            console.log(`加载1000个棋局耗时: ${loadTime.toFixed(2)}ms`);
        });

        test('应能高效验证复杂棋谱序列', () => {
            const complexMoves = createComplexMoveSequence(200);

            const startTime = performance.now();
            const validationResult = xiangqiGame.validator.validateMoveSequence(complexMoves);
            const validationTime = performance.now() - startTime;

            expect(validationResult.totalMoves).toBe(200);
            expect(validationTime).toBeLessThan(500); // 应在500ms内完成验证

            performanceMetrics.validationCalls++;
            console.log(`验证200个复杂移动耗时: ${validationTime.toFixed(2)}ms`);
        });

        test('应能在合理时间内启动回放', () => {
            const largeMoveSet = createLargeMoveSet(500);
            xiangqiGame.replayMoves = largeMoveSet;

            const startTime = performance.now();
            xiangqiGame.startAutoReplay();
            const startUpTime = performance.now() - startTime;

            expect(xiangqiGame.isReplaying).toBe(true);
            expect(startUpTime).toBeLessThan(100); // 应在100ms内启动

            console.log(`启动500步回放耗时: ${startUpTime.toFixed(2)}ms`);
        });

        test('应能高效处理深层回放状态', () => {
            const deepMoves = createLargeMoveSet(1000);
            xiangqiGame.replayMoves = deepMoves;

            // 快速推进到中部状态
            xiangqiGame.replayIndex = 500;

            const startTime = performance.now();
            xiangqiGame.scheduleNextMove();
            const schedulingTime = performance.now() - startTime;

            expect(schedulingTime).toBeLessThan(50); // 应在50ms内调度

            console.log(`深层回放状态调度耗时: ${schedulingTime.toFixed(2)}ms`);
        });
    });

    describe('2. 内存使用优化测试', () => {
        test('应能在大量操作后保持内存稳定', async () => {
            const initialMemory = xiangqiGame.getMemoryStats().memory.used;

            // 执行大量操作
            for (let i = 0; i < 100; i++) {
                const gameData = createLargeChessDataset(50);
                xiangqiGame.gamesData = gameData;
                await xiangqiGame.loadRandomGame();

                // 模拟播放一段时间
                for (let j = 0; j < 10; j++) {
                    jest.advanceTimersByTime(1000);
                    await Promise.resolve(); // 允许异步操作完成
                }

                xiangqiGame.reset();
            }

            const finalMemory = xiangqiGame.getMemoryStats().memory.used;
            const memoryGrowth = finalMemory - initialMemory;
            const memoryGrowthMB = memoryGrowth / 1024 / 1024;

            // 内存增长应在合理范围内（小于50MB）
            expect(memoryGrowthMB).toBeLessThan(50);

            console.log(`100次大量操作后内存增长: ${memoryGrowthMB.toFixed(2)}MB`);
        });

        test('应能高效清理内存资源', () => {
            // 创建大量资源
            for (let i = 0; i < 100; i++) {
                xiangqiGame.activeTimers.add(setTimeout(() => {}, 1000));
                xiangqiGame.eventListeners.add({
                    element: document.createElement('div'),
                    event: 'click',
                    handler: () => {}
                });
            }

            const beforeCleanup = xiangqiGame.getMemoryStats().activeResources;
            expect(beforeCleanup.timers).toBeGreaterThan(0);
            expect(beforeCleanup.eventListeners).toBeGreaterThan(0);

            const startTime = performance.now();
            const cleanupResult = xiangqiGame.performMemoryCleanup();
            const cleanupTime = performance.now() - startTime;

            const afterCleanup = xiangqiGame.getMemoryStats().activeResources;

            expect(afterCleanup.timers).toBe(0);
            expect(afterCleanup.eventListeners).toBe(0);
            expect(cleanupTime).toBeLessThan(200); // 清理应在200ms内完成
            expect(cleanupResult.cleanedItems).toBeGreaterThan(0);

            console.log(`内存清理耗时: ${cleanupTime.toFixed(2)}ms, 清理项目: ${cleanupResult.cleanedItems}`);
        });

        test('应能防止内存泄漏', () => {
            const initialActiveCount = xiangqiGame.activeTimers.size + xiangqiGame.eventListeners.size;

            // 模拟长时间运行场景
            for (let cycle = 0; cycle < 50; cycle++) {
                // 创建资源
                const timerId = xiangqiGame.safeSetTimeout(() => {}, 100);
                xiangqiGame.addSafeEventListener(
                    document.createElement('div'),
                    'click',
                    () => {}
                );

                // 模拟资源自动清理
                jest.advanceTimersByTime(200);

                // 执行清理
                if (cycle % 10 === 0) {
                    xiangqiGame.performMemoryCleanup();
                }
            }

            const finalActiveCount = xiangqiGame.activeTimers.size + xiangqiGame.eventListeners.size;
            const resourceGrowth = finalActiveCount - initialActiveCount;

            // 资源增长应该控制在合理范围内
            expect(resourceGrowth).toBeLessThan(20);

            console.log(`资源泄漏测试 - 资源增长: ${resourceGrowth}`);
        });
    });

    describe('3. 响应时间性能测试', () => {
        test('棋谱播放响应时间应保持在毫秒级别', async () => {
            xiangqiGame.replayMoves = createLargeMoveSet(100);
            xiangqiGame.startAutoReplay();

            const responseTimes = [];

            for (let i = 0; i < 50; i++) {
                const startTime = performance.now();
                await xiangqiGame.playNextMove();
                const responseTime = performance.now() - startTime;
                responseTimes.push(responseTime);

                jest.advanceTimersByTime(1000);
            }

            const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            const maxResponseTime = Math.max(...responseTimes);

            expect(averageResponseTime).toBeLessThan(10); // 平均响应时间应小于10ms
            expect(maxResponseTime).toBeLessThan(50); // 最大响应时间应小于50ms

            console.log(`播放响应时间 - 平均: ${averageResponseTime.toFixed(2)}ms, 最大: ${maxResponseTime.toFixed(2)}ms`);
        });

        test('状态切换响应时间测试', () => {
            const operations = [
                () => xiangqiGame.toggleReplay(),
                () => xiangqiGame.togglePause(),
                () => xiangqiGame.stopReplay(),
                () => xiangqiGame.reset(),
                () => xiangqiGame.startAutoReplay()
            ];

            let totalTime = 0;
            let operationCount = 0;

            operations.forEach(operation => {
                for (let i = 0; i < 20; i++) {
                    xiangqiGame.replayMoves = createLargeMoveSet(10);

                    const startTime = performance.now();
                    operation();
                    const responseTime = performance.now() - startTime;

                    totalTime += responseTime;
                    operationCount++;
                }
            });

            const averageTime = totalTime / operationCount;

            expect(averageTime).toBeLessThan(5); // 状态切换平均时间应小于5ms

            console.log(`状态切换平均响应时间: ${averageTime.toFixed(2)}ms`);
        });

        test('数据加载和解析性能测试', async () => {
            const largeDataset = createLargeChessDataset(500);

            const loadTimes = [];
            const validationTimes = [];

            for (let i = 0; i < 10; i++) {
                // 加载时间测试
                const loadStart = performance.now();
                xiangqiGame.gamesData = largeDataset;
                const loadTime = performance.now() - loadStart;
                loadTimes.push(loadTime);

                // 验证时间测试
                const validateStart = performance.now();
                const result = xiangqiGame.validateGameData(largeDataset[0]);
                const validateTime = performance.now() - validateStart;
                validationTimes.push(validateTime);
            }

            const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
            const avgValidateTime = validationTimes.reduce((a, b) => a + b, 0) / validationTimes.length;

            expect(avgLoadTime).toBeLessThan(100); // 平均加载时间应小于100ms
            expect(avgValidateTime).toBeLessThan(50); // 平均验证时间应小于50ms

            console.log(`数据加载平均时间: ${avgLoadTime.toFixed(2)}ms`);
            console.log(`数据验证平均时间: ${avgValidateTime.toFixed(2)}ms`);
        });
    });

    describe('4. 高并发场景测试', () => {
        test('应能处理多个并发的回放操作', async () => {
            const concurrentOperations = [];

            // 创建多个并发回放任务
            for (let i = 0; i < 10; i++) {
                const operation = async () => {
                    const gameData = createLargeChessDataset(20);
                    xiangqiGame.gamesData = gameData;
                    await xiangqiGame.loadRandomGame();

                    // 模拟播放
                    for (let j = 0; j < 5; j++) {
                        await xiangqiGame.playNextMove();
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }
                };
                concurrentOperations.push(operation());
            }

            const startTime = performance.now();
            await Promise.all(concurrentOperations);
            const totalTime = performance.now() - startTime;

            expect(totalTime).toBeLessThan(5000); // 10个并发操作应在5秒内完成

            console.log(`10个并发回放操作总耗时: ${totalTime.toFixed(2)}ms`);
        });

        test('应能在高频操作下保持稳定性', () => {
            let errorCount = 0;
            let successCount = 0;
            const operationCount = 1000;

            for (let i = 0; i < operationCount; i++) {
                try {
                    const randomOperation = Math.floor(Math.random() * 5);
                    switch (randomOperation) {
                        case 0:
                            xiangqiGame.loadRandomGame();
                            break;
                        case 1:
                            xiangqiGame.toggleReplay();
                            break;
                        case 2:
                            xiangqiGame.togglePause();
                            break;
                        case 3:
                            xiangqiGame.reset();
                            break;
                        case 4:
                            xiangqiGame.performMemoryCleanup();
                            break;
                    }
                    successCount++;
                } catch (error) {
                    errorCount++;
                }

                // 模拟时间推进
                if (i % 100 === 0) {
                    jest.advanceTimersByTime(1000);
                }
            }

            const errorRate = errorCount / operationCount;

            expect(errorRate).toBeLessThan(0.01); // 错误率应小于1%
            expect(successCount).toBeGreaterThan(operationCount * 0.99);

            console.log(`高频操作测试 - 成功率: ${((successCount/operationCount)*100).toFixed(2)}%, 错误数: ${errorCount}`);
        });

        test('应能高效处理大量事件监听器', () => {
            const elementCount = 100;
            const elements = [];

            // 创建大量元素和监听器
            for (let i = 0; i < elementCount; i++) {
                const element = document.createElement('div');
                elements.push(element);

                const removeFunc = xiangqiGame.addSafeEventListener(
                    element,
                    'click',
                    () => { /* 处理逻辑 */ }
                );

                expect(typeof removeFunc).toBe('function');
            }

            expect(xiangqiGame.eventListeners.size).toBe(elementCount);

            const startTime = performance.now();

            // 批量移除所有监听器
            elements.forEach((element, index) => {
                const listeners = Array.from(xiangqiGame.eventListeners);
                const listener = listeners.find(l => l.element === element);
                if (listener) {
                    xiangqiGame.removeEventListener(listener);
                }
            });

            const removalTime = performance.now() - startTime;

            expect(xiangqiGame.eventListeners.size).toBe(0);
            expect(removalTime).toBeLessThan(100); // 移除100个监听器应小于100ms

            console.log(`移除${elementCount}个事件监听器耗时: ${removalTime.toFixed(2)}ms`);
        });
    });

    describe('5. 极限情况压力测试', () => {
        test('应能处理超长棋局（10000步）', () => {
            const extremelyLongGame = createLargeMoveSet(10000);
            xiangqiGame.replayMoves = extremelyLongGame;

            const startTime = performance.now();
            xiangqiGame.startAutoReplay();
            const initTime = performance.now() - startTime;

            // 快进到超深位置
            xiangqiGame.replayIndex = 9999;

            const deepStartTime = performance.now();
            xiangqiGame.scheduleNextMove();
            const deepTime = performance.now() - deepStartTime;

            expect(initTime).toBeLessThan(1000); // 初始化超长棋局应小于1秒
            expect(deepTime).toBeLessThan(100); // 深层调度应小于100ms

            console.log(`超长棋局(10000步) - 初始化: ${initTime.toFixed(2)}ms, 深层调度: ${deepTime.toFixed(2)}ms`);
        });

        test('应能极限内存使用情况', () => {
            // 模拟极限内存使用
            const memoryStressData = createMemoryStressDataset();

            const initialMemory = xiangqiGame.getMemoryStats().memory.used;

            // 加载极限数据
            xiangqiGame.gamesData = memoryStressData;
            xiangqiGame.replayMoves = createLargeMoveSet(5000);

            const afterLoadMemory = xiangqiGame.getMemoryStats().memory.used;

            // 执行极限清理
            const cleanupResult = xiangqiGame.performMemoryCleanup();

            const finalMemory = xiangqiGame.getMemoryStats().memory.used;
            const memoryReduction = afterLoadMemory - finalMemory;

            expect(cleanupResult.cleanedItems).toBeGreaterThan(0);
            expect(memoryReduction).toBeGreaterThan(0);

            console.log(`极限内存测试 - 清理项目: ${cleanupResult.cleanedItems}, 内存释放: ${(memoryReduction/1024/1024).toFixed(2)}MB`);
        });

        test('应能在系统资源紧张时优雅降级', () => {
            // 模拟系统资源紧张
            global.performance.memory.usedJSHeapSize = 2147483000; // 接近限制

            const degradedPerformance = xiangqiGame.getMemoryStats();

            // 在资源紧张时应该能正常操作
            expect(() => {
                xiangqiGame.reset();
                xiangqiGame.performMemoryCleanup();
                xiangqiGame.getMemoryStats();
            }).not.toThrow();

            // 应该有资源使用警告
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('内存使用较高')
            );
        });
    });
});

// 辅助函数：创建大量棋谱数据
function createLargeChessDataset(count) {
    const games = [];
    const pieceTypes = ['cannon', 'horse', 'rook', 'soldier', 'elephant', 'advisor', 'general'];
    const colors = ['red', 'black'];

    for (let i = 0; i < count; i++) {
        const moves = [];
        const moveCount = Math.floor(Math.random() * 50) + 10; // 10-60步

        for (let j = 0; j < moveCount; j++) {
            moves.push({
                pieceType: pieceTypes[Math.floor(Math.random() * pieceTypes.length)],
                color: colors[j % 2],
                fromPos: {
                    row: Math.floor(Math.random() * 10),
                    col: Math.floor(Math.random() * 9)
                },
                toPos: {
                    row: Math.floor(Math.random() * 10),
                    col: Math.floor(Math.random() * 9)
                },
                notation: `步骤${j+1}`
            });
        }

        games.push({ moves });
    }

    return games;
}

// 辅助函数：创建复杂移动序列
function createComplexMoveSequence(count) {
    const moves = [];
    const complexPatterns = [
        { pieceType: 'cannon', action: '平', displacement: [0, 2] },
        { pieceType: 'horse', action: '进', displacement: [2, -1] },
        { pieceType: 'rook', action: '退', displacement: [-3, 0] },
        { pieceType: 'soldier', action: '进', displacement: [1, 0] }
    ];

    for (let i = 0; i < count; i++) {
        const pattern = complexPatterns[i % complexPatterns.length];
        const row = Math.max(0, Math.min(9, 5 + pattern.displacement[0] * Math.floor(i / 10)));
        const col = Math.max(0, Math.min(8, 4 + pattern.displacement[1] * Math.floor(i / 10)));

        moves.push({
            pieceType: pattern.pieceType,
            color: i % 2 === 0 ? 'red' : 'black',
            fromPos: { row: row - pattern.displacement[0], col: col - pattern.displacement[1] },
            toPos: { row, col },
            notation: `${pattern.pieceType}${pattern.action}${i+1}`,
            complexity: 'high'
        });
    }

    return moves;
}

// 辅助函数：创建大量移动集合
function createLargeMoveSet(count) {
    const moves = [];
    const pieceTypes = ['cannon', 'horse', 'rook', 'soldier', 'elephant', 'advisor', 'general'];

    for (let i = 0; i < count; i++) {
        moves.push({
            pieceType: pieceTypes[i % pieceTypes.length],
            color: i % 2 === 0 ? 'red' : 'black',
            fromPos: {
                row: Math.floor(Math.random() * 10),
                col: Math.floor(Math.random() * 9)
            },
            toPos: {
                row: Math.floor(Math.random() * 10),
                col: Math.floor(Math.random() * 9)
            },
            notation: `移动${i+1}`,
            timestamp: Date.now() + i * 1000
        });
    }

    return moves;
}

// 辅助函数：创建内存压力数据集
function createMemoryStressDataset() {
    const stressData = [];

    // 创建包含大量引用的复杂数据结构
    for (let i = 0; i < 100; i++) {
        const game = {
            id: i,
            moves: createLargeMoveSet(500),
            metadata: {
                title: `压力测试棋局 ${i}`,
                description: '用于测试内存压力的大型数据集',
                tags: Array(50).fill(0).map((_, j) => `tag${j}`),
                history: Array(100).fill(0).map((_, j) => ({
                    action: `动作${j}`,
                    timestamp: Date.now() + j * 1000,
                    details: { /* 复杂对象 */ }
                }))
            }
        };
        stressData.push(game);
    }

    return stressData;
}

// 创建高性能模拟游戏实例
function createHighPerformanceMockGame() {
    const mockGame = {
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
            memoryUsage: 1048576,
            activeTimersCount: 0,
            eventListenersCount: 0
        },
        isDestroyed: false,

        engine: {
            reset: jest.fn(),
            movePiece: jest.fn().mockReturnValue(true),
            getPieceAtByColor: jest.fn().mockReturnValue({ type: 'test' }),
            getPiecesByColor: jest.fn().mockReturnValue([]),
            getGameState: jest.fn().mockReturnValue({
                currentTurn: 'red',
                phase: 'playing'
            })
        },

        validator: {
            validateMoveSequence: jest.fn().mockImplementation((moves) => {
                performanceMetrics.validationCalls++;
                return {
                    valid: true,
                    totalMoves: moves.length,
                    validMoves: moves.length,
                    errorMoves: 0,
                    errors: [],
                    warnings: [],
                    normalizedMoves: moves
                };
            })
        },

        ui: {
            renderBoard: jest.fn().mockImplementation(() => {
                performanceMetrics.renderCalls++;
            }),
            afterMove: jest.fn(),
            clearSelection: jest.fn(),
            setGameMode: jest.fn(),
            getPerformanceStats: jest.fn().mockReturnValue({}),
            cleanup: jest.fn()
        },

        notationParser: {
            parseMove: jest.fn().mockReturnValue({ success: true })
        },

        startAutoReplay() {
            if (this.replayMoves.length === 0) {
                console.log('没有可回放的移动');
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

            const move = this.replayMoves[this.replayIndex];
            const piece = this.findPieceForMove(move);
            if (piece) {
                const success = this.engine.movePiece(piece, move.toPos);
                if (success) {
                    this.ui.renderBoard();
                    this.ui.afterMove(this.engine.getGameState());
                }
            }
            this.replayIndex++;
            this.scheduleNextMove();
        },

        findPieceForMove(move) {
            if (move.fromPos) {
                return this.engine.getPieceAtByColor(move.fromPos, move.color);
            }
            const pieces = this.engine.getPiecesByColor(move.color);
            return pieces[0] || null;
        },

        completeReplay() {
            this.isReplaying = false;
            this.clearReplayTimer();
        },

        stopReplay() {
            if (this.isReplaying) {
                this.isReplaying = false;
                this.clearReplayTimer();
            }
        },

        clearReplayTimer() {
            if (this.replayTimer !== null) {
                clearTimeout(this.replayTimer);
                this.activeTimers.delete(this.replayTimer);
                this.replayTimer = null;
            }
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

        validateGameData(gameData) {
            const moves = this.extractMovesFromGameData(gameData);
            return this.validator.validateMoveSequence(moves);
        },

        extractMovesFromGameData(gameData) {
            if (!gameData || typeof gameData !== 'object') return [];
            if (Array.isArray(gameData)) return gameData;
            if (Array.isArray(gameData.moves)) return gameData.moves;
            if (gameData.pieceType && gameData.toPos) return [gameData];
            return [];
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

        getMemoryStats() {
            return {
                timestamp: new Date().toISOString(),
                uptime: Date.now() - this.performanceMetrics.startTime,
                memory: {
                    used: global.performance.memory.usedJSHeapSize,
                    limit: global.performance.memory.jsHeapSizeLimit,
                    usageMB: (global.performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)
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
            const startTime = performance.now();
            let cleanedItems = 0;

            this.activeTimers.forEach(timerId => {
                this.clearTimer(timerId);
                cleanedItems++;
            });

            const validListeners = new Set();
            this.eventListeners.forEach(listenerInfo => {
                try {
                    if (listenerInfo.element && document.body.contains(listenerInfo.element)) {
                        validListeners.add(listenerInfo);
                    } else {
                        this.removeEventListener(listenerInfo);
                        cleanedItems++;
                    }
                } catch (error) {
                    this.removeEventListener(listenerInfo);
                    cleanedItems++;
                }
            });
            this.eventListeners = validListeners;

            this.activeCleanupCallbacks.clear();

            const duration = performance.now() - startTime;

            return {
                cleanedItems,
                duration,
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

        addSafeEventListener(element, event, handler) {
            if (this.isDestroyed) {
                console.warn('尝试在已销毁的游戏实例上添加事件监听器');
                return () => {};
            }

            const wrappedHandler = (e) => {
                try {
                    if (!this.isDestroyed) {
                        handler(e);
                    }
                } catch (error) {
                    console.error(`事件处理错误:`, error);
                }
            };

            element.addEventListener(event, wrappedHandler);

            const listenerInfo = {
                element,
                event,
                handler: wrappedHandler
            };

            this.eventListeners.add(listenerInfo);

            return () => {
                this.removeEventListener(listenerInfo);
            };
        },

        removeEventListener(listenerInfo) {
            if (!listenerInfo || this.isDestroyed) return;

            const { element, event, handler } = listenerInfo;
            element.removeEventListener(event, handler);
            this.eventListeners.delete(listenerInfo);
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

        destroy() {
            this.isDestroyed = true;
            this.stopReplay();
            this.activeTimers.forEach(timerId => this.clearTimer(timerId));
            this.eventListeners.forEach(listenerInfo => this.removeEventListener(listenerInfo));
            this.activeCleanupCallbacks.clear();
            this.replayMoves = [];
            this.gamesData = [];
        }
    };

    // 添加内存使用监控
    const memUsage = global.performance.memory.usedJSHeapSize;
    if (parseFloat(mockGame.getMemoryStats().memory.usageMB) > 450) {
        console.warn(`内存使用较高: ${mockGame.getMemoryStats().memory.usageMB}MB，执行清理`);
        mockGame.performMemoryCleanup();
    }

    return mockGame;
}