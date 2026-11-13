<template>
  <div>
    <BaseTable v-bind="$props"
                :columns="columns"
                :options="options"
                primary-key="germplasmId"
                itemType="germplasm"
                class="germplasm-table"
                ref="germplasmTable"
                v-on="$listeners">
      <!-- HEADS -->
      <!-- HEAD: Germplasm PUID -->
      <template v-slot:head(germplasmPuid)="data">
        <span>{{ data.label }} </span> <span class="text-muted" v-b-tooltip.bottom.hover :title="$t('tableColumnTooltipGermplasmPuid')"><MdiIcon :path="mdiHelpCircle" /></span>
      </template>
      <!-- HEAD Germplasm PDCI -->
      <template v-slot:head(pdci)="data">
        <span>{{ data.label }} </span> <span class="text-muted" v-b-tooltip.bottom.hover :title="$t('tableColumnTooltipGermplasmPdci')"><MdiIcon :path="mdiHelpCircle" /></span>
      </template>
      <!-- HEAD: Dataset types -->
      <template v-slot:head(dataTypes)="data">
        <span>{{ data.label }} </span> <span class="text-muted" v-b-tooltip.bottom.hover :title="$t('tableColumnTooltipGermplasmDataTypes')"><MdiIcon :path="mdiHelpCircle" /></span>
      </template>
      <!-- HEAD: Trials data -->
      <template v-slot:head(hasTrialsData)>
        <span v-b-tooltip.bottom.hover :title="$t('tableColumnHasTrialsData')"><MdiIcon :path="datasetTypes.trials.path" /></span>
      </template>
      <!-- HEAD: Genotypic data -->
      <template v-slot:head(hasGenotypicData)>
        <span v-b-tooltip.bottom.hover :title="$t('tableColumnHasGenotypicData')"><MdiIcon :path="datasetTypes.genotype.path" /></span>
      </template>
      <!-- HEAD: Allelefreq data -->
      <template v-slot:head(hasAllelefreqData)>
        <span v-b-tooltip.bottom.hover :title="$t('tableColumnHasAllelefreqData')"><MdiIcon :path="datasetTypes.allelefreq.path" /></span>
      </template>
      <!-- HEAD: Allelefreq data -->
      <template v-slot:head(hasPedigreeData)>
        <span v-b-tooltip.bottom.hover :title="$t('tableColumnHasPedigreeData')"><i class="fa-solid fa-sitemap gt-data-icon" aria-hidden="true" /></span>
      </template>
      <!-- /HEADS -->

      <!-- Germplasm id link -->
      <template v-slot:cell(germplasmId)="data">
        <router-link :to="{ name: Pages.passport, params: { germplasmId: data.item.germplasmId } }">{{ data.item.germplasmId }}</router-link>
      </template>
      <!-- Germplasm name link -->
      <!-- Before it the passport icon: the preview of the passport (modal), as the former preview column -->
      <template v-slot:cell(germplasmName)="data">
        <span class="gt-name">
          <router-link :to="{ name: Pages.passport, params: { germplasmId: data.item.germplasmId } }" event="" @click.native.prevent="selectGermplasm(data.item.germplasmId)" class="gt-passport-preview" v-b-tooltip.hover="$t('tableTooltipGermplasmPreviewPassport')" :aria-label="$t('tableTooltipGermplasmPreviewPassport')">
            <i class="fa-solid fa-passport" aria-hidden="true" />
          </router-link>
          <router-link :to="{ name: Pages.passport, params: { germplasmId: data.item.germplasmId } }">{{ data.item.germplasmName }}</router-link>
        </span>
      </template>
      <!-- Germplasm display name link -->
      <template v-slot:cell(germplasmDisplayName)="data">
        <router-link :to="{ name: Pages.passport, params: { germplasmId: data.item.germplasmId } }">{{ data.item.germplasmDisplayName }}</router-link>
      </template>
      <!-- Germplasm GID link -->
      <template v-slot:cell(germplasmGid)="data">
        <router-link :to="{ name: Pages.passport, params: { germplasmId: data.item.germplasmId } }">{{ data.item.germplasmGid }}</router-link>
      </template>
      <!-- Germplasm number link -->
      <template v-slot:cell(germplasmNumber)="data">
        <router-link :to="{ name: Pages.passport, params: { germplasmId: data.item.germplasmId } }">{{ data.item.germplasmNumber }}</router-link>
      </template>
      <!-- Entity type -->
      <template v-slot:cell(entityTypeName)="data">
        <!-- New look: a rounded badge in the colour of the type -->
        <span class="bt-chip" :style="{ '--bt-chip-color': entityTypes[data.item.entityTypeName].color() }" v-if="modernLook"><MdiIcon :path="entityTypes[data.item.entityTypeName].path" /> {{ entityTypes[data.item.entityTypeName].text() }}</span>
        <span class="bt-chip" v-else :style="{ '--bt-chip-color': entityTypes[data.item.entityTypeName].color() }"><MdiIcon :path="entityTypes[data.item.entityTypeName].path" /> {{ entityTypes[data.item.entityTypeName].text() }}</span>
      </template>
      <!-- Synonyms -->
      <template v-slot:cell(synonyms)="data">
        <span v-if="data.item.synonyms">{{ data.item.synonyms.join(', ') }}</span>
      </template>
      <!-- Location name -->
      <template v-slot:cell(location)="data">
        <template v-if="data.item.location">
          <a href="#" @click.prevent="data.toggleDetails()" class="table-link" v-if="data.item.latitude && data.item.longitude" v-b-tooltip.hover :title="$t('tableTooltipGermplasmLocation')">
            <MdiIcon :path="mdiMapMarker" />
            <span>{{ data.item.location }}</span>
          </a>
          <span v-else>{{ data.item.location }}</span>
        </template>
      </template>
      <!-- Location elevation -->
      <template v-slot:cell(elevation)="data">
        <span v-if="data.item.elevation !== undefined">{{ formatNumber(data.item.elevation, 2) }}</span>
      </template>
      <!-- Location latitude -->
      <template v-slot:cell(latitude)="data">
        <span v-if="data.item.latitude !== undefined">{{ formatNumber(data.item.latitude, 2) }}</span>
      </template>
      <!-- Location longitude -->
      <template v-slot:cell(longitude)="data">
        <span v-if="data.item.longitude !== undefined">{{ formatNumber(data.item.longitude, 2) }}</span>
      </template>
      <!-- Country flag -->
      <!-- Conservation (virtual column, see conservation.js): in-situ when the germplasm has the IN-SITU attribute 1 -->
      <template v-slot:cell(conservation)="data">
        <i v-if="inSituIds">{{ inSituIds.includes(data.item.germplasmId) ? 'In-situ' : 'Ex-situ' }}</i>
      </template>
      <template v-slot:cell(countryName)="data">
          <span class="table-country text-nowrap" v-b-tooltip.hover :title="data.item.countryName" v-if="data.item.countryCode">
            <i :class="'fi fi-' + data.item.countryCode.toLowerCase()"/> <span> {{ getCountryIso3(data.item.countryCode) }}</span>
          </span>
          <span v-else>
            {{ data.item.countryName }}
          </span>
      </template>
      <!-- Formatted colldate -->
      <template v-slot:cell(collDate)="data">
        <span v-if="data.item.collDate">{{ formatDate(mcpdDateToJsDate(data.item.collDate)) }}</span>
      </template>
      <!-- Institutions -->
      <!-- One institution code: the maintenance institution (INSTCODE), else the first one. The whole text (all the
           institutions) on hover, their details on click. -->
      <template v-slot:cell(institutions)="data">
        <a href="#" class="gt-institution-codes" :title="data.value" @click.prevent="showInstitutionModal(data.item)" v-if="data.item.institutions && data.item.institutions.length > 0">{{ getInstitutionCodes(data.item) }}</a>
      </template>
      <!-- Image preview -->
      <template v-slot:cell(imageCount)="data">
        <div class="table-image" v-if="data.item.imageCount !== undefined && data.item.imageCount > 0">
          <a href="#" class="text-dark" @click.prevent="" :id="`table-image-popover-${data.item.germplasmId}`" v-b-tooltip.hover :title="$t('tableTooltipGermplasmImage')">
            <MdiIcon :path="mdiCamera" /> <span> {{ data.item.imageCount }}</span>
          </a>
          <b-popover
            :target="`table-image-popover-${data.item.germplasmId}`"
            custom-class="table-image-popover"
            placement="top"
            boundary="window"
            triggers="click blur">
            <img :src="getSrc(data.item)" alt="Germplasm image" />
          </b-popover>
        </div>
      </template>
      <!-- Biological status popover -->
      <template v-slot:cell(biologicalStatusName)="data">
        <div v-if="data.item.biologicalStatusName">
          <span :id="`table-biostat-popover-${data.item.germplasmId}`">{{ data.item.biologicalStatusName.split(" (")[0] }}</span>
          <b-popover
            :target="`table-biostat-popover-${data.item.germplasmId}`"
            placement="top"
            boundary="window"
            triggers="hover focus">
            {{ data.item.biologicalStatusName }}
          </b-popover>
        </div>
      </template>
      <!-- PDCI -->
      <template v-slot:cell(pdci)="data">
        <div v-if="data.item.pdci !== undefined" class="table-pdci">
          <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(-90deg); vertical-align: text-bottom;">
            <g>
              <circle id="circle" class="pdci-circle-background" style="stroke-dasharray: 44; stroke-dashoffset: 0;" r="7" cy="9" cx="9" stroke-width="4" fill="none"/>
              <circle id="circle" class="pdci-circle-inner" :style="'stroke-dasharray: 44; stroke-dashoffset: ' + (44 - (data.item.pdci / 10 * 44)) + ';'" r="7" cy="9" cx="9" stroke-width="4" fill="none"/>
            </g>
          </svg>
          <span> {{ formatNumber(data.item.pdci, 2) }}</span>
        </div>
      </template>
      <!-- Dataset types -->
      <template v-slot:cell(hasTrialsData)="data">
        <span v-if="data.item.hasTrialsData" :style="{ color: datasetTypes.trials.color() }" v-b-tooltip.hover :title="datasetTypes.trials.text()"><MdiIcon :path="datasetTypes.trials.path" /></span>
      </template>
      <template v-slot:cell(hasGenotypicData)="data">
        <span v-if="data.item.hasGenotypicData" :style="{ color: datasetTypes.genotype.color() }" v-b-tooltip.hover :title="datasetTypes.genotype.text()"><MdiIcon :path="datasetTypes.genotype.path" /></span>
      </template>
      <template v-slot:cell(hasAllelefreqData)="data">
        <span v-if="data.item.hasAllelefreqData" :style="{ color: datasetTypes.allelefreq.color() }" v-b-tooltip.hover :title="datasetTypes.allelefreq.text()"><MdiIcon :path="datasetTypes.allelefreq.path" /></span>
      </template>
      <template v-slot:cell(hasPedigreeData)="data">
        <span v-if="data.item.hasPedigreeData" :style="{ color: datasetTypes.pedigree.color() }" v-b-tooltip.hover :title="datasetTypes.pedigree.text()"><i class="fa-solid fa-sitemap gt-data-icon" aria-hidden="true" /></span>
      </template>

      <!-- Row details is where the dataset locations are shown on a map -->
      <template v-slot:row-details="data">
        <LocationMap :locations="[{ locationName: data.item.location, locationLatitude: data.item.latitude, locationLongitude: data.item.longitude, locationElevation: data.item.elevation, countryCode2: data.item.countryCode, countryName: data.item.countryName }]" v-if="data.item.latitude && data.item.longitude" :showLinks="false" border="border-top border-bottom"/>
      </template>
    </BaseTable>

    <!-- Modal to show the passport page on data point click -->
    <!-- Passport preview: the passport page, in a modal wider than "xl", in the look of the custom pages (cp-modal). No
         padding around the page: its reference images go to the edges and the top; the page keeps its own (below) -->
    <b-modal size="xl" dialog-class="passport-preview-modal" modal-class="cp-modal" content-class="custom-page" ref="passportModal" v-if="germplasmId" @hidden="germplasmId = null" scrollable>
      <!-- Only the X, at the top right over the page (it stays there while the page scrolls) -->
      <template #modal-header="{ close }">
        <button type="button" class="passport-preview-close" @click="close()" :title="$t('buttonClose')" :aria-label="$t('buttonClose')"><i class="fa-solid fa-xmark" aria-hidden="true" /></button>
      </template>
      <PassportView :germplasmId="germplasmId" :isPopup="true" />
      <template #modal-footer="{ close }">
        <button type="button" class="cp-modal-button" @click="close()">{{ $t('buttonClose') }}</button>
      </template>
    </b-modal>

    <InstitutionModal @hidden="germplasmId = null" :germplasmId="germplasmId" ref="institutionModal" v-if="germplasmId" />

  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import BaseTable from '@/components/tables/BaseTable'
