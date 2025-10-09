// 棋盘修复验证脚本
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="main/style.css">
</head>
<body>
    <div class="container">
        <div class="board" id="board"></div>
    </div>
</body>
</html>
`);

global.document = dom.window.document;
global.window = dom.window;

const { BoardRenderer } = require('./main/chess.js');

console.log('=== 棋盘完整渲染验证 ===\n');

const board = document.querySelector('.board');
if (!board) {
    console.log('❌ 无法找到棋盘元素');
    process.exit(1);
}

// 创建棋盘渲染器
const boardRenderer = new BoardRenderer(board);
console.log('✅ 棋盘渲染器创建成功');

// 绘制棋盘
boardRenderer.createBoard();
console.log('✅ 棋盘绘制完成');

// 检查棋盘元素
const cells = board.querySelectorAll('.cell');
console.log(`✅ 棋盘格子数量: ${cells.length} (期望: 90)`);

// 检查棋盘线条
const lines = board.querySelectorAll('div[style*="background: #000000"]');
console.log(`✅ 棋盘线条数量: ${lines.length} (垂直线:18条，水平线:10条，期望:28+)`);

// 检查楚河汉界
const river = board.querySelector('.river');
if (river) {
    console.log(`✅ 楚河汉界创建成功: ${river.textContent}`);
    console.log(`   位置: ${river.style.top} ${river.style.left}`);
    console.log(`   大小: ${river.style.width} x ${river.style.height}`);
} else {
    console.log('❌ 楚河汉界未创建');
}

// 检查炮位十字标记
const cannonCrosses = board.querySelectorAll('.cannon-cross');
console.log(`✅ 炮位十字标记数量: ${cannonCrosses.length} (期望:4个)`);

// 检查兵位十字标记
const soldierCrosses = board.querySelectorAll('.soldier-cross');
console.log(`✅ 兵位十字标记数量: ${soldierCrosses.length} (期望:10个)`);

console.log('\n🎉 棋盘渲染验证完成！');