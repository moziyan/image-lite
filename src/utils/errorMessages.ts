import { i18n } from '@/locales'
import type { ImageErrorCode } from '@/types/image'

/**
 * Parameters that parameterize an error message template.
 * `name` is the usual file name; other keys are code-specific.
 */
export type ImageErrorParams = Record<string, string | number>

/**
 * Translate an image-domain error code into a localized, user-facing
 * message. Services throw/return codes (never localized strings); the UI
 * layer renders them through this helper so every locale sees its own
 * language.
 */
export function translateImageError(code: ImageErrorCode, params: ImageErrorParams = {}): string {
  const te = i18n.global.te as (key: string) => boolean
  const t = i18n.global.t as (key: string, params: ImageErrorParams) => string
  const key = `errors.${code}`
  if (te(key)) {
    return t(key, params)
  }
  return t('errors.UNKNOWN', {})
}
