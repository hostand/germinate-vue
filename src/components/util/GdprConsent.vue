<template>
  <!-- GDPR cookie consent: a card at the bottom right of the window (in the look of the custom pages), until the cookies
       are allowed or declined -->
  <div class="custom-page gdpr-consent" role="dialog" aria-live="polite" aria-labelledby="gdpr-consent-title" aria-describedby="gdpr-consent-text">
    <div class="gdpr-consent-head">
      <span class="gdpr-consent-icon" aria-hidden="true"><MdiIcon :path="icons.cookie" :size="26" /></span>
      <h2 class="gdpr-consent-title" id="gdpr-consent-title">{{ $t('widgetGdprNotificationTitle') }}</h2>
    </div>
    <p class="gdpr-consent-text" id="gdpr-consent-text">
      {{ $t('widgetGdprNotificationText') }}
      <router-link :to="{ name: Pages.cookies }" class="gdpr-consent-more">{{ $t('widgetGdprNotificationReadMore') }}</router-link>
    </p>
    <div class="gdpr-consent-actions">
      <button type="button" class="gdpr-consent-button gdpr-consent-decline" :title="$t('tooltipGdprNotificationButtonReject')" @click="$emit('decide', false)">{{ $t('widgetGdprNotificationButtonDecline') }}</button>
      <button type="button" class="gdpr-consent-button gdpr-consent-accept" @click="$emit('decide', true)">{{ $t('widgetGdprNotificationButtonAccept') }}</button>
    </div>
  </div>
</template>

<script>
import MdiIcon from '@/components/icons/MdiIcon'
import { Pages } from '@/mixins/pages'
import { mdiCookie } from '@mdi/js'

/**
 * The GDPR cookie consent. Emits "decide" with true (cookies allowed) or false (declined).
 */
export default {
  components: {
    MdiIcon
  },
  data: function () {
    return {
      Pages,
      icons: {
        cookie: mdiCookie
      }
    }
  }
}
</script>

<style src="@/assets/custom-page.css"></style>
<style scoped>
.gdpr-consent {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  z-index: 1060;
  width: 400px;
  max-width: calc(100vw - 2rem);
  padding: 1.25rem 1.25rem 1.1rem;
  border: 1px solid var(--cp-border);
  border-radius: 16px;
  background: var(--cp-surface);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16);
  animation: gdpr-consent-in 0.3s ease-out;
}
@keyframes gdpr-consent-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .gdpr-consent {
    animation: none;
  }
}
.gdpr-consent-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
/* The cookie in a soft circle, in the brown of a biscuit */
.gdpr-consent-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--cp-crop-barley-bg);
  border: 1px solid var(--cp-crop-barley-border);
  color: var(--cp-crop-barley-fg);
}
.gdpr-consent-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--cp-text);
}
.gdpr-consent-text {
  margin: 0.85rem 0 1.1rem;
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--cp-text-subtle);
}
.gdpr-consent-more {
  color: var(--cp-green);
  font-weight: 500;
  white-space: nowrap;
}
.gdpr-consent-more:hover {
  color: var(--cp-green-hover);
}
.gdpr-consent-actions {
  display: flex;
  gap: 0.6rem;
}
.gdpr-consent-button {
  flex: 1 1 0;
  height: 40px;
  border-radius: 10px;
  font: inherit;
  font-size: 0.92rem;
  font-weight: 500;
  cursor: pointer;
}
.gdpr-consent-decline {
  border: 1px solid var(--cp-border);
  background: var(--cp-surface);
  color: var(--cp-text);
}
.gdpr-consent-decline:hover {
  background: var(--cp-surface-hover);
  border-color: var(--cp-muted);
}
.gdpr-consent-accept {
  border: 1px solid var(--cp-button);
  background: var(--cp-button);
  color: var(--cp-on-button);
}
.gdpr-consent-accept:hover {
  background: var(--cp-button-hover);
  border-color: var(--cp-button-hover);
}
/* Small screens: across the bottom of the window */
@media (max-width: 575px) {
  .gdpr-consent {
    right: 1rem;
    bottom: 1rem;
    left: 1rem;
    width: auto;
    max-width: none;
  }
}
</style>
