// 测试脚本 - 验证爬虫功能
const fs = require('fs');
const { CompleteGameScraper } = require('./complete-scraper.js');

async function testScraper() {
    console.log('🧪 开始测试爬虫功能...\n');

    const scraper = new CompleteGameScraper();
    
    // 测试系列名称提取
    console.log('📝 测试系列名称提取:');
    const testTitles = [
        '中炮对屏风马经典对局',
        '胡荣华vs许银川全国象棋个人赛',
        '2023象棋大师赛决赛',
        '顺炮横车对直车布局',
        '仙人指路对卒底炮'
    ];

    testTitles.forEach(title => {
        const seriesName = scraper.extractSeriesName(title);
        console.log(`  "${title}" -> "${seriesName}"`);
    });

    // 测试棋谱移动转换
    console.log('\n🎯 测试棋谱移动转换:');
    const testMoves = [
        '炮二平五', '马8进7', '马二进三', '车9平8', '车一平二'
    ];
    
    try {
        const convertedMoves = scraper.convertMovesToGameFormat(testMoves);
        console.log(`  转换 ${testMoves.length} 个移动步骤:`);
        convertedMoves.forEach((move, index) => {
            console.log(`  ${index + 1}. ${testMoves[index]} -> ${move[0]} ${move[1]} [${move[2]}]->[${move[3]}]`);
        });
    } catch (error) {
        console.log(`  移动转换失败: ${error.message}`);
    }

    // 测试棋谱格式转换
    console.log('\n📊 测试棋谱格式转换:');
    const testGames = [
        {
            title: '测试棋谱1',
            moves: ['炮二平五', '马8进7', '马二进三'],
            playerRed: '红方选手',
            playerBlack: '黑方选手',
            result: '红胜',
            event: '测试赛事',
            date: '2023-01-01'
        },
        {
            title: '测试棋谱2',
            moves: ['兵七进一', '炮2平3', '相三进五'],
            playerRed: '选手A',
            playerBlack: '选手B',
            result: '和棋',
            event: '另一个赛事',
            date: '2023-01-02'
        }
    ];

    const convertedGames = scraper.convertToGameFormat(testGames);
    console.log(`  转换 ${testGames.length} 个棋谱，成功 ${Object.keys(convertedGames).length} 个`);
    Object.entries(convertedGames).forEach(([name, game], index) => {
        console.log(`  ${index + 1}. ${name}: ${game.moves.length} 步, 系列: ${game.seriesName}`);
    });

    // 测试文件保存
    console.log('\n💾 测试文件保存功能...');
    try {
        const testData = {
            games: testGames,
            summary: {
                total: testGames.length,
                success: testGames.length,
                failed: 0
            }
        };
        
        const testFilePath = './test_output.json';
        fs.writeFileSync(testFilePath, JSON.stringify(testData, null, 2));
        console.log(`  ✅ 测试文件已保存: ${testFilePath}`);
        
        // 清理测试文件
        fs.unlinkSync(testFilePath);
        console.log('  ✅ 测试文件已清理');
    } catch (error) {
        console.log(`  ❌ 文件保存测试失败: ${error.message}`);
    }

    console.log('\n🎉 爬虫功能测试完成！');
}

// 运行测试
testScraper().catch(console.error);
