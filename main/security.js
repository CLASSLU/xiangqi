/**
 * Security - 安全防护模块
 *
 * 提供输入验证、XSS防护、DOM安全等安全功能
 * 防止恶意输入和代码注入攻击
 *
 * @fileoverview 安全防护系统
 * @version 2.1.0
 * @author Claude Code Review System
 * @since 2024-10-11
 */

/**
 * @typedef {import('./types').PlayerColor} PlayerColor
 * @typedef {import('./types').PieceType} PieceType
 * @typedef {import('./types').Position} Position
 * @typedef {import('./types').Move} Move
 */

/**
 * 安全防护管理器
 * 统一管理所有安全相关功能
 */
class SecurityManager {
    constructor(options = {}) {
        this.config = {
            strictMode: true,
            sanitizeHtml: true,
            validateInputs: true,
            maxStringLength: 10000,
            allowedTags: ['div', 'span', 'p', 'br'],
            allowedAttributes: ['class', 'id', 'data-*'],
            ...options
        };

        // 初始化验证器
        this.validators = {
            input: new InputValidator(this.config),
            dom: new DOMSecurity(this.config),
            xss: new XSSProtection(this.config)
        };
    }

    /**
     * 验证用户输入
     * @param {any} input - 用户输入
     * @param {string} type - 输入类型
     * @returns {ValidationResult} 验证结果
     */
    validateInput(input, type = 'string') {
        return this.validators.input.validate(input, type);
    }

    /**
     * 安全的HTML文本
     * @param {string} html - 原始HTML
     * @returns {string} 安全的HTML
     */
    sanitizeHtml(html) {
        if (this.config.sanitizeHtml) {
            return this.validators.xss.sanitize(html);
        }
        return html;
    }

    /**
     * 安全地创建DOM元素
     * @param {string} tag - 标签名
     * @param {string[]} classes - CSS类名
     * @param {any} text - 文本内容
     * @returns {HTMLElement} 安全的DOM元素
     */
    createElement(tag, classes = [], text = null) {
        return this.validators.dom.createElement(tag, classes, text);
    }

    /**
     * 验证位置是否安全
     * @param {Position} position - 位置对象
     * @returns {boolean} 是否安全
     */
    validatePosition(position) {
        return this.validators.input.validatePosition(position);
    }

    /**
     * 验证移动是否安全
     * @param {Move} move - 移动对象
     * @returns {boolean} 是否安全
     */
    validateMove(move) {
        return this.validators.input.validateMove(move);
    }

    /**
     * 检查是否为安全的颜色
     * @param {any} color - 颜色值
     * @returns {boolean} 是否安全
     */
    validateColor(color) {
        return this.validators.input.validateColor(color);
    }

    /**
     * 安全地设置文本内容
     * @param {HTMLElement} element - DOM元素
     * @param {any} text - 文本内容
     */
    setSafeTextContent(element, text) {
        this.validators.dom.setSafeTextContent(element, text);
    }

    /**
     * 安全地设置属性
     * @param {HTMLElement} element - DOM元素
     * @param {string} attr - 属性名
     * @param {any} value - 属性值
     */
    setSafeAttribute(element, attr, value) {
        this.validators.dom.setSafeAttribute(element, attr, value);
    }
}

/**
 * 输入验证器
 * 专注于数据安全验证
 */
class InputValidator {
    constructor(config) {
        this.config = config;
        this.validColors = ['red', 'black'];
        this.validPieceTypes = [
            '帥', '将', '仕', '士', '相', '象', '马', '馬',
            '車', '车', '炮', '砲', '兵', '卒',
            'king', 'advisor', 'elephant', 'horse', 'rook', 'cannon', 'soldier'
        ];
        this.positionRegex = /^(\d+)[,\，](\d+)$/;
    }

