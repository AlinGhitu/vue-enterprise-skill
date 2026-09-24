// GENERATED from references/tooling.md by scripts/extract-snippets.mjs: edit the skill, not this file
// The skill's ESLint rule block, exported for eslint.config.js.
export default // eslint.config.js, after ...pluginVue.configs['flat/recommended-error']
{
  rules: {
    'vue/block-lang': ['error', { script: { lang: 'ts' } }],
    'vue/component-api-style': ['error', ['script-setup']],
    'vue/define-macros-order': ['error', { order: ['defineOptions', 'defineModel', 'defineProps', 'defineEmits', 'defineSlots'], defineExposeLast: true }],
    'vue/no-import-compiler-macros': 'error',
    'vue/no-setup-props-reactivity-loss': 'error',
    'vue/no-ref-object-reactivity-loss': 'error',
    'vue/require-typed-ref': 'error',
    'vue/require-explicit-slots': 'error',
    'vue/no-restricted-call-after-await': ['error', { module: 'vue-router', path: ['useRoute', 'useRouter'] } /* + i18n, stores, your composables; checks setup() only */],
    'vue/no-unused-properties': ['error', { groups: ['props'] }],
    'vue/no-v-html': 'error',
    'vue/no-template-target-blank': 'error',
    'no-console': 'error',                      // allowed only in the logging adapter
    'vue/require-default-prop': 'off',          // TS projects: optional props are intentionally undefined
    // Vue ≥ 3.5 only:
    'vue/prefer-use-template-ref': 'error',
    'vue/define-props-destructuring': 'error',
  },
}
