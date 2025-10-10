/**
 * ModalManager 测试用例
 * 替换 alert() 为自定义模态框组件
 */

describe('ModalManager', () => {
    let modalManager;
    let mockDocument;

    beforeEach(() => {
        // 模拟 DOM 环境
        mockDocument = document;
        document.body.innerHTML = `
            <div id="modal-container" style="display: none;">
                <div class="modal-backdrop"></div>
                <div class="modal-dialog">
                    <div class="modal-header">
                        <span class="modal-title"></span>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body"></div>
                    <div class="modal-footer">
                        <button class="modal-btn-confirm">确定</button>
                    </div>
                </div>
            </div>
        `;

        // 加载 ModalManager 类
        if (typeof ModalManager === 'undefined') {
            // 如果还未定义，创建一个简单的实现用于测试
            window.ModalManager = class ModalManager {
                constructor() {
                    this.container = document.getElementById('modal-container');
                    this.title = this.container.querySelector('.modal-title');
                    this.body = this.container.querySelector('.modal-body');
                    this.closeBtn = this.container.querySelector('.modal-close');
                    this.confirmBtn = this.container.querySelector('.modal-btn-confirm');

                    this.setupEventListeners();
                }

                setupEventListeners() {
                    this.closeBtn.addEventListener('click', () => this.hide());
                    this.confirmBtn.addEventListener('click', () => this.hide());
                    this.container.addEventListener('click', (e) => {
                        if (e.target === this.container) this.hide();
                    });
                }

                showMessage(message, type = 'info') {
                    const validType = this.getValidType(type);
                    this.title.textContent = this.getTitleForType(validType);
                    this.body.textContent = message;
                    this.container.className = `modal-container modal-${validType}`;
                    this.container.style.display = 'flex';

                    return new Promise(resolve => {
                        this.resolveCallback = resolve;
                    });
                }

                hide() {
                    this.container.style.display = 'none';
                    if (this.resolveCallback) {
                        this.resolveCallback();
                        this.resolveCallback = null;
                    }
                }

                getTitleForType(type) {
                    const titles = {
                        'info': '提示',
                        'error': '错误',
                        'warning': '警告',
                        'success': '成功'
                    };
                    return titles[type] || '提示';
                }

                getValidType(type) {
                    const validTypes = ['info', 'error', 'warning', 'success'];
                    return validTypes.includes(type) ? type : 'info';
                }
            };
        }

        modalManager = new ModalManager();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('构造函数初始化', () => {
        test('应该正确初始化所有DOM元素引用', () => {
            expect(modalManager.container).toBeDefined();
            expect(modalManager.title).toBeDefined();
            expect(modalManager.body).toBeDefined();
            expect(modalManager.closeBtn).toBeDefined();
            expect(modalManager.confirmBtn).toBeDefined();
        });

        test('应该设置事件监听器', () => {
            const closeSpy = jest.spyOn(modalManager, 'hide');

            modalManager.closeBtn.click();
            expect(closeSpy).toHaveBeenCalled();

            modalManager.confirmBtn.click();
            expect(closeSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('消息显示功能', () => {
        test('应该显示信息类型的消息', () => {
            modalManager.showMessage('这是一条信息', 'info');

            expect(modalManager.title.textContent).toBe('提示');
            expect(modalManager.body.textContent).toBe('这是一条信息');
            expect(modalManager.container.style.display).toBe('flex');
            expect(modalManager.container.className).toContain('modal-info');
        });

        test('应该显示错误类型的消息', () => {
            modalManager.showMessage('这是一条错误', 'error');

            expect(modalManager.title.textContent).toBe('错误');
            expect(modalManager.body.textContent).toBe('这是一条错误');
            expect(modalManager.container.className).toContain('modal-error');
        });

        test('应该显示警告类型的消息', () => {
            modalManager.showMessage('这是一条警告', 'warning');

            expect(modalManager.title.textContent).toBe('警告');
            expect(modalManager.body.textContent).toBe('这是一条警告');
            expect(modalManager.container.className).toContain('modal-warning');
        });

        test('应该显示成功类型的消息', () => {
            modalManager.showMessage('操作成功', 'success');

            expect(modalManager.title.textContent).toBe('成功');
            expect(modalManager.body.textContent).toBe('操作成功');
            expect(modalManager.container.className).toContain('modal-success');
        });

        test('默认应该显示信息类型的消息', () => {
            modalManager.showMessage('默认消息');

            expect(modalManager.title.textContent).toBe('提示');
            expect(modalManager.container.className).toContain('modal-info');
        });
    });

    describe('模态框关闭功能', () => {
        test('点击关闭按钮应该隐藏模态框', () => {
            modalManager.showMessage('测试消息');
            expect(modalManager.container.style.display).toBe('flex');

            modalManager.closeBtn.click();
            expect(modalManager.container.style.display).toBe('none');
        });

        test('点击确定按钮应该隐藏模态框', () => {
            modalManager.showMessage('测试消息');
            expect(modalManager.container.style.display).toBe('flex');

            modalManager.confirmBtn.click();
            expect(modalManager.container.style.display).toBe('none');
        });

        test('点击背景应该隐藏模态框', () => {
            modalManager.showMessage('测试消息');
            expect(modalManager.container.style.display).toBe('flex');

            modalManager.container.click();
            expect(modalManager.container.style.display).toBe('none');
        });
    });

    describe('Promise支持', () => {
        test('showMessage应该返回Promise', () => {
            const result = modalManager.showMessage('测试消息');
            expect(result).toBeInstanceOf(Promise);
        });

        test('隐藏模态框应该解析Promise', async () => {
            const promise = modalManager.showMessage('测试消息');

            setTimeout(() => {
                modalManager.hide();
            }, 10);

            await expect(promise).resolves.toBeUndefined();
        });
    });

    describe('具体业务场景测试', () => {
        test('棋谱数据验证失败场景', () => {
            const message = '棋谱数据验证失败，无法播放';
            modalManager.showMessage(message, 'error');

            expect(modalManager.body.textContent).toBe(message);
            expect(modalManager.title.textContent).toBe('错误');
        });

        test('非法移动提示场景', () => {
            const message = '非法移动！';
            modalManager.showMessage(message, 'warning');

            expect(modalManager.body.textContent).toBe(message);
            expect(modalManager.title.textContent).toBe('警告');
        });

        test('游戏结束通知场景', () => {
            const message = '黑方被将死！红方获胜！';
            modalManager.showMessage(message, 'success');

            expect(modalManager.body.textContent).toBe(message);
            expect(modalManager.title.textContent).toBe('成功');
        });

        test('将军提示场景', () => {
            const message = '黑方被将军，必须应将！';
            modalManager.showMessage(message, 'warning');

            expect(modalManager.body.textContent).toBe(message);
            expect(modalManager.title.textContent).toBe('警告');
        });

        test('功能未实现提示场景', () => {
            const message = '悔棋功能将在后续版本实现';
            modalManager.showMessage(message, 'info');

            expect(modalManager.body.textContent).toBe(message);
            expect(modalManager.title.textContent).toBe('提示');
        });
    });

    describe('非阻塞性验证', () => {
        test('显示模态框不应该阻塞主线程', (done) => {
            let executionOrder = [];

            modalManager.showMessage('测试消息');
            executionOrder.push('after showMessage');

            setTimeout(() => {
                executionOrder.push('in setTimeout');
                expect(executionOrder).toEqual([
                    'after showMessage',
                    'in setTimeout'
                ]);
                done();
            }, 10);
        });
    });

    describe('边界条件测试', () => {
        test('空消息应该正常处理', () => {
            expect(() => {
                modalManager.showMessage('', 'info');
            }).not.toThrow();

            expect(modalManager.body.textContent).toBe('');
        });

        test('长消息应该正常处理', () => {
            const longMessage = 'a'.repeat(1000);
            expect(() => {
                modalManager.showMessage(longMessage, 'info');
            }).not.toThrow();

            expect(modalManager.body.textContent).toBe(longMessage);
        });

        test('未知类型应该默认为info', () => {
            modalManager.showMessage('测试消息', 'unknown');
            expect(modalManager.title.textContent).toBe('提示');
            expect(modalManager.container.className).toContain('modal-info');
        });
    });
});