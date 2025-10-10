/**
 * 中国象棋棋谱解析器 - 第二版
 * 基于正确的动态路码记谱法规则设计
 *
 * 核心规则：
 * 1. 路码是基于棋子当前列位置的动态值
 * 2. 红方从右向左数1-9路，黑方从左向右数1-9路
 * 3. "平"表示横向移动，"进"表示向前移动，"退"表示向后移动
 * 4. 进退移动的数字表示步数，平移动的数字表示目标路码
 */

/**
 * 棋谱解析错误类
 * 提供详细的错误信息和上下文
 */
class NotationParseError extends Error {
    constructor(message, notation = '', context = {}) {
        super(message);
        this.name = 'NotationParseError';
        this.notation = notation;
        this.context = context;
        this.timestamp = new Date().toISOString();

        // 保持堆栈信息
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, NotationParseError);
        }
    }

    /**
     * 获取详细错误信息
     */
    getDetails() {
        return {
            name: this.name,
            message: this.message,
            notation: this.notation,
            context: this.context,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }

    /**
     * 获取用户友好的错误描述
     */
    getUserMessage() {
        if (this.notation) {
            return `棋谱 "${this.notation}" 解析失败：${this.message}`;
        }
        return this.message;
    }

    /**
     * 判断是否为特定类型的错误
     */
    isErrorType(type) {
        return this.context.type === type;
    }
}

class ChessNotationParserV2 {
    constructor() {
        // 棋子类型映射（保持不变）
        this.pieceTypeMap = {
            '车': 'rook', '車': 'rook',
            '马': 'horse', '馬': 'horse',
            '炮': 'cannon', '砲': 'cannon',
            '相': 'elephant', '象': 'elephant',
            '仕': 'advisor', '士': 'advisor',
            '帅': 'king', '将': 'king',
            '兵': 'soldier', '卒': 'soldier'
        };

        // 中文数字映射
        this.chineseNumbers = {
            '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
            '六': 6, '七': 7, '八': 8, '九': 9,
            '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
            '6': 6, '7': 7, '8': 8, '9': 9
        };

        // 初始化标准布局
        this.initializeStandardLayout();

        // 预编译正则表达式性能优化
        this.compilePatterns();
    }

    /**
     * 初始化标准棋盘布局
     */
    initializeStandardLayout() {
        this.standardLayout = {
            red: {
                king: [{row: 9, col: 4}],
                advisor: [{row: 9, col: 3}, {row: 9, col: 5}],
                elephant: [{row: 9, col: 2}, {row: 9, col: 6}],
                horse: [{row: 9, col: 1}, {row: 9, col: 7}],
                rook: [{row: 9, col: 0}, {row: 9, col: 8}],
                cannon: [{row: 7, col: 1}, {row: 7, col: 7}],
                soldier: [{row: 6, col: 0}, {row: 6, col: 2}, {row: 6, col: 4}, {row: 6, col: 6}, {row: 6, col: 8}]
            },
            black: {
                king: [{row: 0, col: 4}],
                advisor: [{row: 0, col: 3}, {row: 0, col: 5}],
                elephant: [{row: 0, col: 2}, {row: 0, col: 6}],
                horse: [{row: 0, col: 1}, {row: 0, col: 7}],
                rook: [{row: 0, col: 0}, {row: 0, col: 8}],
                cannon: [{row: 2, col: 1}, {row: 2, col: 7}],
                soldier: [{row: 3, col: 0}, {row: 3, col: 2}, {row: 3, col: 4}, {row: 3, col: 6}, {row: 3, col: 8}]
            }
        };
    }

    /**
     * 预编译正则表达式模式以提升性能
     */
    compilePatterns() {
        this.compiledPatterns = {
            // 主要匹配模式：棋子 + 路码 + 动作 + 目标 (如：炮二平五)
            main: /^([车马炮相仕帅將馬砲兵卒])([一二三四五六七八90-9]+)([进平退])([一二三四五六七八90-9]+)$/,

            // 前后记法模式：(前后) + 棋子 + 路码 + 动作 + 目标 (如：前炮二进一)
            withPosition: /^(前|后)?([车马炮相仕帅將馬砲兵卒])([一二三四五六七八90-9]+)([进平退])([一二三四五六七八90-9]+)$/,

            // 路码前缀模式：路码 + 路 + 棋子 + 动作 + 目标 (如：四路炮平五)
            roadPrefix: /^([一二三四五六七八90-9]+)路([车马炮相仕帅將馬砲兵卒])([进平退])([一二三四五六七八90-9]+)$/,

            // 简化前后记法模式：(前后) + 棋子 + 动作 + 目标 (如：前炮进一)
            simpleWithPosition: /^(前|后)?([车马炮相仕帅將馬砲兵卒])([进平退])([一二三四五六七八90-9]+)$/,

            // 验证模式
            pieceCheck: /^[车马炮相仕帅將馬砲兵卒]$/,
            numberCheck: /^[一二三四五六七八90-9]+$/,

            // 全角数字转换
            fullWidthNumber: /[０-９]/
        };

        // 性能监控指标
        this.performanceMetrics = {
            totalParses: 0,
            cacheHits: 0,
            averageTime: 0,
            errors: 0
        };

        // 简单缓存
        this.parseCache = new Map();
    }

    /**
     * 检查字符是否为中文字子
     * @param {string} char - 要检查的字符
     * @returns {boolean} 是否为中文字子
     */
    isChinesePiece(char) {
        return this.compiledPatterns.pieceCheck.test(char);
    }

    /**
     * 检查字符是否为中文数字
     * @param {string} str - 要检查的字符串
     * @returns {boolean} 是否为中文数字
     */
    isChineseNumber(str) {
        return this.compiledPatterns.numberCheck.test(str);
    }

