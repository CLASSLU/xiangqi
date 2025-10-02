// 象棋游戏音频管理器
class AudioManager {
    constructor() {
        this.sounds = {};
        this.backgroundMusic = null;
        this.isEnabled = true;
        this.musicVolume = 0.3;
        this.effectVolume = 0.6;
        
        this.initializeAudio();
        this.setupVolumeControls();
    }
    
    initializeAudio() {
        // 创建音频文件（使用Web Audio API生成）
        this.createSoundEffects();
        this.createBackgroundMusic();
    }
    
    // 生成真实的木质棋子落在棋盘上的音效
    createSoundEffects() {
        // 在Node.js环境中跳过音频生成
        if (typeof window === 'undefined' || !window.AudioContext) {
            console.log('在测试环境中跳过音频生成');
            return;
        }
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 真实的木质棋子落下音效 - 模拟木头撞击声
        this.sounds.pieceMove = this.generateWoodClickSound(audioContext, 0.12);
        
        // 吃子音效 - 更重的木头撞击声
        this.sounds.pieceCapture = this.generateWoodCaptureSound(audioContext, 0.18);
        
        // 选择棋子音效 - 轻微的木头摩擦声
        this.sounds.pieceSelect = this.generateWoodSelectSound(audioContext, 0.08);
        
        // 将军音效 - 紧急的木头敲击声
        this.sounds.check = this.generateWoodCheckSound(audioContext, 0.15);
        
        // 胜利音效 - 庆祝的连续敲击声
        this.sounds.victory = this.generateWoodVictorySound(audioContext, 0.8);
    }
    
    // 生成真实的木质棋子落下声音
    generateWoodClickSound(audioContext, duration) {
        const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
            const t = i / audioContext.sampleRate;
            
            // 模拟木头撞击：多个频率成分模拟木质的复杂音色
            const fundamental = Math.sin(2 * Math.PI * 1200 * t); // 主频率
            const harmonic2 = Math.sin(2 * Math.PI * 2400 * t) * 0.6; // 二次谐波
            const harmonic3 = Math.sin(2 * Math.PI * 3600 * t) * 0.3; // 三次谐波
            const noise = (Math.random() - 0.5) * 0.1; // 白噪声模拟木头质感
            
            // 快速衰减包络，模拟木头撞击的短暂性
            const envelope = Math.exp(-t * 35) * (1 + Math.exp(-t * 100));
            
            // 混合所有频率成分
            data[i] = (fundamental + harmonic2 + harmonic3 + noise) * envelope * 0.25;
        }
        
