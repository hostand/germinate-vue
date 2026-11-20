<template>
  <!-- Single trait comparison (the Comparison tab of the trials and climate exports): one numeric trait (variable)
       across the chosen datasets, in a block: its head (the icon of the export, the title, what can be chosen) with the
       trait to compare on its right (a searchable list: name (unit) and the number of its datasets). A trait is the same
       in two datasets when its name, its data type and its unit (abbreviation, else name; case and spaces ignored) are
       the same, whatever its id; only numeric traits found so are offered (the others are left out, silently).
       The trait chosen: every observation of it (in pages; very many: once confirmed), the values that are not numbers
       left out (counted). The groups compared: the datasets, or (the climate data compared by location) the chosen
       locations. The numbers on a strip with the options (downloads) and the help at its right end; then the
       distribution by group (a box each, its observations as points), the other side across the groups (by dataset: the
       locations or germplasm across the datasets; by location: the datasets across the locations), by location the
       monthly means of each location, and the summary by group (a read-only table, downloadable). The climate data: the
       resolution of the data of each group (by the spacing of its dates), a warning when the datasets compared share no
       location (their differences mix place and period), by location the choice of the dates all the locations have. -->
  <section class="stc">
    <header class="stc-head">
      <!-- The climate data: the icon of the chosen variable (by its name) when it has one, else that of the climate -->
      <span class="stc-icon" :style="{ '--stc-type-color': typeColor }" aria-hidden="true">
        <i :class="[variableIcon, 'stc-icon-fa']" v-if="variableIcon" />
        <MdiIcon :path="isClimate ? climatePath : mdiShovel" v-else />
      </span>
      <div class="stc-heading">
        <h3 class="stc-title">{{ vk('pageComparisonSingleTraitChoose') }}</h3>
        <!-- The climate data: the chosen variable instead of the text -->
        <p class="stc-text stc-chosen" v-if="isClimate && selected">{{ selected.name }}<span class="stc-chosen-unit" v-if="unit"> ({{ unit }})</span></p>
        <p class="stc-text" v-else>{{ vk('pageComparisonSingleTraitChooseText') }}</p>
      </div>
      <div class="stc-select">
        <GermplasmFilterSelect id="stc-trait"
                               :options="traitOptions"
                               :value="selectedKey"
                               :placeholder="vk('pageComparisonSingleTraitPlaceholder')"
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
        <p><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ $t('pageComparisonSingleTraitLarge', { count: formatNumber(rowsTotal) }) }}</p>
        <button type="button" class="tvs-values-link" @click="loadRows"><i class="fa-solid fa-download" aria-hidden="true" /> {{ $t('pageTraitDetailsStatsLoadObservations') }}</button>
      </div>
      <p class="tvs-empty" v-else-if="rowsState === 'loaded' && usedGroups.length < 2 && !(isByLocation && commonPeriod)">{{ isByLocation ? $t('pageComparisonClimateTooFewLocations') : vk('pageComparisonSingleTraitTooFew') }}</p>
      <template v-else-if="rowsState === 'loaded'">
        <!-- The numbers -->
        <div class="tvs-numbers">
          <div :class="['tvs-number', { 'is-danger': number.danger }]" v-for="number in numbers" :key="`stc-number-${number.key}`" :data-tour-number="number.key">
            <span class="tvs-number-value">{{ number.value }}</span>
            <span class="tvs-number-label">{{ number.label }}</span>
          </div>
        </div>
        <!-- The climate data by dataset: the datasets share no location (their differences mix place and period) -->
        <p class="stc-warning" v-if="isClimate && !isByLocation && commonGermplasm.length < 1">
          <i class="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {{ $t('pageComparisonClimateNoSharedLocations') }}
        </p>
        <!-- By location: only the dates all the locations have -->
        <label class="stc-option" v-if="isByLocation">
          <input type="checkbox" v-model="commonPeriod" @change="redraw" />
          {{ $t('pageComparisonClimateCommonPeriod') }} <span class="stc-option-count">{{ formatNumber(commonDays.size) }}</span>
        </label>
        <p class="tvs-empty" v-if="isByLocation && commonPeriod && usedGroups.length < 2">{{ $t('pageComparisonClimateNoCommonPeriod') }}</p>
        <!-- The options (downloads, colours) and the help, at the right end of the strip -->
        <BaseChart :width="() => 1280"
                   :height="() => CHART_HEIGHT"
                   :supportsPngDownload="false"
                   :supportsSvgDownload="false"
                   :canChangeColors="false"
                   customLook
                   class="tvs-base"
                   ref="baseChart"
                   v-on:force-redraw="draw"
                   v-show="usedGroups.length > 1">
          <template slot="additionalMenuItems">
            <b-dropdown-header>{{ byTitle }}</b-dropdown-header>
            <b-dropdown-item link-class="top-nav-menu-item" @click="downloadChart('boxChart', 'png')"><i class="fa-solid fa-image fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadPng') }}</b-dropdown-item>
            <b-dropdown-item link-class="top-nav-menu-item" @click="downloadChart('boxChart', 'svg')"><i class="fa-solid fa-file-code fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadSvg') }}</b-dropdown-item>
            <template v-if="acrossLines.length > 0">
              <b-dropdown-header>{{ acrossTitle }}</b-dropdown-header>
              <b-dropdown-item link-class="top-nav-menu-item" @click="downloadChart('acrossChart', 'png')"><i class="fa-solid fa-image fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadPng') }}</b-dropdown-item>
              <b-dropdown-item link-class="top-nav-menu-item" @click="downloadChart('acrossChart', 'svg')"><i class="fa-solid fa-file-code fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadSvg') }}</b-dropdown-item>
            </template>
            <template v-if="isByLocation">
              <b-dropdown-header>{{ $t('pageComparisonClimateMonthly') }}</b-dropdown-header>
              <b-dropdown-item link-class="top-nav-menu-item" @click="downloadChart('monthlyChart', 'png')"><i class="fa-solid fa-image fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadPng') }}</b-dropdown-item>
              <b-dropdown-item link-class="top-nav-menu-item" @click="downloadChart('monthlyChart', 'svg')"><i class="fa-solid fa-file-code fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadSvg') }}</b-dropdown-item>
            </template>
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
            <!-- A box per group -->
            <h4 class="stc-chart-title" data-tour="box">{{ byTitle }}</h4>
            <div class="stc-chart" ref="boxChart" />

            <!-- The other side across the groups -->
            <h4 class="stc-chart-title" data-tour="across">{{ acrossTitle }}</h4>
            <p class="tvs-empty" v-if="acrossLines.length < 1">{{ isByLocation ? $t('pageComparisonClimateNoCommonDatasets') : vk('pageComparisonSingleTraitNoCommon') }}</p>
            <div class="stc-chart" ref="acrossChart" v-else />

            <!-- By location: the monthly means of each location -->
            <template v-if="isByLocation">
              <h4 class="stc-chart-title" data-tour="monthly">{{ $t('pageComparisonClimateMonthly') }}</h4>
              <div class="stc-chart" ref="monthlyChart" />
            </template>
          </div>
        </BaseChart>
        <!-- The numbers of each group: a read-only table (its tools shown, inactive), downloadable -->
        <div class="stc-summary-wrap" v-show="usedGroups.length > 1">
          <h4 class="stc-chart-title" data-tour="summary">{{ $t('pageComparisonSingleTraitSummary') }}</h4>
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
                       :key="`stc-summary-${selectedKey}-${compareBy}-${commonPeriod}`">
              <template v-slot:cell(name)="data">
                <span class="stc-swatch" :style="{ background: getGroupColor(data.item.id) }" />{{ data.item.name }}
              </template>
            </BaseTable>
          </div>
        </div>
      </template>
    </div>

    <!-- Tour explaining the numbers, the charts, the table and the options -->
    <Tour :steps="tourSteps" modernLook ref="tour" />
  </section>
