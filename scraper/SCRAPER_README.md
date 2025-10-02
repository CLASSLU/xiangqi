# 中国象棋棋谱爬虫模块使用说明

## 概述

`scraper.js` 是一个专门为中国象棋项目设计的棋谱爬虫模块，用于从 https://www.xqipu.com/qipus 网站爬取棋谱数据并保存为本地文件。

## 功能特点

- ✅ **自动棋谱爬取**: 从网站获取棋谱列表和详细信息
- ✅ **棋步解析**: 解析标准象棋记谱格式（如"炮八平五"、"马2进3"）
- ✅ **格式转换**: 转换为项目所需的标准JSON格式
- ✅ **本地存储**: 自动保存棋谱数据到 `qipu-data/` 目录
- ✅ **批量处理**: 支持批量爬取多个棋谱
- ✅ **错误处理**: 完善的异常处理机制
- ✅ **防封机制**: 自动添加延迟避免被网站封禁

## 安装依赖

本爬虫使用 Node.js 原生模块，无需额外安装依赖：

```bash
# 只需确保有 Node.js 环境
node --version  # 建议使用 v14+
```

## 快速使用

### 1. 基本爬虫调用

```javascript
const XiangqiScraper = require('./scraper');

const scraper = new XiangqiScraper();

// 爬取个棋谱（推荐用于测试）
scraper.crawlMultipleQipus(5)
    .then(results => {
        console.log(`成功爬取 ${results.length} 个棋谱`);
        results.forEach(result => {
            console.log(`${result.title}: ${result.movesCount} 步`);
        });
    })
    .catch(error => console.error('爬取失败:', error));
```

### 2. 分步调用（更灵活）

```javascript
const scraper = new XiangqiScraper();

// 获取棋谱列表
const qipus = await scraper.crawlQipuList();
console.log(`找到 ${qipus.length} 个棋谱`);

// 爬取第一个棋谱详情
const detailData = await scraper.crawlQipuDetail(qipus[0]);
console.log(`棋谱详情: ${detailData.title}, 共 ${detailData.moves.length} 步`);

// 保存到本地文件
const filepath = scraper.saveQipuToFile(detailData);
console.log(`保存位置: ${filepath}`);

// 转换为项目格式
const converted = scraper.convertToProjectFormat(detailData);
```

## 输出格式

爬取的棋谱会保存为 JSON 文件，包含以下信息：

```json
{
  "id": "4d825674-6feb-4692-b2eb-cf20cf871207",
  "title": "张子洪 先负 邓英楠",
  "url": "https://www.xqipu.com/qipu/4d825674-6feb-4692-b2eb-cf20cf871207",
  "redPlayer": "张子洪",
  "blackPlayer": "邓英楠",
  "result": "先负",
  "winner": "邓英楠",
  "moves": [
    {
      "step": 1,
      "move": "炮八平五",
      "player": "red",
      "fullText": "炮八平五"
    },
    // ... 更多棋步
  ],
  "totalMoves": 214,
  "crawledAt": "2024-01-20T10:30:00.000Z"
}
```

### 项目集成格式

转换为游戏项目所需的格式：

```json
{
  "张子洪 先负 邓英楠": [
    ["red", "cannon", [0, 0], [0, 0], "炮八平五"],
    ["black", "horse", [0, 0], [0, 0], "马2进3"],
    // ... 更多步骤
  ]
}
```

## 棋步解析

爬虫能够解析以下标准象棋记谱格式：

| 棋步格式 | 示例 | 说明 |
|---------|------|------|
| 中文数字 | 炮八平五 | 传统中文记谱法 |
| 阿拉伯数字 | 马2进3 | 标准象棋记谱 |
| 兵卒移动 | 卒3进1 | 小兵过河等 |
| 车马炮 | 车1平2，马八进七 | 常见棋子移动 |

### 棋子映射

```javascript
{
  '车'/'车' -> 'rook',
  '馬'/'马' -> 'horse',
  '象'/'相' -> 'elephant',
  '士'/'仕' -> 'advisor',
  '将'/'帅' -> 'king',
  '砲'/'炮' -> 'cannon',
  '卒'/'兵' -> 'soldier'
}
```

## 使用方法详解

### 自定义参数

```javascript
const scraper = new XiangqiScraper({
    delay: 3000,        // 请求间隔（毫秒）
    outputDir: './my-qipus',  // 输出目录
    maxRetries: 5       // 最大重试次数
});
```

### 批量爬取控制

```javascript
// 爬取前10个棋谱
await scraper.crawlMultipleQipus(10);

// 生成摘要报告
const report = scraper.generateReport(results);
console.log(`总共 ${report.totalQipus} 个棋谱，${report.totalMoves} 步`);
```

### 异常处理

```javascript
scraper.crawlMultipleQipus(10)
    .then(results => handleSuccess(results))
    .catch(error => {
        console.error('爬取失败:', error.message);
        // 可能的错误类型
        if (error.message.includes('HTTP')) {
            // 网络错误
        } else if (error.message.includes('解析')) {
            // 页面结构解析错误
        }
    });
```

## 保存位置

爬取的数据默认保存在 `qipu-data/` 目录中：

```
xingqi/
├── qipu-data/
│   ├── scraping_report.json      # 爬取报告
│   └── [id]_[title].json         # 各棋谱数据文件
```

## 测试模块

使用 `test-scraper.js` 进行功能测试：

```bash
node test-scraper.js
```

测试内容包括：
- 棋谱列表爬取
- 单个棋谱详情爬取
- 数据保存
- 格式转换

## 注意事项

1. **访问频率**: 自动添加2秒延迟，避免被封IP
2. **法律合规**: 仅用于学习和研究目的
3. **数据准确性**: 棋步位置为简化计算，精确度有限
4. **网站变化**: 如果目标网站结构变化，爬虫可能需要调整

## 扩展功能

### 添加到现有棋谱

```javascript
const currentData = require('../main/classic_openings.json');
const newData = scraper.convertToProjectFormat(qipuData);

// 合并数据
Object.assign(currentData, newData);

// 保存回文件
fs.writeFileSync('./classic_openings.json', JSON.stringify(currentData, null, 2));
```

### 自定义过滤

```javascript
// 只保存超过100步的棋谱
const filteredQipus = qipus.filter(q => q.moves.length > 100);
filteredQipus.forEach(qipu => {
    scraper.saveQipuToFile(qipu);
});
```

## 技术特点

- **纯 Node.js 实现**：使用原生模块，无需额外依赖
- **异步处理**：使用 Promise 和 async/await
- **错误恢复**：遇到错误可继续处理其他棋谱
- **数据验证**：对爬取数据进行格式验证
- **标识化**: 使用 UUID 标识每个爬取的棋谱

## 支持

如遇到问题，请检查：
1. Node.js 版本兼容性
2. 网络连接稳定性
3. 目标网站是否变更
4. 输出目录权限