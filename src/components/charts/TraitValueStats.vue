<template>
  <!-- The values of a text trait in one dataset: its numbers (unique values, observations, missing values, the most
       frequent value, the values seen once) and a horizontal bar per value, the most frequent on top. With many values:
       the 10 most frequent and a bar for the others, and a table of all of them (shown from a link or by the bar of the
       others); with values mostly unique (free text): no chart, the table. A value clicked: value-clicked. -->
  <!-- Meant to fill the body of a block (no padding of its own around the numbers): the numbers on a strip at the top,
       the options of the chart and its help at the right end of the strip, then the chart under its title -->
  <div class="tvs" :id="id">
    <div class="tvs-numbers">
      <div :class="['tvs-number', { 'is-text': number.text }]" v-for="number in numbers" :key="`tvs-number-${number.key}`">
        <span class="tvs-number-value" :title="number.text ? number.value : null">{{ number.value === null ? '–' : (number.text ? number.value : formatNumber(number.value)) }}</span>
        <span class="tvs-number-label">{{ number.label }}</span>
      </div>
    </div>

    <!-- Options (download as PNG / SVG, the data file) and help: on the strip of the numbers -->
    <!-- Its own downloads: the PNG of the whole block (heading, numbers, chart), the SVG of the chart with the name of the
         trait, the data file -->
    <BaseChart :width="() => 1280"
               :height="() => chartHeight"
               :supportsPngDownload="false"
               :supportsSvgDownload="false"
               :canChangeColors="false"
               customLook
               :optionsDisabled="!hasChart"
               class="tvs-base"
               ref="baseChart"
               v-on:force-redraw="draw">
      <template slot="additionalMenuItems">
        <b-dropdown-item link-class="top-nav-menu-item" :disabled="values.length < 1" @click="downloadPng"><i class="fa-solid fa-image fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadPng') }}</b-dropdown-item>
        <b-dropdown-item link-class="top-nav-menu-item" :disabled="values.length < 1 || mode === 'unique'" @click="downloadSvg"><i class="fa-solid fa-file-code fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadSvg') }}</b-dropdown-item>
        <b-dropdown-item link-class="top-nav-menu-item" :disabled="!sourceFile" @click="downloadData"><i class="fa-solid fa-file-lines fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadFile') }}</b-dropdown-item>
        <!-- Free text shown as a chart all the same: back to the table -->
        <b-dropdown-item link-class="top-nav-menu-item" @click="forceChart = false" v-if="forceChart"><i class="fa-solid fa-table-list fa-fw" aria-hidden="true" /> {{ $t('pageTraitDetailsStatsShowTable') }}</b-dropdown-item>
        <!-- The colours of the charts (the modal of the options of the charts): the first one for the bars -->
        <b-dropdown-item link-class="top-nav-menu-item" @click="$refs.baseChart.$refs.customChartColorModal.show()"><i class="fa-solid fa-palette fa-fw" aria-hidden="true" /> {{ $t('buttonChangeChartColors') }}</b-dropdown-item>
      </template>
      <template slot="additionalButtons">
        <b-button v-b-tooltip.hover :title="$t('chartTooltipMatrixTour')" :aria-label="$t('chartTooltipMatrixTour')" :disabled="!hasChart" @click="$refs.tour.start()">
          <i class="fa-regular fa-circle-question" aria-hidden="true" />
        </b-button>
      </template>
      <div slot="chart" class="tvs-chart-wrap">
        <!-- The trait: the icon of its data type, its name -->
        <div class="tvs-head">
          <span class="tvs-type" :style="{ '--tvs-type-color': typeColor }" v-if="dataType"><MdiIcon :path="dataType.path" /></span>
          <span class="tvs-name">{{ traitName }}</span>
        </div>
        <div class="tvs-loading" v-if="loading"><b-spinner small type="grow" /></div>
        <p class="tvs-empty" v-else-if="values.length < 1">{{ $t('headingNoData') }}</p>
        <div class="tvs-chart" ref="chart" v-show="!loading && values.length > 0 && mode !== 'unique'" />
      </div>
    </BaseChart>

    <!-- All the values (many of them): a link showing / hiding their table, or the table itself (free text) -->
    <div :class="['tvs-values', { 'is-unique': mode === 'unique' }]" v-if="!loading && values.length > 0 && (mode !== 'all' || forceChart)">
      <div class="tvs-values-link-row" v-if="mode === 'top'">
        <button type="button" :class="['tvs-values-link', { open: showAllValues }]" @click="toggleAllValues" :aria-expanded="showAllValues ? 'true' : 'false'">
          <i class="fa-solid fa-table-list" aria-hidden="true" />
          {{ showAllValues ? $t('pageTraitDetailsStatsHideAllValues') : $t('pageTraitDetailsStatsShowAllValues', { count: formatNumber(values.length) }) }}
          <i class="fa-solid fa-chevron-down tvs-values-chevron" aria-hidden="true" />
        </button>
      </div>
      <div class="tvs-values-table" ref="valuesTable" v-if="mode === 'unique' || showAllValues">
        <!-- The title; free text: on its right, on one line, why there is no chart -->
        <div class="tvs-values-head">
          <h4 class="tvs-values-title">{{ $t('pageTraitDetailsStatsAllValuesTitle') }}</h4>
          <p class="tvs-note" :title="$t('pageTraitDetailsStatsMostlyUnique')" v-if="mode === 'unique'"><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ $t('pageTraitDetailsStatsMostlyUnique') }}</p>
        </div>
        <!-- Free text: at the bottom left of the table, the chart all the same (a bar per value) -->
        <TraitValueTable :values="values" :barColor="barColor" :tableActions="mode === 'unique' ? valueTableActions : null" @value-clicked="$emit('value-clicked', $event)" />
      </div>
      <!-- The chart shown all the same: back to the table -->
      <div class="tvs-values-link-row" v-if="forceChart">
        <button type="button" class="tvs-values-link" @click="forceChart = false">
          <i class="fa-solid fa-table-list" aria-hidden="true" /> {{ $t('pageTraitDetailsStatsShowTable') }}
        </button>
      </div>
    </div>

    <!-- Tour explaining the options of the chart -->
    <Tour :steps="tourSteps" modernLook ref="tour" />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import MdiIcon from '@/components/icons/MdiIcon'
