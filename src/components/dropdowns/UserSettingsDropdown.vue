<template>
  <!-- The look of the dropdowns of the top navigation (top-nav-dropdown.css): titles, rows, icons in pastel squares -->
  <b-nav-item-dropdown right v-if="storeServerSettings && storeServerSettings.authMode !== 'NONE'" :menu-class="['top-nav-menu', 'user-settings-menu', { 'user-settings-menu-wide': isCurator }]" v-b-tooltip.hover.bottom="$t('dropdownUserSettings')">
    <template #button-content>
      <MdiIcon :path="mdiAccount" />
    </template>

    <!-- One title at the top; signed in: the email under it (cut when long) and the level of the user as a badge -->
    <div class="top-nav-menu-title">
      {{ $t('dropdownUserSettings') }}
      <div class="user-settings-identity" v-if="storeToken && storeToken.username">
        <span class="user-settings-email" :title="storeToken.username">{{ storeToken.username }}</span>
        <span :class="['user-settings-level', userLevel.className]" v-if="userLevel">{{ userLevel.text }}</span>
      </div>
    </div>
    <!-- Data curators and administrators get to see additional items -->
    <template v-if="isCurator">
      <b-dropdown-item :to="{ name: Pages.germinateSettings }" v-if="userIsAtLeast(storeToken.userType, USER_TYPE_ADMINISTRATOR)" link-class="top-nav-menu-item"><span class="top-nav-menu-icon is-warning"><MdiIcon :path="mdiCog" :size="15" /></span> {{ $t('dropdownUserSettingsGerminateSettings') }}</b-dropdown-item>
      <b-dropdown-item :to="{ name: Pages.backup }" v-if="userIsAtLeast(storeToken.userType, USER_TYPE_ADMINISTRATOR)" link-class="top-nav-menu-item"><span class="top-nav-menu-icon is-warning"><MdiIcon :path="mdiBackupRestore" :size="15" /></span> {{ $t('dropdownUserSettingsBackup') }}</b-dropdown-item>
      <b-dropdown-item :to="{ name: Pages.userPermissions }" v-if="userIsAtLeast(storeToken.userType, USER_TYPE_ADMINISTRATOR)" link-class="top-nav-menu-item"><span class="top-nav-menu-icon is-warning"><MdiIcon :path="mdiAccountKey" :size="15" /></span> {{ $t('dropdownUserSettingsUserPermissions') }}</b-dropdown-item>
      <b-dropdown-item :to="{ name: Pages.importUpload }" v-if="storeServerSettings.dataImportMode !== 'NONE'" link-class="top-nav-menu-item"><span class="top-nav-menu-icon is-warning"><MdiIcon :path="mdiUpload" :size="15" /></span> {{ $t('dropdownUserSettingsDataUpload') }}</b-dropdown-item>
      <b-dropdown-item :to="{ name: Pages.germplasmUnifier }" link-class="top-nav-menu-item"><span class="top-nav-menu-icon is-warning"><MdiIcon :path="mdiSetMerge" :size="15" /></span> {{ $t('dropdownUserSettingsGermplasmUnifier') }}</b-dropdown-item>
      <b-dropdown-item :to="{ name: Pages.germplasmMatch }" link-class="top-nav-menu-item"><span class="top-nav-menu-icon is-warning"><MdiIcon :path="mdiTextSearch" :size="15" /></span> {{ $t('dropdownUserSettingsGermplasmMatchSearch') }}</b-dropdown-item>
      <b-dropdown-item :to="{ name: Pages.userFeedback }" v-if="storeServerSettings.supportsFeedback" link-class="top-nav-menu-item"><span class="top-nav-menu-icon is-warning"><MdiIcon :path="mdiCommentQuoteOutline" :size="15" /></span> {{ $t('dropdownUserSettingsUserFeedback') }}</b-dropdown-item>
    </template>
    <template v-if="storeToken && storeToken.token">
      <b-dropdown-item @click="$refs.tokenModal.show()" link-class="top-nav-menu-item"><span class="top-nav-menu-icon is-info"><MdiIcon :path="mdiCircleMultiple" :size="15" /></span> {{ $t('dropdownUserSettingsGetToken') }}</b-dropdown-item>
      <!-- Logout -->
      <b-dropdown-item @click="signOut" link-class="top-nav-menu-item"><span class="top-nav-menu-icon is-danger"><MdiIcon :path="mdiLogoutVariant" :size="15" /></span> {{ $t('dropdownUserSettingsLogout') }}</b-dropdown-item>
    </template>
    <!-- Login -->
    <b-dropdown-item :to="{ name: Pages.login }" v-else link-class="top-nav-menu-item"><span class="top-nav-menu-icon is-success"><MdiIcon :path="mdiLoginVariant" :size="15" /></span> {{ $t('dropdownUserSettingsLogin') }}</b-dropdown-item>

    <GetTokenModal ref="tokenModal" />
  </b-nav-item-dropdown>
</template>

<script>
import { mapGetters } from 'vuex'

import GetTokenModal from '@/components/modals/GetTokenModal'
import MdiIcon from '@/components/icons/MdiIcon'
import { userIsAtLeast, apiDeleteToken, apiPostToken, USER_TYPE_ADMINISTRATOR, USER_TYPE_DATA_CURATOR, USER_TYPE_REGULAR_USER } from '@/mixins/api/auth'

