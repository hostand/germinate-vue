<template>
  <div>
    <!-- The export of a dataset type in the look of the custom pages: its title, then a block (folded by its head) with
         the datasets of the type to choose, the button going on (Next) at the bottom of their table -->
    <div class="custom-page ds-page" v-if="datasetType">
      <header class="cp-page-header">
        <h1 class="cp-page-title">{{ pageTitle }}</h1>
      </header>

      <section :class="['ds-card', { open: tableOpen }]">
        <button type="button" class="ds-card-head" @click="tableOpen = !tableOpen" :aria-expanded="tableOpen ? 'true' : 'false'">
          <!-- The icon of the export of the type (as in the menu), in the colour of the type -->
          <span class="ds-card-icon" :style="{ '--ds-type-color': typeColor }" aria-hidden="true"><MdiIcon :path="exportConfig.path" :size="34" v-if="exportConfig && exportConfig.path" /><i :class="['fa-solid', typeIcon]" v-else /></span>
          <span class="ds-card-heading">
            <span class="ds-card-title">{{ $t('pageDatasetsTitle') }}</span>
            <!-- Folded with outputs below: how many datasets they are of (opened again to change them) -->
            <span class="ds-card-text" v-if="!tableOpen && outputDatasetIds.length > 0">{{ $t('pageDatasetSelectorChosen', { count: outputDatasetIds.length }) }}</span>
            <span class="ds-card-text" v-else>{{ pageText }}</span>
          </span>
          <i class="fa-solid fa-chevron-down ds-card-chevron" aria-hidden="true" />
        </button>
        <div class="ds-card-body" v-show="tableOpen">
          <!-- Table showing all datasets of the type; at its bottom the button going on with the selected ones. The names
               plain text: here they are chosen, not opened -->
          <DatasetTable disableLinks selectHint :datasetType="datasetType" :getData="getData" :getIds="getIds" :filterOn="filterOn" :selectable="true" :selectionMode="selectionMode" :tableActions="tableActions" ref="datasetTable" @data-changed="hintSelection" />
        </div>
      </section>

      <!-- Trials: the outputs of the chosen datasets (once Next folded the block above), a tab each -->
      <b-tabs class="ds-tabs" nav-class="ds-tabs-nav" v-model="outputTab" v-if="outputDatasetIds.length > 0" ref="outputTabs">
        <!-- Tabular data: every observation of every trait of the datasets -->
        <b-tab>
          <template #title><MdiIcon :path="mdiTable" className="ds-tab-icon" />{{ $t('pageDatasetSelectorTabTabular') }}</template>
          <div class="ds-tab-panel">
            <!-- Pivoted (its button at the bottom of the table): a row per germplasm, dataset, rep and block, a column per
                 trait; the normal table kept meanwhile (its page and filters) -->
            <!-- Pivoted: the data of one of the datasets (chosen beside its button), its traits as columns -->
            <TrialsPivotTable :loadPage="loadPivotPage"
                              :traits="outputTraits"
                              :kind="isClimate ? 'climate' : 'trial'"
                              :datasetName="pivotDatasetName"
                              @close="closePivot"
                              @trait-clicked="openTrait"
                              :key="`trials-pivot-${pivotDatasetId}`"
                              v-if="pivot && pivotDatasetId !== null" />
            <TrialsDataTable :getData="getTrialsData"
                             :getIds="getTrialsDataIds"
                             :downloadTable="downloadTrialsData"
                             :unitAbbreviations="unitAbbreviations"
                             :tableActions="pivotActions"
                             plainGermplasm
                             traitClickable
                             @trait-clicked="openTrait"
                             :key="`trials-data-${outputDatasetIds.join('-')}`"
                             v-show="!pivot || pivotDatasetId === null"
                             v-if="!isClimate" />
            <!-- Climate: its data (the location of each value, its date, its unit) -->
            <ClimateDataTable :getData="getTrialsData"
                              :getIds="getTrialsDataIds"
                              :downloadTable="downloadTrialsData"
                              :unitAbbreviations="unitAbbreviations"
                              :tableActions="pivotActions"
                              plainLocations
                              climateClickable
                              @climate-clicked="openClimate"
                              :key="`climate-data-${outputDatasetIds.join('-')}`"
                              v-show="!pivot || pivotDatasetId === null"
                              v-else />
          </div>
        </b-tab>
        <!-- Comparison: of the chosen datasets (one numeric trait across them, ...) -->
        <b-tab lazy>
          <template #title><i class="fa-solid fa-code-compare ds-tab-icon" aria-hidden="true" />{{ $t('pageDatasetSelectorTabComparison') }}</template>
          <div class="ds-tab-panel">
            <!-- A comparison needs two datasets or more -->
            <div class="ds-need-more" v-if="outputDatasetIds.length < 2">
              <p><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ $t('pageComparisonNeedsDatasets') }}</p>
              <button type="button" class="ds-need-more-button" @click="tableOpen = true"><i class="fa-solid fa-square-check" aria-hidden="true" /> {{ $t('pageComparisonChooseDatasets') }}</button>
            </div>
            <TrialsComparison :datasets="outputDatasets" :variable="isClimate ? 'climate' : 'trait'" :key="`trials-comparison-${outputDatasetIds.join('-')}`" v-else />
          </div>
        </b-tab>
        <!-- Relationship: relationships between numeric traits (climate: variables) of the chosen datasets (on the same
             plot or accession; climate: the same location and date, or location in a dataset) -->
        <b-tab lazy>
          <template #title><i class="fa-solid fa-handshake ds-tab-icon" aria-hidden="true" />{{ $t('pageDatasetSelectorTabRelationship') }}</template>
          <div class="ds-tab-panel">
            <TraitRelationship :datasets="outputDatasets" :variable="isClimate ? 'climate' : 'trait'" :key="`trials-relationship-${outputDatasetIds.join('-')}`" />
          </div>
        </b-tab>
        <!-- Spatial (the climate data): the locations of the chosen datasets on a map (wheels, time-lapse, analogs, coverage) -->
        <b-tab lazy v-if="isClimate">
          <template #title><i class="fa-solid fa-satellite ds-tab-icon" aria-hidden="true" />{{ $t('pageDatasetSelectorTabSpatial') }}</template>
          <div class="ds-tab-panel">
            <ClimateSpatial :datasets="outputDatasets" :key="`climate-spatial-${outputDatasetIds.join('-')}`" />
          </div>
        </b-tab>
        <!-- Location profile (the climate data): a location of the chosen datasets, the summary of its climate -->
        <b-tab lazy v-if="isClimate">
          <template #title><i class="fa-solid fa-location-dot ds-tab-icon" aria-hidden="true" />{{ $t('pageDatasetSelectorTabLocationProfile') }}</template>
          <div class="ds-tab-panel">
            <ClimateLocationProfile :datasets="outputDatasets" :key="`climate-location-profile-${outputDatasetIds.join('-')}`" />
          </div>
        </b-tab>
        <!-- A trait clicked in the tabular data (its name; pivoted: a value of its column): its details, as its tab on the
             traits page, of the chosen datasets only (the filters of its tables fixed). Always there, hidden while no trait
             was clicked (a tab added later may be put first); another trait takes its place; closed by its cross -->
        <b-tab :disabled="!openedTrait" :title-item-class="openedTrait ? null : 'd-none'" lazy>
          <template #title>
            <span class="ds-trait-type" v-if="openedTrait && dataTypes[openedTrait.traitDataType]" :style="{ color: dataTypes[openedTrait.traitDataType].color() }"><MdiIcon :path="dataTypes[openedTrait.traitDataType].path" /></span>
            <span class="ds-trait-label">{{ openedTrait ? openedTrait.traitName : '' }}</span>
            <span class="ds-trait-close" role="button" tabindex="0" :title="$t('buttonClose')" :aria-label="$t('buttonClose')"
                  @click.stop.prevent="closeTrait" @keydown.enter.stop.prevent="closeTrait"><i class="fa-solid fa-xmark" aria-hidden="true" /></span>
          </template>
          <div class="ds-tab-panel" v-if="openedTrait">
            <ClimateDetails :embeddedClimateId="openedTrait.traitId"
                            :datasetIds="outputDatasetIds"
                            :key="`climate-details-${openedTrait.traitId}-${outputDatasetIds.join('-')}`"
                            v-if="isClimate" />
            <TraitDetails :embeddedTraitId="openedTrait.traitId"
                          :datasetIds="outputDatasetIds"
                          :key="`trials-trait-${openedTrait.traitId}-${outputDatasetIds.join('-')}`"
                          v-else />
          </div>
        </b-tab>
      </b-tabs>

      <!-- The pivoted table asked for without a dataset: a balloon (as those of the tour) on the choice of the dataset -->
      <Tour :steps="pivotHintSteps" modernLook ref="pivotHint" />
    </div>
    <div v-else>
      <h1>{{ $t('pageDatasetSelectorInvalidTypeTitle') }}</h1>
      <p>{{ $t('pageDatasetSelectorInvalidTypeText') }}</p>
      <ul>
        <li v-for="(datasetType, name) in getDatasetTypes()" :key="`experiment-type-${name}`">
          <router-link :to="{ name: Pages.export, params: { datasetType: name } }">{{ datasetType.text() }}</router-link>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import DatasetTable from '@/components/tables/DatasetTable'
