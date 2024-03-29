module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    'plugin:vue/essential',
    'eslint:recommended',
    'plugin:prettier/recommended',
  ],
  rules: {
    'vue/script-setup-uses-vars': 0,
    'vue/multi-word-component-names': 0,
    'prettier/prettier': ['error', { singleQuote: true }],
    'no-console': 2,
    'no-debugger': 2,
    // 语句强制分号结尾
    semi: [2, 'always'],
    'handle-callback-err': 0,
    eqeqeq: ['error', 'smart'],
    'one-var': 'off',
    camelcase: 0,
    'no-var': 2,
    // 优先使用数组和对象解构
    'prefer-destructuring': 0,
    'no-duplicate-imports': 2,
    'vue/html-quotes': ['error', 'double'],
    'prefer-const': 0,
    'getter-return': ['error', { allowImplicit: true }],
    'no-empty': ['error', { allowEmptyCatch: true }],
    // 'brace-style': ['error', 'stroustrup', { allowSingleLine: true }],
    // 'brace-style': ['error', '1tbs', { allowSingleLine: true }],
    'brace-style': 0,
    'no-unused-vars': [
      'error',
      {
        vars: 'all',
        // args: 'after-used',
        args: 'none',
        ignoreRestSiblings: true,
        caughtErrors: 'none',
      },
    ],
    'no-constant-condition': ['error', { checkLoops: false }],
  },
  parserOptions: {
    parser: 'babel-eslint',
  },
};
