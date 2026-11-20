<template>
  <!-- The values of a numeric trait in one dataset: its numbers (observations, missing values, mean, median, SD, CV,
       minimum – maximum, outliers, values outside the limits of the trait or not numbers) and four views:
       - distribution: a histogram (a bar per value for whole numbers over a short range, else bins) with the mean and the
         median, the limits of the trait, a box plot below it on the same axis (Tukey fences, the outliers as points); a
         bar clicked: its observations (value-clicked)
       - outliers: the observations outside the limits of the trait, outside the Tukey fences, or far from the other
         observations of their germplasm (3+ observations); a table, its germplasm opening the preview of the passport
       - ranking: the germplasm by their mean (± standard error, hollow for a single observation), the repeatability of
         the trait; raw means (adjusted means: the detailed reports)
       - by rep / block: a box plot per level (its observations as points), the share of the variation explained (eta²),
         ANOVA and Kruskal-Wallis
       Large data: the numbers and the distribution come from the counts per value; the other views load every
       observation when opened (in pages, after a confirmation above ROWS_CONFIRM observations), show the germplasm in
       pages and, above POINTS_MAX observations, the boxes without their points. -->
  <!-- As TraitValueStats (which it extends, its look included): the numbers on a strip at the top, the options of the
       chart and its help at the right end of the strip, then the chart under its title -->
  <div class="tvs tds tns" :id="id">
    <div class="tvs-numbers">
      <div :class="['tvs-number', { 'is-text': number.text, 'is-danger': number.danger }]" v-for="number in numbers" :key="`tvs-number-${number.key}`" :data-tour-number="number.key">
        <span class="tvs-number-value" :title="number.text ? number.value : null">{{ number.value === null ? '–' : (number.text ? number.value : formatNumber(number.value)) }}</span>
        <span class="tvs-number-label">{{ number.label }}</span>
      </div>
    </div>

    <!-- Options (download as PNG / SVG, the data file, the colours) and help: on the strip of the numbers -->
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
        <b-dropdown-item link-class="top-nav-menu-item" :disabled="!chartShown" @click="downloadPng"><i class="fa-solid fa-image fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadPng') }}</b-dropdown-item>
        <b-dropdown-item link-class="top-nav-menu-item" :disabled="!chartShown" @click="downloadSvg"><i class="fa-solid fa-file-code fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadSvg') }}</b-dropdown-item>
        <b-dropdown-item link-class="top-nav-menu-item" :disabled="!sourceFile" @click="downloadData"><i class="fa-solid fa-file-lines fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadFile') }}</b-dropdown-item>
        <!-- The colours of the charts: the first one for the bars, the boxes and the means -->
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
        <!-- The views of the values -->
        <div class="tds-views" role="tablist" v-if="hasChart">
          <button type="button" :class="['tds-view', { active: view === option.key }]" :data-tour-view="option.key" role="tab" :aria-selected="view === option.key ? 'true' : 'false'" v-for="option in views" :key="`tns-view-${option.key}`" @click="setView(option.key)">
            <i :class="['fa-solid', option.icon]" aria-hidden="true" /> {{ option.text }}
          </button>
        </div>
        <div class="tvs-loading" v-if="loading"><b-spinner small type="grow" /></div>
        <p class="tvs-empty" v-else-if="!hasChart">{{ $t('headingNoData') }}</p>
        <!-- Outliers, ranking, by rep / block: every observation needed, loaded when opened (very many: once confirmed) -->
        <template v-else-if="needsRows && rowsState !== 'loaded'">
          <div class="tvs-loading" v-if="rowsState === 'loading'">
            <b-spinner small type="grow" />
            <span class="tds-progress" v-if="rowsProgress && rowsProgress.total > rowsProgress.loaded">{{ $t('pageTraitDetailsStatsLoadingProgress', { loaded: formatNumber(rowsProgress.loaded), total: formatNumber(rowsProgress.total) }) }}</span>
          </div>
          <div class="tds-single" v-else-if="rowsState === 'confirm'">
            <p><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ vt('pageTraitDetailsStatsObservationsLarge', { count: formatNumber(summary.n) }) }}</p>
            <button type="button" class="tvs-values-link" @click="loadObservations"><i class="fa-solid fa-download" aria-hidden="true" /> {{ $t('pageTraitDetailsStatsLoadObservations') }}</button>
          </div>
        </template>
        <!-- By rep / block: no rep nor block with more than one level -->
        <p class="tds-single" v-else-if="view === 'groups' && groupOptions.length < 1"><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ $t('pageTraitDetailsStatsNoGroups') }}</p>

        <!-- Over time: no recording dates; many observations grouped by month or year -->
        <p class="tds-single" v-if="hasChart && view === 'time' && rowsState === 'loaded' && !chartShown"><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ $t('pageClimateDetailsStatsNoDates') }}</p>
        <p class="tds-note" v-if="chartShown && timeUnit"><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ timeUnit === 'year' ? $t('pageClimateDetailsStatsTimeByYearNumeric') : $t('pageClimateDetailsStatsTimeByMonthNumeric') }}</p>
        <!-- Ranking: the repeatability, the order, why the means are raw -->
        <template v-if="chartShown && view === 'ranking'">
          <div class="tcs-bar">
            <span class="tcs-summary" v-if="repeatabilityInfo" v-b-tooltip.hover :title="vt('pageTraitDetailsStatsRepeatabilityTooltip')">
              <i class="fa-solid fa-gauge-simple" aria-hidden="true" /> {{ vt('pageTraitDetailsStatsRepeatability') }}: <b>{{ formatFixed(repeatabilityInfo.value, 2) }}</b> · {{ repeatabilityLevel }}
            </span>
            <button type="button" class="tds-pager-toggle" @click="toggleRankingOrder">
              <i :class="['fa-solid', rankingDescending ? 'fa-arrow-down-wide-short' : 'fa-arrow-up-short-wide']" aria-hidden="true" /> {{ rankingDescending ? $t('pageTraitDetailsStatsHighestFirst') : $t('pageTraitDetailsStatsLowestFirst') }}
            </button>
          </div>
        </template>
        <!-- By rep / block: which of them (both with more than one level) -->
        <div class="tds-views tcs-groups" role="tablist" v-if="chartShown && view === 'groups' && groupOptions.length > 1">
          <button type="button" :class="['tds-view', { active: activeGroup === option }]" role="tab" :aria-selected="activeGroup === option ? 'true' : 'false'" v-for="option in groupOptions" :key="`tns-group-${option}`" @click="setGroupBy(option)">
            {{ getGroupLabel(option) }}
          </button>
        </div>

        <div :class="['tvs-chart', { 'is-clickable': view === 'distribution' || (view === 'ranking' && !isClimate) }]" ref="chart" v-show="chartShown" />

        <!-- Outliers: the table (a page of them) -->
        <template v-if="hasChart && view === 'outliers' && rowsState === 'loaded'">
          <p class="tds-single" v-if="outliers.length < 1"><i class="fa-solid fa-circle-check" aria-hidden="true" /> {{ vt('pageTraitDetailsStatsNoOutliers') }}</p>
          <div class="tns-table-wrap" v-else>
            <table class="tns-table">
              <thead>
                <tr>
                  <th>{{ vt('tableColumnGermplasmName') }}</th>
                  <!-- A climate: the recording date in place of the rep and the block -->
                  <th v-if="isClimate">{{ $t('tableColumnClimateDataRecordingDate') }}</th>
                  <th class="is-number" v-if="!isClimate">{{ $t('tableColumnTraitRep') }}</th>
                  <th class="is-number" v-if="!isClimate">{{ $t('tableColumnTraitBlock') }}</th>
                  <th class="is-number">{{ $t('pageTraitDetailsStatsValue') }}</th>
                  <th>{{ $t('pageTraitDetailsStatsOutlierReason') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(outlier, index) in pageOutliers" :key="`tns-outlier-${outliersPage}-${index}`">
                  <td><GermplasmNameCell :germplasmId="outlier.row.germplasmId" :name="`${outlier.row.germplasm}`" v-if="outlier.row.germplasmId" /><span v-else><i :class="`fi fi-${outlier.row.country}`" aria-hidden="true" v-if="outlier.row.country" /> {{ outlier.row.germplasm }}</span></td>
                  <td v-if="isClimate">{{ outlier.row.date || '–' }}</td>
                  <td class="is-number" v-if="!isClimate">{{ outlier.row.rep || '–' }}</td>
                  <td class="is-number" v-if="!isClimate">{{ outlier.row.block || '–' }}</td>
                  <td class="is-number"><b>{{ formatUnit(outlier.row.mapped) }}</b></td>
                  <td>
                    <span :class="['tns-reason', `is-${reason.kind}`]" v-for="reason in outlier.reasons" :key="reason.kind">{{ reason.text }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="tds-pager" v-if="outliers.length > pageSize">
            <button type="button" class="tds-pager-button" :disabled="outliersPage === 0" @click="outliersPage--" :title="$t('pageTraitDetailsStatsPreviousPage')" :aria-label="$t('pageTraitDetailsStatsPreviousPage')"><i class="fa-solid fa-chevron-left" aria-hidden="true" /></button>
            <span>{{ $t('pageTraitDetailsStatsOutlierRange', { from: formatNumber(outliersPage * pageSize + 1), to: formatNumber(Math.min(outliers.length, (outliersPage + 1) * pageSize)), total: formatNumber(outliers.length) }) }}</span>
            <button type="button" class="tds-pager-button" :disabled="(outliersPage + 1) * pageSize >= outliers.length" @click="outliersPage++" :title="$t('pageTraitDetailsStatsNextPage')" :aria-label="$t('pageTraitDetailsStatsNextPage')"><i class="fa-solid fa-chevron-right" aria-hidden="true" /></button>
          </div>
        </template>

        <!-- Over time: the locations (their colour, the flag of their country, name and ISO 3 code) -->
        <div class="tns-time-legend" v-if="chartShown && view === 'time' && timeLegend.length > 0">
          <span class="tns-time-legend-item" v-for="item in timeLegend" :key="`tns-legend-${item.label}`">
            <span class="tns-time-legend-line" :style="{ background: item.color }" />
            <i :class="`fi fi-${item.country}`" aria-hidden="true" v-if="item.country" />
            {{ item.label }}
          </span>
        </div>

        <!-- Ranking: many germplasm in pages; the notes -->
        <template v-if="chartShown && view === 'ranking'">
          <div class="tds-pager" v-if="germplasm.length > pageSize">
            <button type="button" class="tds-pager-button" :disabled="page === 0" @click="setPage(page - 1)" :title="vt('pageTraitDetailsStatsPreviousGermplasm')" :aria-label="vt('pageTraitDetailsStatsPreviousGermplasm')"><i class="fa-solid fa-chevron-left" aria-hidden="true" /></button>
            <span>{{ vt('pageTraitDetailsStatsGermplasmRange', { from: formatNumber(page * pageSize + 1), to: formatNumber(Math.min(germplasm.length, (page + 1) * pageSize)), total: formatNumber(germplasm.length) }) }}</span>
            <button type="button" class="tds-pager-button" :disabled="(page + 1) * pageSize >= germplasm.length" @click="setPage(page + 1)" :title="vt('pageTraitDetailsStatsNextGermplasm')" :aria-label="vt('pageTraitDetailsStatsNextGermplasm')"><i class="fa-solid fa-chevron-right" aria-hidden="true" /></button>
          </div>
          <p class="tds-note"><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ vt('pageTraitDetailsStatsRankingRaw') }}<template v-if="germplasm.some(g => g.n === 1)"> {{ $t('pageTraitDetailsStatsSingleObservation') }}</template></p>
        </template>

        <!-- By rep / block: the variation explained, the tests -->
        <template v-if="chartShown && view === 'groups' && groupTests">
          <p class="tds-note" v-if="groupPointsHidden"><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ $t('pageTraitDetailsStatsPointsHidden') }}</p>
          <p class="tds-note">
            <i class="fa-solid fa-circle-info" aria-hidden="true" />
            {{ $t('pageTraitDetailsStatsVariationExplained', { group: getGroupLabel(activeGroup), percent: formatPercent(groupTests.anova.eta2) }) }}
            · {{ $t('pageTraitDetailsStatsAnova', { df1: groupTests.anova.df1, df2: groupTests.anova.df2, f: formatFixed(groupTests.anova.f, 2), p: formatP(groupTests.anova.p) }) }}
            <template v-if="groupTests.kruskal"> · {{ $t('pageTraitDetailsStatsKruskal', { h: formatFixed(groupTests.kruskal.h, 2), df: groupTests.kruskal.df, p: formatP(groupTests.kruskal.p) }) }}</template>
            — <b>{{ groupTests.p < 0.05 ? $t('pageTraitDetailsStatsChiSquareDiffers') : $t('pageTraitDetailsStatsChiSquareSimilar') }}</b>
          </p>
        </template>
      </div>
    </BaseChart>

    <!-- The preview of the passport of a germplasm (ranking: its name or its mean clicked) -->
    <PassportPreviewModal :germplasmId="previewGermplasmId" ref="passportPreview" v-if="previewGermplasmId !== null" @hidden="previewGermplasmId = null" />

    <!-- Tour explaining the options of the chart -->
    <Tour :steps="tourSteps" modernLook ref="tour" />
  </div>
