/**
 * ModalManager - 替换 alert() 的非阻塞模态框组件
 * 提供 info、error、warning、success 四种消息类型
 */
class ModalManager {
    constructor() {
        this.container = null;
        this.title = null;
        this.body = null;
        this.closeBtn = null;
        this.confirmBtn = null;
        this.resolveCallback = null;

        this.init();
    }

    /**
     * 初始化模态框DOM结构和事件监听器
     */
    init() {
        this.createModalDOM();
        this.setupEventListeners();
    }

    /**
     * 创建模态框DOM结构
     */
    createModalDOM() {
        // 检查是否已存在
        this.container = document.getElementById('modal-container');
        if (this.container) {
            // 如果已存在，直接获取元素引用
            this.title = this.container.querySelector('.modal-title');
            this.body = this.container.querySelector('.modal-body');
            this.closeBtn = this.container.querySelector('.modal-close');
            this.confirmBtn = this.container.querySelector('.modal-btn-confirm');
            return;
        }

        // 创建新的模态框结构
        this.container = document.createElement('div');
        this.container.id = 'modal-container';
        this.container.className = 'modal-container';
        this.container.style.display = 'none';

        this.container.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-dialog">
                <div class="modal-header">
                    <span class="modal-title">提示</span>
                    <button class="modal-close" aria-label="关闭">&times;</button>
                </div>
                <div class="modal-body"></div>
                <div class="modal-footer">
                    <button class="modal-btn-confirm">确定</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.container);

        // 获取元素引用
        this.title = this.container.querySelector('.modal-title');
        this.body = this.container.querySelector('.modal-body');
        this.closeBtn = this.container.querySelector('.modal-close');
        this.confirmBtn = this.container.querySelector('.modal-btn-confirm');
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        const closeHandler = () => this.hide();
        const confirmHandler = () => this.hide();
        const backdropHandler = (e) => {
            if (e.target === this.container) this.hide();
        };

        this.closeBtn.addEventListener('click', closeHandler);
        this.confirmBtn.addEventListener('click', confirmHandler);
        this.container.addEventListener('click', backdropHandler);

        // 键盘事件支持
        this.keyHandler = (e) => {
            if (this.container.style.display !== 'none' && e.key === 'Escape') {
                this.hide();
            }
        };
        document.addEventListener('keydown', this.keyHandler);
    }

    /**
     * 显示消息
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型: 'info', 'error', 'warning', 'success'
     * @returns {Promise} Promise对象，当模态框关闭时resolve
     */
    showMessage(message, type = 'info') {
        const validType = this.getValidType(type);

        this.title.textContent = this.getTitleForType(validType);
        this.body.textContent = message;
        this.container.className = `modal-container modal-${validType}`;
        this.container.style.display = 'flex';

        // 禁止背景滚动
        document.body.style.overflow = 'hidden';

        return new Promise(resolve => {
            this.resolveCallback = resolve;
        });
    }

    /**
     * 隐藏模态框
     */
    hide() {
        this.container.style.display = 'none';
        document.body.style.overflow = '';

        if (this.resolveCallback) {
            this.resolveCallback();
            this.resolveCallback = null;
        }
    }

    /**
     * 验证消息类型是否有效
     * @param {string} type - 消息类型
     * @returns {string} 有效的消息类型
     */
    getValidType(type) {
        const validTypes = ['info', 'error', 'warning', 'success'];
        return validTypes.includes(type) ? type : 'info';
    }

    /**
     * 根据消息类型获取标题
     * @param {string} type - 消息类型
     * @returns {string} 标题文本
     */
    getTitleForType(type) {
        const titles = {
            'info': '提示',
            'error': '错误',
            'warning': '警告',
            'success': '成功'
        };
        return titles[type] || '提示';
    }

    /**
     * 清理资源，移除事件监听器
     */
    destroy() {
        document.removeEventListener('keydown', this.keyHandler);
        this.container.remove();
    }
}

// 创建全局单例实例
let modalManagerInstance = null;

/**
 * 获取全局ModalManager实例
 * @returns {ModalManager} ModalManager实例
 */
function getModalManager() {
    if (!modalManagerInstance) {
        modalManagerInstance = new ModalManager();
    }
    return modalManagerInstance;
}

/**
 * 替换alert()的全局函数
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型
 */
function showMessage(message, type = 'info') {
    return getModalManager().showMessage(message, type);
}

// 导出到全局作用域
window.ModalManager = ModalManager;
window.getModalManager = getModalManager;
window.showMessage = showMessage;