/**
 * 全局类型定义和环境声明
 *
 * 这个文件为TypeScript提供全局环境声明，使现有JavaScript代码
 * 能够与TypeScript类型系统兼容
 */

// ==================== DOM环境扩展 ====================

declare global {
  // 扩展Window接口，添加项目特定的全局变量
  interface Window {
    // 已存在的全局变量
    xiangqiGame?: XiangqiGame;
    XiangqiGame?: typeof XiangqiGame;

    // 音频上下文
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;

    // 其他的全局变量声明
    // 根据实际使用情况添加
  }

  // 扩展Document接口，如果需要
  interface Document {
    // 如果有特殊的DOM操作需要声明，在这里添加
  }
}

// ==================== 模块声明 ====================

// 声明模块，用于非TypeScript文件
declare module "*.json" {
  const value: unknown;
  export default value;
}

declare module "*.css" {
  const content: string;
  export default content;
}

// ==================== 类型别名 ====================

// 为常用类型创建别名，简化使用
type GlobalXiangqiGame = InstanceType<typeof XiangqiGame>;

// ==================== 导出 ====================

export {}; // 确保这是一个模块文件