    /**
     * 根据棋子位置和颜色计算其路码
     * @param {string} color - 棋子颜色 ('red' | 'black')
     * @param {number} col - 列坐标 (0-8)
     * @returns {number} 路码 (1-9)
     */
    colToRoad(color, col) {
        if (col < 0 || col > 8) {
            throw new NotationParseError(`无效列坐标: ${col}`, '', {
                type: 'invalid_coordinate',
                coordinate: col,
                color
            });
        }

        if (color === 'red') {
            // 红方：从右向左数，列8对应1路，列0对应9路
            return 9 - col;
        } else if (color === 'black') {
            // 黑方：从左向右数，列0对应1路，列8对应9路
            return col + 1;
        } else {
            throw new NotationParseError(`无效颜色: ${color}`, '', {
                type: 'invalid_color',
                color
            });
        }
    }

    /**
     * 根据路码和颜色计算列坐标
     * @param {string} color - 棋子颜色 ('red' | 'black')
     * @param {number} road - 路码 (1-9)
     * @returns {number} 列坐标 (0-8)
     */
    roadToCol(color, road) {
        if (road < 1 || road > 9) {
            throw new NotationParseError(`无效路码: ${road}`, '', {
                type: 'invalid_road',
                road
            });
        }

        if (color === 'red') {
            // 红方：路码1对应列8，路码9对应列0
            return 9 - road;
        } else if (color === 'black') {
            // 黑方：路码1对应列0，路码9对应列8
            return road - 1;
        } else {
            throw new NotationParseError(`无效颜色: ${color}`, '', {
                type: 'invalid_color',
                color
            });
        }
    }

    /**
     * 解析棋谱记谱法
     * @param {string} notation - 棋谱，如 "炮二平五"
     * @param {string} color - 棋子颜色
     * @param {Array} board - 当前棋盘状态
     * @returns {Object} 解析结果
     */
    parseNotation(notation, color, board) {
        const startTime = performance.now();
        this.performanceMetrics.totalParses++;

        // 检查缓存
        const cacheKey = `${notation}_${color}_${board ? 'board' : 'noboard'}`;
        if (this.parseCache.has(cacheKey)) {
            this.performanceMetrics.cacheHits++;
            return this.parseCache.get(cacheKey);
        }

        try {
            // 匹配棋谱格式：
            // 1. 棋子 + 路码 + 动作 + 目标信息 (如：炮二平五)
            // 2. (前后)?棋子 + 路码 + 动作 + 目标信息 (如：前炮二进一, 后马四平三)
            // 3. 路码 + 路 + 棋子 + 动作 + 目标信息 (如：四路炮平五)
            // 4. (前后)?棋子 + 动作 + 目标信息 (如：前炮进一, 后马平四) - 需要上下文推断路码
            // 标准化全角数字为半角数字
            const normalizedNotation = notation.replace(this.compiledPatterns.fullWidthNumber, (match) => {
                const fullWidth = ['０', '１', '２', '３', '４', '５', '６', '７', '８', '９'];
                const halfWidth = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                return halfWidth[fullWidth.indexOf(match)];
            });

            // 使用预编译的正则表达式
            const match = normalizedNotation.match(this.compiledPatterns.main) ||
                         normalizedNotation.match(this.compiledPatterns.withPosition) ||
                         normalizedNotation.match(this.compiledPatterns.roadPrefix) ||
                         normalizedNotation.match(this.compiledPatterns.simpleWithPosition);

        if (!match) {
            throw new NotationParseError(`无效棋谱格式`, notation, {
                type: 'invalid_format',
                normalizedNotation
            });
        }

        
        let positionModifier, pieceChar, roadStr, action, targetStr;
        let needsContextInference = false;

        // 根据匹配组的数量判断是哪种模式
        const groupCount = match.length - 1; // 减去第一个完整的匹配

        // 优先检查最常见的模式：棋子 + 路码 + 动作 + 目标信息 (4组)
        if (groupCount === 4 && this.isChinesePiece(match[1]) && this.isChineseNumber(match[2])) {
            // 棋子 + 路码 + 动作 + 目标信息 (如：炮二平五)
            [, pieceChar, roadStr, action, targetStr] = match;
            positionModifier = null;
        }
        // 模式4: (前后) + 棋子 + 动作 + 目标信息 (4组，如：前炮进一) - 需要上下文推断
        else if (groupCount === 4 && (match[1] === '前' || match[1] === '后')) {
            // (前后) + 棋子 + 动作 + 目标信息 (如：前炮进一)
            [, positionModifier, pieceChar, action, targetStr] = match;
            needsContextInference = true;
        }
        // 模式3变体: 路码 + 棋子 + 动作 + 目标信息 (4组, 但实际是五路棋谱格式)
        else if (groupCount === 4 && this.isChineseNumber(match[1]) && this.isChinesePiece(match[2])) {
            // 路码 + 棋子 + 动作 + 目标信息 (如：四炮平五 - 简化版)
            [, roadStr, pieceChar, action, targetStr] = match;
            positionModifier = null;
        }
        // 模式3: 路码 + 路 + 棋子 + 动作 + 目标信息 (5组)
        else if (this.isChineseNumber(match[1]) && match[2] === '路') {
            // 路码 + 路 + 棋子 + 动作 + 目标信息 (如：四路炮平五)
            [, roadStr, , pieceChar, action, targetStr] = match;
            positionModifier = null;
        }
        // 模式2: (前后) + 棋子 + 路码 + 动作 + 目标信息 (5组)
        else if (groupCount === 5 && (match[1] === '前' || match[1] === '后')) {
            // (前后) + 棋子 + 路码 + 动作 + 目标信息 (如：前炮二进一)
            [, positionModifier, pieceChar, roadStr, action, targetStr] = match;
        }
        else {
            throw new NotationParseError(`无法识别的棋谱格式`, notation, {
                type: 'unrecognized_pattern',
                groupCount,
                matchedGroups: match.slice(1),
                normalizedNotation
            });
        }

        const pieceType = this.pieceTypeMap[pieceChar];
        let fromRoad;

        if (needsContextInference) {
            // 根据棋盘状态推断路码：找到所有该类型的棋子
            const allPieces = this.findAllPieces(color, pieceType, board);
            if (allPieces.length === 0) {
                throw new NotationParseError(`棋盘上没有找到${color} ${pieceType}`, notation, {
                    type: 'piece_not_found',
                    color,
                    pieceType,
                    availablePieces: []
                });
            }

            
            if (positionModifier) {
                // 有前后标识，按位置选择
                allPieces.sort((a, b) => {
                    if (color === 'red') {
                        return a.row - b.row;
                    } else {
                        return b.row - a.row;
                    }
                });

                const selectedPiece = positionModifier === '前' ? allPieces[0] : allPieces[allPieces.length - 1];
                fromRoad = this.colToRoad(color, selectedPiece.col);
                            } else {
                // 无前后标识，智能选择能执行该移动的棋子
                fromRoad = this.selectBestRoadForMove(allPieces, action, targetInfo, color, pieceType, board);
                            }
        } else {
            fromRoad = this.chineseNumbers[roadStr];
        }

        const targetInfo = this.chineseNumbers[targetStr];

        if (!pieceType || targetInfo === undefined) {
            throw new NotationParseError(`棋谱解析错误`, notation, {
                type: 'parse_error',
                pieceType,
                targetInfo,
                pieceChar,
                action,
                targetStr
            });
        }

        // 验证fromRoad的方法
        if (typeof fromRoad !== 'number' || fromRoad < 1 || fromRoad > 9) {
            throw new NotationParseError(`无效路码: ${fromRoad}`, notation, {
                type: 'invalid_road',
                road: fromRoad,
                expectedRange: '1-9'
            });
        }

        
        // 核心算法：根据起始路码和位置标识找到对应棋子
        const fromCol = this.roadToCol(color, fromRoad);
        const piecePositions = this.findPiecesOnRoad(color, pieceType, fromCol, fromRoad, board);

        if (piecePositions.length === 0) {
            throw new NotationParseError(`在${fromRoad}路未找到${color} ${pieceType}`, notation, {
                type: 'piece_not_found_on_road',
                road: fromRoad,
                color,
                pieceType,
                fromCol
            });
        }

        let selectedPosition;

        if (piecePositions.length === 1) {
            // 只有一个棋子，直接使用
            selectedPosition = piecePositions[0];
            console.log(`  找到唯一棋子位置: (${selectedPosition.row}, ${selectedPosition.col})`);
        } else {
            console.log(`  ⚠️  ${fromRoad}路有${piecePositions.length}个${pieceType}，使用位置标识: ${positionModifier}`);

            if (positionModifier) {
                // 明确指定了前后位置
                selectedPosition = this.selectPieceByPosition(piecePositions, positionModifier, color);
            } else {
                // 没有指定前后，选择最符合移动规则的棋子
                selectedPosition = this.selectBestPiece(piecePositions, action, targetInfo, color, pieceType, board);
            }

            console.log(`  选择的棋子位置: (${selectedPosition.row}, ${selectedPosition.col})`);
        }

        let result;
        try {
            result = this.calculateMove(selectedPosition, action, targetInfo, color, pieceType, notation);
        } catch (error) {
            this.performanceMetrics.errors++;
            throw error;
        } finally {
            // 更新性能指标
            const endTime = performance.now();
            const parseTime = endTime - startTime;
            this.updateAverageTime(parseTime);

            // 缓存结果
            this.parseCache.set(cacheKey, result);

            // 限制缓存大小（如果缓存太大，清理最旧的一半）
            if (this.parseCache.size > 1000) {
                const entries = Array.from(this.parseCache.entries());
                this.parseCache = new Map(entries.slice(Math.floor(entries.length / 2)));
            }
        }

        return result;
        } catch (error) {
            this.performanceMetrics.errors++;

            // 尝试智能错误恢复
            if (error instanceof NotationParseError) {
                try {
                    return this.tryErrorRecovery(notation, color, board, error);
                } catch (recoveryError) {
                    console.log(`  ❌ 错误恢复失败: ${recoveryError.message}`);
                    throw recoveryError;
                }
            }

            throw error;
        }
    }

