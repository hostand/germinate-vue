// Shared by the statistics of the traits per data type (TraitDateStats, TraitCategoricalStats; both extend
// TraitValueStats): the colours of the page for Plotly, the observations of a trait in a dataset (the trial export) and
// the preview of the passport of a germplasm clicked in a chart (its name on the axis, its point / bar).
import { apiPostTrialsDataTable } from '@/mixins/api/trait'

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
      const filter = [{
        column: 'traitId',
        comparator: 'equals',
        operator: 'and',
        values: [this.traitId]
      }, {
        column: 'datasetId',
        comparator: 'equals',
        operator: 'and',
        values: [this.datasetId]
      }]
      this.rowsProgress = { loaded: 0, total: null }
      const loadPage = page => new Promise(resolve => {
        apiPostTrialsDataTable({ page, limit: ROWS_PAGE, filter: JSON.parse(JSON.stringify(filter)), orderBy: 'germplasmId', ascending: 1 }, result => resolve(result || { data: [], count: 0 }), {
          codes: [],
          callback: () => resolve(null)
        })
      })
      const next = page => loadPage(page).then(result => {
        const data = (result && result.data) || []
        data.forEach(row => {
          const raw = row.traitValue
          const mapped = raw === null || raw === undefined || `${raw}`.trim() === '' ? null : mapValue(`${raw}`.trim())
          if (mapped !== null && mapped !== undefined) {
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
