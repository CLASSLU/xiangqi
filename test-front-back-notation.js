/**
 * 前后记法测试脚本
 * 测试 ChessNotationParserV2 对前后记法的支持
 */

const fs = require('fs');
const path = require('path');

// 导入解析器
const { ChessNotationParserV2 } = require('./main/chess-notation-parser-v2.js');

function createTestBoard() {
    const board = Array(10).fill(null).map(() => Array(9).fill(null));

    // 创建一个有多个相同棋子的测试棋盘
    // 红方双炮在同一路（第2路）
    board[7][1] = {type: 'cannon', color: 'red'}; // 前炮
    board[5][1] = {type: 'cannon', color: 'red'}; // 后炮

    // 红方双马在同一路（第3路）
    board[9][2] = {type: 'horse', color: 'red'};  // 前马
    board[7][2] = {type: 'horse', color: 'red'};  // 后马

    // 黑方双车在同一路（第8路）
    board[0][7] = {type: 'rook', color: 'black'};  // 前车
    board[2][7] = {type: 'rook', color: 'black'};  // 后车

    return board;
}

function testFrontBackNotation() {
    console.log('=== 前后记法测试 ===\n');

    const parser = new ChessNotationParserV2();
    const board = createTestBoard();

    const testCases = [
        // 红方前后记法测试
        {notation: '前炮进一', color: 'red', description: '红方前炮进一'},
        {notation: '后炮进二', color: 'red', description: '红方后炮进二'},
        {notation: '前马平六', color: 'red', description: '红方前马平六（第3路→第6路）'},
        {notation: '后马进五', color: 'red', description: '红方后马进五（第3路→第5路，日字移动）'},

        // 黑方前后记法测试
        {notation: '前车平七', color: 'black', description: '黑方前车平七（避免越界）'},
        {notation: '后车进一', color: 'black', description: '黑方后车进一'},

        // 传统格式对比测试
        {notation: '炮八进一', color: 'red', description: '红方炮八进一（传统，修正路码）'},
        {notation: '马七平六', color: 'red', description: '红方马七平六（传统，修正路码）'},
    ];

    let passedTests = 0;
    let totalTests = testCases.length;

    testCases.forEach((testCase, index) => {
        console.log(`测试 ${index + 1}: ${testCase.description}`);
        console.log(`棋谱: ${testCase.notation} (${testCase.color})`);

        try {
            const result = parser.parseNotation(testCase.notation, testCase.color, board);

            console.log(`✅ 解析成功:`);
            console.log(`   棋子类型: ${result.pieceType}`);
            console.log(`   起始位置: (${result.fromPos.row}, ${result.fromPos.col})`);
            console.log(`   目标位置: (${result.toPos.row}, ${result.toPos.col})`);
            console.log(`   动作类型: ${result.action}`);

            passedTests++;

        } catch (error) {
            console.log(`❌ 解析失败: ${error.message}`);

            // 添加调试信息
            console.log(`   调试: 尝试直接匹配正则表达式`);

            // 测试正则表达式匹配
            const patterns = [
                /^([车马炮相仕帅將馬砲兵卒])([一二三四五六七八九1-9]+)([进平退])([一二三四五六七八九1-9]+)$/,
                /^(前|后)?([车马炮相仕帅將馬砲兵卒])([一二三四五六七八九1-9]+)([进平退])([一二三四五六七八九1-9]+)$/,
                /^([一二三四五六七八九1-9]+)路([车马炮相仕帅將馬砲兵卒])([进平退])([一二三四五六七八九1-9]+)$/,
                /^(前|后)?([车马炮相仕帅將馬砲兵卒])([进平退])([一二三四五六七八九1-9]+)$/
            ];

            patterns.forEach((pattern, pIndex) => {
                const match = testCase.notation.match(pattern);
                if (match) {
                    console.log(`   模式${pIndex + 1}匹配成功: ${match.slice(1).join(', ')}`);
                } else {
                    console.log(`   模式${pIndex + 1}匹配失败`);
                }
            });
        }

        console.log('---');
    });

    console.log(`\n=== 测试结果汇总 ===`);
    console.log(`总测试数: ${totalTests}`);
    console.log(`通过测试: ${passedTests}`);
    console.log(`失败测试: ${totalTests - passedTests}`);
    console.log(`成功率: ${(passedTests / totalTests * 100).toFixed(1)}%`);

    if (passedTests === totalTests) {
        console.log('🎉 所有测试通过！');
    } else {
        console.log('⚠️  部分测试失败，需要修复正则表达式模式');
    }
}

// 运行测试
if (require.main === module) {
    testFrontBackNotation();
}

module.exports = {testFrontBackNotation, createTestBoard};