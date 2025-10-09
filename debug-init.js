// 游戏初始化调试
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<body>
    <div class="board"></div>
    <div class="status"></div>
</body>
</html>
`);

global.document = dom.window.document;
global.window = dom.window;

const { XiangqiGame } = require('./main/chess.js');

console.log('=== 调试游戏初始化 ===\n');

// 创建游戏实例
const game = new XiangqiGame();
console.log('✅ 游戏实例化成功');

// 检查游戏状态
console.log('游戏属性:', {
  pieces: game.pieces,
  piecesLength: game.pieces?.length,
  boardRenderer: !!game.boardRenderer,
  pieceManager: !!game.pieceManager,
  pieceLogic: !!game.pieceLogic
});

// 调用setupPieces
game.setupPieces();
console.log('✅ setupPieces调用完成');

// 再次检查游戏状态
console.log('setupPieces后游戏属性:', {
  pieces: game.pieces,
  piecesLength: game.pieces?.length,
  boardRendererPieces: game.boardRenderer?.pieces,
  pieceManagerPieces: game.pieceManager?.pieces?.length,
  pieceLogicPieces: game.pieceLogic?.pieces?.length
});

// 检查DOM
const pieces = document.querySelectorAll('.piece');
console.log(`✅ DOM棋子数量: ${pieces.length}`);

console.log('\n🎯 问题诊断:');
if (game.pieces.length === 0) {
  console.log('❌ game.pieces为空 - setPieces调用可能有问题');

  // 检查setPieces是否工作
  const testPieces = [{ type: 'king', color: 'red', row: 0, col: 0, char: '帥' }];
  game.setPieces(testPieces);
  console.log('测试setPieces后:', {
    pieces: game.pieces,
    pieceManagerPieces: game.pieceManager?.pieces?.length,
    pieceLogicPieces: game.pieceLogic?.pieces?.length
  });
} else {
  console.log('✅ game.pieces已正确设置');
}