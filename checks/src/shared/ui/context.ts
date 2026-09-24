// Stub contexts for the context-supplied defaults example in references/components.md.
import { inject, type InjectionKey, type Ref } from 'vue'

export interface ButtonGroupContext {
  disabled: Readonly<Ref<boolean>>
  size: Readonly<Ref<'sm' | 'md'>>
}
export const ButtonGroupKey: InjectionKey<ButtonGroupContext> = Symbol('ButtonGroup')

export interface UiConfig {
  size?: 'sm' | 'md'
}
export const UiConfigKey: InjectionKey<UiConfig> = Symbol('UiConfig')

export function useUiConfig(): UiConfig {
  return inject(UiConfigKey, {})
}