</template>

<script>
import TraitValueStats from '@/components/charts/TraitValueStats'
import PassportPreviewModal from '@/components/germplasm/PassportPreviewModal'
import GermplasmNameCell from '@/components/germplasm/GermplasmNameCell'
import traitStats, { FONT } from '@/mixins/trait-stats'
import { formatNumber, formatDecimals, formatPercent } from '@/mixins/formatting'
import { quantile, quantileOfCounts, mean, oneWayAnova, kruskalWallis, repeatability } from '@/mixins/stats-math'
import { getNumericTimeChart, getTimeUnit, hasDates } from '@/mixins/climate-time'
import { getColors } from '@/mixins/colors'

const Plotly = require('plotly.js/lib/core')

// The box plots (bar and scatter: registered by TraitValueStats and TraitDateStats)
Plotly.register([
  require('plotly.js/lib/scatter'),
  require('plotly.js/lib/box')
])

// The histogram: a bar per value for whole numbers over at most this range, else bins (Freedman-Diaconis, between the
// two numbers of bins)
const DISCRETE_RANGE_MAX = 60
const BINS_MIN = 5
const BINS_MAX = 60
const HISTOGRAM_HEIGHT = 470
// The ranking: a row per germplasm, the axis
const RANKING_ROW = 28
const RANKING_EXTRA = 90
const GROUPS_HEIGHT = 470
// Germplasm (ranking) and outliers per page
const PAGE_SIZE = 40
// Above this many observations, those of the other views are loaded only once confirmed; above that many in a box plot
// by rep / block, the boxes without their points
const ROWS_CONFIRM = 50000
const POINTS_MAX = 2500
// Rep discordance: germplasm with at least this many observations; flagged beyond these many robust deviations (MAD) or,
// all deviations being 0 but some, standard deviations
const DISCORDANCE_MIN_N = 3
const DISCORDANCE_MAD = 3.5
const DISCORDANCE_SD = 3
const BAR_COLOR = '#5b9cf6'
const OUTLIER_COLOR = '#e07b39'
const DANGER_COLOR = '#d0523f'

