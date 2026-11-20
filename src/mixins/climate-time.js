// The view "over time" of the statistics of a climate (TraitNumericStats, TraitCategoricalStats, TraitValueStats with
// variable = climate): the recording date of each observation on the x axis.
// - numbers: the value against the date, a line per location, the mean and the median of all as lines
// - categories / text: a lane per location, a dot per observation at its date in the colour of its value
// Many observations (more than POINTS_MAX): one point per location and month (a span above AGGREGATE_YEARS years: per
// year) instead of each: the median of the values (numbers) or the most frequent value (categories, text).

const POINTS_MAX = 2500
const AGGREGATE_YEARS = 10
const DAY_MS = 86400000
const LANE_ROW = 46
const LANE_EXTRA = 120
const NUMERIC_HEIGHT = 470

const median = sorted => {
  if (sorted.length < 1) {
    return null
  }
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

// The observations with a recording date (YYYY-MM-DD), by date
const datedRows = rows => rows.filter(row => row.date && /^\d{4}-\d{2}-\d{2}$/.test(row.date)).slice().sort((a, b) => a.date.localeCompare(b.date))

// The unit of the points: each observation (null), else month or year (a long span)
const getUnit = rows => {
  if (rows.length <= POINTS_MAX) {
    return null
  }
  const first = Date.parse(rows[0].date)
  const last = Date.parse(rows[rows.length - 1].date)
  return (last - first) / DAY_MS > AGGREGATE_YEARS * 365.25 ? 'year' : 'month'
}

// The first day of the period of a date
const periodOf = (date, unit) => unit === 'year' ? `${date.substring(0, 4)}-01-01` : `${date.substring(0, 7)}-01`

// The locations of the observations (their name), in the order of their names
const getLocations = rows => {
  const names = [...new Set(rows.map(row => `${row.germplasm}`))]
  names.sort((a, b) => a.localeCompare(b))
  return names
}

// A date of the data as shown (ISO 8601, see formatting.js): 2026-11-18; of a month 2026-11; of a year 2026
const formatDate = (date, locale, unit) => {
  const time = Date.parse(`${date}T00:00:00Z`)
  if (isNaN(time)) {
    return date
  }
  const iso = new Date(time).toISOString().substring(0, 10)
  return unit === 'year' ? iso.substring(0, 4) : (unit === 'month' ? iso.substring(0, 7) : iso)
}

// The axes shared by both charts
const dateAxis = theme => ({
  type: 'date',
  gridcolor: theme.grid,
  linecolor: theme.line,
  zeroline: false,
  automargin: true,
  tickfont: { color: theme.muted }
})

// Numbers over time. ctx: { theme, colors, locale, t, formatValue, mean, median, unitLabel }
const getNumericTimeChart = (allRows, ctx) => {
  const rows = datedRows(allRows)
  const unit = getUnit(rows)
  const locations = getLocations(rows)
  const { theme, colors, t } = ctx
  const data = []
  locations.forEach((location, index) => {
    const own = rows.filter(row => `${row.germplasm}` === location)
    const color = colors.length > 0 ? colors[index % colors.length] : '#5b9cf6'
    if (unit) {
      // The median of each period (its range and number of observations in the hover)
      const byPeriod = {}
      own.forEach(row => {
        const key = periodOf(row.date, unit)
        ;(byPeriod[key] = byPeriod[key] || []).push(row.mapped)
      })
      const periods = Object.keys(byPeriod).sort()
      const stats = periods.map(key => {
        const values = byPeriod[key].slice().sort((a, b) => a - b)
        return { key, median: median(values), min: values[0], max: values[values.length - 1], n: values.length }
      })
      data.push({
        type: 'scatter',
        mode: 'lines+markers',
        name: location,
        x: stats.map(s => s.key),
        y: stats.map(s => s.median),
        line: { color, width: 2 },
        marker: { color, size: 7 },
        hovertext: stats.map(s => [`<b>${location}</b>`, formatDate(s.key, ctx.locale, unit), `${t('pageTraitDetailsStatsMedian')}: <b>${ctx.formatValue(s.median)}</b>`, `${ctx.formatValue(s.min)} – ${ctx.formatValue(s.max)}`, t('pageTraitDetailsStatsSampleSize', { count: s.n })].join('<br>')),
        hovertemplate: '%{hovertext}<extra></extra>'
      })
    } else {
      data.push({
        type: 'scatter',
        mode: 'lines+markers',
        name: location,
        x: own.map(row => row.date),
        y: own.map(row => row.mapped),
        customdata: own.map(row => ({ raw: [row.value], label: row.value })),
        line: { color, width: 2 },
        marker: { color, size: 8 },
        hovertext: own.map(row => [`<b>${location}</b>`, formatDate(row.date, ctx.locale), `<b>${ctx.formatValue(row.mapped)}</b>`].join('<br>')),
        hovertemplate: '%{hovertext}<extra></extra>'
      })
    }
  })
  // The mean and the median of all the observations: lines across the chart
  const shapes = []
  const annotations = []
  ;[{ y: ctx.mean, label: t('pageTraitDetailsStatsMean'), dash: 'solid', x: 0, anchor: 'left' }, { y: ctx.median, label: t('pageTraitDetailsStatsMedian'), dash: 'dot', x: 1, anchor: 'right' }].filter(l => l.y !== null && l.y !== undefined).forEach(l => {
    shapes.push({ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: l.y, y1: l.y, line: { color: theme.strong, width: 1.5, dash: l.dash } })
    annotations.push({ xref: 'paper', x: l.x, y: l.y, xanchor: l.anchor, yanchor: 'bottom', showarrow: false, text: `${l.label} · ${ctx.formatValue(l.y)}`, font: { size: 11, color: theme.muted } })
  })
  return {
    unit,
    data,
    // The locations and their colour (a legend below the chart, with the flags of their countries)
    legend: locations.map((location, index) => ({ label: location, color: colors.length > 0 ? colors[index % colors.length] : '#5b9cf6' })),
    layout: {
      height: NUMERIC_HEIGHT,
      margin: { t: 40, r: 20, b: 50, l: 60 },
      showlegend: false,
      legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: 1, yanchor: 'bottom', font: { color: theme.text } },
      // The SVG download: the legend of the locations in the chart (on the page: below it, with their flags)
      meta: { exportLegend: true },
      xaxis: dateAxis(theme),
      yaxis: { title: ctx.unitLabel ? { text: ctx.unitLabel, font: { color: theme.muted } } : undefined, gridcolor: theme.grid, linecolor: theme.line, zeroline: false, automargin: true, tickfont: { color: theme.muted } },
      shapes,
      annotations
    }
  }
}

