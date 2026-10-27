import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/demo/**',
      'src/services/ModeProvider.tsx',
      'src/components/DemoModeModal.tsx',
      'src/components/common/Field.tsx',
      'src/components/common/Select.tsx',
      'src/components/common/Switch.tsx',
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXOpeningElement > JSXIdentifier[name=/^(input|select|textarea)$/]',
          message:
            'Raw <input>, <select>, and <textarea> elements are forbidden. Use shared Field, Select, Checkbox, or Switch from src/components/common.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/demo/**', '*/demo/**', '../demo/**', './demo/**', '@/demo/**'],
              message: 'Importing from /src/demo/ outside of demo and ModeProvider is strictly forbidden.',
            },
          ],
        },
      ],
    },
  },
];
