<template>
  <!-- show-one-child: a single menu of the first level open at a time. It closes when another one opens or when a page
       outside of it is opened (on a route change, the open menus not containing the current page close). -->
  <sidebar-menu :menu="menu"
                :width="width"
                widthCollapsed="65px"
                :collapsed="collapsed"
                :show-one-child="true"
                @item-click="onItemClick"
                @toggle-collapse="ev => $emit('toggle-collapse', ev)">
    <span slot="toggle-icon">
      <MdiIcon :path="mdiArrowCollapseRight" v-if="collapsed" />
      <MdiIcon :path="mdiArrowCollapseLeft" v-else />
    </span>
    <span slot="dropdown-icon">
      <MdiIcon :path="mdiChevronRight" />
    </span>
  </sidebar-menu>
</template>

<script>
import MdiIcon from '@/components/icons/MdiIcon'
import SidebarIcon from '@/components/icons/SidebarIcon'

import { mapGetters } from 'vuex'
import { SidebarMenu } from 'vue-sidebar-menu'
import 'vue-sidebar-menu/dist/vue-sidebar-menu.css'

import { getNumberWithSuffix } from '@/mixins/formatting'

import { mdiArrowCollapseLeft, mdiArrowCollapseRight, mdiViewGridPlusOutline, mdiChartAreaspline, mdiChartGantt, mdiChevronRight, mdiClipboardList } from '@mdi/js'

import { apiGetOverviewStats } from '@/mixins/api/stats'
import { apiPostFileResourceTable } from '@/mixins/api/dataset'
import { Pages } from '@/mixins/pages'
import { userIsAtLeast, USER_TYPE_DATA_CURATOR, USER_TYPE_ADMINISTRATOR } from '@/mixins/api/auth'

// Data resources of type "Template"
const templateFilter = [{
  column: 'fileresourcetypeName',
  operator: 'and',
  comparator: 'equals',
  values: ['Template', null]
}]

// Data resources of type "Video", shown on the media page
const videoFilter = [{
  column: 'fileresourcetypeName',
  operator: 'and',
  comparator: 'equals',
  values: ['Video']
}]

const emitter = require('tiny-emitter/instance')

