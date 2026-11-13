<template>
  <!-- Maps in the look of the custom pages: a List tab with the table and, once a map is selected, its Map details tab
       (the markers, the histogram and the export below each other); its cross closes the map -->
  <div ref="container" id="map-container" class="custom-page maps-page">
    <header class="cp-page-header">
      <h1 class="cp-page-title">{{ $t('pageMapsTitle') }}</h1>
    </header>

    <b-tabs class="mp-tabs" nav-class="mp-tabs-nav" v-model="tabIndex">
      <!-- All maps -->
      <b-tab>
        <template #title><i class="fa-solid fa-align-justify fa-rotate-90 mp-tab-icon" aria-hidden="true" />{{ $t('genericList') }}</template>
        <div class="mp-tab-panel">
          <MapTable :getData="getMapData" modernLook v-on:map-selected="onMapSelected" />
        </div>
      </b-tab>

      <!-- The selected map: its markers and their positions -->
      <!-- Always there, hidden and disabled while nothing is selected: created with the page, b-tabs keeps it after the
           List tab (a tab added later may be put first) -->
      <b-tab :disabled="!mapId" :title-item-class="mapId ? null : 'd-none'">
        <template #title>
          <i class="fa-solid fa-dna mp-tab-icon" aria-hidden="true" />{{ $t('pageMapsDetailsTab') }}
          <span class="mp-tab-close" role="button" tabindex="0" :title="$t('buttonClose')" :aria-label="$t('buttonClose')"
                @click.stop.prevent="closeMap" @keydown.enter.stop.prevent="closeMap"><i class="fa-solid fa-xmark" aria-hidden="true" /></span>
        </template>
        <div class="mp-tab-panel" v-if="mapId">
          <p class="mp-loading" v-if="!map"><b-spinner small /></p>
          <template v-else>
            <h2 class="mp-map-name">{{ mapName }}</h2>
            <p class="mp-text">{{ $t('pageMapsDetailsText') }}</p>
            <MapDefinitionTable :filterOn="filter" :getData="getMapDefinitionData" :getIds="getMapDefinitionIds" ref="mapDefinitionTable" />

            <!-- Blocks as on the other custom pages (the maps of the locations page): the icon in a soft green square
                 beside the title and its text, the content below a line -->
            <!-- Density of the markers on each chromosome; a selection goes to the export options below -->
            <section class="mp-card">
              <header class="mp-card-head">
                <span class="mp-card-icon" aria-hidden="true"><i class="fa-solid fa-chart-column" /></span>
                <div>
                  <h3 class="mp-card-title">{{ $t('pageMapsHistogramTitle') }}</h3>
                  <p class="mp-card-text">{{ $t('pageMapsHistogramText') }}</p>
                  <p class="mp-card-text is-note"><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ $t('pageMapsHistogramInfo') }}</p>
                </div>
              </header>
              <div class="mp-card-body">
                <MapChart :mapId="mapId" ref="mapChart" v-on:points-selected="onPointsSelected" />
              </div>
            </section>

            <!-- Export of the map, complete or a subset -->
            <section class="mp-card">
              <header class="mp-card-head">
                <span class="mp-card-icon" aria-hidden="true"><i class="fa-solid fa-download" /></span>
                <div>
                  <h3 class="mp-card-title">{{ $t('pageMapExportDownloadTitle') }}</h3>
                  <p class="mp-card-text"><span v-html="$t('pageExportFormatsGenotypeText')" />&nbsp;<router-link :to="{ name: Pages.aboutExportFormatsType, params: { format: 'genotype' } }" v-b-tooltip.hover :title="$t('tooltipExportFormatLearnMore')"><i class="fa-solid fa-circle-info" aria-hidden="true" /></router-link></p>
                </div>
              </header>
              <div class="mp-card-body">
                <b-form-group :label="$t('formLabelMapExportDownloadText')" label-for="export-options-enabled">
                  <b-form-checkbox id="export-options-enabled" v-model="useAdvancedExportOptions" switch>
                    {{ useAdvancedExportOptions ? $t('genericYes') : $t('genericNo') }}
                  </b-form-checkbox>
                </b-form-group>
                <!-- Advanced export options -->
                <MapExportSelection :mapId="mapId" v-show="useAdvancedExportOptions" ref="exportOptions" />

                <!-- Formats -->
                <h4 class="mp-subsection-title">{{ $t('pageMapExportDownloadFormatTitle') }}</h4>
                <div class="mp-formats">
                  <button type="button" class="mp-format" @click="exportMap('flapjack')">
                    <img :src="`./img/${exportFormats.flapjack.logo}`" alt="Flapjack logo" />
                    <span>{{ $t('pageMapExportDownloadFlapjackFormat') }}</span>
                    <i class="fa-solid fa-download" aria-hidden="true" />
                  </button>
                  <button type="button" class="mp-format" @click="exportMap('strudel')">
                    <img :src="`./img/${exportFormats.strudel.logo}`" alt="Strudel logo" />
                    <span>{{ $t('pageMapExportDownloadStrudelFormat') }}</span>
                    <i class="fa-solid fa-download" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </section>
          </template>
        </div>
      </b-tab>
    </b-tabs>
  </div>