    /**
     * 验证输入
     * @param {any} input - 输入数据
     * @param {string} type - 验证类型
     * @returns {ValidationResult} 验证结果
     */
    validate(input, type = 'string') {
        const errors = [];
        const warnings = [];

        try {
            switch (type) {
                case 'string':
                    this.validateString(input, errors, warnings);
                    break;
                case 'position':
                    return this.validatePosition(input);
                case 'move':
                    return this.validateMove(input);
                case 'color':
                    return this.validateColor(input);
                case 'pieceType':
                    return this.validatePieceType(input);
                case 'gameData':
                    return this.validateGameData(input);
                default:
                    errors.push({
                        code: 'UNKNOWN_VALIDATION_TYPE',
                        message: `未知的验证类型: ${type}`,
                        severity: 'medium'
                    });
            }
        } catch (error) {
            errors.push({
                code: 'VALIDATION_EXCEPTION',
                message: `验证过程中发生异常: ${error.message}`,
                severity: 'high'
            });
        }

        return {
            valid: errors.length === 0,
            data: input,
            errors,
            warnings
        };
    }

    /**
     * 验证字符串
     * @param {any} input - 输入
     * @param {Array} errors - 错误列表
     * @param {Array} warnings - 警告列表
     * @private
     */
    validateString(input, errors, warnings) {
        if (typeof input !== 'string') {
            errors.push({
                code: 'INVALID_TYPE',
                message: '输入必须是字符串类型',
                severity: 'high'
            });
            return;
        }

        if (input.length > this.config.maxStringLength) {
            errors.push({
                code: 'STRING_TOO_LONG',
                message: `字符串长度超过限制 (${this.config.maxStringLength})`,
                severity: 'medium'
            });
        }

        // 检查危险字符
        const dangerousPatterns = [
            /<script[^>]*>.*?<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi
        ];

        dangerousPatterns.forEach(pattern => {
            if (pattern.test(input)) {
                errors.push({
                    code: 'DANGEROUS_CONTENT',
                    message: '输入包含潜在危险内容',
                    severity: 'high'
                });
            }
        });
    }

    /**
     * 验证位置
     * @param {any} position - 位置对象
     * @returns {ValidationResult} 验证结果
     */
    validatePosition(position) {
        const errors = [];

        if (!position || typeof position !== 'object') {
            errors.push({
                code: 'INVALID_POSITION_TYPE',
                message: '位置必须是对象类型',
                severity: 'high'
            });
            return { valid: false, data: position, errors };
        }

        // 检查行坐标
        if (typeof position.row !== 'number' || !Number.isInteger(position.row)) {
            errors.push({
                code: 'INVALID_ROW',
                message: '行坐标必须是整数',
                severity: 'high'
            });
        } else if (position.row < 0 || position.row > 9) {
            errors.push({
                code: 'ROW_OUT_OF_RANGE',
                message: '行坐标必须在0-9范围内',
                severity: 'high'
            });
        }

        // 检查列坐标
        if (typeof position.col !== 'number' || !Number.isInteger(position.col)) {
            errors.push({
                code: 'INVALID_COLUMN',
                message: '列坐标必须是整数',
                severity: 'high'
            });
        } else if (position.col < 0 || position.col > 8) {
            errors.push({
                code: 'COLUMN_OUT_OF_RANGE',
                message: '列坐标必须在0-8范围内',
                severity: 'high'
            });
        }

        return {
            valid: errors.length === 0,
            data: position,
            errors
        };
    }

    /**
     * 验证移动
     * @param {any} move - 移动对象
     * @returns {ValidationResult} 验证结果
     */
    validateMove(move) {
        const errors = [];

        if (!move || typeof move !== 'object') {
            errors.push({
                code: 'INVALID_MOVE_TYPE',
                message: '移动必须是对象类型',
                severity: 'high'
            });
            return { valid: false, data: move, errors };
        }

        // 验证必需字段
        const requiredFields = ['pieceType', 'color'];
        requiredFields.forEach(field => {
            if (!move[field]) {
                errors.push({
                    code: 'MISSING_REQUIRED_FIELD',
                    message: `缺少必需字段: ${field}`,
                    severity: 'high'
                });
            }
        });

        // 验证颜色
        if (move.color && !this.validateColor(move.color).valid) {
            errors.push({
                code: 'INVALID_COLOR',
                message: `无效的颜色: ${move.color}`,
                severity: 'high'
            });
        }

        // 验证棋子类型
        if (move.pieceType && !this.validatePieceType(move.pieceType).valid) {
            errors.push({
                code: 'INVALID_PIECE_TYPE',
                message: `无效的棋子类型: ${move.pieceType}`,
                severity: 'high'
            });
        }

        // 验证位置
        if (move.fromPos) {
            const fromPosResult = this.validatePosition(move.fromPos);
            if (!fromPosResult.valid) {
                errors.push(...fromPosResult.errors);
            }
        }

        if (move.toPos) {
            const toPosResult = this.validatePosition(move.toPos);
            if (!toPosResult.valid) {
                errors.push(...toPosResult.errors);
            }
        }

        return {
            valid: errors.length === 0,
            data: move,
            errors
        };
    }

