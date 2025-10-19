/**
 * Common Utils - 通用工具函数模块
 *
 * 提供项目中常用的工具函数，减少代码重复
 * 增强代码复用性和可维护性
 *
 * @fileoverview 通用工具函数
 * @version 2.1.0
 * @author Claude Code Review System
 * @since 2024-10-12
 */

/**
 * 对象工具类
 */
export class ObjectUtils {
    /**
     * 深度克隆对象
     * @param {T} obj - 要克隆的对象
     * @returns {T} 克隆后的对象
     */
    public static deepClone<T>(obj: T): T {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof Date) {
            return new Date(obj.getTime()) as unknown as T;
        }

        if (obj instanceof Array) {
            return obj.map(item => ObjectUtils.deepClone(item)) as unknown as T;
        }

        const cloned = {} as T;
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = ObjectUtils.deepClone(obj[key]);
            }
        }

        return cloned;
    }

    /**
     * 安全地获取对象属性
     * @param {any} obj - 对象
     * @param {string} path - 属性路径，如 'a.b.c'
     * @param {any} defaultValue - 默认值
     * @returns {any} 属性值或默认值
     */
    public static safeGet(obj: any, path: string, defaultValue: any = undefined): any {
        try {
            const keys = path.split('.');
            let result = obj;
            for (const key of keys) {
                if (result === null || result === undefined) {
                    return defaultValue;
                }
                result = result[key];
            }
            return result !== undefined ? result : defaultValue;
        } catch {
            return defaultValue;
        }
    }

    /**
     * 检查对象是否为空
     * @param {any} obj - 要检查的对象
     * @returns {boolean}
     */
    public static isEmpty(obj: any): boolean {
        if (obj === null || obj === undefined) return true;
        if (typeof obj === 'string') return obj.trim().length === 0;
        if (Array.isArray(obj)) return obj.length === 0;
        if (typeof obj === 'object') return Object.keys(obj).length === 0;
        return false;
    }
}

/**
 * 数组工具类
 */
export class ArrayUtils {
    /**
     * 安全地移除数组元素
     * @param {T[]} array - 数组
     * @param {T} item - 要移除的元素
     * @returns {boolean} 是否成功移除
     */
    public static safeRemove<T>(array: T[], item: T): boolean {
        const index = array.indexOf(item);
        if (index > -1) {
            array.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * 数组去重
     * @param {T[]} array - 数组
     * @param {Function} keyFn - 提取键的函数
     * @returns {T[]} 去重后的数组
     */
    public static unique<T>(array: T[], keyFn?: (item: T) => any): T[] {
        if (!keyFn) {
            return [...new Set(array)];
        }

        const seen = new Set();
        return array.filter(item => {
            const key = keyFn(item);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * 分组数组
     * @param {T[]} array - 数组
     * @param {Function} keyFn - 分组键函数
     * @returns {Record<string, T[]>} 分组结果
     */
    public static groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
        return array.reduce((groups, item) => {
            const key = keyFn(item);
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
            return groups;
        }, {} as Record<string, T[]>);
    }

    /**
     * 随机选择数组中的元素
     * @param {T[]} array - 数组
     * @returns {T} 随机元素
     */
    public static randomChoice<T>(array: T[]): T | null {
        if (array.length === 0) return null;
        const index = Math.floor(Math.random() * array.length);
        return array[index];
    }
}

/**
 * 字符串工具类
 */
export class StringUtils {
    /**
     * 安全地进行字符串格式化
     * @param {string} template - 模板字符串
     * @param {Record<string, any>} params - 参数对象
     * @returns {string} 格式化后的字符串
     */
    public static format(template: string, params: Record<string, any>): string {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return params[key] !== undefined ? String(params[key]) : match;
        });
    }

    /**
     * 生成随机ID
     * @param {number} length - ID长度
     * @returns {string} 随机ID
     */
    public static generateId(length: number = 8): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * 截断字符串
     * @param {string} str - 字符串
     * @param {number} maxLength - 最大长度
     * @param {string} suffix - 后缀
     * @returns {string} 截断后的字符串
     */
    public static truncate(str: string, maxLength: number, suffix: string = '...'): string {
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength - suffix.length) + suffix;
    }

    /**
     * 转换为驼峰命名
     * @param {string} str - 字符串
     * @returns {string} 驼峰命名字符串
     */
    public static toCamelCase(str: string): string {
        return str.replace(/[-_\s]+(.)?/g, (_, char) => {
            return char ? char.toUpperCase() : '';
        });
    }
}

/**
 * 时间工具类
 */
export class TimeUtils {
    /**
     * 安全的延时函数
     * @param {number} ms - 延时毫秒数
     * @returns {Promise} Promise
     */
    public static delay(ms: number): Promise<void> {
        return new Promise(resolve => {
            const timer = setTimeout(resolve, ms);
            // 防止内存泄漏
            if (typeof timer !== 'number') {
                timer.unref();
            }
        });
    }

