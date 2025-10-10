# 🚀 本地服务器启动指南

## 问题描述
当直接使用浏览器打开 `index.html` 文件时，会遇到CORS错误：
```
Access to fetch at 'file:///D:/project/xiangqi/main/data/classified-games.json' from origin 'null' has been blocked by CORS policy
```

这是因为浏览器的安全策略禁止从 `file://` 协议访问其他本地文件。

## ✅ 解决方案：启动本地HTTP服务器

### 方法一：使用批处理文件（Windows推荐）
双击运行：
```
start-server.bat
```

### 方法二：使用Node.js
```bash
node start-server.js
```

### 方法三：使用Python
```bash
python start-local-server.py
```

## 🌐 访问地址
启动服务器后，在浏览器中访问：
```
http://localhost:8888
```

## 📋 系统要求
以下任选其一即可：
- **Node.js** (推荐): https://nodejs.org/
- **Python 3**: https://www.python.org/

## 🔧 服务器特性
- ✅ 解决CORS跨域问题
- ✅ 正确加载棋谱数据文件
- ✅ 支持所有静态资源（HTML、CSS、JS、JSON）
- ✅ 自动打开浏览器
- ✅ 优雅的错误处理

## 📁 文件结构
```
xiangqi/
├── start-server.bat           # Windows批处理启动脚本
├── start-server.js            # Node.js服务器脚本
├── start-local-server.py      # Python服务器脚本
├── main/                      # 服务根目录
│   ├── index.html
│   ├── data/
│   │   └── classified-games.json
│   └── ...
└── README-SERVER.md            # 本文件
```

## 🎯 效果
启动本地服务器后，棋谱数据将能够正确加载，不再出现CORS错误。您将看到：
- ✅ 成功加载分类棋谱数据库
- ✅ 正常显示棋谱分类和列表
- ✅ 所有棋谱功能正常工作

## ⏹️ 停止服务器
在服务器运行的控制台中按 `Ctrl+C` 即可停止服务器。

---

## 🎮 开始游戏
1. 运行 `start-server.bat`
2. 等待浏览器自动打开
3. 享受中国象棋！