import LocationMap from '@/components/map/LocationMap'
import InstitutionModal from '@/components/modals/InstitutionModal'
import defaultProps from '@/const/table-props'
import { CONSERVATION_COLUMN, getConservationIds } from '@/mixins/conservation'
import { apiPostEntityIds } from '@/mixins/api/germplasm'
import { isTruncatedAfterWords, truncateAfterWords, formatDate, formatNumber } from '@/mixins/formatting'
import { getImageUrl } from '@/mixins/image'
import { entityTypes, datasetTypes } from '@/mixins/types'
import { Pages } from '@/mixins/pages'
import { mcpdDateToJsDate } from '@/mixins/util'

import MdiIcon from '@/components/icons/MdiIcon'

import { mdiHelpCircle, mdiMapMarker, mdiCamera, mdiChevronUpBox, mdiPageNext, mdiChevronUpBoxOutline, mdiChevronDownBox, mdiChevronDownBoxOutline } from '@mdi/js'

const countries = require('i18n-iso-countries')

const emitter = require('tiny-emitter/instance')

// Display rule of the germplasm tables (wherever they are): these columns start hidden, the column selector shows them
// again. Each one is hidden once, so a column added to the list is hidden for everyone once too.
const DEFAULT_HIDDEN_COLUMNS = [
  'germplasmId',
  'germplasmGid',
  'germplasmNumber',
  'germplasmPuid',
  'entityTypeName',
  'synonyms',
  'collectorNumber',
  'elevation',
  'location',
  'hasTrialsData',
  'hasGenotypicData',
  'hasPedigreeData',
  'hasAllelefreqData',
  'imageCount',
  'pdci'
]
// Columns hidden by default before and shown by default now: shown again once (then it is the user's choice)
const DEFAULT_SHOWN_COLUMNS = [CONSERVATION_COLUMN]
// The columns already hidden by default: kept with the hidden columns of the user (store), so both are remembered or
// forgotten together (without accepted cookies nothing is kept: the columns are hidden again at the next visit)
const DEFAULT_HIDDEN_APPLIED = 'germplasmDefaultHidden'

