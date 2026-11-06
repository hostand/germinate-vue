<template>
  <!-- Publications in the look of the custom pages: a List tab with the table and, once a publication is selected, a
       Details tab (with a close button, back to the list) showing it over the width of the page -->
  <div class="custom-page publications-page">
    <header class="cp-page-header">
      <h1 class="cp-page-title">{{ $t('pagePublicationsTitle') }}</h1>
    </header>

    <b-tabs class="pb-tabs" nav-class="pb-tabs-nav" v-model="tabIndex">
      <!-- All publications -->
      <b-tab>
        <template #title><i class="fa-solid fa-book pb-tab-icon" aria-hidden="true" />List</template>
        <div class="pb-tab-panel">
          <!-- Data curators add a publication of the database with the [+] below the table, like on the home page -->
          <PublicationTable :getData="getData"
                            :filterOn="filterOn"
                            :tableActions="userIsDataCurator ? tableActions : null"
                            ref="publicationTable"
                            @publication-selected="onPublicationSelected" />
          <AddPublicationModal ref="addPublicationModal" v-if="userIsDataCurator" @publication-added="onPublicationAdded" />
        </div>
      </b-tab>

      <!-- The selected publication; the cross closes it and goes back to the list -->
      <b-tab v-if="publicationId">
        <template #title>
          <i class="fa-solid fa-file-lines pb-tab-icon" aria-hidden="true" />{{ $t('pagePublicationDetailsTab') }}
          <span class="pb-tab-close" role="button" tabindex="0" :title="$t('buttonClose')" :aria-label="$t('buttonClose')"
                @click.stop.prevent="closeDetails" @keydown.enter.stop.prevent="closeDetails"><i class="fa-solid fa-xmark" aria-hidden="true" /></span>
        </template>
        <div class="pb-tab-panel">
          <p class="pb-loading" v-if="!publication || !details"><b-spinner small /></p>

          <template v-else>
            <article class="pb-details">
              <!-- Type, year and database publication -->
              <div class="pb-chips">
                <span class="pb-chip is-type" v-if="details.type"><i class="fa-solid fa-file-lines" aria-hidden="true" /> {{ details.type }}</span>
                <span class="pb-chip" v-if="details.year"><i class="fa-regular fa-calendar" aria-hidden="true" /> {{ details.year }}</span>
                <span class="pb-chip" v-if="publication.isDatabasePub"><i class="fa-solid fa-database" aria-hidden="true" /> {{ $t('publicationTypeDatabase') }}</span>
              </div>

              <h2 class="pb-title" v-html="details.title" />
              <p class="pb-subtitle" v-if="details.subtitle" v-html="details.subtitle" />

              <!-- Authors, with their ORCID when known -->
              <div class="pb-authors" v-if="details.authors.length > 0">
                <span class="pb-label"><i class="fa-solid fa-user-pen" aria-hidden="true" /> {{ $t('pagePublicationDetailsAuthors') }}</span>
                <ul class="pb-author-list">
                  <li v-for="(author, index) in details.authors" :key="`author-${index}`">
                    {{ author.name }}<a v-if="author.orcid" :href="author.orcid" target="_blank" rel="noopener noreferrer" class="pb-orcid" :title="author.orcid"><AcademicIcon name="orcid" /></a>
                  </li>
                </ul>
              </div>

              <!-- Journal, volume (issue), pages and publisher -->
              <p class="pb-journal" v-if="details.journal || details.publisher">
                <i class="fa-solid fa-book-open" aria-hidden="true" />
                <span>
                  <em v-if="details.journal" v-html="details.journal" />
                  <template v-if="details.volumeText">, {{ details.volumeText }}</template>
                  <span class="pb-publisher" v-if="details.publisher"> · {{ details.publisher }}</span>
                </span>
              </p>

              <!-- DOI, read more, cite -->
              <div class="pb-actions">
                <a class="pb-doi" :href="details.doiUrl" target="_blank" rel="noopener noreferrer" v-if="details.doi">
                  <AcademicIcon name="doi" /> <span>{{ details.doi }}</span>
                </a>
                <a class="pb-button is-primary" :href="details.url" target="_blank" rel="noopener noreferrer" v-if="details.url">
                  <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /> {{ $t('buttonReadMore') }}
                </a>
                <button type="button" class="pb-button" @click="$refs.referenceModal.show()">
                  <i class="fa-solid fa-quote-left" aria-hidden="true" /> {{ $t('pagePublicationDetailsCite') }}
                </button>
              </div>

              <!-- Facts in a row -->
              <dl class="pb-facts" v-if="details.facts.length > 0">
                <div class="pb-fact" v-for="fact in details.facts" :key="fact.key">
                  <dt><i :class="fact.icon" aria-hidden="true" /> {{ fact.label }}</dt>
                  <dd>
                    <a :href="fact.link" target="_blank" rel="noopener noreferrer" v-if="fact.link">{{ fact.value }}</a>
                    <template v-else>{{ fact.value }}</template>
                  </dd>
                </div>
              </dl>

              <!-- Abstract -->
              <section class="pb-abstract" v-if="details.abstract">
                <h3 class="pb-section-title"><i class="fa-solid fa-align-left" aria-hidden="true" /> {{ $t('pagePublicationDetailsAbstract') }}</h3>
                <div class="pb-abstract-text" v-html="details.abstract" />
              </section>

              <!-- Subjects -->
              <div class="pb-subjects" v-if="details.subjects.length > 0">
                <span class="pb-subject" v-for="subject in details.subjects" :key="subject"><i class="fa-solid fa-tag" aria-hidden="true" /> {{ subject }}</span>
              </div>
            </article>

            <ReferenceModal :publication="publication" customLook ref="referenceModal" />

            <section class="pb-related" v-if="showStories">
              <h3 class="pb-section-title"><i class="fa-solid fa-comment-dots" aria-hidden="true" /> {{ $t('pageStoriesTitle') }}</h3>
              <DataStoryWidget :filterOn="storyFilterOn" @story-count-changed="updateStoryVisibility" />
            </section>

            <!-- The items referencing the publication, depending on its type -->
            <section class="pb-related" v-if="publication.groupIds && publication.groupIds.length > 0">
              <h3 class="pb-section-title"><i class="fa-solid fa-object-group" aria-hidden="true" /> {{ $t('pageGroupsTitle') }}</h3>
              <GroupTable ref="publicationmembersTable" :getData="getGroupData" />
            </section>
            <section class="pb-related" v-if="publication.germplasmIds && publication.germplasmIds.length > 0">
              <h3 class="pb-section-title"><i class="fa-solid fa-seedling" aria-hidden="true" /> {{ $t('pageGermplasmTitle') }}</h3>
              <GermplasmTable ref="publicationmembersTable" :getData="getGermplasmData"/>
            </section>
            <section class="pb-related" v-if="publication.datasetIds && publication.datasetIds.length > 0">
              <h3 class="pb-section-title"><i class="fa-solid fa-database" aria-hidden="true" /> {{ $t('pageDatasetsTitle') }}</h3>
              <DatasetTable ref="publicationmembersTable" :getData="getDatasetData" />
            </section>
          </template>
        </div>
      </b-tab>
    </b-tabs>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import AcademicIcon from '@/components/icons/AcademicIcon'
