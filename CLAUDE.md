# CLAUDE.md

本文件为 Claude Code（claude.ai/code）在处理本仓库代码时提供指导。

## 项目概述

这是一个功能完整的中国象棋（Xiangqi）游戏，使用原生 HTML、CSS 和 JavaScript 实现。游戏具有真实的木质棋子音效、经典开局演示功能和响应式设计，无任何外部依赖。项目同时包含棋谱爬虫功能，可以从在线资源获取棋谱数据并集成到游戏中。

## 关键开发命令

### 测试命令
```bash
# 安装依赖（首次运行）
cd test && npm install

# 运行所有测试
cd test && npm test

# 监听模式运行测试
cd test && npm run test:watch

# 生成测试覆盖率报告
cd test && npm run test:coverage
```

### 开发环境设置
```bash
# 语法检查主游戏文件
node -c main/chess.js

# 启动本地服务器（如需要）
python -m http.server 8000
# 或
npm install -g http-server
http-server main/

# 直接在浏览器中打开游戏
open main/index.html
```

### 爬虫功能
```bash
# 运行棋谱爬虫
cd scraper && node complete-scraper.js
```

## 项目架构概览

### 目录结构组织

```
xiangqi/
├── 📖 README.md              # 项目说明（根目录）
├── 📖 CLAUDE.md              # 开发指导（根目录）
│
├── 🎮 main/                 # 核心游戏模块
│   ├── index.html          # 游戏主页面
│   ├── chess.js            # 游戏主逻辑
│   ├── style.css           # 样式文件
│   ├── audio-manager.js    # 音频管理器
│   ├── classic_openings.json # 经典开局数据
│   └── data/               # 游戏数据目录
│       ├── qipu-games/    # 棋谱文件
│       └── database/      # 数据库文件
│
├── 🕷️ scraper/             # 爬虫功能模块
│   ├── complete-scraper.js # 完整爬虫
│   └── SCRAPER_README.md   # 爬虫文档
│
└── 🧪 test/                # 测试开发模块
    ├── package.json        # 项目配置
    ├── jest.config.js      # Jest配置
    ├── jest.setup.js       # 测试环境设置
    ├── mock-browser-env.js # 浏览器环境模拟
    └── tests/              # 具体测试文件
```

### 核心文件职责

- **`main/index.html`** - 游戏结构和UI布局，包含嵌入的JavaScript用于棋谱面板交互
- **`main/chess.js`** - 游戏主逻辑（~69KB），包含`XiangqiGame`类，负责棋盘渲染、棋子移动规则和游戏状态管理
- **`main/style.css`** - 完整样式，包括响应式设计、棋盘绘制和棋子样式（~16KB）
- **`main/audio-manager.js`** - 使用Web Audio API进行程序化音频生成，实现真实的木质棋子音效
- **`main/classic_openings.json`** - 经典棋局记录，包括四大名局和著名开局
- **`scraper/complete-scraper.js`** - 棋谱爬虫，从xqipu.com网站获取棋谱数据

### 游戏架构模式

1. **基于类的设计**：主要游戏逻辑在`XiangqiGame`类中实现，包含棋盘初始化、棋子移动和游戏状态管理方法

2. **事件驱动UI**：游戏交互通过DOM事件处理，为棋子选择、移动和UI控件提供适当的事件监听器

3. **测试环境感知**：代码包含`typeof document !== 'undefined'`等检查，以处理浏览器和Node.js（Jest）环境

4. **数据属性系统**：棋子和棋盘单元格使用数据属性（`data-color`、`data-type`、`data-row`、`data-col`）进行状态管理和移动验证

5. **音频上下文处理**：音频管理器通过检查`window.AudioContext`可用性来优雅地处理测试环境

### 棋盘结构和坐标

- **网格系统**：9×10棋盘，70px单元格，绝对定位渲染
- **坐标系统**：行(0-9)，列(0-8)映射到传统象棋记谱法
- **河界位置**：在第4行和第5行之间（楚河汉界）
- **宫殿区域**：红方宫殿（行7-9，列3-5），黑方宫殿（行0-2，列3-5）

### 游戏状态管理

- **阶段系统**：`gamePhase`属性管理不同状态（playing、gameRecord、demonstration）
- **移动历史**：`moveHistory`数组跟踪所有移动以支持悔棋功能
- **棋子跟踪**：`pieces`数组维护所有活动棋子，`capturedRed`/`capturedBlack`跟踪被吃棋子
- **当前玩家**：`currentPlayer`在'red'和'black'之间交替

## 爬虫架构

### 爬虫功能概述

