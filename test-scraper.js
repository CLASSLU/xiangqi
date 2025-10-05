// 测试脚本 - 验证棋谱系列功能
const fs = require('fs');
const path = require('path');

// 模拟浏览器环境
global.document = {
    getElementById: () => ({
        innerHTML: '',
        appendChild: () => {},
        querySelectorAll: () => [],
        classList: {
            add: () => {},
            remove: () => {}
        }
    }),
    querySelector: () => null,
    querySelectorAll: () => []
};

// 导入游戏类
const { XiangqiGame } = require('./main/chess.js');

// 创建测试实例
const game = new XiangqiGame();

// 测试系列名称提取
console.log('测试系列名称提取:');
const testTitles = [
    '中炮对屏风马经典对局',
    '胡荣华vs许银川全国象棋个人赛',
    '2023象棋大师赛决赛',
    '顺炮横车对直车布局',
    '仙人指路对卒底炮'
];

testTitles.forEach(title => {
    const seriesName = game.extractSeriesName(title);
    console.log(`  "${title}" -> "${seriesName}"`);
});

// 测试分组功能
console.log('\n测试棋谱分组:');
const testGames = [
    { title: '中炮对屏风马经典对局1', moves: [] },
    { title: '中炮对屏风马经典对局2', moves: [] },
    { title: '胡荣华vs许银川全国象棋个人赛', moves: [] },
    { title: '顺炮横车对直车布局', moves: [] },
    { title: '仙人指路对卒底炮2023', moves: [] }
];

const groupedSeries = game.groupGamesIntoSeries(testGames);
console.log('分组结果:', groupedSeries.map(s => ({ name: s.name, count: s.count })));

console.log('\n测试完成！');
