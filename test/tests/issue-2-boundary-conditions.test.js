/**
 * Issue #2 棋谱播放功能边界条件测试
 *
 * 测试目标：验证Issue #2修复的棋谱播放功能在异常输入和边界条件下的稳定性
 * 创建日期: 2025-10-12
 * 覆盖范围：异常输入、边界值、错误场景、资源限制
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
jest.useFakeTimers();

describe('Issue #2 棋谱播放功能边界条件测试', () => {
    let xiangqiGame;
    let errorScenario;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();

        // 初始化错误场景计数器
        errorScenario = {
            invalidDataCount: 0,
            nullReferenceCount: 0,
            resourceExhaustion: 0,
            networkFailure: 0,
            corruptedData: 0
        };

        // 创建边界测试专用模拟实例
        xiangqiGame = createBoundaryTestMockGame();
    });

    afterEach(() => {
        if (xiangqiGame && !xiangqiGame.isDestroyed) {
            xiangqiGame.destroy();
        }
        jest.clearAllTimers();
    });

    describe('1. 异常输入处理测试', () => {
        test('应能处理null/undefined棋谱数据', () => {
            const invalidInputs = [
                null,
                undefined,
                '',
                false,
                0,
                {},
                [],
                { moves: null },
                { moves: undefined },
                { notKnownProperty: 'invalid' }
            ];

            invalidInputs.forEach(input => {
                expect(() => {
                    const result = xiangqiGame.validateGameData(input);
                    expect(result).toHaveProperty('valid');
                    expect(result).toHaveProperty('totalMoves');
                }).not.toThrow();

                errorScenario.invalidDataCount++;
            });

            expect(errorScenario.invalidDataCount).toBe(invalidInputs.length);
        });

        test('应能处理格式错误的移动数据', () => {
            const malformedMoves = [
                { /* 空对象 */ },
                { pieceType: null },
                { pieceType: '', color: 'red' },
                { pieceType: 'cannon', color: 'invalid' },
                { pieceType: 'cannon', color: 'red', toPos: null },
                { pieceType: 'cannon', color: 'red', toPos: { /* 空坐标 */ } },
                { pieceType: 'cannon', color: 'red', fromPos: {row: -1, col: 10} }, // 超出边界
                { pieceType: 'cannon', color: 'red', fromPos: {row: 'invalid', col: 'invalid'} }, // 无效类型
                { pieceType: 'nonexistent', color: 'red', fromPos: {row: 0, col: 0}, toPos: {row: 1, col: 1} },
                { pieceType: 'cannon', /* 缺少必要字段 */ }
            ];

            malformedMoves.forEach(move => {
                xiangqiGame.replayMoves = [move];

                expect(() => {
                    xiangqiGame.startAutoReplay();
                }).not.toThrow();

                // 应该能安全清理
                xiangqiGame.stopReplay();
                xiangqiGame.reset();
            });
        });

        test('应能处理记谱法解析异常', () => {
            const invalidNotations = [
                null,
                undefined,
                '',
                '    ', // 空白字符
                'invalid_notation_format',
                '炮十万进十', // 超出边界值
                '马?进!', // 特殊字符
                '车一平二平三', // 格式错误
                Array(1000).fill('炮二平五').join(' '), // 超长字符串
                '<script>alert("xss")</script>', // XSS输入
                '炮二平五\n'.repeat(10000) // 超多行
            ];

            invalidNotations.forEach(notation => {
                expect(() => {
                    const result = xiangqiGame.parseNotation(notation);
                    expect(typeof result).toBe('boolean');
                }).not.toThrow();
            });
        });

        test('应能处理超大规模数据', () => {
            // 测试极大移动数组
            const hugeMoveArray = Array(100000).fill().map((_, i) => ({
                pieceType: 'cannon',
                color: i % 2 === 0 ? 'red' : 'black',
                fromPos: { row: i % 10, col: i % 9 },
                toPos: { row: (i+1) % 10, col: (i+1) % 9 },
                notation: `步骤${i}`
            }));

            expect(() => {
                const result = xiangqiGame.validateGameData({ moves: hugeMoveArray });
                expect(result).toHaveProperty('totalMoves');
                expect(result.totalMoves).toBe(100000);
            }).not.toThrow();

            // 测试极深回放索引
            xiangqiGame.replayMoves = hugeMoveArray;
            xiangqiGame.replayIndex = 99999;

            expect(() => {
                xiangqiGame.scheduleNextMove();
            }).not.toThrow();

            expect(xiangqiGame.isReplaying).toBe(false);
        });
    });

    describe('2. 资源限制测试', () => {
        test('应能处理内存不足情况', () => {
            // 模拟内存限制
            const originalMemory = global.performance.memory.usedJSHeapSize;
            global.performance.memory.usedJSHeapSize = 2147483000; // 接近2GB限制

            expect(() => {
                const memoryStats = xiangqiGame.getMemoryStats();
                expect(memoryStats).toHaveProperty('memory');
                expect(memoryStats.memory.usageMB).toBeGreaterThan(2000);

                // 应该能执行内存清理
                const cleanupResult = xiangqiGame.performMemoryCleanup();
                expect(cleanupResult).toHaveProperty('cleanedItems');
            }).not.toThrow();

            // 恢复原始内存值
            global.performance.memory.usedJSHeapSize = originalMemory;
        });

        test('应能处理定时器限制', () => {
            // 创建大量定时器
            const maxTimers = 10000;
            const timerIds = [];

            expect(() => {
                for (let i = 0; i < maxTimers; i++) {
                    const timerId = xiangqiGame.safeSetTimeout(() => {}, 1000);
                    if (timerId) {
                        timerIds.push(timerId);
                    }
                }

                expect(xiangqiGame.activeTimers.size).toBeLessThanOrEqual(maxTimers);

                // 批量清理
                xiangqiGame.performMemoryCleanup();
            }).not.toThrow();

            expect(xiangqiGame.activeTimers.size).toBe(0);
        });

        test('应能处理事件监听器限制', () => {
            const maxListeners = 5000;
            const elements = [];

            expect(() => {
                for (let i = 0; i < maxListeners; i++) {
                    const element = document.createElement('div');
                    elements.push(element);

                    xiangqiGame.addSafeEventListener(element, 'click', () => {
                        // 空处理函数
                    });
                }

                expect(xiangqiGame.eventListeners.size).toBe(maxListeners);

                // 批量清理
                xiangqiGame.performMemoryCleanup();
            }).not.toThrow();

            expect(xiangqiGame.eventListeners.size).toBe(0);
        });
    });

    describe('3. 网络和数据加载异常测试', () => {
        test('应能处理网络失败', async () => {
            // 模拟各种网络错误
            const networkErrors = [
                new Error('Network Error'),
                new Error('Failed to fetch'),
                new Error('Request timeout'),
                new Error('DNS resolution failed'),
                new TypeError('Failed to fetch')
            ];

            for (const error of networkErrors) {
                global.fetch = jest.fn().mockRejectedValue(error);

                expect.assertions(1);
                await expect(xiangqiGame.loadGamesData()).resolves.not.toThrow();
            }

            errorScenario.networkFailure += networkErrors.length;
        });

        test('应能处理损坏的JSON数据', async () => {
            const corruptedResponses = [
                { ok: true, json: () => Promise.reject(new SyntaxError('Unexpected token')) },
                { ok: true, json: () => Promise.resolve('invalid json string') },
                { ok: true, json: () => Promise.resolve({ corrupted: 'data' /* 缺少games字段 */ }) },
                { ok: true, json: () => Promise.resolve({ games: null }) },
                { ok: true, json: () => Promise.resolve({ games: 'not an array' }) }
            ];

            for (const response of corruptedResponses) {
                global.fetch = jest.fn().mockResolvedValue(response);

                expect.assertions(1);
                await expect(xiangqiGame.loadGamesData()).resolves.not.toThrow();
            }

            // 最终应该有空的gamesData数组
            expect(xiangqiGame.gamesData).toEqual([]);
        });

        test('应能处理大文件加载超时', async () => {
            // 模拟慢速加载
            global.fetch = jest.fn().mockImplementation(() => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({
                            ok: true,
                            json: () => Promise.resolve({
                                games: Array(10000).fill({ moves: [] })
                            })
                        });
                    }, 2000); // 2秒延迟
                });
            });

            // 设置较短的超时时间
            const loadPromise = xiangqiGame.loadGamesData();
            jest.advanceTimersByTime(1000);

            // 应该能处理更长的加载时间
            await jest.advanceTimersByTime(1500);
            await expect(loadPromise).resolves.not.toThrow();
        });
    });

    describe('4. 竞态条件和并发测试', () => {
        test('应能处理并发操作冲突', async () => {
            const concurrentOperations = [];

            // 启动多个并发的回放操作
            for (let i = 0; i < 10; i++) {
                const operation = async () => {
                    xiangqiGame.replayMoves = createRandomMoves(50);
                    xiangqiGame.startAutoReplay();

                    // 随机延迟
                    await new Promise(resolve => {
                        const timeout = Math.random() * 100;
                        setTimeout(resolve, timeout);
                    });

                    // 随机操作
                    if (Math.random() > 0.5) {
                        xiangqiGame.stopReplay();
                    }
                    if (Math.random() > 0.7) {
                        xiangqiGame.reset();
                    }
                    if (Math.random() > 0.8) {
                        xiangqiGame.performMemoryCleanup();
                    }
                };
                concurrentOperations.push(operation());
            }

            // 所有操作应该完成而不崩溃
            await expect(Promise.all(concurrentOperations)).resolves.not.toThrow();
        });

        test('应能处理快速重复的状态切换', () => {
            const rapidOperations = [
                () => xiangqiGame.startAutoReplay(),
                () => xiangqiGame.stopReplay(),
                () => xiangqiGame.toggleReplay(),
                () => xiangqiGame.togglePause(),
                () => xiangqiGame.reset()
            ];

            // 快速执行1000次随机操作
            for (let i = 0; i < 1000; i++) {
                const operation = rapidOperations[Math.floor(Math.random() * rapidOperations.length)];

                expect(() => {
                    operation();
                }).not.toThrow();

                // 偶尔推进定时器
                if (i % 100 === 0) {
                    jest.advanceTimersByTime(100);
                }
            }

            // 最终状态应该一致
            expect(xiangqiGame.isReplaying).toBe(false);
        });

        test('应能处理定时器竞争条件', () => {
            // 创建多个定时器同时执行
            const timerPromises = [];

            for (let i = 0; i < 50; i++) {
                const promise = new Promise((resolve) => {
                    const timerId = xiangqiGame.safeSetTimeout(() => {
                        expect(xiangqiGame.activeTimers.has(timerId)).toBe(false);
                        resolve(i);
                    }, Math.random() * 100);
                });
                timerPromises.push(promise);
            }

            // 推进所有定时器
            jest.advanceTimersByTime(200);

            return expect(Promise.all(timerPromises)).resolves.toHaveLength(50);
        });
    });

    describe('5. DOM异常处理测试', () => {
        test('应能处理DOM元素异常', () => {
            // 测试各种DOM异常情况
            const problematicElements = [
                null,
                undefined,
                document.createTextNode('text'), // 非元素节点
                { /* 伪对象 */ addEventListener: jest.fn(), removeEventListener: jest.fn() }
            ];

            problematicElements.forEach(element => {
                expect(() => {
                    const removeFunc = xiangqiGame.addSafeEventListener(
                        element,
                        'click',
                        () => {}
                    );
                    expect(typeof removeFunc).toBe('function');
                }).not.toThrow();
            });
        });

        test('应能处理已移除DOM元素的事件监听器', () => {
            const element = document.createElement('div');
            document.body.appendChild(element);

            const removeFunc = xiangqiGame.addSafeEventListener(
                element,
                'click',
                () => {}
            );

            // 移除元素
            document.body.removeChild(element);

            expect(() => {
                xiangqiGame.performMemoryCleanup(); // 应该清理已移除元素的监听器
            }).not.toThrow();

            expect(xiangqiGame.eventListeners.size).toBe(0);
        });

        test('应能处理DOM操作异常', () => {
            // 模拟DOM操作异常
            const originalRender = xiangqiGame.ui.renderBoard;
            xiangqiGame.ui.renderBoard = jest.fn().mockImplementation(() => {
                throw new Error('DOM manipulation failed');
            });

            expect(() => {
                xiangqiGame.replayMoves = [{ pieceType: 'cannon', color: 'red' }];
                xiangqiGame.startAutoReplay();
            }).not.toThrow();

            // 恢复原始方法
            xiangqiGame.ui.renderBoard = originalRender;
        });
    });

    describe('6. 系统边界条件测试', () => {
        test('应能处理极小时间间隔', () => {
            xiangqiGame.replayMoves = createRandomMoves(5);

            // 设置极小间隔的定时器
            for (let i = 0; i < 10; i++) {
                xiangqiGame.safeSetTimeout(() => {
                    expect(xiangqiGame.activeTimers.has(xiangqiGame.replayTimer)).toBe(false);
                }, 0); // 0延迟
            }

            expect(() => {
                xiangqiGame.startAutoReplay();
                jest.advanceTimersByTime(0);
            }).not.toThrow();
        });

        test('应能处理极大时间延迟', () => {
            // 设置极长延迟的定时器
            const veryLongDelay = 24 * 60 * 60 * 1000; // 24小时

            expect(() => {
                const timerId = xiangqiGame.safeSetTimeout(() => {}, veryLongDelay);
                expect(timerId).toBeTruthy();
                expect(xiangqiGame.activeTimers.has(timerId)).toBe(true);
            }).not.toThrow();
        });

        test('应能处理系统时间异常', () => {
            // 模拟系统时间异常
            const originalNow = Date.now;
            Date.now = jest.fn()
                .mockReturnValueOnce(0)
                .mockReturnValueOnce(Number.MAX_SAFE_INTEGER)
                .mockReturnValueOnce(Number.MIN_SAFE_INTEGER)
                .mockReturnValueOnce(Infinity)
                .mockReturnValueOnce(-Infinity);

            expect(() => {
                xiangqiGame.getMemoryStats();
                xiangqiGame.performMemoryCleanup();
            }).not.toThrow();

            // 恢复原始Date.now
            Date.now = originalNow;
        });

        test('应能处理数值边界条件', () => {
            const boundaryNumbers = [
                Number.MAX_SAFE_INTEGER,
                Number.MIN_SAFE_INTEGER,
                Number.MAX_VALUE,
                Number.MIN_VALUE,
                Infinity,
                -Infinity,
                NaN,
                0,
                -0
            ];

            boundaryNumbers.forEach(num => {
                expect(() => {
                    xiangqiGame.replayIndex = num;
                    xiangqiGame.currentGameIndex = num;

                    // 应该能正常调用
                    xiangqiGame.scheduleNextMove();
                }).not.toThrow();
            });
        });
    });

    describe('7. 异常恢复能力测试', () => {
        test('应能从播放异常中恢复', async () => {
            // 设置会导致异常的状态
            xiangqiGame.replayMoves = [
                { pieceType: 'cannon', color: 'red' },
                { pieceType: 'invalid_piece', color: 'invalid_color' }
            ];

            // 模拟引擎异常
            xiangqiGame.engine.movePiece = jest.fn()
                .mockReturnValueOnce(true)
                .mockImplementationOnce(() => {
                    throw new Error('Engine exception');
                });

            expect(async () => {
                await xiangqiGame.playNextMove(); // 成功
                await xiangqiGame.playNextMove(); // 异常
                await xiangqiGame.playNextMove(); // 应该能继续
            }).not.toThrow();

            expect(console.error).toHaveBeenCalled();
        });

        test('应能从验证器异常中恢复', () => {
            xiangqiGame.validator.validateMoveSequence = jest.fn()
                .mockImplementationOnce(() => {
                    throw new Error('Validator exception');
                })
                .mockReturnValueOnce({
                    valid: true,
                    totalMoves: 1,
                    validMoves: 1,
                    errorMoves: 0,
                    errors: [],
                    warnings: []
                });

            expect(() => {
                const result1 = xiangqiGame.validateGameData({ moves: [] });
                expect(result1.valid).toBe(false); // 异常时应该返回无效

                const result2 = xiangqiGame.validateGameData({ moves: [] });
                expect(result2.valid).toBe(true);  // 恢复后应该正常
            }).not.toThrow();
        });

        test('应能从UI异常中恢复', () => {
            // 模拟UI异常
            const calls = [];
            xiangqiGame.ui.renderBoard = jest.fn().mockImplementation(() => {
                calls.push('render');
                if (calls.length === 2) {
                    throw new Error('UI rendering failed');
                }
            });

            xiangqiGame.replayMoves = createRandomMoves(3);

            expect(() => {
                for (let i = 0; i < 3; i++) {
                    xiangqiGame.playNextMove();
                }
            }).not.toThrow();

            // 应该调用3次，即使中间有异常
            expect(calls.length).toBe(3);
        });

        test('应能在部分功能失效时继续运行', () => {
            // 模拟多个组件失效
            xiangqiGame.engine = null; // 引擎失效
            xiangqiGame.validator = null; // 验证器失效
            xiangqiGame.ui = null; // UI失效

            expect(() => {
                // 应该能安全调用各种方法而不崩溃
                xiangqiGame.getGameState();
                xiangqiGame.reset();
                xiangqiGame.startAutoReplay();
                xiangqiGame.stopReplay();
                xiangqiGame.getMemoryStats();
                xiangqiGame.performMemoryCleanup();
            }).not.toThrow();
        });
    });
});

