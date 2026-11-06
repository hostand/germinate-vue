<template>
  <!-- "custom-page" brings the shared colour tokens used by shared components such as RecentlyViewedPanel -->
  <div class="custom-page home" ref="home">
    <!-- The images of the carousel (Add > Carousel): behind the top of the page from edge to edge, blurred, fading into
         the page (light or dark) further down than on the germplasm page. It ends at the search bar (measured).
         Several ones fade into each other. -->
    <div class="home-backdrop" v-if="heroImages.length > 0" :style="backdropStyle" aria-hidden="true">
      <div v-for="(image, index) in heroImages"
           :key="'home-hero-image-' + image.name"
           :class="['home-hero-image', { active: index === heroIndex }]"
           :style="{ backgroundImage: `url('${image.src}')` }" />
      <div class="home-hero-veil" />
    </div>

    <!-- Hero: the title and text of the image shown ("homeHeroText": #Title##Text, one per image), changing with it -->
    <section class="home-hero" ref="hero">
      <!-- All the texts of "homeHeroText" on top of each other, only the current one visible: the block is always as tall
           as the longest one (also before the images arrive), so nothing under it moves, and the title stays in place -->
      <div class="home-hero-slides" v-if="heroTexts.length > 0">
        <div v-for="(slide, index) in heroTexts"
             v-show="slide.title"
             :key="'home-hero-text-' + index"
             :class="['home-hero-text', { active: index === heroTextIndex }]"
             :aria-hidden="index === heroTextIndex ? null : 'true'">
          <!-- Title and text may hold HTML (written by administrators in the carousel) -->
          <div class="home-title" :role="index === heroTextIndex ? 'heading' : null" :aria-level="index === heroTextIndex ? 1 : null" v-html="slide.title" />
          <p class="home-lead" v-if="slide.text" v-html="slide.text" />
        </div>
      </div>
    </section>

    <!-- Flagship crops: collapsed while the search below is used, the chevron opens or closes them -->
    <section :class="['home-section', 'home-crops-section', { collapsed: !open.crops }]">
      <div class="home-section-header">
        <h2 class="home-section-title">{{ $t('homeFlagshipCropsTitle') }}</h2>
        <button type="button" class="home-panel-toggle" :aria-expanded="open.crops" @click="toggle('crops')" :aria-label="(open.crops ? 'Hide ' : 'Show ') + $t('homeFlagshipCropsTitle')">
          <span :class="['home-panel-chevron', { closed: !open.crops }]"><MdiIcon :path="icons.chevronUp" :size="26" /></span>
        </button>
      </div>

      <!-- Slides up and fades out when collapsing, the other way round when opening -->
      <transition name="home-collapse"
                  @before-enter="collapseBeforeEnter"
                  @enter="collapseEnter"
                  @after-enter="collapseAfter"
                  @before-leave="collapseBeforeLeave"
                  @leave="collapseLeave"
                  @after-leave="collapseAfter">
      <div class="home-crops" v-show="open.crops">
        <!-- The whole card opens the Search page with the members of the crop's group (not without germplasm) -->
        <component v-for="crop in crops"
                   :key="crop.key"
                   :is="getCropGroup(crop) && !isCropDisabled(crop) ? 'router-link' : 'div'"
                   :to="getCropGroup(crop) && !isCropDisabled(crop) ? getCropLink(crop) : null"
                   :class="['home-crop-card', { disabled: isCropDisabled(crop) }]"
                   :aria-disabled="isCropDisabled(crop)">
          <div :class="['home-crop-icon', `home-crop-${crop.key}`]"><MdiIcon :path="crop.icon" :size="26" /></div>
          <div class="home-crop-name">{{ crop.name }}</div>
          <div class="home-crop-count">{{ getCropCountText(crop) }}</div>
        </component>
      </div>
      </transition>
    </section>

    <!-- Search -->
    <!-- Shared with the Search page (src/components/search/SearchModule.vue). A click in the search field collapses the
         flagship crops: only their chevron opens them again. -->
    <SearchModule class="home-search-module" @field-click="open.crops = false" ref="searchModule" />

    <!-- Stats -->
    <!-- Statistics carousel: 5 visible on wide screens, the sides fade where more are hidden -->
    <section :class="['home-stats', { 'has-prev': canScrollStatsBack, 'has-next': canScrollStatsForward, 'has-nav': statsMaxIndex > 0 }]"
             :style="{ '--home-stats-visible': statsVisible }"
             aria-roledescription="carousel"
             aria-label="Statistics">
      <button type="button" class="home-stats-nav" :class="{ hidden: !canScrollStatsBack }" :disabled="!canScrollStatsBack" @click="scrollStats(-1)" aria-label="Previous statistics">
        <MdiIcon :path="icons.chevronLeft" :size="24" />
      </button>
      <div class="home-stats-viewport">
        <div class="home-stats-track" :style="{ transform: `translateX(-${statsIndex * (100 / statsVisible)}%)` }">
          <div v-for="(total, index) in statTypes"
               :key="'stat-' + total.key"
               :class="['home-stat', { disabled: isTotalEmpty(total.key) }]"
               :aria-disabled="isTotalEmpty(total.key)"
               :aria-hidden="index < statsIndex || index >= statsIndex + statsVisible ? 'true' : null">
            <span class="home-stat-icon"><MdiIcon :path="total.icon" :size="20" /></span>
            <div class="home-stat-text">
              <div class="home-stat-value">{{ getTotalText(total.key) }}</div>
              <div class="home-stat-label">{{ pluralise(totals[total.key], total.label) }}</div>
            </div>
          </div>
        </div>
      </div>
      <button type="button" class="home-stats-nav" :class="{ hidden: !canScrollStatsForward }" :disabled="!canScrollStatsForward" @click="scrollStats(1)" aria-label="Next statistics">
        <MdiIcon :path="icons.chevronRight" :size="24" />
      </button>
    </section>

    <!-- Publications and announcements + Quick access -->
    <section :class="['home-panels', { 'home-panels-single': !showMainColumn }]">
      <div class="home-main" v-if="showMainColumn">
        <!-- Hidden when "Publications" is not a visible dashboard section in the Germinate settings, or when there are none -->
        <div :class="['home-panel', { collapsed: !open.publications }]" v-if="showPublicationPanel">
          <div class="home-panel-header">
            <h3 class="home-panel-title">Publications</h3>
            <div class="home-panel-tools">
              <!-- 5 at a time, paging only while the list is open -->
              <div class="home-pager" v-if="publicationPageCount > 1 && open.publications">
                <button type="button" class="home-pager-button" :disabled="publicationPage <= 1" @click="loadRecentPublications(publicationPage - 1)" aria-label="Previous publications">
                  <MdiIcon :path="icons.chevronLeft" :size="22" />
                </button>
                <button type="button" class="home-pager-button" :disabled="publicationPage >= publicationPageCount" @click="loadRecentPublications(publicationPage + 1)" aria-label="Next publications">
                  <MdiIcon :path="icons.chevronRight" :size="22" />
                </button>
              </div>
              <button type="button" class="home-panel-toggle" :aria-expanded="open.publications" @click="toggle('publications')" :aria-label="(open.publications ? 'Hide ' : 'Show ') + 'publications'">
                <span :class="['home-panel-chevron', { closed: !open.publications }]"><MdiIcon :path="icons.chevronUp" :size="22" /></span>
              </button>
            </div>
          </div>

          <div v-show="open.publications">
            <!-- The whole row opens the publication on the publications page, in its Details tab -->
            <div class="home-recent-item home-publication-item" v-for="publication in recentPublications" :key="'recent-publication-' + publication.id"
                 role="link" tabindex="0" @click="openPublication(publication)" @keydown.enter="openPublication(publication)">
              <!-- The icon of the publications (sidebar menu) -->
              <span class="home-recent-icon home-recent-link home-publication-icon" aria-hidden="true"><i class="fa-solid fa-book" /></span>
              <div class="home-recent-body">
                <div class="home-recent-title" :title="publication.title">{{ publication.title }}</div>
                <div class="home-recent-meta" v-if="publication.journal">{{ publication.journal }}</div>
                <!-- Takes the publication off the home page: removes its links to the database and to accessions -->
                <b-button v-if="canAddContent" variant="link" class="home-recent-delete text-danger" @click.stop="deleteRecentPublication(publication)" @keydown.enter.stop>{{ $t('buttonDelete') }}</b-button>
              </div>
              <div class="home-recent-side">
                <!-- Crossref: with its icon, in the size of the text -->
                <span class="home-badge home-badge-source">
                  <i class="ai ai-crossref home-badge-icon" v-if="isCrossref(publication.source)" aria-hidden="true" />{{ publication.source }}
                </span>
                <span class="home-recent-date">{{ publication.date }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Hidden when "News" is not a visible dashboard section in the Germinate settings, or when there are none. "Related project" news are not part of it. -->
        <div :class="['home-panel', { collapsed: !open.news }]" v-if="showNewsPanel">
          <div class="home-panel-header">
            <div class="home-panel-heading">
              <h3 class="home-panel-title">Announcements</h3>
              <span class="home-count-badge" :title="newsTotal + ' ' + pluralise(newsTotal, ['news item', 'news items'])">{{ newsTotal.toLocaleString() }}</span>
            </div>
            <div class="home-panel-tools">
              <!-- Paging only while the list is open -->
              <div class="home-pager" v-if="newsPageCount > 1 && open.news">
                <button type="button" class="home-pager-button" :disabled="newsPage <= 1" @click="loadNews(newsPage - 1)" aria-label="Previous news">
                  <MdiIcon :path="icons.chevronLeft" :size="22" />
                </button>
                <button type="button" class="home-pager-button" :disabled="newsPage >= newsPageCount" @click="loadNews(newsPage + 1)" aria-label="Next news">
                  <MdiIcon :path="icons.chevronRight" :size="22" />
                </button>
              </div>
              <button type="button" class="home-panel-toggle" :aria-expanded="open.news" @click="toggle('news')" :aria-label="(open.news ? 'Hide ' : 'Show ') + 'news'">
                <span :class="['home-panel-chevron', { closed: !open.news }]"><MdiIcon :path="icons.chevronUp" :size="22" /></span>
              </button>
            </div>
          </div>

          <div v-show="open.news">
            <button type="button" class="home-recent-item home-news-item" v-for="newsItem in news" :key="'news-' + newsItem.newsId" @click="showNewsDetails(newsItem)">
              <span :class="['home-recent-icon', 'home-recent-link', 'home-news-icon-' + getNewsType(newsItem).key]"><MdiIcon :path="getNewsType(newsItem).icon" :size="16" /></span>
              <div class="home-recent-body">
                <div class="home-news-head">
                  <div class="home-recent-title" :title="newsItem.newsTitle">{{ newsItem.newsTitle }}</div>
                  <span class="home-recent-date home-news-date" v-if="newsItem.createdOn" :title="formatDate(newsItem.createdOn)"><MdiIcon :path="icons.calendarClock" :size="13" /> {{ formatTimeAgo(newsItem.createdOn) }}</span>
                </div>
                <div class="home-recent-meta"><span :class="['home-badge', 'home-news-badge-' + getNewsType(newsItem).key]">{{ $t(getNewsType(newsItem).i18n) }}</span></div>
              </div>
            </button>
          </div>

          <!-- News details, same as on the original home page -->
          <b-modal ref="newsModal" :title="selectedNews ? selectedNews.newsTitle : ''" scrollable size="xl" ok-only :ok-title="$t('buttonClose')">
            <template v-if="selectedNews">
              <div v-html="selectedNews.newsContent" />
              <b-button-group class="mt-3">
                <b-button v-if="selectedNews.newsHyperlink && selectedNews.newsHyperlink.lastIndexOf('#', 0) !== 0" :href="selectedNews.newsHyperlink" target="_blank" rel="noopener noreferrer">{{ $t('pageNewsReadMore') }} <MdiIcon :path="icons.openInNew" /></b-button>
                <b-button v-if="canAddContent" @click="deleteNewsItem(selectedNews.newsId)" variant="danger"><MdiIcon :path="icons.delete" /> {{ $t('buttonDelete') }}</b-button>
              </b-button-group>
            </template>
          </b-modal>
        </div>
      </div>

      <div class="home-side">
        <div :class="['home-panel', { collapsed: !open.quick }]">
          <div class="home-panel-header">
            <h3 class="home-panel-title">Quick access</h3>
            <div class="home-panel-tools">
              <button type="button" class="home-panel-toggle" :aria-expanded="open.quick" @click="toggle('quick')" :aria-label="(open.quick ? 'Hide ' : 'Show ') + 'quick access'">
                <span :class="['home-panel-chevron', { closed: !open.quick }]"><MdiIcon :path="icons.chevronUp" :size="22" /></span>
              </button>
            </div>
          </div>

          <div v-show="open.quick">
            <router-link v-for="total in quickTypes"
                         :key="'quick-' + total.key"
                         :to="{ name: total.quick.page }"
                         :class="['home-quick-item', { disabled: isTotalEmpty(total.key) }]"
                         :aria-disabled="isTotalEmpty(total.key)"
                         :tabindex="isTotalEmpty(total.key) ? -1 : null">
              <span class="home-stat-icon"><MdiIcon :path="total.quick.icon || total.icon" :size="18" /></span>
              <span class="home-quick-label">{{ total.quick.label }}</span>
              <span class="home-quick-count">{{ getTotalText(total.key) }}<template v-if="total.quick.unit && totals[total.key] !== null"> {{ pluralise(totals[total.key], total.quick.unit) }}</template></span>
              <span class="home-quick-chevron"><MdiIcon :path="icons.chevronRight" :size="20" /></span>
            </router-link>
          </div>
        </div>

        <!-- Recently viewed germplasm, same as on the passport page. Hidden when there are none. -->
        <RecentlyViewedPanel />

        <!-- Add content. Only for data curators and above, same as the add buttons on the original home page. -->
        <div class="home-panel" v-if="canAddContent">
          <div class="home-panel-header">
            <h3 class="home-panel-title">Add</h3>
          </div>

          <div class="home-add-actions">
            <button type="button" class="home-add-action" @click="$refs.addPublicationModal.show()" v-if="showPublicationSection">
              <span class="home-stat-icon"><MdiIcon :path="icons.publication" :size="18" /></span>
              <span>Publication</span>
            </button>
            <button type="button" class="home-add-action" @click="$refs.addStoryModal.show()" v-if="showDataStorySection">
              <span class="home-stat-icon"><MdiIcon :path="icons.addStory" :size="18" /></span>
              <span>Data story</span>
            </button>
            <button type="button" class="home-add-action" @click="$refs.addNewsModal.show()">
              <span class="home-stat-icon"><MdiIcon :path="icons.addNews" :size="18" /></span>
              <span>News item</span>
            </button>
          </div>
          <!-- On a line of its own: the images of the carousel, same as "Edit image carousel" on the original home page
               (administrators only there too) -->
          <div class="home-add-actions home-add-actions-more" v-if="canEditCarousel">
            <button type="button" class="home-add-action" @click="$refs.carouselEditModal.show()">
              <span class="home-stat-icon"><MdiIcon :path="icons.carousel" :size="18" /></span>
              <span>Carousel</span>
            </button>
          </div>

          <AddPublicationModal ref="addPublicationModal" @publication-added="onPublicationAdded" />
          <AddStoryModal ref="addStoryModal" />
          <AddNewsModal ref="addNewsModal" @news-added="loadNews(1)" />
          <CarouselEditModal ref="carouselEditModal" v-if="canEditCarousel" @change="loadHeroImages" />
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

import MdiIcon from '@/components/icons/MdiIcon'
import AddPublicationModal from '@/components/modals/AddPublicationModal'
import AddStoryModal from '@/components/modals/AddStoryModal'
import AddNewsModal from '@/components/modals/AddNewsModal'
import CarouselEditModal from '@/components/modals/CarouselEditModal'
import RecentlyViewedPanel from '@/components/germplasm/RecentlyViewedPanel'

import { mdiMagnify, mdiChevronDown, mdiChevronRight, mdiDatabase, mdiSprout, mdiMapMarkerOutline, mdiTagOutline, mdiBookOpenVariant, mdiMapOutline, mdiWeatherSnowyRainy, mdiCommentPlusOutline, mdiNewBox, mdiOpenInNew, mdiChevronLeft, mdiCalendarClock, mdiDelete, mdiRefresh, mdiNewspaper, mdiChevronUp, mdiDna, mdiCheck, mdiImageSizeSelectLarge } from '@mdi/js'
import { Pages } from '@/mixins/pages'
import { FLAGSHIP_CROPS } from '@/mixins/crops'
import { apiPostGroupTable } from '@/mixins/api/group'
import { apiPostGermplasmTable } from '@/mixins/api/germplasm'
import { apiPostPublicationsTable, apiPostNewsTable, apiDeleteNews, apiDeletePublicationReference, apiGetTemplateCarouselConfig } from '@/mixins/api/misc'
import { getImageUrl } from '@/mixins/image'
import { parseHeroText } from '@/mixins/hero-text'
import { apiPostLocationTable } from '@/mixins/api/location'
import { apiPostDatasetTable } from '@/mixins/api/dataset'
import { apiPostTraitTable } from '@/mixins/api/trait'
import { apiPostClimateTable } from '@/mixins/api/climate'
import { apiPostMarkerTable, apiPostMapsTable } from '@/mixins/api/genotype'
import { MAX_JAVA_INTEGER } from '@/mixins/api/base'
import { userIsAtLeast, USER_TYPE_DATA_CURATOR, USER_TYPE_ADMINISTRATOR } from '@/mixins/api/auth'
import SearchModule from '@/components/search/SearchModule'

const emitter = require('tiny-emitter/instance')

const NEWS_PER_PAGE = 5
// Same as the reference images of the germplasm page: the next image (and its text) after this long
const HERO_INTERVAL = 15000

const PUBLICATIONS_PER_PAGE = 5

// News types shown in "Announcements". "Projects" (related projects) are handled separately.
const NEWS_TYPES = {
  Data: { key: 'data', icon: mdiDatabase, i18n: 'widgetNewsTypeDataChanges' },
  Updates: { key: 'updates', icon: mdiRefresh, i18n: 'widgetNewsTypeGeneralUpdates' },
  General: { key: 'general', icon: mdiNewspaper, i18n: 'widgetNewsTypeGeneralNews' }
}

// Used to turn a date into "20 seconds ago", "3 hours ago", ...
const TIME_DIVISIONS = [
  { amount: 60, name: 'seconds' },
  { amount: 60, name: 'minutes' },
  { amount: 24, name: 'hours' },
  { amount: 7, name: 'days' },
  { amount: 4.34524, name: 'weeks' },
  { amount: 12, name: 'months' },
  { amount: Number.POSITIVE_INFINITY, name: 'years' }
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "12 Jan 2023"
const formatDate = value => {
  const date = value ? new Date(value) : null

  if (!date || isNaN(date.getTime())) {
    return ''
  }

  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

// CSL fields can be a plain value or a list, and titles can contain markup like <i>
const getCslText = value => {
  const text = Array.isArray(value) ? value[0] : value
  return text ? `${text}`.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : null
}

// Flattens a publication from the API, reading the citation details from its "publicationFallbackCache" JSON
const toRecentPublication = publication => {
  let cache = {}

  try {
    cache = publication.publicationFallbackCache ? JSON.parse(publication.publicationFallbackCache) : {}
  } catch (e) {
    cache = {}
  }

  const doi = publication.publicationDoi
  let url = cache.URL || null

  if (doi) {
    url = doi.startsWith('http') ? doi : `https://doi.org/${doi}`
  }

  return {
    id: publication.publicationId,
    // Accessions the publication is linked to, removed together with it from the home page
    germplasmIds: publication.germplasmIds || [],
    title: getCslText(cache.title) || doi,
    hasDoi: !!doi,
    journal: getCslText(cache['container-title']),
    source: cache.source || 'N/A',
    url: url,
    date: formatDate(publication.createdOn)
  }
}

// Germplasm groups represent the crops
const cropGroupFilter = [{
  column: 'groupType',
  operator: 'and',
  comparator: 'equals',
  values: ['germinatebase']
}]

// Short counts: 999, 1K, 1.1K, 12.4K, 1.2M, 9.9B, then "+9.9B". Values are cut (not rounded) to one decimal,
// so 1,020 is 1K and 1,999 is 1.9K.
const COUNT_UNITS = [{ value: 1e9, suffix: 'B' }, { value: 1e6, suffix: 'M' }, { value: 1e3, suffix: 'K' }]
const formatCompactCount = count => {
  if (count < 1000) {
    return `${count}`
  }
  if (count >= 1e10) {
    return '+9.9B'
  }

  const unit = COUNT_UNITS.find(u => count >= u.value)
  const tenths = Math.floor(count / (unit.value / 10))
  return `${tenths % 10 === 0 ? tenths / 10 : (tenths / 10).toFixed(1)}${unit.suffix}`
}

// Asks a table endpoint for a single row and resolves with the total number of rows, which comes back in "count"
const fetchTotal = (apiCall, filter = null) => new Promise(resolve => {
  const query = {
    page: 1,
    limit: 1,
    prevCount: -1
  }

  if (filter) {
    query.filter = filter
  }

  apiCall(query, result => resolve((result && result.count) || 0))
})

// Publications linked to the database, which are the ones the home page shows
const databasePublicationFilter = [{
  column: 'isDatabasePub',
  comparator: 'equals',
  operator: 'and',
  values: [1]
}]

const isExternalFilter = isExternal => [{
  column: 'isExternal',
  comparator: 'equals',
  operator: 'and',
  values: [isExternal]
}]

// Totals shown in the statistics and in the quick access panel, in display order.
// "label" and "quick.unit" are [singular, plural]. "quick.icon" overrides the icon in the quick access panel.
// Without "quick" a total is not in the quick access panel, with "statistic: false" not in the statistics. With
// "onlyWhenPresent" its statistic and quick access entry only show above zero.
const TOTALS = [{
  key: 'datasets',
  icon: mdiDatabase,
  label: ['Dataset', 'Datasets'],
  quick: { label: 'Browse all datasets', page: Pages.datasets },
  // Same as the datasets page: internal and external datasets are queried separately and summed up
  load: () => Promise.all([0, 1].map(isExternal => fetchTotal(apiPostDatasetTable, isExternalFilter(isExternal))))
    .then(counts => counts.reduce((a, b) => a + b, 0))
}, {
  key: 'accessions',
  icon: mdiSprout,
  label: ['Germplasm', 'Germplasms'],
  quick: { label: 'Germplasm library', page: Pages.germplasm },
  load: () => fetchTotal(apiPostGermplasmTable)
}, {
  key: 'locations',
  icon: mdiMapMarkerOutline,
  label: ['Location', 'Locations'],
  quick: { label: 'Explore by location', page: Pages.locations, icon: mdiMapOutline, unit: ['site', 'sites'] },
  load: () => fetchTotal(apiPostLocationTable)
}, {
  key: 'traits',
  icon: mdiTagOutline,
  label: ['Trait measured', 'Traits measured'],
  quick: { label: 'Trait ontology browser', page: Pages.traits },
  load: () => fetchTotal(apiPostTraitTable)
}, {
  key: 'climates',
  icon: mdiWeatherSnowyRainy,
  label: ['Climate', 'Climates'],
  quick: { label: 'Climate data', page: Pages.climates },
  load: () => fetchTotal(apiPostClimateTable)
}, {
  // Quick access only (no statistic), and only shown when there are maps
  key: 'maps',
  icon: mdiDna,
  label: ['Genotypic map', 'Genotypic maps'],
  statistic: false,
  onlyWhenPresent: true,
  quick: { label: 'Genotypic maps', page: Pages.maps },
  load: () => fetchTotal(apiPostMapsTable)
}, {
  // Statistics only (no quick access entry), and only shown when there are markers
  key: 'markers',
  icon: mdiDna,
  label: ['Genotypic marker', 'Genotypic markers'],
  onlyWhenPresent: true,
  load: () => fetchTotal(apiPostMarkerTable)
}, {
  key: 'publications',
  icon: mdiBookOpenVariant,
  label: ['Publication', 'Publications'],
  quick: { label: 'Publications index', page: Pages.publications },
  // Same publications as the "Recent publications" list: the ones linked to the database
  load: () => fetchTotal(apiPostPublicationsTable, databasePublicationFilter)
}]

export default {
  components: {
    MdiIcon,
    AddPublicationModal,
    AddStoryModal,
    AddNewsModal,
    CarouselEditModal,
    RecentlyViewedPanel,
    SearchModule
  },
  data: function () {
    return {
      // The images of the carousel in the language in use (the hero), the one shown and where they end (the search bar)
      heroImages: [],
      heroIndex: 0,
      heroBottom: 0,
      // Flagship crops. "groupName" is the name of the matching germplasm group in Germinate.
      crops: FLAGSHIP_CROPS,
      // Germplasm groups (with their member count), keyed by lower-case group name. Null until loaded.
      cropGroups: null,
      // Latest publications for the "Recent publications" panel. Null until loaded.
      recentPublications: null,
      // Current page of "Announcements". Null until loaded.
      news: null,
      newsTotal: 0,
      newsPage: 1,
      // Publications: the page shown and how many there are
      publicationPage: 1,
      publicationTotal: 0,
      selectedNews: null,
      Pages,
      totalTypes: TOTALS,
      // Loaded totals, keyed by TOTALS key. Null until loaded.
      totals: TOTALS.reduce((result, total) => ({ ...result, [total.key]: null }), {}),
      // Statistics carousel: first visible statistic and how many fit
      statsIndex: 0,
      statsVisible: 5,
      // Which blocks are expanded
      open: {
        // Flagship crops: closed once the search is used
        crops: true,
        publications: true,
        news: true,
        quick: true
      },
      // Icon paths used directly in the template
      icons: {
        chevronUp: mdiChevronUp,
        reload: mdiRefresh,
        check: mdiCheck,
        search: mdiMagnify,
        chevronDown: mdiChevronDown,
        chevronRight: mdiChevronRight,
        openInNew: mdiOpenInNew,
        chevronLeft: mdiChevronLeft,
        calendarClock: mdiCalendarClock,
        delete: mdiDelete,
        publication: mdiBookOpenVariant,
        addStory: mdiCommentPlusOutline,
        addNews: mdiNewBox,
        carousel: mdiImageSizeSelectLarge
      }
    }
  },
  computed: {
    // The titles and texts of "homeHeroText", in the language in use (English when it isn't translated)
    heroTexts: function () {
      return parseHeroText(this.$t('homeHeroText'))
    },
    // How many slides: one per image, or (without images) one per text. One: nothing changes.
    heroCount: function () {
      return this.heroImages.length > 0 ? this.heroImages.length : this.heroTexts.length
    },
    // The text shown: that of the place of the image in "homeHeroText" when it is in the pattern #Title##Text, else
    // the last one before it that is (so with a single description the text stays, without animation, while the
    // images change); none in the pattern: the first one with a title
    heroTextIndex: function () {
      if (this.heroImages.length === 0) {
        return this.heroIndex
      }
      const count = this.heroImages.length
      for (let step = 0; step < count; step++) {
        const index = (this.heroIndex - step + count) % count
        if (this.heroTexts[index] && this.heroTexts[index].valid) {
          return index
        }
      }
      const titled = this.heroTexts.findIndex(slide => slide.title)
      return titled >= 0 ? titled : 0
    },
    // The images: from above the page (the space under the navigation) to the bottom of the search bar
    backdropStyle: function () {
      return this.heroBottom > 0 ? { height: `calc(${this.heroBottom}px + 1.75rem)` } : null
    },
    // Statistics shown in the carousel
    statTypes: function () {
      return this.totalTypes.filter(t => t.statistic !== false && (!t.onlyWhenPresent || this.totals[t.key] > 0))
    },
    // Totals with an entry in the quick access panel ("onlyWhenPresent" ones only above zero)
    quickTypes: function () {
      return this.totalTypes.filter(t => t.quick && (!t.onlyWhenPresent || this.totals[t.key] > 0))
    },
    statsMaxIndex: function () {
      return Math.max(0, this.statTypes.length - this.statsVisible)
    },
    canScrollStatsBack: function () {
      return this.statsIndex > 0
    },
    canScrollStatsForward: function () {
      return this.statsIndex < this.statsMaxIndex
    },
    ...mapGetters([
      'storeLocale',
      'storeServerSettings',
      'storeToken'
    ]),
    // Same rules as the original home page: sections follow "Visible dashboard sections" in the Germinate settings
    showPublicationSection: function () {
      return this.isDashboardSectionVisible('publications')
    },
    showDataStorySection: function () {
      return this.isDashboardSectionVisible('datastories')
    },
    showNewsSection: function () {
      return this.isDashboardSectionVisible('news')
    },
    // Panels only show when their section is enabled and they have content
    showPublicationPanel: function () {
      return this.showPublicationSection && !!this.recentPublications && this.recentPublications.length > 0
    },
    showNewsPanel: function () {
      return this.showNewsSection && !!this.news && this.news.length > 0
    },
    // Still waiting for publications or news: keep the column so the layout does not jump once they arrive
    mainColumnLoading: function () {
      return (this.showPublicationSection && this.recentPublications === null) || (this.showNewsSection && this.news === null)
    },
    showMainColumn: function () {
      return this.showPublicationPanel || this.showNewsPanel || this.mainColumnLoading
    },
    publicationPageCount: function () {
      return Math.ceil(this.publicationTotal / PUBLICATIONS_PER_PAGE)
    },
    newsPageCount: function () {
      return Math.ceil(this.newsTotal / NEWS_PER_PAGE)
    },
    timeFormatter: function () {
      return new Intl.RelativeTimeFormat((this.storeLocale || 'en_GB').split('_')[0], { numeric: 'always' })
    },
    // Adding publications, data stories and news requires at least data curator rights
    canAddContent: function () {
      return !!this.storeToken && userIsAtLeast(this.storeToken.userType, USER_TYPE_DATA_CURATOR)
    },
    // Same as the original home page: only administrators edit the image carousel
    canEditCarousel: function () {
      return !!this.storeToken && userIsAtLeast(this.storeToken.userType, USER_TYPE_ADMINISTRATOR)
    }
  },
  watch: {
    // The images of the other language
    storeLocale: function () {
      this.loadHeroImages()
    },
    // Another number of slides (images loaded, language changed): from the first one again
    heroCount: function () {
      this.heroIndex = 0
      this.startHeroTimer()
    },
    // The server settings can arrive after the page was mounted
    showPublicationSection: function (newValue) {
      if (newValue && this.recentPublications === null) {
        this.loadRecentPublications()
      }
    },
    showNewsSection: function (newValue) {
      if (newValue && this.news === null) {
        this.loadNews(1)
      }
    }
  },
  methods: {
    // The images of the carousel, in the language in use (English when it has none)
    loadHeroImages: function () {
      apiGetTemplateCarouselConfig(result => {
        const images = (result && (result[this.storeLocale] || result.en_GB)) || []
        this.heroImages = images.filter(image => image && image.name).map(image => ({
          name: image.name,
          src: getImageUrl(image.name, {
            name: image.name,
            token: this.storeToken ? this.storeToken.imageToken : null,
            type: 'template',
            size: 'large'
          })
        }))
      }, {
        codes: [404],
        // No carousel: only the texts
        callback: () => {
          this.heroImages = []
        }
      })
    },
    updateHeroBottom: function () {
      const home = this.$refs.home
      const search = this.$refs.searchModule ? this.$refs.searchModule.$el : null
      const bar = search ? (search.querySelector('.home-search-button') || search) : null
      this.heroBottom = (home && bar) ? bar.getBoundingClientRect().bottom - home.getBoundingClientRect().top : 0
    },
    // The next slide (image and text) every HERO_INTERVAL, when there are several
    startHeroTimer: function () {
      this.stopHeroTimer()
      if (this.heroCount > 1) {
        this.heroTimer = setInterval(() => {
          this.heroIndex = (this.heroIndex + 1) % this.heroCount
        }, HERO_INTERVAL)
      }
    },
    stopHeroTimer: function () {
      if (this.heroTimer) {
        clearInterval(this.heroTimer)
        this.heroTimer = null
      }
    },
    // 5 statistics on wide screens, fewer on smaller ones
    updateStatsVisible: function () {
      const width = window.innerWidth
      this.statsVisible = width >= 1200 ? 5 : (width >= 768 ? 3 : (width >= 480 ? 2 : 1))
      this.statsIndex = Math.min(this.statsIndex, this.statsMaxIndex)
    },
    scrollStats: function (direction) {
      this.statsIndex = Math.max(0, Math.min(this.statsMaxIndex, this.statsIndex + direction))
    },
    toggle: function (block) {
      this.open[block] = !this.open[block]
    },
    // Collapse transition (see .home-collapse-*): the height goes from the content's to 0 (or back), with a fade
    collapseBeforeEnter: function (el) {
      el.style.height = '0px'
    },
    collapseEnter: function (el) {
      el.style.height = `${el.scrollHeight}px`
    },
    collapseBeforeLeave: function (el) {
      el.style.height = `${el.scrollHeight}px`
    },
    collapseLeave: function (el) {
      // Measured first, so the height really goes down from there
      el.getBoundingClientRect()
      el.style.height = '0px'
    },
    collapseAfter: function (el) {
      el.style.height = ''
    },
    // Everything is visible when the server does not restrict the dashboard sections
    isDashboardSectionVisible: function (section) {
      if (this.storeServerSettings && this.storeServerSettings.dashboardSections) {
        return this.storeServerSettings.dashboardSections.includes(section)
      } else {
        return true
      }
    },
    // Picks the singular or plural form from [singular, plural]
    pluralise: function (count, forms) {
      return count === 1 ? forms[0] : forms[1]
    },
    getTotalText: function (key) {
      const count = this.totals[key]
      return count === null ? '…' : formatCompactCount(count)
    },
    // Totals of zero disable their statistic and quick access entry
    isTotalEmpty: function (key) {
      return this.totals[key] === 0
    },
    loadTotal: function (key) {
      const total = TOTALS.find(t => t.key === key)

      total.load().then(count => {
        this.totals[total.key] = count
      })
    },
    loadTotals: function () {
      TOTALS.forEach(total => this.loadTotal(total.key))
    },
    getCropGroup: function (crop) {
      return this.cropGroups ? this.cropGroups[crop.groupName.toLowerCase()] : null
    },
    getCropCount: function (crop) {
      if (this.cropGroups === null) {
        return null
      }

      const group = this.getCropGroup(crop)
      return group ? (group.count || 0) : 0
    },
    // The Search page with the members of the group (the accessions), breadcrumb "Flagship crop > <group>"
    getCropLink: function (crop) {
      const group = this.getCropGroup(crop)

      return {
        name: Pages.search,
        query: {
          searchTable: 'groupGermplasm',
          searchGroup: `${group.groupId}`,
          searchFilter: '[]',
          searchCrumbs: JSON.stringify(['Flagship crop', group.groupName])
        }
      }
    },
    getCropCountText: function (crop) {
      const count = this.getCropCount(crop)

      if (count === null) {
        return '…'
      }

      return `${count.toLocaleString()} ${this.pluralise(count, ['germplasm', 'germplasms'])}`
    },
    // Crops without accessions (or without a matching group) are disabled once the counts are loaded
    isCropDisabled: function (crop) {
      return this.getCropCount(crop) === 0
    },
    formatDate,
    getNewsType: function (newsItem) {
      return NEWS_TYPES[newsItem.newstypeName] || NEWS_TYPES.General
    },
    formatTimeAgo: function (date) {
      let duration = (new Date(date) - new Date()) / 1000

      for (let i = 0; i < TIME_DIVISIONS.length; i++) {
        const division = TIME_DIVISIONS[i]
        if (Math.abs(duration) < division.amount) {
          return this.timeFormatter.format(Math.round(duration), division.name)
        }
        duration /= division.amount
      }
    },
    loadNews: function (page) {
      const query = {
        page: page,
        limit: NEWS_PER_PAGE,
        prevCount: -1,
        orderBy: 'createdOn',
        ascending: 0,
        filter: [{
          column: 'newstypeName',
          comparator: 'inSet',
          operator: 'and',
          values: Object.keys(NEWS_TYPES)
        }]
      }

      apiPostNewsTable(query, result => {
        this.news = (result && result.data) ? result.data : []
        this.newsTotal = (result && result.count) || 0
        this.newsPage = page

        // The last item of the last page was deleted: go back one page
        if (this.news.length === 0 && page > 1) {
          this.loadNews(page - 1)
        }
      })
    },
    showNewsDetails: function (newsItem) {
      this.selectedNews = JSON.parse(JSON.stringify(newsItem))
      this.$nextTick(() => this.$refs.newsModal.show())
    },
    deleteNewsItem: function (id) {
      this.$bvModal.msgBoxConfirm(this.$t('modalTitleSure'), {
        okVariant: 'danger',
        okTitle: this.$t('genericYes'),
        cancelTitle: this.$t('genericNo')
      })
        .then(value => {
          if (value) {
            apiDeleteNews(id, result => {
              if (result) {
                this.$refs.newsModal.hide()
                this.loadNews(this.newsPage)
              }
            })
          }
        })
    },
    // Opens the Germinate search page: /search/{term}, plus ?searchType={scope} unless searching everything
    // Publications linked to the database, like the publications section of the original home page
    // Publications of the database, newest first, 5 per page
    loadRecentPublications: function (page = 1) {
      const query = {
        page: page,
        limit: PUBLICATIONS_PER_PAGE,
        prevCount: -1,
        orderBy: 'createdOn',
        ascending: 0,
        filter: databasePublicationFilter
      }

      apiPostPublicationsTable(query, result => {
        this.recentPublications = (result && result.data) ? result.data.map(toRecentPublication) : []
        this.publicationTotal = (result && result.count) || 0
        this.publicationPage = page

        // The last item of the last page was deleted: go back one page
        if (this.recentPublications.length === 0 && page > 1) {
          this.loadRecentPublications(page - 1)
        }
      })
    },
    // The source of a publication's details is Crossref
    isCrossref: function (source) {
      return `${source || ''}`.trim().toLowerCase() === 'crossref'
    },
    // Germinate cannot delete a publication itself, so this removes its links to the database (which takes it off this
    // list) and to accessions. Links to datasets, groups and experiments are not known here and are kept.
    // The publication in the Details tab of the publications page
    openPublication: function (publication) {
      this.$router.push({ name: Pages.publicationDetails, params: { publicationId: publication.id } })
    },
    deleteRecentPublication: function (publication) {
      this.$bvModal.msgBoxConfirm(this.$t('modalTitleSure'), {
        okVariant: 'danger',
        okTitle: this.$t('genericYes'),
        cancelTitle: this.$t('genericNo')
      })
        .then(value => {
          if (!value) {
            return
          }

          const references = [
            ['database', null],
            ...publication.germplasmIds.map(id => ['germplasm', id])
          ]

          Promise.all(references.map(([type, id]) => new Promise(resolve => {
            apiDeletePublicationReference(publication.id, type, id, resolve, { codes: [], callback: resolve })
          }))).then(() => {
            this.loadTotal('publications')
            this.loadRecentPublications(this.publicationPage)
            // The sidebar badges count publications too
            emitter.emit('update-sidebar-menu')
          })
        })
    },
    // A publication added from the "Add" panel shows up in the total and in the recent list
    onPublicationAdded: function () {
      this.loadTotal('publications')
      this.loadRecentPublications()
      emitter.emit('update-sidebar-menu')
    },
    loadCropGroups: function () {
      const query = {
        page: 1,
        limit: MAX_JAVA_INTEGER,
        filter: cropGroupFilter
      }

      apiPostGroupTable(query, result => {
        const groups = {}

        if (result && result.data) {
          result.data.forEach(group => {
            groups[group.groupName.toLowerCase()] = group
          })
        }

        this.cropGroups = groups
      })
    }
  },
  beforeDestroy: function () {
    window.removeEventListener('resize', this.updateStatsVisible)
    this.stopHeroTimer()
    if (this.heroObserver) {
      this.heroObserver.disconnect()
    }
  },
  mounted: function () {
    // The bottom of the search bar (its button: the lists under it don't count), followed when the page changes size
    // (other text, flagship crops opened or closed, width of the window)
    if (this.$refs.home && window.ResizeObserver) {
      this.heroObserver = new ResizeObserver(() => this.updateHeroBottom())
      this.heroObserver.observe(this.$refs.home)
      if (this.$refs.hero) {
        this.heroObserver.observe(this.$refs.hero)
      }
    }
    this.loadHeroImages()
    this.startHeroTimer()
    this.updateStatsVisible()
    window.addEventListener('resize', this.updateStatsVisible)
    this.loadCropGroups()
    this.loadTotals()
    if (this.showPublicationSection) {
      this.loadRecentPublications()
    }
    if (this.showNewsSection) {
      this.loadNews(1)
    }
  }
}
</script>

<style src="@/assets/custom-page.css"></style>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

/* Light palette. Every colour used on the page is a token here and is redefined for dark mode below. */
.home {
  --home-green: #3b6b35;
  --home-green-hover: #2a4f26;
  --home-green-soft: #eaf2e6;
  --home-dot: #6aa84f;
  --home-button: #3b6b35;
  --home-button-hover: #2f5a2a;
  --home-on-button: #ffffff;
  --home-text: #1f2120;
  --home-text-subtle: #4a4d4b;
  --home-muted: #6b6f6c;
  --home-placeholder: #8a8d8a;
  --home-border: #e2e3df;
  --home-surface: #ffffff;
  --home-surface-hover: #fafaf8;
  --home-shadow: rgba(0, 0, 0, 0.06);

  --home-wheat-bg: #fdf6e3; --home-wheat-border: #f0d68f; --home-wheat-fg: #c9a227;
  --home-barley-bg: #fbf2e8; --home-barley-border: #e9cba9; --home-barley-fg: #b5844e;
  --home-pea-bg: #edf7ee; --home-pea-border: #a9d6ae; --home-pea-fg: #3f9a4a;
  --home-lettuce-bg: #edf6f0; --home-lettuce-border: #9fcbaa; --home-lettuce-fg: #4b8f5c;
  --home-brassica-bg: #eef1fa; --home-brassica-border: #b6c0e4; --home-brassica-fg: #6b7fc4;

  --home-badge-bg: #eaf2e6; --home-badge-fg: #3b6b35;
  --home-neutral-bg: #f0f1ee;
  --home-badge-neutral-bg: #e7e8e5; --home-badge-neutral-fg: #5c605d;
  --home-news-updates-bg: #e6f0fb; --home-news-updates-fg: #2c6aa8;
  --home-news-data-bg: #fdf3d6; --home-news-data-fg: #946f0c;

  /* 1240px was 10 of 12 grid columns: one more column on each side (12 of 12). Kept with paddings: the images of
     the hero go from edge to edge behind the page. Its own layer, so they can be drawn under everything in it. */
  position: relative;
  z-index: 0;
  padding: 0.5rem max(0px, calc((100% - 1488px) / 2)) 3rem;
  font-family: 'DM Sans', -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: var(--home-text);
}

.home a {
  text-decoration: none;
}

/* Dark palette, aligned with src/assets/dark-mode.scss (page background rgb(24, 26, 27), borders rgb(62, 67, 70)) */
body.dark-mode .home {
  color-scheme: dark;

  --home-green: #8cc47e;
  --home-green-hover: #a8d69c;
  --home-green-soft: rgba(106, 168, 79, 0.16);
  --home-dot: #8cc47e;
  --home-button: #4a7f42;
  --home-button-hover: #578f4e;
  --home-on-button: #ffffff;
  --home-text: #e8e6e3;
  --home-text-subtle: #c4beb5;
  --home-muted: #a39d93;
  --home-placeholder: #8c867d;
  --home-border: rgb(62, 67, 70);
  --home-surface: rgb(31, 34, 35);
  --home-surface-hover: rgb(38, 42, 43);
  --home-shadow: rgba(0, 0, 0, 0.4);

  --home-wheat-bg: rgba(201, 162, 39, 0.12); --home-wheat-border: rgba(201, 162, 39, 0.4); --home-wheat-fg: #e3c158;
  --home-barley-bg: rgba(181, 132, 78, 0.14); --home-barley-border: rgba(181, 132, 78, 0.45); --home-barley-fg: #d9a874;
  --home-pea-bg: rgba(63, 154, 74, 0.14); --home-pea-border: rgba(63, 154, 74, 0.45); --home-pea-fg: #7cc785;
  --home-lettuce-bg: rgba(75, 143, 92, 0.14); --home-lettuce-border: rgba(75, 143, 92, 0.45); --home-lettuce-fg: #86c296;
  --home-brassica-bg: rgba(107, 127, 196, 0.15); --home-brassica-border: rgba(107, 127, 196, 0.45); --home-brassica-fg: #a3b3ea;

  --home-badge-bg: rgba(106, 168, 79, 0.18); --home-badge-fg: #9fd18f;
  --home-neutral-bg: rgba(255, 255, 255, 0.06);
  --home-badge-neutral-bg: rgba(255, 255, 255, 0.1); --home-badge-neutral-fg: #c4beb5;
  --home-news-updates-bg: rgba(80, 150, 220, 0.18); --home-news-updates-fg: #9cc6f0;
  --home-news-data-bg: rgba(201, 162, 39, 0.18); --home-news-data-fg: #e3c158;
}

/* Hero */
/* The images of the carousel: over the gutters of the container and up to the navigation, under everything of the
   page, blurred, with a veil so the text stays readable, fading into the page (light or dark) in their lower part */
.home-backdrop {
  position: absolute;
  z-index: -1;
  top: -1.75rem;
  left: -15px;
  right: -15px;
  /* Without the measure of the hero (set as a style): about its height */
  height: 18rem;
  overflow: hidden;
  pointer-events: none;
  -webkit-mask-image: linear-gradient(to bottom, #000 72%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 72%, transparent 100%);
}
.home-hero-image {
  position: absolute;
  /* Larger than the area so the blurred edges stay outside of it */
  inset: -24px;
  background-position: center;
  background-size: cover;
  filter: blur(8px);
  opacity: 0;
  transition: opacity 2s ease-in-out;
}
.home-hero-image.active {
  opacity: 1;
}
.home-hero-veil {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.72);
}
body.dark-mode .home-hero-veil {
  background: rgba(31, 34, 35, 0.78);
}
/* The texts in the same place (the block takes the longest one); the title and text change with the image, the
   old one fading out while the new one fades in. One column wider than the text was (780px + 124px). */
.home-hero-slides {
  display: grid;
  max-width: 904px;
}
.home-hero-text {
  grid-area: 1 / 1;
  opacity: 0;
  pointer-events: none;
  transition: opacity 1s ease-in-out;
}
.home-hero-text.active {
  opacity: 1;
  pointer-events: auto;
}
@media (prefers-reduced-motion: reduce) {
  .home-hero-image,
  .home-hero-text {
    transition: none;
  }
}
.home-title {
  font-size: 2.9rem;
  font-weight: 500;
  /* Fixed (the titles are not h1 elements, see the hero) */
  line-height: 1.2;
  letter-spacing: -0.01em;
  margin: 0.75rem 0 1rem;
}
.home-lead {
  font-size: 1.25rem;
  line-height: 1.6;
  color: var(--home-muted);
  margin: 0;
}

/* Sections */
.home-section {
  margin-top: 3.5rem;
}
.home-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}
/* Flagship crops collapsed: only the title and the chevron */
.home-crops-section .home-section-header {
  transition: margin-bottom 0.35s ease;
}
.home-crops-section.collapsed .home-section-header {
  margin-bottom: 0;
}
/* Collapsing: the crops slide up out of sight and fade, opening does the opposite */
.home-collapse-enter-active,
.home-collapse-leave-active {
  overflow: hidden;
  transition: height 0.35s ease, opacity 0.3s ease, transform 0.35s ease;
}
.home-collapse-enter,
.home-collapse-leave-to {
  opacity: 0;
  transform: translateY(-0.75rem);
}
.home-section-title {
  font-size: 1.6rem;
  font-weight: 500;
  margin: 0;
}
.home-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-weight: 500;
  color: var(--home-green);
}
.home-link:hover {
  color: var(--home-green-hover);
}
.home-link-small {
  font-size: 0.85rem;
}

/* Crops */
.home-crops {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1.25rem;
}
/* A link as a whole: no underline, the colours of the card */
.home-crop-card {
  color: inherit;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.75rem 1rem;
  background: var(--home-surface);
  border: 1px solid var(--home-border);
  border-radius: 12px;
  transition: box-shadow 0.15s, transform 0.15s;
}
.home-crop-card:hover {
  color: inherit;
  text-decoration: none;
  box-shadow: 0 6px 20px var(--home-shadow);
  transform: translateY(-2px);
}
.home-crop-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 1px solid;
}
.home-crop-name {
  font-size: 1.3rem;
  font-weight: 500;
  margin-top: 1.1rem;
}
.home-crop-count {
  font-size: 0.85rem;
  color: var(--home-muted);
  margin-top: 0.3rem;
}

/* Crop without accessions: the card and everything inside it is greyed out and not interactive */
.home-crop-card.disabled {
  opacity: 0.5;
  filter: grayscale(1);
  cursor: not-allowed;
}
.home-crop-card.disabled:hover {
  box-shadow: none;
  transform: none;
}

.home-crop-wheat { background: var(--home-wheat-bg); border-color: var(--home-wheat-border); color: var(--home-wheat-fg); }
.home-crop-barley { background: var(--home-barley-bg); border-color: var(--home-barley-border); color: var(--home-barley-fg); }
.home-crop-pea { background: var(--home-pea-bg); border-color: var(--home-pea-border); color: var(--home-pea-fg); }
.home-crop-lettuce { background: var(--home-lettuce-bg); border-color: var(--home-lettuce-border); color: var(--home-lettuce-fg); }
.home-crop-brassica { background: var(--home-brassica-bg); border-color: var(--home-brassica-border); color: var(--home-brassica-fg); }

/* Stats */
/* Statistics carousel: arrows in their own columns left and right, so they never cover the statistics */
.home-stats {
  display: flex;
  align-items: stretch;
  margin-top: 2.75rem;
  background: var(--home-surface);
  border: 1px solid var(--home-border);
  border-radius: 12px;
}
.home-stats-viewport {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  border-radius: 12px;
}
.home-stats.has-nav .home-stats-viewport {
  border-radius: 0;
}
.home-stats-track {
  display: flex;
  transition: transform 0.4s ease;
}
.home-stat {
  display: flex;
  align-items: center;
  flex: 0 0 calc(100% / var(--home-stats-visible, 5));
  min-width: 0;
  gap: 0.9rem;
  padding: 1.4rem 1.5rem;
}
.home-stat-text {
  min-width: 0;
}
/* Fades at the edges of the statistics that have more to show */
.home-stats-viewport::before,
.home-stats-viewport::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 1;
  width: 4rem;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
}
.home-stats-viewport::before {
  left: 0;
  background: linear-gradient(to right, var(--home-surface) 15%, transparent);
}
.home-stats-viewport::after {
  right: 0;
  background: linear-gradient(to left, var(--home-surface) 15%, transparent);
}
.home-stats.has-prev .home-stats-viewport::before,
.home-stats.has-next .home-stats-viewport::after {
  opacity: 1;
}
/* Plain arrows, no circle. An arrow only takes space while it can be used: narrow for a mouse,
   wider on touch screens so it is easy to hit with a finger. */
