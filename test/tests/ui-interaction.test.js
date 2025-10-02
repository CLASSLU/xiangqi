/**
 * 用户界面交互测试
 * 测试用户界面的各种交互功能
 */

// 模拟DOM环境
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

// 创建虚拟DOM环境，模拟完整的HTML结构
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
  <title>中国象棋测试</title>
</head>
<body>
  <div class="container">
    <header>
      <h1>中国象棋</h1>
      <div class="game-controls">
        <button id="newGame">新游戏</button>
        <button id="undo">悔棋</button>
        <button id="showGameRecords">全局棋谱</button>
        <button id="audioToggle" class="audio-btn">🔊 音效</button>
      </div>
      
      <!-- 音量控制面板 -->
      <div id="audioControls" class="audio-controls">
        <div class="volume-control">
          <label for="musicVolume">🎵 背景音乐:</label>
          <input type="range" id="musicVolume" min="0" max="100" value="30" class="volume-slider">
          <span id="musicVolumeValue">30%</span>
        </div>
        <div class="volume-control">
          <label for="effectVolume">🔊 音效:</label>
          <input type="range" id="effectVolume" min="0" max="100" value="60" class="volume-slider">
          <span id="effectVolumeValue">60%</span>
        </div>
      </div>
    </header>

    <div class="game-board">
      <div class="board">
        <!-- 棋盘格子将由JavaScript动态生成 -->
      </div>
      <div class="status">
        <div id="currentPlayer">当前回合: 红方</div>
        <div id="gameStatus">游戏状态: 进行中</div>
      </div>
    </div>

    <div class="captured-pieces">
      <div class="red-captured">被吃红子: </div>
      <div class="black-captured">被吃黑子: </div>
    </div>
  </div>

  <!-- 棋谱展示面板 -->
  <div id="recordPanel" class="record-panel hidden">
    <div class="record-header">
      <h2>经典棋谱选择</h2>
      <button id="closeRecords" class="close-btn">×</button>
    </div>
    
    <!-- 棋谱选择按钮区域 -->
    <div class="record-selection">
      <h3>选择棋谱：</h3>
      <div id="recordButtons" class="record-buttons">
        <button class="record-btn" data-game="七星聚会">七星聚会</button>
        <button class="record-btn" data-game="蚯蚓降龙">蚯蚓降龙</button>
        <button class="record-btn" data-game="野马操田">野马操田</button>
        <button class="record-btn" data-game="千里独行">千里独行</button>
      </div>
    </div>
    
    <!-- 棋谱步骤展示区域 -->
    <div id="recordDisplay" class="record-display hidden">
      <div class="record-info">
        <h3 id="recordTitle">棋谱名称</h3>
        <div class="play-controls">
          <button id="playBtn">▶ 播放</button>
          <button id="pauseBtn">⏸ 暂停</button>
          <button id="resetBtn">↻ 重置</button>
          <div class="speed-control">
            <label>速度：</label>
            <select id="playSpeed">
              <option value="2000">慢速</option>
              <option value="1000" selected>正常</option>
              <option value="500">快速</option>
            </select>
          </div>
        </div>
      </div>
      <div class="record-steps">
        <ol id="stepsList" class="steps-list">
          <!-- 棋谱步骤将由JavaScript生成 -->
        </ol>
      </div>
    </div>
  </div>
