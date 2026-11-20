<template>
  <!-- Temporal comparison of the climate data (the Comparison tab of the climate export): a measurement (numeric variable,
       the same name and unit in the datasets) over time, its groups the datasets or (by location) the chosen locations.
       The date of a value: its recording date. The events: the date variables of the datasets (their value, else their
       recording date), at each location of each dataset. The views: the series (a line per group, the mean of each time;
       the time: the date, the day of the year (years or places on one season) or the days since an event chosen; the
       events as dashed lines), the monthly climatology (the mean of each month of the year) and the timeline (by date
       or by day of the year: a row per location of a dataset, the periods with values of the variable as a bar broken
       where values are missing, its events as points; with a window, the bar of the window and its days) of the
       events (a row per location of a dataset, its events as points; with a window: the bar from its start to its end).
       A window between two events (chosen): only the values between them, at each location of each dataset. Below: the
       summary by group (a read-only table, downloadable). -->
  <section class="stc">
    <header class="stc-head">
      <span class="stc-icon" :style="{ '--stc-type-color': typeColor }" aria-hidden="true">
        <i :class="[variableIcon || 'fa-solid fa-hourglass-half', 'ctc-head-icon']" />
      </span>
      <div class="stc-heading">
        <h3 class="stc-title">{{ $t('pageClimateTemporalTitle') }}</h3>
        <p class="stc-text ctc-chosen" v-if="selected">{{ selected.name }}<span class="ctc-chosen-unit" v-if="unit"> ({{ unit }})</span></p>
        <p class="stc-text" v-else>{{ $t('pageClimateTemporalText') }}</p>
      </div>
      <div class="stc-select">
        <GermplasmFilterSelect id="ctc-variable"
                               :options="variableOptions"
                               :value="selectedKey"
                               :placeholder="$t('pageComparisonClimatePlaceholder')"
                               :loading="traitsLoading"
                               :countIcon="isByLocation ? 'fa-solid fa-location-dot' : 'fa-solid fa-database'"
                               @select="selectTrait"
                               @clear="clearTrait" />
      </div>
    </header>
    <!-- By location: the chosen locations (chips; the map of one) -->
    <ClimateLocationChips :locations="chosenLocations" @remove-location="id => $emit('remove-location', id)" @clear-locations="$emit('clear-locations')" v-if="isByLocation" />

    <div class="stc-body tvs" :id="id" v-if="selected">
      <div class="tvs-loading" v-if="rowsState === 'loading'"><b-spinner small /> {{ rowsProgress || $t('tooltipTableLoadingIndicator') }}</div>
      <div class="tvs-empty stc-confirm" v-else-if="rowsState === 'confirm'">
        <p><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ vk('pageComparisonSingleTraitLarge', { count: formatNumber(rowsTotal) }) }}</p>
        <button type="button" class="tvs-values-link" @click="loadRows"><i class="fa-solid fa-download" aria-hidden="true" /> {{ $t('pageTraitDetailsStatsLoadObservations') }}</button>
      </div>
      <template v-else-if="rowsState === 'loaded'">
        <!-- The numbers -->
        <div class="tvs-numbers">
          <div :class="['tvs-number', { 'is-danger': number.danger }]" v-for="number in numbers" :key="`ctc-number-${number.key}`">
            <span class="tvs-number-value">{{ number.value }}</span>
            <span class="tvs-number-label">{{ number.label }}</span>
          </div>
        </div>
        <!-- The window: the values between two events (at each location of each dataset) -->
        <div class="ctc-controls" v-if="eventNames.length > 0">
          <span class="ctc-control-label"><i class="fa-solid fa-timeline" aria-hidden="true" /> {{ $t('pageClimateTemporalWindow') }}</span>
          <select class="ctc-select" v-model="windowStart" @change="redraw" :aria-label="$t('pageClimateTemporalWindowFrom')">
            <option :value="null">{{ $t('pageClimateTemporalWindowNone') }}</option>
            <option v-for="name in eventNames" :key="`ctc-from-${name}`" :value="name">{{ name }}</option>
          </select>
          <span class="ctc-control-label">→</span>
          <select class="ctc-select" v-model="windowEnd" @change="redraw" :aria-label="$t('pageClimateTemporalWindowTo')" :disabled="!windowStart">
            <option :value="null">{{ $t('pageClimateTemporalWindowNone') }}</option>
            <option v-for="name in eventNames.filter(n => n !== windowStart)" :key="`ctc-to-${name}`" :value="name">{{ name }}</option>
          </select>
        </div>
        <p class="tvs-empty" v-if="groups.length < 1">{{ $t('pageClimateTemporalNoValues') }}</p>
        <!-- The options (downloads, colours), at the right end of the strip -->
        <BaseChart :width="() => 1280"
                   :height="() => chartHeight"
                   :supportsPngDownload="false"
                   :supportsSvgDownload="false"
                   :canChangeColors="false"
                   customLook
                   class="tvs-base"
                   ref="baseChart"
                   v-on:force-redraw="draw"
                   v-show="groups.length > 0">
          <template slot="additionalMenuItems">
            <b-dropdown-header>{{ currentViewText }}</b-dropdown-header>
            <b-dropdown-item link-class="top-nav-menu-item" @click="downloadChart('chart', 'png')"><i class="fa-solid fa-image fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadPng') }}</b-dropdown-item>
            <b-dropdown-item link-class="top-nav-menu-item" @click="downloadChart('chart', 'svg')"><i class="fa-solid fa-file-code fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadSvg') }}</b-dropdown-item>
            <b-dropdown-divider />
            <b-dropdown-item link-class="top-nav-menu-item" @click="downloadData"><i class="fa-solid fa-file-lines fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadFile') }}</b-dropdown-item>
            <b-dropdown-item link-class="top-nav-menu-item" @click="$refs.baseChart.showColors()"><i class="fa-solid fa-palette fa-fw" aria-hidden="true" /> {{ $t('buttonChangeChartColors') }}</b-dropdown-item>
          </template>
          <div slot="chart" class="tvs-chart-wrap">
            <!-- The views -->
            <div class="tds ctc-views-wrap">
              <div class="tds-views" role="tablist">
                <button type="button"
                        :class="['tds-view', { active: view === option.key }]"
                        role="tab"
                        :aria-selected="view === option.key ? 'true' : 'false'"
                        v-for="option in views"
                        :key="`ctc-view-${option.key}`"
                        @click="setView(option.key)">
                  <i :class="option.icon" aria-hidden="true" /> {{ option.text }}
                </button>
              </div>
            </div>
            <!-- The series: its time axis (the date, the day of the year, the days since an event) -->
            <div class="ctc-axis" v-if="view === 'series'">
              <span class="ctc-control-label">{{ $t('pageComparisonTemporalAxis') }}</span>
              <button type="button" :class="['ctc-axis-option', { active: axis === option.key }]" v-for="option in axes" :key="`ctc-axis-${option.key}`" @click="setAxis(option.key)">{{ option.text }}</button>
              <select class="ctc-select" v-model="originEvent" @change="redraw" v-if="axis === 'since'" :aria-label="$t('pageClimateTemporalAxisSince')">
                <option v-for="name in eventNames" :key="`ctc-origin-${name}`" :value="name">{{ name }}</option>
              </select>
            </div>
            <!-- The timeline: by date or by day of the year -->
            <div class="ctc-axis" v-if="view === 'calendar'">
              <span class="ctc-control-label">{{ $t('pageComparisonTemporalAxis') }}</span>
              <button type="button" :class="['ctc-axis-option', { active: timelineAxis === option.key }]" v-for="option in axes.filter(a => a.key !== 'since')" :key="`ctc-timeline-${option.key}`" @click="setTimelineAxis(option.key)">{{ option.text }}</button>
            </div>
            <p class="ctc-view-text">{{ currentViewHelp }}</p>
            <p class="tvs-empty" v-if="view === 'calendar' && calendarRows.length < 1">{{ $t('pageClimateTemporalNoEvents') }}</p>
            <div class="stc-chart" ref="chart" v-show="!(view === 'calendar' && calendarRows.length < 1)" />
          </div>
        </BaseChart>
        <!-- The numbers of each group: a read-only table (its tools shown, inactive), downloadable -->
        <div class="stc-summary-wrap" v-show="groups.length > 0">
          <h4 class="stc-chart-title">{{ $t('pageComparisonSingleTraitSummary') }}</h4>
          <div class="stc-summary">
            <BaseTable :columns="summaryColumns"
                       :options="summaryOptions"
                       :getData="getSummaryData"
                       :getIds="null"
                       :downloadTable="downloadSummary"
                       toolsLocked
                       :autoHideColumns="false"
                       :storeUrlParameters="false"
                       primary-key="id"
                       :key="`ctc-summary-${selectedKey}-${compareBy}-${windowStart}-${windowEnd}`">
              <template v-slot:cell(name)="data">
                <span class="stc-swatch" :style="{ background: getGroupColor(data.item.id) }" />{{ data.item.name }}
              </template>
            </BaseTable>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>

