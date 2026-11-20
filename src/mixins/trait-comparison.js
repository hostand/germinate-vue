// What the comparisons of the trials export share: the traits of each chosen dataset, the trait chosen (its key among
// the comparable ones of the component: `comparable`, each { key, name, datasetIds, traitIds }), its observations loaded
// in pages (very many: once confirmed; each mapped by the `toRow` of the component), the theme and the downloads of the
// charts. The component gives `comparable`, `toRow(observation)`, `draw()` and `getFileName()`.
import { mapGetters } from 'vuex'
import { apiPostDatasetTraits, apiPostTrialsDataTable } from '@/mixins/api/trait'
import { apiPostDatasetClimates, apiPostClimateDataTable } from '@/mixins/api/climate'
import { formatNumber, formatDecimals, getDateTimeString } from '@/mixins/formatting'
import { getColors } from '@/mixins/colors'
import { getColorsFor } from '@/mixins/chart-palettes'
import { datasetTypes } from '@/mixins/types'
import { uuidv4 } from '@/mixins/util'
import { FONT } from '@/mixins/trait-stats'

const Plotly = require('plotly.js/lib/core')

// Observations per request; above ROWS_CONFIRM observations: loaded once confirmed
const ROWS_PAGE = 10000
const ROWS_CONFIRM = 50000
const CHART_HEIGHT = 460

// A name, a unit or a category compared without case and extra spaces
const normalize = value => `${value === null || value === undefined ? '' : value}`.trim().replace(/\s+/g, ' ').toLowerCase()

// Colours told apart: each once (any case)
const unique = colors => colors.filter((c, index) => c && colors.findIndex(o => `${o}`.toLowerCase() === `${c}`.toLowerCase()) === index)

// The numeric traits found in two of the datasets or more (minDatasets) with the same name, data type and unit (their ids
// may differ): { key, name, unitLabel, datasetIds, traitIds }, by name
const getNumericComparable = (datasets, traitsByDataset, minDatasets = 2) => {
  const variants = {}
  datasets.forEach(d => {
    ;(traitsByDataset[d.datasetId] || []).filter(t => t.dataType === 'numeric').forEach(t => {
      const unitLabel = t.unitAbbreviation || t.unitName || ''
      const key = `${normalize(t.traitName)}|${normalize(unitLabel)}`
      const variant = variants[key] = variants[key] || { key, name: `${t.traitName}`.trim(), unitLabel, datasetIds: [], traitIds: [] }
      if (!variant.datasetIds.includes(d.datasetId)) {
        variant.datasetIds.push(d.datasetId)
      }
      if (!variant.traitIds.includes(t.traitId)) {
        variant.traitIds.push(t.traitId)
      }
    })
  })
  return Object.values(variants).filter(v => v.datasetIds.length >= minDatasets).sort((a, b) => a.name.localeCompare(b.name))
}

// The categories of a trait from its restrictions ({ categories: [[scale 1], [scale 2], ...] }, the scales giving the
// same categories in their order, e.g. [["Low", "High"], ["1", "2"]]): its label (the first scale) and every code
const getDomain = restrictions => {
  const scales = restrictions && Array.isArray(restrictions.categories) ? restrictions.categories.filter(s => Array.isArray(s) && s.length > 0) : []
  const count = scales.reduce((max, s) => Math.max(max, s.length), 0)
  const domain = []
  for (let i = 0; i < count; i++) {
    const codes = [...new Set(scales.map(s => s[i]).filter(c => c !== null && c !== undefined && `${c}`.trim() !== '').map(c => `${c}`.trim()))]
    if (codes.length > 0) {
      domain.push({ label: codes[0], codes })
    }
  }
  return domain
}

// The categorical traits found in two of the datasets or more with the same name and the same categories (case and
// spaces ignored, in any order; their ids may differ): { key, name, domain (the categories in the order of the first one
// found), lookup (every code of every trait to the position of its category), datasetIds, traitIds }, by name; without
// categories, the values themselves are the categories
const getCategoricalComparable = (datasets, traitsByDataset) => {
  const variants = {}
  datasets.forEach(d => {
    ;(traitsByDataset[d.datasetId] || []).filter(t => t.dataType === 'categorical').forEach(t => {
      const domain = getDomain(t.traitRestrictions)
      const labels = domain.map(c => normalize(c.label))
      const key = `${normalize(t.traitName)}|${labels.slice().sort().join('|')}`
      const variant = variants[key] = variants[key] || { key, name: `${t.traitName}`.trim(), domain, datasetIds: [], traitIds: [], lookup: {} }
      if (!variant.datasetIds.includes(d.datasetId)) {
        variant.datasetIds.push(d.datasetId)
      }
      if (!variant.traitIds.includes(t.traitId)) {
        variant.traitIds.push(t.traitId)
        // Its codes to the categories of the variant (by their label)
        domain.forEach(c => {
          const position = variant.domain.findIndex(v => normalize(v.label) === normalize(c.label))
          c.codes.forEach(code => {
            const lower = normalize(code)
            if (!(lower in variant.lookup)) {
              variant.lookup[lower] = position
            }
          })
        })
      }
    })
  })
  return Object.values(variants).filter(v => v.datasetIds.length > 1).sort((a, b) => a.name.localeCompare(b.name))
}

