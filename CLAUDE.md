# CLAUDE.md

本文件为 Claude Code（claude.ai/code）在处理本仓库代码时提供指导。

## 项目概述

中国象棋（Xiangqi）游戏 - 功能完整的浏览器端实现，包含棋谱演示、步骤导航和智能解析功能。

**技术栈**: 原生 HTML/CSS/JavaScript，无外部依赖
**架构**: ES6 类设计 + 事件驱动 + 模块化测试

## 项目目录结构规范

### 📁 模块化目录布局
```
xiangqi/
├── main/              # 🎮 游戏核心模块
│   ├── data/          # 游戏数据文件
│   ├── index.html     # 主界面
│   ├── chess.js       # 核心游戏引擎
│   ├── style.css      # 样式文件
│   └── *.js/*.json    # 其他核心文件
├── scraper/           # 🕷️ 爬虫模块
│   ├── *.js           # 爬虫脚本
│   └── data/          # 爬虫生成的数据
├── test/              # 🧪 测试模块
│   ├── tests/         # 测试文件
│   └── package.json   # 测试依赖
└── README.md          # 项目文档
```

## 核心文件职责

### 🎮 main/ - 游戏核心模块
- **`index.html`** - 游戏UI结构，内嵌棋谱面板交互逻辑
- **`chess.js`** (~1872行) - 核心游戏引擎 `XiangqiGame` 类
- **`chess-notation-parser.js`** (~523行) - 标准棋谱记谱法解析器
- **`style.css`** - 完整响应式样式系统
- **`audio-manager.js`** - Web Audio API 木质音效系统
- **`classic_openings.json`** - 经典开局数据（传统格式）
- **`standard-openings.json`** - 标准格式棋谱数据
- **`data/`** - 所有游戏数据文件目录

### 🕷️ scraper/ - 爬虫模块
- **`complete-scraper.js`** - 完整爬虫脚本
- **`fast-scraper.js`** - 快速爬虫脚本
- **`simple-scraper.js`** - 简单爬虫脚本
- **`classify-games.js`** - 棋谱分类脚本
- **`data/`** - 爬虫生成的数据目录
- **严禁**在根目录或其他目录创建爬虫相关文件

### 🧪 test/ - 测试模块
- **Jest + JSDOM** - 完整的浏览器环境模拟测试
- **测试覆盖**: 棋盘初始化、移动规则、将军检测、经典棋局、音频系统
- **`tests/`** - 所有测试用例文件
- **所有测试相关文件必须在 `test/` 目录内**

## 关键系统架构

### 1. 游戏状态管理
```javascript
// 核心状态
currentPlayer: 'red'|'black'      // 当前回合
gamePhase: 'playing'|'demonstration' // 游戏阶段
pieces: Array                      // 棋子数组
moveHistory: Array                  // 移动历史 {pieceType, pieceColor, from, to, notation}
```

### 2. 棋谱解析系统
```javascript
// ChessNotationParser 类
- 标准记谱法解析: "炮二平五", "马二进三"
- 红黑坐标差异处理
- 路码系统转换 (红方: 1路=右到左, 黑方: 1路=左到右)
```

### 3. 步骤导航系统
- **`playToStep(index)`** - 跳转到指定步骤
- **`updateRecordStepsDisplay()`** - 渲染可点击步骤列表
- 支持步骤高亮和视觉反馈

## 开发原则和约束

### 🎯 核心原则
**目录结构优先**：每个文件都有其确定的归属领域
- `main/`：游戏核心，仅限UI和引擎文件
- `scraper/`：爬虫脚本，数据生成
- `test/`：测试用例，验证功能
- `main/data/`、`scraper/data/`：按来源归类的数据文件

### 🚫 文件放置违规
1. **严禁跨域存放文件**
   - `main/` 中禁止：测试文件、爬虫脚本、临时文件
   - `scraper/` 中禁止：游戏核心逻辑、测试用例
   - `test/` 中禁止：生产代码、爬虫脚本、数据文件
   - 根目录禁止：开发过程中的临时文件和数据

2. **数据必须存放在指定目录**
   - 游戏数据：`main/data/` 目录下
   - 爬虫数据：`scraper/data/` 目录下
   - 测试数据：`test/data/` 目录下（如需要）

### ✅ 开发标准
1. **功能稳定性**
   - 新增功能必须带测试用例
   - 修改前运行全部测试通过
   - 功能异常时立即回滚

2. **代码组织**
   - 优先修改现有文件而非新增
   - 保持与现有API兼容性
   - 使用现有数据格式

3. **质量保证**
   - 所有更改前运行测试：`cd test && npm test`
   - 清理临时文件和孤立文件
   - 重大功能更新同步文档

## 开发工作流

### 🏗️ 核心开发流程
```bash
# 1. 功能开发周期
npm run dev:watch    # 持续测试模式（实时反馈）
vim main/chess.js    # 修改代码
npm test            # 验证测试通过
git commit -m "feat: 新增功能描述"

# 2. 代码质量控制
node -c main/chess.js                    # 语法检查
cd test && npm test tests/*.test.js      # 针对性测试
npm test -- --watch                      # 持续集成模式
```

