<template>
  <!-- Marked items in the look of the custom pages: one tab per type (germplasm, markers, locations) with its Font Awesome
       icon and the number of marked items, the table of that type inside the tab. A type without marked items has its
       tab disabled and its table is not built (nothing is loaded). -->
  <div class="custom-page marked-items-page">
    <header class="cp-page-header">
      <h1 class="cp-page-title">{{ $t('pageMarkedItemsTitle') }}</h1>
    </header>

    <h2 class="mi-unknown" v-if="unknownType">{{ $t('pageMarkedItemsUnknownType') }}</h2>

    <b-tabs class="mi-tabs" nav-class="mi-tabs-nav" v-model="tabIndex" v-else>
      <!-- Germplasm -->
      <b-tab :disabled="count('germplasm') === 0">
        <template #title>
          <i class="fa-solid fa-seedling mi-tab-icon" aria-hidden="true" />{{ markedItemTypes.germplasm.text() }}
          <span class="mi-tab-count">{{ count('germplasm') }}</span>
        </template>
        <div class="mi-tab-panel" v-if="count('germplasm') > 0">
          <GermplasmTable :getData="getGermplasmData" :getIds="getGermplasmIds" :downloadTable="downloadGermplasm" ref="germplasmTable" />

          <div class="mi-extras" v-if="genesysAvailable || (externalIdentifiers && externalIdentifiers.length > 0 && externalLink)">
            <router-link class="mi-button is-primary" :to="{ name: pages.genesysRequest }" v-if="genesysAvailable">
              <i class="fa-solid fa-cart-shopping" aria-hidden="true" /> {{ $t('buttonGoToGenesysOrdering') }}
            </router-link>
            <div class="mi-external" v-if="externalIdentifiers && externalIdentifiers.length > 0 && externalLink">
              <span class="mi-external-title">{{ $t('pageMarkedGermplasmExportTitle') }}</span>
              <a :href="externalLink" target="_blank" rel="noopener noreferrer" class="mi-external-link">
                {{ $t('pageMarkedGermplasmExportText') }} <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </b-tab>

      <!-- Markers -->
      <b-tab :disabled="count('markers') === 0">
        <template #title>
          <i class="fa-solid fa-dna mi-tab-icon" aria-hidden="true" />{{ markedItemTypes.markers.text() }}
          <span class="mi-tab-count">{{ count('markers') }}</span>
        </template>
        <div class="mi-tab-panel" v-if="count('markers') > 0">
          <MarkerTable :getData="getMarkerData" :getIds="getMarkerIds" :downloadTable="downloadMarkers" ref="markerTable" />
        </div>
      </b-tab>

      <!-- Locations -->
      <b-tab :disabled="count('locations') === 0">
        <template #title>
          <i class="fa-solid fa-map-location-dot mi-tab-icon" aria-hidden="true" />{{ markedItemTypes.locations.text() }}
          <span class="mi-tab-count">{{ count('locations') }}</span>
        </template>
        <div class="mi-tab-panel" v-if="count('locations') > 0">
          <LocationTable :getData="getLocationData" :getIds="getLocationIds" :downloadTable="downloadLocations" ref="locationTable" />
        </div>
      </b-tab>
    </b-tabs>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import GermplasmTable from '@/components/tables/GermplasmTable'
import LocationTable from '@/components/tables/LocationTable'
import MarkerTable from '@/components/tables/MarkerTable'
import { apiPostGermplasmTable, apiPostGermplasmTableIds, apiPostExternalLinkIdentifiers } from '@/mixins/api/germplasm'
import { apiPostMarkerTable, apiPostMarkerTableIds } from '@/mixins/api/genotype'
import { apiPostLocationTable, apiPostLocationTableIds } from '@/mixins/api/location'
import { apiGetGenesysAvailable, apiPostTableExport } from '@/mixins/api/misc'
import { markedItemTypes } from '@/mixins/types'

import { Pages } from '@/mixins/pages'

// The order of the tabs: the key of the type (URL, store) per tab index
const TAB_TYPES = ['germplasm', 'markers', 'locations']

