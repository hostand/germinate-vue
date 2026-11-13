<template>
  <div class="td-page">
    <div v-if="trait !== null">
      <template v-if="trait === undefined">
        <div class="text-center">
          <b-spinner style="width: 3rem; height: 3rem;" variant="primary" type="grow" />
        </div>
      </template>
      <template v-else>
        <!-- The trait: its row of the traits table (name, description, data type, unit, constraints); at the bottom of the
             table the barcodes and, for data curators, adding an image -->
        <TraitTable :getData="getTraitRow"
                    :onlyColumns="['traitName', 'traitDescription', 'dataType', 'unitName', 'unitAbbreviation', 'traitRestrictions']"
                    filterLocked
                    :autoHideColumns="false"
                    :storeUrlParameters="false"
                    :tableActions="traitTableActions" />
        <ImageUploadModal :foreignId="traitId" referenceTable="phenotypes" ref="imageUploadModal" v-if="userIsDataCurator" @images-updated="$emit('images-changed')" />

        <!-- Below the trait: Datasets, Statistics and Additional Attributes, tabs without icons -->
        <b-tabs class="td-tabs" nav-class="td-tabs-nav" v-model="tabIndex">
          <!-- The datasets the trait is scored in, then its data across them (a block) -->
          <b-tab :title="$t('pageDatasetsTitle')">
            <div class="td-tab-panel">
              <!-- Table showing all datasets this trait is scored in; one of them selected (first column) is the dataset of
                   the statistics -->
              <DatasetTable :getData="getDatasetData" selectable selectionMode="single" :allowEditing="false" @selection-changed="datasetSelected" @data-changed="restoreDatasetSelection" ref="datasetTable" />

              <div v-show="showAdditionalDatasets">
                <!-- Any additional datasets this trait is part of for which the license hasn't been accepted yet -->
                <DatasetsWithUnacceptedLicense datasetType="trials" v-on:data-changed="checkNumbers"/>
              </div>

              <section class="td-card">
                <header class="td-card-head">
                  <span class="td-card-icon" aria-hidden="true"><i class="fa-solid fa-table-list" /></span>
                  <div>
                    <h3 class="td-card-title">{{ $t('pageTraitDetailsDataTitle') }}</h3>
                    <p class="td-card-text">{{ $t('pageTraitDetailsDataText') }}</p>
                  </div>
                </header>
                <div class="td-card-body">
                  <!-- Table showing all data points for this trait -->
                  <TrialsDataTable :getData="getData" :getIds="getIds" :filterOn="tableFilter" ref="traitDetailsTable" />
                </div>
              </section>
            </div>
          </b-tab>

          <!-- The chart, in a block; built when the tab is first shown (the chart needs its width) -->
          <b-tab :title="$t('genericStatistics')" lazy>
            <div class="td-tab-panel">
              <section class="td-card">
                <header class="td-card-head">
                  <!-- A dataset selected: the icon and colour of its type (as its chip in the table); else the chart icon -->
                  <span class="td-card-icon td-type-icon" :style="{ '--td-type-color': datasetTypes[selectedDataset.datasetType].color() }" aria-hidden="true" v-if="selectedDataset && datasetTypes[selectedDataset.datasetType]"><MdiIcon :path="datasetTypes[selectedDataset.datasetType].path" /></span>
                  <span class="td-card-icon" aria-hidden="true" v-else><i class="fa-solid fa-chart-column" /></span>
                  <div>
                    <h3 class="td-card-title">{{ $t('pageTraitDetailsStatsTitle') }}</h3>
                    <!-- The name of the dataset of the statistics, or that one has to be selected -->
                    <p class="td-card-text" v-if="selectedDataset">{{ selectedDataset.datasetName }}</p>
                    <p class="td-card-text" v-else>{{ $t('pageTraitDetailsStatsNoDatasetText') }}</p>
                  </div>
                </header>
                <!-- No dataset selected yet: a message, its button going back to the datasets (their checkboxes highlighted) -->
                <div class="td-card-body td-empty" v-if="selectedDatasetId === null">
                  <p class="td-empty-text">{{ $t('pageTraitDetailsStatsSelectDataset') }}</p>
                  <button type="button" class="td-empty-button" @click="goToDatasetSelection">
                    <i class="fa-solid fa-square-check" aria-hidden="true" /> {{ $t('buttonSelectDataset') }}
                  </button>
                </div>
                <!-- The chart of the selected dataset (built again for another one) -->
                <div :class="['td-card-body', { 'td-card-body-flush': trait.dataType === 'text' }]" :key="`stats-${selectedDatasetId}`" v-else>
                  <!-- Text traits: the values (numbers and a bar each, the most frequent on top); a bar clicked shows its
                       observations below -->
                  <TraitValueStats :traitId="traitId"
                                   :traitName="trait.traitName"
                                   :traitDataType="trait.dataType"
                                   :datasetId="selectedDatasetId"
                                   @value-clicked="statsValueClicked"
                                   v-if="trait.dataType === 'text'" />
                  <BarChart xColumn="phenotype_value"
                            :xTitle="trait.traitName"
                            :yTitle="$t('genericCount')"
                            :height="700"
                            :downloadName="trait.traitName"
                            :sourceFile="categoricalTraitFile"
                            v-on:bar-clicked="traitValueClicked"
                            ref="traitCategoryChart"
                            v-else-if="trait.dataType !== 'numeric'"/>

                  <!-- Boxplot for this trait -->
                  <TraitBoxplotChart :traitIds="[traitId]" :datasetIds="[selectedDatasetId]" ref="traitDetailsChart" v-else />
                </div>
              </section>

              <!-- The observations with the value clicked in the chart (germplasm, rep, block, value), closed by its cross -->
              <section class="td-card" ref="statsValueCard" v-if="statsValue !== null && selectedDatasetId !== null">
                <header class="td-card-head">
                  <span class="td-card-icon" aria-hidden="true"><i class="fa-solid fa-table-list" /></span>
                  <div class="td-card-head-main">
                    <h3 class="td-card-title">{{ $t('pageTraitDetailsStatsValueTitle', { value: statsValue }) }}</h3>
                    <p class="td-card-text">{{ selectedDataset ? selectedDataset.datasetName : '' }}</p>
                  </div>
                  <button type="button" class="td-card-close" @click="statsValue = null" :title="$t('buttonClose')" :aria-label="$t('buttonClose')">
                    <i class="fa-solid fa-xmark" aria-hidden="true" />
                  </button>
                </header>
                <div class="td-card-body">
                  <TrialsDataTable :getData="getData" :getIds="getIds" :filterOn="statsValueFilter" :storeUrlParameters="false" :key="`stats-value-${selectedDatasetId}-${statsValue}`" />
                </div>
              </section>
            </div>
          </b-tab>

          <b-tab :title="$t('pageTraitAttributesTitle')">
            <div class="td-tab-panel">
              <TraitAttributeTable :filterOn="attributeFilter" :getData="getTraitAttributeData" />
            </div>
          </b-tab>

          <!-- The images of the trait, only when it has some: the gallery of the passport page (tags, download, upload,
               editing for data curators) -->
          <b-tab :title="$t('pagePassportImageTitle')" lazy v-if="imageCount > 0">
            <div class="td-tab-panel">
              <PassportImageGallery referenceTable="phenotypes" :foreignId="traitId" @images-changed="$emit('images-changed')" />
            </div>
          </b-tab>
        </b-tabs>
      </template>

      <YesNoCancelModal :title="$t('modalTitleTraitBarcodeIncludeValues')"
                        :message="$t('modalTextTraitBarcodeIncludeValues')"
                        :yesTitle="$t('genericYes')"
                        :noTitle="$t('genericNo')"
                        :cancelTitle="$t('genericCancel')"
                        yesVariant="secondary"
                        noVariant="secondary"
                        cancelVariant="outline-secondary"
                        @yes="generateBarcodes(true)"
                        @no="generateBarcodes(false)"
                        ref="barcodeModal" />
    </div>
    <h3 v-else>{{ $t('headingNoData') }}</h3>
  </div>
