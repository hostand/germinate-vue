<template>
  <!-- Multi-trait comparison (the Comparison tab of the trials export): several numeric traits across the chosen
       datasets, to find patterns between the trials. Only numeric traits (the same name, data type and unit in two
       datasets or more, as the single trait comparison; the others left out, silently); two or more of them, chosen one
       by one in the searchable list, each shown as a removable chip.
       Traits in different units are never put on the same scale as they are: the heatmap and the radar show the
       standardized mean of each trial (z: the mean of the trial minus the mean of all the observations of the trait in
       the datasets compared, divided by their standard deviation; 0 = the overall mean, ±1 = one standard deviation),
       the real mean (and its unit) in their labels; the parallel coordinates keep each trait on its own axis, in its
       own unit. Missing data: a trial without a trait is blank in the heatmap and a gap in the radar; the parallel
       coordinates and the PCA only take the germplasm of a trial with every chosen trait. The PCA: on the correlation
       matrix (each trait standardized), shown as a biplot (germplasm as points, traits as arrows). The grouped statistical summary below:
       the numbers of each trait in each trial (a read-only table, downloadable). -->
  <section class="stc">
    <header class="stc-head">
      <span class="stc-icon" :style="{ '--stc-type-color': typeColor }" aria-hidden="true"><MdiIcon :path="mdiShapeSquarePlus" /></span>
      <div class="stc-heading">
        <h3 class="stc-title">{{ vk('pageComparisonMultiTraitChoose') }}</h3>
        <p class="stc-text">{{ vk('pageComparisonMultiTraitChooseText') }}</p>
      </div>
      <div class="stc-select">
        <GermplasmFilterSelect id="mtc-trait"
                               :options="traitOptions"
                               :value="null"
                               :placeholder="selectedKeys.length >= MAX_TRAITS ? vk('pageComparisonMultiTraitMax', { count: MAX_TRAITS }) : vk('pageComparisonMultiTraitPlaceholder')"
                               :loading="traitsLoading"
                               countIcon="fa-solid fa-database"
                               @select="addTrait"
                               :key="`mtc-select-${selectedKeys.length}`" />
        <!-- Every chosen trait taken away -->
        <button type="button"
                class="mtc-clear"
                :disabled="selectedKeys.length < 1"
                v-b-tooltip.hover
                :title="vk('pageComparisonMultiTraitClear')"
                :aria-label="vk('pageComparisonMultiTraitClear')"
                @click="clearTrait">
          <i class="fa-solid fa-trash-can" aria-hidden="true" />
        </button>
      </div>
    </header>
    <!-- The climate data by location: the chosen locations (chips; the map of one) -->
    <ClimateLocationChips :locations="chosenLocations" @remove-location="id => $emit('remove-location', id)" @clear-locations="$emit('clear-locations')" v-if="isByLocation" />
    <!-- The chosen traits: a chip each, removable -->
    <div class="mtc-chips" v-if="chosen.length > 0">
      <span class="mtc-chip" v-for="trait in chosen" :key="`mtc-chip-${trait.key}`">
        {{ getTraitLabel(trait) }}
        <button type="button" class="mtc-chip-remove" :title="$t('genericRemove')" :aria-label="$t('genericRemove')" @click="removeTrait(trait.key)"><i class="fa-solid fa-xmark" aria-hidden="true" /></button>
      </span>
    </div>

    <div class="stc-body tvs" :id="id" v-if="chosen.length > 0">
      <p class="tvs-empty" v-if="!selected">{{ vk('pageComparisonMultiTraitChooseMore') }}</p>
      <div class="tvs-loading" v-else-if="rowsState === 'loading'"><b-spinner small /> {{ rowsProgress || $t('tooltipTableLoadingIndicator') }}</div>
      <div class="tvs-empty stc-confirm" v-else-if="rowsState === 'confirm'">
        <p><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ vk('pageComparisonSingleTraitLarge', { count: formatNumber(rowsTotal) }) }}</p>
        <button type="button" class="tvs-values-link" @click="loadRows"><i class="fa-solid fa-download" aria-hidden="true" /> {{ $t('pageTraitDetailsStatsLoadObservations') }}</button>
      </div>
      <p class="tvs-empty" v-else-if="rowsState === 'loaded' && usedDatasets.length < 2">{{ vk('pageComparisonMultiTraitTooFew') }}</p>
      <template v-else-if="rowsState === 'loaded'">
        <!-- The numbers -->
        <div class="tvs-numbers">
          <div :class="['tvs-number', { 'is-danger': number.danger }]" v-for="number in numbers" :key="`mtc-number-${number.key}`" :data-tour-number="number.key">
            <span class="tvs-number-value">{{ number.value }}</span>
            <span class="tvs-number-label">{{ number.label }}</span>
          </div>
        </div>
        <!-- The options (downloads, colours) and the help, at the right end of the strip -->
        <BaseChart :width="() => 1280"
                   :height="() => chartHeight"
                   :supportsPngDownload="false"
                   :supportsSvgDownload="false"
                   :canChangeColors="false"
                   customLook
                   class="tvs-base"
                   ref="baseChart"
                   v-on:force-redraw="draw">
          <template slot="additionalMenuItems">
            <b-dropdown-header>{{ currentViewText }}</b-dropdown-header>
            <b-dropdown-item link-class="top-nav-menu-item" @click="downloadChart('chart', 'png')" :disabled="!chartShown"><i class="fa-solid fa-image fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadPng') }}</b-dropdown-item>
            <b-dropdown-item link-class="top-nav-menu-item" @click="downloadChart('chart', 'svg')" :disabled="!chartShown"><i class="fa-solid fa-file-code fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadSvg') }}</b-dropdown-item>
            <b-dropdown-divider />
            <b-dropdown-item link-class="top-nav-menu-item" @click="downloadData"><i class="fa-solid fa-file-lines fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadFile') }}</b-dropdown-item>
            <b-dropdown-item link-class="top-nav-menu-item" @click="downloadPca" v-if="view === 'pca' && pcaResult"><i class="fa-solid fa-file-zipper fa-fw" aria-hidden="true" /> {{ vk('pageComparisonMultiTraitPcaDownload') }}</b-dropdown-item>
            <b-dropdown-item link-class="top-nav-menu-item" @click="$refs.baseChart.showColors()"><i class="fa-solid fa-palette fa-fw" aria-hidden="true" /> {{ $t('buttonChangeChartColors') }}</b-dropdown-item>
          </template>
          <template slot="additionalButtons">
            <b-button v-b-tooltip.hover :title="$t('chartTooltipMatrixTour')" :aria-label="$t('chartTooltipMatrixTour')" @click="$refs.tour.start()">
              <i class="fa-regular fa-circle-question" aria-hidden="true" />
            </b-button>
          </template>
          <div slot="chart" class="tvs-chart-wrap">
            <!-- The views: heatmap, radar, parallel coordinates -->
            <div class="tds mtc-views-wrap">
              <div class="tds-views" role="tablist">
                <button type="button"
                        :class="['tds-view', { active: view === option.key }]"
                        :data-tour-view="option.key"
                        role="tab"
                        :aria-selected="view === option.key ? 'true' : 'false'"
                        v-for="option in views"
                        :key="`mtc-view-${option.key}`"
                        @click="setView(option.key)">
                  <MdiIcon :path="option.path" className="mtc-view-icon" /> {{ option.text }}
                </button>
              </div>
            </div>
            <p class="tvs-empty" v-if="view === 'radar' && chosen.length < 3">{{ vk('pageComparisonMultiTraitRadarFew') }}</p>
            <p class="tvs-empty" v-else-if="view === 'parallel' && profiles.length < 1">{{ vk('pageComparisonMultiTraitNoProfiles') }}</p>
            <p class="tvs-empty" v-else-if="view === 'pca' && !pcaResult">{{ vk('pageComparisonMultiTraitPcaFew') }}</p>
            <!-- The chart; a heavy one (parallel coordinates, very many points): the loading over it while it is drawn -->
            <div class="mtc-chart-area" v-show="chartShown">
              <div class="stc-chart" ref="chart" />
              <div class="mtc-drawing" v-if="drawing"><b-spinner small /> {{ $t('tooltipTableLoadingIndicator') }}</div>
            </div>
          </div>
        </BaseChart>
        <!-- The numbers of each trait in each trial: a read-only table (its tools shown, inactive), downloadable -->
        <div class="stc-summary-wrap">
          <h4 class="stc-chart-title" data-tour="summary">{{ vk('pageComparisonMultiTraitSummary') }}</h4>
          <div class="stc-summary">
            <BaseTable :columns="summaryColumns"
                       :options="summaryOptions"
                       :getData="getSummaryData"
                       :getIds="null"
                       :downloadTable="downloadSummary"
                       toolsLocked
                       :autoHideColumns="false"
                       :storeUrlParameters="false"
                       primary-key="rowKey"
                       :key="`mtc-summary-${selectedKey}`">
            </BaseTable>
          </div>
        </div>
      </template>
    </div>

    <!-- Tour explaining the numbers, the views, the table and the options -->
    <Tour :steps="tourSteps" modernLook ref="tour" />
  </section>
