<template>
  <div>
    <b-navbar :type="storeDarkMode ? 'dark' : 'light'" :variant="storeDarkMode ? 'dark' : 'light'" id="app-header" fixed="top">
      <b-navbar-brand :to="{ name: Pages.home }">
        <b-img-lazy class="navbar-brand-full" src="img/germinate-square.svg" width="45" height="45" alt="Germinate logo" />
        <b-img-lazy class="navbar-brand-full navbar-brand-text ml-2" src="img/germinate-text.svg" height="22" alt="Germinate logo" />
      </b-navbar-brand>

      <!-- Right aligned nav items -->
      <b-navbar-nav class="ml-auto align-items-stretch top-nav">
        <b-nav-form @submit.prevent="search" class="d-none d-md-inline" form-class="h-100">
          <!-- Search box: rounded, with the green search button -->
          <b-input-group class="mr-sm-3 top-nav-search">
            <b-form-input size="sm" class="search-input" v-model="searchTerm" :placeholder="$t('inputPlaceholderSearch')"></b-form-input>
            <b-input-group-append>
              <b-button class="top-nav-search-button" @click="search" :aria-label="$t('inputPlaceholderSearch')">
                <MdiIcon :path="mdiMagnify" />
              </b-button>
            </b-input-group-append>
          </b-input-group>
        </b-nav-form>

        <!-- Marked items (germplasm, markers, locations) -->
        <MarkedItemsDropdown />
        <b-nav-item :disabled="helpDisabled" @click="showHelp" id="top-nav-help" aria-label="Help information">
          <MdiIcon :path="mdiHelpCircleOutline" :class="{ 'text-info': !helpDisabled }" />
        </b-nav-item>
        <!-- Light theme: "Toggle dark mode"; dark theme: "Toggle light mode" -->
        <b-nav-item @click="toggleDarkMode" id="top-nav-darkmode" v-b-tooltip.hover :title="themeToggleText" :aria-label="themeToggleText">
          <!-- Light theme: the moon (to go dark); dark theme: the sun (to go light) -->
          <MdiIcon :path="storeDarkMode ? mdiWeatherSunny : mdiWeatherNight" />
        </b-nav-item>

        <LocaleDropdown class="top-nav-locale"/>
        <UserSettingsDropdown />
        <b-nav-item v-b-toggle.asyncbar id="aside-toggler" aria-label="Asynchronous job toggle">
          <!-- Indicate how many jobs are running -->
          <b-badge pill variant="info" class="async-badge" v-if="storeAsyncJobCount !== null && storeAsyncJobCount > 0">{{ storeAsyncJobCount }}</b-badge>
          <MdiIcon :path="mdiMenu" v-else/>
        </b-nav-item>
      </b-navbar-nav>
    </b-navbar>
    <div id="dashboard-app">
      <SidebarComponent :collapsed="collapsed" :width="sidebarWidth" @toggle-collapse="onToggleCollapse" />

      <div id="content" :style="{ paddingLeft: sidebarWidth }" :class="{ 'collapsed': collapsed, 'onmobile': isOnMobile }" >
        <b-container fluid class="min-vh-100 position-relative">
          <StoryNavbar id="story-navbar" v-if="storeActiveStory" />

          <PageHeader />

          <router-view :key="`${$route.path}-${routeReloadCount}`" class="pb-3" />
        </b-container>

        <footer class="d-flex flex-wrap justify-content-between align-items-center py-3 border-top bg-dark">
          <div class="col-md-4 d-flex align-items-center justify-content-center justify-content-md-start">
            <span class="text-muted">&copy; {{ new Date().getFullYear() }} Germinate: The James Hutton Institute</span>
          </div>

          <div class="col-md-4 d-flex align-items-center justify-content-center">
            <a @click.prevent="showChangelog" href="#" class="text-muted">{{ $t('pageFooterVersion', { version: germinateVersion }) }}</a>
            <a class="text-muted ml-3" v-if="$te('pageFooterImprintURL') && $t('pageFooterImprintURL')" :href="$t('pageFooterImprintURL')" target="_blank" rel="noopener noreferrer">{{ $t('pageFooterImprint') }}</a>
            <a class="text-muted ml-3" v-if="$te('pageFooterDataProtectionURL') && $t('pageFooterDataProtectionURL')" :href="$t('pageFooterDataProtectionURL')" target="_blank" rel="noopener noreferrer">{{ $t('pageFooterDataProtection') }}</a>
          </div>

          <ul class="nav col-md-4 justify-content-center justify-content-md-end list-unstyled d-flex">
            <li class="ml-3"><a class="text-muted" href="https://ics.hutton.ac.uk/get-germinate"><MdiIcon :size="24" :path="mdiWeb" /></a></li>
            <li class="ml-3"><a class="text-muted" href="https://bsky.app/profile/germinate.hutton.ac.uk"><MdiIcon :size="24" :path="bskyIcon" /></a></li>
            <li class="ml-3"><a class="text-muted" href="https://twitter.com/GerminateHub"><MdiIcon :size="24" :path="mdiTwitter" /></a></li>
            <li class="ml-3"><a class="text-muted" href="https://github.com/germinateplatform"><MdiIcon :size="24" :path="mdiGithub" /></a></li>
          </ul>
        </footer>
      </div>
    </div>

    <!-- GDPR notification: a card at the bottom right, until the cookies are allowed or declined -->
    <GdprConsent v-if="storeServerSettings && storeServerSettings.showGdprNotification === true && storeCookiesAccepted === null" @decide="acceptCookies" />

    <!-- Help modal -->
    <b-modal :title="$t('widgetHelpTitle')" v-if="storeHelpKey" ref="helpModal" ok-only size="lg">
      <p v-html="$t(this.storeHelpKey)" />
    </b-modal>

    <div
      v-if="isOnMobile && !collapsed"
      class="v-sidebar-backdrop b-sidebar-backdrop bg-dark"
      @click="collapsed = true" />
    <b-sidebar id="asyncbar" shadow right backdrop lazy backdrop-variant="dark" sidebar-class="border-left border-primary" :title="$t('widgetAsyncJobTitle')" v-model="asyncSidebarOpen">
      <SidebarAsyncJobs />
    </b-sidebar>

    <!-- Introduction tour -->
    <Tour :steps="popoverContent" ref="introductionTour" />

    <FeedbackButton v-if="storeServerSettings.supportsFeedback" />

    <ChangelogModal :prevVersion="changelogVersionNumber" ref="changelogModal" />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

