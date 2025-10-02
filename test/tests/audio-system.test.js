/**
 * 音频系统测试
 * 测试音频管理器是否能正确生成和播放音效
 */

// 模拟浏览器环境
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

// 创建虚拟DOM环境
const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
global.document = dom.window.document;
global.window = dom.window;

// 模拟Web Audio API
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

global.window.AudioContext = MockAudioContext;
global.window.webkitAudioContext = MockAudioContext;
global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;

// 导入音频管理器
const { AudioManager } = require('../../main/audio-manager.js');

describe('音频系统测试', () => {
  let audioManager;
  
  beforeEach(() => {
    // 创建音频管理器实例
    audioManager = new AudioManager();
  });
  
  test('音频管理器应该正确初始化', () => {
    expect(audioManager).toBeTruthy();
    expect(audioManager.sounds).toBeTruthy();
    expect(audioManager.isEnabled).toBe(true);
    expect(audioManager.musicVolume).toBe(0.3);
    expect(audioManager.effectVolume).toBe(0.6);
  });
  
  test('应该生成所有音效', () => {
    expect(audioManager.sounds.pieceMove).toBeTruthy();
    expect(audioManager.sounds.pieceCapture).toBeTruthy();
    expect(audioManager.sounds.pieceSelect).toBeTruthy();
    expect(audioManager.sounds.check).toBeTruthy();
    expect(audioManager.sounds.victory).toBeTruthy();
  });
  
  test('应该能播放音效', () => {
    // 播放音效
    audioManager.playSound('pieceMove');
    // 在测试环境中应该不会报错
    expect(true).toBe(true);
  });
  
  test('应该能切换音效开关', () => {
    // 初始状态应该是开启的
    expect(audioManager.isEnabled).toBe(true);
    
    // 切换到关闭状态
    const isEnabled = audioManager.toggleSound();
    expect(isEnabled).toBe(false);
    expect(audioManager.isEnabled).toBe(false);
    
    // 再次切换回开启状态
    const isEnabled2 = audioManager.toggleSound();
    expect(isEnabled2).toBe(true);
    expect(audioManager.isEnabled).toBe(true);
  });
  
  test('应该能设置音量', () => {
    // 设置音乐音量
    audioManager.setMusicVolume(0.5);
    expect(audioManager.musicVolume).toBe(0.5);
    
    // 设置音效音量
    audioManager.setEffectVolume(0.8);
    expect(audioManager.effectVolume).toBe(0.8);
    
    // 测试音量限制
    audioManager.setMusicVolume(1.5); // 超出范围
    expect(audioManager.musicVolume).toBe(1.0); // 应该被限制在1.0
    
    audioManager.setEffectVolume(-0.5); // 超出范围
    expect(audioManager.effectVolume).toBe(0.0); // 应该被限制在0.0
  });
  
  test('应该能获取当前状态', () => {
    const status = audioManager.getStatus();
    expect(status).toHaveProperty('enabled');
    expect(status).toHaveProperty('musicVolume');
    expect(status).toHaveProperty('effectVolume');
    expect(status.enabled).toBe(true);
    expect(status.musicVolume).toBe(0.3);
    expect(status.effectVolume).toBe(0.6);
  });
});