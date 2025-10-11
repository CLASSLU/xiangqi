/**
 * 中国象棋游戏核心类型定义
 *
 * 这个文件定义了整个游戏系统中使用的所有核心类型
 * 确保类型安全，提供智能代码提示，减少运行时错误
 */

// ==================== 基础类型定义 ====================

/**
 * 玩家颜色类型
 */
export type PlayerColor = 'red' | 'black';

/**
 * 棋子类型枚举
 */
export type PieceType =
  | '帥' | '将'  // 帅/将
  | '仕' | '士'  // 仕/士
  | '相' | '象'  // 相/象
  | '马'         // 马
  | '車' | '车'  // 車/车
  | '炮' | '砲'  // 炮/砲
  | '兵' | '卒'  // 兵/卒
  | 'king'       // 简化英文名
  | 'advisor'    // 士/仕
  | 'elephant'   // 象/相
  | 'horse'      // 马
  | 'rook'       // 车/車
  | 'cannon'     // 炮/砲
  | 'soldier'    // 兵/卒;

/**
 * 棋盘坐标位置
 */
export interface Position {
  row: number;  // 行: 0-9
  col: number;  // 列: 0-8
}

/**
 * 棋子数据结构
 */
export interface ChessPiece {
  id: string;           // 唯一标识符
  type: PieceType;      // 棋子类型
  color: PlayerColor;   // 所属玩家
  position: Position;   // 当前位置
  selected?: boolean;   // 是否被选中
  element?: HTMLElement; // DOM元素引用
}

/**
 * 移动指令
 */
export interface Move {
  color: PlayerColor;
  pieceType: PieceType;
  fromPos: Position;
  toPos: Position;
  notation: string;
  timestamp?: number;
}

// ==================== 游戏状态类型 ====================

/**
 * 游戏阶段
 */
export type GamePhase = 'setup' | 'playing' | 'demonstration' | 'ended';

/**
 * 游戏状态
 */
export interface GameState {
  currentTurn: PlayerColor;
  phase: GamePhase;
  moveHistory: Move[];
  selectedPiece: ChessPiece | null;
  possibleMoves: Position[];
  isCheck: { red: boolean; black: boolean };
  winner: PlayerColor | null;
  moveNumber: number;
}

/**
 * 验证选项
 */
export interface ValidationOptions {
  strict?: boolean;
  autoFix?: boolean;
  maxErrors?: number;
  faultTolerant?: boolean;
  preserveSequence?: boolean;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  totalMoves: number;
  validMoves: number;
  errorMoves: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  layerStatistics?: Record<string, LayerStatistics>;
  normalizedMoves?: Move[];
}

/**
 * 验证错误
 */
export interface ValidationError {
  code: string;
  message: string;
  moveIndex: number;
  layer: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  move?: Move;
}

/**
 * 验证警告
 */
export interface ValidationWarning {
  code: string;
  message: string;
  moveIndex: number;
  layer: string;
  move?: Move;
}

/**
 * 验证层统计
 */
export interface LayerStatistics {
  total: number;
  passed: number;
  errors: number;
}

// ==================== 错误恢复类型 ====================

/**
 * 错误恢复选项
 */
export interface RecoveryOptions {
  autoFix: boolean;
  faultTolerant: boolean;
  preserveSequence: boolean;
  maxRecoveryAttempts: number;
}

/**
 * 错误恢复结果
 */
export interface RecoveryResult {
  originalMoves: Move[];
  recoveredMoves: Move[];
  successfulRecoveries: RecoveryAction[];
  failedRecoveries: RecoveryAction[];
  skippedMoves: number[];
  qualityScore: number;
  recoveryReport: RecoveryReport | null;
}

/**
 * 恢复动作
 */
export interface RecoveryAction {
  success: boolean;
  originalError: ValidationError;
  moves: Move[];
  action: string;
  message: string;
  recommendation: 'continue' | 'skip';
}

/**
 * 恢复报告
 */
export interface RecoveryReport {
  summary: RecoverySummary;
  recoveries: RecoveryDetails;
  recommendations: string[];
}

/**
 * 恢复摘要
 */
export interface RecoverySummary {
  totalMoves: number;
  recoveredMoves: number;
  successRate: number;
  qualityScore: number;
}

/**
 * 恢复详情
 */
export interface RecoveryDetails {
  successful: Array<{
    action: string;
    message: string;
    errorType: string;
  }>;
  failed: Array<{
    errorType: string;
    message: string;
  }>;
}

// ==================== UI事件类型 ====================

/**
 * UI事件类型
 */
export type UIEventType =
  | 'piece-click'
  | 'board-click'
  | 'record-step-click'
  | 'control-button-click'
  | 'keyboard-input';

/**
 * UI事件数据
 */
export interface UIEvent {
  type: UIEventType;
  target: HTMLElement;
  data?: unknown;
  timestamp: number;
}

