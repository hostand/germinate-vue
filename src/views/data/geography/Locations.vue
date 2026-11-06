<template>
  <!-- Locations in the look of the custom pages: the title, a List tab with the table and a Maps tab with the clustered
       and the heatmapped map in two blocks -->
  <div class="custom-page locations-page">
    <header class="cp-page-header">
      <h1 class="cp-page-title">{{ $t('pageLocationsTitle') }}</h1>
    </header>

    <b-tabs class="lc-tabs" nav-class="lc-tabs-nav" v-model="tabIndex">
      <!-- All locations in a table -->
      <b-tab>
        <template #title><i class="fa-solid fa-location-dot lc-tab-icon" aria-hidden="true" />List</template>
        <div class="lc-tab-panel">
          <LocationTable :getData="getData"
                         :getIds="getIds"
                         :downloadTable="downloadData"
                         v-on:data-changed="onDataChanged" />
        </div>
      </b-tab>

      <!-- The maps, built when first opened (they need their size) -->
      <b-tab lazy>
        <template #title><i class="fa-solid fa-map lc-tab-icon" aria-hidden="true" />{{ $t('pageLocationsMapsTitle') }}</template>
        <div class="lc-tab-panel">
          <div class="lc-maps" v-if="locationsWithLatLng && locationsWithLatLng.length > 0">
            <!-- Clustered location map -->
            <section class="lc-card">
              <header class="lc-card-head">
                <span class="lc-card-icon" aria-hidden="true"><i class="fa-solid fa-arrows-to-circle" /></span>
                <div>
                  <h2 class="lc-card-title">{{ $t('pageLocationsMapsClusteredTitle') }}</h2>
                  <p class="lc-card-text">{{ $t('pageLocationsMapsClusteredText') }}</p>
                </div>
              </header>
              <div class="lc-map">
                <LocationMap :locations="locationsWithLatLng" mapType="cluster" border="border-0" customLook v-on:map-loaded="map => { clusteredMap = map }" />
              </div>
            </section>

            <!-- Heatmapped location map -->
            <section class="lc-card">
              <header class="lc-card-head">
                <span class="lc-card-icon" aria-hidden="true"><i class="fa-solid fa-fire" /></span>
                <div>
                  <h2 class="lc-card-title">{{ $t('pageLocationsMapsHeatmappedTitle') }}</h2>
                  <p class="lc-card-text">{{ $t('pageLocationsMapsHeatmappedText') }}</p>
                </div>
              </header>
              <div class="lc-map">
                <LocationMap :locations="locationsWithLatLng" mapType="heatmap" border="border-0" customLook v-on:map-loaded="map => { heatmappedMap = map }" />
              </div>
            </section>
          </div>
          <p class="lc-loading" v-else-if="locations === null"><b-spinner small /></p>
        </div>
      </b-tab>
    </b-tabs>
  </div>
</template>

<script>
import LocationMap from '@/components/map/LocationMap'
import LocationTable from '@/components/tables/LocationTable'
import { apiPostLocationTable, apiPostLocationTableIds } from '@/mixins/api/location.js'
import { apiPostTableExport } from '@/mixins/api/misc.js'
import { MAX_JAVA_INTEGER } from '@/mixins/api/base'

