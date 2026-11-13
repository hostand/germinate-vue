<template>
  <!-- Traits in the look of the custom pages: a List tab (icon of Traits in the menu) with the categories, the table and
       the unifier (administrators) and, once a trait is selected (traits/:traitId), a tab of its own: the icon of its data
       type, its name, a cross that closes it -->
  <div class="custom-page traits-page">
    <!-- The images of the selected trait behind the top of the page, as the reference images of the passport page:
         blurred, from edge to edge, one after the other (a trait has no preferred image: all of them); faded out where the
         tabs start. Gone with another trait without images or when its tab is closed. -->
    <div class="tr-backdrop" v-if="traitId && images.length > 0" :style="backdropStyle" aria-hidden="true">
      <div v-for="(image, index) in images"
           :key="`tr-image-${image.imageId}`"
           :class="['tr-backdrop-image', { active: index === imageIndex }]"
           :style="{ backgroundImage: `url('${getImageSrc(image)}')` }" />
      <div class="tr-backdrop-veil" />
    </div>

    <header class="cp-page-header">
      <h1 class="cp-page-title">{{ $t('pageTraitsTitle') }}</h1>
    </header>

    <b-tabs class="tr-tabs" nav-class="tr-tabs-nav" v-model="tabIndex" ref="pageTabs">
      <!-- All traits -->
      <b-tab>
        <template #title><i class="fa-solid fa-tag tr-tab-icon" aria-hidden="true" />{{ $t('genericList') }}</template>
        <div class="tr-tab-panel">
          <TraitCategories v-on:category-selected="categoryClicked" ref="categories" />

          <TraitTable :getData="getData" :getIds="selectionMode === 'multi' ? getIds : null" :filterOn="filterOn" :selectionMode="selectionMode" :tableActions="isAdmin ? tableActions : null" v-on:selection-changed="updateButtonState" v-on:trait-edit="onTraitEdit" v-on:filter-changed="onFilterChanged" ref="traitTable" />

          <!-- Trait unification (administrators): opened by its icon at the bottom of the table (or closed by it and by its
               head). A block as on the other custom pages; the table shows its checkboxes meanwhile:
               1. select the traits there and Next, 2. choose the one to keep and Merge -->
          <section :class="['tr-card', { open: unifierExpanded }]" v-if="isAdmin && unifierExpanded">
            <button type="button" class="tr-card-head" @click="toggleUnifier" :aria-expanded="unifierExpanded ? 'true' : 'false'">
              <span class="tr-card-icon" aria-hidden="true"><i class="fa-solid fa-code-merge" /></span>
              <span class="tr-card-heading">
                <span class="tr-card-title">{{ $t('pageTraitsUnifierTitle') }}</span>
                <span class="tr-card-text">{{ $t('pageTraitsUnifierText') }}</span>
              </span>
              <i class="fa-solid fa-chevron-down tr-card-chevron" aria-hidden="true" />
            </button>

            <div class="tr-card-body">
              <!-- 1. The traits selected in the table -->
              <div class="tr-step">
                <span class="tr-step-number">1</span>
                <div class="tr-step-content">
                  <i18n path="pageTraitsUnifierSelectedCount" tag="p" class="tr-step-text">
                    <template #count><span class="tr-selected-count">{{ selectedIds.length }}</span></template>
                  </i18n>
                  <button type="button" class="tr-button is-primary" @click="getSelectedTrait" :disabled="!selectedIds || selectedIds.length < 2">
                    {{ $t('buttonNext') }} <i class="fa-solid fa-arrow-right" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <!-- 2. The trait to keep: the others are merged into it -->
              <div class="tr-step" v-if="selectedTraits">
                <span class="tr-step-number">2</span>
                <div class="tr-step-content">
                  <h3 class="tr-step-title">{{ $t('pageTraitsUnifierSelectPreferedTitle') }}</h3>
                  <p class="tr-step-text">{{ $t('pageTraitsUnifierSelectPreferedText') }}</p>
                  <div class="tr-choices" role="radiogroup">
                    <button type="button"
                            v-for="trait in selectedTraits"
                            :key="`trait-${trait.traitId}`"
                            :class="['tr-choice', { active: trait.traitId === primaryTrait }]"
                            role="radio"
                            :aria-checked="trait.traitId === primaryTrait ? 'true' : 'false'"
                            @click="primaryTrait = trait.traitId">
                      <span class="tr-choice-radio" aria-hidden="true" />
                      <span class="tr-choice-id">{{ trait.traitId }}</span>
                      <span class="tr-choice-name">{{ trait.traitName }}</span>
                      <span class="bt-chip tr-choice-type" v-if="trait.dataType && dataTypes[trait.dataType]" :style="{ '--bt-chip-color': dataTypes[trait.dataType].color() }"><MdiIcon :path="dataTypes[trait.dataType].path" /> {{ dataTypes[trait.dataType].text() }}</span>
                    </button>
                  </div>
                  <button type="button" class="tr-button is-primary" @click="mergeTrait" :disabled="!primaryTrait">
                    <i class="fa-solid fa-code-merge" aria-hidden="true" /> {{ $t('buttonMerge') }}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </b-tab>

      <!-- The selected trait: the icon of its data type, then its name -->
      <!-- Always there, hidden and disabled while nothing is selected: created with the page, b-tabs keeps it after the
           List tab (a tab added later may be put first) -->
      <b-tab :disabled="!traitId" :title-item-class="traitId ? null : 'd-none'">
        <template #title>
          <span class="tr-tab-icon tr-tab-type" v-if="trait && dataTypes[trait.dataType]" :style="{ color: dataTypes[trait.dataType].color() }"><MdiIcon :path="dataTypes[trait.dataType].path" /></span>
          <b-spinner small class="tr-tab-icon" v-else-if="!trait" />
          <span class="tr-tab-label">{{ trait ? trait.traitName : traitId }}</span>
          <span class="tr-tab-close" role="button" tabindex="0" :title="$t('buttonClose')" :aria-label="$t('buttonClose')"
                @click.stop.prevent="closeTrait" @keydown.enter.stop.prevent="closeTrait"><i class="fa-solid fa-xmark" aria-hidden="true" /></span>
        </template>
        <div class="tr-tab-panel" v-if="traitId">
          <!-- The number of images of the trait (loaded here for the backdrop): its Images tab when it has some -->
          <TraitDetails :key="traitId" :imageCount="images.length" @trait-loaded="trait = $event" @images-changed="loadImages(traitId, true)" />
        </div>
      </b-tab>
    </b-tabs>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import MdiIcon from '@/components/icons/MdiIcon'
