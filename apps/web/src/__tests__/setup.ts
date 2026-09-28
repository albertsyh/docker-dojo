import { config } from '@vue/test-utils'
import { i18n } from '../i18n'

// Every mounted component gets the app's i18n, in English unless a test switches it.
config.global.plugins.push(i18n)
