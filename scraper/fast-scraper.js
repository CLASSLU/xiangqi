/**
 * 快速棋谱数据爬虫 - 专注大批量数据收集
 * 优化的采集策略和并行处理
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class FastXiangqiScraper {
    constructor() {
        this.baseUrl = 'https://www.xqipu.com';
        this.outputDir = 'fast-database';
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        this.collectedGames = [];
        this.successCount = 0;
        this.failedCount = 0;

        // 更短的延迟
        this.pageDelay = [300, 800];
        this.batchSize = 10; // 更大的批次并行处理
        this.maxRetries = 2; // 减少重试次数

        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        this.startTime = Date.now();
    }

    // 简化的随机延迟
    async randomDelay(min = null, max = null) {
        const delayMin = min || this.pageDelay[0];
        const delayMax = max || this.pageDelay[1];
        const delay = Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    // 快速抓取页面 - 简化错误处理
    async fastFetchPage(urlPath, retries = 0) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'www.xqipu.com',
                port: 443,
                path: urlPath,
                method: 'GET',
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                },
                timeout: 10000 // 更短超时
            };

            const req = https.request(options, (res) => {
                let body = '';

                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    return;
                }

                const stream = res;
                if (res.headers['content-encoding'] && res.headers['content-encoding'].includes('gzip')) {
                    const zlib = require('zlib');
                    const gunzip = zlib.createGunzip();
                    stream.pipe(gunzip);
                    gunzip.on('data', chunk => body += chunk.toString());
                    gunzip.on('end', () => resolve(body));
                    gunzip.on('error', err => reject(err));
                } else {
                    stream.on('data', chunk => body += chunk.toString());
                    stream.on('end', () => resolve(body));
                }
            });

            req.on('error', (error) => {
                if (retries < this.maxRetries) {
                    console.log(`   🔄 重试 ${urlPath} (${retries + 1}/${this.maxRetries})`);
                    this.randomDelay(100, 300).then(() => this.fastFetchPage(urlPath, retries + 1).then(resolve).catch(reject));
                } else {
                    reject(error);
                }
            });

            req.on('timeout', () => {
                req.destroy();
                if (retries < this.maxRetries) {
                    console.log(`   🔄 超时重试 ${urlPath} (${retries + 1}/${this.maxRetries})`);
                    this.randomDelay(100, 300).then(() => this.fastFetchPage(urlPath, retries + 1).then(resolve).catch(reject));
                } else {
                    reject(new Error('请求超时'));
                }
            });

            req.end();
        });
    }

    // 快速提取棋谱列表 - 简化逻辑
    fastExtractGameList(html, source) {
        const games = [];
        const uuidPattern = /href="\/qipu\/([a-f0-9-]{36})"/g;

        let match;
        let count = 0;
        while ((match = uuidPattern.exec(html)) !== null && count < 15) {
            const uuid = match[1];

            // 快速标题提取
            let title = '未知对局';
            const range = 1000;
            const startPos = Math.max(0, match.index - range);
            const endPos = Math.min(html.length, match.index + range);
            const localHtml = html.substring(startPos, endPos);

            // 简单的标题提取
            const titleMatch = localHtml.match(/>([^<]{6,30}对[^<]{6,30})</) || // 包含"对"
                               localHtml.match(/>([^<]*?[^\s]{5,15}\s*对\s*[^\s]{5,15}[^<]*?)<\//) ||
                               localHtml.match(/>([^<]*?先.[胜负和][^<]*?)</) ||
                               localHtml.match(/>([^<]{10,40})</);

            if (titleMatch) {
                title = titleMatch[1].trim().replace(/\s+/g, ' ').slice(0, 80);
             }

            games.push({
                id: uuid,
                title: title,
             url: `/qipu/${uuid}`,
                source: source,
                scraped_at: new Date().toISOString()
            });
            count++;
    }

   return games;
    }

    // 快速棋谱提取 - 简化移动提取
    fastExtractMoves(html) {
        const moves = [];
        const patterns = [
    /([车马炮相仕兵卒帅將馬砲][一二三四五六七八九十]{1,2}[进平退][一二三四五六七八九十]{1,2})/g,
            /([车马炮相仕兵卒帅將馬砲]\d{1,2}[进平退]\d{1,2})/g
]

        for (let pattern of patterns) {
      const matches = html.match(pattern);
          if (matches && matches.length >= 8) { // 最少8个有效移动
         return Array.from(new Set(matches));
         }
        }

        return moves;
    }

    // 快速处理游戏详情 - 简化处理
    async fastProcessGameDetail(game) {
        try {
            await this.randomDelay(150, 400);

      const html = await this.fastFetchPage(game.url);
        const moves = this.fastExtractMoves(html);

            if (moves.length >= 8) {
                // 简化的棋手提取
      const players = this.fastExtractPlayers(html);
             const result = this.fastExtractResult(html);

       this.successCount++;
          return {
        ...game,
           moves,
               playerRed: players.red,
        playerBlack: players.black,
     result,
      totalMoves: moves.length,
        category: this.categorizeByTitle(game.title)
 };
            } else {
     throw new Error('棋步不足');
            }
        } catch (error) {
       this.failedCount++;
     return null;
     }
    }

    // 快速棋手提取
    fastExtractPlayers(html) {
        let red = '红方', black = '黑方';
        // 简单的选手姓名提取
      const playerMatch = html.match(/([\u4e00-\u9fa5]{2,4})\s*(VS|对)\s*([\u4e00-\u9fa5]{2,4})/i);
        if (playerMatch) {
      red = playerMatch[1];
            black = playerMatch[3];
   } else {
   // 从常见位置提取
            const redMatch = html.match(/红方[:：]?\s*([\u4e00-\u9fa5]{2,4})/);
        const blackMatch = html.match(/黑方[:：]?\s*([\u4e00-\u9fa5]{2,4})/);
            if (redMatch) red = redMatch[1];
     if (blackMatch) black = blackMatch[1];
        }
      return { red, black };
    }

    // 快速结果提取
    fastExtractResult(html) {
   const resultMatch = html.match(/([红先]?[胜负和])/) ||
         html.match(/([红先]?先(胜|负|和))/) ||
                        html.match(/(红胜|黑胜|平局|和棋)/);
        return resultMatch ? resultMatch[1] || resultMatch[0] : '未知结果';
    }

    // 基于标题的智能分类
    categorizeByTitle(title) {
   const categories = {
  opening: {
       keywords: ['中炮', '屏风马', '顺炮', '列炮', '飞相', '仙人指路', '过宫炮'],
       level: 'high'
     },
            ending: {
      keywords: ['残局', '排局', '实用残局', '象棋残局'],
 level: 'medium'
            },
            opening_tactics: {
   keywords: ['开局', '布局', '起局', '布阵'],
     level: 'medium'
    },
      famous_players: {
 keywords: ['胡荣华', '许银川', '吕钦', '王天一', '郑惟桐', '赵鑫鑫', '蒋川'],
          level: 'high'
            },
    competitions: {
         keywords: ['全国象棋', '个人赛', '团体赛', '甲级联赛', '大师赛', '冠军赛'],
                level: 'medium'
       },
       modern_games: {
   keywords: ['现代', '当代', '202', '直播'],
         level: 'low'
    }
        };

        for (let [category, config] of Object.entries(categories)) {
// 优先检查高级匹配词
            if (config.level === 'high') {
   for (let keyword of config.keywords) {
      if (title.includes(keyword)) {
         return category;
          }
     }
            }
        }

        // 中级匹配
        for (let [category, config] of Object.entries(categories)) {
        if (config.level === 'medium') {
             for (let keyword of config.keywords) {
            if (title.includes(keyword)) {
             return category;
   }
            }
     }
   }

        return 'other';
    }

    // 快速并行处理
    async fastProcessGamesInParallel(games) {
        const results = [];

        console.log(`   🔄 并行处理 ${games.length} 个棋谱中...`);

        for (let i = 0; i < games.length; i += this.batchSize) {
      const batch = games.slice(i, i + this.batchSize);

            const promises = batch.map(game => this.fastProcessGameDetail(game));
            const detailedGames = await Promise.allSettled(promises);

            // 统计成功与失败数量
     let success = 0, failed = 0;
    for (let result of detailedGames) {
       if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
           success++;
  } else {
   failed++;
         }
            }

     console.log(`   📈 批次 ${i+1}-${i+batch.length}/${games.length}: ✅${success} ❌${failed}`);
            await this.randomDelay(500, 800);
    }

        return results;
    }

    // 快速主列表采集
    async collectFromMainListFast(maxPages = 20) {
        console.log('\n📋 快速主列表采集开始...');
        let allGames = [];

        for (let page = 1; page <= maxPages; page++) {
        console.log(`\n📄 快速处理第${page}页`);

        try {
            const listUrl = page === 1 ? '/qipus' : `/qipus?page=${page}`;
       const html = await this.fastFetchPage(listUrl);
      const games = this.fastExtractGameList(html, `page_${page}`);

       if (games.length > 0) {
                console.log(`   ✅ 找到 ${games.length} 个棋谱`);

          // 处理详情页面（快速并行）
     const detailedGames = await this.fastProcessGamesInParallel(games);
     for (let game of detailedGames) {
     if (game) {
      allGames.push(game);
          this.successCount++;
            }
          }
       } else {
         console.log('   ⚠️ 本页无棋谱，跳过');
            }

       await this.randomDelay(300, 500);

        } catch (error) {
 console.log(`   ❌ 第${page}页处理失败: ${error.message}`);
        }
        }

        return allGames;
    }

    // 开始快速爬取
    async runFastScraper(pages = 15) {
        console.log('🚀=== 快速棋谱爬虫 ===🚀');
    console.log('运行快速批量采集模式');
    console.log('开始时间:', new Date().toLocaleString());
        console.log('目标页数:', pages);

     const allGames = await this.collectFromMainListFast(pages);

        // 保存数据
    const data_path = path.join(this.outputDir, 'fast_chess_games.json');
        const classifiedData = this.createClassification(allGames);

     fs.writeFileSync(data_path, JSON.stringify(classifiedData, null, 2));

        const totalTime = Math.floor((Date.now() - this.startTime) / 1000);
    console.log('\n' + '='.repeat(60));
        console.log('🎉=== 快速采集完成！===🎉');
  console.log(`采集时间: ${Math.floor(totalTime/60)}分${totalTime%60}秒`);
        console.log(`总棋谱数: ${allGames.length}`);
        console.log(`成功数: ${this.successCount}`);
        console.log(`失败数: ${this.failedCount}`);
  console.log(`成功率: ${(this.successCount/(this.successCount+this.failedCount)*100).toFixed(1)}%`);
        console.log(`数据保存: ${data_path}`);

 return classifiedData;
    }

    createClassification(allGames) {
        const classified = {};
        const categoryStats = {};

        allGames.forEach(game => {
           const category = game.category || 'other';

       if (!classified[category]) {
             classified[category] = [];
        categoryStats[category] = { count: 0, totalMoves: 0 };
            }

            const gameData = {
   title: game.title,
       moves: game.moves,
       players: {
                   red: game.playerRed,
                black: game.playerBlack
      },
    result: game.result,
          totalMoves: game.totalMoves,
                date: game.extracted_at
   };

         classified[category].push(gameData);
         categoryStats[category].count++;
         categoryStats[category].totalMoves += game.moves.length;
 });

        console.log('\n📊 分类统计:');
     for (let [category, data] of Object.entries(categoryStats)) {
   console.log(`   ${this.getCategoryName(category)}: ${data.count} 个棋谱, ${data.totalMoves} 步`);
    }

        return { classifications: classified, stats: categoryStats };
 }

    getCategoryName(category) {
        const categoryNames = {
            opening: '⚡ 开局布局棋谱',
  ending: '🎯 残局棋谱',
       opening_tactics: '🧠 开局战术棋谱',
   famous_players: '🏆 大师对局棋谱',
        competitions: '🏢 比赛对局棋谱',
           modern_games: '📱 现代棋谱',
 other: '📊 其他棋谱'
    };
        return categoryNames[category] || category;
 }
}

// 快速运行
if (require.main === module) {
    const scraper = new FastXiangqiScraper();
    scraper.runFastScraper(20)  // 快速采集20页
      .then(result => {
 console.log('\n✅ 快速爬虫执行完成!');
    console.log('分类数据已生成，准备导入游戏系统...');
        })
      .catch(err => {
         console.error('\n❌ 爬虫异常:', err);
        });
}

module.exports = { FastXiangqiScraper };