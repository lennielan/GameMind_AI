import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enTranslations from './locales/en.json'
import ruTranslations from './locales/ru.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations
      },
      ru: {
        translation: ruTranslations
      }
    },
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false
    }
  })

if (import.meta.hot) {
  import.meta.hot.accept(['./locales/en.json', './locales/ru.json'], (modules) => {
    const [newEn, newRu] = modules || []
    const enData = newEn?.default || newEn || enTranslations
    const ruData = newRu?.default || newRu || ruTranslations
    i18n.addResourceBundle('en', 'translation', enData, true, true)
    i18n.addResourceBundle('ru', 'translation', ruData, true, true)
    i18n.changeLanguage(i18n.language)
  })
}

export default i18n
