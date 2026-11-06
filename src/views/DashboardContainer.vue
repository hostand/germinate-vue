<template>
  <div>
    <b-navbar :type="storeDarkMode ? 'dark' : 'light'" :variant="storeDarkMode ? 'dark' : 'light'" id="app-header" fixed="top">
      <b-navbar-brand :to="{ name: Pages.home }">
        <!-- The project logo (as in the sidebar): the file of the template folder, served by the API -->
        <img class="navbar-brand-logo" :src="storeBaseUrl + 'image/src-svg/logo.svg'" height="45" alt="Project logo" />
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
          <!-- The bars, and over their top left corner how many jobs are running (as the total of the marked items) -->
          <span class="async-jobs-icon">
            <i class="fa-solid fa-bars top-nav-fa-icon" aria-hidden="true" />
            <span class="async-jobs-count" v-if="storeAsyncJobCount !== null && storeAsyncJobCount > 0">{{ storeAsyncJobCount }}</span>
          </span>
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

        <!-- Footer: a green wave (SVG) over the page, then the links, the text of the fork, the version and the icons -->
        <footer class="site-footer">
          <svg class="site-footer-wave" viewBox="0 0 1440 130" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path d="M0,12 C110,9 200,0 290,1 C430,3 560,34 700,64 C840,94 1000,108 1180,114 C1300,118 1380,121 1440,122 L1440,131 L0,131 Z" />
          </svg>
          <div class="site-footer-body">
            <nav class="site-footer-links">
              <a v-if="$te('pageFooterImprintURL') && $t('pageFooterImprintURL')" :href="$t('pageFooterImprintURL')" target="_blank" rel="noopener noreferrer">{{ $t('pageFooterImprint') }}</a>
              <a v-if="$te('pageFooterDataProtectionURL') && $t('pageFooterDataProtectionURL')" :href="$t('pageFooterDataProtectionURL')" target="_blank" rel="noopener noreferrer">{{ $t('pageFooterDataProtection') }}</a>
              <router-link :to="{ name: Pages.cookies }">{{ $t('pageCookiesTitle') }}</router-link>
            </nav>
            <div class="site-footer-row">
              <!-- "A fork of ©Germinate - ...": the © raised, "Germinate" links to its page (in a new tab) -->
              <i18n path="pageFooterForkText" tag="span" class="site-footer-fork">
                <template #germinate><sup class="site-footer-copy">&copy;</sup><a href="https://ics.hutton.ac.uk/get-germinate" target="_blank" rel="noopener noreferrer">Germinate</a></template>
              </i18n>
              <!-- Back to the top of the page, above the version -->
              <div class="site-footer-center">
                <button type="button" class="site-footer-top" @click="scrollToTop" :title="$t('buttonBackToTop')" :aria-label="$t('buttonBackToTop')"><i class="fa-solid fa-chevron-up" aria-hidden="true" /></button>
                <a @click.prevent="showChangelog" href="#" class="site-footer-version">{{ $t('pageFooterVersion', { version: germinateVersion }) }}</a>
              </div>
              <ul class="site-footer-social">
                <li><a class="is-website" href="https://cousinproject.eu/" target="_blank" rel="noopener noreferrer" aria-label="COUSIN project" title="COUSIN project"><i class="fa-solid fa-globe" aria-hidden="true"></i></a></li>
                <li><a class="is-youtube" href="https://www.youtube.com/channel/UCuCrjRR1FKdmjeWQ6QfNraQ" target="_blank" rel="noopener noreferrer" aria-label="YouTube" title="YouTube"><i class="fa-brands fa-youtube" aria-hidden="true"></i></a></li>
                <li><a class="is-bluesky" href="https://bsky.app/profile/cousinproject.bsky.social" target="_blank" rel="noopener noreferrer" aria-label="Bluesky" title="Bluesky"><i class="fa-brands fa-bluesky" aria-hidden="true"></i></a></li>
                <li><a class="is-linkedin" href="https://www.linkedin.com/in/cousin-project-67676a2b2/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn"><i class="fa-brands fa-linkedin" aria-hidden="true"></i></a></li>
                <li><a class="is-facebook" href="https://www.facebook.com/CousinProject/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" title="Facebook"><i class="fa-brands fa-facebook" aria-hidden="true"></i></a></li>
                <li><a class="is-x" href="https://x.com/COUSIN_project" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" title="X (Twitter)"><i class="fa-brands fa-x-twitter" aria-hidden="true"></i></a></li>
              </ul>
            </div>
          </div>
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
import { germinateVersion } from '@/mixins/util'

