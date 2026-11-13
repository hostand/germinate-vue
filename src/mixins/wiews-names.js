import { getWiewsOrganizations } from '@/mixins/fao-wiews'

/**
 * For the institution tables: the name of an institution that has a code but no name in the database, from FAO WIEWS.
 * Call lookUpWiewsNames with the rows of a page (BaseTable "data-changed"), show getInstitutionName(item) in the name
 * cell (null while looking up: a spinner there, never the placeholder of the database first).
 *
 * The names are kept in the browser (localStorage, shared by all the tables and pages) so a code is asked to WIEWS
 * once: names found for 90 days, codes WIEWS doesn't know for 7 days. A failed request (network) is not kept.
 */
const STORAGE_KEY = 'germinate-wiews-institution-names'
const FOUND_DAYS = 90
const UNKNOWN_DAYS = 7
const DAY = 24 * 60 * 60 * 1000

// A name of the database that is no name: empty, or a placeholder such as "N/A"
const hasName = item => !!item.institutionName && !/^\s*(n\/?a|null|none|unknown|-+)\s*$/i.test(`${item.institutionName}`)
const codeOf = item => item.institutionCode ? `${item.institutionCode}`.trim().toUpperCase() : null

// The kept names: { CODE: { name (null: unknown to WIEWS), time } }, the outdated ones left out
const readStore = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
    const now = Date.now()
    Object.keys(stored).forEach(code => {
      const entry = stored[code]
      const days = entry && entry.name ? FOUND_DAYS : UNKNOWN_DAYS
      if (!entry || now - entry.time > days * DAY) {
        delete stored[code]
      }
    })
    return stored
  } catch (error) {
    return {}
  }
}
const writeStore = (code, name) => {
  try {
    const stored = readStore()
    stored[code] = { name, time: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch (error) {
    // Not kept (storage full or blocked): asked again next time
  }
}
// Requests running, shared by the tables of the page: { CODE: Promise<name|null> }
const running = {}

export default {
  data: function () {
    return {
      // Code -> name from WIEWS (null when WIEWS doesn't know the code), from the browser storage and the requests
      wiewsNames: {}
    }
  },
  methods: {
    // The name of the database; else the one from WIEWS, or the placeholder of the database when WIEWS doesn't know
    // the code; null while it is being looked up
    getInstitutionName: function (item) {
      if (hasName(item)) {
        return item.institutionName
      }
      const code = codeOf(item)
      if (!code) {
        return item.institutionName || null
      }
      if (this.wiewsNames[code] === undefined) {
        return null
      }
      return this.wiewsNames[code] || item.institutionName || null
    },
    // Whether the name of the row is still being looked up on WIEWS (also before the request starts)
    isLookingUpWiewsName: function (item) {
      const code = codeOf(item)
      return !hasName(item) && !!code && this.wiewsNames[code] === undefined
    },
    lookUpWiewsNames: function (_request, result) {
      const rows = (result && result.data) || []
      const stored = readStore()
      rows
        .filter(item => !hasName(item) && codeOf(item))
        .map(codeOf)
        .filter((code, index, all) => all.indexOf(code) === index && this.wiewsNames[code] === undefined)
        .forEach(code => {
          // Kept in the browser: no request
          if (stored[code]) {
            this.$set(this.wiewsNames, code, stored[code].name)
            return
          }
          if (!running[code]) {
            running[code] = getWiewsOrganizations(code).then(results => {
              const found = results[0]
              let name
              if (found && found.success) {
                name = found.name_of_organization ? `${found.name_of_organization}`.trim() || null : null
                writeStore(code, name)
              } else if (found && /No organization found/i.test(found.error_message || '')) {
                name = null
                writeStore(code, null)
              } else {
                // WIEWS could not be reached: the placeholder this time, asked again next time
                name = null
              }
              delete running[code]
              return name
            })
          }
          running[code].then(name => {
            this.$set(this.wiewsNames, code, name)
          })
        })
    }
  }
}
