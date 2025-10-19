@echo off
echo 🎮 启动中国象棋游戏...
echo.

cd /d "%~dp0main"

REM 检查Python是否安装
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ 使用Python启动HTTP服务器
    echo 🌐 游戏地址: http://localhost:8080
    echo 🔄 服务器启动中...
    echo.
    python -m http.server 8080
) else (
    echo ⚠️  Python未安装，直接打开文件
    echo 📂 正在打开游戏文件...
    start index.html
)

echo.
echo 游戏已启动！
pause