</template>

<script>
import BaseChart from '@/components/charts/BaseChart'
import BaseTable from '@/components/tables/BaseTable'
import GermplasmFilterSelect from '@/components/tables/GermplasmFilterSelect'
import MdiIcon from '@/components/icons/MdiIcon'
import ClimateLocationChips from '@/components/export/ClimateLocationChips'
import Tour from '@/components/util/Tour'
import traitComparison, { getNumericComparable } from '@/mixins/trait-comparison'
import { formatNumber, getDateTimeString } from '@/mixins/formatting'
import { downloadBlob } from '@/mixins/util'
import { makeZip } from '@/mixins/zip'
import { quantile, mean } from '@/mixins/stats-math'
import { mdiShovel } from '@mdi/js'
import { datasetTypes } from '@/mixins/types'
import { getVariableIcon } from '@/mixins/climate-icons'

const Plotly = require('plotly.js/lib/core')
Plotly.register([
  require('plotly.js/lib/box'),
  require('plotly.js/lib/scatter')
])

// Above POINTS_MAX observations: boxes only
const POINTS_MAX = 2500
// The lines across the groups: above this many, the most variable ones only
const ACROSS_MAX = 60
const DAY = 86400000

// A value of the data as a number (also with a decimal comma); null when not a number
const parseNumber = value => {
  const text = `${value === null || value === undefined ? '' : value}`.trim().replace(/^(-?\d+),(\d+)$/, '$1.$2')
  return text !== '' && isFinite(text) ? +text : null
}
// The resolution of dates (YYYY-MM-DD) by their spacing (the median of the days between them): a key of the locale
const resolutionOf = days => {
  const sorted = [...new Set(days.filter(d => d))].sort()
  if (sorted.length < 2) {
    return 'climateResolutionSingle'
  }
  const gaps = []
  for (let i = 1; i < sorted.length; i++) {
    gaps.push((Date.parse(sorted[i]) - Date.parse(sorted[i - 1])) / DAY)
  }
  gaps.sort((a, b) => a - b)
  const gap = quantile(gaps, 0.5)
  return gap <= 1.5 ? 'climateResolutionDaily' : (gap <= 8 ? 'climateResolutionWeekly' : (gap <= 35 ? 'climateResolutionMonthly' : 'climateResolutionIrregular'))
}

