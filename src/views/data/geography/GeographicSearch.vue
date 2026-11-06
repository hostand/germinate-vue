<template>
  <!-- Geographic search in the look of the custom pages: the title with the Run query button on its right, the point and
       polygon search in tabs. Once a query has run, the map collapses (it can be opened again) and the results are shown
       below it in tabs (germplasm, locations). -->
  <div class="custom-page geographic-search-page">
    <header class="cp-page-header gs-header">
      <h1 class="cp-page-title">{{ $t('pageGeographicSearchTitle') }}</h1>
      <!-- Enabled only once the map of the current tab has a point or a polygon -->
      <button type="button" class="gs-run" :disabled="!canQuery" @click="query">
        <i class="fa-solid fa-play" aria-hidden="true" /> {{ $t('pageGeographicSearchButtonRun') }}
      </button>
    </header>

    <b-tabs class="gs-tabs" nav-class="gs-tabs-nav" v-model="tabIndex">
      <!-- Point search -->
      <b-tab>
        <template #title><i class="fa-solid fa-location-crosshairs gs-tab-icon" aria-hidden="true" />{{ $t('pageGeographicSearchPointSearchTitle') }}</template>
        <div class="gs-tab-panel">
          <section class="gs-card">
            <header :class="['gs-card-head', { 'is-toggle': point }]" @click="point && togglePointMap()">
              <span class="gs-card-icon" aria-hidden="true"><i class="fa-solid fa-location-crosshairs" /></span>
              <p class="gs-card-text">{{ $t('pageGeographicSearchPointSearchText') }}</p>
              <span class="gs-card-chevron" v-if="point" aria-hidden="true"><i :class="['fa-solid', pointMapOpen ? 'fa-chevron-up' : 'fa-chevron-down']" /></span>
            </header>
            <b-collapse v-model="pointMapOpen" @shown="updatePointMap">
              <div class="gs-map">
                <LocationMap selectionMode="point" @point-placed="pointPlaced = true" ref="pointMap" border="border-0" customLook />
              </div>
            </b-collapse>
          </section>

          <!-- Results, ordered by distance -->
          <section class="gs-results" v-if="point">
            <h2 class="gs-results-title">{{ $t('pageGeographicSearchResultsDistanceTitle') }}</h2>
            <b-tabs class="gs-tabs" nav-class="gs-tabs-nav">
              <b-tab>
                <template #title><i class="fa-solid fa-seedling gs-tab-icon" aria-hidden="true" />{{ $t('groupTypeGerminatebase') }}</template>
                <div class="gs-tab-panel">
                  <GermplasmTable tableMode="distance" :getData="getGermplasmPointData" :getIds="getGermplasmPointIds" ref="germplasmPointTable" orderBy="distance" />
                </div>
              </b-tab>
              <b-tab>
                <template #title><i class="fa-solid fa-map-location-dot gs-tab-icon" aria-hidden="true" />{{ $t('groupTypeLocation') }}</template>
                <div class="gs-tab-panel">
                  <LocationTable tableMode="distance" :getData="getLocationPointData" :getIds="getLocationPointIds" ref="locationPointTable" orderBy="distance" />
                </div>
              </b-tab>
            </b-tabs>
          </section>
        </div>
      </b-tab>

      <!-- Polygon search -->
      <b-tab>
        <template #title><i class="fa-solid fa-draw-polygon gs-tab-icon" aria-hidden="true" />{{ $t('pageGeographicSearchPolygonSearchTitle') }}</template>
        <div class="gs-tab-panel">
          <section class="gs-card">
            <header :class="['gs-card-head', { 'is-toggle': hasPolygonResults }]" @click="hasPolygonResults && togglePolygonMap()">
              <span class="gs-card-icon" aria-hidden="true"><i class="fa-solid fa-draw-polygon" /></span>
              <p class="gs-card-text">{{ $t('pageGeographicSearchPolygonSearchText') }}</p>
              <span class="gs-card-chevron" v-if="hasPolygonResults" aria-hidden="true"><i :class="['fa-solid', polygonMapOpen ? 'fa-chevron-up' : 'fa-chevron-down']" /></span>
            </header>
            <b-collapse v-model="polygonMapOpen" @shown="updatePolygonMap">
              <div class="gs-map">
                <LocationMap selectionMode="polygon" :locations="polygonLocations" @polygons-changed="onPolygonsChanged" ref="polygonMap" border="border-0" customLook />
              </div>
            </b-collapse>
          </section>

          <!-- Results, inside the polygons -->
          <section class="gs-results" v-if="hasPolygonResults">
            <h2 class="gs-results-title">{{ $t('pageGeographicSearchResultsPolygonTitle') }}</h2>
            <b-tabs class="gs-tabs" nav-class="gs-tabs-nav">
              <b-tab>
                <template #title><i class="fa-solid fa-seedling gs-tab-icon" aria-hidden="true" />{{ $t('groupTypeGerminatebase') }}</template>
                <div class="gs-tab-panel">
                  <GermplasmTable :getData="getGermplasmPolygonData" :getIds="getGermplasmPolygonIds" ref="germplasmPolygonTable" />
                </div>
              </b-tab>
              <b-tab>
                <template #title><i class="fa-solid fa-map-location-dot gs-tab-icon" aria-hidden="true" />{{ $t('groupTypeLocation') }}</template>
                <div class="gs-tab-panel">
                  <LocationTable :getData="getLocationPolygonData" :getIds="getLocationPolygonIds" ref="locationPolygonTable" />
                </div>
              </b-tab>
            </b-tabs>
          </section>
        </div>
      </b-tab>
    </b-tabs>
  </div>
