// Flat ESLint config for the DevDeck web frontend (apps/web + shared packages).
// Backend (Go), CLI, desktop and extension are intentionally out of scope here
// and keep their own toolchains.
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/*.config.{js,ts,cjs,mjs}',
      '**/*.cjs',
      '**/vite-env.d.ts',
      '**/env.d.ts',
      // Out of frontend lint scope — these have their own pipelines.
      'apps/extension/**',
      'apps/landing/**',
      'backend/**',
      'cli/**',
      'bin/**',
      'deploy/**',
      'scripts/**',
      'openspec/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,

      // --- Correctness: errors. These catch real bugs. ---
      // Classic react-hooks rules only (avoid the experimental compiler rules
      // that ship in newer plugin versions; they're noisy on this codebase).
      'react-hooks/rules-of-hooks': 'error',
      'no-debugger': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-useless-escape': 'error',
      'no-useless-assignment': 'error',

      // --- Adoptable backlog: warnings. ---
      // Surfaced (not blocking) so the linter is usable on the existing tree.
      // These are great `good first issue` candidates; ratchet to 'error' as
      // they're burned down.
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',
      // Off by design: the app uses autoFocus deliberately for focus management
      // in modals, command palettes and dedicated auth forms, where moving
      // focus into the dialog/first field is the accessible behavior.
      'jsx-a11y/no-autofocus': 'off',

      // Noise on this codebase's existing patterns; off for now.
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
    },
  },
  // Test files: relax rules that fight common test idioms.
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/vitest.setup.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  prettier,
)
