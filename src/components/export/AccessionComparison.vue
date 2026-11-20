<template>
  <!-- Accessions comparison (the Comparison tab of the trials export): the germplasm grown in two or more of the chosen
       datasets, and how it behaved in each. First the accessions in common: those in two datasets or more that share a
       comparable trait (the same name, data type and unit: numeric; the same name and categories: categorical), a
       read-only table. Then a trait (the list: those with accessions in common, their number): its values of each
       accession in each dataset (the mean of its observations; categorical: its most frequent category).
       Numeric traits: grouped bars by accession (its mean in each trial, ± its standard deviation), the heatmap accession
       × trial, the ranking of the accessions in each trial (a line per accession: does it keep its place?) and the
       scatterplot of two trials (an accession a point: its mean in one and in the other; the diagonal: the same value).
       Categorical traits: the heatmap only (the category of each accession in each trial; the others need numbers).
       Date and text traits are left out: a date depends on the season of its trial and a text has no scale to compare.
       Below: the values by accession (a read-only table, downloadable). -->
  <section class="stc">
    <header class="stc-head">
      <span class="stc-icon" :style="{ '--stc-type-color': typeColor }" aria-hidden="true"><i class="fa-solid fa-seedling" /></span>
      <div class="stc-heading">
        <h3 class="stc-title">{{ $t('pageComparisonAccessionsTitle') }}</h3>
        <p class="stc-text">{{ $t('pageComparisonAccessionsText') }}</p>
      </div>
      <div class="stc-select">
        <GermplasmFilterSelect id="acc-trait"
                               :options="traitOptions"
                               :value="selectedKey"
                               :placeholder="$t('pageComparisonSingleTraitPlaceholder')"
                               :loading="!accessionsReady"
                               countIcon="fa-solid fa-seedling"
                               @select="selectTrait"
                               @clear="clearTrait" />
      </div>
    </header>

    <!-- The accessions in common (no trait chosen yet) -->
    <div class="stc-summary-wrap acc-list" v-if="!selected">
      <!-- Loading the germplasm and the traits of the datasets, then finding the accessions in common (many datasets: a
           while) -->
      <div class="tvs-loading" v-if="!accessionsReady"><b-spinner small /> {{ traitsLoading || germplasmLoading ? $t('tooltipTableLoadingIndicator') : $t('pageComparisonAccessionsFinding') }}</div>
      <p class="tvs-empty" v-else-if="accessions.length < 1">{{ $t('pageComparisonAccessionsNone') }}</p>
      <div class="stc-summary" v-else>
        <BaseTable :columns="accessionColumns"
                   :options="accessionOptions"
                   :getData="getAccessionData"
                   :getIds="null"
                   :downloadTable="downloadAccessions"
                   toolsLocked
                   :autoHideColumns="false"
                   :storeUrlParameters="false"
                   primary-key="germplasmId"
                   :key="`acc-list-${datasetKey}`">
          <template v-slot:cell(germplasmName)="data">
            <GermplasmNameCell :germplasmId="data.item.germplasmId" :name="`${data.item.germplasmName}`" :link="false" />
          </template>
          <template v-slot:cell(genus)="data">
            <i v-if="data.item.genus">{{ data.item.genus }}</i>
          </template>
          <template v-slot:cell(species)="data">
            <i v-if="data.item.species">{{ data.item.species }}</i>
          </template>
          <!-- The number of its datasets / traits: opens (closes) their table in the row -->
          <template v-slot:cell(datasetCount)="data">
            <button type="button" :class="['acc-count', { open: data.detailsShowing && detailKind[data.item.germplasmId] === 'datasets' }]" :aria-expanded="data.detailsShowing && detailKind[data.item.germplasmId] === 'datasets' ? 'true' : 'false'" @click="showDetails(data, 'datasets')">
              {{ formatNumber(data.item.datasetCount) }} <i class="fa-solid fa-chevron-down" aria-hidden="true" />
            </button>
          </template>
          <template v-slot:cell(traitCount)="data">
            <button type="button" :class="['acc-count', { open: data.detailsShowing && detailKind[data.item.germplasmId] === 'traits' }]" :aria-expanded="data.detailsShowing && detailKind[data.item.germplasmId] === 'traits' ? 'true' : 'false'" @click="showDetails(data, 'traits')">
              {{ formatNumber(data.item.traitCount) }} <i class="fa-solid fa-chevron-down" aria-hidden="true" />
            </button>
          </template>
          <!-- In the row: its datasets or its traits in common, show only (their tools shown, inactive; no checkboxes; no
               links to other pages) -->
          <template v-slot:row-details="data">
            <div class="acc-details">
              <DatasetTable :getData="getDatasetRows"
                            :filterOn="getDatasetFilter(data.item)"
                            :onlyColumns="['datasetId', 'datasetName', 'datasetDescription', 'locations', 'dataPointCount']"
                            disableLinks
                            filterLocked
                            toolsLocked
                            :allowEditing="false"
                            :autoHideColumns="false"
                            :storeUrlParameters="false"
                            :key="`acc-datasets-${data.item.germplasmId}`"
                            v-if="detailKind[data.item.germplasmId] === 'datasets'" />
              <TraitTable :getData="getTraitRows"
                          :getIds="null"
                          :filterOn="getTraitFilter(data.item)"
                          :onlyColumns="['traitName', 'traitDescription', 'dataType', 'unitName', 'unitAbbreviation', 'traitRestrictions']"
                          disableLinks
                          selectionMode="none"
                          filterLocked
                          toolsLocked
                          :autoHideColumns="false"
                          :storeUrlParameters="false"
                          :key="`acc-traits-${data.item.germplasmId}`"
                          v-else />
            </div>
          </template>
        </BaseTable>
      </div>
    </div>

    <div class="stc-body tvs" :id="id" v-if="selected">
      <div class="tvs-loading" v-if="rowsState === 'loading'"><b-spinner small /> {{ rowsProgress || $t('tooltipTableLoadingIndicator') }}</div>
      <div class="tvs-empty stc-confirm" v-else-if="rowsState === 'confirm'">
        <p><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ $t('pageComparisonSingleTraitLarge', { count: formatNumber(rowsTotal) }) }}</p>
        <button type="button" class="tvs-values-link" @click="loadRows"><i class="fa-solid fa-download" aria-hidden="true" /> {{ $t('pageTraitDetailsStatsLoadObservations') }}</button>
      </div>
      <p class="tvs-empty" v-else-if="rowsState === 'loaded' && common.length < 1">{{ $t('pageComparisonAccessionsNoneForTrait') }}</p>
      <template v-else-if="rowsState === 'loaded'">
        <!-- The numbers -->
        <div class="tvs-numbers">
          <div :class="['tvs-number', { 'is-danger': number.danger }]" v-for="number in numbers" :key="`acc-number-${number.key}`" :data-tour-number="number.key">
            <span class="tvs-number-value">{{ number.value }}</span>
            <span class="tvs-number-label">{{ number.label }}</span>
          </div>
        </div>
        <!-- The options (downloads, colours) and the help, at the right end of the strip -->
        <BaseChart :width="() => 1280"
                   :height="() => chartHeight"
                   :supportsPngDownload="false"
                   :supportsSvgDownload="false"
                   :canChangeColors="false"
                   customLook
                   class="tvs-base"
                   ref="baseChart"
                   v-on:force-redraw="draw">
          <template slot="additionalMenuItems">
            <b-dropdown-header>{{ currentViewText }}</b-dropdown-header>
            <b-dropdown-item link-class="top-nav-menu-item" @click="downloadChart('chart', 'png')"><i class="fa-solid fa-image fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadPng') }}</b-dropdown-item>
            <b-dropdown-item link-class="top-nav-menu-item" @click="downloadChart('chart', 'svg')"><i class="fa-solid fa-file-code fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadSvg') }}</b-dropdown-item>
            <b-dropdown-divider />
            <b-dropdown-item link-class="top-nav-menu-item" @click="downloadData"><i class="fa-solid fa-file-lines fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadFile') }}</b-dropdown-item>
            <b-dropdown-item link-class="top-nav-menu-item" @click="$refs.baseChart.showColors()"><i class="fa-solid fa-palette fa-fw" aria-hidden="true" /> {{ $t('buttonChangeChartColors') }}</b-dropdown-item>
          </template>
          <template slot="additionalButtons">
            <b-button v-b-tooltip.hover :title="$t('chartTooltipMatrixTour')" :aria-label="$t('chartTooltipMatrixTour')" @click="$refs.tour.start()">
              <i class="fa-regular fa-circle-question" aria-hidden="true" />
            </b-button>
          </template>
          <div slot="chart" class="tvs-chart-wrap">
            <!-- The views (categorical traits: the heatmap only) -->
            <div class="tds acc-views-wrap" v-if="views.length > 1">
              <div class="tds-views" role="tablist">
                <button type="button"
                        :class="['tds-view', { active: view === option.key }]"
                        :data-tour-view="option.key"
                        role="tab"
                        :aria-selected="view === option.key ? 'true' : 'false'"
                        v-for="option in views"
                        :key="`acc-view-${option.key}`"
                        @click="setView(option.key)">
                  <MdiIcon :path="option.path" className="acc-view-icon" /> {{ option.text }}
                </button>
              </div>
            </div>
            <!-- The scatterplot: its two trials -->
            <div class="acc-pair" v-if="view === 'scatter' && isNumeric">
              <label for="acc-trial-x">{{ $t('pageComparisonAccessionsTrialX') }}</label>
              <select id="acc-trial-x" class="acc-select" v-model.number="trialX" @change="draw">
                <option v-for="d in usedDatasets" :key="`acc-x-${d.datasetId}`" :value="d.datasetId" :disabled="d.datasetId === trialY">{{ d.datasetName }}</option>
              </select>
              <label for="acc-trial-y">{{ $t('pageComparisonAccessionsTrialY') }}</label>
              <select id="acc-trial-y" class="acc-select" v-model.number="trialY" @change="draw">
                <option v-for="d in usedDatasets" :key="`acc-y-${d.datasetId}`" :value="d.datasetId" :disabled="d.datasetId === trialX">{{ d.datasetName }}</option>
              </select>
            </div>
            <p class="tvs-empty" v-if="view === 'scatter' && pairPoints.length < 1">{{ $t('pageComparisonAccessionsNoPair') }}</p>
            <div class="stc-chart" ref="chart" v-show="!(view === 'scatter' && pairPoints.length < 1)" />
          </div>
        </BaseChart>
        <!-- The values of each accession in each trial: a read-only table (its tools shown, inactive), downloadable -->
        <div class="stc-summary-wrap">
          <h4 class="stc-chart-title" data-tour="summary">{{ $t('pageComparisonAccessionsValues') }}</h4>
          <div class="stc-summary">
            <BaseTable :columns="valueColumns"
                       :options="valueOptions"
                       :getData="getValueData"
                       :getIds="null"
                       :downloadTable="downloadValues"
                       toolsLocked
                       :autoHideColumns="false"
                       :storeUrlParameters="false"
                       primary-key="germplasmId"
                       :key="`acc-values-${selectedKey}`">
              <template v-slot:cell(germplasmName)="data">
                <GermplasmNameCell :germplasmId="data.item.germplasmId" :name="`${data.item.germplasmName}`" :link="false" />
              </template>
            </BaseTable>
          </div>
        </div>
      </template>
    </div>

    <!-- Tour explaining the numbers, the views, the table and the options -->
    <Tour :steps="tourSteps" modernLook ref="tour" />
  </section>
