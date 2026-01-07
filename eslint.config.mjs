import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: [
    '**/lib/**',
    '**/dist/**',
    '**/*.d.ts',
    '**/node_modules/**',
  ],
  typescript: {
    overrides: {
      'ts/no-namespace': 'off',
      'ts/consistent-type-imports': 'off',
      'ts/ban-ts-comment': 'off',
      'no-console': 'off',
      'unused-imports/no-unused-vars': 'warn',
    },
  },
  vue: false,
  jsonc: false,
  yaml: false,
})
