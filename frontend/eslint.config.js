const js = require('@eslint/js');
const react = require('eslint-plugin-react');
const globals = require('globals');

module.exports = [
  { ignores: ['build/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['*.js', 'plugins/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'commonjs', globals: { ...globals.node } },
    rules: { 'no-unused-vars': 'warn', 'no-extra-boolean-cast': 'off', 'no-empty': 'warn' },
  },
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: { react },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node, ...globals.jest },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      'react/no-unknown-property': ['error', { ignore: ['cmdk-input-wrapper'] }],
      'no-unused-vars': 'warn',
      'no-empty': 'warn',
    },
  },
];