    /**
     * 智能错误恢复功能
     * 尝试修复常见的棋谱记谱法错误
     * @param {string} originalNotation - 原始有错误的棋谱
     * @param {string} color - 棋子颜色
     * @param {Array} board - 棋盘状态
     * @param {NotationParseError} originalError - 原始错误
     * @returns {Object} 修复后的解析结果
     */
    tryErrorRecovery(originalNotation, color, board, originalError) {
        // 避免无限递归：如果已经在恢复过程中，直接失败
        if (this._isRecovering) {
            throw originalError;
        }

        this._isRecovering = true;
        console.log(`  🔧 错误恢复: ${originalError.getUserMessage()}`);

        // 错误恢复策略
        const recoveryStrategies = [
            () => this.tryCommonNotationCorrections(originalNotation, color, board),
            () => this.tryAlternativePieceFormats(originalNotation, color, board),
            () => this.tryRelaxedNumberMatching(originalNotation, color, board),
            () => this.tryContextualRepair(originalNotation, color, board, originalError)
        ];

        try {
            for (let i = 0; i < recoveryStrategies.length; i++) {
                try {
                    console.log(`  📋 尝试恢复策略 ${i + 1}/${recoveryStrategies.length}`);
                    const result = recoveryStrategies[i]();
                    if (result) {
                        console.log(`  ✅ 恢复成功: ${originalNotation} → 正常解析`);
                        return result;
                    }
                } catch (recoveryError) {
                    console.log(`  ⚠️  恢复策略 ${i + 1} 失败: ${recoveryError.message}`);
                }
            }

            // 所有恢复策略都失败，抛出带有恢复信息的错误
            throw new NotationParseError(
                `无法恢复棋谱解析错误: ${originalError.message}。已尝试 ${recoveryStrategies.length} 种恢复策略。`,
                originalNotation,
                {
                    ...originalError.context,
                    type: 'recovery_failed',
                    originalError: originalError.message,
                    attemptedRecoveries: recoveryStrategies.length
                }
            );
        } finally {
            // 确保恢复标志被清除
            this._isRecovering = false;
        }
    }

