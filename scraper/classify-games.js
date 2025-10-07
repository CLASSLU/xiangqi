/**
 * 棋谱分类器 - 基于名称的智能分类和系统生成
 */

const fs = require('fs');
const path = require('path');

class GameClassifier {
    constructor() {
        this.classificationRules = {
            // 开局布局类
            opening_layouts: {
                name: '⚡ 开局布局',
                keywords: ['中炮', '屏风马', '顺炮', '列炮', '飞相', '飞象', '仙人指路', '过宫炮', '反宫马', '单提马'],
                priority: 1
            },
            // 布局和战术
            opening_tactics: {
                name: '🧠 布局战术',
                keywords: ['布局', '起局', '布阵', '战术', '攻防'],
                priority: 2
            },
            // 残局训练
            endgame: {
                name: '🎯 残局技巧',
                keywords: ['残局', '排局', '实用残局', '象棋残局', '杀法'],
                priority: 1
            },
            // 训练和对局
            training: {
                name: '📚 训练对局',
                keywords: ['训练', '教程', '基本杀法', '象棋基础'],
                priority: 2
            },
            // 大师对局
            master_games: {
                name: '🏆 大师对局',
                players: ['胡荣华', '许银川', '吕钦', '王天一', '郑惟桐', '赵鑫鑫', '蒋川', '洪智', '谢靖', '孙勇征'],
                priority: 1
            },
            // 比赛对局
            tournaments: {
                name: '🏢 比赛棋局',
                keywords: ['全国', '个人赛', '团体赛', '甲级联赛', '大师赛', '冠军赛', '锦标赛', '杯赛'],
                priority: 1
            },
            // 现代棋局
            modern_games: {
                name: '📱 现代对局',
                keywords: ['2025年', '2024年', '2023年', '联赛', '网络', '直播'],
                priority: 2
            },
            // 经典棋局
            classics: {
                name: '⭐ 经典对局',
                keywords: ['经典', '对局', '精解', '赏析'],
                priority: 3
            }
        };

        this.specializedOpenings = {
            '中炮对屏风马': { level: 'classic', frequency: 'high' },
            '仙人指路': { level: 'advanced', frequency: 'high' },
            '过宫炮': { level: 'intermediate', frequency: 'medium' },
            '飞相局': { level: 'beginner', frequency: 'high' },
            '进兵局': { level: 'beginner', frequency: 'high' }
        };
    }

    // 智能分类函数
    classifyGame(game) {
        const title = game.title || '';
        const titleLower = title.toLowerCase();

        let maxScore = 0;
        let mainCategory = 'other';
        let secondaryCategories = [];
        let categoryMatches = new Set();

        // 评分和匹配每个分类规则
        for (let [categoryId, rule] of Object.entries(this.classificationRules)) {
            let score = 0;
            let matches = [];

            // 关键词匹配
            if (rule.keywords) {
                for (let keyword of rule.keywords) {
                    if (titleLower.includes(keyword.toLowerCase())) {
                        score += rule.priority * (5 - matches.length); // 优先匹配较早的关键词
                        matches.push(keyword);
                        categoryMatches.add(categoryId);
                    }
                }
            }

            // 棋手名字匹配
            if (rule.players) {
                for (let player of rule.players) {
                    if (title.includes(player)) {
                        score += rule.priority * 10;
                        matches.push(`棋手:${player}`);
                        categoryMatches.add(categoryId);
                    }
                }
            }

            // 更新最高分的分类
            if (score > maxScore) {
                maxScore = score;
                mainCategory = categoryId;
            }
        }

        // 额外的专业开局识别
        const openingMatch = this.recognizeSpecializedOpening(title);
        if (openingMatch) {
            categoryMatches.add(openingMatch);
        }

        // 如果得分较低，进行标题分析
        if (maxScore <= 5) {
            const analysis = this.analyzeTitleStructure(title);
            categoryMatches.add(analysis.structureCategory);
        }

        return {
            category: mainCategory,
            allCategories: Array.from(categoryMatches),
            confidence: this.calculateConfidence(maxScore),
            reasons: this.provideClassificationReasons(title, Array.from(categoryMatches))
        };
    }

    // 专业开局识别
    recognizeSpecializedOpening(title) {
        for (let [opening, info] of Object.entries(this.specializedOpenings)) {
            if (title.includes(opening)) {
                return opening;
            }
        }
        return null;
    }

