/**
 * 中国象棋游戏工具函数
 * @fileoverview 提供通用的工具函数和辅助方法
 */

// utils.js 现在是完全独立的工具模块，无外部依赖

// ==================== 环境检测 ====================
/**
 * 检测是否在浏览器环境中
 * @returns {boolean} 是否在浏览器环境
 */
export const isBrowser = () => typeof document !== 'undefined' && typeof window !== 'undefined';

/**
 * 检测是否在测试环境中
 * @returns {boolean} 是否在测试环境
 */
export const isTestEnvironment = () => typeof jest !== 'undefined' || process?.env?.NODE_ENV === 'test';

// ==================== DOM工具函数 ====================
/**
 * 安全的DOM元素获取
 * @param {string} selector - CSS选择器
 * @returns {Element|null} DOM元素或null
 */
export const safeQuerySelector = (selector) => {
    if (!isBrowser()) return null;
    try {
        return document.querySelector(selector);
    } catch (error) {
        console.warn(`无效的选择器: ${selector}`, error);
        return null;
    }
};

/**
 * 安全的DOM元素创建
 * @param {string} tagName - 标签名
 * @param {Object} attributes - 属性对象
 * @returns {Element} DOM元素
 */
export const safeCreateElement = (tagName, attributes = {}) => {
    if (!isBrowser()) return null;
    const element = document.createElement(tagName);
    Object.assign(element, attributes);
    return element;
};

/**
 * 确保DOM元素具有style属性
 * @param {Element} element - DOM元素
 * @returns {Object} style对象
 */
export const ensureStyle = (element) => {
    if (!element) return {};
    if (!element.style) {
        element.style = {};
    }
    return element.style;
};

// ==================== 数据验证工具 ====================
/**
 * 验证坐标是否有效
 * @param {number} row - 行坐标
 * @param {number} col - 列坐标
 * @returns {boolean} 是否有效
 */
export const isValidPosition = (row, col, config = { rows: 10, cols: 9 }) => {
    const { rows, cols } = config;
    return Number.isInteger(row) && Number.isInteger(col) &&
           row >= 0 && row < rows &&
           col >= 0 && col < cols;
};

/**
 * 验证棋子数据
 * @param {Object} piece - 棋子数据
 * @returns {boolean} 是否有效
 */
export const isValidPiece = (piece, config = { pieceTypes: [], colors: { RED: 'red', BLACK: 'black' } }) => {
    const { pieceTypes, colors } = config;
    return piece &&
           typeof piece === 'object' &&
           (pieceTypes.length === 0 || pieceTypes.includes(piece.type)) &&
           (colors.RED === piece.color || colors.BLACK === piece.color);
};

/**
 * 安全的数字解析
 * @param {*} value - 要解析的值
 * @param {number} defaultValue - 默认值
 * @returns {number} 解析后的数字
 */
export const safeParseInt = (value, defaultValue = 0) => {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? defaultValue : parsed;
};

// ==================== 错误处理工具 ====================
/**
 * 创建统一的错误处理器
 * @param {string} context - 错误上下文
 * @returns {Function} 错误处理函数
 */
// 生产环境检测
export const isProduction = () => {
    return typeof process !== 'undefined' && process.env?.NODE_ENV === 'production' ||
           (typeof window !== 'undefined' && window.location?.hostname &&
            window.location.hostname !== 'localhost' &&
            window.location.hostname !== '127.0.0.1');
};

// 错误信息脱敏
export const sanitizeErrorMessage = (error) => {
    if (!error) return '未知错误';

    if (typeof error === 'string') {
        return error.substring(0, 200);
    }

    if (error instanceof Error) {
        return {
            type: error.constructor.name,
            message: error.message?.substring(0, 200) || '发生错误'
        };
    }

    if (typeof error === 'object') {
        return {
            type: 'ObjectError',
            message: '对象处理错误'
        };
    }

    return '未知错误类型';
};

