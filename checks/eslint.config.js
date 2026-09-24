import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import { vueTsConfigs, withVueTs } from '@vue/eslint-config-typescript'
import skillRules from './eslint.skill-rules.js'

// Lints the skill's examples with the skill's own rules. ESLint also rejects unknown rule
// names and invalid options, so this doubles as a check on references/tooling.md.
export default withVueTs(
  { ignores: ['node_modules/**', 'scripts/**', 'eslint.config.js', 'eslint.skill-rules.js'] },
  pluginVue.configs['flat/recommended-error'],
  vueTsConfigs.recommendedTypeChecked,
  skillRules, // the code block in references/tooling.md, extracted verbatim
  {
    // The rules references/tooling.md recommends in prose.
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': true }],
      '@typescript-eslint/consistent-type-definitions': 'error',
      '@typescript-eslint/no-deprecated': 'error',
      'vue/define-props-declaration': ['error', 'type-based'],
      'vue/define-emits-declaration': ['error', 'type-literal'],
      'vue/require-typed-object-prop': 'error',
      'vue/no-required-prop-with-default': 'error',
      'vue/html-button-has-type': 'error',
      'vue/prefer-single-event-payload': 'error',
      'vue/no-shadow-native-events': 'error',
      'vue/no-root-v-if': 'error',
      'vue/max-template-depth': ['error', { maxDepth: 5 }],
      'vue/no-undef-properties': 'error',
      'vue/no-restricted-component-options': ['error', 'mixins', 'extends'],
      'no-restricted-syntax': ['error', {
        selector: "TSAsExpression > TSTypeReference > Identifier.typeName[name='Error']",
        message: 'Caught values are unknown: narrow with instanceof or convert with toError().',
      }],
    },
  },
  // File-based route pages are named by their path, not multi-word.
  { files: ['src/pages/**/*.vue'], rules: { 'vue/multi-word-component-names': 'off' } },
  // Prettier owns formatting; this goes last (tooling.md, Formatting).
  skipFormatting,
)
