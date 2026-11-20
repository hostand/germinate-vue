<template>
  <!-- Location profile (a tab of the climate export): a location of the chosen datasets (those of their locations) and
       its climate. Its measurements (numeric variables; the same name and unit in several datasets taken together) as
       indicators: their mean (no rule by the name of a variable: the climate data follows no convention). The variables available (their
       climate type), the site management (categorical and text values). Then the views: each measurement over time (a
       colour per dataset, the events of the location, its date variables, as dashed lines), the summary statistics
       (a read-only table, downloadable), the distribution (a box per dataset), the monthly averages and the minimum /
       maximum by month of the year (all the years together), the missing observations (the share of the recording dates
       of the location with a value of each measurement, by month). A chart per measurement in one figure (a row each). -->
  <section class="stc lpr">
    <header class="stc-head">
      <span class="stc-icon" :style="{ '--stc-type-color': typeColor }" aria-hidden="true"><i class="fa-solid fa-location-dot lpr-head-icon" /></span>
      <div class="stc-heading">
        <h3 class="stc-title">{{ $t('pageLocationProfileTitle') }}</h3>
        <p class="stc-text">{{ $t('pageLocationProfileText') }}</p>
      </div>
      <div class="stc-select">
        <GermplasmFilterSelect id="lpr-location"
                               :options="locationOptions"
                               :value="locationId"
                               :placeholder="$t('pageLocationProfilePlaceholder')"
                               clearOnClick
                               :loading="locationsLoading"
                               countIcon="fa-solid fa-database"
                               @select="selectLocation"
                               @clear="clearLocation" />
      </div>
    </header>

    <p class="tvs-empty lpr-none" v-if="!locationsLoading && locations.length < 1">{{ $t('pageLocationProfileNone') }}</p>

    <div class="stc-body tvs" :id="id" :style="{ '--stc-type-color': typeColor }" v-if="locationId !== null">
      <div class="tvs-loading" v-if="dataState === 'loading'"><b-spinner small /> {{ rowsProgress || $t('tooltipTableLoadingIndicator') }}</div>
      <p class="tvs-empty" v-else-if="dataState === 'loaded' && records.length < 1">{{ $t('pageLocationProfileNoData') }}</p>
      <template v-else-if="dataState === 'loaded'">
        <!-- The place: its flag, name and country (its code); its coordinates and elevation on the right. The whole band
             opens and closes the map of the location (with its coordinates) -->
        <div :class="['lpr-place', { 'lpr-place-clickable': placeRow }]"
             :role="placeRow ? 'button' : null"
             :tabindex="placeRow ? 0 : null"
             :aria-expanded="placeRow ? (mapOpen ? 'true' : 'false') : null"
             @click="toggleMap"
             @keydown.enter.prevent="toggleMap"
             @keydown.space.prevent="toggleMap">
          <div class="lpr-place-main">
            <i :class="`fi fi-${place.countryCode2.toLowerCase()} lpr-place-flag`" v-if="place.countryCode2" />
            <span class="lpr-place-name">{{ place.name }}</span>
            <span class="lpr-place-country" v-if="place.countryName">{{ place.countryName }}<template v-if="place.countryCode3"> · ({{ place.countryCode3 }})</template></span>
          </div>
          <dl class="lpr-place-facts">
            <div class="lpr-place-fact" v-if="place.latitude !== null">
              <dt>{{ $t('tableColumnLocationLatitude') }}</dt>
              <dd>{{ formatCoordinate(place.latitude, 'N', 'S') }}</dd>
            </div>
            <div class="lpr-place-fact" v-if="place.longitude !== null">
              <dt>{{ $t('tableColumnLocationLongitude') }}</dt>
              <dd>{{ formatCoordinate(place.longitude, 'E', 'W') }}</dd>
            </div>
            <div class="lpr-place-fact" v-if="place.elevation !== null">
              <dt>{{ $t('pageLocationProfileElevation') }}</dt>
              <dd>{{ formatNumber(Math.round(place.elevation)) }} m</dd>
            </div>
          </dl>
        </div>
        <!-- The map of the location (its band clicked), as in the tables of the datasets: the names of the places on it
             (OpenStreetMap), no details popup (the band shows them) -->
        <div class="lpr-map" v-if="mapOpen && placeRow">
          <LocationMap :locations="[placeRow]" :showLinks="false" :popups="false" baseLayer="osm" border="" customLook :key="`lpr-map-${locationId}`" />
        </div>
        <!-- The highlights and the views: a block of their own (the options of the chart at the right end of the highlights) -->
        <div class="lpr-stats">
        <!-- The highlights: the measurements with the most values at the location (five at most), an icon by their name -->
        <div class="tvs-numbers" v-if="highlights.length > 0">
          <div class="tvs-number" v-for="m in highlights" :key="`lpr-number-${m.key}`">
            <span class="tvs-number-value"><i :class="[m.icon, 'lpr-number-icon']" aria-hidden="true" v-if="m.icon" />{{ formatUnit(m.mean, m.unit) }}</span>
            <span class="tvs-number-label">{{ m.name }}</span>
            <span class="lpr-number-kind">{{ $t('pageLocationProfileMean') }}</span>
          </div>
        </div>
        <p class="tvs-empty" v-else>{{ $t('pageLocationProfileNoMeasurements') }}</p>
        <!-- The views of the measurements -->
        <BaseChart :width="() => 1280"
                   :height="() => chartHeight"
                   :supportsPngDownload="false"
                   :supportsSvgDownload="false"
                   :canChangeColors="false"
                   customLook
                   class="tvs-base"
                   ref="baseChart"
                   v-on:force-redraw="draw"
                   v-if="measurements.length > 0">
          <template slot="additionalMenuItems">
            <b-dropdown-header>{{ currentViewText }}</b-dropdown-header>
            <b-dropdown-item link-class="top-nav-menu-item" @click="downloadChart('chart', 'png')" :disabled="view === 'summary'"><i class="fa-solid fa-image fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadPng') }}</b-dropdown-item>
            <b-dropdown-item link-class="top-nav-menu-item" @click="downloadChart('chart', 'svg')" :disabled="view === 'summary'"><i class="fa-solid fa-file-code fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadSvg') }}</b-dropdown-item>
            <b-dropdown-divider />
            <b-dropdown-item link-class="top-nav-menu-item" @click="downloadData"><i class="fa-solid fa-file-lines fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadFile') }}</b-dropdown-item>
            <b-dropdown-item link-class="top-nav-menu-item" @click="$refs.baseChart.showColors()"><i class="fa-solid fa-palette fa-fw" aria-hidden="true" /> {{ $t('buttonChangeChartColors') }}</b-dropdown-item>
          </template>
          <div slot="chart" class="tvs-chart-wrap">
            <div class="tds lpr-views-wrap">
              <div class="tds-views" role="tablist">
                <button type="button"
                        :class="['tds-view', { active: view === option.key }]"
                        role="tab"
                        :aria-selected="view === option.key ? 'true' : 'false'"
                        v-for="option in views"
                        :key="`lpr-view-${option.key}`"
                        @click="setView(option.key)">
                  <MdiIcon :path="option.path" className="lpr-view-icon" /> {{ option.text }}
                </button>
              </div>
            </div>
            <p class="lpr-view-text">{{ currentViewHelp }}</p>
            <!-- The summary statistics: a read-only table (its tools shown, inactive), downloadable -->
            <div class="stc-summary" v-if="view === 'summary'">
              <BaseTable :columns="summaryColumns"
                         :options="summaryOptions"
                         :getData="getSummaryData"
                         :getIds="null"
                         :downloadTable="downloadSummary"
                         toolsLocked
                         :autoHideColumns="false"
                         :storeUrlParameters="false"
                         primary-key="key"
                         :key="`lpr-summary-${locationId}`" />
            </div>
            <div class="stc-chart" ref="chart" v-show="view !== 'summary'" />
          </div>
        </BaseChart>
        </div>
        <!-- The variables of the location: a read-only table (their climate type, values, period; the values of the
             management) -->
        <div class="stc-summary-wrap lpr-variables">
          <h4 class="stc-chart-title">{{ $t('pageLocationProfileVariables') }}</h4>
          <div class="stc-summary">
            <BaseTable :columns="variableColumns"
                       :options="variableOptions"
                       :getData="getVariableData"
                       :getIds="null"
                       :downloadTable="downloadVariables"
                       toolsLocked
                       :autoHideColumns="false"
                       :storeUrlParameters="false"
                       primary-key="key"
                       :key="`lpr-variables-${locationId}`">
              <template v-slot:cell(climateType)="data">
                <ClimateTypeChip :dataType="data.item.dataType" />
              </template>
              <template v-slot:cell(name)="data">
                <i :class="[data.item.icon, 'lpr-variable-icon']" aria-hidden="true" v-if="data.item.icon" /> {{ data.item.name }}
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
import ClimateTypeChip from '@/components/tables/ClimateTypeChip'
import LocationMap from '@/components/map/LocationMap'
import MdiIcon from '@/components/icons/MdiIcon'
import traitComparison, { normalize } from '@/mixins/trait-comparison'
import { apiPostClimateDataTable } from '@/mixins/api/climate'
import { loadDatasetLocations } from '@/mixins/dataset-locations'
import { getVariableIcon } from '@/mixins/climate-icons'
import { formatNumber, formatDate, getDateTimeString } from '@/mixins/formatting'
import { downloadBlob } from '@/mixins/util'
import { makeZip } from '@/mixins/zip'
import { mean, quantile } from '@/mixins/stats-math'
import { getGradientScale } from '@/mixins/chart-palettes'
import { mdiChartLine, mdiTableLarge, mdiChartBoxOutline, mdiCalendarMonth, mdiArrowExpandVertical, mdiGridLarge } from '@mdi/js'