    /**
     * 策略1: 尝试常见记谱法纠正
     */
    tryCommonNotationCorrections(notation, color, board) {
        const corrections = [
            // 全角数字纠正
            { from: /０/g, to: '0' }, { from: /１/g, to: '1' }, { from: /２/g, to: '2' },
            { from: /３/g, to: '3' }, { from: /４/g, to: '4' }, { from: /５/g, to: '5' },
            { from: /６/g, to: '6' }, { from: /７/g, to: '7' }, { from: /８/g, to: '8' }, { from: /９/g, to: '9' },

            // 常见字符错误纠正
            { from: /平し/g, to: '平' }, { from: /進/g, to: '进' }, { from: /退/g, to: '退' },
            { from: /進/g, to: '进' }, { from: /退/g, to: '退' },

            // 棋子名称纠正
            { from: /馬/g, to: '马' }, { from: /車/g, to: '车' }, { from: /砲/g, to: '炮' },
            { from: /相/g, to: '象' }, { from: /仕/g, to: '士' }, { from: /帅/g, to: '将' }, { from: /卒/g, to: '兵' },

            // 空格纠正
            { from: /\s+/g, to: '' },
        ];

        let correctedNotation = notation;
        for (const correction of corrections) {
            correctedNotation = correctedNotation.replace(correction.from, correction.to);
        }

        if (correctedNotation !== notation) {
            console.log(`    纠正: ${notation} → ${correctedNotation}`);
            return this.parseNotation(correctedNotation, color, board);
        }

        return null;
    }

    /**
     * 策略2: 尝试替代棋子格式
     */
    tryAlternativePieceFormats(notation, color, board) {
        // 尝试简化记谱法（去掉路码）
        const simplifiedPattern = /^([车马炮相仕帅將馬砲兵卒])([进平退])([一二三四五六七八九1-9]+)$/;
        const match = notation.match(simplifiedPattern);

        if (match) {
            const [, pieceChar, action, targetStr] = match;
            const pieceType = this.pieceTypeMap[pieceChar];
            const targetInfo = this.chineseNumbers[targetStr];

            // 寻找所有该类型棋子，尝试找到能执行该移动的
            const allPieces = this.findAllPieces(color, pieceType, board);

            for (const piece of allPieces) {
                try {
                    // 假设这是目标位置，尝试解析
                    const mockNotation = `${pieceChar}九${action}${targetStr}`;
                    const result = this.parseNotation(mockNotation, color, board);

                    // 调整为正确的起始位置
                    result.fromPos = { row: piece.row, col: piece.col };

                    // 重新计算真实目标位置
                    const targetPosition = this.calculateTargetPosition(result.fromPos, action, targetInfo, color, pieceType);
                    result.toPos = { row: targetPosition.toRow, col: targetPosition.toCol };

                    if (this.isValidMove(result.fromPos, result.toPos, color, pieceType, board)) {
                        console.log(`    简化恢复: 使用${pieceType}在(${piece.row}, ${piece.col})`);
                        return result;
                    }
                } catch (error) {
                    // 继续尝试下一个棋子
                }
            }
        }

        return null;
    }

    /**
     * 策略3: 尝试宽松数字匹配
     */
    tryRelaxedNumberMatching(notation, color, board) {
        // 尝试更宽松的正则表达式匹配
        const relaxedPatterns = [
            // 忽略一些特殊字符
            /^([车马炮相仕帅將馬砲兵卒])(\d*)([进平退])(\d*)$/,
        ];

        for (const pattern of relaxedPatterns) {
            const match = notation.match(pattern);
            if (match) {
                try {
                    // 重构标准格式
                    let reconstructedNotation;

                    if (pattern === relaxedPatterns[0]) {
                        // 重新构建标准格式
                        const [, pieceChar, , action, targetStr] = match;
                        reconstructedNotation = `${pieceChar}二${action}${targetStr}`;
                    }

                    console.log(`    宽松恢复: ${notation} → ${reconstructedNotation}`);
                    return this.parseNotation(reconstructedNotation, color, board);
                } catch (error) {
                    continue;
                }
            }
        }

        return null;
    }

    /**
     * 策略4: 尝试基于上下文的修复
     */
    tryContextualRepair(notation, color, board, originalError) {
        // 根据错误类型进行特定修复
        const errorType = originalError.isErrorType ? originalError.context.type : 'unknown';

        switch (errorType) {
            case 'piece_not_found_on_road':
                return this.tryDifferentRoadRepair(notation, color, board, originalError);

            case 'invalid_road':
                return this.tryNearbyRoadRepair(notation, color, board, originalError);

            case 'out_of_bounds':
                return this.tryBoundsFixRepair(notation, color, board, originalError);

            default:
                return null;
        }
    }

    /**
     * 尝试不同路码修复
     */
    tryDifferentRoadRepair(notation, color, board, error) {
        const context = error.context;
        const pieceType = context.pieceType;

        // 找出所有有该棋子的路码
        const availableRoads = [];
        for (let road = 1; road <= 9; road++) {
            const col = this.roadToCol(color, road);
            const pieces = this.findPiecesOnRoad(color, pieceType, col, road, board);
            if (pieces.length > 0) {
                availableRoads.push(road);
            }
        }

        // 尝试每个可用的路码
        for (const road of availableRoads) {
            try {
                const roadChar = Object.keys(this.chineseNumbers).find(key => this.chineseNumbers[key] === road);
                const repairedNotation = notation.replace(/\d+[一二三四五六七八九1-9]+/, roadChar);
                const result = this.parseNotation(repairedNotation, color, board);
                console.log(`    路码修复: ${context.road}路 → ${road}路`);
                return result;
            } catch (error) {
                continue;
            }
        }

        return null;
    }