</template>

<script>
import BarChart from '@/components/charts/BarChart'
import DatasetsWithUnacceptedLicense from '@/components/util/DatasetsWithUnacceptedLicense'
import DatasetTable from '@/components/tables/DatasetTable'
import TraitBoxplotChart from '@/components/charts/TraitBoxplotChart'
import TraitValueStats from '@/components/charts/TraitValueStats'
import ImageUploadModal from '@/components/modals/ImageUploadModal'
import PassportImageGallery from '@/components/images/PassportImageGallery'
import TrialsDataTable from '@/components/tables/TrialsDataTable'
import TraitAttributeTable from '@/components/tables/TraitAttributeTable'
import TraitTable from '@/components/tables/TraitTable'
import YesNoCancelModal from '@/components/modals/YesNoCancelModal'

import { apiPostTraitStatsCategorical } from '@/mixins/api/dataset'
import { apiPostTrialsDataTable, apiPostTrialsDataTableIds, apiPostTraitTable, apiPostTraitDatasetTable, apiGetTraitDistinctValues, apiPostTraitAttributeTable } from '@/mixins/api/trait'
import MdiIcon from '@/components/icons/MdiIcon'
import { dataTypes, datasetTypes } from '@/mixins/types'
import { userIsAtLeast, USER_TYPE_DATA_CURATOR } from '@/mixins/api/auth'
import { mapGetters } from 'vuex'
import { getTraitDataset, setTraitDataset } from '@/mixins/trait-dataset-selection'

