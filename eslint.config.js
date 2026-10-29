module.exports = [
  { ignores: ['**/node_modules/**', '**/build/**', 'backend/public/**', 'backend/uploads/**'] },
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } }
    }
  }
];
