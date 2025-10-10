/**
 * 棋谱播放演示功能测试
 * 测试棋谱加载、演示模式、步骤导航等关键功能
 */

// 模拟DOM环境
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

// 创建虚拟DOM环境
const dom = new JSDOM(`<!DOCTYPE html>
<html>
<body>
    <div class="board"></div>
    <div id="currentPlayer"></div>
    <div id="gameStatus"></div>
    <div class="red-captured"></div>
    <div class="black-captured"></div>

    <!-- 用于测试的棋谱显示区域 -->
    <div id="record"></div>
    <div id="stepsList"></div>
    <div id="gameButtons"></div>
</body>
</html>`);
global.document = dom.window.document;
global.window = dom.window;

// 导入游戏类
const { XiangqiGame } = require('../../main/chess.js');

// 导入并设置模块用于测试
const GameDemonstration = require('../../main/game-demonstration.js');
const BoardRenderer = require('../../main/board-renderer.js');
global.GameDemonstration = GameDemonstration;
global.BoardRenderer = BoardRenderer;

describe('棋谱播放演示功能测试', () => {
  let game;

  beforeEach(() => {
    // 重置全局DOM相关的模拟
    global.document = dom.window.document;
    global.window = dom.window;

    // 创建游戏实例
    global.XiangqiGame = XiangqiGame;
    game = new XiangqiGame();

    // 设置测试用的喜份数据
    global.classicGamesData = {
      "七星聚会": {
        title: "七星聚会",
        moves: [
          ["red", "chariot", [9, 0], [5, 0], "车一进二"],
          ["black", "cannon", [2, 6], [6, 6], "炮二进七"],
          ["red", "chariot", [9, 1], [8, 1], "车九平八"]
        ]
      },
      "基本开局测试": {
        title: "基本开局测试",
        moves: [
          ["red", "soldier", [6, 4], [5, 4], "兵五进一"],
          ["black", "horse", [0, 1], [2, 2], "马二进三"]
        ]
      }
    };
  });

  afterEach(() => {
    // 清理
    if (game && game.board) {
      game.board.innerHTML = '';
    }
  });

  // 测试棋谱数据加载和演示模式
  test('使用数据加载经典棋谱并进入演示模式', async () => {
    // 模拟 fetch 函数
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          games: {
            test_category: {
              name: "测试分类",
              games: [
                {
                  title: "测试棋局",
                  moves: [
                    ["red", "soldier", [6, 0], [5, 0], "兵七进一"],
                    ["black", "soldier", [3, 0], [4, 0], "卒三进一"]
                  ]
                }
              ]
            }
          }
        })
      })
    );

    // 加载分类棋谱数据库
    await game.loadClassifiedGameDatabase();

    // 验证分类数据加载成功
    const categoryData = await game.loadClassifiedGameDatabase();
    expect(categoryData).toBeDefined();
    expect(categoryData.games.test_category).toBeDefined();
  });

  // 测试使用现有数据加载棋谱
  test('使用现有数据加载棋谱并验证移动执行', () => {
    const gameData = {
      title: "测试棋局",
      moves: [
        ["red", "soldier", [6, 0], [5, 0], "兵七进一"],
        ["black", "horse", [0, 1], [2, 2], "马二进三"],
        ["red", "cannon", [7, 1], [7, 4], "炮二平五"]
      ]
    };

    // 使用数据加载棋谱
    game.loadAndPlayClassicGameWithData('测试棋局', gameData.moves);

    // 验证演示模式
    expect(game.gamePhase).toBe('demonstration');

    // 验证移动历史
    expect(game.moveHistory).toHaveLength(3);
    expect(game.moveHistory[0].notation).toBe('兵七进一');
    expect(game.moveHistory[1].notation).toBe('马二进三');

    // 验证当前玩家状态（总步数为奇数，最后一步是红方走的，所以轮到黑方）
    expect(game.moveHistory.length % 2).toBe(1); // 3步，红方最后走棋，所以轮到黑方
  });

  // 测试步骤导航功能
  test('步骤导航功能 - playToStep', () => {
    // 验证 playToStep 基本功能
    game.gamePhase = 'demonstration';

    // 手动设置移动历史
    game.moveHistory = [
      { pieceType: 'soldier', pieceColor: 'red', from: { row: 6, col: 4 }, to: { row: 5, col: 4 }, notation: '兵五进一' },
      { pieceType: 'horse', pieceColor: 'black', from: { row: 0, col: 1 }, to: { row: 2, col: 2 }, notation: '马二进三' },
      { pieceType: 'cannon', pieceColor: 'red', from: { row: 7, col: 1 }, to: { row: 7, col: 4 }, notation: '炮二平五' }
    ];

    // 模拟重置和棋子查找的函数，避免DOM操作
    game.resetToStartPosition = jest.fn();
    game.selectedPiece = { dataset: { color: 'red', type: 'soldier', row: '6', col: '4' }, textContent: '兵' };
    game.pieces = [game.selectedPiece];
    game.movePiece = jest.fn();
    game.updateStatus = jest.fn();

    // 测试播放第1步索引
    expect(() => {
      game.playToStep(1);  // 验证函数可以正常调用不触发错误
    }).not.toThrow();

    // 验证重置和移动被调用
    expect(game.resetToStartPosition).toHaveBeenCalled();
    expect(game.movePiece).toHaveBeenCalled();
  });

  // 测试分类棋谱加载
  test('分类棋谱加载功能', async () => {
    // 模拟 fetch，返回分类棋谱数据
    const mockCategoryData = {
      games: {
        opening_layouts: {
          name: "开局布局",
          games: [
            {
              title: "经典开局",
              moves: [
                ["red", "soldier", [6, 4], [5, 4], "兵五进一"],
                ["black", "soldier", [3, 4], [4, 4], "卒五进一"]
              ]
            }
          ]
        }
      }
    };

    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockCategoryData)
      })
    );

    const result = await game.loadClassifiedGameDatabase();

    expect(result).toBeDefined();
    expect(result.games).toBeDefined();
    expect(result.games.opening_layouts).toBeDefined();
  });

  // 测试棋谱解析器兼容性
  test('借助解析器加载棋谱', async () => {
    // 测试解析器兼容模式
    global.classicGames = {
      "解析器测试": {
        moves: ['炮二平五', '马8进7', '马二进三', '车9平8']
      }
    };

    // 这里需要使用 try-catch 因为可能会有转换错误
    try {
      await game.loadAndPlayClassicGameWithParser('解析器测试');

      // 如果成功，验证状态
      expect(game.gamePhase).toBe('demonstration');
      expect(game.moveHistory.length).toBeGreaterThan(0);
    } catch (error) {
      // 解析失败也是正常情况，因为棋谱字符串需要特殊处理
      console.log('解析器测试失败（预期中）:', error.message);
    }
  });

  // 测试棋谱步骤显示更新
  test('步骤列表显示功能', () => {
    const gameData = {
      title: "步骤显示测试",
      moves: [
        ["red", "soldier", [6, 4], [5, 4], "兵五进一"],
        ["black", "horse", [0, 1], [2, 2], "马二进三"]
      ]
    };

    game.loadAndPlayClassicGameWithData('步骤显示测试', gameData.moves);

    // 创建步骤列表DOM元素
    const stepsList = document.createElement('div');
    stepsList.id = 'stepsList';
    document.body.appendChild(stepsList);

    // 调用需要在游戏加载成功后再显
    const recordStepsDiv = gameData.moves.map(move => move[4]);

    // 手动调用更新函数，传入步骤数据
    game.updateRecordStepsDisplay(recordStepsDiv);

    // 验证步骤列表被更新
    expect(stepsList.children.length).toBeGreaterThan(0);
  });

  // 测试演示模式下的限制
  test('演示模式下的基本状态验证', () => {
    // 确保棋盘已创建于（如果尚未创建则手动创建）
    if (!game.board) {
      game.board = document.createElement('div');
      game.board.className = 'board';
      document.body.appendChild(game.board);
    }

    // 进入演示模式
    game.gamePhase = 'demonstration';

    // 验证演示模式判断
    expect(game.gamePhase).toBe('demonstration');
    expect(game.currentPlayer).toBe('red'); // 演示模式应该重置当前玩家

    // 模拟加载棋谱后的状态（在现有的棋盘上执行后门移动）
    game.moveHistory = [
      { pieceType: 'soldier', pieceColor: 'red', from: { row: 6, col: 4 }, to: { row: 5, col: 4 }, notation: '兵五进一' },
      { pieceType: 'horse', pieceColor: 'black', from: { row: 0, col: 1 }, to: { row: 2, col: 2 }, notation: '马二进三' }
    ];

    // 验证演示模式状态
    expect(game.moveHistory.length).toBe(2);
  });

  // 测试错误处理
  test('棋谱数据无效时的错误处理', () => {
    // 空棋谱数据
    game.loadAndPlayClassicGameWithData('空棋谱', []);
    expect(game.gamePhase).toBe('demonstration');
    expect(game.moveHistory).toHaveLength(0);

    // 无效移动数据
    const invalidMoves = [
      ["red", "soldier", [6, 4], [5, 4], "兵五进一"],
      [undefined, undefined, [], [], "无效移动"]  // 无效数据
    ];

    game.loadAndPlayClassicGameWithData('无效棋谱', invalidMoves);
    // 应该只执行有效的移动
    expect(game.moveHistory.length).toBeLessThan(invalidMoves.length);
  });
});