const emitter = require('tiny-emitter/instance')

export default {
  props: {
    // Images of the trait (loaded by the traits page): its Images tab when there are some
    imageCount: {
      type: Number,
      default: 0
    }
  },
  data: function () {
    return {
      dataTypes,
      datasetTypes,
      traitId: null,
      trait: undefined,
      tableFilter: null,
      showAdditionalDatasets: true,
      categoricalTraitFile: null,
      // The tab shown (Datasets first) and the dataset of the statistics (selected in the datasets table)
      tabIndex: 0,
      selectedDatasetId: null,
      selectedDataset: null,
      // The dataset selected before for the trait (in the traits table or here), selected once the datasets arrived
      pendingDatasetId: null,
      // The value clicked in the chart of the statistics: its observations below the chart
      statsValue: null
    }
  },
  watch: {
    // Another dataset selected for the trait in the traits table while its tab is open
    storedDatasetId: function (newValue) {
      if (this.pendingDatasetId !== null || newValue === this.selectedDatasetId) {
        return
      }
      const baseTable = this.$refs.datasetTable && this.$refs.datasetTable.$refs.datasetTable
      if (baseTable) {
        baseTable.setSelectedItems(newValue === null ? [] : [newValue])
      }
    }
  },
  components: {
    BarChart,
    DatasetsWithUnacceptedLicense,
    DatasetTable,
    MdiIcon,
    TraitBoxplotChart,
    TraitValueStats,
    ImageUploadModal,
    PassportImageGallery,
    TrialsDataTable,
    TraitAttributeTable,
    TraitTable,
    YesNoCancelModal
  },
  computed: {
    ...mapGetters([
      'storeToken'
    ]),
    // The dataset kept for the trait (selected here or in the traits table)
    storedDatasetId: function () {
      return getTraitDataset(this.traitId)
    },
    userIsDataCurator: function () {
      return !!this.storeToken && userIsAtLeast(this.storeToken.userType, USER_TYPE_DATA_CURATOR)
    },
    // At the bottom of the table of the trait: the barcodes; adding an image (data curators)
    traitTableActions: function () {
      const actions = [{
        id: 'barcodes',
        text: this.$t('pageTraitDetailsGenerateBarcodes'),
        icon: 'fa-solid fa-barcode',
        variant: null,
        disabled: () => false,
        callback: () => this.$refs.barcodeModal.show()
      }]
      if (this.userIsDataCurator) {
        actions.push({
          id: 'add-image',
          text: this.$t('modalTitleImageUpload'),
          icon: 'fa-solid fa-image',
          variant: null,
          disabled: () => false,
          callback: () => this.$refs.imageUploadModal.show()
        })
      }
      return actions
    },
    // The observations of the trait in the selected dataset with the value clicked in the chart
    statsValueFilter: function () {
      return [{
        column: { name: 'traitId', type: Number },
        comparator: 'equals',
        operator: 'and',
        values: [this.traitId],
        canBeChanged: false
      }, {
        column: { name: 'datasetId', type: Number },
        comparator: 'equals',
        operator: 'and',
        values: [this.selectedDatasetId],
        canBeChanged: false
      }, {
        column: { name: 'traitValue', type: String },
        comparator: 'equals',
        operator: 'and',
        values: [this.statsValue],
        canBeChanged: false
      }]
    },
    attributeFilter: function () {
      return [{
        column: {
          name: 'traitId',
          type: Number
        },
        comparator: 'equals',
        operator: 'and',
        values: [this.traitId],
        canBeChanged: false
      }]
    }
  },
  methods: {
    // The row of the trait in the traits table (the filter on its id with the request: the table has no filter of its own)
    getTraitRow: function (data, callback) {
      const request = Object.assign({}, data, {
        filter: [{
          column: 'traitId',
          comparator: 'equals',
          operator: 'and',
          values: [this.traitId]
        }]
      })
      const result = apiPostTraitTable(request, callback)
      // The page as the request sent it (counted from 0), read back by the table for its count
      data.page = request.page
      return result
    },
    getTraitAttributeData: function (data, callback) {
      return apiPostTraitAttributeTable(data, callback)
    },
    generateBarcodes: function (includeValues) {
      if (includeValues) {
        apiGetTraitDistinctValues(this.traitId, result => {
          this.openInNewTab(`https://cropgeeks.github.io/humbug/#/import?barcodes=${[this.trait.traitName, ...result].map(c => encodeURIComponent(c)).join(',')}`)
        })
      } else {
        this.openInNewTab(`https://cropgeeks.github.io/humbug/#/import?barcodes=${encodeURIComponent(this.trait.traitName)}`)
      }
    },
    openInNewTab: function (url) {
      Object.assign(document.createElement('a'), {
        target: '_blank',
        href: url
      }).click()
    },
    traitValueClicked: function (point) {
      this.tableFilter = [{
        column: {
          name: 'traitId',
          type: Number
        },
        comparator: 'equals',
        operator: 'and',
        values: [this.traitId],
        canBeChanged: false
      }, {
        column: {
          name: 'traitValue',
          type: String
        },
        comparator: 'equals',
        operator: 'and',
        values: [point.x]
      }]

      this.$nextTick(() => {
        if (this.$refs.traitDetailsTable) {
          this.$refs.traitDetailsTable.refresh()
        }
      })
    },
    // The dataset selected in the datasets table: the statistics of the trait in it (none selected: no chart)
    datasetSelected: function (selected) {
      // The selection emptied when the table loads does not replace the one kept for the trait
      if (this.pendingDatasetId !== null) {
        return
      }
      const datasetId = selected && selected.length > 0 ? selected[0] : null
      setTraitDataset(this.traitId, datasetId)
      if (datasetId === this.selectedDatasetId) {
        return
      }
      this.selectedDatasetId = datasetId
      this.statsValue = null
      // The row of the dataset (its type and name, shown with the statistics)
      const baseTable = this.$refs.datasetTable && this.$refs.datasetTable.$refs.datasetTable
      const rows = (baseTable && baseTable.pageItems) || []
      this.selectedDataset = datasetId === null ? null : (rows.find(row => row.datasetId === datasetId) || null)
      this.categoricalTraitFile = null
      // Text traits load their own statistics (TraitValueStats)
      if (datasetId !== null && this.trait && this.trait.dataType !== 'numeric' && this.trait.dataType !== 'text') {
        this.updateCategoryChart()
      }
    },
    // The rows of the datasets arrived: the dataset selected before for the trait is selected again
    restoreDatasetSelection: function (request, result) {
      const rows = (result && result.data) || []
      if (this.pendingDatasetId !== null) {
        const datasetId = this.pendingDatasetId
        this.pendingDatasetId = null
        const baseTable = this.$refs.datasetTable && this.$refs.datasetTable.$refs.datasetTable
        if (baseTable && rows.some(row => row.datasetId === datasetId)) {
          baseTable.setSelectedItems([datasetId])
          return
        }
      }
      // Selected before its row was known: its type and name
      if (this.selectedDatasetId !== null && !this.selectedDataset) {
        this.selectedDataset = rows.find(row => row.datasetId === this.selectedDatasetId) || null
      }
    },
    // A value clicked in the chart of the statistics: its observations shown below the chart (brought into view)
    statsValueClicked: function (value) {
      this.statsValue = value
      this.$nextTick(() => {
        const card = this.$refs.statsValueCard
        if (card && card.scrollIntoView) {
          card.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    },
    // Back to the datasets, their checkboxes highlighted
    goToDatasetSelection: function () {
      this.tabIndex = 0
      this.$nextTick(() => {
        setTimeout(() => {
          if (this.$refs.datasetTable) {
            this.$refs.datasetTable.highlightSelection()
          }
        }, 150)
      })
    },
    getDatasetData: function (data, callback) {
      return apiPostTraitDatasetTable(this.traitId, data, callback)
    },
    checkNumbers: function (requestData, data) {
      this.showAdditionalDatasets = data && data.count > 0
    },
    getData: function (data, callback) {
      return apiPostTrialsDataTable(data, callback)
    },
    getIds: function (data, callback) {
      return apiPostTrialsDataTableIds(data, callback)
    },
    update: function () {
      if (this.$refs.traitDetailsTable) {
        this.$refs.traitDetailsTable.refresh()
      }
      if (this.$refs.datasetTable) {
        this.$refs.datasetTable.refresh()
      }

      if (this.$refs.traitDetailsChart) {
        this.$refs.traitDetailsChart.redraw()
      } else if (this.$refs.traitCategoryChart) {
        this.updateCategoryChart()
      }

      this.checkNumbers()
    },
    updateCategoryChart: function () {
      if (this.selectedDatasetId === null) {
        return
      }
      const query = {
        datasetIds: [this.selectedDatasetId],
        xIds: [this.traitId]
      }

      apiPostTraitStatsCategorical(query, result => {
        this.categoricalTraitFile = result
      }, {
        codes: [404],
        callback: () => {
          // Do nothing here, it just means there is no data.
          this.categoricalTraitFile = null
        }
      })
    }
  },
  mounted: function () {
    if (this.$route.params.traitId) {
      this.traitId = parseInt(this.$route.params.traitId)
      this.pendingDatasetId = getTraitDataset(this.traitId)

      this.tableFilter = [{
        column: {
          name: 'traitId',
          type: Number
        },
        comparator: 'equals',
        operator: 'and',
        values: [this.traitId],
        canBeChanged: false
      }]

      const request = {
        page: 1,
        limit: 1,
        filter: [{
          column: 'traitId',
          comparator: 'equals',
          operator: 'and',
          values: [this.traitId]
        }]
      }
      apiPostTraitTable(request, result => {
        if (result && result.data && result.data.length > 0) {
          this.trait = result.data[0]
          // The traits page shows it in the title of its tab (name, data type)
          this.$emit('trait-loaded', this.trait)

          if (this.trait.dataType !== 'numeric') {
            this.updateCategoryChart()
          }
        } else {
          this.trait = null
        }
      })
    }

    emitter.on('license-accepted', this.update)
  },
  beforeDestroy: function () {
    emitter.off('license-accepted', this.update)
  }
}
</script>

<style src="@/assets/custom-page.css"></style>
<style scoped>
/* Tabs below the main information: as those of the custom pages, without icons */
.td-tabs {
  margin-top: 2.25rem;
}
.td-tabs >>> .td-tabs-nav {
  flex-wrap: wrap;
  border-bottom: 1px solid var(--cp-border);
}
.td-tabs >>> .td-tabs-nav .nav-link {
  padding: 0.7rem 1.25rem;
  border: 1px solid transparent;
  border-radius: 10px 10px 0 0;
  color: var(--cp-muted);
  font-weight: 600;
  line-height: 1.5;
}
.td-tabs >>> .td-tabs-nav .nav-link:hover,
.td-tabs >>> .td-tabs-nav .nav-link:focus {
  border-color: transparent;
  color: var(--cp-text);
}
.td-tabs >>> .td-tabs-nav .nav-link.active,
body.dark-mode .td-tabs >>> .td-tabs-nav .nav-link.active,
body.dark-mode .td-tabs >>> .td-tabs-nav .nav-link.active:focus {
  border-color: var(--cp-border) var(--cp-border) var(--cp-surface);
  background: var(--cp-surface);
  color: var(--cp-text);
}
.td-tab-panel {
  margin-top: 1.75rem;
}
/* Blocks (as those of the other custom pages): the icon in a soft green square beside the title, the content below */
.td-card {
  margin-top: 1.5rem;
  overflow: hidden;
  border: 1px solid var(--cp-border);
  border-radius: 16px;
  background: var(--cp-surface);
  box-shadow: 0 1px 2px var(--cp-shadow);
}
.td-tab-panel > .td-card:first-child {
  margin-top: 0;
}
.td-card-head {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  padding: 1.25rem;
}
.td-card-icon {
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
.td-card-title {
  margin: 0.1rem 0 0.3rem;
  color: var(--cp-text);
  font-size: 1.2rem;
  font-weight: 600;
}
.td-card-text {
  margin: 0;
  color: var(--cp-muted);
  font-size: 0.9rem;
  line-height: 1.55;
}
.td-card-body {
  padding: 1.25rem;
  border-top: 1px solid var(--cp-border);
}
/* A body filled by its content (the statistics of text traits: their strip of numbers from edge to edge) */
.td-card-body.td-card-body-flush {
  padding: 0;
}
.td-card-head-main {
  flex: 1;
  min-width: 0;
}
.td-card-close {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--cp-muted);
  cursor: pointer;
}
.td-card-close:hover,
.td-card-close:focus-visible {
  background: var(--cp-neutral-bg);
  color: var(--cp-text);
}
/* The icon of the type of the selected dataset: its colour, on a soft background of it (as its chip in the table) */
.td-card-icon.td-type-icon {
  background: color-mix(in srgb, var(--td-type-color) 14%, transparent);
  color: var(--td-type-color);
}
.td-type-icon >>> svg {
  width: 1.5rem;
  height: 1.5rem;
  fill: var(--td-type-color);
}
/* No dataset selected: the message and its button, centred */
.td-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 1.25rem;
  text-align: center;
}
.td-empty-text {
  max-width: 34rem;
  margin: 0;
  color: var(--cp-muted);
  font-size: 0.95rem;
  line-height: 1.55;
}
.td-empty-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1.1rem;
  border: 0;
  border-radius: 10px;
  background: var(--cp-button);
  color: var(--cp-on-button);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}
.td-empty-button:hover,
.td-empty-button:focus-visible {
  background: var(--cp-button-hover);
}
</style>