import DatasetTable from '@/components/tables/DatasetTable'
import GermplasmTable from '@/components/tables/GermplasmTable'
import GroupTable from '@/components/tables/GroupTable'
import PublicationTable from '@/components/tables/PublicationTable'
import DataStoryWidget from '@/components/util/DataStoryWidget'
import AddPublicationModal from '@/components/modals/AddPublicationModal'
import ReferenceModal from '@/components/modals/ReferenceModal'
import { userIsAtLeast, USER_TYPE_DATA_CURATOR } from '@/mixins/api/auth'
import { mdiPlusBox } from '@mdi/js'

import { apiPostPublicationDatasetTable } from '@/mixins/api/dataset'
import { apiPostPublicationGermplasmTable } from '@/mixins/api/germplasm'
import { apiPostPublicationGroupTable } from '@/mixins/api/group'
import { apiPostPublicationsTable } from '@/mixins/api/misc'
import { Pages } from '@/mixins/pages'

const emitter = require('tiny-emitter/instance')

// Text from Crossref (titles, abstracts in JATS): only a few inline tags are kept (italic, bold, sub, sup), without any
// attribute; paragraphs become <p>, every other tag is dropped
const cleanHtml = (text, paragraphs = false) => {
  if (!text) {
    return null
  }
  let result = `${text}`
    // The "Abstract" title of JATS abstracts
    .replace(/<jats:title>[\s\S]*?<\/jats:title>/gi, '')
    .replace(/<(\/?)jats:(italic|bold|sub|sup)\b[^>]*>/gi, (m, slash, tag) => `<${slash}${{ italic: 'i', bold: 'b' }[tag.toLowerCase()] || tag.toLowerCase()}>`)
  if (paragraphs) {
    result = result.replace(/<jats:p\b[^>]*>/gi, '<p>').replace(/<\/jats:p>/gi, '</p>')
  }
  const allowed = paragraphs ? ['i', 'b', 'em', 'strong', 'sub', 'sup', 'p'] : ['i', 'b', 'em', 'strong', 'sub', 'sup']
  result = result
    .replace(/<(\/?)([a-z][\w:-]*)\b[^>]*>/gi, (m, slash, tag) => allowed.includes(tag.toLowerCase()) ? `<${slash}${tag.toLowerCase()}>` : '')
    .replace(/\s+/g, ' ')
    // The line breaks of the JATS source leave spaces before punctuation ("Background : The")
    .replace(/\s+([:;,.)])/g, '$1')
    .replace(/<p>\s*/g, '<p>')
    .replace(/<p><\/p>/g, '')
    .trim()
  return result || null
}