.home-stats-nav {
  display: none;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--home-muted);
  cursor: pointer;
  transition: color 0.15s;
}
.home-stats.has-nav .home-stats-nav {
  display: inline-flex;
}
.home-stats-nav:hover,
.home-stats-nav:focus-visible {
  color: var(--home-green);
}
.home-stats.has-nav .home-stats-nav.hidden {
  display: none;
}
@media (pointer: coarse), (max-width: 767px) {
  .home-stats-nav {
    width: 2.75rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .home-stats-track {
    transition: none;
  }
}
.home-stat + .home-stat {
  border-left: 1px solid var(--home-border);
}
.home-stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--home-green-soft);
  color: var(--home-green);
}
.home-stat-value {
  font-size: 1.3rem;
  font-weight: 500;
  line-height: 1.2;
}
.home-stat-label {
  font-size: 0.85rem;
  line-height: 1.3;
  color: var(--home-muted);
}

/* Statistic without data: icon and content greyed out */
.home-stat.disabled {
  opacity: 0.5;
  filter: grayscale(1);
  cursor: not-allowed;
}

/* Panels */
.home-side {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}
/* Buttons share the row equally, however many of them are visible */
.home-add-actions {
  display: flex;
  gap: 0.75rem;
  padding: 1.25rem 1.75rem;
}
.home-add-action {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0.5rem;
  border: 1px solid var(--home-border);
  border-radius: 10px;
  background: var(--home-surface);
  color: var(--home-text);
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
/* The line under the others: closer to them, its button as wide as one of three on the line above */
.home-add-actions-more {
  padding-top: 0;
}
.home-add-actions-more .home-add-action {
  flex: 0 0 calc((100% - 1.5rem) / 3);
}
.home-add-action:hover {
  background: var(--home-surface-hover);
  border-color: var(--home-green);
}
.home-panels {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.75rem;
  margin-top: 2.75rem;
  align-items: start;
}
/* Without the publications panel the side column takes the full width */
.home-panels-single {
  grid-template-columns: 1fr;
}
.home-panel {
  background: var(--home-surface);
  border: 1px solid var(--home-border);
  border-radius: 12px;
  overflow: hidden;
}
.home-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.4rem 1.75rem;
  border-bottom: 1px solid var(--home-border);
}
/* Small outlined button, used for "View all" in a block header */
.home-small-button {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.7rem;
  border: 1px solid var(--home-border);
  border-radius: 8px;
  background: var(--home-surface);
  color: var(--home-green);
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s, border-color 0.15s;
}
.home-small-button:hover,
.home-small-button:focus-visible {
  border-color: var(--home-green);
  background: var(--home-green-soft);
  color: var(--home-green);
  text-decoration: none;
}
.home-small-button.disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* Right side of a block header: its own actions, then the collapse chevron */
.home-panel-tools {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.home-panel-toggle {
  display: inline-flex;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--home-muted);
  cursor: pointer;
}
.home-panel-toggle:hover,
.home-panel-toggle:focus-visible {
  color: var(--home-text);
}
.home-panel-chevron {
  display: inline-flex;
  transition: transform 0.2s;
}
.home-panel-chevron.closed {
  transform: rotate(180deg);
}
/* A collapsed block keeps only its header, without the line under it */
.home-panel.collapsed .home-panel-header {
  border-bottom: none;
}
.home-panel-title {
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0;
}