</template>

<script>
import BaseChart from '@/components/charts/BaseChart'
import BaseTable from '@/components/tables/BaseTable'
import GermplasmFilterSelect from '@/components/tables/GermplasmFilterSelect'
import ClimateLocationChips from '@/components/export/ClimateLocationChips'
import MdiIcon from '@/components/icons/MdiIcon'
import Tour from '@/components/util/Tour'
import traitComparison, { getNumericComparable, CHART_HEIGHT } from '@/mixins/trait-comparison'
import { formatNumber, getDateTimeString } from '@/mixins/formatting'
import { downloadBlob } from '@/mixins/util'
import { makeZip } from '@/mixins/zip'
import { mean, pca } from '@/mixins/stats-math'
import { mdiShapeSquarePlus, mdiGrid, mdiRadar, mdiViewParallel, mdiChartScatterPlot } from '@mdi/js'

const Plotly = require('plotly.js/lib/core')
Plotly.register([
  require('plotly.js/lib/heatmap'),
  require('plotly.js/lib/scatterpolar'),
  require('plotly.js/lib/parcoords'),
  require('plotly.js/lib/scatter')
])

// Above this many germplasm of trials, a chart is drawn behind its loading
const HEAVY_POINTS = 1500
// At most this many traits at once (the charts stay readable)
const MAX_TRAITS = 12
// The height of a row of the heatmap (a trial), and what the axes take
const HEATMAP_ROW = 56
const HEATMAP_EXTRA = 130

// A value of the data as a number (also with a decimal comma); null when not a number
const parseNumber = value => {
  const text = `${value === null || value === undefined ? '' : value}`.trim().replace(/^(-?\d+),(\d+)$/, '$1.$2')
  return text !== '' && isFinite(text) ? +text : null
}
const sd = (values, m) => values.length > 1 ? Math.sqrt(values.reduce((sum, x) => sum + (x - m) * (x - m), 0) / (values.length - 1)) : null

