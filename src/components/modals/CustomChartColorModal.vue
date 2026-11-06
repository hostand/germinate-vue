<template>
  <!-- Custom look: the modal in the look of the custom pages (rounded, its own buttons), see the styles below -->
  <b-modal ref="customChartColorModal"
           :title="$t('modalTitleChartColors')"
           :ok-title="$t('buttonUpdate')"
           :cancel-title="$t('buttonCancel')"
           :modal-class="customLook ? 'cp-modal' : null"
           :content-class="customLook ? 'custom-page' : null"
           :centered="customLook"
           @ok.prevent="onSubmit">
    <template #modal-footer="{ ok, cancel }" v-if="customLook">
      <button type="button" class="cp-modal-button" @click="cancel()">{{ $t('buttonCancel') }}</button>
      <button type="button" class="cp-modal-button is-primary" @click="ok()">{{ $t('buttonUpdate') }}</button>
    </template>
    <b-form @submit.prevent :class="{ 'cp-color-form': customLook }">
      <b-form-group :label="$t('formLabelChartColorsCurrent')" label-for="colors">
        <b-form-tags id="colors">
          <b-form-tag v-for="(color, index) in colors"
                      class="p-1 m-1"
                      :key="`custom-color-${color}-${index}`"
                      :style="{ backgroundColor: color, color: getHighContrastTextColor(color) }"
                      @remove="removeColor(index)">
            {{ color }}
          </b-form-tag>
        </b-form-tags>
      </b-form-group>
      <b-form-group :label="$t('formLabelChartColorsNew')" label-for="new-color" :invalid-feedback="message" :state="colorValid">
        <b-input-group>
          <template v-slot:append>
            <button type="button" class="cp-color-add" v-b-tooltip="$t('genericAdd')" @click="addColor" v-if="customLook" :aria-label="$t('genericAdd')"><i class="fa-solid fa-plus" aria-hidden="true" /></button>
            <b-button variant="info" v-b-tooltip="$t('genericAdd')" @click="addColor" v-else><MdiIcon :path="mdiPlusBox" /></b-button>
          </template>
          <b-form-input type="color" v-model="color" id="label-for" :state="colorValid" required />
        </b-input-group>
      </b-form-group>
      <button type="button" class="cp-modal-button" @click="resetColors" v-if="customLook"><i class="fa-solid fa-rotate-left" aria-hidden="true" /> {{ $t('buttonResetColorsToDefault') }}</button>
      <b-button @click="resetColors" v-else>{{ $t('buttonResetColorsToDefault') }}</b-button>
    </b-form>
  </b-modal>
</template>

<script>
import MdiIcon from '@/components/icons/MdiIcon'
import { mapGetters } from 'vuex'
import { getColors, getHighContrastTextColor } from '@/mixins/colors.js'

import { mdiPlusBox } from '@mdi/js'

export default {
  components: {
    MdiIcon
  },
  props: {
    // In the look of the custom pages
    customLook: {
      type: Boolean,
      default: false
    }
  },
  data: function () {
    return {
      mdiPlusBox,
      colors: [],
      color: '#00acef',
      message: null,
      colorValid: null
    }
  },
  computed: {
    ...mapGetters([
      'storeServerSettings'
    ])
  },
  methods: {
    getHighContrastTextColor,
    removeColor: function (index) {
      this.colors.splice(index, 1)
    },
    addColor: function () {
      if (this.colors.indexOf(this.color) === -1) {
        this.colors.push(this.color)
        this.message = null
        this.colorValid = null
      } else {
        this.colorValid = false
        this.message = 'Color already added'
      }
    },
    show: function () {
      this.color = (this.storeServerSettings && this.storeServerSettings.primaryColor) ? this.storeServerSettings.primaryColor : '#00acef'
      this.colors = getColors().slice()
      this.message = null

      this.$refs.customChartColorModal.show()
    },
    hide: function () {
      this.$refs.customChartColorModal.hide()
    },
    onSubmit: function () {
      if (this.colors && this.colors.length > 0) {
        this.$store.dispatch('setCustomChartColors', this.colors)
        this.$emit('colors-changed')
        this.$nextTick(() => this.hide())
      }
    },
    resetColors: function () {
      this.$store.dispatch('setCustomChartColors', null)
      this.$emit('colors-changed')
      this.hide()
    }
  }
}
</script>

<style src="@/assets/custom-page.css"></style>
<style src="@/assets/cp-modal.css"></style>
<style>
/* The colours: rounded field, pill-shaped tags */
.cp-color-form .b-form-tags {
  padding: 0.35rem;
  border: 1px solid var(--cp-border);
  border-radius: 12px;
  background: var(--cp-surface);
}
.cp-color-form .b-form-tag {
  border-radius: 999px;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 500;
}
.cp-color-form .input-group > .form-control {
  height: 40px;
  padding: 0.25rem;
  border: 1px solid var(--cp-border);
  border-radius: 10px 0 0 10px;
  background: var(--cp-surface);
}
.cp-color-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 40px;
  border: 1px solid var(--cp-button);
  border-radius: 0 10px 10px 0;
  background: var(--cp-button);
  color: var(--cp-on-button);
  cursor: pointer;
}
.cp-color-add:hover,
.cp-color-add:focus {
  border-color: var(--cp-button-hover);
  background: var(--cp-button-hover);
}
</style>
