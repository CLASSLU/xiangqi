# TDD代码移动清单

## 🎯 重复代码发现 (高优先级)

### 1. 工具函数重复 (预计移除: ~50行)
**已在chess.js中重复定义:**
- `function findPieceAt(pieces, row, col)` (行14-19) ❌
- `function isOwnPieceAt(pieces, row, col, color)` (行29-35) ❌
- `function areKingsFacing(pieces)` (行42-67) ❌
- `function isValidPosition(row, col)` (行75-77) ❌
- `function filterValidMoves(moves)` (行84-86) ❌

**移动到**: 应该已在game-state.js中实现
**风险**: ⭐ 低风险

### 2. ModalManager调用重复 (预计移除: ~30行)
**chess.js中的showMessage调用:**
- 9个showMessage调用 (行407,417,1492,1541,1559,1565,1754,1816,2248)
- 条件检查: `if (typeof showMessage !== 'undefined')` ❌

**问题**: ModalManager已存在，但chess.js还在直接调用
**移动到**: 已创建modal-manager.js
**风险**: ⭐ 低风险

### 3. 演示功能模块 (预计移除: ~800行)
**GameDemonstration相关方法:**
- `loadAndPlayClassicGameWithData` (行2462)
- `playToStep` (行2976)
- `updateRecordStepsDisplay` (行2925)
- `autoPlayFullGame` (行3039)
- 所有演示相关代码 (估计800行)

**移动到**: 需要创建GameDemonstration.js
**风险**: ⭐⭐⭐ 高风险

### 4. 棋盘渲染功能 (预计移除: ~400行)
**渲染相关方法:**
- `createBoard` (行943)
- `drawBoardLines` (行955)
- `drawPalaceDiagonals` (行969)
- `drawDiagonalLine` (行985)
- `setupPieces` (行1074)
- `createPiece` (行1117)

**移动到**: 需要创建BoardRenderer.js
**风险**: ⭐⭐ 中风险

## 🚀 TDD移动批次

### 批次0️⃣: 工具函数清理 (50行)
```javascript
// 测试: 验证工具函数功能
// 移动: 删除chess.js中的重复工具函数
// 引用: 使用game-state.js中的实现
// 验证: npm test
```

### 批次1️⃣: ModalManager集成 (30行)
```javascript
// 测试: 验证showMessage调用
// 移动: 简化showMessage调用，移除条件检查
// 引用: 直接使用modal-manager
// 验证: npm test
```

### 批次2️⃣: 演示模块提取 (800行)
```javascript
// 测试: 负载所有演示相关测试
// 移动: 大规模代码移动到GameDemonstration.js
// 引用: chess.js调用gameDemonstration
// 验证: npm test
```

### 批次3️⃣: 渲染模块提取 (400行)
```javascript
// 测试: 所有UI渲染测试
// 移动: 移动到BoardRenderer.js
// 引用: chess.js调用boardRenderer
// 验证: npm test
```

## 📊 预期成果

| 批次 | 移除行数 | 风险 | 预计chess.js大小 |
|------|----------|------|------------------|
| 批次0️⃣ | 50行 | ⭐ | 3193行 |
| 批次1️⃣ | 30行 | ⭐ | 3163行 |
| 批次2️⃣ | 800行 | ⭐⭐⭐ | 2363行 |
| 批次3️⃣ | 400行 | ⭐⭐ | 1963行 |

**最终目标: chess.js ≈ 1963行 (-40%)**

---
*移动清单已创建，准备开始TDD移动*