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
              <!-- Embedded (the trials export): only its datasets, the filter fixed -->
              <DatasetTable :getData="getDatasetData"
                            :filterOn="datasetFilter"
                            :filterLocked="embedded"
                            :storeUrlParameters="!embedded"
                            selectable
                            selectionMode="single"
                            :allowEditing="false"
                            @selection-changed="datasetSelected"
                            @data-changed="restoreDatasetSelection"
                            ref="datasetTable" />

              <div v-show="showAdditionalDatasets" v-if="!embedded">
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
                  <TrialsDataTable :getData="getData" :getIds="getIds" :filterOn="tableFilter" :filterLocked="embedded" :storeUrlParameters="!embedded" ref="traitDetailsTable" />
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
                <div :class="['td-card-body', { 'td-card-body-flush': ['text', 'date', 'categorical', 'numeric'].includes(trait.dataType) }]" :key="`stats-${selectedDatasetId}`" v-else>
                  <!-- Text traits: the values (numbers and a bar each, the most frequent on top); a bar clicked shows its
                       observations below -->
                  <TraitValueStats :traitId="traitId"
                                   :traitName="trait.traitName"
                                   :traitDataType="trait.dataType"
                                   :datasetId="selectedDatasetId"
                                   @value-clicked="statsValueClicked"
                                   v-if="trait.dataType === 'text'" />
                  <!-- Date traits: earliest / latest / median date, and the dates as a histogram, a timeline per germplasm
                       (by rep) or a calendar; a date clicked shows its observations below -->
                  <TraitDateStats :traitId="traitId"
                                  :traitName="trait.traitName"
                                  :traitDataType="trait.dataType"
                                  :datasetId="selectedDatasetId"
                                  @value-clicked="statsValueClicked"
                                  v-else-if="trait.dataType === 'date'" />
                  <!-- Categorical traits: the categories (distribution, by germplasm, by rep / block); ordinal when the
                       trait has the attribute "scale" = "ordinal"; a category clicked shows its observations below -->
                  <TraitCategoricalStats :traitId="traitId"
                                         :traitName="trait.traitName"
                                         :traitDataType="trait.dataType"
                                         :traitRestrictions="trait.traitRestrictions"
                                         :ordinal="traitOrdinal"
                                         :datasetId="selectedDatasetId"
                                         @value-clicked="statsValueClicked"
                                         v-else-if="trait.dataType === 'categorical'" />
                  <BarChart xColumn="phenotype_value"
                            :xTitle="trait.traitName"
                            :yTitle="$t('genericCount')"
                            :height="700"
                            :downloadName="trait.traitName"
                            :sourceFile="categoricalTraitFile"
                            v-on:bar-clicked="traitValueClicked"
                            ref="traitCategoryChart"
                            v-else-if="trait.dataType !== 'numeric'"/>

                  <!-- Numeric traits: mean, median, SD, CV..., the distribution (histogram and box plot), the outliers,
                       the ranking of the germplasm, by rep / block; a bar clicked shows its observations below -->
                  <TraitNumericStats :traitId="traitId"
                                     :unit="trait.unitAbbreviation || null"
                                     :traitName="trait.traitName"
                                     :traitDataType="trait.dataType"
                                     :traitRestrictions="trait.traitRestrictions"
                                     :datasetId="selectedDatasetId"
                                     @value-clicked="statsValueClicked"
                                     v-else />
                </div>
              </section>

              <!-- The observations with the value clicked in the chart (germplasm, rep, block, value), closed by its cross -->
              <section class="td-card" ref="statsValueCard" v-if="statsValue !== null && selectedDatasetId !== null">
                <header class="td-card-head">
                  <span class="td-card-icon" aria-hidden="true"><i class="fa-solid fa-table-list" /></span>
                  <div class="td-card-head-main">
                    <h3 class="td-card-title">{{ $t('pageTraitDetailsStatsValueTitle', { value: statsValueLabel }) }}</h3>
                    <p class="td-card-text">{{ selectedDataset ? selectedDataset.datasetName : '' }}</p>
                  </div>
                  <button type="button" class="td-card-close" @click="statsValue = null" :title="$t('buttonClose')" :aria-label="$t('buttonClose')">
                    <i class="fa-solid fa-xmark" aria-hidden="true" />
                  </button>
                </header>
                <div class="td-card-body">
                  <TrialsDataTable :getData="getData" :getIds="getIds" :filterOn="statsValueFilter" :storeUrlParameters="false" :key="`stats-value-${selectedDatasetId}-${statsValueLabel}`" />
                </div>
              </section>
            </div>
          </b-tab>

          <b-tab :title="$t('pageTraitAttributesTitle')">
            <div class="td-tab-panel">
              <TraitAttributeTable :filterOn="attributeFilter" :getData="getTraitAttributeData" :storeUrlParameters="!embedded" />
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
import TraitNumericStats from '@/components/charts/TraitNumericStats'
import TraitValueStats from '@/components/charts/TraitValueStats'
import TraitDateStats from '@/components/charts/TraitDateStats'
import TraitCategoricalStats from '@/components/charts/TraitCategoricalStats'
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
    },
    // Embedded (a tab of the trials export): the trait given here (not by the route) ...
    embeddedTraitId: {
      type: Number,
      default: null
    },
    // ... and its datasets: the datasets table and the data across them only these, their filter fixed (the filters of
    // both tables cannot be changed)
    datasetIds: {
      type: Array,
      default: null
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
      // The value clicked in the chart of the statistics: its observations below the chart. A value, or a category
      // written in several ways ({ label, values }: the codes of its scales)
      statsValue: null,
      // The trait attribute "scale" = "ordinal": its categories are ordered (statistics of categorical traits)
      traitOrdinal: false
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
    TraitNumericStats,
    TraitValueStats,
    TraitDateStats,
    TraitCategoricalStats,
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
    embedded: function () {
      return this.embeddedTraitId !== null
    },
    // Embedded: the datasets of the export, fixed
    datasetOnlyFilter: function () {
      return this.embedded && this.datasetIds && this.datasetIds.length > 0
        ? [{ column: { name: 'datasetId', type: Number }, comparator: 'inSet', operator: 'and', values: this.datasetIds.slice(), canBeChanged: false }]
        : []
    },
    datasetFilter: function () {
      return this.datasetOnlyFilter.length > 0 ? this.datasetOnlyFilter : null
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
      // A bin of a histogram: the values in its range; a category written in several ways: any of them
      const value = this.statsValueRange
        ? { column: { name: 'traitValue', type: Number }, comparator: 'between', operator: 'and', values: this.statsValueRange, canBeChanged: false }
        : { column: { name: 'traitValue', type: String }, comparator: this.statsValues.length > 1 ? 'inSet' : 'equals', operator: 'and', values: this.statsValues, canBeChanged: false }
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
      }, value]
    },
    // The value clicked: a range ({ label, range: [from, to] }: a bin of a histogram), several values ({ label, values })
    // or a value
    statsValueRange: function () {
      return this.statsValue !== null && typeof this.statsValue === 'object' && this.statsValue.range ? this.statsValue.range : null
    },
    statsValues: function () {
      return this.statsValue !== null && typeof this.statsValue === 'object' ? this.statsValue.values : [this.statsValue]
    },
    statsValueLabel: function () {
      return this.statsValue !== null && typeof this.statsValue === 'object' ? this.statsValue.label : this.statsValue
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
    // The trait attribute "scale" = "ordinal" (any case): the categories of the trait are ordered
    loadTraitOrdinal: function () {
      const traitId = this.traitId
      apiPostTraitAttributeTable({
        page: 1,
        limit: 100,
        filter: [{
          column: 'traitId',
          comparator: 'equals',
          operator: 'and',
          values: [traitId]
        }]
      }, result => {
        if (traitId !== this.traitId) {
          return
        }
        const attributes = (result && result.data) || []
        this.traitOrdinal = attributes.some(a => `${a.attributeName || ''}`.trim().toLowerCase() === 'scale' && `${a.attributeValue || ''}`.trim().toLowerCase() === 'ordinal')
      }, {
        codes: [],
        callback: () => { this.traitOrdinal = false }
      })
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
      }].concat(this.datasetOnlyFilter)

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
      // Text, date and categorical traits load their own statistics (TraitValueStats, TraitDateStats,
      // TraitCategoricalStats)
      if (datasetId !== null && this.trait && !['numeric', 'text', 'date', 'categorical'].includes(this.trait.dataType)) {
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

      if (this.$refs.traitCategoryChart) {
        this.updateCategoryChart()
      }

      this.checkNumbers()
    },
    // The bar chart of the other traits (text, date and categorical traits load their own statistics)
    updateCategoryChart: function () {
      if (this.selectedDatasetId === null || (this.trait && ['text', 'date', 'categorical'].includes(this.trait.dataType))) {
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
    // The trait: given (embedded), else that of the route
    const traitId = this.embedded ? this.embeddedTraitId : (this.$route.params.traitId ? parseInt(this.$route.params.traitId) : null)
    if (traitId !== null) {
      this.traitId = traitId
      // Embedded: the dataset kept for the trait only when it is one of the export
      const kept = getTraitDataset(this.traitId)
      this.pendingDatasetId = this.embedded && kept !== null && !(this.datasetIds || []).includes(kept) ? null : kept

      this.tableFilter = [{
        column: {
          name: 'traitId',
          type: Number
        },
        comparator: 'equals',
        operator: 'and',
        values: [this.traitId],
        canBeChanged: false
      }].concat(this.datasetOnlyFilter)

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

          if (this.trait.dataType === 'categorical') {
            this.loadTraitOrdinal()
          }

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
<!-- The look of the details (tabs, blocks, the empty state): shared with ClimateDetails -->
<style scoped src="@/assets/variable-details.css"></style>
