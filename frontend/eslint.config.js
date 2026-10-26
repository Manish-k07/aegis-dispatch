import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/demo/**', 'src/services/ModeProvider.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
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
