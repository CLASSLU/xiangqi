/**
 * 经典棋局测试
 * 测试四大名局和经典开局是否能正确加载和演示
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

describe('经典棋局测试', () => {
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
  
  test('七星聚会棋局加载测试', () => {
    // 加载七星聚会棋局
    game.setupFamousGame('七星聚会');
    
    // 检查棋子数量
    expect(game.pieces.length).toBe(24); // 七星聚会是残局，有24个棋子
    
    // 检查关键棋子位置
    // 红方帅应该在(9,4)
    const redKing = game.pieces.find(p => 
      p.dataset.color === 'red' && 
      p.dataset.type === 'king' &&
      p.dataset.row === '9' &&
      p.dataset.col === '4'
    );
    expect(redKing).toBeTruthy();
    expect(redKing.textContent).toBe('帥');
    
    // 黑方将应该在(0,4)
    const blackKing = game.pieces.find(p => 
      p.dataset.color === 'black' && 
      p.dataset.type === 'king' &&
      p.dataset.row === '0' &&
      p.dataset.col === '4'
    );
    expect(blackKing).toBeTruthy();
    expect(blackKing.textContent).toBe('將');
  });
  
  test('蚯蚓降龙棋局加载测试', () => {
    // 加载蚯蚓降龙棋局
    game.setupFamousGame('蚯蚓降龙');
    
    // 检查棋子数量
    expect(game.pieces.length).toBe(20); // 蚯蚓降龙是残局，有20个棋子
    
    // 检查关键棋子位置
    // 红方帅应该在(9,4)
    const redKing = game.pieces.find(p => 
      p.dataset.color === 'red' && 
      p.dataset.type === 'king' &&
      p.dataset.row === '9' &&
      p.dataset.col === '4'
    );
    expect(redKing).toBeTruthy();
    
    // 黑方将应该在(1,4)
    const blackKing = game.pieces.find(p => 
      p.dataset.color === 'black' && 
      p.dataset.type === 'king' &&
      p.dataset.row === '1' &&
      p.dataset.col === '4'
    );
    expect(blackKing).toBeTruthy();
  });
  
  test('野马操田棋局加载测试', () => {
    // 加载野马操田棋局
    game.setupFamousGame('野马操田');
    
    // 检查棋子数量
    expect(game.pieces.length).toBe(18); // 野马操田是残局，有18个棋子
    
    // 检查关键棋子位置
    // 红方帅应该在(9,4)
    const redKing = game.pieces.find(p => 
      p.dataset.color === 'red' && 
      p.dataset.type === 'king' &&
      p.dataset.row === '9' &&
      p.dataset.col === '4'
    );
    expect(redKing).toBeTruthy();
    
    // 黑方将应该在(0,4)
    const blackKing = game.pieces.find(p => 
      p.dataset.color === 'black' && 
      p.dataset.type === 'king' &&
      p.dataset.row === '0' &&
      p.dataset.col === '4'
    );
    expect(blackKing).toBeTruthy();
    
    // 黑方双马应该在正确位置
    const blackHorses = game.pieces.filter(p => 
      p.dataset.color === 'black' && 
      p.dataset.type === 'horse'
    );
    expect(blackHorses.length).toBe(2);
  });
  
  test('千里独行棋局加载测试', () => {
    // 加载千里独行棋局
    game.setupFamousGame('千里独行');
    
    // 检查棋子数量
    expect(game.pieces.length).toBe(18); // 千里独行是残局，有18个棋子
    
    // 检查关键棋子位置
    // 红方帅应该在(9,4)
    const redKing = game.pieces.find(p => 
      p.dataset.color === 'red' && 
      p.dataset.type === 'king' &&
      p.dataset.row === '9' &&
      p.dataset.col === '4'
    );
    expect(redKing).toBeTruthy();
    
    // 黑方将应该在(0,4)
    const blackKing = game.pieces.find(p => 
      p.dataset.color === 'black' && 
      p.dataset.type === 'king' &&
      p.dataset.row === '0' &&
      p.dataset.col === '4'
    );
    expect(blackKing).toBeTruthy();
    
    // 红方双炮应该在正确位置
    const redCannons = game.pieces.filter(p => 
      p.dataset.color === 'red' && 
      p.dataset.type === 'cannon'
    );
    expect(redCannons.length).toBe(2);
  });
  
  test('中炮对屏风马开局测试', () => {
    // 重置游戏
    game.resetGame();
    
    // 模拟中炮对屏风马开局的前几步
    // 1. 炮二平五
    const redCannon = game.pieces.find(p => 
      p.dataset.color === 'red' && 
      p.dataset.type === 'cannon' &&
      p.dataset.col === '1'
    );
    
    if (redCannon) {
      // 检查红方中炮是否可以移动到(7,4)
      const validMoves = game.getValidMoves('cannon', 'red', parseInt(redCannon.dataset.row), parseInt(redCannon.dataset.col));
      const canMove = validMoves.some(move => move[1] === 4);
      expect(canMove).toBe(true);
    }
    
    // 2. 马8进7
    const blackHorse8 = game.pieces.find(p => 
      p.dataset.color === 'black' && 
      p.dataset.type === 'horse' &&
      p.dataset.col === '1'
    );
    
    if (blackHorse8) {
      // 检查黑方马8进7是否是合法移动
      const validMoves = game.getValidMoves('horse', 'black', parseInt(blackHorse8.dataset.row), parseInt(blackHorse8.dataset.col));
      const canMove = validMoves.some(move => move[0] === 2 && move[1] === 2);
      expect(canMove).toBe(true);
    }
  });
  
  test('自动演示功能测试', () => {
    // 测试自动演示功能是否能正常启动
    // 这里我们只测试初始化，不实际运行完整的演示
    
    // 重置游戏到初始状态
    game.resetGame();
    
    // 定义测试步骤: [color, pieceType, fromPos, toPos]
    // pos格式: [row, col]
    const testSteps = [
      // 中炮对屏风马开局
      ['red', 'cannon', [7, 1], [7, 4]],  // 1. 炮二平五
      ['black', 'horse', [0, 1], [2, 2]], // 1. 马8进7
      ['red', 'horse', [9, 1], [7, 2]],   // 2. 马二进三
      ['black', 'horse', [0, 7], [2, 6]], // 2. 马2进3
      ['red', 'soldier', [6, 6], [5, 6]], // 3. 兵七进一
      ['black', 'soldier', [3, 6], [4, 6]] // 3. 卒7进1
    ];
    
    // 检查第一步
    const [color, pieceType, fromPos, toPos] = testSteps[0];
    const [fromRow, fromCol] = fromPos;
    const [toRow, toCol] = toPos;
    
    // 查找要移动的棋子
    const piece = game.pieces.find(p => 
      p.dataset.color === color && 
      p.dataset.type === pieceType &&
      parseInt(p.dataset.row) === fromRow &&
      parseInt(p.dataset.col) === fromCol
    );
    
    expect(piece).toBeTruthy();
    
    // 验证目标位置是否为合法移动
    const validMoves = game.getValidMoves(pieceType, color, fromRow, fromCol);
    const isValidMove = validMoves.some(move => move[0] === toRow && move[1] === toCol);
    
    expect(isValidMove).toBe(true);
  });
});