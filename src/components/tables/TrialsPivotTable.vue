<template>
  <!-- The trials data pivoted (the trials export, its Tabular tab): a row per germplasm, dataset, rep and block, a
       column per trait (its name, cut when long; numeric traits with a unit: "name (unit)"), a value per cell: a group
       with several observations of a trait takes as many rows as its trait with the most of them (the first observation
       of each trait in the first row, the second in the second, ...; none left: blank). Built in the browser from every observation
       of the table it comes from (its filters included), loaded in pages; very many: once confirmed. Paged and sorted in
       the browser; the columns of the row (germplasm, dataset, rep, block) stay while the traits scroll sideways. At the
       bottom: the download of the pivoted table (a zip) and the button back to the normal table. -->
  <div :class="['tpt', `is-${kind}`]" :style="stickyStyle">
    <div class="tpt-confirm" v-if="state === 'confirm'">
      <p><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ $t('pageTrialsPivotLarge', { count: formatNumber(total) }) }}</p>
      <div class="tpt-confirm-buttons">
        <button type="button" class="tpt-button" @click="$emit('close')"><MdiIcon :path="mdiTable" /> {{ $t('pageTrialsPivotBack') }}</button>
        <button type="button" class="tpt-button is-primary" @click="load"><MdiIcon :path="mdiTablePivot" /> {{ $t('pageTrialsPivotLoad') }}</button>
      </div>
    </div>
    <!-- Counting the observations (very many: a confirmation first) -->
    <div class="tpt-checking" v-else-if="state === 'checking'"><b-spinner small /> {{ $t('tooltipTableLoadingIndicator') }}</div>
    <BaseTable :columns="columns"
               :options="options"
               :getData="getData"
               :getIds="null"
               :downloadTable="downloadPivot"
               :tableActions="tableActions"
               :autoHideColumns="false"
               :storeUrlParameters="false"
               :busyText="busyText"
               :filterNote="datasetName ? $t('pageTrialsPivotFilterNote', { name: datasetName }) : null"
               primary-key="pivotKey"
               class="tpt-table"
               ref="table"
               @data-changed="placeStickyColumns"
               v-else>
      <!-- The germplasm: the preview of its passport, its name -->
      <template v-slot:cell(germplasmName)="data">
        <span v-if="kind === 'climate'"><i :class="`fi fi-${data.item.countryCode2.toLowerCase()}`" v-if="data.item.countryCode2" /> {{ data.item.germplasmName }}</span>
        <GermplasmNameCell :germplasmId="data.item.germplasmId" :name="`${data.item.germplasmName}`" :link="false" v-else-if="data.item.germplasmId" />
        <span v-else>{{ data.item.germplasmName }}</span>
      </template>
      <template v-slot:cell(datasetName)="data">
        <span :title="data.item.datasetName">{{ data.item.datasetName }}</span>
      </template>
      <!-- The other cells: a value of a trait opens its details ("trait-clicked"), the rest as it is -->
      <template v-slot:cell()="data">
        <button type="button" class="tdt-trait-link" :title="traitByKey[data.field.key].title" @click="$emit('trait-clicked', { traitId: traitByKey[data.field.key].traitId, traitName: traitByKey[data.field.key].name, traitDataType: traitByKey[data.field.key].dataType })" v-if="traitByKey[data.field.key] && data.value !== undefined && data.value !== null && `${data.value}` !== ''">{{ data.value }}</button>
        <template v-else>{{ data.value }}</template>
      </template>
    </BaseTable>
  </div>
</template>

<script>
import BaseTable from '@/components/tables/BaseTable'
import GermplasmNameCell from '@/components/germplasm/GermplasmNameCell'
import MdiIcon from '@/components/icons/MdiIcon'
import { formatNumber, getDateTimeString } from '@/mixins/formatting'
import { makeZip } from '@/mixins/zip'
import { mdiTable, mdiTablePivot } from '@mdi/js'

// Every observation loaded in pages of this many; above PIVOT_CONFIRM observations: once confirmed
const ROWS_PAGE = 10000
const PIVOT_CONFIRM = 50000
// The name of a trait in the head of its column: cut beyond this many characters (the whole name in its tooltip)
const TRAIT_LABEL_LENGTH = 24

