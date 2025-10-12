/**
 * 吃子和将军检测测试
 * 测试吃子功能和将军检测是否正确实现
 */

// 模拟DOM环境
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

// 创建虚拟DOM环境
const dom = new JSDOM(`<!DOCTYPE html><html><body><div class="board"></div><div id="currentPlayer"></div><div id="gameStatus"></div><div class="red-captured"></div><div class="black-captured"></div></body></html>`);
global.document = dom.window.document;
global.window = dom.window;

// 导入游戏类
const { MockXiangqiGame } = require("../mock-xiangqi-game");

describe('吃子和将军检测测试', () => {
  let game;
  
  beforeEach(() => {
    // 创建游戏实例
    game = new MockXiangqiGame();
  });
  
  afterEach(() => {
    // 清理
    if (game && game.board) {
      game.board.innerHTML = '';
    }
  });
  
  test('吃子功能测试', () => {
    // 创建一个简单的测试场景
    // 清空棋盘
    game.pieces.forEach(piece => {
      if (piece.parentNode) piece.parentNode.removeChild(piece);
    });
    game.pieces = [];
    game.capturedRed = [];
    game.capturedBlack = [];
    
    // 放置一个红方车
    const redRookData = { type: 'rook', color: 'red', row: 5, col: 4, char: '車' };
    const redRook = game.createPiece(redRookData);
    game.pieces.push(redRook);
    
    // 放置一个黑方卒作为目标
    const blackSoldierData = { type: 'soldier', color: 'black', row: 5, col: 6, char: '卒' };
    const blackSoldier = game.createPiece(blackSoldierData);
    game.pieces.push(blackSoldier);
    
    // 模拟吃子过程
    const capturedPiece = game.getPieceAt(5, 6);
    expect(capturedPiece).toBeTruthy();
    expect(capturedPiece.dataset.color).toBe('black');
    
    // 执行吃子
    game.capturePiece(capturedPiece);
    
    // 检查被吃的棋子是否已移除
    expect(game.pieces).not.toContain(blackSoldier);
    expect(game.capturedBlack).toContain('卒');
  });
  
  test('将军检测测试', () => {
    // 创建一个将军的测试场景
    // 清空棋盘
    game.pieces.forEach(piece => {
      if (piece.parentNode) piece.parentNode.removeChild(piece);
    });
    game.pieces = [];
    game.capturedRed = [];
    game.capturedBlack = [];
    game.gameOver = false;
    
    // 放置红方帅
    const redKingData = { type: 'king', color: 'red', row: 9, col: 4, char: '帥' };
    const redKing = game.createPiece(redKingData);
    game.pieces.push(redKing);
    
    // 放置黑方将
    const blackKingData = { type: 'king', color: 'black', row: 0, col: 4, char: '將' };
    const blackKing = game.createPiece(blackKingData);
    game.pieces.push(blackKing);
    
    // 检查将帅是否照面（中间无棋子）
    const isFacing = game.isKingFacing();
    expect(isFacing).toBe(true);
    
    // 在两将之间放置一个棋子
    const blockerData = { type: 'advisor', color: 'red', row: 4, col: 4, char: '仕' };
    const blocker = game.createPiece(blockerData);
    game.pieces.push(blocker);
    
    // 再次检查将帅是否照面
    const isFacingAfter = game.isKingFacing();
    expect(isFacingAfter).toBe(false);
  });
  
  test('游戏结束检测测试', () => {
    // 创建一个游戏结束的测试场景
    // 清空棋盘
    game.pieces.forEach(piece => {
      if (piece.parentNode) piece.parentNode.removeChild(piece);
    });
    game.pieces = [];
    game.capturedRed = [];
    game.capturedBlack = [];
    game.gameOver = false;
    
    // 只放置一个红方帅
    const redKingData = { type: 'king', color: 'red', row: 9, col: 4, char: '帥' };
    const redKing = game.createPiece(redKingData);
    game.pieces.push(redKing);
    
    // 检查游戏是否结束（黑方胜利）
    game.checkGameOver();
    expect(game.gameOver).toBe(true);
    
    // 重置游戏状态
    game.gameOver = false;

    // 清空棋盘放置黑方将
    game.pieces.forEach(piece => {
      if (piece.parentNode) piece.parentNode.removeChild(piece);
    });
    game.pieces = [];
    
    const blackKingData = { type: 'king', color: 'black', row: 0, col: 4, char: '將' };
    const blackKing = game.createPiece(blackKingData);
    game.pieces.push(blackKing);
    
    // 检查游戏是否结束（红方胜利）
    game.checkGameOver();
    expect(game.gameOver).toBe(true);
  });
  
  test('移动后将军检测测试', () => {
    // 创建一个移动后形成将军的测试场景
    // 清空棋盘
    game.pieces.forEach(piece => {
      if (piece.parentNode) piece.parentNode.removeChild(piece);
    });
    game.pieces = [];
    game.capturedRed = [];
    game.capturedBlack = [];
    game.gameOver = false;
    
    // 放置红方帅
    const redKingData = { type: 'king', color: 'red', row: 9, col: 4, char: '帥' };
    const redKing = game.createPiece(redKingData);
    game.pieces.push(redKing);
    
    // 放置黑方将
    const blackKingData = { type: 'king', color: 'black', row: 0, col: 4, char: '將' };
    const blackKing = game.createPiece(blackKingData);
    game.pieces.push(blackKing);
    
    // 放置红方车，可以将军
    const redRookData = { type: 'rook', color: 'red', row: 0, col: 0, char: '車' };
    const redRook = game.createPiece(redRookData);
    game.pieces.push(redRook);
    
    // 模拟移动红车到可以将军的位置
    redRook.dataset.row = '0';
    redRook.dataset.col = '4';
    redRook.style.left = 4 * 70 + 'px';
    redRook.style.top = 0 * 70 + 'px';
    
    // 检查是否形成将军（将帅照面）
    const isFacing = game.isKingFacing();
    expect(isFacing).toBe(true);
  });
});