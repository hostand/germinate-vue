// Shared by the statistics of the traits and climates per data type (TraitDateStats, TraitCategoricalStats,
// TraitNumericStats; all extend TraitValueStats): the colours of the page for Plotly, the observations of a variable in a
// dataset (the data table) and the preview of the passport of a germplasm clicked in a chart (its name on the axis, its
// point / bar). A climate: its observations by location (in place of the germplasm, no passport), no rep nor block.
import { getFlagLayout, placeFlags } from '@/mixins/location-flags'

const Plotly = require('plotly.js/lib/core')

// Observations per request when every observation of a trait in a dataset is loaded
const ROWS_PAGE = 10000

const FONT = 'Inter, -apple-system, "Segoe UI", Roboto, sans-serif'

// Two colours (#rrggbb) mixed: the share of the first one
const mixColor = (a, b, share) => {
  const parse = c => {
    const hex = `${c}`.replace('#', '')
    const full = hex.length === 3 ? hex.split('').map(h => h + h).join('') : hex.substring(0, 6)
    return [0, 2, 4].map(i => parseInt(full.substring(i, i + 2), 16) || 0)
  }
  const [x, y] = [parse(a), parse(b)]
  return `rgb(${x.map((v, i) => Math.round(v * share + y[i] * (1 - share))).join(', ')})`
}

export default {
  data: function () {
    return {
      // The germplasm whose passport is previewed (from a chart)
      previewGermplasmId: null,
      // Every observation being loaded: how many of how many
      rowsProgress: null
    }
  },
  methods: {
    mixColor,
    // The colours of the page (light or dark) shared by the charts
    getTheme: function () {
      const dark = this.storeDarkMode
      return {
        text: dark ? '#c4beb5' : '#4a4d4b',
        muted: dark ? '#a39d93' : '#6b6f6c',
        grid: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        line: dark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(0, 0, 0, 0.22)',
        strong: dark ? '#e8e6e3' : '#1f2120',
        empty: dark ? '#2b2f30' : '#eef0ec',
        surface: dark ? 'rgb(31, 34, 35)' : '#ffffff',
        hoverlabel: {
          bgcolor: dark ? '#262a2b' : '#ffffff',
          bordercolor: dark ? 'rgb(62, 67, 70)' : '#e2e3df',
          font: { family: FONT, size: 12, color: dark ? '#e8e6e3' : '#1f2120' }
        }
      }
    },
    // Every observation of the trait in the dataset (germplasm, rep, block and its value), from the table of the trial
    // data, in pages of ROWS_PAGE (rowsProgress: loaded of total). Not the export of the trial: it keeps one value per plot,
    // losing the other observations of the same germplasm, rep and block.
    // mapValue(value as in the data) gives what is kept of the value (e.g. its day), or null to leave the observation out.
    loadTrialRows: function (mapValue) {
      const rows = []
      const filter = this.getVariableFilter()
      const climate = this.isClimate
      const valueColumn = this.variableConfig.dataValueColumn
      this.rowsProgress = { loaded: 0, total: null }
      const loadPage = page => new Promise(resolve => {
        this.fetchDataTable({ page, limit: ROWS_PAGE, filter: JSON.parse(JSON.stringify(filter)), orderBy: this.variableConfig.orderBy, ascending: 1 }, result => resolve(result || { data: [], count: 0 }), {
          codes: [],
          callback: () => resolve(null)
        })
      })
      const next = page => loadPage(page).then(result => {
        const data = (result && result.data) || []
        data.forEach(row => {
          const raw = row[valueColumn]
          const mapped = raw === null || raw === undefined || `${raw}`.trim() === '' ? null : mapValue(`${raw}`.trim())
          if (mapped !== null && mapped !== undefined && climate) {
            // A climate: the location in place of the germplasm (no passport: no id): its name and the ISO 3 code of its
            // country, the ISO 2 code (its flag in the charts); its recording date
            const name = row.locationName || row.locationId
            rows.push({
              germplasmId: null,
              germplasm: row.countryCode3 ? `${name} (${row.countryCode3})` : name,
              country: row.countryCode2 ? `${row.countryCode2}`.toLowerCase() : null,
              rep: null,
              block: null,
              date: row.recordingDate ? `${row.recordingDate}`.substring(0, 10) : null,
              value: `${raw}`.trim(),
              mapped
            })
          } else if (mapped !== null && mapped !== undefined) {
            rows.push({
              germplasmId: row.germplasmId || null,
              germplasm: row.germplasmName || row.germplasmDisplayName || row.germplasmId,
              rep: row.rep || null,
              block: row.block || null,
              value: `${raw}`.trim(),
              mapped
            })
          }
        })
        const total = result && result.count >= 0 ? result.count : 0
        const loaded = (page - 1) * ROWS_PAGE + data.length
        this.rowsProgress = { loaded, total }
        // More pages (and this one full): the next one
        return data.length === ROWS_PAGE && loaded < total ? next(page + 1) : rows
      })
      return next(1)
    },
    // A climate: the flags of the locations of the rows of a chart (labels: the label of each row, y its index) and the
    // prefix of the labels (the room of the flag, "[flag] Name (ISO 3)"); the chart drawn again when a flag arrives
    getLocationFlags: function (labels) {
      if (!this.isClimate) {
        return { images: [], prefix: '' }
      }
      const codes = {}
      this.rows.forEach(row => { codes[`${row.germplasm}`] = row.country })
      return getFlagLayout(labels.map((label, y) => ({ y, code: codes[`${label}`] || null })), () => this.draw())
    },
    // A climate, once the chart is drawn (and whenever Plotly draws it anew): its flags where the labels start
    watchLocationFlags: function () {
      const element = this.$refs.chart
      if (!this.isClimate || !element || !element.on) {
        return
      }
      const place = () => {
        const images = placeFlags(element)
        if (images) {
          if (this.figure && this.figure.layout) {
            this.figure.layout.images = images
          }
          Plotly.relayout(element, { images })
        }
      }
      element.on('plotly_afterplot', place)
      place()
    },
    // A climate: the ISO 2 code of the country of a location (its label)
    getLocationCountry: function (label) {
      const row = this.rows.find(r => `${r.germplasm}` === `${label}`)
      return row ? row.country : null
    },
    showPassportPreview: function (germplasmId) {
      if (germplasmId === null || germplasmId === undefined || germplasmId === '') {
        return
      }
      this.previewGermplasmId = +germplasmId
      this.$nextTick(() => this.$refs.passportPreview && this.$refs.passportPreview.show())
    },
    // The names of the germplasm on the y axis (a row each, in the order of the list): clickable, the preview of the
    // passport. Bound again whenever Plotly draws the axis anew (plotly_afterplot).
    bindGermplasmNames: function (germplasm) {
      const element = this.$refs.chart
      if (!element || !germplasm) {
        return
      }
      element.querySelectorAll('.yaxislayer-above .ytick text').forEach(text => {
        // The value of the tick (bound by d3): the row of the germplasm
        const tick = text.__data__ || (text.parentNode && text.parentNode.__data__)
        const g = tick && Number.isInteger(tick.x) ? germplasm[tick.x] : null
        if (!g || !g.germplasmId) {
          return
        }
        text.classList.add('tds-germplasm-name')
        text.style.pointerEvents = 'all'
        text.onclick = () => this.showPassportPreview(g.germplasmId)
      })
    }
  }
}

export {
  FONT,
  mixColor
}