    /**
     * 尝试邻近路码修复
     */
    tryNearbyRoadRepair(notation, color, board, error) {
        const invalidRoad = error.context.road;

        // 尝试邻近的路码
        for (let offset of [-1, 1, -2, 2]) {
            const candidateRoad = invalidRoad + offset;
            if (candidateRoad >= 1 && candidateRoad <= 9) {
                try {
                    const roadChar = Object.keys(this.chineseNumbers).find(key => this.chineseNumbers[key] === candidateRoad);
                    const repairedNotation = notation.replace(/([车马炮相仕帅將馬砲兵卒])[一二三四五六七八九1-9]+/, `$1${roadChar}`);
                    const result = this.parseNotation(repairedNotation, color, board);
                    console.log(`    邻近修复: ${invalidRoad}路 → ${candidateRoad}路`);
                    return result;
                } catch (error) {
                    continue;
                }
            }
        }

        return null;
    }

    /**
     * 尝试边界修复
     */
    tryBoundsFixRepair(notation, color, board, error) {
        const context = error.context;

        // 尝试限制移动范围
        if (context.action === '进' && context.toRow < 0) {
            // 限制前进距离
            const fromRoad = context.fromRoad;
            const fromCol = this.roadToCol(color, fromRoad);
            const pieces = this.findPiecesOnRoad(color, context.pieceType, fromCol, fromRoad, board);

            for (const piece of pieces) {
                const maxSteps = Math.min(piece.row, Math.abs(piece.row - context.toRow));
                for (let steps = 1; steps <= maxSteps; steps++) {
                    try {
                        const roadChar = Object.keys(this.chineseNumbers).find(key => this.chineseNumbers[key] === steps);
                        const repairedNotation = notation.replace(/[一二三四五六七八九1-9]+$/, roadChar);
                        const result = this.parseNotation(repairedNotation, color, board);
                        console.log(`    边界修复: 步数限制为${steps}`);
                        return result;
                    } catch (error) {
                        continue;
                    }
                }
            }
        }

        return null;
    }

    /**
     * 辅助函数：根据值获取键
     */
    getKeyByValue(object, value) {
        return Object.keys(object).find(key => object[key] === value);
    }

    /**
     * 更新平均解析时间
     * @param {number} parseTime - 解析耗时（毫秒）
     */
    updateAverageTime(parseTime) {
        const totalTime = this.performanceMetrics.averageTime * (this.performanceMetrics.totalParses - 1);
        this.performanceMetrics.averageTime = (totalTime + parseTime) / this.performanceMetrics.totalParses;
    }