import MdiIcon from '@/components/icons/MdiIcon'
import { customClimateExport } from '@/components/icons/custom-icons'
import TrialsDataTable from '@/components/tables/TrialsDataTable'
import ClimateDataTable from '@/components/tables/ClimateDataTable'
import { apiPostDatasetClimates, apiPostClimateDataTable, apiPostClimateDataTableIds } from '@/mixins/api/climate'
import { climateAsTrait } from '@/mixins/trait-comparison'
import TrialsPivotTable from '@/components/tables/TrialsPivotTable'
import TrialsComparison from '@/components/export/TrialsComparison'
import Tour from '@/components/util/Tour'
import { apiPostDatasetTable, apiPostDatasetTableIds, apiPostLicenseTable } from '@/mixins/api/dataset.js'
import { apiPostDatasetTraits, apiPostTrialsDataTable, apiPostTrialsDataTableIds } from '@/mixins/api/trait'
import { apiPostTableExport } from '@/mixins/api/misc'
import { mdiTable, mdiTablePivot } from '@mdi/js'
import { datasetTypes, dataTypes } from '@/mixins/types'
import { MAX_JAVA_INTEGER } from '@/mixins/api/base'

import { Pages } from '@/mixins/pages'

// The name of a dataset in the choice of the dataset of the pivoted table: cut beyond this many characters
const PIVOT_NAME_LENGTH = 40

