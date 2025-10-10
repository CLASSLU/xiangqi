/**
 * GameDemonstration - 棋谱播放和演示模块
 * 负责棋谱加载、播放、步骤导航等功能
 */

class GameDemonstration {
    constructor(xiangqiGame) {
        this.game = xiangqiGame;  // 关联的XiangqiGame实例
        this.moveHistory = [];
        this.currentStep = -1;
        this.isAutoPlaying = false;
        this.audioManager = null;
    }

    /**
     * 加载并播放经典棋局
     * @param {string} gameName - 游戏名称
     */
    async loadAndPlayClassicGame(gameName) {
        console.log('经典棋局功能已取消，正在加载爬取棋谱分类...');

        // 重定向到分类界面
        if (typeof this.game.showClassificationPanel === 'function') {
            await this.game.showClassificationPanel();
        }
        return false;
    }

    /**
     * 尝试使用解析器加载棋局
     * @param {string} gameName - 游戏名称
     */
    async loadAndPlayClassicGameWithParser(gameName) {
        // 如果有ChessNotationParserV2，尝试使用标准记谱法解析
        if (typeof ChessNotationParserV2 !== 'undefined') {
            try {
                const standardNotations = this.getStandardNotations(gameName);
                if (standardNotations) {
                    const gameMoves = this.parseStandardNotationWithV2(standardNotations);
                    if (gameMoves && gameMoves.length > 0) {
                        console.log(`✅ 使用解析器数据: ${gameName}`);
                        return this.loadAndPlayClassicGameWithData(gameName, gameMoves);
                    }
                }
            } catch (error) {
                console.warn(`解析器加载失败，降级到原有方法: ${error.message}`);
            }
        }

        console.log('棋谱解析器不可用，降级到原有方法');
        return this.loadAndPlayClassicGameOriginal(gameName);
    }

    /**
     * 获取标准棋谱记谱法
     * @param {string} gameName - 游戏名称
     */
    getStandardNotations(gameName) {
        const standardGames = {
            "中炮对屏风马经典": [
                "炮二平五", "马8进7", "马二进三", "马2进三",
                "车一平二", "车9平8", "兵七进一", "卒7进一"
            ],
            "顺炮布局": [
                "炮二平五", "炮8平5", "马二进三", "马8进7",
                "车一平二", "车9平8", "兵三进一", "车9进1"
            ]
        };
        return standardGames[gameName] || null;
    }

    /**
     * 使用V2解析器解析标准记谱法
     * @param {Array} standardNotations - 标准记谱法数组
     */
    async parseStandardNotationWithV2(standardNotations) {
        if (!standardNotations || !Array.isArray(standardNotations)) {
            return [];
        }

        // 确保棋盘已初始化
        if (!this.game || !this.game.board) {
            this.game.createBoard();
            this.game.setupPieces();
        }

        const parser = new ChessNotationParserV2();
        const gameMoves = [];

        try {
            for (let i = 0; i < standardNotations.length; i++) {
                const notation = standardNotations[i];
                if (notation && typeof notation === 'string') {
                    const color = i % 2 === 0 ? 'red' : 'black';
                    const board = this.getCurrentBoardState();

                    const result = parser.parseNotation(notation, color, board);

                    if (result && result.color && result.pieceType && result.fromPos) {
                        gameMoves.push([
                            result.color,
                            result.pieceType,
                            result.fromPos,
                            result.toPos,
                            notation
                        ]);
                    } else {
                        console.warn(`无法解析棋步: ${notation}`);
                    }
                }
            }
        } catch (error) {
            console.error('V2解析器解析出错:', error);
        }

        return gameMoves;
    }

    /**
     * 获取当前棋盘状态
     */
    getCurrentBoardState() {
        if (!this.game || !this.game.pieces) {
            return [];
        }

        return this.game.pieces.map(piece => ({
            type: piece.dataset.type,
            color: piece.dataset.color,
            row: parseInt(piece.dataset.row),
            col: parseInt(piece.dataset.col)
        }));
    }

    /**
     * 使用原始内嵌数据方法
     * @param {string} gameName - 游戏名称
     */
    async loadAndPlayClassicGameOriginal(gameName) {
        console.log(`使用原始内嵌数据方法: ${gameName}`);
        return this.loadAndPlayClassicGameDataOriginal(gameName);
    }