    /**
     * 验证颜色
     * @param {any} color - 颜色值
     * @returns {ValidationResult} 验证结果
     */
    validateColor(color) {
        const errors = [];

        if (!this.validColors.includes(color)) {
            errors.push({
                code: 'INVALID_COLOR',
                message: `无效的颜色: ${color}，必须是 ${this.validColors.join(' 或 ')}`,
                severity: 'high'
            });
        }

        return {
            valid: errors.length === 0,
            data: color,
            errors
        };
    }

    /**
     * 验证棋子类型
     * @param {any} pieceType - 棋子类型
     * @returns {ValidationResult} 验证结果
     */
    validatePieceType(pieceType) {
        const errors = [];

        if (!this.validPieceTypes.includes(pieceType)) {
            errors.push({
                code: 'INVALID_PIECE_TYPE',
                message: `无效的棋子类型: ${pieceType}`,
                severity: 'high'
            });
        }

        return {
            valid: errors.length === 0,
            data: pieceType,
            errors
        };
    }

    /**
     * 验证游戏数据
     * @param {any} gameData - 游戏数据
     * @returns {ValidationResult} 验证结果
     */
    validateGameData(gameData) {
        const errors = [];

        if (!gameData || typeof gameData !== 'object') {
            errors.push({
                code: 'INVALID_GAME_DATA_TYPE',
                message: '游戏数据必须是对象类型',
                severity: 'high'
            });
            return { valid: false, data: gameData, errors };
        }

        // 验证移动数组
        if (gameData.moves) {
            if (!Array.isArray(gameData.moves)) {
                errors.push({
                    code: 'INVALID_MOVES_TYPE',
                    message: 'moves字段必须是数组类型',
                    severity: 'high'
                });
            } else {
                // 验证每个移动
                gameData.moves.forEach((move, index) => {
                    const moveResult = this.validateMove(move);
                    if (!moveResult.valid) {
                        errors.push({
                            code: 'INVALID_MOVE_AT_INDEX',
                            message: `第${index + 1}步移动无效: ${moveResult.errors.map(e => e.message).join(', ')}`,
                            severity: 'medium',
                            moveIndex: index
                        });
                    }
                });
            }
        }

        return {
            valid: errors.length === 0,
            data: gameData,
            errors
        };
    }
}

/**
 * DOM安全防护
 * 防止XSS攻击和DOM注入
 */
class DOMSecurity {
    constructor(config) {
        this.config = config;
    }

    /**
     * 安全地创建DOM元素
     * @param {string} tag - 标签名
     * @param {string[]} classes - CSS类名
     * @param {any} text - 文本内容
     * @returns {HTMLElement} 安全的DOM元素
     */
    createElement(tag, classes = [], text = null) {
        // 验证标签名
        if (!this.isValidTagName(tag)) {
            throw new Error(`不安全的标签名: ${tag}`);
        }

        const element = document.createElement(tag);

        // 安全地设置CSS类
        if (classes.length > 0) {
            const safeClasses = classes.filter(cls => this.isValidClassName(cls));
            element.classList.add(...safeClasses);
        }

        // 安全地设置文本内容
        if (text !== null) {
            this.setSafeTextContent(element, text);
        }

        return element;
    }

    /**
     * 安全地设置文本内容
     * @param {HTMLElement} element - DOM元素
     * @param {any} text - 文本内容
     */
    setSafeTextContent(element, text) {
        if (text === null || text === undefined) {
            return;
        }

        // 转换为字符串并转义HTML
        const escapedText = this.escapeText(String(text));
        element.textContent = escapedText;
    }

    /**
     * 安全地设置属性
     * @param {HTMLElement} element - DOM元素
     * @param {string} attr - 属性名
     * @param {any} value - 属性值
     */
    setSafeAttribute(element, attr, value) {
        if (!this.isValidAttribute(attr)) {
            throw new Error(`不安全的属性名: ${attr}`);
        }

        if (this.isEventHandler(attr)) {
            throw new Error(`不允许设置事件处理器属性: ${attr}`);
        }

        const escapedValue = this.escapeAttribute(String(value));
        element.setAttribute(attr, escapedValue);
    }

