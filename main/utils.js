/**
 * 中国象棋游戏工具函数
 * @fileoverview 提供通用的工具函数和辅助方法
 */

import { BOARD_CONFIG, ERROR_MESSAGES } from './constants.js';

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
    if (!isBrowser()) {
        // 测试环境返回模拟对象
        return {
            tagName: tagName.toUpperCase(),
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
            textContent: '',
            innerHTML: ''
        };
    }

    const element = document.createElement(tagName);
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'textContent') {
            element.textContent = value;
        } else if (key === 'innerHTML') {
            element.innerHTML = value;
        } else {
            element.setAttribute(key, value);
        }
    });
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
export const isValidPosition = (row, col) => {
    return Number.isInteger(row) && Number.isInteger(col) &&
           row >= 0 && row < BOARD_CONFIG.ROWS &&
           col >= 0 && col < BOARD_CONFIG.COLS;
};

/**
 * 验证棋子数据
 * @param {Object} piece - 棋子数据
 * @returns {boolean} 是否有效
 */
export const isValidPiece = (piece) => {
    return piece &&
           typeof piece === 'object' &&
           BOARD_CONFIG.PIECE_TYPES.includes(piece.type) &&
           BOARD_CONFIG.COLORS.RED === piece.color || BOARD_CONFIG.COLORS.BLACK === piece.color;
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
export const createErrorHandler = (context) => {
    return (error, fallback = null) => {
        console.error(`[${context}] 错误:`, error);
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

// ==================== 数组和集合工具 ====================
/**
 * 查找数组中满足条件的元素
 * @param {Array} array - 要搜索的数组
 * @param {Function} predicate - 断言函数
 * @returns {*} 找到的元素或undefined
 */
export const findInArray = (array, predicate) => {
    if (!Array.isArray(array)) return undefined;
    return array.find(predicate);
};

/**
 * 安全的数组过滤
 * @param {Array} array - 要过滤的数组
 * @param {Function} predicate - 断言函数
 * @returns {Array} 过滤后的数组
 */
export const safeFilter = (array, predicate) => {
    if (!Array.isArray(array)) return [];
    return array.filter(predicate);
};

/**
 * 检查数组是否包含满足条件的元素
 * @param {Array} array - 要检查的数组
 * @param {Function} predicate - 断言函数
 * @returns {boolean} 是否包含
 */
export const arraySome = (array, predicate) => {
    if (!Array.isArray(array)) return false;
    return array.some(predicate);
};

// ==================== 字符串工具 ====================
/**
 * 安全的字符串拼接
 * @param {...any} args - 要拼接的参数
 * @returns {string} 拼接后的字符串
 */
export const safeStringJoin = (...args) => {
    return args.map(arg => String(arg || '')).join('');
};

/**
 * 格式化坐标显示
 * @param {number} row - 行坐标
 * @param {number} col - 列坐标
 * @returns {string} 格式化的坐标字符串
 */
export const formatPosition = (row, col) => {
    return `(${row}, ${col})`;
};

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

// ==================== 缓存工具 ====================
/**
 * 创建LRU缓存
 * @param {number} maxSize - 最大缓存大小
 * @returns {Object} 缓存对象
 */
export const createLRUCache = (maxSize = 100) => {
    const cache = new Map();

    return {
        get(key) {
            if (cache.has(key)) {
                // 移到最后（最近使用）
                const value = cache.get(key);
                cache.delete(key);
                cache.set(key, value);
                return value;
            }
            return undefined;
        },

        set(key, value) {
            if (cache.has(key)) {
                cache.delete(key);
            } else if (cache.size >= maxSize) {
                // 删除最久未使用的项
                const firstKey = cache.keys().next().value;
                cache.delete(firstKey);
            }
            cache.set(key, value);
        },

        has(key) {
            return cache.has(key);
        },

        clear() {
            cache.clear();
        },

        size() {
            return cache.size;
        }
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
    safeExecute,
    findInArray,
    safeFilter,
    arraySome,
    safeStringJoin,
    formatPosition,
    debounce,
    throttle,
    createLRUCache,
    validateMoveStructure,
    createMove
};