export const createErrorHandler = (context, enableVerboseLogs = !isProduction()) => {
    return (error, fallback = null) => {
        if (enableVerboseLogs) {
            // 开发环境：详细错误信息
            console.error(`[${context}] 错误:`, error);
            if (error && error.stack) {
                console.error(`[${context}] 堆栈:`, error.stack);
            }
        } else {
            // 生产环境：脱敏错误信息
            const safeMessage = sanitizeErrorMessage(error);
            console.error(`[${context}] 错误:`, safeMessage);
        }

        if (fallback && typeof fallback === 'function') {
            return fallback();
        }
        return null;
    };
};

/**
 * 安全的函数执行
 * @param {Function} fn - 要执行的函数
 * @param {*} fallback - 出错时的返回值
 * @param {string} context - 错误上下文
 * @returns {*} 函数执行结果或fallback值
 */
export const safeExecute = (fn, fallback = null, context = 'Unknown') => {
    try {
        return fn();
    } catch (error) {
        console.error(`[${context}] 执行错误:`, error);
        return fallback;
    }
};

// ==================== 数组操作已简化为使用原生方法 ====================

// ==================== 字符串操作已简化为使用模板字符串 ====================

// ==================== 性能工具 ====================
/**
 * 创建防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export const debounce = (func, delay) => {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
};

/**
 * 创建节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */
export const throttle = (func, limit) => {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// ==================== 安全DOM工具 ====================

/**
 * 安全地创建带有文本内容的DOM元素
 * @param {string} tagName - 标签名
 * @param {string} textContent - 文本内容
 * @param {Object} attributes - 属性对象
 * @returns {Element} DOM元素
 */
export const createTextElement = (tagName, textContent, attributes = {}) => {
    const element = document.createElement(tagName);
    if (textContent) {
        element.textContent = escapeHTML(textContent);
    }
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = escapeHTML(value);
        } else if (key === 'textContent') {
            element.textContent = escapeHTML(value);
        } else {
            element.setAttribute(key, escapeHTML(String(value)));
        }
    });
    return element;
};

/**
 * 安全地创建游戏列表项元素
 * @param {Object} gameData - 游戏数据
 * @returns {Element} 游戏列表项元素
 */
export const createGameListItem = (title, info, count, attributes = {}) => {
    const gameItem = document.createElement('div');
    gameItem.className = 'game-item';
    Object.assign(gameItem, attributes);

    const titleEl = createTextElement('div', title, { className: 'game-title' });
    const infoEl = createTextElement('div', info, { className: 'game-info' });
    const countEl = createTextElement('span', `(${count}局)`, { className: 'game-count' });

    gameItem.appendChild(titleEl);
    gameItem.appendChild(infoEl);
    gameItem.appendChild(countEl);

    return gameItem;
};

/**
 * 安全地创建详细的棋谱游戏项元素
 * @param {Object} game - 游戏数据
 * @param {number} index - 索引
 * @param {Function} qualityColorFn - 获取质量颜色的函数
 * @returns {Element} 游戏项元素
 */
export const createDetailedGameItem = (game, index, qualityColorFn) => {
    const gameItem = document.createElement('div');
    gameItem.className = 'game-item';

    // 计算游戏信息
    const qualityScore = game.qualityScore || game.classification?.score || 0;
    const qualityLevel = game.classification?.levelText || '基础级';
    const playersInfo = game.redPlayer && game.blackPlayer ?
        `${game.redPlayer} vs ${game.blackPlayer}` : '选手信息未知';
    const resultInfo = game.result ? `结果: ${game.result}` : '结果: 未知';
    const eventInfo = game.event ? `赛事: ${game.event}` : '';
    const dateInfo = game.date ? `日期: ${game.date}` : '';

    // 创建标题元素
    const titleEl = createTextElement('div', null, { className: 'game-title' });
    titleEl.appendChild(createTextElement('span', game.title || `棋谱 ${index + 1}`));

    const qualitySpan = createTextElement('span', qualityLevel, {
        className: 'game-quality',
        style: `background: ${qualityColorFn ? qualityColorFn(qualityScore) : '#ccc'}`
    });
    titleEl.appendChild(qualitySpan);

    // 创建其他信息元素
    const infoEl = createTextElement('div', playersInfo, { className: 'game-info' });
    const resultEl = createTextElement('div', resultInfo, { className: 'game-meta' });
    const eventDateEl = createTextElement('div', `${eventInfo} ${dateInfo}`.trim(), { className: 'game-meta' });
    const movesEl = createTextElement('div',
        `步数: ${game.moves ? game.moves.length : 0} | 质量: ${qualityScore}分`,
        { className: 'game-moves' }
    );

    // 组装元素
    gameItem.appendChild(titleEl);
    gameItem.appendChild(infoEl);
    gameItem.appendChild(resultEl);
    gameItem.appendChild(eventDateEl);
    gameItem.appendChild(movesEl);

    return gameItem;
};

