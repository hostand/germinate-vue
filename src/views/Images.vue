<template>
  <!-- Images in the look of the custom pages: the title, a Grid tab (the gallery of the germplasm page, with every image)
       and a Table tab (the table of the images, filtered by tag) -->
  <div class="custom-page images-page">
    <header class="cp-page-header">
      <h1 class="cp-page-title">{{ $t('pageImagesTitle') }}</h1>
    </header>

    <b-tabs class="im-tabs" nav-class="im-tabs-nav" v-model="tabIndex">
      <!-- Grid: the cards of the germplasm images, all of them -->
      <b-tab>
        <template #title><i class="fa-solid fa-table-cells-large im-tab-icon" aria-hidden="true" />{{ $t('pageImagesTabGrid') }}</template>
        <div class="im-tab-panel">
          <PassportImageGallery allImages :perPage="12" ref="gallery" />
        </div>
      </b-tab>

      <!-- Table: all images, the tags above it filter it -->
      <b-tab lazy>
        <template #title><i class="fa-solid fa-table-list im-tab-icon" aria-hidden="true" />{{ $t('pageImagesTabTable') }}</template>
        <div class="im-tab-panel">
          <div class="im-tags" v-if="tags.length > 0">
            <span class="im-tags-label">{{ $t('widgetImageTagsTitle') }}:</span>
            <button type="button" :class="['im-chip', { active: tag === null }]" :aria-pressed="tag === null" @click="tagClicked(null)">{{ $t('buttonAll') }}</button>
            <button type="button"
                    v-for="t in tags"
                    :key="'im-tag-' + t.tagId"
                    :class="['im-chip', { active: tag !== null && tag.tagId === t.tagId }]"
                    :aria-pressed="tag !== null && tag.tagId === t.tagId"
                    @click="tagClicked(t)">
              <i class="fa-solid fa-tag" aria-hidden="true" /> {{ t.tagName }}
            </button>
          </div>
          <ImageTable :getData="getData" :downloadTable="downloadImages" :filterOn="filterOn" ref="imageTable" v-on:tag-clicked="tagClicked" v-on:filter-changed="onFilterChanged" />
        </div>
      </b-tab>
    </b-tabs>
  </div>
</template>

<script>
import ImageTable from '@/components/tables/ImageTable'
import PassportImageGallery from '@/components/images/PassportImageGallery'
import { apiPostImages, apiPostImagesExport, apiGetImageTags } from '@/mixins/api/misc.js'

const emitter = require('tiny-emitter/instance')

export default {
  components: {
    ImageTable,
    PassportImageGallery
  },
  data: function () {
    return {
      tabIndex: 0,
      // All tags (Table tab) and the one filtering the table (null: all images)
      tags: [],
      tag: null,
      filterOn: null
    }
  },
  watch: {
    tag: function (newValue) {
      // Filter based on selected tag
      if (!newValue) {
        this.filterOn = []
      } else {
        this.filterOn = [{
          column: {
            name: 'tags',
            type: 'json'
          },
          comparator: 'contains',
          operator: 'and',
          values: [newValue.tagName]
        }]
      }
    }
  },
  methods: {
    // The filter of the table emptied: no tag chosen any more
    onFilterChanged: function (filter) {
      if (filter === null || filter.filter == null || filter.filter.length === 0) {
        this.tag = null
      }
    },
    tagClicked: function (tag) {
      this.tag = tag
      this.$nextTick(() => this.$refs.imageTable && this.$refs.imageTable.refresh())
    },
    getData: function (data, callback) {
      return apiPostImages(data, callback)
    },
    downloadImages: function (data, callback) {
      return apiPostImagesExport(data, result => {
        result.forEach(r => this.$store.commit('ON_ASYNC_JOB_UUID_ADD_MUTATION', r.uuid))

        // Show the sidebar
        emitter.emit('toggle-aside', 'download')
        emitter.emit('show-loading', false)
      })
    }
  },
  mounted: function () {
    apiGetImageTags(result => {
      this.tags = (result && result.data) ? result.data : []
    })
  }
}
</script>

<style src="@/assets/custom-page.css"></style>
<style scoped>
.images-page {
  padding: 0.5rem 0 3rem;
}
/* Tabs: as on the locations page */
.im-tabs {
  margin-top: 2.25rem;
}
.im-tabs >>> .im-tabs-nav {
  flex-wrap: wrap;
  border-bottom: 1px solid var(--cp-border);
}
.im-tabs >>> .im-tabs-nav .nav-link {
  display: inline-flex;
  align-items: center;
  padding: 0.7rem 1.25rem;
  border: 1px solid transparent;
  border-radius: 10px 10px 0 0;
  color: var(--cp-muted);
  font-weight: 600;
  line-height: 1.5;
}
.im-tabs >>> .im-tabs-nav .nav-link:hover,
.im-tabs >>> .im-tabs-nav .nav-link:focus {
  border-color: transparent;
  color: var(--cp-text);
}
.im-tabs >>> .im-tabs-nav .nav-link.active,
body.dark-mode .im-tabs >>> .im-tabs-nav .nav-link.active,
body.dark-mode .im-tabs >>> .im-tabs-nav .nav-link.active:focus {
  border-color: var(--cp-border) var(--cp-border) var(--cp-surface);
  background: var(--cp-surface);
  color: var(--cp-text);
}
.im-tab-icon {
  width: 1.1em;
  margin-right: 0.5rem;
  font-size: 0.95em;
  line-height: 1;
  text-align: center;
}
/* The icon of the active tab in the green of the icons of the sidebar menu */
.im-tabs >>> .im-tabs-nav .nav-link.active .im-tab-icon {
  color: var(--cp-green);
}
.im-tab-panel {
  margin-top: 1.25rem;
}

/* Tags of the Table tab: the chips of the gallery */
.im-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}
.im-tags-label {
  color: var(--cp-muted);
  font-size: 0.85rem;
}
.im-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.9rem;
  border: 1px solid var(--cp-border);
  border-radius: 999px;
  background: var(--cp-surface);
  color: var(--cp-text-subtle);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}
.im-chip .fa-tag {
  font-size: 0.75rem;
}
.im-chip.active {
  border-color: var(--cp-green);
  background: var(--cp-green-soft);
  color: var(--cp-green);
}
</style>