import TraitTable from '@/components/tables/TraitTable'
import TraitCategories from '@/components/util/TraitCategories'
import { apiPostTraitTable, apiPostTraitTableIds, apiPostTraitUnification } from '@/mixins/api/trait'
import { userIsAtLeast, USER_TYPE_ADMINISTRATOR } from '@/mixins/api/auth'
import { MAX_JAVA_INTEGER } from '@/mixins/api/base'
import { dataTypes } from '@/mixins/types'
import { apiPostImages } from '@/mixins/api/misc'
import { getImageUrl } from '@/mixins/image'
import { Pages } from '@/mixins/pages'

const emitter = require('tiny-emitter/instance')

// The images of the backdrop: one after the other (as the reference images of the passport page)
const IMAGE_INTERVAL = 15000

export default {
  components: {
    MdiIcon,
    TraitTable,
    TraitCategories,
    // The content of the tab of a trait (its former page)
    TraitDetails: () => import('@/views/data/trials/TraitDetails')
  },
  data: function () {
    return {
      dataTypes,
      unifierExpanded: false,
      selectedTraits: null,
      primaryTrait: null,
      selectedIds: [],
      USER_TYPE_ADMINISTRATOR,
      filterOn: null,
      category: null,
      tabIndex: 0,
      // The selected trait (traits/:traitId): its id, then the trait once its tab loaded it (name and data type)
      traitId: null,
      trait: null,
      // The images of the selected trait (backdrop), the one shown, and where the tabs start (its height)
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
    isAdmin: function () {
      return !!this.storeToken && userIsAtLeast(this.storeToken.userType, USER_TYPE_ADMINISTRATOR)
    },
    // At the bottom of the table: the icon of the trait unification
    tableActions: function () {
      return [{
        id: 'trait-unification',
        text: this.$t('pageTraitsUnifierTitle'),
        icon: 'fa-solid fa-code-merge',
        variant: null,
        disabled: () => false,
        active: () => this.unifierExpanded,
        callback: () => this.toggleUnifier()
      }]
    },
    // From above the page (the space under the navigation) to 2.5rem below the top of the tabs: solid down to the tabs,
    // the fade from there
    backdropStyle: function () {
      return this.tabsTop > 0 ? { height: `calc(${this.tabsTop}px + 1.75rem + 2.5rem)` } : null
    },
    selectionMode: function () {
      return this.unifierExpanded ? 'multi' : null
    }
  },
  watch: {
    category: function (newValue) {
      // Filter based on selected tag
      if (!newValue) {
        this.filterOn = []
      } else {
        this.filterOn = [{
          column: {
            name: 'categoryName',
            type: String
          },
          comparator: 'equals',
          operator: 'and',
          values: [newValue.name]
        }]
      }
    },
    // A trait selected in the table (its links go to traits/:traitId), back and forward in the browser
    traitId: function (newValue) {
      this.loadImages(newValue)
    },
    '$route.params.traitId': function (newValue) {
      if (newValue) {
        this.selectTrait(parseInt(newValue))
      } else if (this.traitId) {
        this.closeTrait()
      }
    }
  },
  methods: {
    userIsAtLeast,
    getImageSrc: function (image) {
      return getImageUrl(image.imagePath, {
        name: image.imagePath,
        token: this.storeToken ? this.storeToken.imageToken : null,
        type: 'database',
        size: 'large'
      })
    },
    // All the images of the trait (none without a trait), the newest first. Reloaded after a change (reload): the images
    // shown stay until the new ones arrive, so its Images tab stays (and stays open) unless none are left
    loadImages: function (traitId, reload) {
      this.stopImageTimer()
      if (!reload) {
        this.images = []
        this.imageIndex = 0
      }
      if (!traitId) {
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
          values: [traitId]
        }, {
          column: 'imageRefTable',
          comparator: 'equals',
          operator: 'and',
          values: ['phenotypes']
        }]
      }, result => {
        // Only for the trait still selected
        if (this.traitId !== traitId) {
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
    // Opens or closes the trait unification (open: the checkboxes of the table)
    toggleUnifier: function () {
      this.unifierExpanded = !this.unifierExpanded
      if (!this.unifierExpanded) {
        this.reset()
      }
    },
    // The tab of the trait, in focus; the page stays at the top
    selectTrait: function (traitId) {
      if (this.traitId !== traitId) {
        this.traitId = traitId
        // Name and data type of the tab: from the row of the table when it is on the page shown (no wait), else once the
        // tab loaded the trait
        this.trait = this.findTableTrait(traitId)
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
    // The trait among the rows of the page of the table, if there
    findTableTrait: function (traitId) {
      const table = this.$refs.traitTable && this.$refs.traitTable.$refs.traitTable
      const rows = (table && table.pageItems) || []
      return rows.find(row => row.traitId === traitId) || null
    },
    // Editing the trait whose tab is open: the tab is closed first
    onTraitEdit: function (trait) {
      if (trait && this.traitId === trait.traitId) {
        this.closeTrait()
      }
    },
    // Back to the list: the tab of the trait goes away
    closeTrait: function () {
      this.tabIndex = 0
      this.traitId = null
      this.trait = null
      if (this.$route.params.traitId) {
        // Without the page, sorting and filter of the tables of the trait
        const query = Object.assign({}, this.$route.query)
        Object.keys(query).filter(key => !key.startsWith('traits-')).forEach(key => delete query[key])
        this.$router.push({ name: Pages.traits, query })
      }
    },
    onFilterChanged: function (filter) {
      if (filter === null || filter.filter == null || filter.filter.length === 0) {
        this.$refs.categories.selectCategory(null)
      }
    },
    categoryClicked: function (category) {
      this.category = category
      this.$nextTick(() => this.$refs.traitTable.refresh())
    },
    getData: function (data, callback) {
      return apiPostTraitTable(data, callback)
    },
    getIds: function (data, callback) {
      return apiPostTraitTableIds(data, callback)
    },
    updateButtonState: function (selectedIds) {
      this.reset()
      this.selectedIds = selectedIds
    },
    reset: function () {
      this.primaryTrait = null
      this.selectedTraits = null
      this.selectedIds = []
    },
    getSelectedTrait: function () {
      apiPostTraitTable({
        page: 1,
        limit: MAX_JAVA_INTEGER,
        filter: [{
          column: 'traitId',
          operator: 'and',
          comparator: 'inSet',
          values: this.selectedIds
        }]
      }, result => {
        if (result && result.data && result.data.length > 0) {
          this.selectedTraits = result.data
          this.primaryTrait = result.data[0].traitId
        } else {
          this.selectedTraits = []
          this.primaryTrait = null
        }
      })
    },
    mergeTrait: function () {
      emitter.emit('show-loading', true)
      const others = this.selectedIds.filter(id => id !== this.primaryTrait)
      apiPostTraitUnification({
        preferredTraitId: this.primaryTrait,
        otherTraitIds: others
      }, () => {
        this.$refs.traitTable.refresh()
        this.reset()
        this.unifierExpanded = false
        emitter.emit('show-loading', false)
      })
    }
  },
  mounted: function () {
    if (this.$route.params.traitId) {
      this.selectTrait(parseInt(this.$route.params.traitId))
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
<style scoped>
.traits-page {
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
.traits-page > .cp-page-header,
.traits-page > .tr-tabs {
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
.tr-tabs >>> .tr-tabs-nav .nav-link.active .fa-tag.tr-tab-icon {
  color: var(--cp-green);
}
/* The data type icon of the trait: in the colour of its type, a little larger than the text */
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
/* The cross of the tab of the trait */
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
/* Trait unification: a block as those of the other custom pages (the icon in a soft green square beside the title) */
.tr-card {
  margin-top: 1.5rem;
  overflow: hidden;
  border: 1px solid var(--cp-border);
  border-radius: 16px;
  background: var(--cp-surface);
  box-shadow: 0 1px 2px var(--cp-shadow);
}
.tr-card-head {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  width: 100%;
  padding: 1.25rem;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.tr-card-head:hover {
  background: var(--cp-surface-hover);
}
.tr-card-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--cp-green-soft);
  color: var(--cp-green);
  font-size: 1.25rem;
}
.tr-card-heading {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
}
.tr-card-title {
  margin: 0.1rem 0 0.3rem;
  color: var(--cp-text);
  font-size: 1.2rem;
  font-weight: 600;
}
.tr-card-text {
  color: var(--cp-muted);
  font-size: 0.9rem;
  line-height: 1.55;
}
.tr-card-chevron {
  flex-shrink: 0;
  margin-top: 0.85rem;
  color: var(--cp-muted);
  transition: transform 0.15s ease;
}
.tr-card.open .tr-card-chevron {
  transform: rotate(180deg);
}
.tr-card-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.25rem;
  border-top: 1px solid var(--cp-border);
}
/* Steps: the number in a circle beside them */
.tr-step {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
}
.tr-step-number {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--cp-green);
  color: var(--cp-on-button);
  font-size: 0.85rem;
  font-weight: 700;
}
.tr-step-content {
  flex: 1 1 auto;
  min-width: 0;
}
.tr-step-title {
  margin: 0.15rem 0 0.35rem;
  color: var(--cp-text);
  font-size: 1rem;
  font-weight: 700;
}
.tr-step-text {
  margin: 0.2rem 0 0.75rem;
  color: var(--cp-text-subtle);
  font-size: 0.9rem;
}
.tr-selected-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.6rem;
  padding: 0 0.45rem;
  border-radius: 999px;
  background: var(--cp-green-soft);
  color: var(--cp-green);
  font-weight: 700;
}
/* The traits to choose from: one card each, a radio circle, id, name and data type */
.tr-choices {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.tr-choice {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.9rem;
  border: 1px solid var(--cp-border);
  border-radius: 10px;
  background: var(--cp-surface);
  color: var(--cp-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.tr-choice:hover {
  border-color: var(--cp-muted);
}
.tr-choice.active {
  border-color: var(--cp-green);
  background: var(--cp-green-soft);
}
.tr-choice-radio {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  border: 1.5px solid var(--cp-muted);
  border-radius: 50%;
}
.tr-choice.active .tr-choice-radio {
  border: 5px solid var(--cp-green);
}
.tr-choice-id {
  color: var(--cp-muted);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}
/* The data type of a trait: a rounded chip in the colour of the type (as in the tables) */
.tr-choice-type {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.65rem;
  border: 1px solid color-mix(in srgb, var(--bt-chip-color) 35%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--bt-chip-color) 12%, transparent);
  color: color-mix(in srgb, var(--bt-chip-color) 55%, var(--cp-text));
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}
.tr-choice-type >>> svg {
  width: 0.95rem;
  height: 0.95rem;
  fill: var(--bt-chip-color);
}
.tr-choice-name {
  flex: 1 1 auto;
  min-width: 0;
  font-weight: 600;
}
/* Buttons of the page: the main one in green */
.tr-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  height: 40px;
  padding: 0 1.1rem;
  border: 1px solid var(--cp-border);
  border-radius: 10px;
  background: var(--cp-surface);
  color: var(--cp-text);
  font: inherit;
  font-size: 0.92rem;
  font-weight: 500;
  cursor: pointer;
}
.tr-button.is-primary {
  border-color: var(--cp-button);
  background: var(--cp-button);
  color: var(--cp-on-button);
}
.tr-button.is-primary:hover:not(:disabled) {
  border-color: var(--cp-button-hover);
  background: var(--cp-button-hover);
}
.tr-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
