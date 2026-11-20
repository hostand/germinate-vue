<template>
  <!-- The values of a categorical trait in one dataset: its numbers (categories used of those of the trait, observations,
       missing values, the most frequent category, the median category of an ordinal scale, the values outside the
       categories) and three views:
       - distribution: a bar per category in the order of the trait (its count and share; categories never seen: an empty
         bar; values outside the categories: hatched bars at the end); a bar clicked: its observations (value-clicked)
       - by germplasm: a 100 % bar per germplasm (the share of each category), the mixed ones first (an ordinal scale: the
         widest spread on the scale first); the share of consistent germplasm; its name or bar clicked: the preview of
         its passport
       - by rep / block: a 100 % bar for all the observations and one per rep (or block), the median category of each
         (ordinal scale) and a chi-square test (does the distribution differ between them?)
       Ordinal scale: the trait attribute "scale" = "ordinal" (the categories in the order of the trait, coloured from the
       first to the last, the median category); else nominal (a colour per category).
       Large data: the numbers and the distribution come from the counts per value; the other views load every
       observation when opened (after a confirmation above ROWS_CONFIRM observations) and show the germplasm in pages. -->
  <!-- As TraitValueStats (which it extends, its look included): the numbers on a strip at the top, the options of the
       chart and its help at the right end of the strip, then the chart under its title -->
  <div class="tvs tds tcs" :id="id">
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
        <!-- The colours of the charts: those of the categories of a nominal scale -->
        <b-dropdown-item link-class="top-nav-menu-item" @click="$refs.baseChart.showColors()"><i class="fa-solid fa-palette fa-fw" aria-hidden="true" /> {{ $t('buttonChangeChartColors') }}</b-dropdown-item>
      </template>
      <template slot="additionalButtons">
        <b-button v-b-tooltip.hover :title="$t('chartTooltipMatrixTour')" :aria-label="$t('chartTooltipMatrixTour')" :disabled="!hasChart" @click="$refs.tour.start()">
          <i class="fa-regular fa-circle-question" aria-hidden="true" />
        </b-button>
      </template>
      <div slot="chart" class="tvs-chart-wrap">
        <!-- The trait: the icon of its data type, its name; an ordinal scale: a chip saying so -->
        <div class="tvs-head">
          <span class="tvs-type" :style="{ '--tvs-type-color': typeColor }" v-if="dataType"><MdiIcon :path="dataType.path" /></span>
          <span class="tvs-name">{{ traitName }}</span>
          <span class="tcs-scale" v-if="isOrdinal" v-b-tooltip.hover :title="$t('pageTraitDetailsStatsOrdinalScaleTooltip')"><i class="fa-solid fa-arrow-up-wide-short" aria-hidden="true" /> {{ $t('pageTraitDetailsStatsOrdinalScale') }}</span>
        </div>
        <!-- The views of the categories -->
        <div class="tds-views" role="tablist" v-if="hasChart">
          <button type="button" :class="['tds-view', { active: view === option.key }]" :data-tour-view="option.key" role="tab" :aria-selected="view === option.key ? 'true' : 'false'" v-for="option in views" :key="`tcs-view-${option.key}`" @click="setView(option.key)">
            <i :class="['fa-solid', option.icon]" aria-hidden="true" /> {{ option.text }}
          </button>
        </div>
        <div class="tvs-loading" v-if="loading"><b-spinner small type="grow" /></div>
        <p class="tvs-empty" v-else-if="values.length < 1">{{ $t('headingNoData') }}</p>
        <!-- By germplasm, by rep / block: every observation needed, loaded when opened (very many: once confirmed) -->
        <template v-else-if="needsRows && rowsState !== 'loaded'">
          <div class="tvs-loading" v-if="rowsState === 'loading'"><b-spinner small type="grow" /><span class="tds-progress" v-if="rowsProgress && rowsProgress.total > rowsProgress.loaded">{{ $t('pageTraitDetailsStatsLoadingProgress', { loaded: formatNumber(rowsProgress.loaded), total: formatNumber(rowsProgress.total) }) }}</span></div>
          <div class="tds-single" v-else-if="rowsState === 'confirm'">
            <p><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ vt('pageTraitDetailsStatsObservationsLarge', { count: formatNumber(total) }) }}</p>
            <button type="button" class="tvs-values-link" @click="loadObservations"><i class="fa-solid fa-download" aria-hidden="true" /> {{ $t('pageTraitDetailsStatsLoadObservations') }}</button>
          </div>
        </template>
        <!-- By rep / block: no rep nor block with more than one level -->
        <p class="tds-single" v-else-if="view === 'groups' && groupOptions.length < 1"><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ $t('pageTraitDetailsStatsNoGroups') }}</p>
        <!-- By germplasm: the share of consistent germplasm, only the mixed ones -->
        <div class="tcs-bar" v-if="chartShown && view === 'germplasm'">
          <span class="tcs-summary"><i :class="['fa-solid', mixedCount > 0 ? 'fa-shuffle' : 'fa-circle-check']" aria-hidden="true" /> {{ vt('pageTraitDetailsStatsConsistentGermplasm', { count: formatNumber(germplasm.length - mixedCount), total: formatNumber(germplasm.length), percent: formatPercent((germplasm.length - mixedCount) / Math.max(1, germplasm.length)) }) }}</span>
          <button type="button" :class="['tds-pager-toggle', { active: onlyMixed }]" v-if="mixedCount > 0" @click="toggleOnlyMixed" :aria-pressed="onlyMixed ? 'true' : 'false'">
            <i class="fa-solid fa-filter" aria-hidden="true" /> {{ onlyMixed ? vt('pageTraitDetailsStatsAllGermplasm') : vt('pageTraitDetailsStatsOnlyMixed') }}
          </button>
        </div>
        <!-- By rep / block: which of them (both with more than one level) -->
        <div class="tds-views tcs-groups" role="tablist" v-if="chartShown && view === 'groups' && groupOptions.length > 1">
          <button type="button" :class="['tds-view', { active: activeGroup === option }]" role="tab" :aria-selected="activeGroup === option ? 'true' : 'false'" v-for="option in groupOptions" :key="`tcs-group-${option}`" @click="setGroupBy(option)">
            {{ getGroupLabel(option) }}
          </button>
        </div>
        <div :class="['tvs-chart', { 'is-clickable': view === 'distribution' || (view === 'germplasm' && !isClimate) }]" ref="chart" v-show="chartShown" />
        <!-- Over time: no recording dates; many observations grouped by month or year -->
        <p class="tds-single" v-if="hasChart && view === 'time' && rowsState === 'loaded' && !chartShown"><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ $t('pageClimateDetailsStatsNoDates') }}</p>
        <p class="tds-note" v-if="chartShown && timeUnit"><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ timeUnit === 'year' ? $t('pageClimateDetailsStatsTimeByYearCategory') : $t('pageClimateDetailsStatsTimeByMonthCategory') }}</p>
        <!-- By germplasm: many germplasm in pages -->
        <div class="tds-pager" v-if="chartShown && view === 'germplasm' && shownGermplasm.length > pageSize">
          <button type="button" class="tds-pager-button" :disabled="page === 0" @click="setPage(page - 1)" :title="vt('pageTraitDetailsStatsPreviousGermplasm')" :aria-label="vt('pageTraitDetailsStatsPreviousGermplasm')"><i class="fa-solid fa-chevron-left" aria-hidden="true" /></button>
          <span>{{ vt('pageTraitDetailsStatsGermplasmRange', { from: formatNumber(page * pageSize + 1), to: formatNumber(Math.min(shownGermplasm.length, (page + 1) * pageSize)), total: formatNumber(shownGermplasm.length) }) }}</span>
          <button type="button" class="tds-pager-button" :disabled="(page + 1) * pageSize >= shownGermplasm.length" @click="setPage(page + 1)" :title="vt('pageTraitDetailsStatsNextGermplasm')" :aria-label="vt('pageTraitDetailsStatsNextGermplasm')"><i class="fa-solid fa-chevron-right" aria-hidden="true" /></button>
        </div>
        <!-- By rep / block: does the distribution differ between them? -->
        <p class="tds-note" v-if="chartShown && view === 'groups' && chiSquare">
          <i class="fa-solid fa-circle-info" aria-hidden="true" />
          <template v-if="chiSquare.reliable">
            {{ $t('pageTraitDetailsStatsChiSquare', { group: getGroupLabel(activeGroup), chi: formatDecimal(chiSquare.chi, 2), df: chiSquare.df, p: formatP(chiSquare.p) }) }}
            <b>{{ chiSquare.p < 0.05 ? $t('pageTraitDetailsStatsChiSquareDiffers') : $t('pageTraitDetailsStatsChiSquareSimilar') }}</b>
          </template>
          <template v-else>{{ $t('pageTraitDetailsStatsChiSquareUnreliable') }}</template>
        </p>
      </div>
    </BaseChart>

    <!-- The preview of the passport of a germplasm (by germplasm: its name or its bar clicked) -->
    <PassportPreviewModal :germplasmId="previewGermplasmId" ref="passportPreview" v-if="previewGermplasmId !== null" @hidden="previewGermplasmId = null" />

    <!-- Tour explaining the options of the chart -->
    <Tour :steps="tourSteps" modernLook ref="tour" />
  </div>
