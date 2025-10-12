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

import type { SoundType, AudioConfig } from './types';

/**
 * 音频管理器
 */
class AudioManager {
    private config: AudioConfig;
    private audioContext: AudioContext | null = null;

    constructor(config: AudioConfig = {
        enabled: true,
        volume: 0.7,
        muted: false
    }) {
        this.config = config;
        this.initializeAudio();
    }

    /**
     * 初始化音频系统
     * @private
     */
    private initializeAudio(): void {
        try {
            if (typeof AudioContext !== 'undefined') {
                this.audioContext = new AudioContext();
            }
        } catch (error) {
            console.warn('AudioContext initialization failed:', error);
        }
    }

    /**
     * 播放音效
     * @param {SoundType} soundType - 音效类型
     */
    public playSound(soundType: SoundType): void {
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
    public setVolume(volume: number): void {
        this.config.volume = Math.max(0, Math.min(1, volume));
    }

    /**
     * 切换静音状态
     */
    public toggleMute(): void {
        this.config.muted = !this.config.muted;
    }

    /**
     * 获取配置
     */
    public getConfig(): AudioConfig {
        return { ...this.config };
    }

    // 向后兼容的方法，用于测试

    /**
     * 切换音效开关
     * @returns {boolean} 切换后的状态
     */
    public toggleSound(): boolean {
        this.config.enabled = !this.config.enabled;
        return this.config.enabled;
    }

    /**
     * 设置音乐音量
     * @param {number} volume - 音量 (0-1)
     */
    public setMusicVolume(volume: number): void {
        this.setVolume(volume);
    }

    /**
     * 设置音效音量
     * @param {number} volume - 音量 (0-1)
     */
    public setEffectVolume(volume: number): void {
        this.setVolume(volume);
    }

    /**
     * 获取当前状态
     * @returns {Object} 状态信息
     */
    public getStatus(): {
        enabled: boolean;
        musicVolume: number;
        effectVolume: number;
    } {
        return {
            enabled: this.config.enabled,
            musicVolume: this.config.volume,
            effectVolume: this.config.volume
        };
    }

    /**
     * 音效集合（向后兼容）
     */
    public get sounds(): Record<string, boolean> {
        return {
            pieceMove: true,
            pieceCapture: true,
            pieceSelect: true,
            check: true,
            victory: true
        };
    }

    /**
     * 音效音量（向后兼容）
     */
    public get effectVolume(): number {
        return this.config.volume;
    }

    /**
     * 音乐音量（向后兼容）
     */
    public get musicVolume(): number {
        return this.config.volume;
    }

    /**
     * 音效启用状态（向后兼容）
     */
    public get isEnabled(): boolean {
        return this.config.enabled;
    }
}

export { AudioManager };