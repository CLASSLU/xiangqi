---
status: pending
priority: p2
issue_id: "045"
tags: [code-review, security, error-handling, logging]
dependencies: []
---

# 错误信息泄露修复 - 生产环境日志脱敏

## 问题陈述

在 `utils.js` 的错误处理函数中，存在错误信息泄露风险。当前的 `createErrorHandler` 函数会在控制台输出详细的错误信息，这在生产环境中可能暴露内部系统状态、文件路径、堆栈跟踪等敏感信息。

## 发现细节

- **发现位置**: `main/utils.js` 第138行
- **发现来源**: compounding-engineering:security-sentinel 代理分析
- **风险评级**: 🟡 P2 - 中等安全风险

### 具体风险代码

```javascript
// utils.js:131-143
export const createErrorHandler = (context) => {
    return (error, fallback = null) => {
        console.error(`[${context}] 错误:`, error);  // 风险点
        if (fallback && typeof fallback === 'function') {
            return fallback();
        }
        return null;
    };
};
```

### 风险场景分析

#### 1. 信息泄露类型
- **堆栈跟踪**: 可能暴露代码结构和文件路径
- **错误对象**: 可能包含内部状态信息
- **上下文信息**: 暴露函数调用链

#### 2. 潜在影响
- **安全信息**: 攻击者可能了解系统内部结构
- **业务逻辑**: 可能暴露数据处理流程
- **调试信息**: 帮助攻击者找到攻击点

#### 3. 风险评估
- **当前环境**: 开发环境风险较低
- **生产环境**: 中等风险
- **用户环境**: 可能被恶意用户利用

## 提议的解决方案

### 选项1: 环境感知的错误处理（推荐）

**实施策略**:
1. 添加环境检测机制
2. 生产环境只输出错误类型和消息
3. 开发环境保持详细日志
4. 可配置的日志级别

**优势**:
- 平衡调试需求和安全要求
- 不影响开发调试效率
- 符合生产环境最佳实践

**劣势**:
- 需要增加环境检测逻辑
- 维护两套日志格式

**工作量**: Small
**风险**: Low

### 选项2: 统一错误脱敏

**实施策略**:
1. 统一简化所有错误输出
2. 只保留错误类型和基本消息
3. 移除详细的堆栈跟踪

**优势**:
- 实现简单，统一标准
- 彻底消除信息泄露

**劣势**:
- 影响开发调试效率
- 可能丢失有用的调试信息

**工作量**: Small
**风险**: Low

## 推荐行动

采用**选项1**，实施环境感知的错误处理，在保持开发效率的同时确保生产安全。

## 技术实施细节

### 环境感知错误处理函数

```javascript
// utils.js 中的改进实现
export const isProduction = () => {
    return process?.env?.NODE_ENV === 'production' ||
           window?.location?.hostname !== 'localhost' &&
           window?.location?.hostname !== '127.0.0.1';
};

export const createErrorHandler = (context, enableVerboseLogs = !isProduction()) => {
    return (error, fallback = null) => {
        if (enableVerboseLogs) {
            // 开发环境：详细错误信息
            console.error(`[${context}] 错误:`, error);
            if (error.stack) {
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

export const sanitizeErrorMessage = (error) => {
    if (!error) return '未知错误';

    // 只保留错误类型和基本消息
    if (typeof error === 'string') {
        return error.substring(0, 200); // 限制长度
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
```

### 使用示例

```javascript
// 开发环境 - 详细日志
const gameErrorHandler = createErrorHandler('GameModule');
// 输出: [GameModule] 错误: TypeError: Cannot read property 'x' of undefined { stack: "..." }

// 生产环境 - 脱敏日志
const productionErrorHandler = createErrorHandler('GameModule', false);
// 输出: [GameModule] 错误: { type: "TypeError", message: "Cannot read property..." }
```

### 配置化日志级别

```javascript
// 添加日志级别控制
export const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

export const getCurrentLogLevel = () => {
    if (isProduction()) return LOG_LEVELS.ERROR;
    return LOG_LEVELS.DEBUG; // 开发环境显示所有日志
};

export const safeLog = (level, context, message, data) => {
    if (level <= getCurrentLogLevel()) {
        const sanitizedData = isProduction() ? sanitizeErrorMessage(data) : data;
        console.log(`[${context}] ${message}:`, sanitizedData);
    }
};
```

## 实施计划

### 第一阶段：实现环境检测（1小时）
1. 添加 `isProduction()` 函数
2. 添加 `sanitizeErrorMessage()` 函数
3. 更新 `createErrorHandler()` 函数

### 第二阶段：更新错误调用（2小时）
1. 检查所有 `createErrorHandler` 的使用
2. 根据需要调整日志详细程度
3. 添加错误类型分类

### 第三阶段：测试验证（1小时）
1. 测试开发环境日志输出
2. 测试生产环境日志脱敏
3. 验证错误处理功能正常

## 受影响的文件

- `main/utils.js` - 主要修改文件
- `main/chess.js` - 可能需要更新错误处理调用
- `test/tests/` - 需要更新测试用例
- 其他使用错误处理的模块

## 相关组件

- 错误处理模块
- 日志记录系统
- 调试工具

## 数据库更改

无

## 资源

- **代码审查来源**: compounding-engineering:security-sentinel
- **安全参考**: OWASP错误处理最佳实践
- **相关发现**:
  - 043 DOM安全漏洞
  - 044 过度工程化重构

## 验收标准

- [ ] 生产环境错误信息已脱敏
- [ ] 开发环境保持详细调试信息
- [ ] 所有错误处理功能正常
- [ ] 通过所有214个测试用例
- [ ] 性能无明显影响（<1%开销）
- [ ] 日志输出格式统一规范

## 工作日志

### 2024-10-11 - 信息泄露发现
**执行者**: Claude Code Review System
**操作**:
- security-sentinel 代理识别出错误信息泄露风险
- 分析了生产环境vs开发环境的日志需求差异
- 评估为P2优先级安全问题

**技术决策**:
- 选择环境感知方案而非一刀切
- 保持开发效率的同时确保生产安全
- 设计可配置的日志级别系统

**安全考量**:
- 生产环境不暴露内部堆栈信息
- 错误消息长度限制
- 错误对象结构标准化

## 注意事项

**关键考虑**:
- 确保不影响现有错误处理逻辑
- 保持调试信息的可用性
- 建立清晰的日志记录标准

**风险缓解**:
- 分阶段实施，确保功能稳定
- 充分测试各种错误场景
- 建立日志审查流程

**后续改进**:
- 考虑添加远程日志收集
- 实现错误监控和告警
- 建立错误统计和分析

**来源**: 全面代码审查系统
**审查命令**: /compounding-engineering:review
**审查日期**: 2024-10-11