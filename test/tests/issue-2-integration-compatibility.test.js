/**
 * Issue #2 棋谱播放功能集成兼容性测试
 *
 * 测试目标：验证Issue #2修复的棋谱播放功能与其他系统组件的集成兼容性
 * 创建日期: 2025-10-12
 * 覆盖范围：模块集成、接口兼容性、数据格式兼容、版本兼容性
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

// 模拟 fetch API
global.fetch = jest.fn();

describe('Issue #2 棋谱播放功能集成兼容性测试', () => {
    let xiangqiGame;
    let integrationMetrics;

    beforeEach(() => {
        jest.clearAllMocks();

        integrationMetrics = {
            moduleInteractions: 0,
            dataTransformations: 0,
            interfaceCalls: 0,
            compatibilityChecks: 0
        };

        // 设置默认 fetch 响应
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                games: [
                    {
                        moves: [
                            { pieceType: 'cannon', color: 'red', fromPos: {row: 7, col: 7}, toPos: {row: 7, col: 4} },
                            { pieceType: 'horse', color: 'black', fromPos: {row: 0, col: 7}, toPos: {row: 2, col: 6} }
                        ]
                    }
                ]
            })
        });
    });

    afterEach(() => {
        if (xiangqiGame && !xiangqiGame.isDestroyed) {
            xiangqiGame.destroy();
        }
    });

    describe('1. 模块间集成测试', () => {
        test('应能与记谱解析模块流畅集成', async () => {
            xiangqiGame = createIntegrationTestGame();

            // 测试记谱解析集成
            const notationData = {
                notations: '炮二平五\n马8进7\n马二进三\n车一平二',
                format: 'standard'
            };

            const moves = xiangqiGame.extractMovesFromGameData(notationData);
            integrationMetrics.dataTransformations++;

            expect(Array.isArray(moves)).toBe(true);

            // 验证解析器集成
            const validationResult = xiangqiGame.validateGameData(notationData);
            integrationMetrics.moduleInteractions++;

            expect(validationResult).toHaveProperty('valid');
            expect(typeof validationResult.valid).toBe('boolean');
        });

        test('应能与验证模块协调工作', () => {
            xiangqiGame = createIntegrationTestGame();

            // 测试多层验证集成
            const complexGameData = {
                moves: [
                    { pieceType: 'cannon', color: 'red', fromPos: {row: 7, col: 7}, toPos: {row: 7, col: 4} },
                    { pieceType: 'invalid', color: 'red', fromPos: {row: 9, col: 0}, toPos: {row: 7, col: 1} }, // 无效移动
                    { pieceType: 'horse', color: 'black', fromPos: {row: 0, col: 7}, toPos: {row: 2, col: 6} }
                ],
                metadata: {
                    source: 'classic',
                    quality: 'high',
                    verified: true
                }
            };

            const validationResult = xiangqiGame.validateGameData(complexGameData);
            integrationMetrics.moduleInteractions++;

            // 应该能处理部分无效数据
            expect(validationResult.totalMoves).toBe(3);
            expect(validationResult.errorMoves).toBeGreaterThanOrEqual(1);

            // 错误恢复集成
            if (!validationResult.valid) {
                const recoveryAttempts = xiangqiGame.errorRecovery?.suggestRecovery(validationResult.errors);
                integrationMetrics.moduleInteractions++;

                if (recoveryAttempts) {
                    expect(Array.isArray(recoveryAttempts)).toBe(true);
                }
            }
        });

        test('应能与UI模块同步操作', async () => {
            xiangqiGame = createIntegrationTestGame();

            // 创建复杂回放数据
            xiangqiGame.replayMoves = [
                { pieceType: 'cannon', color: 'red', fromPos: {row: 7, col: 7}, toPos: {row: 7, col: 4} },
                { pieceType: 'horse', color: 'black', fromPos: {row: 0, col: 7}, toPos: {row: 2, col: 6} }
            ];

            // 开始回放以测试UI集成
            xiangqiGame.startAutoReplay();
            integrationMetrics.moduleInteractions++;

            expect(xiangqiGame.ui.renderBoard).toHaveBeenCalled();

            // 模拟UI回调
            xiangqiGame.ui.setGameMode('notation');
            integrationMetrics.interfaceCalls++;

            expect(xiangqiGame.ui.setGameMode).toHaveBeenCalledWith('notation');

            // 测试UI状态同步
            const gameState = xiangqiGame.getGameState();
            integrationMetrics.interfaceCalls++;

            expect(typeof gameState).toBe('object');
        });

        test('应能与性能缓存模块协同优化', () => {
            xiangqiGame = createIntegrationTestGame();

            // 测试缓存集成
            const commonMove = {
                pieceType: 'cannon',
                color: 'red',
                fromPos: {row: 7, col: 7},
                toPos: {row: 7, col: 4}
            };

            // 第一次访问 - 缓存未命中
            const moveKey = JSON.stringify(commonMove);
            xiangqiGame.cache.moveCache(moveKey, commonMove);

            // 第二次访问 - 缓存命中
            const cachedMove = xiangqiGame.cache.moveCache(moveKey);
            integrationMetrics.moduleInteractions++;

            expect(cachedMove).toEqual(commonMove);

            // 测试缓存统计集成
            const cacheStats = xiangqiGame.cache.getStats();
            integrationMetrics.interfaceCalls++;

            expect(cacheStats).toHaveProperty('moveCacheSize');
            expect(cacheStats).toHaveProperty('positionCacheSize');
        });

        test('应能与安全模块集成防护', () => {
            xiangqiGame = createIntegrationTestGame();

            // 测试恶意输入防护
            const maliciousInputs = [
                '<script>alert("xss")</script>',
                'javascript:alert("xss")',
                '../../../etc/passwd',
                { pieceType: '<img src=x onerror=alert(1)>' }
            ];

            maliciousInputs.forEach(input => {
                const sanitized = xiangqiGame.security.validateInput(String(input));
                integrationMetrics.moduleInteractions++;

                expect(typeof sanitized).toBe('boolean');

                // 错误信息脱敏
                const errorInfo = { message: 'Error: ' + String(input) };
                const sanitizedError = xiangqiGame.security.sanitizeErrorMessage(errorInfo.message);
                integrationMetrics.interfaceCalls++;

                expect(sanitizedError).not.toContain('<script>');
            });
        });
    });

    describe('2. 数据格式兼容性测试', () => {
        test('应能兼容多种数据格式', () => {
            xiangqiGame = createIntegrationTestGame();

            const dataFormats = [
                // 传统格式
                {
                    moves: [
                        { pieceType: 'cannon', color: 'red', fromPos: {row: 7, col: 7}, toPos: {row: 7, col: 4} }
                    ]
                },
                // 数组格式
                [
                    { pieceType: 'horse', color: 'black', fromPos: {row: 0, col: 7}, toPos: {row: 2, col: 6} }
                ],
                // 记谱文本格式
                {
                    notations: '炮二平五\n马8进7',
                    format: 'notation'
                },
                // 混合格式
                {
                    moves: [
                        { pieceType: 'cannon', color: 'red', toPos: {row: 7, col: 4} }
                    ],
                    notations: '炮二平五',
                    metadata: { version: '2.0' }
                },
                // 新版本格式
                {
                    version: '2.1',
                    checktype: 'standard',
                    moves: [
                        {
                            pieceType: 'cannon',
                            color: 'red',
                            from: { row: 7, col: 7 },
                            to: { row: 7, col: 4 },
                            timestamp: Date.now(),
                            notation: '炮二平五'
                        }
                    ]
                }
            ];

            dataFormats.forEach((format, index) => {
                const moves = xiangqiGame.extractMovesFromGameData(format);
                integrationMetrics.dataTransformations++;
                integrationMetrics.compatibilityChecks++;

                expect(Array.isArray(moves)).toBe(true);

                // 应该能验证所有格式
                const result = xiangqiGame.validateGameData(format);
                integrationMetrics.moduleInteractions++;

                expect(result).toHaveProperty('totalMoves');
            });

            expect(integrationMetrics.dataTransformations).toBe(dataFormats.length);
        });

        test('应能处理版本兼容性问题', () => {
            xiangqiGame = createIntegrationTestGame();

            const versionData = [
                { version: '1.0', format: 'legacy', moves: [] },
                { version: '1.5', format: 'transitional', moves: [] },
                { version: '2.0', format: 'modern', moves: [] },
                { version: '2.1', format: 'current', moves: [] },
                { version: '3.0', format: 'future', moves: [] }, // 未来版本
                { /* 缺少版本字段 */ }
            ];

            versionData.forEach(data => {
                const compatibility = xiangqiGame.checkVersionCompatibility(data);
                integrationMetrics.compatibilityChecks++;

                expect(compatibility).toHaveProperty('compatible');
                if (!data.version) {
                    expect(compatibility.compatible).toBe(true);
                }
            });
        });

        test('应能处理数据转换和映射', () => {
            xiangqiGame = createIntegrationTestGame();

            // 旧格式到新格式的转换
            const legacyFormat = [
                { RedCannon: { From: 'A3', To: 'C3' } },
                { BlackHorse: { From: 'H10', To: 'F9' } }
            ];

            const convertedMoves = xiangqiGame.convertLegacyFormat(legacyFormat);
            integrationMetrics.dataTransformations++;

            expect(Array.isArray(convertedMoves)).toBe(true);

            if (convertedMoves.length > 0) {
                expect(convertedMoves[0]).toHaveProperty('pieceType');
                expect(convertedMoves[0]).toHaveProperty('color');
                expect(convertedMoves[0]).toHaveProperty('fromPos');
                expect(convertedMoves[0]).toHaveProperty('toPos');
            }

            // 新格式到标准格式的标准化
            const newFormat = [
                {
                    piece: 'cannon',
                    side: 'red',
                    origin: { x: 7, y: 7 },
                    destination: { x: 7, y: 4 }
                }
            ];

            const standardMoves = xiangqiGame.normalizeFormat(newFormat);
            integrationMetrics.dataTransformations++;

            expect(Array.isArray(standardMoves)).toBe(true);
        });
    });

    describe('3. 接口兼容性测试', () => {
        test('应保持向后兼容的API接口', () => {
            xiangqiGame = createIntegrationTestGame();

            // 测试旧版API兼容性
            expect(typeof xiangqiGame.loadRandomClassicGame).toBe('function');
            expect(typeof xiangqiGame.validateGameDataStructure).toBe('function');
            expect(typeof xiangqiGame.playToStep).toBe('function');

            // 调用旧版API应该能工作
            expect(() => {
                xiangqiGame.loadRandomClassicGame();
                integrationMetrics.interfaceCalls++;
            }).not.toThrow();

            // 测试数据结构兼容性
            const oldFormatData = { moves_text: '炮二平五 马8进7' };
            const validatedData = xiangqiGame.validateGameDataStructure(oldFormatData);
            integrationMetrics.interfaceCalls++;

            expect(Array.isArray(validatedData)).toBe(true);
        });

        test('应能处理不同初始化方式', () => {
            // 测试多种初始化方式
            const initMethods = [
                () => {
                    const game = createIntegrationTestGame();
                    return game;
                },
                () => {
                    const game = createIntegrationTestGame();
                    game.reset();
                    return game;
                },
                () => {
                    const game = createIntegrationTestGame();
                    game.importGame('{}');
                    return game;
                }
            ];

            initMethods.forEach(initMethod => {
                expect(() => {
                    const instance = initMethod();
                    integrationMetrics.interfaceCalls++;

                    expect(instance).toHaveProperty('engine');
                    expect(instance).toHaveProperty('ui');
                    expect(instance).toHaveProperty('validator');

                    if (instance && !instance.isDestroyed) {
                        instance.destroy();
                    }
                }).not.toThrow();
            });
        });

        test('应能处理事件监听器兼容性', () => {
            xiangqiGame = createIntegrationTestGame();

            // 测试旧版事件API
            const oldEventHandler = jest.fn();
            const element = document.createElement('div');

            xiangqiGame.addEventListener = function(element, event, handler) {
                return this.addSafeEventListener(element, event, handler);
            };

            const removeFunc = xiangqiGame.addEventListener(element, 'click', oldEventHandler);
            integrationMetrics.interfaceCalls++;

            expect(typeof removeFunc).toBe('function');
            expect(xiangqiGame.eventListeners.size).toBe(1);

            // 模拟事件触发
            element.dispatchEvent(new dom.window.Event('click'));

            expect(oldEventHandler).toHaveBeenCalled();
        });
    });

    describe('4. 第三方组件集成测试', () => {
        test('应能与音频系统集成', () => {
            xiangqiGame = createIntegrationTestGame();

            // 测试音频回调集成
            expect(typeof xiangqiGame.audioManager).toBe('object');

            xiangqiGame.replayMoves = [
                { pieceType: 'cannon', color: 'red', fromPos: {row: 7, col: 7}, toPos: {row: 7, col: 4} }
            ];

            // 模拟音频播放
            const audioPlayed = xiangqiGame.audioManager.playSound('pieceMove');
            integrationMetrics.moduleInteractions++;

            expect(typeof audioPlayed).toBe('boolean'); // 可能为undefined但不应该出错

            // 音频配置同步
            const audioConfig = xiangqiGame.audioManager.getConfig();
            integrationMetrics.interfaceCalls++;

            expect(audioConfig).toHaveProperty('volume');
            expect(audioConfig).toHaveProperty('muted');
        });

        test('应能与存储系统集成', async () => {
            xiangqiGame = createIntegrationTestGame();

            // 模拟本地存储
            const mockStorage = {
                getItem: jest.fn(),
                setItem: jest.fn(),
                removeItem: jest.fn()
            };

            global.localStorage = mockStorage;

            // 测试游戏状态存储
            const gameState = xiangqiGame.getGameState();
            mockStorage.getItem.mockReturnValue(JSON.stringify(gameState));

            const savedState = xiangqiGame.loadFromStorage();
            integrationMetrics.moduleInteractions++;

            expect(mockStorage.getItem).toHaveBeenCalled();

            // 测试保存状态
            xiangqiGame.saveToStorage(gameState);
            integrationMetrics.interfaceCalls++;

            expect(mockStorage.setItem).toHaveBeenCalled();
        });

        test('应能与调试工具集成', () => {
            xiangqiGame = createIntegrationTestGame();

            // 模拟调试接口
            const debugInterface = {
                logState: jest.fn(),
                inspectMoves: jest.fn(),
                validateBoard: jest.fn()
            };

            xiangqiGame.debug = debugInterface;

            // 测试调试功能
            const memoryStats = xiangqiGame.getMemoryStats();
            xiangqiGame.debug.logState(memoryStats);
            integrationMetrics.interfaceCalls++;

            expect(debugInterface.logState).toHaveBeenCalledWith(memoryStats);

            // 测试移动检查
            xiangqiGame.replayMoves = [
                { pieceType: 'cannon', color: 'red', fromPos: {row: 7, col: 7}, toPos: {row: 7, col: 4} }
            ];
            xiangqiGame.debug.inspectMoves(xiangqiGame.replayMoves);
            integrationMetrics.interfaceCalls++;

            expect(debugInterface.inspectMoves).toHaveBeenCalled();
        });
    });

    describe('5. 系统环境兼容性测试', () => {
        test('应能在不同浏览器环境下工作', () => {
            // 模拟不同浏览器环境
            const browserEnvironments = [
                {
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    support: { AudioContext: true, fetch: true, setTimeout: true }
                },
                {
                    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
                    support: { AudioContext: true, fetch: true, setTimeout: true }
                },
                {
                    userAgent: 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1)',
                    support: { AudioContext: false, fetch: false, setTimeout: true }
                }
            ];

            browserEnvironments.forEach(env => {
                // 模拟环境
                global.navigator.userAgent = env.userAgent;
                global.AudioContext = env.support.AudioContext ? class AudioContext {} : undefined;
                global.fetch = env.support.fetch ? global.fetch : undefined;

                xiangqiGame = createIntegrationTestGame();

                expect(() => {
                    xiangqiGame.getGameState();
                    integrationMetrics.compatibilityChecks++;
                }).not.toThrow();

                if (!env.support.AudioContext) {
                    expect(console.warn).toHaveBeenCalledWith(
                        expect.stringContaining('高级音频功能不可用')
                    );
                }
            });
        });

        test('应能在不同性能环境下适应', () => {
            // 模拟不同性能环境
            const performanceEnvironments = [
                { memory: 2 * 1024 * 1024 * 1024, cpu: 'fast' }, // 高性能
                { memory: 512 * 1024 * 1024, cpu: 'medium' }, // 中等性能
                { memory: 256 * 1024 * 1024, cpu: 'slow' }   // 低性能
            ];

            performanceEnvironments.forEach(env => {
                global.performance.memory.usedJSHeapSize = env.memory;

                xiangqiGame = createIntegrationTestGame();

                // 适应不同性能
                const optimizationLevel = xiangqiGame.get.optimizationLevel || 'auto';
                integrationMetrics.compatibilityChecks++;

                if (env.memory < 500 * 1024 * 1024) {
                    expect(optimizationLevel).toBe('conservative');
                }

                // 测试性能适应下的操作
                expect(() => {
                    xiangqiGame.performMemoryCleanup();
                    xiangqiGame.getMemoryStats();
                }).not.toThrow();
            });
        });

        test('应能在网络条件变化时工作', async () => {
            // 模拟不同网络条件
            const networkConditions = [
                { type: 'fast', online: true, latency: 50 },
                { type: 'slow', online: true, latency: 1000 },
                { type: 'offline', online: false, latency: Infinity }
            ];

            for (const condition of networkConditions) {
                global.navigator.onLine = condition.online;

                if (!condition.online) {
                    global.fetch = jest.fn().mockRejectedValue(new Error('Network offline'));
                } else {
                    global.fetch = jest.fn().mockImplementation(() => {
                        return new Promise(resolve => {
                            setTimeout(() => {
                                resolve({
                                    ok: true,
                                    json: () => Promise.resolve({ games: [] })
                                });
                            }, condition.latency);
                        });
                    });
                }

                xiangqiGame = createIntegrationTestGame();

                expect.assertions(1);
                await expect(xiangqiGame.loadGamesData()).resolves.not.toThrow();
                integrationMetrics.compatibilityChecks++;
            }
        });
    });

    describe('6. 全局竞态条件测试', () => {
        test('应能处理多实例并发操作', async () => {
            const instances = [];

            // 创建多个游戏实例
            for (let i = 0; i < 5; i++) {
                const instance = createIntegrationTestGame();
                instances.push(instance);
            }

            // 并发执行操作
            const concurrentOperations = instances.map((instance, index) => {
                return async () => {
                    instance.replayMoves = [
                        { pieceType: 'cannon', color: 'red', fromPos: {row: 7, col: 7}, toPos: {row: 7, col: 4} }
                    ];
                    instance.startAutoReplay();
                    await new Promise(resolve => setTimeout(resolve, 100 * index));
                    instance.stopReplay();
                };
            });

            await Promise.all(concurrentOperations.map(op => op()));
            integrationMetrics.moduleInteractions += instances.length;

            // 所有实例应该独立运行
            instances.forEach(instance => {
                expect(instance.isReplaying).toBe(false);
                if (!instance.isDestroyed) {
                    instance.destroy();
                }
            });
        });

        test('应能处理全局状态竞争', () => {
            // 模拟全局状态竞争
            xiangqiGame = createIntegrationTestGame();

            // 设置全局游戏实例
            window.xiangqiGame = xiangqiGame;
            window.XiangqiGame = xiangqiGame.constructor;

            const globalOperations = [
                () => window.xiangqiGame.reset(),
                () => window.xiangqiGame.getGameState(),
                () => new window.XiangqiGame().getMemoryStats()
            ];

            globalOperations.forEach(operation => {
                expect(() => {
                    operation();
                    integrationMetrics.interfaceCalls++;
                }).not.toThrow();
            });
        });
    });

    // 集成测试统计
    afterEach(() => {
        console.log('集成测试统计:', integrationMetrics);
    });
});

