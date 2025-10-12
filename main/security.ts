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

/**
 * 安全管理器
 */
class SecurityManager {
    private isProduction: boolean;

    constructor() {
        this.isProduction = process.env.NODE_ENV === 'production';
    }

    /**
     * 脱敏错误信息
     * @param {string} message - 原始错误信息
     * @returns {string} 脱敏后的错误信息
     */
    public sanitizeErrorMessage(message: string): string {
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
    public validateInput(input: unknown): boolean {
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
    public createSafeElement(tagName: string, textContent?: string): HTMLElement {
        const element = document.createElement(tagName);

        if (textContent !== undefined) {
            element.textContent = textContent;
        }

        return element;
    }
}

export { SecurityManager };