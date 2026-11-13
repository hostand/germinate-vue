<template>
  <div v-if="popoverShow">
    <!-- The backdrop prevents input on the background -->
    <div class="backdrop" />
    <!-- The popover appears next to the element -->
    <!-- New look (tables): a rounded card in Inter, the step count, the buttons below (table-modern.css) -->
    <b-popover :target="popoverTarget" :placement="steps[currentIndex].position" ref="popover" :show="popoverShow" custom-class="bt-tour" v-if="modernLook">
      <template v-slot:title>
        <span class="bt-tour-title">{{ steps[currentIndex].title() }}</span>
        <button type="button" class="bt-tour-close" @click="resetPopover" :aria-label="$t('buttonClose')"><i class="fa-solid fa-xmark" aria-hidden="true" /></button>
      </template>
      <p class="bt-tour-text" v-html="steps[currentIndex].text()" />
      <div class="bt-tour-footer">
        <span class="bt-tour-step" v-if="steps.length > 1">{{ currentIndex + 1 }} / {{ steps.length }}</span>
        <div class="bt-tour-buttons">
          <button type="button" class="bt-tour-button" @click="currentIndex = currentIndex - 1" :disabled="currentIndex < 1" v-if="steps.length > 1">
            <i class="fa-solid fa-chevron-left" aria-hidden="true" /> {{ $t('buttonBack') }}
          </button>
          <button type="button" class="bt-tour-button is-primary" @click="currentIndex = currentIndex + 1" v-if="currentIndex < steps.length - 1">
            {{ $t('buttonNext') }} <i class="fa-solid fa-chevron-right" aria-hidden="true" />
          </button>
          <button type="button" class="bt-tour-button is-primary" @click="resetPopover" v-else>
            {{ $t('buttonClose') }} <i class="fa-solid fa-check" aria-hidden="true" />
          </button>
        </div>
      </div>
    </b-popover>
    <b-popover :target="popoverTarget" :placement="steps[currentIndex].position" ref="popover" :show="popoverShow" variant="secondary" v-else>
      <template v-slot:title>
        <b-button @click="popoverShow = false" size="sm" class="ml-1 close" aria-label="Close">
          ×
        </b-button>
        <span>{{ steps[currentIndex].title() }}</span>
      </template>
      <div>
        <!-- Step content text -->
        <p v-html="steps[currentIndex].text()" />

        <!-- Buttons -->
        <b-button-group class="d-flex">
          <!-- Back button -->
          <b-button variant="secondary" @click="currentIndex = currentIndex - 1" :disabled="currentIndex < 1" v-if="steps.length > 1">
            <MdiIcon :path="mdiChevronLeft" /> {{ $t('buttonBack') }}</b-button>
          <!-- Next button -->
          <b-button variant="success" @click="currentIndex = currentIndex + 1" v-if="currentIndex < steps.length - 1">{{ $t('buttonNext') }} <MdiIcon :path="mdiChevronRight" /></b-button>
          <!-- Finish button -->
          <b-button variant="success" @click="resetPopover" v-else>{{ $t('buttonClose') }} <MdiIcon :path="mdiCheck" /></b-button>
        </b-button-group>
      </div>
    </b-popover>
  </div>
</template>

<script>
import MdiIcon from '@/components/icons/MdiIcon'

import { mdiChevronLeft, mdiChevronRight, mdiCheck } from '@mdi/js'

export default {
  components: {
    MdiIcon
  },
  props: {
    // The new look of the tables
    modernLook: {
      type: Boolean,
      default: false
    },
    steps: {
      type: Array,
      default: () => []
    }
  },
  data: function () {
    return {
      mdiChevronLeft,
      mdiChevronRight,
      mdiCheck,
      currentIndex: 0,
      popoverShow: false,
      popoverTarget: null
    }
  },
  watch: {
    currentIndex: function () {
      if (this.popoverShow) {
        this.updatePopover()
      } else {
        this.resetPopover()
      }
    },
    $route: function () {
      // Hide on page navigation
      this.resetPopover()
      document.body.classList.remove('overflow-hidden')
    },
    popoverShow: function (newValue) {
      if (newValue) {
        document.body.classList.add('overflow-hidden')
        document.addEventListener('keyup', this.handleKeys)
      } else {
        document.body.classList.remove('overflow-hidden')
        document.removeEventListener('keyup', this.handleKeys)
      }
    }
  },
  methods: {
    updatePopover: function () {
      this.popoverShow = false
      this.$nextTick(() => {
        if (this.currentIndex < this.steps.length) {
          this.popoverTarget = document.querySelector(this.steps[this.currentIndex].target())

          if (this.popoverTarget) {
            this.popoverShow = true

            const rect = this.popoverTarget.getBoundingClientRect()
            const absoluteElementTop = rect.top + window.pageYOffset
            const middle = absoluteElementTop - (window.innerHeight / 2)
            window.scrollTo({
              left: 0,
              top: middle,
              behavior: 'smooth'
            })
          } else {
            this.popoverShow = true
            this.currentIndex++
          }
        } else {
          this.popoverShow = false
        }
      })
    },
    resetPopover: function () {
      this.currentIndex = 0
      this.popoverTarget = null
      this.popoverShow = false
    },
    start: function () {
      this.resetPopover()
      this.updatePopover()
    },
    handleKeys: function (e) {
      if (this.popoverShow) {
        if (e.keyCode === 39) {
          // Right
          if (this.currentIndex < this.steps.length - 1) {
            this.currentIndex++
          }
        } else if (e.keyCode === 37) {
          // Left
          if (this.currentIndex > 0) {
            this.currentIndex--
          }
        } else if (e.keyCode === 27) {
          // Escape
          this.resetPopover()
        }
      }
    }
  }
}
</script>

<style scoped>
.backdrop {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1059;
}
</style>
