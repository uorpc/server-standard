import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
}, [
  {
    files: ['*/*/playground/**/*.ts'],
    rules: {
      'no-console': 'off',
      'unused-imports/no-unused-vars': 'off',
    },
  },
])
