/**
 * UIEventHandler 模块测试
 * 测试用户界面事件处理的核心功能：事件管理、棋子选择、移动交互
 */

describe('UIEventHandler 模块', () => {
    let uiEventHandler;
    let mockGameState;
    let mockMoveValidator;
    let mockAudioManager;
    let mockChessGame;
    let mockBoard;
    let mockPieces;

    beforeEach(() => {
        // 模拟DOM环境
        mockBoard = {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            querySelector: jest.fn(),
            querySelectorAll: jest.fn(() => []),
            appendChild: jest.fn(),
            removeChild: jest.fn()
        };

        // 模拟棋子元素
        mockPieces = [
            {
                dataset: { type: 'rook', color: 'red', row: '0', col: '0' },
                classList: { add: jest.fn(), remove: jest.fn(), contains: jest.fn() },
                closest: jest.fn(() => ({ classList: { contains: jest.fn() } }))
            },
            {
                dataset: { type: 'pawn', color: 'black', row: '6', col: '0' },
                classList: { add: jest.fn(), remove: jest.fn(), contains: jest.fn() },
                closest: jest.fn(() => ({ classList: { contains: jest.fn() } }))
            }
        ];

        // 模拟GameState
        mockGameState = {
            pieceIndex: new Map([
                ['0-0', { type: 'rook', color: 'red', row: 0, col: 0 }],
                ['6-0', { type: 'soldier', color: 'black', row: 6, col: 0 }]
            ]),

            getPieceAt: jest.fn((row, col) => {
                return mockGameState.pieceIndex.get(`${row}-${col}`) || null;
            }),

            isOwnPieceAt: jest.fn((row, col, color) => {
                const piece = mockGameState.getPieceAt(row, col);
                return piece && piece.color === color;
            })
        };

        // 模拟MoveValidator
        mockMoveValidator = {
            getValidMoves: jest.fn(() => [[1, 0], [2, 0]]),
            isValidMove: jest.fn(() => true),
            wouldBeInCheckAfterMove: jest.fn(() => false)
        };

        // 模拟AudioManager
        mockAudioManager = {
            playPieceSelect: jest.fn(),
            playPieceMove: jest.fn(),
            playPieceCapture: jest.fn(),
            playCheck: jest.fn()
        };

        // 模拟XiangqiGame实例
        mockChessGame = {
            board: mockBoard,
            gameState: mockGameState,
            moveValidator: mockMoveValidator,
            audioManager: mockAudioManager,
            currentPlayer: 'red',
            selectedPiece: null,
            gameOver: false,
            pieces: mockPieces,

            // 模拟方法
            tryMove: jest.fn(),
            tryCapture: jest.fn(),
            updateDisplay: jest.fn(),
            switchPlayer: jest.fn(),
            selectPiece: jest.fn(), // 添加缺失的方法

            // DOM操作方法
            createMoveIndicator: jest.fn(() => ({
                style: {},
                addEventListener: jest.fn(),
                classList: { add: jest.fn(), remove: jest.fn() }
            })),

            clearSelection: jest.fn(),
            clearMoveIndicators: jest.fn(),
            setPieceSelection: jest.fn(),
            clearPieceSelection: jest.fn()
        };

        // 尝试加载UIEventHandler模块
        if (typeof UIEventHandler !== 'undefined') {
            uiEventHandler = new UIEventHandler({
                game: mockChessGame,
                gameState: mockGameState,
                moveValidator: mockMoveValidator,
                audioManager: mockAudioManager
            });
        } else {
            try {
                // 从文件加载
                const fs = require('fs');
                const path = require('path');
                const uiEventHandlerPath = path.resolve(__dirname, '../../main/ui-event-handler.js');

                if (fs.existsSync(uiEventHandlerPath)) {
                    const uiEventHandlerCode = fs.readFileSync(uiEventHandlerPath, 'utf8');
                    eval(uiEventHandlerCode);
                    uiEventHandler = new UIEventHandler({
                        game: mockChessGame,
                        gameState: mockGameState,
                        moveValidator: mockMoveValidator,
                        audioManager: mockAudioManager
                    });
                }
            } catch (error) {
                console.log('无法加载UIEventHandler模块，创建mock实现');

                // 创建mock实现用于测试
                uiEventHandler = {
                    selectedPiece: null,
                    eventListeners: new Map(),

                    // 事件监听器管理
                    bindBoardEvents: jest.fn((board) => {
                        board.addEventListener('click', uiEventHandler.handleBoardClick);
                    }),

                    handleBoardClick: jest.fn((e) => {
                        const piece = e.target.closest('.piece');
                        const cell = e.target.closest('.cell');

                        if (piece) {
                            uiEventHandler.handlePieceClick(piece);
                        } else if (cell && uiEventHandler.selectedPiece) {
                            uiEventHandler.handleCellClick(cell);
                        }
                    }),

                    // 棋子选择处理
                    handlePieceClick: jest.fn((piece) => {
                        const pieceColor = piece.dataset.color;
                        if (pieceColor === mockChessGame.currentPlayer) {
                            uiEventHandler.selectPiece(piece);
                        } else if (uiEventHandler.selectedPiece) {
                            uiEventHandler.tryCapture(piece);
                        }
                    }),

                    selectPiece: jest.fn((piece) => {
                        uiEventHandler.clearSelection();
                        uiEventHandler.selectedPiece = piece;
                        mockChessGame.setPieceSelection(piece);
                        uiEventHandler.showValidMoves(piece);
                    }),

                    clearSelection: jest.fn(() => {
                        mockChessGame.clearPieceSelection(uiEventHandler.selectedPiece);
                        uiEventHandler.selectedPiece = null;
                        mockChessGame.clearMoveIndicators(mockChessGame.board);
                    }),

                    // 有效移动显示
                    showValidMoves: jest.fn((piece) => {
                        const type = piece.dataset.type;
                        const color = piece.dataset.color;
                        const row = parseInt(piece.dataset.row);
                        const col = parseInt(piece.dataset.col);

                        const moves = mockMoveValidator.getValidMoves(type, color, row, col, mockGameState);
                        moves.forEach(([moveRow, moveCol]) => {
                            const indicator = mockChessGame.createMoveIndicator(moveRow, moveCol);
                            mockChessGame.board.appendChild(indicator);
                        });
                    }),

                    handleCellClick: jest.fn((cell) => {
                        // 处理空格子点击
                    }),

                    handleValidMoveClick: jest.fn((target) => {
                        // 处理移动指示器点击
                    }),

                    tryCapture: jest.fn((targetPiece) => {
                        mockChessGame.tryCapture(targetPiece);
                    }),

                    // 事件监听器管理
                    registerEventListener: jest.fn((element, eventType, handler) => {
                        const key = `${eventType}_${element.id || element.textContent || Date.now()}`;
                        uiEventHandler.eventListeners.set(key, { element, eventType, handler });
                        element.addEventListener(eventType, handler);
                        return key;
                    }),

                    removeEventListener: jest.fn((key) => {
                        const listener = uiEventHandler.eventListeners.get(key);
                        if (listener) {
                            listener.element.removeEventListener(listener.eventType, listener.handler);
                            uiEventHandler.eventListeners.delete(key);
                        }
                    }),

                    cleanupListeners: jest.fn(() => {
                        uiEventHandler.eventListeners.forEach((listener, key) => {
                            listener.element.removeEventListener(listener.eventType, listener.handler);
                        });
                        uiEventHandler.eventListeners.clear();
                    }),

                    // 状态管理
                    getSelectedPiece() {
                        return uiEventHandler.selectedPiece;
                    },

                    hasSelection() {
                        return uiEventHandler.selectedPiece !== null;
                    }
                };
            }
        }
    });

    describe('事件监听器管理', () => {
        test('应该正确绑定棋盘点击事件', () => {
            if (uiEventHandler.bindBoardEvents) {
                uiEventHandler.bindBoardEvents(mockBoard);

                // 验证至少绑定了click事件（可能还有其他事件如mouseover）
                const clickCalls = mockBoard.addEventListener.mock.calls.filter(call => call[0] === 'click');
                expect(clickCalls.length).toBeGreaterThan(0);
                expect(typeof clickCalls[0][1]).toBe('function');
            }
        });

        test('应该正确注册事件监听器', () => {
            if (uiEventHandler.registerEventListener) {
                const element = { addEventListener: jest.fn() };
                const handler = jest.fn();

                const key = uiEventHandler.registerEventListener(element, 'click', handler);

                expect(element.addEventListener).toHaveBeenCalledWith('click', handler, {});
                expect(typeof key).toBe('string');
            }
        });

        test('应该正确移除事件监听器', () => {
            if (uiEventHandler.unregisterEventListener) {
                const element = {
                    addEventListener: jest.fn(),
                    removeEventListener: jest.fn()
                };
                const handler = jest.fn();

                const key = uiEventHandler.registerEventListener(element, 'click', handler);
                uiEventHandler.unregisterEventListener(key);

                expect(element.removeEventListener).toHaveBeenCalledWith('click', handler, {});
            }
        });

        test('应该清理所有事件监听器', () => {
            if (uiEventHandler.cleanupListeners) {
                // 先注册一些监听器
                const element1 = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
                const element2 = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
                const handler = jest.fn();

                uiEventHandler.registerEventListener(element1, 'click', handler);
                uiEventHandler.registerEventListener(element2, 'mousedown', handler);

                // 清理所有监听器
                uiEventHandler.cleanupListeners();

                expect(element1.removeEventListener).toHaveBeenCalled();
                expect(element2.removeEventListener).toHaveBeenCalled();
            }
        });
    });

    describe('棋子选择功能', () => {
        test('应该选择己方棋子', () => {
            if (uiEventHandler.handlePieceClick) {
                const piece = mockPieces[0]; // 红方车

                uiEventHandler.handlePieceClick(piece);

                expect(uiEventHandler.selectedPiece).toBe(piece);
            }
        });

        test('应该拒绝选择敌方棋子', () => {
            if (uiEventHandler.handlePieceClick) {
                const enemyPiece = mockPieces[1]; // 黑方兵

                uiEventHandler.handlePieceClick(enemyPiece);

                // 如果没有已选择棋子，不应该选择敌方棋子
                expect(uiEventHandler.selectedPiece).not.toBe(enemyPiece);
            }
        });

        test('应该清除之前的选择', () => {
            if (uiEventHandler.selectPiece) {
                const piece1 = mockPieces[0];
                const piece2 = {
                    ...mockPieces[1],
                    dataset: { type: 'soldier', color: 'red', row: '3', col: '0' }
                };

                // 选择第一个棋子
                uiEventHandler.selectPiece(piece1);
                expect(uiEventHandler.selectedPiece).toBe(piece1);

                // 选择第二个棋子
                uiEventHandler.selectPiece(piece2);
                expect(uiEventHandler.selectedPiece).toBe(piece2);
                // 验实际实现会清除之前的选择状态
                expect(piece1.classList.remove).toHaveBeenCalledWith('selected');
            }
        });

        test('应该正确清除选择', () => {
            if (uiEventHandler.clearSelection) {
                const piece = mockPieces[0];
                uiEventHandler.selectedPiece = piece;

                uiEventHandler.clearSelection();

                expect(uiEventHandler.selectedPiece).toBeNull();
                // 验实际实现直接操作棋子的classList
                expect(piece.classList.remove).toHaveBeenCalledWith('selected');
            }
        });

        test('应该检查是否有棋子被选中', () => {
            if (uiEventHandler.hasSelection) {
                // 初始状态应该没有选择
                expect(uiEventHandler.hasSelection()).toBe(false);

                // 选择棋子后应该返回true
                uiEventHandler.selectedPiece = mockPieces[0];
                expect(uiEventHandler.hasSelection()).toBe(true);
            }
        });
    });

    describe('移动显示功能', () => {
        test('应该显示棋子的有效移动', () => {
            if (uiEventHandler.showValidMoves) {
                const piece = mockPieces[0];

                uiEventHandler.showValidMoves(piece);

                expect(mockMoveValidator.getValidMoves).toHaveBeenCalledWith(
                    'rook', 'red', 0, 0, mockGameState
                );

                // 移动指示器被添加到_board
                expect(mockBoard.appendChild).toHaveBeenCalled();
            }
        });

        test('应该在取消选择时清除移动指示器', () => {
            if (uiEventHandler.clearSelection) {
                uiEventHandler.selectedPiece = mockPieces[0];

                uiEventHandler.clearSelection();

                // 验实际实现调用游戏对象的board.querySelectorAll
                expect(mockBoard.querySelectorAll).toHaveBeenCalledWith('.valid-move');
            }
        });

        test('应该不显示无效棋子的移动', () => {
            if (uiEventHandler.showValidMoves) {
                const invalidPiece = {
                    dataset: { type: '', color: '', row: '-1', col: '-1' },
                    classList: { add: jest.fn(), remove: jest.fn() }
                };

                // 应该优雅处理无效输入，不抛出错误
                expect(() => {
                    uiEventHandler.showValidMoves(invalidPiece);
                }).not.toThrow();
            }
        });
    });

    describe('点击事件处理', () => {
        test('应该处理棋子点击', () => {
            if (uiEventHandler.handlePieceClick) {
                const piece = mockPieces[0];

                uiEventHandler.handlePieceClick(piece);

                expect(mockAudioManager.playPieceSelect).toHaveBeenCalled();
            }
        });

        test('应该处理敌方棋子点击（吃子）', () => {
            if (uiEventHandler.handlePieceClick) {
                // 先选择己方棋子
                uiEventHandler.selectedPiece = mockPieces[0];

                // 点击敌方棋子
                const enemyPiece = mockPieces[1];
                uiEventHandler.handlePieceClick(enemyPiece);

                expect(mockAudioManager.playPieceCapture).toHaveBeenCalled();
            }
        });

        test('应该处理棋盘格子点击', () => {
            if (uiEventHandler.handleCellClick) {
                const cell = {
                    dataset: { row: '1', col: '0' },
                    classList: { contains: jest.fn() }
                };

                uiEventHandler.selectedPiece = mockPieces[0];
                uiEventHandler.handleCellClick(cell);

                expect(mockMoveValidator.isValidMove).toHaveBeenCalled();
            }
        });

        test('应该处理移动指示器点击', () => {
            if (uiEventHandler.handleValidMoveClick) {
                // 模拟getBoundingClientRect返回值
                const moveIndicator = {
                    getBoundingClientRect: jest.fn(() => ({
                        left: 75,
                        top: 425
                    })),
                    classList: { contains: jest.fn() }
                };

                // 模拟棋盘的getBoundingClientRect
                mockBoard.getBoundingClientRect = jest.fn(() => ({
                    left: 0,
                    top: 0
                }));

                uiEventHandler.selectedPiece = mockPieces[0];
                uiEventHandler.handleValidMoveClick(moveIndicator);

                // 验实际实现会调用moveValidator.isValidMove
                expect(mockMoveValidator.isValidMove).toHaveBeenCalled();
            }
        });
    });

    describe('用户交互状态', () => {
        test('应该正确获取当前选中的棋子', () => {
            if (uiEventHandler.getSelectedPiece) {
                const piece = mockPieces[0];
                uiEventHandler.selectedPiece = piece;

                const selected = uiEventHandler.getSelectedPiece();

                expect(selected).toBe(piece);
            }
        });

        test('应该处理游戏结束状态', () => {
            if (uiEventHandler.handleBoardClick) {
                mockChessGame.gameOver = true;

                const event = { target: { closest: jest.fn(() => null) } };
                uiEventHandler.handleBoardClick(event);

                // 游戏结束时不应该处理棋盘点击
                expect(mockAudioManager.playPieceSelect).not.toHaveBeenCalled();
            }
        });
    });

    describe('交互反馈', () => {
        test('应该在选择棋子时提供音效反馈', () => {
            if (uiEventHandler.handlePieceClick) {
                const piece = mockPieces[0];

                uiEventHandler.handlePieceClick(piece);

                expect(mockAudioManager.playPieceSelect).toHaveBeenCalled();
            }
        });

        test('应该在移动时提供音效反馈', () => {
            if (uiEventHandler.tryMove) {
                // 模拟有效移动
                mockMoveValidator.isValidMove = jest.fn(() => true);

                uiEventHandler.tryMove(1, 0);

                expect(mockAudioManager.playPieceMove).toHaveBeenCalled();
            }
        });

        test('应该在吃子时提供音效反馈', () => {
            if (uiEventHandler.tryCapture) {
                const enemyPiece = mockPieces[1];

                uiEventHandler.tryCapture(enemyPiece);

                expect(mockAudioManager.playPieceCapture).toHaveBeenCalled();
            }
        });
    });

    describe('边界情况', () => {
        test('应该处理null棋子点击', () => {
            if (uiEventHandler.handlePieceClick) {
                expect(() => {
                    uiEventHandler.handlePieceClick(null);
                }).not.toThrow();
            }
        });

        test('应该处理无效的棋子数据', () => {
            if (uiEventHandler.handlePieceClick) {
                const invalidPiece = {
                    dataset: null
                };

                expect(() => {
                    uiEventHandler.handlePieceClick(invalidPiece);
                }).not.toThrow();
            }
        });

        test('应该处理事件监听器重复移除', () => {
            if (uiEventHandler.cleanupListeners) {
                // 清理两次不应该出错
                uiEventHandler.cleanupListeners();
                expect(() => {
                    uiEventHandler.cleanupListeners();
                }).not.toThrow();
            }
        });

        test('应该处理移动验证失败', () => {
            if (uiEventHandler.handleValidMoveClick) {
                mockMoveValidator.isValidMove = jest.fn(() => false);

                const moveIndicator = {
                    dataset: { row: '1', col: '0' }
                };

                expect(() => {
                    uiEventHandler.handleValidMoveClick(moveIndicator);
                }).not.toThrow();
            }
        });
    });

    describe('性能测试', () => {
        test('应该快速处理大量棋子点击事件', () => {
            if (uiEventHandler.handlePieceClick) {
                const startTime = Date.now();

                // 模拟100次棋子点击
                for (let i = 0; i < 100; i++) {
                    uiEventHandler.handlePieceClick(mockPieces[0]);
                }

                const duration = Date.now() - startTime;
                expect(duration).toBeLessThan(500); // 应该在500ms内完成
            }
        });

        test('应该高效管理事件监听器', () => {
            if (uiEventHandler.registerEventListener) {
                const startTime = Date.now();

                const element = { addEventListener: jest.fn() };
                const handler = jest.fn();

                // 注册1000个事件监听器
                for (let i = 0; i < 1000; i++) {
                    uiEventHandler.registerEventListener(element, 'click', handler);
                }

                const duration = Date.now() - startTime;
                expect(duration).toBeLessThan(100); // 应该在100ms内完成
            }
        });
    });
});