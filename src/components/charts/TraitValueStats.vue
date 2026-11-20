<template>
  <!-- The values of a text trait in one dataset: its numbers (unique values, observations, missing values, the most
       frequent value, the values seen once) and a horizontal bar per value, the most frequent on top. With many values:
       the 10 most frequent and a bar for the others, and a table of all of them (shown from a link or by the bar of the
       others); with values mostly unique (free text): no chart, the table. A value clicked: value-clicked. -->
  <!-- Meant to fill the body of a block (no padding of its own around the numbers): the numbers on a strip at the top,
       the options of the chart and its help at the right end of the strip, then the chart under its title -->
  <div :class="['tvs', { tds: isClimate }]" :id="id">
    <div class="tvs-numbers">
      <div :class="['tvs-number', { 'is-text': number.text }]" v-for="number in numbers" :key="`tvs-number-${number.key}`" :data-tour-number="number.key">
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
        <b-dropdown-item link-class="top-nav-menu-item" :disabled="values.length < 1 || (mode === 'unique' && view !== 'time')" @click="downloadSvg"><i class="fa-solid fa-file-code fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadSvg') }}</b-dropdown-item>
        <b-dropdown-item link-class="top-nav-menu-item" :disabled="!sourceFile" @click="downloadData"><i class="fa-solid fa-file-lines fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadFile') }}</b-dropdown-item>
        <!-- Free text shown as a chart all the same: back to the table -->
        <b-dropdown-item link-class="top-nav-menu-item" @click="forceChart = false" v-if="forceChart"><i class="fa-solid fa-table-list fa-fw" aria-hidden="true" /> {{ $t('pageTraitDetailsStatsShowTable') }}</b-dropdown-item>
        <!-- The colours of the charts (the modal of the options of the charts): the first one for the bars -->
        <b-dropdown-item link-class="top-nav-menu-item" @click="$refs.baseChart.showColors()"><i class="fa-solid fa-palette fa-fw" aria-hidden="true" /> {{ $t('buttonChangeChartColors') }}</b-dropdown-item>
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
        <!-- A climate: its values, or its values over the recording dates -->
        <div class="tds-views" role="tablist" v-if="isClimate && !loading && values.length > 0">
          <button type="button" :class="['tds-view', { active: view === option.key }]" :data-tour-view="option.key" role="tab" :aria-selected="view === option.key ? 'true' : 'false'" v-for="option in views" :key="`tvs-view-${option.key}`" @click="setView(option.key)">
            <i :class="['fa-solid', option.icon]" aria-hidden="true" /> {{ option.text }}
          </button>
        </div>
        <div class="tvs-loading" v-if="loading"><b-spinner small type="grow" /></div>
        <p class="tvs-empty" v-else-if="values.length < 1">{{ $t('headingNoData') }}</p>
        <!-- Over time: every observation needed, loaded when opened (very many: once confirmed) -->
        <template v-else-if="view === 'time' && rowsState !== 'loaded'">
          <div class="tvs-loading" v-if="rowsState === 'loading'"><b-spinner small type="grow" /><span class="tds-progress" v-if="rowsProgress && rowsProgress.total > rowsProgress.loaded">{{ $t('pageTraitDetailsStatsLoadingProgress', { loaded: formatNumber(rowsProgress.loaded), total: formatNumber(rowsProgress.total) }) }}</span></div>
          <div class="tds-single" v-else-if="rowsState === 'confirm'">
            <p><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ vt('pageTraitDetailsStatsObservationsLarge', { count: formatNumber(total) }) }}</p>
            <button type="button" class="tvs-values-link" @click="loadObservations"><i class="fa-solid fa-download" aria-hidden="true" /> {{ $t('pageTraitDetailsStatsLoadObservations') }}</button>
          </div>
        </template>
        <p class="tds-single" v-else-if="view === 'time' && !timeShown"><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ $t('pageClimateDetailsStatsNoDates') }}</p>
        <div class="tvs-chart" ref="chart" v-show="view === 'time' ? timeShown : (!loading && values.length > 0 && mode !== 'unique')" />
        <p class="tds-note" v-if="timeShown && timeUnit"><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ timeUnit === 'year' ? $t('pageClimateDetailsStatsTimeByYearCategory') : $t('pageClimateDetailsStatsTimeByMonthCategory') }}</p>
      </div>
    </BaseChart>

    <!-- All the values (many of them): a link showing / hiding their table, or the table itself (free text) -->
    <div :class="['tvs-values', { 'is-unique': mode === 'unique' }]" v-if="!loading && values.length > 0 && (mode !== 'all' || forceChart) && view !== 'time'">
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
          <p class="tvs-note" :title="vt('pageTraitDetailsStatsMostlyUnique')" v-if="mode === 'unique'"><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ vt('pageTraitDetailsStatsMostlyUnique') }}</p>
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
import { apiPostTraitStatsCategorical, apiPostClimateStatsCategorical } from '@/mixins/api/dataset'
import { apiPostTrialsDataTable } from '@/mixins/api/trait'
import { apiPostClimateDataTable } from '@/mixins/api/climate'
import { CLIMATE_KEYS, VARIABLES } from '@/mixins/variable-stats'
import traitStats from '@/mixins/trait-stats'
import { getCategoryTimeChart, getTimeUnit, hasDates } from '@/mixins/climate-time'
import { getColors } from '@/mixins/colors'
import { withoutFlags } from '@/mixins/location-flags'
import { dataTypes } from '@/mixins/types'
import { formatNumber, formatPercent, getDateTimeString } from '@/mixins/formatting'
import '@/assets/fonts/inter.css'