// ==================== 缓存功能已移除（未使用） ====================

// ==================== HTML安全工具 ====================
/**
 * HTML转义函数，防止XSS攻击
 * @param {string} unsafeText - 需要转义的文本
 * @returns {string} 转义后的安全文本
 */
export const escapeHTML = (unsafeText) => {
    if (typeof unsafeText !== 'string') {
        return String(unsafeText || '');
    }

    return unsafeText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * 安全地创建DOM元素并设置内容
 * @param {string} tagName - 标签名
 * @param {Object} options - 配置选项
 * @param {string} options.text - 文本内容（会被转义）
 * @param {string} options.className - CSS类名
 * @param {Object} options.attributes - 属性对象
 * @param {Array} options.children - 子元素数组
 * @returns {Element} DOM元素
 */
export const createGameElement = (tagName, options = {}) => {
    if (!isBrowser()) {
        // 测试环境返回模拟对象
        const mockElement = {
            tagName: tagName.toUpperCase(),
            className: options.className || '',
            textContent: options.text || '',
            dataset: {},
            style: {},
            classList: {
                add: () => {},
                remove: () => {},
                contains: () => false
            },
            addEventListener: () => {},
            removeEventListener: () => {},
            appendChild: () => {},
            remove: () => {},
            setAttribute: () => {},
            getAttribute: () => null,
            innerHTML: ''
        };

        if (options.attributes) {
            mockElement.dataset = { ...options.attributes };
        }

        return mockElement;
    }

    const element = document.createElement(tagName);

    // 设置类名
    if (options.className) {
        element.className = options.className;
    }

    // 安全地设置文本内容
    if (options.text !== undefined) {
        element.textContent = options.text;
    }

    // 设置属性
    if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
            if (key.startsWith('data-')) {
                element.dataset[key.substring(5)] = value;
            } else {
                element.setAttribute(key, value);
            }
        });
    }

    // 添加子元素
    if (options.children && Array.isArray(options.children)) {
        options.children.forEach(child => {
            if (child instanceof Element) {
                element.appendChild(child);
            } else if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            }
        });
    }

    return element;
};

/**
 * 安全地创建带多个子元素的DOM结构
 * @param {string} parentTagName - 父元素标签名
 * @param {Array} childrenSpecs - 子元素规格数组
 * @param {Object} parentOptions - 父元素配置
 * @returns {Element} 父DOM元素
 */
export const createGameElementWithChildren = (parentTagName, childrenSpecs = [], parentOptions = {}) => {
    const parent = createGameElement(parentTagName, parentOptions);

    childrenSpecs.forEach(childSpec => {
        if (typeof childSpec === 'string') {
            // 纯文本内容
            parent.appendChild(document.createTextNode(childSpec));
        } else if (childSpec && typeof childSpec === 'object') {
            // 子元素规格
            const child = createGameElement(
                childSpec.tagName,
                {
                    text: childSpec.text,
                    className: childSpec.className,
                    attributes: childSpec.attributes,
                    children: childSpec.children
                }
            );
            parent.appendChild(child);
        }
    });

    return parent;
};