</template>

<script>
import GermplasmTable from '@/components/tables/GermplasmTable'
import LocationTable from '@/components/tables/LocationTable'
import LocationMap from '@/components/map/LocationMap'
import { apiPostGermplasmDistanceTable, apiPostGermplasmDistanceTableIds, apiPostGermplasmPolygonTable, apiPostGermplasmPolygonTableIds } from '@/mixins/api/germplasm.js'
import { apiPostLocationDistanceTable, apiPostLocationDistanceTableIds, apiPostLocationPolygonTable, apiPostLocationPolygonTableIds } from '@/mixins/api/location.js'
import { MAX_JAVA_INTEGER } from '@/mixins/api/base'

export default {
  data: function () {
    return {
      tabIndex: 0,
      // The searched point and polygons (the results are shown for them)
      point: null,
      polygons: null,
      polygonLocations: null,
      // Something on the maps (enables Run query)
      pointPlaced: false,
      polygonCount: 0,
      // The maps, collapsed once a query has run
      pointMapOpen: true,
      polygonMapOpen: true
    }
  },
  components: {
    GermplasmTable,
    LocationTable,
    LocationMap
  },
  computed: {
    hasPolygonResults: function () {
      return this.polygons !== null && this.polygons.length > 0
    },
    canQuery: function () {
      return this.tabIndex === 0 ? this.pointPlaced : this.polygonCount > 0
    }
  },
  watch: {
    tabIndex: function (newValue) {
      // The map of the tab needs its size once visible
      if (newValue === 0) {
        this.updatePointMap()
      } else {
        this.updatePolygonMap()
      }
    },
    polygons: function (newValue) {
      if (newValue && newValue.length > 0) {
        this.updatePolygonUrl(newValue)
      }
    },
    point: function (newValue) {
      if (newValue) {
        this.updatePointUrl(newValue)
      }
    }
  },
  methods: {
    updatePointUrl: async function (newValue) {
      const query = Object.assign({}, this.$route.query)
      query.latLng = `${newValue.lat.toFixed(6)},${newValue.lng.toFixed(6)}`

      await this.$router.replace({ query })
    },
    updatePolygonUrl: async function (newValue) {
      const query = Object.assign({}, this.$route.query)

      query.polygons = newValue.map(polygon => polygon.map(l => `${l.lat.toFixed(6)},${l.lng.toFixed(6)}`).join(';')).join('|')

      await this.$router.replace({ query })
    },
    onPolygonsChanged: function (polygons) {
      this.polygonCount = polygons ? polygons.length : 0
    },
    // Point search: ordered by the distance to the point
    getGermplasmPointData: function (data, callback) {
      data.latitude = this.point.lat
      data.longitude = this.point.lng
      return apiPostGermplasmDistanceTable(data, callback)
    },
    getGermplasmPointIds: function (data, callback) {
      return apiPostGermplasmDistanceTableIds(data, callback)
    },
    getLocationPointData: function (data, callback) {
      data.latitude = this.point.lat
      data.longitude = this.point.lng
      return apiPostLocationDistanceTable(data, callback)
    },
    getLocationPointIds: function (data, callback) {
      return apiPostLocationDistanceTableIds(data, callback)
    },
    // Polygon search: inside the polygons
    getGermplasmPolygonData: function (data, callback) {
      data.polygons = this.polygons
      return apiPostGermplasmPolygonTable(data, callback)
    },
    getGermplasmPolygonIds: function (data, callback) {
      return apiPostGermplasmPolygonTableIds(data, callback)
    },
    getLocationPolygonData: function (data, callback) {
      data.polygons = this.polygons

      // Get all locations within the polygon to draw them on the map
      const allData = JSON.parse(JSON.stringify(data))
      allData.page = 1
      allData.limit = MAX_JAVA_INTEGER
      apiPostLocationPolygonTable(allData, result => {
        this.polygonLocations = result.data
      })

      // Get the actual data for the table
      return apiPostLocationPolygonTable(data, callback)
    },
    getLocationPolygonIds: function (data, callback) {
      return apiPostLocationPolygonTableIds(data, callback)
    },
    query: function () {
      if (this.tabIndex === 0) {
        const latlngs = this.$refs.pointMap.getLatLngs()

        if (latlngs !== null && latlngs.length > 0) {
          this.point = latlngs[0]
          this.pointMapOpen = false
          this.$nextTick(() => {
            if (this.$refs.locationPointTable) {
              this.$refs.locationPointTable.refresh()
            }
            if (this.$refs.germplasmPointTable) {
              this.$refs.germplasmPointTable.refresh()
            }
          })
        } else {
          this.point = null
          this.$bvToast.toast(this.$t('toastGeographicSearchSelectPointText'), {
            title: this.$t('toastGeographicSearchSelectPointTitle'),
            variant: 'info',
            autoHideDelay: 5000,
            appendToast: true
          })
        }
      } else {
        this.polygons = this.$refs.polygonMap.getPolygons()

        if (this.polygons !== null && this.polygons.length > 0) {
          this.polygonMapOpen = false
          this.$nextTick(() => {
            if (this.$refs.locationPolygonTable) {
              this.$refs.locationPolygonTable.refresh()
            }
            if (this.$refs.germplasmPolygonTable) {
              this.$refs.germplasmPolygonTable.refresh()
            }
          })
        } else {
          this.$bvToast.toast(this.$t('toastGeographicSearchSelectPolygonText'), {
            title: this.$t('toastGeographicSearchSelectPolygonTitle'),
            variant: 'info',
            autoHideDelay: 5000,
            appendToast: true
          })
        }
      }
    },
    togglePointMap: function () {
      this.pointMapOpen = !this.pointMapOpen
    },
    togglePolygonMap: function () {
      this.polygonMapOpen = !this.polygonMapOpen
    },
    updatePointMap: function () {
      this.$nextTick(() => {
        if (this.$refs.pointMap) {
          this.$refs.pointMap.invalidateSize()
        }
      })
    },
    updatePolygonMap: function () {
      this.$nextTick(() => {
        if (this.$refs.polygonMap) {
          this.$refs.polygonMap.invalidateSize()
        }
      })
    }
  },
  mounted: function () {
    if (this.$route.query) {
      if (this.$route.query.tabIndex) {
        this.$nextTick(() => { this.tabIndex = +this.$route.query.tabIndex })
      }

      if (this.$route.query.polygons) {
        const polygons = this.$route.query.polygons.split('|').map(p => p.split(';').map(l => {
          const parts = l.split(',').map(p => +(p.trim()))

          return {
            lat: parts[0],
            lng: parts[1]
          }
        }))

        if (polygons.length > 0) {
          this.$nextTick(() => {
            this.$refs.polygonMap.setPolygons(polygons)
            this.polygonCount = polygons.length
            // On the polygon tab: the results right away
            if (+this.$route.query.tabIndex === 1) {
              this.$nextTick(() => this.query())
            }
          })
        }
      }

      if (this.$route.query.latLng) {
        const parts = this.$route.query.latLng.split(',').map(p => +(p.trim()))

        if (parts.length === 2) {
          const event = {
            latlng: {
              lat: parts[0],
              lng: parts[1]
            }
          }

          this.$nextTick(() => {
            // Trigger a click manually
            this.$refs.pointMap.onClick(event)
          })
        }
      }
    }
  }
}
</script>