import BaseChart from '@/components/charts/BaseChart'
import Tour from '@/components/util/Tour'
import TraitValueTable from '@/components/tables/TraitValueTable'
import { uuidv4, downloadBlob } from '@/mixins/util'
import { apiPostTraitStatsCategorical } from '@/mixins/api/dataset'
import { apiPostTrialsDataTable } from '@/mixins/api/trait'
import { dataTypes } from '@/mixins/types'
import { formatNumber, getDateTimeString } from '@/mixins/formatting'
import '@/assets/fonts/inter.css'

const d3Dsv = require('d3-dsv')
const Plotly = require('plotly.js/lib/core')

// Only the bar chart is used here
Plotly.register([
  require('plotly.js/lib/bar')
])

// The value column of the statistics file (the others: one count per dataset)
const VALUE_COLUMN = 'phenotype_value'
// Labels longer than this are cut with "…" (the whole value in the hover)
const LABEL_LENGTH = 18
// Height of a bar and its gap, and of the axis below the bars
const ROW_HEIGHT = 60
const AXIS_HEIGHT = 50
// Up to this many values: a bar each; more: the most frequent ones (TOP_BARS) and a bar for the others
const ALL_BARS_MAX = 15
const TOP_BARS = 10
// More unique values than this share of the observations: free text, no chart (the table of the values)
const MOSTLY_UNIQUE_RATIO = 0.5
// The bar of the others (its value in the chart)
const OTHER_VALUE = '\u0000other'
const OTHER_COLOR = '#b9bdb7'
const OTHER_COLOR_DARK = '#5d625f'
// The colour of the bars, unless the user chose the colours of the charts (then the first of them)
const BAR_COLOR = '#5b9cf6'
const FONT = 'Inter, -apple-system, "Segoe UI", Roboto, sans-serif'

