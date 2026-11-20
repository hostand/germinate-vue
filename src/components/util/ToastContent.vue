<template>
  <!-- The content of every toast (see src/plugins/toasts.js): in the look of the cookie consent card, an icon in a
       soft circle in the colour of the type, the title, the message (cut to 3 lines, "Read more" opens it), the close
       button and, when it closes by itself, a line at the bottom showing the time left -->
  <div class="ct-content" role="status">
    <span class="ct-icon" aria-hidden="true"><i :class="['fa-solid', icon]" /></span>
    <div class="ct-body">
      <p class="ct-title" v-if="title">{{ title }}</p>
      <p :class="['ct-text', { clamped: !expanded }]" ref="text" v-if="isText">{{ message }}</p>
      <div class="ct-text" v-else><component :is="messageComponent" /></div>
      <button type="button" class="ct-more" @click="expanded = !expanded" v-if="isCut || expanded">{{ expanded ? t('buttonReadLess') : t('buttonReadMore') }}</button>
    </div>
    <button type="button" class="ct-close" :aria-label="t('buttonClose')" :title="t('buttonClose')" @click="close"><i class="fa-solid fa-xmark" aria-hidden="true" /></button>
    <div class="ct-progress" v-if="delay"><span :style="{ animationDuration: `${delay}ms` }" /></div>
  </div>
</template>

<script>
import { i18n } from '@/plugins/i18n.js'

// The icon of each type of toast
const ICONS = {
  success: 'fa-check',
  danger: 'fa-xmark',
  warning: 'fa-exclamation',
  info: 'fa-info'
}

export default {
  props: {
    title: {
      type: String,
      default: null
    },
    // A text, or VNodes (shown as they are, not cut)
    message: {
      type: [String, Object, Array],
      default: null
    },
    variant: {
      type: String,
      default: 'info'
    },
    // Time before it closes by itself (ms), null when it stays until closed
    delay: {
      type: Number,
      default: null
    },
    onClose: {
      type: Function,
      default: () => {}
    }
  },
  data: function () {
    return {
      expanded: false,
      // The message is longer than the 3 lines shown
      isCut: false
    }
  },
  computed: {
    icon: function () {
      return ICONS[this.variant] || ICONS.info
    },
    isText: function () {
      return typeof this.message === 'string' || this.message === null
    },
    // VNodes given as the message, rendered in place
    messageComponent: function () {
      const message = this.message
      return { render: () => Array.isArray(message) ? message[0] : message }
    }
  },
  methods: {
    t: function (key) {
      return i18n.t(key)
    },
    close: function () {
      this.onClose()
    },
    measure: function () {
      const text = this.$refs.text
      this.isCut = !!text && text.scrollHeight > text.clientHeight + 1
    }
  },
  mounted: function () {
    // Measured once shown (the toast is laid out after its transition starts)
    this.$nextTick(() => setTimeout(this.measure, 50))
  }
}
</script>
