# 中国象棋项目模块化重构实施计划

## 1. 项目概述

### 1.1 重构目标
- 将3243行的单一大文件拆分为4个专门模块
- 降低模块间耦合度，提高可维护性
- 保持100%的API兼容性
- 确保所有现有功能正常工作

### 1.2 时间安排
**总工期**: 11个工作日（2周 + 1天）
**团队规模**: 1-2名开发人员
**工作模式**: TDD（测试驱动开发）

### 1.3 关键里程碑
- ✅ Day 1-2: 准备工作和工具函数提取
- ✅ Day 3-4: GameState模块提取和测试
- ✅ Day 5-6: MoveValidator模块提取和测试
- ✅ Day 7-8: UIEventHandler模块提取和测试
- ✅ Day 9-10: GameDemonstration模块提取和测试
- ✅ Day 11: 主控制器重构和最终测试

## 2. 详细实施步骤

### Day 1: 环境准备和工具函数提取

**上午任务 (3小时)**:
1. **创建模块目录结构**
   ```bash
   cd main
   mkdir -p core utils
   touch core/.gitkeep utils/.gitkeep
   ```

2. **设置测试环境**
   - 创建 test/unit 目录
   - 配置 jest.config.js
   - 编写测试辅助工具

3. **创建事件总线系统**
   ```javascript
   // utils/event-bus.js
   class EventBus {
     constructor() {
       this.events = new Map()
     }
     // ... 实现
   }
   ```

**下午任务 (4小时)**:
1. **提取纯工具函数**
   - `findPieceAt`, `isOwnPieceAt`, `isValidPosition`
   - `filterValidMoves`, `areKingsFacing`
   - 创建 `utils/chess-utils.js`

2. **编写工具函数测试**
   ```javascript
   // test/unit/chess-utils.test.js
   describe('chess-utils', () => {
     test('findPieceAt should return correct piece', () => {
       // 测试实现
     })
   })
   ```

3. **验证测试通过**
   ```bash
   npm test test/unit/chess-utils.test.js
   ```

**验收标准**:
- [ ] 目录结构创建完成
- [ ] 工具函数提取成功
- [ ] 所有工具函数有对应测试
- [ ] 测试覆盖率 > 90%

### Day 2: 基础架构搭建

**上午任务 (3小时)**:
1. **创建基础的模块框架**
   - `core/GameState.js` (空框架)
   - `core/MoveValidator.js` (空框架)
   - `core/UIEventHandler.js` (空框架)
   - `core/GameDemonstration.js` (空框架)

2. **定义模块接口**
   - 为每个模块定义公共方法签名
   - 创建接口文档注释

3. **设置模块测试框架**
   ```javascript
   // 为每个模块创建基础测试
   describe('GameState', () => {
     test('should be instantiable', () => {
       const gameState = new GameState()
       expect(gameState).toBeInstanceOf(GameState)
     })
   })
   ```

**下午任务 (4小时)**:
1. **实现事件通信机制**
   - 集成 EventBus 到各模块
   - 定义标准事件名称
   - 创建事件文档

2. **创建迁移辅助工具**
   ```javascript
   // utils/migration-helper.js
   class MigrationHelper {
     static validateGameState(original, new) {
       // 验证状态一致性
     }
   }
   ```

3. **制定备份策略**
   ```bash
   git checkout -b modularization
   git add .
   git commit -m "feat: 开始模块化重构 - Day 2 完成"
   ```

**验收标准**:
- [ ] 所有模块框架创建完成
- [ ] 事件总线集成成功
- [ ] 基础测试可以运行
- [ ] 代码分支保护设置完成

### Day 3: GameState 模块实现

**上午任务 (3小时)**:
1. **分析现有状态管理代码**
   - 定位 chess.js 中的状态相关代码
   - 列出所有状态属性
   - 识别状态修改方法

2. **实现 GameState 核心功能**
   ```javascript
   // core/GameState.js
   class GameState {
     constructor() {
       this.pieces = []
       this.currentPlayer = 'red'
       this.gamePhase = 'playing'
       // ... 初始化其他状态
     }
   }
   ```