// The number of decimals of a value as written
const decimalsOf = text => {
  const match = /\.(\d+)/.exec(`${text}`)
  return match ? match[1].length : 0
}
// A number as written in the data (a comma as decimal separator too); null when not a number
const parseNumber = text => {
  const value = `${text}`.trim().replace(',', '.')
  if (value === '' || !/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(value)) {
    return null
  }
  return +value
}
// A step for bins of a size: 1, 2, 2.5 or 5 times a power of ten
const niceStep = size => {
  const power = Math.pow(10, Math.floor(Math.log10(size)))
  const factor = size / power
  return (factor <= 1 ? 1 : factor <= 2 ? 2 : factor <= 2.5 ? 2.5 : factor <= 5 ? 5 : 10) * power
}
const sortLevels = levels => levels.sort((a, b) => (+a - +b) || `${a}`.localeCompare(`${b}`))

export default {
  extends: TraitValueStats,
  // The colours of the page, every observation, the preview of the passport
  mixins: [traitStats],
  components: {
    GermplasmNameCell,
    PassportPreviewModal
  },
  props: {
    // The unit of the variable (its abbreviation): with every value shown, in the title of the axes of the values
    unit: {
      type: String,
      default: null
    },
    // The restrictions of the trait: its limits ({ min, max })
    traitRestrictions: {
      type: Object,
      default: null
    }
  },
  data: function () {
    return {
      // Every observation (germplasm, rep, block, its number), loaded when a view needs it. none, confirm (very many:
      // loaded once confirmed), loading, loaded
      rows: [],
      rowsState: 'none',
      // distribution, outliers, ranking or groups (a climate: time in place of groups)
      view: 'distribution',
      // Over time (a climate): the locations of the legend below the chart ({ label, color, country })
      timeLegend: [],
      page: 0,
      outliersPage: 0,
      pageSize: PAGE_SIZE,
      rankingDescending: true,
      // By rep / block: rep or block (null: the first one with more than one level)
      groupBy: null
    }
  },
  computed: {
    locale: function () {
      return (this.$store.getters.storeLocale || 'en_GB').replace('_', '-')
    },
    views: function () {
      return [{
        key: 'distribution',
        icon: 'fa-chart-column',
        text: this.$t('pageTraitDetailsStatsViewDistribution')
      }, {
        key: 'outliers',
        icon: 'fa-triangle-exclamation',
        text: this.$t('pageTraitDetailsStatsViewOutliers')
      }, {
        key: 'ranking',
        icon: 'fa-ranking-star',
        text: this.$t('pageTraitDetailsStatsViewRanking')
      }, {
        key: 'groups',
        icon: 'fa-table-cells',
        text: this.$t('pageTraitDetailsStatsViewByGroup')
      }, {
        key: 'time',
        icon: 'fa-chart-line',
        text: this.$t('pageClimateDetailsStatsViewOverTime')
      }].filter(view => this.isClimate ? view.key !== 'groups' : view.key !== 'time')
      // (a climate: no rep nor block, its values over the recording dates)
    },
    // The numbers seen ({ x, count, raw: the values as written }), in their order; the values not numbers apart
    numeric: function () {
      const byX = {}
      this.values.forEach(v => {
        const x = parseNumber(v.value)
        if (x !== null) {
          if (!byX[x]) {
            byX[x] = { x, count: 0, raw: [] }
          }
          byX[x].count += v.count
          byX[x].raw.push(`${v.value}`)
        }
      })
      return Object.freeze(Object.values(byX).sort((a, b) => a.x - b.x))
    },
    notNumberCount: function () {
      return this.values.filter(v => parseNumber(v.value) === null).reduce((sum, v) => sum + v.count, 0)
    },
    // The decimals of the data (at most 4): the numbers shown with as many (more for the mean and the SD)
    decimals: function () {
      return Math.min(4, this.values.reduce((max, v) => Math.max(max, decimalsOf(v.value)), 0))
    },
    // From the counts per value: n, mean, SD, CV, quartiles, Tukey fences and the ends of the whiskers, outliers
    summary: function () {
      const values = this.numeric
      const n = values.reduce((sum, v) => sum + v.count, 0)
      if (n < 1) {
        return null
      }
      const sum = values.reduce((s, v) => s + v.x * v.count, 0)
      const average = sum / n
      const squares = values.reduce((s, v) => s + v.count * Math.pow(v.x - average, 2), 0)
      const sd = n > 1 ? Math.sqrt(squares / (n - 1)) : null
      const q1 = quantileOfCounts(values, n, 0.25)
      const median = quantileOfCounts(values, n, 0.5)
      const q3 = quantileOfCounts(values, n, 0.75)
      const iqr = q3 - q1
      const lowFence = q1 - 1.5 * iqr
      const highFence = q3 + 1.5 * iqr
      const inside = values.filter(v => v.x >= lowFence && v.x <= highFence)
      return {
        n,
        mean: average,
        sd,
        cv: sd !== null && average !== 0 ? sd / Math.abs(average) * 100 : null,
        min: values[0].x,
        max: values[values.length - 1].x,
        q1,
        median,
        q3,
        iqr,
        lowFence,
        highFence,
        whiskerLow: inside.length > 0 ? inside[0].x : q1,
        whiskerHigh: inside.length > 0 ? inside[inside.length - 1].x : q3,
        outliers: values.filter(v => v.x < lowFence || v.x > highFence)
      }
    },
    // The limits of the trait (its restrictions), null when not set
    limits: function () {
      const r = this.traitRestrictions || {}
      const min = r.min === null || r.min === undefined || r.min === '' ? null : +r.min
      const max = r.max === null || r.max === undefined || r.max === '' ? null : +r.max
      return {
        min: min === null || isNaN(min) ? null : min,
        max: max === null || isNaN(max) ? null : max
      }
    },
    outsideLimitsCount: function () {
      return this.numeric.filter(v => this.isOutsideLimits(v.x)).reduce((sum, v) => sum + v.count, 0)
    },
    hasChart: function () {
      return !this.loading && this.summary !== null
    },
    needsRows: function () {
      return this.view !== 'distribution'
    },
    chartShown: function () {
      if (!this.hasChart || (this.needsRows && this.rowsState !== 'loaded')) {
        return false
      }
      if (this.view === 'outliers') {
        return false
      }
      if (this.view === 'groups') {
        return this.groupOptions.length > 0
      }
      if (this.view === 'time') {
        return hasDates(this.rows)
      }
      return this.view !== 'ranking' || this.germplasm.length > 0
    },
    // Over time: the observations grouped by month or year (many of them), else null
    timeUnit: function () {
      return this.view === 'time' && this.rowsState === 'loaded' ? getTimeUnit(this.rows) : null
    },
    // The bars of the histogram ({ lo, hi, center, count, raw, discrete }): a bar per whole number over a short range,
    // else bins of a nice size (Freedman-Diaconis)
    bins: function () {
      const s = this.summary
      if (!s) {
        return []
      }
      const values = this.numeric
      const range = s.max - s.min
      if (values.every(v => Number.isInteger(v.x)) && range <= DISCRETE_RANGE_MAX) {
        const bins = []
        for (let x = s.min; x <= s.max; x++) {
          const v = values.find(value => value.x === x)
          bins.push({ lo: x, hi: x, center: x, count: v ? v.count : 0, raw: v ? v.raw : [], discrete: true })
        }
        return bins
      }
      if (range === 0) {
        return [{ lo: s.min, hi: s.max, center: s.min, count: s.n, raw: values[0].raw, discrete: true }]
      }
      let size = 2 * s.iqr * Math.pow(s.n, -1 / 3)
      if (!(size > 0)) {
        size = range / (Math.ceil(Math.log2(s.n)) + 1)
      }
      const count = Math.min(BINS_MAX, Math.max(BINS_MIN, Math.ceil(range / size)))
      const step = niceStep(range / count)
      const start = Math.floor(s.min / step) * step
      const bins = []
      for (let lo = start; lo <= s.max; lo += step) {
        bins.push({ lo, hi: lo + step, center: lo + step / 2, count: 0, raw: [], discrete: false })
      }
      values.forEach(v => {
        const index = Math.min(bins.length - 1, Math.floor((v.x - start) / step + 1e-9))
        bins[index].count += v.count
        bins[index].raw.push(...v.raw)
      })
      return bins
    },
    // Every observation that is a number
    numericRows: function () {
      return this.rows
    },
    // Ranking: per germplasm its observations, mean, SD, standard error, median, minimum, maximum
    germplasmAll: function () {
      const byGermplasm = {}
      this.numericRows.forEach(row => {
        const key = row.germplasmId || row.germplasm
        if (!byGermplasm[key]) {
          byGermplasm[key] = { germplasmId: row.germplasmId, name: row.germplasm, xs: [] }
        }
        byGermplasm[key].xs.push(row.mapped)
      })
      return Object.values(byGermplasm).map(g => {
        const sorted = g.xs.slice().sort((a, b) => a - b)
        const m = mean(sorted)
        const sd = sorted.length > 1 ? Math.sqrt(sorted.reduce((s, x) => s + Math.pow(x - m, 2), 0) / (sorted.length - 1)) : null
        return Object.assign(g, { n: sorted.length, mean: m, sd, se: sd !== null ? sd / Math.sqrt(sorted.length) : null, median: quantile(sorted, 0.5), min: sorted[0], max: sorted[sorted.length - 1] })
      })
    },
    germplasm: function () {
      const direction = this.rankingDescending ? -1 : 1
      return this.germplasmAll.slice().sort((a, b) => direction * (a.mean - b.mean) || b.n - a.n || `${a.name}`.localeCompare(`${b.name}`))
    },
    pageGermplasm: function () {
      const start = this.page * PAGE_SIZE
      return this.germplasm.slice(start, start + PAGE_SIZE)
    },
    // Repeatability: from the germplasm with their observations (only with some germplasm observed more than once)
    repeatabilityInfo: function () {
      if (!this.germplasmAll.some(g => g.n > 1)) {
        return null
      }
      return repeatability(this.germplasmAll.map(g => g.xs))
    },
    repeatabilityLevel: function () {
      const value = this.repeatabilityInfo ? this.repeatabilityInfo.value : 0
      return value < 0.3 ? this.$t('pageTraitDetailsStatsRepeatabilityLow') : (value < 0.6 ? this.$t('pageTraitDetailsStatsRepeatabilityModerate') : this.$t('pageTraitDetailsStatsRepeatabilityHigh'))
    },
    // Outliers: outside the limits of the trait, outside the Tukey fences, far from the other observations of their
    // germplasm; the most extreme first
    discordance: function () {
      // The deviations from the median of their germplasm (germplasm with enough observations)
      const deviations = []
      this.germplasmAll.filter(g => g.n >= DISCORDANCE_MIN_N).forEach(g => g.xs.forEach(x => deviations.push(x - g.median)))
      if (deviations.length < 1) {
        return null
      }
      const absolute = deviations.map(d => Math.abs(d)).sort((a, b) => a - b)
      const mad = 1.4826 * quantile(absolute, 0.5)
      if (mad > 0) {
        return { scale: mad, threshold: DISCORDANCE_MAD * mad }
      }
      const sd = Math.sqrt(deviations.reduce((s, d) => s + d * d, 0) / Math.max(1, deviations.length - 1))
      return sd > 0 ? { scale: sd, threshold: DISCORDANCE_SD * sd } : null
    },
    outliers: function () {
      const s = this.summary
      if (!s) {
        return []
      }
      const byGermplasm = {}
      this.germplasmAll.forEach(g => { byGermplasm[g.germplasmId || g.name] = g })
      const list = []
      this.numericRows.forEach(row => {
        const x = row.mapped
        const reasons = []
        let severity = 0
        if (this.isOutsideLimits(x)) {
          reasons.push({ kind: 'limits', text: this.$t('pageTraitDetailsStatsOutlierLimits', { min: this.limits.min === null ? '–' : this.formatValue(this.limits.min), max: this.limits.max === null ? '–' : this.formatUnit(this.limits.max) }) })
          severity += 1000
        }
        if (x < s.lowFence || x > s.highFence) {
          const low = x < s.lowFence
          reasons.push({ kind: 'fence', text: this.$t(low ? 'pageTraitDetailsStatsOutlierLow' : 'pageTraitDetailsStatsOutlierHigh', { fence: this.formatUnit(low ? s.lowFence : s.highFence, 1) }) })
          severity += Math.abs(x - (low ? s.lowFence : s.highFence)) / (s.iqr || 1)
        }
        const g = byGermplasm[row.germplasmId || row.germplasm]
        if (this.discordance && g && g.n >= DISCORDANCE_MIN_N && Math.abs(x - g.median) > this.discordance.threshold) {
          reasons.push({ kind: 'reps', text: this.vt('pageTraitDetailsStatsOutlierReps', { median: this.formatUnit(g.median, 1) }) })
          severity += Math.abs(x - g.median) / this.discordance.scale
        }
        if (reasons.length > 0) {
          list.push({ row, reasons, severity })
        }
      })
      return list.sort((a, b) => b.severity - a.severity)
    },
    pageOutliers: function () {
      const start = this.outliersPage * PAGE_SIZE
      return this.outliers.slice(start, start + PAGE_SIZE)
    },
    // Rep and / or block, those with more than one level
    groupOptions: function () {
      return ['rep', 'block'].filter(group => new Set(this.numericRows.map(row => row[group]).filter(level => level !== null && level !== undefined && `${level}` !== '')).size > 1)
    },
    activeGroup: function () {
      return this.groupOptions.includes(this.groupBy) ? this.groupBy : (this.groupOptions[0] || null)
    },
    // By rep / block: the observations of each level
    groups: function () {
      const group = this.activeGroup
      if (!group) {
        return []
      }
      const byLevel = {}
      this.numericRows.forEach(row => {
        const level = row[group]
        if (level === null || level === undefined || `${level}` === '') {
          return
        }
        if (!byLevel[level]) {
          byLevel[level] = { level, xs: [] }
        }
        byLevel[level].xs.push(row.mapped)
      })
      return sortLevels(Object.keys(byLevel)).map(level => byLevel[level])
    },
    groupPointsHidden: function () {
      return this.groups.reduce((sum, g) => sum + g.xs.length, 0) > POINTS_MAX
    },
    // ANOVA and Kruskal-Wallis between the levels; the verdict from Kruskal-Wallis (scores, skewed data), else ANOVA
    groupTests: function () {
      const samples = this.groups.map(g => g.xs)
      const anova = oneWayAnova(samples)
      if (!anova) {
        return null
      }
      const kruskal = kruskalWallis(samples)
      return { anova, kruskal, p: kruskal ? kruskal.p : anova.p }
    },
    chartHeight: function () {
      if (this.view === 'ranking') {
        return Math.max(1, this.pageGermplasm.length) * RANKING_ROW + RANKING_EXTRA
      }
      if (this.view === 'groups' || this.view === 'time') {
        return GROUPS_HEIGHT
      }
      return HISTOGRAM_HEIGHT
    },
    // The help: what each number and each view tells
    tourNumberTexts: function () {
      return {
        observations: this.vt('pageTraitDetailsTourNumberObservations'),
        missing: this.vt('pageTraitDetailsTourNumberMissingShare'),
        mean: this.$t('pageTraitDetailsTourNumberMean'),
        median: this.$t('pageTraitDetailsTourNumberMedian'),
        sd: this.vt('pageTraitDetailsTourNumberSd'),
        cv: this.vt('pageTraitDetailsTourNumberCv'),
        range: this.$t('pageTraitDetailsTourNumberRange'),
        outliers: this.$t('pageTraitDetailsTourNumberOutliers'),
        limits: this.$t('pageTraitDetailsTourNumberLimits'),
        'not-numbers': this.$t('pageTraitDetailsTourNumberNotNumbers')
      }
    },
    tourViews: function () {
      const texts = {
        distribution: this.vt('pageTraitDetailsTourNumericDistribution'),
        outliers: this.vt('pageTraitDetailsTourNumericOutliers'),
        ranking: this.vt('pageTraitDetailsTourNumericRanking'),
        time: this.$t('pageClimateDetailsTourNumericTime'),
        groups: this.$t('pageTraitDetailsTourNumericGroups')
      }
      return this.views.map(option => ({ key: option.key, title: option.text, text: texts[option.key] }))
    },
    tourExtraSteps: function () {
      return []
    },
    numbers: function () {
      const loaded = !this.loading
      const s = loaded ? this.summary : null
      const total = s ? s.n : 0
      const numbers = [{
        key: 'observations',
        value: loaded ? total : null,
        label: this.$t('pageTraitDetailsStatsObservations')
      }, {
        key: 'missing',
        value: loaded ? this.missing : null,
        label: this.$t('pageTraitDetailsStatsMissingShare', { percent: loaded && this.missing !== null && total + this.missing > 0 ? this.formatPercent(this.missing / (total + this.missing)) : '–' })
      }, {
        key: 'mean',
        text: true,
        value: s ? this.formatUnit(s.mean, 2) : null,
        label: this.$t('pageTraitDetailsStatsMean')
      }, {
        key: 'median',
        text: true,
        value: s ? this.formatUnit(s.median, 1) : null,
        label: this.$t('pageTraitDetailsStatsMedian')
      }, {
        key: 'sd',
        text: true,
        value: s && s.sd !== null ? this.formatUnit(s.sd, 2) : null,
        label: this.$t('pageTraitDetailsStatsSd')
      }, {
        key: 'cv',
        text: true,
        value: s && s.cv !== null ? `${this.formatFixed(s.cv, 1)} %` : null,
        label: this.$t('pageTraitDetailsStatsCv')
      }, {
        key: 'range',
        text: true,
        value: s ? `${this.formatValue(s.min)} – ${this.formatUnit(s.max)}` : null,
        label: this.$t('pageTraitDetailsStatsMinMax')
      }, {
        key: 'outliers',
        value: s ? s.outliers.reduce((sum, v) => sum + v.count, 0) : null,
        label: this.$t('pageTraitDetailsStatsOutliers')
      }]
      if (loaded && this.outsideLimitsCount > 0) {
        numbers.push({ key: 'limits', danger: true, value: this.outsideLimitsCount, label: this.$t('pageTraitDetailsStatsOutsideLimits') })
      }
      if (loaded && this.notNumberCount > 0) {
        numbers.push({ key: 'not-numbers', danger: true, value: this.notNumberCount, label: this.$t('pageTraitDetailsStatsNotNumbers') })
      }
      return numbers
    }
  },
  watch: {
    storeCustomChartColors: function () {
      this.draw()
    },
    traitRestrictions: function () {
      this.$nextTick(() => this.draw())
    }
  },
  methods: {
    // The counts per value (small whatever the number of observations: the numbers, the distribution) and the missing
    // values; every observation only when a view needs it
    update: function () {
      this.loading = true
      this.rows = []
      this.rowsState = 'none'
      this.page = 0
      this.outliersPage = 0
      Promise.all([this.loadValues(), this.loadMissing()]).then(([values, missing]) => {
        this.values = values
        this.missing = missing
      }).finally(() => {
        this.loading = false
        if (this.needsRows) {
          this.prepareRows()
        }
        this.$nextTick(() => this.draw())
      })
    },
    // A view needing every observation opened: loaded (very many: once confirmed)
    prepareRows: function () {
      if (this.rowsState !== 'none' || !this.hasChart) {
        return
      }
      if (this.summary.n > ROWS_CONFIRM) {
        this.rowsState = 'confirm'
      } else {
        this.loadObservations()
      }
    },
    loadObservations: function () {
      this.rowsState = 'loading'
      const datasetId = this.datasetId
      const traitId = this.traitId
      this.loadTrialRows(parseNumber).then(rows => {
        // Another dataset or trait meanwhile: not these
        if (datasetId !== this.datasetId || traitId !== this.traitId) {
          return
        }
        this.rows = Object.freeze(rows)
        this.page = 0
        this.outliersPage = 0
        this.rowsState = 'loaded'
        this.$nextTick(() => this.draw())
      })
    },
    setView: function (view) {
      this.view = view
      if (this.needsRows) {
        this.prepareRows()
      }
      this.$nextTick(() => this.draw())
    },
    setPage: function (page) {
      this.page = page
      this.$nextTick(() => this.draw())
    },
    setGroupBy: function (group) {
      this.groupBy = group
      this.$nextTick(() => this.draw())
    },
    toggleRankingOrder: function () {
      this.rankingDescending = !this.rankingDescending
      this.page = 0
      this.$nextTick(() => this.draw())
    },
    isOutsideLimits: function (x) {
      return (this.limits.min !== null && x < this.limits.min) || (this.limits.max !== null && x > this.limits.max)
    },
    getGroupLabel: function (group) {
      return group === 'block' ? this.$t('tableColumnTraitBlock') : this.$t('tableColumnTraitRep')
    },
    getBarColor: function () {
      const colors = this.storeCustomChartColors
      return colors && colors.length > 0 ? colors[0] : BAR_COLOR
    },
    // A number with the decimals of the data (and extra ones: means, deviations)
    formatValue: function (value, extra) {
      if (value === null || value === undefined || isNaN(value)) {
        return '–'
      }
      return formatDecimals(value, 0, this.decimals + (extra || 0))
    },
    // The title of the axes of the values: the name of the variable and its unit (none without a unit)
    getValueAxisTitle: function (theme) {
      return this.unit ? { text: `${this.traitName} (${this.unit})`, font: { family: FONT, size: 12, color: theme.muted } } : undefined
    },
    // A value with the unit of the variable (its abbreviation), if it has one
    formatUnit: function (value, extra) {
      const text = this.formatValue(value, extra)
      return this.unit && text !== '–' ? `${text} ${this.unit}` : text
    },
    formatFixed: function (value, digits) {
      return formatDecimals(value, digits)
    },
    formatPercent,
    formatP: function (p) {
      return p < 0.001 ? `< ${this.formatFixed(0.001, 3)}` : this.formatFixed(p, 3)
    },
    // A bar of the histogram clicked: its observations (its values as written, or the range of its bin)
    emitBin: function (bin) {
      if (!bin || bin.count < 1) {
        return
      }
      if (bin.discrete) {
        this.$emit('value-clicked', bin.raw.length === 1 ? bin.raw[0] : { label: this.formatUnit(bin.lo), values: bin.raw })
        return
      }
      // The bin includes its start, not its end (but the last one): its end just below
      const last = bin === this.bins[this.bins.length - 1]
      const epsilon = Math.pow(10, -(this.decimals + 3))
      this.$emit('value-clicked', { label: `${this.formatValue(bin.lo, 1)} – ${this.formatUnit(bin.hi, 1)}`, range: [bin.lo, last ? bin.hi : bin.hi - epsilon] })
    },
    draw: function () {
      const element = this.$refs.chart
      if (!element) {
        return
      }
      if (!this.chartShown) {
        Plotly.purge(element)
        this.figure = null
        this.drawnView = null
        return
      }
      const theme = this.getTheme()
      const figure = this.view === 'ranking' ? this.getRanking(theme) : (this.view === 'groups' ? this.getGroupsChart(theme) : (this.view === 'time' ? this.getTimeChart(theme) : this.getDistribution(theme)))
      const layout = Object.assign({
        height: this.chartHeight,
        paper_bgcolor: 'rgba(0, 0, 0, 0)',
        plot_bgcolor: 'rgba(0, 0, 0, 0)',
        font: { family: FONT, size: 13, color: theme.text },
        dragmode: false,
        hovermode: 'closest',
        showlegend: false
      }, figure.layout)
      figure.data.forEach(trace => { trace.hoverlabel = theme.hoverlabel })

      // As drawn, for the downloads
      this.figure = { data: figure.data, layout }

      // Another view: drawn anew (the axes of one do not suit the other)
      const drawn = `${this.view}-${this.activeGroup}`
      if (this.drawnView !== drawn) {
        Plotly.purge(element)
        this.drawnView = drawn
      }
      Plotly.react(element, figure.data, layout, {
        displayModeBar: false,
        responsive: true
      })

      // A bar clicked: its observations; an outlier of the box: those of its value; a germplasm: its passport
      element.removeAllListeners && element.removeAllListeners('plotly_click')
      element.on('plotly_click', event => {
        const point = event && event.points && event.points.length > 0 ? event.points[0] : null
        const custom = point ? point.customdata : null
        if (!custom || typeof custom !== 'object') {
          return
        }
        if (custom.germplasmId) {
          this.showPassportPreview(custom.germplasmId)
        } else if (custom.bin !== undefined) {
          this.emitBin(this.bins[custom.bin])
        } else if (custom.raw) {
          this.$emit('value-clicked', custom.raw.length === 1 ? custom.raw[0] : { label: custom.label, values: custom.raw })
        }
      })
      // Ranking: the names open the preview of the passport too
      element.removeAllListeners && element.removeAllListeners('plotly_afterplot')
      if (this.view === 'ranking') {
        this.bindGermplasmNames(this.pageGermplasm)
        element.on('plotly_afterplot', () => this.view === 'ranking' && this.bindGermplasmNames(this.pageGermplasm))
      }
      // A climate: the flags of the locations where their labels start
      this.watchLocationFlags()
    },
    // Over time (a climate): the value against the recording date, a line per location, the mean and the median of all
    getTimeChart: function (theme) {
      const colors = this.storeCustomChartColors && this.storeCustomChartColors.length > 0 ? this.storeCustomChartColors : (getColors() || [])
      const figure = getNumericTimeChart(this.rows, {
        theme,
        colors,
        locale: this.locale,
        t: (key, params) => this.$t(key, params),
        formatValue: value => this.formatUnit(value, 2),
        mean: this.summary ? this.summary.mean : null,
        median: this.summary ? this.summary.median : null,
        unitLabel: this.unit ? `${this.traitName} (${this.unit})` : null
      })
      // The legend below the chart: each location, its colour and the flag of its country
      this.timeLegend = figure.legend.map(item => Object.assign({ country: this.getLocationCountry(item.label) }, item))
      return figure
    },
    // The histogram (top) and a box plot of the same values (bottom), on the same axis; the mean and the median as lines,
    // the limits of the trait as dashed lines; bars outside the limits in red
    getDistribution: function (theme) {
      const s = this.summary
      const bins = this.bins
      const color = this.getBarColor()
      const observations = this.$t('pageTraitDetailsStatsObservations')
      const meanLabel = this.$t('pageTraitDetailsStatsMean')
      const medianLabel = this.$t('pageTraitDetailsStatsMedian')
      const discrete = bins.length > 0 && bins[0].discrete
      const width = discrete ? 0.8 : (bins.length > 0 ? (bins[0].hi - bins[0].lo) * 0.92 : 1)
      const binLabel = bin => bin.discrete ? this.formatUnit(bin.lo) : `${this.formatValue(bin.lo, 1)} – ${this.formatUnit(bin.hi, 1)}`
      // The axis: the values and the limits of the trait
      const ends = [s.min, s.max, this.limits.min, this.limits.max].filter(x => x !== null)
      const low = Math.min(...ends)
      const high = Math.max(...ends)
      const pad = Math.max(discrete ? 0.6 : 0, (high - low) * 0.04 || 0.5)
      const histogramBottom = 0.28
      const shapes = []
      const annotations = []
      // Mean and median: their labels on the side away from each other
      const meanLeft = s.mean < s.median
      ;[{ x: s.mean, text: `${meanLabel} · ${this.formatUnit(s.mean, 2)}`, dash: 'dash', anchor: meanLeft ? 'right' : 'left' },
        { x: s.median, text: `${medianLabel} · ${this.formatUnit(s.median, 1)}`, dash: 'dot', anchor: meanLeft ? 'left' : 'right' }].forEach(line => {
        shapes.push({ type: 'line', xref: 'x', yref: 'paper', x0: line.x, x1: line.x, y0: histogramBottom, y1: 1, line: { color: theme.strong, width: 1.5, dash: line.dash } })
        annotations.push({ xref: 'x', yref: 'paper', x: line.x, y: 1, yanchor: 'bottom', xanchor: line.anchor, showarrow: false, text: line.text, font: { family: FONT, size: 12, color: theme.strong } })
      })
      // The limits of the trait
      ;[{ x: this.limits.min, key: 'pageTraitDetailsStatsLimitMin', anchor: 'left' }, { x: this.limits.max, key: 'pageTraitDetailsStatsLimitMax', anchor: 'right' }].filter(limit => limit.x !== null).forEach(limit => {
        shapes.push({ type: 'line', xref: 'x', yref: 'paper', x0: limit.x, x1: limit.x, y0: 0, y1: 1, line: { color: DANGER_COLOR, width: 1, dash: 'longdash' } })
        annotations.push({ xref: 'x', yref: 'paper', x: limit.x, y: histogramBottom, yanchor: 'bottom', xanchor: limit.anchor, xshift: limit.anchor === 'left' ? 4 : -4, showarrow: false, text: this.$t(limit.key, { value: this.formatUnit(limit.x) }), font: { family: FONT, size: 11, color: DANGER_COLOR } })
      })
      const outlierPoints = s.outliers
      return {
        data: [{
          type: 'bar',
          x: bins.map(bin => bin.center),
          y: bins.map(bin => bin.count),
          width: bins.map(() => width),
          customdata: bins.map((bin, i) => ({ bin: i })),
          hovertext: bins.map(bin => `<b>${binLabel(bin)}</b><br>${observations}: <b>${formatNumber(bin.count)}</b> · ${this.formatPercent(bin.count / s.n)}`),
          hovertemplate: '%{hovertext}<extra></extra>',
          marker: { color: bins.map(bin => this.isOutsideLimits(bin.center) ? DANGER_COLOR : color), cornerradius: 4 },
          xaxis: 'x',
          yaxis: 'y'
        }, {
          // The box plot from the numbers (its quartiles, the ends of its whiskers, the mean)
          type: 'box',
          orientation: 'h',
          y: [0],
          q1: [s.q1],
          median: [s.median],
          q3: [s.q3],
          lowerfence: [s.whiskerLow],
          upperfence: [s.whiskerHigh],
          mean: [s.mean],
          boxpoints: false,
          fillcolor: this.mixColor(color, theme.surface, 0.25),
          line: { color, width: 1.5 },
          hoverinfo: 'x',
          xaxis: 'x',
          yaxis: 'y2'
        }, {
          // The outliers: a point per value (larger with more observations)
          type: 'scatter',
          mode: 'markers',
          x: outlierPoints.map(v => v.x),
          y: outlierPoints.map(() => 0),
          customdata: outlierPoints.map(v => ({ raw: v.raw, label: this.formatUnit(v.x) })),
          hovertext: outlierPoints.map(v => `<b>${this.formatUnit(v.x)}</b> · ${this.$t('pageTraitDetailsStatsOutliers')}<br>${observations}: <b>${formatNumber(v.count)}</b>`),
          hovertemplate: '%{hovertext}<extra></extra>',
          marker: { color: OUTLIER_COLOR, size: outlierPoints.map(v => Math.min(18, 7 + Math.sqrt(v.count) * 2)), line: { color: theme.surface, width: 1 } },
          xaxis: 'x',
          yaxis: 'y2'
        }],
        layout: {
          margin: { t: 34, r: 20, b: 40, l: 56 },
          bargap: 0.1,
          shapes,
          annotations,
          xaxis: {
            title: this.getValueAxisTitle(theme),
            range: [low - pad, high + pad],
            showgrid: false,
            zeroline: false,
            showline: true,
            linecolor: theme.grid,
            tickfont: { family: FONT, size: 12, color: theme.muted },
            fixedrange: true
          },
          yaxis: {
            domain: [histogramBottom + 0.04, 1],
            title: { text: observations, font: { family: FONT, size: 12, color: theme.muted } },
            showgrid: true,
            gridcolor: theme.grid,
            griddash: 'dot',
            zeroline: false,
            rangemode: 'tozero',
            tickformat: 'd',
            tickfont: { family: FONT, size: 12, color: theme.muted },
            fixedrange: true
          },
          yaxis2: {
            domain: [0, histogramBottom - 0.06],
            range: [-0.6, 0.6],
            showticklabels: false,
            showgrid: false,
            zeroline: false,
            fixedrange: true
          }
        }
      }
    },
    // A row per germplasm of the page: its mean (± standard error; hollow: a single observation), the mean of all as a
    // dashed line, its n at the end
    getRanking: function (theme) {
      const germplasm = this.pageGermplasm
      // A climate: the flag of the country of each location beside its name
      const flags = this.getLocationFlags(germplasm.map(g => g.name))
      const color = this.getBarColor()
      const s = this.summary
      const meanLabel = this.$t('pageTraitDetailsStatsMean')
      const seLabel = this.$t('pageTraitDetailsStatsSe')
      const previewLabel = this.$t('tableTooltipGermplasmPreviewPassport')
      const allMean = this.numericRows.length > 0 ? mean(this.numericRows.map(row => row.mapped)) : s.mean
      return {
        data: [{
          type: 'scatter',
          mode: 'markers',
          x: germplasm.map(g => g.mean),
          y: germplasm.map((g, i) => i),
          error_x: { type: 'data', array: germplasm.map(g => g.se || 0), visible: true, color: theme.line, thickness: 1.5, width: 4 },
          customdata: germplasm.map(g => ({ germplasmId: g.germplasmId })),
          hovertext: germplasm.map(g => [`<b>${g.name}</b>`, `${meanLabel}: <b>${this.formatUnit(g.mean, 2)}</b>${g.se !== null ? ` ± ${this.formatUnit(g.se, 2)} (${seLabel})` : ''}`, `${this.$t('pageTraitDetailsStatsMinMax')}: ${this.formatValue(g.min)} – ${this.formatUnit(g.max)}`, this.$t('pageTraitDetailsStatsSampleSize', { count: formatNumber(g.n) }), g.germplasmId ? `<i>${previewLabel}</i>` : null].filter(t => t).join('<br>')),
          hovertemplate: '%{hovertext}<extra></extra>',
          marker: {
            size: 10,
            symbol: germplasm.map(g => g.n > 1 ? 'circle' : 'circle-open'),
            color,
            line: { color, width: 2 }
          }
        }],
        layout: {
          margin: { t: 34, r: 70, b: 40, l: 10 },
          shapes: [{ type: 'line', xref: 'x', yref: 'paper', x0: allMean, x1: allMean, y0: 0, y1: 1, line: { color: theme.strong, width: 1.5, dash: 'dash' } }],
          annotations: [{ xref: 'x', yref: 'paper', x: allMean, y: 1, yanchor: 'bottom', showarrow: false, text: `${meanLabel} · ${this.formatUnit(allMean, 2)}`, font: { family: FONT, size: 12, color: theme.strong } }].concat(germplasm.map((g, i) => ({
            xref: 'paper',
            yref: 'y',
            x: 1,
            y: i,
            xanchor: 'left',
            xshift: 8,
            showarrow: false,
            text: this.$t('pageTraitDetailsStatsSampleSize', { count: formatNumber(g.n) }),
            font: { family: FONT, size: 12, color: theme.muted }
          }))),
          xaxis: {
            title: this.getValueAxisTitle(theme),
            showgrid: true,
            gridcolor: theme.grid,
            griddash: 'dot',
            zeroline: false,
            tickfont: { family: FONT, size: 12, color: theme.muted },
            fixedrange: true
          },
          yaxis: {
            autorange: 'reversed',
            tickmode: 'array',
            tickvals: germplasm.map((g, i) => i),
            ticktext: germplasm.map(g => flags.prefix + this.getLabel(g.name)),
            showgrid: false,
            zeroline: false,
            showline: false,
            ticks: '',
            ticklabelstandoff: 8,
            automargin: true,
            tickfont: { family: FONT, size: 12, color: theme.text },
            fixedrange: true
          },
          images: flags.images
        }
      }
    },
    // A box plot per level of the rep / block (its observations as points; very many: the boxes alone), its mean; the
    // mean of all as a dashed line
    getGroupsChart: function (theme) {
      const groups = this.groups
      const color = this.getBarColor()
      const groupLabel = this.getGroupLabel(this.activeGroup)
      const points = !this.groupPointsHidden
      const labels = groups.map(g => `${groupLabel} ${g.level}`)
      const x = []
      const y = []
      groups.forEach((g, i) => g.xs.forEach(value => {
        x.push(labels[i])
        y.push(value)
      }))
      const allMean = mean(y)
      return {
        data: [{
          type: 'box',
          x,
          y,
          boxmean: true,
          boxpoints: points ? 'all' : 'outliers',
          jitter: 0.45,
          pointpos: 0,
          fillcolor: this.mixColor(color, theme.surface, 0.22),
          line: { color, width: 1.5 },
          marker: { color, size: 5, opacity: points ? 0.55 : 0.9 },
          hoveron: 'boxes'
        }],
        layout: {
          margin: { t: 34, r: 20, b: 60, l: 56 },
          shapes: [{ type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: allMean, y1: allMean, line: { color: theme.strong, width: 1, dash: 'dash' } }],
          annotations: [{ xref: 'paper', yref: 'y', x: 1, y: allMean, xanchor: 'right', yanchor: 'bottom', showarrow: false, text: `${this.$t('pageTraitDetailsStatsMean')} · ${this.formatUnit(allMean, 2)}`, font: { family: FONT, size: 12, color: theme.strong } }],
          xaxis: {
            type: 'category',
            tickmode: 'array',
            tickvals: labels,
            ticktext: groups.map((g, i) => `${labels[i]}<br><span style="font-size: 11px">${this.$t('pageTraitDetailsStatsSampleSize', { count: formatNumber(g.xs.length) })}</span>`),
            showgrid: false,
            zeroline: false,
            tickfont: { family: FONT, size: 12, color: theme.text },
            fixedrange: true
          },
          yaxis: {
            title: this.getValueAxisTitle(theme),
            showgrid: true,
            gridcolor: theme.grid,
            griddash: 'dot',
            zeroline: false,
            tickfont: { family: FONT, size: 12, color: theme.muted },
            fixedrange: true
          }
        }
      }
    }
  }
}
</script>