import ChangelogModal from '@/components/modals/ChangelogModal'
import GdprConsent from '@/components/util/GdprConsent'
import PageHeader from '@/components/structure/PageHeader'
import SidebarComponent from '@/components/structure/SidebarComponent'
import StoryNavbar from '@/components/structure/StoryNavbar'
import MdiIcon from '@/components/icons/MdiIcon'
import LocaleDropdown from '@/components/dropdowns/LocaleDropdown'
import MarkedItemsDropdown from '@/components/dropdowns/MarkedItemsDropdown'
import UserSettingsDropdown from '@/components/dropdowns/UserSettingsDropdown'
import SidebarAsyncJobs from '@/components/structure/SidebarAsyncJobs'
import FeedbackButton from '@/components/util/FeedbackButton'
import Tour from '@/components/util/Tour'
import { bskyIcon, germinateVersion } from '@/mixins/util'

import { mdiMagnify, mdiHelpCircleOutline, mdiMenu, mdiWeatherNight, mdiWeatherSunny, mdiTwitter, mdiGithub, mdiWeb } from '@mdi/js'
import { Pages } from '@/mixins/pages'

const emitter = require('tiny-emitter/instance')

export default {
  components: {
    ChangelogModal,
    GdprConsent,
    LocaleDropdown,
    MarkedItemsDropdown,
    MdiIcon,
    PageHeader,
    SidebarAsyncJobs,
    StoryNavbar,
    SidebarComponent,
    UserSettingsDropdown,
    FeedbackButton,
    Tour
  },
  computed: {
    // Tooltip of the theme button: the theme it switches to
    themeToggleText: function () {
      return this.storeDarkMode ? this.$t('menuTopLightModeToggle') : this.$t('menuTopDarkModeToggle')
    },
    ...mapGetters([
      'storeAsyncJobCount',
      'storeCookiesAccepted',
      'storeDarkMode',
      'storeHelpKey',
      'storeLocale',
      'storeServerSettings',
      'storeChangelogVersionNumber',
      'storeActiveStory'
    ]),
    helpDisabled: function () {
      return this.storeHelpKey === undefined || this.storeHelpKey === null
    }
  },
  data: function () {
    return {
      Pages,
      bskyIcon,
      mdiHelpCircleOutline,
      mdiMagnify,
      mdiMenu,
      mdiTwitter,
      mdiWeb,
      mdiGithub,
      mdiWeatherNight,
      mdiWeatherSunny,
      germinateVersion,
      changelogVersionNumber: null,
      collapsed: false,
      isOnMobile: false,
      sidebarWidth: '300px',
      searchTerm: null,
      asyncSidebarOpen: false,
      // Bumped to rebuild the current page when the menu navigates to it again with a different query
      routeReloadCount: 0,
      pendingReloadPath: null,
      popoverContent: [{
        title: () => this.$t('widgetIntroTourStepTitleWelcome'),
        text: () => this.$t('widgetIntroTourStepTextWelcome'),
        target: () => '#app-header',
        position: 'bottom'
      }, {
        title: () => this.$t('widgetIntroTourStepTitleMenu'),
        text: () => this.$t('widgetIntroTourStepTextMenu'),
        target: () => '.v-sidebar-menu',
        position: 'right'
      }, {
        title: () => this.$t('widgetIntroTourTitleHelp'),
        text: () => this.$t('widgetIntroTourTextHelp'),
        target: () => '#top-nav-help',
        position: 'bottom'
      }, {
        title: () => this.$t('widgetIntroTourTitleDarkMode'),
        text: () => this.$t('widgetIntroTourTextDarkMode'),
        target: () => '#top-nav-darkmode',
        position: 'bottom'
      }, {
        title: () => this.$t('widgetIntroTourTitleLanguage'),
        text: () => this.$t('widgetIntroTourTextLanguage'),
        target: () => '.top-nav-locale',
        position: 'bottom'
      }, {
        title: () => this.$t('widgetIntroTourTitleAsync'),
        text: () => this.$t('widgetIntroTourTextAsync'),
        target: () => '#aside-toggler',
        position: 'bottom'
      }]
    }
  },
  watch: {
    storeDarkMode: function () {
      this.loadAndSetDarkMode()
    },
    $route: function (to) {
      if (this.pendingReloadPath && to.fullPath === this.pendingReloadPath) {
        this.routeReloadCount++
      }
      this.pendingReloadPath = null
    }
  },
  methods: {
    onReloadRoute: function (fullPath) {
      if (this.$route.fullPath === fullPath) {
        // The navigation already happened (or the same page was clicked again)
        this.routeReloadCount++
      } else {
        this.pendingReloadPath = fullPath
      }
    },
    showChangelog: function () {
      this.changelogVersionNumber = null

      this.$nextTick(() => this.$refs.changelogModal.show())
    },
    showHelp: function () {
      this.$refs.helpModal.show()
    },
    acceptCookies: function (decision) {
      this.$store.dispatch('setCookiesAccepted', decision)
    },
    loadAndSetDarkMode: function () {
      document.body.classList.toggle('dark-mode')
    },
    /**
     * Toggles the dark mode on or off
     */
    toggleDarkMode: function () {
      if (this.storeDarkMode === true) {
        this.$store.dispatch('setDarkMode', false)
      } else {
        this.$store.dispatch('setDarkMode', true)
      }
    },
    onToggleCollapse (collapsed) {
      this.collapsed = collapsed
    },
    onResize () {
      if (window.innerWidth < 992) {
        this.sidebarWidth = '200px'
      } else {
        this.sidebarWidth = '300px'
      }

      if (window.innerWidth <= 767) {
        this.isOnMobile = true
        this.collapsed = true
      } else {
        this.isOnMobile = false
        this.collapsed = false
      }
    },
    search: function () {
      if (this.searchTerm === '💩') {
        // TODO: Easteregg goes here...
      } else if (this.searchTerm && this.searchTerm.length > 0) {
        this.$router.push({ name: Pages.searchQuery, params: { searchTerm: this.searchTerm } })
      } else {
        this.$router.push({ name: Pages.search })
      }
      this.searchTerm = null
    },
    startIntroduction: function () {
      this.$refs.introductionTour.start()
    },
    toggleAsyncSidebar: function (upOrDown) {
      this.$store.dispatch('setAsyncSidebarTabIndex', upOrDown === 'download' ? 0 : 1)
      this.asyncSidebarOpen = true
    }
  },
  beforeDestroy: function () {
    window.removeEventListener('resize', this.onResize)
    emitter.off('show-introduction', this.startIntroduction)
    emitter.off('toggle-aside', this.toggleAsyncSidebar)
    emitter.off('reload-route', this.onReloadRoute)
  },
  mounted: function () {
    this.onResize()
    window.addEventListener('resize', this.onResize)
    emitter.on('show-introduction', this.startIntroduction)
    emitter.on('toggle-aside', this.toggleAsyncSidebar)
    emitter.on('reload-route', this.onReloadRoute)

    if (this.storeDarkMode) {
      this.loadAndSetDarkMode()
    }

    this.changelogVersionNumber = this.storeChangelogVersionNumber
    if (this.storeChangelogVersionNumber !== null && this.storeChangelogVersionNumber !== germinateVersion) {
      this.$refs.changelogModal.show()
      this.$store.dispatch('setChangelogVersionNumber', germinateVersion)
    }
  }
}
</script>

