<template>
  <div class="base-chart">
    <div class="text-right">
      <!-- Chart options -->
      <b-button-group>
        <b-dropdown no-caret right v-b-tooltip.hover="$t('chartTooltipOptions')" id="additional-options" :menu-class="customLook ? 'top-nav-menu cp-chart-menu' : null">
          <template v-slot:button-content>
            <i class="fa-solid fa-ellipsis-vertical" aria-hidden="true" v-if="customLook" />
            <MdiIcon :path="mdiDotsVertical" v-else />
            <slot name="buttonContent" />
          </template>
          <!-- Download options (custom look: the rows of the tools menu of the passport page, Font Awesome icons) -->
          <template v-if="customLook">
            <b-dropdown-item link-class="top-nav-menu-item" @click="getFilename('png')" v-if="supportsPngDownload"><i class="fa-solid fa-image fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadPng') }}</b-dropdown-item>
            <b-dropdown-item link-class="top-nav-menu-item" @click="getFilename('svg')" v-if="supportsSvgDownload"><i class="fa-solid fa-file-code fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadSvg') }}</b-dropdown-item>
            <b-dropdown-item link-class="top-nav-menu-item" @click="downloadSource()" v-if="sourceFile"><i class="fa-solid fa-file-lines fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadFile') }}</b-dropdown-item>
            <b-dropdown-item link-class="top-nav-menu-item" @click="$refs.customChartColorModal.show()" v-if="canChangeColors"><i class="fa-solid fa-palette fa-fw" aria-hidden="true" /> {{ $t('buttonChangeChartColors') }}</b-dropdown-item>
          </template>
          <template v-else>
            <b-dropdown-item @click="getFilename('png')" v-if="supportsPngDownload"><MdiIcon :path="mdiFileImage" /> {{ $t('buttonDownloadPng') }}</b-dropdown-item>
            <b-dropdown-item @click="getFilename('svg')" v-if="supportsSvgDownload"><MdiIcon :path="mdiFileCode" /> {{ $t('buttonDownloadSvg') }}</b-dropdown-item>
            <b-dropdown-item @click="downloadSource()" v-if="sourceFile"><MdiIcon :path="mdiFileDocument" /> {{ $t('buttonDownloadFile') }}</b-dropdown-item>
            <b-dropdown-item @click="$refs.customChartColorModal.show()" v-if="canChangeColors"><MdiIcon :path="mdiPalette" /> {{ $t('buttonChangeChartColors') }}</b-dropdown-item>
          </template>
          <!-- Additional options -->
          <slot name="additionalMenuItems" />
        </b-dropdown>
        <!-- Additional buttons -->
        <slot name="additionalButtons" />
      </b-button-group>
    </div>

    <!-- Loading indicator -->
    <div class="text-center" v-if="loading">
      <b-spinner style="width: 3rem; height: 3rem;" variant="primary" type="grow" />
    </div>

    <slot name="prepend" />
    <!-- This is where the chart goes -->
    <slot name="chart" ref="chart" />
    <slot name="append" />

    <!-- Modal to ask for filenames -->
    <b-modal ref="chartModal" :title="$t('modalTitleChartFilename')" :ok-title="$t('buttonOk')" :cancel-title="$t('buttonCancel')" @ok="download">
      <b-form v-on:submit.prevent="download">
        <b-form-input v-model="userFilename" autofocus />
      </b-form>
    </b-modal>

    <CustomChartColorModal ref="customChartColorModal" :customLook="customLook" v-on:colors-changed="onColorsChanged" />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import MdiIcon from '@/components/icons/MdiIcon'
import CustomChartColorModal from '@/components/modals/CustomChartColorModal'
import { getDateTimeString } from '@/mixins/formatting'
import { downloadBlob, downloadSvgsFromContainer } from '@/mixins/util'

import { mdiDotsVertical, mdiFileImage, mdiFileCode, mdiFileDocument, mdiPalette } from '@mdi/js'

const emitter = require('tiny-emitter/instance')

const Plotly = require('plotly.js/lib/core')

export default {
  data: function () {
    return {
      mdiDotsVertical,
      mdiFileImage,
      mdiFileCode,
      mdiFileDocument,
      mdiPalette,
      userFilename: 'plotly-chart',
      imageType: null
    }
  },
  computed: {
    ...mapGetters([
      'storeDarkMode'
    ])
  },
  props: {
    // In the look of the custom pages: the menu as the tools menu of the passport page, Font Awesome icons
    customLook: {
      type: Boolean,
      default: false
    },
    width: {
      type: Function,
      default: () => 1280
    },
    height: {
      type: Function,
      default: () => 600
    },
    supportsSvgDownload: {
      type: Boolean,
      default: true
    },
    supportsPngDownload: {
      type: Boolean,
      default: true
    },
    filename: {
      type: String,
      default: null
    },
    sourceFile: {
      type: Object,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    },
    chartType: {
      type: String,
      default: 'plotly'
    },
    canChangeColors: {
      type: Boolean,
      default: true
    }
  },
  watch: {
    storeDarkMode: function () {
      this.$emit('force-redraw')
    }
  },
  components: {
    MdiIcon,
    CustomChartColorModal
  },
  methods: {
    onColorsChanged: function () {
      emitter.emit('chart-colors-changed')
    },
    downloadSource: function () {
      const request = this.sourceFile

      request.filename = request.filename + '-' + getDateTimeString()

      if (!request.extension) {
        request.extension = 'txt'
      }

      downloadBlob(request)
    },
    getFilename: function (imageType) {
      this.imageType = imageType
      if (this.filename) {
        this.userFilename = this.filename
      }
      this.$refs.chartModal.show()
    },
    download: function () {
      this.$refs.chartModal.hide()

      if (this.imageType === 'svg') {
        downloadSvgsFromContainer(this.$slots.chart[0].elm, this.chartType === 'plotly', this.userFilename + '-' + getDateTimeString())
      } else if (this.imageType === 'png') {
        const container = this.$slots.chart[0].elm
        const chart = container.classList.contains('js-plotly-plot') ? container : container.querySelector('.js-plotly-plot')
        Plotly.downloadImage(chart, { format: 'png', width: this.width(), height: this.height(), filename: this.userFilename + '-' + getDateTimeString() })
      }
    },
    chartColorsChangedHandler: function () {
      this.$emit('force-redraw')
    }
  },
  mounted: function () {
    emitter.on('chart-colors-changed', this.chartColorsChangedHandler)
  },
  destroyed: function () {
    emitter.off('chart-colors-changed', this.chartColorsChangedHandler)
  }
}
</script>

<style>
/* Custom look: the options menu as the tools menu of the passport page (top-nav-dropdown.css): no lines between the
   options, the texts on the left */
.dropdown-menu.top-nav-menu.cp-chart-menu {
  min-width: 12rem;
  margin-top: 10px;
  text-align: left;
}
.cp-chart-menu .top-nav-menu-item {
  justify-content: flex-start;
  border-top: none;
}
.cp-chart-menu > li:first-child .top-nav-menu-item {
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
}
.cp-chart-menu .top-nav-menu-item > i {
  color: var(--cp-green, #3b6b35);
}
.text-center .plotly .svg-container {
  margin-left: auto!important;
  margin-right: auto!important;
}
</style>
