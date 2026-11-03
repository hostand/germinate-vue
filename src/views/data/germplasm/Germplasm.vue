<template>
  <!-- In the look of the custom pages, over the whole width of the page -->
  <div class="custom-page germplasm-page">
    <!-- Title of the page as on the home page (custom-page.css); the description cut to two lines, the chevron shows all of it -->
    <header class="cp-page-header">
      <h1 class="cp-page-title">{{ $t('pageGermplasmTitle') }}</h1>
      <div class="cp-page-lead-row">
        <div :class="['cp-page-lead', { collapsed: !leadOpen }]" ref="lead" v-html="$t('pageGermplasmText')" />
        <button type="button" class="cp-page-lead-toggle" v-if="leadCut || leadOpen" :aria-expanded="leadOpen ? 'true' : 'false'" :aria-label="leadOpen ? 'Show less' : 'Show the whole description'" @click="leadOpen = !leadOpen">
          <span :class="['cp-page-lead-chevron', { open: leadOpen }]"><MdiIcon :path="icons.chevronDown" :size="22" /></span>
        </button>
      </div>
    </header>

    <!-- List (common filters and table), Map, Download, Recently viewed. The tab is kept in the URL (?tab=map). -->
    <b-tabs class="gp-tabs" nav-class="gp-tabs-nav" content-class="gp-tabs-content" v-model="tabIndex">
      <b-tab title="List">
        <div class="gp-tab-panel">
          <GermplasmTableComponent customLook />
        </div>
      </b-tab>

      <!-- Built when first opened (the map needs its size) -->
      <b-tab title="Map" lazy>
        <div class="gp-tab-panel">
          <section class="gp-card">
            <div class="gp-card-header">
              <h2 class="gp-card-title">{{ $t('widgetGermplasmMapTitle') }}</h2>
            </div>
            <div class="gp-card-body">
              <template v-if="locationDataAvailable">
                <p class="gp-card-text">{{ $t('widgetGermplasmMapText') }}</p>
                <GermplasmLocationMap ref="germplasmMap" />
              </template>
              <p class="gp-card-text gp-empty" v-else-if="locationDataAvailable === false">There are no germplasm with a collecting site location.</p>
              <p class="gp-card-text gp-empty" v-else><b-spinner small /> Loading ...</p>
            </div>
          </section>
        </div>
      </b-tab>

      <b-tab title="Download">
        <div class="gp-tab-panel">
          <GermplasmDownload />
        </div>
      </b-tab>

      <!-- The recently viewed germplasm as on the passport page, then the same in the table. Only when there are some. -->
      <b-tab title="Recently viewed" lazy v-if="recentIds.length > 0">
        <div class="gp-tab-panel">
          <RecentlyViewedPanel class="gp-recent-panel" />
          <GermplasmTable :getData="getRecentData" :getIds="getRecentIds" :downloadTable="downloadRecentTable" :key="recentIds.join(',')" conservationColumn filterCrumbs />
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
import MdiIcon from '@/components/icons/MdiIcon'
import RecentlyViewedPanel from '@/components/germplasm/RecentlyViewedPanel'
import { apiPostLocationTable } from '@/mixins/api/location.js'
import { apiPostGermplasmTable, apiPostGermplasmTableIds } from '@/mixins/api/germplasm.js'
import { apiPostTableExport } from '@/mixins/api/misc.js'
import { translateConservationRequest } from '@/mixins/conservation'
import { mapGetters } from 'vuex'
import { mdiChevronDown } from '@mdi/js'

// Tabs in their order, as named in the URL
const TABS = ['list', 'map', 'download', 'recent']

export default {
  data: function () {
    return {
      tabIndex: 0,
      // The description: shown whole, and whether it is longer than its two lines
      leadOpen: false,
      leadCut: false,
      icons: {
        chevronDown: mdiChevronDown
      },
      // null while checking whether there are collecting sites with coordinates
      locationDataAvailable: null
    }
  },
  components: {
    GermplasmDownload,
    GermplasmLocationMap,
    GermplasmTable,
    GermplasmTableComponent,
    MdiIcon,
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
    // Whether the description is cut (only then the chevron), again when the window changes
    measureLead: function () {
      const lead = this.$refs.lead
      if (lead && !this.leadOpen) {
        this.leadCut = lead.scrollHeight > lead.clientHeight + 1
      }
    },
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
      return this.getRecentRequest(data).then(request => apiPostGermplasmTable(request, callback))
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
  beforeDestroy: function () {
    window.removeEventListener('resize', this.measureLead)
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

    this.$nextTick(() => this.measureLead())
    window.addEventListener('resize', this.measureLead)

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
  margin-top: 3rem;
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
.gp-tab-panel {
  margin-top: 1.25rem;
}

/* Cards: the panels of the passport page */
.gp-card {
  overflow: hidden;
  border: 1px solid var(--cp-border);
  border-radius: 12px;
  background: var(--cp-surface);
}
.gp-card-header {
  padding: 1.1rem 1.5rem;
  border-bottom: 1px solid var(--cp-border);
}
.gp-card-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}
.gp-card-body {
  padding: 1.25rem 1.5rem;
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
