<template>
  <!-- Temporal comparison (the Comparison tab of the trials export): a numeric trait over time in the chosen datasets.
       The date of a value comes from a date trait recorded on the same plot (as in the COUSIN data: "Root rot" and
       "Root rot date"), not from the recording date of the observation (often not given): the value and the date are
       on the same row of the pivoted data (the same germplasm, dataset, rep and block; several observations of a plot
       paired in their order: the dates by date, the values by recording date, then as they come).
       First a date trait (the same name in two datasets or more, whatever its id); its observations and those of the
       numeric traits of its datasets loaded (in pages; very many: once confirmed). Its trait of values: the one whose
       short name is that of the date without "_OD" (e.g. PLANTWG for PLANTWG_OD), taken at once; else, chosen by the
       user among the numeric traits on 100 % of its rows (on each of their plots as many values as dates).
       The views: the line chart (the mean of each date, a line per trial), the growth curves (days since the first
       measurement of each trial: the trials of different seasons on one axis; a thin line per germplasm, the mean of
       the trial in bold), the heatmap trial × date and the first against the last measurement (a germplasm of a trial
       a point; above the diagonal: it grew). The line chart and the heatmap: by date, by day of the year (the seasons
       of different years together) or by days since the first measurement. Below: the summary by trial (a read-only
       table, downloadable). -->
  <section class="stc">
    <header class="stc-head">
      <span class="stc-icon" :style="{ '--stc-type-color': typeColor }" aria-hidden="true"><i class="fa-solid fa-hourglass-half" /></span>
      <div class="stc-heading">
        <h3 class="stc-title">{{ $t('pageComparisonTemporalTitle') }}</h3>
        <p class="stc-text">{{ $t('pageComparisonTemporalText') }}</p>
      </div>
      <div class="stc-select">
        <GermplasmFilterSelect id="tmc-date"
                               :options="dateOptions"
                               :value="selectedKey"
                               :placeholder="$t('pageComparisonTemporalDatePlaceholder')"
                               :loading="traitsLoading"
                               countIcon="fa-solid fa-database"
                               @select="selectTrait"
                               @clear="clearTrait" />
        <!-- Not paired by the short names: the trait of the values chosen among those on every row of the date -->
        <GermplasmFilterSelect id="tmc-value"
                               :options="valueOptions"
                               :value="valueKey"
                               :placeholder="$t('pageComparisonTemporalValuePlaceholder')"
                               countIcon="fa-solid fa-calendar-check"
                               @select="selectValue"
                               @clear="clearValue"
                               v-if="selected && rowsState === 'loaded' && !shortMatch && valueOptions.length > 0" />
      </div>
    </header>

    <div class="stc-body tvs" :id="id" v-if="selected">
      <div class="tvs-loading" v-if="rowsState === 'loading'"><b-spinner small /> {{ rowsProgress || $t('tooltipTableLoadingIndicator') }}</div>
      <div class="tvs-empty stc-confirm" v-else-if="rowsState === 'confirm'">
        <p><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ $t('pageComparisonSingleTraitLarge', { count: formatNumber(rowsTotal) }) }}</p>
        <button type="button" class="tvs-values-link" @click="loadRows"><i class="fa-solid fa-download" aria-hidden="true" /> {{ $t('pageTraitDetailsStatsLoadObservations') }}</button>
      </div>
      <template v-else-if="rowsState === 'loaded'">
        <p class="tvs-empty" v-if="valueOptions.length < 1">{{ $t('pageComparisonTemporalNoValues') }}</p>
        <p class="tvs-empty" v-else-if="valueTrait && usedDatasets.length < 2">{{ $t('pageComparisonTemporalTooFew') }}</p>
        <template v-else-if="valueTrait">
          <!-- The numbers -->
          <div class="tvs-numbers">
            <div :class="['tvs-number', { 'is-danger': number.danger }]" v-for="number in numbers" :key="`tmc-number-${number.key}`" :data-tour-number="number.key">
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
              <b-dropdown-item link-class="top-nav-menu-item" @click="downloadChart('chart', 'png')"><i class="fa-solid fa-image fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadPng') }}</b-dropdown-item>
              <b-dropdown-item link-class="top-nav-menu-item" @click="downloadChart('chart', 'svg')"><i class="fa-solid fa-file-code fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadSvg') }}</b-dropdown-item>
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
              <div class="tds tmc-views-wrap">
                <div class="tds-views" role="tablist">
                  <button type="button"
                          :class="['tds-view', { active: view === option.key }]"
                          :data-tour-view="option.key"
                          role="tab"
                          :aria-selected="view === option.key ? 'true' : 'false'"
                          v-for="option in views"
                          :key="`tmc-view-${option.key}`"
                          @click="setView(option.key)">
                    <MdiIcon :path="option.path" className="tmc-view-icon" /> {{ option.text }}
                  </button>
                </div>
              </div>
              <!-- The time axis of the line chart and the heatmap -->
              <div class="tmc-axis" v-if="view === 'line' || view === 'heatmap'" data-tour="axis">
                <span class="tmc-axis-label">{{ $t('pageComparisonTemporalAxis') }}</span>
                <button type="button" :class="['tmc-axis-option', { active: axis === option.key }]" v-for="option in axes" :key="`tmc-axis-${option.key}`" @click="setAxis(option.key)">{{ option.text }}</button>
              </div>
              <p class="tvs-empty" v-if="view === 'growth' && !hasCurves">{{ $t('pageComparisonTemporalOneDate') }}</p>
              <p class="tvs-empty" v-else-if="view === 'firstlast' && firstLast.length < 1">{{ $t('pageComparisonTemporalNoFirstLast') }}</p>
              <div class="stc-chart" ref="chart" v-show="chartShown" />
            </div>
          </BaseChart>
          <!-- The numbers of each trial: a read-only table (its tools shown, inactive), downloadable -->
          <div class="stc-summary-wrap">
            <h4 class="stc-chart-title" data-tour="summary">{{ $t('pageComparisonTemporalSummary') }}</h4>
            <div class="stc-summary">
              <BaseTable :columns="summaryColumns"
                         :options="summaryOptions"
                         :getData="getSummaryData"
                         :getIds="null"
                         :downloadTable="downloadSummary"
                         toolsLocked
                         :autoHideColumns="false"
                         :storeUrlParameters="false"
                         primary-key="datasetId"
                         :key="`tmc-summary-${selectedKey}-${valueKey}`" />
            </div>
          </div>
        </template>
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
import MdiIcon from '@/components/icons/MdiIcon'
import Tour from '@/components/util/Tour'
import traitComparison, { normalize, getNumericComparable, CHART_HEIGHT } from '@/mixins/trait-comparison'
import { formatNumber, formatDecimals, getDateTimeString } from '@/mixins/formatting'
import { downloadBlob } from '@/mixins/util'
import { makeZip } from '@/mixins/zip'
import { mean } from '@/mixins/stats-math'
import { getGradientScale } from '@/mixins/chart-palettes'
import { mdiChartLine, mdiSprout, mdiGrid, mdiArrowTopRight } from '@mdi/js'

