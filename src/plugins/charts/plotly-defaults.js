// The defaults of every Plotly chart of the application, set once here instead of in each chart: the numbers written as
// in the tables (a point before the decimals, a narrow space between the thousands; see formatting.js). A chart that sets
// its own separators keeps them.
import { CHART_SEPARATORS } from '@/mixins/formatting'

const Plotly = require('plotly.js/lib/core')

// The layout of a call: (element, data, layout, config) or (element, { data, layout, config })
const withDefaults = (args) => {
  const figure = args[1] && !Array.isArray(args[1]) && typeof args[1] === 'object' && 'data' in args[1] ? args[1] : null
  let layout = figure ? figure.layout : args[2]
  if (!layout || typeof layout !== 'object') {
    layout = {}
    if (figure) {
      figure.layout = layout
    } else {
      args[2] = layout
    }
  }
  if (layout.separators === undefined) {
    layout.separators = CHART_SEPARATORS
  }
  return args
}

;['newPlot', 'react'].forEach(name => {
  const original = Plotly[name]
  Plotly[name] = function (...args) {
    return original.apply(this, withDefaults(args))
  }
})