// The climate data: the texts of the trials (germplasm) in their climate form (locations)
const CLIMATE_KEYS = {
  pageComparisonSingleTraitChoose: 'pageComparisonClimateChoose',
  pageComparisonSingleTraitChooseText: 'pageComparisonClimateChooseText',
  pageComparisonSingleTraitPlaceholder: 'pageComparisonClimatePlaceholder',
  pageComparisonSingleTraitCommonGermplasm: 'pageComparisonClimateCommonLocations',
  pageComparisonSingleTraitAcross: 'pageComparisonClimateAcross',
  pageComparisonSingleTraitGermplasm: 'pageComparisonClimateLocations',
  pageComparisonSingleTraitNoCommon: 'pageComparisonClimateNoCommon',
  pageComparisonSingleTraitTooFew: 'pageComparisonClimateTooFew',
  pageComparisonTourGermplasm: 'pageComparisonClimateTourLocations',
  pageComparisonTourDatasets: 'pageComparisonClimateTourDatasets',
  pageComparisonTourObservations: 'pageComparisonClimateTourObservations',
  pageComparisonTourInvalid: 'pageComparisonClimateTourInvalid',
  pageComparisonTourByDataset: 'pageComparisonClimateTourByDataset',
  pageComparisonTourAcross: 'pageComparisonClimateTourAcross',
  pageComparisonTourSummary: 'pageComparisonClimateTourSummary',
  // Multi-variable
  pageComparisonSingleTraitLarge: 'pageClimateComparisonSingleTraitLarge',
  pageComparisonMultiTraitChoose: 'pageClimateComparisonMultiTraitChoose',
  pageComparisonMultiTraitChooseText: 'pageClimateComparisonMultiTraitChooseText',
  pageComparisonMultiTraitMax: 'pageClimateComparisonMultiTraitMax',
  pageComparisonMultiTraitPlaceholder: 'pageClimateComparisonMultiTraitPlaceholder',
  pageComparisonMultiTraitClear: 'pageClimateComparisonMultiTraitClear',
  pageComparisonMultiTraitChooseMore: 'pageClimateComparisonMultiTraitChooseMore',
  pageComparisonMultiTraitTooFew: 'pageClimateComparisonMultiTraitTooFew',
  pageComparisonMultiTraitRadarFew: 'pageClimateComparisonMultiTraitRadarFew',
  pageComparisonMultiTraitNoProfiles: 'pageClimateComparisonMultiTraitNoProfiles',
  pageComparisonMultiTraitPcaFew: 'pageClimateComparisonMultiTraitPcaFew',
  pageComparisonMultiTraitTraits: 'pageClimateComparisonMultiTraitTraits',
  pageComparisonMultiTraitProfiles: 'pageClimateComparisonMultiTraitProfiles',
  pageComparisonMultiTraitTrait: 'pageClimateComparisonMultiTraitTrait',
  pageComparisonMultiTraitTourTraits: 'pageClimateComparisonMultiTraitTourTraits',
  pageComparisonMultiTraitTourDatasets: 'pageClimateComparisonMultiTraitTourDatasets',
  pageComparisonMultiTraitTourObservations: 'pageClimateComparisonMultiTraitTourObservations',
  pageComparisonMultiTraitTourProfiles: 'pageClimateComparisonMultiTraitTourProfiles',
  pageComparisonMultiTraitTourHeatmap: 'pageClimateComparisonMultiTraitTourHeatmap',
  pageComparisonMultiTraitTourRadar: 'pageClimateComparisonMultiTraitTourRadar',
  pageComparisonMultiTraitTourParallel: 'pageClimateComparisonMultiTraitTourParallel',
  pageComparisonMultiTraitTourPca: 'pageClimateComparisonMultiTraitTourPca',
  pageComparisonMultiTraitTourSummary: 'pageClimateComparisonMultiTraitTourSummary',
  pageComparisonMultiTraitTourOptions: 'pageClimateComparisonMultiTraitTourOptions',
  // Relationship
  pageRelationshipTitle: 'pageClimateRelationshipTitle',
  pageRelationshipText: 'pageClimateRelationshipText',
  pageRelationshipTooFew: 'pageClimateRelationshipTooFew',
  pageRelationshipWithin: 'pageClimateRelationshipWithin',
  pageRelationshipSplomMax: 'pageClimateRelationshipSplomMax',
  pageRelationshipUnitPlot: 'pageClimateRelationshipUnitPlot',
  pageRelationshipUnitAccession: 'pageClimateRelationshipUnitAccession',
  pageRelationshipPairedPlots: 'pageClimateRelationshipPairedPlots',
  pageRelationshipPairedAccessions: 'pageClimateRelationshipPairedAccessions',
  pageRelationshipLonely: 'pageClimateRelationshipLonely',
  pageRelationshipTraitX: 'pageClimateRelationshipTraitX',
  pageRelationshipTourTraits: 'pageClimateRelationshipTourTraits',
  pageRelationshipTourDatasets: 'pageClimateRelationshipTourDatasets',
  pageRelationshipTourUnits: 'pageClimateRelationshipTourUnits',
  pageRelationshipTourGermplasm: 'pageClimateRelationshipTourGermplasm',
  pageRelationshipTourLonely: 'pageClimateRelationshipTourLonely',
  pageRelationshipTourUnit: 'pageClimateRelationshipTourUnit',
  pageRelationshipTourScatter: 'pageClimateRelationshipTourScatter',
  pageRelationshipTourMatrix: 'pageClimateRelationshipTourMatrix',
  pageRelationshipTourSplom: 'pageClimateRelationshipTourSplom',
  pageRelationshipTourStatistics: 'pageClimateRelationshipTourStatistics',
  pageRelationshipTourOptions: 'pageClimateRelationshipTourOptions'
}