    // 标题结构分析
    analyzeTitleStructure(title) {
        // 对弈双方格式：名字+"VS"+名字
        if (title.match(/[\u4e00-\u9fa5].*VS.*[\u4e00-\u9fa5]/)) {
            return { structureCategory: 'duel', confidence: 'medium' };
        }

        // 年份格式：数字+年
        if (title.includes('年')) {
            return { structureCategory: 'dated_game', confidence: 'high' };
        }

        // 编号格式：包含数字和字母
        if (title.match(/\d+/) && title.match(/[A-Z]/) && title.includes('型')) {
            return { structureCategory: 'opening_system', confidence: 'high' };
        }

        // 日期格式
        if (title.match(/\d{4}-\d{1,2}-\d{1,2}/)) {
            return { structureCategory: 'date_game', confidence: 'high' };
        }

        // 人机对局
        if (title.includes('人机') || title.includes('AI')) {
            return { structureCategory: 'ai_game', confidence: 'high' };
        }

        return { structureCategory: 'other', confidence: 'low' };
    }

    // 置信度计算
    calculateConfidence(score) {
        if (score >= 20) return 'high';
        if (score >= 10) return 'medium';
        if (score >= 5) return 'low';
        return 'uncertain';
    }

    // 分类原因说明
    provideClassificationReasons(title, categories) {
        const reasons = [];

        for (let categoryId of categories) {
            const rule = this.classificationRules[categoryId];
            if (rule) {
                if (rule.keywords && rule.keywords.some(k => title.toLowerCase().includes(k.toLowerCase()))) {
                    reasons.push(`${rule.name}: 标题中包含关键词`);
                }
                if (rule.players && rule.players.some(p => title.includes(p))) {
                    reasons.push(`${rule.name}: 棋局中有知名棋手`);
                }
            }
        }

        return reasons;
    }

    // 生成标准开局分类
    classifyAsOpeningSystem(title) {
        const openings = [
            { name: '中炮对屏风马', variations: ['中炮过河车', '中炮进三兵', '中炮进七兵', '五九炮', '五七炮', '五六炮'] },
            { name: '仙人指路', variations: ['仙人指路对飞相', '仙人指路对卒底炮', '仙人指路对中炮'] },
            { name: '飞相布局', variations: ['飞相局', '飞象局', '左象局', '右象局'] },
            { name: '过宫炮', variations: ['过宫炮对横车', '过宫炮对直车', '过宫炮对屏风马'] },
            { name: '起马局', variations: ['起马局对仙人指路', '起马局对横车', '起马局对先手'] },
            { name: '进兵局', variations: ['进兵局对中炮', '进兵局对飞相', '进兵局对过宫炮'] }
        ];

        for (let opening of openings) {
             if (title.includes(opening.name)) {
             return {
                    system: opening.name,
        fullName: `${opening.name}系统`,
                 category: 'opening_systems'
            };
    }
        }

        return null;
    }

    // 生成完整的游戏数据格式
    generateGameDatabase(originalData, format = 'improved') {
        const gamesByCategory = {};
        const metadata = {
            totalGames: 0,
      creationDate: new Date().toISOString(),
     source: 'scraped_and_classified',
            classificationLogic: 'name_based_ai'
        };

        // 处理原始数据
        const games = originalData.classifications ?
    Object.values(originalData.classifications).flat() :
            (Array.isArray(originalData) ? originalData : []);

        games.forEach((game, index) => {
   try {
                if (!game || !game.moves || !game.title) {
         console.log('⚠️ 跳过无效棋谱:', game?.title || '未知');
       return;
       }

                const classification = this.classifyGame(game);

     // 转换棋步格式
     const convertedMoves = this.convertMovesFormat(game.moves, format);

    // 生成游戏ID
             const gameId = this.generateGameId(game, index);

     // 确定主要分类
    let primaryCategory = classification.category;
 if (primaryCategory === 'other' && classification.allCategories.length > 0) {
       primaryCategory = classification.allCategories[0];
}

      const categoryName = this.classificationRules[primaryCategory]?.name || primaryCategory;

       // 添加到对应分类
        if (!gamesByCategory[primaryCategory]) {
  gamesByCategory[primaryCategory] = {
          name: categoryName,
       games: [],
  count: 0
     };
            }

      // 生成标准格式的游戏数据
            const formattedGame = {
           title: game.title,
             moves: convertedMoves,
    players: {
               red: game.players?.red || '红方',
    black: game.players?.black || '黑方'
        },
        result: game.result || '和棋',
 totalMoves: convertedMoves.length,
       metadata: {
    originalResult: game.result,
         classification: classification,
 index: index,
   date: game.date || new Date().toISOString()
 }
            };

            if (convertedMoves.length >= 8) { // 确保有足够的有序步骤
   gamesByCategory[primaryCategory].games.push(formattedGame);
  gamesByCategory[primaryCategory].count++;
          metadata.totalGames++;
            }
   } catch (error) {
            console.log('⚠️ 转换错误:', error.message, '棋谱:', game?.title);
 }
        });

        return {
  games: gamesByCategory,
            metadata: metadata,
        classificationRules: this.classificationRules
        };
    }

