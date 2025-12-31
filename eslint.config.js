import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import stylistic from '@stylistic/eslint-plugin';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'logs/**',
      'coverage/**',
      '*.config.js',
      'journee-api-bruno/**',
      'etc/**',
      'package-lock.json',
      'yarn.lock',
      'serviceAccountKey.json',
      '.env',
      '.env.*',
      '.idea/**',
      '.vscode/**',
      '.git/**'
    ]
  },
  // Base JavaScript recommended rules
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    plugins: {
      '@stylistic': stylistic
    },
    rules: {
      // Stylistic rules
      '@stylistic/indent': ['error', 2],
      '@stylistic/quotes': ['error', 'single', {avoidEscape: true}],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/comma-dangle': 'off',
      '@stylistic/object-curly-spacing': 'off',
      '@stylistic/array-bracket-spacing': ['error', 'never'],
      '@stylistic/space-before-function-paren': ['error', {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always'
      }],
      '@stylistic/keyword-spacing': ['error', {before: true, after: true}],
      '@stylistic/space-infix-ops': 'error',
      '@stylistic/no-trailing-spaces': 'off',
      '@stylistic/eol-last': ['error', 'always'],

      // Code quality rules
      'no-console': ['warn', {allow: ['warn', 'error', 'info']}],
      'no-unused-vars': ['warn', {argsIgnorePattern: '^_'}],
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'no-duplicate-imports': 'error',
      'no-unreachable': 'error',
      'no-debugger': 'warn',
      'eqeqeq': ['error', 'always']
    }
  },
  // TypeScript specific configuration
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      // Disable base ESLint rules that are covered by TypeScript
      'no-unused-vars': 'off',
      'no-undef': 'off',

      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/consistent-type-imports': ['warn', {
        prefer: 'type-imports',
        disallowTypeAnnotations: false
      }],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/ban-ts-comment': ['warn', {
        'ts-expect-error': 'allow-with-description',
        'ts-ignore': false,
        'ts-nocheck': false
      }],
      "array-bracket-spacing": "off",
      "object-curly-spacing": ["error", "never"],
      "object-curly-newline": "off",
      "space-before-blocks": "off",
      "space-infix-ops": "off",
      "arrow-spacing": "off",
    }
  }
];