export default {
  components: {
    BaseChart,
    BaseTable,
    GermplasmFilterSelect,
    ClimateLocationChips,
    MdiIcon,
    Tour
  },
  // The traits of the datasets, the observations (of every chosen trait), the theme and the downloads
  mixins: [traitComparison],
  props: {
    // The climate data by location: the chosen locations ({ locationId, locationName, countryCode2, countryCode3,
    // datasetIds, row }), their chips
    chosenLocations: {
      type: Array,
      default: () => []
    }
  },
  data: function () {
    return {
      mdiShapeSquarePlus,
      MAX_TRAITS,
      // The chosen traits (their keys, in the order chosen)
      selectedKeys: [],
      // heatmap, radar or parallel
      view: 'heatmap',
      // A heavy chart being drawn (its loading shown over it)
      drawing: false,
      summaryOptions: {
        idColumn: 'rowKey',
        tableName: 'comparisonMultiTrait'
      }
    }
  },
  computed: {
    comparable: function () {
      if (!this.isByLocation) {
        return getNumericComparable(this.datasets, this.traitsByDataset)
      }
      return getNumericComparable(this.datasets, this.traitsByDataset, 1)
        .filter(o => this.chosenLocations.filter(l => l.datasetIds.some(id => o.datasetIds.includes(id))).length > 1)
    },
    // The groups compared: the datasets of the chosen traits, or (the climate data by location) the chosen locations
    groupIds: function () {
      if (this.isByLocation) {
        return this.locationIds || []
      }
      return this.selected ? this.selected.datasetIds : []
    },
    // The list: the traits not chosen yet ("name (unit)", the number of their datasets); none when the most are chosen
    traitOptions: function () {
      if (this.selectedKeys.length >= MAX_TRAITS) {
        return []
      }
      return this.comparable.filter(o => !this.selectedKeys.includes(o.key)).map(o => ({ value: o.key, name: this.getTraitLabel(o), count: o.datasetIds.length }))
    },
    chosen: function () {
      return this.selectedKeys.map(key => this.comparable.find(o => o.key === key)).filter(o => o)
    },
    // What is loaded: every chosen trait (two or more) in their datasets (replaces the single trait of the mixin)
    selected: function () {
      if (this.chosen.length < 2) {
        return null
      }
      const datasetIds = []
      const traitIds = []
      this.chosen.forEach(o => {
        o.datasetIds.forEach(id => { if (!datasetIds.includes(id)) datasetIds.push(id) })
        o.traitIds.forEach(id => { if (!traitIds.includes(id)) traitIds.push(id) })
      })
      return { key: this.chosen.map(o => o.key).join('||'), name: 'multi-trait', datasetIds: this.datasets.map(d => d.datasetId).filter(id => datasetIds.includes(id)), traitIds }
    },
    // A trait id to the key of its chosen trait
    keyByTraitId: function () {
      const map = {}
      this.chosen.forEach(o => o.traitIds.forEach(id => { map[id] = o.key }))
      return map
    },
    // The numbers of each trait in each dataset, and over all of them (its pooled mean and standard deviation)
    stats: function () {
      const result = {}
      this.chosen.forEach(trait => {
        const rows = this.rows.filter(r => r.traitKey === trait.key)
        const all = rows.filter(r => r.value !== null).map(r => r.value)
        const poolMean = all.length > 0 ? mean(all) : null
        const poolSd = all.length > 1 ? sd(all, poolMean) : null
        const byDataset = {}
        this.groupIds.forEach(datasetId => {
          const inDataset = rows.filter(r => r.datasetId === datasetId)
          const values = inDataset.filter(r => r.value !== null).map(r => r.value).sort((a, b) => a - b)
          const n = values.length
          const m = n > 0 ? mean(values) : null
          const s = sd(values, m)
          byDataset[datasetId] = {
            n,
            invalid: inDataset.length - n,
            germplasm: new Set(inDataset.filter(r => r.value !== null).map(r => r.germplasmId)).size,
            mean: m,
            sd: s,
            cv: s !== null && m ? s / Math.abs(m) * 100 : null,
            min: n > 0 ? values[0] : null,
            max: n > 0 ? values[n - 1] : null,
            // The standardized mean: how far the trial is from the overall mean, in standard deviations
            z: n > 0 && poolSd ? (m - poolMean) / poolSd : (n > 0 ? 0 : null)
          }
        })
        result[trait.key] = { poolMean, poolSd, byDataset }
      })
      return result
    },
    // The datasets with numbers of at least one chosen trait (a colour each)
    usedDatasets: function () {
      if (!this.selected) {
        return []
      }
      const ids = this.groupIds.filter(id => this.chosen.some(t => this.stats[t.key] && this.stats[t.key].byDataset[id] && this.stats[t.key].byDataset[id].n > 0))
      const colors = this.getDistinctColors(ids.length)
      return ids.map((datasetId, index) => ({ datasetId, datasetName: this.groupName(datasetId), color: colors[index] }))
    },
    // The germplasm of a trial with every chosen trait: its mean of each (the lines of the parallel coordinates)
    profiles: function () {
      const used = new Set(this.usedDatasets.map(d => d.datasetId))
      const groups = {}
      this.rows.filter(r => r.value !== null && r.traitKey && used.has(r.datasetId)).forEach(r => {
        const key = `${r.datasetId}|${r.germplasmId}`
        const g = groups[key] = groups[key] || { datasetId: r.datasetId, germplasmName: r.germplasmName, values: {} }
        ;(g.values[r.traitKey] = g.values[r.traitKey] || []).push(r.value)
      })
      return Object.values(groups).filter(g => this.chosen.every(t => g.values[t.key])).map(g => {
        const means = {}
        this.chosen.forEach(t => { means[t.key] = mean(g.values[t.key]) })
        return { datasetId: g.datasetId, germplasmName: g.germplasmName, means }
      })
    },
    // The PCA of the germplasm of the trials with every chosen trait (their means), each trait standardized (the
    // correlation matrix: traits in different units weigh the same); null: fewer than three such germplasm or fewer than
    // two traits that vary
    pcaResult: function () {
      if (this.chosen.length < 2 || this.profiles.length < 3) {
        return null
      }
      const result = pca(this.profiles.map(p => this.chosen.map(t => p.means[t.key])))
      return result.used.length >= 2 ? result : null
    },
    numbers: function () {
      const observations = this.rows.filter(r => r.value !== null && r.traitKey).length
      const invalid = this.rows.filter(r => r.value === null && r.traitKey).length
      const numbers = [{
        key: 'traits',
        value: formatNumber(this.chosen.length),
        label: this.vk('pageComparisonMultiTraitTraits')
      }, {
        key: 'datasets',
        value: `${formatNumber(this.usedDatasets.length)} / ${formatNumber(this.groupIds.length)}`,
        label: this.vk('pageComparisonSingleTraitDatasetsCompared')
      }, {
        key: 'observations',
        value: formatNumber(observations),
        label: this.$t('pageTraitDetailsStatsObservations')
      }, {
        key: 'profiles',
        value: formatNumber(this.profiles.length),
        label: this.vk('pageComparisonMultiTraitProfiles')
      }]
      if (invalid > 0) {
        numbers.push({ key: 'invalid', danger: true, value: formatNumber(invalid), label: this.$t('pageTraitDetailsStatsNotNumbers') })
      }
      return numbers
    },
    views: function () {
      return [{
        key: 'heatmap',
        path: mdiGrid,
        text: this.vk('pageComparisonMultiTraitHeatmap')
      }, {
        key: 'radar',
        path: mdiRadar,
        text: this.vk('pageComparisonMultiTraitRadar')
      }, {
        key: 'parallel',
        path: mdiViewParallel,
        text: this.vk('pageComparisonMultiTraitParallel')
      }, {
        key: 'pca',
        path: mdiChartScatterPlot,
        text: this.vk('pageComparisonMultiTraitPca')
      }]
    },
    currentViewText: function () {
      const view = this.views.find(v => v.key === this.view)
      return view ? view.text : ''
    },
    // The chart of the view drawn (not: a message instead)
    chartShown: function () {
      return !(this.view === 'radar' && this.chosen.length < 3) && !(this.view === 'parallel' && this.profiles.length < 1) && !(this.view === 'pca' && !this.pcaResult)
    },
    chartHeight: function () {
      return this.view === 'heatmap' ? Math.max(260, this.usedDatasets.length * HEATMAP_ROW + HEATMAP_EXTRA) : CHART_HEIGHT
    },
    // A row per trait and trial
    summaryRows: function () {
      const rows = []
      this.chosen.forEach(trait => {
        this.usedDatasets.forEach(d => {
          const s = this.stats[trait.key].byDataset[d.datasetId]
          if (!s || (s.n === 0 && s.invalid === 0)) {
            return
          }
          rows.push(Object.assign({ rowKey: `${trait.key}|${d.datasetId}`, traitLabel: this.getTraitLabel(trait), unit: trait.unitLabel, datasetId: d.datasetId, datasetName: d.datasetName }, s))
        })
      })
      return rows
    },
    summaryColumns: function () {
      const number = key => ({ key, type: Number, sortable: false, class: 'text-right' })
      return [{
        key: 'traitLabel',
        type: String,
        sortable: false,
        label: this.vk('pageComparisonMultiTraitTrait')
      }, {
        key: 'datasetName',
        type: String,
        sortable: false,
        label: this.vk('tableColumnDatasetName')
      }, Object.assign(number('n'), {
        label: this.$t('pageTraitDetailsStatsObservations'),
        formatter: value => formatNumber(value)
      }), Object.assign(number('germplasm'), {
        label: this.vk('pageComparisonSingleTraitGermplasm'),
        formatter: value => formatNumber(value)
      }), Object.assign(number('mean'), {
        label: this.$t('pageTraitDetailsStatsMean'),
        formatter: (value, key, item) => this.formatUnit(value, item.unit)
      }), Object.assign(number('sd'), {
        label: this.$t('pageTraitDetailsStatsSd'),
        formatter: (value, key, item) => this.formatUnit(value, item.unit)
      }), Object.assign(number('cv'), {
        label: this.$t('pageTraitDetailsStatsCv'),
        formatter: value => value === null ? '–' : `${this.formatFixed(value, 1)} %`
      }), Object.assign(number('min'), {
        label: this.$t('pageTraitDetailsStatsMinMax'),
        formatter: (value, key, item) => item.n > 0 ? `${this.formatValue(item.min)} – ${this.formatUnit(item.max, item.unit)}` : '–'
      }), Object.assign(number('z'), {
        label: this.vk('pageComparisonMultiTraitStandardized'),
        formatter: value => value === null ? '–' : this.formatSigned(value)
      }), Object.assign(number('invalid'), {
        label: this.$t('pageTraitDetailsStatsNotNumbers'),
        formatter: value => formatNumber(value)
      })]
    },
    // The help: the numbers, the views, the table, the options
    tourSteps: function () {
      const target = selector => () => `#${this.id} ${selector}`
      const texts = {
        traits: this.vk('pageComparisonMultiTraitTourTraits'),
        datasets: this.vk('pageComparisonMultiTraitTourDatasets'),
        observations: this.vk('pageComparisonMultiTraitTourObservations'),
        profiles: this.vk('pageComparisonMultiTraitTourProfiles'),
        invalid: this.vk('pageComparisonTourInvalid')
      }
      const steps = this.numbers.map(number => ({
        title: () => number.label,
        text: () => texts[number.key],
        target: target(`[data-tour-number="${number.key}"]`),
        position: 'bottom'
      }))
      const viewTexts = {
        heatmap: this.vk('pageComparisonMultiTraitTourHeatmap'),
        radar: this.vk('pageComparisonMultiTraitTourRadar'),
        parallel: this.vk('pageComparisonMultiTraitTourParallel'),
        pca: this.vk('pageComparisonMultiTraitTourPca')
      }
      return steps.concat(this.views.map(view => ({
        title: () => view.text,
        text: () => viewTexts[view.key],
        target: target(`[data-tour-view="${view.key}"]`),
        position: 'bottom'
      }))).concat([{
        title: () => this.vk('pageComparisonMultiTraitSummary'),
        text: () => this.vk('pageComparisonMultiTraitTourSummary'),
        target: target('[data-tour="summary"]'),
        position: 'top'
      }, {
        title: () => this.$t('popoverChartTourGenericOptionsTitle'),
        text: () => this.vk('pageComparisonMultiTraitTourOptions'),
        target: target('#additional-options'),
        position: 'bottom'
      }])
    }
  },
  watch: {
    // Other locations: the chosen traits no longer in two of them left out
    chosenLocations: function () {
      if (this.isByLocation) {
        this.keepComparable()
      }
    },
    // Another way of comparing: the chosen traits still comparable kept (their observations loaded again)
    compareBy: function () {
      this.keepComparable(true)
    }
  },
  methods: {
    // The name of a group: a dataset, or a location (with its country code)
    groupName: function (id) {
      if (this.isByLocation) {
        const l = this.chosenLocations.find(o => o.locationId === id)
        return l ? (l.countryCode3 ? `${l.locationName} (${l.countryCode3})` : l.locationName) : `${id}`
      }
      return this.datasetNames[id] || `${id}`
    },
    getTraitLabel: function (trait) {
      return trait.unitLabel ? `${trait.name} (${trait.unitLabel})` : trait.name
    },
    formatUnit: function (value, unit) {
      const text = this.formatValue(value)
      return unit && text !== '–' ? `${text} ${unit}` : text
    },
    formatSigned: function (value) {
      const text = this.formatFixed(Math.abs(value), 2)
      return value > 0.005 ? `+${text}` : (value < -0.005 ? `−${text}` : text)
    },
    getDatasetColor: function (datasetId) {
      const dataset = this.usedDatasets.find(d => d.datasetId === datasetId)
      return dataset ? dataset.color : null
    },
    // The chosen traits that can still be compared kept, the others left out; their observations loaded again when they
    // changed (or when asked)
    keepComparable: function (reload) {
      const keys = this.selectedKeys.filter(key => this.comparable.some(o => o.key === key))
      if (reload || keys.length !== this.selectedKeys.length) {
        this.selectedKeys = keys
        this.updateSelection()
      }
    },
    // A trait added (from the list) or removed (its chip): the observations of the chosen ones loaded again
    addTrait: function (key) {
      if (!key || this.selectedKeys.includes(key) || this.selectedKeys.length >= MAX_TRAITS) {
        return
      }
      this.selectedKeys.push(key)
      this.updateSelection()
    },
    removeTrait: function (key) {
      this.selectedKeys = this.selectedKeys.filter(k => k !== key)
      this.updateSelection()
    },
    updateSelection: function () {
      this.rows = []
      this.selectedKey = this.selected ? this.selected.key : null
      if (this.selected) {
        this.prepareRows()
      } else {
        this.rowsState = 'none'
      }
    },
    // The datasets changed (the traits loaded again): no trait chosen
    clearTrait: function () {
      this.selectedKeys = []
      this.selectedKey = null
      this.rows = []
      this.rowsState = 'none'
    },
    // An observation: its dataset, germplasm, trait (the key of its chosen trait) and value (null: not a number)
    toRow: function (o) {
      const row = { rep: o.rep, block: o.block, day: o.recordingDate || null, sourceDatasetId: o.datasetId, locationName: o.germplasmName, traitKey: this.keyByTraitId[o.traitId] || null, raw: o.traitValue, value: parseNumber(o.traitValue) }
      // The climate data by location: the location as the group, its dataset as the profile
      if (this.isByLocation) {
        return Object.assign(row, { datasetId: o.germplasmId, germplasmId: o.datasetId, germplasmName: this.datasetNames[o.datasetId] || `${o.datasetId}` })
      }
      return Object.assign(row, { datasetId: o.datasetId, germplasmId: o.germplasmId, germplasmName: o.germplasmName })
    },
    setView: function (key) {
      this.view = key
      this.$nextTick(() => this.draw())
    },
    getSummaryData: function (request) {
      return this.getTableData(request, this.summaryRows)
    },
    // The summary downloaded: a tab separated file in a zip
    downloadSummary: function (request, callback) {
      const number = value => value === null || value === undefined ? '' : `${Math.round(value * 10000) / 10000}`
      const header = [this.vk('pageComparisonMultiTraitTrait'), this.vk('tableColumnDatasetName'), this.$t('pageTraitDetailsStatsObservations'), this.vk('pageComparisonSingleTraitGermplasm'), this.$t('pageTraitDetailsStatsMean'), this.$t('pageTraitDetailsStatsSd'), `${this.$t('pageTraitDetailsStatsCv')} (%)`, 'Min', 'Max', this.vk('pageComparisonMultiTraitStandardized'), this.$t('pageTraitDetailsStatsNotNumbers')]
      const lines = [header.join('\t')].concat(this.summaryRows.map(r => [r.traitLabel, r.datasetName, r.n, r.germplasm, number(r.mean), number(r.sd), number(r.cv), number(r.min), number(r.max), number(r.z), r.invalid].join('\t')))
      return this.resolveLater(callback, makeZip([{ name: `${this.getFileName()}-summary.txt`, content: lines.join('\r\n') }]))
    },
    // The observations of the comparison (dataset, germplasm, rep, block, trait, unit, value as written, number or not)
    downloadData: function () {
      const traits = {}
      this.chosen.forEach(t => { traits[t.key] = t })
      // The climate data: dataset, location and date instead of dataset, germplasm, rep and block
      const header = this.isClimate ? ['dataset', 'location', 'date'] : ['dataset', 'germplasm', 'rep', 'block']
      const lines = [header.concat(['trait', 'unit', 'value', 'numeric']).join('\t')].concat(this.rows.filter(r => r.traitKey).map(r => [
        this.datasetNames[r.sourceDatasetId] || r.sourceDatasetId
      ].concat(this.isClimate ? [r.locationName, r.day || ''] : [r.germplasmName, r.rep || '', r.block || '']).concat([
        traits[r.traitKey].name,
        traits[r.traitKey].unitLabel || '',
        `${r.raw}`.replace(/[\t\r\n]+/g, ' '),
        r.value === null ? 'no' : 'yes'
      ]).join('\t')))
      downloadBlob({ blob: new Blob([lines.join('\r\n')], { type: 'text/plain' }), filename: `${this.getFileName()}-${getDateTimeString()}`, extension: 'txt' })
    },
    // The PCA: a zip with the variance of each component, the loadings of the traits and the scores of the germplasm
    downloadPca: function () {
      const result = this.pcaResult
      if (!result) {
        return
      }
      const number = value => `${Math.round(value * 1000000) / 1000000}`
      const components = result.explained.map((x, i) => `PC${i + 1}`)
      const traits = result.used.map(j => this.chosen[j])
      let cumulative = 0
      const variance = [['component', 'variance (%)', 'cumulative (%)'].join('\t')].concat(result.explained.map((x, i) => {
        cumulative += x
        return [components[i], number(x * 100), number(cumulative * 100)].join('\t')
      }))
      const loadings = [['trait', 'unit'].concat(components).join('\t')].concat(traits.map((t, i) => [t.name, t.unitLabel || ''].concat(result.loadings[i].map(number)).join('\t')))
      const columns = this.isByLocation ? ['location', 'dataset'] : ['dataset', this.isClimate ? 'location' : 'germplasm']
      const scores = [columns.concat(components).join('\t')].concat(this.profiles.map((p, i) => [this.groupName(p.datasetId), p.germplasmName].concat(result.scores[i].map(number)).join('\t')))
      const zip = makeZip([
        { name: 'pca-variance.txt', content: variance.join('\r\n') },
        { name: 'pca-loadings.txt', content: loadings.join('\r\n') },
        { name: 'pca-scores.txt', content: scores.join('\r\n') }
      ])
      downloadBlob({ blob: zip, filename: `${this.getFileName()}-${getDateTimeString()}`, extension: 'zip' })
    },
    getFileName: function () {
      return `comparison-multi-trait-${this.view}`
    },
    // A heavy chart: the parallel coordinates (WebGL, built when first shown), or very many points
    isHeavy: function () {
      return this.view === 'parallel' || this.profiles.length > HEAVY_POINTS
    },
    draw: function () {
      if (this.rowsState !== 'loaded' || this.usedDatasets.length < 2) {
        return
      }
      this.$nextTick(() => {
        const element = this.$refs.chart
        if (!element) {
          return
        }
        if (!this.chartShown) {
          Plotly.purge(element)
          return
        }
        if (!this.isHeavy()) {
          this.drawView(element)
          return
        }
        // The loading painted first (two frames), then the chart drawn (the page busy meanwhile), then the loading gone
        const view = this.view
        this.drawing = true
        requestAnimationFrame(() => requestAnimationFrame(() => {
          setTimeout(() => {
            if (view === this.view && this.$refs.chart) {
              this.drawView(this.$refs.chart)
            }
            this.drawing = false
          }, 0)
        }))
      })
    },
    drawView: function (element) {
      if (!element) {
        return
      }
      if (this.view === 'heatmap') {
        this.drawHeatmap(element)
      } else if (this.view === 'radar') {
        this.drawRadar(element)
      } else if (this.view === 'pca') {
        this.drawPca(element)
      } else {
        this.drawParallel(element)
      }
    },
    // A row per trial, a column per trait: the standardized mean (z) as the colour (0: the overall mean, blue below,
    // red above), the real mean and its unit written in the cell; blank: the trial has no numbers of the trait
    drawHeatmap: function (element) {
      const theme = this.getTheme()
      const datasets = this.usedDatasets.slice().reverse()
      const labels = this.chosen.map(t => this.getTraitLabel(t))
      const cell = (t, d) => this.stats[t.key].byDataset[d.datasetId]
      const z = datasets.map(d => this.chosen.map(t => cell(t, d) && cell(t, d).n > 0 ? cell(t, d).z : null))
      const text = datasets.map(d => this.chosen.map(t => cell(t, d) && cell(t, d).n > 0 ? this.formatUnit(cell(t, d).mean, t.unitLabel) : ''))
      const custom = datasets.map(d => this.chosen.map(t => cell(t, d) && cell(t, d).n > 0 ? [this.formatSigned(cell(t, d).z), formatNumber(cell(t, d).n)] : ['', '']))
      const extent = Math.max(1, ...z.flat().filter(v => v !== null).map(v => Math.abs(v)))
      Plotly.react(element, [{
        type: 'heatmap',
        x: labels,
        y: datasets.map(d => d.datasetName),
        z,
        text,
        customdata: custom,
        texttemplate: '%{text}',
        textfont: { family: theme.hoverlabel.font.family, size: 12 },
        zmin: -extent,
        zmax: extent,
        zmid: 0,
        xgap: 2,
        ygap: 2,
        colorscale: [[0, '#2166ac'], [0.25, '#67a9cf'], [0.5, '#f7f7f7'], [0.75, '#ef8a62'], [1, '#b2182b']],
        colorbar: { title: { text: 'z', font: { color: theme.muted } }, tickfont: { color: theme.muted }, thickness: 12, len: 0.9 },
        hoverongaps: false,
        hoverlabel: theme.hoverlabel,
        hovertemplate: '<b>%{y}</b><br>%{x}<br>%{text}<br>z = %{customdata[0]} · n = %{customdata[1]}<extra></extra>'
      }], this.getLayout({
        height: this.chartHeight,
        margin: { t: 10, r: 20, b: 60, l: 20 },
        xaxis: { side: 'bottom', tickfont: { color: theme.text }, automargin: true, fixedrange: true },
        yaxis: { tickfont: { color: theme.text }, automargin: true, fixedrange: true }
      }), { displayModeBar: false, responsive: true })
    },
    // A polygon per trial over the traits: its standardized means (0: the overall mean, the dashed ring); a gap where a
    // trial has no numbers of a trait
    drawRadar: function (element) {
      const theme = this.getTheme()
      const labels = this.chosen.map(t => this.getTraitLabel(t))
      const all = []
      const data = this.usedDatasets.map(d => {
        const values = this.chosen.map(t => {
          const s = this.stats[t.key].byDataset[d.datasetId]
          return s && s.n > 0 ? s.z : null
        })
        const means = this.chosen.map(t => {
          const s = this.stats[t.key].byDataset[d.datasetId]
          return s && s.n > 0 ? this.formatUnit(s.mean, t.unitLabel) : '–'
        })
        values.filter(v => v !== null).forEach(v => all.push(Math.abs(v)))
        return {
          type: 'scatterpolar',
          name: d.datasetName,
          r: values.concat([values[0]]),
          theta: labels.concat([labels[0]]),
          customdata: means.concat([means[0]]),
          mode: 'lines+markers',
          fill: 'toself',
          fillcolor: this.withAlpha(d.color, 0.12),
          line: { color: d.color, width: 2 },
          marker: { color: d.color, size: 6 },
          hoverlabel: theme.hoverlabel,
          hovertemplate: `<b>${d.datasetName}</b><br>%{theta}<br>%{customdata}<br>z = %{r:.2f}<extra></extra>`
        }
      })
      const extent = Math.ceil(Math.max(1, ...all) * 2) / 2
      Plotly.react(element, data, this.getLayout({
        height: CHART_HEIGHT,
        margin: { t: 30, r: 60, b: 30, l: 60 },
        showlegend: true,
        legend: { font: { color: theme.text } },
        polar: {
          bgcolor: 'rgba(0, 0, 0, 0)',
          radialaxis: { range: [-extent, extent], gridcolor: theme.grid, linecolor: theme.grid, tickfont: { color: theme.muted, size: 10 }, angle: 90, tickangle: 90 },
          angularaxis: { gridcolor: theme.grid, linecolor: theme.grid, tickfont: { color: theme.text } }
        },
        shapes: []
      }), { displayModeBar: false, responsive: true })
    },
    // An axis per trait in its own unit (first the trial), a line per germplasm of a trial with every trait (its means),
    // in the colour of its trial
    drawParallel: function (element) {
      const theme = this.getTheme()
      const datasets = this.usedDatasets
      const index = {}
      datasets.forEach((d, i) => { index[d.datasetId] = i })
      const profiles = this.profiles
      const count = Math.max(datasets.length, 1)
      // Stepped: each trial a band of the scale in its colour
      const colorscale = []
      datasets.forEach((d, i) => {
        colorscale.push([i / count, d.color], [(i + 1) / count, d.color])
      })
      const dimensions = [{
        label: this.vk('tableColumnDatasetName'),
        values: profiles.map(p => index[p.datasetId]),
        tickvals: datasets.map((d, i) => i),
        ticktext: datasets.map(d => d.datasetName.length > 22 ? `${d.datasetName.substring(0, 22)}…` : d.datasetName),
        range: [-0.5, datasets.length - 0.5]
      }].concat(this.chosen.map(t => ({
        label: this.getTraitLabel(t),
        values: profiles.map(p => p.means[t.key])
      })))
      Plotly.react(element, [{
        type: 'parcoords',
        line: { color: profiles.map(p => index[p.datasetId] + 0.5), colorscale, cmin: 0, cmax: count },
        dimensions,
        labelfont: { color: theme.text, size: 12 },
        tickfont: { color: theme.muted, size: 10 },
        rangefont: { color: theme.muted, size: 10 }
      }], this.getLayout({
        height: CHART_HEIGHT,
        margin: { t: 50, r: 60, b: 30, l: 160 }
      }), { displayModeBar: false, responsive: true })
    },
    // The PCA as a biplot: a point per germplasm of a trial (its scores on the first two components), in the colour of
    // its trial; an arrow per trait (its loadings: its correlation with each component, scaled to the points). The
    // share of the variance of each component on its axis
    drawPca: function (element) {
      const theme = this.getTheme()
      const result = this.pcaResult
      const traits = result.used.map(j => this.chosen[j])
      const scores = result.scores
      const data = this.usedDatasets.map(d => {
        const points = this.profiles.map((p, i) => ({ p, s: scores[i] })).filter(x => x.p.datasetId === d.datasetId)
        return {
          type: 'scatter',
          mode: 'markers',
          name: d.datasetName,
          x: points.map(x => x.s[0]),
          y: points.map(x => x.s[1] || 0),
          text: points.map(x => x.p.germplasmName),
          marker: { color: d.color, size: 7, opacity: 0.75 },
          hoverlabel: theme.hoverlabel,
          hovertemplate: `<b>%{text}</b><br>${d.datasetName}<br>PC1 %{x:.2f} · PC2 %{y:.2f}<extra></extra>`
        }
      })
      // The arrows of the traits, as long as the spread of the points
      const reach = Math.max(...scores.map(s => Math.max(Math.abs(s[0]), Math.abs(s[1] || 0))), 1)
      const longest = Math.max(...result.loadings.map(l => Math.hypot(l[0], l[1] || 0)), 1e-9)
      const scale = reach * 0.9 / longest
      const annotations = traits.map((t, i) => ({
        x: result.loadings[i][0] * scale,
        y: (result.loadings[i][1] || 0) * scale,
        ax: 0,
        ay: 0,
        xref: 'x',
        yref: 'y',
        axref: 'x',
        ayref: 'y',
        showarrow: true,
        arrowhead: 2,
        arrowsize: 1,
        arrowwidth: 1.5,
        arrowcolor: theme.text,
        text: `<b>${this.getTraitLabel(t)}</b>`,
        font: { color: theme.text, size: 11 },
        bgcolor: this.storeDarkMode ? 'rgba(38, 42, 43, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        xanchor: result.loadings[i][0] >= 0 ? 'left' : 'right',
        yanchor: 'middle'
      }))
      const percent = value => `${this.formatFixed(value * 100, 1)} %`
      Plotly.react(element, data, this.getLayout({
        height: CHART_HEIGHT,
        margin: { t: 10, r: 20, b: 50, l: 70 },
        showlegend: true,
        legend: { font: { color: theme.text } },
        annotations,
        xaxis: { title: { text: `PC1 (${percent(result.explained[0])})`, font: { color: theme.muted } }, gridcolor: theme.grid, zerolinecolor: theme.grid, tickfont: { color: theme.muted } },
        yaxis: { title: { text: `PC2 (${percent(result.explained[1] || 0)})`, font: { color: theme.muted } }, gridcolor: theme.grid, zerolinecolor: theme.grid, tickfont: { color: theme.muted } }
      }), { displayModeBar: false, responsive: true })
    },
    withAlpha: function (color, alpha) {
      const match = /^#([0-9a-f]{6})$/i.exec(`${color}`)
      if (!match) {
        return color
      }
      const n = parseInt(match[1], 16)
      return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
    }
  }
}
</script>

