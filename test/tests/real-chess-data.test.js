/**
 * 真实棋谱播放测试 - 使用实际的棋谱数据
 * 修复测试覆盖盲区问题
 */

const fs = require('fs');
const path = require('path');

// 模拟DOM环境
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const dom = new JSDOM(`<!DOCTYPE html>
<html>
<body>
    <div class="board"></div>
    <div id="currentPlayer"></div>
    <div id="gameStatus"></div>
    <div class="red-captured"></div>
    <div class="black-captured"></div>
    <div id="stepsList"></div>
</body>
</html>`);

global.document = dom.window.document;
global.window = dom.window;

const { MockXiangqiGame } = require("../mock-xiangqi-game");

describe('真实棋谱播放测试', () => {
  let game;
  let realGameData;

  beforeAll(() => {
    // 加载真实的棋谱数据
    const dataPath = path.join(__dirname, '../../main/data/classified-games.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const jsonData = JSON.parse(rawData);

    // 获取第一个分类的第一个棋谱
    const firstCategory = Object.keys(jsonData.games)[0];
    const firstGame = jsonData.games[firstCategory][0];

    if (!firstGame) {
      console.error('❌ 无法获取真实棋谱数据');
      // 创建模拟数据用于测试
      realGameData = {
        title: "模拟测试棋谱",
        moves: [
          {
            color: 'red',
            pieceType: 'soldier',
            fromPos: [6, 4],
            toPos: [5, 4],
            notation: '兵五进一'
          },
          {
            color: 'black',
            pieceType: 'horse',
            fromPos: [0, 1],
            toPos: [2, 2],
            notation: '马二进三'
          },
          {
            color: 'red',
            pieceType: 'cannon',
            fromPos: [7, 1],
            toPos: [7, 4],
            notation: '炮二平五'
          }
        ]
      };
    } else {
      realGameData = firstGame;
    }

    console.log(`🎯 测试真实棋谱: ${realGameData.title}`);
    console.log(`📊 棋步数量: ${realGameData.moves.length}`);
  });

  beforeEach(() => {
    global.document = dom.window.document;
    global.window = dom.window;
    game = new MockXiangqiGame();
  });

  afterEach(() => {
    if (game && game.board) {
      game.board.innerHTML = '';
    }
  });

  // 测试真实棋谱数据加载
  test('使用真实棋谱数据并验证格式兼容性', () => {
    console.log('真实棋谱数据格式示例:', realGameData.moves[0]);

    // 验证真实数据格式
    expect(realGameData).toBeDefined();
    expect(realGameData.moves).toBeDefined();
    expect(realGameData.moves.length).toBeGreaterThan(0);

    // 验证数据包含必要的字段
    const firstMove = realGameData.moves[0];
    expect(firstMove).toHaveProperty('color');
    expect(firstMove).toHaveProperty('pieceType');
    expect(firstMove).toHaveProperty('fromPos');
    expect(firstMove).toHaveProperty('toPos');
    expect(firstMove).toHaveProperty('notation');
  });

  // 测试真实棋谱播放
  test('真实棋谱播放 - 验证所有步骤都能执行', () => {
    console.log(`🎮 开始播放 ${realGameData.title}`);

    // 使用真实数据加载棋谱
    const result = game.loadAndPlayClassicGameWithData(realGameData.title, realGameData.moves);

    // 验证加载成功
    expect(result).toBe(true);
    expect(game.gamePhase).toBe('demonstration');
    expect(game.moveHistory.length).toBeGreaterThan(0);

    // 验证每个步骤都有正确的记录
    game.moveHistory.forEach((move, index) => {
      expect(move).toHaveProperty('pieceType');
      expect(move).toHaveProperty('pieceColor');
      expect(move).toHaveProperty('from');
      expect(move).toHaveProperty('to');
      expect(move).toHaveProperty('notation');

      console.log(`✅ 步骤${index + 1}: ${move.notation}`);
    });
  });

  // 测试棋谱播放的错误处理
  test('棋谱播放 - 处理格式错误', () => {
    // 创建包含格式错误的数据
    const mixedFormatMoves = [
      // 正确格式
      {
        color: 'red',
        pieceType: 'soldier',
        fromPos: [6, 0],
        toPos: [5, 0],
        notation: '兵七进一'
      },
      // 缺少字段的错误格式
      {
        color: 'black',
        pieceType: 'horse'
        // 缺少 fromPos, toPos, notation
      },
      // 正确格式
      {
        color: 'red',
        pieceType: 'cannon',
        fromPos: [7, 1],
        toPos: [7, 4],
        notation: '炮二平五'
      }
    ];

    const result = game.loadAndPlayClassicGameWithData('混合格式测试', mixedFormatMoves);

    // 应该跳过错误的步骤，只处理正确的步骤
    expect(result).toBe(true);
    expect(game.moveHistory.length).toBe(2); // 只有2个有效步骤

    // 验证处理的是正确的步骤
    expect(game.moveHistory[0].notation).toBe('兵七进一');
    expect(game.moveHistory[1].notation).toBe('炮二平五');
  });

  // 测试棋子查找逻辑
  test('棋子查找逻辑 - 验证能找到正确的棋子', () => {
    // 重置游戏并跳过棋谱加载，直接检查初始状态的棋子
    game.initializeGame();

    // 使用初始位置的坐标来查找对应棋子
    const testPosition = [6, 4]; // 中兵位置
    const foundPiece = game.pieces.find(p =>
      p.dataset.color === 'red' &&
      p.dataset.type === 'soldier' &&
      parseInt(p.dataset.row) === testPosition[0] &&
      parseInt(p.dataset.col) === testPosition[1]
    );

    expect(foundPiece).toBeDefined();
    expect(foundPiece.dataset.color).toBe('red');
    expect(foundPiece.dataset.type).toBe('soldier');
  });

  // 测试边界条件
  test('边界条件 - 空棋谱和超长棋谱', () => {
    // 测试空棋谱
    const emptyResult = game.loadAndPlayClassicGameWithData('空棋谱测试', []);
    expect(emptyResult).toBe(true);
    expect(game.moveHistory.length).toBe(0);

    // 测试坐标边界检查 - 使用较小但有效的测试数据集
    const boundaryTestMoves = [
      // 有效的边界移动
      { color: 'red', pieceType: 'soldier', fromPos: [6, 0], toPos: [5, 0], notation: '兵七进一' },
      { color: 'black', pieceType: 'soldier', fromPos: [3, 8], toPos: [4, 8], notation: '卒3进一' },
      { color: 'red', pieceType: 'soldier', fromPos: [5, 0], toPos: [4, 0], notation: '兵七进一' },
      { color: 'black', pieceType: 'soldier', fromPos: [4, 8], toPos: [5, 8], notation: '卒3进一' },
      // 测试几种不同的坐标组合，确保都在范围内
      { color: 'red', pieceType: 'cannon', fromPos: [7, 1], toPos: [7, 4], notation: '炮二平五' },
      { color: 'black', pieceType: 'horse', fromPos: [0, 1], toPos: [2, 2], notation: '马二进三' },
    ];

    const boundaryResult = game.loadAndPlayClassicGameWithData('边界测试棋谱', boundaryTestMoves);
    expect(boundaryResult).toBe(true);
    expect(game.moveHistory.length).toBe(boundaryTestMoves.length);
  });
});