export default {
  name: 'GermplasmTable',
  props: {
    ...defaultProps.FULL,
    // A hidden "conservation" column, so its filter (in-situ or ex-situ) is kept like any other, also in the URL. Only
    // for pages that turn that filter into germplasm ids for the server (see conservation.js).
    conservationColumn: {
      type: Boolean,
      default: false
    },
    orderBy: {
      type: String,
      default: null
    },
    selectable: {
      type: Boolean,
      default: false
    },
    tableMode: {
      type: String,
      default: 'base'
    },
    showAllItems: {
      type: Boolean,
      default: null
    }
  },
  data: function () {
    return {
      Pages,
      entityTypes,
      datasetTypes,
      mdiHelpCircle,
      mdiPageNext,
      mdiMapMarker,
      mdiCamera,
      mdiChevronUpBox,
      mdiChevronUpBoxOutline,
      mdiChevronDownBox,
      mdiChevronDownBoxOutline,
      germplasmId: null,
      selectedGermplasmInstitutionIds: null,
      // Ids of the in-situ germplasm, for the conservation column. Null until loaded.
      inSituIds: null,
      options: {
        idColumn: 'germplasmId',
        tableName: 'germplasm',
        additionalMarkingOptions: [{
          key: 'mark-parents',
          text: () => this.$t('tableContextMarkEntityParents'),
          path: mdiChevronUpBox,
          callback: (item) => this.markParents(item)
        }, {
          key: 'unmark-parents',
          text: () => this.$t('tableContextUnmarkEntityParents'),
          path: mdiChevronUpBoxOutline,
          callback: (item) => this.unmarkParents(item)
        }, {
          key: 'mark-children',
          text: () => this.$t('tableContextMarkEntityChildren'),
          path: mdiChevronDownBox,
          callback: (item) => this.markChildren(item)
        }, {
          key: 'unmark-children',
          text: () => this.$t('tableContextUnmarkEntityChildren'),
          path: mdiChevronDownBoxOutline,
          callback: (item) => this.unmarkChildren(item)
        }],
        orderBy: this.orderBy
      }
    }
  },
  computed: {
    ...mapGetters([
      'storeHiddenColumns',
      'storeToken'
    ]),
    columns: function () {
      const result = [
        {
          key: 'germplasmId',
          type: Number,
          sortable: true,
          class: 'text-right',
          label: this.$t('tableColumnGermplasmId')
        }, {
          key: 'germplasmName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnGermplasmName'),
          preferredSortingColumn: true
        }, {
          key: 'germplasmDisplayName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnGermplasmDisplayName')
        }, {
          key: 'germplasmGid',
          type: String,
          sortable: true,
          label: this.$t('tableColumnGermplasmGeneralIdentifier')
        }, {
          key: 'germplasmNumber',
          type: String,
          sortable: true,
          label: this.$t('tableColumnGermplasmNumber')
        }, {
          key: 'germplasmPuid',
          type: String,
          sortable: true,
          label: this.$t('tableColumnGermplasmPuid')
        }, {
          key: 'entityTypeName',
          type: 'entityType',
          sortable: true,
          label: this.$t('tableColumnEntityType')
        }, {
          key: 'entityParentName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnGermplasmEntityParentName')
        }, {
          key: 'entityParentGeneralIdentifier',
          type: String,
          sortable: true,
          label: this.$t('tableColumnGermplasmEntityParentGeneralIdentifier')
        }, {
          key: 'biologicalStatusName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnBiologicalStatus')
        }, {
          key: 'synonyms',
          type: 'json',
          sortable: true,
          label: this.$t('tableColumnSynonyms')
        }, {
          key: 'collectorNumber',
          type: String,
          sortable: true,
          label: this.$t('tableColumnCollectorNumber')
        }, {
          key: 'institutions',
          type: 'jsonObject',
          sortable: false,
          label: this.$t('tableColumnGermplasmInstitutions'),
          formatter: value => value ? value.map(i => `Code: ${i.code || 'N/A'}, name: ${i.name}, address: ${i.address || 'N/A'}, type: ${i.type}`).join('; ') : null
        }, {
          key: 'genus',
          type: String,
          sortable: true,
          class: 'font-italic',
          label: this.$t('tableColumnGenus')
        }, {
          key: 'species',
          type: String,
          sortable: true,
          class: 'font-italic',
          label: this.$t('tableColumnSpecies')
        }, {
          key: 'subtaxa',
          type: String,
          sortable: true,
          label: this.$t('tableColumnSubtaxa')
        }, {
          key: 'locationId',
          type: Number,
          sortable: true,
          label: this.$t('tableColumnGermplasmLocationId'),
          class: 'd-none'
        }, {
          key: 'location',
          type: String,
          sortable: true,
          label: this.$t('tableColumnGermplasmLocation')
        }, {
          key: 'elevation',
          type: Number,
          sortable: true,
          class: 'text-right',
          label: this.$t('tableColumnElevation')
        }, {
          key: 'latitude',
          type: Number,
          sortable: true,
          class: 'text-right',
          label: this.$t('tableColumnLatitude')
        }, {
          key: 'longitude',
          type: Number,
          sortable: true,
          class: 'text-right',
          label: this.$t('tableColumnLongitude')
        }, {
          key: 'countryName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnCountryName')
        }, {
          key: 'collDate',
          type: String,
          sortable: true,
          label: this.$t('tableColumnColldate')
        }, {
          key: 'hasTrialsData',
          type: Boolean,
          sortable: true,
          label: this.$t('tableColumnHasTrialsData')
        }, {
          key: 'hasGenotypicData',
          type: Boolean,
          sortable: true,
          label: this.$t('tableColumnHasGenotypicData')
        }, {
          key: 'hasPedigreeData',
          type: Boolean,
          sortable: true,
          label: this.$t('tableColumnHasPedigreeData')
        }, {
          key: 'hasAllelefreqData',
          type: Boolean,
          sortable: true,
          label: this.$t('tableColumnHasAllelefreqData')
        }, {
          key: 'imageCount',
          type: Number,
          sortable: true,
          class: 'text-right',
          label: this.$t('tableColumnGermplasmImageCount')
        }, {
          key: 'pdci',
          type: Number,
          sortable: true,
          class: 'text-center',
          label: this.$t('tableColumnPdci')
        }, {
          key: 'distance',
          type: undefined,
          sortable: true,
          class: 'text-right',
          label: this.$t('tableColumnGermplasmDistance')
        }, {
          key: 'marked',
          type: undefined,
          sortable: false,
          class: 'text-right',
          label: ''
        }
      ]

      if (this.conservationColumn) {
        // Before the column of the marking checkboxes, the last one
        const markedIndex = result.findIndex(c => c.key === 'marked')
        result.splice(markedIndex === -1 ? result.length : markedIndex, 0, {
          key: CONSERVATION_COLUMN,
          type: CONSERVATION_COLUMN,
          sortable: false,
          // Computed in the page (not a value of the rows): never hidden for being empty
          autoHide: false,
          label: 'Conservation'
        })
      }

      if (this.selectable === true) {
        result.unshift({
          key: 'selected',
          type: undefined,
          sortable: false,
          label: ''
        })
      }

      if (this.tableMode !== 'distance') {
        return result.filter(c => c.key !== 'distance')
      } else {
        return result
      }
    }
  },
  components: {
    BaseTable,
    LocationMap,
    InstitutionModal,
    MdiIcon,
    // Loaded when a preview is opened (the passport page is large, and uses tables itself)
    PassportView: () => import(/* webpackChunkName: "passport" */ '@/views/data/germplasm/PassportView.vue')
  },
  methods: {
    // The ISO 3166 code of three letters of a country (from its code of two letters; that one if unknown)
    getCountryIso3: function (code2) {
      return (code2 && countries.alpha2ToAlpha3(code2.toUpperCase())) || code2
    },
    // The code of the maintenance institution of a germplasm (INSTCODE), else of its first institution (its name if it
    // has no code)
    getInstitutionCodes: function (item) {
      const institutions = (item.institutions || []).filter(i => i.code || i.name)
      if (institutions.length < 1) {
        return null
      }
      const shown = institutions.find(i => i.type === 'maintenance') || institutions[0]
      return shown.code || shown.name
    },
    formatNumber,
    formatDate,
    isTruncatedAfterWords,
    truncateAfterWords,
    mcpdDateToJsDate,
    showInstitutionModal: function (germplasm) {
      if (germplasm) {
        this.germplasmId = germplasm.germplasmId

        this.$nextTick(() => this.$refs.institutionModal.show())
      }
    },
    selectGermplasm: function (id) {
      this.germplasmId = id
      this.$nextTick(() => this.$refs.passportModal.show())
    },
    refresh: function () {
      this.$refs.germplasmTable.refresh()
    },
    clearFilter: function () {
      this.$refs.germplasmTable.clearFilter()
    },
    getSrc: function (germplasm) {
      return getImageUrl(germplasm.firstImagePath, {
        name: germplasm.firstImagePath,
        type: 'database',
        size: 'small',
        token: this.storeToken ? this.storeToken.imageToken : ''
      })
    },
    markParents: function (item) {
      if (item) {
        const parentId = item.entityParentId
        if (parentId) {
          this.$store.dispatch('addMarkedIds', { type: 'germplasm', ids: [parentId] })
        }
      } else {
        emitter.emit('show-loading', true)
        const requestData = this.$refs.germplasmTable.getCurrentRequestData()
        // First request all ids for the current table items
        this.getIds(requestData, result => {
          // Then post them to the server again to convert them to their entity parents
          apiPostEntityIds(result.data, 'up', result => {
            this.$store.dispatch('addMarkedIds', { type: 'germplasm', ids: result })
            emitter.emit('show-loading', false)
          })
        })
      }
    },
    markChildren: function (item) {
      if (item) {
        emitter.emit('show-loading', true)
        const id = item.germplasmId
        apiPostEntityIds([id], 'down', result => {
          this.$store.dispatch('addMarkedIds', { type: 'germplasm', ids: result })
          emitter.emit('show-loading', false)
        })
      } else {
        emitter.emit('show-loading', true)
        const requestData = this.$refs.germplasmTable.getCurrentRequestData()
        // First request all ids for the current table items
        this.getIds(requestData, result => {
          // Then post them to the server again to convert them to their entity parents
          apiPostEntityIds(result.data, 'down', result => {
            this.$store.dispatch('addMarkedIds', { type: 'germplasm', ids: result })
            emitter.emit('show-loading', false)
          })
        })
      }
    },
    unmarkParents: function (item) {
      if (item) {
        const parentId = item.entityParentId
        this.$store.dispatch('removeMarkedIds', { type: 'germplasm', ids: [parentId] })
      } else {
        emitter.emit('show-loading', true)
        const requestData = this.$refs.germplasmTable.getCurrentRequestData()
        // First request all ids for the current table items
        this.getIds(requestData, result => {
          // Then post them to the server again to convert them to their entity parents
          apiPostEntityIds(result.data, 'up', result => {
            this.$store.dispatch('removeMarkedIds', { type: 'germplasm', ids: result })
            emitter.emit('show-loading', false)
          })
        })
      }
    },
    unmarkChildren: function (item) {
      if (item) {
        emitter.emit('show-loading', true)
        const id = item.germplasmId
        apiPostEntityIds([id], 'down', result => {
          this.$store.dispatch('removeMarkedIds', { type: 'germplasm', ids: result })
          emitter.emit('show-loading', false)
        })
      } else {
        emitter.emit('show-loading', true)
        const requestData = this.$refs.germplasmTable.getCurrentRequestData()
        // First request all ids for the current table items
        this.getIds(requestData, result => {
          // Then post them to the server again to convert them to their entity parents
          apiPostEntityIds(result.data, 'down', result => {
            this.$store.dispatch('removeMarkedIds', { type: 'germplasm', ids: result })
            emitter.emit('show-loading', false)
          })
        })
      }
    },
    onDownloadTableClicked: function () {
      this.$refs.germplasmTable.onDownloadTableClicked()
    }
  },
  created: function () {
    // Columns that start hidden: hidden once, then it is the user's choice (kept with the other columns). Those shown
    // by default again: shown once (marked "show:<column>" among the applied ones).
    const applied = this.storeHiddenColumns[DEFAULT_HIDDEN_APPLIED] || []
    const toHide = DEFAULT_HIDDEN_COLUMNS.filter(column => !applied.includes(column))
    const toShow = DEFAULT_SHOWN_COLUMNS.filter(column => !applied.includes(`show:${column}`))
    if (toHide.length > 0 || toShow.length > 0) {
      if (toHide.length > 0) {
        this.$store.dispatch('addHiddenColumns', { type: this.options.tableName, columns: toHide })
      }
      if (toShow.length > 0) {
        this.$store.dispatch('removeHiddenColumns', { type: this.options.tableName, columns: toShow })
      }
      if (!this.storeHiddenColumns[DEFAULT_HIDDEN_APPLIED]) {
        this.$store.dispatch('setHiddenColumns', { type: DEFAULT_HIDDEN_APPLIED, columns: [] })
      }
      this.$store.dispatch('addHiddenColumns', { type: DEFAULT_HIDDEN_APPLIED, columns: toHide.concat(toShow.map(column => `show:${column}`)) })
    }

    if (this.conservationColumn) {
      getConservationIds('In-situ').then(ids => { this.inSituIds = ids })
    }
  }
}
</script>

