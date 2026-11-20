<template>
  <!-- Categorical comparison (the Comparison tab of the trials export): one categorical trait across the chosen datasets,
       in the block of the single trait comparison: its head (the icon, the title, what can be chosen) with the trait to
       compare on its right (a searchable list: its name and the number of its datasets). A categorical trait is the same
       in two datasets when its name and its categories (case and spaces ignored, in any order) are the same, whatever
       its id; only those found so in two datasets or more are offered (the others are left out, silently). A value is
       in a category by any of the codes of its scales (e.g. "Moderate" or "2"); a value in none is outside the
       categories: left out of every chart and number (counted).
       The trait chosen: every observation of it in its datasets (in pages; very many: once confirmed). The numbers on a
       strip (datasets compared, categories seen, observations, germplasm in two datasets or more and those changing
       category, outside the categories) with the options and the help at its right end; then the frequency by category
       (the counts of each category in each dataset), the percentage by category (the share of each category in each
       dataset, stacked to 100 %) and the predominant category by trial (a read-only table: the most frequent category
       of each dataset, its share, and the count and share of every category; downloadable). -->
  <section class="stc">
    <header class="stc-head">
      <span class="stc-icon" :style="{ '--stc-type-color': typeColor }" aria-hidden="true"><i class="fa-solid fa-list" /></span>
      <div class="stc-heading">
        <h3 class="stc-title">{{ $t('pageComparisonSingleTraitChoose') }}</h3>
        <p class="stc-text">{{ $t('pageComparisonCategoricalChooseText') }}</p>
      </div>
      <div class="stc-select">
        <GermplasmFilterSelect id="ctc-trait"
                               :options="traitOptions"
                               :value="selectedKey"
                               :placeholder="$t('pageComparisonSingleTraitPlaceholder')"
                               :loading="traitsLoading"
                               countIcon="fa-solid fa-database"
                               @select="selectTrait"
                               @clear="clearTrait" />
      </div>
    </header>

    <div class="stc-body tvs" :id="id" v-if="selected">
      <div class="tvs-loading" v-if="rowsState === 'loading'"><b-spinner small /> {{ rowsProgress || $t('tooltipTableLoadingIndicator') }}</div>
      <div class="tvs-empty stc-confirm" v-else-if="rowsState === 'confirm'">
        <p><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ $t('pageComparisonSingleTraitLarge', { count: formatNumber(rowsTotal) }) }}</p>
        <button type="button" class="tvs-values-link" @click="loadRows"><i class="fa-solid fa-download" aria-hidden="true" /> {{ $t('pageTraitDetailsStatsLoadObservations') }}</button>
      </div>
      <p class="tvs-empty" v-else-if="rowsState === 'loaded' && usedDatasets.length < 2">{{ $t('pageComparisonCategoricalTooFew') }}</p>
      <template v-else-if="rowsState === 'loaded'">
        <!-- The numbers -->
        <div class="tvs-numbers">
          <div :class="['tvs-number', { 'is-danger': number.danger }]" v-for="number in numbers" :key="`ctc-number-${number.key}`" :data-tour-number="number.key">
            <span class="tvs-number-value">{{ number.value }}</span>
            <span class="tvs-number-label">{{ number.label }}</span>
          </div>
        </div>
        <!-- The options (downloads, colours) and the help, at the right end of the strip -->
        <BaseChart :width="() => 1280"
                   :height="() => CHART_HEIGHT"
                   :supportsPngDownload="false"
                   :supportsSvgDownload="false"
                   :canChangeColors="false"
                   customLook
                   class="tvs-base"
                   ref="baseChart"
                   v-on:force-redraw="draw">
          <template slot="additionalMenuItems">
            <b-dropdown-header>{{ $t('pageComparisonCategoricalFrequency') }}</b-dropdown-header>
            <b-dropdown-item link-class="top-nav-menu-item" @click="downloadChart('frequencyChart', 'png')"><i class="fa-solid fa-image fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadPng') }}</b-dropdown-item>
            <b-dropdown-item link-class="top-nav-menu-item" @click="downloadChart('frequencyChart', 'svg')"><i class="fa-solid fa-file-code fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadSvg') }}</b-dropdown-item>
            <b-dropdown-header>{{ $t('pageComparisonCategoricalPercentage') }}</b-dropdown-header>
            <b-dropdown-item link-class="top-nav-menu-item" @click="downloadChart('percentageChart', 'png')"><i class="fa-solid fa-image fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadPng') }}</b-dropdown-item>
            <b-dropdown-item link-class="top-nav-menu-item" @click="downloadChart('percentageChart', 'svg')"><i class="fa-solid fa-file-code fa-fw" aria-hidden="true" /> {{ $t('buttonDownloadSvg') }}</b-dropdown-item>
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
            <!-- The counts of each category in each dataset -->
            <h4 class="stc-chart-title" data-tour="frequency">{{ $t('pageComparisonCategoricalFrequency') }}</h4>
            <div class="stc-chart" ref="frequencyChart" />

            <!-- The share of each category in each dataset (to 100 %) -->
            <h4 class="stc-chart-title" data-tour="percentage">{{ $t('pageComparisonCategoricalPercentage') }}</h4>
            <div class="stc-chart" ref="percentageChart" />
          </div>
        </BaseChart>
        <!-- The predominant category of each dataset: a read-only table (its tools shown, inactive), downloadable -->
        <div class="stc-summary-wrap">
          <h4 class="stc-chart-title" data-tour="predominant">{{ $t('pageComparisonCategoricalPredominant') }}</h4>
          <div class="stc-summary">
            <BaseTable :columns="summaryColumns"
                       :options="summaryOptions"
                       :getData="getSummaryData"
                       :getIds="null"
                       :downloadTable="downloadSummary"
                       toolsLocked
                       :autoHideColumns="false"
                       :storeUrlParameters="false"
                       primary-key="datasetId"
                       :key="`ctc-summary-${selectedKey}`">
              <template v-slot:cell(predominant)="data">
                <template v-if="data.item.predominant.length > 0">
                  <span class="ctc-category" v-for="category in data.item.predominant" :key="`ctc-top-${data.item.datasetId}-${category.key}`">
                    <span class="stc-swatch" :style="{ background: getCategoryColor(category.key) }" />{{ category.label }}
                  </span>
                </template>
                <template v-else>–</template>
              </template>
            </BaseTable>
          </div>
        </div>
      </template>
    </div>

    <!-- Tour explaining the numbers, the charts, the table and the options -->
    <Tour :steps="tourSteps" modernLook ref="tour" />
  </section>
