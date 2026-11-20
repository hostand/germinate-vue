<template>
  <!-- Climates in the look of the custom pages, as the traits page: a List tab (icon of Climates in the menu) with the
       table and, once a climate is selected (climates/:climateId), a tab of its own: the icon of its data type, its name,
       a cross that closes it -->
  <div class="custom-page climates-page">
    <!-- The images of the selected climate behind the top of the page (as on the traits page): blurred, from edge to
         edge, one after the other; faded out where the tabs start. Gone with another climate without images or when its
         tab is closed. -->
    <div class="tr-backdrop" v-if="climateId && images.length > 0" :style="backdropStyle" aria-hidden="true">
      <div v-for="(image, index) in images"
           :key="`cl-image-${image.imageId}`"
           :class="['tr-backdrop-image', { active: index === imageIndex }]"
           :style="{ backgroundImage: `url('${getImageSrc(image)}')` }" />
      <div class="tr-backdrop-veil" />
    </div>

    <header class="cp-page-header">
      <h1 class="cp-page-title">{{ $t('pageClimatesTitle') }}</h1>
    </header>

    <b-tabs class="tr-tabs" nav-class="tr-tabs-nav" v-model="tabIndex" ref="pageTabs">
      <!-- All climates -->
      <b-tab>
        <template #title><i class="fa-solid fa-cloud-sun-rain tr-tab-icon" aria-hidden="true" />{{ $t('genericList') }}</template>
        <div class="tr-tab-panel">
          <ClimateTable :getData="getData" ref="climateTable" />
        </div>
      </b-tab>

      <!-- The selected climate: the icon of its data type, then its name -->
      <!-- Always there, hidden and disabled while nothing is selected (as on the traits page) -->
      <b-tab :disabled="!climateId" :title-item-class="climateId ? null : 'd-none'">
        <template #title>
          <span class="tr-tab-icon tr-tab-type" v-if="climate && dataTypes[climate.dataType]" :style="{ color: dataTypes[climate.dataType].color() }"><MdiIcon :path="dataTypes[climate.dataType].path" /></span>
          <b-spinner small class="tr-tab-icon" v-else-if="!climate" />
          <span class="tr-tab-label">{{ climate ? climate.climateName : climateId }}</span>
          <span class="tr-tab-close" role="button" tabindex="0" :title="$t('buttonClose')" :aria-label="$t('buttonClose')"
                @click.stop.prevent="closeClimate" @keydown.enter.stop.prevent="closeClimate"><i class="fa-solid fa-xmark" aria-hidden="true" /></span>
        </template>
        <div class="tr-tab-panel" v-if="climateId">
          <!-- The number of images of the climate (loaded here for the backdrop): its Images tab when it has some -->
          <ClimateDetails :key="climateId" :imageCount="images.length" @climate-loaded="climate = $event" @images-changed="loadImages(climateId, true)" />
        </div>
      </b-tab>
    </b-tabs>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import MdiIcon from '@/components/icons/MdiIcon'
import ClimateTable from '@/components/tables/ClimateTable'
import { apiPostClimateTable } from '@/mixins/api/climate.js'
import { MAX_JAVA_INTEGER } from '@/mixins/api/base'
import { dataTypes } from '@/mixins/types'
import { apiPostImages } from '@/mixins/api/misc'
import { getImageUrl } from '@/mixins/image'
import { Pages } from '@/mixins/pages'

// The images of the backdrop: one after the other (as on the traits page)
const IMAGE_INTERVAL = 15000

