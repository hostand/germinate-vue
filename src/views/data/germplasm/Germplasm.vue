<template>
  <!-- In the look of the custom pages, over the whole width of the page -->
  <div class="custom-page germplasm-page">
    <!-- Title of the page as on the home page (custom-page.css), without description -->
    <header class="cp-page-header">
      <h1 class="cp-page-title">{{ $t('pageGermplasmTitle') }}</h1>
    </header>

    <!-- List (common filters and table), Map, Download, Recently viewed. The tab is kept in the URL (?tab=map). -->
    <b-tabs class="gp-tabs" nav-class="gp-tabs-nav" content-class="gp-tabs-content" v-model="tabIndex">
      <!-- The tabs with their icon on the left -->
      <b-tab>
        <template #title><i class="fa-solid fa-seedling gp-tab-icon" aria-hidden="true" />List</template>
        <div class="gp-tab-panel">
          <GermplasmTableComponent customLook />
        </div>
      </b-tab>

      <!-- Built when first opened (the map needs its size) -->
      <b-tab lazy>
        <template #title><i class="fa-solid fa-map gp-tab-icon" aria-hidden="true" />Map</template>
        <div class="gp-tab-panel">
          <!-- A block as those of the Download tab: the icon of Geographic data (menu), the title and the text -->
          <section class="gp-card">
            <header class="gp-card-head">
              <span class="gp-card-icon" aria-hidden="true"><i class="fa-solid fa-earth-americas" /></span>
              <div>
                <h2 class="gp-card-title">{{ $t('widgetGermplasmMapTitle') }}</h2>
                <p class="gp-card-subtitle" v-if="locationDataAvailable">{{ $t('widgetGermplasmMapText') }}</p>
              </div>
            </header>
            <div class="gp-card-body">
              <template v-if="locationDataAvailable">
                <GermplasmLocationMap ref="germplasmMap" customLook />
              </template>
              <p class="gp-card-text gp-empty" v-else-if="locationDataAvailable === false">There are no germplasm with a collecting site location.</p>
              <p class="gp-card-text gp-empty" v-else><b-spinner small /> Loading ...</p>
            </div>
          </section>
        </div>
      </b-tab>

      <b-tab>
        <template #title><i class="fa-solid fa-download gp-tab-icon" aria-hidden="true" />Download</template>
        <div class="gp-tab-panel">
          <GermplasmDownload />
        </div>
      </b-tab>

      <!-- The recently viewed germplasm as on the passport page, then the same in the table. Only when there are some. -->
      <b-tab lazy v-if="recentIds.length > 0">
        <template #title><i class="fa-solid fa-eye gp-tab-icon" aria-hidden="true" />Recently viewed</template>
        <div class="gp-tab-panel">
          <!-- A block as those of the other tabs: icon, title and Clear, then the accession numbers -->
          <section class="gp-card gp-recent-panel">
            <header class="gp-card-head">
              <span class="gp-card-icon" aria-hidden="true"><i class="fa-solid fa-eye" /></span>
              <div class="gp-card-head-text">
                <h2 class="gp-card-title">{{ $t('widgetRecentItemsTitle') }}</h2>
              </div>
              <button type="button" class="gp-card-clear" @click="$refs.recentPanel && $refs.recentPanel.clear()">
                <i class="fa-solid fa-trash-can" aria-hidden="true" /> {{ $t('genericClear') }}
              </button>
            </header>
            <div class="gp-card-body">
              <RecentlyViewedPanel bare ref="recentPanel" />
            </div>
          </section>
          <GermplasmTable :getData="getRecentData" :getIds="getRecentIds" :downloadTable="downloadRecentTable" :key="recentIds.join(',')" conservationColumn filterCrumbs noUrlParams />
        </div>
      </b-tab>
    </b-tabs>
  </div>
</template>

