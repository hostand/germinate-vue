<template>
  <div :class="['dataset-table-root', { 'dt-select-highlight': selectHighlight }]">
    <BaseTable v-bind="$props"
              :getData="getDataWithDetails"
              :columns="columns"
              :options="options"
              :tableActions="allTableActions"
              primary-key="datasetId"
              class="dataset-table"
              ref="datasetTable"
              :selectInfoShown="selectHint ? selectHighlight : null"
              @data-changed="measureCells"
              @filter-removed="autoDetailsDismissed = true"
              v-on="$listeners">
      <!-- HEAD: Database object count -->
      <template v-slot:head(dataObjectCount)="data">
        <span>{{ data.label }} </span> <span class="text-muted" v-b-tooltip.hover.bottom :title="$t('tableColumnTooltipDatasetDataObjects')"><MdiIcon :path="mdiHelpCircle" /></span>
      </template>
      <!-- HEAD: Data point count -->
      <template v-slot:head(dataPointCount)="data">
        <span>{{ data.label }} </span> <span class="text-muted" v-b-tooltip.hover.bottom :title="$t('tableColumnTooltipDatasetDataPoints')"><MdiIcon :path="mdiHelpCircle" /></span>
      </template>

      <!-- Dataset id -->
      <template v-slot:cell(datasetId)="data">
        <span v-if="disableLinks">{{ data.item.datasetId }}</span>
        <!-- If clickHandler is provided, just let it handle clicks -->
        <a href="#" @click.prevent="clickHandler(data.item)" v-else-if="clickHandler && (typeof clickHandler === 'function')">{{ data.item.datasetId }}</a>
        <!-- Else, if we can link to the target page, let's do so -->
        <router-link :to="{ name: datasetTypes[data.item.datasetType].pageName, params: { datasetIds: data.item.datasetId.toString() } }" v-else-if="!data.item.isExternal && isPageAvailable(data.item.datasetType) && (!data.item.licenseName || isAccepted(data.item)) && datasetTypes[data.item.datasetType].pageName">{{ data.item.datasetId }}</router-link>
        <!-- If neither is true, just show the id -->
        <span v-else>{{ data.item.datasetId }}</span>
      </template>
      <!-- Dataset name -->
      <!-- Name and description: cut on one line by the table (BaseTable) -->
      <template v-slot:cell(datasetName)="data">
            <span v-if="disableLinks" :title="data.item.datasetName">{{ data.item.datasetName }}</span>
            <!-- If clickHandler is provided, just let it handle clicks -->
            <a href="#" @click.prevent="clickHandler(data.item)" v-else-if="clickHandler && (typeof clickHandler === 'function')" :title="data.item.datasetName">{{ data.item.datasetName }}</a>
            <!-- Else, if there's a hyperlink for an external dataset, show that -->
            <span v-else-if="data.item.hyperlink && data.item.isExternal"><a target="_blank" rel="noopener noreferrer" :href="data.item.hyperlink" :title="data.item.datasetName">{{ data.item.datasetName }} </a>
            <MdiIcon :path="mdiOpenInNew" />
            </span>
            <!-- Else, if we can link to the target page, let's do so -->
            <router-link :to="{ name: datasetTypes[data.item.datasetType].pageName, params: { datasetIds: data.item.datasetId.toString() } }" v-else-if="!data.item.isExternal && isPageAvailable(data.item.datasetType) && (!data.item.licenseName || isAccepted(data.item)) && datasetTypes[data.item.datasetType].pageName" :title="data.item.datasetName">{{ data.item.datasetName }}</router-link>
            <!-- If none are true, just show the name -->
            <span v-else :title="data.item.datasetName">{{ data.item.datasetName }}</span>
      </template>
      <!-- Dataset description -->
      <template v-slot:cell(datasetDescription)="data">
        <span :title="data.item.datasetDescription" v-if="data.item.datasetDescription">{{ data.item.datasetDescription }}</span>
      </template>
      <!-- Experiment name -->
      <template v-slot:cell(experimentName)="data">
        <span :title="data.item.experimentName" v-if="data.item.experimentName">{{ truncateAfterWords(data.item.experimentName, 10) }}</span>
        <!-- Append a link that takes the user to the experiment details page -->
        <router-link :to="{ name: Pages.experimentDetails, params: { experimentId: data.item.experimentId.toString() } }" class="table-icon-link" v-b-tooltip.hover :title="$t('tableTooltipExperimentDetailsLink')">
          &nbsp;<MdiIcon :path="mdiInformationOutline" />
        </router-link>
      </template>
      <!-- Dataset location country flag -->
      <template v-slot:cell(countries)="data">
        <span v-for="country in getCountries(data.item.locations)" :key="`country-flag-${country}`" class="table-country text-nowrap mr-2" v-b-tooltip.hover :title="getCountryName(country)"><i :class="'fi fi-' + country.toLowerCase()" v-if="country"/> <span> {{ country }}</span></span>
      </template>
      <!-- Display the number of locations associated with this dataset -->
      <!-- Locations: a single one by its name (after the flag of its country when it has one); several as a chip with
           their number. A click shows them on a map when they have coordinates. -->
      <template v-slot:cell(locations)="data">
        <template v-if="data.item.locations !== undefined && data.item.locations !== null && data.item.locations.length > 0">
          <div :class="['dt-clamp', { expanded: isCellExpanded('locations', data.item), cut: isCellCut('locations', data.item) }]" :ref="`clamp-locations-${data.item.datasetId}`" v-if="data.item.locations.length === 1">
            <span class="dt-clamp-text">
              <a href="#" class="dt-location" @click.prevent="showDetails('location', data)" :title="data.item.locations[0].locationName" v-if="hasCoordinates(data.item.locations) && !disableLinks">
                <i :class="`fi fi-${data.item.locations[0].countryCode2.toLowerCase()}`" :title="data.item.locations[0].countryName" v-if="data.item.locations[0].countryCode2" /> {{ data.item.locations[0].locationName }}<template v-if="data.item.locations[0].countryCode3"> ({{ data.item.locations[0].countryCode3 }})</template>
              </a>
              <span class="dt-location" :title="data.item.locations[0].locationName" v-else>
                <i :class="`fi fi-${data.item.locations[0].countryCode2.toLowerCase()}`" :title="data.item.locations[0].countryName" v-if="data.item.locations[0].countryCode2" /> {{ data.item.locations[0].locationName }}<template v-if="data.item.locations[0].countryCode3"> ({{ data.item.locations[0].countryCode3 }})</template>
              </span>
            </span>
            <button type="button" class="dt-clamp-toggle" v-if="isCellCut('locations', data.item) || isCellExpanded('locations', data.item)" @click="toggleCell('locations', data.item)" :aria-label="$t('buttonReadMore')">
              <i class="fa-solid fa-chevron-down" aria-hidden="true" />
            </button>
          </div>
          <template v-else>
            <a href="#" class="bt-chip dt-location-chip" :style="{ '--bt-chip-color': locationChipColor }" @click.prevent="showDetails('location', data)" v-b-tooltip.hover :title="$t('tableTooltipDatasetLocations')" v-if="hasCoordinates(data.item.locations) && !disableLinks">
              <MdiIcon :path="mdiMapMarker" /> {{ data.item.locations.length }}
            </a>
            <span class="bt-chip" :style="{ '--bt-chip-color': locationChipColor }" v-else>
              <MdiIcon :path="mdiMapMarker" /> {{ data.item.locations.length }}
            </span>
          </template>
        </template>
      </template>
      <!-- Dataset type icon -->
      <template v-slot:cell(datasetType)="data">
        <b-badge class="bt-chip" :style="{ '--bt-chip-color': datasetTypes[data.item.datasetType].color() }"><MdiIcon :path="datasetTypes[data.item.datasetType].path" /> {{ datasetTypes[data.item.datasetType].text() }}</b-badge>
      </template>
      <!-- Data point count -->
      <template v-slot:cell(dataPointCount)="data">
        <span v-if="data.item.dataPointCount !== undefined && data.item.dataPointCount.value">{{ getDataPointCount(data.item) }}</span>
      </template>
      <!-- Dataset license -->
      <template v-slot:cell(licenseName)="data">
        <div v-if="data.item.licenseName">
          <!-- Show the license modal -->
          <a href="#" @click.prevent="onLicenseClicked(data.item)" class="text-nowrap">
            <i class="fa-brands fa-creative-commons dt-license-icon" aria-hidden="true" v-if="isCreativeCommons(data.item)" /><span>{{ data.item.licenseName }} </span>
          </a>
          <!-- Show the status -->
          <span class="text-success" v-if="isAccepted(data.item)"><MdiIcon :path="mdiCheck" /></span>
        </div>
      </template>
      <!-- Status (external datasets, instead of the options): the state of the dataset as a badge; edit and delete for
           data curators -->
      <template v-slot:cell(status)="data">
        <div class="dt-actions">
          <span class="dt-state" v-if="datasetStates[data.item.datasetState]">
            <i :class="['fa-solid', stateIcons[data.item.datasetState]]" aria-hidden="true" /> {{ datasetStates[data.item.datasetState].text() }}
          </span>
          <template v-if="userIsDataCurator && allowEditing">
            <button type="button" class="dt-action" @click="onDatasetEditClicked(data.item)" v-b-tooltip.hover :title="$t('tableTooltipDatasetEdit')" :aria-label="$t('tableTooltipDatasetEdit')">
              <i class="fa-solid fa-pen-to-square" aria-hidden="true" />
            </button>
            <button type="button" class="dt-action is-danger" @click="onDatasetDeleteClicked(data.item)" v-b-tooltip.hover :title="$t('tableTooltipDatasetDelete')" :aria-label="$t('tableTooltipDatasetDelete')">
              <i class="fa-solid fa-trash-can" aria-hidden="true" />
            </button>
          </template>
        </div>
      </template>
      <!-- The options of the dataset: a button opening one menu for all the rows (moreMenu, placed above the button,
           outside of the scrolling table); edit and delete for data curators -->
      <template v-slot:cell(actions)="data">
        <div class="dt-actions">
          <button type="button" :class="['dt-more-toggle', { open: moreMenu && moreMenu.item === data.item }]" :data-dt-more="data.item.datasetId" @click.stop="toggleMoreMenu($event, data)" aria-haspopup="menu" :aria-expanded="moreMenu && moreMenu.item === data.item ? 'true' : 'false'">
            <!-- The option marked in the menu (its details shown below the row) names the button -->
            <span class="dt-more-toggle-label">{{ getMoreLabel(data.item) }}</span>
            <i class="fa-solid fa-chevron-up" aria-hidden="true" />
          </button>
          <template v-if="userIsDataCurator && allowEditing">
            <button type="button" class="dt-action" @click="onDatasetEditClicked(data.item)" v-b-tooltip.hover :title="$t('tableTooltipDatasetEdit')" :aria-label="$t('tableTooltipDatasetEdit')">
              <i class="fa-solid fa-pen-to-square" aria-hidden="true" />
            </button>
            <button type="button" class="dt-action is-danger" @click="onDatasetDeleteClicked(data.item)" v-b-tooltip.hover :title="$t('tableTooltipDatasetDelete')" :aria-label="$t('tableTooltipDatasetDelete')">
              <i class="fa-solid fa-trash-can" aria-hidden="true" />
            </button>
          </template>
        </div>
      </template>

      <!-- Row details is where the dataset locations are shown on a map -->
      <template v-slot:row-details="data">
        <template v-if="detailType === 'location'">
          <LocationMap :locations="data.item.locations" v-if="data.item.locations && data.item.locations.length > 0" :showLinks="false" customLook />
        </template>
        <div v-else-if="detailType === 'collaborators'" class="dt-details">
          <!-- Collaborators modal -->
          <CollaboratorDetails :dataset="data.item" v-if="data.item && data.item.collaborators !== 0" />
        </div>
        <div v-else-if="detailType === 'attributes'" class="dt-details">
          <!-- Attribute modal -->
          <AttributeDetails :dataset="data.item" v-if="data.item && (data.item.dublinCore !== undefined || data.item.attributes !== 0)" />
        </div>
        <div v-else-if="detailType === 'fileresources'" class="dt-details">
          <!-- Linked data resources -->
          <FileresourceDetails :dataset="data.item" v-if="data.item && data.item.fileresourceIds && data.item.fileresourceIds.length > 0" />
        </div>
        <div v-else-if="detailType === 'institutions'" class="dt-details">
          <!-- Institution table -->
          <InstitutionDetails :dataset="data.item" v-if="data.item && data.item.institutions && data.item.institutions.length > 0" />
        </div>
      </template>
    </BaseTable>

    <!-- The options of a dataset: internal / external and its state, then what can be seen of it (the menu stays open)
         and the download (the menu closes) -->
    <div class="bt-tokens dt-more-menu" v-if="moreMenu" :style="moreMenu.style" ref="moreMenu" role="menu" data-bt-keep-details @click.stop>
      <div class="dt-more-head">
        <span class="dt-more-kind">{{ moreMenu.item.isExternal ? $t('datasetMenuExternal') : $t('datasetMenuInternal') }}</span>
        <span class="dt-more-state" v-if="datasetStates[moreMenu.item.datasetState]">
          <i :class="['fa-solid', stateIcons[moreMenu.item.datasetState]]" aria-hidden="true" /> {{ datasetStates[moreMenu.item.datasetState].text() }}
        </span>
      </div>
      <button type="button" :class="['dt-more-item', { 'is-active': option.active }]" role="menuitem" v-for="option in moreOptions" :key="`dt-more-${option.key}`" :disabled="option.disabled" :aria-pressed="option.active ? 'true' : null" @click="option.action">
        <i :class="['fa-solid', option.icon, 'fa-fw']" aria-hidden="true" />
        <span class="dt-more-label">{{ option.text }}</span>
        <span class="dt-more-count" v-if="option.count">{{ formatNumber(option.count) }}</span>
      </button>
    </div>

    <!-- License modal -->
    <LicenseModal :license="license" :dataset="dataset" :isAccepted="dataset.acceptedBy && dataset.acceptedBy.length > 0" ref="licenseModal" v-if="dataset" />
    <!-- Publications modal -->
    <PublicationsModal referenceType="dataset" :referencingId="dataset.datasetId" v-if="dataset && (dataset.publications !== 0 || userIsDataCurator)" ref="publicationsModal" />
    <!-- Genotype export modal for direct downloads from the table -->
    <GenotypeExportModal v-if="dataset && dataset.datasetType === 'genotype'" ref="genotypeExportModal" @formats-selected="downloadGenotypicDataset" />
    <!-- Dataset edit modal -->
    <DatasetEditModal :datasetType="datasetType" :dataset="dataset" v-if="userIsDataCurator" @changed="refresh" ref="datasetEditModal" />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

