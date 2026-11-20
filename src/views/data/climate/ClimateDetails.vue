<template>
  <!-- The content of the tab of a climate in the climates page (as TraitDetails for a trait): its row of the climates
       table, then the tabs Datasets (its datasets, one of them selected for the statistics, and its data across them),
       Statistics (per data type, as those of the traits: the location in place of the germplasm, no rep nor block) and
       Images (only when it has some; no upload: the server does not take images of climates yet) -->
  <div class="td-page">
    <div v-if="climate !== null">
      <template v-if="climate === undefined">
        <div class="text-center">
          <b-spinner style="width: 3rem; height: 3rem;" variant="primary" type="grow" />
        </div>
      </template>
      <template v-else>
        <!-- The climate: its row of the climates table (name, description, data type, unit) -->
        <ClimateTable :getData="getClimateRow"
                      :onlyColumns="['climateName', 'climateDescription', 'dataType', 'climateType', 'climateCategories', 'unitName', 'unitAbbreviation']"
                      filterLocked
                      :autoHideColumns="false"
                      :storeUrlParameters="false" />

        <!-- Below the climate: Datasets, Statistics and Images, tabs without icons -->
        <b-tabs class="td-tabs" nav-class="td-tabs-nav" v-model="tabIndex">
          <!-- The datasets the climate is recorded in, then its data across them (a block) -->
          <b-tab :title="$t('pageDatasetsTitle')">
            <div class="td-tab-panel">
              <!-- One of them selected (first column) is the dataset of the statistics -->
              <!-- Embedded (the climate export): only its datasets, the filter fixed -->
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
                <!-- Any additional datasets this climate is part of for which the license hasn't been accepted yet -->
                <DatasetsWithUnacceptedLicense datasetType="climate" v-on:data-changed="checkNumbers"/>
              </div>

              <section class="td-card">
                <header class="td-card-head">
                  <span class="td-card-icon" aria-hidden="true"><i class="fa-solid fa-table-list" /></span>
                  <div>
                    <h3 class="td-card-title">{{ $t('pageClimateDetailsDataTitle') }}</h3>
                    <p class="td-card-text">{{ $t('pageClimateDetailsDataText') }}</p>
                  </div>
                </header>
                <div class="td-card-body">
                  <!-- Table showing all data points for this climate -->
                  <ClimateDataTable :getData="getData" :getIds="getIds" :filterOn="tableFilter" :filterLocked="embedded" :storeUrlParameters="!embedded" ref="climateDetailsTable" />
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
                    <h3 class="td-card-title">{{ $t('pageClimateDetailsStatsTitle') }}</h3>
                    <!-- The name of the dataset of the statistics, or that one has to be selected -->
                    <p class="td-card-text" v-if="selectedDataset">{{ selectedDataset.datasetName }}</p>
                    <p class="td-card-text" v-else>{{ $t('pageClimateDetailsStatsNoDatasetText') }}</p>
                  </div>
                </header>
                <!-- No dataset selected yet: a message, its button going back to the datasets (their checkboxes highlighted) -->
                <div class="td-card-body td-empty" v-if="selectedDatasetId === null">
                  <p class="td-empty-text">{{ $t('pageClimateDetailsStatsSelectDataset') }}</p>
                  <button type="button" class="td-empty-button" @click="goToDatasetSelection">
                    <i class="fa-solid fa-square-check" aria-hidden="true" /> {{ $t('buttonSelectDataset') }}
                  </button>
                </div>
                <!-- The statistics of the selected dataset (built again for another one), per data type as those of the
                     traits; a value clicked shows its observations below -->
                <div class="td-card-body td-card-body-flush" :key="`stats-${selectedDatasetId}`" v-else>
                  <TraitValueStats variable="climate"
                                   :traitId="climateId"
                                   :traitName="climate.climateName"
                                   :traitDataType="climate.dataType"
                                   :datasetId="selectedDatasetId"
                                   @value-clicked="statsValueClicked"
                                   v-if="climate.dataType === 'text'" />
                  <TraitDateStats variable="climate"
                                  :traitId="climateId"
                                  :traitName="climate.climateName"
                                  :traitDataType="climate.dataType"
                                  :datasetId="selectedDatasetId"
                                  @value-clicked="statsValueClicked"
                                  v-else-if="climate.dataType === 'date'" />
                  <TraitCategoricalStats variable="climate"
                                         :traitId="climateId"
                                         :traitName="climate.climateName"
                                         :traitDataType="climate.dataType"
                                         :datasetId="selectedDatasetId"
                                         @value-clicked="statsValueClicked"
                                         v-else-if="climate.dataType === 'categorical'" />
                  <TraitNumericStats variable="climate"
                                     :unit="climate.unitAbbreviation || null"
                                     :traitId="climateId"
                                     :traitName="climate.climateName"
                                     :traitDataType="climate.dataType"
                                     :datasetId="selectedDatasetId"
                                     @value-clicked="statsValueClicked"
                                     v-else />
                </div>
              </section>

              <!-- The observations with the value clicked in the chart (location, date, value), closed by its cross -->
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
                  <ClimateDataTable :getData="getData" :getIds="getIds" :filterOn="statsValueFilter" :storeUrlParameters="false" :key="`stats-value-${selectedDatasetId}-${statsValueLabel}`" />
                </div>
              </section>
            </div>
          </b-tab>

          <!-- The images of the climate, only when it has some (no upload: the server does not take images of climates) -->
          <b-tab :title="$t('pagePassportImageTitle')" lazy v-if="imageCount > 0">
            <div class="td-tab-panel">
              <PassportImageGallery referenceTable="climates" :foreignId="climateId" :allowUpload="false" @images-changed="$emit('images-changed')" />
            </div>
          </b-tab>
        </b-tabs>
      </template>
    </div>
    <h3 v-else>{{ $t('headingNoData') }}</h3>
  </div>