        return buffer;
    }
    
    // 生成木质吃子音效（更重的撞击）
    generateWoodCaptureSound(audioContext, duration) {
        const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
            const t = i / audioContext.sampleRate;
            
            // 更低的频率和更强的低频成分，模拟两个棋子相撞
            const fundamental = Math.sin(2 * Math.PI * 800 * t);
            const subharmonic = Math.sin(2 * Math.PI * 400 * t) * 0.8;
            const harmonic2 = Math.sin(2 * Math.PI * 1600 * t) * 0.4;
            const noise = (Math.random() - 0.5) * 0.2; // 更强的噪声
            
            // 稍慢的衰减，模拟更重的撞击
            const envelope = Math.exp(-t * 25) * (1 + Math.exp(-t * 80));
            
            data[i] = (fundamental + subharmonic + harmonic2 + noise) * envelope * 0.3;
        }
        
        return buffer;
    }
    
    // 生成木质选择音效（轻微摩擦）
    generateWoodSelectSound(audioContext, duration) {
        const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
            const t = i / audioContext.sampleRate;
            
            // 高频的轻微摩擦声
            const fundamental = Math.sin(2 * Math.PI * 2000 * t);
            const harmonic = Math.sin(2 * Math.PI * 4000 * t) * 0.3;
            const friction = (Math.random() - 0.5) * 0.05; // 微弱的摩擦噪声
            
            // 柔和的衰减
            const envelope = Math.exp(-t * 50);
            
            data[i] = (fundamental + harmonic + friction) * envelope * 0.15;
        }
        
        return buffer;
    }
    
    // 生成木质将军音效（紧急敲击）
    generateWoodCheckSound(audioContext, duration) {
        const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
            const t = i / audioContext.sampleRate;
            
            // 中频的急促敏击声
            const fundamental = Math.sin(2 * Math.PI * 1000 * t);
            const harmonic2 = Math.sin(2 * Math.PI * 2000 * t) * 0.5;
            const tremolo = 1 + 0.5 * Math.sin(2 * Math.PI * 12 * t); // 颗音效果
            const noise = (Math.random() - 0.5) * 0.15;
            
            // 中等衰减，保持紧急感
            const envelope = Math.exp(-t * 20);
            
            data[i] = (fundamental + harmonic2 + noise) * tremolo * envelope * 0.28;
        }
        
        return buffer;
    }
    
    // 生成木质胜利音效（连续敲击）
    generateWoodVictorySound(audioContext, duration) {
        const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        // 五声音阶旋律（中国传统音乐）
        const pentatonic = [523, 587, 659, 784, 880, 1047]; // C, D, E, G, A, C
        const beatLength = buffer.length / (pentatonic.length + 2); // 包含间隙
        
        for (let i = 0; i < buffer.length; i++) {
            const beatIndex = Math.floor(i / beatLength);
            const t = (i % beatLength) / audioContext.sampleRate;
            
            if (beatIndex < pentatonic.length) {
                const frequency = pentatonic[beatIndex];
                
                // 模拟木质敲击的旋律
                const fundamental = Math.sin(2 * Math.PI * frequency * t);
                const harmonic = Math.sin(2 * Math.PI * frequency * 2 * t) * 0.3;
                const woodAttack = Math.exp(-t * 15); // 木头敲击的快速起音
                const sustain = Math.exp(-t * 3); // 持续音
                
                data[i] = (fundamental + harmonic) * (woodAttack + sustain * 0.3) * 0.2;
            } else {
                data[i] = 0; // 间隙
            }
        }
        
        return buffer;
    }
    
    // 创建背景音乐（简单的环境音乐）
    createBackgroundMusic() {
        // 在Node.js环境中跳过音频生成
        if (typeof window === 'undefined' || !window.AudioContext) {
            console.log('在测试环境中跳过背景音乐生成');
            return;
        }
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 创建一个简单的中国风音乐循环
        this.backgroundMusic = this.generateBackgroundMusic(audioContext, 8); // 8秒循环
    }
    
    generateBackgroundMusic(audioContext, duration) {
        const buffer = audioContext.createBuffer(2, audioContext.sampleRate * duration, audioContext.sampleRate);
        const leftChannel = buffer.getChannelData(0);
        const rightChannel = buffer.getChannelData(1);
        
        // 中国五声音阶 (宫商角徵羽)
        const pentatonic = [523, 587, 659, 784, 880]; // C, D, E, G, A
        
        for (let i = 0; i < buffer.length; i++) {
            const t = i / audioContext.sampleRate;
            let sample = 0;
            
            // 添加多个音符创建和谐
            pentatonic.forEach((freq, index) => {
                const phase = (t * freq * 2 * Math.PI) + (index * Math.PI / 3);
                const envelope = 0.5 + 0.3 * Math.sin(t * 0.5 + index);
                sample += Math.sin(phase) * envelope * 0.05; // 很轻的音量
            });
            
            // 添加轻微的混响效果
            const reverb = sample * 0.3 * Math.sin(t * 0.1);
            
            leftChannel[i] = sample + reverb;
            rightChannel[i] = sample - reverb; // 立体声效果
        }
        
        return buffer;
    }
    
    // 播放音效
    playSound(soundName) {
        if (!this.isEnabled) return;
        
        // 在Node.js环境中跳过音频播放
        if (typeof window === 'undefined' || !window.AudioContext) {
            console.log(`在测试环境中跳过播放音效: ${soundName}`);
            return;
        }
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const buffer = this.sounds[soundName];
            
            if (buffer) {
                const source = audioContext.createBufferSource();
                const gainNode = audioContext.createGain();
                
                source.buffer = buffer;
                gainNode.gain.value = this.effectVolume;
                
                source.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                source.start();
            }
        } catch (error) {
            console.warn('音效播放失败:', error);
        }
    }
    
    // 播放背景音乐
    startBackgroundMusic() {
        if (!this.isEnabled || !this.backgroundMusic) return;
        
        // 在Node.js环境中跳过音频播放
        if (typeof window === 'undefined' || !window.AudioContext) {
            console.log('在测试环境中跳过播放背景音乐');
            return;
        }
        
        try {
            this.stopBackgroundMusic(); // 停止当前播放的音乐
            
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.musicSource = audioContext.createBufferSource();
            this.musicGain = audioContext.createGain();
            
            this.musicSource.buffer = this.backgroundMusic;
            this.musicSource.loop = true; // 循环播放
            this.musicGain.gain.value = this.musicVolume;
            
            this.musicSource.connect(this.musicGain);
            this.musicGain.connect(audioContext.destination);
            
            this.musicSource.start();
        } catch (error) {
            console.warn('背景音乐播放失败:', error);
        }
    }
    
    // 停止背景音乐
    stopBackgroundMusic() {
        if (this.musicSource) {
            try {
                this.musicSource.stop();
            } catch (error) {
                // 忽略已经停止的错误
            }
            this.musicSource = null;
        }
    }
    
    // 设置音效开关
    toggleSound() {
        this.isEnabled = !this.isEnabled;
        
        if (!this.isEnabled) {
            this.stopBackgroundMusic();
        } else {
            this.startBackgroundMusic();
        }
        
        return this.isEnabled;
    }
    
    // 设置音量
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicVolume;
        }
    }
    
    setEffectVolume(volume) {
        this.effectVolume = Math.max(0, Math.min(1, volume));
    }
    
    // 设置音量控制UI
    setupVolumeControls() {
        // 这个方法将在HTML中调用
        console.log('音频管理器初始化完成');
    }
    
    // 获取当前状态
    getStatus() {
        return {
            enabled: this.isEnabled,
            musicVolume: this.musicVolume,
            effectVolume: this.effectVolume
        };
    }
}

// 只在浏览器环境中创建全局实例
if (typeof window !== 'undefined') {
    window.audioManager = new AudioManager();
}

// 导出类以供测试使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AudioManager };
}