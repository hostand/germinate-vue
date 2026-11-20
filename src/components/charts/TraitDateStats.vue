<template>
  <!-- The values of a date trait in one dataset: its numbers (earliest, latest and median date, span, observations,
       missing values) and three views of the dates: a histogram (observations per day, week or month, the median marked),
       a timeline (a line per germplasm from its earliest to its latest date, its observations coloured by rep, its median)
       and a calendar (a cell per day, darker with more observations). All the dates the same (e.g. the day of a
       recording): a sentence instead of a chart. A date clicked: value-clicked; a germplasm of the timeline clicked (its
       name, its median): the preview of its passport.
       Large data: the numbers, the histogram and the calendar come from the counts per date (small, whatever the number
       of observations); only the timeline loads every observation, when it is opened (after a confirmation above
       TIMELINE_CONFIRM observations), shows the germplasm in pages and, with many observations on a page, the median of
       each rep instead of every observation. -->
  <!-- As TraitValueStats (which it extends, its look included): the numbers on a strip at the top, the options of the
       chart and its help at the right end of the strip, then the chart under its title -->
  <div class="tvs tds" :id="id">
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
        <b-dropdown-item link-class="top-nav-menu-item" :disabled="!hasChart" @click="downloadPng"><i class="fa-solid fa-image fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadPng') }}</b-dropdown-item>
        <b-dropdown-item link-class="top-nav-menu-item" :disabled="!hasChart" @click="downloadSvg"><i class="fa-solid fa-file-code fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadSvg') }}</b-dropdown-item>
        <b-dropdown-item link-class="top-nav-menu-item" :disabled="!sourceFile" @click="downloadData"><i class="fa-solid fa-file-lines fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadFile') }}</b-dropdown-item>
        <!-- The colours of the charts: the first one for the bars and the calendar, one per rep in the timeline -->
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
        <!-- The views of the dates -->
        <div class="tds-views" role="tablist" v-if="hasChart">
          <button type="button" :class="['tds-view', { active: view === option.key }]" :data-tour-view="option.key" role="tab" :aria-selected="view === option.key ? 'true' : 'false'" v-for="option in views" :key="`tds-view-${option.key}`" @click="setView(option.key)">
            <i :class="['fa-solid', option.icon]" aria-hidden="true" /> {{ option.text }}
          </button>
        </div>
        <div class="tvs-loading" v-if="loading"><b-spinner small type="grow" /></div>
        <p class="tvs-empty" v-else-if="values.length < 1">{{ $t('headingNoData') }}</p>
        <!-- All the dates the same: no chart -->
        <p class="tds-single" v-else-if="singleDate"><i class="fa-solid fa-calendar-day" aria-hidden="true" /> {{ vt('pageTraitDetailsStatsSingleDate', { date: formatDay(values[0].day) }) }}</p>
        <!-- The timeline needs every observation (germplasm, rep): loaded when it is opened, after a confirmation when
             there are very many -->
        <template v-else-if="view === 'timeline' && rowsState !== 'loaded'">
          <div class="tvs-loading" v-if="rowsState === 'loading'"><b-spinner small type="grow" /><span class="tds-progress" v-if="rowsProgress && rowsProgress.total > rowsProgress.loaded">{{ $t('pageTraitDetailsStatsLoadingProgress', { loaded: formatNumber(rowsProgress.loaded), total: formatNumber(rowsProgress.total) }) }}</span></div>
          <div class="tds-single" v-else-if="rowsState === 'confirm'">
            <p><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ vt('pageTraitDetailsStatsTimelineLarge', { count: formatNumber(dayStats.total) }) }}</p>
            <button type="button" class="tvs-values-link" @click="loadTimeline"><i class="fa-solid fa-bars-staggered" aria-hidden="true" /> {{ $t('pageTraitDetailsStatsLoadTimeline') }}</button>
          </div>
        </template>
        <div class="tvs-chart" ref="chart" v-show="chartShown" />
        <!-- The timeline: many germplasm in pages; many observations shown as the median of each rep -->
        <template v-if="chartShown && view === 'timeline'">
          <p class="tds-note" v-if="timelineSummary"><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ vt('pageTraitDetailsStatsTimelineSummary') }}</p>
          <div class="tds-pager" v-if="germplasm.length > timelinePageSize">
            <button type="button" class="tds-pager-button" :disabled="timelinePage === 0" @click="setTimelinePage(timelinePage - 1)" :title="vt('pageTraitDetailsStatsPreviousGermplasm')" :aria-label="vt('pageTraitDetailsStatsPreviousGermplasm')"><i class="fa-solid fa-chevron-left" aria-hidden="true" /></button>
            <span>{{ vt('pageTraitDetailsStatsGermplasmRange', { from: formatNumber(timelinePage * timelinePageSize + 1), to: formatNumber(Math.min(germplasm.length, (timelinePage + 1) * timelinePageSize)), total: formatNumber(germplasm.length) }) }}</span>
            <button type="button" class="tds-pager-button" :disabled="(timelinePage + 1) * timelinePageSize >= germplasm.length" @click="setTimelinePage(timelinePage + 1)" :title="vt('pageTraitDetailsStatsNextGermplasm')" :aria-label="vt('pageTraitDetailsStatsNextGermplasm')"><i class="fa-solid fa-chevron-right" aria-hidden="true" /></button>
          </div>
        </template>
      </div>
    </BaseChart>

    <!-- The preview of the passport of a germplasm of the timeline (its name or its median clicked) -->
    <PassportPreviewModal :germplasmId="previewGermplasmId" ref="passportPreview" v-if="previewGermplasmId !== null" @hidden="previewGermplasmId = null" />

    <!-- Tour explaining the options of the chart -->
    <Tour :steps="tourSteps" modernLook ref="tour" />
  </div>