export default {
  components: {
    MdiIcon,
    ClimateTable,
    // The content of the tab of a climate (its former page)
    ClimateDetails: () => import('@/views/data/climate/ClimateDetails')
  },
  data: function () {
    return {
      dataTypes,
      tabIndex: 0,
      // The selected climate (climates/:climateId): its id, then the climate once its tab loaded it (name, data type)
      climateId: null,
      climate: null,
      // The images of the selected climate (backdrop), the one shown, and where the tabs start (its height)
      images: [],
      imageIndex: 0,
      imageTimer: null,
      tabsTop: 0
    }
  },
  computed: {
    ...mapGetters([
      'storeToken'
    ]),
    // From above the page to 2.5rem below the top of the tabs: solid down to the tabs, the fade from there
    backdropStyle: function () {
      return this.tabsTop > 0 ? { height: `calc(${this.tabsTop}px + 1.75rem + 2.5rem)` } : null
    }
  },
  watch: {
    climateId: function (newValue) {
      this.loadImages(newValue)
    },
    // A climate selected in the table (its links go to climates/:climateId), back and forward in the browser
    '$route.params.climateId': function (newValue) {
      if (newValue) {
        this.selectClimate(parseInt(newValue))
      } else if (this.climateId) {
        this.closeClimate()
      }
    }
  },
  methods: {
    getImageSrc: function (image) {
      return getImageUrl(image.imagePath, {
        name: image.imagePath,
        token: this.storeToken ? this.storeToken.imageToken : null,
        type: 'database',
        size: 'large'
      })
    },
    // All the images of the climate (none without a climate), the newest first. Reloaded after a change (reload): the
    // images shown stay until the new ones arrive
    loadImages: function (climateId, reload) {
      this.stopImageTimer()
      if (!reload) {
        this.images = []
        this.imageIndex = 0
      }
      if (!climateId) {
        return
      }
      apiPostImages({
        page: 1,
        limit: MAX_JAVA_INTEGER,
        orderBy: 'createdOn',
        ascending: 0,
        filter: [{
          column: 'imageForeignId',
          comparator: 'equals',
          operator: 'and',
          values: [climateId]
        }, {
          column: 'imageRefTable',
          comparator: 'equals',
          operator: 'and',
          values: ['climates']
        }]
      }, result => {
        // Only for the climate still selected
        if (this.climateId !== climateId) {
          return
        }
        this.images = (result && result.data) || []
        if (this.imageIndex >= this.images.length) {
          this.imageIndex = 0
        }
        this.startImageTimer()
        this.measureTabs()
      })
    },
    startImageTimer: function () {
      this.stopImageTimer()
      if (this.images.length > 1) {
        this.imageTimer = setInterval(() => {
          this.imageIndex = (this.imageIndex + 1) % this.images.length
        }, IMAGE_INTERVAL)
      }
    },
    stopImageTimer: function () {
      if (this.imageTimer) {
        clearInterval(this.imageTimer)
        this.imageTimer = null
      }
    },
    // Where the tabs start, in the page (the end of the backdrop)
    measureTabs: function () {
      this.$nextTick(() => {
        const tabs = this.$refs.pageTabs
        const element = tabs ? tabs.$el : null
        if (element) {
          this.tabsTop = element.getBoundingClientRect().top - this.$el.getBoundingClientRect().top
        }
      })
    },
    // The tab of the climate, in focus; the page stays at the top
    selectClimate: function (climateId) {
      if (this.climateId !== climateId) {
        this.climateId = climateId
        // Name and data type of the tab: from the row of the table when it is on the page shown, else once loaded
        this.climate = this.findTableClimate(climateId)
      }
      // After b-tabs registered the new tab (added in the same tick as the selection)
      setTimeout(() => {
        this.tabIndex = 1
        this.$nextTick(() => {
          const tab = this.$el.querySelector('.tr-tabs-nav .nav-link.active')
          if (tab) {
            tab.focus({ preventScroll: true })
          }
        })
      }, 0)
    },
    // The climate among the rows of the page of the table, if there
    findTableClimate: function (climateId) {
      const table = this.$refs.climateTable && this.$refs.climateTable.$refs.climateTable
      const rows = (table && table.pageItems) || []
      return rows.find(row => row.climateId === climateId) || null
    },
    // Back to the list: the tab of the climate goes away
    closeClimate: function () {
      this.tabIndex = 0
      this.climateId = null
      this.climate = null
      if (this.$route.params.climateId) {
        // Without the page, sorting and filter of the tables of the climate
        const query = Object.assign({}, this.$route.query)
        Object.keys(query).filter(key => !key.startsWith('climates-')).forEach(key => delete query[key])
        this.$router.push({ name: Pages.climates, query })
      }
    },
    getData: function (data, callback) {
      return apiPostClimateTable(data, callback)
    }
  },
  mounted: function () {
    if (this.$route.params.climateId) {
      this.selectClimate(parseInt(this.$route.params.climateId))
    }
    window.addEventListener('resize', this.measureTabs)
  },
  beforeDestroy: function () {
    this.stopImageTimer()
    window.removeEventListener('resize', this.measureTabs)
  }
}
</script>