<style scoped src="@/assets/variable-stats.css"></style>
<style scoped src="@/assets/trait-comparison.css"></style>
<style scoped>
/* The list of the traits and, on its right, the bin */
.stc-select {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.stc-select >>> .germplasm-filter-select {
  flex: 1 1 auto;
  min-width: 0;
}
.mtc-clear {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--cp-border);
  border-radius: 10px;
  background: var(--cp-surface);
  color: var(--cp-text);
  cursor: pointer;
}
.mtc-clear:hover:not(:disabled),
.mtc-clear:focus-visible {
  border-color: var(--cp-green);
  background: var(--cp-green-soft);
  color: var(--cp-green);
}
.mtc-clear:disabled {
  color: var(--cp-muted);
  opacity: 0.5;
  cursor: default;
}
/* The chosen traits: chips below the head */
.mtc-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0 1.25rem 1rem;
}
.mtc-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.35rem 0.2rem 0.75rem;
  border: 1px solid var(--cp-border);
  border-radius: 999px;
  background: var(--cp-green-soft);
  color: var(--cp-text);
  font-size: 0.85rem;
  white-space: nowrap;
}
.mtc-chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.3rem;
  height: 1.3rem;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--cp-muted);
  font-size: 0.75rem;
  cursor: pointer;
}
.mtc-chip-remove:hover,
.mtc-chip-remove:focus {
  background: var(--cp-surface);
  color: #dc3545;
}
.stc-icon >>> svg {
  width: 1.5rem;
  height: 1.5rem;
}
/* The chart and, while a heavy one is drawn, its loading over it */
.mtc-chart-area {
  position: relative;
  min-height: 120px;
}
.mtc-drawing {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: color-mix(in srgb, var(--cp-surface) 75%, transparent);
  color: var(--cp-muted);
  font-size: 0.9rem;
}
/* The views, as those of the statistics of a trait */
.mtc-views-wrap {
  margin: 0.25rem 0 1rem;
}
.mtc-views-wrap >>> .mtc-view-icon {
  width: 1.05em;
  height: 1.05em;
  fill: currentColor;
}
</style>
