// The flags of the countries of the locations in the charts of the statistics of a climate: a location reads
// "[flag] Name (ISO 3)". Plotly cannot use the flag-icons CSS: each flag is an image of the layout, from the SVG of
// flag-icons as a data URL (so the downloads keep it), as wide as 4:3 of the size of the font of the labels. The label
// starts with a few fixed spaces (FLAG_ROOM): once drawn, each flag is put where its label starts (placeFlags), in the
// room left for it. Loaded once per country; the chart drawn again when they arrive.

// The SVG files of flag-icons (4:3), by their name (the ISO 2 code, lower case): their URL
const flagFiles = require.context('flag-icons/flags/4x3', false, /^\.\/[a-z]{2}\.svg$/)

// code: data URL (loaded), a Promise (loading), or null (no flag)
const cache = {}

const toDataUrl = text => `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`

// The room of the flag at the start of a label: no-break spaces (about 0.28 em each: the flag and a gap)
const FLAG_ROOM = ' '.repeat(7)

// The flag of a country (ISO 2 code), loading it if needed: its data URL, or undefined while it loads (onLoaded then)
const getFlag = (code, onLoaded) => {
  const key = `${code || ''}`.toLowerCase()
  if (!/^[a-z]{2}$/.test(key)) {
    return null
  }
  const known = cache[key]
  if (typeof known === 'string' || known === null) {
    return known
  }
  if (!known) {
    let url = null
    try {
      url = flagFiles(`./${key}.svg`)
    } catch (e) {
      cache[key] = null
      return null
    }
    cache[key] = fetch(url).then(response => response.text()).then(text => {
      cache[key] = toDataUrl(text)
    }).catch(() => {
      cache[key] = null
    })
  }
  if (onLoaded) {
    cache[key].then(onLoaded)
  }
  return undefined
}

// The images of the flags of rows (y: the value of the row on the y axis, code: ISO 2), not shown until placed
// (placeFlags), and the prefix of the labels (the room of the flag; none without flags). onLoaded: a flag arrived
const getFlagLayout = (rows, onLoaded) => {
  const images = []
  rows.forEach(row => {
    // Not loaded yet (undefined): drawn without it, again once it arrived
    const flag = getFlag(row.code, onLoaded)
    if (flag) {
      images.push({
        source: flag,
        xref: 'paper',
        yref: 'y',
        x: 0,
        y: row.y,
        sizex: 0.01,
        sizey: 1,
        xanchor: 'left',
        yanchor: 'middle',
        sizing: 'contain',
        layer: 'above',
        visible: false
      })
    }
  })
  return { images, prefix: rows.some(row => row.code) ? FLAG_ROOM : '' }
}

// Once drawn: each flag at the start of the label of its row, as high as the font of the labels (4:3). Returns the
// images placed, or null when nothing changed (or nothing to place)
const placeFlags = element => {
  const layout = element && element.layout
  const full = element && element._fullLayout
  if (!layout || !full || !layout.images || layout.images.length < 1 || !full._size) {
    return null
  }
  const size = full._size
  const svg = element.querySelector('.main-svg')
  if (!svg || size.w <= 0) {
    return null
  }
  const svgLeft = svg.getBoundingClientRect().left
  // The left end of the label of each row (by its value on the axis), in px from the left of the plot area
  const starts = {}
  element.querySelectorAll('.yaxislayer-above .ytick text').forEach(text => {
    const tick = text.__data__ || (text.parentNode && text.parentNode.__data__)
    if (tick && tick.x !== undefined) {
      starts[Math.round(tick.x)] = text.getBoundingClientRect().left - svgLeft - size.l
    }
  })
  const fontSize = (layout.yaxis && layout.yaxis.tickfont && layout.yaxis.tickfont.size) || (layout.font && layout.font.size) || 12
  const width = fontSize * 4 / 3
  const images = layout.images.map(image => {
    const start = starts[Math.round(image.y)]
    if (start === undefined) {
      return Object.assign({}, image, { visible: false })
    }
    return Object.assign({}, image, { x: start / size.w, sizex: width / size.w, visible: true })
  })
  const same = images.every((image, i) => {
    const old = layout.images[i]
    return old.visible === image.visible && Math.abs(old.x - image.x) < 1e-4 && Math.abs(old.sizex - image.sizex) < 1e-4
  })
  return same ? null : images
}

// A figure without the flags (the SVG download: its images are not kept there): the labels without the room of the
// flag, no images
const withoutFlags = layout => {
  if (!layout.images || layout.images.length < 1) {
    return layout
  }
  const result = Object.assign({}, layout, { images: [] })
  if (layout.yaxis && layout.yaxis.ticktext) {
    result.yaxis = Object.assign({}, layout.yaxis, { ticktext: layout.yaxis.ticktext.map(text => `${text}`.split(FLAG_ROOM).join('')) })
  }
  return result
}

export {
  withoutFlags,
  getFlag,
  getFlagLayout,
  placeFlags
}
