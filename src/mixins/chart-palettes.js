// The palettes of the charts: those of the Germinate configuration (chart, template and gradient colours) and those of
// palette.js (https://github.com/google/palette.js): Paul Tol's, ColorBrewer, HSV rainbows, RGB gradients, Solarized.
// Each palette: its key, its group, its name (a key of the locale, or a name of its own), how many colours it has at
// most (max) and up to how many of them colour-blind people tell apart (cbfMax), whether it is qualitative, and its
// colours for a number.
import store from '@/store'

const palette = require('google-palette')

const INFINITE = 1e9
// When the colours do not cover the series: this palette (any number of colours, colour-blind friendly)
const FALLBACK = 'tol-rainbow'
const DEFAULT = 'germinate-charts'

const hex = colors => (colors || []).map(c => `#${c}`)
// n colours spread along a list (a gradient): its ends and evenly between them
const sample = (list, n) => n >= list.length ? list.slice() : n === 1 ? [list[0]] : Array.from({ length: n }, (_, i) => list[Math.round(i * (list.length - 1) / (n - 1))])
const scheme = name => palette.listSchemes(name)[0]
const fromScheme = (s, args = []) => n => hex(s.apply(s, [Math.min(n, s.max)].concat(args)))
const rgb = fn => n => hex(palette.generate(fn, n))

const getSettings = () => store.getters.storeServerSettings || {}

let cache = null
const build = () => {
  const settings = getSettings()
  const list = []
  const add = (group, key, name, colors, max, cbfMax = 1, own = false) => list.push({ group, key, name, own, colors, max, cbfMax })
  // The Germinate configuration
  ;[['germinate-charts', 'chartColorsPaletteCharts', settings.colorsCharts, false], ['germinate-template', 'chartColorsPaletteTemplate', settings.colorsTemplate, false], ['germinate-gradient', 'chartColorsPaletteGradient', settings.colorsGradient, true]].forEach(([key, name, colors, gradient]) => {
    if (colors && colors.length > 0) {
      add('chartColorsGroupGerminate', key, name, n => gradient ? sample(colors, n) : colors.slice(0, n), colors.length)
    }
  })
  const mpn = scheme('mpn65')
  add('chartColorsGroupMisc', 'mpn65', 'chartColorsPaletteBig', fromScheme(mpn), mpn.max, mpn.cbf_max)
  ;[['tol', 'chartColorsPaletteTolQualitative'], ['tol-dv', 'chartColorsPaletteTolDiverging'], ['tol-sq', 'chartColorsPaletteTolSequential'], ['tol-rainbow', 'chartColorsPaletteTolRainbow']].forEach(([key, name]) => {
    const s = scheme(key)
    add('chartColorsGroupTol', key, name, fromScheme(s), s.max, s.cbf_max)
  })
  ;[['qualitative', 'chartColorsGroupCbQualitative'], ['sequential', 'chartColorsGroupCbSequential'], ['diverging', 'chartColorsGroupCbDiverging']].forEach(([type, group]) => {
    palette.listSchemes(`cb-${type}`).forEach(s => add(group, s.scheme_name, s.scheme_name.replace('cb-', ''), fromScheme(s), s.max, s.cbf_max, true))
  })
  const rainbow = scheme('rainbow')
  ;[[1, 1], [0.5, 1], [1, 0.5], [0.5, 0.5]].forEach(([s, v]) => add('chartColorsGroupRainbow', `rainbow-${s}-${v}`, { key: 'chartColorsPaletteRainbow', params: { s, v } }, fromScheme(rainbow, [s, v]), INFINITE))
  ;[
    ['red', 'chartColorsColorRed', x => palette.rgbColor(x, 0, 0)],
    ['green', 'chartColorsColorGreen', x => palette.rgbColor(0, x, 0)],
    ['blue', 'chartColorsColorBlue', x => palette.rgbColor(0, 0, x)],
    ['yellow', 'chartColorsColorYellow', x => palette.rgbColor(x, x, 0)],
    ['magenta', 'chartColorsColorMagenta', x => palette.rgbColor(x, 0, x)],
    ['cyan', 'chartColorsColorCyan', x => palette.rgbColor(0, x, x)],
    ['grayscale', 'chartColorsColorGrayscale', x => palette.rgbColor(x, x, x)]
  ].forEach(([key, name, fn]) => add('chartColorsGroupRgb', `rgb-${key}`, name, rgb(fn), INFINITE))
  ;[['sol-base', 'chartColorsPaletteSolarizedBase'], ['sol-accent', 'chartColorsPaletteSolarizedAccent']].forEach(([key, name]) => {
    const s = scheme(key)
    add('chartColorsGroupSolarized', key, name, fromScheme(s), s.max, s.cbf_max)
  })
  // Qualitative: colours of their own, the first ones the same for any number (not spread along a scale)
  const qualitative = ['germinate-charts', 'germinate-template', 'mpn65', 'tol', 'sol-accent']
  list.forEach(p => { p.qualitative = qualitative.includes(p.key) || p.group === 'chartColorsGroupCbQualitative' })
  return list
}

// Every palette (built again when the configuration of the server changes)
const getPalettes = () => {
  const settings = getSettings()
  if (!cache || cache.settings !== settings) {
    cache = { settings, list: build() }
  }
  return cache.list
}

const getPalette = key => getPalettes().find(p => p.key === key) || null

// The palettes that cover n colours (colour-blind friendly for n colours, when asked)
const getPalettesFor = (n, colourBlind = false) => getPalettes().filter(p => p.max >= n && (!colourBlind || p.cbfMax >= n))

// The colours of the charts for n series, all different:
// - the palette chosen by the user, when it covers them (its colours for n: a gradient spread over the n series);
// - else the chosen colours (edited by hand, or the defaults), when they cover them;
// - else the palette that covers any number (Paul Tol's rainbow)
const getColorsFor = (colors, n) => {
  const chosen = store.getters.storeCustomChartColors && store.getters.storeCustomChartColors.length > 0 ? getPalette(store.getters.storeCustomChartPalette) : null
  if (chosen && chosen.max >= n) {
    return chosen.colors(n)
  }
  const unique = (colors || []).filter((c, i, all) => c && all.findIndex(o => `${o}`.toLowerCase() === `${c}`.toLowerCase()) === i)
  if (unique.length >= n) {
    return unique
  }
  return getPalette(FALLBACK).colors(n)
}

// The colour scale of a heatmap of values (Plotly): the gradient of the Germinate configuration, its colours evenly
// from the lowest value to the highest; without one, Viridis
const getGradientScale = () => {
  const colors = (getSettings().colorsGradient || []).filter(c => c)
  if (colors.length < 2) {
    return 'Viridis'
  }
  return colors.map((c, i) => [i / (colors.length - 1), c])
}

export {
  INFINITE,
  getGradientScale,
  FALLBACK,
  DEFAULT,
  getPalettes,
  getPalette,
  getPalettesFor,
  getColorsFor
}