3. **编写状态测试用例**
   ```javascript
   // test/unit/GameState.test.js
   describe('GameState Initialization', () => {
     test('should initialize with 32 pieces', () => {
       const gameState = new GameState()
       gameState.initializeBoard()
       expect(gameState.getPieces()).toHaveLength(32)
     })
   })
   ```

**下午任务 (4小时)**:
1. **实现棋子管理功能**
   - `addPiece`, `removePiece`, `getPieceAt`
   - `initializeBoard`, `resetGame`

2. **实现移动历史管理**
   - `addMoveToHistory`
   - `undoMove`

3. **集成测试和调试**
   - 运行 GameState 测试套件
   - 修复发现的问题
   - 确保测试通过

**验收标准**:
- [ ] GameState 类实现完成
- [ ] 所有测试通过
- [ ] 测试覆盖率 > 90%
- [ ] 性能无退化

### Day 4: GameState 集成

**上午任务 (3小时)**:
1. **修改 chess.js 使用 GameState**
   ```javascript
   // 逐步替换原有代码
   class XiangqiGame {
     constructor() {
       this.gameState = new GameState()
       this.gameState.initializeBoard()
       // ...
     }

     // 原有方法委托给新模块
     getPieceAt(row, col) {
       return this.gameState.getPieceAt(row, col)
     }
   }
   ```

2. **保持向后兼容性**
   - 确保所有公共 API 保持不变
   - 使用适配器模式过渡

3. **运行完整测试**
   ```bash
   cd test && npm test
   ```

**下午任务 (4小时)**:
1. **修复兼容性问题**
   - 调试失败的测试
   - 更新适配器代码
   - 优化性能

2. **增量测试**
   - 每修复一个问题立即测试
   - 保持功能稳定

3. **代码审查和优化**
   - 代码格式化
   - 添加必要注释
   - 提交代码

**验收标准**:
- [ ] GameState 完全集成
- [ ] 所有现有测试通过
- [ ] API 兼容性 100%
- [ ] 性能无明显下降

### Day 5: MoveValidator 模块实现

**上午任务 (3小时)**:
1. **分析和分类移动规则**
   - 将帅规则实现
   - 士的规则实现
   - 象的规则实现
   - 其他棋子规则

2. **实现基础验证功能**
   ```javascript
   // core/MoveValidator.js
   class MoveValidator {
     constructor(gameState) {
       this.gameState = gameState
     }

     isValidMove(piece, fromRow, fromCol, toRow, toCol) {
       const pieceType = piece.dataset.type
       return this.validateMove(pieceType, piece, fromRow, fromCol, toRow, toCol)
     }
   }
   ```

3. **编写规则测试**
   ```javascript
   describe('MoveValidator - King Rules', () => {
     test('should limit king to palace', () => {
       const gameState = new GameState()
       const validator = new MoveValidator(gameState)
       const king = gameState.findPiece('king', 'red')

       expect(validator.isValidMove(king, 9, 4, 8, 3)).toBeFalsy()
       expect(validator.isValidMove(king, 9, 4, 8, 4)).toBeTruthy()
     })
   })
   ```

**下午任务 (4小时)**:
1. **实现将军检测**
   - `isInCheck` 方法
   - `wouldBeInCheckAfterMove` 方法

2. **实现将死检测**
   - `isCheckmate` 方法
   - 性能优化

3. **获取有效移动**
   - `getValidMoves` 方法
   - 缓存机制

**验收标准**:
- [ ] MoveValidator 基础功能实现
- [ ] 规则验证正确
- [ ] 将军检测准确
- [ ] 测试覆盖率 > 85%

### Day 6: MoveValidator 集成

**上午任务 (3小时)**:
1. **集成 MoveValidator 到游戏**
   ```javascript
   class XiangqiGame {
     constructor() {
       this.gameState = new GameState()
       this.moveValidator = new MoveValidator(this.gameState)
       // ...
     }

     movePiece(targetRow, targetCol) {
       if (!this.moveValidator.isValidMove(...)) {
         return false
       }
       // 执行移动
     }
   }
   ```

2. **更新依赖关系**
   - UIEventHandler 使用 MoveValidator
   - GameDemonstration 使用 MoveValidator

3. **集成测试**
   - 测试完整移动流程
   - 验证特殊规则