export default {
  components: {
    MdiIcon,
    SidebarMenu
  },
  props: {
    width: {
      type: String,
      default: '300px'
    },
    collapsed: {
      type: Boolean,
      default: false
    }
  },
  data: function () {
    return {
      mdiArrowCollapseLeft,
      mdiArrowCollapseRight,
      mdiChevronRight,
      badgeCounts: {},
      templateCount: 0,
      videoCount: 0
    }
  },
  computed: {
    ...mapGetters([
      'storeServerSettings',
      'storeToken',
      'storeSelectedProjects'
    ]),
    // Videos are only listed in the data resources for administrators, so everyone else gets them taken off the count
    visibleFileresourceCount: function () {
      const total = (this.badgeCounts && this.badgeCounts.fileresources) || 0

      if (this.storeToken && userIsAtLeast(this.storeToken.userType, USER_TYPE_ADMINISTRATOR)) {
        return total
      }

      return Math.max(0, total - this.videoCount)
    },
    menu: function () {
      const tempNav = [
        {
          href: { name: Pages.home },
          title: this.$t('menuHome'),
          icon: { element: 'i', class: 'fa-solid fa-house-chimney fa-fw' }
        },
        {
          href: { name: Pages.projects },
          title: this.$t('menuProjects'),
          identifiers: ['projects'],
          // Only for logged in users with privileges (data curator or administrator)
          hidden: !userIsAtLeast(this.storeToken ? this.storeToken.userType : null, USER_TYPE_DATA_CURATOR),
          badge: {
            text: (this.storeSelectedProjects && this.storeSelectedProjects.length > 0) ? `${this.storeSelectedProjects.length}/${this.getBadgeCount(this.badgeCounts, 'projects')}` : this.getBadgeCount(this.badgeCounts, 'projects'),
            class: 'vsm--badge vsm--badge_default'
          },
          icon: {
            element: SidebarIcon,
            attributes: {
              path: mdiClipboardList
            }
          }
        },
        {
          title: this.$t('menuData'),
          icon: { element: 'i', class: 'fa-solid fa-hard-drive fa-fw' },
          child: [
            {
              title: this.$t('menuGermplasm'),
              href: { name: Pages.germplasm },
              identifiers: ['germplasm'],
              icon: { element: 'i', class: 'fa-solid fa-seedling fa-fw' },
              badge: {
                text: this.getBadgeCount(this.badgeCounts, 'germplasm'),
                class: 'vsm--badge vsm--badge_default'
              }
            },
            {
              title: this.$t('menuGenotypicData'),
              icon: { element: 'i', class: 'fa-solid fa-dna fa-fw' },
              child: [
                {
                  title: this.$t('menuGenotypicMarkers'),
                  identifiers: ['markers'],
                  badge: {
                    text: this.getBadgeCount(this.badgeCounts, 'markers'),
                    class: 'vsm--badge vsm--badge_default'
                  },
                  href: { name: Pages.markers },
                  // The arrow pointing down
                  icon: { element: 'i', class: 'fa-solid fa-indent fa-rotate-90 fa-fw' }
                },
                {
                  title: this.$t('menuGenotypicMaps'),
                  identifiers: ['maps', 'map-details'],
                  badge: {
                    text: this.getBadgeCount(this.badgeCounts, 'maps'),
                    class: 'vsm--badge vsm--badge_default'
                  },
                  href: { name: Pages.maps },
                  icon: { element: 'i', class: 'fa-solid fa-align-justify fa-rotate-90 fa-fw' }
                },
                {
                  title: this.$t('menuGenotypicDataExport'),
                  identifiers: ['export-genotypes'],
                  badge: {
                    text: this.getBadgeCount(this.badgeCounts, 'datasetsGenotype'),
                    class: 'vsm--badge vsm--badge_default'
                  },
                  href: { name: Pages.export, params: { datasetType: 'genotype' } },
                  icon: { element: 'i', class: 'fa-solid fa-dna fa-fw' }
                },
                {
                  title: this.$t('menuAlleleFrequencyDataExport'),
                  identifiers: ['export-allelefrequency'],
                  badge: {
                    text: this.getBadgeCount(this.badgeCounts, 'datasetsAllelefreq'),
                    class: 'vsm--badge vsm--badge_default'
                  },
                  href: { name: Pages.export, params: { datasetType: 'allelefreq' } },
                  icon: { element: 'i', class: 'fa-solid fa-file-waveform fa-fw' }
                }
              ]
            },
            {
              title: this.$t('menuTrialsData'),
              icon: { element: 'i', class: 'fa-solid fa-tags fa-fw' },
              child: [
                {
                  title: this.$t('menuTrialsTraits'),
                  identifiers: ['traits'],
                  badge: {
                    text: this.getBadgeCount(this.badgeCounts, 'traits'),
                    class: 'vsm--badge vsm--badge_default'
                  },
                  href: { name: Pages.traits },
                  icon: { element: 'i', class: 'fa-solid fa-tag fa-fw' }
                },
                {
                  title: this.$t('menuTrialsDataExport'),
                  identifiers: ['export-trials'],
                  badge: {
                    text: this.getBadgeCount(this.badgeCounts, 'datasetsTrials'),
                    class: 'vsm--badge vsm--badge_default'
                  },
                  href: { name: Pages.export, params: { datasetType: 'trials' } },
                  icon: { element: 'i', class: 'fa-solid fa-person-digging fa-fw' }
                },
                {
                  title: this.$t('menuTrialsCreate'),
                  identifiers: ['trial-creation'],
                  href: { name: Pages.trialCreation },
                  icon: {
                    element: SidebarIcon,
                    attributes: {
                      path: mdiViewGridPlusOutline
                    }
                  },
                  hidden: !userIsAtLeast(this.storeToken ? this.storeToken.userType : null, USER_TYPE_DATA_CURATOR)
                }
              ]
            },
            {
              title: this.$t('menuGeography'),
              icon: { element: 'i', class: 'fa-solid fa-earth-americas fa-fw' },
              child: [
                {
                  title: this.$t('menuLocations'),
                  identifiers: ['locations'],
                  badge: {
                    text: this.getBadgeCount(this.badgeCounts, 'locations'),
                    class: 'vsm--badge vsm--badge_default'
                  },
                  href: { name: Pages.locations },
                  icon: { element: 'i', class: 'fa-solid fa-map-location-dot fa-fw' }
                },
                {
                  title: this.$t('menuGeographicSearch'),
                  identifiers: ['geographic-search'],
                  href: { name: Pages.geographicSearch },
                  icon: { element: 'i', class: 'fa-solid fa-magnifying-glass-location fa-fw' }
                }
              ]
            },
            {
              title: this.$t('menuClimateData'),
              icon: { element: 'i', class: 'fa-solid fa-cloud-sun-rain fa-fw' },
              child: [
                {
                  title: this.$t('menuClimateClimates'),
                  identifiers: ['climates'],
                  badge: {
                    text: this.getBadgeCount(this.badgeCounts, 'climates'),
                    class: 'vsm--badge vsm--badge_default'
                  },
                  href: { name: Pages.climates },
                  icon: { element: 'i', class: 'fa-solid fa-cloud-sun-rain fa-fw' }
                },
                {
                  title: this.$t('menuClimateDataExport'),
                  identifiers: ['export-climates'],
                  badge: {
                    text: this.getBadgeCount(this.badgeCounts, 'datasetsClimate'),
                    class: 'vsm--badge vsm--badge_default'
                  },
                  href: { name: Pages.export, params: { datasetType: 'climate' } },
                  icon: { element: 'i', class: 'fa-solid fa-tarp-droplet fa-fw' }
                }
              ]
            },
            {
              title: this.$t('menuCrossDataTypeComparison'),
              identifiers: ['export-cross-comparison'],
              href: { name: Pages.exportCrossComparison },
              icon: {
                element: SidebarIcon,
                attributes: {
                  path: mdiChartGantt
                }
              }
            },
            {
              title: this.$t('menuDatasets'),
              identifiers: ['datasets'],
              badge: {
                text: this.getBadgeCount(this.badgeCounts, 'datasets'),
                class: 'vsm--badge vsm--badge_default'
              },
              href: { name: Pages.datasets },
              icon: { element: 'i', class: 'fa-solid fa-database fa-fw' }
            },
            {
              title: this.$t('menuExperiments'),
              identifiers: ['experiments'],
              badge: {
                text: this.getBadgeCount(this.badgeCounts, 'experiments'),
                class: 'vsm--badge vsm--badge_default'
              },
              href: { name: Pages.experiments },
              icon: { element: 'i', class: 'fa-solid fa-flask-vial fa-fw' }
            },
            {
              title: this.$t('menuDataResources'),
              identifiers: ['data-resources'],
              badge: {
                text: this.getBadgeCount({ fileresources: this.visibleFileresourceCount }, 'fileresources'),
                class: 'vsm--badge vsm--badge_default'
              },
              href: { name: Pages.dataResources },
              icon: { element: 'i', class: 'fa-solid fa-file-fragment fa-fw' }
            },
            {
              // Data resources page filtered to templates. Hidden together with the data resources page.
              title: this.$t('menuDataTemplates'),
              identifiers: ['data-resources'],
              badge: {
                text: this.getBadgeCount({ templates: this.templateCount }, 'templates'),
                class: 'vsm--badge vsm--badge_default'
              },
              href: { name: Pages.dataResources, query: { 'fileresources-filter': JSON.stringify(templateFilter) } },
              icon: { element: 'i', class: 'fa-solid fa-file-invoice fa-fw' }
            },
            {
              title: this.$t('menuDataStories'),
              identifiers: ['stories'],
              badge: {
                text: this.getBadgeCount(this.badgeCounts, 'dataStories'),
                class: 'vsm--badge vsm--badge_default'
              },
              href: { name: Pages.stories },
              icon: { element: 'i', class: 'fa-solid fa-comment-dots fa-fw' }
            },
            {
              title: this.$t('menuDataStatistics'),
              identifiers: ['statistics'],
              href: { name: Pages.statistics },
              icon: {
                element: SidebarIcon,
                attributes: {
                  path: mdiChartAreaspline
                }
              }
            }
          ]
        },
        {
          title: this.$t('menuPublications'),
          identifiers: ['publications', 'publication-details'],
          badge: {
            text: this.getBadgeCount(this.badgeCounts, 'publications'),
            class: 'vsm--badge vsm--badge_default'
          },
          href: { name: Pages.publications },
          icon: { element: 'i', class: 'fa-solid fa-book fa-fw' }
        },
        {
          title: this.$t('menuGroups'),
          identifiers: ['groups', 'group-details'],
          badge: {
            text: this.getBadgeCount(this.badgeCounts, 'groups'),
            class: 'vsm--badge vsm--badge_default'
          },
          href: { name: Pages.groups },
          icon: { element: 'i', class: 'fa-solid fa-object-group fa-fw' }
        },
        {
          title: this.$t('menuImages'),
          identifiers: ['images'],
          badge: {
            text: this.getBadgeCount(this.badgeCounts, 'images'),
            class: 'vsm--badge vsm--badge_default'
          },
          href: { name: Pages.images },
          icon: { element: 'i', class: 'fa-solid fa-image fa-fw' }
        },
        {
          title: this.$t('menuMedia'),
          identifiers: ['media'],
          badge: {
            text: this.getBadgeCount({ videos: this.videoCount }, 'videos'),
            class: 'vsm--badge vsm--badge_default'
          },
          href: { name: Pages.media },
          icon: { element: 'i', class: 'fa-solid fa-file-video fa-fw' }
        },
        {
          title: this.$t('menuSearch'),
          identifiers: ['search'],
          href: { name: Pages.search },
          icon: { element: 'i', class: 'fa-solid fa-magnifying-glass fa-fw' }
        },
        {
          // A single entry to the about page of the project; About Germinate is a tab of it, the export formats page
          // (about/export-formats) and the original about page (about/project-legacy) stay reachable by their address
          title: this.$t('menuAbout'),
          href: { name: Pages.aboutProject },
          identifiers: ['about-project'],
          icon: { element: 'i', class: 'fa-solid fa-circle-info fa-fw' }
        }
      ]

      const hiddenPages = (this.storeServerSettings && this.storeServerSettings.hiddenPages && this.storeServerSettings.hiddenPages.length > 0) ? this.storeServerSettings.hiddenPages : []

      // const currentUserType = this.storeToken ? this.storeToken.userType : null

      const menu = tempNav.filter(function f (o) {
        if (o.identifiers) {
          if (o.identifiers.some(i => hiddenPages.includes(i))) {
            return false
          }
        }

        // if (o.minUserType) {
        //   if (!userIsAtLeast(currentUserType, o.minUserType)) {
        //     return false
        //   }
        // }

        if (o.child && o.child.length > 0) {
          return (o.child = o.child.filter(f)).length
        }

        return true
      })

      // The active item: by the path of the page only, so that its query (a tab, a page of a table: ?tab=map) doesn't
      // make the item lose its highlight. Items sharing a path (Data resources and Templates, which differ by their
      // query) keep the comparison of the whole address.
      const items = []
      const collect = list => list.forEach(o => {
        if (o.href && typeof o.href === 'object' && !o.external) {
          items.push({ item: o, path: this.$router.resolve(o.href).route.path })
        }
        if (o.child) {
          collect(o.child)
        }
      })
      collect(menu)
      items.forEach(entry => {
        entry.item.exactPath = items.filter(other => other.path === entry.path).length === 1
      })

      return menu
    }
  },
  methods: {
    // Menu items on the same page that only differ in their query (e.g. "Data resources" and "Templates")
    // would otherwise keep the previous page state, so ask for the page to be rebuilt
    onItemClick: function (event, item) {
      if (!item.href || item.external || typeof item.href === 'string') {
        return
      }

      const { route } = this.$router.resolve(item.href)

      if (route.path === this.$route.path) {
        emitter.emit('reload-route', route.fullPath)
      }
    },
    getBadgeCount: function (stats, key) {
      let value = null

      if (stats && stats[key]) {
        value = stats[key]
      }

      if (value === undefined || value === null) {
        return '0'
      } else {
        return getNumberWithSuffix(value, 1)
      }
    },
    updateBadgeCounts: function () {
      apiGetOverviewStats(result => {
        this.badgeCounts = result
      })

      // Not part of the overview stats, so counted from the data resources table
      apiPostFileResourceTable({ page: 1, limit: 1, prevCount: -1, filter: templateFilter }, result => {
        this.templateCount = (result && result.count) || 0
      })
      apiPostFileResourceTable({ page: 1, limit: 1, prevCount: -1, filter: videoFilter }, result => {
        this.videoCount = (result && result.count) || 0
      })
    }
  },
  beforeDestroy: function () {
    emitter.off('update-sidebar-menu', this.updateBadgeCounts)
  },
  mounted: function () {
    this.updateBadgeCounts()
    emitter.on('update-sidebar-menu', this.updateBadgeCounts)
  }
}
</script>

