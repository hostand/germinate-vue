<template>
  <!-- Relationship (a tab of the trials export, after Comparison): relationships between numeric traits in the chosen
       datasets. Two to eight traits (the same name, data type and unit in two datasets or more), chosen as chips.
       Their values are paired on the same unit, never as means of independent datasets:
       - plot (the experimental unit; the default): the same row of the pivoted data (the same germplasm, dataset, rep
         and block; several observations of a plot paired in their order);
       - accession: the mean of each accession within each trial.
       The coefficients of each trial apart and pooled within the trials (each trial centred on its own means first:
       a trial higher in both traits does not make them look related); missing values left out pair by pair (each
       coefficient with its n); fewer than three pairs: none.
       The views: the scatterplot of two of the traits (a colour and a trend line per trial; r and ρ in its corner), the
       correlation matrix (Pearson or Spearman; within the trials or of one trial; significance as stars) and the
       scatterplot matrix (six traits at most; very many units: a sample shown). Below: the statistics of every pair (a
       read-only table, downloadable). -->
  <section class="stc">
    <header class="stc-head">
      <span class="stc-icon" :style="{ '--stc-type-color': typeColor }" aria-hidden="true"><i class="fa-solid fa-handshake" /></span>
      <div class="stc-heading">
        <h3 class="stc-title">{{ vk('pageRelationshipTitle') }}</h3>
        <p class="stc-text">{{ vk('pageRelationshipText') }}</p>
      </div>
      <div class="stc-select trl-select">
        <div class="trl-select-row">
          <GermplasmFilterSelect id="trl-trait"
                                 :options="traitOptions"
                                 :value="null"
                                 :placeholder="selectedKeys.length >= MAX_TRAITS ? $t('pageComparisonMultiTraitMax', { count: MAX_TRAITS }) : $t('pageComparisonMultiTraitPlaceholder')"
                                 :loading="traitsLoading"
                                 countIcon="fa-solid fa-database"
                                 @select="addTrait"
                                 :key="`trl-select-${selectedKeys.length}`" />
          <button type="button"
                  class="trl-clear"
                  :disabled="selectedKeys.length < 1"
                  v-b-tooltip.hover
                  :title="$t('pageComparisonMultiTraitClear')"
                  :aria-label="$t('pageComparisonMultiTraitClear')"
                  @click="clearTrait">
            <i class="fa-solid fa-trash-can" aria-hidden="true" />
          </button>
        </div>
        <!-- The unit the values are paired on -->
        <div class="trl-units" role="radiogroup" :aria-label="vk('pageRelationshipUnit')" data-tour="unit">
          <span class="trl-units-label">{{ vk('pageRelationshipUnit') }}</span>
          <button type="button" role="radio" :aria-checked="unit === option.key ? 'true' : 'false'" :class="['trl-option', { active: unit === option.key }]" v-for="option in units" :key="`trl-unit-${option.key}`" @click="setUnit(option.key)">{{ option.text }}</button>
        </div>
      </div>
    </header>
    <!-- The chosen traits: a chip each, removable -->
    <div class="trl-chips" v-if="chosen.length > 0">
      <span class="trl-chip" v-for="trait in chosen" :key="`trl-chip-${trait.key}`">
        {{ getTraitLabel(trait) }}
        <button type="button" class="trl-chip-remove" :title="$t('genericRemove')" :aria-label="$t('genericRemove')" @click="removeTrait(trait.key)"><i class="fa-solid fa-xmark" aria-hidden="true" /></button>
      </span>
    </div>

    <div class="stc-body tvs" :id="id" v-if="chosen.length > 0">
      <p class="tvs-empty" v-if="!selected">{{ $t('pageComparisonMultiTraitChooseMore') }}</p>
      <div class="tvs-loading" v-else-if="rowsState === 'loading'"><b-spinner small /> {{ rowsProgress || $t('tooltipTableLoadingIndicator') }}</div>
      <div class="tvs-empty stc-confirm" v-else-if="rowsState === 'confirm'">
        <p><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ vk('pageComparisonSingleTraitLarge', { count: formatNumber(rowsTotal) }) }}</p>
        <button type="button" class="tvs-values-link" @click="loadRows"><i class="fa-solid fa-download" aria-hidden="true" /> {{ $t('pageTraitDetailsStatsLoadObservations') }}</button>
      </div>
      <p class="tvs-empty" v-else-if="rowsState === 'loaded' && pairedUnits.length < 3">{{ vk('pageRelationshipTooFew') }}</p>
      <template v-else-if="rowsState === 'loaded'">
        <!-- The numbers -->
        <div class="tvs-numbers">
          <div :class="['tvs-number', { 'is-danger': number.danger }]" v-for="number in numbers" :key="`trl-number-${number.key}`" :data-tour-number="number.key">
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
            <b-dropdown-item link-class="top-nav-menu-item" @click="$refs.baseChart.showColors()"><i class="fa-solid fa-palette fa-fw" aria-hidden="true" /> {{ $t('buttonChangeChartColors') }}</b-dropdown-item>
          </template>
          <template slot="additionalButtons">
            <b-button v-b-tooltip.hover :title="$t('chartTooltipMatrixTour')" :aria-label="$t('chartTooltipMatrixTour')" @click="$refs.tour.start()">
              <i class="fa-regular fa-circle-question" aria-hidden="true" />
            </b-button>
          </template>
          <div slot="chart" class="tvs-chart-wrap">
            <!-- The views -->
            <div class="tds trl-views-wrap">
              <div class="tds-views" role="tablist">
                <button type="button"
                        :class="['tds-view', { active: view === option.key }]"
                        :data-tour-view="option.key"
                        role="tab"
                        :aria-selected="view === option.key ? 'true' : 'false'"
                        v-for="option in views"
                        :key="`trl-view-${option.key}`"
                        @click="setView(option.key)">
                  <MdiIcon :path="option.path" className="trl-view-icon" /> {{ option.text }}
                </button>
              </div>
            </div>
            <!-- Scatterplot: its two traits -->
            <div class="trl-controls" v-if="view === 'scatter'">
              <label for="trl-x">{{ vk('pageRelationshipAxisX') }}</label>
              <select id="trl-x" class="trl-native" v-model="traitX" @change="draw">
                <option v-for="t in chosen" :key="`trl-x-${t.key}`" :value="t.key" :disabled="t.key === traitY">{{ getTraitLabel(t) }}</option>
              </select>
              <label for="trl-y">{{ vk('pageRelationshipAxisY') }}</label>
              <select id="trl-y" class="trl-native" v-model="traitY" @change="draw">
                <option v-for="t in chosen" :key="`trl-y-${t.key}`" :value="t.key" :disabled="t.key === traitX">{{ getTraitLabel(t) }}</option>
              </select>
            </div>
            <!-- Matrix: the coefficient, and of which trials -->
            <div class="trl-controls" v-if="view === 'matrix'">
              <button type="button" :class="['trl-option', { active: method === option.key }]" v-for="option in methodOptions" :key="`trl-method-${option.key}`" @click="setMethod(option.key)">{{ option.text }}</button>
              <label for="trl-scope">{{ vk('pageRelationshipScope') }}</label>
              <select id="trl-scope" class="trl-native" v-model="scope" @change="draw">
                <option value="within">{{ vk('pageRelationshipWithin') }}</option>
                <option v-for="d in usedDatasets" :key="`trl-scope-${d.datasetId}`" :value="d.datasetId">{{ d.datasetName }}</option>
              </select>
            </div>
            <p class="tvs-empty" v-if="view === 'splom' && chosen.length > SPLOM_MAX">{{ vk('pageRelationshipSplomMax', { count: SPLOM_MAX }) }}</p>
            <div class="trl-chart-area" v-show="chartShown">
              <div class="stc-chart" ref="chart" />
              <div class="trl-drawing" v-if="drawing"><b-spinner small /> {{ $t('tooltipTableLoadingIndicator') }}</div>
            </div>
          </div>
        </BaseChart>
        <!-- The statistics of every pair of traits, in each trial and within the trials: a read-only table -->
        <div class="stc-summary-wrap">
          <h4 class="stc-chart-title" data-tour="summary">{{ vk('pageRelationshipStatistics') }}</h4>
          <div class="stc-summary">
            <BaseTable :columns="statColumns"
                       :options="statOptions"
                       :getData="getStatData"
                       :getIds="null"
                       :downloadTable="downloadStats"
                       toolsLocked
                       :autoHideColumns="false"
                       :storeUrlParameters="false"
                       primary-key="rowKey"
                       :key="`trl-stats-${selectedKey}-${unit}`" />
          </div>
        </div>
      </template>
    </div>

    <!-- Tour explaining the unit, the numbers, the views, the table and the options -->
    <Tour :steps="tourSteps" modernLook ref="tour" />
  </section>