**下午任务 (4小时)**:
1. **性能优化**
   - 优化验证算法
   - 添加缓存机制
   - 减少重复计算

2. **边界情况处理**
   - 测试各种边界情况
   - 修复发现的问题

3. **全面测试**
   - 运行所有测试
   - 确保功能正常

**验收标准**:
- [ ] MoveValidator 完全集成
- [ ] 所有移动规则正确
- [ ] 性能达标
- [ ] 测试全部通过

### Day 7: UIEventHandler 模块实现

**上午任务 (3小时)**:
1. **提取事件处理代码**
   - 识别所有 DOM 事件处理
   - 分类事件类型
   - 设计事件处理架构

2. **实现事件绑定框架**
   ```javascript
   // core/UIEventHandler.js
   class UIEventHandler {
     constructor(gameState, moveValidator) {
       this.gameState = gameState
       this.moveValidator = moveValidator
       this.eventListeners = new Map()
     }

     bindEvents() {
       this.board.addEventListener('click', this.handleBoardClick.bind(this))
       // 绑定其他事件
     }
   }
   ```

3. **实现基础事件处理**
   - 棋子点击
   - 棋盘点击
   - 按钮点击

**下午任务 (4小时)**:
1. **实现视觉反馈**
   - 高亮选中棋子
   - 显示可能移动
   - 动画效果

2. **UI 更新逻辑**
   - 状态显示更新
   - 被吃棋子显示
   - 消息提示

3. **编写 UI 测试**
   - 使用 JSDOM 模拟
   - 测试事件处理
   - 测试 UI 更新

**验收标准**:
- [ ] UIEventHandler 实现完成
- [ ] 事件处理正常
- [ ] 视觉反馈正确
- [ ] UI 覆盖率 > 80%

### Day 8: UI 集成和优化

**上午任务 (3小时)**:
1. **集成 UIEventHandler**
   - 替换原有事件处理代码
   - 保持 UI 行为一致
   - 测试用户交互

2. **响应式优化**
   - 移动端适配
   - 触摸事件处理
   - 性能优化

**下午任务 (4小时)**:
1. **用户体验测试**
   - 手动测试关键功能
   - 收集反馈
   - 优化交互

2. **Bug 修复**
   - 修复发现的问题
   - 回归测试
   - 性能调优

**验收标准**:
- [ ] UI 完全重构
- [ ] 交互体验良好
- [ ] 响应式正常
- [ ] 性能达标

### Day 9: GameDemonstration 模块实现

**上午任务 (3小时)**:
1. **提取演示相关代码**
   - 棋谱加载逻辑
   - 演示播放逻辑
   - 步骤导航逻辑

2. **实现演示控制器**
   ```javascript
   // core/GameDemonstration.js
   class GameDemonstration {
     constructor(gameState, moveValidator, uiHandler) {
       this.gameState = gameState
       this.moveValidator = moveValidator
       this.uiHandler = uiHandler
       this.currentStep = 0
       this.isPlaying = false
     }

     async loadGame(gameData) {
       // 加载和解析棋谱
     }

     playToStep(stepIndex) {
       // 跳转到指定步骤
     }
   }
   ```

**下午任务 (4小时)**:
1. **实现步骤导航**
   - 前进/后退
   - 步骤跳转
   - 自动播放

2. **UI 集成**
   - 步骤列表显示
   - 控制按钮
   - 进度显示

**验收标准**:
- [ ] 演示功能实现
- [ ] 棋谱解析正确
- [ ] 导航功能正常
- [ ] 测试覆盖 > 85%

### Day 10: GameDemonstration 集成

**上午任务 (3小时)**:
1. **集成演示模块**
   - 替换原有演示代码
   - 保持功能一致
   - 测试演示流程

2. **棋谱分类功能**
   - 加载分类数据
   - 过滤和搜索
   - UI 交互

**下午任务 (4小时)**:
1. **演示优化**
   - 性能优化
   - 用户体验改进
   - 错误处理

2. **全面测试**
   - 测试所有棋谱
   - 验证演示功能
   - 确保稳定性

**验收标准**:
- [ ] 演示功能完全集成
- [ ] 所有棋谱正常
- [ ] 性能优化完成
- [ ] 功能稳定可靠

### Day 11: 主控制器重构和最终测试