import MdiIcon from '@/components/icons/MdiIcon'
import BaseTable from '@/components/tables/BaseTable'
import LicenseModal from '@/components/modals/LicenseModal'
import CollaboratorDetails from '@/components/tables/details/CollaboratorDetails'
import InstitutionDetails from '@/components/tables/details/InstitutionDetails'
import FileresourceDetails from '@/components/tables/details/FileresourceDetails'
import GenotypeExportModal from '@/components/modals/GenotypeExportModal'
import DatasetEditModal from '@/components/modals/DatasetEditModal'
import PublicationsModal from '@/components/modals/PublicationsModal'
import LocationMap from '@/components/map/LocationMap'
import AttributeDetails from '@/components/tables/details/AttributeDetails'
import defaultProps from '@/const/table-props'
import { apiPostDatasetExport, apiGetDatasetSourceFile, apiPostLicenseTable, apiDeleteDataset } from '@/mixins/api/dataset'
import { apiPostGenotypeDatasetExport } from '@/mixins/api/genotype'
import { apiGetCountries } from '@/mixins/api/location'
import { apiPostPedigreeDatasetExport } from '@/mixins/api/germplasm'
import { datasetStates, datasetTypes, locationTypes } from '@/mixins/types'
import { getHighContrastTextColor } from '@/mixins/colors'
import { isPageAvailable, downloadBlob } from '@/mixins/util'
import { userIsAtLeast, USER_TYPE_DATA_CURATOR } from '@/mixins/api/auth'
import { getDateTimeString, isTruncatedAfterWords, truncateAfterWords, getNumberWithSuffix, formatDateTime, formatDate, formatNumber } from '@/mixins/formatting'