export default {
  components: {
    BaseTable,
    GermplasmNameCell,
    MdiIcon
  },
  props: {
    // The observations of a page of the table pivoted: loadPage({ page (from 1), limit }) → Promise of { data, count }
    loadPage: {
      type: Function,
      required: true
    },
    // The traits of the data: { traitId, traitName, dataType, unitAbbreviation }
    traits: {
      type: Array,
      default: () => []
    },
    // The name of the dataset pivoted: at the start of the line of the filters ("Pivoted 'name'")
    datasetName: {
      type: String,
      default: null
    },
    // trial (a row per germplasm, dataset, rep and block) or climate (a row per location, dataset and recording date;
    // the traits are the climates)
    kind: {
      type: String,
      default: 'trial'
    }
  },
  data: function () {
    return {
      mdiTable,
      mdiTablePivot,
      // checking (counting), confirm (very many: loaded once confirmed), none (to load), loading, loaded
      state: 'checking',
      total: 0,
      // The pivoted rows and the traits found in the data (their columns)
      rows: [],
      traitColumns: [],
      // Where each column of the row starts (px from the left of the table): CSS variables of the fixed columns
      stickyLefts: [0, 0, 0, 0],
      // The progress of the loading (many observations), in the loading row of the table
      busyText: null,
      // The rows shown last (filtered and sorted) and their filter and order
      shownRows: null,
      shownKey: null,
      options: {
        idColumn: 'pivotKey',
        tableName: this.kind === 'climate' ? 'climatePivot' : 'trialsPivot'
      }
    }
  },
  computed: {
    stickyStyle: function () {
      const style = {}
      this.stickyLefts.forEach((left, index) => { style[`--tpt-left-${index}`] = `${left}px` })
      return style
    },
    // The trait of each of its columns
    traitByKey: function () {
      const map = {}
      this.traitColumns.forEach(c => { map[c.key] = c })
      return map
    },
    // The columns of a row (the grouping): they stay while the traits scroll sideways (each after the ones before it).
    // Climate: the location, the dataset and the recording date (kept in rep)
    groupColumns: function () {
      if (this.kind === 'climate') {
        return [
          { key: 'germplasmName', type: String, label: this.$t('tableColumnLocationName') },
          { key: 'datasetName', type: String, label: this.$t('tableColumnDatasetName') },
          { key: 'rep', type: Date, label: this.$t('tableColumnClimateDataRecordingDate') }
        ]
      }
      return [
        { key: 'germplasmName', type: String, label: this.$t('tableColumnGermplasmName') },
        { key: 'datasetName', type: String, label: this.$t('tableColumnDatasetName') },
        { key: 'rep', type: String, label: this.$t('tableColumnTraitRep') },
        { key: 'block', type: String, label: this.$t('tableColumnTraitBlock') }
      ]
    },
    columns: function () {
      return this.groupColumns.map(c => ({ key: c.key, type: c.type, sortable: true, label: c.label })).concat(this.traitColumns.map(c => ({
        key: c.key,
        // Filtered as numbers or dates (numeric and date traits), else as text
        type: c.dataType === 'numeric' ? Number : (c.dataType === 'date' ? Date : String),
        sortable: true,
        label: c.label,
        thAttr: { title: c.title }
      })))
    },
    // At the bottom of the table: back to the normal table
    tableActions: function () {
      return [{
        id: 'pivot',
        text: this.$t('pageTrialsPivotBack'),
        path: mdiTable,
        active: () => true,
        disabled: () => false,
        callback: () => this.$emit('close')
      }]
    }
  },
  methods: {
    formatNumber,
    // The rows of a page of the pivot (the table asks for them): every observation first loaded and pivoted
    getData: function (request) {
      // The page counted from 0 in the request afterwards, as the requests to the server do (the table shows "from – to"
      // from it)
      const index = request.page - 1
      request.page = index
      const page = () => {
        const sorted = this.getShownRows(request.filter, request.orderBy, request.ascending)
        const start = index * request.limit
        return { data: { data: sorted.slice(start, start + request.limit), count: sorted.length } }
      }
      if (this.state === 'loaded') {
        return Promise.resolve(page())
      }
      return this.loadAll().then(page)
    },
    // How many observations there are: very many, the pivot waits for a confirmation; else it is built
    prepare: function () {
      this.loadPage({ page: 1, limit: 1 }).then(result => {
        this.total = result && result.count ? result.count : 0
        this.state = this.total > PIVOT_CONFIRM ? 'confirm' : 'none'
      })
    },
    load: function () {
      this.state = 'none'
    },
    // Every observation, in pages (their progress in the loading row of the table), then pivoted
    loadAll: function () {
      this.state = 'loading'
      const observations = []
      const next = page => this.loadPage({ page, limit: ROWS_PAGE }).then(result => {
        const data = (result && result.data) || []
        observations.push(...data)
        const total = result && result.count >= 0 ? result.count : 0
        if (total > ROWS_PAGE) {
          this.busyText = this.$t('pageTraitDetailsStatsLoadingProgress', { loaded: formatNumber(observations.length), total: formatNumber(total) })
        }
        return data.length === ROWS_PAGE && observations.length < total ? next(page + 1) : observations
      })
      return next(1).then(all => {
        this.pivot(all)
        this.busyText = null
        this.state = 'loaded'
      })
    },
    // The rows of the table: filtered by the filter of the table (its conditions joined by their operator, in order)
    // and sorted; the last ones kept (the other pages of the same filter and order)
    getShownRows: function (filter, orderBy, ascending) {
      const key = JSON.stringify([filter || [], orderBy, ascending])
      if (this.shownKey === key && this.shownRows) {
        return this.shownRows
      }
      const conditions = (filter || []).filter(f => f && f.column)
      const rows = conditions.length > 0 ? this.rows.filter(row => this.matchesFilter(row, conditions)) : this.rows
      this.shownRows = Object.freeze(this.sortRows(orderBy, ascending, rows))
      this.shownKey = key
      return this.shownRows
    },
    matchesFilter: function (row, conditions) {
      let result = null
      conditions.forEach(f => {
        const match = this.matchesCondition(row[f.column], f)
        result = result === null ? match : (`${f.operator}`.toLowerCase() === 'or' ? result || match : result && match)
      })
      return result !== false
    },
    // A value of a cell against a condition of the filter (numbers compared as numbers, dates and text as text, case
    // ignored)
    matchesCondition: function (cell, f) {
      const empty = cell === undefined || cell === null || `${cell}`.trim() === ''
      if (f.comparator === 'isNull') {
        return empty
      }
      if (f.comparator === 'isNotNull') {
        return !empty
      }
      if (empty) {
        return false
      }
      const values = (f.values || []).filter(v => v !== undefined && v !== null && `${v}` !== '')
      const isNumber = v => `${v}`.trim() !== '' && isFinite(v)
      const compare = (a, b) => isNumber(a) && isNumber(b) ? (+a - +b) : `${a}`.toLowerCase().localeCompare(`${b}`.toLowerCase(), undefined, { numeric: true })
      const text = `${cell}`.toLowerCase()
      switch (f.comparator) {
        case 'contains': return values.some(v => text.includes(`${v}`.toLowerCase()))
        case 'inSet': return values.flatMap(v => `${v}`.split(',')).some(v => compare(cell, v.trim()) === 0)
        case 'between': return values.length > 1 && compare(cell, values[0]) >= 0 && compare(cell, values[1]) <= 0
        case 'greaterThan': return compare(cell, values[0]) > 0
        case 'greaterOrEquals': return compare(cell, values[0]) >= 0
        case 'lessThan': return compare(cell, values[0]) < 0
        case 'lessOrEquals': return compare(cell, values[0]) <= 0
        case 'equals': return values.length < 1 || compare(cell, values[0]) === 0
        default: return true
      }
    },
    // A row per germplasm, dataset, rep and block; a column per trait (in the order of their names)
    // A row per germplasm, dataset, rep and block, a column per trait (in the order of their names), one value per
    // cell: a group with several observations of a trait gets as many rows as its trait with the most observations
    // (each trait's observations in order of their recording date, plot row and column: the i-th of each in row i)
    // An observation of the climate data as one of the trials: the location as the germplasm (its name and country), the
    // recording date as the rep, the climate as the trait
    asTrial: function (o) {
      const day = o.recordingDate ? `${o.recordingDate}`.substring(0, 10) : ''
      return {
        germplasmId: o.locationId,
        germplasmName: o.countryCode3 ? `${o.locationName} (${o.countryCode3})` : `${o.locationName}`,
        countryCode2: o.countryCode2 || null,
        datasetId: o.datasetId,
        datasetName: o.datasetName,
        rep: day,
        block: '',
        traitId: o.climateId,
        traitName: o.climateName,
        traitDataType: o.climateDataType,
        traitValue: o.climateValue,
        recordingDate: day
      }
    },
    pivot: function (source) {
      const observations = this.kind === 'climate' ? source.map(o => this.asTrial(o)) : source
      const byTrait = {}
      this.traits.forEach(t => { byTrait[t.traitId] = t })
      const groups = {}
      const order = []
      const traits = {}
      observations.forEach((o, index) => {
        const key = [o.germplasmId, o.datasetId, o.rep || '', o.block || ''].join('\u0000')
        let group = groups[key]
        if (!group) {
          group = groups[key] = {
            key,
            germplasmId: o.germplasmId,
            germplasmName: o.germplasmName,
            countryCode2: o.countryCode2 || null,
            datasetName: o.datasetName,
            rep: o.rep || '',
            block: o.block || '',
            values: {}
          }
          order.push(group)
        }
        const column = `trait${o.traitId}`
        if (!traits[o.traitId]) {
          const trait = byTrait[o.traitId] || {}
          const name = o.traitName || trait.traitName || `${o.traitId}`
          const unit = (o.traitDataType || trait.dataType) === 'numeric' && trait.unitAbbreviation ? ` (${trait.unitAbbreviation})` : ''
          const cut = name.length > TRAIT_LABEL_LENGTH ? `${name.substring(0, TRAIT_LABEL_LENGTH).trim()}…` : name
          traits[o.traitId] = { key: column, traitId: o.traitId, name, label: cut + unit, title: name + unit, full: name + unit, dataType: o.traitDataType || trait.dataType }
        }
        const value = o.traitValue === null || o.traitValue === undefined ? '' : `${o.traitValue}`
        if (value !== '') {
          (group.values[column] = group.values[column] || []).push({ value, date: o.recordingDate || '', row: +o.trialRow || 0, column: +o.trialColumn || 0, index })
        }
      })
      const sortKey = (a, b) => `${a.date}`.localeCompare(`${b.date}`) || a.row - b.row || a.column - b.column || a.index - b.index
      const rows = []
      order.forEach(group => {
        const columns = Object.keys(group.values)
        columns.forEach(column => group.values[column].sort(sortKey))
        const count = Math.max(1, ...columns.map(column => group.values[column].length))
        for (let i = 0; i < count; i++) {
          const row = {
            pivotKey: `${group.key}\u0000${i}`,
            germplasmId: group.germplasmId,
            germplasmName: group.germplasmName,
            countryCode2: group.countryCode2,
            datasetName: group.datasetName,
            rep: group.rep,
            block: group.block
          }
          columns.forEach(column => {
            const observation = group.values[column][i]
            if (observation) {
              row[column] = observation.value
            }
          })
          rows.push(row)
        }
      })
      this.traitColumns = Object.values(traits).sort((a, b) => a.name.localeCompare(b.name))
      this.rows = Object.freeze(rows)
      this.shownRows = null
      this.shownKey = null
    },
    // The rows in the order asked (numbers as numbers, empty values last)
    sortRows: function (orderBy, ascending, source) {
      const rows = (source || this.rows).slice()
      const key = orderBy || 'germplasmName'
      const direction = orderBy && ascending === 0 ? -1 : 1
      const number = value => value !== undefined && value !== '' && isFinite(value) ? +value : null
      rows.sort((a, b) => {
        const x = a[key]
        const y = b[key]
        if (x === undefined || x === '') {
          return y === undefined || y === '' ? 0 : 1
        }
        if (y === undefined || y === '') {
          return -1
        }
        const nx = number(x)
        const ny = number(y)
        const result = nx !== null && ny !== null ? nx - ny : `${x}`.localeCompare(`${y}`, undefined, { numeric: true })
        return result * direction
      })
      return rows
    },
    // The download: the pivoted table (all its rows, the whole names of the traits) as a tab separated file in a zip
    downloadPivot: function (request, callback) {
      const columns = this.groupColumns.map(c => ({ key: c.key, full: c.label })).concat(this.traitColumns)
      const clean = value => `${value === undefined || value === null ? '' : value}`.replace(/[\t\r\n]+/g, ' ')
      const lines = [columns.map(c => clean(c.full)).join('\t')].concat(this.getShownRows(request.filter, request.orderBy, request.ascending).map(row => columns.map(c => clean(row[c.key])).join('\t')))
      const zip = makeZip([{ name: `${this.kind === 'climate' ? 'climate' : 'trials'}-pivot-${getDateTimeString()}.txt`, content: lines.join('\r\n') }])
      // Given back after this call (as a request to the server would)
      return new Promise(resolve => setTimeout(() => {
        callback(zip)
        resolve()
      }, 0))
    },
    // The columns of the row stay while the traits scroll: each one after the ones before it. Measured once the rows
    // are drawn (their widths), again after a page, a sort or a resize
    placeStickyColumns: function () {
      this.$nextTick(() => requestAnimationFrame(() => {
        const table = this.$el && this.$el.querySelector ? this.$el.querySelector('table') : null
        if (!table) {
          return
        }
        let left = 0
        this.stickyLefts = this.groupColumns.map(c => c.key).map(key => {
          const head = table.querySelector(`thead th.bt-col-${key}`)
          const start = left
          left += head ? head.getBoundingClientRect().width : 0
          return start
        })
      }))
    }
  },
  mounted: function () {
    this.prepare()
    window.addEventListener('resize', this.placeStickyColumns)
  },
  beforeDestroy: function () {
    window.removeEventListener('resize', this.placeStickyColumns)
  }
}
</script>