<script>
import GermplasmDownload from '@/components/germplasm/GermplasmDownload'
import GermplasmLocationMap from '@/components/map/GermplasmLocationMap'
import GermplasmTableComponent from '@/components/germplasm/GermplasmTableComponent'
import GermplasmTable from '@/components/tables/GermplasmTable'
import RecentlyViewedPanel from '@/components/germplasm/RecentlyViewedPanel'
import { apiPostLocationTable } from '@/mixins/api/location.js'
import { apiPostGermplasmTable, apiPostGermplasmTableIds } from '@/mixins/api/germplasm.js'
import { apiPostTableExport } from '@/mixins/api/misc.js'
import { translateConservationRequest } from '@/mixins/conservation'
import { mapGetters } from 'vuex'

// Tabs in their order, as named in the URL
const TABS = ['list', 'map', 'download', 'recent']

export default {
  data: function () {
    return {
      tabIndex: 0,
      // null while checking whether there are collecting sites with coordinates
      locationDataAvailable: null
    }
  },
  components: {
    GermplasmDownload,
    GermplasmLocationMap,
    GermplasmTable,
    GermplasmTableComponent,
    RecentlyViewedPanel
  },
  computed: {
    ...mapGetters([
      'storeRecentIds'
    ]),
    // Ids of the recently viewed germplasm
    recentIds: function () {
      return (this.storeRecentIds && this.storeRecentIds.germplasm) ? this.storeRecentIds.germplasm : []
    }
  },
  watch: {
    tabIndex: function (newValue) {
      this.updateTabUrl(newValue)
      if (TABS[newValue] === 'map') {
        this.invalidateMapSize()
      }
    }
  },
  methods: {
    // The request of the table, only for the recently viewed germplasm
    getRecentRequest: function (data) {
      const request = Object.assign({}, data)
      request.filter = (data.filter || []).concat([{
        column: 'germplasmId',
        comparator: 'inSet',
        operator: 'and',
        values: [...this.recentIds]
      }])
      return translateConservationRequest(request)
    },
    getRecentData: function (data, callback) {
      return this.getRecentRequest(data).then(request => {
        const promise = apiPostGermplasmTable(request, callback)
        // The API makes the page of the request start at 0, which the "Showing x to y" of the table relies on: the same
        // on the request of the table (not only on its copy)
        data.page = request.page
        return promise
      })
    },
    getRecentIds: function (data, callback) {
      return this.getRecentRequest(data).then(request => apiPostGermplasmTableIds(request, callback))
    },
    downloadRecentTable: function (data, callback) {
      return this.getRecentRequest(data).then(request => apiPostTableExport({ filter: request.filter }, 'germplasm', callback))
    },
    updateTabUrl: async function (index) {
      const query = Object.assign({}, this.$route.query)
      delete query.mapExpanded
      if (index > 0) {
        query.tab = TABS[index]
      } else {
        delete query.tab
      }

      if (query.tab !== this.$route.query.tab || this.$route.query.mapExpanded !== undefined) {
        await this.$router.replace({ query }).catch(() => {})
      }
    },
    invalidateMapSize: function () {
      this.$nextTick(() => {
        if (this.$refs.germplasmMap) {
          this.$refs.germplasmMap.invalidateSize()
        }
      })
    }
  },
  created: function () {
    // The tab of the URL; the former "mapExpanded=true" opens the map
    const query = this.$route.query || {}
    const index = TABS.indexOf(query.tab)
    // Recently viewed only when there are some
    if (index !== -1 && !(query.tab === 'recent' && this.recentIds.length === 0)) {
      this.tabIndex = index
    } else if (query.mapExpanded === 'true') {
      this.tabIndex = TABS.indexOf('map')
    }
  },
  mounted: function () {
    this.$store.dispatch('setHelpKey', 'helpGermplasm')

    apiPostLocationTable({
      page: 1,
      limit: 1,
      filter: [{
        column: 'locationType',
        comparator: 'equals',
        operator: 'and',
        values: ['collectingsites']
      }, {
        column: 'locationLatitude',
        comparator: 'isNotNull',
        operator: 'and',
        values: null
      }, {
        column: 'locationLongitude',
        comparator: 'isNotNull',
        operator: 'and',
        values: null
      }]
    }, result => {
      this.locationDataAvailable = !!(result && result.data && result.data.length > 0)
      if (TABS[this.tabIndex] === 'map') {
        this.invalidateMapSize()
      }
    })
  }
}
</script>