</template>

<script>
import BaseChart from '@/components/charts/BaseChart'
import BaseTable from '@/components/tables/BaseTable'
import GermplasmFilterSelect from '@/components/tables/GermplasmFilterSelect'
import GermplasmNameCell from '@/components/germplasm/GermplasmNameCell'
import DatasetTable from '@/components/tables/DatasetTable'
import TraitTable from '@/components/tables/TraitTable'
import { apiPostGermplasmTable } from '@/mixins/api/germplasm'
import { apiPostDatasetTable } from '@/mixins/api/dataset'
import MdiIcon from '@/components/icons/MdiIcon'
import Tour from '@/components/util/Tour'
import traitComparison, { normalize, getNumericComparable, getCategoricalComparable, CHART_HEIGHT } from '@/mixins/trait-comparison'
import { apiPostTrialGermplasm, apiPostTraitTable } from '@/mixins/api/trait'
import { formatNumber, getDateTimeString } from '@/mixins/formatting'
import { downloadBlob } from '@/mixins/util'
import { makeZip } from '@/mixins/zip'
import { mean } from '@/mixins/stats-math'
import { getGradientScale } from '@/mixins/chart-palettes'
import { mdiChartBar, mdiGrid, mdiPodium, mdiChartScatterPlot } from '@mdi/js'

const Plotly = require('plotly.js/lib/core')
Plotly.register([
  require('plotly.js/lib/bar'),
  require('plotly.js/lib/heatmap'),
  require('plotly.js/lib/scatter')
])

// The germplasm of the datasets loaded in pages of this many
const GERMPLASM_PAGE = 10000
// Grouped bars: at most this many accessions (those in the most trials, then the most variable)
const BARS_MAX = 30
// Ranking: at most this many lines (those whose rank changes the most)
const RANKING_MAX = 40
// The height of a row of the heatmap (an accession), and what the axes take
const HEATMAP_ROW = 24
const HEATMAP_EXTRA = 130