import { mdiHelpCircle, mdiOpenInNew, mdiInformationOutline, mdiCity, mdiPlusBox, mdiDelete, mdiAttachment, mdiMapMarker, mdiCheck, mdiNewBox, mdiTextBoxCheckOutline, mdiAccountMultiple, mdiFilePlus, mdiDownload, mdiSquareEditOutline, mdiLinkBoxVariantOutline, mdiTextBoxOutline } from '@mdi/js'
import { Pages } from '@/mixins/pages'
import { followAnchor } from '@/mixins/anchored-menu'

const emitter = require('tiny-emitter/instance')

const countries = require('i18n-iso-countries')
countries.registerLocale(require('i18n-iso-countries/langs/en.json'))

// The countries of the database by their id (the locations of the datasets only have the id), loaded once
let countriesById = null
const getCountriesById = () => {
  if (!countriesById) {
    countriesById = new Promise(resolve => {
      apiGetCountries(result => {
        const byId = {}
        ;(result || []).filter(c => c.id > 0 && c.countryCode2).forEach(c => { byId[c.id] = c })
        resolve(byId)
      }, {
        codes: [],
        callback: () => {
          countriesById = null
          resolve({})
        }
      })
    })
  }
  return countriesById
}

export default {
  name: 'DatasetTable',
  props: {
    ...defaultProps.FULL,
    ...defaultProps.ACTIONS,
    // Details shown on every row when the data arrives: 'collaborators', 'location', 'attributes', 'institutions' or
    // 'fileresources'
    openDetails: {
      type: String,
      default: null
    },
    selectable: {
      type: Boolean,
      default: false
    },
    clickHandler: {
      type: Function,
      default: null
    },
    selectionMode: {
      type: String,
      default: 'multi'
    },
    disableLinks: {
      type: Boolean,
      default: false
    },
    // Several rows selected: the column of the checkboxes without its blue, drawing the eye instead (highlightSelection),
    // the note on how to select shown only meanwhile
    selectHint: {
      type: Boolean,
      default: false
    },
    // Only these columns, in this order (e.g. the datasets of an accession); the table then has a name of its own
    onlyColumns: {
      type: Array,
      default: null
    },
    datasetType: {
      type: String,
      default: null
    },
    // External datasets: a Status column (the state of the dataset) instead of the options menu
    external: {
      type: Boolean,
      default: false
    },
    // Adding, editing and deleting datasets (data curators); off where the datasets are only shown (e.g. those of a
    // trait): that is done on the datasets page
    allowEditing: {
      type: Boolean,
      default: true
    }
  },
  data: function () {
    return {
      // The column of the checkboxes drawing the eye for a moment (highlightSelection)
      selectHighlight: false,
      selectHighlightTimer: null,
      Pages,
      datasetStates,
      datasetTypes,
      mdiDelete,
      mdiHelpCircle,
      mdiCity,
      mdiOpenInNew,
      mdiInformationOutline,
      mdiMapMarker,
      mdiCheck,
      mdiNewBox,
      mdiTextBoxCheckOutline,
      mdiAccountMultiple,
      mdiFilePlus,
      mdiDownload,
      mdiSquareEditOutline,
      mdiAttachment,
      mdiLinkBoxVariantOutline,
      mdiTextBoxOutline,
      options: {
        idColumn: 'datasetId',
        tableName: this.onlyColumns ? 'datasetsShort' : 'datasets'
      },
      dataset: null,
      license: null,
      previousDetailsRow: null,
      detailType: 'location',
      // The details shown on every row (openDetails, the address) no more once the user took a filter away
      autoDetailsDismissed: false,
      // Name and description cells ("<column>-<datasetId>") shown in full, and those cut on their line (measured)
      expandedCells: {},
      cutCells: {},
      // The options menu: its dataset (item), the row (for its details) and where it is
      moreMenu: null,
      // The dataset whose full download was the last option chosen: marked in its menu and on its button
      downloadMarkedId: null,
      // The Font Awesome icons of the dataset states
      stateIcons: {
        public: 'fa-lock-open',
        private: 'fa-lock',
        hidden: 'fa-eye-slash'
      }
    }
  },
  computed: {
    ...mapGetters([
      'storeLocale',
      'storeToken',
      'storeSelectedProjects'
    ]),
    // The location chips: in the colour of the dataset locations, the count beside the icon
    locationChipColor: function () {
      return locationTypes.datasets.color() || 'currentColor'
    },
    // The options of the dataset of the menu: what can be seen of it (count; disabled when not allowed) and the download.
    // Those with nothing to count only for data curators (who can add to them); the details shown below the row marked.
    moreOptions: function () {
      if (!this.moreMenu) {
        return []
      }
      const item = this.moreMenu.item
      const data = this.moreMenu.data
      const allowed = !item.licenseName || this.isAccepted(item)
      const fileresources = item.fileresourceIds ? item.fileresourceIds.length : 0
      const institutions = item.institutions ? item.institutions.length : 0
      return [{
        key: 'fileresources',
        icon: 'fa-paperclip',
        text: this.$t('datasetMenuLinkedResources'),
        count: fileresources,
        disabled: fileresources === 0 || !this.dataResourcesVisible || !allowed,
        action: () => this.showRowDetails('fileresources', data)
      }, {
        key: 'publications',
        icon: 'fa-book',
        text: this.$t('pagePublicationsTitle'),
        count: item.publications,
        disabled: !item.publications && !this.userIsDataCurator,
        action: () => this.showPublications(item)
      }, {
        key: 'institutions',
        icon: 'fa-building-flag',
        text: this.$t('modalTitleInstitutions'),
        count: institutions,
        disabled: institutions === 0,
        action: () => this.showRowDetails('institutions', data)
      }, {
        key: 'collaborators',
        icon: 'fa-users',
        text: this.$t('tableTooltipDatasetCollaborators'),
        count: item.collaborators,
        disabled: !item.collaborators,
        action: () => this.showRowDetails('collaborators', data)
      }, {
        key: 'attributes',
        icon: 'fa-ellipsis-vertical',
        text: this.$t('pagePassportAttributeTitle'),
        count: item.attributes,
        disabled: (!item.attributes && !item.dublinCore) || !allowed,
        action: () => this.showRowDetails('attributes', data)
      }, {
        key: 'download',
        icon: 'fa-download',
        text: this.$t('tableTooltipDatasetDownload'),
        count: null,
        disabled: item.isExternal || !allowed,
        action: () => this.startFullDownload(item)
      }].filter(option => option.count === null || option.count > 0 || this.userIsDataCurator)
        .map(option => Object.assign(option, {
          active: (['fileresources', 'institutions', 'collaborators', 'attributes'].includes(option.key) && item._showDetails === true && this.detailType === option.key) ||
            (option.key === 'download' && this.downloadMarkedId === item.datasetId)
        }))
    },
    dataResourcesVisible: function () {
      return isPageAvailable(Pages.dataResources)
    },
    userIsDataCurator: function () {
      return this.storeToken && userIsAtLeast(this.storeToken.userType, USER_TYPE_DATA_CURATOR)
    },
    // The actions given (e.g. Next) and, for data curators, adding a dataset
    allTableActions: function () {
      const actions = (this.tableActions || []).concat(this.userIsDataCurator && this.allowEditing ? this.localTableActions : [])
      return actions.length > 0 ? actions : null
    },
    localTableActions: function () {
      return [{
        id: 1,
        text: this.$t('buttonAddDataset'),
        variant: null,
        disabled: () => false,
        path: mdiPlusBox,
        callback: () => {
          this.dataset = null
          this.$refs.datasetEditModal.show()
        }
      }]
    },
    columns: function () {
      const result = [
        {
          key: 'projectId',
          type: Number,
          sortable: false,
          class: 'd-none text-right',
          label: this.$t('tableColumnProjectId')
        }, {
          key: 'datasetId',
          type: Number,
          sortable: true,
          class: 'text-right',
          label: this.$t('tableColumnDatasetId')
        }, {
          key: 'datasetName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnDatasetName'),
          preferredSortingColumn: true
        }, {
          key: 'datasetDescription',
          type: String,
          sortable: true,
          label: this.$t('tableColumnDatasetDescription')
        }, {
          key: 'experimentId',
          type: Number,
          sortable: true,
          class: 'text-right',
          label: this.$t('tableColumnExperimentId')
        }, {
          key: 'experimentName',
          type: String,
          sortable: true,
          defaultHidden: true,
          label: this.$t('tableColumnExperimentName')
        }, {
          key: 'datasetType',
          type: String,
          sortable: true,
          label: this.$t('tableColumnDatasetDatasetType')
        }, {
          key: 'datatype',
          type: String,
          sortable: true,
          label: this.$t('tableColumnDatasetDataType')
        }, {
          key: 'licenseName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnDatasetLicenseName')
        }, {
          key: 'contact',
          type: String,
          sortable: true,
          label: this.$t('tableColumnDatasetContact')
        }, {
          key: 'countries',
          type: undefined,
          sortable: false,
          defaultHidden: true,
          label: this.$t('tableColumnDatasetCountryName')
        }, {
          key: 'locations',
          type: 'json',
          sortable: true,
          label: this.$t('tableColumnDatasetLocations')
        }, {
          key: 'startDate',
          type: Date,
          sortable: true,
          label: this.$t('tableColumnDatasetStartDate'),
          formatter: value => formatDate(value)
        }, {
          key: 'endDate',
          type: Date,
          sortable: true,
          label: this.$t('tableColumnDatasetEndDate'),
          formatter: value => formatDate(value)
        }, {
          key: 'dataObjectCount',
          type: Number,
          sortable: true,
          class: 'text-right',
          label: this.$t('tableColumnDatasetObjectCount'),
          formatter: value => value ? getNumberWithSuffix(value.value, 2) : null
        }, {
          key: 'dataPointCount',
          type: Number,
          sortable: true,
          class: 'text-right',
          label: this.$t('tableColumnDatasetPointCount')
        }, {
          key: 'createdOn',
          type: Date,
          sortable: true,
          label: this.$t('tableColumnDatasetCreatedOn'),
          formatter: value => formatDateTime(value)
        }, this.external
          ? {
              key: 'status',
              type: undefined,
              sortable: false,
              class: 'dt-actions-cell',
              label: this.$t('tableColumnDatasetStatus')
            }
          : {
              key: 'actions',
              type: undefined,
              sortable: false,
              class: 'dt-actions-cell',
              label: ''
            }
      ]

      if (this.selectable === true) {
        result.unshift({
          key: 'selected',
          type: undefined,
          sortable: false,
          // One selected only (new look): no blue column, the row is tinted when selected
          class: this.selectionMode === 'single' || this.selectHint ? 'dt-select-cell' : 'table-primary',
          label: ''
        })
      }

      // Only some columns, in their order
      if (this.onlyColumns) {
        return this.onlyColumns.map(key => result.find(c => c.key === key)).filter(c => c)
      }

      return result
    }
  },
  components: {
    MdiIcon,
    AttributeDetails,
    BaseTable,
    CollaboratorDetails,
    InstitutionDetails,
    FileresourceDetails,
    DatasetEditModal,
    GenotypeExportModal,
    LocationMap,
    LicenseModal,
    PublicationsModal
  },
  watch: {
    storeSelectedProjects: function () {
      this.$refs.datasetTable.refresh()
    }
  },
  methods: {
    userIsAtLeast,
    isTruncatedAfterWords,
    truncateAfterWords,
    getHighContrastTextColor,
    isPageAvailable,
    // The data of the table; with "openDetails" (or "datasets-details" in the URL, e.g. "collaborators"), every row
    // comes with those details shown
    // The country of each location (code and name, for the flag and the map) is added to the rows
    getDataWithDetails: function (data, callback) {
      const type = this.autoDetailsDismissed ? null : (this.openDetails || (this.$route && this.$route.query ? this.$route.query['datasets-details'] : null))
      let request
      if (!type) {
        request = this.getData(data, callback)
      } else {
        this.detailType = type
        request = this.getData(data, result => {
          if (result && result.data) {
            result.data.forEach(dataset => { dataset._showDetails = true })
          }
          if (callback) {
            callback(result)
          }
        })
      }
      if (!request || typeof request.then !== 'function') {
        return request
      }
      return Promise.all([request, getCountriesById()]).then(([result, byId]) => {
        const datasets = result && result.data ? result.data.data : null
        ;(datasets || []).forEach(dataset => (dataset.locations || []).forEach(location => {
          const country = byId[location.countryId]
          if (country) {
            location.countryCode2 = country.countryCode2
            location.countryCode3 = country.countryCode3
            location.countryName = country.countryName
          }
        }))
        return result
      })
    },
    formatNumber,
    // The options menu of a row: above its button (below it when there is no room above), in this component
    toggleMoreMenu: function (event, data) {
      if (this.moreMenu && this.moreMenu.item === data.item) {
        this.closeMoreMenu()
        return
      }
      this.closeMoreMenu()
      // First hidden, to know its height; then placed next to its button, and again whenever the table changes (a row
      // expanded or folded above it, the width): always next to its button
      this.moreMenu = { item: data.item, data, above: null, style: { left: '0px', width: '260px', top: '0px', visibility: 'hidden' } }
      document.addEventListener('click', this.closeMoreMenu)
      document.addEventListener('keydown', this.onMoreMenuKey)
      this.$nextTick(() => {
        this.placeMoreMenu()
        this.stopFollowingMore = followAnchor(this.$el, this.placeMoreMenu)
      })
    },
    // The menu right above its button (below it when there is no room above when it opens), in this component
    placeMoreMenu: function () {
      const menu = this.$refs.moreMenu
      if (!menu || !this.moreMenu) {
        return
      }
      // The button of the row (the rows may have been drawn again since)
      const button = [...this.$el.querySelectorAll('[data-dt-more]')].find(b => b.getAttribute('data-dt-more') === `${this.moreMenu.item.datasetId}`)
      if (!button) {
        this.closeMoreMenu()
        return
      }
      const width = 260
      const height = menu.offsetHeight
      const b = button.getBoundingClientRect()
      const r = this.$el.getBoundingClientRect()
      if (this.moreMenu.above === null) {
        this.moreMenu.above = b.top >= height + 8
      }
      // In the coordinates of the window (the menu is fixed: no container with overflow hidden cuts it), within the
      // width of the table
      const left = Math.max(r.left, Math.min(b.left, r.right - width))
      const top = this.moreMenu.above ? b.top - height - 3 : b.bottom + 3
      this.moreMenu.style = { left: `${left}px`, width: `${width}px`, top: `${top}px` }
    },
    // The table brought into view, its column of checkboxes highlighted for a moment (e.g. when a dataset has to be
    // selected first)
    // The column of the checkboxes drawing the eye for a moment (brought into view first, unless asked not to)
    highlightSelection: function (scroll = true) {
      if (scroll && this.$el && this.$el.scrollIntoView) {
        this.$el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      clearTimeout(this.selectHighlightTimer)
      this.selectHighlight = false
      this.$nextTick(() => {
        this.selectHighlight = true
        this.selectHighlightTimer = setTimeout(() => { this.selectHighlight = false }, 2600)
      })
    },
    // The name of the button of the options: the option marked for the row (its details shown below it), else
    // "More options"
    getMoreLabel: function (item) {
      if (item._showDetails === true) {
        const texts = {
          fileresources: () => this.$t('datasetMenuLinkedResources'),
          institutions: () => this.$t('modalTitleInstitutions'),
          collaborators: () => this.$t('tableTooltipDatasetCollaborators'),
          attributes: () => this.$t('pagePassportAttributeTitle')
        }
        if (texts[this.detailType]) {
          return texts[this.detailType]()
        }
      }
      if (this.downloadMarkedId === item.datasetId) {
        return this.$t('tableTooltipDatasetDownload')
      }
      return this.$t('datasetMenuMoreOptions')
    },
    closeMoreMenu: function () {
      if (this.stopFollowingMore) {
        this.stopFollowingMore()
        this.stopFollowingMore = null
      }
      this.moreMenu = null
      document.removeEventListener('click', this.closeMoreMenu)
      document.removeEventListener('keydown', this.onMoreMenuKey)
    },
    onMoreMenuKey: function (event) {
      if (event.key === 'Escape') {
        this.closeMoreMenu()
      }
    },
    // The details below the row (from the menu): shown, another type replacing them; the same type again hides them
    // One row expanded at a time (the type of details is the same for all rows): the same option again closes it,
    // another one replaces its content, and the details of another row close
    showRowDetails: function (type, data) {
      this.downloadMarkedId = null
      const shown = data.item._showDetails === true
      if (!shown || type === this.detailType) {
        this.$set(data.item, '_showDetails', !shown)
      }
      if (!shown) {
        this.closeOtherDetails(data.item)
      }
      this.detailType = type
    },
    // Full download from the menu: first the option marked (in the menu and on the button), then every row of the
    // table folded, then the download; right after it, "More options" again
    startFullDownload: function (item) {
      this.downloadMarkedId = item.datasetId
      this.$nextTick(() => {
        this.closeOtherDetails(null)
        this.$nextTick(() => {
          this.closeMoreMenu()
          this.downloadDataset(item)
          this.downloadMarkedId = null
        })
      })
    },
    closeOtherDetails: function (item) {
      const table = this.$refs.datasetTable
      ;((table && table.pageItems) || []).forEach(other => {
        if (other !== item && other._showDetails) {
          this.$set(other, '_showDetails', false)
        }
      })
    },
    hasCoordinates: function (locations) {
      return locations.some(l => l.locationLatitude && l.locationLongitude)
    },
    showDetails: function (type, data) {
      if (!data.detailsShowing || type === this.detailType) {
        this.$nextTick(() => data.toggleDetails())
      }
      if (!data.detailsShowing) {
        this.closeOtherDetails(data.item)
      }

      this.detailType = type
    },
    isCellExpanded: function (column, item) {
      return this.expandedCells[`${column}-${item.datasetId}`] === true
    },
    isCellCut: function (column, item) {
      return this.cutCells[`${column}-${item.datasetId}`] === true
    },
    toggleCell: function (column, item) {
      const key = `${column}-${item.datasetId}`
      this.$set(this.expandedCells, key, !this.expandedCells[key])
    },
    // Which name and description cells are cut on their line (after the rows are shown, and when the width changes)
    measureCells: function () {
      this.closeMoreMenu()
      this.$nextTick(() => {
        Object.keys(this.$refs).filter(ref => ref.startsWith('clamp-')).forEach(ref => {
          const element = Array.isArray(this.$refs[ref]) ? this.$refs[ref][0] : this.$refs[ref]
          const key = ref.replace('clamp-', '')
          if (!element || this.expandedCells[key]) {
            return
          }
          const text = element.querySelector('.dt-clamp-text')
          this.$set(this.cutCells, key, text.scrollWidth > text.clientWidth + 1)
        })
      })
    },
    getCountries: function (locations) {
      if (locations) {
        return [...new Set(locations.map(l => l.countryCode2).filter(c => c))]
      } else {
        return []
      }
    },
    getCountryName: function (code2) {
      return countries.getName(code2, 'en')
    },
    // A Creative Commons license (CC ...): its icon before the name
    isCreativeCommons: function (dataset) {
      const text = `${dataset.licenseName || ''} ${dataset.licenseDescription || ''}`
      return /(^|[^a-z])cc([^a-z]|$)|creative\s*commons/i.test(text)
    },
    isAccepted: function (dataset) {
      if (this.storeToken) {
        return dataset.acceptedBy && dataset.acceptedBy.indexOf(this.storeToken.id) !== -1
      } else {
        return dataset.acceptedBy && dataset.acceptedBy.indexOf(-1000) !== -1
      }
    },
    getDataPointCount: function (dataset) {
      let result = ''
      if (dataset.datasetType === 'genotype' || dataset.datasetType === 'allelefreq') {
        result = '≤'
      }
      result += getNumberWithSuffix(dataset.dataPointCount.value, 2)
      return result
    },
    downloadDataset: function (dataset) {
      switch (dataset.datasetType) {
        case 'trials':
          this.initDownload(dataset, 'trial')
          break
        case 'climate':
          this.initDownload(dataset, 'climate')
          break
        case 'pedigree':
          this.downloadPedigreeDataset(dataset)
          break
        case 'allelefreq':
          // For allelefreq data, just request the underlying data file
          apiGetDatasetSourceFile(dataset.datasetId, result => {
            downloadBlob({
              filename: `allelefreq-${dataset.datasetId}-${getDateTimeString()}`,
              extension: 'txt',
              blob: result
            })
          })
          break
        case 'genotype':
          // For genotypic data, ask for the additional data types to download.
          this.dataset = dataset
          this.$nextTick(() => this.$refs.genotypeExportModal.show())
          break
      }
    },
    downloadPedigreeDataset: function (dataset) {
      const query = {
        datasetIds: [dataset.datasetId],
        includeAttributes: true
      }
      emitter.emit('show-loading', true)
      this.$gtag.event('export', 'async', 'pedigree', query.datasetIds.join('-'))
      apiPostPedigreeDatasetExport(query, result => {
        result.forEach(r => this.$store.commit('ON_ASYNC_JOB_UUID_ADD_MUTATION', r.uuid))

        // Show the sidebar
        emitter.emit('toggle-aside', 'download')
        emitter.emit('show-loading', false)
      })
    },
    downloadGenotypicDataset: function (selectedFormats) {
      // Then export
      const genotypeQuery = {
        datasetIds: [this.dataset.datasetId],
        generateFlapjackProject: selectedFormats.indexOf('flapjack') !== -1,
        generateHapMap: selectedFormats.indexOf('hapmap') !== -1,
        generateFlatFile: selectedFormats.indexOf('flat') !== -1
      }
      emitter.emit('show-loading', true)
      this.$gtag.event('export', 'async', 'genotype', genotypeQuery.datasetIds.join('-'))
      apiPostGenotypeDatasetExport(genotypeQuery, result => {
        result.forEach(r => this.$store.commit('ON_ASYNC_JOB_UUID_ADD_MUTATION', r.uuid))

        // Show the sidebar
        emitter.emit('toggle-aside', 'download')
        emitter.emit('show-loading', false)
      })
      this.dataset = null
    },
    initDownload: function (dataset, type) {
      // Request data export for all columns and rows for this current dataset
      const query = {
        xGroupIds: null,
        xIds: null,
        yGroupIds: null,
        yIds: null,
        currentTraitCount: null,
        datasetIds: [dataset.datasetId]
      }
      emitter.emit('show-loading', true)
      apiPostDatasetExport(type, query, result => {
        const request = {
          blob: result,
          filename: `${type}-dataset-${dataset.datasetId}-${getDateTimeString()}`,
          extension: 'txt'
        }

        downloadBlob(request)
        emitter.emit('show-loading', false)
      })
    },

    showPublications: function (dataset) {
      this.dataset = dataset
      this.$nextTick(() => this.$refs.publicationsModal.show())
    },
    showFileresources: function (dataset) {
      const filter = [{
        column: 'datasetIds',
        comparator: 'contains',
        operator: 'and',
        values: [dataset.datasetId]
      }]
      this.$router.push({
        name: Pages.dataResources,
        query: {
          'fileresources-filter': JSON.stringify(filter)
        }
      })
    },
    getSelected: function () {
      return this.$refs.datasetTable.getSelected()
    },
    setSelectedItems: function (toSelect) {
      this.$refs.datasetTable.setSelectedItems(toSelect)
    },
    refresh: function () {
      this.dataset = null
      this.$refs.datasetTable.refresh()
    },
    onLicenseAccepted: function () {
      // this.$refs.licenseModal.hide()
      this.$emit('license-accepted')
      this.refresh()
    },
    onDatasetEditClicked: function (dataset) {
      this.dataset = dataset

      this.$nextTick(() => this.$refs.datasetEditModal.show())
    },
    onDatasetDeleteClicked: function (dataset) {
      this.$bvModal.msgBoxConfirm(this.$t('modalTextDatasetDelete'), {
        title: this.$t('modalTitleSure'),
        okVariant: 'danger',
        okTitle: this.$t('genericYes'),
        cancelTitle: this.$t('genericNo')
      })
        .then(value => {
          if (value) {
            // Delete the image
            apiDeleteDataset(dataset.datasetId, result => {
              if (result) {
                this.refresh()
              }
            })
          }
        })
    },
    onLicenseClicked: function (dataset) {
      this.dataset = dataset

      if (this.license && this.license.licenseId === this.dataset.licenseId) {
        // If we already have the correct license, just show it
        this.$refs.licenseModal.show()
      } else {
        // Otherwise, go get it
        const query = {
          page: 1,
          prevCount: -1,
          filter: [{
            column: 'licenseId',
            comparator: 'equals',
            operator: 'and',
            values: [dataset.licenseId]
          }, {
            column: 'datasetId',
            comparator: 'equals',
            operator: 'and',
            values: [this.dataset.datasetId]
          }]
        }
        apiPostLicenseTable(query, result => {
          if (result && result.data && result.data.length > 0) {
            this.license = result.data[0]
            this.$refs.licenseModal.show()
          }
        })
      }
    }
  },
  mounted: function () {
    emitter.on('license-accepted', this.onLicenseAccepted)
    window.addEventListener('resize', this.measureCells)
  },
  beforeDestroy: function () {
    emitter.off('license-accepted', this.onLicenseAccepted)
    window.removeEventListener('resize', this.measureCells)
    this.closeMoreMenu()
  }
}
</script>