const Plotly = require('plotly.js/lib/core')
Plotly.register([
  require('plotly.js/lib/scatter'),
  require('plotly.js/lib/bar'),
  require('plotly.js/lib/box'),
  require('plotly.js/lib/heatmap')
])

// The highlights of a location: its measurements with the most values, at most this many
const HIGHLIGHTS = 5
// The data of the location loaded in pages of this many
const PAGE = 10000
// The height of the chart of a measurement (a row of the figure), and what the axes take
const ROW_HEIGHT = 190
const ROW_EXTRA = 70

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
const sd = (values, m) => values.length > 1 ? Math.sqrt(values.reduce((sum, x) => sum + (x - m) * (x - m), 0) / (values.length - 1)) : null

export default {
  components: {
    BaseChart,
    BaseTable,
    GermplasmFilterSelect,
    ClimateTypeChip,
    LocationMap,
    MdiIcon
  },
  // The variables of the datasets (their units), the theme, the colours and the downloads (the climate data)
  mixins: [traitComparison],
  props: {
    variable: {
      type: String,
      default: 'climate'
    }
  },
  data: function () {
    return {
      // The locations of the chosen datasets: [{ locationId, locationName, datasetIds, countryCode2, countryCode3,
      // countryName, latitude, longitude, elevation }]
      locations: [],
      locationsLoading: true,
      locationId: null,
      // The map of the location shown (its name clicked)
      mapOpen: false,
      // The data of the location: none, loading, loaded
      dataState: 'none',
      // Its records: { datasetId, climateId, day, raw, value, countryName, countryCode2 }
      records: [],
      // series, summary, distribution, monthly, minmax or missing
      view: 'series',
      summaryOptions: {
        idColumn: 'key',
        tableName: 'locationProfile'
      },
      variableOptions: {
        idColumn: 'key',
        tableName: 'locationProfileVariables'
      }
    }
  },
  computed: {
    // The comparisons of the mixin: none here (its trait chosen: never)
    comparable: function () {
      return []
    },
    locationOptions: function () {
      return this.locations.map(l => ({ value: l.locationId, name: l.locationName, flag: l.countryCode2 ? l.countryCode2.toLowerCase() : null, suffix: l.countryCode3 || null, count: l.datasetIds.length }))
    },
    // Every variable of the datasets by its id: { name, short, dataType, unit }
    variableById: function () {
      const map = {}
      Object.values(this.traitsByDataset).forEach(list => (list || []).forEach(t => {
        map[t.traitId] = { name: `${t.traitName}`.trim(), dataType: t.dataType, unit: t.unitAbbreviation || t.unitName || '', unitName: t.unitName || '', unitAbbreviation: t.unitAbbreviation || '' }
      }))
      return map
    },
    // The chosen location: its name, country, coordinates and elevation
    place: function () {
      const l = this.locations.find(o => o.locationId === this.locationId) || {}
      const first = this.records.find(o => o.countryCode2 || o.countryName) || {}
      const number = value => value === null || value === undefined || value === '' || !isFinite(value) ? null : +value
      return {
        name: l.locationName || '',
        countryCode2: l.countryCode2 || first.countryCode2 || null,
        countryCode3: l.countryCode3 || null,
        countryName: l.countryName || first.countryName || null,
        latitude: number(l.latitude),
        longitude: number(l.longitude),
        elevation: number(l.elevation)
      }
    },
    // The row of the chosen location in the locations table (the map shows it): only with its coordinates
    placeRow: function () {
      const l = this.locations.find(o => o.locationId === this.locationId)
      return l && l.row && l.row.locationLatitude !== null && l.row.locationLatitude !== undefined && l.row.locationLongitude !== null && l.row.locationLongitude !== undefined ? l.row : null
    },
    // The datasets of the location with data (a colour each)
    usedDatasets: function () {
      const ids = this.datasets.map(d => d.datasetId).filter(id => this.records.some(r => r.datasetId === id))
      const colors = this.getDistinctColors(ids.length)
      return ids.map((datasetId, index) => ({ datasetId, datasetName: this.datasetNames[datasetId] || `${datasetId}`, color: colors[index] }))
    },
    // Every variable of the location (by its name and unit): its climate type, the values of the site management
    variables: function () {
      const groups = {}
      this.records.forEach(r => {
        const v = this.variableById[r.climateId]
        if (!v) {
          return
        }
        const key = `${normalize(v.name)}|${normalize(v.unit)}`
        const g = groups[key] = groups[key] || { key, name: v.name, unit: v.unit, unitName: v.unitName, unitAbbreviation: v.unitAbbreviation, dataType: v.dataType, icon: getVariableIcon(v.name), values: [], n: 0, first: null, last: null }
        g.n++
        if (r.day && (!g.first || r.day < g.first)) {
          g.first = r.day
        }
        if (r.day && (!g.last || r.day > g.last)) {
          g.last = r.day
        }
        if ((v.dataType === 'categorical' || v.dataType === 'text') && `${r.raw}`.trim() !== '' && !g.values.includes(`${r.raw}`.trim())) {
          g.values.push(`${r.raw}`.trim())
        }
      })
      const order = { numeric: 0, date: 1, categorical: 2, text: 2 }
      return Object.values(groups).sort((a, b) => (order[a.dataType] - order[b.dataType]) || a.name.localeCompare(b.name))
    },
    // The measurements (numeric variables, by name and unit): their values with a date, their numbers
    measurements: function () {
      const groups = {}
      this.records.forEach(r => {
        const v = this.variableById[r.climateId]
        if (!v || v.dataType !== 'numeric') {
          return
        }
        const key = `${normalize(v.name)}|${normalize(v.unit)}`
        const g = groups[key] = groups[key] || { key, name: v.name, unit: v.unit, records: [] }
        g.records.push(r)
      })
      return Object.values(groups).map(g => {
        const valid = g.records.filter(r => r.value !== null)
        const values = valid.map(r => r.value).sort((a, b) => a - b)
        const m = values.length > 0 ? mean(values) : null
        const days = valid.map(r => r.day).filter(d => d).sort()
        return Object.assign(g, {
          valid,
          n: values.length,
          invalid: g.records.length - values.length,
          mean: m,
          median: values.length > 0 ? quantile(values, 0.5) : null,
          sd: sd(values, m),
          min: values.length > 0 ? values[0] : null,
          max: values.length > 0 ? values[values.length - 1] : null,
          first: days[0] || null,
          last: days[days.length - 1] || null,
          missing: this.missingOf(g.records)
        })
      }).filter(g => g.records.length > 0).sort((a, b) => a.name.localeCompare(b.name))
    },
    // The highlights: the measurements with the most values at the location (five at most), their icon by their name
    highlights: function () {
      return this.measurements.filter(m => m.n > 0).slice().sort((x, y) => y.n - x.n || x.name.localeCompare(y.name)).slice(0, HIGHLIGHTS)
        .map(m => Object.assign({ icon: getVariableIcon(m.name) }, m))
    },
    // The table of the variables: their climate type, unit, values, period; the values of the management
    variableColumns: function () {
      return [
        { key: 'name', type: String, sortable: false, label: this.$t('tableColumnClimateName') },
        { key: 'climateType', type: undefined, sortable: false, label: this.$t('tableColumnClimateType') },
        // The values of the management: hidden at first (the column selector shows them)
        { key: 'valuesText', type: String, sortable: false, defaultHidden: true, label: this.$t('pageLocationProfileValues') },
        { key: 'unitName', type: String, sortable: false, label: this.$t('tableColumnClimateUnitName') },
        { key: 'unitAbbreviation', type: String, sortable: false, label: this.$t('tableColumnClimateUnitAbbreviation') },
        { key: 'n', type: Number, sortable: false, class: 'text-right', label: this.$t('pageTraitDetailsStatsObservations'), formatter: value => formatNumber(value) },
        { key: 'period', type: String, sortable: false, label: this.$t('pageLocationProfilePeriod') }
      ]
    },
    variableRows: function () {
      return this.variables.map(v => Object.assign({}, v, {
        period: v.first ? (v.first === v.last ? formatDate(v.first) : `${formatDate(v.first)} – ${formatDate(v.last)}`) : '–',
        valuesText: v.values.join(' · ')
      }))
    },
    // The events of the location: its date variables, a date each (the value; else the recording date)
    events: function () {
      return this.records.map(r => {
        const v = this.variableById[r.climateId]
        if (!v || v.dataType !== 'date') {
          return null
        }
        const day = toDay(r.raw) || r.day
        return day ? { name: v.name, day, datasetId: r.datasetId } : null
      }).filter(e => e)
    },
    // The recording dates of the measurements of the location in each dataset (of any of them; not those of the events
    // nor of the management): what a measurement is expected on
    expectedDays: function () {
      const map = {}
      this.records.forEach(r => {
        const v = this.variableById[r.climateId]
        if (r.day && v && v.dataType === 'numeric') {
          (map[r.datasetId] = map[r.datasetId] || new Set()).add(r.day)
        }
      })
      return map
    },
    views: function () {
      return [
        { key: 'series', path: mdiChartLine, text: this.$t('pageLocationProfileSeries'), help: this.$t('pageLocationProfileSeriesText') },
        { key: 'summary', path: mdiTableLarge, text: this.$t('pageLocationProfileSummary'), help: this.$t('pageLocationProfileSummaryText') },
        { key: 'distribution', path: mdiChartBoxOutline, text: this.$t('pageLocationProfileDistribution'), help: this.$t('pageLocationProfileDistributionText') },
        { key: 'monthly', path: mdiCalendarMonth, text: this.$t('pageLocationProfileMonthly'), help: this.$t('pageLocationProfileMonthlyText') },
        { key: 'minmax', path: mdiArrowExpandVertical, text: this.$t('pageLocationProfileMinMax'), help: this.$t('pageLocationProfileMinMaxText') },
        { key: 'missing', path: mdiGridLarge, text: this.$t('pageLocationProfileMissing'), help: this.$t('pageLocationProfileMissingText') }
      ]
    },
    currentViewText: function () {
      const view = this.views.find(v => v.key === this.view)
      return view ? view.text : ''
    },
    currentViewHelp: function () {
      const view = this.views.find(v => v.key === this.view)
      return view ? view.help : ''
    },
    chartHeight: function () {
      if (this.view === 'missing') {
        return Math.max(220, this.measurements.length * 46 + 120)
      }
      return this.measurements.length * ROW_HEIGHT + ROW_EXTRA
    },
    // The month names of the page (Jan ... Dec)
    monthNames: function () {
      return [...Array(12).keys()].map(m => new Date(Date.UTC(2000, m, 15)).toLocaleDateString(this.locale, { month: 'short', timeZone: 'UTC' }))
    },
    summaryRows: function () {
      return this.measurements.map(m => ({
        key: m.key,
        name: m.name,
        unit: m.unit,
        n: m.n,
        mean: m.mean,
        median: m.median,
        sd: m.sd,
        min: m.min,
        max: m.max,
        period: m.first ? (m.first === m.last ? formatDate(m.first) : `${formatDate(m.first)} – ${formatDate(m.last)}`) : '–',
        missing: m.missing.missing
      }))
    },
    summaryColumns: function () {
      const number = (key, label, formatter) => ({ key, type: Number, sortable: false, class: 'text-right', label, formatter })
      return [
        { key: 'name', type: String, sortable: false, label: this.$t('tableColumnClimateName') },
        number('n', this.$t('pageTraitDetailsStatsObservations'), value => formatNumber(value)),
        number('mean', this.$t('pageTraitDetailsStatsMean'), (value, key, item) => this.formatUnit(value, item.unit)),
        number('median', this.$t('pageTraitDetailsStatsMedian'), (value, key, item) => this.formatUnit(value, item.unit)),
        number('sd', this.$t('pageTraitDetailsStatsSd'), (value, key, item) => this.formatUnit(value, item.unit)),
        number('min', this.$t('pageTraitDetailsStatsMinMax'), (value, key, item) => item.n > 0 ? `${this.formatValue(item.min)} – ${this.formatUnit(item.max, item.unit)}` : '–'),
        { key: 'period', type: String, sortable: false, label: this.$t('pageLocationProfilePeriod') },
        number('missing', this.$t('pageLocationProfileMissingCount'), value => formatNumber(value))
      ]
    }
  },
  watch: {
    datasets: function () {
      this.loadLocations()
    }
  },
  methods: {
    formatNumber,
    // The band of the place clicked: its map shown or hidden (only with its coordinates)
    toggleMap: function () {
      if (this.placeRow) {
        this.mapOpen = !this.mapOpen
      }
    },
    // A coordinate in degrees with its hemisphere (47.311° N)
    formatCoordinate: function (value, positive, negative) {
      return `${this.formatFixed(Math.abs(value), 3)}° ${value < 0 ? negative : positive}`
    },
    getVariableData: function (request) {
      return this.getTableData(request, this.variableRows)
    },
    formatUnit: function (value, unit) {
      const text = this.formatValue(value)
      return unit && text !== '–' ? `${text} ${unit}` : text
    },
    // The expected dates of a measurement (those of its datasets where it was recorded) without a number: missing
    missingOf: function (records) {
      const datasetIds = [...new Set(records.map(r => r.datasetId))]
      let expected = 0
      let present = 0
      const byMonth = {}
      datasetIds.forEach(id => {
        const days = new Set(records.filter(r => r.datasetId === id && r.value !== null && r.day).map(r => r.day))
        ;(this.expectedDays[id] || new Set()).forEach(day => {
          const month = day.substring(0, 7)
          const cell = byMonth[month] = byMonth[month] || { expected: 0, present: 0 }
          cell.expected++
          expected++
          if (days.has(day)) {
            cell.present++
            present++
          }
        })
      })
      return { expected, present, missing: expected - present, byMonth }
    },
    // The locations of the chosen datasets (from the datasets: their locations), by name
    loadLocations: function () {
      this.locationsLoading = true
      const ids = this.datasets.map(d => d.datasetId)
      loadDatasetLocations(ids).then(locations => {
        if (ids.join(',') !== this.datasets.map(d => d.datasetId).join(',')) {
          return
        }
        this.locations = locations
        this.locationsLoading = false
        if (this.locationId !== null && !locations.some(l => l.locationId === this.locationId)) {
          this.clearLocation()
        }
      })
    },
    selectLocation: function (id) {
      if (id === null || id === undefined || id === this.locationId) {
        return
      }
      this.locationId = id
      this.mapOpen = false
      this.loadData()
    },
    clearLocation: function () {
      this.locationId = null
      this.records = []
      this.dataState = 'none'
    },
    // Every value of the location in the chosen datasets, in pages
    loadData: function () {
      const locationId = this.locationId
      const datasetIds = this.datasets.map(d => d.datasetId)
      this.dataState = 'loading'
      this.rowsProgress = null
      const records = []
      const next = page => new Promise(resolve => {
        apiPostClimateDataTable({
          page,
          limit: PAGE,
          datasetIds,
          filter: [{ column: 'locationId', comparator: 'equals', operator: 'and', values: [locationId] }],
          orderBy: 'recordingDate',
          ascending: 1
        }, result => resolve(result || { data: [], count: 0 }), { codes: [], callback: () => resolve({ data: [], count: 0 }) })
      }).then(result => {
        if (locationId !== this.locationId) {
          return null
        }
        const data = result.data || []
        data.forEach(o => {
          if (o.climateValue === null || o.climateValue === undefined || `${o.climateValue}`.trim() === '') {
            return
          }
          records.push({
            datasetId: o.datasetId,
            climateId: o.climateId,
            day: o.recordingDate ? `${o.recordingDate}`.substring(0, 10) : null,
            raw: o.climateValue,
            value: o.climateDataType === 'numeric' ? parseNumber(o.climateValue) : null,
            countryName: o.countryName || null,
            countryCode2: o.countryCode2 || null
          })
        })
        const total = result.count || 0
        if (total > PAGE) {
          this.rowsProgress = this.$t('pageTraitDetailsStatsLoadingProgress', { loaded: formatNumber(Math.min(total, page * PAGE)), total: formatNumber(total) })
        }
        return data.length === PAGE && page * PAGE < total ? next(page + 1) : records
      })
      next(1).then(all => {
        if (all === null || locationId !== this.locationId) {
          return
        }
        this.records = Object.freeze(all)
        this.dataState = 'loaded'
        this.$nextTick(() => this.draw())
      })
    },
    setView: function (key) {
      this.view = key
      this.$nextTick(() => this.draw())
    },
    getSummaryData: function (request) {
      return this.getTableData(request, this.summaryRows)
    },
    downloadSummary: function (request, callback) {
      const number = value => value === null || value === undefined ? '' : `${Math.round(value * 10000) / 10000}`
      const header = [this.$t('tableColumnClimateName'), this.$t('tableColumnClimateUnitAbbreviation'), this.$t('pageTraitDetailsStatsObservations'), this.$t('pageTraitDetailsStatsMean'), this.$t('pageTraitDetailsStatsMedian'), this.$t('pageTraitDetailsStatsSd'), 'Min', 'Max', this.$t('pageLocationProfilePeriod'), this.$t('pageLocationProfileMissingCount')]
      const lines = [header.join('\t')].concat(this.summaryRows.map(r => [r.name, r.unit || '', r.n, number(r.mean), number(r.median), number(r.sd), number(r.min), number(r.max), r.period, r.missing].join('\t')))
      return this.resolveLater(callback, makeZip([{ name: `${this.getFileName()}-summary.txt`, content: lines.join('\r\n') }]))
    },
    // The variables of the location downloaded: a tab separated file in a zip (the climate type as its key, as in the
    // downloads of the climate data)
    downloadVariables: function (request, callback) {
      const types = { numeric: 'measurement', date: 'event', categorical: 'management', text: 'management' }
      const header = [this.$t('tableColumnClimateName'), 'climate_type', this.$t('pageLocationProfileValues'), this.$t('tableColumnClimateUnitName'), this.$t('tableColumnClimateUnitAbbreviation'), this.$t('pageTraitDetailsStatsObservations'), this.$t('pageLocationProfilePeriod')]
      const lines = [header.join('\t')].concat(this.variableRows.map(v => [v.name, types[v.dataType] || '', v.valuesText.replace(/[\t\r\n]+/g, ' '), v.unitName || '', v.unitAbbreviation || '', v.n, v.period].join('\t')))
      return this.resolveLater(callback, makeZip([{ name: `${this.getFileName()}-variables.txt`, content: lines.join('\r\n') }]))
    },
    // Every value of the location (dataset, date, variable, unit, climate type, value)
    downloadData: function () {
      const types = { numeric: 'measurement', date: 'event', categorical: 'management', text: 'management' }
      const lines = [['location', 'dataset', 'date', 'variable', 'unit', 'climate_type', 'value'].join('\t')].concat(this.records.map(r => {
        const v = this.variableById[r.climateId] || { name: r.climateId, unit: '', dataType: '' }
        return [this.place.name, this.datasetNames[r.datasetId] || r.datasetId, r.day || '', v.name, v.unit || '', types[v.dataType] || '', `${r.raw}`.replace(/[\t\r\n]+/g, ' ')].join('\t')
      }))
      downloadBlob({ blob: new Blob([lines.join('\r\n')], { type: 'text/plain' }), filename: `${this.getFileName()}-${getDateTimeString()}`, extension: 'txt' })
    },
    getFileName: function () {
      return `location-profile-${`${this.place.name}`.replace(/[^\w-]+/g, '_')}-${this.view}`
    },
    // A figure of a row per measurement: its layout (the axes of each row, its title above it)
    rowsLayout: function (extra, sharedX) {
      const theme = this.getTheme()
      const n = this.measurements.length
      const layout = {
        height: this.chartHeight,
        margin: { t: 30, r: 20, b: 40, l: 70 },
        grid: { rows: n, columns: 1, pattern: sharedX ? 'coupled' : 'independent', roworder: 'top to bottom', ygap: 0.35 },
        showlegend: false,
        hovermode: 'closest',
        annotations: []
      }
      this.measurements.forEach((m, i) => {
        const y = i === 0 ? 'yaxis' : `yaxis${i + 1}`
        const x = i === 0 ? 'xaxis' : `xaxis${i + 1}`
        layout[y] = { title: { text: m.unit || '', font: { size: 11, color: theme.muted } }, gridcolor: theme.grid, griddash: 'dot', zeroline: false, tickfont: { color: theme.muted }, fixedrange: true, automargin: true }
        if (!sharedX || i === 0) {
          layout[x] = { gridcolor: theme.grid, tickfont: { color: theme.muted }, fixedrange: true, automargin: true }
        }
        layout.annotations.push({ text: `<b>${m.name}</b>`, xref: 'paper', yref: `${i === 0 ? 'y' : `y${i + 1}`} domain`, x: 0, y: 1, xanchor: 'left', yanchor: 'bottom', yshift: 4, showarrow: false, font: { size: 12, color: theme.text } })
      })
      return this.getLayout(Object.assign(layout, extra || {}))
    },
    // The axes of the row of a measurement: its own y axis; the time or the months shared (one x axis) unless asked not
    axisOf: function (i, sharedX = true) {
      return { x: i === 0 || sharedX ? 'x' : `x${i + 1}`, y: i === 0 ? 'y' : `y${i + 1}` }
    },
    draw: function () {
      if (this.dataState !== 'loaded' || this.measurements.length < 1 || this.view === 'summary') {
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
        } else if (this.view === 'distribution') {
          this.drawDistribution(element)
        } else if (this.view === 'monthly') {
          this.drawMonthly(element)
        } else if (this.view === 'minmax') {
          this.drawMinMax(element)
        } else {
          this.drawMissing(element)
        }
      })
    },
    // Each measurement over time (one time axis): a line per dataset; the events as dashed lines with their names
    drawSeries: function (element) {
      const theme = this.getTheme()
      const data = []
      this.measurements.forEach((m, i) => {
        const axes = this.axisOf(i)
        this.usedDatasets.forEach(d => {
          const points = m.valid.filter(r => r.datasetId === d.datasetId && r.day).sort((a, b) => a.day.localeCompare(b.day))
          if (points.length < 1) {
            return
          }
          data.push({
            type: 'scatter',
            mode: points.length > 60 ? 'lines' : 'lines+markers',
            x: points.map(r => r.day),
            y: points.map(r => r.value),
            xaxis: axes.x,
            yaxis: axes.y,
            name: d.datasetName,
            line: { color: d.color, width: 2 },
            marker: { color: d.color, size: 5 },
            hoverlabel: theme.hoverlabel,
            hovertemplate: `<b>${m.name}</b><br>${d.datasetName}<br>%{x|%Y-%m-%d}: %{y}${m.unit ? ` ${m.unit}` : ''}<extra></extra>`
          })
        })
      })
      const shapes = this.events.map(e => ({ type: 'line', xref: 'x', yref: 'paper', x0: e.day, x1: e.day, y0: 0, y1: 1, line: { color: theme.muted, width: 1, dash: 'dash' } }))
      const layout = this.rowsLayout({ shapes }, true)
      layout.xaxis.type = 'date'
      layout.xaxis.tickformat = '%Y-%m-%d'
      // The names of the events, at the top
      const seen = {}
      this.events.forEach(e => {
        const key = `${e.day}|${e.name}`
        if (seen[key]) {
          return
        }
        seen[key] = true
        layout.annotations.push({ text: e.name, x: e.day, xref: 'x', y: 1, yref: 'paper', yanchor: 'bottom', yshift: 18, textangle: -20, showarrow: false, font: { size: 10, color: theme.muted } })
      })
      layout.margin.t = this.events.length > 0 ? 70 : 30
      Plotly.react(element, data, layout, { displayModeBar: false, responsive: true })
    },
    // The spread of each measurement: a box per dataset, the values as points
    drawDistribution: function (element) {
      const theme = this.getTheme()
      const data = []
      this.measurements.forEach((m, i) => {
        const axes = this.axisOf(i, false)
        this.usedDatasets.forEach(d => {
          const values = m.valid.filter(r => r.datasetId === d.datasetId).map(r => r.value)
          if (values.length < 1) {
            return
          }
          data.push({
            type: 'box',
            x: values,
            y: values.map(() => d.datasetName),
            orientation: 'h',
            xaxis: axes.x,
            yaxis: axes.y,
            name: d.datasetName,
            boxpoints: 'all',
            jitter: 0.4,
            pointpos: 0,
            marker: { color: d.color, size: 4, opacity: 0.6 },
            line: { color: d.color },
            fillcolor: 'rgba(0, 0, 0, 0)',
            hoverlabel: theme.hoverlabel,
            hoverinfo: 'x'
          })
        })
      })
      const layout = this.rowsLayout({}, false)
      Plotly.react(element, data, layout, { displayModeBar: false, responsive: true })
    },
    // The values of a measurement by month of the year: per dataset and year, the mean of each month; then, per month,
    // the mean of those (each year weighs the same)
    monthlyOf: function (m) {
      const groups = {}
      m.valid.filter(r => r.day).forEach(r => {
        const key = `${r.datasetId}|${r.day.substring(0, 7)}`
        ;(groups[key] = groups[key] || []).push(r.value)
      })
      const byMonth = [...Array(12)].map(() => [])
      Object.keys(groups).forEach(key => {
        const month = +key.split('|')[1].substring(5, 7) - 1
        const values = groups[key]
        byMonth[month].push(mean(values))
      })
      return byMonth.map(values => values.length > 0 ? mean(values) : null)
    },
    drawMonthly: function (element) {
      const theme = this.getTheme()
      const color = this.usedDatasets.length > 0 ? this.usedDatasets[0].color : this.typeColor
      const data = this.measurements.map((m, i) => {
        const axes = this.axisOf(i)
        const values = this.monthlyOf(m)
        return {
          type: 'bar',
          x: this.monthNames,
          y: values,
          xaxis: axes.x,
          yaxis: axes.y,
          marker: { color },
          text: values.map(v => v === null ? '' : this.formatValue(v)),
          textposition: 'outside',
          cliponaxis: false,
          hoverlabel: theme.hoverlabel,
          hovertemplate: `<b>${m.name}</b><br>%{x}: %{y}${m.unit ? ` ${m.unit}` : ''}<extra></extra>`
        }
      })
      Plotly.react(element, data, this.rowsLayout({}, true), { displayModeBar: false, responsive: true })
    },
    // Each measurement by month of the year: a bar from its lowest to its highest value, its mean as a point
    drawMinMax: function (element) {
      const theme = this.getTheme()
      const color = this.usedDatasets.length > 0 ? this.usedDatasets[0].color : this.typeColor
      const data = []
      this.measurements.forEach((m, i) => {
        const axes = this.axisOf(i)
        const byMonth = [...Array(12)].map(() => [])
        m.valid.filter(r => r.day).forEach(r => byMonth[+r.day.substring(5, 7) - 1].push(r.value))
        const mins = byMonth.map(v => v.length > 0 ? Math.min(...v) : null)
        const maxs = byMonth.map(v => v.length > 0 ? Math.max(...v) : null)
        const means = byMonth.map(v => v.length > 0 ? mean(v) : null)
        const unit = m.unit ? ` ${m.unit}` : ''
        data.push({
          type: 'bar',
          x: this.monthNames,
          base: mins,
          y: maxs.map((max, k) => max === null ? null : max - mins[k]),
          xaxis: axes.x,
          yaxis: axes.y,
          marker: { color, opacity: 0.35 },
          customdata: mins.map((min, k) => min === null ? ['', ''] : [this.formatValue(min), this.formatValue(maxs[k])]),
          hoverlabel: theme.hoverlabel,
          hovertemplate: `<b>${m.name}</b><br>%{x}: %{customdata[0]} – %{customdata[1]}${unit}<extra></extra>`
        }, {
          type: 'scatter',
          mode: 'markers',
          x: this.monthNames,
          y: means,
          xaxis: axes.x,
          yaxis: axes.y,
          marker: { color, size: 8, symbol: 'diamond' },
          hoverlabel: theme.hoverlabel,
          hovertemplate: `<b>${m.name}</b><br>%{x} · ${this.$t('pageLocationProfileMean')}: %{y}${unit}<extra></extra>`
        })
      })
      Plotly.react(element, data, this.rowsLayout({ barmode: 'overlay' }, true), { displayModeBar: false, responsive: true })
    },
    // A row per measurement, a column per month: the share of the recording dates of the location with a value
    drawMissing: function (element) {
      const theme = this.getTheme()
      const months = [...new Set(this.measurements.flatMap(m => Object.keys(m.missing.byMonth)))].sort()
      const rows = this.measurements.slice().reverse()
      const z = rows.map(m => months.map(month => {
        const cell = m.missing.byMonth[month]
        return cell && cell.expected > 0 ? cell.present / cell.expected : null
      }))
      const text = rows.map(m => months.map(month => {
        const cell = m.missing.byMonth[month]
        return cell ? `${formatNumber(cell.present)} / ${formatNumber(cell.expected)}` : ''
      }))
      Plotly.react(element, [{
        type: 'heatmap',
        x: months,
        y: rows.map(m => m.unit ? `${m.name} (${m.unit})` : m.name),
        z,
        text,
        texttemplate: months.length <= 24 ? '%{text}' : '',
        zmin: 0,
        zmax: 1,
        xgap: 2,
        ygap: 2,
        colorscale: getGradientScale(),
        colorbar: { tickformat: '.0%', tickfont: { color: theme.muted }, thickness: 12, len: 0.9 },
        hoverongaps: false,
        hoverlabel: theme.hoverlabel,
        hovertemplate: '<b>%{y}</b><br>%{x}: %{text}<extra></extra>'
      }], this.getLayout({
        height: this.chartHeight,
        margin: { t: 10, r: 20, b: 60, l: 20 },
        xaxis: { type: 'category', tickfont: { color: theme.muted }, automargin: true, fixedrange: true },
        yaxis: { tickfont: { color: theme.text }, automargin: true, fixedrange: true }
      }), { displayModeBar: false, responsive: true })
    }
  },
  mounted: function () {
    this.loadLocations()
  }
}
</script>

