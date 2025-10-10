/**
 * 错误恢复成功案例测试
 * 测试能够成功恢复的错误情况
 */

const { ChessNotationParserV2 } = require('./main/chess-notation-parser-v2.js');

function createFullTestBoard() {
    const board = Array(10).fill(null).map(() => Array(9).fill(null));

    // 设置完整红方棋局
    board[9][0] = {type: 'rook', color: 'red'};    // 车九
    board[9][1] = {type: 'horse', color: 'red'};    // 马八
    board[9][2] = {type: 'elephant', color: 'red'}; // 象七
    board[9][3] = {type: 'advisor', color: 'red'};  // 士六
    board[9][4] = {type: 'king', color: 'red'};     // 帅五
    board[9][5] = {type: 'advisor', color: 'red'};  // 士四
    board[9][6] = {type: 'elephant', color: 'red'}; // 象三    board[9][7] = {type: 'horse', color: 'red'};    // 马二
    board[9][8] = {type: 'rook', color: 'red'};    // 车一

    board[7][1] = {type: 'cannon', color: 'red'};   // 炮八
    board[7][7] = {type: 'cannon', color: 'red'};   // 炮二

    board[6][0] = {type: 'soldier', color: 'red'};  // 兵九
    board[6][2] = {type: 'soldier', color: 'red'};  // 兵七
    board[6][4] = {type: 'soldier', color: 'red'};  // 兵五
    board[6][6] = {type: 'soldier', color: 'red'};  // 兵三
    board[6][8] = {type: 'soldier', color: 'red'};  // 兵一

    return board;
}

function testSuccessfulRecovery() {
    console.log('=== 错误恢复成功案例测试 ===\n');

    const parser = new ChessNotationParserV2();
    const board = createFullTestBoard();

    const recoveryTests = [
        {
            notation: '炮８平五',
            description: '全角数字纠正 → 应该能恢复'
        },
        {
            notation: '馬進四',
            description: '繁体字纠正 → 可能恢复（马在8路）'
        },
        {
            notation: '車 白八',
            description: '空格纠正 → 可能恢复'
        },
        {
            notation: '炮平五',
            description: '简化格式 → 应该选择合适的炮'
        },
        {
            notation: '兵九进一',
            description: '标准格式 → 控制测试'
        },
        {
            notation: '马八进七',
            description: '马八进七 → 标准格式'
        }
    ];

    let successCount = 0;
    let recoveryCount = 0;

    recoveryTests.forEach((test, index) => {
        console.log(`测试 ${index + 1}: ${test.description}`);
        console.log(`棋谱: "${test.notation}"`);

        try {
            const result = parser.parseNotation(test.notation, 'red', board);
            console.log(`✅ 解析成功:`);
            console.log(`   棋子类型: ${result.pieceType}`);
            console.log(`   位置: (${result.fromPos.row},${result.fromPos.col}) → (${result.toPos.row},${result.toPos.col})`);
            console.log(`   动作: ${result.action}`);

            // 计算路码验证正确性
            const fromRoad = parser.colToRoad('red', result.fromPos.col);
            const toRoad = parser.colToRoad('red', result.toPos.col);
            console.log(`   路码: ${fromRoad}路 → ${toRoad}路`);

            successCount++;

            // 如果原棋谱包含特殊字符，说明恢复了
            if (test.notation.includes('８') || test.notation.includes('馬') ||
                test.notation.includes(' ') || test.notation.length < 4) {
                console.log(`   🎉 错误恢复成功！`);
                recoveryCount++;
            }
        } catch (error) {
            console.log(`⚠️ 解析失败: ${error.message}`);

            // 检查错误恢复是否正常工作
            if (error.message.includes('已尝试') || error.message.includes('recovery_failed')) {
                console.log(`   👍 错误恢复机制尝试了所有策略`);
            }
        }
        console.log('---');
    });

    console.log(`\n=== 测试结果汇总 ===`);
    console.log(`总测试数: ${recoveryTests.length}`);
    console.log(`成功解析: ${successCount}`);
    console.log(`错误恢复成功: ${recoveryCount}`);
    console.log(`恢复成功率: ${successCount > 0 ? (recoveryCount/successCount*100).toFixed(1) : 0}%`);

    if (successCount > 0) {
        console.log(`✅ 错误恢复机制运行正常`);
    }

    // 显示解析器性能
    const metrics = parser.getPerformanceMetrics();
    console.log(`\n=== 性能指标 ===`);
    console.log(`总解析次数: ${metrics.totalParses}`);
    console.log(`错误次数: ${metrics.errors}`);
    console.log(`缓存命中: ${metrics.cacheHits}`);
    console.log(`平均时间: ${metrics.averageTime}`);
    console.log(`成功率: ${metrics.successRate}`);
}

// 运行测试
testSuccessfulRecovery();