const Plotly = require('plotly.js/lib/core')
Plotly.register([
  require('plotly.js/lib/scatter'),
  require('plotly.js/lib/heatmap')
])

const DAY = 86400000
// Growth curves: at most this many germplasm lines per trial (thin, behind its mean)
const GROWTH_LINES = 40

// A value of the data as a number (also with a decimal comma); null when not a number
const parseNumber = value => {
  const text = `${value === null || value === undefined ? '' : value}`.trim().replace(/^(-?\d+),(\d+)$/, '$1.$2')
  return text !== '' && isFinite(text) ? +text : null
}
// A date of the data as its day (UTC midnight, ms): "YYYY-MM-DD" (also with a time), "YYYYMMDD", "DD/MM/YYYY" or an
// Excel serial day; null when not a date
const parseDay = value => {
  const text = `${value === null || value === undefined ? '' : value}`.trim()
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text)
  if (match) {
    return Date.UTC(+match[1], +match[2] - 1, +match[3])
  }
  match = /^(\d{4})(\d{2})(\d{2})$/.exec(text)
  if (match) {
    return Date.UTC(+match[1], +match[2] - 1, +match[3])
  }
  match = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(text)
  if (match) {
    return Date.UTC(+match[3], +match[2] - 1, +match[1])
  }
  if (/^\d{5}(\.\d+)?$/.test(text)) {
    const serial = Math.floor(+text)
    if (serial > 20000 && serial < 80000) {
      return (serial - 25569) * DAY
    }
  }
  return null
}
const isoDay = day => new Date(day).toISOString().substring(0, 10)
// A day as the same day in the year 2000 (a leap year): the seasons of different years on one axis
const yearDay = day => {
  const d = new Date(day)
  return Date.UTC(2000, d.getUTCMonth(), d.getUTCDate())
}