export default {
  components: {
    BaseChart,
    BaseTable,
    GermplasmFilterSelect,
    ClimateLocationChips,
    MdiIcon,
    Tour
  },
  // The traits of the datasets, the trait chosen, its observations, the theme and the downloads
  mixins: [traitComparison],
  props: {
    // By location: the chosen locations ({ locationId, locationName, countryCode2, countryCode3 }), their chips
    chosenLocations: {
      type: Array,
      default: () => []
    }
  },
  data: function () {
    return {
      mdiShovel,
      // The icon of the climate data (its type)
      climatePath: datasetTypes.climate.path,
      // By location: only the dates all the compared locations have
      commonPeriod: false,
      summaryOptions: {
        idColumn: 'id',
        tableName: 'comparisonSummary'
      }
    }
  },
  computed: {
    // The numeric traits with the same name, data type and unit (their ids may differ) in two datasets or more; by
    // location, those in the datasets of two of the chosen locations or more (their locations: those chosen with one of
    // its datasets)
    comparable: function () {
      if (!this.isByLocation) {
        return getNumericComparable(this.datasets, this.traitsByDataset)
      }
      return getNumericComparable(this.datasets, this.traitsByDataset, 1)
        .map(o => Object.assign({}, o, { locationIds: this.chosenLocations.filter(l => l.datasetIds.some(id => o.datasetIds.includes(id))).map(l => l.locationId) }))
        .filter(o => o.locationIds.length > 1)
    },
    // The list of the traits: "name (unit)" and the number of its datasets (by location: of its chosen locations)
    traitOptions: function () {
      return this.comparable.map(o => ({ value: o.key, name: o.unitLabel ? `${o.name} (${o.unitLabel})` : o.name, count: this.isByLocation ? o.locationIds.length : o.datasetIds.length }))
    },
    unit: function () {
      return this.selected ? this.selected.unitLabel : ''
    },
    // The climate data: the icon of the chosen variable by its name (none: the icon of the climate)
    variableIcon: function () {
      return this.isClimate && this.selected ? getVariableIcon(this.selected.name) : null
    },
    // By location: the dates with a number at every chosen location with numbers
    commonDays: function () {
      if (!this.isByLocation) {
        return new Set()
      }
      const byLocation = {}
      this.rows.filter(r => r.value !== null && r.day).forEach(r => {
        (byLocation[r.germplasmId] = byLocation[r.germplasmId] || new Set()).add(r.day)
      })
      const sets = Object.values(byLocation)
      if (sets.length < 2) {
        return new Set()
      }
      return new Set([...sets[0]].filter(day => sets.every(set => set.has(day))))
    },
    // The observations compared (by location with the common period: those of its dates)
    usedRows: function () {
      return this.isByLocation && this.commonPeriod ? this.rows.filter(r => r.day && this.commonDays.has(r.day)) : this.rows
    },
    // The groups compared: the datasets, or the chosen locations; their numbers (their values that are numbers), their
    // values that are not, their resolution (the climate data)
    groups: function () {
      if (!this.selected) {
        return []
      }
      const groups = this.isByLocation
        ? (this.locationIds || []).map(id => ({ id, rows: this.usedRows.filter(r => r.germplasmId === id) }))
        : this.selected.datasetIds.map(id => ({ id, rows: this.usedRows.filter(r => r.datasetId === id) }))
      // A colour each, all different
      const colors = this.getDistinctColors(groups.length)
      return groups.map((g, index) => {
        const values = g.rows.filter(r => r.value !== null).map(r => r.value).sort((a, b) => a - b)
        const n = values.length
        const m = n > 0 ? mean(values) : null
        const sd = n > 1 ? Math.sqrt(values.reduce((sum, x) => sum + (x - m) * (x - m), 0) / (n - 1)) : null
        const valid = g.rows.filter(r => r.value !== null)
        const first = this.rows.find(r => r.germplasmId === g.id)
        // The resolution of its data: of each of its datasets (their dates at each location)
        const resolutions = []
        if (this.isClimate) {
          const byDatasetLocation = {}
          valid.forEach(r => { (byDatasetLocation[`${r.datasetId}|${r.germplasmId}`] = byDatasetLocation[`${r.datasetId}|${r.germplasmId}`] || []).push(r.day) })
          Object.values(byDatasetLocation).forEach(days => {
            const key = resolutionOf(days)
            if (!resolutions.includes(key)) {
              resolutions.push(key)
            }
          })
        }
        return {
          id: g.id,
          name: this.isByLocation ? (first ? `${first.germplasmName}` : `${g.id}`) : (this.datasetNames[g.id] || `${g.id}`),
          color: colors[index],
          values,
          n,
          invalid: g.rows.length - n,
          // By dataset: its locations (germplasm); by location: its datasets
          germplasm: new Set(valid.map(r => r.germplasmId)).size,
          datasetCount: new Set(valid.map(r => r.datasetId)).size,
          resolution: resolutions.map(key => this.$t(key)).join(', '),
          mean: m,
          median: n > 0 ? quantile(values, 0.5) : null,
          sd,
          cv: sd !== null && m ? sd / Math.abs(m) * 100 : null,
          min: n > 0 ? values[0] : null,
          max: n > 0 ? values[n - 1] : null
        }
      })
    },
    // The groups compared: with two numbers or more
    usedGroups: function () {
      return this.groups.filter(g => g.n > 1)
    },
    // By dataset: the germplasm (locations) with numbers in two of the compared datasets or more, its mean in each
    commonGermplasm: function () {
      if (this.isByLocation) {
        return []
      }
      const used = new Set(this.usedGroups.map(g => g.id))
      const byGermplasm = {}
      this.usedRows.filter(r => r.value !== null && used.has(r.datasetId)).forEach(r => {
        const g = byGermplasm[r.germplasmId] = byGermplasm[r.germplasmId] || { id: r.germplasmId, name: r.germplasmName, values: {} }
        ;(g.values[r.datasetId] = g.values[r.datasetId] || []).push(r.value)
      })
      return this.withMeans(Object.values(byGermplasm))
    },
    // By location: the datasets with numbers at two of the compared locations or more, their mean at each
    commonDatasets: function () {
      if (!this.isByLocation) {
        return []
      }
      const used = new Set(this.usedGroups.map(g => g.id))
      const byDataset = {}
      this.usedRows.filter(r => r.value !== null && used.has(r.germplasmId)).forEach(r => {
        const d = byDataset[r.datasetId] = byDataset[r.datasetId] || { id: r.datasetId, name: this.datasetNames[r.datasetId] || `${r.datasetId}`, values: {} }
        ;(d.values[r.germplasmId] = d.values[r.germplasmId] || []).push(r.value)
      })
      return this.withMeans(Object.values(byDataset))
    },
    // The lines across the groups
    acrossLines: function () {
      return this.isByLocation ? this.commonDatasets : this.commonGermplasm
    },
    byTitle: function () {
      return this.isByLocation ? this.$t('pageComparisonClimateByLocation') : this.$t('pageComparisonSingleTraitByDataset')
    },
    acrossTitle: function () {
      return this.isByLocation ? this.$t('pageComparisonClimateAcrossLocations') : this.vk('pageComparisonSingleTraitAcross')
    },
    pointsHidden: function () {
      return this.usedGroups.reduce((sum, g) => sum + g.n, 0) > POINTS_MAX
    },
    numbers: function () {
      const observations = this.usedGroups.reduce((sum, g) => sum + g.n, 0)
      const invalid = this.groups.reduce((sum, g) => sum + g.invalid, 0)
      const numbers = this.isByLocation
        ? [{
            key: 'locations',
            value: `${formatNumber(this.usedGroups.length)} / ${formatNumber(this.groups.length)}`,
            label: this.$t('pageComparisonClimateLocationsCompared')
          }, {
            key: 'datasets',
            value: formatNumber(new Set(this.usedRows.filter(r => r.value !== null).map(r => r.datasetId)).size),
            label: this.$t('pageDatasetsTitle')
          }]
        : [{
            key: 'datasets',
            value: `${formatNumber(this.usedGroups.length)} / ${formatNumber(this.groups.length)}`,
            label: this.$t('pageComparisonSingleTraitDatasetsCompared')
          }, {
            key: 'germplasm',
            value: formatNumber(this.commonGermplasm.length),
            label: this.vk('pageComparisonSingleTraitCommonGermplasm')
          }]
      numbers.push({
        key: 'observations',
        value: formatNumber(observations),
        label: this.$t('pageTraitDetailsStatsObservations')
      })
      if (invalid > 0) {
        numbers.push({ key: 'invalid', danger: true, value: formatNumber(invalid), label: this.$t('pageTraitDetailsStatsNotNumbers') })
      }
      return numbers
    },
    summaryColumns: function () {
      const number = (key, label, formatter) => ({ key, type: Number, sortable: false, class: 'text-right', label, formatter })
      const columns = [{
        key: 'name',
        type: String,
        sortable: false,
        label: this.isByLocation ? this.$t('tableColumnLocationName') : this.$t('tableColumnDatasetName')
      },
      number('n', this.$t('pageTraitDetailsStatsObservations'), value => formatNumber(value)),
      this.isByLocation
        ? number('datasetCount', this.$t('pageDatasetsTitle'), value => formatNumber(value))
        : number('germplasm', this.vk('pageComparisonSingleTraitGermplasm'), value => formatNumber(value)),
      number('mean', this.$t('pageTraitDetailsStatsMean'), value => this.formatUnit(value)),
      number('median', this.$t('pageTraitDetailsStatsMedian'), value => this.formatUnit(value)),
      number('sd', this.$t('pageTraitDetailsStatsSd'), value => this.formatUnit(value)),
      number('cv', this.$t('pageTraitDetailsStatsCv'), value => value === null ? '–' : `${this.formatFixed(value, 1)} %`),
      number('min', this.$t('pageTraitDetailsStatsMinMax'), (value, key, item) => item.n > 0 ? `${this.formatValue(item.min)} – ${this.formatUnit(item.max)}` : '–')]
      // The climate data: the resolution of the data of each group
      if (this.isClimate) {
        columns.push({ key: 'resolution', type: String, sortable: false, label: this.$t('pageComparisonClimateResolution') })
      }
      columns.push(number('invalid', this.$t('pageTraitDetailsStatsNotNumbers'), value => formatNumber(value)))
      return columns
    },
    // The help: the numbers, the charts, the table, the options
    tourSteps: function () {
      const target = selector => () => `#${this.id} ${selector}`
      const texts = {
        datasets: this.isByLocation ? this.$t('pageComparisonClimateTourDatasetsAtLocations') : this.vk('pageComparisonTourDatasets'),
        locations: this.$t('pageComparisonClimateTourLocationsCompared'),
        germplasm: this.vk('pageComparisonTourGermplasm'),
        observations: this.vk('pageComparisonTourObservations'),
        invalid: this.vk('pageComparisonTourInvalid')
      }
      const steps = this.numbers.map(number => ({
        title: () => number.label,
        text: () => texts[number.key],
        target: target(`[data-tour-number="${number.key}"]`),
        position: 'bottom'
      }))
      const charts = [{
        title: () => this.byTitle,
        text: () => this.isByLocation ? this.$t('pageComparisonClimateTourByLocation') : this.vk('pageComparisonTourByDataset'),
        target: target('[data-tour="box"]'),
        position: 'top'
      }, {
        title: () => this.acrossTitle,
        text: () => this.isByLocation ? this.$t('pageComparisonClimateTourAcrossLocations') : this.vk('pageComparisonTourAcross'),
        target: target('[data-tour="across"]'),
        position: 'top'
      }]
      if (this.isByLocation) {
        charts.push({
          title: () => this.$t('pageComparisonClimateMonthly'),
          text: () => this.$t('pageComparisonClimateTourMonthly'),
          target: target('[data-tour="monthly"]'),
          position: 'top'
        })
      }
      return steps.concat(charts).concat([{
        title: () => this.$t('pageComparisonSingleTraitSummary'),
        text: () => this.isByLocation ? this.$t('pageComparisonClimateTourSummaryLocations') : this.vk('pageComparisonTourSummary'),
        target: target('[data-tour="summary"]'),
        position: 'top'
      }, {
        title: () => this.$t('popoverChartTourGenericOptionsTitle'),
        text: () => this.$t('pageComparisonTourOptions'),
        target: target('#additional-options'),
        position: 'bottom'
      }])
    }
  },
  watch: {
    // The trait chosen no longer in two of the chosen locations: none
    chosenLocations: function () {
      if (this.isByLocation && this.selectedKey !== null && !this.comparable.some(o => o.key === this.selectedKey)) {
        this.clearTrait()
      }
    },
    // Another way of comparing: the list of the traits changes (the trait chosen kept when it is still there)
    compareBy: function () {
      this.commonPeriod = false
      if (this.selectedKey !== null && this.comparable.some(o => o.key === this.selectedKey)) {
        this.rows = []
        this.prepareRows()
      } else {
        this.clearTrait()
      }
    }
  },
  methods: {
    // Lines across the groups (in two of them or more): their mean in each, their spread
    withMeans: function (lines) {
      return lines.filter(l => Object.keys(l.values).length > 1).map(l => {
        const means = {}
        Object.keys(l.values).forEach(id => { means[id] = mean(l.values[id]) })
        const list = Object.values(means)
        return Object.assign(l, { means, spread: Math.max(...list) - Math.min(...list) })
      })
    },
    // The colour of a group now (the table keeps its rows: the colours changed, the swatches follow)
    getGroupColor: function (id) {
      const group = this.groups.find(g => g.id === id)
      return group ? group.color : null
    },
    formatUnit: function (value) {
      const text = this.formatValue(value)
      return this.unit && text !== '–' ? `${text} ${this.unit}` : text
    },
    // An observation: its dataset, germplasm (location), day, rep and block, value (a number, or null when it is not)
    toRow: function (o) {
      return { datasetId: o.datasetId, germplasmId: o.germplasmId, germplasmName: o.germplasmName, day: o.recordingDate || null, rep: o.rep, block: o.block, raw: o.traitValue, value: parseNumber(o.traitValue) }
    },
    // The summary table: its rows
    getSummaryData: function (request) {
      return this.getTableData(request, this.groups.map(g => Object.assign({}, g, { values: undefined })))
    },
    // The summary table downloaded: its numbers as a tab separated file in a zip
    downloadSummary: function (request, callback) {
      const header = [this.isByLocation ? this.$t('tableColumnLocationName') : this.$t('tableColumnDatasetName'), this.$t('pageTraitDetailsStatsObservations'), this.isByLocation ? this.$t('pageDatasetsTitle') : this.vk('pageComparisonSingleTraitGermplasm'), this.$t('pageTraitDetailsStatsMean'), this.$t('pageTraitDetailsStatsMedian'), this.$t('pageTraitDetailsStatsSd'), `${this.$t('pageTraitDetailsStatsCv')} (%)`, 'Min', 'Max']
      if (this.isClimate) {
        header.push(this.$t('pageComparisonClimateResolution'))
      }
      header.push(this.$t('pageTraitDetailsStatsNotNumbers'))
      const number = value => value === null || value === undefined ? '' : `${Math.round(value * 10000) / 10000}`
      const lines = [header.join('\t')].concat(this.groups.map(g => {
        const line = [g.name, g.n, this.isByLocation ? g.datasetCount : g.germplasm, number(g.mean), number(g.median), number(g.sd), number(g.cv), number(g.min), number(g.max)]
        if (this.isClimate) {
          line.push(g.resolution)
        }
        line.push(g.invalid)
        return line.join('\t')
      }))
      const zip = makeZip([{ name: `${this.getFileName()}-summary.txt`, content: lines.join('\r\n') }])
      return this.resolveLater(callback, zip)
    },
    // The observations of the comparison (dataset, germplasm, rep, block or, the climate data, location and date; value
    // as written, number or not)
    downloadData: function () {
      const header = this.isClimate ? ['dataset', 'location', 'date', 'value', 'numeric'] : ['dataset', 'germplasm', 'rep', 'block', 'value', 'numeric']
      const lines = [header.join('\t')].concat(this.usedRows.map(r => {
        const unit = this.isClimate ? [r.germplasmName, r.day || ''] : [r.germplasmName, r.rep || '', r.block || '']
        return [this.datasetNames[r.datasetId] || r.datasetId].concat(unit, [`${r.raw}`.replace(/[\t\r\n]+/g, ' '), r.value === null ? 'no' : 'yes']).join('\t')
      }))
      downloadBlob({ blob: new Blob([lines.join('\r\n')], { type: 'text/plain' }), filename: `${this.getFileName()}-${getDateTimeString()}`, extension: 'txt' })
    },
    getFileName: function () {
      return `comparison-${this.isByLocation ? 'by-location-' : ''}${this.selected ? this.selected.name.replace(/[^\w-]+/g, '_') : 'trait'}`
    },
    // The common period switched: the charts drawn again (the table follows its key)
    redraw: function () {
      this.$nextTick(() => this.draw())
    },
    draw: function () {
      if (this.rowsState !== 'loaded' || this.usedGroups.length < 2) {
        return
      }
      this.$nextTick(() => {
        this.drawBoxes()
        this.drawAcross()
        if (this.isByLocation) {
          this.drawMonthly()
        }
      })
    },
    axisTitle: function () {
      return this.selected ? `${this.selected.name}${this.unit ? ` (${this.unit})` : ''}` : ''
    },
    // A box per group (its observations as points when not too many) and its mean
    drawBoxes: function () {
      const element = this.$refs.boxChart
      if (!element) {
        return
      }
      const theme = this.getTheme()
      const data = this.usedGroups.map(g => ({
        type: 'box',
        name: g.name,
        y: g.values,
        boxmean: true,
        boxpoints: this.pointsHidden ? 'outliers' : 'all',
        jitter: 0.4,
        pointpos: 0,
        marker: { color: g.color, size: 5, opacity: 0.55 },
        line: { color: g.color },
        fillcolor: 'rgba(0, 0, 0, 0)',
        hoverlabel: theme.hoverlabel,
        hoverinfo: 'y+name'
      }))
      Plotly.react(element, data, this.getLayout({
        showlegend: false,
        xaxis: { tickfont: { color: theme.text }, automargin: true },
        yaxis: { title: { text: this.axisTitle(), font: { color: theme.muted } }, gridcolor: theme.grid, zeroline: false, tickfont: { color: theme.muted } }
      }), { displayModeBar: false, responsive: true })
    },
    // The lines across the groups: each its mean in each group, the groups in the order of their mean (many lines: the
    // most variable ones); the mean of each group as a dashed line
    drawAcross: function () {
      const element = this.$refs.acrossChart
      if (!element) {
        return
      }
      const theme = this.getTheme()
      const unit = this.unit ? ` ${this.unit}` : ''
      const order = this.usedGroups.slice().sort((a, b) => a.mean - b.mean)
      const lines = this.acrossLines.slice().sort((a, b) => b.spread - a.spread).slice(0, ACROSS_MAX)
      const colors = this.getDistinctColors(lines.length)
      const data = lines.map((l, index) => {
        const points = order.filter(g => l.means[g.id] !== undefined)
        return {
          type: 'scatter',
          mode: 'lines+markers',
          name: `${l.name}`,
          x: points.map(g => g.name),
          y: points.map(g => l.means[g.id]),
          line: { color: colors[index], width: 1.5 },
          marker: { size: 6 },
          opacity: 0.85,
          hoverlabel: theme.hoverlabel,
          hovertemplate: `<b>${l.name}</b><br>%{x}<br>%{y:.2f}${unit}<extra></extra>`
        }
      })
      data.push({
        type: 'scatter',
        mode: 'lines+markers',
        name: this.$t('pageTraitDetailsStatsMean'),
        x: order.map(g => g.name),
        y: order.map(g => g.mean),
        line: { color: theme.text, width: 3, dash: 'dash' },
        marker: { size: 8, color: theme.text },
        hoverlabel: theme.hoverlabel,
        hovertemplate: `<b>${this.$t('pageTraitDetailsStatsMean')}</b><br>%{x}<br>%{y:.2f}${unit}<extra></extra>`
      })
      Plotly.react(element, data, this.getLayout({
        showlegend: true,
        legend: { font: { color: theme.text } },
        xaxis: { type: 'category', tickfont: { color: theme.text }, automargin: true },
        yaxis: { title: { text: this.axisTitle(), font: { color: theme.muted } }, gridcolor: theme.grid, zeroline: false, tickfont: { color: theme.muted } }
      }), { displayModeBar: false, responsive: true })
    },
    // By location: a line per location over the months of the year (the mean of the month in each dataset and year,
    // then the mean of those: each year weighs the same)
    drawMonthly: function () {
      const element = this.$refs.monthlyChart
      if (!element) {
        return
      }
      const theme = this.getTheme()
      const unit = this.unit ? ` ${this.unit}` : ''
      const months = [...Array(12).keys()].map(m => new Date(Date.UTC(2000, m, 15)).toLocaleDateString(this.locale, { month: 'short', timeZone: 'UTC' }))
      const data = this.usedGroups.map(g => {
        const byMonth = {}
        this.usedRows.filter(r => r.germplasmId === g.id && r.value !== null && r.day).forEach(r => {
          (byMonth[`${r.datasetId}|${r.day.substring(0, 7)}`] = byMonth[`${r.datasetId}|${r.day.substring(0, 7)}`] || []).push(r.value)
        })
        const perMonth = [...Array(12)].map(() => [])
        Object.keys(byMonth).forEach(key => perMonth[+key.substring(key.length - 2) - 1].push(mean(byMonth[key])))
        return {
          type: 'scatter',
          mode: 'lines+markers',
          name: g.name,
          x: months,
          y: perMonth.map(values => values.length > 0 ? mean(values) : null),
          connectgaps: false,
          line: { color: g.color, width: 2 },
          marker: { color: g.color, size: 6 },
          hoverlabel: theme.hoverlabel,
          hovertemplate: `<b>${g.name}</b><br>%{x}: %{y:.2f}${unit}<extra></extra>`
        }
      })
      Plotly.react(element, data, this.getLayout({
        showlegend: true,
        legend: { font: { color: theme.text } },
        xaxis: { type: 'category', tickfont: { color: theme.text }, automargin: true },
        yaxis: { title: { text: this.axisTitle(), font: { color: theme.muted } }, gridcolor: theme.grid, zeroline: false, tickfont: { color: theme.muted } }
      }), { displayModeBar: false, responsive: true })
    }
  }
}
</script>