### 🎯 功能开发优先级
**按紧急程度排序：**
1. **P0 - 阻塞问题**: 游戏移动异常、规则错误
2. **P1 - 核心功能**: 棋谱播放失败、步骤导航异常
3. **P2 - 用户体验**: 界面显示问题、性能优化
4. **P3 - 功能增强**: 新棋谱格式、解析器改进
5. **P4 - 数据维护**: 爬虫脚本、数据更新

### ⚠️ 代码提交规范
**提交前强制检查清单：**
- [ ] 自动化测试：`npm test` 全部通过
- [ ] 功能验证：新增代码有对应测试
- [ ] 文件清理：无临时文件和孤立测试文件
- [ ] 无根目录临时文件：`rm -f nul server.log`

## 重要业务规则

### 棋盘坐标系统
- **9×10网格**: 行(0-9), 列(0-8)
- **红方视角**: 第9行 = 底部，第0行 = 顶部
- **黑方视角**: 第0行 = 底部，第9行 = 顶部

### 关键游戏规则
- **将帅不能照面**: 直接中间无棋子时失败
- **移动限制**: 马蹩腿、象賽象眼、士将不出宫
- **过河规则**: 象不能过河，兵过河可横移
- **将军检测**: 所有移动不能让自己被将军

### 棋谱解析关键点
- **红方路码**: 从右到左数 (1路=8列, 2路=7列...)
- **黑方路码**: 从左到右数 (1路=0列, 2路=1列...)
- **"二路马"**: 红方右边马 (列7)

## CRITICAL：测试失败处理

### 🚨 测试异常响应流
当`npm test`连续失败三次，执行以下应急程序：

1. **立即暂停开发**
   ```bash
   git stash           # 保存当前工作
   git checkout HEAD~1 # 回退到上一个稳定版本
   cd test && npm test # 验证回退版本是否通过
   ```

2. **定位问题**
   - 使用 `npm test -- --verbose` 获取详细错误信息
   - 隔离测试：`npm test tests/[具体模块].test.js`
   - 分析问题类型（规则、UI、兼容性）

3. **保守恢复**
   - **P0阻塞问题**：重写核心功能，添加防御性测试
   - **功能逻辑错误**：逐项验证受影响功能
   - **UI显示问题**：检查DOM操作兼容性

4. **验证复原**
   ```bash
   npm test                   # 验证修复
   npm run dev:watch         # 连续验证模式（30分钟）
   git commit -m "fix: [具体修复描述]"
   ```

> ⚠️ **不得提交任何测试失败的代码到主分支**

---

**记住**：这是一个零依赖的独立Web应用，优先保护现有功能，渐进式增量开发。所有优雅的开发方案必须建立在稳定的测试基础之上。

## 自动化测试体系

### 🧪 测试架构
- **框架**: Jest + JSDOM 模拟浏览器环境
- **覆盖度**: 67个测试用例涵盖核心功能
- **测试类型**: 单元测试、集成测试、UI交互测试

### 📋 测试分类
```
核心功能测试（8个测试文件）
├── board-initialization.test.js      # 棋盘初始化
├── piece-movement.test.js           # 棋子移动规则
├── xiangqi-rules.test.js           # 中国象棋规则
├── capture-check.test.js           # 吃子将军检测
├── famous-games.test.js            # 经典名局测试
├── chess-notation-parser.test.js   # 棋谱记谱法解析
├── audio-system.test.js           # 音效系统
└── game-demonstration.test.js     # 🆕 棋谱播放演示
```

### 🎯 测试用例清单
**每次提交前自动验证：**

#### 🎮 游戏功能测试（25个测试）
- 棋盘初始布局正确
- 棋子移动符合规则
- 将军检测准确
- 吃子逻辑正常
- 胜利判定正确

#### 📜 棋谱功能测试（20个测试）
- 棋谱记谱法解析
- 多格式兼容处理
- 步骤播放控制
- 棋演示模式切换
- 历史步骤导航

#### 🔔 音频系统测试（8个测试）
- AudioContext初始化
- 多种音效播放
- 音量控制功能
- 错误处理机制

#### 🎛️ UI交互测试（14个测试）
- 棋子选择高亮
- 移动指示器显示
- 坐标系统准确性
- 响应式布局

### 🚀 执行测试
```bash
# 完整测试套件（推荐）
cd test && npm test

# 特定功能测试
cd test && npm test tests/chess-notation-parser.test.js
cd test && npm test tests/game-demonstration.test.js

# 持续测试模式
cd test && npm test -- --watch
```

## 特殊开发说明

### 棋谱相关开发
- **数据格式**: 必须兼容现有 `classic_openings.json` 和 `standard-openings.json`
- **解析器**: 新增格式需要在 `ChessNotationParser` 中实现
- **播放系统**: 使用 `loadAndPlayClassicGame*` 方法体系
- **步骤导航**: 基于 `playToStep` 和 `updateRecordStepsDisplay`

### 音频系统开发
- **环境处理**: 自动优雅跳过测试环境
- **API**: AudioContext 可用性检测
- **音效类型**: pieceMove, pieceCapture, pieceSelect, check, victory

### CSS 样式开发
- **响应式优先**: 移动端适应性
- **模块化**: 按功能区域组织样式
- **状态样式**: 使用类名切换而非直接样式修改

---

**记住**: 这是一个无构建步骤的独立应用，更改可直接在浏览器中验证。优先保护现有功能，渐进式开发新特性。