// Categories (or text values) over time: a lane per location. ctx: { theme, locale, t, valueOf(row): { key, label,
// color }, getFlags(labels): { images, prefix } (the flags of the countries before the names) }
const getCategoryTimeChart = (allRows, ctx) => {
  const rows = datedRows(allRows)
  const unit = getUnit(rows)
  const locations = getLocations(rows)
  const { theme, t } = ctx
  const flags = ctx.getFlags ? ctx.getFlags(locations) : { images: [], prefix: '' }
  // The points: each observation, or the most frequent value of each location and period
  let points
  if (unit) {
    const groups = {}
    rows.forEach(row => {
      const key = `${row.germplasm}\u0000${periodOf(row.date, unit)}`
      const g = groups[key] = groups[key] || { location: `${row.germplasm}`, date: periodOf(row.date, unit), counts: {}, values: {}, n: 0 }
      const value = ctx.valueOf(row)
      g.counts[value.key] = (g.counts[value.key] || 0) + 1
      g.values[value.key] = value
      g.n++
    })
    points = Object.values(groups).map(g => {
      const top = Object.keys(g.counts).sort((a, b) => g.counts[b] - g.counts[a])[0]
      return { location: g.location, date: g.date, value: g.values[top], count: g.counts[top], n: g.n }
    })
  } else {
    points = rows.map(row => ({ location: `${row.germplasm}`, date: row.date, value: ctx.valueOf(row), row }))
  }
  // Several points of a location at the same date: side by side in its lane (up and down)
  const sameDate = {}
  points.forEach(p => {
    const key = `${p.location}\u0000${p.date}`
    p.slot = sameDate[key] = (sameDate[key] === undefined ? 0 : sameDate[key] + 1)
  })
  const offset = slot => slot === 0 ? 0 : (slot % 2 === 1 ? 1 : -1) * Math.ceil(slot / 2) * 0.16
  // A trace per value (its colour, the legend), in the order given
  const byValue = {}
  const order = []
  points.forEach(p => {
    if (!byValue[p.value.key]) {
      byValue[p.value.key] = []
      order.push(p.value)
    }
    byValue[p.value.key].push(p)
  })
  order.sort((a, b) => (a.order || 0) - (b.order || 0))
  const data = order.map(value => {
    const own = byValue[value.key]
    return {
      type: 'scatter',
      mode: 'markers',
      name: value.label,
      x: own.map(p => p.date),
      y: own.map(p => locations.indexOf(p.location) + offset(p.slot)),
      customdata: own.map(() => ({ value: value.key })),
      marker: { color: value.color, size: 11, line: { color: theme.surface, width: 1 } },
      hovertext: own.map(p => [`<b>${p.location}</b>`, formatDate(p.date, ctx.locale, unit), `<b>${value.label}</b>`, unit ? t('pageClimateDetailsStatsMostFrequentOf', { count: p.count, total: p.n }) : null].filter(x => x).join('<br>')),
      hovertemplate: '%{hovertext}<extra></extra>'
    }
  })
  return {
    unit,
    data,
    layout: {
      height: Math.max(1, locations.length) * LANE_ROW + LANE_EXTRA,
      margin: { t: 40, r: 20, b: 50, l: 10 },
      showlegend: true,
      legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: 1, yanchor: 'bottom', font: { color: theme.text } },
      xaxis: dateAxis(theme),
      yaxis: {
        tickvals: locations.map((l, i) => i),
        ticktext: locations.map(location => flags.prefix + location),
        range: [locations.length - 0.5, -0.5],
        gridcolor: theme.grid,
        zeroline: false,
        automargin: true,
        ticklabelstandoff: 8,
        tickfont: { color: theme.text }
      },
      images: flags.images
    }
  }
}

// Any observation with a recording date: the view can be drawn
const hasDates = rows => rows.some(row => row.date)

// The unit of the points of the view for these observations: null (each observation), month or year
const getTimeUnit = rows => getUnit(datedRows(rows))

export {
  getTimeUnit,
  getNumericTimeChart,
  getCategoryTimeChart,
  hasDates
}