// A value of the data as a number (also with a decimal comma); null when not a number
const parseNumber = value => {
  const text = `${value === null || value === undefined ? '' : value}`.trim().replace(/^(-?\d+),(\d+)$/, '$1.$2')
  return text !== '' && isFinite(text) ? +text : null
}
const sdOf = (values, m) => values.length > 1 ? Math.sqrt(values.reduce((sum, x) => sum + (x - m) * (x - m), 0) / (values.length - 1)) : null
// Pearson's correlation of pairs [[x, y], ...]; null with fewer than three pairs or no variation
const pearson = pairs => {
  if (pairs.length < 3) {
    return null
  }
  const mx = mean(pairs.map(p => p[0]))
  const my = mean(pairs.map(p => p[1]))
  let sxy = 0
  let sxx = 0
  let syy = 0
  pairs.forEach(([x, y]) => {
    sxy += (x - mx) * (y - my)
    sxx += (x - mx) * (x - mx)
    syy += (y - my) * (y - my)
  })
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null
}

export default {
  components: {
    BaseChart,
    BaseTable,
    GermplasmFilterSelect,
    GermplasmNameCell,
    DatasetTable,
    TraitTable,
    MdiIcon,
    Tour
  },
  // The traits of the datasets, the trait chosen, its observations, the theme and the downloads
  mixins: [traitComparison],
  data: function () {
    return {
      // The germplasm of each dataset: { datasetId: [{ germplasmId, germplasmName, germplasmDisplayName }] }
      germplasmByDataset: {},
      germplasmLoading: true,
      // The accessions in common and the number of them for each trait: found once both are loaded (not reactive to
      // every change: many datasets make it heavy)
      accessions: [],
      accessionCounts: {},
      accessionsReady: false,
      // Genus and species of the accessions (by germplasm id), loaded for the rows shown
      taxonomy: {},
      // The table open in the row of an accession: datasets or traits (by germplasm id)
      detailKind: {},
      // bars, heatmap, ranking or scatter
      view: 'bars',
      // The two trials of the scatterplot
      trialX: null,
      trialY: null,
      accessionOptions: {
        idColumn: 'germplasmId',
        tableName: 'comparisonAccessions'
      },
      valueOptions: {
        idColumn: 'germplasmId',
        tableName: 'comparisonAccessionValues'
      }
    }
  },
  computed: {
    datasetKey: function () {
      return this.datasets.map(d => d.datasetId).join('-')
    },
    // The comparable traits: numeric (the same name and unit) and categorical (the same name and categories), a kind
    // each (their keys told apart)
    comparable: function () {
      const numeric = getNumericComparable(this.datasets, this.traitsByDataset).map(o => Object.assign({}, o, { kind: 'numeric', key: `n:${o.key}` }))
      const categorical = getCategoricalComparable(this.datasets, this.traitsByDataset).map(o => Object.assign({}, o, { kind: 'categorical', key: `c:${o.key}` }))
      return numeric.concat(categorical).sort((a, b) => a.name.localeCompare(b.name))
    },
    // The list: the traits with accessions in common ("name (unit)"; the number of those accessions)
    traitOptions: function () {
      return this.comparable.map(o => ({
        value: o.key,
        name: o.kind === 'numeric' && o.unitLabel ? `${o.name} (${o.unitLabel})` : o.name,
        count: this.accessionCounts[o.key] || 0
      })).filter(o => o.count > 0)
    },
    isNumeric: function () {
      return this.selected !== null && this.selected.kind === 'numeric'
    },
    unit: function () {
      return this.isNumeric ? (this.selected.unitLabel || '') : ''
    },
    // Categorical: the categories (those of the trait, else the values seen), a colour each
    categories: function () {
      if (!this.selected || this.isNumeric) {
        return []
      }
      let list
      if (this.selected.domain.length > 0) {
        list = this.selected.domain.map((c, index) => ({ key: `c${index}`, label: c.label }))
      } else {
        const labels = {}
        this.rows.forEach(r => { if (r.category) labels[r.category] = labels[r.category] || r.raw })
        list = Object.keys(labels).sort((a, b) => `${labels[a]}`.localeCompare(`${labels[b]}`)).map(key => ({ key, label: `${labels[key]}`.trim() }))
      }
      const colors = this.getDistinctColors(list.length)
      return list.map((c, index) => Object.assign(c, { color: colors[index] }))
    },
    // Each accession in each dataset: its values (numbers; categorical: categories), its mean or most frequent category
    cells: function () {
      const cells = {}
      this.rows.forEach(r => {
        const g = cells[r.germplasmId] = cells[r.germplasmId] || { germplasmId: r.germplasmId, germplasmName: r.germplasmName, byDataset: {} }
        const c = g.byDataset[r.datasetId] = g.byDataset[r.datasetId] || { values: [], invalid: 0 }
        const value = this.isNumeric ? r.value : r.category
        if (value === null) {
          c.invalid++
        } else {
          c.values.push(value)
        }
      })
      Object.values(cells).forEach(g => Object.values(g.byDataset).forEach(c => {
        if (this.isNumeric) {
          c.mean = c.values.length > 0 ? mean(c.values) : null
          c.sd = c.values.length > 1 ? sdOf(c.values, c.mean) : null
        } else {
          const counts = {}
          c.values.forEach(v => { counts[v] = (counts[v] || 0) + 1 })
          const top = Math.max(0, ...Object.values(counts))
          c.top = top > 0 ? Object.keys(counts).filter(k => counts[k] === top) : []
        }
      }))
      return cells
    },
    // The accessions with values in two datasets or more (the comparison)
    common: function () {
      return Object.values(this.cells).filter(g => Object.values(g.byDataset).filter(c => c.values.length > 0).length > 1)
    },
    // The datasets with values of the accessions in common (a colour each)
    usedDatasets: function () {
      if (!this.selected) {
        return []
      }
      const ids = this.selected.datasetIds.filter(id => this.common.some(g => g.byDataset[id] && g.byDataset[id].values.length > 0))
      const colors = this.getDistinctColors(ids.length)
      return ids.map((datasetId, index) => ({ datasetId, datasetName: this.datasetNames[datasetId] || `${datasetId}`, color: colors[index] }))
    },
    // Numeric: the rank of each accession in common in each dataset (1: the highest mean)
    ranks: function () {
      const ranks = {}
      if (!this.isNumeric) {
        return ranks
      }
      this.usedDatasets.forEach(d => {
        this.common.filter(g => g.byDataset[d.datasetId] && g.byDataset[d.datasetId].mean !== null && g.byDataset[d.datasetId].mean !== undefined)
          .sort((a, b) => b.byDataset[d.datasetId].mean - a.byDataset[d.datasetId].mean)
          .forEach((g, index) => {
            ranks[g.germplasmId] = ranks[g.germplasmId] || {}
            ranks[g.germplasmId][d.datasetId] = index + 1
          })
      })
      return ranks
    },
    // The scatterplot: the accessions with values in both trials
    pairPoints: function () {
      if (!this.isNumeric || this.trialX === null || this.trialY === null) {
        return []
      }
      return this.common.filter(g => this.hasMean(g, this.trialX) && this.hasMean(g, this.trialY)).map(g => ({ g, x: g.byDataset[this.trialX].mean, y: g.byDataset[this.trialY].mean }))
    },
    // Numeric: the mean correlation of the accessions between every two trials
    meanCorrelation: function () {
      const values = []
      for (let i = 0; i < this.usedDatasets.length; i++) {
        for (let j = i + 1; j < this.usedDatasets.length; j++) {
          const a = this.usedDatasets[i].datasetId
          const b = this.usedDatasets[j].datasetId
          const r = pearson(this.common.filter(g => this.hasMean(g, a) && this.hasMean(g, b)).map(g => [g.byDataset[a].mean, g.byDataset[b].mean]))
          if (r !== null) {
            values.push(r)
          }
        }
      }
      return values.length > 0 ? mean(values) : null
    },
    // Categorical: the accessions whose most frequent category is not the same from one trial to another
    changing: function () {
      if (this.isNumeric) {
        return 0
      }
      return this.common.filter(g => {
        const tops = Object.values(g.byDataset).filter(c => c.top && c.top.length > 0).map(c => c.top)
        return tops.some(a => tops.some(b => !a.some(k => b.includes(k))))
      }).length
    },
    numbers: function () {
      const commonIds = new Set(this.common.map(g => g.germplasmId))
      const observations = this.rows.filter(r => commonIds.has(r.germplasmId) && (this.isNumeric ? r.value !== null : r.category !== null)).length
      const invalid = this.rows.filter(r => this.isNumeric ? r.value === null : r.category === null).length
      const numbers = [{
        key: 'accessions',
        value: formatNumber(this.common.length),
        label: this.$t('pageComparisonAccessionsCommon')
      }, {
        key: 'datasets',
        value: `${formatNumber(this.usedDatasets.length)} / ${formatNumber(this.selected ? this.selected.datasetIds.length : 0)}`,
        label: this.$t('pageComparisonSingleTraitDatasetsCompared')
      }, {
        key: 'observations',
        value: formatNumber(observations),
        label: this.$t('pageTraitDetailsStatsObservations')
      }]
      if (this.isNumeric && this.meanCorrelation !== null) {
        numbers.push({ key: 'correlation', value: this.formatFixed(this.meanCorrelation, 2), label: this.$t('pageComparisonAccessionsCorrelation') })
      }
      if (!this.isNumeric) {
        numbers.push({ key: 'changing', value: formatNumber(this.changing), label: this.$t('pageComparisonAccessionsChanging') })
      }
      if (invalid > 0) {
        numbers.push({ key: 'invalid', danger: true, value: formatNumber(invalid), label: this.isNumeric ? this.$t('pageTraitDetailsStatsNotNumbers') : this.$t('pageTraitDetailsStatsOutOfDomain') })
      }
      return numbers
    },
    views: function () {
      if (!this.isNumeric) {
        return [{ key: 'heatmap', path: mdiGrid, text: this.$t('pageComparisonAccessionsHeatmap') }]
      }
      return [{
        key: 'bars',
        path: mdiChartBar,
        text: this.$t('pageComparisonAccessionsBars')
      }, {
        key: 'heatmap',
        path: mdiGrid,
        text: this.$t('pageComparisonAccessionsHeatmap')
      }, {
        key: 'ranking',
        path: mdiPodium,
        text: this.$t('pageComparisonAccessionsRanking')
      }, {
        key: 'scatter',
        path: mdiChartScatterPlot,
        text: this.$t('pageComparisonAccessionsScatter')
      }]
    },
    currentViewText: function () {
      const view = this.views.find(v => v.key === this.view)
      return view ? view.text : ''
    },
    chartHeight: function () {
      return this.view === 'heatmap' ? Math.max(300, this.common.length * HEATMAP_ROW + HEATMAP_EXTRA) : CHART_HEIGHT
    },
    accessionColumns: function () {
      return [{
        key: 'germplasmName',
        type: String,
        sortable: false,
        label: this.$t('tableColumnGermplasmName')
      }, {
        key: 'germplasmDisplayName',
        type: String,
        sortable: false,
        label: this.$t('tableColumnGermplasmDisplayName')
      }, {
        key: 'genus',
        type: String,
        sortable: false,
        label: this.$t('tableColumnGenus')
      }, {
        key: 'species',
        type: String,
        sortable: false,
        label: this.$t('tableColumnSpecies')
      }, {
        key: 'datasetCount',
        type: Number,
        sortable: false,
        label: this.$t('pageDatasetsTitle')
      }, {
        key: 'traitCount',
        type: Number,
        sortable: false,
        label: this.$t('pageComparisonAccessionsTraitCount')
      }]
    },
    // The values of each accession in common: a column per trial (its mean; categorical: its category), then the
    // difference between its highest and lowest mean (numeric)
    valueRows: function () {
      return this.common.slice().sort((a, b) => `${a.germplasmName}`.localeCompare(`${b.germplasmName}`)).map(g => {
        const row = { germplasmId: g.germplasmId, germplasmName: g.germplasmName }
        const means = []
        this.usedDatasets.forEach(d => {
          const c = g.byDataset[d.datasetId]
          row[`d${d.datasetId}`] = this.getCellText(c)
          if (this.isNumeric && c && c.mean !== null && c.mean !== undefined) {
            means.push(c.mean)
          }
        })
        row.trials = Object.values(g.byDataset).filter(c => c.values.length > 0).length
        row.spread = means.length > 1 ? Math.max(...means) - Math.min(...means) : null
        return row
      })
    },
    valueColumns: function () {
      const columns = [{
        key: 'germplasmName',
        type: String,
        sortable: false,
        label: this.$t('tableColumnGermplasmName')
      }, {
        key: 'trials',
        type: Number,
        sortable: false,
        class: 'text-right',
        label: this.$t('pageComparisonAccessionsDatasetCount'),
        formatter: value => formatNumber(value)
      }].concat(this.usedDatasets.map(d => ({
        key: `d${d.datasetId}`,
        type: String,
        sortable: false,
        class: this.isNumeric ? 'text-right' : null,
        label: d.datasetName
      })))
      if (this.isNumeric) {
        columns.push({
          key: 'spread',
          type: Number,
          sortable: false,
          class: 'text-right',
          label: this.$t('pageComparisonAccessionsSpread'),
          formatter: value => value === null ? '–' : this.formatUnit(value)
        })
      }
      return columns
    },
    // The help: the numbers, the views, the table, the options
    tourSteps: function () {
      const target = selector => () => `#${this.id} ${selector}`
      const texts = {
        accessions: this.$t('pageComparisonAccessionsTourCommon'),
        datasets: this.$t('pageComparisonAccessionsTourDatasets'),
        observations: this.$t('pageComparisonAccessionsTourObservations'),
        correlation: this.$t('pageComparisonAccessionsTourCorrelation'),
        changing: this.$t('pageComparisonAccessionsTourChanging'),
        invalid: this.isNumeric ? this.$t('pageComparisonTourInvalid') : this.$t('pageComparisonCategoricalTourOutside')
      }
      const steps = this.numbers.map(number => ({
        title: () => number.label,
        text: () => texts[number.key],
        target: target(`[data-tour-number="${number.key}"]`),
        position: 'bottom'
      }))
      const viewTexts = {
        bars: this.$t('pageComparisonAccessionsTourBars'),
        heatmap: this.isNumeric ? this.$t('pageComparisonAccessionsTourHeatmap') : this.$t('pageComparisonAccessionsTourHeatmapCategorical'),
        ranking: this.$t('pageComparisonAccessionsTourRanking'),
        scatter: this.$t('pageComparisonAccessionsTourScatter')
      }
      const viewSteps = this.views.length > 1
        ? this.views.map(view => ({ title: () => view.text, text: () => viewTexts[view.key], target: target(`[data-tour-view="${view.key}"]`), position: 'bottom' }))
        : [{ title: () => this.views[0].text, text: () => viewTexts.heatmap, target: target('.stc-chart'), position: 'top' }]
      return steps.concat(viewSteps).concat([{
        title: () => this.$t('pageComparisonAccessionsValues'),
        text: () => this.$t('pageComparisonAccessionsTourValues'),
        target: target('[data-tour="summary"]'),
        position: 'top'
      }, {
        title: () => this.$t('popoverChartTourGenericOptionsTitle'),
        text: () => this.$t('pageComparisonAccessionsTourOptions'),
        target: target('#additional-options'),
        position: 'bottom'
      }])
    }
  },
  watch: {
    datasets: function () {
      this.loadGermplasm()
    },
    // Both loaded: the accessions in common found
    traitsLoading: function () {
      this.findAccessions()
    },
    germplasmLoading: function () {
      this.findAccessions()
    }
  },
  methods: {
    hasMean: function (g, datasetId) {
      const c = g.byDataset[datasetId]
      return !!c && c.mean !== null && c.mean !== undefined
    },
    formatUnit: function (value) {
      const text = this.formatValue(value)
      return this.unit && text !== '–' ? `${text} ${this.unit}` : text
    },
    getCategoryLabel: function (key) {
      const category = this.categories.find(c => c.key === key)
      return category ? category.label : key
    },
    // A cell of the values: the mean (and its unit), or the most frequent categories
    getCellText: function (c) {
      if (!c || c.values.length < 1) {
        return '–'
      }
      return this.isNumeric ? this.formatUnit(c.mean) : c.top.map(k => this.getCategoryLabel(k)).join(' / ')
    },
    // The accessions in two datasets or more sharing a comparable trait (their datasets, the number of those traits) and,
    // for each trait, the number of its accessions in common. Accessions in the same datasets share the same traits:
    // the traits are matched once per combination of datasets (few), not per accession (many). Found after the loading
    // is painted (the page busy meanwhile)
    findAccessions: function () {
      if (this.traitsLoading || this.germplasmLoading) {
        this.accessionsReady = false
        return
      }
      this.accessionsReady = false
      const datasetKey = this.datasetKey
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => {
        if (datasetKey !== this.datasetKey || this.traitsLoading || this.germplasmLoading) {
          return
        }
        const order = {}
        this.datasets.forEach((d, i) => { order[d.datasetId] = i })
        const byGermplasm = {}
        this.datasets.forEach(d => {
          ;(this.germplasmByDataset[d.datasetId] || []).forEach(g => {
            const a = byGermplasm[g.germplasmId] = byGermplasm[g.germplasmId] || { germplasmId: g.germplasmId, germplasmName: g.germplasmName, germplasmDisplayName: g.germplasmDisplayName, datasetIds: [] }
            if (!a.datasetIds.includes(d.datasetId)) {
              a.datasetIds.push(d.datasetId)
            }
          })
        })
        // The combinations of datasets: the comparable traits in two of their datasets or more
        const comparable = this.comparable
        const combinations = {}
        const accessions = []
        const counts = {}
        Object.values(byGermplasm).forEach(a => {
          if (a.datasetIds.length < 2) {
            return
          }
          a.datasetIds.sort((x, y) => order[x] - order[y])
          const key = a.datasetIds.join(',')
          let combination = combinations[key]
          if (!combination) {
            const ids = new Set(a.datasetIds)
            combination = combinations[key] = {
              traits: comparable.filter(t => t.datasetIds.filter(id => ids.has(id)).length > 1).map(t => t.key),
              datasetName: a.datasetIds.map(id => this.datasetNames[id] || id).join(' · ')
            }
          }
          if (combination.traits.length < 1) {
            return
          }
          combination.traits.forEach(k => { counts[k] = (counts[k] || 0) + 1 })
          accessions.push(Object.assign(a, { traitKeys: combination.traits, traitCount: combination.traits.length, datasetCount: a.datasetIds.length, datasetName: combination.datasetName }))
        })
        accessions.sort((x, y) => y.datasetCount - x.datasetCount || y.traitCount - x.traitCount || `${x.germplasmName}`.localeCompare(`${y.germplasmName}`))
        this.accessions = Object.freeze(accessions)
        this.accessionCounts = Object.freeze(counts)
        this.accessionsReady = true
      }, 0)))
    },
    // The germplasm of each dataset (distinct), in pages
    loadGermplasm: function () {
      this.germplasmLoading = true
      this.accessionsReady = false
      const ids = this.datasets.map(d => d.datasetId)
      const result = {}
      const next = page => new Promise(resolve => {
        apiPostTrialGermplasm({ page, limit: GERMPLASM_PAGE, datasetIds: ids }, true, data => resolve(data || { data: [], count: 0 }), { codes: [], callback: () => resolve({ data: [], count: 0 }) })
      }).then(data => {
        ;(data.data || []).forEach(g => {
          (result[g.datasetId] = result[g.datasetId] || []).push({ germplasmId: g.germplasmId, germplasmName: g.germplasmName, germplasmDisplayName: g.germplasmDisplayName })
        })
        return (data.data || []).length === GERMPLASM_PAGE && page * GERMPLASM_PAGE < (data.count || 0) ? next(page + 1) : null
      })
      next(1).then(() => {
        if (ids.join(',') !== this.datasets.map(d => d.datasetId).join(',')) {
          return
        }
        this.germplasmByDataset = result
        this.germplasmLoading = false
      })
    },
    // An observation: its dataset, germplasm and value (numeric: a number or null; categorical: the key of its category
    // or null when outside the categories)
    toRow: function (o) {
      const text = `${o.traitValue}`.trim()
      const row = { datasetId: o.datasetId, germplasmId: o.germplasmId, germplasmName: o.germplasmName, rep: o.rep, block: o.block, raw: text, value: null, category: null }
      if (this.selected.kind === 'numeric') {
        row.value = parseNumber(text)
      } else if (this.selected.domain.length > 0) {
        const position = this.selected.lookup[normalize(text)]
        row.category = position === undefined || position < 0 ? null : `c${position}`
      } else {
        row.category = `v:${normalize(text)}`
      }
      return row
    },
    setView: function (key) {
      this.view = key
      this.$nextTick(() => this.draw())
    },
    // A read-only table of many rows: a page of them
    getPage: function (request, rows) {
      const page = Math.max(1, request.page || 1)
      const limit = request.limit || rows.length
      request.page = page - 1
      return Promise.resolve({ data: { data: rows.slice((page - 1) * limit, page * limit), count: rows.length } })
    },
    // A page of the accessions in common: copies (the table marks the rows it opens), their genus and species loaded
    // first (those not known yet, in one request)
    getAccessionData: function (request) {
      const page = Math.max(1, request.page || 1)
      const limit = request.limit || this.accessions.length
      request.page = page - 1
      const shown = this.accessions.slice((page - 1) * limit, page * limit)
      const missing = shown.map(a => a.germplasmId).filter(id => !(id in this.taxonomy))
      const loaded = missing.length < 1
        ? Promise.resolve()
        : new Promise(resolve => apiPostGermplasmTable({
          page: 1,
          limit: missing.length,
          filter: [{ column: 'germplasmId', comparator: 'inSet', operator: 'and', values: missing }]
        }, result => {
          const taxonomy = Object.assign({}, this.taxonomy)
          missing.forEach(id => { taxonomy[id] = { genus: null, species: null } })
          ;((result && result.data) || []).forEach(g => { taxonomy[g.germplasmId] = { genus: g.genus || null, species: g.species || null } })
          this.taxonomy = taxonomy
          resolve()
        }, { codes: [], callback: () => resolve() }))
      return loaded.then(() => ({
        data: {
          data: shown.map(a => Object.assign({}, a, this.taxonomy[a.germplasmId] || {})),
          count: this.accessions.length
        }
      }))
    },
    // Its number of datasets or traits clicked: their table opened in the row (the other one replaced), or closed
    showDetails: function (data, kind) {
      const id = data.item.germplasmId
      if (data.detailsShowing && this.detailKind[id] === kind) {
        data.toggleDetails()
        return
      }
      this.$set(this.detailKind, id, kind)
      if (!data.detailsShowing) {
        data.toggleDetails()
      }
    },
    getDatasetRows: function (data, callback) {
      return apiPostDatasetTable(data, callback)
    },
    getTraitRows: function (data, callback) {
      return apiPostTraitTable(data, callback)
    },
    // The datasets of an accession (among those chosen), fixed
    getDatasetFilter: function (accession) {
      return [{ column: { name: 'datasetId', type: Number }, comparator: 'inSet', operator: 'and', values: accession.datasetIds.slice(), canBeChanged: false }]
    },
    // Its traits in common (the ids of the comparable traits it shares between its datasets), fixed
    getTraitFilter: function (accession) {
      const ids = []
      ;(accession.traitKeys || []).forEach(key => {
        const trait = this.comparable.find(t => t.key === key)
        if (trait) {
          trait.traitIds.forEach(id => { if (!ids.includes(id)) ids.push(id) })
        }
      })
      return [{ column: { name: 'traitId', type: Number }, comparator: 'inSet', operator: 'and', values: ids, canBeChanged: false }]
    },
    getValueData: function (request) {
      return this.getPage(request, this.valueRows)
    },
    downloadAccessions: function (request, callback) {
      const lines = [[this.$t('tableColumnGermplasmName'), this.$t('tableColumnGermplasmDisplayName'), this.$t('tableColumnGenus'), this.$t('tableColumnSpecies'), this.$t('pageComparisonAccessionsDatasetCount'), this.$t('pageDatasetsTitle'), this.$t('pageComparisonAccessionsTraitCount')].join('\t')]
        .concat(this.accessions.map(a => {
          const taxonomy = this.taxonomy[a.germplasmId] || {}
          return [a.germplasmName, a.germplasmDisplayName || '', taxonomy.genus || '', taxonomy.species || '', a.datasetCount, a.datasetName, a.traitCount].join('\t')
        }))
      return this.resolveLater(callback, makeZip([{ name: 'accessions-in-common.txt', content: lines.join('\r\n') }]))
    },
    downloadValues: function (request, callback) {
      const header = [this.$t('tableColumnGermplasmName'), this.$t('pageComparisonAccessionsDatasetCount')].concat(this.usedDatasets.map(d => d.datasetName))
      if (this.isNumeric) {
        header.push(this.$t('pageComparisonAccessionsSpread'))
      }
      const number = value => value === null || value === undefined ? '' : `${Math.round(value * 10000) / 10000}`
      const lines = [header.join('\t')].concat(this.valueRows.map(r => {
        const g = this.cells[r.germplasmId]
        const line = [r.germplasmName, r.trials].concat(this.usedDatasets.map(d => {
          const c = g.byDataset[d.datasetId]
          if (!c || c.values.length < 1) {
            return ''
          }
          return this.isNumeric ? number(c.mean) : c.top.map(k => this.getCategoryLabel(k)).join(' / ')
        }))
        if (this.isNumeric) {
          line.push(number(r.spread))
        }
        return line.join('\t')
      }))
      return this.resolveLater(callback, makeZip([{ name: `${this.getFileName()}-values.txt`, content: lines.join('\r\n') }]))
    },
    // The observations of the accessions in common (dataset, germplasm, rep, block, value as written)
    downloadData: function () {
      const commonIds = new Set(this.common.map(g => g.germplasmId))
      const lines = [['dataset', 'germplasm', 'rep', 'block', 'value'].join('\t')].concat(this.rows.filter(r => commonIds.has(r.germplasmId)).map(r => [
        this.datasetNames[r.datasetId] || r.datasetId,
        r.germplasmName,
        r.rep || '',
        r.block || '',
        `${r.raw}`.replace(/[\t\r\n]+/g, ' ')
      ].join('\t')))
      downloadBlob({ blob: new Blob([lines.join('\r\n')], { type: 'text/plain' }), filename: `${this.getFileName()}-${getDateTimeString()}`, extension: 'txt' })
    },
    getFileName: function () {
      return `comparison-accessions-${this.selected ? this.selected.name.replace(/[^\w-]+/g, '_') : 'trait'}-${this.view}`
    },
    axisTitle: function () {
      return this.selected ? `${this.selected.name}${this.unit ? ` (${this.unit})` : ''}` : ''
    },
    draw: function () {
      if (this.rowsState !== 'loaded' || this.common.length < 1) {
        return
      }
      // The view must exist for the trait (categorical: the heatmap only); the trials of the scatterplot set
      if (!this.views.some(v => v.key === this.view)) {
        this.view = this.views[0].key
      }
      const ids = this.usedDatasets.map(d => d.datasetId)
      if (!ids.includes(this.trialX)) {
        this.trialX = ids[0] !== undefined ? ids[0] : null
      }
      if (!ids.includes(this.trialY) || this.trialY === this.trialX) {
        this.trialY = ids.find(id => id !== this.trialX) || null
      }
      this.$nextTick(() => {
        const element = this.$refs.chart
        if (!element) {
          return
        }
        if (this.view === 'bars') {
          this.drawBars(element)
        } else if (this.view === 'heatmap') {
          this.drawHeatmap(element)
        } else if (this.view === 'ranking') {
          this.drawRanking(element)
        } else if (this.pairPoints.length > 0) {
          this.drawScatter(element)
        } else {
          Plotly.purge(element)
        }
      })
    },
    // A group per accession (at most BARS_MAX: those in the most trials, then the most variable), a bar per trial (its
    // mean, ± its standard deviation)
    drawBars: function (element) {
      const theme = this.getTheme()
      const spread = g => {
        const means = this.usedDatasets.filter(d => this.hasMean(g, d.datasetId)).map(d => g.byDataset[d.datasetId].mean)
        return means.length > 1 ? Math.max(...means) - Math.min(...means) : 0
      }
      const trials = g => this.usedDatasets.filter(d => this.hasMean(g, d.datasetId)).length
      const shown = this.common.slice().sort((a, b) => trials(b) - trials(a) || spread(b) - spread(a)).slice(0, BARS_MAX)
        .sort((a, b) => `${a.germplasmName}`.localeCompare(`${b.germplasmName}`))
      const names = shown.map(g => `${g.germplasmName}`)
      const unit = this.unit ? ` ${this.unit}` : ''
      const data = this.usedDatasets.map(d => ({
        type: 'bar',
        name: d.datasetName,
        x: names,
        y: shown.map(g => this.hasMean(g, d.datasetId) ? g.byDataset[d.datasetId].mean : null),
        error_y: { type: 'data', array: shown.map(g => this.hasMean(g, d.datasetId) && g.byDataset[d.datasetId].sd !== null ? g.byDataset[d.datasetId].sd : 0), visible: true, color: theme.muted, thickness: 1, width: 3 },
        customdata: shown.map(g => this.hasMean(g, d.datasetId) ? formatNumber(g.byDataset[d.datasetId].values.length) : ''),
        marker: { color: d.color },
        hoverlabel: theme.hoverlabel,
        hovertemplate: `<b>%{x}</b><br>${d.datasetName}<br>%{y:.2f}${unit} (n = %{customdata})<extra></extra>`
      }))
      Plotly.react(element, data, this.getLayout({
        barmode: 'group',
        bargap: 0.25,
        showlegend: true,
        legend: { orientation: 'h', traceorder: 'normal', x: 0, y: 1.08, yanchor: 'bottom', font: { color: theme.text } },
        margin: { t: 40, r: 20, b: 40, l: 70 },
        xaxis: { type: 'category', tickfont: { color: theme.text }, automargin: true, tickangle: shown.length > 10 ? -45 : 0 },
        yaxis: { title: { text: this.axisTitle(), font: { color: theme.muted } }, gridcolor: theme.grid, zeroline: false, tickfont: { color: theme.muted } }
      }), { displayModeBar: false, responsive: true })
    },
    // A row per accession, a column per trial. Numeric: its mean as the colour (the unit of the trait: one scale) and in
    // the cell; categorical: its most frequent category (its colour, its label); blank: not in the trial
    drawHeatmap: function (element) {
      const theme = this.getTheme()
      const datasets = this.usedDatasets
      const x = datasets.map(d => d.datasetName)
      if (this.isNumeric) {
        const overall = g => mean(datasets.filter(d => this.hasMean(g, d.datasetId)).map(d => g.byDataset[d.datasetId].mean))
        const shown = this.common.slice().sort((a, b) => overall(a) - overall(b))
        const z = shown.map(g => datasets.map(d => this.hasMean(g, d.datasetId) ? g.byDataset[d.datasetId].mean : null))
        Plotly.react(element, [{
          type: 'heatmap',
          x,
          y: shown.map(g => `${g.germplasmName}`),
          z,
          text: shown.map(g => datasets.map(d => this.hasMean(g, d.datasetId) ? this.formatValue(g.byDataset[d.datasetId].mean) : '')),
          texttemplate: shown.length <= 60 ? '%{text}' : '',
          colorscale: getGradientScale(),
          xgap: 2,
          ygap: 1,
          colorbar: { title: { text: this.unit, font: { color: theme.muted } }, tickfont: { color: theme.muted }, thickness: 12 },
          hoverongaps: false,
          hoverlabel: theme.hoverlabel,
          hovertemplate: `<b>%{y}</b><br>%{x}<br>%{z:.2f}${this.unit ? ` ${this.unit}` : ''}<extra></extra>`
        }], this.getLayout({
          height: this.chartHeight,
          margin: { t: 10, r: 20, b: 60, l: 20 },
          xaxis: { tickfont: { color: theme.text }, automargin: true, fixedrange: true },
          yaxis: { tickfont: { color: theme.text }, automargin: true, fixedrange: true }
        }), { displayModeBar: false, responsive: true })
        return
      }
      // Categorical: a stepped scale, a band per category
      const index = {}
      this.categories.forEach((c, i) => { index[c.key] = i })
      const count = Math.max(this.categories.length, 1)
      const colorscale = []
      this.categories.forEach((c, i) => colorscale.push([i / count, c.color], [(i + 1) / count, c.color]))
      if (colorscale.length < 2) {
        colorscale.push([0, '#cccccc'], [1, '#cccccc'])
      }
      const shown = this.common.slice().sort((a, b) => `${b.germplasmName}`.localeCompare(`${a.germplasmName}`))
      const cell = (g, d) => g.byDataset[d.datasetId] && g.byDataset[d.datasetId].top && g.byDataset[d.datasetId].top.length > 0 ? g.byDataset[d.datasetId].top : null
      Plotly.react(element, [{
        type: 'heatmap',
        x,
        y: shown.map(g => `${g.germplasmName}`),
        z: shown.map(g => datasets.map(d => cell(g, d) ? index[cell(g, d)[0]] + 0.5 : null)),
        text: shown.map(g => datasets.map(d => cell(g, d) ? cell(g, d).map(k => this.getCategoryLabel(k)).join(' / ') : '')),
        texttemplate: shown.length <= 60 ? '%{text}' : '',
        zmin: 0,
        zmax: count,
        colorscale,
        showscale: false,
        xgap: 2,
        ygap: 1,
        hoverongaps: false,
        hoverlabel: theme.hoverlabel,
        hovertemplate: '<b>%{y}</b><br>%{x}<br>%{text}<extra></extra>'
      }], this.getLayout({
        height: this.chartHeight,
        margin: { t: 10, r: 20, b: 60, l: 20 },
        xaxis: { tickfont: { color: theme.text }, automargin: true, fixedrange: true },
        yaxis: { tickfont: { color: theme.text }, automargin: true, fixedrange: true }
      }), { displayModeBar: false, responsive: true })
    },
    // The trials across, the rank of each accession in each (1: the highest mean, at the top); a line per accession (at
    // most RANKING_MAX: those whose rank changes the most). Parallel lines: the ranking holds; crossing lines: it changes
    drawRanking: function (element) {
      const theme = this.getTheme()
      const datasets = this.usedDatasets
      const change = g => {
        const r = datasets.map(d => this.ranks[g.germplasmId] && this.ranks[g.germplasmId][d.datasetId]).filter(v => v)
        return r.length > 1 ? Math.max(...r) - Math.min(...r) : 0
      }
      const shown = this.common.slice().sort((a, b) => change(b) - change(a)).slice(0, RANKING_MAX)
      const colors = this.getDistinctColors(shown.length)
      const unit = this.unit ? ` ${this.unit}` : ''
      const data = shown.map((g, i) => {
        const points = datasets.filter(d => this.ranks[g.germplasmId] && this.ranks[g.germplasmId][d.datasetId])
        return {
          type: 'scatter',
          mode: 'lines+markers',
          name: `${g.germplasmName}`,
          x: points.map(d => d.datasetName),
          y: points.map(d => this.ranks[g.germplasmId][d.datasetId]),
          customdata: points.map(d => this.formatValue(g.byDataset[d.datasetId].mean)),
          line: { color: colors[i], width: 2 },
          marker: { color: colors[i], size: 7 },
          hoverlabel: theme.hoverlabel,
          hovertemplate: `<b>${g.germplasmName}</b><br>%{x}<br>#%{y} · %{customdata}${unit}<extra></extra>`
        }
      })
      const most = Math.max(1, ...Object.values(this.ranks).map(r => Math.max(...Object.values(r))))
      Plotly.react(element, data, this.getLayout({
        showlegend: shown.length <= 20,
        legend: { font: { color: theme.text } },
        xaxis: { type: 'category', tickfont: { color: theme.text }, automargin: true },
        yaxis: { title: { text: this.$t('pageComparisonAccessionsRank'), font: { color: theme.muted } }, autorange: false, range: [most + 0.5, 0.5], dtick: most > 20 ? 5 : 1, gridcolor: theme.grid, zeroline: false, tickfont: { color: theme.muted } }
      }), { displayModeBar: false, responsive: true })
    },
    // An accession a point: its mean in the first trial (across) and in the second (up); the dashed diagonal: the same
    // value in both; Pearson's r in the corner
    drawScatter: function (element) {
      const theme = this.getTheme()
      const points = this.pairPoints
      const nameX = this.datasetNames[this.trialX] || this.trialX
      const nameY = this.datasetNames[this.trialY] || this.trialY
      const all = points.map(p => p.x).concat(points.map(p => p.y))
      const low = Math.min(...all)
      const high = Math.max(...all)
      const pad = (high - low) * 0.05 || 1
      const r = pearson(points.map(p => [p.x, p.y]))
      const unit = this.unit ? ` ${this.unit}` : ''
      const color = (this.usedDatasets.find(d => d.datasetId === this.trialY) || {}).color || theme.text
      Plotly.react(element, [{
        type: 'scatter',
        mode: 'markers',
        x: points.map(p => p.x),
        y: points.map(p => p.y),
        text: points.map(p => `${p.g.germplasmName}`),
        marker: { color, size: 9, opacity: 0.8, line: { color: theme.text, width: 0.5 } },
        hoverlabel: theme.hoverlabel,
        hovertemplate: `<b>%{text}</b><br>${nameX}: %{x:.2f}${unit}<br>${nameY}: %{y:.2f}${unit}<extra></extra>`
      }], this.getLayout({
        showlegend: false,
        margin: { t: 30, r: 20, b: 60, l: 70 },
        xaxis: { title: { text: `${nameX}${unit ? ` (${this.unit})` : ''}`, font: { color: theme.muted } }, range: [low - pad, high + pad], gridcolor: theme.grid, zeroline: false, tickfont: { color: theme.muted } },
        yaxis: { title: { text: `${nameY}${unit ? ` (${this.unit})` : ''}`, font: { color: theme.muted } }, range: [low - pad, high + pad], gridcolor: theme.grid, zeroline: false, tickfont: { color: theme.muted } },
        shapes: [{ type: 'line', x0: low - pad, y0: low - pad, x1: high + pad, y1: high + pad, line: { color: theme.muted, width: 1, dash: 'dash' } }],
        annotations: r === null ? [] : [{ xref: 'paper', yref: 'paper', x: 0.01, y: 0.99, xanchor: 'left', yanchor: 'top', showarrow: false, text: `r = ${this.formatFixed(r, 2)} · n = ${formatNumber(points.length)}`, font: { color: theme.text, size: 12 } }]
      }), { displayModeBar: false, responsive: true })
    }
  },
  mounted: function () {
    this.loadGermplasm()
  }
}
</script>

