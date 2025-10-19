// tests/category-panel-behavior.test.js
// 重新设计为行为验证的测试，替代脆弱的字符串匹配测试

// 导入游戏类
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const { MockXiangqiGame } = require("../mock-xiangqi-game");

describe('分类棋谱行为验证测试', () => {
    let game;
    let originalDocument;
    let originalWindow;

    beforeEach(() => {
        // 保存原始全局对象
        originalDocument = global.document;
        originalWindow = global.window;

        // 创建虚拟DOM环境
        const dom = new JSDOM(`<!DOCTYPE html><html><body>
            <div id="recordPanel" class="hidden"></div>
            <div class="record-selection"></div>
            <div id="recordDisplay" class="hidden"></div>
            <div id="seriesDisplay" class="hidden"></div>
            <div id="recordButtons" class="record-buttons"></div>
            <div id="categoryList" class="category-list"></div>
            <div id="categorySelection" class="hidden"></div>
        </body></html>`);
        global.document = dom.window.document;
        global.window = dom.window;
        global.navigator = dom.window.navigator;

        game = new MockXiangqiGame();
        game.board = null; // 测试环境中禁用实际的DOM操作
    });

    afterEach(() => {
        // 恢复原始全局对象
        global.document = originalDocument;
        global.window = originalWindow;
    });

    test('showRecordPanel的行为验证：调用分类界面', async () => {
        // 模拟showClassificationPanel方法
        let classificationPanelCalled = false;
        game.showClassificationPanel = async () => {
            classificationPanelCalled = true;
        };

        // 调用showRecordPanel
        await game.showRecordPanel();

        // 验证关键行为：分类界面被调用
        expect(classificationPanelCalled).toBe(true);

        console.log('✅ showRecordPanel行为验证通过：正确调用分类界面');
    });

    test('setupFixedGameButtons的行为验证：显示加载信息', () => {
        // 调用setupFixedGameButtons
        game.setupFixedGameButtons();

        // 验证行为：recordButtons包含加载信息
        const recordButtons = document.getElementById('recordButtons');

        // 只有在实际DOM元素存在时才验证内容
        if (recordButtons) {
            expect(recordButtons.innerHTML).toContain('loading-message');
            expect(recordButtons.innerHTML).toContain('正在加载棋谱分类');
        }

        console.log('✅ setupFixedGameButtons行为验证通过：正确显示加载信息');
    });

    test('showClassificationPanel的基本行为验证：调用加载数据', async () => {
        // 模拟loadClassifiedGameDatabase
        let loadMethodCalled = false;
        game.loadClassifiedGameDatabase = async () => {
            loadMethodCalled = true;
            return null; // 返回null触发降级逻辑
        };

        // 调用showClassificationPanel
        await game.showClassificationPanel();

        // 验证行为：至少调用了加载数据的方法
        expect(loadMethodCalled).toBe(true);

        console.log('✅ showClassificationPanel基本行为验证通过：正确调用数据加载');
    });

    test('loadAndPlayClassicGame重定向到爬取数据验证', async () => {
        // 模拟showClassificationPanel
        let classificationPanelCalled = false;
        game.showClassificationPanel = async () => {
            classificationPanelCalled = true;
        };

        // 调用loadAndPlayClassicGame，应该重定向到爬取的棋谱分类数据
        await game.loadAndPlayClassicGame('任意棋谱名称');

        // 验证重定向到爬取数据的行为
        expect(classificationPanelCalled).toBe(true);

        console.log('✅ loadAndPlayClassicGame重定向到爬取数据验证通过');
    });

    });