</template>

<script>
import MapChart from '@/components/charts/MapChart'
import MapTable from '@/components/tables/MapTable'
import MapDefinitionTable from '@/components/tables/MapDefinitionTable'
import MapExportSelection from '@/components/export/MapExportSelection'
import { apiPostMapsTable, apiPostMapdefinitionTable, apiPostMapdefinitionTableIds, apiGetMap, apiPostMapExport } from '@/mixins/api/genotype.js'
import { exportFormats } from '@/mixins/types.js'
import { downloadBlob } from '@/mixins/util'

import { Pages } from '@/mixins/pages'

const emitter = require('tiny-emitter/instance')

// Index of the Map details tab
const TAB_DETAILS = 1

export default {
  data: function () {
    return {
      Pages,
      exportFormats,
      tabIndex: 0,
      mapId: null,
      map: null,
      // The map the histogram was drawn for (drawn once the Map details tab is shown)
      chartMapId: null,
      useAdvancedExportOptions: false
    }
  },
  computed: {
    filter: function () {
      return [{
        column: {
          name: 'mapId',
          type: Number
        },
        comparator: 'equals',
        operator: 'and',
        canBeChanged: false,
        values: [this.mapId]
      }]
    },
    mapName: function () {
      return this.map ? (this.map.name || this.map.mapName) : null
    }
  },
  watch: {
    // Back and forward in the browser
    '$route.params.mapId': function (newValue) {
      if (!newValue) {
        if (this.mapId) {
          this.closeMap()
        }
      } else if (`${newValue}` !== `${this.mapId}`) {
        this.selectMap(parseInt(newValue))
      }
    },
    tabIndex: function (newValue) {
      if (newValue === TAB_DETAILS) {
        this.drawChart()
      }
    }
  },
  components: {
    MapChart,
    MapTable,
    MapDefinitionTable,
    MapExportSelection
  },
  methods: {
    exportMap: function (format) {
      let options = {
        format: format
      }
      if (this.useAdvancedExportOptions) {
        const customOptions = this.$refs.exportOptions.getExportOptions()

        if (!customOptions || !customOptions.method) {
          // TODO: Notification
          return
        } else {
          options = Object.assign({}, options, customOptions)
        }
      }

      emitter.emit('show-loading', true)
      apiPostMapExport(this.mapId, options, result => {
        downloadBlob({
          blob: result,
          filename: 'map-' + this.mapId,
          extension: format === 'flapjack' ? 'map' : 'strudel'
        })
        emitter.emit('show-loading', false)
      })
    },
    getMapData: function (data, callback) {
      return apiPostMapsTable(data, callback)
    },
    getMapDefinitionData: function (data, callback) {
      return apiPostMapdefinitionTable(data, callback)
    },
    getMapDefinitionIds: function (data, callback) {
      return apiPostMapdefinitionTableIds(data, callback)
    },
    onMapSelected: function (mapId) {
      this.selectMap(mapId)
    },
    // The histogram of the selected map, once the Map details tab is shown (Plotly needs its width)
    drawChart: function () {
      this.$nextTick(() => {
        if (this.$refs.mapChart && this.chartMapId !== this.mapId) {
          this.chartMapId = this.mapId
          this.$refs.mapChart.redraw()
        }
      })
    },
    // A selection in the histogram: added to the export options below it
    onPointsSelected: function (chromosome, start, end) {
      this.useAdvancedExportOptions = true

      this.$nextTick(() => {
        this.$refs.exportOptions.addRegion({
          chromosome: chromosome,
          start: Math.floor(start),
          end: Math.ceil(end)
        })
      })
    },
    // Back to the list: the tabs of the map go away
    closeMap: function () {
      this.tabIndex = 0
      this.mapId = null
      this.map = null
      this.chartMapId = null
      this.useAdvancedExportOptions = false
      if (this.$route.params.mapId) {
        // Without the page, sorting and filter of the markers table of the map
        const query = Object.assign({}, this.$route.query)
        Object.keys(query).filter(key => key.startsWith('mapDefinitions-')).forEach(key => delete query[key])
        this.$router.push({ name: Pages.maps, query })
      }
    },
    selectMap: function (mapId) {
      this.mapId = mapId
      this.map = null
      this.chartMapId = null
      this.useAdvancedExportOptions = false

      // Update the URL to reflect the newly selected map
      if (`${this.$route.params.mapId}` !== `${mapId}`) {
        this.$router.push({ name: Pages.mapDetails, params: { mapId: mapId }, query: this.$route.query })
      }

      // The Map details tab, once it exists, in focus; the page stays at the top
      // After b-tabs registered the new tab (added in the same tick as the selection)
      setTimeout(() => {
        this.tabIndex = TAB_DETAILS
        this.$nextTick(() => {
          const tab = this.$el.querySelector('.mp-tabs-nav .nav-link.active')
          if (tab) {
            tab.focus({ preventScroll: true })
          }
        })
      }, 0)

      apiGetMap(mapId, result => {
        if (result && result.data && result.data.length > 0 && this.mapId === mapId) {
          this.map = result.data[0]
          this.$nextTick(() => {
            if (this.$refs.mapDefinitionTable) {
              this.$refs.mapDefinitionTable.refresh()
            }
            if (this.tabIndex === TAB_DETAILS) {
              this.drawChart()
            }
          })
        }
      })
    }
  },
  mounted: function () {
    if (this.$route.params && this.$route.params.mapId) {
      this.selectMap(parseInt(this.$route.params.mapId))
    }
  }
}
</script>