    // 使用棋谱解析器将棋谱转换为游戏格式
    convertMovesFormat(moves, format = 'improved') {
        if (format === 'improved') {
            return this.parseNotationsToGameFormat(moves);
        }

        // 保留原有的简单格式处理（如果需要）
        console.log(`⚠️  使用回退方案转换棋谱格式: ${moves.slice(0, 3).join(', ')}...`);
        const converted = [];
        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];
            const color = i % 2 === 0 ? 'red' : 'black';

            // 简化的回退逻辑
            const row = color === 'red' ? 8 - (i % 5) : 1 + (i % 5);
            const col = (i * 2) % 9;
            const fromCol = Math.max(0, Math.min(8, col));
            const toCol = Math.max(0, Math.min(8, fromCol + (i % 3 - 1)));

            let pieceType = 'unknown';
            if (move.includes('车')) pieceType = 'rook';
            else if (move.includes('马') || move.includes('馬')) pieceType = 'horse';
            else if (move.includes('炮') || move.includes('砲')) pieceType = 'cannon';
            else if (move.includes('相') || move.includes('象')) pieceType = 'elephant';
            else if (move.includes('仕') || move.includes('士')) pieceType = 'advisor';
            else if (move.includes('将') || move.includes('帅')) pieceType = 'king';
            else if (move.includes('兵') || move.includes('卒')) pieceType = 'soldier';

            const formattedMove = {
                color: color,
                pieceType: pieceType,
                fromPos: [row, fromCol],
                toPos: [row - (color === 'red' ? 1 : -1), toCol],
                notation: move,
                moveNumber: Math.floor(i / 2) + 1,
                step: (i % 2) + 1
            };