</template>

<script>
import TraitValueStats from '@/components/charts/TraitValueStats'
import PassportPreviewModal from '@/components/germplasm/PassportPreviewModal'
import traitStats from '@/mixins/trait-stats'
import { getColors } from '@/mixins/colors'
import { formatNumber } from '@/mixins/formatting'

const Plotly = require('plotly.js/lib/core')

// The histogram (bar, registered by TraitValueStats), the timeline (scatter) and the calendar (heatmap)
Plotly.register([
  require('plotly.js/lib/scatter'),
  require('plotly.js/lib/heatmap')
])

const DAY_MS = 86400000
// The histogram: a bar per day up to this span (days), per week up to the second one, else per month
const DAY_BINS_MAX = 62
const WEEK_BINS_MAX = 730
const HISTOGRAM_HEIGHT = 400
// The timeline: a row per germplasm, the axis and the legend
const TIMELINE_ROW = 28
const TIMELINE_EXTRA = 110
// The timeline: germplasm per page; above this many observations on a page, the median of each rep instead of each
// observation; above this many observations in all, loaded only once confirmed
const TIMELINE_PAGE_SIZE = 40
const TIMELINE_DOTS_MAX = 2500
const TIMELINE_CONFIRM = 50000
// The calendar: the largest and the smallest cell (px), the room of the labels
const CALENDAR_CELL_MAX = 42
const CALENDAR_CELL_MIN = 3
const CALENDAR_LEFT = 50
const CALENDAR_EXTRA = 80
const BAR_COLOR = '#5b9cf6'
const FONT = 'Inter, -apple-system, "Segoe UI", Roboto, sans-serif'

// A date of the data (YYYY-MM-DD, also YYYYMMDD) as a day number (days since 1970-01-01, UTC); null when not a date.
// Also a date of a spreadsheet kept as its serial number (5 digits, days since 1899-12-30: e.g. 45740 = 2025-03-24), as
// some climate data was imported.
const EXCEL_EPOCH_DAY = -25569
const parseDay = value => {
  const serial = /^\s*(\d{5})(?:\.0+)?\s*$/.exec(`${value || ''}`)
  if (serial) {
    return +serial[1] + EXCEL_EPOCH_DAY
  }
  const match = /^\s*(\d{4})-?(\d{1,2})-?(\d{1,2})/.exec(`${value || ''}`)
  if (!match) {
    return null
  }
  const time = Date.UTC(+match[1], +match[2] - 1, +match[3])
  return isNaN(time) ? null : Math.round(time / DAY_MS)
}
// A day number (with its fraction) as a date of the axes of Plotly ("YYYY-MM-DD HH:MM", UTC)
const toIso = day => new Date(day * DAY_MS).toISOString().substring(0, 16).replace('T', ' ')
// The Monday of the week of a day (1970-01-01 was a Thursday)
const weekStart = day => day - ((((day + 3) % 7) + 7) % 7)
// The first day of the month of a day
const monthStart = day => {
  const date = new Date(day * DAY_MS)
  return Math.round(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1) / DAY_MS)
}
const median = sorted => {
  const n = sorted.length
  return n % 2 === 1 ? sorted[(n - 1) / 2] : Math.floor((sorted[n / 2 - 1] + sorted[n / 2]) / 2)
}
// The median of days given with their counts ({ day, count }, in the order of the days)
const medianOfCounts = values => {
  const total = values.reduce((sum, v) => sum + v.count, 0)
  // The day of the observation at a position (0-based)
  const at = position => {
    let seen = 0
    for (const v of values) {
      seen += v.count
      if (position < seen) {
        return v.day
      }
    }
    return null
  }
  return total % 2 === 1 ? at((total - 1) / 2) : Math.floor((at(total / 2 - 1) + at(total / 2)) / 2)
}

