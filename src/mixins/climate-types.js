// The types of the climate variables (what a variable is about the place of the data: a trial site or a wild site),
// given by their data type, nothing to set:
// - measurement (numeric): values measured over time (temperature, precipitation, humidity, wind, soil moisture,
//   radiation);
// - event (date): something that happened on a date (frost, flooding, sowing, harvest, an application);
// - management (categorical, text): about the site and how it is managed (soil type, product applied).
import { customClimateMeasurement } from '@/components/icons/custom-icons'
import store from '@/store'
import { readZip, makeDeflatedZip, canDeflate } from '@/mixins/zip'

// A colour of the template colours of the server
const templateColor = index => () => {
  const colors = store.getters.storeServerSettings ? store.getters.storeServerSettings.colorsTemplate : null
  return colors && colors.length > 0 ? colors[index % colors.length] : null
}

// Their icons: an SVG path (path: a weather vane, custom-icons.js) or a Font Awesome icon (icon: a timeline, a gear)
const CLIMATE_TYPES = [
  { key: 'measurement', dataTypes: ['numeric'], path: customClimateMeasurement, icon: null, text: 'climateTypeMeasurement', color: templateColor(0) },
  { key: 'event', dataTypes: ['date'], path: null, icon: 'fa-solid fa-timeline', text: 'climateTypeEvent', color: templateColor(1) },
  { key: 'management', dataTypes: ['categorical', 'text'], path: null, icon: 'fa-solid fa-gear', text: 'climateTypeManagement', color: templateColor(2) }
]

// The type of a climate variable by its data type
const getClimateType = dataType => CLIMATE_TYPES.find(t => t.dataTypes.includes(dataType)) || null

// The virtual column "climateType" of the climates table: its filter kept short ("climateType equals event", also in
// the URL), turned into its data types for the server (the table has no such column)
const CLIMATE_TYPE_COLUMN = 'climateType'

const isClimateTypeFilter = filter => {
  const column = filter && filter.column && typeof filter.column === 'object' ? filter.column.name : (filter ? filter.column : null)
  return column === CLIMATE_TYPE_COLUMN
}

// A request with its climate type filters turned into data type filters, and its order by the climate type into the
// order by the data type (the column of the data type of the table: dataType, climateDataType). A copy; the same request
// when it has neither. The order by the data type groups the types (not one after the other: the data types sort as the
// database sorts them)
const translateClimateTypeRequest = (data, dataTypeColumn = 'dataType') => {
  const filters = (data && data.filter) || []
  const filtered = filters.some(isClimateTypeFilter)
  const ordered = !!data && data.orderBy === CLIMATE_TYPE_COLUMN
  if (!filtered && !ordered) {
    return data
  }
  const toDataType = filter => {
    if (!isClimateTypeFilter(filter)) {
      return filter
    }
    const type = CLIMATE_TYPES.find(t => t.key === (filter.values ? filter.values[0] : null))
    return { column: dataTypeColumn, comparator: 'inSet', operator: filter.operator || 'and', values: type ? type.dataTypes : ['-'] }
  }
  return Object.assign({}, data, {
    orderBy: ordered ? dataTypeColumn : data.orderBy,
    filter: filtered ? filters.map(toDataType) : data.filter
  })
}

// THE CLIMATE TYPE IN THE DOWNLOADS: the exports of the climate data come from the server (a ZIP of tab separated files)
// without it; a column "climate_type" (measurement, event, management) is put after "climate_data_type" in the browser.
// Only the bytes of the new column are added: the others stay as the server wrote them (its own encoding).
const TAB = 9
const LF = 10
const CR = 13
const ascii = text => Uint8Array.from(text, c => c.charCodeAt(0))
const HEADER_INSERT = ascii('\tclimate_type')
const TYPE_INSERTS = {}
CLIMATE_TYPES.forEach(t => t.dataTypes.forEach(d => { TYPE_INSERTS[d] = ascii(`\t${t.key}`) }))
const EMPTY_INSERT = ascii('\t')

// The bytes of a tab separated file with the climate type after its data type; null when it has no data type column
const withClimateTypeColumn = bytes => {
  // The header: the position of the data type column
  let headerEnd = bytes.indexOf(LF)
  if (headerEnd < 0) {
    headerEnd = bytes.length
  }
  const header = String.fromCharCode.apply(null, bytes.subarray(0, headerEnd)).replace(/\r$/, '').split('\t')
  const column = header.indexOf('climate_data_type')
  if (column < 0) {
    return null
  }
  const pieces = []
  let total = 0
  const push = piece => {
    pieces.push(piece)
    total += piece.length
  }
  let copied = 0
  let line = 0
  let field = 0
  let fieldStart = 0
  // The end of the data type field of a line: what comes before it copied, then the climate type
  const insertAt = end => {
    push(bytes.subarray(copied, end))
    copied = end
    if (line === 0) {
      push(HEADER_INSERT)
    } else {
      const dataType = String.fromCharCode.apply(null, bytes.subarray(fieldStart, end)).trim()
      push(TYPE_INSERTS[dataType] || EMPTY_INSERT)
    }
  }
  for (let i = 0; i <= bytes.length; i++) {
    const b = i < bytes.length ? bytes[i] : LF
    if (b === TAB) {
      if (field === column) {
        insertAt(i)
      }
      field++
      fieldStart = i + 1
    } else if (b === LF) {
      if (field === column && (i > fieldStart || column > 0)) {
        insertAt(i > 0 && bytes[i - 1] === CR ? i - 1 : i)
      }
      line++
      field = 0
      fieldStart = i + 1
    }
  }
  push(bytes.subarray(copied))
  const result = new Uint8Array(total)
  let at = 0
  pieces.forEach(piece => {
    result.set(piece, at)
    at += piece.length
  })
  return result
}

// A download of the climate data (a ZIP Blob) with the climate type column: a Promise of the Blob. As it came when the
// browser cannot read or write it again, or when it has no data type column
const addClimateTypeColumn = blob => {
  if (!canDeflate() || !(blob instanceof Blob)) {
    return Promise.resolve(blob)
  }
  return readZip(blob).then(files => {
    let changed = false
    const result = files.map(f => {
      const data = /\.(txt|tsv|csv)$/i.test(f.name) ? withClimateTypeColumn(f.data) : null
      changed = changed || data !== null
      return { name: f.name, data: data || f.data }
    })
    return changed ? makeDeflatedZip(result) : blob
  }).catch(() => blob)
}

export {
  CLIMATE_TYPES,
  CLIMATE_TYPE_COLUMN,
  getClimateType,
  translateClimateTypeRequest,
  withClimateTypeColumn,
  addClimateTypeColumn
}