const d3Dsv = require('d3-dsv')
const Plotly = require('plotly.js/lib/core')

// The bar chart (and the dots of a climate over time)
Plotly.register([
  require('plotly.js/lib/bar'),
  require('plotly.js/lib/scatter')
])
// Over time: the most frequent values in a colour each, the others grey; every observation above this many: confirmed
const TIME_TOP_VALUES = 10
const ROWS_CONFIRM = 50000

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
  // The observations of the variable (a climate over time)
  mixins: [traitStats],
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
    // The id of the variable: a trait, or a climate (variable = climate)
    traitId: {
      type: Number,
      required: true
    },
    // What the variable is: a trait (observations of germplasm, rep, block) or a climate (observations of a location at a
    // recording date: the location in place of the germplasm, no rep nor block)
    variable: {
      type: String,
      default: 'trait'
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
      loading: false,
      // { value, count }, the most frequent first
      values: [],
      missing: null,
      // Many values: their table shown (from the link below the chart, or the bar of the others)
      showAllValues: false,
      // Free text: the chart shown all the same (a bar per value, no grouping)
      forceChart: false,
      // A climate: its values ('values') or its values over the recording dates ('time', every observation loaded:
      // none, confirm, loading, loaded)
      view: 'values',
      rows: [],
      rowsState: 'none'
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
    isClimate: function () {
      return this.variable === 'climate'
    },
    variableConfig: function () {
      return VARIABLES[this.variable] || VARIABLES.trait
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
      return !this.loading && this.values.length > 0 && (this.mode !== 'unique' || this.view === 'time')
    },
    // A climate: its views
    views: function () {
      return [{
        key: 'values',
        icon: 'fa-chart-bar',
        text: this.$t('pageTraitDetailsStatsViewDistribution')
      }, {
        key: 'time',
        icon: 'fa-timeline',
        text: this.$t('pageClimateDetailsStatsViewOverTime')
      }]
    },
    timeShown: function () {
      return this.view === 'time' && this.rowsState === 'loaded' && hasDates(this.rows)
    },
    timeUnit: function () {
      return this.timeShown ? getTimeUnit(this.rows) : null
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
    // As drawn: a row per bar and the axis (over time: a lane per location)
    chartHeight: function () {
      if (this.view === 'time') {
        return this.timeShown ? this.getTimeChart(this.getTheme()).layout.height : 300
      }
      return Math.max(1, this.bars.length) * ROW_HEIGHT + AXIS_HEIGHT
    },
    downloadName: function () {
      return `${this.traitName || 'trait'}-dataset-${this.datasetId}`
    },
    typeColor: function () {
      return this.dataType ? this.dataType.color() : null
    },
    // The help (the tour): the numbers (each one shown), the views (each one), what the chart shows, the options of the
    // chart last. Each mode its own texts (tourNumberTexts, tourViews, tourExtraSteps); steps of elements not on the page
    // are left out by the tour
    tourSteps: function () {
      const target = selector => () => `#${this.id} ${selector}`
      const steps = [{
        title: () => this.$t('pageTraitDetailsTourNumbersTitle'),
        text: () => this.vt('pageTraitDetailsTourNumbersText'),
        target: target('.tvs-numbers'),
        position: 'bottom'
      }]
      const numberTexts = this.tourNumberTexts
      this.numbers.forEach(number => {
        if (numberTexts[number.key]) {
          steps.push({
            title: () => number.label,
            text: () => numberTexts[number.key],
            target: target(`[data-tour-number="${number.key}"]`),
            position: 'bottom'
          })
        }
      })
      const views = this.tourViews
      if (views.length > 0) {
        steps.push({
          title: () => this.$t('pageTraitDetailsTourViewsTitle'),
          text: () => this.$t('pageTraitDetailsTourViewsText'),
          target: target('.tds-views:not(.tcs-groups)'),
          position: 'bottom'
        })
      }
      views.concat(this.tourExtraSteps).forEach(view => {
        steps.push({
          title: () => view.title,
          text: () => view.text,
          target: target(view.selector || `[data-tour-view="${view.key}"]`),
          position: view.position || 'bottom'
        })
      })
      steps.push({
        title: () => this.$t('popoverChartTourGenericOptionsTitle'),
        text: () => this.$t('pageTraitDetailsTourOptionsText'),
        target: target('#additional-options'),
        position: 'bottom'
      })
      return steps
    },
    // The help: what each number tells (by its key)
    tourNumberTexts: function () {
      return {
        unique: this.$t('pageTraitDetailsTourNumberUnique'),
        observations: this.vt('pageTraitDetailsTourNumberObservations'),
        missing: this.vt('pageTraitDetailsTourNumberMissing'),
        top: this.$t('pageTraitDetailsTourNumberTop'),
        singletons: this.$t('pageTraitDetailsTourNumberSingletons')
      }
    },
    // The help: each view ({ key, title, text }, its button: data-tour-view = key); text: no views (a climate: its
    // values, over time), the chart
    tourViews: function () {
      if (!this.isClimate) {
        return []
      }
      const texts = {
        values: this.$t('pageTraitDetailsTourTextChart'),
        time: this.$t('pageClimateDetailsTourTextTime')
      }
      return this.views.map(option => ({ key: option.key, title: option.text, text: texts[option.key] }))
    },
    // The help: other steps after the views ({ title, text, selector })
    tourExtraSteps: function () {
      // (a climate: the chart explained by its views)
      if (this.isClimate) {
        return []
      }
      return [{
        title: this.$t('pageTraitDetailsTourChartTitle'),
        text: this.$t('pageTraitDetailsTourTextChart'),
        selector: '.tvs-chart',
        position: 'top'
      }]
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
        label: this.$t('pageTraitDetailsStatsTopValue', { percent: loaded && this.total > 0 ? formatPercent(this.values[0].count / this.total) : '–' })
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
    // A text of the statistics: its climate version for a climate (CLIMATE_KEYS)
    vt: function (key, params) {
      return this.$t(this.isClimate && CLIMATE_KEYS[key] ? CLIMATE_KEYS[key] : key, params)
    },
    // The observations of the variable (the data table of the trials or of the climates)
    fetchDataTable: function (request, onSuccess, onError) {
      return (this.isClimate ? apiPostClimateDataTable : apiPostTrialsDataTable)(request, onSuccess, onError)
    },
    // The filter of the observations of the variable in the dataset
    getVariableFilter: function () {
      return [{
        column: this.variableConfig.idColumn,
        comparator: 'equals',
        operator: 'and',
        values: [this.traitId]
      }, {
        column: 'datasetId',
        comparator: 'equals',
        operator: 'and',
        values: [this.datasetId]
      }]
    },
    update: function () {
      this.loading = true
      this.showAllValues = false
      this.forceChart = false
      this.rows = []
      this.rowsState = 'none'
      Promise.all([this.loadValues(), this.loadMissing()]).then(([values, missing]) => {
        this.values = values
        this.missing = missing
      }).finally(() => {
        this.loading = false
        if (this.view === 'time') {
          this.prepareRows()
        }
        this.$nextTick(() => this.draw())
      })
    },
    // A climate: its values or its values over time (every observation, loaded once; very many: once confirmed)
    setView: function (view) {
      this.view = view
      if (this.$refs.chart) {
        Plotly.purge(this.$refs.chart)
      }
      if (view === 'time') {
        this.prepareRows()
      }
      this.$nextTick(() => this.draw())
    },
    prepareRows: function () {
      if (this.rowsState !== 'none' || this.values.length < 1) {
        return
      }
      if (this.total > ROWS_CONFIRM) {
        this.rowsState = 'confirm'
      } else {
        this.loadObservations()
      }
    },
    loadObservations: function () {
      this.rowsState = 'loading'
      const datasetId = this.datasetId
      const traitId = this.traitId
      this.loadTrialRows(value => value).then(rows => {
        if (datasetId !== this.datasetId || traitId !== this.traitId) {
          return
        }
        this.rows = Object.freeze(rows)
        this.rowsState = 'loaded'
        this.$nextTick(() => this.draw())
      })
    },
    // Over time: a lane per location, a dot per observation at its recording date in the colour of its value (the most
    // frequent values; the others grey)
    getTimeChart: function (theme) {
      const colors = getColors() || []
      const top = this.values.slice(0, TIME_TOP_VALUES).map(v => `${v.value}`)
      const otherLabel = this.$t('pageTraitDetailsStatsOther', { count: formatNumber(Math.max(0, this.values.length - TIME_TOP_VALUES)) })
      return getCategoryTimeChart(this.rows, {
        theme,
        locale: (this.$store.getters.storeLocale || 'en_GB').replace('_', '-'),
        t: (key, params) => this.$t(key, params),
        getFlags: labels => this.getLocationFlags(labels),
        valueOf: row => {
          const index = top.indexOf(row.value)
          return index !== -1
            ? { key: row.value, label: this.getLabel(row.value), color: colors.length > 0 ? colors[index % colors.length] : this.barColor, order: index }
            : { key: OTHER_VALUE, label: otherLabel, color: this.storeDarkMode ? OTHER_COLOR_DARK : OTHER_COLOR, order: TIME_TOP_VALUES }
        }
      })
    },
    drawTime: function () {
      const element = this.$refs.chart
      if (!this.timeShown) {
        Plotly.purge(element)
        this.figure = null
        return
      }
      const theme = this.getTheme()
      const figure = this.getTimeChart(theme)
      const layout = Object.assign({
        paper_bgcolor: 'rgba(0, 0, 0, 0)',
        plot_bgcolor: 'rgba(0, 0, 0, 0)',
        font: { family: FONT, size: 13, color: theme.text },
        dragmode: false,
        hovermode: 'closest'
      }, figure.layout)
      figure.data.forEach(trace => { trace.hoverlabel = theme.hoverlabel })
      this.figure = { data: figure.data, layout }
      Plotly.react(element, figure.data, layout, { displayModeBar: false, responsive: true })
      // The flags of the locations where their labels start
      element.removeAllListeners && element.removeAllListeners('plotly_afterplot')
      this.watchLocationFlags()
      // A dot clicked: the observations of its value (the others: none)
      element.removeAllListeners && element.removeAllListeners('plotly_click')
      element.on('plotly_click', event => {
        const point = event && event.points && event.points.length > 0 ? event.points[0] : null
        const custom = point ? point.customdata : null
        if (custom && custom.value !== undefined && custom.value !== OTHER_VALUE) {
          this.$emit('value-clicked', custom.value)
        }
      })
    },
    // The count of each value in the dataset (blank values: missing, not a value)
    loadValues: function () {
      return new Promise(resolve => {
        const valueColumn = this.variableConfig.valueColumn
        const load = this.isClimate ? apiPostClimateStatsCategorical : apiPostTraitStatsCategorical
        load({ datasetIds: [this.datasetId], xIds: [this.traitId] }, result => {
          this.sourceFile = result || null
          const read = result && result.text ? result.text() : Promise.resolve('')
          read.then(text => {
            const rows = text ? d3Dsv.tsvParse(text) : []
            const countColumns = rows.columns ? rows.columns.filter(c => c !== valueColumn) : []
            const values = rows.map(row => ({
              value: row[valueColumn],
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
        this.fetchDataTable({
          page: 1,
          limit: 1,
          filter: this.getVariableFilter().concat([{
            column: this.variableConfig.dataValueColumn,
            comparator: 'isNull',
            operator: 'and',
            values: []
          }])
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
      if (this.view === 'time') {
        this.drawTime()
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
      // SVG: the locations of a climate without their flags (only their name and ISO 3 code); a legend kept out of the
      // chart on the page (the locations over time) in the chart
      const layout = Object.assign({}, format === 'svg' ? withoutFlags(this.figure.layout) : this.figure.layout)
      if (format === 'svg' && layout.meta && layout.meta.exportLegend) {
        layout.showlegend = true
      }
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
      const country = this.isClimate ? /^(.*) (\([A-Z]{3}\))$/.exec(label) : null
      if (country && country[1].length > LABEL_LENGTH) {
        return `${country[1].substring(0, LABEL_LENGTH).trim()}… ${country[2]}`
      }
      if (country) {
        return label
      }
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
<!-- A climate: the views, the notes (as the other statistics) -->
<style src="@/assets/trait-stats.css"></style>
<!-- The look of the statistics (shared with the comparisons of the trials export) -->
<style scoped src="@/assets/variable-stats.css"></style>
