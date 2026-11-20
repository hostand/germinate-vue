import store from '@/store'

const padTo2Digits = (num) => num.toString().padStart(2, '0')

const getDateTimeString = (date) => {
  if (!date) {
    date = new Date()
  }

  return `${date.getFullYear()}-${padTo2Digits(date.getMonth() + 1)}-${padTo2Digits(date.getDate())}-${padTo2Digits(date.getHours())}-${padTo2Digits(date.getMinutes())}-${padTo2Digits(date.getSeconds())}`
}

const getDateString = (date) => {
  if (!date) {
    date = new Date()
  }

  return `${date.getFullYear()}-${padTo2Digits(date.getMonth() + 1)}-${padTo2Digits(date.getDate())}`
}

// THE NUMBERS AND DATES OF THE WHOLE APPLICATION (tables, charts, statistics, counts): one way for every language, the
// one of the scientific literature and of the international standards, so that a value reads the same to every partner
// and as it is in the exported files.
// - Numbers (SI brochure of the BIPM, ISO 80000-1): a point before the decimals and a narrow space between the groups of
//   three digits (12 345.67); a number of four digits not grouped (1234); never a point or a comma between the thousands
//   (1.234 is one thousand to some readers and one point two to others). The minus is the hyphen of the keyboard, so that
//   a value copied keeps being a number.
// - Dates (ISO 8601): year-month-day (2026-11-18), the time in 24 hours (14:05); a date only partly known only with what
//   is known (2026-11, 2026). In texts to read (news, publications) the month may be written out (18 Nov 2026).
// The identifiers, years, codes and coordinates are not numbers to group: never through formatNumber.

// The space between the groups of digits: narrow, not breaking (the number never split on two lines)
const DIGIT_GROUP_SEPARATOR = '\u202F'

// The digits of a number written plainly ("-12345.678") in the way above
const groupDigits = (text) => {
  const negative = text.startsWith('-')
  const [integer, fraction] = (negative ? text.slice(1) : text).split('.')
  const grouped = integer.length > 4 ? integer.replace(/\B(?=(\d{3})+(?!\d))/g, DIGIT_GROUP_SEPARATOR) : integer
  return `${negative ? '-' : ''}${grouped}${fraction ? `.${fraction}` : ''}`
}

// A number written plainly with between min and max decimals (rounded), never with an exponent
const plainNumber = (number, min, max) => number.toLocaleString('en-US', { useGrouping: false, minimumFractionDigits: min, maximumFractionDigits: max })

// A date of a table, as a Date: a text "YYYY-MM-DD" (no time) is read in the local time zone (not UTC) so that its day
// does not move. Null when it is not a date.
const toTableDate = (value) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  let date
  if (value instanceof Date) {
    date = value
  } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    date = new Date(year, month - 1, day)
  } else {
    date = new Date(value)
  }

  return isNaN(date.getTime()) ? null : date
}

// A date only partly known, as a text: "YYYY", "YYYY-MM", "YYYYMM", or "YYYYMMDD" / "YYYY-MM-DD" with "00" or "--" for
// what is not known (MCPD). Its known parts ({ year, month, day }), or null when it is not such a date.
const toPartialDate = (value) => {
  if (typeof value !== 'string') {
    return null
  }
  const match = value.trim().match(/^(\d{4})(?:-?(\d{2}|--))?(?:-?(\d{2}|--))?$/)
  if (!match) {
    return null
  }
  const known = part => part && part !== '--' && part !== '00' ? part : null
  const month = known(match[2])
  const day = month ? known(match[3]) : null
  if ((month && (+month < 1 || +month > 12)) || (day && (+day < 1 || +day > 31))) {
    return null
  }
  return { year: match[1], month, day }
}

/**
 * A date (ISO 8601): YYYY-MM-DD; a date only partly known: YYYY-MM or YYYY. Not a date: the value as it is.
 * @param {Date|String|Number} value The date, its text or its timestamp
 */
const formatDate = (value) => {
  const partial = toPartialDate(value)
  if (partial) {
    return [partial.year, partial.month, partial.day].filter(part => part).join('-')
  }

  const date = toTableDate(value)
  if (!date) {
    return (value === undefined || value === '') ? null : value
  }

  return `${date.getFullYear()}-${padTo2Digits(date.getMonth() + 1)}-${padTo2Digits(date.getDate())}`
}

/**
 * A date with its time (ISO 8601, 24 hours): YYYY-MM-DD HH:mm, with the seconds when asked (logs, jobs). Not a date: the
 * value as it is.
 * @param {Date|String|Number} value The date, its text or its timestamp
 * @param {Boolean} seconds Whether to show the seconds
 */
const formatDateTime = (value, seconds = false) => {
  const date = toTableDate(value)
  if (!date) {
    return (value === undefined || value === '') ? null : value
  }

  return `${formatDate(date)} ${padTo2Digits(date.getHours())}:${padTo2Digits(date.getMinutes())}${seconds ? `:${padTo2Digits(date.getSeconds())}` : ''}`
}

/**
 * A date in a text to read (news, publications, stories): the month written out in the language of the page (18 Nov
 * 2026), as clear in every language. Not a date: the value as it is.
 * @param {Date|String|Number} value The date, its text or its timestamp
 * @param {String} month How to write the month: short (Nov) or long (November)
 */
