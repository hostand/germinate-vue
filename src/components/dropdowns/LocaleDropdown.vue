<template>
  <!-- The look of the marked items dropdown (top-nav-dropdown.css): title, a row per language (flag and name), the
       language in use marked -->
  <b-nav-item-dropdown :right="position === 'right'" v-if="languages && languages.length > 1" aria-label="Locale switcher" menu-class="top-nav-menu locale-menu" v-b-tooltip.hover.bottom="'Locale'" ref="dropdown">
    <template #button-content>
      <MdiIcon :path="mdiTranslate" />
    </template>

    <div class="top-nav-menu-title">{{ $t('dropdownLocales') }}</div>
    <div v-for="language in languages"
         :key="'locale-' + language.locale"
         :class="['top-nav-menu-row', 'locale-row', { active: language.locale === storeLocale }]"
         role="menuitem"
         tabindex="0"
         @click="selectLocale(language)"
         @keydown.enter="selectLocale(language)">
      <i :class="'fi fi-' + language.flag + ' locale-flag'" />
      <span class="locale-name">{{ language.name }}</span>
      <MdiIcon :path="mdiCheck" :size="16" className="locale-check" v-if="language.locale === storeLocale" />
    </div>
  </b-nav-item-dropdown>
</template>

<script>
import { mapGetters } from 'vuex'

import MdiIcon from '@/components/icons/MdiIcon'
import { loadLanguageAsync } from '@/plugins/i18n'
import { apiGetLocales } from '@/mixins/api/misc.js'

import { mdiTranslate, mdiCheck } from '@mdi/js'

export default {
  components: {
    MdiIcon
  },
  props: {
    position: {
      type: String,
      default: 'right'
    }
  },
  computed: {
    ...mapGetters([
      'storeLocale'
    ])
  },
  data: function () {
    return {
      mdiTranslate,
      mdiCheck,
      // Default set of languages. Server can provide additional ones
      languages: [{
        locale: 'en_GB',
        flag: 'gb',
        name: 'British English'
      }]
    }
  },
  methods: {
    // A language of the list: in use, and the dropdown closes
    selectLocale: function (language) {
      if (this.$refs.dropdown) {
        this.$refs.dropdown.hide(true)
      }
      this.onLocaleChanged(language)
    },
    onLocaleChanged: function (language) {
      loadLanguageAsync(language.locale).then(() => {
        this.$i18n.locale = language.locale
        this.$store.dispatch('setLocale', language.locale)
      })
    },
    init: function () {
      if (this.storeLocale) {
        this.$i18n.locale = this.languages.map(l => {
          return l.locale
        }).filter(l => {
          return this.storeLocale === l
        })
      }
    }
  },
  mounted: function () {
    // Ask the server which locales are available
    apiGetLocales(result => {
      // If there is a result, use it
      if (result) {
        this.languages = result
      }

      this.init()
    }, () => {
      // If there's an error, work with what we've got
      this.init()
    })
  }
}
</script>

<!-- The look of the dropdowns of the top navigation (card, arrow, title, rows, dark mode) -->
<style src="@/assets/top-nav-dropdown.css"></style>
<style scoped>
.locale-flag {
  flex-shrink: 0;
  border-radius: 2px;
}
.locale-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* The language in use: in green, with a tick */
.locale-row.active .locale-name {
  font-weight: 600;
  color: #3b6b35;
}
.locale-row >>> .locale-check {
  color: #3b6b35;
}
body.dark-mode .locale-row.active .locale-name,
body.dark-mode .locale-row >>> .locale-check {
  color: #8cc47e;
}
</style>