<style src="@/assets/custom-page.css"></style>
<style scoped>
/* The whole width of the page */
.germplasm-page {
  padding: 0.5rem 0 3rem;
}
/* Tabs: the same as on the passport page */
/* Room between the description and the tabs */
.gp-tabs {
  margin-top: 2.25rem;
}
.gp-tabs >>> .gp-tabs-nav {
  flex-wrap: wrap;
  border-bottom: 1px solid var(--cp-border);
}
.gp-tabs >>> .gp-tabs-nav .nav-link {
  padding: 0.7rem 1.25rem;
  border: 1px solid transparent;
  border-radius: 10px 10px 0 0;
  color: var(--cp-muted);
  font-weight: 600;
}
.gp-tabs >>> .gp-tabs-nav .nav-link:hover,
.gp-tabs >>> .gp-tabs-nav .nav-link:focus {
  border-color: transparent;
  color: var(--cp-text);
}
.gp-tabs >>> .gp-tabs-nav .nav-link.active,
body.dark-mode .gp-tabs >>> .gp-tabs-nav .nav-link.active,
body.dark-mode .gp-tabs >>> .gp-tabs-nav .nav-link.active:focus {
  border-color: var(--cp-border) var(--cp-border) var(--cp-surface);
  background: var(--cp-surface);
  color: var(--cp-text);
}
/* Icon and text on one line, the icon a little smaller than the text, of a fixed width (no shift between tabs) */
.gp-tabs >>> .gp-tabs-nav .nav-link {
  display: inline-flex;
  align-items: center;
  line-height: 1.5;
}
.gp-tab-icon {
  width: 1.1em;
  margin-right: 0.5rem;
  font-size: 0.95em;
  line-height: 1;
  text-align: center;
}
/* The icon of the active tab in the green of the icons of the sidebar menu */
.gp-tabs >>> .gp-tabs-nav .nav-link.active .gp-tab-icon {
  color: var(--cp-green);
}
.gp-tab-panel {
  margin-top: 1.25rem;
}

/* Cards: as the blocks of the Download tab (rounded, the icon in a soft green square beside the title) */
.gp-card {
  overflow: hidden;
  padding: 1.5rem;
  border: 1px solid var(--cp-border);
  border-radius: 16px;
  background: var(--cp-surface);
  box-shadow: 0 1px 2px var(--cp-shadow);
  font-family: 'DM Sans', -apple-system, 'Segoe UI', Roboto, sans-serif;
}
.gp-card-head {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
}
.gp-card-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--cp-green-soft);
  color: var(--cp-green);
  font-size: 1.3rem;
}
.gp-card-title {
  margin: 0.1rem 0 0.15rem;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--cp-text);
}
.gp-card-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: var(--cp-muted);
}
.gp-card-body {
  padding-top: 1.25rem;
}
.gp-card-head-text {
  flex: 1 1 auto;
  min-width: 0;
}
/* Clear: on the right of the title */
.gp-card-clear {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.4rem;
  height: 36px;
  padding: 0 0.9rem;
  border: 1px solid var(--cp-border);
  border-radius: 10px;
  background: var(--cp-surface);
  color: var(--cp-text-subtle);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
}
.gp-card-clear:hover,
.gp-card-clear:focus {
  border-color: #dc3545;
  color: #dc3545;
}
body.dark-mode .gp-card-clear:hover,
body.dark-mode .gp-card-clear:focus {
  border-color: #f07b86;
  color: #f07b86;
}
.gp-card-text {
  color: var(--cp-muted);
}
.gp-empty {
  margin: 0;
}
.gp-recent-panel {
  margin-bottom: 1.25rem;
}
</style>
<style>
/* Common filters in the look of the custom pages: labels, rounded fields and buttons in the green of the pages */
.germplasm-page .gt-filter-custom .col-form-label,
.germplasm-page .gt-filter-custom legend {
  padding-bottom: 0.35rem;
  color: var(--cp-text-subtle);
  font-size: 0.85rem;
  font-weight: 600;
}
.germplasm-page .gt-filter-custom .form-control {
  height: 40px;
  border: 1px solid var(--cp-border);
  border-radius: 10px;
  background: var(--cp-surface);
  color: var(--cp-text);
  font-family: inherit;
}
.germplasm-page .gt-filter-custom .form-control:focus {
  border-color: var(--cp-green);
  box-shadow: 0 0 0 3px var(--cp-green-soft);
}
.germplasm-page .gt-filter-custom .input-group > .form-control:not(.germplasm-filter-input) {
  border-radius: 10px 0 0 10px;
}
.germplasm-page .gt-filter-custom .germplasm-filter-input {
  border-radius: 10px !important;
}
.germplasm-page .gt-filter-custom .input-group-append > .btn {
  border: none;
  border-radius: 0 10px 10px 0;
  background: var(--cp-button);
  color: var(--cp-on-button);
}
.germplasm-page .gt-filter-custom .input-group-append > .btn:hover {
  background: var(--cp-button-hover);
}
/* Button groups: entity types and conservation as separate rounded buttons; has data of type stays one group, rounded
   at its ends */