// The climate data compared by location: the texts in their location form (the groups are the locations)
const LOCATION_KEYS = {
  tableColumnDatasetName: 'tableColumnLocationName',
  pageComparisonSingleTraitGermplasm: 'pageDatasetsTitle',
  pageComparisonSingleTraitDatasetsCompared: 'pageComparisonClimateLocationsCompared',
  pageComparisonMultiTraitTourDatasets: 'pageComparisonClimateTourLocationsCompared',
  pageComparisonMultiTraitProfiles: 'pageComparisonClimateMultiProfiles',
  pageComparisonMultiTraitTourProfiles: 'pageComparisonClimateMultiTourProfiles',
  pageComparisonMultiTraitTourHeatmap: 'pageComparisonClimateMultiTourHeatmap',
  pageComparisonMultiTraitTourRadar: 'pageComparisonClimateMultiTourRadar',
  pageComparisonMultiTraitTourParallel: 'pageComparisonClimateMultiTourParallel',
  pageComparisonMultiTraitTourPca: 'pageComparisonClimateMultiTourPca',
  pageComparisonMultiTraitTourSummary: 'pageComparisonClimateMultiTourSummary'
}

// A variable of the climate data as a trait (the fields the comparisons read)
const climateAsTrait = c => ({ traitId: c.climateId, traitName: c.climateName, traitNameShort: c.climateNameShort, dataType: c.dataType, unitName: c.unitName, unitAbbreviation: c.unitAbbreviation, traitRestrictions: null })

// An observation of the climate data as one of the trials: the location (with its country) as the germplasm, location +
// recording date as the plot, the climate as the trait
const climateAsObservation = o => {
  const day = o.recordingDate ? `${o.recordingDate}`.substring(0, 10) : ''
  return {
    datasetId: o.datasetId,
    datasetName: o.datasetName,
    germplasmId: o.locationId,
    germplasmName: o.countryCode3 ? `${o.locationName} (${o.countryCode3})` : `${o.locationName}`,
    countryCode2: o.countryCode2 || null,
    trialsetupId: `${o.locationId}|${day}`,
    rep: null,
    block: null,
    recordingDate: day,
    traitId: o.climateId,
    traitName: o.climateName,
    traitValue: o.climateValue
  }
}

export { normalize, getDomain, climateAsTrait, climateAsObservation, getNumericComparable, getCategoricalComparable, CHART_HEIGHT }