/**
 * 事件处理器类型
 */
export type EventHandler = (event: UIEvent) => void;

// ==================== 音频系统类型 ====================

/**
 * 音效类型
 */
export type SoundType =
  | 'pieceMove'
  | 'pieceCapture'
  | 'pieceSelect'
  | 'check'
  | 'victory'
  | 'error';

/**
 * 音频配置
 */
export interface AudioConfig {
  enabled: boolean;
  volume: number;
  muted: boolean;
}

// ==================== 演示系统类型 ====================

/**
 * 演示模式
 */
export type DemonstrationMode = 'auto' | 'step' | 'pause';

/**
 * 演示状态
 */
export interface DemonstrationState {
  mode: DemonstrationMode;
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  speed: number;
  autoPlay: boolean;
}

/**
 * 棋谱数据结构
 */
export interface ChessGameData {
  id: string;
  title: string;
  description?: string;
  moves: Move[];
  result?: string;
  date?: string;
  players?: {
    red: string;
    black: string;
  };
  opening?: string;
  category?: string;
  quality?: string;
}

// ==================== 配置类型 ====================

/**
 * 棋盘配置
 */
export interface BoardConfig {
  rows: number;    // 行数 (10)
  cols: number;    // 列数 (9)
  cellSize: number; // 格子大小
  showCoordinates: boolean;
  theme: string;
}

/**
 * 游戏配置
 */
export interface GameConfig {
  board: BoardConfig;
  audio: AudioConfig;
  demonstration: {
    defaultSpeed: number;
    autoStepDelay: number;
  };
  validation: ValidationOptions;
}

// ==================== 工具函数类型 ====================

/**
 * 比较函数类型
 */
export type Comparator<T> = (a: T, b: T) => number;

/**
 * 谓词函数类型
 */
export type Predicate<T> = (value: T) => boolean;

/**
 * 映射函数类型
 */
export type Mapper<T, U> = (value: T) => U;

// ==================== 错误类型 ====================

/**
 * 自定义错误基类
 */
export abstract class ChessError extends Error {
  readonly code: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly context?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    severity: ChessError['severity'] = 'medium',
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.severity = severity;
    this.context = context;
  }

  abstract getDetails (): string;
  abstract getUserMessage (): string;
}

/**
 * 验证错误类
 */
export class ValidationError extends ChessError {
  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(code, message, 'medium', context);
  }

  getDetails(): string {
    return `Validation Error [${this.code}]: ${this.message}`;
  }

  getUserMessage(): string {
    return `棋谱验证失败: ${this.message}`;
  }
}

/**
 * 移动错误类
 */
export class MoveError extends ChessError {
  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(code, message, 'high', context);
  }

  getDetails(): string {
    return `Move Error [${this.code}]: ${this.message}`;
  }

  getUserMessage(): string {
    return `无效移动: ${this.message}`;
  }
}

// ==================== 类型守卫函数 ====================

/**
 * 检查是否为有效的玩家颜色
 */
export function isValidPlayerColor(value: unknown): value is PlayerColor {
  return value === 'red' || value === 'black';
}

/**
 * 检查是否为有效的棋子类型
 */
export function isValidPieceType(value: unknown): value is PieceType {
  const validTypes: PieceType[] = [
    '帥', '将', '仕', '士', '相', '象', '马', '車', '车', '炮', '砲', '兵', '卒',
    'king', 'advisor', 'elephant', 'horse', 'rook', 'cannon', 'soldier'
  ];
  return validTypes.includes(value as PieceType);
}

/**
 * 检查是否为有效的位置
 */
export function isValidPosition(value: unknown): value is Position {
  if (typeof value !== 'object' || value === null) return false;
  const pos = value as Position;
  return (
    typeof pos.row === 'number' &&
    typeof pos.col === 'number' &&
    pos.row >= 0 && pos.row <= 9 &&
    pos.col >= 0 && pos.col <= 8
  );
}

// ==================== 导出汇总 ====================

export type {
  // 核心游戏类型
  PlayerColor,
  PieceType,
  Position,
  ChessPiece,
  Move,

  // 状态类型
  GamePhase,
  GameState,

  // 验证类型
  ValidationOptions,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  LayerStatistics,

  // 错误恢复类型
  RecoveryOptions,
  RecoveryResult,
  RecoveryAction,
  RecoveryReport,
  RecoverySummary,
  RecoveryDetails,

  // UI事件类型
  UIEventType,
  UIEvent,
  EventHandler,

  // 音频类型
  SoundType,
  AudioConfig,

  // 演示类型
  DemonstrationMode,
  DemonstrationState,
  ChessGameData,

  // 配置类型
  BoardConfig,
  GameConfig,

  // 工具类型
  Comparator,
  Predicate,
  Mapper,

  // 错误类型
  ChessError,
  ValidationError,
  MoveError
};