export default {
  name: 'marked-item-view',
  data: function () {
    return {
      markedItemTypes,
      tabIndex: 0,
      unknownType: false,
      externalIdentifiers: null,
      isPopup: false,
      genesysAvailable: false,
      pages: Pages
    }
  },
  props: {
    itemType: {
      type: String,
      default: 'germplasm'
    }
  },
  watch: {
    tabIndex: function (newValue) {
      // Update the URL
      if (this.isPopup === false && TAB_TYPES[newValue]) {
        window.history.replaceState({}, null, this.$router.resolve({ name: Pages.markedItemsType, params: { itemType: TAB_TYPES[newValue] } }).href)
      }
    },
    storeMarkedGermplasm: function () {
      if (this.$refs.germplasmTable) {
        this.$refs.germplasmTable.refresh()
      }
      this.updateExternalIdentifiers()
    },
    storeMarkedMarkers: function () {
      if (this.$refs.markerTable) {
        this.$refs.markerTable.refresh()
      }
    },
    storeMarkedLocations: function () {
      if (this.$refs.locationTable) {
        this.$refs.locationTable.refresh()
      }
    }
  },
  computed: {
    ...mapGetters([
      'storeServerSettings',
      'storeMarkedGermplasm',
      'storeMarkedMarkers',
      'storeMarkedLocations',
      'storeMarkedIds'
    ]),
    externalLink: function () {
      if (this.storeServerSettings && this.storeServerSettings.externalLinkTemplate && this.externalIdentifiers) {
        return this.storeServerSettings.externalLinkTemplate.replace('{identifiers}', this.externalIdentifiers.join(','))
      } else {
        return null
      }
    }
  },
  components: {
    GermplasmTable,
    LocationTable,
    MarkerTable
  },
  methods: {
    // The number of marked items of a type, for the tab
    count: function (type) {
      return (this.storeMarkedIds && this.storeMarkedIds[type]) ? this.storeMarkedIds[type].length : 0
    },
    getGermplasmData: function (data, callback) {
      data = this.adjustFilter(data, 'germplasmId', 'germplasm')
      return apiPostGermplasmTable(data, callback)
    },
    getGermplasmIds: function (data, callback) {
      data = this.adjustFilter(data, 'germplasmId', 'germplasm')
      return apiPostGermplasmTableIds(data, callback)
    },
    downloadGermplasm: function (data, callback) {
      data = this.adjustFilter(data, 'germplasmId', 'germplasm')
      return apiPostTableExport({ filter: data.filter }, 'germplasm', callback)
    },
    getMarkerData: function (data, callback) {
      data = this.adjustFilter(data, 'markerId', 'markers')
      return apiPostMarkerTable(data, callback)
    },
    getMarkerIds: function (data, callback) {
      data = this.adjustFilter(data, 'markerId', 'markers')
      return apiPostMarkerTableIds(data, callback)
    },
    downloadMarkers: function (data, callback) {
      data = this.adjustFilter(data, 'markerId', 'markers')
      return apiPostTableExport({ filter: data.filter }, 'marker', callback)
    },
    getLocationData: function (data, callback) {
      data = this.adjustFilter(data, 'locationId', 'locations')
      return apiPostLocationTable(data, callback)
    },
    getLocationIds: function (data, callback) {
      data = this.adjustFilter(data, 'locationId', 'locations')
      return apiPostLocationTableIds(data, callback)
    },
    downloadLocations: function (data, callback) {
      data = this.adjustFilter(data, 'locationId', 'locations')
      return apiPostTableExport({ filter: data.filter }, 'location', callback)
    },
    adjustFilter: function (data, id, type) {
      const newData = JSON.parse(JSON.stringify(data))

      if (!newData.filter) {
        newData.filter = []
      }
      newData.filter.unshift({
        column: id,
        comparator: 'inSet',
        operator: 'and',
        values: this.storeMarkedIds[type]
      })

      return newData
    },
    updateExternalIdentifiers: function () {
      if (this.storeServerSettings && this.storeServerSettings.externalLinkIdentifier && this.storeServerSettings.externalLinkTemplate) {
        const ids = this.storeMarkedGermplasm

        if (this.storeServerSettings.externalLinkIdentifier !== 'id') {
          apiPostExternalLinkIdentifiers(ids, result => {
            this.externalIdentifiers = result
          })
        } else {
          this.externalIdentifiers = ids
        }
      }
    }
  },
  created: function () {
    // The type from the URL (page) or from the prop (popup of a table)
    const urlParam = this.$route.params.itemType
    let type = null

    if (urlParam) {
      type = urlParam
      this.isPopup = false
    } else if (this.itemType) {
      type = this.itemType
      this.isPopup = true
    }

    const index = TAB_TYPES.indexOf(type)
    if (index !== -1) {
      // The requested type, or the first type with marked items when it has none (its tab is disabled)
      const first = TAB_TYPES.findIndex(t => this.count(t) > 0)
      this.tabIndex = (this.count(type) > 0 || first === -1) ? index : first
    } else if (type) {
      this.unknownType = true
    }
  },
  mounted: function () {
    this.updateExternalIdentifiers()

    apiGetGenesysAvailable(available => {
      this.genesysAvailable = available
    })
  }
}
</script>