.home-recent-item {
  display: flex;
  align-items: center;
  gap: 1.1rem;
  padding: 1.1rem 1.75rem;
}
.home-recent-item + .home-recent-item {
  border-top: 1px solid var(--home-border);
}
.home-recent-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
}
.home-recent-body {
  flex: 1;
  min-width: 0;
}
.home-recent-title {
  font-size: 0.98rem;
  color: var(--home-text);
  /* Long titles are cut with "..." (the full title is in the tooltip) */
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.home-recent-delete {
  padding: 0;
  margin-top: 0.2rem;
  border: none;
  font-size: 0.82rem;
  line-height: 1.3;
}
.home-recent-meta {
  margin-top: 0.2rem;
  font-size: 0.82rem;
  color: var(--home-muted);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.home-recent-link {
  background: var(--home-neutral-bg);
  color: var(--home-muted);
  transition: color 0.15s;
}
.home-recent-link:hover {
  color: var(--home-text);
}
.home-recent-link.disabled {
  opacity: 0.5;
}
/* Publication rows open the publication: hover as the news rows */
.home-publication-item {
  cursor: pointer;
}
.home-publication-item:hover,
.home-publication-item:focus {
  background: var(--home-surface-hover);
  outline: none;
}
.home-publication-item:hover .home-recent-link,
.home-publication-item:focus .home-recent-link {
  color: var(--home-text);
}
.home-publication-icon .fa-book {
  font-size: 14px;
}
/* Icon inside a badge (Crossref): a bit bigger than its text, which keeps its size */
.home-badge-icon {
  margin-right: 0.3em;
  font-size: 1.3em;
  vertical-align: -0.2em;
}
/* Left column: publications and news stacked */
.home-main {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  min-width: 0;
}

/* News rows are buttons that open the details */
.home-news-item {
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  font: inherit;
  cursor: pointer;
}
.home-news-item + .home-news-item {
  border-top: 1px solid var(--home-border);
}
.home-news-item:hover {
  background: var(--home-surface-hover);
}
.home-news-item:hover .home-recent-link {
  color: var(--home-text);
}
.home-news-item .home-recent-meta {
  margin-top: 0.35rem;
}
/* Title (cut with "...") and date share the first line */
.home-news-head {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  min-width: 0;
}
.home-news-head .home-recent-title {
  flex: 1 1 auto;
  min-width: 0;
}
.home-news-date {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
  white-space: nowrap;
}
/* Icon colours per news type (general news keeps the neutral grey) */
.home-news-icon-updates,
.home-news-item:hover .home-news-icon-updates {
  background: var(--home-news-updates-bg);
  color: var(--home-news-updates-fg);
}
.home-news-icon-data,
.home-news-item:hover .home-news-icon-data {
  background: var(--home-news-data-bg);
  color: var(--home-news-data-fg);
}

/* Title with a count next to it, same look as the active "Search within" chip */
.home-panel-heading {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}
.home-count-badge {
  padding: 0.05rem 0.6rem;
  border: 1px solid var(--home-green);
  border-radius: 999px;
  background: var(--home-green-soft);
  color: var(--home-green);
  font-size: 0.8rem;
  font-weight: 500;
}

/* Previous / next chevrons in the panel header */
.home-pager {
  display: flex;
  gap: 0.25rem;
}
.home-pager-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--home-text);
  cursor: pointer;
}
.home-pager-button:hover:not(:disabled) {
  background: var(--home-surface-hover);
}
.home-pager-button:disabled {
  color: var(--home-muted);
  opacity: 0.4;
  cursor: not-allowed;
}
.home-link.disabled {
  opacity: 0.5;
  pointer-events: none;
}
.home-recent-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  gap: 0.35rem;
}
.home-recent-date {
  font-size: 0.82rem;
  color: var(--home-muted);
}
.home-badge {
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
  font-size: 0.78rem;
  font-weight: 500;
}
.home-badge-source { background: var(--home-badge-bg); color: var(--home-badge-fg); }
/* News type badges use the same colours as their icon */
.home-news-badge-general { background: var(--home-badge-neutral-bg); color: var(--home-badge-neutral-fg); }
.home-news-badge-updates { background: var(--home-news-updates-bg); color: var(--home-news-updates-fg); }
.home-news-badge-data { background: var(--home-news-data-bg); color: var(--home-news-data-fg); }