const formatDateText = (value, month = 'short') => {
  const partial = toPartialDate(value)
  const date = partial ? new Date(+partial.year, partial.month ? +partial.month - 1 : 0, partial.day ? +partial.day : 1) : toTableDate(value)
  if (!date) {
    return (value === undefined || value === '') ? null : value
  }
  // Day, month, year in this order in every language (some write the short month as a number: 18/11/2026)
  const locale = (store.getters.storeLocale || 'en_GB').replace('_', '-')
  const parts = []
  if (!partial || partial.day) {
    parts.push(date.getDate())
  }
  if (!partial || partial.month) {
    parts.push(date.toLocaleDateString(locale, { month }))
  }
  parts.push(date.getFullYear())
  return parts.join(' ')
}

/**
 * A number (see above): 12 345.67, 1234, 0.25. A whole number has no decimals (8, not 8.00). Not a number: the value as
 * it is.
 * @param {Number|String} value The number
 * @param {Number} decimals The decimal places (rounded), or null to keep those of the number
 */
const formatNumber = (value, decimals = null) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const number = typeof value === 'number' ? value : Number(value)
  if (!isFinite(number)) {
    return value
  }

  const rounded = decimals !== null && decimals !== undefined && !Number.isInteger(number)
  return groupDigits(plainNumber(number, rounded ? decimals : 0, rounded ? decimals : 20))
}

/**
 * A number with between min and max decimals (see above), e.g. the statistics: a mean with 2 (12.30), a share with 0 to
 * 1 (12 or 12.5). Not a number: "–".
 * @param {Number} value The number
 * @param {Number} min The fewest decimals
 * @param {Number} max The most decimals (rounded); the same as min when not given
 */
const formatDecimals = (value, min, max = min) => {
  if (value === null || value === undefined || value === '' || !isFinite(value)) {
    return '–'
  }
  return groupDigits(plainNumber(+value, min, Math.max(min, max)))
}

/**
 * A share (0 to 1) as a percentage with one decimal at most: 12.5 %
 * @param {Number} share The share
 */
const formatPercent = (share) => `${formatDecimals(Math.round(share * 1000) / 10, 0, 1)} %`

// The separators of the charts (Plotly: the decimal one, then the one of the thousands), as those of the numbers above
const CHART_SEPARATORS = `.${DIGIT_GROUP_SEPARATOR}`

/**
 * Formats the given value into a human-readable number (e.g. 1.000 -> 1K, 1.000.000 -> 1G)
 * @param {Number} value The value to format
 * @param {Number} decimals The decimal places
 * @param {Number} k The thousand value (e.g. 1000 or 1024)
 * @param {String} separator The separator between the number and the letter
 */
const getNumberWithSuffix = (value, decimals = 2, k = 1000, separator = '') => {
  if (value === undefined || value === null || value === 0) {
    return '0'
  }

  // Check if advanced number formatting is available
  if ('Intl' in window && Intl.NumberFormat) {
    // The same in every language, with a point before the decimals (1.2K, 3.4 MB: see the numbers above)
    const locale = 'en-GB'
    let formatter
    if (k === 1024) {
      // Handle byte values
      const UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte', 'petabyte']
      let size = Math.abs(Number(value))
      let u = 0
      while (size >= 1024 && u < UNITS.length - 1) {
        size /= 1024
        ++u
      }
      formatter = Intl.NumberFormat(locale, { style: 'unit', unit: UNITS[u], unitDisplay: 'short', maximumFractionDigits: decimals })
      value = size
    } else {
      // Handle regular numeric values
      formatter = Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: decimals })
    }

    return formatter.format(value)
  } else {
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y']
    const i = Math.floor(Math.log(value) / Math.log(k))

    return parseFloat((value / Math.pow(k, i)).toFixed(dm)) + separator + sizes[i]
  }
}

/**
 * Converts the given object into a safe URL string
 * @param {Object} params The object to convert
 */
const toUrlString = (params) => {
  return Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map(key => params[key] ? (key + '=' + encodeURIComponent(params[key])) : '')
    .join('&')
}

const isTruncatedAfterWords = (str, words) => {
  if (!str) {
    return false
  }

  const parts = str.split(' ')

  return parts.length > words
}

const truncateAfterWords = (str, words) => {
  if (!str) {
    return str
  }

  const parts = str.split(' ')

  if (parts.length > words) {
    return parts.splice(0, words).join(' ') + '...'
  } else {
    return str
  }
}

const truncateAfterChars = (str, length) => {
  if (!str) {
    return str
  }

  if (str.length > length) {
    return str.substring(0, length) + '...'
  } else {
    return str
  }
}

/**
 * Formats the given decimal number with the given number of decimal places
 * @param {Number} number The number to format
 * @param {Number} places The number of decimal spaces
 */
const toFixed = (number, places) => parseFloat(Math.round(number + 'e+' + places) + 'e-' + places)

export {
  padTo2Digits,
  getDateTimeString,
  getDateString,
  formatDateTime,
  formatDate,
  formatDateText,
  formatNumber,
  formatDecimals,
  formatPercent,
  CHART_SEPARATORS,
  getNumberWithSuffix,
  toUrlString,
  truncateAfterChars,
  isTruncatedAfterWords,
  truncateAfterWords,
  toFixed
}