.germplasm-page .gt-filter-custom .btn-group:not(#has-data) {
  gap: 0.4rem;
}
.germplasm-page .gt-filter-custom .btn-group > .btn {
  font-family: inherit;
}
.germplasm-page .gt-filter-custom .btn-group:not(#has-data) > .btn {
  flex: 0 0 auto;
  border-radius: 10px !important;
  margin-left: 0 !important;
}
.germplasm-page .gt-filter-custom #has-data > .btn:first-child {
  border-radius: 10px 0 0 10px;
}
.germplasm-page .gt-filter-custom #has-data > .btn:last-child {
  border-radius: 0 10px 10px 0;
}
.germplasm-page .gt-filter-custom .btn-group > .btn .badge {
  border-radius: 999px;
}
.germplasm-page .gt-filter-custom .btn-group > .btn-outline-primary {
  border-color: var(--cp-green);
  color: var(--cp-green);
}
.germplasm-page .gt-filter-custom .btn-group > .btn-outline-primary:hover,
.germplasm-page .gt-filter-custom .btn-group > .btn-outline-primary:focus {
  background: var(--cp-green);
  color: var(--cp-on-button);
  box-shadow: none;
}
.germplasm-page .gt-filter-custom .btn-group > .btn-outline-primary .badge {
  background: var(--cp-green-soft);
  color: var(--cp-green);
}
/* Has data of type and Conservation side by side: a bit closer, so Conservation stays inside the panel */
.germplasm-page .gt-filter-custom .filter-pair {
  column-gap: 0.5rem;
}
.germplasm-page .gt-filter-custom .conservation-buttons > .btn {
  min-width: 0;
  padding-left: 0.6rem;
  padding-right: 0.6rem;
}
.germplasm-page .gt-filter-custom .btn-group > .btn-outline-secondary:not(.selected) {
  border-color: var(--cp-border);
  background: var(--cp-surface);
}

/* Tables: within the width of the page, no scrolling to the side (only when even this doesn't fit). Smaller text and
   paddings, the texts wrap; the synonyms (long lists of codes) may break anywhere. */
.germplasm-page .base-table table.b-table {
  width: 100%;
}
.germplasm-page .base-table table.b-table > thead > tr > th,
.germplasm-page .base-table table.b-table > tbody > tr > td {
  padding-left: 0.25rem;
  padding-right: 0.25rem;
  white-space: normal;
  overflow-wrap: break-word;
}
.germplasm-page .base-table table.b-table > thead > tr > th {
  font-size: 0.75rem;
}
.germplasm-page .base-table table.b-table > tbody > tr > td {
  font-size: 0.78rem;
}
/* Room of the sort arrows */
.germplasm-page .base-table table.b-table.table > thead > tr > [aria-sort]:not(.b-table-sort-icon-left) {
  padding-right: 0.8rem;
  background-size: 0.5em 1em;
  background-position: right 0.15rem center;
}
.germplasm-page .base-table table.b-table > tbody > tr > td.bt-col-entityTypeName .text-nowrap {
  white-space: normal !important;
}
.germplasm-page .base-table table.b-table > tbody > tr > td.bt-col-synonyms {
  overflow-wrap: anywhere;
}
</style>
