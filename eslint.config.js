//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default [
  ...tanstackConfig,
  // Accessibility: the full recommended set on every component and route.
  { files: ['src/**/*.tsx'], ...jsxA11y.flatConfigs.recommended },
  {
    files: ['src/**/*.tsx'],
    rules: {
      // Radix controls render <button role="checkbox|switch|radio">; a <label> wrapping
      // them is a valid association the rule cannot see through.
      'jsx-a11y/label-has-associated-control': [
        'error',
        {
          controlComponents: ['Checkbox', 'Switch', 'RadioGroupItem'],
          // Preset cards nest their label text two spans deep (label > span > span).
          depth: 3,
        },
      ],
    },
  },
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      'worker-configuration.d.ts',
      'src/routeTree.gen.ts',
      // Local tool output and the extractor's Python venv (git-ignored).
      '.verify/**',
      'tools/extract-symbols/.venv/**',
      'tools/extract-symbols/.out/**',
    ],
  },
]