<style>
.table-icon-link:hover {
  text-decoration: none;
}
.dataset-table .b-table-details > td {
  padding: 0;
}
/* The details below a row (another table, the Dublin Core ...): in the colours of the tables, light or dark */
.dataset-table .dt-details {
  padding: 1rem;
  border-top: 1px solid var(--bt-border);
  background: var(--bt-head-bg);
  color: var(--bt-text);
}
/* Name and description on one line, "..." where cut; expanded: all of it, on several lines */
.dataset-table .dt-clamp {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  width: 100%;
  max-width: 22rem;
}
.dataset-table .dt-clamp-text {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dataset-table .dt-clamp.expanded .dt-clamp-text {
  white-space: normal;
}
/* The chevron at the right of the cell, whatever the length of the text */
.dataset-table .dt-clamp-toggle {
  flex-shrink: 0;
  margin-left: auto;
  padding: 0 0.15rem;
  border: 0;
  background: transparent;
  color: var(--bt-muted, #6b6f6c);
  font-size: 0.65rem;
  line-height: 1.5rem;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.dataset-table .dt-clamp.expanded .dt-clamp-toggle {
  transform: rotate(180deg);
}
.dataset-table .dt-location-chip,
.dataset-table .dt-location-chip:hover {
  text-decoration: none;
}
.dataset-table .dt-location .fi {
  margin-right: 0.25rem;
}

/* The options of a row: "More options" (bordered, a chevron up) and the edit / delete icons */
.dataset-table-root {
  position: relative;
}
.dataset-table .dt-actions-cell {
  width: 1%;
}
/* The column of the checkboxes (one selected only) */
.dataset-table .dt-select-cell {
  width: 1%;
}
.dt-select-highlight .dataset-table .dt-select-cell {
  animation: dt-select-pulse 0.85s ease-in-out 3;
}
@keyframes dt-select-pulse {
  0%, 100% {
    background-color: transparent;
    box-shadow: none;
  }
  50% {
    background-color: color-mix(in srgb, var(--bt-accent) 22%, transparent);
    box-shadow: inset 2px 0 0 var(--bt-accent), inset -2px 0 0 var(--bt-accent);
  }
}
/* The state of an external dataset: as in the options menu */
.dataset-table .dt-state {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.15rem 0.6rem;
  border: 1px solid var(--bt-border);
  border-radius: 999px;
  background: var(--bt-surface);
  color: var(--bt-text-subtle);
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}
.dataset-table .dt-state .fa-solid {
  font-size: 0.65rem;
}
.dataset-table .dt-license-icon {
  margin-right: 0.35rem;
}
.dataset-table .dt-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  white-space: nowrap;
}
.dataset-table .dt-more-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  min-width: 11rem;
  height: 32px;
  padding: 0 0.75rem;
  border: 1px solid var(--bt-border);
  border-radius: 8px;
  background: var(--bt-surface);
  color: var(--bt-text);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
}
.dataset-table .dt-more-toggle .dt-more-toggle-label {
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dataset-table .dt-more-toggle:hover,
.dataset-table .dt-more-toggle.open {
  border-color: var(--bt-accent);
}
.dataset-table .dt-more-toggle .fa-chevron-up {
  color: var(--bt-muted);
  font-size: 0.65rem;
  transition: transform 0.15s ease;
}
.dataset-table .dt-more-toggle.open .fa-chevron-up {
  transform: rotate(180deg);
}
.dataset-table .dt-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--bt-icon);
  font-size: 1rem;
  cursor: pointer;
}
.dataset-table .dt-action:hover {
  background: var(--bt-icon-hover-bg);
  color: var(--bt-icon-hover);
}
.dataset-table .dt-action.is-danger:hover {
  color: var(--bt-danger);
}