</template>

<script>
import TraitValueStats from '@/components/charts/TraitValueStats'
import PassportPreviewModal from '@/components/germplasm/PassportPreviewModal'
import traitStats, { FONT } from '@/mixins/trait-stats'
import { getColors } from '@/mixins/colors'
import { getColorsFor } from '@/mixins/chart-palettes'
import { formatNumber, formatDecimals, formatPercent } from '@/mixins/formatting'
import { chiSquareP } from '@/mixins/stats-math'
import { getCategoryTimeChart, getTimeUnit, hasDates } from '@/mixins/climate-time'

const Plotly = require('plotly.js/lib/core')

// The distribution: a row per category and the axis
const DISTRIBUTION_ROW = 48
const DISTRIBUTION_EXTRA = 60
// By germplasm: a row per germplasm, germplasm per page, the axis and the legend
const GERMPLASM_ROW = 30
const GERMPLASM_EXTRA = 110
const PAGE_SIZE = 40
// By rep / block: a row for all and one per level
const GROUP_ROW = 46
const GROUP_EXTRA = 110
// Above this many observations, those of the other views are loaded only once confirmed
const ROWS_CONFIRM = 50000
// An ordinal scale: from the colour of the first category to that of the last
const ORDINAL_COLORS = ['#d0523f', '#e8b04a', '#5a9e4b']
// Values outside the categories: grey, hatched
const OUTSIDE_COLOR = '#9aa09b'
const OUTSIDE_COLOR_DARK = '#6b716d'
const BAR_COLOR = '#5b9cf6'