    /**
     * 使用数据加载棋谱
     * @param {string} gameName - 游戏名称
     * @param {Array} gameMoves - 棋步数据
     */
    loadAndPlayClassicGameWithData(gameName, gameMoves) {
        if (!this.game.board) {
            this.game.createBoard();
            this.game.setupPieces();
        }

        // 重置游戏状态
        this.game.resetGame();
        this.game.gamePhase = 'demonstration';

        // 设置移动历史
        this.moveHistory = gameMoves.map(move => ({
            pieceType: move[1] || move.pieceType,
            pieceColor: move[0] || move.color,
            from: move[2] || move.fromPos,
            to: move[3] || move.toPos,
            notation: move[4] || move.notation
        }));

        // 清空棋盘并设置演示棋子
        this.createDemonstrationPieces(gameMoves);

        // 播放棋步
        this.playDemonstrationMoves(gameName, gameMoves);

        // 更新步骤显示
        if (typeof document !== 'undefined') {
            this.updateRecordStepsDisplay(gameMoves);
            this.setupFixedGameButtons();
        }

        console.log(`成功加载棋谱: ${gameName}，共 ${gameMoves.length} 步 (使用解析器数据)`);
        return true;
    }

    /**
     * 使用原始数据加载棋谱游戏
     * @param {string} gameName - 游戏名称
     */
    async loadAndPlayClassicGameDataOriginal(gameName) {
        try {
            // 尝试从分类数据中加载
            const response = await fetch('./data/classified-games.json');
            if (!response.ok) throw new Error('Failed to load classified games');

            const data = await response.json();
            const categories = Object.keys(data.games);

            for (let categoryId of categories) {
                const category = data.games[categoryId];
                if (category.games && Array.isArray(category.games)) {
                    const game = category.games.find(g => g.title === gameName);
                    if (game) {
                        return this.game.loadAndPlayClassifiedGame(game);
                    }
                }
            }

            console.warn(`未找到棋谱: ${gameName}`);
            return false;

        } catch (error) {
            console.error('加载分类棋谱数据库失败:', error);
            return false;
        }
    }

    /**
     * 使用演示方式加载分类棋谱
     * @param {string} gameName - 游戏名称
     * @param {Array} gameMoves - 棋步数据
     */
    loadAndPlayClassifiedGameWithDemo(gameName, gameMoves) {
        if (!this.game.board) {
            this.game.createBoard();
            this.game.setupPieces();
        }

        // 重置游戏状态
        this.game.resetGame();
        this.game.gamePhase = 'demonstration';

        // 设置移动历史 - 使用标准化格式
        this.moveHistory = gameMoves.map(move => ({
            pieceType: move[1] || move.pieceType,
            pieceColor: move[0] || move.color,
            from: move[2] || move.fromPos,
            to: move[3] || move.toPos,
            notation: move[4] || move.notation
        }));

        // 清空棋盘并设置演示棋子
        this.createDemonstrationPieces(gameMoves);

        // 播放棋步
        this.playDemonstrationMoves(gameName, gameMoves);

        // 更新UI显示
        if (typeof document !== 'undefined') {
            this.updateRecordStepsDisplay(gameMoves);
            this.setupFixedGameButtons();
        }

        console.log(`成功棋谱演示: ${gameName}，共 ${gameMoves.length} 步`);
        return true;
    }

    /**
     * 创建演示棋子
     * @param {Array} gameMoves - 棋步数据
     */
    createDemonstrationPieces(gameMoves) {
        // 清空现有棋子
        const pieces = this.game.board.querySelectorAll('.piece');
        pieces.forEach(piece => piece.remove());

        // 分析棋步，确定需要的棋子
        const requiredPieces = new Set();
        gameMoves.forEach(move => {
            if (move[0] && move[1]) { // [color, type, from, to, notation]
                requiredPieces.add(`${move[0]}-${move[1]}`);
            }
        });

        // 创建所需棋子
        requiredPieces.forEach(pieceKey => {
            const [color, type] = pieceKey.split('-');
            // 在演示模式中，我们会根据棋步动态创建棋子
        });
    }