<style scoped src="@/assets/variable-stats.css"></style>
<style scoped src="@/assets/trait-comparison.css"></style>
<style scoped>
.stc-icon i {
  color: var(--stc-type-color);
  font-size: 1.3rem;
}
/* The accessions in common, below the head */
.acc-list {
  padding-top: 1.25rem;
  border-top: 1px solid var(--cp-border);
}
/* The number of datasets / traits of an accession: a pill opening their table in the row */
.acc-count {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.1rem 0.6rem;
  border: 1px solid var(--cp-border);
  border-radius: 999px;
  background: var(--cp-surface);
  color: var(--cp-text);
  font: inherit;
  cursor: pointer;
}
.acc-count i {
  color: var(--cp-muted);
  font-size: 0.65rem;
  transition: transform 0.15s ease;
}
.acc-count:hover,
.acc-count:focus-visible,
.acc-count.open {
  border-color: var(--cp-green);
  background: var(--cp-green-soft);
}
.acc-count.open i {
  transform: rotate(180deg);
}
/* The table in the row */
.acc-details {
  padding: 0.5rem 0.25rem;
}
/* The views, as those of the statistics of a trait */
.acc-views-wrap {
  margin: 0.25rem 0 1rem;
}
.acc-views-wrap >>> .acc-view-icon {
  width: 1.05em;
  height: 1.05em;
  fill: currentColor;
}
/* The two trials of the scatterplot */
.acc-pair {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  margin-bottom: 0.75rem;
  color: var(--cp-text-subtle, var(--cp-muted));
  font-size: 0.85rem;
}
.acc-select {
  max-width: 22rem;
  height: 36px;
  padding: 0 0.6rem;
  border: 1px solid var(--cp-border);
  border-radius: 10px;
  background: var(--cp-surface);
  color: var(--cp-text);
  font-size: 0.85rem;
}
.acc-select:focus {
  border-color: var(--cp-green);
  outline: none;
  box-shadow: 0 0 0 3px var(--cp-green-soft);
}
</style>