// The export of each type: the icon of its entry in the menu (icon: Font Awesome; path: an SVG icon, see custom-icons.js),
// the title of the page and the text of the block (keys)
const EXPORTS = {
  trials: { icon: 'fa-person-digging', title: 'pageDatasetSelectorTitleTrials', text: 'pageDatasetSelectorTextTrials' },
  genotype: { icon: 'fa-dna', title: 'pageDatasetSelectorTitleGenotype', text: 'pageDatasetSelectorTextGenotype' },
  allelefreq: { icon: 'fa-file-waveform', title: 'pageDatasetSelectorTitleAllelefreq', text: 'pageDatasetSelectorTextAllelefreq' },
  climate: { path: customClimateExport, title: 'pageDatasetSelectorTitleClimate', text: 'pageDatasetSelectorTextClimate' }
}

export default {
  data: function () {
    return {
      Pages,
      datasetTypes,
      dataTypes,
      datasetType: null,
      // The trait clicked in the tabular data: its tab of details ({ traitId, traitName, traitDataType })
      openedTrait: null,
      mdiTable,
      // The block of the datasets: open (folded by its head)
      tableOpen: true,
      // The column of the checkboxes drew the eye once the datasets were shown
      selectionHinted: false,
      // Trials: the datasets of the outputs (chosen with Next), the tab shown, the abbreviation of the unit of each trait
      outputDatasetIds: [],
      outputTab: 0,
      unitAbbreviations: {},
      // The traits of the chosen datasets (their units: the filter on the abbreviation of the unit)
      outputTraits: [],
      // The table of the trials data pivoted, from the filter of the normal table (as last asked for, the abbreviations
      // of the units turned into traits)
      pivot: false,
      trialsFilter: null,
      // The datasets of the outputs ({ datasetId, datasetName }) and the one of the pivoted table
      outputDatasets: [],
      pivotDatasetId: null
    }
  },
  components: {
    DatasetTable,
    MdiIcon,
    TrialsDataTable,
    TrialsPivotTable,
    TrialsComparison,
    ClimateDataTable,
    // The details of a climate clicked in the tabular data (as its tab on the climates page)
    ClimateDetails: () => import('@/views/data/climate/ClimateDetails'),
    TraitRelationship: () => import('@/components/export/TraitRelationship'),
    ClimateLocationProfile: () => import('@/components/export/ClimateLocationProfile'),
    ClimateSpatial: () => import('@/components/export/ClimateSpatial'),
    // The details of a trait clicked in the tabular data (as its tab on the traits page)
    TraitDetails: () => import('@/views/data/trials/TraitDetails'),
    Tour
  },
  computed: {
    // The climate export: the outputs of the trials export on the climate data
    isClimate: function () {
      return this.datasetType === 'climate'
    },
    ...mapGetters([
      'storeLocale',
      'storeToken',
      'storeSelectedProjects'
    ]),
    exportConfig: function () {
      return EXPORTS[this.datasetType] || null
    },
    pageTitle: function () {
      return this.exportConfig ? this.$t(this.exportConfig.title) : this.datasetTypes[this.datasetType].text()
    },
    pageText: function () {
      return this.exportConfig ? this.$t(this.exportConfig.text) : ''
    },
    typeIcon: function () {
      return this.exportConfig ? this.exportConfig.icon : 'fa-database'
    },
    typeColor: function () {
      return this.datasetTypes[this.datasetType].color()
    },
    // At the bottom of the table of the trials data: its pivoted version
    pivotActions: function () {
      return [{
        id: 'pivot',
        text: this.$t('pageTrialsPivotOpen'),
        path: mdiTablePivot,
        disabled: () => false,
        callback: () => this.openPivot()
      }].concat(this.outputDatasetIds.length > 1 ? [this.pivotDatasetAction] : [])
      // (a single dataset: nothing to choose, the pivoted table is of it)
    },
    pivotDatasetName: function () {
      const dataset = this.outputDatasets.find(d => d.datasetId === this.pivotDatasetId)
      return dataset ? dataset.datasetName : null
    },
    // The balloon on the choice of the dataset of the pivoted table (the one of the normal table)
    pivotHintSteps: function () {
      return [{
        title: () => this.$t('pageTrialsPivotChooseDataset'),
        text: () => this.$t('pageTrialsPivotChooseDatasetText'),
        target: () => '.ds-tab-panel .bt-footer .bt-action-select',
        position: 'top'
      }]
    },
    // Beside the button of the pivoted table: the dataset of it (one of the chosen datasets, the name cut when long)
    pivotDatasetAction: function () {
      return {
        id: 'pivot-dataset',
        type: 'select',
        text: this.$t('pageTrialsPivotDataset'),
        placeholder: this.$t('pageTrialsPivotChooseDataset'),
        options: this.outputDatasets.map(d => ({
          value: d.datasetId,
          text: d.datasetName,
          label: d.datasetName.length > PIVOT_NAME_LENGTH ? `${d.datasetName.substring(0, PIVOT_NAME_LENGTH).trim()}…` : d.datasetName
        })),
        value: () => this.pivotDatasetId,
        onSelect: value => { this.pivotDatasetId = value },
        disabled: () => false
      }
    },
    // At the bottom of the table: Next (some datasets selected)
    tableActions: function () {
      return [{
        id: 'next',
        text: this.$t('buttonNext'),
        icon: 'fa-solid fa-arrow-right',
        primary: true,
        disabled: selected => !selected || selected.length < 1,
        callback: () => this.checkLicenses()
      }]
    },
    selectionMode: function () {
      // Only single selection for allele frequency data
      return this.datasetType === 'allelefreq' ? 'single' : 'multi'
    },
    filterOn: function () {
      if (this.storeSelectedProjects && this.storeSelectedProjects.length > 0) {
        return [{
          column: {
            name: 'projectId',
            type: Number
          },
          comparator: 'inSet',
          operator: 'and',
          values: this.storeSelectedProjects,
          canBeChanged: false
        }]
      } else {
        return null
      }
    }
  },
  watch: {
    // The block of the datasets opened again (to change them): the column of the checkboxes draws the eye
    tableOpen: function (open) {
      if (open && this.selectionHinted) {
        this.$nextTick(() => this.hintIfNoneSelected())
      }
    }
  },
  methods: {
    checkLicenses: function () {
      const selectedIds = this.$refs.datasetTable.getSelected()

      if (!selectedIds || selectedIds.length < 1) {
        this.$bvToast.toast(this.$t('toastSelectDatasetText'), {
          title: this.$t('toastSelectDatasetTitle'),
          variant: 'danger',
          autoHideDelay: 5000,
          appendToast: true
        })
        return
      }

      const query = {
        page: 1,
        prevCount: -1,
        limit: MAX_JAVA_INTEGER,
        filter: [{
          column: 'datasetId',
          comparator: 'inSet',
          operator: 'and',
          values: selectedIds
        }]
      }
      apiPostLicenseTable(query, result => {
        if (result && result.data && result.data.length > 0) {
          const toAccept = result.data.filter(l => {
            let result = true

            if (l.acceptedBy !== undefined && l.acceptedBy !== null && l.acceptedBy.length > 0) {
              if (this.storeToken && l.acceptedBy.indexOf(this.storeToken.id) !== -1) {
                result = false
              } else if (!this.storeToken && l.acceptedBy.indexOf(-1000) !== -1) {
                result = false
              }
            }

            return result
          })

          if (toAccept.length > 0) {
            this.$bvToast.toast(this.$t('toastTextAcceptLicense'), {
              title: this.$t('toastTitleAcceptLicense'),
              variant: 'danger',
              autoHideDelay: 10000,
              appendToast: true
            })
          } else {
            // Navigate to the export page
            this.navigateToExportPage(selectedIds)
          }
        } else {
          // Navigate to the export page
          this.navigateToExportPage(selectedIds)
        }
      })
    },
    navigateToExportPage: function (selectedIds) {
      // Trials: their outputs on this page, below the datasets (folded)
      if (this.datasetType === 'trials' || this.datasetType === 'climate') {
        this.showOutputs(selectedIds)
        return
      }
      switch (this.datasetType) {
        case 'trials':
          this.$router.push({ name: Pages.exportTraits, params: { datasetIds: selectedIds.join(',') } })
          break
        case 'genotype':
          this.$router.push({ name: Pages.exportGenotypes, params: { datasetIds: selectedIds.join(',') } })
          break
        case 'allelefreq':
          this.$router.push({ name: Pages.exportAlleleFrequency, params: { datasetIds: selectedIds.join(',') } })
          break
        case 'climate':
          this.$router.push({ name: Pages.exportClimates, params: { datasetIds: selectedIds.join(',') } })
          break
      }
    },
    // The outputs of the chosen trials datasets: the block of the datasets folded, the tabs below; the units of their
    // traits (their abbreviation in the table)
    showOutputs: function (datasetIds) {
      const ids = datasetIds.slice()
      const same = ids.join(',') === this.outputDatasetIds.join(',')
      this.outputDatasetIds = ids
      this.tableOpen = false
      if (same) {
        return
      }
      this.pivot = false
      this.trialsFilter = null
      // The dataset of the pivoted table: to choose (a single dataset: that one, when the table is pivoted)
      this.pivotDatasetId = null
      this.loadOutputDatasets(ids)
      this.unitAbbreviations = {}
      // The climate data: its variables as traits (the same fields)
      const loadVariables = this.isClimate
        ? (datasetIds, done) => apiPostDatasetClimates(datasetIds, result => done((result || []).map(climateAsTrait)))
        : apiPostDatasetTraits
      loadVariables(ids, result => {
        // Other datasets chosen meanwhile: not these
        if (ids.join(',') !== this.outputDatasetIds.join(',')) {
          return
        }
        this.outputTraits = result || []
        const units = {}
        ;(result || []).forEach(trait => {
          if (trait.unitAbbreviation) {
            units[trait.traitId] = trait.unitAbbreviation
          }
        })
        this.unitAbbreviations = units
      })
    },
    // A filter on the abbreviation of the unit (not known to the server): on the traits with a matching unit instead
    filterByUnit: function (filter) {
      if (!filter || !filter.some(f => f.column === 'unitAbbreviation')) {
        return filter
      }
      const lower = value => `${value === null || value === undefined ? '' : value}`.trim().toLowerCase()
      const matches = (f, unit) => {
        const value = lower(unit)
        const values = (f.values || []).flatMap(v => `${v}`.split(',')).map(lower).filter(v => v !== '')
        switch (f.comparator) {
          case 'isNull': return value === ''
          case 'isNotNull': return value !== ''
          case 'contains': return values.some(v => value.includes(v))
          case 'inSet': return values.includes(value)
          case 'greaterThan': return value > values[0]
          case 'greaterOrEquals': return value >= values[0]
          case 'lessThan': return value < values[0]
          case 'lessOrEquals': return value <= values[0]
          case 'between': return value >= values[0] && value <= values[1]
          default: return value === values[0]
        }
      }
      return filter.map(f => {
        if (f.column !== 'unitAbbreviation') {
          return f
        }
        const ids = this.outputTraits.filter(t => matches(f, t.unitAbbreviation)).map(t => t.traitId)
        // None matching: no observation (no trait has the id -1)
        return { column: this.isClimate ? 'climateId' : 'traitId', comparator: 'inSet', operator: f.operator, values: ids.length > 0 ? ids : [-1] }
      })
    },
    getTrialsData: function (data, callback) {
      data.datasetIds = this.outputDatasetIds
      data.filter = this.filterByUnit(data.filter)
      // Kept for the pivoted table
      this.trialsFilter = data.filter ? JSON.parse(JSON.stringify(data.filter)) : null
      return this.isClimate ? apiPostClimateDataTable(data, callback) : apiPostTrialsDataTable(data, callback)
    },
    // The names of the chosen datasets (the choice of the dataset of the pivoted table)
    loadOutputDatasets: function (ids) {
      this.outputDatasets = []
      apiPostDatasetTable({
        page: 1,
        limit: ids.length,
        filter: [{ column: 'datasetId', comparator: 'inSet', operator: 'and', values: ids }]
      }, result => {
        if (ids.join(',') !== this.outputDatasetIds.join(',')) {
          return
        }
        const rows = (result && result.data) || []
        this.outputDatasets = ids.map(id => rows.find(r => r.datasetId === id)).filter(r => r).map(r => ({ datasetId: r.datasetId, datasetName: `${r.datasetName || r.datasetId}` }))
      })
    },
    // The pivoted table: of the dataset chosen beside its button (none: the choice first)
    openPivot: function () {
      // A single dataset: no choice, that one
      if (this.outputDatasetIds.length === 1) {
        this.pivotDatasetId = this.outputDatasetIds[0]
      }
      if (this.pivotDatasetId === null) {
        // A balloon of the tour on the choice of the dataset, explaining it
        this.$refs.pivotHint.start()
        return
      }
      this.pivot = true
    },
    // Back to the normal table: the choice of the dataset empty again (its placeholder)
    // A trait clicked in the tabular data: its tab (the last one), shown; the page does not scroll
    openTrait: function (trait) {
      if (!trait || trait.traitId === undefined || trait.traitId === null) {
        return
      }
      this.openedTrait = { traitId: trait.traitId, traitName: trait.traitName, traitDataType: trait.traitDataType }
      // After b-tabs enabled the tab
      this.$nextTick(() => {
        // The last tab: after Tabular, Comparison and Relationship (the climate data: also Spatial and Location profile)
        this.outputTab = this.isClimate ? 5 : 3
      })
    },
    // A climate clicked in its tabular data: its tab, as a trait
    openClimate: function (climate) {
      if (!climate) {
        return
      }
      this.openTrait({ traitId: climate.climateId, traitName: climate.climateName, traitDataType: climate.climateDataType })
    },
    // Its cross: back to the tabular data
    closeTrait: function () {
      this.openedTrait = null
      this.outputTab = 0
    },
    closePivot: function () {
      this.pivot = false
      this.pivotDatasetId = null
    },
    // A page of the observations for the pivoted table: of its dataset, with the filter of the normal table
    loadPivotPage: function ({ page, limit }) {
      const load = this.isClimate ? apiPostClimateDataTable : apiPostTrialsDataTable
      return new Promise(resolve => {
        load({
          page,
          limit,
          datasetIds: [this.pivotDatasetId],
          filter: this.trialsFilter ? JSON.parse(JSON.stringify(this.trialsFilter)) : null,
          orderBy: this.isClimate ? 'locationId' : 'germplasmId',
          ascending: 1
        }, result => resolve(result ? { data: result.data || [], count: result.count } : { data: [], count: 0 }), {
          codes: [],
          callback: () => resolve({ data: [], count: 0 })
        })
      })
    },
    getTrialsDataIds: function (data, callback) {
      data.datasetIds = this.outputDatasetIds
      data.filter = this.filterByUnit(data.filter)
      return this.isClimate ? apiPostClimateDataTableIds(data, callback) : apiPostTrialsDataTableIds(data, callback)
    },
    // The download of the table: its filter, within the chosen datasets
    downloadTrialsData: function (data, callback) {
      const filter = [{ column: 'datasetId', comparator: 'inSet', operator: 'and', values: this.outputDatasetIds }].concat(this.filterByUnit(data.filter) || [])
      return apiPostTableExport({ filter }, this.isClimate ? 'dataset/data/climate' : 'dataset/data/trial', callback)
    },
    getDatasetTypes: function () {
      const result = Object.assign({}, datasetTypes)
      delete result.unknown
      return result
    },
    getData: function (data, callback) {
      this.adjustData(data)
      return apiPostDatasetTable(data, callback)
    },
    // The datasets shown the first time: the column of the checkboxes draws the eye, without scrolling (again each time
    // the block is opened, see the watch of tableOpen)
    hintSelection: function () {
      if (this.selectionHinted) {
        return
      }
      this.selectionHinted = true
      this.$nextTick(() => this.hintIfNoneSelected())
    },
    // The column of the checkboxes draws the eye (and the note on how to select shows) only while none is checked
    hintIfNoneSelected: function () {
      const table = this.$refs.datasetTable
      if (!table || !this.tableOpen) {
        return
      }
      const selected = table.getSelected ? table.getSelected() : []
      if (!selected || selected.length === 0) {
        table.highlightSelection(false)
      }
    },
    getIds: function (data, callback) {
      this.adjustData(data)
      return apiPostDatasetTableIds(data, callback)
    },
    adjustData: function (data) {
      // Always filter for just the current dataset type
      const additional = [{
        column: 'datasetType',
        comparator: 'equals',
        operator: 'and',
        values: [this.datasetType]
      }, {
        column: 'isExternal',
        comparator: 'equals',
        operator: 'and',
        values: [0]
      }]

      if (!data.filter) {
        data.filter = additional
      } else {
        data.filter = additional.concat(data.filter)
      }
    }
  },
  created: function () {
    const datasetType = this.$route.params.datasetType

    if (datasetTypes[datasetType]) {
      this.datasetType = datasetType
    }
  }
}
</script>

