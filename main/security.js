"use strict";
/**
 * SecurityManager - 安全管理器
 *
 * 提供安全防护和输入验证功能
 *
 * @fileoverview 安全管理器
 * @version 2.1.0
 * @author Claude Code Review System
 * @since 2024-10-11
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityManager = void 0;
/**
 * 安全管理器
 */
class SecurityManager {
    constructor() {
        this.isProduction = process.env.NODE_ENV === 'production';
    }
    /**
     * 脱敏错误信息
     * @param {string} message - 原始错误信息
     * @returns {string} 脱敏后的错误信息
     */
    sanitizeErrorMessage(message) {
        if (this.isProduction) {
            // 生产环境隐藏敏感信息
            return '操作失败，请稍后重试';
        }
        return message;
    }
    /**
     * 验证输入安全性
     * @param {unknown} input - 待验证的输入
     * @returns {boolean} 是否安全
     */
    validateInput(input) {
        if (typeof input !== 'string') {
            return false;
        }
        // 检查XSS攻击模式
        const xssPatterns = [
            /<script/i,
            /javascript:/i,
            /onerror=/i,
            /onclick=/i
        ];
        return !xssPatterns.some(pattern => pattern.test(input));
    }
    /**
     * 创建安全的DOM元素
     * @param {string} tagName - 标签名
     * @param {string} textContent - 文本内容
     * @returns {HTMLElement} 安全的DOM元素
     */
    createSafeElement(tagName, textContent) {
        const element = document.createElement(tagName);
        if (textContent !== undefined) {
            element.textContent = textContent;
        }
        return element;
    }
}
exports.SecurityManager = SecurityManager;
//# sourceMappingURL=security.js.map