<style src="@/assets/custom-page.css"></style>
<style src="@/assets/cp-modal.css"></style>
<style>
/* Icons of the has data of type columns (cells and heads) and of the images: the size of the passport icon (1.3 times
   the text), no taller than the line (the rows keep their height) */
.germplasm-table :is(th, td):is(.bt-col-hasTrialsData, .bt-col-hasGenotypicData, .bt-col-hasPedigreeData, .bt-col-hasAllelefreqData, .bt-col-imageCount) .mdi-icon {
  width: 1.3em;
  height: 1.3em;
  vertical-align: middle;
}
.germplasm-table :is(th, td):is(.bt-col-hasTrialsData, .bt-col-hasGenotypicData, .bt-col-hasPedigreeData, .bt-col-hasAllelefreqData, .bt-col-imageCount) .mdi-icon-wrapper {
  line-height: 1;
}
/* Pedigree: the icon of the Pedigree tab of the passport page (Font Awesome), as large */
.germplasm-table .gt-data-icon {
  font-size: 1.3em;
  line-height: 1;
  vertical-align: middle;
}
/* The passport icon (preview of the passport), then the name */
.germplasm-table .gt-name {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}
.germplasm-table .gt-passport-preview {
  flex-shrink: 0;
  color: var(--bt-icon, #6c757d) !important;
  /* Larger than the text, but no taller than its line: the row keeps its height */
  font-size: 1.3em;
  line-height: 1;
  opacity: 0.8;
}
.germplasm-table .gt-passport-preview:hover,
.germplasm-table .gt-passport-preview:focus {
  color: var(--bt-accent, #3b6b35) !important;
  opacity: 1;
}
.table-image {
  white-space: nowrap;
}
.table-image:hover {
  cursor: pointer;
}
.table-link:hover,
.table-image > a:hover {
  text-decoration: none;
}
.pdci-table > svg {
  vertical-align: sub;
}
.table-image-popover {
  width: 300px;
  height: 300px;
  overflow: hidden;
}
.table-image-popover .popover-body {
  padding: 0;
}
.table-image-popover .popover-body img {
  width: 300px;
  height: 300px;
  object-fit: cover;
}
.table-cell-filter:hover {
  cursor: pointer;
}
.germplasm-table .b-table-details td {
  padding: 0;
}
/* Passport preview: wider than the "xl" modal, within the window */
.passport-preview-modal {
  max-width: min(1320px, 96vw);
}
/* The rounded corners cut the images too */
.passport-preview-modal .modal-content {
  overflow: hidden;
}
.passport-preview-modal .modal-header {
  position: absolute;
  top: 0.75rem;
  right: 1.25rem;
  z-index: 5;
  padding: 0;
  border: 0;
}
.passport-preview-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--cp-border);
  border-radius: 10px;
  background: var(--cp-surface);
  color: var(--cp-muted);
  font-size: 1rem;
  box-shadow: 0 2px 6px var(--cp-shadow);
  cursor: pointer;
}
.passport-preview-close:hover,
.passport-preview-close:focus {
  border-color: var(--cp-muted);
  color: var(--cp-text);
  outline: none;
}
.passport-preview-modal .modal-body {
  padding: 0;
  /* A thin scroll bar: the images reach (almost) the right edge too */
  scrollbar-width: thin;
}
.passport-preview-modal .passport-page.is-popup {
  padding: 1.5rem 1.5rem 0.5rem;
}
.passport-preview-modal .modal-footer {
  border-top: 1px solid var(--cp-border);
  padding-top: 0.9rem;
}
.pdci-circle-background {
  stroke: #ccc;
}
.pdci-circle-inner {
  stroke: #2f353a;
}
</style>