- **目标网站**：xqipu.com (https://www.xqipu.com)
- **数据格式**：JSON格式棋谱数据，包含移动序列和元数据
- **输出目录**：棋谱数据保存到`main/data/qipu-games/`目录
- **数据处理**：提供格式转换功能，将爬取数据转换为项目可用格式

### 爬虫开发指南

1. **使用爬虫**：`cd scraper && node complete-scraper.js`
2. **数据集成**：爬取的棋谱数据可自动集成到游戏的经典棋谱功能中
3. **扩展功能**：可基于现有爬虫框架添加更多数据源或功能
4. **错误处理**：爬虫包含完善的错误处理和重试机制

### 数据管理

- **棋谱存储**：`main/data/qipu-games/` - 存储具体的棋谱文件
- **数据库存储**：`main/data/database/` - 存储处理后的结构化数据
- **格式转换**：提供爬取数据到游戏格式的转换工具
- **数据验证**：包含数据完整性验证机制

## 测试架构

### 测试环境设置

测试使用JSDOM模拟浏览器环境和Jest框架。关键模拟设置：

- **`test/jest.config.js`** - 配置JSDOM环境和设置文件
- **`test/jest.setup.js`** - 处理Node.js的TextEncoder/TextDecoder polyfill
- **`test/mock-browser-env.js`** - 全面模拟浏览器API，包括AudioContext和DOM

### 测试分类

1. **board-initialization.test.js** - 棋盘创建、棋子放置和初始化验证
2. **piece-movement.test.js** - 所有棋子移动规则（帅将、士仕、象相、马、车、炮、兵卒）
3. **capture-check.test.js** - 吃子机制、将军检测和游戏结束条件
4. **famous-games.test.js** - 经典棋局加载和演示
5. **audio-system.test.js** - 音频生成和播放功能
6. **ui-interaction.test.js** - 按钮功能和UI交互

### 关键测试模式

- **beforeEach/afterEach** - 为每个测试清理游戏状态
- **DOM模拟** - 为棋盘和UI元素创建虚拟DOM
- **直接方法测试** - 直接调用游戏方法进行验证
- **状态验证** - 通过属性和DOM检查游戏状态

## 重要开发说明

### 代码风格和约定

- **中文注释**：游戏逻辑包含中文注释以保持清晰性
- **无外部依赖**：纯原生JavaScript实现
- **ES6类**：现代基于类的架构
- **一致命名**：清晰、描述性的方法和变量名

### 关键业务规则

1. **棋子移动验证**：每个棋子都有特定的移动规则，包括特殊情况如蹩马腿和蹩象腿

2. **宫殿限制**：帅/将和士/仕移动仅限于宫殿区域
3. **过河规则**：象/相不能过河，兵/卒过河后获得横向移动能力
4. **将帅照面**：帅将不能照面（ kings cannot face each other directly）
5. **将军验证**：所有移动都不能使王处于将军状态

### 音频系统

- **Web Audio API**：程序化生成真实的木质声音
- **环境处理**：在测试环境中优雅地跳过音频
- **音量控制**：背景音乐和音效的独立控制
- **声音类型**：pieceMove、pieceCapture、pieceSelect、check、victory声音

### 爬虫开发规范

1. **数据源规范**：统一使用xqipu.com作为主要数据源
2. **数据格式**：遵循项目定义的JSON格式标准
3. **错误处理**：完善的网络错误和数据解析错误处理
4. **性能优化**：适当的请求频率限制和数据缓存机制

### 常见开发任务

1. **添加新功能**：更新`main/chess.js`处理逻辑，`main/style.css`处理UI，`main/index.html`如需要
2. **修复Bug**：确保在所有测试套件中进行全面测试
3. **声音修改**：修改`main/audio-manager.js`声音生成方法
4. **棋局记录**：向`main/classic_openings.json`添加新开局
5. **爬虫扩展**：在`scraper/complete-scraper.js`基础上添加新功能

### 开发流程规范

1. **功能开发**：在对应模块目录下进行开发
   - 游戏功能：`main/`目录
   - 爬虫功能：`scraper/`目录
   - 测试开发：`test/`目录

2. **测试要求**：
   - 所有代码更改必须通过完整测试套件：`cd test && npm test`
   - 浏览器中无控制台错误
   - 手动验证游戏功能
   - 跨浏览器基本功能性（Chrome、Firefox、Edge）

3. **文档维护**：
   - 重大功能更新需要同步更新CLAUDE.md
   - 用户界面变更需要更新README.md
   - 爬虫功能变更需要更新SCRAPER_README.md

## 测试要求

**所有代码更改必须通过：**
- 完整测试套件：`cd test && npm test`
- 浏览器中无控制台错误
- 手动验证游戏功能
- 跨浏览器基本功能性（Chrome、Firefox、Edge）

**记住**：这是一个独立应用程序，无构建步骤。更改可通过在浏览器中打开`main/index.html`立即使用。

## 爬虫集成指南

项目设计的最终目标是将爬虫获取的棋谱数据无缝集成到游戏演示功能中：

1. **数据流程**：爬虫 → 数据存储 → 游戏加载 → 用户演示
2. **集成点**：`main/classic_openings.json`和`main/data/`目录
3. **演示功能**：游戏内置的棋谱演示系统支持加载和播放爬取的棋谱
4. **扩展性**：架构支持添加更多数据源和演示模式