</template>

<script>
import BaseChart from '@/components/charts/BaseChart'
import BaseTable from '@/components/tables/BaseTable'
import GermplasmFilterSelect from '@/components/tables/GermplasmFilterSelect'
import MdiIcon from '@/components/icons/MdiIcon'
import Tour from '@/components/util/Tour'
import traitComparison, { getNumericComparable, CHART_HEIGHT } from '@/mixins/trait-comparison'
import { formatNumber, getDateTimeString, formatDate } from '@/mixins/formatting'
import { downloadBlob } from '@/mixins/util'
import { makeZip } from '@/mixins/zip'
import { mean, pearsonR, ranks, spearmanRho, correlationP, correlationCI } from '@/mixins/stats-math'
import { mdiChartScatterPlot, mdiGrid, mdiViewGrid } from '@mdi/js'

const Plotly = require('plotly.js/lib/core')
Plotly.register([
  require('plotly.js/lib/scatter'),
  require('plotly.js/lib/heatmap'),
  require('plotly.js/lib/splom')
])

const MAX_TRAITS = 8
// The scatterplot matrix: at most this many traits
const SPLOM_MAX = 6
// Above this many units, a chart shows an even sample of them (the coefficients always use all of them)
const POINTS_MAX = 3000

// A value of the data as a number (also with a decimal comma); null when not a number
const parseNumber = value => {
  const text = `${value === null || value === undefined ? '' : value}`.trim().replace(/^(-?\d+),(\d+)$/, '$1.$2')
  return text !== '' && isFinite(text) ? +text : null
}
// Stars of a p-value
const stars = p => p === null || p === undefined ? '' : (p < 0.001 ? '***' : (p < 0.01 ? '**' : (p < 0.05 ? '*' : '')))
// An even sample of at most max items
const sample = (items, max) => {
  if (items.length <= max) {
    return items
  }
  const step = items.length / max
  return Array.from({ length: max }, (_, i) => items[Math.floor(i * step)])
}