// Names of the most common citation (CSL) types; the others are shown from their code ("post-weblog": "Post weblog")
const CSL_TYPES = {
  'article-journal': 'Journal article',
  'article-magazine': 'Magazine article',
  'article-newspaper': 'Newspaper article',
  'paper-conference': 'Conference paper',
  'posted-content': 'Preprint',
  chapter: 'Book chapter',
  book: 'Book',
  dataset: 'Dataset',
  report: 'Report',
  thesis: 'Thesis',
  webpage: 'Web page'
}

export default {
  components: {
    AcademicIcon,
    DatasetTable,
    GermplasmTable,
    GroupTable,
    PublicationTable,
    DataStoryWidget,
    AddPublicationModal,
    ReferenceModal
  },
  data: function () {
    return {
      tabIndex: 0,
      publicationId: null,
      publication: null,
      showStories: true,
      storyFilterOn: null
    }
  },
  computed: {
    ...mapGetters([
      'storeLocale',
      'storeSelectedProjects',
      'storeToken'
    ]),
    userIsDataCurator: function () {
      return !!this.storeToken && userIsAtLeast(this.storeToken.userType, USER_TYPE_DATA_CURATOR)
    },
    // Same [+] as below the datasets table
    tableActions: function () {
      return [{
        id: 1,
        text: this.$t('buttonAddPublication'),
        variant: null,
        disabled: () => false,
        path: mdiPlusBox,
        callback: () => this.$refs.addPublicationModal.show()
      }]
    },
    filterOn: function () {
      const filter = []
      if (this.storeSelectedProjects && this.storeSelectedProjects.length > 0) {
        filter.push({
          column: {
            name: 'projectIds',
            type: Number
          },
          comparator: 'arrayContains',
          operator: 'and',
          values: this.storeSelectedProjects,
          canBeChanged: false
        })
      }
      return filter
    },
    // What the Details tab shows, from the citation data (CSL) stored with the publication
    details: function () {
      if (!this.publication) {
        return null
      }
      const csl = (this.publication.publicationFallbackCache && typeof this.publication.publicationFallbackCache === 'object') ? this.publication.publicationFallbackCache : {}
      const first = value => Array.isArray(value) ? value[0] : value

      const dateParts = ((csl.published || csl['published-print'] || csl['published-online'] || csl.issued || {})['date-parts'] || [])[0] || []
      const locale = (this.storeLocale || 'en_GB').replace('_', '-')
      let published = null
      if (dateParts.length === 3) {
        published = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2])).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
      } else if (dateParts.length === 2) {
        published = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, 1)).toLocaleDateString(locale, { year: 'numeric', month: 'long', timeZone: 'UTC' })
      } else if (dateParts.length === 1) {
        published = `${dateParts[0]}`
      }

      // The DOI on its own (10.xxx/...) and as a link
      const doi = (csl.DOI || `${this.publication.publicationDoi || ''}`.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')).trim() || null

      const authors = (csl.author || []).map(a => ({
        name: a.literal || [a.given, a.family].filter(p => p).join(' '),
        orcid: a.ORCID ? a.ORCID.replace(/^http:/, 'https:') : null
      })).filter(a => a.name)

      const volumeText = [csl.volume ? `${csl.volume}${csl.issue ? `(${csl.issue})` : ''}` : null, csl.page || csl['article-number'] || null].filter(p => p).join(', ') || null

      const license = (csl.license || []).find(l => l['content-version'] === 'vor') || (csl.license || [])[0]
      const licenseName = license && license.URL ? (license.URL.match(/creativecommons\.org\/licenses\/([^/]+)\/([^/]+)/i) || []) : []

      const facts = []
      if (published) {
        facts.push({ key: 'published', icon: 'fa-regular fa-calendar', label: this.$t('pagePublicationDetailsPublished'), value: published })
      }
      if (csl['is-referenced-by-count'] !== undefined) {
        facts.push({ key: 'cited', icon: 'fa-solid fa-quote-right', label: this.$t('pagePublicationDetailsCitedBy'), value: csl['is-referenced-by-count'].toLocaleString() })
      }
      if (csl['reference-count'] !== undefined || csl['references-count'] !== undefined) {
        facts.push({ key: 'references', icon: 'fa-solid fa-list-ol', label: this.$t('pagePublicationDetailsReferences'), value: (csl['reference-count'] !== undefined ? csl['reference-count'] : csl['references-count']).toLocaleString() })
      }
      if (license && license.URL) {
        facts.push({ key: 'license', icon: 'fa-solid fa-scale-balanced', label: this.$t('tableColumnDatasetLicenseName'), value: licenseName.length === 3 ? `CC ${licenseName[1].toUpperCase()} ${licenseName[2]}` : license.URL.replace(/^https?:\/\//, '').replace(/\/$/, ''), link: license.URL })
      }
      if (csl.ISSN && csl.ISSN.length > 0) {
        facts.push({ key: 'issn', icon: 'fa-solid fa-barcode', label: 'ISSN', value: csl.ISSN.join(', ') })
      }

      return {
        type: csl.type ? (CSL_TYPES[csl.type] || csl.type.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase())) : null,
        year: dateParts.length > 0 ? dateParts[0] : null,
        title: cleanHtml(first(csl.title)) || 'N/A',
        subtitle: cleanHtml(first(csl.subtitle)),
        journal: cleanHtml(first(csl['container-title'])),
        publisher: csl.publisher || null,
        volumeText,
        authors,
        doi,
        doiUrl: doi ? `https://doi.org/${doi}` : null,
        url: csl.URL || (doi ? `https://doi.org/${doi}` : null),
        facts,
        abstract: cleanHtml(csl.abstract, true),
        subjects: Array.isArray(csl.subject) ? csl.subject : []
      }
    }
  },
  watch: {
    // Back and forward of the browser: the details follow the URL
    '$route.params.publicationId': function (newValue) {
      if (!newValue) {
        if (this.publicationId) {
          this.closeDetails()
        }
      } else if (`${newValue}` !== `${this.publicationId}`) {
        this.onPublicationSelected({ publicationId: newValue })
      }
    }
  },
  methods: {
    // The new publication is listed, and the publication count of the sidebar updated
    onPublicationAdded: function () {
      this.$refs.publicationTable.refresh()
      emitter.emit('update-sidebar-menu')
    },
    updateStoryVisibility: function (count) {
      this.showStories = count > 0
    },
    getGermplasmData: function (data, callback) {
      return apiPostPublicationGermplasmTable(this.publication.publicationId, data, callback)
    },
    getGroupData: function (data, callback) {
      return apiPostPublicationGroupTable(this.publication.publicationId, data, callback)
    },
    getDatasetData: function (data, callback) {
      return apiPostPublicationDatasetTable(this.publication.publicationId, data, callback)
    },
    getData: function (data) {
      return apiPostPublicationsTable(data, (result) => {
        if (result && result.data && result.data.length > 0) {
          result.data.forEach(p => {
            try {
              p.publicationFallbackCache = JSON.parse(p.publicationFallbackCache)
            } catch (err) {
              //
            }
          })
        }
      })
    },
    // Back to the list: the Details tab goes away
    closeDetails: function () {
      this.tabIndex = 0
      this.publicationId = null
      this.publication = null
      if (this.$route.params.publicationId) {
        this.$router.push({ name: Pages.publications, query: this.$route.query })
      }
    },
    onPublicationSelected: function (config) {
      this.showStories = true
      this.storyFilterOn = [{
        column: 'publicationId',
        comparator: 'equals',
        operator: 'and',
        values: [config.publicationId]
      }]

      const queryParams = {
        page: 1,
        limit: 1,
        prevCount: -1,
        filter: [{
          column: 'publicationId',
          comparator: 'equals',
          operator: 'and',
          values: [config.publicationId]
        }]
      }

      this.publicationId = config.publicationId
      this.publication = null

      // Update the URL to reflect the newly selected publication
      if (`${this.$route.params.publicationId}` !== `${config.publicationId}`) {
        this.$router.push({ name: Pages.publicationDetails, params: { publicationId: config.publicationId }, query: this.$route.query })
      }

      // The Details tab, once it exists, in focus; the page stays at the top
      this.$nextTick(() => {
        this.tabIndex = 1
        this.$nextTick(() => {
          const tab = this.$el.querySelector('.pb-tabs-nav .nav-link.active')
          if (tab) {
            tab.focus({ preventScroll: true })
          }
        })
      })

      apiPostPublicationsTable(queryParams, result => {
        if (result && result.data && result.data.length > 0) {
          const publication = result.data[0]
          try {
            publication.publicationFallbackCache = JSON.parse(publication.publicationFallbackCache)
          } catch (err) {
            //
          }
          this.publication = publication
        }
      })
    }
  },
  created: function () {
    if (this.$route.params.publicationId) {
      this.onPublicationSelected({
        publicationId: this.$route.params.publicationId
      })
    }
  }
}
</script>