    /**
     * 检查标签名是否安全
     * @param {string} tag - 标签名
     * @returns {boolean} 是否安全
     * @private
     */
    isValidTagName(tag) {
        const allowedTags = this.config.allowedTags;
        return allowedTags.includes(tag.toLowerCase());
    }

    /**
     * 检查CSS类名是否安全
     * @param {string} className - CSS类名
     * @returns {boolean} 是否安全
     * @private
     */
    isValidClassName(className) {
        // CSS类名只允许字母、数字、连字符和下划线
        return /^[a-zA-Z0-9_-]+$/.test(className);
    }

    /**
     * 检查属性名是否安全
     * @param {string} attr - 属性名
     * @returns {boolean} 是否安全
     * @private
     */
    isValidAttribute(attr) {
        const allowedAttrs = this.config.allowedAttributes;
        return allowedAttrs.some(allowed => {
            if (allowed.endsWith('*')) {
                const prefix = allowed.slice(0, -1);
                return attr.startsWith(prefix);
            }
            return attr === allowed;
        });
    }

    /**
     * 检查是否为事件处理器
     * @param {string} attr - 属性名
     * @returns {boolean} 是否为事件处理器
     * @private
     */
    isEventHandler(attr) {
        return attr.toLowerCase().startsWith('on');
    }

    /**
     * 转义文本内容
     * @param {string} text - 原始文本
     * @returns {string} 转义后的文本
     * @private
     */
    escapeText(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 转义属性值
     * @param {string} value - 原始值
     * @returns {string} 转义后的值
     * @private
     */
    escapeAttribute(value) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}

/**
 * XSS防护
 * 专门处理HTML和JavaScript注入防护
 */
class XSSProtection {
    constructor(config) {
        this.config = config;
    }

    /**
     * 清理HTML内容
     * @param {string} html - 原始HTML
     * @returns {string} 清理后的HTML
     */
    sanitize(html) {
        if (typeof html !== 'string') {
            return '';
        }

        // 移除script标签
        let sanitized = html.replace(/<script[^>]*>.*?<\/script>/gi, '');

        // 移除javascript:协议
        sanitized = sanitized.replace(/javascript:/gi, '');

        // 移除事件处理器
        sanitized = sanitized.replace(/on\w+\s*=/gi, '');

        // 移除data:协议（可能包含恶意内容）
        sanitized = sanitized.replace(/data:[^;]+;base64,/gi, '');

        // 移除vbscript:协议
        sanitized = sanitized.replace(/vbscript:/gi, '');

        // 如果严格模式，移除所有HTML标签
        if (this.config.strictMode) {
            sanitized = this.removeAllTags(sanitized);
        }

        return sanitized.trim();
    }

    /**
     * 移除所有HTML标签
     * @param {string} html - HTML内容
     * @returns {string} 纯文本内容
     * @private
     */
    removeAllTags(html) {
        return html.replace(/<[^>]*>/g, '');
    }

    /**
     * 检查URL是否安全
     * @param {string} url - URL字符串
     * @returns {boolean} 是否安全
     */
    isSecureUrl(url) {
        if (typeof url !== 'string') {
            return false;
        }

        const safeProtocols = ['http:', 'https:', 'ftp:', 'mailto:'];
        try {
            const parsed = new URL(url);
            return safeProtocols.includes(parsed.protocol);
        } catch (error) {
            return false;
        }
    }

    /**
     * 检查是否包含恶意代码
     * @param {string} input - 输入内容
     * @returns {boolean} 是否包含恶意代码
     */
    containsMaliciousCode(input) {
        if (typeof input !== 'string') {
            return false;
        }

        const maliciousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /eval\s*\(/i,
            /function\s*\(/i,
            /expression\s*\(/i
        ];

        return maliciousPatterns.some(pattern => pattern.test(input));
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SecurityManager,
        InputValidator,
        DOMSecurity,
        XSSProtection
    };
}

// 全局导出
if (typeof window !== 'undefined') {
    window.SecurityManager = SecurityManager;
    window.InputValidator = InputValidator;
    window.DOMSecurity = DOMSecurity;
    window.XSSProtection = XSSProtection;
}