<style src="@/assets/trait-stats.css"></style>
<style scoped src="@/assets/variable-stats.css"></style>
<style scoped src="@/assets/trait-comparison.css"></style>
<style scoped>
.lpr-head-icon {
  color: var(--stc-type-color);
  font-size: 1.4rem;
}
.lpr-none {
  padding: 0 1.25rem 1.25rem;
}
/* The subtitle of the block: short and smaller */
.lpr .stc-text {
  font-size: 0.8rem;
}
/* The place: a band of its own (a shadow at its bottom), its flag, name and country on the left, its coordinates and
   elevation on the right */
.lpr-place {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1.5rem;
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid var(--cp-border);
  box-shadow: 0 6px 8px -6px rgba(0, 0, 0, 0.18);
}
/* The highlights and the views: the options of the chart are placed in it (at the right of the highlights) */
.lpr-stats {
  position: relative;
}
/* The space under the band inside the cells of the highlights (their lines between them go up to the band) */
.lpr-stats .tvs-number {
  padding-top: 1.4rem;
}
.lpr-stats .tvs-base >>> .text-right:not(td):not(th) {
  height: 98px;
}
.lpr-place-main {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 0.6rem;
  min-width: 0;
}
.lpr-place-flag {
  align-self: center;
  font-size: 1.1rem;
}
.lpr-place-name {
  color: var(--cp-text);
  font-size: 1.1rem;
  font-weight: 600;
}
/* The band opens and closes the map */
.lpr-place-clickable {
  cursor: pointer;
}
.lpr-place-clickable:focus-visible {
  outline: 2px solid var(--cp-green);
  outline-offset: -2px;
}
/* The map: under the band, the whole width of the block, low */
.lpr-map {
  border-bottom: 1px solid var(--cp-border);
}
.lpr-map >>> .location-map {
  height: 280px !important;
}
.lpr-place-country {
  color: var(--cp-muted);
  font-size: 0.8rem;
}
.lpr-place-facts {
  display: flex;
  gap: 1.75rem;
  margin: 0;
}
.lpr-place-fact {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.lpr-place-fact dt {
  color: var(--cp-muted);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.lpr-place-fact dd {
  margin: 0;
  color: var(--cp-text);
  font-size: 0.9rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
/* The highlights: the icon of the variable before its value; how the number was made below */
.lpr-number-icon {
  margin-right: 0.45rem;
  color: var(--cp-text);
  font-size: 0.9em;
}
.lpr-number-kind {
  color: var(--cp-muted);
  font-size: 0.65rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
/* The table of the variables */
.lpr-variables {
  padding: 0 1.25rem 1rem;
}
.lpr-variables >>> .lpr-variable-icon {
  width: 1.1rem;
  margin-right: 0.35rem;
  color: var(--cp-text);
  text-align: center;
}
.lpr-views-wrap {
  margin-bottom: 0.25rem;
}
.lpr-views-wrap >>> .lpr-view-icon {
  width: 1.05em;
  height: 1.05em;
  fill: currentColor;
}
/* The hint of the view: one short line, centred under the views */
.lpr-view-text {
  margin: 0.15rem 0 0.75rem;
  color: var(--cp-muted);
  font-size: 0.78rem;
  text-align: center;
}
</style>