export default {
  components: {
    BaseChart,
    BaseTable,
    GermplasmFilterSelect,
    MdiIcon,
    Tour
  },
  // The traits of the datasets, the date trait chosen, the observations, the theme and the downloads
  mixins: [traitComparison],
  data: function () {
    return {
      // The numeric trait chosen among those on the rows of the date trait (its key)
      valueKey: null,
      // line, growth, heatmap or firstlast
      view: 'line',
      // The time of the line chart and the heatmap: date, year (day of the year) or days (since the first measurement)
      axis: 'date',
      summaryOptions: {
        idColumn: 'datasetId',
        tableName: 'comparisonTemporal'
      }
    }
  },
  computed: {
    // The date traits with the same name in two datasets or more (whatever their ids)
    comparable: function () {
      const variants = {}
      this.datasets.forEach(d => {
        ;(this.traitsByDataset[d.datasetId] || []).filter(t => t.dataType === 'date').forEach(t => {
          const key = `d:${normalize(t.traitName)}`
          const variant = variants[key] = variants[key] || { key, name: `${t.traitName}`.trim(), datasetIds: [], traitIds: [] }
          if (!variant.datasetIds.includes(d.datasetId)) {
            variant.datasetIds.push(d.datasetId)
          }
          if (!variant.traitIds.includes(t.traitId)) {
            variant.traitIds.push(t.traitId)
          }
        })
      })
      return Object.values(variants).filter(v => v.datasetIds.length > 1).sort((a, b) => a.name.localeCompare(b.name))
    },
    dateOptions: function () {
      return this.comparable.map(o => ({ value: o.key, name: o.name, count: o.datasetIds.length }))
    },
    dateTrait: function () {
      return this.comparable.find(o => o.key === this.selectedKey) || null
    },
    // The numeric traits of the datasets of the date trait (the same name and unit in two of them or more)
    numericTraits: function () {
      if (!this.dateTrait) {
        return []
      }
      const datasets = this.datasets.filter(d => this.dateTrait.datasetIds.includes(d.datasetId))
      return getNumericComparable(datasets, this.traitsByDataset)
    },
    // What is loaded: the date trait and those numeric traits, in the datasets of the date trait (replaces the trait of
    // the mixin)
    selected: function () {
      if (!this.dateTrait) {
        return null
      }
      const traitIds = this.dateTrait.traitIds.slice()
      this.numericTraits.forEach(t => t.traitIds.forEach(id => { if (!traitIds.includes(id)) traitIds.push(id) }))
      return { key: this.dateTrait.key, name: this.dateTrait.name, datasetIds: this.datasetIdsOfDate, traitIds }
    },
    datasetIdsOfDate: function () {
      return this.dateTrait ? this.datasets.map(d => d.datasetId).filter(id => this.dateTrait.datasetIds.includes(id)) : []
    },
    // A trait id: the date trait ('date') or the key of its numeric trait
    roleByTraitId: function () {
      const map = {}
      if (this.dateTrait) {
        this.dateTrait.traitIds.forEach(id => { map[id] = 'date' })
      }
      this.numericTraits.forEach(t => t.traitIds.forEach(id => { if (!map[id]) map[id] = t.key }))
      return map
    },
    // The values of every numeric trait paired with the dates of their rows: { traitKey: [pair] } and the values
    // without a date, by trait. A plot (trialsetup) with several observations: the i-th date with the i-th value
    paired: function () {
      const plots = {}
      this.rows.forEach((r, index) => {
        if (!r.role) {
          return
        }
        const plot = plots[r.trialsetupId] = plots[r.trialsetupId] || { dates: [], values: {} }
        if (r.role === 'date') {
          if (r.day !== null) {
            plot.dates.push(r)
          }
        } else {
          (plot.values[r.role] = plot.values[r.role] || []).push(Object.assign({ index }, r))
        }
      })
      const pairs = {}
      const unpaired = {}
      const matched = {}
      const total = {}
      Object.values(plots).forEach(plot => {
        plot.dates.sort((a, b) => a.day - b.day)
        Object.keys(plot.values).forEach(key => {
          matched[key] = (matched[key] || 0) + Math.min(plot.dates.length, plot.values[key].length)
          total[key] = (total[key] || 0) + Math.max(plot.dates.length, plot.values[key].length)
          const values = plot.values[key].sort((a, b) => `${a.recordingDate || ''}`.localeCompare(`${b.recordingDate || ''}`) || a.index - b.index)
          values.forEach((v, i) => {
            const date = plot.dates[i]
            if (date && v.value !== null) {
              (pairs[key] = pairs[key] || []).push({ datasetId: v.datasetId, germplasmId: v.germplasmId, germplasmName: v.germplasmName, rep: v.rep, block: v.block, day: date.day, value: v.value })
            } else if (!date) {
              unpaired[key] = (unpaired[key] || 0) + 1
            }
          })
        })
      })
      // The share of the rows of a trait that have a date (and of the dates of its plots that have a value)
      const coincidence = {}
      Object.keys(total).forEach(key => { coincidence[key] = total[key] > 0 ? matched[key] / total[key] : 0 })
      return { pairs, unpaired, coincidence }
    },
    // The short name of each trait (by its id)
    shortById: function () {
      const map = {}
      Object.values(this.traitsByDataset).forEach(list => (list || []).forEach(t => { map[t.traitId] = `${t.traitNameShort || ''}`.trim() }))
      return map
    },
    // The trait of the values of the date trait by their short names: VALUE for VALUE_OD (case ignored); null: none
    shortMatch: function () {
      if (!this.dateTrait) {
        return null
      }
      const dates = this.dateTrait.traitIds.map(id => this.shortById[id]).filter(short => /_OD$/i.test(short))
      for (const trait of this.numericTraits) {
        for (const id of trait.traitIds) {
          const short = this.shortById[id]
          const date = short ? dates.find(d => d.toLowerCase() === `${short}_od`.toLowerCase()) : null
          if (date) {
            return { key: trait.key, valueShort: short, dateShort: date }
          }
        }
      }
      return null
    },
    // The list of the values: the trait paired by the short names; else the numeric traits on 100 % of the rows of
    // the date ("name (unit)"; their number of values with a date)
    valueOptions: function () {
      const traits = this.shortMatch
        ? this.numericTraits.filter(t => t.key === this.shortMatch.key)
        : this.numericTraits.filter(t => this.paired.coincidence[t.key] === 1)
      return traits.map(t => ({
        value: t.key,
        name: t.unitLabel ? `${t.name} (${t.unitLabel})` : t.name,
        count: (this.paired.pairs[t.key] || []).length
      })).filter(o => o.count > 0).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    },
    valueTrait: function () {
      return this.valueKey ? this.numericTraits.find(t => t.key === this.valueKey) || null : null
    },
    unit: function () {
      return this.valueTrait ? (this.valueTrait.unitLabel || '') : ''
    },
    // The values with a date of the chosen trait
    pairs: function () {
      return this.valueTrait ? (this.paired.pairs[this.valueTrait.key] || []) : []
    },
    // The datasets with values with a date (a colour each), their first day
    usedDatasets: function () {
      const ids = this.datasetIdsOfDate.filter(id => this.pairs.some(p => p.datasetId === id))
      const colors = this.getDistinctColors(ids.length)
      return ids.map((datasetId, index) => {
        const days = this.pairs.filter(p => p.datasetId === datasetId).map(p => p.day)
        return { datasetId, datasetName: this.datasetNames[datasetId] || `${datasetId}`, color: colors[index], first: Math.min(...days), last: Math.max(...days) }
      })
    },
    // Growth curves: a trial with two dates or more (one date in each: no curve)
    hasCurves: function () {
      return this.usedDatasets.some(d => d.last > d.first)
    },
    chartShown: function () {
      return !(this.view === 'growth' && !this.hasCurves) && !(this.view === 'firstlast' && this.firstLast.length < 1)
    },
    firstDayOf: function () {
      const map = {}
      this.usedDatasets.forEach(d => { map[d.datasetId] = d.first })
      return map
    },
    // Each trial, each germplasm: its mean at its first and at its last date (two dates or more)
    firstLast: function () {
      const groups = {}
      this.pairs.forEach(p => {
        const key = `${p.datasetId}|${p.germplasmId}`
        const g = groups[key] = groups[key] || { datasetId: p.datasetId, germplasmName: p.germplasmName, byDay: {} }
        ;(g.byDay[p.day] = g.byDay[p.day] || []).push(p.value)
      })
      return Object.values(groups).map(g => {
        const days = Object.keys(g.byDay).map(Number).sort((a, b) => a - b)
        if (days.length < 2) {
          return null
        }
        return { datasetId: g.datasetId, germplasmName: g.germplasmName, firstDay: days[0], lastDay: days[days.length - 1], first: mean(g.byDay[days[0]]), last: mean(g.byDay[days[days.length - 1]]) }
      }).filter(g => g)
    },
    datasetStats: function () {
      return this.usedDatasets.map(d => {
        const pairs = this.pairs.filter(p => p.datasetId === d.datasetId)
        const atFirst = pairs.filter(p => p.day === d.first).map(p => p.value)
        const atLast = pairs.filter(p => p.day === d.last).map(p => p.value)
        const span = Math.round((d.last - d.first) / DAY)
        const firstMean = atFirst.length > 0 ? mean(atFirst) : null
        const lastMean = atLast.length > 0 ? mean(atLast) : null
        const change = firstMean !== null && lastMean !== null ? lastMean - firstMean : null
        return {
          datasetId: d.datasetId,
          datasetName: d.datasetName,
          n: pairs.length,
          germplasm: new Set(pairs.map(p => p.germplasmId)).size,
          dates: new Set(pairs.map(p => p.day)).size,
          first: isoDay(d.first),
          last: isoDay(d.last),
          span,
          firstMean,
          lastMean,
          change,
          rate: change !== null && span > 0 ? change / span : null
        }
      })
    },
    numbers: function () {
      const unpaired = this.valueTrait ? (this.paired.unpaired[this.valueTrait.key] || 0) : 0
      const numbers = [{
        key: 'datasets',
        value: `${formatNumber(this.usedDatasets.length)} / ${formatNumber(this.datasetIdsOfDate.length)}`,
        label: this.$t('pageComparisonSingleTraitDatasetsCompared')
      }, {
        key: 'pairs',
        value: formatNumber(this.pairs.length),
        label: this.$t('pageComparisonTemporalPairs')
      }, {
        key: 'dates',
        value: formatNumber(new Set(this.pairs.map(p => p.day)).size),
        label: this.$t('pageComparisonTemporalDates')
      }, {
        key: 'germplasm',
        value: formatNumber(new Set(this.pairs.map(p => p.germplasmId)).size),
        label: this.$t('pageComparisonSingleTraitGermplasm')
      }]
      if (unpaired > 0) {
        numbers.push({ key: 'unpaired', danger: true, value: formatNumber(unpaired), label: this.$t('pageComparisonTemporalUnpaired') })
      }
      return numbers
    },
    views: function () {
      return [{
        key: 'line',
        path: mdiChartLine,
        text: this.$t('pageComparisonTemporalLine')
      }, {
        key: 'growth',
        path: mdiSprout,
        text: this.$t('pageComparisonTemporalGrowth')
      }, {
        key: 'heatmap',
        path: mdiGrid,
        text: this.$t('pageComparisonTemporalHeatmap')
      }, {
        key: 'firstlast',
        path: mdiArrowTopRight,
        text: this.$t('pageComparisonTemporalFirstLast')
      }]
    },
    axes: function () {
      return [{
        key: 'date',
        text: this.$t('pageComparisonTemporalAxisDate')
      }, {
        key: 'year',
        text: this.$t('pageComparisonTemporalAxisYear')
      }, {
        key: 'days',
        text: this.$t('pageComparisonTemporalAxisDays')
      }]
    },
    currentViewText: function () {
      const view = this.views.find(v => v.key === this.view)
      return view ? view.text : ''
    },
    chartHeight: function () {
      return this.view === 'heatmap' ? Math.max(260, this.usedDatasets.length * 60 + 130) : CHART_HEIGHT
    },
    summaryColumns: function () {
      const number = (key, label, formatter) => ({ key, type: Number, sortable: false, class: 'text-right', label, formatter })
      return [{
        key: 'datasetName',
        type: String,
        sortable: false,
        label: this.$t('tableColumnDatasetName')
      },
      number('n', this.$t('pageComparisonTemporalPairs'), value => formatNumber(value)),
      number('germplasm', this.$t('pageComparisonSingleTraitGermplasm'), value => formatNumber(value)),
      number('dates', this.$t('pageComparisonTemporalDates'), value => formatNumber(value)),
      { key: 'first', type: String, sortable: false, label: this.$t('pageComparisonTemporalFirst') },
      { key: 'last', type: String, sortable: false, label: this.$t('pageComparisonTemporalLast') },
      number('span', this.$t('pageComparisonTemporalSpan'), value => formatNumber(value)),
      number('firstMean', this.$t('pageComparisonTemporalFirstMean'), value => this.formatUnit(value)),
      number('lastMean', this.$t('pageComparisonTemporalLastMean'), value => this.formatUnit(value)),
      number('change', this.$t('pageComparisonTemporalChange'), value => value === null ? '–' : this.formatSignedUnit(value)),
      number('rate', this.$t('pageComparisonTemporalRate'), value => value === null ? '–' : this.formatSignedUnit(value, 3))]
    },
    // The help: the numbers, the views, the time axis, the table, the options
    tourSteps: function () {
      const target = selector => () => `#${this.id} ${selector}`
      const texts = {
        datasets: this.$t('pageComparisonTemporalTourDatasets'),
        pairs: this.$t('pageComparisonTemporalTourPairs'),
        dates: this.$t('pageComparisonTemporalTourDates'),
        germplasm: this.$t('pageComparisonTemporalTourGermplasm'),
        unpaired: this.$t('pageComparisonTemporalTourUnpaired')
      }
      const steps = this.numbers.map(number => ({
        title: () => number.label,
        text: () => texts[number.key],
        target: target(`[data-tour-number="${number.key}"]`),
        position: 'bottom'
      }))
      const viewTexts = {
        line: this.$t('pageComparisonTemporalTourLine'),
        growth: this.$t('pageComparisonTemporalTourGrowth'),
        heatmap: this.$t('pageComparisonTemporalTourHeatmap'),
        firstlast: this.$t('pageComparisonTemporalTourFirstLast')
      }
      return steps.concat(this.views.map(view => ({
        title: () => view.text,
        text: () => viewTexts[view.key],
        target: target(`[data-tour-view="${view.key}"]`),
        position: 'bottom'
      }))).concat([{
        title: () => this.$t('pageComparisonTemporalAxis'),
        text: () => this.$t('pageComparisonTemporalTourAxis'),
        target: target('[data-tour="axis"]'),
        position: 'bottom'
      }, {
        title: () => this.$t('pageComparisonTemporalSummary'),
        text: () => this.$t('pageComparisonTemporalTourSummary'),
        target: target('[data-tour="summary"]'),
        position: 'top'
      }, {
        title: () => this.$t('popoverChartTourGenericOptionsTitle'),
        text: () => this.$t('pageComparisonTemporalTourOptions'),
        target: target('#additional-options'),
        position: 'bottom'
      }])
    }
  },
  watch: {
    // Another date trait (or none): no value trait
    selectedKey: function () {
      this.valueKey = null
    },
    // The observations loaded: the trait paired by the short names taken at once
    rowsState: function (state) {
      if (state === 'loaded' && this.shortMatch && this.valueKey === null) {
        this.selectValue(this.shortMatch.key)
      }
    }
  },
  methods: {
    formatUnit: function (value) {
      const text = this.formatValue(value)
      return this.unit && text !== '–' ? `${text} ${this.unit}` : text
    },
    formatSignedUnit: function (value, digits = 2) {
      const text = formatDecimals(Math.abs(value), 0, digits)
      const sign = value > 0 ? '+' : (value < 0 ? '−' : '')
      return `${sign}${text}${this.unit ? ` ${this.unit}` : ''}`
    },
    // An observation: its plot, dataset, germplasm, role (the date trait or the key of its numeric trait), its day (a
    // date) or its value (a number)
    toRow: function (o) {
      const role = this.roleByTraitId[o.traitId] || null
      return {
        trialsetupId: o.trialsetupId,
        datasetId: o.datasetId,
        germplasmId: o.germplasmId,
        germplasmName: o.germplasmName,
        rep: o.rep,
        block: o.block,
        recordingDate: o.recordingDate || '',
        role,
        raw: o.traitValue,
        day: role === 'date' ? parseDay(o.traitValue) : null,
        value: role && role !== 'date' ? parseNumber(o.traitValue) : null
      }
    },
    selectValue: function (key) {
      this.valueKey = key
      this.$nextTick(() => this.draw())
    },
    clearValue: function () {
      this.valueKey = null
    },
    setView: function (key) {
      this.view = key
      this.$nextTick(() => this.draw())
    },
    setAxis: function (key) {
      this.axis = key
      this.$nextTick(() => this.draw())
    },
    // The time of a value on the axis chosen: its date, its day in the year 2000, or its days since the first
    // measurement of its trial
    getTime: function (p, axis) {
      if (axis === 'days') {
        return Math.round((p.day - this.firstDayOf[p.datasetId]) / DAY)
      }
      return isoDay(axis === 'year' ? yearDay(p.day) : p.day)
    },
    getAxisTitle: function (axis) {
      return axis === 'days' ? this.$t('pageComparisonTemporalAxisDaysTitle') : (axis === 'year' ? this.$t('pageComparisonTemporalAxisYear') : this.$t('pageComparisonTemporalAxisDate'))
    },
    valueTitle: function () {
      return this.valueTrait ? `${this.valueTrait.name}${this.unit ? ` (${this.unit})` : ''}` : ''
    },
    getSummaryData: function (request) {
      return this.getTableData(request, this.datasetStats)
    },
    downloadSummary: function (request, callback) {
      const number = value => value === null || value === undefined ? '' : `${Math.round(value * 10000) / 10000}`
      const header = [this.$t('tableColumnDatasetName'), this.$t('pageComparisonTemporalPairs'), this.$t('pageComparisonSingleTraitGermplasm'), this.$t('pageComparisonTemporalDates'), this.$t('pageComparisonTemporalFirst'), this.$t('pageComparisonTemporalLast'), this.$t('pageComparisonTemporalSpan'), this.$t('pageComparisonTemporalFirstMean'), this.$t('pageComparisonTemporalLastMean'), this.$t('pageComparisonTemporalChange'), this.$t('pageComparisonTemporalRate')]
      const lines = [header.join('\t')].concat(this.datasetStats.map(d => [d.datasetName, d.n, d.germplasm, d.dates, d.first, d.last, d.span, number(d.firstMean), number(d.lastMean), number(d.change), number(d.rate)].join('\t')))
      return this.resolveLater(callback, makeZip([{ name: `${this.getFileName()}-summary.txt`, content: lines.join('\r\n') }]))
    },
    // The values with their date (dataset, germplasm, rep, block, date, days since the first measurement, value)
    downloadData: function () {
      const lines = [['dataset', 'germplasm', 'rep', 'block', 'date', 'days', 'value'].join('\t')].concat(this.pairs.map(p => [
        this.datasetNames[p.datasetId] || p.datasetId,
        p.germplasmName,
        p.rep || '',
        p.block || '',
        isoDay(p.day),
        this.getTime(p, 'days'),
        p.value
      ].join('\t')))
      downloadBlob({ blob: new Blob([lines.join('\r\n')], { type: 'text/plain' }), filename: `${this.getFileName()}-${getDateTimeString()}`, extension: 'txt' })
    },
    getFileName: function () {
      return `comparison-temporal-${this.valueTrait ? this.valueTrait.name.replace(/[^\w-]+/g, '_') : 'trait'}-${this.view}`
    },
    draw: function () {
      if (this.rowsState !== 'loaded' || !this.valueTrait || this.usedDatasets.length < 2) {
        return
      }
      this.$nextTick(() => {
        const element = this.$refs.chart
        if (!element) {
          return
        }
        if (this.view === 'line') {
          this.drawLine(element)
        } else if (this.view === 'growth') {
          if (this.hasCurves) {
            this.drawGrowth(element)
          } else {
            Plotly.purge(element)
          }
        } else if (this.view === 'heatmap') {
          this.drawHeatmap(element)
        } else if (this.firstLast.length > 0) {
          this.drawFirstLast(element)
        } else {
          Plotly.purge(element)
        }
      })
    },
    // The mean of each time of each trial: { datasetId: [{ time, mean, n }] } in time order
    getMeans: function (axis) {
      const result = {}
      this.usedDatasets.forEach(d => {
        const byTime = {}
        this.pairs.filter(p => p.datasetId === d.datasetId).forEach(p => {
          const time = this.getTime(p, axis)
          ;(byTime[time] = byTime[time] || []).push(p.value)
        })
        result[d.datasetId] = Object.keys(byTime).map(time => ({ time: axis === 'days' ? +time : time, mean: mean(byTime[time]), n: byTime[time].length }))
          .sort((a, b) => axis === 'days' ? a.time - b.time : `${a.time}`.localeCompare(`${b.time}`))
      })
      return result
    },
    // A line per trial: the mean of the values of each time
    drawLine: function (element) {
      const theme = this.getTheme()
      const means = this.getMeans(this.axis)
      const unit = this.unit ? ` ${this.unit}` : ''
      const data = this.usedDatasets.map(d => ({
        type: 'scatter',
        mode: 'lines+markers',
        name: d.datasetName,
        x: means[d.datasetId].map(m => m.time),
        y: means[d.datasetId].map(m => m.mean),
        customdata: means[d.datasetId].map(m => formatNumber(m.n)),
        line: { color: d.color, width: 2 },
        marker: { color: d.color, size: 7 },
        hoverlabel: theme.hoverlabel,
        hovertemplate: `<b>${d.datasetName}</b><br>%{x}<br>%{y:.2f}${unit} (n = %{customdata})<extra></extra>`
      }))
      Plotly.react(element, data, this.getLayout({
        showlegend: true,
        legend: { orientation: 'h', x: 0, y: 1.08, yanchor: 'bottom', font: { color: theme.text } },
        margin: { t: 40, r: 20, b: 50, l: 70 },
        xaxis: this.getTimeAxis(this.axis, theme),
        yaxis: { title: { text: this.valueTitle(), font: { color: theme.muted } }, gridcolor: theme.grid, zeroline: false, tickfont: { color: theme.muted } }
      }), { displayModeBar: false, responsive: true })
    },
    getTimeAxis: function (axis, theme) {
      return {
        type: axis === 'days' ? 'linear' : 'date',
        title: { text: this.getAxisTitle(axis), font: { color: theme.muted } },
        tickformat: axis === 'year' ? '%d %b' : (axis === 'date' ? '%Y-%m-%d' : undefined),
        hoverformat: axis === 'year' ? '%d %b' : undefined,
        gridcolor: theme.grid,
        zeroline: false,
        tickfont: { color: theme.muted },
        automargin: true
      }
    },
    // Days since the first measurement of each trial: a thin line per germplasm (its mean of each day; at most
    // GROWTH_LINES per trial), the mean of the trial in bold
    drawGrowth: function (element) {
      const theme = this.getTheme()
      const unit = this.unit ? ` ${this.unit}` : ''
      const data = []
      this.usedDatasets.forEach(d => {
        const byGermplasm = {}
        this.pairs.filter(p => p.datasetId === d.datasetId).forEach(p => {
          const g = byGermplasm[p.germplasmId] = byGermplasm[p.germplasmId] || { name: p.germplasmName, byDay: {} }
          const day = this.getTime(p, 'days')
          ;(g.byDay[day] = g.byDay[day] || []).push(p.value)
        })
        Object.values(byGermplasm).filter(g => Object.keys(g.byDay).length > 1).slice(0, GROWTH_LINES).forEach(g => {
          const days = Object.keys(g.byDay).map(Number).sort((a, b) => a - b)
          data.push({
            type: 'scatter',
            mode: 'lines',
            name: `${g.name}`,
            legendgroup: `d${d.datasetId}`,
            showlegend: false,
            x: days,
            y: days.map(day => mean(g.byDay[day])),
            line: { color: this.withAlpha(d.color, 0.28), width: 1 },
            hoverlabel: theme.hoverlabel,
            hovertemplate: `<b>${g.name}</b><br>${d.datasetName}<br>%{x} d · %{y:.2f}${unit}<extra></extra>`
          })
        })
      })
      const means = this.getMeans('days')
      this.usedDatasets.forEach(d => {
        data.push({
          type: 'scatter',
          mode: 'lines+markers',
          name: d.datasetName,
          legendgroup: `d${d.datasetId}`,
          x: means[d.datasetId].map(m => m.time),
          y: means[d.datasetId].map(m => m.mean),
          line: { color: d.color, width: 3.5 },
          marker: { color: d.color, size: 7 },
          hoverlabel: theme.hoverlabel,
          hovertemplate: `<b>${d.datasetName}</b><br>%{x} d · %{y:.2f}${unit}<extra></extra>`
        })
      })
      Plotly.react(element, data, this.getLayout({
        showlegend: true,
        legend: { orientation: 'h', x: 0, y: 1.08, yanchor: 'bottom', font: { color: theme.text } },
        margin: { t: 40, r: 20, b: 50, l: 70 },
        xaxis: this.getTimeAxis('days', theme),
        yaxis: { title: { text: this.valueTitle(), font: { color: theme.muted } }, gridcolor: theme.grid, zeroline: false, tickfont: { color: theme.muted } }
      }), { displayModeBar: false, responsive: true })
    },
    // A row per trial, a column per time (of the axis chosen): the mean of its values as the colour and in the cell;
    // blank: no measurement then
    drawHeatmap: function (element) {
      const theme = this.getTheme()
      const means = this.getMeans(this.axis)
      const times = [...new Set(Object.values(means).flat().map(m => m.time))].sort((a, b) => this.axis === 'days' ? a - b : `${a}`.localeCompare(`${b}`))
      const labels = times.map(t => this.axis === 'days' ? `${t}` : (this.axis === 'year' ? new Date(Date.parse(t)).toLocaleDateString(this.locale, { day: '2-digit', month: 'short', timeZone: 'UTC' }) : t))
      const datasets = this.usedDatasets.slice().reverse()
      const z = datasets.map(d => times.map(t => {
        const m = means[d.datasetId].find(x => x.time === t)
        return m ? m.mean : null
      }))
      Plotly.react(element, [{
        type: 'heatmap',
        x: labels,
        y: datasets.map(d => d.datasetName),
        z,
        text: z.map(row => row.map(v => v === null ? '' : this.formatValue(v))),
        texttemplate: times.length <= 25 ? '%{text}' : '',
        colorscale: getGradientScale(),
        xgap: 2,
        ygap: 2,
        colorbar: { title: { text: this.unit, font: { color: theme.muted } }, tickfont: { color: theme.muted }, thickness: 12 },
        hoverongaps: false,
        hoverlabel: theme.hoverlabel,
        hovertemplate: `<b>%{y}</b><br>%{x}<br>%{z:.2f}${this.unit ? ` ${this.unit}` : ''}<extra></extra>`
      }], this.getLayout({
        height: this.chartHeight,
        margin: { t: 10, r: 20, b: 70, l: 20 },
        xaxis: { type: 'category', title: { text: this.getAxisTitle(this.axis), font: { color: theme.muted } }, tickfont: { color: theme.text }, automargin: true, fixedrange: true },
        yaxis: { tickfont: { color: theme.text }, automargin: true, fixedrange: true }
      }), { displayModeBar: false, responsive: true })
    },
    // A germplasm of a trial a point: its mean at its first date (across) and at its last (up), in the colour of its
    // trial; the dashed diagonal: no change
    drawFirstLast: function (element) {
      const theme = this.getTheme()
      const unit = this.unit ? ` ${this.unit}` : ''
      const all = this.firstLast.map(g => g.first).concat(this.firstLast.map(g => g.last))
      const low = Math.min(...all)
      const high = Math.max(...all)
      const pad = (high - low) * 0.05 || 1
      const data = this.usedDatasets.map(d => {
        const points = this.firstLast.filter(g => g.datasetId === d.datasetId)
        return {
          type: 'scatter',
          mode: 'markers',
          name: d.datasetName,
          x: points.map(g => g.first),
          y: points.map(g => g.last),
          text: points.map(g => `${g.germplasmName}`),
          customdata: points.map(g => [isoDay(g.firstDay), isoDay(g.lastDay)]),
          marker: { color: d.color, size: 8, opacity: 0.8 },
          hoverlabel: theme.hoverlabel,
          hovertemplate: `<b>%{text}</b><br>${d.datasetName}<br>%{customdata[0]}: %{x:.2f}${unit}<br>%{customdata[1]}: %{y:.2f}${unit}<extra></extra>`
        }
      })
      Plotly.react(element, data, this.getLayout({
        showlegend: true,
        legend: { orientation: 'h', x: 0, y: 1.08, yanchor: 'bottom', font: { color: theme.text } },
        margin: { t: 40, r: 20, b: 60, l: 70 },
        xaxis: { title: { text: `${this.$t('pageComparisonTemporalFirst')}${unit ? ` (${this.unit})` : ''}`, font: { color: theme.muted } }, range: [low - pad, high + pad], gridcolor: theme.grid, zeroline: false, tickfont: { color: theme.muted } },
        yaxis: { title: { text: `${this.$t('pageComparisonTemporalLast')}${unit ? ` (${this.unit})` : ''}`, font: { color: theme.muted } }, range: [low - pad, high + pad], gridcolor: theme.grid, zeroline: false, tickfont: { color: theme.muted } },
        shapes: [{ type: 'line', x0: low - pad, y0: low - pad, x1: high + pad, y1: high + pad, line: { color: theme.muted, width: 1, dash: 'dash' } }]
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
.stc-icon i {
  color: var(--stc-type-color);
  font-size: 1.3rem;
}
/* The lists of the head: the date trait and, when chosen by the user, the trait of the values */
.stc-select {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
/* The views, as those of the statistics of a trait */
.tmc-views-wrap {
  margin: 0.25rem 0 0.75rem;
}
.tmc-views-wrap >>> .tmc-view-icon {
  width: 1.05em;
  height: 1.05em;
  fill: currentColor;
}
/* The time axis: a segmented choice */
.tmc-axis {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
}
.tmc-axis-label {
  margin-right: 0.35rem;
  color: var(--cp-text-subtle, var(--cp-muted));
}
.tmc-axis-option {
  padding: 0.2rem 0.75rem;
  border: 1px solid var(--cp-border);
  border-radius: 999px;
  background: var(--cp-surface);
  color: var(--cp-text);
  font-size: 0.82rem;
  cursor: pointer;
}
.tmc-axis-option:hover,
.tmc-axis-option:focus-visible {
  border-color: var(--cp-green);
}
.tmc-axis-option.active {
  border-color: var(--cp-green);
  background: var(--cp-green-soft);
  color: var(--cp-green);
  font-weight: 600;
}
</style>
