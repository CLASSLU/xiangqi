// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/mock-browser-env.js'
  ],
  collectCoverageFrom: [
    'tests/*.test.js'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ]
};