<style scoped>
.tpt-confirm {
  padding: 2rem 1.25rem;
  border: 1px solid var(--cp-border);
  border-radius: 16px;
  background: var(--cp-surface);
  color: var(--cp-muted);
  text-align: center;
}
.tpt-checking {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 2rem 1rem;
  border: 1px solid var(--cp-border);
  border-radius: 16px;
  background: var(--cp-surface);
  color: var(--cp-muted);
  font-size: 0.9rem;
}
.tpt-checking .spinner-border {
  color: var(--cp-green);
}
.tpt-confirm-buttons {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}
.tpt-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--cp-border);
  border-radius: 10px;
  background: var(--cp-surface);
  color: var(--cp-text);
  font-weight: 600;
  cursor: pointer;
}
.tpt-button.is-primary {
  border-color: transparent;
  background: var(--cp-button);
  color: var(--cp-on-button);
}
.tpt-button >>> svg {
  width: 1.1rem;
  height: 1.1rem;
  fill: currentColor;
}
/* The lines of the table drawn by each cell (not shared between cells): the fixed cells keep theirs, opaque, while the
   traits pass below them */
.tpt-table >>> table.table {
  border-collapse: separate;
  border-spacing: 0;
}
/* The columns of the row (head and body): fixed while the traits pass below them, each after the ones before it; a
   line after the last one */
