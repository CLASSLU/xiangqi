// tests/category-panel-direct.test.js
// 测试分类棋谱直接显示功能

// 模拟DOM环境
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

// 创建虚拟DOM环境
const dom = new JSDOM(`<!DOCTYPE html><html><body>
    <div id="recordPanel" class="hidden"></div>
    <div class="record-selection hidden"></div>
    <div id="recordButtons" class="record-buttons"></div>
    <div id="categoryList" class="category-list"></div>
</body></html>`);
global.document = dom.window.document;
global.window = dom.window;
global.navigator = dom.window.navigator;

// 导入游戏类
const { XiangqiGame } = require('../../main/chess.js');

describe('分类棋谱直接显示功能测试', () => {
    let game;
    let mockPanelElements;
    let originalDocument;

    beforeEach(() => {
        // 模拟DOM环境
        originalDocument = global.document;

        // 创建模拟的棋谱面板元素
        mockPanelElements = {
            recordPanel: { classList: { remove: jest.fn(), add: jest.fn() } },
            recordSelection: { classList: { add: jest.fn(), remove: jest.fn() } },
            recordDisplay: { classList: { add: jest.fn(), remove: jest.fn() } },
            seriesDisplay: { classList: { add: jest.fn(), remove: jest.fn() } },
            categorySelection: { classList: { add: jest.fn(), remove: jest.fn() } },
            categoryList: { innerHTML: '' },
            recordButtons: { innerHTML: '' }
        };

        // 模拟document.getElementById
        global.document = {
            getElementById: jest.fn((id) => {
                switch(id) {
                    case 'recordPanel': return mockPanelElements.recordPanel;
                    case 'recordSelection': return mockPanelElements.recordSelection;
                    case 'recordDisplay': return mockPanelElements.recordDisplay;
                    case 'seriesDisplay': return mockPanelElements.seriesDisplay;
                    case 'categorySelection': return mockPanelElements.categorySelection;
                    case 'categoryList': return mockPanelElements.categoryList;
                    case 'recordButtons': return mockPanelElements.recordButtons;
                    default: return null;
                }
            }),
            querySelector: jest.fn((selector) => {
                switch(selector) {
                    case '.record-selection': return mockPanelElements.recordSelection;
                    default: return null;
                }
            })
        };

        // 创建游戏实例
        game = new XiangqiGame();
        game.board = null; // 测试环境中禁用实际的DOM操作
    });

    afterEach(() => {
        global.document = originalDocument;
    });

    test('全局棋谱按钮直接显示分类界面而非经典开局', async () => {
        // 模拟showClassificationPanel方法
        const mockShowClassificationPanel = jest.fn();
        game.showClassificationPanel = mockShowClassificationPanel;

        // 调用showRecordPanel方法
        await game.showRecordPanel();

        // 验证面板被正确打开
        expect(mockPanelElements.recordPanel.classList.remove).toHaveBeenCalledWith('hidden');

        // 验证经典棋谱选择区域被隐藏（而不是显示）
        expect(mockPanelElements.recordSelection.classList.add).toHaveBeenCalledWith('hidden');

        // 验证直接调用分类显示而不是显示经典开局
        expect(mockShowClassificationPanel).toHaveBeenCalled();

        console.log('✅ 全局棋谱按钮成功直接显示分类界面而非经典开局');
    });

    test('经典开局函数被简化为显示分类界面', async () => {
        // 模拟showClassificationPanel方法
        const mockShowClassificationPanel = jest.fn();
        game.showClassificationPanel = mockShowClassificationPanel;

        // 调用常见的经典开局名称
        await game.setupFamousGame('中炮对屏风马经典');

        // 验证没有调用硬编码的经典开局逻辑，而是显示分类界面
        expect(mockShowClassificationPanel).toHaveBeenCalled();

        console.log('✅ 经典开局函数成功重定向到分类界面');
    });

    test('setupFixedGameButtons方法不再显示经典开局按钮', () => {
        // 调用setupFixedGameButtons方法
        game.setupFixedGameButtons();

        // 验证不再显示经典开局和残局按钮，而是显示加载信息
        expect(mockPanelElements.recordButtons.innerHTML).toContain('loading-message');
        expect(mockPanelElements.recordButtons.innerHTML).toContain('正在加载棋谱分类');

        // 验证不包含经典开局按钮
        expect(mockPanelElements.recordButtons.innerHTML).not.toContain('中炮对屏风马经典');
        expect(mockPanelElements.recordButtons.innerHTML).not.toContain('七星聚会');

        console.log('✅ setupFixedGameButtons已移除经典开局按钮');
    });

    test('showClassificationPanel方法降级处理使用示例数据而非固定经典按钮', async () => {
        // 模拟loadClassifiedGameDatabase返回null（数据不可用的情况）
        const mockLoadClassifiedGameDatabase = jest.fn().mockResolvedValue(null);
        game.loadClassifiedGameDatabase = mockLoadClassifiedGameDatabase;

        // 模拟displayGameSeries方法
        const mockDisplayGameSeries = jest.fn();
        game.displayGameSeries = mockDisplayGameSeries;

        // 模拟createSampleSeriesData方法
        const mockCreateSampleSeriesData = jest.fn().mockReturnValue([{name: '测试分类', games: []}]);
        game.createSampleSeriesData = mockCreateSampleSeriesData;

        // 调用showClassificationPanel方法
        await game.showClassificationPanel();

        // 验证加载分类数据被调用
        expect(mockLoadClassifiedGameDatabase).toHaveBeenCalled();

        // 验证没有调用setupFixedGameButtons（旧方法）
        expect(mockDisplayGameSeries).toHaveBeenCalledWith([{name: '测试分类', games: []}]);

        console.log('✅ 分类面板降级处理已改为使用示例数据而非经典按钮');
    });

    test('全局棋谱面板标题已修改为分类演示', () => {
        // 验证HTML模板中标题已修改
        const fs = require('fs');
        const path = require('path');
        const htmlContent = fs.readFileSync(path.join(__dirname, '../../main/index.html'), 'utf8');

        // 验证标题从"经典棋谱选择"改为"棋谱分类演示"
        expect(htmlContent).toContain('棋谱分类演示');
        expect(htmlContent).not.toContain('经典棋谱选择');

        console.log('✅ HTML模板标题已修改为分类演示');
    });

    test('分类导航区域已简化，移除切换按钮', () => {
        const fs = require('fs');
        const path = require('path');
        const htmlContent = fs.readFileSync(path.join(__dirname, '../../main/index.html'), 'utf8');

        // 验证移除了分类切换按钮
        expect(htmlContent).not.toContain('categoryToggle');

        // 验证分类选择区域默认可见（没有hidden类）
        const categorySelectionDiv = htmlContent.match(/id="categorySelection"[^>]*class="([^"]*)"/);
        if (categorySelectionDiv) {
            expect(categorySelectionDiv[1]).not.toContain('hidden');
        }

        // 验证棋谱选择区域默认隐藏
        const recordSelectionDiv = htmlContent.match(/class="record-selection[^"]*/g);
        if (recordSelectionDiv) {
            const hiddenClass = recordSelectionDiv.find(div => div.includes('hidden'));
            expect(hiddenClass).toBeDefined();
        }

        console.log('✅ 分类导航区域已简化');
    });

    test('loadAndPlayClassicGame方法已简化为显示分类界面', async () => {
        // 模拟console.log来捕获日志输出
        const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});

        // 模拟showClassificationPanel方法
        const mockShowClassificationPanel = jest.fn();
        game.showClassificationPanel = mockShowClassificationPanel;

        // 调用loadAndPlayClassicGame方法
        await game.loadAndPlayClassicGame('中炮对屏风马经典');

        // 验证输出了取消经典棋局的日志
        expect(mockLog).toHaveBeenCalledWith('经典棋局功能已取消，正在加载爬取棋谱分类...');

        // 验证调用了显示分类界面的方法
        expect(mockShowClassificationPanel).toHaveBeenCalled();

        mockLog.mockRestore();

        console.log('✅ loadAndPlayClassicGame已成功简化');
    });
});