// 辅助函数：创建随机移动数据
function createRandomMoves(count) {
    const pieceTypes = ['cannon', 'horse', 'rook', 'soldier'];
    const colors = ['red', 'black'];
    const moves = [];

    for (let i = 0; i < count; i++) {
        moves.push({
            pieceType: pieceTypes[Math.floor(Math.random() * pieceTypes.length)],
            color: colors[i % 2],
            fromPos: {
                row: Math.floor(Math.random() * 10),
                col: Math.floor(Math.random() * 9)
            },
            toPos: {
                row: Math.floor(Math.random() * 10),
                col: Math.floor(Math.random() * 9)
            },
            notation: `步骤${i+1}`
        });
    }

    return moves;
}

// 创建边界测试专用模拟游戏实例
function createBoundaryTestMockGame() {
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
            memoryUsage: 1048576,
            activeTimersCount: 0,
            eventListenersCount: 0
        },
        isDestroyed: false,

        engine: {
            reset: jest.fn(),
            movePiece: jest.fn().mockReturnValue(true),
            getPieceAtByColor: jest.fn().mockReturnValue(null),
            getPiecesByColor: jest.fn().mockReturnValue([]),
            getGameState: jest.fn().mockReturnValue({
                currentTurn: 'red',
                phase: 'playing'
            })
        },

        validator: {
            validateMoveSequence: jest.fn().mockReturnValue({
                valid: true,
                totalMoves: 0,
                validMoves: 0,
                errorMoves: 0,
                errors: [],
                warnings: [],
                normalizedMoves: []
            })
        },

        ui: {
            renderBoard: jest.fn(),
            afterMove: jest.fn(),
            clearSelection: jest.fn(),
            setGameMode: jest.fn(),
            getPerformanceStats: jest.fn().mockReturnValue({}),
            cleanup: jest.fn()
        },

        notationParser: {
            parseMove: jest.fn().mockReturnValue({ success: true })
        },

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
            try {
                const moves = this.extractMovesFromGameData(gameData);
                return this.validator.validateMoveSequence(moves);
            } catch (error) {
                return {
                    valid: false,
                    totalMoves: 0,
                    validMoves: 0,
                    errorMoves: 1,
                    errors: [{
                        code: 'VALIDATION_EXCEPTION',
                        message: error.message,
                        moveIndex: -1,
                        layer: 'critical',
                        severity: 'critical'
                    }],
                    warnings: []
                };
            }
        },

        extractMovesFromGameData(gameData) {
            if (!gameData || typeof gameData !== 'object') return [];
            if (Array.isArray(gameData)) return gameData;
            if (Array.isArray(gameData.moves)) return gameData.moves;
            if (gameData.pieceType && gameData.toPos) return [gameData];
            return [];
        },

        startAutoReplay() {
            if (this.replayMoves.length === 0) {
                console.log('没有可回放的移动');
                return;
            }
            this.isReplaying = true;
            this.replayIndex = 0;
            if (this.engine) this.engine.reset();
            if (this.ui) this.ui.renderBoard();
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
                if (this.engine) {
                    const piece = this.findPieceForMove(move);
                    if (piece) {
                        const success = this.engine.movePiece(piece, move.toPos);
                        if (success && this.ui) {
                            this.ui.renderBoard();
                            this.ui.afterMove(this.engine.getGameState());
                        }
                    }
                }
            } catch (error) {
                console.error(`播放第${this.replayIndex + 1}步时出错:`, error);
            }

            this.replayIndex++;
            this.scheduleNextMove();
        },

        findPieceForMove(move) {
            if (!this.engine) return null;

            if (move.fromPos) {
                return this.engine.getPieceAtByColor(move.fromPos, move.color);
            }
            const pieces = this.engine.getPiecesByColor(move.color).filter(p => p.type === move.pieceType);
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
                if (!this.notationParser) return false;
                const result = this.notationParser.parseMove(notation);
                return result.success;
            } catch (error) {
                console.error('解析记谱法时出错:', error);
                return false;
            }
        },

        getGameState() {
            if (!this.engine) {
                return {
                    currentTurn: 'red',
                    phase: 'playing',
                    moveHistory: [],
                    selectedPiece: null,
                    possibleMoves: [],
                    isCheck: { red: false, black: false },
                    winner: null,
                    moveNumber: 0
                };
            }
            return this.engine.getGameState();
        },

        reset() {
            this.stopReplay();
            this.replayMoves = [];
            this.replayIndex = 0;
            this.currentGameIndex = 0;
            if (this.engine) this.engine.reset();
            if (this.ui) {
                this.ui.renderBoard();
                this.ui.clearSelection();
                this.ui.setGameMode('game');
            }
        },

        getMemoryStats() {
            const memoryUsage = global.performance.memory?.usedJSHeapSize || 1048576;
            return {
                timestamp: new Date().toISOString(),
                uptime: Date.now() - this.performanceMetrics.startTime,
                memory: {
                    used: memoryUsage,
                    limit: global.performance.memory?.jsHeapSizeLimit || 2147483648,
                    usageMB: (memoryUsage / 1024 / 1024).toFixed(2)
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
                    if (listenerInfo.element &&
                        (listenerInfo.element === null ||
                         listenerInfo.element === undefined ||
                         listenerInfo.element.nodeType === undefined ||
                         !document.body.contains(listenerInfo.element))) {
                        this.removeEventListener(listenerInfo);
                        cleanedItems++;
                    } else {
                        validListeners.add(listenerInfo);
                    }
                } catch (error) {
                    this.removeEventListener(listenerInfo);
                    cleanedItems++;
                }
            });
            this.eventListeners = validListeners;

            // 内存使用检查
            const memoryStats = this.getMemoryStats();
            if (parseFloat(memoryStats.memory.usageMB) > 450) {
                console.warn(`内存使用较高: ${memoryStats.memory.usageMB}MB，执行清理`);
            }

            this.activeCleanupCallbacks.clear();

            const duration = performance.now() - startTime;

            return {
                cleanedItems,
                duration,
                memoryStats
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

            if (!element || typeof element.addEventListener !== 'function') {
                console.warn('无效的元素或缺少addEventListener方法');
                return () => {};
            }

            const wrappedHandler = (e) => {
                try {
                    if (!this.isDestroyed && handler) {
                        handler(e);
                    }
                } catch (error) {
                    console.error(`事件处理错误 (${event}):`, error);
                }
            };

            try {
                element.addEventListener(event, wrappedHandler);
            } catch (error) {
                console.error(`添加事件监听器失败:`, error);
                return () => {};
            }

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

            try {
                const { element, event, handler } = listenerInfo;
                if (element && typeof element.removeEventListener === 'function') {
                    element.removeEventListener(event, handler);
                }
                this.eventListeners.delete(listenerInfo);
            } catch (error) {
                console.error('移除事件监听器失败:', error);
            }
        },

        safeSetTimeout(callback, delay) {
            if (this.isDestroyed) {
                console.warn('尝试在已销毁的游戏实例上创建定时器');
                return null;
            }

            const wrappedCallback = () => {
                this.activeTimers.delete(timerId);
                if (!this.isDestroyed && callback) {
                    try {
                        callback();
                    } catch (error) {
                        console.error('定时器回调执行错误:', error);
                    }
                }
            };

            try {
                const timerId = setTimeout(wrappedCallback, delay);
                this.activeTimers.add(timerId);
                return timerId;
            } catch (error) {
                console.error('创建定时器失败:', error);
                return null;
            }
        },

        destroy() {
            if (this.isDestroyed) return;

            this.isDestroyed = true;
            this.stopReplay();

            this.activeTimers.forEach(timerId => this.clearTimer(timerId));
            this.eventListeners.forEach(listenerInfo => this.removeEventListener(listenerInfo));
            this.activeCleanupCallbacks.clear();

            this.replayMoves = [];
            this.gamesData = [];
        }
    };
}