</body>
</html>
`, {
  url: "http://localhost/",
  pretendToBeVisual: true,
  resources: "usable"
});

global.document = dom.window.document;
global.window = dom.window;
global.navigator = dom.window.navigator;

// 模拟Web Audio API
class MockAudioContext {
  constructor() {
    this.sampleRate = 44100;
    this.destination = {};
  }
  
  createBuffer(channels, length, sampleRate) {
    return {
      getChannelData: () => new Float32Array(length),
      length: length
    };
  }
  
  createBufferSource() {
    return {
      connect: () => {},
      start: () => {},
      stop: () => {},
      buffer: null,
      loop: false
    };
  }
  
  createGain() {
    return {
      connect: () => {},
      gain: { value: 1 }
    };
  }
}

global.window.AudioContext = MockAudioContext;
global.window.webkitAudioContext = MockAudioContext;
global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;

// 导入游戏类
const { XiangqiGame } = require('../../main/chess.js');
const { AudioManager } = require('../../main/audio-manager.js');

// 模拟全局audioManager
global.window.audioManager = new AudioManager();

describe('用户界面交互测试', () => {
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
  
  test('新游戏按钮功能测试', () => {
    // 保存初始棋子数量
    const initialPieceCount = game.pieces.length;
    
    // 重置游戏
    game.resetGame();
    
    // 检查游戏是否重置
    expect(game.pieces.length).toBe(32); // 应该重新初始化为32个棋子
    expect(game.currentPlayer).toBe('red'); // 当前玩家应该是红方
    expect(game.gameOver).toBe(false); // 游戏状态应该是进行中
  });
  
  test('悔棋按钮功能测试', () => {
    // 检查悔棋功能是否存在
    expect(typeof game.undoMove).toBe('function');
  });
  
  test('音效开关按钮功能测试', () => {
    // 保存初始状态
    const initialStatus = global.window.audioManager.getStatus().enabled;
    
    // 切换音效开关
    const newStatus = global.window.audioManager.toggleSound();
    
    // 检查音效是否切换
    expect(newStatus).toBe(!initialStatus);
    expect(global.window.audioManager.isEnabled).toBe(newStatus);
  });
  
  test('音量控制功能测试', () => {
    // 设置音乐音量
    global.window.audioManager.setMusicVolume(0.5);
    expect(global.window.audioManager.musicVolume).toBe(0.5);
    
    // 设置音效音量
    global.window.audioManager.setEffectVolume(0.8);
    expect(global.window.audioManager.effectVolume).toBe(0.8);
    
    // 测试音量限制
    global.window.audioManager.setMusicVolume(1.5); // 超出范围
    expect(global.window.audioManager.musicVolume).toBe(1.0); // 应该被限制在1.0
    
    global.window.audioManager.setEffectVolume(-0.5); // 超出范围
    expect(global.window.audioManager.effectVolume).toBe(0.0); // 应该被限制在0.0
  });
  
  test('棋谱面板显示测试', () => {
    // 检查棋谱面板是否存在
    const recordPanel = document.getElementById('recordPanel');
    expect(recordPanel).toBeTruthy();
    
    // 检查棋谱选择按钮
    const recordButtons = document.querySelectorAll('.record-btn');
    expect(recordButtons.length).toBe(4); // 应该有4个棋谱选择按钮
    
    // 检查棋谱按钮文本
    const buttonLabels = Array.from(recordButtons).map(btn => btn.textContent);
    expect(buttonLabels).toContain('七星聚会');
    expect(buttonLabels).toContain('蚯蚓降龙');
    expect(buttonLabels).toContain('野马操田');
    expect(buttonLabels).toContain('千里独行');
  });
  
  test('状态显示更新测试', () => {
    // 检查当前玩家显示
    expect(game.currentPlayer).toBe('red');
    
    // 切换玩家
    game.switchPlayer();
    
    // 检查显示是否更新
    expect(game.currentPlayer).toBe('black');
  });
  
  test('被吃棋子显示测试', () => {
    // 创建一个简单的测试场景
    // 清空棋盘
    game.pieces.forEach(piece => {
      if (piece.remove) piece.remove();
    });
    game.pieces = [];
    game.capturedRed = [];
    game.capturedBlack = [];
    
    // 放置一个红方帅
    const redKingData = { type: 'king', color: 'red', row: 9, col: 4, char: '帥' };
    const redKing = game.createPiece(redKingData);
    game.pieces.push(redKing);
    
    // 模拟吃子
    game.capturePiece(redKing);
    
    // 检查被吃红子数组
    expect(game.capturedRed).toContain('帥');
  });
});