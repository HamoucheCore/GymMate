// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  globalIgnores(['dist/*', '.expo/*', 'lib/gymmate/data.ts', 'expo-env.d.ts']),
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    // `eslint-config-expo` registers `@typescript-eslint` only for TS files, so the
    // TypeScript-aware rules live in their own scoped object.
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // Barrel import guard: Metro ships every icon module when the barrel is imported.
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'lucide-react-native',
              message:
                'Import icons per-module: lucide-react-native/icons/<kebab>. The barrel ships every icon (~1.7 MB).',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    rules: {
      'no-console': 'warn',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
          message: 'No inline hex — import a token from constants/GymMateTheme.ts.',
        },
      ],
      // The two React Compiler rules below flag an established, intentional pattern
      // in this app: sheets and pickers reset their local drafts in an effect when a
      // `visible`/query prop changes (ExerciseDetailSheet, AddMealSheet,
      // ExercisePicker, WorkoutSheet, app/(tabs)/index.tsx). Moving that state
      // ownership into the parents is a behaviour change, not a lint fix, so the
      // rules stay on as warnings until that refactor lands.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
  {
    // The two sanctioned exceptions from DESIGN.md.
    files: ['constants/GymMateTheme.ts', 'app/+html.tsx'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // `sharp` is deliberately not a repo dependency (see AGENTS.md): the media
    // scripts are run out-of-tree from the scratch `gymmedia` project, so the
    // resolver can never find it here.
    files: ['scripts/media/**/*.mjs'],
    rules: { 'import/no-unresolved': 'off' },
  },
  {
    files: ['scripts/**/*.mjs', 'eslint.config.js'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly', URL: 'readonly' } },
    rules: { 'no-console': 'off' },
  },
]);
