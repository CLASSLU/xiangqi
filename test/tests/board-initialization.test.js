/**
 * 棋盘和棋子初始化测试
 * 测试棋盘是否正确生成，棋子是否正确放置
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

describe('棋盘和棋子初始化测试', () => {
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
  
  test('应该正确初始化32个棋子', () => {
    expect(game.pieces.length).toBe(32);
  });
  
  test('应该正确放置红方棋子', () => {
    // 检查红方帅的位置
    const redKing = game.pieces.find(p => 
      p.dataset.color === 'red' && 
      p.dataset.type === 'king' &&
      p.dataset.row === '9' &&
      p.dataset.col === '4'
    );
    expect(redKing).toBeTruthy();
    expect(redKing.textContent).toBe('帥');
    
    // 检查红方车的位置
    const redRooks = game.pieces.filter(p => 
      p.dataset.color === 'red' && 
      p.dataset.type === 'rook'
    );
    expect(redRooks.length).toBe(2);
    expect(redRooks[0].dataset.row).toBe('9');
    expect(redRooks[0].dataset.col).toBe('0'); // 左车
    expect(redRooks[1].dataset.row).toBe('9');
    expect(redRooks[1].dataset.col).toBe('8'); // 右车
  });
  
  test('应该正确放置黑方棋子', () => {
    // 检查黑方将的位置
    const blackKing = game.pieces.find(p => 
      p.dataset.color === 'black' && 
      p.dataset.type === 'king' &&
      p.dataset.row === '0' &&
      p.dataset.col === '4'
    );
    expect(blackKing).toBeTruthy();
    expect(blackKing.textContent).toBe('將');
    
    // 检查黑方车的位置
    const blackRooks = game.pieces.filter(p => 
      p.dataset.color === 'black' && 
      p.dataset.type === 'rook'
    );
    expect(blackRooks.length).toBe(2);
    expect(blackRooks[0].dataset.row).toBe('0');
    expect(blackRooks[0].dataset.col).toBe('0'); // 左车
    expect(blackRooks[1].dataset.row).toBe('0');
    expect(blackRooks[1].dataset.col).toBe('8'); // 右车
  });
  
  test('棋子应该具有正确的数据属性', () => {
    game.pieces.forEach(piece => {
      // 检查必需的数据属性
      expect(piece.dataset.type).toBeTruthy();
      expect(piece.dataset.color).toBeTruthy();
      expect(piece.dataset.row).toBeTruthy();
      expect(piece.dataset.col).toBeTruthy();
      
      // 检查类型是否有效
      const validTypes = ['king', 'advisor', 'elephant', 'rook', 'cannon', 'horse', 'soldier'];
      expect(validTypes).toContain(piece.dataset.type);
      
      // 检查颜色是否有效
      expect(['red', 'black']).toContain(piece.dataset.color);
    });
  });
});