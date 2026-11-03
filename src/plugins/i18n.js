import Vue from 'vue'
import VueI18n from 'vue-i18n'
import store from '@/store'

import deDE from '@/plugins/i18n/de_DE.json'
import enGB from '@/plugins/i18n/en_GB.json'
import esES from '@/plugins/i18n/es_ES.json'
import ptPT from '@/plugins/i18n/pt_PT.json'

const axios = require('axios').default

const protectedProperties = ['pageAboutGerminateTitle', 'pageAboutGerminateSubtitle', 'pageAboutGerminateText', 'pageAboutGerminateCardHomepageText', 'pageAboutGerminateCardGithubText', 'pageAboutGerminateCardPublicationText', 'pageAboutGerminateCardDocumentationText', 'pageAboutGerminateTeamTitle', 'pageAboutGerminateTeamSubtitle', 'pageAboutGerminateTeamOthersTitle', 'pageAboutGerminateTeamOthersSubtitle', 'pageAboutGerminateTeamOthersText', 'pageAboutGerminateLocationTitle', 'pageAboutGerminateLocationSubtitle', 'pageAboutGerminateFundersTitle', 'pageAboutGerminateFundersSubtitle', 'pageAboutGerminateFundersText', 'pageAboutGerminateTeamSebastian', 'pageAboutGerminateTeamJobSebastian', 'pageAboutGerminateTeamIain', 'pageAboutGerminateTeamJobIain', 'pageAboutGerminateTeamPaul', 'pageAboutGerminateTeamJobPaul']

Vue.use(VueI18n)

const messages = {
  en_GB: enGB
}

// The translations built with the client (copies of the server ones, same keys as en_GB): the base of each language,
// what the server sends goes over them
const bundledMessages = {
  de_DE: deDE,
  es_ES: esES,
  pt_PT: ptPT
}

export const i18n = new VueI18n({
  locale: null,
  fallbackLocale: 'en_GB',
  warnHtmlInMessage: 'off',
  messages: messages
})

const loadedLanguages = []

// The page metadata (title, description, social media cards) in the current language: "metaTitle",
// "metaDescription", "metaUrl" and "metaImage" (absolute URLs). An empty value: no tag. index.html gets the English
// ones at build time (see vue.config.js), for those that don't run JavaScript.
const metaTags = [
  { key: 'metaDescription', attribute: 'name', names: ['description'] },
  { key: 'metaTitle', attribute: 'property', names: ['og:site_name', 'og:title'] },
  { key: 'metaTitle', attribute: 'name', names: ['twitter:title'] },
  { key: 'metaDescription', attribute: 'property', names: ['og:description'] },
  { key: 'metaDescription', attribute: 'name', names: ['twitter:description'] },
  { key: 'metaUrl', attribute: 'property', names: ['og:url'] },
  { key: 'metaUrl', attribute: 'name', names: ['twitter:url'] },
  { key: 'metaImage', attribute: 'property', names: ['og:image'] },
  { key: 'metaImage', attribute: 'name', names: ['twitter:image'] }
]

export function updatePageMeta () {
  const text = key => i18n.te(key) || i18n.te(key, 'en_GB') ? (i18n.t(key) || '').trim() : ''
  const title = text('metaTitle')
  if (title) {
    document.title = title
  }
  metaTags.forEach(tag => {
    const value = text(tag.key)
    tag.names.forEach(name => {
      let element = document.head.querySelector(`meta[${tag.attribute}="${name}"]`)
      if (!value) {
        if (element) {
          element.remove()
        }
        return
      }
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(tag.attribute, name)
        document.head.appendChild(element)
      }
      element.setAttribute('content', value)
    })
  })
}

function setI18nLanguage (lang) {
  i18n.locale = lang
  axios.defaults.headers.common['Accept-Language'] = lang
  let htmlTag = lang
  const underscoreIndex = lang.indexOf('_')
  if (underscoreIndex !== -1) {
    htmlTag = lang.substring(0, underscoreIndex)
  }
  document.querySelector('html').setAttribute('lang', htmlTag)
  updatePageMeta()
  return lang
}

export function loadLanguageAsync (lang) {
  // If the same language
  if (i18n.locale === lang) {
    return Promise.resolve(setI18nLanguage(lang))
  }

  // If the language was already loaded
  if (loadedLanguages.includes(lang)) {
    return Promise.resolve(setI18nLanguage(lang))
  }

  // If the language hasn't been loaded yet
  return axios({
    baseURL: store.getters.storeBaseUrl,
    method: 'get',
    url: /* webpackChunkName: "lang-[request]" */ `clientlocale/${lang}`
  }).then(m => {
    // If we get a response from the server, use it
    if (m.data) {
      // Delete the content of the about Germinate page, we don't want people to change it.
      protectedProperties.forEach(p => delete m.data[p])
    }

    if (!messages[lang]) {
      messages[lang] = Object.assign({}, bundledMessages[lang])
    }

    Object.assign(messages[lang], m.data)
    i18n.setLocaleMessage(lang, messages[lang])
    loadedLanguages.push(lang)
    return setI18nLanguage(lang)
  }).catch(() => {
    // If we can't get it from the server, use the fallback we've got locally
    if (!messages[lang]) {
      messages[lang] = Object.assign({}, bundledMessages[lang])
    }
    i18n.setLocaleMessage(lang, messages[lang])
    loadedLanguages.push(lang)
    return setI18nLanguage(lang)
  })
}
