<template>
  <!-- Cookies, in the look of the custom pages: what is stored (a block with an icon per item), that nobody is tracked,
       the third-party cookies (Google Analytics, when used) and the choice of the user (when the GDPR notice is on) -->
  <div class="custom-page cookies-page">
    <header class="cp-page-header">
      <h1 class="cp-page-title">{{ $t('pageCookiesTitle') }}</h1>
      <div class="cp-page-lead-row">
        <p class="cp-page-lead">{{ $t('pageCookiesTextGerminate') }}</p>
      </div>
    </header>

    <!-- What is stored -->
    <section class="ck-section">
      <h2 class="ck-section-title"><i class="fa-solid fa-cookie-bite" aria-hidden="true" /> {{ $t('pageCookiesTitleGerminate') }}</h2>
      <div class="ck-grid">
        <article class="ck-item" v-for="item in items" :key="item.key">
          <span class="ck-item-icon" aria-hidden="true"><i :class="['fa-solid', item.icon]" /></span>
          <div>
            <h3 class="ck-item-title">{{ $t(`pageCookiesDescriptionTitle${item.key}`) }}</h3>
            <p class="ck-item-text">{{ $t(`pageCookiesDescriptionData${item.key}`) }}</p>
          </div>
        </article>
      </div>
    </section>

    <!-- Nobody is tracked -->
    <section class="ck-callout">
      <span class="ck-item-icon is-large" aria-hidden="true"><i class="fa-solid fa-user-shield" /></span>
      <p class="ck-callout-text">{{ $t('pageCookiesTextExplanationGerminate') }}</p>
    </section>

    <!-- Third-party cookies: only with Google Analytics -->
    <section class="ck-section" v-if="storeServerSettings && storeServerSettings.googleAnalyticsKey">
      <h2 class="ck-section-title"><i class="fa-solid fa-chart-simple" aria-hidden="true" /> {{ $t('pageCookiesTitleThirdParty') }}</h2>
      <article class="ck-item">
        <span class="ck-item-icon" aria-hidden="true"><i class="fa-brands fa-google" /></span>
        <div>
          <h3 class="ck-item-title">Google Analytics</h3>
          <p class="ck-item-text">{{ $t('pageCookiesTextThirdParty') }}</p>
        </div>
      </article>
    </section>

    <!-- The choice of the user, which can be changed here (same as the GDPR notice) -->
    <section class="ck-section" v-if="storeServerSettings && storeServerSettings.showGdprNotification === true">
      <h2 class="ck-section-title"><i class="fa-solid fa-sliders" aria-hidden="true" /> {{ $t('widgetGdprNotificationTitle') }}</h2>
      <div class="ck-choice">
        <div class="ck-choice-status">
          <span :class="['ck-status-dot', statusClass]" aria-hidden="true" />
          <div>
            <div class="ck-choice-title">{{ statusText }}</div>
            <div class="ck-choice-hint">{{ $t('pageCookiesChoiceHint') }}</div>
          </div>
        </div>
        <div class="ck-choice-actions">
          <button type="button" :class="['ck-button', { active: storeCookiesAccepted === false }]" :aria-pressed="storeCookiesAccepted === false ? 'true' : 'false'" :title="$t('tooltipGdprNotificationButtonReject')" @click="decide(false)">
            <i class="fa-solid fa-xmark" aria-hidden="true" /> {{ $t('widgetGdprNotificationButtonDecline') }}
          </button>
          <button type="button" :class="['ck-button is-primary', { active: storeCookiesAccepted === true }]" :aria-pressed="storeCookiesAccepted === true ? 'true' : 'false'" @click="decide(true)">
            <i class="fa-solid fa-check" aria-hidden="true" /> {{ $t('widgetGdprNotificationButtonAccept') }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

// The items stored by Germinate: the end of their keys (pageCookiesDescriptionTitle..., pageCookiesDescriptionData...)
// and their icon
const ITEMS = [
  { key: 'Session', icon: 'fa-user-lock' },
  { key: 'MarkedItems', icon: 'fa-bookmark' },
  { key: 'Locale', icon: 'fa-language' },
  { key: 'TableColumns', icon: 'fa-table-columns' },
  { key: 'Async', icon: 'fa-arrows-rotate' },
  { key: 'Other', icon: 'fa-gear' }
]

export default {
  data: function () {
    return {
      items: ITEMS
    }
  },
  computed: {
    ...mapGetters([
      'storeCookiesAccepted',
      'storeServerSettings'
    ]),
    statusClass: function () {
      if (this.storeCookiesAccepted === true) {
        return 'is-allowed'
      } else if (this.storeCookiesAccepted === false) {
        return 'is-declined'
      } else {
        return 'is-open'
      }
    },
    statusText: function () {
      if (this.storeCookiesAccepted === true) {
        return this.$t('pageCookiesChoiceAllowed')
      } else if (this.storeCookiesAccepted === false) {
        return this.$t('pageCookiesChoiceDeclined')
      } else {
        return this.$t('pageCookiesChoiceOpen')
      }
    }
  },
  methods: {
    // As the GDPR notice
    decide: function (decision) {
      this.$store.dispatch('setCookiesAccepted', decision)
    }
  }
}
</script>

<style src="@/assets/custom-page.css"></style>
<style scoped>
.cookies-page {
  padding: 0.5rem 0 3rem;
}
.cookies-page .cp-page-lead {
  margin: 0;
}
.ck-section {
  margin-top: 2.25rem;
  padding: 0 0.75rem;
}
.ck-section-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0 0 1rem;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--cp-text);
}
.ck-section-title > i {
  color: var(--cp-green);
  font-size: 1.1rem;
}
/* The items: blocks with an icon, three per row (two, then one on smaller screens) */
.ck-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}
@media (max-width: 1199px) {
  .ck-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 767px) {
  .ck-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
.ck-item {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  padding: 1.25rem;
  border: 1px solid var(--cp-border);
  border-radius: 16px;
  background: var(--cp-surface);
  box-shadow: 0 1px 2px var(--cp-shadow);
}
.ck-item-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--cp-green-soft);
  color: var(--cp-green);
  font-size: 1.15rem;
}
.ck-item-icon.is-large {
  width: 52px;
  height: 52px;
  font-size: 1.4rem;
}
.ck-item-title {
  margin: 0.15rem 0 0.35rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--cp-text);
}
.ck-item-text {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--cp-text-subtle);
}
/* Nobody is tracked: a soft green band */
.ck-callout {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 2.25rem 0.75rem 0;
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--cp-border);
  border-left: 4px solid var(--cp-green);
  border-radius: 16px;
  background: var(--cp-surface);
}
.ck-callout-text {
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--cp-text);
}
/* The choice: its state on the left, the buttons on the right */
.ck-choice {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--cp-border);
  border-radius: 16px;
  background: var(--cp-surface);
  box-shadow: 0 1px 2px var(--cp-shadow);
}
.ck-choice-status {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}
.ck-status-dot {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.ck-status-dot.is-allowed {
  background: #2e8b46;
  box-shadow: 0 0 0 4px rgba(46, 139, 70, 0.18);
}
.ck-status-dot.is-declined {
  background: #c8323f;
  box-shadow: 0 0 0 4px rgba(200, 50, 63, 0.18);
}
.ck-status-dot.is-open {
  background: #c9a227;
  box-shadow: 0 0 0 4px rgba(201, 162, 39, 0.2);
}
.ck-choice-title {
  font-weight: 600;
  color: var(--cp-text);
}
.ck-choice-hint {
  font-size: 0.88rem;
  color: var(--cp-muted);
}
.ck-choice-actions {
  display: flex;
  gap: 0.6rem;
}
.ck-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  height: 42px;
  padding: 0 1.15rem;
  border: 1px solid var(--cp-border);
  border-radius: 10px;
  background: var(--cp-surface);
  color: var(--cp-text);
  font: inherit;
  font-size: 0.92rem;
  font-weight: 500;
  cursor: pointer;
}
.ck-button:hover,
.ck-button:focus {
  border-color: var(--cp-muted);
  background: var(--cp-surface-hover);
}
/* The current choice: outlined in its colour */
.ck-button.active {
  border-color: var(--cp-text-subtle);
  box-shadow: inset 0 0 0 1px var(--cp-text-subtle);
}
.ck-button.is-primary {
  border-color: var(--cp-button);
  background: var(--cp-button);
  color: var(--cp-on-button);
}
.ck-button.is-primary:hover,
.ck-button.is-primary:focus {
  border-color: var(--cp-button-hover);
  background: var(--cp-button-hover);
}
.ck-button.is-primary.active {
  box-shadow: 0 0 0 3px var(--cp-green-soft);
}
</style>