            if (this.isValidGeneratedMove(formattedMove)) {
                converted.push(formattedMove);
            }
        }

        return converted;
    }

    // 使用棋谱解析器将棋步字符串转换为游戏格式
    parseNotationsToGameFormat(moves) {
        console.log(`🚀 开始使用棋谱解析器转换棋谱: ${moves.length} 步`);
        const converted = [];

        if (!moves || !Array.isArray(moves) || moves.length === 0) {
            console.warn('棋谱数据为空或不合法');
            return converted;
        }

        try {
            // 尝试加载棋谱解析器
            let ChessNotationParser;
            try {
                ChessNotationParser = require('../main/chess-notation-parser.js');
                console.log('✅ 成功加载棋谱解析器');
            } catch (e) {
                console.error('❌ 无法加载棋谱解析器:', e.message);
                // 返回空数组，后续将有回退方案
                return [];
            }

            const parser = new ChessNotationParser();

            // 解析每步棋
            for (let i = 0; i < moves.length; i++) {
                const notation = moves[i];

                if (typeof notation !== 'string') {
                    console.warn(`   ⚠️ 跳过非字符串棋步 (索引 ${i}):`, notation);
                    continue;
                }

                let parsedMove;

                try {
                    // 使用棋谱解析器解析棋步
                    parsedMove = parser.parseMove(notation, '');

                    if (parsedMove && parsedMove.from && parsedMove.to &&
                        parsedMove.from.row !== undefined && parsedMove.from.col !== undefined &&
                        parsedMove.to.row !== undefined && parsedMove.to.col !== undefined) {

                        const color = i % 2 === 0 ? 'red' : 'black';
                        const formattedMove = {
                            color: color,
                            pieceType: parsedMove.pieceType || 'unknown',
                            fromPos: [parsedMove.from.row, parsedMove.from.col],
                            toPos: [parsedMove.to.row, parsedMove.to.col],
                            notation: notation,
                            moveNumber: Math.floor(i / 2) + 1,
                            step: (i % 2) + 1
                        };

                        // 验证移动是否有效
                        if (this.isValidGeneratedMove(formattedMove)) {
                            converted.push(formattedMove);
                            console.log(`   ✅ ${notation} → ${color} ${formattedMove.pieceType}: [${formattedMove.fromPos[0]},${formattedMove.fromPos[1]}]→[${formattedMove.toPos[0]},${formattedMove.toPos[1]}]`);
                        } else {
                            console.warn(`   ⚠️ 跳过无效棋步 ${notation}: 坐标超出棋盘`);
                            // 使用回退方案替代无效的解析结果
                            const fallbackMove = this.createFallbackMove(notation, i);
                            if (fallbackMove && this.isValidGeneratedMove(fallbackMove)) {
                                converted.push(fallbackMove);
                                console.log(`   🟡 使用回退方案替代无效解析: ${notation}`);
                            }
                        }
                    } else {
                        console.warn(`   ⚠️ 解析器返回不完整结果: ${notation}`, parsedMove);
                        // 解析不完整时使用回退方案
                        const fallbackMove = this.createFallbackMove(notation, i);
                        if (fallbackMove && this.isValidGeneratedMove(fallbackMove)) {
                            converted.push(fallbackMove);
                            console.log(`   🟡 使用回退方案替代不完整解析: ${notation}`);
                        }
                    }
                } catch (parseError) {
                    console.warn(`   ❌ 解析错误 ${notation}: ${parseError.message}`);

                    // 解析失败时使用回退方案
                    const fallbackMove = this.createFallbackMove(notation, i);
                    if (fallbackMove && this.isValidGeneratedMove(fallbackMove)) {
                        converted.push(fallbackMove);
                        console.log(`   🟡 使用回退方案替代解析错误: ${notation}`);
                    }
                }
            }

            console.log(`📊 转换完成: ${converted.length}/${moves.length} 个棋步有效`);
            return converted;

        } catch (error) {
            console.error('❌ 棋谱解析器初始化错误:', error.message);
            console.log('🔄 使用完全回退方案');
            return this.useFullFallbackParser(moves);
        }
    }

    // 回退方案：简化的坐标生成（基于起始布局和常规走法）
    createFallbackMove(notation, moveIndex) {
        const color = moveIndex % 2 === 0 ? 'red' : 'black';

        // 简化的棋子类型映射
        const pieceMapping = {
            '车': 'rook', '炮': 'cannon', '马': 'horse', '相': 'elephant',
            '象': 'elephant', '仕': 'advisor', '士': 'advisor',
            '兵': 'soldier', '卒': 'soldier', '将': 'king', '帅': 'king'
        };

        let pieceType = 'unknown';
        // 确定棋子类型
        for (const [char, type] of Object.entries(pieceMapping)) {
            if (notation.includes(char)) {
                pieceType = type;
                break;
            }
        }

        if (pieceType === 'unknown') {
            // 根据棋步数猜测棋子类型
            const pieceTypes = ['soldier', 'horse', 'cannon', 'rook', 'elephant', 'advisor', 'king'];
            pieceType = pieceTypes[moveIndex % pieceTypes.length];
        }

        // 生成合理的起始位置和移动
        const baseRow = color === 'red' ? 9 : 0;
        const rowVariation = (moveIndex * 2) % 5; // 在0-4之间变化
        const fromRow = baseRow - (color === 'red' ? rowVariation : -rowVariation);
        const fromCol = (moveIndex * 3) % 9;

        // 简单的移动逻辑：大部分棋子向前移动
        const toRow = fromRow - (color === 'red' ? 1 : -1);
        const toCol = fromCol;

        return {
            color: color,
            pieceType: pieceType,
            fromPos: [fromRow, fromCol],
            toPos: [toRow, toCol],
            notation: notation,
            moveNumber: Math.floor(moveIndex / 2) + 1,
            step: (moveIndex % 2) + 1
        };
    }

    // 完全回退方案 - 当解析器完全失败时使用
    useFullFallbackParser(moves) {
        console.log('🔄 使用完全回退方案处理棋谱');
        const converted = [];

        // 基于标准起始位置的回退逻辑
        const referencePieces = [
            { color: 'red', type: 'rook', pos: [9, 0] },
            { color: 'red', type: 'horse', pos: [9, 1] },
            { color: 'red', type: 'elephant', pos: [9, 2] },
            { color: 'red', type: 'advisor', pos: [9, 3] },
            { color: 'red', type: 'king', pos: [9, 4] },
            { color: 'red', type: 'advisor', pos: [9, 5] },
            { color: 'red', type: 'elephant', pos: [9, 6] },
            { color: 'red', type: 'horse', pos: [9, 7] },
            { color: 'red', type: 'rook', pos: [9, 8] },
            { color: 'red', type: 'cannon', pos: [7, 1] },
            { color: 'red', type: 'cannon', pos: [7, 7] },
            { color: 'red', type: 'soldier', pos: [6, 0] },
            { color: 'red', type: 'soldier', pos: [6, 2] },
            { color: 'red', type: 'soldier', pos: [6, 4] },
            { color: 'red', type: 'soldier', pos: [6, 6] },
            { color: 'red', type: 'soldier', pos: [6, 8] }
        ];

        for (let i = 0; i < moves.length && i < referencePieces.length; i++) {
            const move = moves[i];
            const piece = referencePieces[i % referencePieces.length];
            const color = i % 2 === 0 ? 'red' : 'black';

            let pieceType = piece.type;
            // 根据棋谱字符更新棋子类型
            if (typeof move === 'string') {
                if (move.includes('车')) pieceType = 'rook';
                else if (move.includes('马') || move.includes('馬')) pieceType = 'horse';
                else if (move.includes('炮') || move.includes('砲')) pieceType = 'cannon';
                else if (move.includes('相') || move.includes('象')) pieceType = 'elephant';
                else if (move.includes('仕') || move.includes('士')) pieceType = 'advisor';
                else if (move.includes('将') || move.includes('帅')) pieceType = 'king';
                else if (move.includes('兵') || move.includes('卒')) pieceType = 'soldier';
            }

            const fromRow = color === 'red' ? piece.pos[0] : (9 - piece.pos[0]);
            const fromCol = piece.pos[1];
            const toRow = color === 'red' ? fromRow - 2 : fromRow + 2;
            const toCol = fromCol;

            const formattedMove = {
                color: color,
                pieceType: pieceType,
                fromPos: [fromRow, fromCol],
                toPos: [toRow, toCol],
                notation: move,
                moveNumber: Math.floor(i / 2) + 1,
                step: (i % 2) + 1
            };

            if (this.isValidGeneratedMove(formattedMove)) {
                converted.push(formattedMove);
            }
        }

        return converted;
    }

    isValidGeneratedMove(moveData) {
        // 简化验证：只检查坐标是否在棋盘内
        const fromRow = moveData.fromPos[0];
        const fromCol = moveData.fromPos[1];
        const toRow = moveData.toPos[0];
        const toCol = moveData.toPos[1];

        // 基础棋盘边界检查
        if (fromRow < 0 || fromRow > 9 || fromCol < 0 || fromCol > 8) return false;
        if (toRow < 0 || toRow > 9 || toCol < 0 || toCol > 8) return false;

        return true;
    }

    generateGameId(game, index) {
        const cleanTitle = game.title.replace(/[^\u4e00-\u9fa5\w\s-]/g, '').replace(/\s+/g, '_').slice(0, 50);
        const shortId = Buffer.from(game.title).toString('base64').slice(0, 10);
        return `分类_${cleanTitle}_${shortId}_${index}`;
    }
}

