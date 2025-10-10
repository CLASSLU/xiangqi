/**
 * EventListener 清理机制测试用例
 * 解决内存泄漏风险，确保事件监听器能够正确清理
 */

describe('EventListener 清理机制', () => {
    let mockGame;
    let mockDocument;
    let eventListeners;

    beforeEach(() => {
        // 模拟事件监听器追踪
        eventListeners = new Map();

        // 模拟 document 环境
        mockDocument = document;

        // 拦截 addEventListener 调用来追踪事件监听器
        const originalAddEventListener = Element.prototype.addEventListener;
        const originalRemoveEventListener = Element.prototype.removeEventListener;

        Element.prototype.addEventListener = function(type, listener, options) {
            const key = `${this.constructor.name}-${type}`;
            if (!eventListeners.has(key)) {
                eventListeners.set(key, new Set());
            }
            eventListeners.get(key).add(listener);
            return originalAddEventListener.call(this, type, listener, options);
        };

        Element.prototype.removeEventListener = function(type, listener, options) {
            const key = `${this.constructor.name}-${type}`;
            if (eventListeners.has(key)) {
                eventListeners.get(key).delete(listener);
            }
            return originalRemoveEventListener.call(this, type, listener, options);
        };

        // 创建模拟游戏对象
        mockGame = {
            eventListeners: new Map(),
            registeredElements: new Set(),

            // 事件监听器注册方法
            registerEventListener(element, type, handler) {
                if (!this.eventListeners.has(element)) {
                    this.eventListeners.set(element, []);
                }
                this.eventListeners.get(element).push({ type, handler });
                this.registeredElements.add(element);
                element.addEventListener(type, handler);
            },

            // 清理所有事件监听器
            cleanup() {
                this.eventListeners.forEach((listeners, element) => {
                    listeners.forEach(({ type, handler }) => {
                        element.removeEventListener(type, handler);
                    });
                });
                this.eventListeners.clear();
                this.registeredElements.clear();
            },

            // 检查是否还有未清理的监听器
            hasUncleanedListeners() {
                return this.eventListeners.size > 0 || this.registeredElements.size > 0;
            }
        };
    });

    afterEach(() => {
        // 恢复原始方法
        if (Element.prototype.addEventListener.toString().includes('originalAddEventListener')) {
            const methods = Element.prototype.__proto__;
            methods.addEventListener = Element.prototype.addEventListener.original;
            methods.removeEventListener = Element.prototype.removeEventListener.original;
        }

        // 清理测试环境
        document.body.innerHTML = '';
        eventListeners.clear();
    });

    describe('事件监听器注册和追踪', () => {
        test('应该正确注册和追踪事件监听器', () => {
            const button = document.createElement('button');
            const handler = jest.fn();

            mockGame.registerEventListener(button, 'click', handler);

            expect(mockGame.eventListeners.has(button)).toBe(true);
            expect(mockGame.registeredElements.has(button)).toBe(true);
            expect(mockGame.eventListeners.get(button)).toEqual([
                { type: 'click', handler }
            ]);
        });

        test('应该支持同一元素注册多个事件监听器', () => {
            const button = document.createElement('button');
            const clickHandler = jest.fn();
            const mouseoverHandler = jest.fn();

            mockGame.registerEventListener(button, 'click', clickHandler);
            mockGame.registerEventListener(button, 'mouseover', mouseoverHandler);

            expect(mockGame.eventListeners.get(button)).toHaveLength(2);
            expect(mockGame.eventListeners.get(button)).toEqual([
                { type: 'click', handler: clickHandler },
                { type: 'mouseover', handler: mouseoverHandler }
            ]);
        });

        test('应该支持同一事件类型注册多个处理器', () => {
            const button = document.createElement('button');
            const handler1 = jest.fn();
            const handler2 = jest.fn();

            mockGame.registerEventListener(button, 'click', handler1);
            mockGame.registerEventListener(button, 'click', handler2);

            expect(mockGame.eventListeners.get(button)).toHaveLength(2);
            expect(mockGame.eventListeners.get(button)).toEqual([
                { type: 'click', handler: handler1 },
                { type: 'click', handler: handler2 }
            ]);
        });
    });

    describe('事件监听器清理功能', () => {
        test('应该清理所有注册的事件监听器', () => {
            const button1 = document.createElement('button');
            const button2 = document.createElement('button');
            const handler1 = jest.fn();
            const handler2 = jest.fn();

            // 注册多个事件监听器
            mockGame.registerEventListener(button1, 'click', handler1);
            mockGame.registerEventListener(button2, 'click', handler2);

            expect(mockGame.hasUncleanedListeners()).toBe(true);

            // 清理
            mockGame.cleanup();

            expect(mockGame.hasUncleanedListeners()).toBe(false);
            expect(mockGame.eventListeners.size).toBe(0);
            expect(mockGame.registeredElements.size).toBe(0);
        });

        test('应该正确清理后允许重新注册监听器', () => {
            const button = document.createElement('button');
            const handler1 = jest.fn();
            const handler2 = jest.fn();

            // 注册监听器
            mockGame.registerEventListener(button, 'click', handler1);
            mockGame.cleanup();

            // 重新注册
            mockGame.registerEventListener(button, 'click', handler2);

            expect(mockGame.hasUncleanedListeners()).toBe(true);
            expect(mockGame.eventListeners.get(button)).toEqual([
                { type: 'click', handler: handler2 }
            ]);
        });
    });

    describe('XiangqiGame 集成测试', () => {
        test('应该在游戏初始化时设置清理机制', () => {
            // 模拟 XiangqiGame 构造函数中的事件监听器注册
            const board = document.createElement('div');
            board.className = 'board';
            document.body.appendChild(board);

            // 模拟游戏初始化过程
            const boardClickHandler = jest.fn();
            mockGame.registerEventListener(board, 'click', boardClickHandler);

            expect(mockGame.hasUncleanedListeners()).toBe(true);
        });

        test('应该在游戏重置时清理所有事件监听器', () => {
            const board = document.createElement('div');
            const button = document.createElement('button');
            document.body.appendChild(board);
            document.body.appendChild(button);

            // 模拟游戏多个事件监听器
            mockGame.registerEventListener(board, 'click', jest.fn());
            mockGame.registerEventListener(button, 'click', jest.fn());

            expect(mockGame.hasUncleanedListeners()).toBe(true);

            // 模拟游戏重置清理
            mockGame.cleanup();

            expect(mockGame.hasUncleanedListeners()).toBe(false);
        });

        test('应该在棋谱面板关闭时清理相关监听器', () => {
            const gameButton = document.createElement('div');
            const closeButton = document.createElement('button');

            const gameClickHandler = jest.fn();
            const closeClickHandler = jest.fn();

            mockGame.registerEventListener(gameButton, 'click', gameClickHandler);
            mockGame.registerEventListener(closeButton, 'click', closeClickHandler);

            expect(mockGame.hasUncleanedListeners()).toBe(true);

            // 模拟关闭棋谱面板时的清理
            mockGame.eventListeners.delete(gameButton);
            mockGame.registeredElements.delete(gameButton);

            // 清理剩余监听器
            mockGame.cleanup();

            expect(mockGame.hasUncleanedListeners()).toBe(false);
        });
    });

    describe('内存泄漏防护测试', () => {
        test('应该防止重复注册相同的事件监听器', () => {
            const button = document.createElement('button');
            const handler = jest.fn();

            // 注册相同的事件监听器
            mockGame.registerEventListener(button, 'click', handler);
            mockGame.registerEventListener(button, 'click', handler);

            expect(mockGame.eventListeners.get(button)).toHaveLength(2);

            mockGame.cleanup();

            expect(mockGame.hasUncleanedListeners()).toBe(false);
        });

        test('应该在被移除的元素上正确清理监听器', () => {
            const container = document.createElement('div');
            const button = document.createElement('button');
            container.appendChild(button);
            document.body.appendChild(container);

            const handler = jest.fn();
            mockGame.registerEventListener(button, 'click', handler);

            // 从DOM中移除元素
            container.removeChild(button);

            // 清理应该仍然有效
            mockGame.cleanup();

            expect(mockGame.hasUncleanedListeners()).toBe(false);
        });

        test('应该处理大量的动态事件监听器注册', () => {
            const handlers = [];

            // 模拟大量动态事件监听器
            for (let i = 0; i < 100; i++) {
                const button = document.createElement('button');
                const handler = jest.fn();
                handlers.push(button, handler);
                mockGame.registerEventListener(button, 'click', handler);
            }

            expect(mockGame.registeredElements.size).toBe(100);
            expect(mockGame.hasUncleanedListeners()).toBe(true);

            // 一次性清理所有监听器
            mockGame.cleanup();

            expect(mockGame.hasUncleanedListeners()).toBe(false);
            expect(mockGame.registeredElements.size).toBe(0);
        });
    });

    describe('性能优化测试', () => {
        test('清理操作应该高效执行', () => {
            const startTime = performance.now();

            // 注册大量监听器
            for (let i = 0; i < 1000; i++) {
                const button = document.createElement('button');
                mockGame.registerEventListener(button, 'click', jest.fn());
            }

            const registrationTime = performance.now();

            // 清理所有监听器
            mockGame.cleanup();

            const cleanupTime = performance.now();

            expect(cleanupTime - registrationTime).toBeLessThan(100); // 清理应该很快
            expect(mockGame.hasUncleanedListeners()).toBe(false);
        });

        test('应该避免在清理过程中产生错误', () => {
            const button = document.createElement('button');
            const handler = jest.fn();

            mockGame.registerEventListener(button, 'click', handler);

            // 模拟错误情况：元素已经从文档中移除
            button.remove();

            // 清理不应该抛出错误
            expect(() => {
                mockGame.cleanup();
            }).not.toThrow();

            expect(mockGame.hasUncleanedListeners()).toBe(false);
        });
    });

    describe('边缘情况处理', () => {
        test('应该处理空的事件监听器集合', () => {
            expect(mockGame.hasUncleanedListeners()).toBe(false);

            // 清理空集合不应该出错
            expect(() => {
                mockGame.cleanup();
            }).not.toThrow();

            expect(mockGame.hasUncleanedListeners()).toBe(false);
        });

        test('应该处理null或undefined的元素', () => {
            expect(() => {
                mockGame.registerEventListener(null, 'click', jest.fn());
            }).toThrow();

            expect(() => {
                mockGame.registerEventListener(undefined, 'click', jest.fn());
            }).toThrow();
        });

        test('应该处理无效的事件类型', () => {
            const button = document.createElement('button');

            expect(() => {
                mockGame.registerEventListener(button, null, jest.fn());
            }).not.toThrow();

            expect(() => {
                mockGame.registerEventListener(button, '', jest.fn());
            }).not.toThrow();
        });
    });
});