export default {
  props: {
    // The chosen datasets: { datasetId, datasetName }
    datasets: {
      type: Array,
      default: () => []
    },
    // trait (the trials data) or climate (the climate data: locations instead of germplasm)
    variable: {
      type: String,
      default: 'trait'
    },
    // The climate data: compared by dataset (the default) or by location (those of locationIds)
    compareBy: {
      type: String,
      default: 'dataset'
    },
    locationIds: {
      type: Array,
      default: null
    }
  },
  data: function () {
    return {
      id: `stc-${uuidv4()}`,
      CHART_HEIGHT,
      traitsLoading: true,
      // The traits of each dataset: { datasetId: [trait] }
      traitsByDataset: {},
      selectedKey: null,
      // The observations of the chosen trait: none, confirm, loading, loaded
      rowsState: 'none',
      rowsTotal: 0,
      rowsProgress: null,
      rows: []
    }
  },
  computed: {
    ...mapGetters([
      'storeDarkMode',
      'storeLocale',
      'storeCustomChartColors'
    ]),
    locale: function () {
      return (this.storeLocale || 'en_GB').replace('_', '-')
    },
    isClimate: function () {
      return this.variable === 'climate'
    },
    // The climate data compared by location: the observations of the chosen locations only
    isByLocation: function () {
      return this.isClimate && this.compareBy === 'location'
    },
    typeColor: function () {
      return this.isClimate ? datasetTypes.climate.color() : datasetTypes.trials.color()
    },
    datasetNames: function () {
      const names = {}
      this.datasets.forEach(d => { names[d.datasetId] = d.datasetName })
      return names
    },
    selected: function () {
      return this.comparable.find(o => o.key === this.selectedKey) || null
    },
    // The colours of the charts: the custom ones (else those of the server), each once
    colors: function () {
      const custom = this.storeCustomChartColors && this.storeCustomChartColors.length > 0 ? this.storeCustomChartColors : (getColors() || [])
      const server = (this.$store.getters.storeServerSettings || {}).colorsCharts || []
      return unique(custom.length > 0 ? custom : server)
    }
  },
  watch: {
    datasets: function () {
      this.loadTraits()
    },
    // Other locations (by location): the observations of the chosen trait loaded again
    locationIds: function (newValue, oldValue) {
      if (this.isByLocation && JSON.stringify(newValue) !== JSON.stringify(oldValue) && this.selectedKey !== null) {
        this.rows = []
        this.prepareRows()
      }
    },
    storeDarkMode: function () {
      this.draw()
    },
    colors: function () {
      this.draw()
    }
  },
  methods: {
    formatNumber,
    // A key of the locale in its climate form when the data is the climate data (compared by location: its location
    // form first)
    vk: function (key, params) {
      if (this.isByLocation && LOCATION_KEYS[key]) {
        return this.$t(LOCATION_KEYS[key], params)
      }
      return this.$t(this.isClimate && CLIMATE_KEYS[key] ? CLIMATE_KEYS[key] : key, params)
    },
    // n colours, all different: the colours of the charts when they cover them, else Paul Tol's rainbow
    getDistinctColors: function (n) {
      return getColorsFor(this.colors, Math.max(n, 1)).slice(0, Math.max(n, 1))
    },
    formatValue: function (value) {
      if (value === null || value === undefined || isNaN(value)) {
        return '–'
      }
      return formatDecimals(value, 0, 2)
    },
    formatFixed: function (value, digits) {
      return formatDecimals(value, digits)
    },
    // The traits of each dataset (a request each: the traits shared by the datasets are not told apart otherwise)
    loadTraits: function () {
      this.traitsLoading = true
      this.clearTrait()
      const ids = this.datasets.map(d => d.datasetId)
      // The climate data: its variables as traits
      const load = this.isClimate
        ? id => new Promise(resolve => apiPostDatasetClimates([id], result => resolve((result || []).map(climateAsTrait)), { codes: [], callback: () => resolve([]) }))
        : id => new Promise(resolve => apiPostDatasetTraits([id], result => resolve(result || []), { codes: [], callback: () => resolve([]) }))
      Promise.all(ids.map(load)).then(results => {
        if (ids.join(',') !== this.datasets.map(d => d.datasetId).join(',')) {
          return
        }
        const byDataset = {}
        ids.forEach((id, index) => { byDataset[id] = results[index] })
        this.traitsByDataset = byDataset
        this.traitsLoading = false
      })
    },
    selectTrait: function (key) {
      if (this.selectedKey === key) {
        return
      }
      this.selectedKey = key
      this.rows = []
      this.prepareRows()
    },
    clearTrait: function () {
      this.selectedKey = null
      this.rows = []
      this.rowsState = 'none'
    },
    // A page of the observations of the chosen trait in its datasets
    loadPage: function (page, limit) {
      const option = this.selected
      // The climate data: its observations as those of the trials
      if (this.isClimate) {
        return new Promise(resolve => {
          apiPostClimateDataTable({
            page,
            limit,
            datasetIds: option.datasetIds,
            filter: [{ column: 'climateId', comparator: 'inSet', operator: 'and', values: option.traitIds }]
              .concat(this.isByLocation ? [{ column: 'locationId', comparator: 'inSet', operator: 'and', values: this.locationIds && this.locationIds.length > 0 ? this.locationIds : [-1] }] : []),
            orderBy: 'locationId',
            ascending: 1
          }, result => resolve(result ? { data: (result.data || []).map(climateAsObservation), count: result.count } : { data: [], count: 0 }), { codes: [], callback: () => resolve({ data: [], count: 0 }) })
        })
      }
      return new Promise(resolve => {
        apiPostTrialsDataTable({
          page,
          limit,
          datasetIds: option.datasetIds,
          filter: [{ column: 'traitId', comparator: 'inSet', operator: 'and', values: option.traitIds }],
          orderBy: 'germplasmId',
          ascending: 1
        }, result => resolve(result || { data: [], count: 0 }), { codes: [], callback: () => resolve({ data: [], count: 0 }) })
      })
    },
    // How many observations: very many, a confirmation first
    prepareRows: function () {
      const key = this.selectedKey
      this.rowsState = 'loading'
      this.rowsProgress = null
      this.loadPage(1, 1).then(result => {
        if (key !== this.selectedKey) {
          return
        }
        this.rowsTotal = result.count || 0
        if (this.rowsTotal > ROWS_CONFIRM) {
          this.rowsState = 'confirm'
        } else {
          this.loadRows()
        }
      })
    },
    // Every observation with a value, in pages, as the component maps it (`toRow`)
    loadRows: function () {
      const key = this.selectedKey
      this.rowsState = 'loading'
      const rows = []
      const next = page => this.loadPage(page, ROWS_PAGE).then(result => {
        if (key !== this.selectedKey) {
          return null
        }
        const data = result.data || []
        data.forEach(o => {
          if (o.traitValue === null || o.traitValue === undefined || `${o.traitValue}`.trim() === '') {
            return
          }
          rows.push(this.toRow(o))
        })
        const total = result.count || 0
        if (total > ROWS_PAGE) {
          this.rowsProgress = this.$t('pageTraitDetailsStatsLoadingProgress', { loaded: formatNumber(Math.min(total, page * ROWS_PAGE)), total: formatNumber(total) })
        }
        return data.length === ROWS_PAGE && page * ROWS_PAGE < total ? next(page + 1) : rows
      })
      next(1).then(all => {
        if (all === null || key !== this.selectedKey) {
          return
        }
        this.rows = Object.freeze(all)
        this.rowsState = 'loaded'
        this.$nextTick(() => this.draw())
      })
    },
    // A read-only table of rows in memory: the rows of the page asked for (the page as the table counts it)
    getTableData: function (request, rows) {
      const page = Math.max(1, request.page || 1)
      const limit = request.limit || rows.length
      request.page = page - 1
      return Promise.resolve({ data: { data: rows.slice((page - 1) * limit, page * limit), count: rows.length } })
    },
    // A download of a table: the callback after this tick (its working state shown, then hidden)
    resolveLater: function (callback, result) {
      return new Promise(resolve => setTimeout(() => {
        callback(result)
        resolve()
      }, 0))
    },
    downloadChart: function (ref, format) {
      const element = this.$refs[ref]
      if (!element) {
        return
      }
      Plotly.downloadImage(element, { format, filename: `${this.getFileName()}-${getDateTimeString()}`, width: element.clientWidth || 1280, height: element.clientHeight || CHART_HEIGHT })
    },
    getTheme: function () {
      const dark = this.storeDarkMode
      return {
        text: dark ? '#c4beb5' : '#4a4d4b',
        muted: dark ? '#a39d93' : '#6b6f6c',
        grid: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        hoverlabel: { bgcolor: dark ? '#262a2b' : '#ffffff', bordercolor: dark ? 'rgb(62, 67, 70)' : '#e2e3df', font: { family: FONT, size: 12, color: dark ? '#e8e6e3' : '#1f2120' } }
      }
    },
    // The layout every chart of the comparisons shares
    getLayout: function (extra) {
      const theme = this.getTheme()
      return Object.assign({
        height: CHART_HEIGHT,
        margin: { t: 10, r: 20, b: 40, l: 70 },
        paper_bgcolor: 'rgba(0, 0, 0, 0)',
        plot_bgcolor: 'rgba(0, 0, 0, 0)',
        font: { family: FONT, size: 12, color: theme.text },
        dragmode: false
      }, extra)
    }
  },
  mounted: function () {
    this.loadTraits()
  }
}