<!-- The views, the sentences, the notes, the pages: as the dates and the categories -->
<style src="@/assets/trait-stats.css"></style>
<style>
/* Over time (a climate): the legend of the locations below the chart: a line of their colour, their flag and name */
.tns .tns-time-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem 1.25rem;
  margin: 0.25rem 1.25rem 1rem;
  color: var(--cp-text);
  font-size: 0.85rem;
}
.tns .tns-time-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}
.tns .tns-time-legend-line {
  width: 18px;
  height: 3px;
  border-radius: 2px;
}
/* Outliers: a light table */
.tns .tns-table-wrap {
  margin-top: 0.75rem;
  overflow-x: auto;
  border: 1px solid var(--cp-border);
  border-radius: 10px;
}
.tns .tns-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.tns .tns-table th {
  padding: 0.6rem 0.9rem;
  border-bottom: 1px solid var(--cp-border);
  background: var(--cp-neutral-bg);
  color: var(--cp-text-subtle);
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
}
.tns .tns-table td {
  padding: 0.55rem 0.9rem;
  border-bottom: 1px solid var(--cp-border);
  vertical-align: middle;
}
.tns .tns-table tbody tr:last-child td {
  border-bottom: 0;
}
.tns .tns-table .is-number {
  text-align: right;
  white-space: nowrap;
}
/* The reasons of an outlier: a chip each (limits red, fences orange, reps blue) */
.tns .tns-reason {
  display: inline-block;
  margin: 0.1rem 0.35rem 0.1rem 0;
  padding: 0.1rem 0.55rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--tns-reason) 14%, transparent);
  color: var(--cp-text);
  font-size: 0.8rem;
  --tns-reason: #5b9cf6;
}
.tns .tns-reason.is-limits {
  --tns-reason: #d0523f;
}
.tns .tns-reason.is-fence {
  --tns-reason: #e07b39;
}
/* The bars (their observations) and the germplasm (the preview of their passport) can be clicked */
.tns .tvs-chart.is-clickable .plotly .bars .point,
.tns .tvs-chart.is-clickable .plotly .scatterlayer .point {
  cursor: pointer;
}
</style>