import { mdiMagnify, mdiHelpCircleOutline, mdiWeatherNight, mdiWeatherSunny } from '@mdi/js'
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
      'storeBaseUrl',
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
      mdiHelpCircleOutline,
      mdiMagnify,
      mdiWeatherNight,
      mdiWeatherSunny,
      germinateVersion,
      changelogVersionNumber: null,
      collapsed: false,
      isOnMobile: false,
      sidebarWidth: '330px',
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
    scrollToTop: function () {
      window.scrollTo({ top: 0, behavior: 'smooth' })
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
        this.sidebarWidth = '220px'
      } else {
        this.sidebarWidth = '330px'
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

/* Footer: light green (dark green in the dark theme), texts in the contrast of their background (WCAG AA) */
.site-footer {
  --site-footer-bg: #c5eebd;
  --site-footer-text: #1b2a1a;
  --site-footer-link: #24611d;
  --site-footer-link-hover: #17420f;
  --site-footer-icon: #4a564c;
  margin-top: 1rem;
  color: var(--site-footer-text);
  font-family: 'DM Sans', -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 1.05rem;
}
body.dark-mode .site-footer {
  --site-footer-bg: #1d3a20;
  --site-footer-text: #e6f1e4;
  --site-footer-link: #a8e3a0;
  --site-footer-link-hover: #d4f5cf;
  --site-footer-icon: #c3d1c5;
}
.site-footer-wave {
  display: block;
  width: 100%;
  height: 130px;
}
.site-footer-wave path {
  fill: var(--site-footer-bg);
}
.site-footer-body {
  margin-top: -1px;
  padding: 0 1.9rem 2.5rem;
  background: var(--site-footer-bg);
}
.site-footer-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1.1rem;
  margin-bottom: 0.9rem;
  padding-left: 0.2rem;
}
.site-footer-links a {
  color: var(--site-footer-link);
}
.site-footer-links a:hover,
.site-footer-links a:focus {
  color: var(--site-footer-link-hover);
}
.site-footer-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 1rem;
}
/* "Germinate": as the text, underlined on hover */
.site-footer-fork a {
  color: inherit;
  text-decoration: none;
}
.site-footer-fork a:hover,
.site-footer-fork a:focus {
  color: inherit;
  text-decoration: underline;
}
/* The chevron back to the top, above the version: out of the flow, so nothing else in the footer moves */
.site-footer-center {
  position: relative;
  display: flex;
  justify-content: center;
}
.site-footer-top {
  position: absolute;
  bottom: calc(100% + 0.2rem);
  left: 50%;
  margin-left: -1.125rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--site-footer-text);
  font-size: 1.1rem;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
}
.site-footer-top:hover,
.site-footer-top:focus {
  background: rgba(0, 0, 0, 0.07);
  transform: translateY(-2px);
  outline: none;
}
body.dark-mode .site-footer-top:hover,
body.dark-mode .site-footer-top:focus {
  background: rgba(255, 255, 255, 0.1);
}
.site-footer-version,
.site-footer-version:hover {
  color: var(--site-footer-text);
}
.site-footer-social {
  display: flex;
  justify-self: end;
  gap: 1.1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.site-footer-social a {
  display: inline-flex;
  color: var(--site-footer-icon);
  font-size: 1.35rem;
}
.site-footer-copy {
  margin-right: 0.05em;
}
/* On hover: not underlined, in the colour of the network (the website keeps its colour; the X in black, white in the
   dark theme; the blues of Bluesky, Facebook and LinkedIn lighter in the dark theme, all at least 3:1 on the green) */
.site-footer-social a:hover,
.site-footer-social a:focus {
  text-decoration: none;
}
.site-footer-social a.is-youtube:hover,
.site-footer-social a.is-youtube:focus {
  color: #ff0000;
}
.site-footer-social a.is-bluesky:hover,
.site-footer-social a.is-bluesky:focus {
  color: #0078e6;
}
.site-footer-social a.is-linkedin:hover,
.site-footer-social a.is-linkedin:focus {
  color: #0a66c2;
}
.site-footer-social a.is-facebook:hover,
.site-footer-social a.is-facebook:focus {
  color: #1877f2;
}
.site-footer-social a.is-x:hover,
.site-footer-social a.is-x:focus {
  color: #000000;
}
body.dark-mode .site-footer-social a.is-bluesky:hover,
body.dark-mode .site-footer-social a.is-bluesky:focus {
  color: #4da3ff;
}
body.dark-mode .site-footer-social a.is-linkedin:hover,
body.dark-mode .site-footer-social a.is-linkedin:focus {
  color: #5a9ce0;
}
body.dark-mode .site-footer-social a.is-facebook:hover,
body.dark-mode .site-footer-social a.is-facebook:focus {
  color: #5b9cf5;
}
body.dark-mode .site-footer-social a.is-x:hover,
body.dark-mode .site-footer-social a.is-x:focus {
  color: #ffffff;
}
/* Small screens: one below the other, centred */
@media (max-width: 767px) {
  .site-footer-links {
    justify-content: center;
    padding-left: 0;
  }
  .site-footer-row {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }
  .site-footer-social {
    justify-self: center;
  }
}

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
/* Top navigation: exactly as tall as the space above the sidebar (no gap between them), and a soft shadow instead of a
   line under it (deeper in the dark theme) */
#app-header {
  min-height: $navbar-height;
  border-bottom: none;
  box-shadow: 0 1px 2px rgba(31, 33, 32, 0.06), 0 6px 18px -6px rgba(31, 33, 32, 0.14);
}
body.dark-mode #app-header {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5), 0 8px 22px -6px rgba(0, 0, 0, 0.6);
}
#app-header .navbar-brand-logo {
  display: block;
  width: auto;
  height: 45px;
  max-width: 240px;
  object-fit: contain;
}
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
/* Font Awesome icons of the top navigation: as big as the others (1.4rem), centred in the same box */
#app-header .top-nav-fa-icon {
  display: inline-block;
  width: 1.4rem;
  font-size: 1.2rem;
  line-height: 1.4rem;
  text-align: center;
  vertical-align: middle;
}
/* Asynchronous jobs: the badge over the top left corner of the bars, as the total of the marked items
   (MarkedItemsDropdown); the box of the icon keeps its size, so the bar doesn't change */
#app-header .async-jobs-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.4rem;
  vertical-align: middle;
}
/* Placed against the drawing of the icon, as the total of the marked items is against the pin: the bars start 1/8 of
   the font size lower than the pin (64/512) and are wider (448 against 384 of 512), so the badge is 0.15rem lower and
   0.075rem more on the left than the one of the pin */
#app-header .async-jobs-count {
  position: absolute;
  top: -0.3rem;
  left: -0.675rem;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: #3b6b35;
  color: #ffffff;
  font-family: 'DM Sans', -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1.1rem;
  text-align: center;
  white-space: nowrap;
  pointer-events: none;
}
body.dark-mode #app-header .async-jobs-count {
  background: #4a7f42;
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