<style src="@/assets/custom-page.css"></style>
<style scoped>
#map-container {
  position: relative;
}
.maps-page {
  padding: 0.5rem 0 3rem;
}
/* Tabs: as on the publications page */
.mp-tabs {
  margin-top: 2.25rem;
}
.mp-tabs >>> .mp-tabs-nav {
  flex-wrap: wrap;
  border-bottom: 1px solid var(--cp-border);
}
.mp-tabs >>> .mp-tabs-nav .nav-link {
  display: inline-flex;
  align-items: center;
  padding: 0.7rem 1.25rem;
  border: 1px solid transparent;
  border-radius: 10px 10px 0 0;
  color: var(--cp-muted);
  font-weight: 600;
  line-height: 1.5;
}
.mp-tabs >>> .mp-tabs-nav .nav-link:hover,
.mp-tabs >>> .mp-tabs-nav .nav-link:focus {
  border-color: transparent;
  color: var(--cp-text);
}
.mp-tabs >>> .mp-tabs-nav .nav-link.active,
body.dark-mode .mp-tabs >>> .mp-tabs-nav .nav-link.active,
body.dark-mode .mp-tabs >>> .mp-tabs-nav .nav-link.active:focus {
  border-color: var(--cp-border) var(--cp-border) var(--cp-surface);
  background: var(--cp-surface);
  color: var(--cp-text);
}
.mp-tab-icon {
  width: 1.1em;
  margin-right: 0.5rem;
  font-size: 0.95em;
  line-height: 1;
  text-align: center;
}
.mp-tabs >>> .mp-tabs-nav .nav-link.active .mp-tab-icon {
  color: var(--cp-green);
}
/* The cross of the Map details tab */
.mp-tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.4rem;
  margin: 0 -0.4rem 0 0.6rem;
  border-radius: 6px;
  color: var(--cp-muted);
  font-size: 0.85rem;
  cursor: pointer;
}
.mp-tab-close:hover,
.mp-tab-close:focus {
  background: var(--cp-surface-hover);
  color: #dc3545;
  outline: none;
}
body.dark-mode .mp-tab-close:hover,
body.dark-mode .mp-tab-close:focus {
  color: #f07b86;
}
.mp-tab-panel {
  margin-top: 2rem;
}
.mp-loading {
  color: var(--cp-muted);
}
.mp-map-name {
  margin: 0 0 0.5rem;
  color: var(--cp-text);
  font-size: 1.4rem;
  font-weight: 700;
}
.mp-text {
  margin: 0 0 1.25rem;
  color: var(--cp-text-subtle);
}
.mp-note {
  margin: 0 0 1.25rem;
  color: var(--cp-muted);
  font-size: 0.9rem;
}
.mp-note a {
  color: var(--cp-green);
}
/* Blocks (as the maps of the locations page): rounded, the icon in a soft green square beside the title */
.mp-card {
  margin-top: 1.5rem;
  overflow: hidden;
  border: 1px solid var(--cp-border);
  border-radius: 16px;
  background: var(--cp-surface);
  box-shadow: 0 1px 2px var(--cp-shadow);
}
.mp-card:first-of-type {
  margin-top: 2.5rem;
}
.mp-card-head {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  padding: 1.25rem;
}
.mp-card-icon {
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
.mp-card-title {
  margin: 0.1rem 0 0.3rem;
  color: var(--cp-text);
  font-size: 1.2rem;
  font-weight: 600;
}
.mp-card-text {
  margin: 0;
  color: var(--cp-muted);
  font-size: 0.9rem;
  line-height: 1.55;
}
.mp-card-text.is-note {
  margin-top: 0.35rem;
}
.mp-card-text a {
  color: var(--cp-green);
}
.mp-card-body {
  padding: 1.25rem;
  border-top: 1px solid var(--cp-border);
}
.mp-subsection-title {
  margin: 1.5rem 0 0.75rem;
  color: var(--cp-text);
  font-size: 0.98rem;
  font-weight: 700;
}
/* Formats: one card each, the logo, the name and the download icon */
.mp-formats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.75rem;
}
.mp-format {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--cp-border);
  border-radius: 12px;
  background: var(--cp-surface);
  color: var(--cp-text);
  font: inherit;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.mp-format:hover,
.mp-format:focus {
  border-color: var(--cp-green);
  background: var(--cp-surface-hover);
  outline: none;
}
.mp-format img {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  object-fit: contain;
}
.mp-format span {
  flex: 1 1 auto;
}
.mp-format .fa-download {
  color: var(--cp-green);
}
</style>
