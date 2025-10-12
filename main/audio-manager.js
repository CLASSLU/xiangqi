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
    constructor(config = {}) {
        this.audioContext = null;

        // 默认配置
        this.config = {
            enabled: config.enabled !== false,
            volume: config.volume || 0.7,
            muted: config.muted || false
        };

        // 兼容性属性
        this.isEnabled = this.config.enabled;
        this.musicVolume = config.musicVolume || 0.3;
        this.effectVolume = config.effectVolume || 0.6;

        // 音效缓存
        this.sounds = this.generateSounds();

        this.initializeAudio();
    }

    /**
     * 生成音效
     * @returns {Object} 音效对象
     */
    generateSounds() {
        return {
            pieceMove: this.generate木质音效('pieceMove'),
            pieceCapture: this.generate木质音效('pieceCapture'),
            pieceSelect: this.generate木质音效('pieceSelect'),
            check: this.generate木质音效('check'),
            victory: this.generate木质音效('victory')
        };
    }

    /**
     * 生成木质音效
     * @param {string} type - 音效类型
     * @returns {Object} 音效数据
     */
    generate木质音效(type) {
        return {
            type: type,
            duration: 0.2,
            frequency: type === 'victory' ? 800 : 400,
            buffer: null
        };
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
     * 设置音乐音量
     * @param {number} volume - 音乐音量 (0-1)
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        this.config.volume = this.musicVolume;
    }

    /**
     * 设置音效音量
     * @param {number} volume - 音效音量 (0-1)
     */
    setEffectVolume(volume) {
        this.effectVolume = Math.max(0, Math.min(1, volume));
    }

    /**
     * 切换音效开关 (兼容性方法)
     * @returns {boolean} 当前状态
     */
    toggleSound() {
        this.isEnabled = !this.isEnabled;
        this.config.enabled = this.isEnabled;
        return this.isEnabled;
    }

    /**
     * 获取状态
     * @returns {Object} 当前状态
     */
    getStatus() {
        return {
            enabled: this.isEnabled,
            musicVolume: this.musicVolume,
            effectVolume: this.effectVolume,
            muted: this.config.muted
        };
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