import { mdiAccount, mdiCog, mdiAccountKey, mdiUpload, mdiCircleMultiple, mdiSetMerge, mdiLogoutVariant, mdiLoginVariant, mdiCommentQuoteOutline, mdiTextSearch, mdiBackupRestore } from '@mdi/js'
import { Pages } from '@/mixins/pages'

const emitter = require('tiny-emitter/instance')

// Badges of the user levels: their text and colour
const USER_LEVELS = {
  [USER_TYPE_ADMINISTRATOR]: { text: 'Admin', className: 'is-admin' },
  [USER_TYPE_DATA_CURATOR]: { text: 'Data Curator', className: 'is-curator' },
  [USER_TYPE_REGULAR_USER]: { text: 'User', className: 'is-user' }
}

export default {
  components: {
    GetTokenModal,
    MdiIcon
  },
  data: () => {
    return {
      Pages,
      mdiAccount,
      mdiBackupRestore,
      mdiCog,
      mdiCircleMultiple,
      mdiAccountKey,
      mdiUpload,
      mdiSetMerge,
      mdiLogoutVariant,
      mdiLoginVariant,
      mdiCommentQuoteOutline,
      mdiTextSearch,
      enabled: true,
      USER_TYPE_ADMINISTRATOR,
      USER_TYPE_DATA_CURATOR
    }
  },
  computed: {
    ...mapGetters([
      'storeToken',
      'storeServerSettings'
    ]),
    // Data curators and administrators see the advanced settings (the menu is then wider)
    isCurator: function () {
      return !!this.storeToken && userIsAtLeast(this.storeToken.userType, USER_TYPE_DATA_CURATOR)
    },
    // The level of the user signed in, as a badge
    userLevel: function () {
      const type = this.storeToken ? this.storeToken.userType : null
      if (!type) {
        return null
      }
      return USER_LEVELS[type] || { text: type, className: 'is-other' }
    }
  },
  methods: {
    userIsAtLeast,
    signIn: function (user) {
      this.enabled = false
      apiPostToken(user, result => {
        // If it's successful, finally store them
        this.enabled = true
        this.$store.dispatch('setToken', result)
        window.location.reload()
        emitter.emit('update-sidebar-menu')
      }, {
        codes: [],
        callback: () => {
          this.enabled = true
          // If they're wrong, remove
          this.$store.dispatch('setToken', null)
          emitter.emit('update-sidebar-menu')
        }
      })
    },
    signOut: function () {
      const user = {
        email: this.storeToken.username,
        password: this.storeToken.token
      }

      apiDeleteToken(user, () => {
        // If it's successful, delete token, then redirect
        this.$store.dispatch('setToken', null)

        if (this.storeServerSettings.authMode === 'FULL') {
          this.$router.push({ name: Pages.login })
        } else {
          this.$router.push({ name: Pages.home })
        }

        this.$gtag.event('login', 'logout')

        emitter.emit('update-sidebar-menu')
      }, {
        codes: [],
        callback: () => {
          // If they're wrong, remove
          this.$store.dispatch('setToken', null)

          emitter.emit('update-sidebar-menu')
        }
      })
    }
  }
}
</script>

<!-- The look of the dropdowns of the top navigation (card, arrow, titles, rows, icons, dark mode) -->
<style src="@/assets/top-nav-dropdown.css"></style>
<style>
/* With the advanced settings: a little wider */
.dropdown-menu.top-nav-menu.user-settings-menu-wide {
  min-width: 18.5rem;
}
.user-settings-menu .user-settings-identity {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.3rem;
  margin-top: 0.2rem;
  /* Doesn't widen the menu: takes the width of the menu, so a long email is cut instead */
  width: 0;
  min-width: 100%;
}
/* The email: smaller, on one line, cut with "..." */
.user-settings-menu .user-settings-email {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.82rem;
  font-weight: 400;
  color: #6b6f6c;
}
/* The level: a small rounded badge, a colour per level */
.user-settings-menu .user-settings-level {
  padding: 0.05rem 0.5rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.user-settings-menu .user-settings-level.is-admin { background: #f8d9dc; color: #a71d2a; }
.user-settings-menu .user-settings-level.is-curator { background: #fff3cd; color: #8a6a00; }
.user-settings-menu .user-settings-level.is-user { background: #d4eef2; color: #0f6674; }
.user-settings-menu .user-settings-level.is-other { background: #e7e8e5; color: #5c605d; }
body.dark-mode .user-settings-menu .user-settings-email { color: #a39d93; }
body.dark-mode .user-settings-menu .user-settings-level.is-admin { background: rgba(220, 53, 69, 0.22); color: #f08591; }
body.dark-mode .user-settings-menu .user-settings-level.is-curator { background: rgba(255, 193, 7, 0.2); color: #ffd65c; }
body.dark-mode .user-settings-menu .user-settings-level.is-user { background: rgba(23, 162, 184, 0.22); color: #6fd3e3; }
body.dark-mode .user-settings-menu .user-settings-level.is-other { background: rgba(255, 255, 255, 0.1); color: #c4beb5; }
</style>
