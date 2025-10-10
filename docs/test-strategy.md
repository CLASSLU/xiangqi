# 中国象棋项目模块化重构测试策略

## 1. 测试总体策略

### 1.1 测试金字塔

```
     E2E Tests (5%)
     ┌─────────────┐
    │ Integration │ (25%)
   │   Tests     │
  └──────────────┘
 ┌────────────────┐
│  Unit Tests    │ (70%)
└────────────────┘
```

### 1.2 测试原则

1. **测试先行**: 每个模块重构前必须先有测试
2. **增量测试**: 每完成一个小功能立即测试
3. **回归测试**: 每个阶段后运行完整测试套件
4. **自动化优先**: 所有测试必须自动化
5. **覆盖率目标**: 单元测试90%+，集成测试70%+

## 2. 测试环境配置

### 2.1 测试工具栈

```json
{
  "testFramework": "Jest",
  "mockLibrary": "Jest Mock",
  "domSimulator": "JSDOM",
  "coverageTool": "Istanbul",
  "matching": "jest-environment-jsdom",
  "reporter": ["spec", "html"],
  "testRunner": "jest-runner-vscode"
}
```

### 2.2 测试目录结构

```
test/
├── unit/                    # 单元测试
│   ├── GameState.test.js
│   ├── MoveValidator.test.js
│   ├── UIEventHandler.test.js
│   └── GameDemonstration.test.js
├── integration/             # 集成测试
│   ├── ModuleIntegration.test.js
│   └── EventFlow.test.js
├── e2e/                     # 端到端测试
│   ├── GameFlow.test.js
│   └── Demonstration.test.js
├── fixtures/                # 测试数据
│   ├── test-games.json
│   └── mock-positions.json
└── helpers/                 # 测试工具
    ├── test-utils.js
    └── mock-factory.js
```