.tpt-table >>> .bt-col-germplasmName,
.tpt-table >>> .bt-col-datasetName,
.tpt-table >>> .bt-col-rep,
.tpt-table >>> .bt-col-block {
  position: sticky !important;
  z-index: 2;
  background: var(--bt-surface, #ffffff);
}
.tpt-table >>> thead .bt-col-germplasmName,
.tpt-table >>> thead .bt-col-datasetName,
.tpt-table >>> thead .bt-col-rep,
.tpt-table >>> thead .bt-col-block {
  z-index: 3;
  background: var(--bt-head-bg, #f7f7f5);
}
.tpt-table >>> .bt-col-germplasmName {
  left: var(--tpt-left-0);
}
.tpt-table >>> .bt-col-datasetName {
  left: var(--tpt-left-1);
}
.tpt-table >>> .bt-col-rep {
  left: var(--tpt-left-2);
}
.tpt-table >>> .bt-col-block {
  left: var(--tpt-left-3);
  box-shadow: inset -1px 0 0 var(--bt-border, #e2e3df);
}
/* Climate: the recording date is the last fixed column (its line) */
.tpt.is-climate .tpt-table >>> .bt-col-rep {
  box-shadow: inset -1px 0 0 var(--bt-border, #e2e3df);
}
/* The row under the mouse: its fixed columns too */
.tpt-table >>> tbody tr:hover > .bt-col-germplasmName,
.tpt-table >>> tbody tr:hover > .bt-col-datasetName,
.tpt-table >>> tbody tr:hover > .bt-col-rep,
.tpt-table >>> tbody tr:hover > .bt-col-block {
  background: var(--bt-row-hover, #f6f9f4);
}
/* Every cell on one line (the table scrolls sideways): the heads (cut names, the whole one in their tooltip) and the
   values */
.tpt-table >>> thead th,
.tpt-table >>> tbody td {
  white-space: nowrap;
}
</style>
