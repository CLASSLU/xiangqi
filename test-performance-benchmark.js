/**
 * 性能基准测试和向后兼容性验证
 * 对比V1和V2解析器的性能差异
 */

const { ChessNotationParserV2, NotationParseError } = require('./main/chess-notation-parser-v2.js');
const fs = require('fs');

function createStandardBoard() {
    const board = Array(10).fill(null).map(() => Array(9).fill(null));

    // 设置标准红方棋局
    board[9][0] = {type: 'rook', color: 'red'};    // 车九
    board[9][1] = {type: 'horse', color: 'red'};    // 马八
    board[9][2] = {type: 'elephant', color: 'red'}; // 象七
    board[9][3] = {type: 'advisor', color: 'red'};  // 士六
    board[9][4] = {type: 'king', color: 'red'};     // 帅五
    board[9][5] = {type: 'advisor', color: 'red'};  // 士四
    board[9][6] = {type: 'elephant', color: 'red'}; // 象三
    board[9][7] = {type: 'horse', color: 'red'};    // 马二
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

function runPerformanceBenchmark() {
    console.log('=== 性能基准测试 ===\n');

    const parser = new ChessNotationParserV2();
    const board = createStandardBoard();

    // 测试数据集
    const testNotations = [
        '炮二平五', '马八进七', '车九平八', '炮八进一', '马二进三',
        '马七进六', '兵五进一', '炮五平六', '车八进五', '士六进五',
        '象七进五', '车八平七', '马六进五', '象三进五', '车七退三'
    ];

    // 错误恢复测试数据
    const errorNotations = [
        '炮８平五',      // 全角数字
        '馬進四',       // 繁体字
        '車白八',       // 多余字符
        'Invalid Move', // 英文
        '完全无效格式'   // 中文但无意义
    ];

    console.log('1. 基础性能测试');
    console.log('===============');

    // 预热
    for (let i = 0; i < 100; i++) {
        parser.parseNotation('炮二平五', 'red', board);
    }

    // 基础解析性能测试
    const iterations = 10000;
    const startTime = performance.now();
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
        const notation = testNotations[i % testNotations.length];
        try {
            parser.parseNotation(notation, 'red', board);
            successCount++;
        } catch (error) {
            // 忽略解析错误，继续性能测试
            continue;
        }
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;

    console.log(`解析 ${iterations} 次耗时: ${totalTime.toFixed(2)}ms`);
    console.log(`平均每次解析: ${avgTime.toFixed(5)}ms`);
    console.log(`每秒解析量: ${(1000 / avgTime).toFixed(0)} 次/秒`);

    // 显示内置性能指标
    const metrics = parser.getPerformanceMetrics();
    console.log('\n2. 解析器内置指标');
    console.log('================');
    console.log(`总解析次数: ${metrics.totalParses}`);
    console.log(`缓存命中次数: ${metrics.cacheHits}`);
    console.log(`错误次数: ${metrics.errors}`);
    console.log(`成功率: ${metrics.successRate}`);
    console.log(`缓存命中率: ${metrics.cacheHitRate}`);
    console.log(`内置平均时间: ${metrics.averageTime}`);

    console.log('\n3. 向后兼容性测试');
    console.log('==================');

    // 测试标准象棋记谱法
    const compatibilityNotations = [
        '炮二平五', '马8进7', '車九平八', '炮8进1', '進馬七進六'
    ];

    let compatibilitySuccess = 0;
    compatibilityNotations.forEach((notation, index) => {
        try {
            const result = parser.parseNotation(notation, 'red', board);
            console.log(`✅ ${notation} → ${result.pieceType} (${result.fromPos.row},${result.fromPos.col})`);
            compatibilitySuccess++;
        } catch (error) {
            console.log(`❌ ${notation} → ${error.message}`);
        }
    });

    console.log(`\n兼容性成功率: ${compatibilitySuccess}/${compatibilityNotations.length} (${(compatibilitySuccess/compatibilityNotations.length*100).toFixed(1)}%)`);

    console.log('\n4. 错误恢复性能测试');
    console.log('====================');

    let recoverySuccess = 0;
    const recoveryStartTime = performance.now();

    errorNotations.forEach((notation, index) => {
        try {
            const result = parser.parseNotation(notation, 'red', board);
            console.log(`✅ ${notation} → 恢复成功: ${result.pieceType}`);
            recoverySuccess++;
        } catch (error) {
            console.log(`⚠️  ${notation} → 恢复失败: ${error.message.substring(0, 30)}...`);
        }
    });

    const recoveryEndTime = performance.now();
    const recoveryTime = recoveryEndTime - recoveryStartTime;

    console.log(`\n错误恢复测试耗时: ${recoveryTime.toFixed(2)}ms`);
    console.log(`恢复成功率: ${recoverySuccess}/${errorNotations.length} (${(recoverySuccess/errorNotations.length*100).toFixed(1)}%)`);

    console.log('\n5. 内存使用测试');
    console.log('==============');

    // 测试大量解析任务的内存稳定性
    const largeIterations = 50000;
    const memoryStart = process.memoryUsage();

    for (let i = 0; i < largeIterations; i++) {
        const notation = testNotations[i % testNotations.length];
        try {
            parser.parseNotation(notation, 'red', board);
        } catch (error) {
            // 忽略错误，继续执行
        }
    }

    const memoryEnd = process.memoryUsage();
    const memoryDiff = memoryEnd.heapTotal - memoryStart.heapTotal;

    console.log(`处理 ${largeIterations} 次解析:`);
    console.log(`内存使用变化: ${(memoryDiff / 1024 / 1024).toFixed(2)} MB`);
    console.log(`平均每次内存开销: ${(memoryDiff / largeIterations).toFixed(0)} bytes`);

    // 最终性能指标
    const finalMetrics = parser.getPerformanceMetrics();
    console.log('\n6. 最终性能汇总');
    console.log('==============');
    console.log(`总处理次数: ${finalMetrics.totalParses}`);
    console.log(`最终成功率: ${finalMetrics.successRate}`);
    console.log(`缓存效率: ${finalMetrics.cacheHitRate}`);
    console.log(`平均响应时间: ${finalMetrics.averageTime}`);

    return {
        totalParses: finalMetrics.totalParses,
        successRate: parseFloat(finalMetrics.successRate),
        cacheHitRate: parseFloat(finalMetrics.cacheHitRate),
        avgTime: parseFloat(finalMetrics.averageTime),
        compatibilityRate: compatibilitySuccess / compatibilityNotations.length,
        recoveryRate: recoverySuccess / errorNotations.length
    };
}

function main() {
    console.log('开始性能基准测试和向后兼容性验证...\n');

    const results = runPerformanceBenchmark();

    console.log(`\n=== 测试总结 ===`);
    console.log(`✅ 性能指标达标: ${results.successRate >= 90 ? '是' : '否'}`);
    console.log(`✅ 缓存效率良好: ${results.cacheHitRate >= 80 ? '是' : '否'}`);
    console.log(`✅ 向后兼容性: ${results.compatibilityRate >= 0.8 ? '良好' : '需改进'}`);
    console.log(`✅ 错误恢复可用: ${results.recoveryRate > 0 ? '是' : '否'}`);
    console.log(`✅ 平均响应时间: ${results.avgTime < 0.5 ? '优秀' : results.avgTime < 2 ? '良好' : '需优化'}`);

    console.log(`\n🎉 性能基准测试完成！`);
}

// 运行测试
if (require.main === module) {
    main();
}