<style src="@/assets/custom-page.css"></style>
<style scoped>
.publications-page {
  padding: 0.5rem 0 3rem;
}
/* Tabs: as on the germplasm page */
.pb-tabs {
  margin-top: 2.25rem;
}
.pb-tabs >>> .pb-tabs-nav {
  flex-wrap: wrap;
  border-bottom: 1px solid var(--cp-border);
}
.pb-tabs >>> .pb-tabs-nav .nav-link {
  display: inline-flex;
  align-items: center;
  padding: 0.7rem 1.25rem;
  border: 1px solid transparent;
  border-radius: 10px 10px 0 0;
  color: var(--cp-muted);
  font-weight: 600;
  line-height: 1.5;
}
.pb-tabs >>> .pb-tabs-nav .nav-link:hover,
.pb-tabs >>> .pb-tabs-nav .nav-link:focus {
  border-color: transparent;
  color: var(--cp-text);
}
.pb-tabs >>> .pb-tabs-nav .nav-link.active,
body.dark-mode .pb-tabs >>> .pb-tabs-nav .nav-link.active,
body.dark-mode .pb-tabs >>> .pb-tabs-nav .nav-link.active:focus {
  border-color: var(--cp-border) var(--cp-border) var(--cp-surface);
  background: var(--cp-surface);
  color: var(--cp-text);
}
.pb-tab-icon {
  width: 1.1em;
  margin-right: 0.5rem;
  font-size: 0.95em;
  line-height: 1;
  text-align: center;
}
.pb-tabs >>> .pb-tabs-nav .nav-link.active .pb-tab-icon {
  color: var(--cp-green);
}
/* The cross of the Details tab */
.pb-tab-close {
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
.pb-tab-close:hover,
.pb-tab-close:focus {
  background: var(--cp-surface-hover);
  color: #dc3545;
  outline: none;
}
body.dark-mode .pb-tab-close:hover,
body.dark-mode .pb-tab-close:focus {
  color: #f07b86;
}
.pb-tab-panel {
  margin-top: 1.25rem;
}
.pb-loading {
  color: var(--cp-muted);
}

/* Details: over the width of the page, no block around them */
.pb-details {
  padding: 0.75rem 0.75rem 0;
  font-family: 'DM Sans', -apple-system, 'Segoe UI', Roboto, sans-serif;
}
.pb-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.pb-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--cp-border);
  border-radius: 999px;
  color: var(--cp-text-subtle);
  font-size: 0.8rem;
  font-weight: 600;
}
.pb-chip.is-type {
  border-color: transparent;
  background: var(--cp-green-soft);
  color: var(--cp-green);
}
.pb-title {
  max-width: 62rem;
  margin: 0 0 0.5rem;
  font-size: 1.9rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--cp-text);
}
.pb-subtitle {
  max-width: 62rem;
  margin: 0 0 0.5rem;
  font-size: 1.15rem;
  color: var(--cp-text-subtle);
}
.pb-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--cp-muted);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.pb-label > i,
.pb-section-title > i,
.pb-journal > i,
.pb-fact dt > i {
  color: var(--cp-green);
}
.pb-authors {
  margin-top: 1.25rem;
}
.pb-author-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0;
  margin: 0.4rem 0 0;
  padding: 0;
  list-style: none;
  color: var(--cp-text);
  font-size: 1rem;
}
.pb-author-list > li:not(:last-child)::after {
  content: '·';
  margin: 0 0.6rem;
  color: var(--cp-muted);
}
/* ORCID: bigger, raised at the top right of the name, like an exponent */
.pb-orcid {
  position: relative;
  top: -0.55em;
  margin-left: 0.15rem;
  color: #a6ce39;
  font-size: 1.15em;
  line-height: 0;
}
.pb-orcid:hover {
  text-decoration: none;
  opacity: 0.8;
}
.pb-journal {
  display: flex;
  align-items: baseline;
  gap: 0.55rem;
  margin: 1rem 0 0;
  color: var(--cp-text);
  font-size: 1rem;
}
.pb-publisher {
  color: var(--cp-muted);
}
/* DOI, read more and cite */
.pb-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  margin-top: 1.5rem;
}
.pb-doi {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 42px;
  padding: 0 1rem;
  border: 1px solid var(--cp-border);
  border-radius: 10px;
  background: var(--cp-surface);
  color: var(--cp-text);
  font-size: 0.92rem;
  font-weight: 500;
}
.pb-doi >>> .ai {
  color: #fcb425;
  font-size: 1.25rem;
}
.pb-doi:hover {
  border-color: var(--cp-muted);
  color: var(--cp-text);
  text-decoration: none;
}
.pb-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 42px;
  padding: 0 1.15rem;
  border: 1px solid var(--cp-border);
  border-radius: 10px;
  background: var(--cp-surface);
  color: var(--cp-text);
  font: inherit;
  font-size: 0.92rem;
  font-weight: 500;
  cursor: pointer;
}
.pb-button:hover,
.pb-button:focus {
  border-color: var(--cp-muted);
  background: var(--cp-surface-hover);
  color: var(--cp-text);
  text-decoration: none;
}
.pb-button.is-primary {
  border-color: var(--cp-button);
  background: var(--cp-button);
  color: var(--cp-on-button);
}
.pb-button.is-primary:hover,
.pb-button.is-primary:focus {
  border-color: var(--cp-button-hover);
  background: var(--cp-button-hover);
  color: var(--cp-on-button);
}
/* Facts: a line of small labels and values between two thin lines */
.pb-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 2.5rem;
  margin: 1.75rem 0 0;
  padding: 1.1rem 0;
  border-top: 1px solid var(--cp-border);
  border-bottom: 1px solid var(--cp-border);
}
.pb-fact dt {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.2rem;
  color: var(--cp-muted);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.pb-fact dd {
  margin: 0;
  color: var(--cp-text);
  font-size: 1.05rem;
  font-weight: 600;
}
.pb-fact dd a {
  color: var(--cp-green);
}
.pb-section-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0 0 0.85rem;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--cp-text);
}
.pb-abstract {
  margin-top: 1.75rem;
}
/* Over the whole width of the page */
.pb-abstract-text {
  color: var(--cp-text-subtle);
  font-size: 0.98rem;
  line-height: 1.75;
}
.pb-abstract-text >>> p {
  margin: 0 0 0.75rem;
}
.pb-subjects {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 1.25rem;
}
.pb-subject {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.7rem;
  border-radius: 999px;
  background: var(--cp-surface-hover);
  border: 1px solid var(--cp-border);
  color: var(--cp-text-subtle);
  font-size: 0.8rem;
}
.pb-subject > i {
  color: var(--cp-muted);
  font-size: 0.75em;
}
/* Data stories and the referencing items below the details */
.pb-related {
  margin-top: 2.5rem;
  padding: 0 0.75rem;
}
</style>