<style>
.vsm--mobile-item {
  max-width: 75vw !important;
}

.vsm--scroll-wrapper::-webkit-scrollbar {
    display: none; /* Chrome */
}
.vsm--scroll-wrapper {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
.v-sidebar-menu .vsm--dropdown>.vsm--list {
  padding: 0 0 0 15px;
}

.v-sidebar-menu .vsm--link.vsm--link_active {
  box-shadow: 3px 0px 0px 0px #23a1d7 inset;
}

.v-sidebar-menu.vsm_expanded .vsm--item_open .vsm--link_level-1 {
  background-color: #23a1d7;
}

.v-sidebar-menu.vsm_expanded .vsm--item_open .vsm--link_level-1 .vsm--icon {
  background-color: #23a1d7;
}

.v-sidebar-menu.vsm_collapsed .vsm--link_level-1.vsm--link_hover .vsm--icon, .v-sidebar-menu.vsm_collapsed .vsm--link_level-1:hover .vsm--icon {
  background-color: #23a1d7;
}

.v-sidebar-menu .vsm--mobile-bg {
  background-color: #23a1d7;
}

.v-sidebar-menu .vsm--link {
  padding: 10px 16px;
}

.v-sidebar-menu .vsm--link_hover, .v-sidebar-menu .vsm--link:hover {
  background-color: #23a1d7;
}

@media (min-width: 768px) {
  .vsm--mobile-item {
    max-width: 400px !important;
  }
}

/* The font of the new pages (loaded with the dropdowns of the top navigation) */
.v-sidebar-menu,
.v-sidebar-menu .vsm--link,
.v-sidebar-menu .vsm--badge {
  font-family: 'DM Sans', -apple-system, 'Segoe UI', Roboto, sans-serif;
}

/* The icons alone, without the square behind them (both themes, also when open or hovered) */
.v-sidebar-menu .vsm--link_level-1 .vsm--icon,
.v-sidebar-menu.vsm_expanded .vsm--item_open .vsm--link_level-1 .vsm--icon,
.v-sidebar-menu.vsm_collapsed .vsm--link_level-1.vsm--link_hover .vsm--icon,
.v-sidebar-menu.vsm_collapsed .vsm--link_level-1:hover .vsm--icon {
  background-color: transparent;
}
/* Font Awesome icons: as big as the others */
.v-sidebar-menu i.vsm--icon {
  font-size: 1.25em;
}
/* A little space above the first item (Home) */
.v-sidebar-menu > .vsm--scroll-wrapper > .vsm--list {
  padding-top: 0.75rem;
}
/* The icons a little bigger */
.v-sidebar-menu .vsm--icon svg.mdi-icon {
  width: 1.45em;
  height: 1.45em;
  vertical-align: middle;
}

/* Light theme: in the colours of the new pages (light surface, dark text, green icons and highlights) */
body:not(.dark-mode) .v-sidebar-menu {
  /* A little darker than the top navigation (#f8f9fa), to tell them apart */
  background-color: #eceee9;
}
body:not(.dark-mode) .v-sidebar-menu .vsm--link {
  color: #1f2120;
}
body:not(.dark-mode) .v-sidebar-menu .vsm--icon {
  color: #3b6b35;
}
body:not(.dark-mode) .v-sidebar-menu .vsm--link_hover,
body:not(.dark-mode) .v-sidebar-menu .vsm--link:hover {
  background-color: #dde9d7;
  color: #1f2120;
}
body:not(.dark-mode) .v-sidebar-menu .vsm--link.vsm--link_active,
body:not(.dark-mode) .v-sidebar-menu .vsm--link_level-1.vsm--link_exact-active,
body:not(.dark-mode) .v-sidebar-menu .vsm--link_level-1.vsm--link_active {
  box-shadow: 3px 0 0 0 #3b6b35 inset;
  color: #2a4f26;
  font-weight: 500;
}
body:not(.dark-mode) .v-sidebar-menu.vsm_expanded .vsm--item_open .vsm--link_level-1 {
  background-color: #dde9d7;
  color: #2a4f26;
}
body:not(.dark-mode) .v-sidebar-menu .vsm--dropdown .vsm--list {
  background-color: #e3e5df;
}
body:not(.dark-mode) .v-sidebar-menu .vsm--header {
  color: #4a4d4b;
}
body:not(.dark-mode) .v-sidebar-menu .vsm--badge_default {
  color: #1f2120;
  background-color: #d6d8d2;
}
body:not(.dark-mode) .v-sidebar-menu .vsm--toggle-btn {
  color: #3b6b35;
  background-color: #e3e5df;
}
body:not(.dark-mode) .v-sidebar-menu .vsm--toggle-btn:hover {
  background-color: #dde9d7;
}
/* Collapsed: the item shown on hover, on green */
body:not(.dark-mode) .v-sidebar-menu .vsm--mobile-bg {
  background-color: #3b6b35;
}
body:not(.dark-mode) .v-sidebar-menu .vsm--link_mobile-item,
body:not(.dark-mode) .v-sidebar-menu .vsm--link_mobile-item:hover,
body:not(.dark-mode) .v-sidebar-menu.vsm_collapsed .vsm--link_level-1.vsm--link_hover .vsm--icon,
body:not(.dark-mode) .v-sidebar-menu.vsm_collapsed .vsm--link_level-1:hover .vsm--icon {
  color: #ffffff;
}
body:not(.dark-mode) .v-sidebar-menu .vsm--mobile-item .vsm--dropdown .vsm--list .vsm--link {
  color: #1f2120;
}
</style>
