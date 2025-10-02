// mock-browser-env.js
// 模拟浏览器环境以在Node.js中运行测试

// 模拟AudioContext
class MockAudioContext {
  constructor() {
    this.sampleRate = 44100;
    this.destination = {};
  }
  
  createBuffer(channels, length, sampleRate) {
    return {
      getChannelData: () => new Float32Array(length),
      length: length
    };
  }
  
  createBufferSource() {
    return {
      connect: () => {},
      start: () => {},
      stop: () => {},
      buffer: null,
      loop: false
    };
  }
  
  createGain() {
    return {
      connect: () => {},
      gain: { value: 1 }
    };
  }
}

// 设置全局对象
global.window = {
  AudioContext: MockAudioContext,
  webkitAudioContext: MockAudioContext,
  document: {
    createElement: (tag) => {
      return {
        style: {},
        dataset: {},
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
        appendChild: () => {},
        remove: () => {}
      };
    },
    querySelector: () => {
      return {
        style: {},
        dataset: {},
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
        appendChild: () => {},
        remove: () => {}
      };
    },
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  addEventListener: () => {}
};

global.document = global.window.document;
global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;

// 模拟DOM事件
class MockEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = options.bubbles || false;
    this.cancelable = options.cancelable || false;
  }
  
  preventDefault() {}
  stopPropagation() {}
}

global.Event = MockEvent;
global.MouseEvent = MockEvent;

module.exports = {};