<style scoped src="@/assets/variable-stats.css"></style>
<style scoped src="@/assets/trait-comparison.css"></style>
<style scoped>
/* The icon of the chosen variable in the head; the chosen variable instead of the text */
.stc-icon-fa {
  color: var(--stc-type-color);
  font-size: 1.35rem;
}
.stc-chosen {
  color: var(--cp-text);
  font-weight: 600;
}
.stc-chosen-unit {
  color: var(--cp-muted);
  font-weight: 400;
}
/* The climate data by dataset: the datasets share no location */
.stc-warning {
  margin: 1rem 1.25rem 0;
  padding: 0.6rem 0.9rem;
  border: 1px solid color-mix(in srgb, #d9822b 40%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, #d9822b 10%, transparent);
  color: var(--cp-text);
  font-size: 0.85rem;
}
.stc-warning .fa-solid {
  margin-right: 0.4rem;
  color: #d9822b;
}
/* By location: the common period */
.stc-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 1rem 1.25rem 0;
  color: var(--cp-text);
  font-size: 0.85rem;
  cursor: pointer;
}
.stc-option-count {
  padding: 0.05rem 0.45rem;
  border-radius: 6px;
  background: var(--cp-neutral-bg);
  color: var(--cp-muted);
  font-size: 0.75rem;
  font-weight: 600;
}
</style>