    /**
     * 创建节流函数
     * @param {Function} func - 要节流的函数
     * @param {number} delay - 延时
     * @returns {Function} 节流后的函数
     */
    public static throttle<T extends (...args: any[]) => any>(
        func: T,
        delay: number
    ): (...args: Parameters<T>) => void {
        let lastCall = 0;
        return (...args: Parameters<T>) => {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                func(...args);
            }
        };
    }

    /**
     * 创建防抖函数
     * @param {Function} func - 要防抖的函数
     * @param {number} delay - 延时
     * @returns {Function} 防抖后的函数
     */
    public static debounce<T extends (...args: any[]) => any>(
        func: T,
        delay: number
    ): (...args: Parameters<T>) => void {
        let timer: NodeJS.Timeout;
        return (...args: Parameters<T>) => {
            clearTimeout(timer);
            timer = setTimeout(() => func(...args), delay);
        };
    }
}

/**
 * 错误工具类
 */
export class ErrorUtils {
    /**
     * 安全地执行函数
     * @param {Function} func - 要执行的函数
     * @param {any} defaultValue - 错误时的默认值
     * @returns {any} 函数结果或默认值
     */
    public static safeExecute<T>(func: () => T, defaultValue: T): T {
        try {
            return func();
        } catch (error) {
            console.error('SafeExecute failed:', error);
            return defaultValue;
        }
    }

    /**
     * 创建标准错误对象
     * @param {string} code - 错误代码
     * @param {string} message - 错误消息
     * @param {any} details - 错误详情
     * @returns {object} 标准错误对象
     */
    public static createError(code: string, message: string, details?: any) {
        return {
            code,
            message,
            details,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 错误重试机制
     * @param {Function} func - 要重试的函数
     * @param {number} maxRetries - 最大重试次数
     * @param {number} delay - 重试间隔
     * @returns {Promise} Promise
     */
    public static async retry<T>(
        func: () => Promise<T>,
        maxRetries: number = 3,
        delay: number = 1000
    ): Promise<T> {
        let lastError: Error;

        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await func();
            } catch (error) {
                lastError = error as Error;
                if (i < maxRetries) {
                    await TimeUtils.delay(delay * Math.pow(2, i)); // 指数退避
                }
            }
        }

        throw lastError!;
    }
}

/**
 * 控制台工具类
 */
export class ConsoleUtils {
    /**
     * 带时间戳的日志输出
     * @param {string} message - 消息
     * @param {any} data - 数据
     */
    public static logWithTime(message: string, data?: any): void {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${message}`, data || '');
    }

    /**
     * 条件日志
     * @param {boolean} condition - 条件
     * @param {string} message - 消息
     * @param {any} data - 数据
     */
    public static logIf(condition: boolean, message: string, data?: any): void {
        if (condition) {
            console.log(message, data || '');
        }
    }

    /**
     * 性能计时器
     * @param {string} label - 标签
     * @returns {Function} 结束计时函数
     */
    public static timer(label: string): () => void {
        const start = performance.now();
        return () => {
            const end = performance.now();
            console.log(`${label}: ${(end - start).toFixed(2)}ms`);
        };
    }
}

/**
 * 类型验证工具类
 */
export class TypeUtils {
    /**
     * 检查是否为有效的对象
     * @param {any} value - 值
     * @returns {boolean}
     */
    public static isValidObject(value: any): value is Record<string, any> {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    /**
     * 检查是否为有效的数组
     * @param {any} value - 值
     * @returns {boolean}
     */
    public static isValidArray(value: any): value is any[] {
        return Array.isArray(value);
    }

    /**
     * 检查是否为有效的字符串
     * @param {any} value - 值
     * @returns {boolean}
     */
    public static isValidString(value: any): value is string {
        return typeof value === 'string' && value.length > 0;
    }

    /**
     * 检查是否为有效的数字
     * @param {any} value - 值
     * @returns {boolean}
     */
    public static isValidNumber(value: any): value is number {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    }
}

// 导出所有工具类
// 工具类已在前面导出，无需重复导出

/**
 * 便捷的全局工具函数
 */
export const utils = {
    obj: ObjectUtils,
    arr: ArrayUtils,
    str: StringUtils,
    time: TimeUtils,
    error: ErrorUtils,
    log: ConsoleUtils,
    type: TypeUtils
};