    /**
     * 获取性能指标
     * @returns {Object} 性能指标信息
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            successRate: ((this.performanceMetrics.totalParses - this.performanceMetrics.errors) / this.performanceMetrics.totalParses * 100).toFixed(2) + '%',
            cacheHitRate: (this.performanceMetrics.cacheHits / this.performanceMetrics.totalParses * 100).toFixed(2) + '%',
            averageTime: this.performanceMetrics.averageTime.toFixed(3) + 'ms'
        };
    }

    /**
     * 寻找棋盘上所有指定类型的棋子
     * @param {string} color - 棋子颜色
     * @param {string} pieceType - 棋子类型
     * @param {Array} board - 棋盘状态
     * @returns {Array} 棋子位置数组
     */
    findAllPieces(color, pieceType, board) {
        const positions = [];

        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] &&
                    board[row][col].type === pieceType &&
                    board[row][col].color === color) {
                    positions.push({row, col});
                    console.log(`  ✅ 找到${color} ${pieceType}在位置: (${row}, ${col}), 路码: ${this.colToRoad(color, col)}`);
                }
            }
        }

        return positions;
    }

    /**
     * 当有多个棋子可选时，选择最合适的路码
     * @param {Array} positions - 棋子位置数组
     * @param {string} action - 动作
     * @param {number} targetInfo - 目标信息
     * @param {string} color - 颜色
     * @param {string} pieceType - 棋子类型
     * @param {Array} board - 棋盘状态
     * @returns {number} 选中的路码
     */
    selectBestRoadForMove(positions, action, targetInfo, color, pieceType, board) {
        // 对于大多数情况，选择能执行该移动的棋子
        for (const pos of positions) {
            try {
                const targetPosition = this.calculateTargetPosition(pos, action, targetInfo, color, pieceType);
                const [targetRow, targetCol] = [targetPosition.toRow, targetPosition.toCol];

                // 检查移动是否合法（简单检查）
                if (this.isValidMove(pos, {row: targetRow, col: targetCol}, color, pieceType, board)) {
                    console.log(`  ✅ 选择可行棋子路码: 位置(${pos.row}, ${pos.col}), 路码: ${this.colToRoad(color, pos.col)}`);
                    return this.colToRoad(color, pos.col);
                }
            } catch (error) {
                // 忽略无法计算的移动
            }
        }

        // 如果都没有找到，返回第一个（让后续验证处理）
        return this.colToRoad(color, positions[0].col);
    }

    /**
     * 在指定路上寻找指定类型的棋子
     * @param {string} color - 棋子颜色
     * @param {string} pieceType - 棋子类型
     * @param {number} targetCol - 目标列
     * @param {number} targetRoad - 目标路码
     * @param {Array} board - 棋盘状态
     * @returns {Array} 棋子位置数组
     */
    findPiecesOnRoad(color, pieceType, targetCol, targetRoad, board) {
        const positions = [];

        for (let row = 0; row < 10; row++) {
            if (board[row][targetCol] &&
                board[row][targetCol].type === pieceType &&
                board[row][targetCol].color === color) {
                positions.push({row, col: targetCol});
                console.log(`  ✅ 找到${color} ${pieceType}在${targetRoad}路: 位置(${row}, ${targetCol})`);
            }
        }

        return positions;
    }

    /**
     * 根据"前后"位置标识选择棋子
     * @param {Array} positions - 棋子位置数组
     * @param {string} positionModifier - 位置标识 ("前" | "后")
     * @param {string} color - 棋子颜色
     * @returns {Object} 选中的棋子位置
     */
    selectPieceByPosition(positions, positionModifier, color) {
        // 按行坐标排序，确定前后关系
        positions.sort((a, b) => {
            if (color === 'red') {
                // 红方：行号小的是前方（靠近黑方）
                return a.row - b.row;
            } else {
                // 黑方：行号大的是前方（靠近红方）
                return b.row - a.row;
            }
        });

        if (positionModifier === '前') {
            return positions[0]; // 最前面的棋子
        } else if (positionModifier === '后') {
            return positions[positions.length - 1]; // 最后面的棋子
        } else {
            throw new NotationParseError(`无效的位置标识: ${positionModifier}`, '', {
                type: 'invalid_position_modifier',
                positionModifier,
                validModifiers: ['前', '后']
            });
        }
    }

    /**
     * 当路上有多个棋子时，选择最合适的
     * @param {Array} positions - 棋子位置数组
     * @param {string} action - 动作
     * @param {number} targetInfo - 目标信息
     * @param {string} color - 颜色
     * @param {string} pieceType - 棋子类型
     * @param {Array} board - 棋盘状态
     * @returns {Object} 选中的棋子位置
     */
    selectBestPiece(positions, action, targetInfo, color, pieceType, board) {
        if (positions.length === 1) {
            console.log(`  ✅ 唯一棋子: 位置(${positions[0].row}, ${positions[0].col})`);
            return positions[0];
        }

        // 使用评分算法选择最佳棋子
        const scoredPositions = positions
            .map(pos => ({
                position: pos,
                score: this.calculatePieceScore(pos, action, targetInfo, color, pieceType, board)
            }))
            .sort((a, b) => b.score - a.score); // 按分数降序排序

        const bestPiece = scoredPositions[0].position;
        console.log(`  🎯 选择最佳棋子: 位置(${bestPiece.row}, ${bestPiece.col}), 评分: ${scoredPositions[0].score.toFixed(2)}`);

        return bestPiece;
    }

    /**
     * 计算棋子选择评分
     * @param {Object} position - 棋子位置 {row, col}
     * @param {string} action - 动作
     * @param {number} targetInfo - 目标信息
     * @param {string} color - 棋子颜色
     * @param {string} pieceType - 棋子类型
     * @param {Array} board - 棋盘状态
     * @returns {number} 评分分数
     */
    calculatePieceScore(position, action, targetInfo, color, pieceType, board) {
        let score = 0;

        try {
            // 1. 移动合法性检查（最重要，60分基础分）
            const targetPosition = this.calculateTargetPosition(position, action, targetInfo, color, pieceType);
            const [targetRow, targetCol] = [targetPosition.toRow, targetPosition.toCol];

            if (this.isValidMove(position, {row: targetRow, col: targetCol}, color, pieceType, board)) {
                score += 60; // 合法移动获得基础分
            } else {
                score -= 1000; // 非法移动严重扣分
                return score;
            }

            // 2. 战术位置评估（20分）
            score += this.calculateTacticalScore(position, targetPosition, color, pieceType, board);

            // 3. 棋子活跃度评估（15分）
            score += this.calculateActivityScore(position, action, color, pieceType);

            // 4. 移动质量评估（5分）
            score += this.calculateMoveQualityScore(position, targetPosition, action, pieceType);

        } catch (error) {
            // 计算过程中出错，严重扣分
            score -= 500;
        }

        return score;
    }

    /**
     * 计算战术位置评分
     * @param {Object} position - 棋子位置
     * @param {Object} targetPosition - 目标位置
     * @param {string} color - 棋子颜色
     * @param {string} pieceType - 棋子类型
     * @param {Array} board - 棋盘状态
     * @returns {number} 战术评分
     */
    calculateTacticalScore(position, targetPosition, color, pieceType, board) {
        let tacticalScore = 0;
        const targetPiece = board[targetPosition.toRow][targetPosition.toCol];

        // 吃子评分
        if (targetPiece && targetPiece.color !== color) {
            // 根据被吃棋子类型加权
            const pieceValue = {
                'soldier': 2,   // 兵卒
                'cannon': 4.5,  // 炮
                'horse': 4,      // 马
                'elephant': 2,  // 象相
                'advisor': 2,   // 士仕
                'rook': 9,      // 车車
                'king': 1000    // 将帅（不应该发生）
            };
            tacticalScore += (pieceValue[targetPiece.type] || 3) * 2;
        }

        // 控制中心评分
        const centerCol = 4;
        const targetCenterDistance = Math.abs(targetPosition.toCol - centerCol);
        tacticalScore += Math.max(0, 3 - targetCenterDistance) * 1;

        // 威胁对方重要位置评分
        if (pieceType === 'rook' || pieceType === 'cannon') {
            // 长距离棋子控制线路评分
            const distance = Math.abs(targetPosition.toRow - position.row) + Math.abs(targetPosition.toCol - position.col);
            tacticalScore += Math.min(distance * 0.2, 2);
        }

        return tacticalScore;
    }

    /**
     * 计算棋子活跃度评分
     * @param {Object} position - 棋子位置
     * @param {string} action - 移动动作
     * @param {string} color - 棋子颜色
     * @param {string} pieceType - 棋子类型
     * @returns {number} 活跃度评分
     */
    calculateActivityScore(position, action, color, pieceType) {
        let activityScore = 0;

        // 根据棋子当前活跃度评分
        if (color === 'red') {
            // 红方：行号越小越活跃（越接近对方）
            activityScore += Math.max(0, (9 - position.row) * 0.3);
        } else {
            // 黑方：行号越大越活跃（越接近对方）
            activityScore += Math.max(0, position.row * 0.3);
        }

        // 攻击性动作加分
        if (action === '进') {
            activityScore += pieceType === 'soldier' ? 1.5 : 1; // 兵卒前进更有价值
        } else if (action === '平') {
            activityScore += 0.5; // 平移也有一定活跃价值
        }

        // 棋子类型活跃度调整
        const pieceActivityBonus = {
            'rook': 1,      // 车本来就应该活跃
            'cannon': 1.2,  // 炮需要更多移动来发挥威力
            'horse': 0.8,   // 马适中
            'soldier': 1.5, // 兵越活跃越危险
            'elephant': 0.3, // 象相对防守
            'advisor': 0.2, // 士主要防守
            'king': 0.1      // 将帅很少移动
        };
        activityScore *= (pieceActivityBonus[pieceType] || 1);

        return activityScore;
    }

    /**
     * 计算移动质量评分
     * @param {Object} position - 棋子位置
     * @param {Object} targetPosition - 目标位置
     * @param {string} action - 动作
     * @param {string} pieceType - 棋子类型
     * @returns {number} 移动质量评分
     */
    calculateMoveQualityScore(position, targetPosition, action, pieceType) {
        let qualityScore = 0;

        // 移动距离评分（不同棋子偏好不同）
        const distance = Math.abs(targetPosition.toRow - position.row) + Math.abs(targetPosition.toCol - position.col);

        if (pieceType === 'rook' || pieceType === 'cannon') {
            // 长距离移动更好
            qualityScore += Math.min(distance * 0.5, 2);
        } else if (pieceType === 'horse' || pieceType === 'elephant') {
            // 马和象有固定跳跃距离，符合规则就是好的
            qualityScore += (distance >= 2 && distance <= 3) ? 1 : -0.5;
        } else if (pieceType === 'soldier') {
            // 兵前进比后退好
            qualityScore += action === '进' ? 1 : (action === '退' ? -1 : 0);
        }

        // 避免滞留原地
        if (distance === 0) {
            qualityScore -= 2;
        }

        return qualityScore;
    }

    /**
     * 计算目标位置
     * @param {Object} fromPos - 起始位置 {row, col}
     * @param {string} action - 动作 ('进' | '退' | '平')
     * @param {number} targetInfo - 目标信息
     * @param {string} color - 颜色
     * @param {string} pieceType - 棋子类型
     * @param {string} notation - 原始棋谱
     * @returns {Object} 移动结果
     */
    calculateMove(fromPos, action, targetInfo, color, pieceType, notation) {
        const targetPosition = this.calculateTargetPosition(fromPos, action, targetInfo, color, pieceType);

        console.log(`  计算${action}移动: 目标位置(${targetPosition.toRow}, ${targetPosition.toCol})`);

        return {
            pieceType,
            fromPos: {row: fromPos.row, col: fromPos.col},
            toPos: {row: targetPosition.toRow, col: targetPosition.toCol},
            action,
            notation
        };
    }

    /**
     * 计算目标位置的核心算法
     * @param {Object} fromPos - 起始位置
     * @param {string} action - 动作类型
     * @param {number} targetInfo - 目标信息
     * @param {string} color - 棋子颜色
     * @param {string} pieceType - 棋子类型
     * @returns {Object} 目标位置 {toRow, toCol}
     */
    calculateTargetPosition(fromPos, action, targetInfo, color, pieceType) {
        let toRow, toCol;

        if (action === '平') {
            // "平"表示横向移动，targetInfo是目标路码
            toCol = this.roadToCol(color, targetInfo);
            toRow = fromPos.row;

            console.log(`    平移: 从${this.colToRoad(color, fromPos.col)}路平移到${targetInfo}路`);
        }
        else if (action === '进' || action === '退') {
            // "进"表示向前移动，"退"表示向后移动
            // targetInfo的含义取决于棋子类型和具体情况

            if (pieceType === 'rook' || pieceType === 'cannon' || pieceType === 'soldier') {
                // 车、炮、兵：targetInfo是步数
                const steps = targetInfo;

                if (color === 'red') {
                    // 红方向前（进）是行号减少，向后（退）是行号增加
                    toRow = action === '进' ? fromPos.row - steps : fromPos.row + steps;
                } else {
                    // 黑方向前（进）是行号增加，向后（退）是行号减少
                    toRow = action === '进' ? fromPos.row + steps : fromPos.row - steps;
                }
                toCol = fromPos.col;

                console.log(`    ${action}${steps}步: 行${fromPos.row}→${toRow}`);
            }
            else if (pieceType === 'horse') {
                // 马：targetInfo是目标路码，需要根据日字移动推断
                toCol = this.roadToCol(color, targetInfo);
                const colDiff = Math.abs(toCol - fromPos.col);

                // 马走日字：横向1格+纵向2格，或者横向2格+纵向1格
                let possiblePositions = [];

                if (colDiff === 1) {
                    // 横向移动1格，纵向移动±2格
                    const forwardRow = color === 'red' ? fromPos.row - 2 : fromPos.row + 2;
                    const backwardRow = color === 'red' ? fromPos.row + 2 : fromPos.row - 2;
                    possiblePositions.push(forwardRow, backwardRow);
                } else if (colDiff === 2) {
                    // 横向移动2格，纵向移动±1格
                    const forwardRow = color === 'red' ? fromPos.row - 1 : fromPos.row + 1;
                    const backwardRow = color === 'red' ? fromPos.row + 1 : fromPos.row - 1;
                    possiblePositions.push(forwardRow, backwardRow);
                } else {
                    throw new NotationParseError(`马的移动规则错误：横向移动差值为${colDiff}，不符合日字移动`, '', {
                        type: 'invalid_horse_movement',
                        colDiff,
                        expectedColDiff: [1, 2],
                        pieceType: 'horse'
                    });
                }

                // 根据动作选择正确的方向
                if (action === '进') {
                    // "进"选择向前移动的位置
                    toRow = possiblePositions[0]; // 第一个元素是向前的位置
                } else if (action === '退') {
                    // "退"选择向后移动的位置
                    toRow = possiblePositions[1]; // 第二个元素是向后的位置
                } else {
                    throw new NotationParseError(`马不支持动作: ${action}`, '', {
                        type: 'invalid_horse_action',
                        action,
                        validActions: ['进', '退'],
                        pieceType: 'horse'
                    });
                }

                console.log(`    马走日: 列${fromPos.col}→${toCol}(差${colDiff}), 行${fromPos.row}→${toRow}(${action})`);
            }
            else if (pieceType === 'elephant') {
                // 象：targetInfo是目标路码
                toCol = this.roadToCol(color, targetInfo);
                const colDiff = Math.abs(toCol - fromPos.col);

                if (colDiff !== 2) {
                    throw new NotationParseError('象的移动规则错误：必须走田字，横向2格', '', {
                        type: 'invalid_elephant_movement',
                        colDiff,
                        expectedColDiff: 2,
                        pieceType: 'elephant'
                    });
                }

                // 象走田字，纵向移动2格
                if (action === '进') {
                    // "进"都是向对方阵地移动
                    toRow = color === 'red' ? fromPos.row - 2 : fromPos.row - 2;
                } else if (action === '退') {
                    // "退"都是向己方阵地移动
                    toRow = color === 'red' ? fromPos.row + 2 : fromPos.row + 2;
                } else {
                    throw new NotationParseError(`象不支持动作: ${action}`, '', {
                        type: 'invalid_elephant_action',
                        action,
                        validActions: ['进', '退'],
                        pieceType: 'elephant'
                    });
                }

                console.log(`    象走田: 列${fromPos.col}→${toCol}, 行${fromPos.row}→${toRow}(${action})`);
            }
            else if (pieceType === 'advisor' || pieceType === 'king') {
                // 士和将：可以斜向移动或直线移动
                toCol = this.roadToCol(color, targetInfo);
                const colDiff = Math.abs(toCol - fromPos.col);

                if (colDiff === 0) {
                    // 直线移动，targetInfo表示步数
                    toCol = fromPos.col;
                    if (color === 'red') {
                        toRow = action === '进' ? fromPos.row - targetInfo : fromPos.row + targetInfo;
                    } else {
                        toRow = action === '进' ? fromPos.row + targetInfo : fromPos.row - targetInfo;
                    }
                } else if (colDiff === 1) {
                    // 斜向移动，每次移动1格
                    if (color === 'red') {
                        toRow = action === '进' ? fromPos.row - 1 : fromPos.row + 1;
                    } else {
                        toRow = action === '进' ? fromPos.row + 1 : fromPos.row - 1;
                    }
                } else {
                    throw new NotationParseError('将/士的移动规则错误', '', {
                        type: 'invalid_advisor_king_movement',
                        colDiff,
                        expectedColDiff: [0, 1],
                        pieceType
                    });
                }

                console.log(`    ${pieceType}移动: 列${fromPos.col}→${toCol}, 行${fromPos.row}→${toRow}`);
            }
            else {
                throw new NotationParseError(`不支持的棋子类型: ${pieceType}`, '', {
                    type: 'unsupported_piece_type',
                    pieceType,
                    supportedTypes: ['rook', 'cannon', 'soldier', 'horse', 'elephant', 'advisor', 'king']
                });
            }
        }

        // 验证目标位置是否在棋盘内
        if (toRow < 0 || toRow > 9 || toCol < 0 || toCol > 8) {
            const fromRoad = this.colToRoad(color, fromPos.col);
            const targetRoad = color === 'red' ? 9 - toCol : toCol + 1;
            throw new NotationParseError(`目标位置(${toRow}, ${toCol})超出棋盘范围`, '', {
                type: 'out_of_bounds',
                toRow,
                toCol,
                validRange: { rows: '0-9', cols: '0-8' },
                pieceType,
                fromRoad,
                action,
                targetInfo
            });
        }

        return { toRow, toCol };
    }

    /**
     * 简单的移动合法性检查
     * @param {Object} fromPos - 起始位置
     * @param {Object} toPos - 目标位置
     * @param {string} color - 棋子颜色
     * @param {string} pieceType - 棋子类型
     * @param {Array} board - 棋盘状态
     * @returns {boolean} 是否合法
     */
    isValidMove(fromPos, toPos, color, pieceType, board) {
        // 检查目标位置是否有己方棋子
        if (toPos.row >= 0 && toPos.row <= 9 && toPos.col >= 0 && toPos.col <= 8) {
            const targetPiece = board[toPos.row][toPos.col];
            if (targetPiece && targetPiece.color === color) {
                return false;
            }
        }

        return true; // 这里可以加入更复杂的移动规则检查
    }

    /**
     * 解析棋谱序列
     * @param {Array} notations - 棋谱数组
     * @returns {Array} 解析结果
     */
    parseNotationSequence(notations) {
        const result = [];
        let board = this.createInitialBoard();

        for (let i = 0; i < notations.length; i++) {
            const notation = notations[i];
            const color = i % 2 === 0 ? 'red' : 'black';

            try {
                const move = this.parseNotation(notation, color, board);

                result.push({
                    color,
                    pieceType: move.pieceType,
                    fromPos: [move.fromPos.row, move.fromPos.col],
                    toPos: [move.toPos.row, move.toPos.col],
                    notation
                });

                // 更新棋盘状态
                this.updateBoard(board, move);

            } catch (error) {
                console.error(`解析棋谱失败: ${color} ${notation}`, error.message);
                throw error;
            }
        }

        return result;
    }

    /**
     * 创建初始棋盘
     */
    createInitialBoard() {
        const board = Array(10).fill(null).map(() => Array(9).fill(null));

        // 放置红方棋子
        Object.entries(this.standardLayout.red).forEach(([pieceType, positions]) => {
            positions.forEach(pos => {
                board[pos.row][pos.col] = {type: pieceType, color: 'red'};
            });
        });

        // 放置黑方棋子
        Object.entries(this.standardLayout.black).forEach(([pieceType, positions]) => {
            positions.forEach(pos => {
                board[pos.row][pos.col] = {type: pieceType, color: 'black'};
            });
        });

        return board;
    }

    /**
     * 更新棋盘状态
     */
    updateBoard(board, move) {
        const {fromPos, toPos} = move;
        board[toPos.row][toPos.col] = board[fromPos.row][fromPos.col];
        board[fromPos.row][fromPos.col] = null;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChessNotationParserV2, NotationParseError };
} else if (typeof window !== 'undefined') {
    window.ChessNotationParserV2 = ChessNotationParserV2;
    window.NotationParseError = NotationParseError;
}