export default {
  components: {
    BaseChart,
    BaseTable,
    GermplasmFilterSelect,
    MdiIcon,
    Tour
  },
  // The traits of the datasets, the observations of the chosen traits, the theme and the downloads
  mixins: [traitComparison],
  data: function () {
    return {
      MAX_TRAITS,
      SPLOM_MAX,
      selectedKeys: [],
      // plot or accession
      unit: 'plot',
      // scatter, matrix or splom
      view: 'scatter',
      traitX: null,
      traitY: null,
      // pearson or spearman; within (the trials) or a dataset id
      method: 'pearson',
      scope: 'within',
      drawing: false,
      // The view last drawn in the chart (the scatterplot matrix and the others do not share their axes)
      drawnView: null,
      statOptions: {
        idColumn: 'rowKey',
        tableName: 'relationshipStatistics'
      }
    }
  },
  computed: {
    comparable: function () {
      return getNumericComparable(this.datasets, this.traitsByDataset)
    },
    traitOptions: function () {
      if (this.selectedKeys.length >= MAX_TRAITS) {
        return []
      }
      return this.comparable.filter(o => !this.selectedKeys.includes(o.key)).map(o => ({ value: o.key, name: this.getTraitLabel(o), count: o.datasetIds.length }))
    },
    chosen: function () {
      return this.selectedKeys.map(key => this.comparable.find(o => o.key === key)).filter(o => o)
    },
    // What is loaded: every chosen trait (two or more) in their datasets
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
      return { key: this.chosen.map(o => o.key).join('||'), name: 'relationship', datasetIds: this.datasets.map(d => d.datasetId).filter(id => datasetIds.includes(id)), traitIds }
    },
    keyByTraitId: function () {
      const map = {}
      this.chosen.forEach(o => o.traitIds.forEach(id => { map[id] = o.key }))
      return map
    },
    units: function () {
      return [{ key: 'plot', text: this.vk('pageRelationshipUnitPlot') }, { key: 'accession', text: this.vk('pageRelationshipUnitAccession') }]
    },
    methodOptions: function () {
      return [{ key: 'pearson', text: 'Pearson' }, { key: 'spearman', text: 'Spearman' }]
    },
    // The units with their values: { datasetId, germplasmId, germplasmName, rep, block, values: { traitKey: number } }.
    // Plot: a row of the pivoted data (several observations of a plot paired in their order); accession: the mean of
    // each accession in each trial
    unitRows: function () {
      const groups = {}
      this.rows.forEach((r, index) => {
        if (!r.traitKey) {
          return
        }
        const key = this.unit === 'plot' ? `${r.trialsetupId}` : `${r.datasetId}|${r.germplasmId}`
        const g = groups[key] = groups[key] || { datasetId: r.datasetId, germplasmId: r.germplasmId, germplasmName: r.germplasmName, rep: r.rep, block: r.block, day: r.recordingDate || '', byTrait: {} }
        ;(g.byTrait[r.traitKey] = g.byTrait[r.traitKey] || []).push(Object.assign({ index }, r))
      })
      const result = []
      Object.values(groups).forEach(g => {
        if (this.unit === 'accession') {
          const values = {}
          Object.keys(g.byTrait).forEach(k => {
            const numbers = g.byTrait[k].filter(o => o.value !== null).map(o => o.value)
            if (numbers.length > 0) {
              values[k] = mean(numbers)
            }
          })
          result.push({ datasetId: g.datasetId, germplasmId: g.germplasmId, germplasmName: g.germplasmName, rep: '', block: '', values })
          return
        }
        // A plot: the i-th observation of each trait together (in the order of their recording dates, then as they come)
        const lists = {}
        Object.keys(g.byTrait).forEach(k => {
          lists[k] = g.byTrait[k].sort((a, b) => `${a.recordingDate || ''}`.localeCompare(`${b.recordingDate || ''}`) || a.index - b.index)
        })
        const count = Math.max(...Object.values(lists).map(l => l.length))
        for (let i = 0; i < count; i++) {
          const values = {}
          Object.keys(lists).forEach(k => {
            const o = lists[k][i]
            if (o && o.value !== null) {
              values[k] = o.value
            }
          })
          result.push({ datasetId: g.datasetId, germplasmId: g.germplasmId, germplasmName: g.germplasmName, rep: g.rep, block: g.block, day: g.day, values })
        }
      })
      return result
    },
    // The units with values of two chosen traits or more
    pairedUnits: function () {
      return this.unitRows.filter(u => Object.keys(u.values).length > 1)
    },
    usedDatasets: function () {
      const ids = this.selected ? this.selected.datasetIds.filter(id => this.pairedUnits.some(u => u.datasetId === id)) : []
      const colors = this.getDistinctColors(ids.length)
      return ids.map((datasetId, index) => ({ datasetId, datasetName: this.datasetNames[datasetId] || `${datasetId}`, color: colors[index] }))
    },
    // Every pair of chosen traits: its statistics in each trial and within the trials
    pairs: function () {
      const result = []
      for (let i = 0; i < this.chosen.length; i++) {
        for (let j = i + 1; j < this.chosen.length; j++) {
          result.push(this.getPairStats(this.chosen[i], this.chosen[j]))
        }
      }
      return result
    },
    numbers: function () {
      const lonely = this.unitRows.filter(u => Object.keys(u.values).length === 1).length
      const numbers = [{
        key: 'traits',
        value: formatNumber(this.chosen.length),
        label: this.$t('pageComparisonMultiTraitTraits')
      }, {
        key: 'datasets',
        value: `${formatNumber(this.usedDatasets.length)} / ${formatNumber(this.selected ? this.selected.datasetIds.length : 0)}`,
        label: this.$t('pageComparisonSingleTraitDatasetsCompared')
      }, {
        key: 'units',
        value: formatNumber(this.pairedUnits.length),
        label: this.unit === 'plot' ? this.vk('pageRelationshipPairedPlots') : this.vk('pageRelationshipPairedAccessions')
      }, {
        key: 'germplasm',
        value: formatNumber(new Set(this.pairedUnits.map(u => u.germplasmId)).size),
        label: this.vk('pageComparisonSingleTraitGermplasm')
      }]
      if (lonely > 0) {
        numbers.push({ key: 'lonely', danger: true, value: formatNumber(lonely), label: this.vk('pageRelationshipLonely') })
      }
      return numbers
    },
    views: function () {
      return [{
        key: 'scatter',
        path: mdiChartScatterPlot,
        text: this.vk('pageRelationshipScatter')
      }, {
        key: 'matrix',
        path: mdiGrid,
        text: this.vk('pageRelationshipMatrix')
      }, {
        key: 'splom',
        path: mdiViewGrid,
        text: this.vk('pageRelationshipSplom')
      }]
    },
    currentViewText: function () {
      const view = this.views.find(v => v.key === this.view)
      return view ? view.text : ''
    },
    chartShown: function () {
      return !(this.view === 'splom' && this.chosen.length > SPLOM_MAX)
    },
    chartHeight: function () {
      if (this.view === 'matrix') {
        return Math.max(320, this.chosen.length * 70 + 140)
      }
      if (this.view === 'splom') {
        return Math.max(CHART_HEIGHT, Math.min(this.chosen.length, SPLOM_MAX) * 150 + 80)
      }
      return CHART_HEIGHT
    },
    // A row per pair of traits and trial, then within the trials
    statRows: function () {
      const rows = []
      this.pairs.forEach(pair => {
        pair.byDataset.concat([pair.within]).forEach(s => {
          rows.push({
            rowKey: `${pair.x.key}|${pair.y.key}|${s.datasetId}`,
            traitX: this.getTraitLabel(pair.x),
            traitY: this.getTraitLabel(pair.y),
            datasetName: s.datasetId === 'within' ? this.vk('pageRelationshipWithin') : (this.datasetNames[s.datasetId] || s.datasetId),
            n: s.n,
            r: s.r,
            ci: s.ci,
            rP: s.rP,
            rho: s.rho,
            rhoP: s.rhoP,
            r2: s.r === null ? null : s.r * s.r
          })
        })
      })
      return rows
    },
    statColumns: function () {
      const number = (key, label, formatter) => ({ key, type: Number, sortable: false, class: 'text-right', label, formatter })
      return [
        { key: 'traitX', type: String, sortable: false, label: this.vk('pageRelationshipTraitX') },
        { key: 'traitY', type: String, sortable: false, label: this.vk('pageRelationshipTraitY') },
        { key: 'datasetName', type: String, sortable: false, label: this.$t('tableColumnDatasetName') },
        number('n', 'n', value => formatNumber(value)),
        number('r', 'Pearson r', (value, key, item) => value === null ? '–' : `${this.formatCoefficient(value)}${stars(item.rP)}`),
        number('ci', this.vk('pageRelationshipCI'), value => value === null ? '–' : `${this.formatCoefficient(value[0])} – ${this.formatCoefficient(value[1])}`),
        number('rP', this.vk('pageRelationshipPValue', { name: 'r' }), value => this.formatP(value)),
        number('rho', 'Spearman ρ', (value, key, item) => value === null ? '–' : `${this.formatCoefficient(value)}${stars(item.rhoP)}`),
        number('rhoP', this.vk('pageRelationshipPValue', { name: 'ρ' }), value => this.formatP(value)),
        number('r2', 'R²', value => value === null ? '–' : this.formatFixed(value, 3))
      ]
    },
    // The help: the unit, the numbers, the views, the table, the options
    tourSteps: function () {
      const target = selector => () => `#${this.id} ${selector}`
      const texts = {
        traits: this.vk('pageRelationshipTourTraits'),
        datasets: this.vk('pageRelationshipTourDatasets'),
        units: this.vk('pageRelationshipTourUnits'),
        germplasm: this.vk('pageRelationshipTourGermplasm'),
        lonely: this.vk('pageRelationshipTourLonely')
      }
      const steps = [{
        title: () => this.vk('pageRelationshipUnit'),
        text: () => this.vk('pageRelationshipTourUnit'),
        target: () => '[data-tour="unit"]',
        position: 'bottom'
      }].concat(this.numbers.map(number => ({
        title: () => number.label,
        text: () => texts[number.key],
        target: target(`[data-tour-number="${number.key}"]`),
        position: 'bottom'
      })))
      const viewTexts = {
        scatter: this.vk('pageRelationshipTourScatter'),
        matrix: this.vk('pageRelationshipTourMatrix'),
        splom: this.vk('pageRelationshipTourSplom')
      }
      return steps.concat(this.views.map(view => ({
        title: () => view.text,
        text: () => viewTexts[view.key],
        target: target(`[data-tour-view="${view.key}"]`),
        position: 'bottom'
      }))).concat([{
        title: () => this.vk('pageRelationshipStatistics'),
        text: () => this.vk('pageRelationshipTourStatistics'),
        target: target('[data-tour="summary"]'),
        position: 'top'
      }, {
        title: () => this.$t('popoverChartTourGenericOptionsTitle'),
        text: () => this.vk('pageRelationshipTourOptions'),
        target: target('#additional-options'),
        position: 'bottom'
      }])
    }
  },
  watch: {
    unit: function () {
      this.$nextTick(() => this.draw())
    }
  },
  methods: {
    getTraitLabel: function (trait) {
      return trait.unitLabel ? `${trait.name} (${trait.unitLabel})` : trait.name
    },
    formatCoefficient: function (value) {
      const text = this.formatFixed(Math.abs(value), 2)
      return value < 0 ? `−${text}` : text
    },
    formatP: function (p) {
      if (p === null || p === undefined) {
        return '–'
      }
      return p < 0.001 ? '< 0.001' : this.formatFixed(p, 3)
    },
    // The statistics of two traits: in each trial (the units with both values) and within the trials (each trial
    // centred on its own means, its values ranked within it for Spearman)
    getPairStats: function (x, y) {
      const byDataset = []
      const centred = { x: [], y: [], rx: [], ry: [] }
      let trials = 0
      this.usedDatasets.forEach(d => {
        const units = this.pairedUnits.filter(u => u.datasetId === d.datasetId && u.values[x.key] !== undefined && u.values[y.key] !== undefined)
        const xs = units.map(u => u.values[x.key])
        const ys = units.map(u => u.values[y.key])
        const n = xs.length
        const r = pearsonR(xs, ys)
        const rho = spearmanRho(xs, ys)
        byDataset.push({ datasetId: d.datasetId, n, r, rP: r === null ? null : correlationP(r, n - 2), ci: r === null ? null : correlationCI(r, n), rho, rhoP: rho === null ? null : correlationP(rho, n - 2) })
        if (n >= 3) {
          trials++
          const mx = mean(xs)
          const my = mean(ys)
          const rx = ranks(xs)
          const ry = ranks(ys)
          const mr = (n + 1) / 2
          xs.forEach((v, i) => {
            centred.x.push(v - mx)
            centred.y.push(ys[i] - my)
            centred.rx.push(rx[i] - mr)
            centred.ry.push(ry[i] - mr)
          })
        }
      })
      // Within the trials: one mean less per trial for the degrees of freedom
      const n = centred.x.length
      const df = n - trials - 1
      const r = trials > 0 && df >= 1 ? pearsonR(centred.x, centred.y) : null
      const rho = trials > 0 && df >= 1 ? pearsonR(centred.rx, centred.ry) : null
      return {
        x,
        y,
        byDataset,
        within: { datasetId: 'within', n, r, rP: r === null ? null : correlationP(r, df), ci: r === null ? null : correlationCI(r, df + 2), rho, rhoP: rho === null ? null : correlationP(rho, df) }
      }
    },
    getPair: function (a, b) {
      return this.pairs.find(p => (p.x.key === a && p.y.key === b) || (p.x.key === b && p.y.key === a)) || null
    },
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
      // The traits of the scatterplot: the first two chosen when theirs are gone
      if (!this.selectedKeys.includes(this.traitX)) {
        this.traitX = this.selectedKeys[0] || null
      }
      if (!this.selectedKeys.includes(this.traitY) || this.traitY === this.traitX) {
        this.traitY = this.selectedKeys.find(k => k !== this.traitX) || null
      }
      if (this.selected) {
        this.prepareRows()
      } else {
        this.rowsState = 'none'
      }
    },
    clearTrait: function () {
      this.selectedKeys = []
      this.selectedKey = null
      this.traitX = null
      this.traitY = null
      this.rows = []
      this.rowsState = 'none'
    },
    // An observation: its plot, dataset, germplasm, trait (the key of its chosen trait) and value (null: not a number)
    toRow: function (o) {
      return { trialsetupId: o.trialsetupId, datasetId: o.datasetId, germplasmId: o.germplasmId, germplasmName: o.germplasmName, rep: o.rep, block: o.block, recordingDate: o.recordingDate || '', traitKey: this.keyByTraitId[o.traitId] || null, raw: o.traitValue, value: parseNumber(o.traitValue) }
    },
    setUnit: function (key) {
      this.unit = key
    },
    setView: function (key) {
      this.view = key
      this.$nextTick(() => this.draw())
    },
    setMethod: function (key) {
      this.method = key
      this.$nextTick(() => this.draw())
    },
    getStatData: function (request) {
      const page = Math.max(1, request.page || 1)
      const limit = request.limit || this.statRows.length
      request.page = page - 1
      return Promise.resolve({ data: { data: this.statRows.slice((page - 1) * limit, page * limit), count: this.statRows.length } })
    },
    downloadStats: function (request, callback) {
      const number = value => value === null || value === undefined ? '' : `${Math.round(value * 1000000) / 1000000}`
      const header = [this.vk('pageRelationshipTraitX'), this.vk('pageRelationshipTraitY'), this.$t('tableColumnDatasetName'), 'n', 'Pearson r', 'CI 95% low', 'CI 95% high', 'p (r)', 'Spearman rho', 'p (rho)', 'R2']
      const lines = [header.join('\t')].concat(this.statRows.map(r => [r.traitX, r.traitY, r.datasetName, r.n, number(r.r), r.ci ? number(r.ci[0]) : '', r.ci ? number(r.ci[1]) : '', number(r.rP), number(r.rho), number(r.rhoP), number(r.r2)].join('\t')))
      return this.resolveLater(callback, makeZip([{ name: `relationship-${this.unit}-statistics.txt`, content: lines.join('\r\n') }]))
    },
    // The paired units (dataset, germplasm, rep, block and a column per trait)
    downloadData: function () {
      const header = (this.isClimate ? ['dataset', 'location', 'date'] : ['dataset', 'germplasm', 'rep', 'block']).concat(this.chosen.map(t => this.getTraitLabel(t)))
      const lines = [header.join('\t')].concat(this.pairedUnits.map(u => [this.datasetNames[u.datasetId] || u.datasetId, u.germplasmName].concat(this.isClimate ? [this.unit === 'plot' ? (u.day || '') : ''] : [u.rep || '', u.block || '']).concat(this.chosen.map(t => u.values[t.key] === undefined ? '' : u.values[t.key])).join('\t')))
      downloadBlob({ blob: new Blob([lines.join('\r\n')], { type: 'text/plain' }), filename: `${this.getFileName()}-${getDateTimeString()}`, extension: 'txt' })
    },
    getFileName: function () {
      return `relationship-${this.unit}-${this.view}`
    },
    draw: function () {
      if (this.rowsState !== 'loaded' || this.pairedUnits.length < 3) {
        return
      }
      this.$nextTick(() => {
        const element = this.$refs.chart
        if (!element) {
          return
        }
        if (!this.chartShown) {
          Plotly.purge(element)
          this.drawnView = null
          return
        }
        // To or from the scatterplot matrix: the chart cleared first (its axes are of another kind)
        if (this.drawnView !== null && this.drawnView !== this.view && (this.drawnView === 'splom' || this.view === 'splom')) {
          Plotly.purge(element)
        }
        this.drawnView = this.view
        // The scatterplot matrix (heavy): its loading painted first
        if (this.view === 'splom') {
          this.drawing = true
          requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => {
            if (this.view === 'splom' && this.$refs.chart) {
              Plotly.purge(this.$refs.chart)
              this.drawSplom(this.$refs.chart)
            }
            this.drawing = false
          }, 0)))
        } else if (this.view === 'matrix') {
          this.drawMatrix(element)
        } else {
          this.drawScatter(element)
        }
      })
    },
    // The two traits chosen: a point per unit (a sample when very many), a colour and a trend line per trial; r and ρ
    // of each trial and within the trials in the corner
    drawScatter: function (element) {
      const theme = this.getTheme()
      const x = this.chosen.find(t => t.key === this.traitX)
      const y = this.chosen.find(t => t.key === this.traitY)
      if (!x || !y) {
        Plotly.purge(element)
        return
      }
      const pair = this.getPair(x.key, y.key)
      const statsOf = id => (pair.byDataset.find(s => s.datasetId === id) || {})
      const data = []
      this.usedDatasets.forEach(d => {
        const units = this.pairedUnits.filter(u => u.datasetId === d.datasetId && u.values[x.key] !== undefined && u.values[y.key] !== undefined)
        if (units.length < 1) {
          return
        }
        const shown = sample(units, Math.ceil(POINTS_MAX / Math.max(this.usedDatasets.length, 1)))
        data.push({
          type: 'scatter',
          mode: 'markers',
          name: d.datasetName,
          legendgroup: `d${d.datasetId}`,
          x: shown.map(u => u.values[x.key]),
          y: shown.map(u => u.values[y.key]),
          text: shown.map(u => `${u.germplasmName}${this.unit === 'plot' ? (this.isClimate ? (u.day ? ` · ${formatDate(u.day)}` : '') : (u.rep || u.block ? ` · rep ${u.rep || '–'} · block ${u.block || '–'}` : '')) : ''}`),
          marker: { color: d.color, size: 7, opacity: 0.7 },
          hoverlabel: theme.hoverlabel,
          hovertemplate: `<b>%{text}</b><br>${d.datasetName}<br>%{x:.2f} · %{y:.2f}<extra></extra>`
        })
        // The trend line (least squares) of the trial
        const xs = units.map(u => u.values[x.key])
        const ys = units.map(u => u.values[y.key])
        const s = statsOf(d.datasetId)
        if (xs.length >= 3 && s.r !== null && s.r !== undefined) {
          const mx = mean(xs)
          const my = mean(ys)
          const sxx = xs.reduce((sum, v) => sum + (v - mx) * (v - mx), 0)
          const slope = xs.reduce((sum, v, i) => sum + (v - mx) * (ys[i] - my), 0) / sxx
          const lo = Math.min(...xs)
          const hi = Math.max(...xs)
          data.push({
            type: 'scatter',
            mode: 'lines',
            name: d.datasetName,
            legendgroup: `d${d.datasetId}`,
            showlegend: false,
            x: [lo, hi],
            y: [my + slope * (lo - mx), my + slope * (hi - mx)],
            line: { color: d.color, width: 2 },
            hoverinfo: 'skip'
          })
        }
      })
      const lines = this.usedDatasets.map(d => {
        const s = statsOf(d.datasetId)
        return s.r === null || s.r === undefined ? null : `<span style="color:${d.color}">●</span> r = ${this.formatCoefficient(s.r)}${stars(s.rP)} · ρ = ${s.rho === null ? '–' : this.formatCoefficient(s.rho) + stars(s.rhoP)} · n = ${formatNumber(s.n)}`
      }).filter(l => l)
      if (pair.within.r !== null) {
        lines.push(`<b>${this.vk('pageRelationshipWithin')}</b>: r = ${this.formatCoefficient(pair.within.r)}${stars(pair.within.rP)} · ρ = ${pair.within.rho === null ? '–' : this.formatCoefficient(pair.within.rho) + stars(pair.within.rhoP)}`)
      }
      Plotly.react(element, data, this.getLayout({
        showlegend: true,
        legend: { orientation: 'h', x: 0, y: 1.08, yanchor: 'bottom', font: { color: theme.text } },
        margin: { t: 40, r: 20, b: 60, l: 70 },
        xaxis: { title: { text: this.getTraitLabel(x), font: { color: theme.muted } }, gridcolor: theme.grid, zeroline: false, tickfont: { color: theme.muted } },
        yaxis: { title: { text: this.getTraitLabel(y), font: { color: theme.muted } }, gridcolor: theme.grid, zeroline: false, tickfont: { color: theme.muted } },
        annotations: [{ xref: 'paper', yref: 'paper', x: 0.01, y: 0.99, xanchor: 'left', yanchor: 'top', align: 'left', showarrow: false, text: lines.join('<br>'), font: { color: theme.text, size: 11 }, bgcolor: this.storeDarkMode ? 'rgba(38, 42, 43, 0.85)' : 'rgba(255, 255, 255, 0.85)', bordercolor: theme.grid, borderpad: 6 }]
      }), { displayModeBar: false, responsive: true })
    },
    // Traits × traits: the coefficient (Pearson or Spearman; within the trials or of one) as the colour (−1 blue, 0
    // white, +1 red) and written with its stars; blank: fewer than three pairs
    drawMatrix: function (element) {
      const theme = this.getTheme()
      const labels = this.chosen.map(t => this.getTraitLabel(t))
      const pick = (pair, field) => {
        const s = this.scope === 'within' ? pair.within : pair.byDataset.find(b => `${b.datasetId}` === `${this.scope}`)
        return s ? s[field] : null
      }
      const coefficient = this.method === 'pearson' ? 'r' : 'rho'
      const pValue = this.method === 'pearson' ? 'rP' : 'rhoP'
      const z = []
      const text = []
      const custom = []
      this.chosen.forEach((a, i) => {
        const row = []
        const rowText = []
        const rowCustom = []
        this.chosen.forEach((b, j) => {
          if (i === j) {
            row.push(1)
            rowText.push('1')
            rowCustom.push(['', ''])
            return
          }
          const pair = this.getPair(a.key, b.key)
          const value = pick(pair, coefficient)
          const p = pick(pair, pValue)
          const n = pick(pair, 'n')
          row.push(value)
          rowText.push(value === null || value === undefined ? '' : `${this.formatCoefficient(value)}${stars(p)}`)
          rowCustom.push([this.formatP(p), formatNumber(n || 0)])
        })
        z.push(row)
        text.push(rowText)
        custom.push(rowCustom)
      })
      Plotly.react(element, [{
        type: 'heatmap',
        x: labels,
        y: labels,
        z,
        text,
        customdata: custom,
        texttemplate: '%{text}',
        zmin: -1,
        zmax: 1,
        zmid: 0,
        xgap: 2,
        ygap: 2,
        colorscale: [[0, '#2166ac'], [0.25, '#67a9cf'], [0.5, '#f7f7f7'], [0.75, '#ef8a62'], [1, '#b2182b']],
        colorbar: { title: { text: this.method === 'pearson' ? 'r' : 'ρ', font: { color: theme.muted } }, tickfont: { color: theme.muted }, thickness: 12 },
        hoverongaps: false,
        hoverlabel: theme.hoverlabel,
        hovertemplate: `<b>%{y}</b><br>%{x}<br>${this.method === 'pearson' ? 'r' : 'ρ'} = %{z:.3f} · p = %{customdata[0]} · n = %{customdata[1]}<extra></extra>`
      }], this.getLayout({
        height: this.chartHeight,
        margin: { t: 10, r: 20, b: 20, l: 20 },
        xaxis: { tickfont: { color: theme.text }, automargin: true, fixedrange: true, side: 'bottom' },
        yaxis: { tickfont: { color: theme.text }, automargin: true, fixedrange: true, autorange: 'reversed' }
      }), { displayModeBar: false, responsive: true })
    },
    // Every pair of the traits (six at most) as a small scatterplot, a point per unit with every one of them (a sample
    // when very many) in the colour of its trial
    drawSplom: function (element) {
      const theme = this.getTheme()
      const traits = this.chosen.slice(0, SPLOM_MAX)
      const units = sample(this.pairedUnits.filter(u => traits.every(t => u.values[t.key] !== undefined)), POINTS_MAX)
      const colorOf = {}
      this.usedDatasets.forEach(d => { colorOf[d.datasetId] = d.color })
      const axis = { gridcolor: theme.grid, zeroline: false, tickfont: { color: theme.muted, size: 9 }, showline: false }
      const layout = this.getLayout({
        height: this.chartHeight,
        margin: { t: 20, r: 20, b: 60, l: 70 },
        showlegend: false
      })
      traits.forEach((t, i) => {
        layout[`xaxis${i === 0 ? '' : i + 1}`] = Object.assign({}, axis)
        layout[`yaxis${i === 0 ? '' : i + 1}`] = Object.assign({}, axis)
      })
      Plotly.react(element, [{
        type: 'splom',
        dimensions: traits.map(t => ({ label: this.getTraitLabel(t), values: units.map(u => u.values[t.key]) })),
        text: units.map(u => `${u.germplasmName} · ${this.datasetNames[u.datasetId] || u.datasetId}`),
        marker: { color: units.map(u => colorOf[u.datasetId]), size: 5, opacity: 0.7, line: { width: 0 } },
        // The diagonal shown: every axis in use (hidden together with the upper half, the first and the last dimension
        // lack an axis and Plotly fails)
        diagonal: { visible: true },
        showupperhalf: false,
        hoverlabel: theme.hoverlabel,
        hovertemplate: '%{text}<br>%{xaxis.title.text}: %{x:.2f}<br>%{yaxis.title.text}: %{y:.2f}<extra></extra>'
      }], layout, { displayModeBar: false, responsive: true })
    }
  }
}
</script>