    /**
     * 在指定位置创建棋子
     * @param {Object} pieceInfo - 棋子信息 {color, type, row, col}
     */
    createPieceAtPosition(pieceInfo) {
        const { color, type, row, col } = pieceInfo;

        if (!color || !type || row === undefined || col === undefined) {
            return null;
        }

        const pieceData = {
            type: type,
            color: color,
            char: this.game.getPieceCharacter(type, color)
        };

        const piece = this.game.createPiece(pieceData);
        piece.dataset.row = row;
        piece.dataset.col = col;

        // 计算位置
        const cellSize = 60;
        const boardLeft = 50;
        const boardTop = 50;

        const x = boardLeft + col * cellSize;
        const y = boardTop + (9 - row) * cellSize;

        piece.style.left = x + 'px';
        piece.style.top = y + 'px';

        this.game.board.appendChild(piece);
        return piece;
    }

    /**
     * 播放演示棋步
     * @param {string} gameName - 游戏名称
     * @param {Array} gameMoves - 棋步数据
     */
    async playDemonstrationMoves(gameName, gameMoves) {
        // 重置到演示开始状态
        if (this.resetToStartPosition) {
            this.resetToStartPosition();
        }

        // 延迟播放每一步
        for (let i = 0; i < gameMoves.length; i++) {
            const move = gameMoves[i];
            await this.playSingleMove(move, i);

            // 短暂延迟
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        console.log(`✅ 棋谱演示完成: ${gameName}`);
    }

    /**
     * 播放单个棋步
     * @param {Array|Object} move - 棋步信息
     * @param {number} moveIndex - 棋步索引
     */
    async playSingleMove(move, moveIndex) {
        const fromRow = move[2] ? move[2][0] : (move.fromPos ? move.fromPos[0] : undefined);
        const fromCol = move[2] ? move[2][1] : (move.fromPos ? move.fromPos[1] : undefined);
        const toRow = move[3] ? move[3][0] : (move.toPos ? move.toPos[0] : undefined);
        const toCol = move[3] ? move[3][1] : (move.toPos ? move.toPos[1] : undefined);
        const color = move[0] || move.color;
        const pieceType = move[1] || move.pieceType;

        // 查找或创建源棋子
        let piece = this.findOrCreatePiece(color, pieceType, fromRow, fromCol);

        if (piece) {
            // 移动棋子
            const cellSize = 60;
            const boardLeft = 50;
            const boardTop = 50;

            const fromX = boardLeft + fromCol * cellSize;
            const fromY = boardTop + (9 - fromRow) * cellSize;
            const toX = boardLeft + toCol * cellSize;
            const toY = boardTop + (9 - toRow) * cellSize;

            // 设置起始位置
            piece.style.left = fromX + 'px';
            piece.style.top = fromY + 'px';

            // 动画移动
            piece.style.transition = 'all 0.5s ease-in-out';

            setTimeout(() => {
                piece.style.left = toX + 'px';
                piece.style.top = toY + 'px';
                piece.dataset.row = toRow;
                piece.dataset.col = toCol;

                // 播放音效
                if (this.audioManager && typeof this.audioManager.playMoveSound === 'function') {
                    this.audioManager.playMoveSound();
                }
            }, 50);

            // 记录到移动历史
            this.moveHistory.push({
                pieceType: pieceType,
                pieceColor: color,
                from: { row: fromRow, col: fromCol },
                to: { row: toRow, col: toCol },
                notation: move[4] || move.notation
            });

            console.log(`✅ 第${moveIndex + 1}步: ${color} ${pieceType} (${fromRow},${fromCol}) → (${toRow},${toCol})`);
        } else {
            console.warn(`未找到棋子: ${color} ${pieceType} 在位置 (${fromRow}, ${fromCol})`);
        }
    }

    /**
     * 查找或创建棋子
     * @param {string} color - 棋子颜色
     * @param {string} pieceType - 棋子类型
     * @param {number} row - 行
     * @param {number} col - 列
     */
    findOrCreatePiece(color, pieceType, row, col) {
        // 首先尝试在棋盘上查找
        let piece = this.game.getPieceAt(row, col);

        if (piece && piece.dataset.color === color && piece.dataset.type === pieceType) {
            return piece;
        }

        // 如果没找到，查找最近移动过的相同棋子
        const allPieces = this.game.board.querySelectorAll('.piece');
        for (const existingPiece of allPieces) {
            if (existingPiece.dataset.color === color && existingPiece.dataset.type === pieceType) {
                return existingPiece;
            }
        }

        // 创建新棋子
        return this.createPieceAtPosition({ color, type: pieceType, row, col });
    }

    /**
     * 更新棋谱步骤显示
     * @param {Array} gameMoves - 棋步数据 或 符号字符串数组
     */
    updateRecordStepsDisplay(gameMoves) {
        // 兼容两种不同的DOM元素ID
        let targetList = document.getElementById('movesList') || document.getElementById('stepsList');
        if (!targetList) return;

        // 清空现有步骤
        targetList.innerHTML = '';

        // 兼容两种数据格式
        if (gameMoves.length > 0 && typeof gameMoves[0] === 'string') {
            // 字符串数组格式：['炮二平五', '马8进7']
            this._displayNotationSteps(targetList, gameMoves);
        } else {
            // 完整棋步格式：[[color, type, from, to, notation], ...]
            this._displayGameMovesSteps(targetList, gameMoves);
        }

        console.log(`已更新棋谱步骤显示，共${gameMoves.length}步`);
    }

    /**
     * 显示符号步骤格式
     * @param {HTMLElement} targetList - 目标列表元素
     * @param {Array} notations - 符号数组
     */
    _displayNotationSteps(targetList, notations) {
        notations.forEach((notation, index) => {
            const li = document.createElement('li');
            const isRedMove = index % 2 === 0;
            const colorText = isRedMove ? '红' : '黑';
            const stepNumber = Math.floor(index / 2) + 1;

            li.innerHTML = `
                <span class="step-number">${stepNumber}${isRedMove ? '...' : ''}</span>
                <span class="step-color ${isRedMove ? 'red' : 'black'}">${colorText}</span>
                <span class="step-notation">${notation || '无记录'}</span>
            `;

            li.className = 'step-item';
            li.dataset.stepIndex = index;

            // 添加点击事件
            li.addEventListener('click', () => {
                this.playToStep(index);
                this.highlightCurrentStep(index);
            });

            targetList.appendChild(li);
        });
    }

    /**
     * 显示完整棋步格式
     * @param {HTMLElement} targetList - 目标列表元素
     * @param {Array} gameMoves - 棋步数组
     */
    _displayGameMovesSteps(targetList, gameMoves) {
        gameMoves.forEach((move, index) => {
            const stepItem = document.createElement('div');
            stepItem.className = 'move-step';
            stepItem.dataset.step = index;

            const moveNumber = Math.floor(index / 2) + 1;
            const isRedMove = index % 2 === 0;
            const color = isRedMove ? '红' : '黑';
            const notation = move[4] || move.notation || `${move[1] || move.pieceType}移动`;

            stepItem.innerHTML = `
                <span class="move-number">${moveNumber}.</span>
                <span class="move-color ${isRedMove ? 'red' : 'black'}">${color}</span>
                <span class="move-notation">${notation}</span>
            `;

            // 添加点击事件
            stepItem.addEventListener('click', () => {
                this.playToStep(index);
                this.highlightCurrentStep(index);
            });

            targetList.appendChild(stepItem);
        });
    }

    /**
     * 跳转到指定步骤
     * @param {number} targetStep - 目标步骤索引
     */
    playToStep(targetStep) {
        if (targetStep < 0 || targetStep >= this.moveHistory.length) {
            console.warn(`无效的步骤索引: ${targetStep}`);
            return;
        }

        console.log(`跳转到第${targetStep + 1}步`);

        // 重置到演示开始状态
        if (this.game.resetToStartPosition) {
            this.game.resetToStartPosition();
        }

        // 清空棋盘但保持状态
        const pieces = this.game.board.querySelectorAll('.piece');
        pieces.forEach(piece => piece.remove());

        // 逐步执行棋步到目标
        for (let i = 0; i <= targetStep; i++) {
            const move = this.moveHistory[i];
            const fromRow = move.from ? move.from.row : undefined;
            const fromCol = move.from ? move.from.col : undefined;
            const toRow = move.to ? move.to.row : undefined;
            const toCol = move.to ? move.to.col : undefined;
            const color = move.pieceColor;
            const pieceType = move.pieceType;

            if (!fromRow || !fromCol || !toRow || !toCol) {
                console.warn(`在第${i + 1}步未找到棋子: ${color} ${pieceType} 在位置 (${fromRow}, ${fromCol})`);
                continue;
            }

            // 查找或创建棋子
            let piece = this.findOrCreatePiece(color, pieceType, fromRow, fromCol);

            if (piece) {
                // 立即移动到目标位置（无动画）
                const cellSize = 60;
                const boardLeft = 50;
                const boardTop = 50;
                const x = boardLeft + toCol * cellSize;
                const y = boardTop + (9 - toRow) * cellSize;

                piece.style.transition = 'none';
                piece.style.left = x + 'px';
                piece.style.top = y + 'px';
                piece.dataset.row = toRow;
                piece.dataset.col = toCol;

                // 交替玩家
                this.game.currentPlayer = i % 2 === 0 ? 'black' : 'red';
            }
        }

        this.currentStep = targetStep;
        this.highlightCurrentStep(targetStep);

        console.log(`跳转完成，当前回合: ${this.game.currentPlayer === 'red' ? '红方' : '黑方'}`);
    }

    /**
     * 高亮当前步骤
     * @param {number} stepIndex - 步骤索引
     */
    highlightCurrentStep(stepIndex) {
        const steps = document.querySelectorAll('.move-step');
        steps.forEach((step, index) => {
            if (index === stepIndex) {
                step.classList.add('current');
                step.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                step.classList.remove('current');
            }
        });
    }

    /**
     * 重置到演示开始位置
     */
    resetToStartPosition() {
        if (this.game.gamePhase !== 'demonstration') return;

        const pieces = this.game.board.querySelectorAll('.piece');
        pieces.forEach(piece => {
            if (piece.parentNode) {
                piece.remove();
            }
        });

        this.moveHistory = [];
        this.currentStep = -1;
    }

    /**
     * 自动完整播放棋局（修复版）
     */
    async autoPlayFullGame() {
        if (!this.moveHistory || this.moveHistory.length === 0) {
            if (typeof showMessage !== 'undefined') {
                showMessage('没有可自动播放的棋谱', 'warning');
            }
            return;
        }

        this.isAutoPlaying = true;
        this.currentStep = -1;
        console.log('开始自动播放...');

        // 重置到起始状态
        this.resetToStartPosition();

        try {
            for (let i = 0; i < this.moveHistory.length; i++) {
                if (!this.isAutoPlaying) break; // 允许中途停止

                const move = this.moveHistory[i];
                console.log(`🎬 播放第${i + 1}步: ${move.notation || move.pieceType}`);

                // 执行单步移动
                await this.playSingleMoveAuto(move, i);

                // 高亮当前步骤
                this.currentStep = i;
                this.highlightCurrentStep(i);

                // 等待一段时间再播放下一步
                if (i < this.moveHistory.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            }

            if (this.isAutoPlaying && typeof showMessage !== 'undefined') {
                showMessage('自动播放完成', 'success');
            }
        } catch (error) {
            console.error('自动播放出错:', error);
            if (typeof showMessage !== 'undefined') {
                showMessage('自动播放出错', 'error');
            }
        } finally {
            this.isAutoPlaying = false;

            // 恢复按钮显示
            const autoPlayBtn = document.getElementById('autoPlayBtn');
            const pausePlayBtn = document.getElementById('pausePlayBtn');
            if (autoPlayBtn) autoPlayBtn.style.display = 'inline-block';
            if (pausePlayBtn) pausePlayBtn.style.display = 'none';
        }
    }

    /**
     * 自动播放模式下的单步移动
     * @param {Object} move - 移动信息
     * @param {number} moveIndex - 移动索引
     */
    async playSingleMoveAuto(move, moveIndex) {
        const fromRow = move.from ? move.from.row : undefined;
        const fromCol = move.from ? move.from.col : undefined;
        const toRow = move.to ? move.to.row : undefined;
        const toCol = move.to ? move.to.col : undefined;
        const color = move.pieceColor;
        const pieceType = move.pieceType;

        if (!fromRow || !fromCol || !toRow || !toCol) {
            console.warn(`第${moveIndex + 1}步数据不完整:`, move);
            return;
        }

        // 查找或创建棋子
        let piece = this.findOrCreatePiece(color, pieceType, fromRow, fromCol);

        if (piece) {
            // 带动画的移动
            const cellSize = 70; // 保持与主游戏一致
            const boardLeft = 0; // 与主游戏坐标一致
            const boardTop = 0;

            const toX = boardLeft + toCol * cellSize;
            const toY = boardTop + toRow * cellSize;

            // 设置移动动画
            piece.style.transition = 'all 0.8s ease-in-out';

            // 短暂延迟后执行移动
            await new Promise(resolve => setTimeout(resolve, 100));

            piece.style.left = toX + 'px';
            piece.style.top = toY + 'px';
            piece.dataset.row = toRow;
            piece.dataset.col = toCol;

            // 等待动画完成
            await new Promise(resolve => setTimeout(resolve, 800));

            // 播放音效
            if (this.game && this.game.audioManager && typeof this.game.audioManager.playMoveSound === 'function') {
                this.game.audioManager.playMoveSound();
            }

            // 交替玩家
            this.game.currentPlayer = this.game.currentPlayer === 'red' ? 'black' : 'red';

            console.log(`✅ 第${moveIndex + 1}步完成: ${color} ${pieceType}`);
        } else {
            console.warn(`第${moveIndex + 1}步未找到棋子: ${color} ${pieceType} 在位置 (${fromRow}, ${fromCol})`);
        }
    }

    /**
     * 停止自动播放（修复版）
     */
    stopAutoPlay() {
        if (this.isAutoPlaying) {
            this.isAutoPlaying = false;
            console.log('⏹️ 停止自动播放');

            // 清除所有棋子的动画
            const pieces = document.querySelectorAll('.piece');
            pieces.forEach(piece => {
                piece.style.transition = 'none';
            });

            if (typeof showMessage !== 'undefined') {
                showMessage('已停止自动播放', 'info');
            }
        } else {
            console.log('没有正在进行的自动播放');
        }
    }

    /**
     * 设置固定游戏按钮
     */
    setupFixedGameButtons() {
        const recordButtons = document.getElementById('recordButtons');
        if (!recordButtons) return;

        recordButtons.innerHTML = `
            <div class="demo-controls">
                <button id="autoPlayBtn">▶️ 自动播放</button>
                <button id="pausePlayBtn" style="display:none;">⏸️ 暂停</button>
                <button id="stopPlayBtn">⏹️ 停止</button>
                <button id="resetDemoBtn">🔄 重置</button>
                <button id="prevStepBtn">⏮️ 上一步</button>
                <button id="nextStepBtn">⏭️ 下一步</button>
            </div>
            <p style="margin: 5px 0; color: #666; font-size: 12px;">
                棋谱演示模式 - 点击下方步骤可跳转 | 当前: <span id="currentStepDisplay">0/0</span>
            </p>
        `;

        // 设置事件监听器
        const autoPlayBtn = document.getElementById('autoPlayBtn');
        const pausePlayBtn = document.getElementById('pausePlayBtn');
        const stopPlayBtn = document.getElementById('stopPlayBtn');
        const resetDemoBtn = document.getElementById('resetDemoBtn');
        const prevStepBtn = document.getElementById('prevStepBtn');
        const nextStepBtn = document.getElementById('nextStepBtn');

        if (autoPlayBtn) {
            autoPlayBtn.addEventListener('click', () => this.startAutoPlay());
        }
        if (pausePlayBtn) {
            pausePlayBtn.addEventListener('click', () => this.pauseAutoPlay());
        }
        if (stopPlayBtn) {
            stopPlayBtn.addEventListener('click', () => this.stopAutoPlay());
        }
        if (resetDemoBtn) {
            resetDemoBtn.addEventListener('click', () => {
                this.resetToStartPosition();
                this.updateStepDisplay();
            });
        }
        if (prevStepBtn) {
            prevStepBtn.addEventListener('click', () => this.previousStep());
        }
        if (nextStepBtn) {
            nextStepBtn.addEventListener('click', () => this.nextStep());
        }

        // 初始化步骤显示
        this.updateStepDisplay();
    }

    /**
     * 开始自动播放
     */
    startAutoPlay() {
        if (this.isAutoPlaying) {
            console.log('自动播放已在进行中');
            return;
        }

        // 切换按钮显示
        const autoPlayBtn = document.getElementById('autoPlayBtn');
        const pausePlayBtn = document.getElementById('pausePlayBtn');
        if (autoPlayBtn) autoPlayBtn.style.display = 'none';
        if (pausePlayBtn) pausePlayBtn.style.display = 'inline-block';

        this.autoPlayFullGame();
    }

    /**
     * 暂停自动播放
     */
    pauseAutoPlay() {
        if (!this.isAutoPlaying) {
            console.log('没有正在进行的自动播放');
            return;
        }

        this.isAutoPlaying = false;
        console.log('⏸️ 暂停自动播放');

        // 切换按钮显示
        const autoPlayBtn = document.getElementById('autoPlayBtn');
        const pausePlayBtn = document.getElementById('pausePlayBtn');
        if (autoPlayBtn) autoPlayBtn.style.display = 'inline-block';
        if (pausePlayBtn) pausePlayBtn.style.display = 'none';

        if (typeof showMessage !== 'undefined') {
            showMessage('已暂停自动播放', 'info');
        }
    }

    /**
     * 上一步
     */
    previousStep() {
        if (this.currentStep > 0) {
            this.playToStep(this.currentStep - 1);
            this.updateStepDisplay();
        }
    }

    /**
     * 下一步
     */
    nextStep() {
        if (this.currentStep < this.moveHistory.length - 1) {
            this.playToStep(this.currentStep + 1);
            this.updateStepDisplay();
        }
    }

    /**
     * 更新步骤显示
     */
    updateStepDisplay() {
        const stepDisplay = document.getElementById('currentStepDisplay');
        if (stepDisplay) {
            const current = Math.max(0, this.currentStep + 1);
            const total = this.moveHistory.length;
            stepDisplay.textContent = `${current}/${total}`;
        }
    }

    /**
     * 解析标准记谱法
     * @param {Array} standardNotations - 标准记谱法数组
     */
    parseStandardNotation(standardNotations) {
        if (!standardNotations || !Array.isArray(standardNotations)) {
            return [];
        }

        const gameMoves = [];

        try {
            if (typeof ChessNotationParserV2 !== 'undefined') {
                // 确保棋盘已初始化
                if (!this.game || !this.game.board) {
                    this.game.createBoard();
                    this.game.setupPieces();
                }

                const parser = new ChessNotationParserV2();

                // 使用ChessNotationParserV2解析
                standardNotations.forEach((notation, index) => {
                    if (notation && typeof notation === 'string') {
                        const color = index % 2 === 0 ? 'red' : 'black';
                        const board = this.getCurrentBoardState();

                        const result = parser.parseNotation(notation, color, board);

                        if (result && result.color && result.pieceType && result.fromPos) {
                            gameMoves.push([
                                result.color,
                                result.pieceType,
                                result.fromPos,
                                result.toPos,
                                notation
                            ]);
                        } else {
                            console.warn(`无法解析棋步: ${notation}`);
                        }
                    }
                });
            }
        } catch (error) {
            console.error('解析标准记谱法出错:', error);
        }

        return gameMoves;
    }

    /**
     * 获取棋子汉字
     * @param {string} type - 棋子类型
     * @param {string} color - 棋子颜色
     */
    getPieceCharacter(type, color) {
        const pieces = {
            'red': {
                'king': '帥', 'advisor': '仕', 'elephant': '相',
                'horse': '馬', 'rook': '車', 'cannon': '炮', 'soldier': '兵'
            },
            'black': {
                'king': '將', 'advisor': '士', 'elephant': '象',
                'horse': '馬', 'rook': '車', 'cannon': '砲', 'soldier': '卒'
            }
        };

        return pieces[color]?.[type] || type;
    }
}

// 导出模块
if (typeof window !== 'undefined') {
    window.GameDemonstration = GameDemonstration;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameDemonstration;
}