### 2.3 测试配置文件

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/helpers/setup.js'],
  collectCoverageFrom: [
    'main/core/**/*.js',
    '!main/core/**/*.test.js',
    '!main/legacy/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './main/core/GameState.js': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  testMatch: [
    '<rootDir>/test/**/*.test.js'
  ],
  moduleNameMapping: {
    '^@core/(.*)$': '<rootDir>/main/core/$1',
    '^@utils/(.*)$': '<rootDir>/main/utils/$1'
  }
}
```

## 3. 单元测试

### 3.1 GameState 模块测试

```javascript
// test/unit/GameState.test.js
describe('GameState Module', () => {
  let gameState

  beforeEach(() => {
    gameState = new GameState()
  })

  describe('Initialization', () => {
    test('should initialize with correct default values', () => {
      expect(gameState.getCurrentPlayer()).toBe('red')
      expect(gameState.getGamePhase()).toBe('playing')
      expect(gameState.getPieces()).toHaveLength(32)
      expect(gameState.isGameOver()).toBeFalsy()
    })
  })

  describe('Player Management', () => {
    test('should switch current player', () => {
      gameState.setCurrentPlayer('black')
      expect(gameState.getCurrentPlayer()).toBe('black')
      gameState.switchPlayer()
      expect(gameState.getCurrentPlayer()).toBe('red')
    })
  })

  describe('Piece Management', () => {
    test('should add piece correctly', () => {
      const piece = createMockPiece('king', 'red', 9, 4)
      gameState.addPiece(piece)
      expect(gameState.getPieces()).toHaveLength(33)
    })

    test('should find piece at position', () => {
      const piece = gameState.getPieceAt(0, 0)
      expect(piece).toBeTruthy()
      expect(piece.dataset.type).toBe('chariot')
      expect(piece.dataset.color).toBe('black')
    })

    test('should remove piece correctly', () => {
      const piece = gameState.getPieceAt(0, 0)
      gameState.removePiece(piece)
      expect(gameState.getPieceAt(0, 0)).toBeNull()
      expect(gameState.getPieces()).toHaveLength(31)
    })
  })

  describe('Move History', () => {
    test('should record moves correctly', () => {
      const move = {
        pieceType: 'horse',
        pieceColor: 'red',
        from: { row: 9, col: 1 },
        to: { row: 7, col: 2 },
        notation: '马二进三'
      }
      gameState.addMoveToHistory(move)
      expect(gameState.getMoveHistory()).toHaveLength(1)
      expect(gameState.getMoveHistory()[0]).toMatchObject(move)
    })
  })

  describe('Game Reset', () => {
    test('should reset to initial state', () => {
      gameState.setCurrentPlayer('black')
      gameState.setGamePhase('demonstration')
      gameState.setGameOver(true)

      gameState.resetGame()

      expect(gameState.getCurrentPlayer()).toBe('red')
      expect(gameState.getGamePhase()).toBe('playing')
      expect(gameState.isGameOver()).toBeFalsy()
      expect(gameState.getMoveHistory()).toHaveLength(0)
    })
  })
})
```

### 3.2 MoveValidator 模块测试

```javascript
// test/unit/MoveValidator.test.js
describe('MoveValidator Module', () => {
  let gameState, moveValidator

  beforeEach(() => {
    gameState = new GameState()
    gameState.initializeBoard()
    moveValidator = new MoveValidator(gameState)
  })

  describe('King Movement', () => {
    test('should validate king moves within palace', () => {
      const king = gameState.getPieceAt(9, 4)
      expect(moveValidator.isValidMove(king, 9, 4, 9, 3)).toBeTruthy()
      expect(moveValidator.isValidMove(king, 9, 4, 9, 5)).toBeTruthy()
      expect(moveValidator.isValidMove(king, 9, 4, 8, 4)).toBeTruthy()
    })

    test('should reject king moves outside palace', () => {
      const king = gameState.getPieceAt(9, 4)
      expect(moveValidator.isValidMove(king, 9, 4, 7, 4)).toBeFalsy()
      expect(moveValidator.isValidMove(king, 9, 4, 9, 2)).toBeFalsy()
    })
  })

  describe('Horse Movement', () => {
    test('should validate horse L-moves', () => {
      const horse = gameState.getPieceAt(9, 1)
      expect(moveValidator.isValidMove(horse, 9, 1, 7, 0)).toBeTruthy()
      expect(moveValidator.isValidMove(horse, 9, 1, 7, 2)).toBeTruthy()
    })

    test('should block horse with leg piece', () => {
      // Place blocking piece
      const blockPiece = createMockPiece('soldier', 'red', 8, 1)
      gameState.addPiece(blockPiece)

      const horse = gameState.getPieceAt(9, 1)
      expect(moveValidator.isValidMove(horse, 9, 1, 7, 0)).toBeFalsy()
      expect(moveValidator.isValidMove(horse, 9, 1, 7, 2)).toBeFalsy()
    })
  })

  describe('Check Detection', () => {
    test('should detect check correctly', () => {
      // Setup check scenario
      gameState.resetGame()
      // Move red chariot to attack black king
      const chariot = gameState.getPieceAt(0, 0)
      gameState.removePiece(chariot)
      gameState.addPiece(createMockPiece('chariot', 'red', 5, 0))

      expect(moveValidator.isInCheck('black')).toBeTruthy()
      expect(moveValidator.isInCheck('red')).toBeFalsy()
    })
  })

  describe('Checkmate Detection', () => {
    test('should detect checkmate correctly', () => {
      // Setup checkmate scenario
      setupCheckmateScenario(gameState)

      expect(moveValidator.isCheckmate('black')).toBeTruthy()
      expect(moveValidator.isInCheck('black')).toBeTruthy()
    })
  })
})
```

### 3.3 UIEventHandler 模块测试

```javascript
// test/unit/UIEventHandler.test.js
describe('UIEventHandler Module', () => {
  let gameState, moveValidator, uiHandler, mockBoard

  beforeEach(() => {
    gameState = new GameState()
    moveValidator = new MoveValidator(gameState)
    mockBoard = createMockBoard()
    uiHandler = new UIEventHandler(gameState, moveValidator, mockBoard)
  })

  describe('Event Binding', () => {
    test('should bind events to board', () => {
      const spy = jest.spyOn(mockBoard, 'addEventListener')
      uiHandler.bindEvents()
      expect(spy).toHaveBeenCalledWith('click', expect.any(Function))
    })

    test('should unbind events correctly', () => {
      const spy = jest.spyOn(mockBoard, 'removeEventListener')
      uiHandler.unbindEvents()
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('Piece Selection', () => {
    test('should highlight selected piece', () => {
      const piece = createMockPiece('king', 'red', 9, 4)
      const highlightSpy = jest.fn()
      piece.classList.add = highlightSpy

      uiHandler.handlePieceClick(piece)
      expect(highlightSpy).toHaveBeenCalledWith('selected')
    })

    test('should show possible moves', () => {
      const piece = gameState.getPieceAt(9, 4)
      uiHandler.handlePieceClick(piece)
      expect(uiHandler.showPossibleMoves).toHaveBeenCalled()
    })
  })

  describe('Move Execution', () => {
    test('should execute valid move', () => {
      const piece = gameState.getPieceAt(9, 1)
      const moveSpy = jest.fn()
      uiHandler.movePiece = moveSpy

      uiHandler.handleBoardClick({ target: { dataset: { row: '7', col: '2' } } })
      expect(moveSpy).toHaveBeenCalledWith(7, 2)
    })
  })

  describe('UI Updates', () => {
    test('should update captured pieces display', () => {
      const piece = createMockPiece('soldier', 'red', 5, 5)
      gameState.capturePiece(piece)

      const displaySpy = jest.spyOn(uiHandler, 'updateCapturedPieces')
      uiHandler.updateCapturedPieces()
      expect(displaySpy).toHaveBeenCalled()
    })
  })
})
```

## 4. 集成测试

### 4.1 模块集成测试

```javascript
// test/integration/ModuleIntegration.test.js
describe('Module Integration Tests', () => {
  let gameState, moveValidator, uiHandler, demonstration

  beforeEach(() => {
    gameState = new GameState()
    moveValidator = new MoveValidator(gameState)
    uiHandler = new UIEventHandler(gameState, moveValidator)
    demonstration = new GameDemonstration(gameState, moveValidator, uiHandler)
  })

  test('should coordinate state and validation', () => {
    gameState.setCurrentPlayer('red')
    const piece = gameState.getPieceAt(9, 1)

    const isValid = moveValidator.isValidMove(piece, 9, 1, 7, 2)
    expect(isValid).toBeTruthy()

    // Execute move through UI
    uiHandler.handlePieceClick(piece)
    uiHandler.handleBoardClick({ target: { dataset: { row: '7', col: '2' } } })

    // Verify state updated
    expect(gameState.getCurrentPlayer()).toBe('black')
    expect(gameState.getMoveHistory()).toHaveLength(1)
  })

  test('should handle demonstration flow', async () => {
    const gameData = loadTestGameData()
    await demonstration.loadGame(gameData)

    demonstration.playToStep(5)
    expect(gameState.getMoveHistory()).toHaveLength(5)

    demonstration.playToStep(3)
    expect(gameState.getMoveHistory()).toHaveLength(3)
  })
})
```

### 4.2 事件流测试

```javascript
// test/integration/EventFlow.test.js
describe('Event Flow Tests', () => {
  let eventBus, gameState, mockHandlers

  beforeEach(() => {
    eventBus = new EventBus()
    gameState = new GameState()
    mockHandlers = setupMockHandlers(eventBus)
  })

  test('should emit and handle game state events', () => {
    const spy = jest.fn()
    eventBus.on('stateChange', spy)

    gameState.setCurrentPlayer('black')
    eventBus.emit('stateChange', { player: 'black' })

    expect(spy).toHaveBeenCalledWith({ player: 'black' })
  })

  test('should handle move events', () => {
    const moveSpy = jest.fn()
    eventBus.on('moveExecuted', moveSpy)

    const move = { from: [9, 1], to: [7, 2], piece: 'horse' }
    eventBus.emit('moveExecuted', move)

    expect(moveSpy).toHaveBeenCalledWith(move)
  })
})
```

## 5. 端到端测试

### 5.1 完整游戏流程测试

```javascript
// test/e2e/GameFlow.test.js
describe('End-to-End Game Flow', () => {
  let game

  beforeEach(async () => {
    // Setup full DOM environment
    document.body.innerHTML = '<div id="board"></div>'
    game = new XiangqiGame()
    await game.initialize()
  })

  test('should play complete game from start', async () => {
    // Red moves
    clickAtPosition(9, 1) // Horse
    clickAtPosition(7, 2)
    await waitFor(100)

    expect(game.currentPlayer).toBe('black')
    expect(game.moveHistory).toHaveLength(1)

    // Black responds
    clickAtPosition(0, 1) // Horse
    clickAtPosition(2, 2)
    await waitFor(100)

    expect(game.currentPlayer).toBe('red')
    expect(game.moveHistory).toHaveLength(2)

    // Continue to checkmate
    executeMoves(testMoves)

    expect(game.gameOver).toBeTruthy()
    expect(document.querySelector('.game-over')).toBeTruthy()
  })
})
```

### 5.2 演示功能测试

```javascript
// test/e2e/Demonstration.test.js
describe('Demonstration E2E Tests', () => {
  test('should play demonstration with controls', async () => {
    const game = new XiangqiGame()
    await game.initialize()

    // Load test game
    await game.loadTestGame('test-game.json')

    // Test play controls
    document.querySelector('#playBtn').click()
    await waitFor(1000)
    expect(document.querySelector('.playing')).toBeTruthy()

    document.querySelector('#pauseBtn').click()
    expect(document.querySelector('.paused')).toBeTruthy()

    document.querySelector('#prevBtn').click()
    expect(game.currentStep).toBeLessThan(game.totalSteps)

    document.querySelector('#nextBtn').click()
    expect(game.currentStep).toBeGreaterThan(0)

    // Test step clicking
    document.querySelectorAll('.step-item')[5].click()
    expect(game.currentStep).toBe(5)
    expect(document.querySelector('.step-item:nth-child(6)')).toHaveClass('active')
  })
})
```

## 6. 测试数据和工具

### 6.1 测试数据工厂

```javascript
// test/helpers/mock-factory.js
export function createMockPiece(type, color, row, col) {
  const piece = document.createElement('div')
  piece.dataset.type = type
  piece.dataset.color = color
  piece.dataset.row = row
  piece.dataset.col = col
  piece.textContent = getPieceCharacter(type, color)
  return piece
}

export function createMockBoard() {
  const board = document.createElement('div')
  board.id = 'board'
  board.style.width = '630px'
  board.style.height = '700px'
  document.body.appendChild(board)
  return board
}

export function loadTestGameData() {
  return {
    name: 'Test Game',
    moves: [
      ['red', 'horse', [9, 1], [7, 2], '马二进三'],
      ['black', 'horse', [0, 1], [2, 2], '马8进7'],
      // ... more moves
    ]
  }
}
```

### 6.2 测试工具函数

```javascript
// test/helpers/test-utils.js
export async function waitFor(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function clickAtPosition(row, col) {
  const x = col * 70 + 35
  const y = row * 70 + 35
  const event = new MouseEvent('click', {
    clientX: x,
    clientY: y,
    bubbles: true
  })
  document.elementFromPoint(x, y).dispatchEvent(event)
}

export function setupCheckmateScenario(gameState) {
  // Implementation for setting up checkmate position
}

export function executeMoves(moves) {
  // Execute an array of moves
}
```

## 7. 测试执行计划

### 7.1 开发阶段测试

```bash
# 开发时持续测试
npm run test:watch

# 单模块测试
npm test test/unit/GameState.test.js

# 覆盖率报告
npm run test:coverage

# 快速测试（跳过E2E）
npm run test:unit
```

### 7.2 集成阶段测试

```bash
# 运行所有测试
npm test

# 只运行集成测试
npm run test:integration

# 性能测试
npm run test:performance
```

### 7.3 发布前测试

```bash
# 完整测试套件
npm run test:full

# 生成测试报告
npm run test:report

# 回归测试
npm run test:regression
```

## 8. 测试指标和报告

### 8.1 关键指标

- **测试覆盖率**: > 85%
- **测试通过率**: 100%
- **性能回归**: < 5%
- **Bug 发现率**: 提前发现90%+

### 8.2 测试报告

```javascript
// 测试报告模板
const testReport = {
  summary: {
    totalTests: 150,
    passed: 150,
    failed: 0,
    skipped: 0,
    coverage: 87.5
  },
  modules: {
    'GameState': { coverage: 95, tests: 30 },
    'MoveValidator': { coverage: 92, tests: 45 },
    'UIEventHandler': { coverage: 85, tests: 35 },
    'GameDemonstration': { coverage: 88, tests: 40 }
  },
  performance: {
    averageTestTime: '120ms',
    longestTest: '2.3s'
  }
}
```

## 9. 持续集成

### 9.1 CI/CD 配置

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v1
```

### 9.2 自动化测试流程

1. **Pre-commit**: 运行相关单元测试
2. **Pre-push**: 运行完整测试套件
3. **PR**: 运行所有测试+覆盖率检查
4. **Merge**: 运行性能测试+E2E测试
5. **Release**: 完整回归测试

## 10. 故障排除指南

### 10.1 常见问题

**问题**: 测试在 JSDOM 中失败
```javascript
// 解决方案：添加适当的 polyfill
global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder
```

**问题**: 异步测试超时
```javascript
// 解决方案：增加超时时间或调整等待策略
test('async test', async () => {
  await waitForDOMUpdate()
  expect(element).toBeVisible()
}, 10000)
```

**问题**: 模块导入失败
```javascript
// 解决方案：配置模块映射
jest.mock('../core/GameState', () => {
  return jest.requireActual('../core/GameState.js')
})
```

### 10.2 调试技巧

1. 使用 `test.only` 运行单个测试
2. 添加 `console.log` 输出中间状态
3. 使用 Chrome DevTools 调试测试
4. 生成测试覆盖率报告找出未测试代码

---

*本测试策略确保模块化重构过程中功能的完整性和稳定性，所有改动都有充分的测试保障。*