/**
 * 棋子移动规则测试
 * 测试各种棋子的移动规则是否正确实现
 */

// 模拟DOM环境
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

// 创建虚拟DOM环境
const dom = new JSDOM(`<!DOCTYPE html><html><body><div class="board"></div><div id="currentPlayer"></div><div id="gameStatus"></div><div class="red-captured"></div><div class="black-captured"></div></body></html>`);
global.document = dom.window.document;
global.window = dom.window;

// 导入游戏类
const { XiangqiGame } = require('../../main/chess.js');

describe('棋子移动规则测试', () => {
  let game;
  
  beforeEach(() => {
    // 创建游戏实例
    game = new XiangqiGame();
  });
  
  afterEach(() => {
    // 清理
    if (game && game.board) {
      game.board.innerHTML = '';
    }
  });
  
  test('帅/将的移动规则测试', () => {
    // 测试红方帅的移动
    // 帅在(9,4)位置
    let moves = game.getValidMoves('king', 'red', 9, 4);
    // 帅可以向上、下、左、右移动一格，但不能离开九宫格
    expect(moves).toContainEqual([8, 4]); // 上
    expect(moves).toContainEqual([9, 3]); // 左
    expect(moves).toContainEqual([9, 5]); // 右
    // 不能向下移动（会被吃掉）
    expect(moves).not.toContainEqual([10, 4]);
    
    // 测试黑方将的移动
    // 将在(0,4)位置
    moves = game.getValidMoves('king', 'black', 0, 4);
    expect(moves).toContainEqual([1, 4]); // 下
    expect(moves).toContainEqual([0, 3]); // 左
    expect(moves).toContainEqual([0, 5]); // 右
    // 不能向上移动（会被吃掉）
    expect(moves).not.toContainEqual([-1, 4]);
  });
  
  test('士/仕的移动规则测试', () => {
    // 测试红方仕的移动
    // 仕在(9,3)和(9,5)位置
    let moves = game.getValidMoves('advisor', 'red', 9, 3);
    // 仕只能斜着走一格，且不能离开九宫格
    expect(moves).toContainEqual([8, 4]); // 左上
    // 不能向左下移动（会离开九宫格）
    expect(moves).not.toContainEqual([10, 2]);
    
    moves = game.getValidMoves('advisor', 'red', 9, 5);
    expect(moves).toContainEqual([8, 4]); // 右上
    // 不能向右下移动（会离开九宫格）
    expect(moves).not.toContainEqual([10, 6]);
  });
  
  test('象/相的移动规则测试', () => {
    // 测试红方相的移动
    // 相在(9,2)和(9,6)位置
    let moves = game.getValidMoves('elephant', 'red', 9, 2);
    // 相走田字，不能过河，不能蹩象腿
    // 初始状态下，相不能移动（没过河且可能蹩象腿）
    expect(moves.length).toBe(0);
    
    // 测试黑方象的移动
    // 象在(0,2)和(0,6)位置
    moves = game.getValidMoves('elephant', 'black', 0, 2);
    // 初始状态下，象不能移动（没过河且可能蹩象腿）
    expect(moves.length).toBe(0);
  });
  
  test('马的移动规则测试', () => {
    // 测试红方马的移动
    // 马在(9,1)和(9,7)位置
    let moves = game.getValidMoves('horse', 'red', 9, 1);
    // 马走日字，不能蹩马腿
    // 初始状态下，红方马可以向下走
    expect(moves).toContainEqual([7, 0]); // 向左下日字
    expect(moves).toContainEqual([7, 2]); // 向右下日字
    // 不能向上移动（会被棋盘边界阻挡）
    
    moves = game.getValidMoves('horse', 'red', 9, 7);
    expect(moves).toContainEqual([7, 6]); // 向左下日字
    expect(moves).toContainEqual([7, 8]); // 向右下日字
  });
  
  test('车的移动规则测试', () => {
    // 测试红方车的移动
    // 车在(9,0)和(9,8)位置
    // 初始状态下，车不能移动（被其他棋子阻挡）
    let moves = game.getValidMoves('rook', 'red', 9, 0);
    expect(moves.length).toBe(0);
    
    // 创建一个空的测试场景来验证车的移动规则
    // 清空棋盘
    game.pieces.forEach(piece => {
      if (piece.remove) piece.remove();
    });
    game.pieces = [];
    
    // 放置一个车在中心位置
    const rookData = { type: 'rook', color: 'red', row: 5, col: 4, char: '車' };
    const rook = game.createPiece(rookData);
    game.pieces.push(rook);
    
    // 车应该能纵向和横向移动
    moves = game.getValidMoves('rook', 'red', 5, 4);
    // 纵向移动
    expect(moves).toContainEqual([4, 4]); // 上
    expect(moves).toContainEqual([6, 4]); // 下
    expect(moves).toContainEqual([3, 4]); // 上两格
    expect(moves).toContainEqual([7, 4]); // 下两格
    // 横向移动
    expect(moves).toContainEqual([5, 3]); // 左
    expect(moves).toContainEqual([5, 5]); // 右
    expect(moves).toContainEqual([5, 2]); // 左两格
    expect(moves).toContainEqual([5, 6]); // 右两格
  });
  
  test('炮的移动规则测试', () => {
    // 测试红方炮的移动
    // 炮在(7,1)和(7,7)位置
    // 初始状态下，炮不能移动（被其他棋子阻挡）
    let moves = game.getValidMoves('cannon', 'red', 7, 1);
    expect(moves.length).toBe(0);
    
    // 创建一个空的测试场景来验证炮的移动规则
    // 清空棋盘
    game.pieces.forEach(piece => {
      if (piece.remove) piece.remove();
    });
    game.pieces = [];
    
    // 放置一个炮在中心位置
    const cannonData = { type: 'cannon', color: 'red', row: 5, col: 4, char: '炮' };
    const cannon = game.createPiece(cannonData);
    game.pieces.push(cannon);
    
    // 放置一个棋子作为炮架
    const blockerData = { type: 'soldier', color: 'black', row: 5, col: 6, char: '卒' };
    const blocker = game.createPiece(blockerData);
    game.pieces.push(blocker);
    
    // 放置一个目标棋子
    const targetData = { type: 'soldier', color: 'black', row: 5, col: 8, char: '卒' };
    const target = game.createPiece(targetData);
    game.pieces.push(target);
    
    // 炮应该能移动和吃子
    moves = game.getValidMoves('cannon', 'red', 5, 4);
    // 移动（不吃子）
    expect(moves).toContainEqual([5, 3]); // 左
    expect(moves).toContainEqual([5, 2]); // 左两格
    expect(moves).toContainEqual([5, 1]); // 左三格
    // 吃子（需要跳吃）
    expect(moves).toContainEqual([5, 8]); // 右边隔一个棋子吃掉目标
  });
  
  test('兵/卒的移动规则测试', () => {
    // 测试红方兵的移动
    // 兵在(6,0)、(6,2)、(6,4)、(6,6)、(6,8)位置
    // 过河前只能向前移动
    let moves = game.getValidMoves('soldier', 'red', 6, 0);
    expect(moves).toContainEqual([5, 0]); // 向前
    // 不能向左或向右移动（未过河）
    expect(moves).not.toContainEqual([6, 1]);
    
    // 测试黑方卒的移动
    // 卒在(3,0)、(3,2)、(3,4)、(3,6)、(3,8)位置
    // 过河前只能向前移动
    moves = game.getValidMoves('soldier', 'black', 3, 0);
    expect(moves).toContainEqual([4, 0]); // 向前
    // 不能向左或向右移动（未过河）
    expect(moves).not.toContainEqual([3, 1]);
  });
});