<style scoped src="@/assets/variable-stats.css"></style>
<style scoped src="@/assets/trait-comparison.css"></style>
<style scoped>
.stc-icon i {
  color: var(--stc-type-color);
  font-size: 1.3rem;
}
/* The list of the traits (and its bin), the unit below */
.trl-select {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.trl-select-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.trl-select-row >>> .germplasm-filter-select {
  flex: 1 1 auto;
  min-width: 0;
}
.trl-clear {
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
.trl-clear:hover:not(:disabled),
.trl-clear:focus-visible {
  border-color: var(--cp-green);
  background: var(--cp-green-soft);
  color: var(--cp-green);
}
.trl-clear:disabled {
  color: var(--cp-muted);
  opacity: 0.5;
  cursor: default;
}
.trl-units {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
}
.trl-units-label {
  margin-right: 0.25rem;
  color: var(--cp-text-subtle, var(--cp-muted));
}
/* A choice among a few (unit, coefficient): pills */
.trl-option {
  padding: 0.2rem 0.75rem;
  border: 1px solid var(--cp-border);
  border-radius: 999px;
  background: var(--cp-surface);
  color: var(--cp-text);
  font-size: 0.82rem;
  cursor: pointer;
}
.trl-option:hover,
.trl-option:focus-visible {
  border-color: var(--cp-green);
}
.trl-option.active {
  border-color: var(--cp-green);
  background: var(--cp-green-soft);
  color: var(--cp-green);
  font-weight: 600;
}
/* The chosen traits: chips below the head */
.trl-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0 1.25rem 1rem;
}
.trl-chip {
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
.trl-chip-remove {
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
.trl-chip-remove:hover,
.trl-chip-remove:focus {
  background: var(--cp-surface);
  color: #dc3545;
}
/* The views, as those of the statistics of a trait */
.trl-views-wrap {
  margin: 0.25rem 0 0.75rem;
}
.trl-views-wrap >>> .trl-view-icon {
  width: 1.05em;
  height: 1.05em;
  fill: currentColor;
}
/* The controls of a view */
.trl-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.6rem;
  margin-bottom: 0.75rem;
  color: var(--cp-text-subtle, var(--cp-muted));
  font-size: 0.85rem;
}
.trl-native {
  max-width: 22rem;
  height: 36px;
  padding: 0 0.6rem;
  border: 1px solid var(--cp-border);
  border-radius: 10px;
  background: var(--cp-surface);
  color: var(--cp-text);
  font-size: 0.85rem;
}
.trl-native:focus {
  border-color: var(--cp-green);
  outline: none;
  box-shadow: 0 0 0 3px var(--cp-green-soft);
}
/* The chart and, while the scatterplot matrix is drawn, its loading over it */
.trl-chart-area {
  position: relative;
  min-height: 120px;
}
.trl-drawing {
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
</style>