<style src="@/assets/custom-page.css"></style>
<!-- The look of the traits page (backdrop, tabs) -->
<style scoped>
.climates-page {
  position: relative;
  padding: 0.5rem 0 3rem;
}
/* The backdrop of images (as on the passport page): from above the page to the tabs, fading out there; the page above */
.tr-backdrop {
  position: absolute;
  top: -1.75rem;
  left: -15px;
  right: -15px;
  height: 10rem;
  overflow: hidden;
  pointer-events: none;
  /* Solid down to the top of the tabs, fading out from there over 2.5rem */
  -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 2.5rem), transparent 100%);
  mask-image: linear-gradient(to bottom, #000 calc(100% - 2.5rem), transparent 100%);
}
.tr-backdrop-image {
  position: absolute;
  /* Larger than the area so the blurred edges stay outside of it */
  inset: -24px;
  background-position: center;
  background-size: cover;
  filter: blur(8px);
  opacity: 0;
  transition: opacity 2s ease-in-out;
}
.tr-backdrop-image.active {
  opacity: 1;
}
.tr-backdrop-veil {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.72);
}
body.dark-mode .tr-backdrop-veil {
  background: rgba(31, 34, 35, 0.78);
}
@media (prefers-reduced-motion: reduce) {
  .tr-backdrop-image {
    transition: none;
  }
}
.climates-page > .cp-page-header,
.climates-page > .tr-tabs {
  position: relative;
}
/* Tabs: as on the maps and publications pages */
.tr-tabs {
  margin-top: 2.25rem;
}
.tr-tabs >>> .tr-tabs-nav {
  flex-wrap: wrap;
  border-bottom: 1px solid var(--cp-border);
}
.tr-tabs >>> .tr-tabs-nav .nav-link {
  display: inline-flex;
  align-items: center;
  padding: 0.7rem 1.25rem;
  border: 1px solid transparent;
  border-radius: 10px 10px 0 0;
  color: var(--cp-muted);
  font-weight: 600;
  line-height: 1.5;
}
.tr-tabs >>> .tr-tabs-nav .nav-link:hover,
.tr-tabs >>> .tr-tabs-nav .nav-link:focus {
  border-color: transparent;
  color: var(--cp-text);
}
.tr-tabs >>> .tr-tabs-nav .nav-link.active,
body.dark-mode .tr-tabs >>> .tr-tabs-nav .nav-link.active,
body.dark-mode .tr-tabs >>> .tr-tabs-nav .nav-link.active:focus {
  border-color: var(--cp-border) var(--cp-border) var(--cp-surface);
  background: var(--cp-surface);
  color: var(--cp-text);
}
.tr-tab-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.1em;
  margin-right: 0.5rem;
  font-size: 0.95em;
  line-height: 1;
  text-align: center;
}
.tr-tabs >>> .tr-tabs-nav .nav-link.active .fa-cloud-sun-rain.tr-tab-icon {
  color: var(--cp-green);
}
/* The data type icon of the climate: in the colour of its type, a little larger than the text */
.tr-tab-type >>> svg {
  width: 1.15em;
  height: 1.15em;
}
.tr-tab-label {
  max-width: 22rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* The cross of the tab of the climate */
.tr-tab-close {
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
.tr-tab-close:hover,
.tr-tab-close:focus {
  background: var(--cp-surface-hover);
  color: #dc3545;
  outline: none;
}
body.dark-mode .tr-tab-close:hover,
body.dark-mode .tr-tab-close:focus {
  color: #f07b86;
}
.tr-tab-panel {
  margin-top: 2rem;
}
</style>
