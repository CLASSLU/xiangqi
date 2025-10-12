"use strict";
/**
 * AudioManager - 音频管理器
 *
 * 提供音效播放和管理功能
 *
 * @fileoverview 音频管理器
 * @version 2.1.0
 * @author Claude Code Review System
 * @since 2024-10-11
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioManager = void 0;
/**
 * 音频管理器
 */
class AudioManager {
    constructor(config = {
        enabled: true,
        volume: 0.7,
        muted: false
    }) {
        this.audioContext = null;
        this.config = config;
        this.initializeAudio();
    }
    /**
     * 初始化音频系统
     * @private
     */
    initializeAudio() {
        try {
            if (typeof AudioContext !== 'undefined') {
                this.audioContext = new AudioContext();
            }
        }
        catch (error) {
            console.warn('AudioContext initialization failed:', error);
        }
    }
    /**
     * 播放音效
     * @param {SoundType} soundType - 音效类型
     */
    playSound(soundType) {
        if (!this.config.enabled || this.config.muted || !this.audioContext) {
            return;
        }
        console.log(`Playing sound: ${soundType}`);
        // 简化的音效播放逻辑
    }
    /**
     * 设置音量
     * @param {number} volume - 音量 (0-1)
     */
    setVolume(volume) {
        this.config.volume = Math.max(0, Math.min(1, volume));
    }
    /**
     * 切换静音状态
     */
    toggleMute() {
        this.config.muted = !this.config.muted;
    }
    /**
     * 获取配置
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.AudioManager = AudioManager;
//# sourceMappingURL=audio-manager.js.map