<style src="@/assets/custom-page.css"></style>
<style scoped>
.geographic-search-page {
  padding: 0.5rem 0 3rem;
}
/* The title and Run query on one line, the button on the right */
.gs-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.gs-header .cp-page-title {
  margin-bottom: 0;
}
/* As low as the title, which has a margin above it */
.gs-run {
  margin-top: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  height: 44px;
  padding: 0 1.4rem;
  border: 1px solid var(--cp-button);
  border-radius: 10px;
  background: var(--cp-button);
  color: var(--cp-on-button);
  font: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
}
.gs-run:hover:not(:disabled),
.gs-run:focus:not(:disabled) {
  border-color: var(--cp-button-hover);
  background: var(--cp-button-hover);
}
.gs-run:disabled {
  border-color: var(--cp-border);
  background: var(--cp-border);
  color: var(--cp-muted);
  cursor: not-allowed;
}
.gs-run i {
  font-size: 0.85em;
}

/* Tabs: as on the germplasm page */
.gs-tabs {
  margin-top: 2.25rem;
}
.gs-results .gs-tabs {
  margin-top: 0.75rem;
}
.gs-tabs >>> .gs-tabs-nav {
  flex-wrap: wrap;
  border-bottom: 1px solid var(--cp-border);
}
.gs-tabs >>> .gs-tabs-nav .nav-link {
  display: inline-flex;
  align-items: center;
  padding: 0.7rem 1.25rem;
  border: 1px solid transparent;
  border-radius: 10px 10px 0 0;
  color: var(--cp-muted);
  font-weight: 600;
  line-height: 1.5;
}
.gs-tabs >>> .gs-tabs-nav .nav-link:hover,
.gs-tabs >>> .gs-tabs-nav .nav-link:focus {
  border-color: transparent;
  color: var(--cp-text);
}
.gs-tabs >>> .gs-tabs-nav .nav-link.active,
body.dark-mode .gs-tabs >>> .gs-tabs-nav .nav-link.active,
body.dark-mode .gs-tabs >>> .gs-tabs-nav .nav-link.active:focus {
  border-color: var(--cp-border) var(--cp-border) var(--cp-surface);
  background: var(--cp-surface);
  color: var(--cp-text);
}
.gs-tab-icon {
  width: 1.1em;
  margin-right: 0.5rem;
  font-size: 0.95em;
  line-height: 1;
  text-align: center;
}
/* The icon of the active tab in the green of the icons of the sidebar menu */
.gs-tabs >>> .gs-tabs-nav .nav-link.active .gs-tab-icon {
  color: var(--cp-green);
}
.gs-tab-panel {
  margin-top: 1.25rem;
}

/* The map in a rounded block, the explanation with an icon above it */
.gs-card {
  overflow: hidden;
  border: 1px solid var(--cp-border);
  border-radius: 16px;
  background: var(--cp-surface);
  box-shadow: 0 1px 2px var(--cp-shadow);
}
.gs-card-head {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 1.1rem 1.25rem;
}
.gs-card-head.is-toggle {
  cursor: pointer;
}
.gs-card-head.is-toggle:hover {
  background: var(--cp-surface-hover);
}
.gs-card-icon {
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
.gs-card-text {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--cp-text-subtle);
}
.gs-card-chevron {
  flex-shrink: 0;
  color: var(--cp-muted);
}
.gs-map {
  border-top: 1px solid var(--cp-border);
}

/* Results: a title, then the germplasm and locations tabs */
.gs-results {
  margin-top: 2rem;
}
.gs-results-title {
  margin: 0;
  padding: 0 0.25rem;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--cp-text);
}
</style>
