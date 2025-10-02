/**
 * 中国象棋游戏测试入口文件
 * 用于在浏览器中运行测试
 */

// 加载所有测试文件
const testFiles = [
  './tests/board-initialization.test.js',
  './tests/piece-movement.test.js',
  './tests/capture-check.test.js',
  './tests/famous-games.test.js',
  './tests/audio-system.test.js',
  './tests/ui-interaction.test.js'
];

// 简单的测试运行器
class SimpleTestRunner {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      total: 0
    };
  }
  
  addTest(description, testFunction) {
    this.tests.push({ description, testFunction });
  }
  
  async run() {
    console.log('开始运行测试...');
    
    for (const test of this.tests) {
      try {
        this.results.total++;
        await test.testFunction();
        this.results.passed++;
        console.log(`✓ ${test.description}`);
      } catch (error) {
        this.results.failed++;
        console.error(`✗ ${test.description}: ${error.message}`);
        console.error(error.stack);
      }
    }
    
    this.printResults();
  }
  
  printResults() {
    console.log('\n测试结果:');
    console.log(`总计: ${this.results.total}`);
    console.log(`通过: ${this.results.passed}`);
    console.log(`失败: ${this.results.failed}`);
    
    if (this.results.failed === 0) {
      console.log('\n所有测试通过! ✓');
    } else {
      console.log('\n部分测试失败! ✗');
    }
  }
}

// 全局测试函数
global.describe = (description, testFunction) => {
  console.log(`测试套件: ${description}`);
  testFunction();
};

global.test = (description, testFunction) => {
  if (!global.testRunner) {
    global.testRunner = new SimpleTestRunner();
  }
  global.testRunner.addTest(description, testFunction);
};

global.expect = (actual) => {
  return {
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`期望 ${expected}, 实际 ${actual}`);
      }
    },
    toBeTruthy: () => {
      if (!actual) {
        throw new Error(`期望真值, 实际 ${actual}`);
      }
    },
    toBeFalsy: () => {
      if (actual) {
        throw new Error(`期望假值, 实际 ${actual}`);
      }
    },
    toContain: (expected) => {
      if (!actual || !actual.includes || !actual.includes(expected)) {
        throw new Error(`期望包含 ${expected}, 实际 ${JSON.stringify(actual)}`);
      }
    },
    toContainEqual: (expected) => {
      if (!actual || !Array.isArray(actual) || !actual.some(item => 
        Array.isArray(item) && Array.isArray(expected) && 
        item.length === expected.length && 
        item.every((val, i) => val === expected[i])
      )) {
        throw new Error(`期望包含数组 ${JSON.stringify(expected)}, 实际 ${JSON.stringify(actual)}`);
      }
    },
    not: {
      toContainEqual: (expected) => {
        if (actual && Array.isArray(actual) && actual.some(item => 
          Array.isArray(item) && Array.isArray(expected) && 
          item.length === expected.length && 
          item.every((val, i) => val === expected[i])
        )) {
          throw new Error(`期望不包含数组 ${JSON.stringify(expected)}, 实际 ${JSON.stringify(actual)}`);
        }
      },
      toContain: (expected) => {
        if (actual && actual.includes && actual.includes(expected)) {
          throw new Error(`期望不包含 ${expected}, 实际 ${JSON.stringify(actual)}`);
        }
      },
      toBe: (expected) => {
        if (actual === expected) {
          throw new Error(`期望不等于 ${expected}, 实际 ${actual}`);
        }
      }
    },
    toHaveProperty: (property) => {
      if (!actual || typeof actual !== 'object' || !(property in actual)) {
        throw new Error(`期望包含属性 ${property}, 实际 ${JSON.stringify(actual)}`);
      }
    },
    toHaveLength: (length) => {
        if (!actual || !actual.length || actual.length !== length) {
            throw new Error(`期望长度为 ${length}, 实际 ${actual ? actual.length : 0}`);
        }
    }
  };
};

global.beforeEach = (fn) => {
  // 简单实现，实际测试框架会更复杂
  global.beforeEachFn = fn;
};

global.afterEach = (fn) => {
  // 简单实现，实际测试框架会更复杂
  global.afterEachFn = fn;
};

// 加载测试文件的函数
async function loadTestFiles() {
  for (const file of testFiles) {
    try {
      console.log(`加载测试文件: ${file}`);
      // 在实际环境中，这里会通过script标签加载
      // 为了简化，我们只是打印文件名
    } catch (error) {
      console.error(`加载测试文件失败 ${file}: ${error.message}`);
    }
  }
}

// 运行测试的函数
async function runAllTests() {
  await loadTestFiles();
  
  if (global.testRunner) {
    await global.testRunner.run();
  } else {
    console.log('没有找到测试用例');
  }
}

// 如果在浏览器环境中，添加到window对象
if (typeof window !== 'undefined') {
  window.runChessTests = runAllTests;
  console.log('测试框架已加载。在控制台中调用 runChessTests() 来运行测试。');
}

// 如果在Node.js环境中，导出函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests };
}