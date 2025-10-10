/**
 * 中国象棋游戏常量和配置
 * @fileoverview 集中管理游戏中的常量配置
 */

// ==================== 棋盘配置 ====================
export const BOARD_CONFIG = {
    ROWS: 10,
    COLS: 9,
    CELL_SIZE: 70,
    COLORS: {
        RED: 'red',
        BLACK: 'black'
    },
    PIECE_TYPES: [
        'king', 'advisor', 'elephant', 'horse', 'rook', 'cannon', 'soldier'
    ]
};

// ==================== 棋子配置 ====================
export const PIECE_CONFIG = {
    // 棋子中文名称映射
    CHINESE_NAMES: {
        red: {
            king: '帥',
            advisor: '仕',
            elephant: '相',
            horse: '馬',
            rook: '車',
            cannon: '炮',
            soldier: '兵'
        },
        black: {
            king: '將',
            advisor: '士',
            elephant: '象',
            horse: '马',
            rook: '车',
            cannon: '砲',
            soldier: '卒'
        }
    },

    // 棋子初始位置
    INITIAL_POSITIONS: {
        red: {
            king: [9, 4], advisor: [[9, 3], [9, 5]], elephant: [[9, 2], [9, 6]],
            horse: [[9, 1], [9, 7]], rook: [[9, 0], [9, 8]],
            cannon: [[7, 1], [7, 7]], soldier: [[6, 0], [6, 2], [6, 4], [6, 6], [6, 8]]
        },
        black: {
            king: [0, 4], advisor: [[0, 3], [0, 5]], elephant: [[0, 2], [0, 6]],
            horse: [[0, 1], [0, 7]], rook: [[0, 0], [0, 8]],
            cannon: [[2, 1], [2, 7]], soldier: [[3, 0], [3, 2], [3, 4], [3, 6], [3, 8]]
        }
    }
};

// ==================== 移动规则 ====================
export const MOVE_RULES = {
    // 九宫格限制
    PALACE_BOUNDS: {
        red: { minRow: 7, maxRow: 9, minCol: 3, maxCol: 5 },
        black: { minRow: 0, maxRow: 2, minCol: 3, maxCol: 5 }
    },

    // 过河限制
    RIVER_CROSSING: {
        red: { minRow: 5 },
        black: { maxRow: 4 }
    }
};

// ==================== 游戏状态 ====================
export const GAME_PHASES = {
    PLAYING: 'playing',
    DEMONSTRATION: 'demonstration'
};

// ==================== UI配置 ====================
export const UI_CONFIG = {
    // 棋盘线条配置
    LINE_COLORS: {
        PRIMARY: '#000000',
        PALACE: '#8B4513',
        RIVER_TEXT: '#FF6B6B'
    },

    // 位置标记配置
    POSITION_MARKS: {
        CANNON: { color: '#4169E1', size: '6px' },
        SOLDIER: { color: '#228B22', size: '4px' }
    }
};

// ==================== 错误消息 ====================
export const ERROR_MESSAGES = {
    INVALID_MOVE: '非法移动！',
    INVALID_PIECE: '无效的棋子元素',
    MISSING_DATASET: '棋子元素缺少dataset属性',
    GAME_OVER: '游戏已结束',
    MUST_RESOLVE_CHECK: '必须应将！',
    KING_FACING: '将帅不能照面！',
    SUICIDE_MOVE: '禁止送将！'
};

// ==================== 成功消息 ====================
export const SUCCESS_MESSAGES = {
    CHECKMATE: (winner) => `${winner}被将死！${winner === 'red' ? '黑方' : '红方'}获胜！`,
    CHECK: (color) => `${color}方被将军！`,
    DEMO_LOADED: (title, steps) => `成功加载棋谱: ${title}，共 ${steps} 步`
};

// ==================== 验证配置 ====================
export const VALIDATION_CONFIG = {
    // 最少有效棋步数
    MIN_VALID_MOVES: 8,

    // 抽样检查数量
    SAMPLE_SIZE: 5,

    // 重建阈值
    REBUILD_THRESHOLD: 0.5
};

// ==================== 性能配置 ====================
export const PERFORMANCE_CONFIG = {
    // 缓存大小
    MOVE_CACHE_SIZE: 100,

    // 批量操作阈值
    BATCH_THRESHOLD: 10,

    // 防抖延迟（毫秒）
    DEBOUNCE_DELAY: 100
};