</template>

<script>
import BaseChart from '@/components/charts/BaseChart'
import BaseTable from '@/components/tables/BaseTable'
import GermplasmFilterSelect from '@/components/tables/GermplasmFilterSelect'
import Tour from '@/components/util/Tour'
import traitComparison, { normalize, getCategoricalComparable } from '@/mixins/trait-comparison'
import { formatNumber, getDateTimeString } from '@/mixins/formatting'
import { downloadBlob } from '@/mixins/util'
import { makeZip } from '@/mixins/zip'

const Plotly = require('plotly.js/lib/core')
Plotly.register([
  require('plotly.js/lib/bar')
])

export default {
  components: {
    BaseChart,
    BaseTable,
    GermplasmFilterSelect,
    Tour
  },
  // The traits of the datasets, the trait chosen, its observations, the theme and the downloads
  mixins: [traitComparison],
  data: function () {
    return {
      summaryOptions: {
        idColumn: 'datasetId',
        tableName: 'comparisonCategorical'
      }
    }
  },
  computed: {
    // The categorical traits found in two datasets or more with the same name and the same categories (their ids may
    // differ): the categories in the order of the first one found, every code of every trait to its category; without
    // categories, the values themselves are the categories
    comparable: function () {
      return getCategoricalComparable(this.datasets, this.traitsByDataset)
    },
    // The list of the traits: its name (and its categories) and the number of its datasets
    traitOptions: function () {
      const named = {}
      this.comparable.forEach(o => { named[normalize(o.name)] = (named[normalize(o.name)] || 0) + 1 })
      return this.comparable.map(o => ({
        value: o.key,
        // The same name with other categories: its categories tell them apart
        name: named[normalize(o.name)] > 1 && o.domain.length > 0 ? `${o.name} (${o.domain.map(c => c.label).join(', ')})` : o.name,
        count: o.datasetIds.length
      }))
    },
    hasDomain: function () {
      return this.selected !== null && this.selected.domain.length > 0
    },
    // The categories: those of the trait in its order, else the values seen (the most frequent first); a colour each
    categories: function () {
      if (!this.selected) {
        return []
      }
      let list
      if (this.hasDomain) {
        list = this.selected.domain.map((c, index) => ({ key: `c${index}`, label: c.label }))
      } else {
        const counts = {}
        const labels = {}
        this.rows.forEach(r => {
          counts[r.category] = (counts[r.category] || 0) + 1
          labels[r.category] = labels[r.category] || r.raw
        })
        list = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || labels[a].localeCompare(labels[b])).map(key => ({ key, label: `${labels[key]}`.trim() }))
      }
      // A colour each, all different (even when the colours of the charts are fewer than the categories, or alike)
      const colors = this.getDistinctColors(list.length)
      return list.map((c, index) => Object.assign(c, { color: colors[index] }))
    },
    categoryMap: function () {
      const map = {}
      this.categories.forEach(c => { map[c.key] = c })
      return map
    },
    // Each dataset of the trait: the count of each category, the observations outside the categories, the germplasm,
    // the predominant categories (the most frequent: more than one when tied)
    datasetStats: function () {
      if (!this.selected) {
        return []
      }
      return this.selected.datasetIds.map(datasetId => {
        const rows = this.rows.filter(r => r.datasetId === datasetId)
        const inside = rows.filter(r => r.category !== null)
        const counts = {}
        this.categories.forEach(c => { counts[c.key] = 0 })
        inside.forEach(r => { counts[r.category] = (counts[r.category] || 0) + 1 })
        const n = inside.length
        const top = n > 0 ? Math.max(...Object.values(counts)) : 0
        return {
          datasetId,
          datasetName: this.datasetNames[datasetId] || `${datasetId}`,
          n,
          counts,
          outside: rows.length - n,
          germplasm: new Set(inside.map(r => r.germplasmId)).size,
          seen: Object.values(counts).filter(count => count > 0).length,
          predominant: top > 0 ? this.categories.filter(c => counts[c.key] === top) : [],
          share: n > 0 ? top / n * 100 : null
        }
      })
    },
    // The datasets compared: with observations in the categories
    usedDatasets: function () {
      return this.datasetStats.filter(d => d.n > 0)
    },
    // The germplasm with observations in two of the compared datasets or more: its predominant categories in each;
    // changing when they share none from one dataset to another
    commonGermplasm: function () {
      const used = new Set(this.usedDatasets.map(d => d.datasetId))
      const byGermplasm = {}
      this.rows.filter(r => r.category !== null && used.has(r.datasetId)).forEach(r => {
        const g = byGermplasm[r.germplasmId] = byGermplasm[r.germplasmId] || { germplasmId: r.germplasmId, counts: {} }
        const counts = g.counts[r.datasetId] = g.counts[r.datasetId] || {}
        counts[r.category] = (counts[r.category] || 0) + 1
      })
      return Object.values(byGermplasm).filter(g => Object.keys(g.counts).length > 1).map(g => {
        const tops = Object.values(g.counts).map(counts => {
          const top = Math.max(...Object.values(counts))
          return Object.keys(counts).filter(key => counts[key] === top)
        })
        const changing = tops.some(a => tops.some(b => !a.some(key => b.includes(key))))
        return Object.assign(g, { changing })
      })
    },
    numbers: function () {
      const observations = this.usedDatasets.reduce((sum, d) => sum + d.n, 0)
      const outside = this.datasetStats.reduce((sum, d) => sum + d.outside, 0)
      const seen = this.categories.filter(c => this.usedDatasets.some(d => d.counts[c.key] > 0)).length
      const numbers = [{
        key: 'datasets',
        value: `${formatNumber(this.usedDatasets.length)} / ${formatNumber(this.datasetStats.length)}`,
        label: this.$t('pageComparisonSingleTraitDatasetsCompared')
      }, {
        key: 'categories',
        value: this.hasDomain ? `${formatNumber(seen)} / ${formatNumber(this.categories.length)}` : formatNumber(seen),
        label: this.$t('pageTraitDetailsStatsCategoriesUsed')
      }, {
        key: 'observations',
        value: formatNumber(observations),
        label: this.$t('pageTraitDetailsStatsObservations')
      }, {
        key: 'germplasm',
        value: formatNumber(this.commonGermplasm.length),
        label: this.$t('pageComparisonSingleTraitCommonGermplasm')
      }]
      if (this.commonGermplasm.length > 0) {
        numbers.push({ key: 'changing', value: formatNumber(this.commonGermplasm.filter(g => g.changing).length), label: this.$t('pageComparisonCategoricalChanging') })
      }
      if (outside > 0) {
        numbers.push({ key: 'outside', danger: true, value: formatNumber(outside), label: this.$t('pageTraitDetailsStatsOutOfDomain') })
      }
      return numbers
    },
    summaryColumns: function () {
      const columns = [{
        key: 'datasetName',
        type: String,
        sortable: false,
        label: this.$t('tableColumnDatasetName')
      }, {
        key: 'n',
        type: Number,
        sortable: false,
        class: 'text-right',
        label: this.$t('pageTraitDetailsStatsObservations'),
        formatter: value => formatNumber(value)
      }, {
        key: 'germplasm',
        type: Number,
        sortable: false,
        class: 'text-right',
        label: this.$t('pageComparisonSingleTraitGermplasm'),
        formatter: value => formatNumber(value)
      }, {
        key: 'predominant',
        type: String,
        sortable: false,
        label: this.$t('pageComparisonCategoricalPredominantCategory')
      }, {
        key: 'share',
        type: Number,
        sortable: false,
        class: 'text-right',
        label: this.$t('pageComparisonCategoricalShare'),
        formatter: value => value === null ? '–' : `${this.formatFixed(value, 1)} %`
      }]
      // A column per category: its count and its share
      this.categories.forEach(c => columns.push({
        key: `category-${c.key}`,
        type: String,
        sortable: false,
        class: 'text-right',
        label: c.label,
        formatter: (value, key, item) => this.formatCount(item.counts[c.key], item.n)
      }))
      columns.push({
        key: 'outside',
        type: Number,
        sortable: false,
        class: 'text-right',
        label: this.$t('pageTraitDetailsStatsOutOfDomain'),
        formatter: value => formatNumber(value)
      })
      return columns
    },
    // The help: the numbers, the charts, the table, the options
    tourSteps: function () {
      const target = selector => () => `#${this.id} ${selector}`
      const texts = {
        datasets: this.$t('pageComparisonCategoricalTourDatasets'),
        categories: this.$t('pageComparisonCategoricalTourCategories'),
        observations: this.$t('pageComparisonCategoricalTourObservations'),
        germplasm: this.$t('pageComparisonTourGermplasm'),
        changing: this.$t('pageComparisonCategoricalTourChanging'),
        outside: this.$t('pageComparisonCategoricalTourOutside')
      }
      const steps = this.numbers.map(number => ({
        title: () => number.label,
        text: () => texts[number.key],
        target: target(`[data-tour-number="${number.key}"]`),
        position: 'bottom'
      }))
      return steps.concat([{
        title: () => this.$t('pageComparisonCategoricalFrequency'),
        text: () => this.$t('pageComparisonCategoricalTourFrequency'),
        target: target('[data-tour="frequency"]'),
        position: 'top'
      }, {
        title: () => this.$t('pageComparisonCategoricalPercentage'),
        text: () => this.$t('pageComparisonCategoricalTourPercentage'),
        target: target('[data-tour="percentage"]'),
        position: 'top'
      }, {
        title: () => this.$t('pageComparisonCategoricalPredominant'),
        text: () => this.$t('pageComparisonCategoricalTourPredominant'),
        target: target('[data-tour="predominant"]'),
        position: 'top'
      }, {
        title: () => this.$t('popoverChartTourGenericOptionsTitle'),
        text: () => this.$t('pageComparisonCategoricalTourOptions'),
        target: target('#additional-options'),
        position: 'bottom'
      }])
    }
  },
  methods: {
    // The colour of a category now (the table keeps its rows: the colours changed, the swatches follow)
    getCategoryColor: function (key) {
      return this.categoryMap[key] ? this.categoryMap[key].color : null
    },
    formatCount: function (count, total) {
      return total > 0 ? `${formatNumber(count || 0)} (${this.formatFixed((count || 0) / total * 100, 1)} %)` : '–'
    },
    // An observation: its dataset, germplasm and category (the key of its category, null when outside the categories)
    toRow: function (o) {
      const text = `${o.traitValue}`.trim()
      let category
      if (this.selected.domain.length > 0) {
        const position = this.selected.lookup[normalize(text)]
        category = position === undefined || position < 0 ? null : `c${position}`
      } else {
        category = `v:${normalize(text)}`
      }
      return { datasetId: o.datasetId, germplasmId: o.germplasmId, germplasmName: o.germplasmName, rep: o.rep, block: o.block, raw: text, category }
    },
    getSummaryData: function (request) {
      return this.getTableData(request, this.datasetStats)
    },
    // The table downloaded: a tab separated file in a zip (the counts and the shares of each category)
    downloadSummary: function (request, callback) {
      const share = value => value === null || value === undefined ? '' : `${Math.round(value * 100) / 100}`
      const header = [this.$t('tableColumnDatasetName'), this.$t('pageTraitDetailsStatsObservations'), this.$t('pageComparisonSingleTraitGermplasm'), this.$t('pageComparisonCategoricalPredominantCategory'), `${this.$t('pageComparisonCategoricalShare')} (%)`]
      this.categories.forEach(c => header.push(c.label, `${c.label} (%)`))
      header.push(this.$t('pageTraitDetailsStatsOutOfDomain'))
      const lines = [header.join('\t')].concat(this.datasetStats.map(d => {
        const line = [d.datasetName, d.n, d.germplasm, d.predominant.map(c => c.label).join(' / '), share(d.share)]
        this.categories.forEach(c => line.push(d.counts[c.key] || 0, d.n > 0 ? share((d.counts[c.key] || 0) / d.n * 100) : ''))
        line.push(d.outside)
        return line.join('\t')
      }))
      return this.resolveLater(callback, makeZip([{ name: `${this.getFileName()}-predominant.txt`, content: lines.join('\r\n') }]))
    },
    // The observations of the comparison (dataset, germplasm, rep, block, value as written, its category or none)
    downloadData: function () {
      const lines = [['dataset', 'germplasm', 'rep', 'block', 'value', 'category'].join('\t')].concat(this.rows.map(r => [
        this.datasetNames[r.datasetId] || r.datasetId,
        r.germplasmName,
        r.rep || '',
        r.block || '',
        r.raw.replace(/[\t\r\n]+/g, ' '),
        r.category === null ? '' : this.categoryMap[r.category].label
      ].join('\t')))
      downloadBlob({ blob: new Blob([lines.join('\r\n')], { type: 'text/plain' }), filename: `${this.getFileName()}-${getDateTimeString()}`, extension: 'txt' })
    },
    getFileName: function () {
      return `comparison-${this.selected ? this.selected.name.replace(/[^\w-]+/g, '_') : 'trait'}`
    },
    draw: function () {
      if (this.rowsState !== 'loaded' || this.usedDatasets.length < 2) {
        return
      }
      this.$nextTick(() => {
        this.drawBars('frequencyChart', false)
        this.drawBars('percentageChart', true)
      })
    },
    // A bar per category in each dataset: its count side by side (frequency), or its share stacked to 100 % (percentage)
    drawBars: function (ref, percent) {
      const element = this.$refs[ref]
      if (!element) {
        return
      }
      const theme = this.getTheme()
      const names = this.usedDatasets.map(d => d.datasetName)
      const data = this.categories.map(c => {
        const counts = this.usedDatasets.map(d => d.counts[c.key] || 0)
        const shares = this.usedDatasets.map((d, index) => counts[index] / d.n * 100)
        return {
          type: 'bar',
          name: c.label,
          x: names,
          y: percent ? shares : counts,
          customdata: this.usedDatasets.map((d, index) => [formatNumber(counts[index]), this.formatFixed(shares[index], 1)]),
          text: percent ? shares.map(value => value >= 5 ? `${this.formatFixed(value, 0)} %` : '') : null,
          textposition: percent ? 'inside' : 'none',
          insidetextanchor: 'middle',
          marker: { color: c.color },
          hoverlabel: theme.hoverlabel,
          hovertemplate: `<b>${c.label}</b><br>%{x}<br>%{customdata[0]} (%{customdata[1]} %)<extra></extra>`
        }
      })
      Plotly.react(element, data, this.getLayout({
        barmode: percent ? 'stack' : 'group',
        bargap: 0.25,
        showlegend: true,
        legend: { orientation: 'h', traceorder: 'normal', x: 0, y: 1.08, yanchor: 'bottom', font: { color: theme.text } },
        margin: { t: 40, r: 20, b: 40, l: 70 },
        xaxis: { type: 'category', tickfont: { color: theme.text }, automargin: true },
        yaxis: {
          title: { text: percent ? '%' : this.$t('pageTraitDetailsStatsObservations'), font: { color: theme.muted } },
          range: percent ? [0, 100] : undefined,
          gridcolor: theme.grid,
          zeroline: false,
          tickfont: { color: theme.muted }
        }
      }), { displayModeBar: false, responsive: true })
    }
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
/* The predominant categories (more than one when tied) */
.ctc-category + .ctc-category::before {
  content: '/';
  margin: 0 0.4rem;
  color: var(--cp-muted);
}
</style>
