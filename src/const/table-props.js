export default {
  BASE: {
    // The new look of the tables (see BaseTable), the look of all of them
    modernLook: {
      type: Boolean,
      default: true
    },
    // The table filter (help, columns, filter) in the toolbar
    filterEnabled: {
      type: Boolean,
      default: true
    },
    // The filter button shown but disabled (the table shows a fixed selection)
    filterLocked: {
      type: Boolean,
      default: false
    },
    // Columns with less than half of their values filled in hidden when the table loads (see BaseTable)
    autoHideColumns: {
      type: Boolean,
      default: true
    },
    filterOn: {
      type: Array,
      default: null
    },
    getData: {
      type: Function,
      default: () => {
        return {
          data: [],
          count: 0
        }
      }
    },
    storeUrlParameters: {
      type: Boolean,
      default: true
    }
  },
  DOWNLOAD: {
    downloadTable: {
      type: Function,
      default: null
    }
  },
  IDS: {
    getIds: {
      type: Function,
      default: () => {
        return {
          data: [],
          count: 0
        }
      }
    }
  },
  ACTIONS: {
    tableActions: {
      type: Array,
      default: () => null
    }
  },
  FULL: {
    // The new look of the tables (see BaseTable), the look of all of them
    modernLook: {
      type: Boolean,
      default: true
    },
    // The table filter (help, columns, filter) in the toolbar
    filterEnabled: {
      type: Boolean,
      default: true
    },
    // The filter button shown but disabled (the table shows a fixed selection)
    filterLocked: {
      type: Boolean,
      default: false
    },
    // Columns with less than half of their values filled in hidden when the table loads (see BaseTable)
    autoHideColumns: {
      type: Boolean,
      default: true
    },
    // Page and sorting not read from nor written to the URL (another table of the same name on the page)
    noUrlParams: {
      type: Boolean,
      default: false
    },
    // The filters above the table as the breadcrumb of the Search page (instead of badges)
    filterCrumbs: {
      type: Boolean,
      default: false
    },
    downloadTable: {
      type: Function,
      default: null
    },
    filterOn: {
      type: Array,
      default: null
    },
    getData: {
      type: Function,
      default: () => {
        return {
          data: [],
          count: 0
        }
      }
    },
    getIds: {
      type: Function,
      default: () => {
        return {
          data: [],
          count: 0
        }
      }
    },
    tableActions: {
      type: Array,
      default: () => null
    },
    storeUrlParameters: {
      type: Boolean,
      default: true
    },
    // Own text for the badge of a filter above the table: (filter) => text, or null for the usual one
    filterLabel: {
      type: Function,
      default: null
    }
  }
}