<script>
import BaseChart from '@/components/charts/BaseChart'
import BaseTable from '@/components/tables/BaseTable'
import GermplasmFilterSelect from '@/components/tables/GermplasmFilterSelect'
import ClimateLocationChips from '@/components/export/ClimateLocationChips'
import traitComparison, { getNumericComparable, climateAsObservation } from '@/mixins/trait-comparison'
import { apiPostClimateDataTable } from '@/mixins/api/climate'
import { getVariableIcon } from '@/mixins/climate-icons'
import { formatNumber, formatDate, getDateTimeString } from '@/mixins/formatting'
import { downloadBlob } from '@/mixins/util'
import { makeZip } from '@/mixins/zip'
import { mean } from '@/mixins/stats-math'

const Plotly = require('plotly.js/lib/core')
Plotly.register([
  require('plotly.js/lib/scatter')
])

const DAY = 86400000
// The events of the datasets loaded at once (few: a date variable is recorded a few times a season)
const EVENTS_LIMIT = 10000

// A value of the data as a number (also with a decimal comma); null when not a number
const parseNumber = value => {
  const text = `${value === null || value === undefined ? '' : value}`.trim().replace(/^(-?\d+),(\d+)$/, '$1.$2')
  return text !== '' && isFinite(text) ? +text : null
}
// A date of the data as its day (YYYY-MM-DD), or null
const toDay = value => {
  const text = `${value === null || value === undefined ? '' : value}`.trim()
  let match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text)
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`
  }
  match = /^(\d{4})(\d{2})(\d{2})$/.exec(text)
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null
}
const daysBetween = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / DAY)
// A day as the same day in the year 2000 (a leap year): the seasons of different years on one axis
const yearDay = day => `2000-${day.substring(5, 10)}`

export default {
  components: {
    BaseChart,
    BaseTable,
    GermplasmFilterSelect,
    ClimateLocationChips
  },
  // The variables of the datasets, the variable chosen, its observations, the theme and the downloads (the climate data)
  mixins: [traitComparison],
  props: {
    variable: {
      type: String,
      default: 'climate'
    },
    // By location: the chosen locations ({ locationId, locationName, countryCode2, countryCode3, datasetIds, row })
    chosenLocations: {
      type: Array,
      default: () => []
    }
  },
  data: function () {
    return {
      // series, monthly or calendar (the timeline)
      view: 'series',
      // The time of the timeline: date or doy (the day of the year)
      timelineAxis: 'date',
      // The time of the series: date, doy (the day of the year) or since (days since an event)
      axis: 'date',
      originEvent: null,
      // The window between two events (their names)
      windowStart: null,
      windowEnd: null,
      // The events of the datasets: { name, day, datasetId, locationId }
      events: [],
      summaryOptions: {
        idColumn: 'id',
        tableName: 'comparisonClimateTemporal'
      }
    }
  },
  computed: {
    // The measurements with the same name and unit in two datasets or more; by location, in the datasets of two of the
    // chosen locations or more
    comparable: function () {
      if (!this.isByLocation) {
        return getNumericComparable(this.datasets, this.traitsByDataset)
      }
      return getNumericComparable(this.datasets, this.traitsByDataset, 1)
        .map(o => Object.assign({}, o, { locationIds: this.chosenLocations.filter(l => l.datasetIds.some(id => o.datasetIds.includes(id))).map(l => l.locationId) }))
        .filter(o => o.locationIds.length > 1)
    },
    variableOptions: function () {
      return this.comparable.map(o => ({ value: o.key, name: o.unitLabel ? `${o.name} (${o.unitLabel})` : o.name, count: this.isByLocation ? o.locationIds.length : o.datasetIds.length }))
    },
    unit: function () {
      return this.selected ? this.selected.unitLabel : ''
    },
    variableIcon: function () {
      return this.selected ? getVariableIcon(this.selected.name) : null
    },
    // The date variables of the datasets (their ids): the events
    eventVariableIds: function () {
      const ids = []
      Object.values(this.traitsByDataset).forEach(list => (list || []).filter(t => t.dataType === 'date').forEach(t => {
        if (!ids.includes(t.traitId)) {
          ids.push(t.traitId)
        }
      }))
      return ids
    },
    eventNames: function () {
      return [...new Set(this.events.map(e => e.name))].sort((a, b) => a.localeCompare(b))
    },
    // The events of each location of each dataset: { "dataset|location": { name: [days] } }
    eventsByPlace: function () {
      const map = {}
      this.events.forEach(e => {
        const place = map[`${e.datasetId}|${e.locationId}`] = map[`${e.datasetId}|${e.locationId}`] || {}
        ;(place[e.name] = place[e.name] || []).push(e.day)
      })
      Object.values(map).forEach(place => Object.values(place).forEach(days => days.sort()))
      return map
    },
    // The window of a location of a dataset: its first start event, the first end event after it; null without them
    windowOf: function () {
      return (datasetId, locationId) => {
        const place = this.eventsByPlace[`${datasetId}|${locationId}`]
        if (!place || !place[this.windowStart] || !place[this.windowEnd]) {
          return null
        }
        const start = place[this.windowStart][0]
        const end = place[this.windowEnd].find(d => d >= start)
        return end ? { start, end } : null
      }
    },
    hasWindow: function () {
      return !!this.windowStart && !!this.windowEnd
    },
    // The values used: numbers with a date (with a window: between its events)
    usedRows: function () {
      return this.rows.filter(r => {
        if (r.value === null || !r.day) {
          return false
        }
        if (!this.hasWindow) {
          return true
        }
        const w = this.windowOf(r.datasetId, r.locationId)
        return w !== null && r.day >= w.start && r.day <= w.end
      })
    },
    groupIds: function () {
      if (this.isByLocation) {
        return this.locationIds || []
      }
      return this.selected ? this.selected.datasetIds : []
    },
    // The groups with values (a colour each)
    groups: function () {
      const ids = this.groupIds.filter(id => this.usedRows.some(r => this.groupOf(r) === id))
      const colors = this.getDistinctColors(ids.length)
      return ids.map((id, index) => ({ id, name: this.groupName(id), color: colors[index] }))
    },
    numbers: function () {
      const numbers = [{
        key: 'groups',
        value: `${formatNumber(this.groups.length)} / ${formatNumber(this.groupIds.length)}`,
        label: this.isByLocation ? this.$t('pageComparisonClimateLocationsCompared') : this.$t('pageComparisonSingleTraitDatasetsCompared')
      }, {
        key: 'observations',
        value: formatNumber(this.usedRows.length),
        label: this.$t('pageTraitDetailsStatsObservations')
      }, {
        key: 'dates',
        value: formatNumber(new Set(this.usedRows.map(r => r.day)).size),
        label: this.$t('pageComparisonTemporalDates')
      }, {
        key: 'events',
        value: formatNumber(this.eventNames.length),
        label: this.$t('pageClimateTemporalEvents')
      }]
      if (this.hasWindow) {
        const places = new Set(this.rows.filter(r => r.value !== null).map(r => `${r.datasetId}|${r.locationId}`))
        const without = [...places].filter(key => !this.windowOf(...key.split('|').map(Number))).length
        if (without > 0) {
          numbers.push({ key: 'nowindow', danger: true, value: formatNumber(without), label: this.$t('pageClimateTemporalNoWindow') })
        }
      }
      return numbers
    },
    views: function () {
      return [
        { key: 'series', icon: 'fa-solid fa-chart-line', text: this.$t('pageClimateTemporalSeries'), help: this.$t('pageClimateTemporalSeriesText') },
        { key: 'monthly', icon: 'fa-solid fa-calendar-days', text: this.$t('pageClimateTemporalMonthly'), help: this.$t('pageClimateTemporalMonthlyText') },
        { key: 'calendar', icon: 'fa-solid fa-timeline', text: this.$t('pageClimateTemporalTimeline'), help: this.$t('pageClimateTemporalTimelineText') }
      ]
    },
    axes: function () {
      const axes = [{ key: 'date', text: this.$t('pageComparisonTemporalAxisDate') }, { key: 'doy', text: this.$t('pageComparisonTemporalAxisYear') }]
      if (this.eventNames.length > 0) {
        axes.push({ key: 'since', text: this.$t('pageClimateTemporalAxisSince') })
      }
      return axes
    },
    currentViewText: function () {
      const view = this.views.find(v => v.key === this.view)
      return view ? view.text : ''
    },
    currentViewHelp: function () {
      const view = this.views.find(v => v.key === this.view)
      return view ? view.help : ''
    },
    // The timeline: a row per location of a dataset with events or values of the variable (by location: of the chosen
    // locations); its periods with values (broken where the spacing of its dates is more than one and a half times the
    // usual one: missing values)
    calendarRows: function () {
      const used = new Set(this.groupIds)
      const daysByPlace = {}
      this.rows.filter(r => r.value !== null && r.day).forEach(r => {
        (daysByPlace[`${r.datasetId}|${r.locationId}`] = daysByPlace[`${r.datasetId}|${r.locationId}`] || new Set()).add(r.day)
      })
      const keys = [...new Set(Object.keys(this.eventsByPlace).concat(Object.keys(daysByPlace)))]
      return keys.map(key => {
        const [datasetId, locationId] = key.split('|').map(Number)
        return { key, datasetId, locationId, place: this.eventsByPlace[key] || {}, periods: this.periodsOf(daysByPlace[key] ? [...daysByPlace[key]].sort() : []) }
      }).filter(row => used.has(this.isByLocation ? row.locationId : row.datasetId))
        .map(row => Object.assign(row, {
          group: this.isByLocation ? row.locationId : row.datasetId,
          label: `${this.locationName(row.locationId)} · ${this.datasetNames[row.datasetId] || row.datasetId}`,
          window: this.hasWindow ? this.windowOf(row.datasetId, row.locationId) : null
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    },
    chartHeight: function () {
      return this.view === 'calendar' ? Math.max(260, this.calendarRows.length * 34 + 120) : 460
    },
    summaryRows: function () {
      return this.groups.map(g => {
        const rows = this.usedRows.filter(r => this.groupOf(r) === g.id)
        const values = rows.map(r => r.value)
        const days = rows.map(r => r.day).sort()
        const windows = this.hasWindow ? [...new Set(rows.map(r => `${r.datasetId}|${r.locationId}`))].map(key => this.windowOf(...key.split('|').map(Number))).filter(w => w) : []
        return {
          id: g.id,
          name: g.name,
          n: values.length,
          mean: values.length > 0 ? mean(values) : null,
          min: values.length > 0 ? Math.min(...values) : null,
          max: values.length > 0 ? Math.max(...values) : null,
          first: days[0] || null,
          last: days[days.length - 1] || null,
          windowDays: windows.length > 0 ? mean(windows.map(w => daysBetween(w.start, w.end))) : null
        }
      })
    },
    summaryColumns: function () {
      const number = (key, label, formatter) => ({ key, type: Number, sortable: false, class: 'text-right', label, formatter })
      const columns = [
        { key: 'name', type: String, sortable: false, label: this.isByLocation ? this.$t('tableColumnLocationName') : this.$t('tableColumnDatasetName') },
        number('n', this.$t('pageTraitDetailsStatsObservations'), value => formatNumber(value)),
        number('mean', this.$t('pageTraitDetailsStatsMean'), value => this.formatUnit(value)),
        number('min', this.$t('pageTraitDetailsStatsMinMax'), (value, key, item) => item.n > 0 ? `${this.formatValue(item.min)} – ${this.formatUnit(item.max)}` : '–'),
        { key: 'first', type: String, sortable: false, label: this.$t('pageComparisonTemporalFirst'), formatter: value => value ? formatDate(value) : '–' },
        { key: 'last', type: String, sortable: false, label: this.$t('pageComparisonTemporalLast'), formatter: value => value ? formatDate(value) : '–' }
      ]
      if (this.hasWindow) {
        columns.push(number('windowDays', this.$t('pageClimateTemporalWindowDays'), value => value === null ? '–' : formatNumber(Math.round(value))))
      }
      return columns
    }
  },
  watch: {
    // Other datasets or locations: their events loaded again
    traitsLoading: function (loading) {
      if (!loading) {
        this.loadEvents()
      }
    },
    locationIds: function () {
      this.loadEvents()
    },
    chosenLocations: function () {
      if (this.isByLocation && this.selectedKey !== null && !this.comparable.some(o => o.key === this.selectedKey)) {
        this.clearTrait()
      }
    },
    compareBy: function () {
      this.loadEvents()
      if (this.selectedKey !== null && this.comparable.some(o => o.key === this.selectedKey)) {
        this.rows = []
        this.prepareRows()
      } else {
        this.clearTrait()
      }
    },
    // The first event as the origin of the days since
    eventNames: function (names) {
      if (!names.includes(this.originEvent)) {
        this.originEvent = names.length > 0 ? names[0] : null
      }
      if (!names.includes(this.windowStart)) {
        this.windowStart = null
      }
      if (!names.includes(this.windowEnd)) {
        this.windowEnd = null
      }
      if (this.axis === 'since' && names.length < 1) {
        this.axis = 'date'
      }
    },
    windowStart: function (name) {
      if (!name || name === this.windowEnd) {
        this.windowEnd = null
      }
    }
  },
  methods: {
    formatUnit: function (value) {
      const text = this.formatValue(value)
      return this.unit && text !== '–' ? `${text} ${this.unit}` : text
    },
    // The group of a value: its dataset, or (by location) its location
    groupOf: function (row) {
      return this.isByLocation ? row.locationId : row.datasetId
    },
    groupName: function (id) {
      return this.isByLocation ? this.locationName(id) : (this.datasetNames[id] || `${id}`)
    },
    locationName: function (id) {
      const l = this.chosenLocations.find(o => o.locationId === id)
      if (l) {
        return l.countryCode3 ? `${l.locationName} (${l.countryCode3})` : l.locationName
      }
      const row = this.rows.find(r => r.locationId === id)
      return row ? row.locationName : `${id}`
    },
    getGroupColor: function (id) {
      const group = this.groups.find(g => g.id === id)
      return group ? group.color : null
    },
    // An observation: its dataset, location, day and value
    toRow: function (o) {
      return { datasetId: o.datasetId, locationId: o.germplasmId, locationName: o.germplasmName, day: o.recordingDate || null, raw: o.traitValue, value: parseNumber(o.traitValue) }
    },
    // The events of the datasets (their date variables; by location: at the chosen locations), at once
    loadEvents: function () {
      const ids = this.eventVariableIds
      const datasetIds = this.datasets.map(d => d.datasetId)
      if (ids.length < 1 || datasetIds.length < 1) {
        this.events = []
        return
      }
      const filter = [{ column: 'climateId', comparator: 'inSet', operator: 'and', values: ids }]
      if (this.isByLocation) {
        filter.push({ column: 'locationId', comparator: 'inSet', operator: 'and', values: this.locationIds && this.locationIds.length > 0 ? this.locationIds : [-1] })
      }
      const key = JSON.stringify([ids, datasetIds, filter])
      this.eventsKey = key
      apiPostClimateDataTable({ page: 1, limit: EVENTS_LIMIT, datasetIds, filter }, result => {
        if (this.eventsKey !== key) {
          return
        }
        this.events = ((result && result.data) || []).map(climateAsObservation).map(o => {
          const day = toDay(o.traitValue) || o.recordingDate || null
          return day ? { name: `${o.traitName}`.trim(), day, datasetId: o.datasetId, locationId: o.germplasmId } : null
        }).filter(e => e)
      }, { codes: [], callback: () => { this.events = [] } })
    },
    setView: function (key) {
      this.view = key
      this.redraw()
    },
    setTimelineAxis: function (key) {
      this.timelineAxis = key
      this.redraw()
    },
    // The periods of sorted days: a new one where the gap is more than one and a half times the usual (median) gap
    periodsOf: function (days) {
      if (days.length < 1) {
        return []
      }
      const gaps = []
      for (let i = 1; i < days.length; i++) {
        gaps.push(daysBetween(days[i - 1], days[i]))
      }
      const sorted = gaps.slice().sort((a, b) => a - b)
      const usual = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 1
      const periods = [{ start: days[0], end: days[0] }]
      for (let i = 1; i < days.length; i++) {
        if (gaps[i - 1] > Math.max(1, usual * 1.5)) {
          periods.push({ start: days[i], end: days[i] })
        } else {
          periods[periods.length - 1].end = days[i]
        }
      }
      return periods
    },
    setAxis: function (key) {
      this.axis = key
      this.redraw()
    },
    redraw: function () {
      this.$nextTick(() => this.draw())
    },
    // The time of a value on the axis chosen: its date, its day in the year 2000, or its days since the event chosen at
    // its location of its dataset (null without it)
    timeOf: function (row) {
      if (this.axis === 'doy') {
        return yearDay(row.day)
      }
      if (this.axis === 'since') {
        const place = this.eventsByPlace[`${row.datasetId}|${row.locationId}`]
        const origin = place && place[this.originEvent] ? place[this.originEvent][0] : null
        return origin ? daysBetween(origin, row.day) : null
      }
      return row.day
    },
    getSummaryData: function (request) {
      return this.getTableData(request, this.summaryRows)
    },
    downloadSummary: function (request, callback) {
      const number = value => value === null || value === undefined ? '' : `${Math.round(value * 10000) / 10000}`
      const header = [this.isByLocation ? this.$t('tableColumnLocationName') : this.$t('tableColumnDatasetName'), this.$t('pageTraitDetailsStatsObservations'), this.$t('pageTraitDetailsStatsMean'), 'Min', 'Max', this.$t('pageComparisonTemporalFirst'), this.$t('pageComparisonTemporalLast')]
      if (this.hasWindow) {
        header.push(this.$t('pageClimateTemporalWindowDays'))
      }
      const lines = [header.join('\t')].concat(this.summaryRows.map(r => {
        const line = [r.name, r.n, number(r.mean), number(r.min), number(r.max), r.first || '', r.last || '']
        if (this.hasWindow) {
          line.push(r.windowDays === null ? '' : Math.round(r.windowDays))
        }
        return line.join('\t')
      }))
      return this.resolveLater(callback, makeZip([{ name: `${this.getFileName()}-summary.txt`, content: lines.join('\r\n') }]))
    },
    // The values used (dataset, location, date, value) and the events (dataset, location, date, event)
    downloadData: function () {
      const values = [['dataset', 'location', 'date', 'value'].join('\t')].concat(this.usedRows.map(r => [this.datasetNames[r.datasetId] || r.datasetId, r.locationName, r.day, r.value].join('\t')))
      const events = [['dataset', 'location', 'date', 'event'].join('\t')].concat(this.events.map(e => [this.datasetNames[e.datasetId] || e.datasetId, this.locationName(e.locationId), e.day, e.name].join('\t')))
      downloadBlob({ blob: makeZip([{ name: 'values.txt', content: values.join('\r\n') }, { name: 'events.txt', content: events.join('\r\n') }]), filename: `${this.getFileName()}-${getDateTimeString()}`, extension: 'zip' })
    },
    getFileName: function () {
      return `climate-temporal-${this.selected ? this.selected.name.replace(/[^\w-]+/g, '_') : 'variable'}-${this.view}`
    },
    draw: function () {
      if (this.rowsState !== 'loaded' || this.groups.length < 1) {
        return
      }
      this.$nextTick(() => {
        const element = this.$refs.chart
        if (!element) {
          return
        }
        Plotly.purge(element)
        if (this.view === 'series') {
          this.drawSeries(element)
        } else if (this.view === 'monthly') {
          this.drawMonthly(element)
        } else if (this.calendarRows.length > 0) {
          this.drawCalendar(element)
        }
      })
    },
    // A line per group: the mean of each time; the events (at the places of the group) as dashed lines with their names
    drawSeries: function (element) {
      const theme = this.getTheme()
      const unit = this.unit ? ` ${this.unit}` : ''
      const data = this.groups.map(g => {
        const byTime = {}
        this.usedRows.filter(r => this.groupOf(r) === g.id).forEach(r => {
          const time = this.timeOf(r)
          if (time !== null) {
            (byTime[time] = byTime[time] || []).push(r.value)
          }
        })
        const times = Object.keys(byTime).sort((a, b) => this.axis === 'since' ? a - b : a.localeCompare(b))
        return {
          type: 'scatter',
          mode: times.length > 60 ? 'lines' : 'lines+markers',
          name: g.name,
          x: times.map(t => this.axis === 'since' ? +t : t),
          y: times.map(t => mean(byTime[t])),
          line: { color: g.color, width: 2 },
          marker: { color: g.color, size: 5 },
          hoverlabel: theme.hoverlabel,
          hovertemplate: `<b>${g.name}</b><br>%{x}: %{y:.2f}${unit}<extra></extra>`
        }
      })
      // The events on the axis: their time at the places of the groups (one line per event and time)
      const marks = {}
      const used = new Set(this.groups.map(g => g.id))
      this.events.filter(e => used.has(this.isByLocation ? e.locationId : e.datasetId)).forEach(e => {
        const time = this.timeOf({ day: e.day, datasetId: e.datasetId, locationId: e.locationId })
        if (time !== null) {
          marks[`${time}|${e.name}`] = { time, name: e.name, color: this.getGroupColor(this.isByLocation ? e.locationId : e.datasetId) }
        }
      })
      const shapes = Object.values(marks).map(m => ({ type: 'line', xref: 'x', yref: 'paper', x0: m.time, x1: m.time, y0: 0, y1: 1, line: { color: m.color || theme.muted, width: 1, dash: 'dash' } }))
      const annotations = Object.values(marks).map(m => ({ text: m.name, x: m.time, xref: 'x', y: 1, yref: 'paper', yanchor: 'bottom', textangle: -25, showarrow: false, font: { size: 10, color: theme.muted } }))
      const xaxis = { gridcolor: theme.grid, tickfont: { color: theme.muted }, automargin: true }
      if (this.axis === 'since') {
        xaxis.title = { text: this.$t('pageClimateTemporalDaysSince', { event: this.originEvent }), font: { color: theme.muted } }
        xaxis.zeroline = true
        xaxis.zerolinecolor = theme.muted
      } else {
        xaxis.type = 'date'
        xaxis.tickformat = this.axis === 'doy' ? '%d %b' : '%Y-%m-%d'
        xaxis.hoverformat = this.axis === 'doy' ? '%d %b' : '%Y-%m-%d'
      }
      Plotly.react(element, data, this.getLayout({
        height: this.chartHeight,
        margin: { t: annotations.length > 0 ? 70 : 10, r: 20, b: 50, l: 70 },
        showlegend: true,
        legend: { font: { color: theme.text } },
        shapes,
        annotations,
        xaxis,
        yaxis: { title: { text: this.axisTitle(), font: { color: theme.muted } }, gridcolor: theme.grid, zeroline: false, tickfont: { color: theme.muted } }
      }), { displayModeBar: false, responsive: true })
    },
    axisTitle: function () {
      return this.selected ? `${this.selected.name}${this.unit ? ` (${this.unit})` : ''}` : ''
    },
    // A line per group over the months of the year: the mean of the month at each place of each year, then their mean
    drawMonthly: function (element) {
      const theme = this.getTheme()
      const unit = this.unit ? ` ${this.unit}` : ''
      const months = [...Array(12).keys()].map(m => new Date(Date.UTC(2000, m, 15)).toLocaleDateString(this.locale, { month: 'short', timeZone: 'UTC' }))
      const data = this.groups.map(g => {
        const byMonth = {}
        this.usedRows.filter(r => this.groupOf(r) === g.id).forEach(r => {
          const key = `${r.datasetId}|${r.locationId}|${r.day.substring(0, 7)}`
          ;(byMonth[key] = byMonth[key] || []).push(r.value)
        })
        const perMonth = [...Array(12)].map(() => [])
        Object.keys(byMonth).forEach(key => perMonth[+key.substring(key.length - 2) - 1].push(mean(byMonth[key])))
        return {
          type: 'scatter',
          mode: 'lines+markers',
          name: g.name,
          x: months,
          y: perMonth.map(values => values.length > 0 ? mean(values) : null),
          line: { color: g.color, width: 2 },
          marker: { color: g.color, size: 6 },
          hoverlabel: theme.hoverlabel,
          hovertemplate: `<b>${g.name}</b><br>%{x}: %{y:.2f}${unit}<extra></extra>`
        }
      })
      Plotly.react(element, data, this.getLayout({
        height: this.chartHeight,
        showlegend: true,
        legend: { font: { color: theme.text } },
        xaxis: { type: 'category', tickfont: { color: theme.text }, automargin: true },
        yaxis: { title: { text: this.axisTitle(), font: { color: theme.muted } }, gridcolor: theme.grid, zeroline: false, tickfont: { color: theme.muted } }
      }), { displayModeBar: false, responsive: true })
    },
    // A row per location of a dataset (by date or by day of the year): the periods with values of the variable as a bar
    // in the colour of its group (broken where values are missing), its events as points (a colour per event; their date
    // in the hover); with a window, the bar from its start to its end and its days
    drawCalendar: function (element) {
      const theme = this.getTheme()
      const byDate = this.timelineAxis === 'date'
      const x = day => byDate ? day : yearDay(day)
      const rows = this.calendarRows
      const labels = rows.map(r => r.label)
      const colors = this.getDistinctColors(this.eventNames.length)
      const data = []
      // The periods with values: a bar per group (its rows)
      this.groups.forEach(g => {
        const own = rows.filter(r => r.group === g.id && r.periods.length > 0)
        if (own.length < 1) {
          return
        }
        const segments = own.flatMap(r => r.periods.map(p => ({ label: r.label, p })))
        data.push({
          type: 'scatter',
          mode: 'lines',
          name: g.name,
          x: segments.flatMap(sg => [x(sg.p.start), x(sg.p.end), null]),
          y: segments.flatMap(sg => [sg.label, sg.label, null]),
          customdata: segments.flatMap(sg => [`${formatDate(sg.p.start)} – ${formatDate(sg.p.end)}`, `${formatDate(sg.p.start)} – ${formatDate(sg.p.end)}`, null]),
          line: { color: g.color, width: 5 },
          hoverlabel: theme.hoverlabel,
          hovertemplate: `<b>${this.selected ? this.selected.name : ''}</b><br>%{y}<br>%{customdata}<extra></extra>`
        })
      })
      if (this.hasWindow) {
        const windowed = rows.filter(r => r.window)
        data.push({
          type: 'scatter',
          mode: 'lines',
          name: `${this.windowStart} → ${this.windowEnd}`,
          x: windowed.flatMap(r => [x(r.window.start), x(r.window.end), null]),
          y: windowed.flatMap(r => [r.label, r.label, null]),
          line: { color: theme.muted, width: 14 },
          opacity: 0.25,
          hoverinfo: 'skip'
        }, {
          type: 'scatter',
          mode: 'text',
          showlegend: false,
          x: windowed.map(r => x(r.window.end)),
          y: windowed.map(r => r.label),
          text: windowed.map(r => `  ${formatNumber(daysBetween(r.window.start, r.window.end))} d`),
          textposition: 'middle right',
          textfont: { color: theme.text, size: 11 },
          hoverinfo: 'skip'
        })
      }
      this.eventNames.forEach((name, index) => {
        const points = rows.flatMap(r => (r.place[name] || []).map(day => ({ label: r.label, day })))
        data.push({
          type: 'scatter',
          mode: 'markers',
          name,
          x: points.map(pt => x(pt.day)),
          y: points.map(pt => pt.label),
          customdata: points.map(pt => formatDate(pt.day)),
          marker: { color: colors[index], size: 11, symbol: 'diamond', line: { color: theme.text, width: 0.5 } },
          hoverlabel: theme.hoverlabel,
          hovertemplate: `<b>${name}</b><br>%{y}<br>%{customdata}<extra></extra>`
        })
      })
      Plotly.react(element, data, this.getLayout({
        height: this.chartHeight,
        margin: { t: 10, r: 60, b: 40, l: 20 },
        showlegend: true,
        legend: { orientation: 'h', y: -0.15, font: { color: theme.text } },
        xaxis: { type: 'date', tickformat: byDate ? '%Y-%m' : '%d %b', gridcolor: theme.grid, tickfont: { color: theme.muted } },
        yaxis: { type: 'category', categoryorder: 'array', categoryarray: labels.slice().reverse(), automargin: true, tickfont: { color: theme.text } }
      }), { displayModeBar: false, responsive: true })
    }
  }
}
</script>

<style src="@/assets/trait-stats.css"></style>
<style scoped src="@/assets/variable-stats.css"></style>
<style scoped src="@/assets/trait-comparison.css"></style>
<style scoped>
.ctc-head-icon {
  color: var(--stc-type-color);
  font-size: 1.35rem;
}
.ctc-chosen {
  color: var(--cp-text);
  font-weight: 600;
}
.ctc-chosen-unit {
  color: var(--cp-muted);
  font-weight: 400;
}
/* The window and the time axis: a line of controls */
.ctc-controls,
.ctc-axis {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.ctc-controls {
  margin: 1rem 1.25rem 0;
}
.ctc-axis {
  margin-bottom: 0.25rem;
}
.ctc-control-label {
  color: var(--cp-muted);
  font-size: 0.8rem;
}
.ctc-control-label .fa-solid {
  margin-right: 0.25rem;
}
.ctc-select {
  height: 30px;
  padding: 0 0.5rem;
  border: 1px solid var(--cp-border);
  border-radius: 8px;
  background: var(--cp-surface);
  color: var(--cp-text);
  font-size: 0.82rem;
}
.ctc-axis-option {
  padding: 0.2rem 0.65rem;
  border: 1px solid var(--cp-border);
  border-radius: 999px;
  background: transparent;
  color: var(--cp-muted);
  font-size: 0.8rem;
}
.ctc-axis-option.active {
  border-color: var(--cp-green);
  background: var(--cp-surface);
  color: var(--cp-text);
}
.ctc-views-wrap {
  margin-bottom: 0.25rem;
}
.ctc-view-text {
  margin: 0.25rem 0 0.75rem;
  color: var(--cp-muted);
  font-size: 0.78rem;
  text-align: center;
}
</style>
