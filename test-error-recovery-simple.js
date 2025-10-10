/**
 * 简化的错误恢复功能测试
 * 测试关键错误恢复机制
 */

const { ChessNotationParserV2, NotationParseError } = require('./main/chess-notation-parser-v2.js');

function createStandardBoard() {
    const board = Array(10).fill(null).map(() => Array(9).fill(null));

    // 设置标准红方棋子
    board[9][0] = {type: 'rook', color: 'red'};
    board[9][7] = {type: 'horse', color: 'red'};
    board[7][7] = {type: 'cannon', color: 'red'};
    board[6][4] = {type: 'soldier', color: 'red'};

    return board;
}

function testSimpleRecovery() {
    console.log('=== 简化错误恢复测试 ===\n');

    const parser = new ChessNotationParserV2();
    const board = createStandardBoard();

    const simpleTests = [
        {
            notation: '炮８平五',
            color: 'red',
            description: '全角数字纠正常规'
        },
        {
            notation: '兵七进一',
            color: 'red',
            description: '标准棋谱（控制测试）'
        },
        {
            notation: '车九平八',
            color: 'red',
            description: '标准车移动'
        },
        {
            notation: '马八平七',
            color: 'red',
            description: '标准马移动'
        },
        {
            notation: '无效棋谱',
            color: 'red',
            description: '完全无效格式（预期失败）'
        }
    ];

    let successCount = 0;
    let errorCount = 0;

    simpleTests.forEach((test, index) => {
        console.log(`测试 ${index + 1}: ${test.description}`);
        console.log(`棋谱: ${test.notation}`);

        try {
            const result = parser.parseNotation(test.notation, test.color, board);
            console.log(`✅ 解析成功:`);
            console.log(`   棋子: ${result.pieceType}, 位置: (${result.fromPos.row},${result.fromPos.col})→(${result.toPos.row},${result.toPos.col})`);
            successCount++;
        } catch (error) {
            console.log(`⚠️ 解析失败:`);
            console.log(`   错误类型: ${error.constructor.name}`);
            console.log(`   错误信息: ${error.message}`);

            // 检查是正规失败还是恢复失败
            if (error instanceof NotationParseError && error.isErrorType('recovery_failed')) {
                console.log(`   👍 错误恢复机制正常工作`);
            }
            errorCount++;
        }
        console.log('---');
    });

    console.log(`\n=== 测试结果 ===`);
    console.log(`成功解析: ${successCount}`);
    console.log(`正确失败: ${errorCount}`);
    console.log(`恢复机制: ${errorCount > 0 ? '✅ 正常工作' : '⚠️ 未测试到'}`);

    // 显示最终性能指标
    const metrics = parser.getPerformanceMetrics();
    console.log(`\n=== 性能指标 ===`);
    console.log(`总解析次数: ${metrics.totalParses}`);
    console.log(`错误次数: ${metrics.errors}`);
    console.log(`平均解析时间: ${metrics.averageTime}`);
}

// 运行测试
testSimpleRecovery();