export default {
  extends: TraitValueStats,
  // The colours of the page, the observations (trial export), the preview of the passport
  mixins: [traitStats],
  components: {
    PassportPreviewModal
  },
  data: function () {
    return {
      // The timeline: one per observation with a date (germplasm id and name, rep, block, the value as in the data, its
      // day), loaded when the timeline is opened. none, confirm (very many: loaded once confirmed), loading, loaded
      rows: [],
      rowsState: 'none',
      timelinePage: 0,
      timelinePageSize: TIMELINE_PAGE_SIZE,
      // histogram, timeline or calendar
      view: 'histogram'
    }
  },
  computed: {
    locale: function () {
      return (this.$store.getters.storeLocale || 'en_GB').replace('_', '-')
    },
    views: function () {
      return [{
        key: 'histogram',
        icon: 'fa-chart-column',
        text: this.$t('pageTraitDetailsStatsViewHistogram')
      }, {
        key: 'timeline',
        icon: 'fa-bars-staggered',
        text: this.$t('pageTraitDetailsStatsViewTimeline')
      }, {
        key: 'calendar',
        icon: 'fa-calendar-days',
        text: this.$t('pageTraitDetailsStatsViewCalendar')
      }]
    },
    // From the counts per date: the earliest, latest and median day, the observations
    dayStats: function () {
      const values = this.values
      if (values.length < 1) {
        return null
      }
      return {
        first: values[0].day,
        last: values[values.length - 1].day,
        median: medianOfCounts(values),
        total: values.reduce((sum, v) => sum + v.count, 0)
      }
    },
    singleDate: function () {
      return this.values.length === 1
    },
    hasChart: function () {
      return !this.loading && this.values.length > 1
    },
    // The chart drawn (the timeline: once its observations are there)
    chartShown: function () {
      return this.hasChart && (this.view !== 'timeline' || this.rowsState === 'loaded')
    },
    span: function () {
      return this.dayStats ? this.dayStats.last - this.dayStats.first : null
    },
    // The bars of the histogram: per day, week or month (by the span), each with its first day
    bin: function () {
      if (this.span === null || this.span <= DAY_BINS_MAX) {
        return 'day'
      }
      return this.span <= WEEK_BINS_MAX ? 'week' : 'month'
    },
    // The germplasm of the timeline: its observations, earliest, latest and median day; the earliest median first
    germplasm: function () {
      const byGermplasm = {}
      this.rows.forEach(row => {
        const key = row.germplasmId || row.germplasm
        if (!byGermplasm[key]) {
          byGermplasm[key] = { germplasmId: row.germplasmId, name: row.germplasm, rows: [] }
        }
        byGermplasm[key].rows.push(row)
      })
      return Object.values(byGermplasm).map(g => {
        const days = g.rows.map(row => row.day).sort((a, b) => a - b)
        return Object.assign(g, { min: days[0], max: days[days.length - 1], median: median(days) })
      }).sort((a, b) => a.median - b.median || a.min - b.min || `${a.name}`.localeCompare(`${b.name}`))
    },
    // The germplasm of the page of the timeline
    timelineGermplasm: function () {
      const start = this.timelinePage * TIMELINE_PAGE_SIZE
      return this.germplasm.slice(start, start + TIMELINE_PAGE_SIZE)
    },
    // Too many observations on the page of the timeline to show each: the median of each rep instead
    timelineSummary: function () {
      return this.timelineGermplasm.reduce((sum, g) => sum + g.rows.length, 0) > TIMELINE_DOTS_MAX
    },
    // The reps of the observations (numbers in their order), none when there is only one
    reps: function () {
      const reps = [...new Set(this.rows.map(row => row.rep).filter(rep => rep !== null && rep !== undefined && `${rep}` !== ''))]
      reps.sort((a, b) => (+a - +b) || `${a}`.localeCompare(`${b}`))
      return reps.length > 1 ? reps : []
    },
    // The weeks of the calendar (Mondays), from that of the earliest date to that of the latest
    calendarWeeks: function () {
      if (!this.dayStats) {
        return []
      }
      const weeks = []
      for (let week = weekStart(this.dayStats.first); week <= this.dayStats.last; week += 7) {
        weeks.push(week)
      }
      return weeks
    },
    chartHeight: function () {
      if (this.view === 'timeline') {
        return Math.max(1, this.timelineGermplasm.length) * TIMELINE_ROW + TIMELINE_EXTRA
      }
      if (this.view === 'calendar') {
        return 7 * this.getCalendarCell() + CALENDAR_EXTRA
      }
      return HISTOGRAM_HEIGHT
    },
    // The help: what each number and each view tells
    tourNumberTexts: function () {
      return {
        earliest: this.$t('pageTraitDetailsTourNumberEarliest'),
        latest: this.$t('pageTraitDetailsTourNumberLatest'),
        recording: this.$t('pageClimateDetailsTourNumberRecording'),
        median: this.$t('pageTraitDetailsTourNumberMedianDate'),
        span: this.$t('pageTraitDetailsTourNumberSpan'),
        observations: this.vt('pageTraitDetailsTourNumberObservations'),
        missing: this.vt('pageTraitDetailsTourNumberMissing')
      }
    },
    tourViews: function () {
      const texts = {
        histogram: this.$t('pageTraitDetailsTourDateHistogram'),
        timeline: this.vt('pageTraitDetailsTourDateTimeline'),
        calendar: this.$t('pageTraitDetailsTourDateCalendar')
      }
      return this.views.map(option => ({ key: option.key, title: option.text, text: texts[option.key] }))
    },
    tourExtraSteps: function () {
      return []
    },
    numbers: function () {
      const loaded = !this.loading
      const stats = this.dayStats
      const has = loaded && stats !== null
      return [{
        key: 'earliest',
        text: true,
        value: has ? this.formatDay(stats.first) : null,
        label: this.$t('pageTraitDetailsStatsEarliestDate')
      }, {
        key: 'latest',
        text: true,
        value: has ? this.formatDay(stats.last) : null,
        label: this.$t('pageTraitDetailsStatsLatestDate')
      }, {
        key: 'median',
        text: true,
        value: has ? this.formatDay(stats.median) : null,
        label: this.$t('pageTraitDetailsStatsMedianDate')
      }, {
        key: 'span',
        value: has ? this.span : null,
        label: this.$t('pageTraitDetailsStatsSpanDays')
      }, {
        key: 'observations',
        value: loaded ? (stats ? stats.total : 0) : null,
        label: this.$t('pageTraitDetailsStatsObservations')
      }, {
        key: 'missing',
        value: loaded ? this.missing : null,
        label: this.$t('pageTraitDetailsStatsMissingValues')
      }].concat(this.recordingNumbers)
    },
    // A climate: observations whose date is not their recording date (the median gap in days)
    recordingNumbers: function () {
      if (this.loading || !this.recordingGap) {
        return []
      }
      return [{
        key: 'recording',
        danger: true,
        value: this.recordingGap.count,
        label: this.$t('pageClimateDetailsStatsDiffersFromRecording', { days: formatNumber(this.recordingGap.days) })
      }]
    },
    // A climate: the observations whose value (a date) differs from their recording date, and the median of the gaps
    // (days, either way); null when they all match (or the observations are not loaded)
    recordingGap: function () {
      if (!this.isClimate || this.rowsState !== 'loaded') {
        return null
      }
      const gaps = this.rows.filter(row => row.date).map(row => Math.abs(row.day - parseDay(row.date))).filter(gap => !isNaN(gap) && gap > 0)
      if (gaps.length < 1) {
        return null
      }
      gaps.sort((a, b) => a - b)
      return { count: gaps.length, days: median(gaps) }
    }
  },
  watch: {
    storeCustomChartColors: function () {
      this.draw()
    }
  },
  methods: {
    // The counts per date (small whatever the number of observations: the numbers, the histogram, the calendar) and the
    // missing values; the observations of the timeline only when it is opened
    update: function () {
      this.loading = true
      this.rows = []
      this.rowsState = 'none'
      this.timelinePage = 0
      Promise.all([this.loadValues(), this.loadMissing()]).then(([values, missing]) => {
        this.missing = missing
        // The observations of each day (the value as written in the data: the observations of a day clicked)
        const byDay = {}
        values.forEach(v => {
          const day = parseDay(v.value)
          if (day !== null) {
            if (!byDay[day]) {
              byDay[day] = { day, value: `${v.value}`.trim(), count: 0 }
            }
            byDay[day].count += v.count
          }
        })
        this.values = Object.values(byDay).sort((a, b) => a.day - b.day)
      }).finally(() => {
        this.loading = false
        if (this.view === 'timeline') {
          this.prepareTimeline()
        } else if (this.isClimate && this.values.length > 0 && (!this.dayStats || this.dayStats.total <= TIMELINE_CONFIRM)) {
          // A climate: every observation (its recording date), to compare it with the date recorded as its value
          this.loadTimeline()
        }
        this.$nextTick(() => this.draw())
      })
    },
    // The timeline opened: its observations loaded (very many: once confirmed)
    prepareTimeline: function () {
      if (this.rowsState !== 'none' || !this.hasChart) {
        return
      }
      if (this.dayStats && this.dayStats.total > TIMELINE_CONFIRM) {
        this.rowsState = 'confirm'
      } else {
        this.loadTimeline()
      }
    },
    loadTimeline: function () {
      this.rowsState = 'loading'
      const datasetId = this.datasetId
      const traitId = this.traitId
      this.loadRows().then(rows => {
        // Another dataset or trait meanwhile: not these
        if (datasetId !== this.datasetId || traitId !== this.traitId) {
          return
        }
        this.rows = Object.freeze(rows)
        this.timelinePage = 0
        this.rowsState = 'loaded'
        this.$nextTick(() => this.draw())
      })
    },
    setTimelinePage: function (page) {
      this.timelinePage = page
      this.$nextTick(() => this.draw())
    },
    // The observations of the trait in the dataset (the export of the trial: germplasm, rep, block and the value of each),
    // those with a date
    loadRows: function () {
      return this.loadTrialRows(parseDay).then(rows => rows.map(row => Object.assign(row, { day: row.mapped })))
    },
    // The size of a day of the calendar: the weeks across the width of the chart, square cells up to the largest size
    getCalendarCell: function () {
      const width = (this.$refs.chart && this.$refs.chart.getBoundingClientRect().width) || 1000
      const weeks = Math.max(1, this.calendarWeeks.length)
      return Math.max(CALENDAR_CELL_MIN, Math.min(CALENDAR_CELL_MAX, Math.floor((width - CALENDAR_LEFT - 20) / weeks)))
    },
    setView: function (view) {
      this.view = view
      if (view === 'timeline') {
        this.prepareTimeline()
      }
      this.$nextTick(() => this.draw())
    },
    // A day (days since 1970) as a date (ISO 8601, see formatting.js): 2026-11-18; without its day (a month): 2026-11; without
    // its year (the ticks of the weeks): 18 Nov; with its weekday: Wed 2026-11-18; only the weekday: Wed
    formatDay: function (day, options) {
      const o = Object.assign({ day: 'numeric', month: 'short', year: 'numeric' }, options || {})
      const date = new Date(day * DAY_MS)
      const iso = date.toISOString().substring(0, 10)
      const weekday = o.weekday ? date.toLocaleDateString(this.locale, { weekday: o.weekday, timeZone: 'UTC' }) : null
      let text
      if (!o.day && !o.month && !o.year) {
        text = ''
      } else if (!o.year) {
        text = o.day ? `${date.getUTCDate()} ${date.toLocaleDateString(this.locale, { month: 'short', timeZone: 'UTC' })}` : date.toLocaleDateString(this.locale, { month: 'short', timeZone: 'UTC' })
      } else {
        text = o.day ? iso : iso.substring(0, 7)
      }
      return [weekday, text].filter(t => t).join(' ')
    },
    getBarColor: function () {
      const colors = this.storeCustomChartColors
      return colors && colors.length > 0 ? colors[0] : BAR_COLOR
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
      const figure = this.view === 'timeline' ? this.getTimeline(theme) : (this.view === 'calendar' ? this.getCalendar(theme) : this.getHistogram(theme))
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
      if (this.drawnView !== this.view) {
        Plotly.purge(element)
        this.drawnView = this.view
      }
      Plotly.react(element, figure.data, layout, {
        displayModeBar: false,
        responsive: true
      })

      // A day clicked (a bar of a day, a cell, an observation): its observations; a germplasm (its median in the
      // timeline): the preview of its passport
      element.removeAllListeners && element.removeAllListeners('plotly_click')
      element.on('plotly_click', event => {
        const point = event && event.points && event.points.length > 0 ? event.points[0] : null
        const custom = point ? point.customdata : null
        if (custom && typeof custom === 'object') {
          this.showPassportPreview(custom.germplasmId)
        } else if (custom) {
          this.$emit('value-clicked', custom)
        }
      })
      // The timeline: the names of the germplasm open the preview of their passport too
      element.removeAllListeners && element.removeAllListeners('plotly_afterplot')
      if (this.view === 'timeline') {
        this.bindGermplasmNames(this.timelineGermplasm)
        element.on('plotly_afterplot', () => this.view === 'timeline' && this.bindGermplasmNames(this.timelineGermplasm))
      }
      // A climate: the flags of the locations where their labels start
      this.watchLocationFlags()
    },
    // Observations per day (a bar each, clickable), per week or per month; the median as a dotted line
    getHistogram: function (theme) {
      const bins = {}
      const start = this.bin === 'week' ? weekStart : (this.bin === 'month' ? monthStart : day => day)
      this.values.forEach(v => {
        const key = start(v.day)
        if (!bins[key]) {
          bins[key] = { day: key, count: 0, value: v.value }
        }
        bins[key].count += v.count
      })
      const bars = Object.values(bins).sort((a, b) => a.day - b.day)
      const width = (this.bin === 'week' ? 7 : (this.bin === 'month' ? 30 : 1)) * DAY_MS * 0.82
      const label = bar => {
        if (this.bin === 'week') {
          return this.$t('pageTraitDetailsStatsWeekOf', { date: this.formatDay(bar.day) })
        }
        return this.bin === 'month' ? this.formatDay(bar.day, { day: undefined }) : this.formatDay(bar.day, { weekday: 'short' })
      }
      // A week or a month: its bar in its middle
      const offset = this.bin === 'week' ? 3.5 : (this.bin === 'month' ? 15 : 0)
      const medianDay = this.dayStats.median
      return {
        data: [{
          type: 'bar',
          x: bars.map(bar => toIso(bar.day + offset)),
          y: bars.map(bar => bar.count),
          width: bars.map(() => width),
          hovertext: bars.map(label),
          customdata: bars.map(bar => this.bin === 'day' ? bar.value : null),
          marker: { color: this.getBarColor(), cornerradius: 4 },
          hovertemplate: `%{hovertext}<br>${this.$t('pageTraitDetailsStatsObservations')}: <b>%{y}</b><extra></extra>`
        }],
        layout: {
          margin: { t: 34, r: 20, b: 50, l: 50 },
          bargap: 0.1,
          xaxis: {
            type: 'date',
            showgrid: false,
            zeroline: false,
            showline: true,
            linecolor: theme.grid,
            tickformat: this.bin === 'month' ? '%Y-%m' : '%Y-%m-%d',
            tickfont: { family: FONT, size: 12, color: theme.muted },
            fixedrange: true
          },
          yaxis: {
            title: { text: this.$t('pageTraitDetailsStatsObservations'), font: { family: FONT, size: 12, color: theme.muted } },
            showgrid: true,
            gridcolor: theme.grid,
            griddash: 'dot',
            zeroline: false,
            rangemode: 'tozero',
            tickformat: 'd',
            tickfont: { family: FONT, size: 12, color: theme.muted },
            fixedrange: true
          },
          shapes: [{
            type: 'line',
            xref: 'x',
            yref: 'paper',
            x0: toIso(medianDay),
            x1: toIso(medianDay),
            y0: 0,
            y1: 1,
            line: { color: theme.strong, width: 1.5, dash: 'dot' }
          }],
          annotations: [{
            xref: 'x',
            yref: 'paper',
            x: toIso(medianDay),
            y: 1,
            yanchor: 'bottom',
            showarrow: false,
            text: `${this.$t('pageTraitDetailsStatsMedian')} · ${this.formatDay(medianDay)}`,
            font: { family: FONT, size: 12, color: theme.strong }
          }]
        }
      }
    },
    // A row per germplasm of the page (the earliest median on top): a line from its earliest to its latest date, its
    // observations as dots (a colour and a lane per rep; many on the page: the median of each rep instead), its median as
    // a diamond (clicked, as its name: the preview of its passport)
    getTimeline: function (theme) {
      const germplasm = this.timelineGermplasm
      // A climate: the flag of the country of each location beside its name
      const flags = this.getLocationFlags(germplasm.map(g => g.name))
      const summary = this.timelineSummary
      const ranges = { x: [], y: [] }
      germplasm.forEach((g, i) => {
        ranges.x.push(toIso(g.min), toIso(g.max), null)
        ranges.y.push(i, i, null)
      })
      const data = [{
        type: 'scatter',
        mode: 'lines',
        x: ranges.x,
        y: ranges.y,
        line: { color: theme.line, width: 3 },
        hoverinfo: 'skip',
        showlegend: false
      }]
      // The observations: one trace per rep (its colour, its lane above or below the line), or one for all
      const colors = getColors() || []
      const reps = this.reps
      const lanes = reps.length > 0 ? reps : [null]
      const step = Math.min(0.2, 0.6 / lanes.length)
      const repLabel = this.$t('tableColumnTraitRep')
      const blockLabel = this.$t('tableColumnTraitBlock')
      const medianLabel = this.$t('pageTraitDetailsStatsMedian')
      const observationsLabel = this.$t('pageTraitDetailsStatsObservations')
      lanes.forEach((rep, k) => {
        const shift = (k - (lanes.length - 1) / 2) * step
        const points = []
        germplasm.forEach((g, i) => {
          const rows = rep === null ? g.rows : g.rows.filter(row => row.rep === rep)
          if (rows.length < 1) {
            return
          }
          if (summary) {
            // The median of the rep, its range and number of observations in the hover
            const days = rows.map(row => row.day).sort((a, b) => a - b)
            const day = median(days)
            points.push({
              x: day,
              y: i + shift,
              value: (rows.find(row => row.day === day) || {}).value || null,
              text: [`<b>${g.name}</b>`, rep !== null ? `${repLabel} ${rep}` : null, `${medianLabel} · ${this.formatDay(day)}`, `${this.formatDay(days[0])} – ${this.formatDay(days[days.length - 1])}`, `${observationsLabel}: ${formatNumber(days.length)}`].filter(t => t).join('<br>')
            })
          } else {
            rows.forEach(row => points.push({
              x: row.day,
              y: i + shift,
              value: row.value,
              text: [`<b>${g.name}</b>`, this.formatDay(row.day), row.rep ? `${repLabel} ${row.rep}` : null, row.block ? `${blockLabel} ${row.block}` : null].filter(t => t).join('<br>')
            }))
          }
        })
        data.push({
          type: 'scatter',
          mode: 'markers',
          name: rep === null ? observationsLabel : `${repLabel} ${rep}`,
          x: points.map(p => toIso(p.x)),
          y: points.map(p => p.y),
          customdata: points.map(p => p.value),
          hovertext: points.map(p => p.text),
          hovertemplate: '%{hovertext}<extra></extra>',
          marker: {
            color: rep === null ? this.getBarColor() : colors[k % Math.max(1, colors.length)] || this.getBarColor(),
            size: summary ? 10 : 8,
            opacity: summary ? 0.9 : 0.75,
            line: { width: 0 }
          },
          showlegend: reps.length > 0
        })
      })
      const previewLabel = this.$t('tableTooltipGermplasmPreviewPassport')
      data.push({
        type: 'scatter',
        mode: 'markers',
        name: medianLabel,
        x: germplasm.map(g => toIso(g.median)),
        y: germplasm.map((g, i) => i),
        customdata: germplasm.map(g => ({ germplasmId: g.germplasmId })),
        hovertext: germplasm.map(g => `<b>${g.name}</b><br>${medianLabel} · ${this.formatDay(g.median)}<br>${this.formatDay(g.min)} – ${this.formatDay(g.max)}${g.germplasmId ? `<br><i>${previewLabel}</i>` : ''}`),
        hovertemplate: '%{hovertext}<extra></extra>',
        marker: { symbol: 'diamond', color: theme.strong, size: 11, line: { color: theme.empty, width: 1.5 } },
        showlegend: true
      })
      // The dates of all the germplasm (the same axis on every page)
      const stats = this.dayStats
      const pad = Math.max(1, Math.round(this.span * 0.02))
      return {
        data,
        layout: {
          margin: { t: 50, r: 20, b: 40, l: 10 },
          showlegend: true,
          legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: 1, yanchor: 'bottom', font: { family: FONT, size: 12, color: theme.text } },
          xaxis: {
            type: 'date',
            range: [toIso(stats.first - pad), toIso(stats.last + pad)],
            showgrid: true,
            gridcolor: theme.grid,
            griddash: 'dot',
            zeroline: false,
            tickformat: this.span > WEEK_BINS_MAX ? '%Y-%m' : '%Y-%m-%d',
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
    // A cell per day (a column per week, Monday on top), darker with more observations; the days of the weeks outside
    // the dates left out, the days without observations light
    getCalendar: function (theme) {
      const weeks = this.calendarWeeks
      const first = this.dayStats.first
      const last = this.dayStats.last
      const byDay = {}
      this.values.forEach(v => { byDay[v.day] = v })
      const observations = this.$t('pageTraitDetailsStatsObservations')
      const z = []
      const text = []
      const custom = []
      for (let weekday = 0; weekday < 7; weekday++) {
        z.push([])
        text.push([])
        custom.push([])
        weeks.forEach(week => {
          const day = week + weekday
          const inRange = day >= first && day <= last
          const v = byDay[day]
          z[weekday].push(inRange ? (v ? v.count : 0) : null)
          text[weekday].push(inRange ? `${this.formatDay(day, { weekday: 'short' })}<br>${observations}: <b>${v ? v.count : 0}</b>` : '')
          custom[weekday].push(v ? v.value : null)
        })
      }
      const cell = this.getCalendarCell()
      const gap = cell >= 10 ? 3 : (cell >= 6 ? 1 : 0)
      const width = (this.$refs.chart && this.$refs.chart.getBoundingClientRect().width) || 1000
      const gridWidth = weeks.length * cell
      const side = Math.max(10, (width - gridWidth - CALENDAR_LEFT) / 2)
      // The weeks named by their Monday (few weeks), else the months at their first week (the year at the first one and
      // at each new year)
      let ticks
      if (weeks.length <= 16) {
        ticks = weeks.map((week, i) => ({ i, text: this.formatDay(week, { year: undefined }) }))
      } else {
        ticks = []
        weeks.forEach((week, i) => {
          const month = new Date(week * DAY_MS)
          const previous = i > 0 ? new Date(weeks[i - 1] * DAY_MS) : null
          if (!previous || previous.getUTCMonth() !== month.getUTCMonth()) {
            const newYear = !previous || previous.getUTCFullYear() !== month.getUTCFullYear()
            ticks.push({ i, text: this.formatDay(week, { day: undefined, year: newYear ? 'numeric' : undefined }) })
          }
        })
      }
      const color = this.getBarColor()
      return {
        data: [{
          type: 'heatmap',
          x: weeks.map((week, i) => i),
          y: [0, 1, 2, 3, 4, 5, 6],
          z,
          text,
          customdata: custom,
          hovertemplate: '%{text}<extra></extra>',
          hoverongaps: false,
          // Small cells (years of dates): thinner gaps, none at the smallest
          xgap: gap,
          ygap: gap,
          zmin: 0,
          // No observation: the colour of an empty day; one or more: from light to the colour of the bars
          colorscale: [[0, theme.empty], [0.0001, this.mixColor(color, theme.empty, 0.18)], [1, color]],
          showscale: false
        }],
        layout: {
          margin: { t: 20, r: side, b: 50, l: side + CALENDAR_LEFT },
          xaxis: {
            tickmode: 'array',
            tickvals: ticks.map(t => t.i),
            ticktext: ticks.map(t => t.text),
            showgrid: false,
            zeroline: false,
            showline: false,
            ticks: '',
            tickfont: { family: FONT, size: 12, color: theme.muted },
            fixedrange: true
          },
          yaxis: {
            autorange: 'reversed',
            tickmode: 'array',
            tickvals: [0, 1, 2, 3, 4, 5, 6],
            // Monday to Sunday, in the language of the page (5 January 1970 was a Monday)
            ticktext: [0, 1, 2, 3, 4, 5, 6].map(i => this.formatDay(4 + i, { weekday: 'short', day: undefined, month: undefined, year: undefined })),
            showgrid: false,
            zeroline: false,
            showline: false,
            ticks: '',
            tickfont: { family: FONT, size: 12, color: theme.muted },
            fixedrange: true
          }
        }
      }
    }
  }
}
</script>

<!-- Shared with TraitCategoricalStats -->
<style src="@/assets/trait-stats.css"></style>