<style src="@/assets/custom-page.css"></style>
<style scoped>
.marked-items-page {
  padding: 0.5rem 0 3rem;
}
.mi-unknown {
  margin: 2.25rem 0.75rem 0;
  font-size: 1.3rem;
  color: var(--cp-muted);
}
/* Tabs: as on the germplasm page */
.mi-tabs {
  margin-top: 2.25rem;
}
.mi-tabs >>> .mi-tabs-nav {
  flex-wrap: wrap;
  border-bottom: 1px solid var(--cp-border);
}
.mi-tabs >>> .mi-tabs-nav .nav-link {
  display: inline-flex;
  align-items: center;
  padding: 0.7rem 1.25rem;
  border: 1px solid transparent;
  border-radius: 10px 10px 0 0;
  color: var(--cp-muted);
  font-weight: 600;
  line-height: 1.5;
}
.mi-tabs >>> .mi-tabs-nav .nav-link:hover,
.mi-tabs >>> .mi-tabs-nav .nav-link:focus {
  border-color: transparent;
  color: var(--cp-text);
}
.mi-tabs >>> .mi-tabs-nav .nav-link.active,
body.dark-mode .mi-tabs >>> .mi-tabs-nav .nav-link.active,
body.dark-mode .mi-tabs >>> .mi-tabs-nav .nav-link.active:focus {
  border-color: var(--cp-border) var(--cp-border) var(--cp-surface);
  background: var(--cp-surface);
  color: var(--cp-text);
}
.mi-tab-icon {
  width: 1.1em;
  margin-right: 0.5rem;
  font-size: 0.95em;
  line-height: 1;
  text-align: center;
}
/* The icon of the active tab in the green of the icons of the sidebar menu */
.mi-tabs >>> .mi-tabs-nav .nav-link.active .mi-tab-icon {
  color: var(--cp-green);
}
/* The number of marked items: a small pill beside the name */
.mi-tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.6rem;
  height: 1.35rem;
  margin-left: 0.55rem;
  padding: 0 0.45rem;
  border-radius: 999px;
  background: var(--cp-border);
  color: var(--cp-text-subtle);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
}
/* A tab without marked items: disabled, faded */
.mi-tabs >>> .mi-tabs-nav .nav-link.disabled {
  color: var(--cp-muted);
  opacity: 0.5;
  cursor: not-allowed;
}
.mi-tabs >>> .mi-tabs-nav .nav-link.active .mi-tab-count {
  background: var(--cp-green-soft);
  color: var(--cp-green);
}
.mi-tab-panel {
  margin-top: 2rem;
}
/* Below the germplasm table: Genesys ordering and the external link */
.mi-extras {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem 1.5rem;
  margin-top: 1.25rem;
  padding: 1.1rem 1.25rem;
  border: 1px solid var(--cp-border);
  border-radius: 16px;
  background: var(--cp-surface);
}
.mi-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 42px;
  padding: 0 1.25rem;
  border: 1px solid var(--cp-button);
  border-radius: 10px;
  background: var(--cp-button);
  color: var(--cp-on-button);
  font-size: 0.95rem;
  font-weight: 500;
}
.mi-button:hover,
.mi-button:focus {
  border-color: var(--cp-button-hover);
  background: var(--cp-button-hover);
  color: var(--cp-on-button);
  text-decoration: none;
}
.mi-external {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.mi-external-title {
  font-weight: 600;
  color: var(--cp-text);
}
.mi-external-link {
  color: var(--cp-green);
}
.mi-external-link i {
  font-size: 0.8em;
}
</style>