export default {
  data: function () {
    return {
      tabIndex: 0,
      locations: null,
      clusteredMap: null,
      heatmappedMap: null,
      synced: false
    }
  },
  computed: {
    locationsWithLatLng: function () {
      if (this.locations) {
        return this.locations.filter(l => l.locationLatitude !== undefined && l.locationLatitude !== null && l.locationLongitude !== undefined && l.locationLongitude !== null)
      } else {
        return []
      }
    }
  },
  watch: {
    clusteredMap: function () {
      this.syncMaps()
    },
    heatmappedMap: function () {
      this.syncMaps()
    }
  },
  components: {
    LocationMap,
    LocationTable
  },
  methods: {
    // Both maps move together
    syncMaps: function () {
      if (this.synced === false && this.clusteredMap && this.heatmappedMap) {
        this.synced = true
        this.clusteredMap.sync(this.heatmappedMap)
        this.heatmappedMap.sync(this.clusteredMap)
      }
    },
    getData: function (data, callback) {
      return apiPostLocationTable(data, callback)
    },
    downloadData: function (data, callback) {
      return apiPostTableExport({ filter: data.filter }, 'location', callback)
    },
    getIds: function (data, callback) {
      return apiPostLocationTableIds(data, callback)
    },
    onDataChanged: function (request) {
      // The locations for the maps, loaded once (all of them, not only the page of the table)
      if (!this.locations) {
        // Create a custom request based on the one from the table, but change limit and page to get all the locations
        const customRequest = Object.assign({}, request)
        customRequest.limit = MAX_JAVA_INTEGER
        customRequest.page = 1
        apiPostLocationTable(customRequest, result => {
          this.locations = result.data
        })
      }
    }
  }
}
</script>

<style src="@/assets/custom-page.css"></style>
<style scoped>
.locations-page {
  padding: 0.5rem 0 3rem;
}
/* Tabs: as on the germplasm page */
.lc-tabs {
  margin-top: 2.25rem;
}
.lc-tabs >>> .lc-tabs-nav {
  flex-wrap: wrap;
  border-bottom: 1px solid var(--cp-border);
}
.lc-tabs >>> .lc-tabs-nav .nav-link {
  display: inline-flex;
  align-items: center;
  padding: 0.7rem 1.25rem;
  border: 1px solid transparent;
  border-radius: 10px 10px 0 0;
  color: var(--cp-muted);
  font-weight: 600;
  line-height: 1.5;
}
.lc-tabs >>> .lc-tabs-nav .nav-link:hover,
.lc-tabs >>> .lc-tabs-nav .nav-link:focus {
  border-color: transparent;
  color: var(--cp-text);
}
.lc-tabs >>> .lc-tabs-nav .nav-link.active,
body.dark-mode .lc-tabs >>> .lc-tabs-nav .nav-link.active,
body.dark-mode .lc-tabs >>> .lc-tabs-nav .nav-link.active:focus {
  border-color: var(--cp-border) var(--cp-border) var(--cp-surface);
  background: var(--cp-surface);
  color: var(--cp-text);
}
.lc-tab-icon {
  width: 1.1em;
  margin-right: 0.5rem;
  font-size: 0.95em;
  line-height: 1;
  text-align: center;
}
/* The icon of the active tab in the green of the icons of the sidebar menu */
.lc-tabs >>> .lc-tabs-nav .nav-link.active .lc-tab-icon {
  color: var(--cp-green);
}
.lc-tab-panel {
  margin-top: 1.25rem;
}

/* The two maps side by side (one below the other on smaller screens) */
.lc-maps {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}
@media (max-width: 1199px) {
  .lc-maps {
    grid-template-columns: minmax(0, 1fr);
  }
}
/* Blocks: rounded, the icon in a soft green square beside the title. The head and the map of both blocks share the rows
   of the grid (subgrid), so both maps start at the same height whatever the length of the texts (and the heatmap has
   its colour gradient below the map). */
.lc-card {
  display: grid;
  grid-row: span 2;
  grid-template-rows: subgrid;
  row-gap: 0;
  overflow: hidden;
  border: 1px solid var(--cp-border);
  border-radius: 16px;
  background: var(--cp-surface);
  box-shadow: 0 1px 2px var(--cp-shadow);
  font-family: 'DM Sans', -apple-system, 'Segoe UI', Roboto, sans-serif;
}
.lc-card-head {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  padding: 1.25rem;
}
.lc-card-icon {
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
.lc-card-title {
  margin: 0.1rem 0 0.3rem;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--cp-text);
}
.lc-card-text {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.55;
  color: var(--cp-muted);
}
.lc-map {
  border-top: 1px solid var(--cp-border);
}
.lc-loading {
  color: var(--cp-muted);
}
</style>