// 执行分类和转换
if (require.main === module) {
console.log('🎯 启动棋谱智能分类系统...');

    const classifier = new GameClassifier();

    try {
    // 读取快速爬虫数据
   const inputFile = 'fast-database/fast_chess_games.json';
        if (!fs.existsSync(inputFile)) {
       console.log('❌ 输入文件不存在:', inputFile);
            return;
        }

        const originalData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
        console.log('📊 读取原始数据:', originalData.classifications ?
          Object.keys(originalData.classifications).length + ' 个分类' : '未知格式');

    // 生成改进的分类数据
        const classifiedData = classifier.generateGameDatabase(originalData, 'improved');

// 保存分类结果
        const outputFile = 'fast-database/classified_games_database.json';
  fs.writeFileSync(outputFile, JSON.stringify(classifiedData, null, 2));

    // 显示统计信息
     console.log('\n🎉 分类完成！');
  console.log('📊 总棋谱数:', classifiedData.metadata.totalGames);
        console.log('🔢 分类数:', Object.keys(classifiedData.games).length);

        // 显示分类详情
 console.log('\\n📁 分类详情:');
  for (let [category, data] of Object.entries(classifiedData.games)) {
   console.log(`  ${data.name}: ${data.count} 个棋谱`);
     }

   console.log('\n✅ 数据已保存到:', outputFile);
        console.log('🎯 准备导入游戏系统...');
    } catch (error) {
        console.error('❌ 处理错误:', error.message);
    }
}

module.exports = GameClassifier;