// Levels of a rep / block in their order (numbers as numbers)
const sortLevels = levels => levels.sort((a, b) => (+a - +b) || `${a}`.localeCompare(`${b}`))

export default {
  extends: TraitValueStats,
  // The colours of the page, the observations (trial export), the preview of the passport
  mixins: [traitStats],
  components: {
    PassportPreviewModal
  },
  props: {
    // The restrictions of the trait: its categories ({ categories: [[scale 1], [scale 2], ...] }, the scales giving the
    // same categories in their order, e.g. [["Low", "High"], ["1", "2"]])
    traitRestrictions: {
      type: Object,
      default: null
    },
    // An ordinal scale (the trait attribute "scale" = "ordinal"): the categories ordered, the median category
    ordinal: {
      type: Boolean,
      default: false
    }
  },
  data: function () {
    return {
      // Every observation (germplasm, rep, block, its category), loaded when a view needs it. none, confirm (very many:
      // loaded once confirmed), loading, loaded
      rows: [],
      rowsState: 'none',
      // distribution, germplasm or groups
      view: 'distribution',
      page: 0,
      pageSize: PAGE_SIZE,
      // By germplasm: only the mixed ones
      onlyMixed: false,
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
        icon: 'fa-chart-bar',
        text: this.$t('pageTraitDetailsStatsViewDistribution')
      }, {
        key: 'germplasm',
        icon: this.isClimate ? 'fa-location-dot' : 'fa-seedling',
        text: this.vt('pageTraitDetailsStatsViewByGermplasm')
      }, {
        key: 'groups',
        icon: 'fa-table-cells',
        text: this.$t('pageTraitDetailsStatsViewByGroup')
      }, {
        key: 'time',
        icon: 'fa-timeline',
        text: this.$t('pageClimateDetailsStatsViewOverTime')
      }].filter(view => this.isClimate ? view.key !== 'groups' : view.key !== 'time')
      // (a climate: no rep nor block, its values over the recording dates)
    },
    // The categories of the trait, in its order: the label (first scale) and the codes of every scale
    domain: function () {
      const restrictions = this.traitRestrictions
      const scales = restrictions && Array.isArray(restrictions.categories) ? restrictions.categories.filter(s => Array.isArray(s) && s.length > 0) : []
      const count = scales.reduce((max, s) => Math.max(max, s.length), 0)
      const domain = []
      for (let i = 0; i < count; i++) {
        const codes = [...new Set(scales.map(s => s[i]).filter(c => c !== null && c !== undefined && `${c}`.trim() !== '').map(c => `${c}`.trim()))]
        if (codes.length > 0) {
          domain.push({ index: i, label: codes[0], codes })
        }
      }
      return domain
    },
    // A value (any scale, any case) to the position of its category
    lookup: function () {
      const lookup = {}
      this.domain.forEach((category, position) => category.codes.forEach(code => {
        const key = code.toLowerCase()
        if (!(key in lookup)) {
          lookup[key] = position
        }
      }))
      return lookup
    },
    hasDomain: function () {
      return this.domain.length > 0
    },
    // Ordered only with categories to order
    isOrdinal: function () {
      return this.ordinal && this.hasDomain
    },
    // The bars: the categories of the trait (also those never seen), then the values outside them; without categories,
    // the values seen, the most frequent first. Each: its key, label, the values seen (as in the data), its count.
    categories: function () {
      const byKey = {}
      const list = []
      if (this.hasDomain) {
        this.domain.forEach((category, position) => {
          byKey[`c${position}`] = { key: `c${position}`, position, label: category.label, codes: category.codes, values: [], count: 0, outside: false }
          list.push(byKey[`c${position}`])
        })
      }
      const outside = []
      this.values.forEach(v => {
        const key = this.getCategoryKey(v.value)
        if (!byKey[key]) {
          byKey[key] = { key, position: null, label: `${v.value}`, codes: [`${v.value}`], values: [], count: 0, outside: this.hasDomain }
          ;(this.hasDomain ? outside : list).push(byKey[key])
        }
        byKey[key].values.push(`${v.value}`)
        byKey[key].count += v.count
      })
      return Object.freeze(list.concat(outside))
    },
    categoryMap: function () {
      const map = {}
      this.categories.forEach(c => { map[c.key] = c })
      return map
    },
    outsideCount: function () {
      return this.categories.filter(c => c.outside).reduce((sum, c) => sum + c.count, 0)
    },
    // The median category of an ordinal scale (of the observations in the categories)
    medianCategory: function () {
      return this.isOrdinal ? this.getMedian(this.categories.filter(c => !c.outside).map(c => ({ key: c.key, count: c.count }))) : null
    },
    hasChart: function () {
      return !this.loading && this.values.length > 0
    },
    needsRows: function () {
      return this.view !== 'distribution'
    },
    chartShown: function () {
      if (!this.hasChart || (this.needsRows && this.rowsState !== 'loaded')) {
        return false
      }
      if (this.view === 'groups') {
        return this.groupOptions.length > 0
      }
      if (this.view === 'time') {
        return hasDates(this.rows)
      }
      return this.view !== 'germplasm' || this.germplasm.length > 0
    },
    // Over time: the observations grouped by month or year (many of them), else null
    timeUnit: function () {
      return this.view === 'time' && this.rowsState === 'loaded' ? getTimeUnit(this.rows) : null
    },
    // By germplasm: its observations per category, its dominant category, how pure, mixed or not, its spread on an
    // ordinal scale. Mixed first (the widest spread first on an ordinal scale), then by their dominant category.
    germplasm: function () {
      const byGermplasm = {}
      this.rows.forEach(row => {
        const key = row.germplasmId || row.germplasm
        if (!byGermplasm[key]) {
          byGermplasm[key] = { germplasmId: row.germplasmId, name: row.germplasm, counts: {}, n: 0 }
        }
        const g = byGermplasm[key]
        g.counts[row.mapped] = (g.counts[row.mapped] || 0) + 1
        g.n++
      })
      const order = key => this.categories.findIndex(c => c.key === key)
      return Object.values(byGermplasm).map(g => {
        const keys = Object.keys(g.counts)
        const dominant = keys.reduce((best, key) => (best === null || g.counts[key] > g.counts[best] || (g.counts[key] === g.counts[best] && order(key) < order(best))) ? key : best, null)
        const positions = keys.map(key => this.categoryMap[key]).filter(c => c && c.position !== null).map(c => c.position)
        return Object.assign(g, {
          dominant,
          purity: g.counts[dominant] / g.n,
          mixed: keys.length > 1,
          spread: positions.length > 0 ? Math.max(...positions) - Math.min(...positions) : 0
        })
      }).sort((a, b) => (this.isOrdinal ? b.spread - a.spread : 0) || a.purity - b.purity || order(a.dominant) - order(b.dominant) || `${a.name}`.localeCompare(`${b.name}`))
    },
    mixedCount: function () {
      return this.germplasm.filter(g => g.mixed).length
    },
    shownGermplasm: function () {
      return this.onlyMixed ? this.germplasm.filter(g => g.mixed) : this.germplasm
    },
    pageGermplasm: function () {
      const start = this.page * PAGE_SIZE
      return this.shownGermplasm.slice(start, start + PAGE_SIZE)
    },
    // Rep and / or block, those with more than one level
    groupOptions: function () {
      return ['rep', 'block'].filter(group => new Set(this.rows.map(row => row[group]).filter(level => level !== null && level !== undefined && `${level}` !== '')).size > 1)
    },
    activeGroup: function () {
      return this.groupOptions.includes(this.groupBy) ? this.groupBy : (this.groupOptions[0] || null)
    },
    // By rep / block: the observations per category of each level
    groups: function () {
      const group = this.activeGroup
      if (!group) {
        return []
      }
      const byLevel = {}
      this.rows.forEach(row => {
        const level = row[group]
        if (level === null || level === undefined || `${level}` === '') {
          return
        }
        if (!byLevel[level]) {
          byLevel[level] = { level, counts: {}, n: 0 }
        }
        byLevel[level].counts[row.mapped] = (byLevel[level].counts[row.mapped] || 0) + 1
        byLevel[level].n++
      })
      return sortLevels(Object.keys(byLevel)).map(level => byLevel[level])
    },
    // Does the distribution differ between the levels? Chi-square test of independence (levels x categories seen);
    // reliable when every expected count is at least 1 and at most a fifth of them below 5
    chiSquare: function () {
      const groups = this.groups
      const keys = this.categories.map(c => c.key).filter(key => groups.some(g => g.counts[key]))
      if (groups.length < 2 || keys.length < 2) {
        return null
      }
      const total = groups.reduce((sum, g) => sum + g.n, 0)
      const columns = keys.map(key => groups.reduce((sum, g) => sum + (g.counts[key] || 0), 0))
      let chi = 0
      let small = 0
      let tooSmall = false
      groups.forEach(g => keys.forEach((key, k) => {
        const expected = g.n * columns[k] / total
        if (expected < 1) {
          tooSmall = true
        }
        if (expected < 5) {
          small++
        }
        chi += Math.pow((g.counts[key] || 0) - expected, 2) / expected
      }))
      const df = (groups.length - 1) * (keys.length - 1)
      return {
        chi,
        df,
        p: chiSquareP(chi, df),
        reliable: !tooSmall && small <= 0.2 * groups.length * keys.length
      }
    },
    chartHeight: function () {
      if (this.view === 'germplasm') {
        return Math.max(1, this.pageGermplasm.length) * GERMPLASM_ROW + GERMPLASM_EXTRA
      }
      if (this.view === 'groups') {
        return (this.groups.length + 1) * GROUP_ROW + GROUP_EXTRA
      }
      if (this.view === 'time') {
        return this.getTimeChart(this.getTheme()).layout.height
      }
      return Math.max(1, this.categories.length) * DISTRIBUTION_ROW + DISTRIBUTION_EXTRA
    },
    // The help: what each number and each view tells; an ordinal scale: its badge
    tourNumberTexts: function () {
      return {
        categories: this.hasDomain ? this.$t('pageTraitDetailsTourNumberCategories') : this.$t('pageTraitDetailsTourNumberUnique'),
        observations: this.vt('pageTraitDetailsTourNumberObservations'),
        missing: this.vt('pageTraitDetailsTourNumberMissingShare'),
        top: this.$t('pageTraitDetailsTourNumberTopCategory'),
        median: this.$t('pageTraitDetailsTourNumberMedianCategory'),
        outside: this.$t('pageTraitDetailsTourNumberOutside')
      }
    },
    tourViews: function () {
      const texts = {
        distribution: this.vt('pageTraitDetailsTourCategoricalDistribution'),
        germplasm: this.vt('pageTraitDetailsTourCategoricalGermplasm'),
        time: this.$t('pageClimateDetailsTourCategoricalTime'),
        groups: this.$t('pageTraitDetailsTourCategoricalGroups')
      }
      return this.views.map(option => ({ key: option.key, title: option.text, text: texts[option.key] }))
    },
    tourExtraSteps: function () {
      return [{
        title: this.$t('pageTraitDetailsStatsOrdinalScale'),
        text: this.$t('pageTraitDetailsTourOrdinalScale'),
        selector: '.tcs-scale'
      }]
    },
    numbers: function () {
      const loaded = !this.loading
      const total = this.total
      const seen = this.categories.filter(c => !c.outside && c.count > 0)
      const top = seen.concat(this.categories.filter(c => c.outside)).reduce((best, c) => (best === null || c.count > best.count) ? c : best, null)
      const numbers = [{
        key: 'categories',
        text: true,
        value: loaded ? (this.hasDomain ? `${formatNumber(seen.length)} / ${formatNumber(this.domain.length)}` : formatNumber(seen.length)) : null,
        label: this.hasDomain ? this.$t('pageTraitDetailsStatsCategoriesUsed') : this.$t('pageTraitDetailsStatsUniqueValues')
      }, {
        key: 'observations',
        value: loaded ? total : null,
        label: this.$t('pageTraitDetailsStatsObservations')
      }, {
        key: 'missing',
        value: loaded ? this.missing : null,
        label: this.$t('pageTraitDetailsStatsMissingShare', { percent: loaded && this.missing !== null && total + this.missing > 0 ? this.formatPercent(this.missing / (total + this.missing)) : '–' })
      }, {
        key: 'top',
        text: true,
        value: loaded && top ? top.label : null,
        label: this.$t('pageTraitDetailsStatsTopValue', { percent: loaded && top && total > 0 ? this.formatPercent(top.count / total) : '–' })
      }]
      if (this.isOrdinal) {
        numbers.push({
          key: 'median',
          text: true,
          value: loaded && this.medianCategory ? this.categoryMap[this.medianCategory].label : null,
          label: this.$t('pageTraitDetailsStatsMedianCategory')
        })
      }
      if (loaded && this.outsideCount > 0) {
        numbers.push({
          key: 'outside',
          danger: true,
          value: this.outsideCount,
          label: this.$t('pageTraitDetailsStatsOutOfDomain')
        })
      }
      return numbers
    }
  },
  watch: {
    storeCustomChartColors: function () {
      this.draw()
    },
    ordinal: function () {
      this.$nextTick(() => this.draw())
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
      this.onlyMixed = false
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
      this.loadTrialRows(value => this.getCategoryKey(value)).then(rows => {
        // Another dataset or trait meanwhile: not these
        if (datasetId !== this.datasetId || traitId !== this.traitId) {
          return
        }
        this.rows = Object.freeze(rows)
        this.page = 0
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
    toggleOnlyMixed: function () {
      this.onlyMixed = !this.onlyMixed
      this.page = 0
      this.$nextTick(() => this.draw())
    },
    // The category of a value: its position in the categories of the trait (any scale, any case), else the value itself
    getCategoryKey: function (value) {
      const text = `${value}`.trim()
      const position = this.lookup[text.toLowerCase()]
      return position === undefined ? `v:${text}` : `c${position}`
    },
    // The median category of counts in the order of the categories ({ key, count })
    getMedian: function (counts) {
      const total = counts.reduce((sum, c) => sum + c.count, 0)
      if (total < 1) {
        return null
      }
      // The lower median (a category, not between two)
      const position = Math.floor((total - 1) / 2)
      let seen = 0
      for (const c of counts) {
        seen += c.count
        if (position < seen) {
          return c.key
        }
      }
      return null
    },
    getGroupLabel: function (group) {
      return group === 'block' ? this.$t('tableColumnTraitBlock') : this.$t('tableColumnTraitRep')
    },
    getCategoryLabel: function (category) {
      return category.outside ? this.$t('pageTraitDetailsStatsOutOfDomainValue', { value: category.label }) : category.label
    },
    // The colour of a category: an ordinal scale from the first to the last; else one of the colours of the charts each;
    // outside the categories: grey
    getCategoryColor: function (category) {
      if (category.outside) {
        return this.storeDarkMode ? OUTSIDE_COLOR_DARK : OUTSIDE_COLOR
      }
      const index = this.categories.indexOf(category)
      if (this.isOrdinal) {
        const last = Math.max(1, this.domain.length - 1)
        const t = category.position / last * (ORDINAL_COLORS.length - 1)
        const from = Math.min(ORDINAL_COLORS.length - 2, Math.floor(t))
        return this.mixColor(ORDINAL_COLORS[from + 1], ORDINAL_COLORS[from], t - from)
      }
      // A colour each, all different: the colours of the charts when they cover the categories, else Paul Tol's rainbow
      const colors = getColorsFor(getColors() || [], this.categories.filter(c => !c.outside).length)
      return colors.length > 0 ? colors[index % colors.length] : BAR_COLOR
    },
    formatPercent,
    formatDecimal: function (value, digits) {
      return formatDecimals(value, digits)
    },
    formatP: function (p) {
      return p < 0.001 ? `< ${this.formatDecimal(0.001, 3)}` : this.formatDecimal(p, 3)
    },
    // A category clicked: its observations (its values as in the data: one, or several of the scales)
    emitCategory: function (key) {
      const category = this.categoryMap[key]
      if (!category || category.values.length < 1) {
        return
      }
      this.$emit('value-clicked', category.values.length === 1 ? category.values[0] : { label: this.getCategoryLabel(category), values: category.values })
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
      const figure = this.view === 'germplasm' ? this.getGermplasmChart(theme) : (this.view === 'groups' ? this.getGroupsChart(theme) : (this.view === 'time' ? this.getTimeChart(theme) : this.getDistribution(theme)))
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

      // A category clicked: its observations; a germplasm (its bar): the preview of its passport
      element.removeAllListeners && element.removeAllListeners('plotly_click')
      element.on('plotly_click', event => {
        const point = event && event.points && event.points.length > 0 ? event.points[0] : null
        const custom = point ? point.customdata : null
        if (custom && typeof custom === 'object' && custom.value !== undefined) {
          // Over time: the category of the point
          this.emitCategory(custom.value)
        } else if (custom && typeof custom === 'object') {
          this.showPassportPreview(custom.germplasmId)
        } else if (custom) {
          this.emitCategory(custom)
        }
      })
      // By germplasm: the names open the preview of the passport too
      element.removeAllListeners && element.removeAllListeners('plotly_afterplot')
      if (this.view === 'germplasm') {
        this.bindGermplasmNames(this.pageGermplasm)
        element.on('plotly_afterplot', () => this.view === 'germplasm' && this.bindGermplasmNames(this.pageGermplasm))
      }
      // A climate: the flags of the locations where their labels start
      this.watchLocationFlags()
    },
    // Over time (a climate): a lane per location, a dot per observation at its recording date in the colour of its
    // category
    getTimeChart: function (theme) {
      return getCategoryTimeChart(this.rows, {
        theme,
        locale: this.locale,
        t: (key, params) => this.$t(key, params),
        getFlags: labels => this.getLocationFlags(labels),
        valueOf: row => {
          const category = this.categoryMap[row.mapped]
          return category
            ? { key: category.key, label: this.getCategoryLabel(category), color: this.getCategoryColor(category), order: this.categories.indexOf(category) }
            : { key: row.mapped, label: row.value, color: theme.muted, order: 9999 }
        }
      })
    },
    // A bar per category (in the order of the trait, then the values outside its categories, hatched), its count and
    // share at its end
    getDistribution: function (theme) {
      const categories = this.categories
      const total = this.total
      const max = categories.reduce((m, c) => Math.max(m, c.count), 0)
      const observations = this.$t('pageTraitDetailsStatsObservations')
      return {
        data: [{
          type: 'bar',
          orientation: 'h',
          x: categories.map(c => c.count),
          y: categories.map((c, i) => i),
          customdata: categories.map(c => c.count > 0 ? c.key : null),
          text: categories.map(c => `${formatNumber(c.count)} · ${this.formatPercent(total > 0 ? c.count / total : 0)}`),
          textposition: 'outside',
          cliponaxis: false,
          textfont: { family: FONT, size: 12, color: theme.text },
          hovertext: categories.map(c => {
            const codes = c.codes.length > 1 ? ` <span style="opacity: 0.7">(${c.codes.slice(1).join(', ')})</span>` : ''
            return `<b>${this.getCategoryLabel(c)}</b>${codes}<br>${observations}: <b>${formatNumber(c.count)}</b> · ${this.formatPercent(total > 0 ? c.count / total : 0)}`
          }),
          hovertemplate: '%{hovertext}<extra></extra>',
          marker: {
            color: categories.map(c => this.getCategoryColor(c)),
            pattern: { shape: categories.map(c => c.outside ? '/' : ''), fgcolor: theme.surface, size: 6, solidity: 0.25 },
            cornerradius: 6
          }
        }],
        layout: {
          margin: { t: 10, r: 30, b: 40, l: 10 },
          bargap: 0.25,
          xaxis: {
            range: [0, Math.max(1, max) * 1.22],
            showgrid: true,
            gridcolor: theme.grid,
            griddash: 'dot',
            zeroline: false,
            showline: false,
            tickformat: 'd',
            tickfont: { family: FONT, size: 12, color: theme.muted },
            fixedrange: true
          },
          yaxis: {
            autorange: 'reversed',
            tickmode: 'array',
            tickvals: categories.map((c, i) => i),
            ticktext: categories.map(c => this.getLabel(this.getCategoryLabel(c))),
            showgrid: false,
            zeroline: false,
            showline: false,
            ticks: '',
            ticklabelstandoff: 8,
            automargin: true,
            tickfont: { family: FONT, size: 13, color: theme.text },
            fixedrange: true
          }
        }
      }
    },
    // 100 % bars (a trace per category, stacked): a row per entry ({ label, counts, n }), its n (and median category)
    // at its end; the legend on top
    getStackedBars: function (theme, entries, options) {
      const categories = this.categories.filter(c => entries.some(e => e.counts[c.key]))
      const observations = this.$t('pageTraitDetailsStatsObservations')
      const data = categories.map(c => ({
        type: 'bar',
        orientation: 'h',
        name: this.getCategoryLabel(c),
        x: entries.map(e => e.n > 0 ? (e.counts[c.key] || 0) / e.n * 100 : 0),
        y: entries.map((e, i) => i),
        customdata: entries.map(e => options.custom(e, c)),
        hovertext: entries.map(e => [`<b>${e.label}</b>`, `${this.getCategoryLabel(c)}: <b>${formatNumber(e.counts[c.key] || 0)}</b> · ${this.formatPercent(e.n > 0 ? (e.counts[c.key] || 0) / e.n : 0)}`, `${observations}: ${formatNumber(e.n)}`].concat(options.hover ? options.hover(e) : []).filter(t => t).join('<br>')),
        hovertemplate: '%{hovertext}<extra></extra>',
        marker: {
          color: this.getCategoryColor(c),
          pattern: { shape: c.outside ? '/' : '', fgcolor: theme.surface, size: 6, solidity: 0.25 },
          line: { color: theme.surface, width: 1 }
        }
      }))
      return {
        data,
        layout: {
          margin: { t: 40, r: options.right || 90, b: 40, l: 10 },
          barmode: 'stack',
          bargap: options.bargap || 0.3,
          showlegend: true,
          legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: 1, yanchor: 'bottom', traceorder: 'normal', font: { family: FONT, size: 12, color: theme.text } },
          xaxis: {
            range: [0, 100],
            ticksuffix: ' %',
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
            tickvals: entries.map((e, i) => i),
            ticktext: entries.map(e => e.tick),
            showgrid: false,
            zeroline: false,
            showline: false,
            ticks: '',
            ticklabelstandoff: 8,
            automargin: true,
            tickfont: { family: FONT, size: 12, color: theme.text },
            fixedrange: true
          },
          annotations: entries.map((e, i) => ({
            xref: 'paper',
            yref: 'y',
            x: 1,
            y: i,
            xanchor: 'left',
            xshift: 8,
            showarrow: false,
            align: 'left',
            text: e.note,
            font: { family: FONT, size: 12, color: theme.muted }
          })),
          shapes: options.shapes || [],
          images: options.flags ? options.flags.images : []
        }
      }
    },
    // A row per germplasm of the page (the mixed ones first): the share of each category; mixed: its name in bold
    getGermplasmChart: function (theme) {
      const spreadLabel = this.$t('pageTraitDetailsStatsSpread')
      const previewLabel = this.$t('tableTooltipGermplasmPreviewPassport')
      // A climate: the flag of the country of each location before its name
      const flags = this.getLocationFlags(this.pageGermplasm.map(g => g.name))
      const entries = this.pageGermplasm.map(g => ({
        germplasmId: g.germplasmId,
        label: g.name,
        tick: flags.prefix + (g.mixed ? `<b>${this.getLabel(g.name)}</b>` : this.getLabel(g.name)),
        counts: g.counts,
        n: g.n,
        note: this.$t('pageTraitDetailsStatsSampleSize', { count: formatNumber(g.n) }),
        spread: g.spread
      }))
      return this.getStackedBars(theme, entries, {
        flags,
        right: 70,
        custom: e => ({ germplasmId: e.germplasmId }),
        hover: e => [this.isOrdinal && e.spread > 0 ? `${spreadLabel}: ${e.spread}` : null, e.germplasmId ? `<i>${previewLabel}</i>` : null]
      })
    },
    // A row for all the observations, then one per level of the rep / block; an ordinal scale: the median category of
    // each (in bold the levels whose median is not that of all)
    getGroupsChart: function (theme) {
      const groupLabel = this.getGroupLabel(this.activeGroup)
      const medianLabel = this.$t('pageTraitDetailsStatsMedian')
      const all = { label: this.$t('pageTraitDetailsStatsGroupAll'), counts: {}, n: 0 }
      this.groups.forEach(g => {
        Object.keys(g.counts).forEach(key => { all.counts[key] = (all.counts[key] || 0) + g.counts[key] })
        all.n += g.n
      })
      const medianOf = e => this.isOrdinal ? this.getMedian(this.categories.filter(c => !c.outside).map(c => ({ key: c.key, count: e.counts[c.key] || 0 }))) : null
      const allMedian = medianOf(all)
      const entries = [all].concat(this.groups.map(g => Object.assign({ label: `${groupLabel} ${g.level}` }, g))).map((e, i) => {
        const median = medianOf(e)
        const differs = i > 0 && median !== null && median !== allMedian
        const medianText = median !== null ? ` · ${medianLabel}: ${this.categoryMap[median].label}` : ''
        return Object.assign({}, e, {
          tick: i === 0 || differs ? `<b>${e.label}</b>` : e.label,
          note: differs ? `<b>${this.$t('pageTraitDetailsStatsSampleSize', { count: formatNumber(e.n) })}${medianText}</b>` : `${this.$t('pageTraitDetailsStatsSampleSize', { count: formatNumber(e.n) })}${medianText}`
        })
      })
      return this.getStackedBars(theme, entries, {
        right: this.isOrdinal ? 200 : 90,
        bargap: 0.35,
        custom: () => null,
        // A line between all and the levels
        shapes: [{ type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 0.5, y1: 0.5, line: { color: theme.grid, width: 1 } }]
      })
    }
  }
}
</script>

<!-- The views, the sentences, the notes, the pages of germplasm: as the dates -->
<style src="@/assets/trait-stats.css"></style>
<style>
/* An ordinal scale: a chip beside the name of the trait */
.tcs .tcs-scale {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: 0.35rem;
  padding: 0.15rem 0.6rem;
  border: 1px solid var(--cp-border);
  border-radius: 999px;
  color: var(--cp-text-subtle);
  font-size: 0.8rem;
  font-weight: 500;
}
.tcs .tcs-scale .fa-solid {
  color: var(--cp-green);
}
/* The bars can be clicked (a category: its observations; a germplasm: the preview of its passport) */
.tcs .tvs-chart.is-clickable .plotly .bars .point {
  cursor: pointer;
}
</style>