.home-quick-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.75rem;
  color: var(--home-text);
}
.home-quick-item + .home-quick-item {
  border-top: 1px solid var(--home-border);
}
.home-quick-item.disabled {
  opacity: 0.5;
  filter: grayscale(1);
  pointer-events: none;
}
.home-quick-item:hover {
  background: var(--home-surface-hover);
  color: var(--home-text);
}
.home-quick-label {
  flex: 1;
  font-size: 0.98rem;
}
.home-quick-count {
  font-size: 0.85rem;
  color: var(--home-muted);
}
.home-quick-chevron {
  color: var(--home-text-subtle);
}

/* Responsive */
@media (max-width: 1199px) {
  .home-crops {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 991px) {
  .home-panels {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 767px) {
  .home-title {
    font-size: 2.1rem;
  }
  .home-lead {
    font-size: 1.05rem;
  }
  .home-crops {
    grid-template-columns: repeat(2, 1fr);
  }
  .home-search {
    flex-wrap: wrap;
    height: auto;
  }
  .home-search-input {
    height: 56px;
  }
  .home-search-select {
    height: 48px;
    flex: 1;
    border-left: none;
    border-top: 1px solid var(--home-border);
  }
  .home-search-button {
    height: 48px;
    justify-content: center;
  }
  .home-recent-item {
    flex-wrap: wrap;
  }
  .home-recent-side {
    flex-direction: row;
    align-items: center;
    width: 100%;
    padding-left: calc(32px + 1.1rem);
  }
}
</style>