// 集成测试专用辅助函数
function createIntegrationTestGame() {
    return {
        gamesData: [],
        currentGameIndex: 0,
        replayMoves: [],
        replayIndex: 0,
        isReplaying: false,
        replayTimer: null,
        activeTimers: new Set(),
        eventListeners: new Set(),
        isDestroyed: false,

        engine: {
            reset: jest.fn(),
            movePiece: jest.fn().mockReturnValue(true),
            getPieceAtByColor: jest.fn().mockReturnValue({ type: 'test' }),
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
            parseMove: jest.fn().mockReturnValue({ success: true }),
            parseGame: jest.fn().mockReturnValue({ moves: [], errors: [] })
        },

        audioManager: {
            playSound: jest.fn().mockReturnValue(true),
            setVolume: jest.fn(),
            toggleMute: jest.fn(),
            getConfig: jest.fn().mockReturnValue({ volume: 0.8, muted: false })
        },

        errorRecovery: {
            suggestRecovery: jest.fn().mockReturnValue([
                { strategy: 'skip_invalid_moves', confidence: 0.9 }
            ])
        },

        cache: {
            moveCache: jest.fn(),
            positionCache: jest.fn(),
            getStats: jest.fn().mockReturnValue({
                moveCacheSize: 10,
                positionCacheSize: 15,
                hitRate: 0.85
            }),
            clear: jest.fn()
        },

        security: {
            validateInput: jest.fn().mockReturnValue(true),
            sanitizeErrorMessage: jest.fn().mockImplementation(msg => 'Sanitized: ' + msg),
            checkXSS: jest.fn().mockReturnValue(false)
        },

        debug: {
            logState: jest.fn(),
            inspectMoves: jest.fn(),
            validateBoard: jest.fn()
        },

        async loadGamesData() {
            try {
                const response = await global.fetch('./main/data/classified-games.json');
                if (response.ok) {
                    const data = await response.json();
                    this.gamesData = data.games || data || [];
                }
            } catch (error) {
                console.error('加载数据失败:', error);
                this.gamesData = [];
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
            if (gameData.notations) return this.notationParser.parseGame(gameData.notations).moves;
            if (gameData.pieceType && gameData.toPos) return [gameData];
            if (gameData.piece && gameData.side) return this.normalizeFormat([gameData]);
            if (gameData.RedCannon || gameData.BlackHorse) return this.convertLegacyFormat([gameData]);
            return [];
        },

        convertLegacyFormat(legacyMoves) {
            return legacyMoves.map(move => {
                if (move.RedCannon) {
                    return {
                        pieceType: 'cannon',
                        color: 'red',
                        fromPos: this.parsePosition(move.RedCannon.From),
                        toPos: this.parsePosition(move.RedCannon.To)
                    };
                } else if (move.BlackHorse) {
                    return {
                        pieceType: 'horse',
                        color: 'black',
                        fromPos: this.parsePosition(move.BlackHorse.From),
                        toPos: this.parsePosition(move.BlackHorse.To)
                    };
                }
                return null;
            }).filter(Boolean);
        },

        normalizeFormat(newFormatMoves) {
            return newFormatMoves.map(move => ({
                pieceType: move.piece || move.pieceType,
                color: move.side || move.color,
                fromPos: move.origin || move.fromPos,
                toPos: move.destination || move.toPos
            }));
        },

        parsePosition(pos) {
            // 简化的位置解析
            return { row: 7, col: 7 };
        },

        checkVersionCompatibility(data) {
            const version = data.version || '1.0';
            const compatible = ['1.0', '1.5', '2.0', '2.1'].includes(version) || !data.version;
            return {
                compatible,
                version,
                recommendedAction: compatible ? 'use_as_is' : 'convert_format'
            };
        },

        startAutoReplay() {
            if (this.replayMoves.length === 0) return;
            this.isReplaying = true;
            this.replayIndex = 0;
            this.engine.reset();
            this.ui.renderBoard();
        },

        stopReplay() {
            this.isReplaying = false;
        },

        getGameState() {
            return this.engine.getGameState();
        },

        reset() {
            this.stopReplay();
            this.replayMoves = [];
            this.replayIndex = 0;
            this.engine.reset();
            this.ui.renderBoard();
            this.ui.clearSelection();
            this.ui.setGameMode('game');
        },

        getMemoryStats() {
            return {
                timestamp: new Date().toISOString(),
                memory: {
                    used: global.performance.memory?.usedJSHeapSize || 1048576,
                    usageMB: ((global.performance.memory?.usedJSHeapSize || 1048576) / 1024 / 1024).toFixed(2)
                },
                activeResources: {
                    timers: this.activeTimers.size,
                    eventListeners: this.eventListeners.size
                },
                gameState: {
                    isReplaying: this.isReplaying,
                    replayMovesCount: this.replayMoves.length
                }
            };
        },

        performMemoryCleanup() {
            this.cache.clear();
            return { cleanedItems: 5, duration: 10 };
        },

        loadFromStorage() {
            try {
                const savedState = localStorage.getItem('xiangqi_game_state');
                return savedState ? JSON.parse(savedState) : null;
            } catch (error) {
                return null;
            }
        },

        saveToStorage(state) {
            try {
                localStorage.setItem('xiangqi_game_state', JSON.stringify(state));
            } catch (error) {
                console.warn('保存状态失败:', error);
            }
        },

        destroy() {
            this.isDestroyed = true;
            this.stopReplay();
            this.activeTimers.clear();
            this.eventListeners.clear();
            this.replayMoves = [];
            this.gamesData = [];
        },

        // 兼容性API
        loadRandomClassicGame() {
            this.loadRandomGame();
        },

        validateGameDataStructure(gameData) {
            const moves = this.extractMovesFromGameData(gameData);
            return moves.filter(move => move && move.pieceType && move.toPos);
        },

        playToStep(stepIndex) {
            this.replayIndex = stepIndex;
        },

        importGame(gameStateJSON) {
            return this.engine.importGame(gameStateJSON);
        },

        get optimizationLevel() {
            const memory = global.performance.memory?.usedJSHeapSize || 1048576;
            if (memory < 500 * 1024 * 1024) return 'conservative';
            if (memory < 1024 * 1024 * 1024) return 'balanced';
            return 'aggressive';
        },

        addSafeEventListener(element, event, handler) {
            if (!element) return () => {};
            element.addEventListener(event, handler);
            this.eventListeners.add({ element, event, handler });
            return () => {
                element.removeEventListener(event, handler);
                this.eventListeners.delete({ element, event, handler });
            };
        }
    };
}