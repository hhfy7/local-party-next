import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import react from 'eslint-plugin-react'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', '.git'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      react,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
  // 测试文件专用配置
  {
    files: ['**/__tests__/**/*', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      // 测试文件中允许使用any类型，因为Mock和测试数据需要灵活性
      '@typescript-eslint/no-explicit-any': 'off',
      // 测试文件中允许未使用的变量（通常是Mock函数）
      '@typescript-eslint/no-unused-vars': 'off',
      // 测试文件中允许@ts-expect-error注释
      '@typescript-eslint/ban-ts-comment': 'off',
      // 测试文件可以修改全局对象
      'no-extend-native': 'off',
      // 测试文件中的console语句通常是调试需要
      'no-console': 'off',
    },
  },
  prettier,
)