</template>

<script>
import DatasetsWithUnacceptedLicense from '@/components/util/DatasetsWithUnacceptedLicense'
import DatasetTable from '@/components/tables/DatasetTable'
import TraitNumericStats from '@/components/charts/TraitNumericStats'
import TraitValueStats from '@/components/charts/TraitValueStats'
import TraitDateStats from '@/components/charts/TraitDateStats'
import TraitCategoricalStats from '@/components/charts/TraitCategoricalStats'
import PassportImageGallery from '@/components/images/PassportImageGallery'
import ClimateDataTable from '@/components/tables/ClimateDataTable'
import ClimateTable from '@/components/tables/ClimateTable'
import MdiIcon from '@/components/icons/MdiIcon'

import { apiPostClimateTable, apiPostClimateDataTable, apiPostClimateDataTableIds, apiPostClimateDatasetTable } from '@/mixins/api/climate.js'
import { datasetTypes } from '@/mixins/types'
import { getClimateDataset, setClimateDataset } from '@/mixins/trait-dataset-selection'

const emitter = require('tiny-emitter/instance')

export default {
  props: {
    // Images of the climate (loaded by the climates page): its Images tab when there are some
    imageCount: {
      type: Number,
      default: 0
    },
    // Embedded (a tab of the climate export): the climate given here (not by the route) ...
    embeddedClimateId: {
      type: Number,
      default: null
    },
    // ... and its datasets: the datasets table and the data across them only these, their filter fixed
    datasetIds: {
      type: Array,
      default: null
    }
  },
  data: function () {
    return {
      datasetTypes,
      climateId: null,
      climate: undefined,
      tableFilter: null,
      showAdditionalDatasets: true,
      // The tab shown (Datasets first) and the dataset of the statistics (selected in the datasets table)
      tabIndex: 0,
      selectedDatasetId: null,
      selectedDataset: null,
      // The dataset selected before for the climate (in the climates table or here), selected once the datasets arrived
      pendingDatasetId: null,
      // The value clicked in the chart of the statistics: its observations below the chart. A value, several values
      // ({ label, values }) or a range ({ label, range }: a bin of a histogram)
      statsValue: null
    }
  },
  watch: {
    // Another dataset selected for the climate in the climates table while its tab is open
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
    ClimateDataTable,
    ClimateTable,
    DatasetsWithUnacceptedLicense,
    DatasetTable,
    MdiIcon,
    PassportImageGallery,
    TraitNumericStats,
    TraitValueStats,
    TraitDateStats,
    TraitCategoricalStats
  },
  computed: {
    embedded: function () {
      return this.embeddedClimateId !== null
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
    // The dataset kept for the climate (selected here or in the climates table)
    storedDatasetId: function () {
      return getClimateDataset(this.climateId)
    },
    // The observations of the climate in the selected dataset with the value clicked in the chart
    statsValueFilter: function () {
      // A bin of a histogram: the values in its range; several values: any of them
      const value = this.statsValueRange
        ? { column: { name: 'climateValue', type: Number }, comparator: 'between', operator: 'and', values: this.statsValueRange, canBeChanged: false }
        : { column: { name: 'climateValue', type: String }, comparator: this.statsValues.length > 1 ? 'inSet' : 'equals', operator: 'and', values: this.statsValues, canBeChanged: false }
      return [{
        column: { name: 'climateId', type: Number },
        comparator: 'equals',
        operator: 'and',
        values: [this.climateId],
        canBeChanged: false
      }, {
        column: { name: 'datasetId', type: Number },
        comparator: 'equals',
        operator: 'and',
        values: [this.selectedDatasetId],
        canBeChanged: false
      }, value]
    },
    statsValueRange: function () {
      return this.statsValue !== null && typeof this.statsValue === 'object' && this.statsValue.range ? this.statsValue.range : null
    },
    statsValues: function () {
      return this.statsValue !== null && typeof this.statsValue === 'object' ? this.statsValue.values : [this.statsValue]
    },
    statsValueLabel: function () {
      return this.statsValue !== null && typeof this.statsValue === 'object' ? this.statsValue.label : this.statsValue
    }
  },
  methods: {
    // The row of the climate in the climates table (the filter on its id with the request)
    getClimateRow: function (data, callback) {
      const request = Object.assign({}, data, {
        filter: [{
          column: 'climateId',
          comparator: 'equals',
          operator: 'and',
          values: [this.climateId]
        }]
      })
      const result = apiPostClimateTable(request, callback)
      // The page as the request sent it (counted from 0), read back by the table for its count
      data.page = request.page
      return result
    },
    // The dataset selected in the datasets table: the statistics of the climate in it (none selected: no chart)
    datasetSelected: function (selected) {
      // The selection emptied when the table loads does not replace the one kept for the climate
      if (this.pendingDatasetId !== null) {
        return
      }
      const datasetId = selected && selected.length > 0 ? selected[0] : null
      setClimateDataset(this.climateId, datasetId)
      if (datasetId === this.selectedDatasetId) {
        return
      }
      this.selectedDatasetId = datasetId
      this.statsValue = null
      // The row of the dataset (its type and name, shown with the statistics)
      const baseTable = this.$refs.datasetTable && this.$refs.datasetTable.$refs.datasetTable
      const rows = (baseTable && baseTable.pageItems) || []
      this.selectedDataset = datasetId === null ? null : (rows.find(row => row.datasetId === datasetId) || null)
    },
    // The rows of the datasets arrived: the dataset selected before for the climate is selected again
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
      return apiPostClimateDatasetTable(this.climateId, data, callback)
    },
    checkNumbers: function (requestData, data) {
      this.showAdditionalDatasets = data && data.count > 0
    },
    getData: function (data, callback) {
      return apiPostClimateDataTable(data, callback)
    },
    getIds: function (data, callback) {
      return apiPostClimateDataTableIds(data, callback)
    },
    update: function () {
      if (this.$refs.climateDetailsTable) {
        this.$refs.climateDetailsTable.refresh()
      }
      if (this.$refs.datasetTable) {
        this.$refs.datasetTable.refresh()
      }
      this.checkNumbers()
    }
  },
  mounted: function () {
    // The climate: given (embedded), else that of the route
    const climateId = this.embedded ? this.embeddedClimateId : (this.$route.params.climateId ? parseInt(this.$route.params.climateId) : null)
    if (climateId !== null) {
      this.climateId = climateId
      // Embedded: the dataset kept for the climate only when it is one of the export
      const kept = getClimateDataset(this.climateId)
      this.pendingDatasetId = this.embedded && kept !== null && !(this.datasetIds || []).includes(kept) ? null : kept

      this.tableFilter = [{
        column: {
          name: 'climateId',
          type: Number
        },
        comparator: 'equals',
        operator: 'and',
        values: [this.climateId],
        canBeChanged: false
      }].concat(this.datasetOnlyFilter)

      const request = {
        page: 1,
        limit: 1,
        filter: [{
          column: 'climateId',
          comparator: 'equals',
          operator: 'and',
          values: [this.climateId]
        }]
      }
      apiPostClimateTable(request, result => {
        if (result && result.data && result.data.length > 0) {
          this.climate = result.data[0]
          // The climates page shows it in the title of its tab (name, data type)
          this.$emit('climate-loaded', this.climate)
        } else {
          this.climate = null
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
<!-- The look of the trait details (tabs, blocks, the empty state): shared -->
<style scoped src="@/assets/variable-details.css"></style>