// Colours of the block given back as color(srgb r g b / a) (color-mix()), which html2canvas cannot read: as rgba()
const COLOR_PROPERTIES = ['color', 'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'fill', 'stroke', 'outline-color']
// An image from its address (data URL), once loaded
const loadImage = url => new Promise((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.onerror = reject
  image.src = url
})
const toRgba = value => value.replace(/color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.e-]+%?))?\s*\)/g, (match, r, g, b, a) => {
  const channel = c => Math.round(Math.min(1, Math.max(0, +c)) * 255)
  const alpha = a === undefined ? 1 : (a.endsWith('%') ? parseFloat(a) / 100 : +a)
  return `rgba(${channel(r)}, ${channel(g)}, ${channel(b)}, ${alpha})`
})

export default {
  components: {
    BaseChart,
    MdiIcon,
    Tour,
    TraitValueTable
  },
  props: {
    // The block the chart is in: the whole of it in the PNG (the closest element matching this; else the chart alone)
    captureSelector: {
      type: String,
      default: '.td-card'
    },
    traitId: {
      type: Number,
      required: true
    },
    traitName: {
      type: String,
      default: null
    },
    // The data type of the trait (text, categorical, ...): its icon and colour beside the name
    traitDataType: {
      type: String,
      default: null
    },
    datasetId: {
      type: Number,
      required: true
    }
  },
  data: function () {
    const id = 'trait-value-stats-' + uuidv4()
    return {
      id,
      // The statistics file of the values (download of the data, in the options of the chart)
      sourceFile: null,
      tourSteps: [{
        title: () => this.$t('popoverChartTourGenericOptionsTitle'),
        text: () => this.$t('popoverChartTourGenericOptionsText'),
        target: () => `#${id} #additional-options`,
        position: 'bottom'
      }],
      loading: false,
      // { value, count }, the most frequent first
      values: [],
      missing: null,
      // Many values: their table shown (from the link below the chart, or the bar of the others)
      showAllValues: false,
      // Free text: the chart shown all the same (a bar per value, no grouping)
      forceChart: false
    }
  },
  computed: {
    ...mapGetters([
      'storeDarkMode',
      'storeCustomChartColors'
    ]),
    barColor: function () {
      const colors = this.storeCustomChartColors
      return colors && colors.length > 0 ? colors[0] : BAR_COLOR
    },
    dataType: function () {
      return dataTypes[this.traitDataType] || null
    },
    // At the bottom left of the table of the values (free text): the chart all the same
    valueTableActions: function () {
      return [{
        id: 'show-chart',
        text: this.$t('pageTraitDetailsStatsShowChart'),
        icon: 'fa-solid fa-chart-bar',
        variant: null,
        disabled: () => false,
        callback: () => this.showChartAnyway()
      }]
    },
    // A chart drawn (the options of the chart and its help only then)
    hasChart: function () {
      return !this.loading && this.values.length > 0 && this.mode !== 'unique'
    },
    total: function () {
      return this.values.reduce((sum, v) => sum + v.count, 0)
    },
    // 'all': a bar per value; 'top': the most frequent ones and the others; 'unique': free text, no chart
    mode: function () {
      if (this.forceChart || this.values.length <= ALL_BARS_MAX) {
        return 'all'
      }
      return this.total > 0 && this.values.length / this.total > MOSTLY_UNIQUE_RATIO ? 'unique' : 'top'
    },
    // The bars of the chart: the values, or the most frequent ones and one for the others
    bars: function () {
      if (this.mode !== 'top') {
        return this.values
      }
      const others = this.values.slice(TOP_BARS)
      return this.values.slice(0, TOP_BARS).concat([{
        value: OTHER_VALUE,
        count: others.reduce((sum, v) => sum + v.count, 0),
        other: true,
        label: this.$t('pageTraitDetailsStatsOther', { count: formatNumber(others.length) })
      }])
    },
    // As drawn: a row per bar and the axis
    chartHeight: function () {
      return Math.max(1, this.bars.length) * ROW_HEIGHT + AXIS_HEIGHT
    },
    downloadName: function () {
      return `${this.traitName || 'trait'}-dataset-${this.datasetId}`
    },
    typeColor: function () {
      return this.dataType ? this.dataType.color() : null
    },
    numbers: function () {
      const loaded = !this.loading
      return [{
        key: 'unique',
        value: loaded ? this.values.length : null,
        label: this.$t('pageTraitDetailsStatsUniqueValues')
      }, {
        key: 'observations',
        value: loaded ? this.values.reduce((sum, v) => sum + v.count, 0) : null,
        label: this.$t('pageTraitDetailsStatsObservations')
      }, {
        key: 'missing',
        value: loaded ? this.missing : null,
        label: this.$t('pageTraitDetailsStatsMissingValues')
      }, {
        key: 'top',
        text: true,
        value: loaded && this.values.length > 0 ? `${this.values[0].value}` : null,
        label: this.$t('pageTraitDetailsStatsTopValue', { percent: loaded && this.total > 0 ? `${(Math.round(this.values[0].count / this.total * 1000) / 10).toLocaleString()} %` : '–' })
      }, {
        key: 'singletons',
        value: loaded ? this.values.filter(v => v.count === 1).length : null,
        label: this.$t('pageTraitDetailsStatsSingletons')
      }].filter(number => number.key !== 'top' || !loaded || (this.values.length > 0 && this.values[0].count > 1))
      // (the most frequent value only when a value is seen more than once)
    }
  },
  watch: {
    datasetId: function () {
      this.update()
    },
    traitId: function () {
      this.update()
    },
    storeDarkMode: function () {
      this.draw()
    }
  },
  methods: {
    formatNumber,
    update: function () {
      this.loading = true
      this.showAllValues = false
      this.forceChart = false
      Promise.all([this.loadValues(), this.loadMissing()]).then(([values, missing]) => {
        this.values = values
        this.missing = missing
      }).finally(() => {
        this.loading = false
        this.$nextTick(() => this.draw())
      })
    },
    // The count of each value in the dataset (blank values: missing, not a value)
    loadValues: function () {
      return new Promise(resolve => {
        apiPostTraitStatsCategorical({ datasetIds: [this.datasetId], xIds: [this.traitId] }, result => {
          this.sourceFile = result || null
          const read = result && result.text ? result.text() : Promise.resolve('')
          read.then(text => {
            const rows = text ? d3Dsv.tsvParse(text) : []
            const countColumns = rows.columns ? rows.columns.filter(c => c !== VALUE_COLUMN) : []
            const values = rows.map(row => ({
              value: row[VALUE_COLUMN],
              count: countColumns.reduce((sum, c) => sum + (+row[c] || 0), 0)
            })).filter(v => v.value !== undefined && v.value !== null && `${v.value}`.trim() !== '' && v.count > 0)
            values.sort((a, b) => b.count - a.count || `${a.value}`.localeCompare(`${b.value}`))
            resolve(values)
          }).catch(() => resolve([]))
        }, {
          codes: [404],
          callback: () => {
            this.sourceFile = null
            resolve([])
          }
        })
      })
    },
    // Observations of the trait in the dataset without a value
    loadMissing: function () {
      return new Promise(resolve => {
        apiPostTrialsDataTable({
          page: 1,
          limit: 1,
          filter: [{
            column: 'traitId',
            comparator: 'equals',
            operator: 'and',
            values: [this.traitId]
          }, {
            column: 'datasetId',
            comparator: 'equals',
            operator: 'and',
            values: [this.datasetId]
          }, {
            column: 'traitValue',
            comparator: 'isNull',
            operator: 'and',
            values: []
          }]
        }, result => resolve(result && result.count !== undefined ? result.count : null), {
          codes: [],
          callback: () => resolve(null)
        })
      })
    },
    draw: function () {
      const element = this.$refs.chart
      if (!element) {
        return
      }
      if (this.values.length < 1 || this.mode === 'unique') {
        Plotly.purge(element)
        this.figure = null
        return
      }

      const text = this.storeDarkMode ? '#c4beb5' : '#4a4d4b'
      const muted = this.storeDarkMode ? '#a39d93' : '#6b6f6c'
      const grid = this.storeDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
      const bars = this.bars
      const indices = bars.map((v, i) => i)
      const otherColor = this.storeDarkMode ? OTHER_COLOR_DARK : OTHER_COLOR

      const data = [{
        type: 'bar',
        orientation: 'h',
        x: bars.map(v => v.count),
        y: indices,
        customdata: bars.map(v => v.value),
        hovertext: bars.map(v => v.other ? v.label : v.value),
        marker: {
          color: bars.map(v => v.other ? otherColor : this.barColor),
          cornerradius: 6
        },
        hovertemplate: '%{hovertext}<br><b>%{x}</b><extra></extra>',
        hoverlabel: {
          bgcolor: this.storeDarkMode ? '#262a2b' : '#ffffff',
          bordercolor: this.storeDarkMode ? 'rgb(62, 67, 70)' : '#e2e3df',
          font: { family: FONT, size: 12, color: this.storeDarkMode ? '#e8e6e3' : '#1f2120' }
        }
      }]

      const layout = {
        height: this.chartHeight,
        margin: { t: 10, r: 20, b: 40, l: 10 },
        bargap: 0.22,
        paper_bgcolor: 'rgba(0, 0, 0, 0)',
        plot_bgcolor: 'rgba(0, 0, 0, 0)',
        font: { family: FONT, size: 13, color: text },
        dragmode: false,
        hovermode: 'closest',
        showlegend: false,
        xaxis: {
          showgrid: true,
          gridcolor: grid,
          griddash: 'dot',
          zeroline: false,
          showline: false,
          rangemode: 'tozero',
          tickfont: { family: FONT, size: 13, color: muted },
          fixedrange: true
        },
        yaxis: {
          autorange: 'reversed',
          tickmode: 'array',
          tickvals: indices,
          ticktext: bars.map(v => v.other ? v.label : this.getLabel(v.value)),
          showgrid: false,
          zeroline: false,
          showline: false,
          ticks: '',
          ticklabelstandoff: 8,
          automargin: true,
          tickfont: { family: FONT, size: 13, color: text },
          fixedrange: true
        }
      }

      // As drawn, for the downloads
      this.figure = { data, layout }

      Plotly.react(element, data, layout, {
        displayModeBar: false,
        responsive: true
      })

      element.removeAllListeners && element.removeAllListeners('plotly_click')
      element.on('plotly_click', event => {
        if (event && event.points && event.points.length > 0) {
          const value = event.points[0].customdata
          // The bar of the others: the table of all the values
          if (value === OTHER_VALUE) {
            this.openAllValues()
          } else {
            this.$emit('value-clicked', value)
          }
        }
      })
    },
    // Free text: the chart all the same, a bar per value
    showChartAnyway: function () {
      this.forceChart = true
      this.$nextTick(() => this.draw())
    },
    toggleAllValues: function () {
      if (this.showAllValues) {
        this.showAllValues = false
      } else {
        this.openAllValues()
      }
    },
    openAllValues: function () {
      this.showAllValues = true
      this.$nextTick(() => {
        if (this.$refs.valuesTable && this.$refs.valuesTable.scrollIntoView) {
          this.$refs.valuesTable.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    },
    // The chart as an image (png / svg), at the width it has on the page; with the name of the trait as its title (svg)
    getChartImage: function (format, withTitle) {
      const element = this.$refs.chart
      const width = Math.round(element.getBoundingClientRect().width) || 1280
      const layout = Object.assign({}, this.figure.layout)
      let height = this.chartHeight
      if (withTitle) {
        height += 50
        layout.margin = Object.assign({}, layout.margin, { t: 60 })
        layout.title = {
          text: this.traitName || '',
          x: 0.5,
          xanchor: 'center',
          font: { family: '"DM Sans", ' + FONT, size: 18, color: this.storeDarkMode ? '#e8e6e3' : '#1f2120' }
        }
      }
      layout.height = height
      return Plotly.toImage({ data: this.figure.data, layout }, { format, width, height, scale: format === 'png' ? 2 : 1 })
    },
    // PNG: the whole block (its heading, the numbers, the title of the chart and the chart), without the buttons. The
    // block is photographed (html2canvas) with the place of the chart left empty, and the image of the chart (Plotly) is
    // then drawn into that place: the chart does not depend on how the browser copies its SVG.
    downloadPng: function () {
      if (this.values.length < 1) {
        return
      }
      const block = (this.captureSelector && this.$el.closest && this.$el.closest(this.captureSelector)) || this.$el
      const chart = this.$refs.chart
      const blockBox = block.getBoundingClientRect()
      const chartBox = chart.getBoundingClientRect()
      const background = getComputedStyle(block).backgroundColor
      chart.setAttribute('data-tvs-capture', this.id)
      Promise.all([import('html2canvas'), this.figure ? this.getChartImage('png', false).then(loadImage) : null]).then(([module, chartImage]) => {
        const html2canvas = module.default || module
        return html2canvas(block, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: background && background !== 'rgba(0, 0, 0, 0)' ? background : (this.storeDarkMode ? '#1f2223' : '#ffffff'),
          // Not the buttons of the chart
          ignoreElements: element => element.classList && element.classList.contains('text-right') && element.parentElement && element.parentElement.classList.contains('tvs-base'),
          onclone: doc => {
            // Colours html2canvas cannot read (color-mix(), given as color(srgb ...)): as rgba() in the copy
            const view = doc.defaultView
            const copy = doc.querySelector(`[data-tvs-capture="${this.id}"]`)
            const root = (copy && copy.closest(this.captureSelector)) || doc.body
            ;[root, ...root.querySelectorAll('*')].forEach(element => {
              const style = view.getComputedStyle(element)
              COLOR_PROPERTIES.forEach(property => {
                const value = style.getPropertyValue(property)
                if (value && value.includes('color(')) {
                  element.style.setProperty(property, toRgba(value), 'important')
                }
              })
            })
            // The place of the chart left empty (its image is drawn there afterwards)
            if (copy) {
              copy.style.visibility = 'hidden'
            }
          }
        }).then(canvas => {
          if (!chartImage) {
            return canvas
          }
          const scale = canvas.width / blockBox.width
          const context = canvas.getContext('2d')
          // html2canvas leaves its own scale and offset on the context: in the pixels of the canvas instead
          context.setTransform(1, 0, 0, 1, 0, 0)
          context.drawImage(chartImage,
            (chartBox.left - blockBox.left) * scale,
            (chartBox.top - blockBox.top) * scale,
            chartBox.width * scale,
            chartBox.height * scale)
          return canvas
        })
      }).then(canvas => {
        canvas.toBlob(blob => downloadBlob({ blob, filename: `${this.downloadName}-${getDateTimeString()}`, extension: 'png' }))
      }).finally(() => {
        chart.removeAttribute('data-tvs-capture')
      })
    },
    // SVG: the chart with the name of the trait as its title
    downloadSvg: function () {
      if (!this.figure) {
        return
      }
      this.getChartImage('svg', true).then(url => {
        const link = document.createElement('a')
        link.href = url
        link.download = `${this.downloadName}-${getDateTimeString()}.svg`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      })
    },
    downloadData: function () {
      if (this.sourceFile) {
        downloadBlob({ blob: this.sourceFile, filename: `${this.downloadName}-${getDateTimeString()}`, extension: 'txt' })
      }
    },
    getLabel: function (value) {
      const label = `${value}`
      return label.length > LABEL_LENGTH ? `${label.substring(0, LABEL_LENGTH).trim()}…` : label
    }
  },
  mounted: function () {
    this.update()
  },
  beforeDestroy: function () {
    if (this.$refs.chart) {
      Plotly.purge(this.$refs.chart)
    }
  }
}
</script>

<!-- The look of the help (the tour of the tables) -->
<style src="@/assets/table-modern.css"></style>
<style scoped>
.tvs {
  position: relative;
  font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: var(--cp-text);
}
/* The numbers: a strip at the top, a cell each (the value above its label) with a line between them, a line below */
.tvs-numbers {
  display: flex;
  flex-wrap: wrap;
  min-height: 90px;
  padding-right: 6.5rem;
  border-bottom: 1px solid var(--cp-border);
  /* The font of the titles of the blocks (custom pages), not that of the chart */
  font-family: 'DM Sans', -apple-system, 'Segoe UI', Roboto, sans-serif;
}
.tvs-number {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.9rem 1.5rem;
  border-right: 1px solid var(--cp-border);
}
.tvs-number:last-child {
  border-right: none;
}
.tvs-number-value {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.2;
}
.tvs-number-label {
  color: var(--cp-muted);
  font-size: 0.92rem;
}
/* The options of the chart and its help: icons at the right end of the strip of the numbers */
.tvs-base >>> .text-right {
  position: absolute;
  top: 0;
  right: 1rem;
  display: flex;
  align-items: center;
  height: 90px;
}
.tvs-base >>> .text-right > .btn-group {
  gap: 0.35rem;
}
.tvs-base >>> .text-right .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: none !important;
  border-radius: 8px !important;
  background: transparent;
  color: var(--cp-text-subtle);
  font-size: 1.05rem;
  box-shadow: none !important;
}
.tvs-base >>> .text-right .btn:hover,
.tvs-base >>> .text-right .btn:focus,
.tvs-base >>> .text-right .show > .btn {
  background: var(--cp-neutral-bg);
  color: var(--cp-text);
}
/* Without a chart (free text): the options and the help disabled */
.tvs-base >>> .text-right .btn:disabled,
.tvs-base >>> .text-right .btn.disabled {
  background: transparent;
  color: var(--cp-muted);
  opacity: 0.45;
  cursor: default;
}
/* The chart under its title (the icon of the data type and the name of the trait, centred) */
.tvs-chart-wrap {
  padding: 1.5rem 1.25rem 1rem;
}
.tvs-head {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.tvs-type {
  display: inline-flex;
  color: var(--tvs-type-color);
}
.tvs-type >>> svg {
  width: 1.55rem;
  height: 1.55rem;
  fill: var(--tvs-type-color);
}
.tvs-name {
  font-family: 'DM Sans', -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 1.3rem;
  font-weight: 600;
}
/* The most frequent value: text, cut with "…" */
.tvs-number.is-text {
  max-width: 18rem;
}
.tvs-number.is-text .tvs-number-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* Free text: why there is no chart, on one line on the right of the title of the table */
.tvs-values-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}
.tvs-values-head .tvs-values-title {
  flex-shrink: 0;
  margin-bottom: 0;
}
.tvs-note {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--cp-muted);
  font-size: 0.85rem;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tvs-note .fa-solid {
  margin-right: 0.35rem;
  color: var(--cp-green);
}
/* All the values: the link below the chart, the table */
.tvs-values {
  padding: 0 1.25rem 1.25rem;
}
.tvs-values-link-row {
  display: flex;
  justify-content: center;
}
.tvs-values-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.9rem;
  border: 1px solid var(--cp-border);
  border-radius: 10px;
  background: var(--cp-surface);
  color: var(--cp-text-subtle);
  font-family: 'DM Sans', -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
}
.tvs-values-link:hover,
.tvs-values-link:focus-visible {
  border-color: var(--cp-muted);
  background: var(--cp-surface-hover);
  color: var(--cp-text);
}
.tvs-values-link > .fa-table-list,
.tvs-values-link > .fa-chart-bar {
  color: var(--cp-green);
}
/* Free text: the table right below the strip of the numbers and the title of the trait */
.tvs-values.is-unique .tvs-values-table {
  margin-top: 0.25rem;
}
.tvs-values-chevron {
  font-size: 0.75rem;
  transition: transform 0.2s ease;
}
.tvs-values-link.open .tvs-values-chevron {
  transform: rotate(180deg);
}
.tvs-values-table {
  margin-top: 1.25rem;
}
.tvs-values-title {
  margin: 0 0 0.75rem;
  font-family: 'DM Sans', -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 1rem;
  font-weight: 600;
}
.tvs-loading,
.tvs-empty {
  padding: 2rem 0;
  color: var(--cp-muted);
  text-align: center;
}
.tvs-empty {
  margin: 0;
}
/* The bars can be clicked */
.tvs-chart >>> .plotly .cursor-crosshair,
.tvs-chart >>> .plotly .bars .point {
  cursor: pointer;
}
@media (max-width: 575px) {
  .tvs-number {
    padding: 0.75rem 1rem;
  }
}
</style>