/* The options menu: a card above the button, in the font of the tables */
.dt-more-menu {
  position: fixed;
  z-index: 1050;
  overflow: hidden;
  border: 1px solid var(--bt-border);
  border-radius: 12px;
  background: var(--bt-surface);
  box-shadow: 0 2px 6px var(--bt-shadow), 0 14px 32px -12px rgba(0, 0, 0, 0.25);
  color: var(--bt-text);
  font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 0.82rem;
}
.dt-more-menu .dt-more-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.6rem 0.9rem;
  background: var(--bt-head-bg);
}
.dt-more-menu .dt-more-kind {
  color: var(--bt-muted);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.dt-more-menu .dt-more-state {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.15rem 0.55rem;
  border: 1px solid var(--bt-border);
  border-radius: 999px;
  background: var(--bt-surface);
  color: var(--bt-text-subtle);
  font-size: 0.72rem;
  font-weight: 500;
}
.dt-more-menu .dt-more-state .fa-solid {
  font-size: 0.65rem;
}
.dt-more-menu .dt-more-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.55rem 0.9rem;
  border: 0;
  border-top: 1px solid var(--bt-border);
  background: transparent;
  color: var(--bt-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.dt-more-menu .dt-more-item:hover:not(:disabled),
.dt-more-menu .dt-more-item:focus-visible,
.dt-more-menu .dt-more-item.is-active {
  background: var(--bt-icon-hover-bg);
  outline: none;
}
.dt-more-menu .dt-more-item:disabled {
  color: var(--bt-muted);
  opacity: 0.55;
  cursor: default;
}
.dt-more-menu .dt-more-item .fa-fw {
  color: var(--bt-icon);
  font-size: 0.85rem;
}
.dt-more-menu .dt-more-label {
  flex: 1 1 auto;
}
.dt-more-menu .dt-more-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.4rem;
  height: 1.25rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: var(--bt-accent-soft);
  color: var(--bt-accent);
  font-size: 0.68rem;
  font-weight: 700;
}
</style>