**上午任务 (3小时)**:
1. **重构主控制器**
   ```javascript
   // chess.js - 简化版
   class XiangqiGame {
     constructor() {
       // 初始化所有模块
       this.initializeModules()
       // 模块间协调
       this.setupModuleInteraction()
     }

     initializeModules() {
       this.gameState = new GameState()
       this.moveValidator = new MoveValidator(this.gameState)
       this.uiHandler = new UIEventHandler(this.gameState, this.moveValidator)
       this.demonstration = new GameDemonstration(this.gameState, this.moveValidator, this.uiHandler)
     }
   }
   ```

2. **代码清理**
   - 移除冗余代码
   - 统一代码风格
   - 添加必要注释

**下午任务 (4小时)**:
1. **最终测试**
   ```bash
   # 运行完整测试套件
   cd test && npm test

   # 检查覆盖率
   npm run test:coverage

   # 性能测试
   npm run test:performance
   ```

2. **文档更新**
   - 更新 README
   - 更新 API 文档
   - 更新架构文档

3. **代码审查和提交**
   - 最终代码审查
   - 创建合并分支
   - 准备发布

**验收标准**:
- [ ] 主控制器简化完成
- [ ] 所有测试通过
- [ ] 代码质量达标
- [ ] 文档更新完整

## 3. 风险管理

### 3.1 每日风险检查清单

**Day 1-2**:
- [ ] 目录结构是否正确创建
- [ ] 工具函数提取是否完整
- [ ] 测试环境是否配置成功

**Day 3-4**:
- [ ] GameState API 是否设计合理
- [ ] 状态管理是否正确
- [ ] 兼容性是否保持

**Day 5-6**:
- [ ] 所有移动规则是否正确实现
- [ ] 性能是否满足要求
- [ ] 边界情况是否处理

**Day 7-8**:
- [ ] UI 交互是否正常
- [ ] 事件处理是否无误
- [ ] 视觉反馈是否正确

**Day 9-10**:
- [ ] 演示功能是否完整
- [ ] 棋谱解析是否准确
- [ ] 导航控制是否流畅

**Day 11**:
- [ ] 整体功能是否正常
- [ ] 性能是否达标
- [ ] 文档是否完整

### 3.2 应急预案

**方案A: 临时回退**
```bash
# 任何时候出现问题
git stash
git checkout main
# 继续使用原有版本
```

**方案B: 部分回退**
```bash
# 回退到上一个稳定阶段
git log --oneline -10
git checkout [commit-hash]
# 从稳定点继续
```

**方案C: 并行开发**
```bash
# 创建并行分支修复问题
git checkout -b fix-issue
# 问题修复后合并
```

## 4. 质量保证

### 4.1 每日质量指标

| 指标 | 目标值 | 测量方法 |
|------|--------|----------|
| 测试通过率 | 100% | npm test |
| 代码覆盖率 | >85% | npm run test:coverage |
| 性能回归 | <5% | 基准测试 |
| Bug 密度 | <1/100行 | 代码审查 |
| 代码复杂度 | <10 | 静态分析 |

### 4.2 代码审查要点

1. **模块职责是否单一**
2. **接口设计是否合理**
3. **依赖关系是否清晰**
4. **错误处理是否完善**
5. **性能优化是否充分**

## 5. 发布计划

### 5.1 测试阶段
- **Day 11**: 完整测试套件
- **Day 12**: 用户验收测试
- **Day 13**: 性能压力测试

### 5.2 发布阶段
- **Day 14**: 创建发布分支
- **Day 15**: 代码冻结
- **Day 16**: 正式发布

### 5.3 发布后维护
- 监控错误日志
- 收集用户反馈
- 快速修复问题
- 持续优化性能

## 6. 总结

本实施计划提供了详细的模块化重构路径，确保在11天内完成整个重构过程。关键是：

1. **小步快跑**：每天完成明确的目标
2. **测试驱动**：每个改动都有测试保障
3. **增量集成**：确保每天都有可运行的版本
4. **风险管控**：及时发现问题并快速响应

通过严格执行此计划，我们将成功完成中国象棋项目的模块化重构，提高代码质量，降低维护成本。

---

*本实施计划将根据实际情况灵活调整，但总目标和时间节点保持不变。*