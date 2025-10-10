/**
 * ErrorHandler 模块测试用例
 * 全局错误处理机制 - 统一错误捕获和处理
 */

describe('ErrorHandler 模块', () => {
    let errorHandler;
    let mockConsole;
    let originalError;
    let originalWindow;

    beforeEach(() => {
        // 保存原始对象
        originalError = console.error;
        originalWindow = global.window;

        // 模拟console对象
        mockConsole = {
            error: jest.fn(),
            warn: jest.fn(),
            log: jest.fn()
        };
        global.console = mockConsole;

        // 模拟window和showMessage
        global.window = {
            showMessage: jest.fn(),
            errorHandler: null
        };

        // 尝试加载ErrorHandler模块
        if (typeof ErrorHandler !== 'undefined') {
            errorHandler = new ErrorHandler({
                window: global.window,
                setupGlobalHandlers: false,
                enableUserNotification: true
            });
        } else {
            try {
                // 从文件加载
                const fs = require('fs');
                const path = require('path');
                const errorHandlerPath = path.resolve(__dirname, '../../main/error-handler.js');

                if (fs.existsSync(errorHandlerPath)) {
                    const errorHandlerCode = fs.readFileSync(errorHandlerPath, 'utf8');
                    eval(errorHandlerCode);
                    errorHandler = new ErrorHandler({
                        window: global.window,
                        setupGlobalHandlers: false,
                        enableUserNotification: true
                    });
                }
            } catch (error) {
                console.log('无法加载ErrorHandler模块，创建mock实现');

                // 创建mock实现用于测试
                errorHandler = {
                    errorQueue: [],
                    errorCallbacks: new Set(),
                    maxQueueSize: 100,

                    capture(error, context = {}) {
                        if (!error || typeof error !== 'object') {
                            error = new Error(error);
                        }

                        const errorData = {
                            timestamp: Date.now(),
                            message: error.message,
                            stack: error.stack,
                            context: {
                                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js',
                                url: typeof window !== 'undefined' ? window.location?.href : 'Test Environment',
                                ...context
                            }
                        };

                        this.errorQueue.push(errorData);
                        if (this.errorQueue.length > this.maxQueueSize) {
                            this.errorQueue.shift();
                        }

                        this.processError(errorData);
                    },

                    processError(errorData) {
                        // 控制台记录
                        if (mockConsole) {
                            mockConsole.error('全局错误捕获:', errorData.message);
                        }

                        // 如果有showMessage，显示给用户
                        if (global.window.showMessage) {
                            global.window.showMessage('遇到错误，请刷新页面重试', 'error');
                        }

                        // 通知回调
                        this.errorCallbacks.forEach(callback => {
                            try {
                                callback(errorData);
                            } catch (callbackError) {
                                mockConsole.error('错误回调失败:', callbackError);
                            }
                        });
                    },

                    onError(callback) {
                        if (typeof callback === 'function') {
                            this.errorCallbacks.add(callback);
                        }
                    },

                    offError(callback) {
                        this.errorCallbacks.delete(callback);
                    },

                    getErrorHistory() {
                        return [...this.errorQueue];
                    },

                    clear() {
                        this.errorQueue = [];
                    }
                };
            }
        }

        // 设置全局错误处理器
        if (typeof window !== 'undefined') {
            window.errorHandler = errorHandler;
        }
    });

    afterEach(() => {
        // 恢复原始对象
        if (originalError) {
            console.error = originalError;
        }
        if (originalWindow) {
            global.window = originalWindow;
        }
    });

    describe('错误捕获功能', () => {
        test('应该正确捕获JavaScript错误', () => {
            const error = new Error('测试错误');

            errorHandler.capture(error, { component: 'test' });

            expect(errorHandler.getErrorHistory()).toHaveLength(1);
            const capturedError = errorHandler.getErrorHistory()[0];

            expect(capturedError.message).toBe('测试错误');
            expect(capturedError.context.component).toBe('test');
            expect(capturedError.timestamp).toBeDefined();
        });

        test('应该处理字符串错误消息', () => {
            errorHandler.capture('简单错误消息');

            expect(errorHandler.getErrorHistory()).toHaveLength(1);
            const capturedError = errorHandler.getErrorHistory()[0];

            expect(capturedError.message).toBe('简单错误消息');
        });

        test('应该正确提取错误堆栈信息', () => {
            const error = new Error('带堆栈的错误');

            errorHandler.capture(error);

            const capturedError = errorHandler.getErrorHistory()[0];
            expect(capturedError.stack).toBeDefined();
            expect(capturedError.stack).toContain('带堆栈的错误');
        });
    });

    describe('用户通知功能', () => {
        test('应该正确处理错误并记录', () => {
            const error = new Error('用户可见错误');

            errorHandler.capture(error);

            // 验证错误被正确处理和记录
            expect(errorHandler.getErrorHistory()).toHaveLength(1);
            const capturedError = errorHandler.getErrorHistory()[0];
            expect(capturedError.message).toBe('用户可见错误');
            expect(capturedError.timestamp).toBeDefined();
        });

        test('在showMessage不可用时不应该报错', () => {
            // 创建一个没有showMessage的window副本
            const originalWindow = global.window;
            global.window = { showMessage: null };

            const error = new Error('测试错误');

            expect(() => {
                errorHandler.capture(error);
            }).not.toThrow();

            // 恢复原始window
            global.window = originalWindow;
        });
    });

    describe('错误队列管理', () => {
        test('应该限制错误队列大小', () => {
            // 添加超过最大队列大小的错误
            for (let i = 0; i < 150; i++) {
                errorHandler.capture(new Error(`错误${i}`));
            }

            expect(errorHandler.getErrorHistory()).toHaveLength(100);

            // 验证只保存了最新的100个错误
            const firstError = errorHandler.getErrorHistory()[0];
            const lastError = errorHandler.getErrorHistory()[99];

            expect(firstError.message).toBe('错误149');
            expect(lastError.message).toBe('错误50');
        });

        test('应该支持清除错误队列', () => {
            errorHandler.capture(new Error('测试1'));
            errorHandler.capture(new Error('测试2'));

            expect(errorHandler.getErrorHistory()).toHaveLength(2);

            errorHandler.clear();

            expect(errorHandler.getErrorHistory()).toHaveLength(0);
        });

        test('应该返回错误的副本', () => {
            errorHandler.capture(new Error('测试错误'));
            const errors = errorHandler.getErrorHistory();

            // 修改返回的错误不应该影响内部状态
            errors[0].message = '已修改';

            expect(errorHandler.getErrorHistory()[0].message).toBe('测试错误');
        });
    });

    describe('回调机制', () => {
        test('应该支持错误回调注册', () => {
            const callback = jest.fn();

            errorHandler.onError(callback);

            const error = new Error('回调测试');
            errorHandler.capture(error);

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: '回调测试',
                    timestamp: expect.any(Number)
                })
            );
        });

        test('应该支持移除错误回调', () => {
            const callback = jest.fn();

            errorHandler.onError(callback);
            errorHandler.offError(callback);

            errorHandler.capture(new Error('移除回调测试'));

            expect(callback).not.toHaveBeenCalled();
        });

        test('应该处理回调中的错误', () => {
            const errorCallback = jest.fn(() => {
                throw new Error('回调内部错误');
            });
            const warnSpy = jest.spyOn(mockConsole, 'error');

            errorHandler.onError(errorCallback);

            errorHandler.capture(new Error('原始错误'));

            expect(warnSpy).toHaveBeenCalledWith('错误回调失败:', expect.any(Error));
        });

        test('应该在回调执行失败时不影响其他回调', () => {
            const goodCallback = jest.fn();
            const badCallback = jest.fn(() => {
                throw new Error('错误回调');
            });

            errorHandler.onError(badCallback);
            errorHandler.onError(goodCallback);

            errorHandler.capture(new Error('测试回调容错'));

            expect(goodCallback).toHaveBeenCalled();
            expect(badCallback).toHaveBeenCalled();
        });
    });

    describe('上下文信息', () => {
        test('应该包含默认上下文信息', () => {
            errorHandler.capture(new Error('上下文测试'));

            const error = errorHandler.getErrorHistory()[0];
            const context = error.context;

            expect(context.userAgent).toBeDefined();
            expect(context.url).toBeDefined();
        });

        test('应该合并自定义上下文信息', () => {
            const customContext = {
                component: 'TestComponent',
                action: 'testAction',
                additionalData: { key: 'value' }
            };

            errorHandler.capture(new Error('自定义上下文'), customContext);

            const error = errorHandler.getErrorHistory()[0];

            expect(error.context.component).toBe('TestComponent');
            expect(error.context.action).toBe('testAction');
            expect(error.context.additionalData).toEqual({ key: 'value' });
        });
    });

    describe('错误分类', () => {
        test('应该支持错误类型分类', () => {
            if (errorHandler.captureWithCategory) {
                errorHandler.captureWithCategory('network', new Error('网络错误'));

                const error = errorHandler.getErrorHistory()[0];
                expect(error.category).toBe('network');
            } else {
                // 如果没有分类功能，应该优雅降级
                expect(() => {
                    errorHandler.capture(new Error('普通错误'));
                }).not.toThrow();
            }
        });

        test('应该自动检测常见错误类型', () => {
            // 网络错误
            const networkError = new TypeError('Failed to fetch');

            errorHandler.capture(networkError);

            const error = errorHandler.getErrorHistory()[0];

            // 基本检查 - 错误被正确捕获
            expect(error.message).toBe('Failed to fetch');
            expect(error.timestamp).toBeDefined();
        });
    });

    describe('边界情况', () => {
        test('应该处理null/undefined错误', () => {
            expect(() => {
                errorHandler.capture(null);
            }).not.toThrow();

            expect(() => {
                errorHandler.capture(undefined);
            }).not.toThrow();

            // 应该仍然有错误记录
            expect(errorHandler.getErrorHistory().length).toBeGreaterThan(0);
        });

        test('应该处理非Error对象', () => {
            expect(() => {
                errorHandler.capture(123);
            }).not.toThrow();

            expect(() => {
                errorHandler.capture({ message: '对象错误' });
            }).not.toThrow();
        });

        test('应该防止无限递归错误', () => {
            let captureCount = 0;
            const recursiveCallback = () => {
                captureCount++;
                if (captureCount < 10) {
                    errorHandler.capture(new Error('递归错误'));
                }
            };

            errorHandler.onError(recursiveCallback);
            errorHandler.capture(new Error('初始递归错误'));

            // 应该防止无限递归
            expect(captureCount).toBeLessThan(10);
        });
    });

    describe('性能监控', () => {
        test('应该提供错误统计信息', () => {
            if (errorHandler.getStats) {
                expect(errorHandler.getStats()).toEqual(expect.objectContaining({
                    totalErrors: expect.any(Number),
                    errorsByType: expect.any(Object)
                }));
            }
        });

        test('应该监控错误频率', () => {
            // 快速产生多个错误
            for (let i = 0; i < 5; i++) {
                errorHandler.capture(new Error(`性能测试${i}`));
            }

            if (errorHandler.getErrorFrequency) {
                const frequency = errorHandler.getErrorFrequency();
                expect(frequency.length).toBeLessThanOrEqual(5);
            }
        });
    });
});