<style lang="scss">
$navbar-height: 72px;

#dashboard-app {
  margin-top: $navbar-height;
  height: calc(100vh - $navbar-height);
}

#story-navbar.navbar {
  top: $navbar-height;
}

#content {
  transition: 0.3s ease;
}
#content.collapsed,
#content.onmobile {
  padding-left: 65px !important;
}

.v-sidebar-menu {
  position: fixed;
  top: $navbar-height;
  left: 0;
  bottom: 0;
}

.v-sidebar-backdrop {
  z-index: 900;
}

.form-inline .form-control.search-input {
  height: auto;
}

/* Top navigation: the search rounded with a green button, the icons a little bigger */
#app-header .top-nav-search .search-input {
  min-width: 14rem;
  padding: 0.45rem 0.9rem;
  border-radius: 10px 0 0 10px;
  font-size: 0.95rem;
  /* The font of the new pages (loaded with the dropdowns of the top navigation) */
  font-family: 'DM Sans', -apple-system, 'Segoe UI', Roboto, sans-serif;
}
#app-header .top-nav-search .search-input::placeholder {
  font-family: inherit;
}
#app-header .top-nav-search .top-nav-search-button {
  display: inline-flex;
  align-items: center;
  padding: 0 0.9rem;
  border: none;
  border-radius: 0 10px 10px 0;
  background: #3b6b35;
  color: #ffffff;
}
#app-header .top-nav-search .top-nav-search-button:hover,
#app-header .top-nav-search .top-nav-search-button:focus {
  background: #2f5a2a;
}
#app-header .top-nav > .nav-item > .nav-link svg.mdi-icon,
#app-header .top-nav > .dropdown > .nav-link svg.mdi-icon {
  width: 1.4rem;
  height: 1.4rem;
}

.mdi-heading {
  display: flex;
  align-items: center;
  gap: 10px;
}

.b-sidebar > .b-sidebar-header {
  flex-direction: row-reverse;
}

.b-sidebar.b-sidebar-right > .b-sidebar-header .close {
  margin-left: auto;
  margin-right: 0;
}

@media (min-width: 768px) {
  #content {
    margin-left: 0;
  }
}
</style>