<style src="@/assets/custom-page.css"></style>
<style scoped>
.ds-page {
  padding: 0.5rem 0 3rem;
}
/* The block of the datasets (as those of the other custom pages): its head folds it */
.ds-card {
  margin-top: 2rem;
  overflow: hidden;
  border: 1px solid var(--cp-border);
  border-radius: 16px;
  background: var(--cp-surface);
  box-shadow: 0 1px 2px var(--cp-shadow);
}
.ds-card-head {
  display: flex;
  align-items: center;
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
.ds-card-head:hover {
  background: var(--cp-surface-hover);
}
/* The icon of the export: a square in a soft background of the colour of the type */
.ds-card-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--ds-type-color) 14%, transparent);
  color: var(--ds-type-color);
  font-size: 1.25rem;
}
.ds-card-heading {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
}
.ds-card-title {
  margin: 0.1rem 0 0.3rem;
  color: var(--cp-text);
  font-size: 1.2rem;
  font-weight: 600;
}
.ds-card-text {
  color: var(--cp-muted);
  font-size: 0.9rem;
  line-height: 1.55;
}
.ds-card-chevron {
  flex-shrink: 0;
  color: var(--cp-muted);
  transition: transform 0.15s ease;
}
.ds-card.open .ds-card-chevron {
  transform: rotate(180deg);
}
.ds-card-body {
  padding: 1.25rem;
  border-top: 1px solid var(--cp-border);
}
/* The outputs: tabs as on the other custom pages, their icon green when active */
.ds-tabs {
  margin-top: 2.25rem;
}
.ds-tabs >>> .ds-tabs-nav {
  flex-wrap: wrap;
  border-bottom: 1px solid var(--cp-border);
}
.ds-tabs >>> .ds-tabs-nav .nav-link {
  display: inline-flex;
  align-items: center;
  padding: 0.7rem 1.25rem;
  border: 1px solid transparent;
  border-radius: 10px 10px 0 0;
  color: var(--cp-muted);
  font-weight: 600;
  line-height: 1.5;
}
.ds-tabs >>> .ds-tabs-nav .nav-link:hover,
.ds-tabs >>> .ds-tabs-nav .nav-link:focus {
  border-color: transparent;
  color: var(--cp-text);
}
.ds-tabs >>> .ds-tabs-nav .nav-link.active,
body.dark-mode .ds-tabs >>> .ds-tabs-nav .nav-link.active,
body.dark-mode .ds-tabs >>> .ds-tabs-nav .nav-link.active:focus {
  border-color: var(--cp-border) var(--cp-border) var(--cp-surface);
  background: var(--cp-surface);
  color: var(--cp-text);
}
.ds-tabs >>> .ds-tab-icon {
  width: 1.15em;
  height: 1.15em;
  margin-right: 0.5rem;
  fill: currentColor;
}
.ds-tabs >>> .ds-tabs-nav .nav-link.active .ds-tab-icon {
  fill: var(--cp-green);
  color: var(--cp-green);
}
/* The tab of a trait: the icon of its data type (in its colour), its name (cut when long), its cross */
.ds-trait-type {
  display: inline-flex;
  margin-right: 0.5rem;
}
.ds-trait-type >>> svg {
  width: 1.15em;
  height: 1.15em;
  fill: currentColor;
}
.ds-trait-label {
  max-width: 22rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ds-trait-close {
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
.ds-trait-close:hover,
.ds-trait-close:focus {
  background: var(--cp-surface-hover);
  color: #dc3545;
  outline: none;
}
body.dark-mode .ds-trait-close:hover,
body.dark-mode .ds-trait-close:focus {
  color: #f07b86;
}
/* A Font Awesome icon of a tab */
.ds-tabs >>> i.ds-tab-icon {
  width: auto;
  height: auto;
  font-size: 0.95em;
}
.ds-tab-panel {
  margin-top: 2rem;
}
/* A comparison with a single dataset: what to do */
.ds-need-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2.5rem 1.25rem;
  border: 1px solid var(--cp-border);
  border-radius: 16px;
  background: var(--cp-surface);
  color: var(--cp-muted);
  text-align: center;
}
.ds-need-more p {
  margin: 0;
}
.ds-need-more-button {
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
.ds-need-more-button:hover {
  background: var(--cp-button-hover);
}

</style>