/**
 * 安全地设置元素的HTML内容，支持模板字符串但会转义动态内容
 * @param {Element} element - 目标元素
 * @param {string} template - HTML模板字符串（支持静态HTML）
 * @param {Object} dynamicData - 需要转义的动态数据对象
 * @returns {void}
 */
export const setSafeHTML = (element, template, dynamicData = {}) => {
    if (!element || !isBrowser()) return;

    // 替换模板中的动态内容并转义
    let safeHTML = template;
    Object.entries(dynamicData).forEach(([key, value]) => {
        const placeholder = new RegExp(`\\$\\{${key}\\}`, 'g');
        safeHTML = safeHTML.replace(placeholder, escapeHTML(value));
    });

    element.innerHTML = safeHTML;
};

// ==================== 配置工厂函数 ====================
/**
 * 创建位置验证器
 * @param {Object} config - 棋盘配置
 * @returns {Function} 位置验证函数
 */
export const createPositionValidator = (config) => {
    const { rows, cols } = config;
    return (row, col) => {
        return Number.isInteger(row) && Number.isInteger(col) &&
               row >= 0 && row < rows &&
               col >= 0 && col < cols;
    };
};

/**
 * 创建棋子验证器
 * @param {Object} config - 棋子配置
 * @returns {Function} 棋子验证函数
 */
export const createPieceValidator = (config) => {
    const { pieceTypes, colors } = config;
    return (piece) => {
        return piece &&
               typeof piece === 'object' &&
               (pieceTypes.length === 0 || pieceTypes.includes(piece.type)) &&
               (colors.RED === piece.color || colors.BLACK === piece.color);
    };
};

/**
 * 创建象棋工具集合
 * @param {Object} config - 象棋配置
 * @returns {Object} 工具函数集合
 */
export const createChessUtils = (config) => {
    return {
        isValidPosition: (row, col) => isValidPosition(row, col, config),
        isValidPiece: (piece) => isValidPiece(piece, config),
        createPositionValidator: () => createPositionValidator(config),
        createPieceValidator: () => createPieceValidator(config)
    };
};

// ==================== 棋谱工具 ====================
/**
 * 验证棋步数据结构
 * @param {Object} move - 棋步数据
 * @returns {boolean} 是否有效
 */
export const validateMoveStructure = (move) => {
    if (!move || typeof move !== 'object') return false;

    const requiredFields = ['color', 'pieceType', 'fromPos', 'toPos'];
    return requiredFields.every(field => move[field] !== undefined);
};

/**
 * 创建棋步数据
 * @param {string} color - 颜色
 * @param {string} pieceType - 棋子类型
 * @param {Array} fromPos - 起始位置
 * @param {Array} toPos - 目标位置
 * @param {string} notation - 记谱法
 * @returns {Object} 棋步数据
 */
export const createMove = (color, pieceType, fromPos, toPos, notation) => {
    return {
        color,
        pieceType,
        fromPos: [...fromPos],
        toPos: [...toPos],
        notation,
        timestamp: Date.now()
    };
};

// ==================== 导出默认配置 ====================
export default {
    isBrowser,
    isTestEnvironment,
    safeQuerySelector,
    safeCreateElement,
    ensureStyle,
    isValidPosition,
    isValidPiece,
    safeParseInt,
    createErrorHandler,
    sanitizeErrorMessage,
    isProduction,
    safeExecute,
    debounce,
    throttle,
    escapeHTML,
    createTextElement,
    createGameListItem,
    createDetailedGameItem,
    createGameElement,
    createGameElementWithChildren,
    setSafeHTML,
    validateMoveStructure,
    createMove,
    createPositionValidator,
    createPieceValidator,
    createChessUtils
};

// ==================== 导出到window对象 ====================
// 为script标签加载方式提供全局访问
if (typeof window !== 'undefined') {
    window.escapeHTML = escapeHTML;
    window.createTextElement = createTextElement;
    window.createGameListItem = createGameListItem;
    window.createDetailedGameItem = createDetailedGameItem;
    window.createGameElement = createGameElement;
    window.createGameElementWithChildren = createGameElementWithChildren;
    window.setSafeHTML = setSafeHTML;
}