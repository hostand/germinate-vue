<template>
  <!-- The values of a trait (value, count, share), from a list in memory: filtered, sorted and paged here, in the new look
       of the tables. A value clicked: value-clicked. -->
  <BaseTable :options="options"
             :columns="columns"
             :getData="getData"
             :storeUrlParameters="false"
             :autoHideColumns="false"
             :tableActions="tableActions"
             ref="traitValueTable">
    <template v-slot:cell(value)="data">
      <a href="#" @click.prevent="$emit('value-clicked', data.item.value)">{{ data.item.value }}</a>
    </template>
    <template v-slot:cell(count)="data">
      <span>{{ formatNumber(data.item.count) }}</span>
    </template>
    <!-- The share: a small bar and the percentage -->
    <template v-slot:cell(share)="data">
      <span class="tvt-share">
        <span class="tvt-share-bar"><span :style="{ width: `${Math.max(1, data.item.share)}%`, background: barColor }" /></span>
        <span class="tvt-share-text">{{ formatShare(data.item.share) }}</span>
      </span>
    </template>
  </BaseTable>
</template>

<script>
import BaseTable from '@/components/tables/BaseTable'
import { formatNumber } from '@/mixins/formatting'

// The comparators of the table filter, on the values in memory
const matches = (row, filter) => {
  const raw = row[filter.column]
  const values = filter.values || []
  const text = `${raw === null || raw === undefined ? '' : raw}`.toLowerCase()
  const first = values[0]
  const number = v => +v
  switch (filter.comparator) {
    case 'contains':
      return text.includes(`${first || ''}`.toLowerCase())
    case 'equals':
      return typeof raw === 'number' ? raw === number(first) : text === `${first || ''}`.toLowerCase()
    case 'isNull':
      return raw === null || raw === undefined || text === ''
    case 'isNotNull':
      return !(raw === null || raw === undefined || text === '')
    case 'between':
      return number(raw) >= number(values[0]) && number(raw) <= number(values[1])
    case 'greaterThan':
      return number(raw) > number(first)
    case 'greaterOrEquals':
      return number(raw) >= number(first)
    case 'lessThan':
      return number(raw) < number(first)
    case 'lessOrEquals':
      return number(raw) <= number(first)
    case 'inSet':
      return values.map(v => `${v}`.toLowerCase()).includes(text)
    default:
      return true
  }
}

export default {
  components: {
    BaseTable
  },
  props: {
    // { value, count }
    values: {
      type: Array,
      default: () => []
    },
    // Buttons at the bottom left of the table (as those of the other tables)
    tableActions: {
      type: Array,
      default: null
    },
    // The colour of the bars of the chart (the share bars)
    barColor: {
      type: String,
      default: null
    }
  },
  data: function () {
    return {
      options: {
        idColumn: 'value',
        tableName: 'traitValues'
      }
    }
  },
  computed: {
    total: function () {
      return this.values.reduce((sum, v) => sum + v.count, 0)
    },
    rows: function () {
      return this.values.map(v => ({
        value: v.value,
        count: v.count,
        share: this.total > 0 ? (v.count / this.total) * 100 : 0
      }))
    },
    columns: function () {
      return [{
        key: 'value',
        type: String,
        sortable: true,
        label: this.$t('tableColumnTrialsDataTraitValue')
      }, {
        key: 'count',
        type: Number,
        sortable: true,
        class: 'text-right',
        label: this.$t('genericCount')
      }, {
        key: 'share',
        type: Number,
        sortable: true,
        label: this.$t('tableColumnTraitValueShare')
      }]
    }
  },
  watch: {
    values: function () {
      if (this.$refs.traitValueTable) {
        this.$refs.traitValueTable.refresh()
      }
    }
  },
  methods: {
    formatNumber,
    formatShare: function (share) {
      return `${share < 0.1 && share > 0 ? '<0.1' : (Math.round(share * 10) / 10).toLocaleString()} %`
    },
    // The page of the request (filter, sort, page) from the rows in memory, as the server would answer it
    getData: function (request) {
      let rows = this.rows.slice()

      // The filter: its conditions joined by their operators, from left to right
      const filter = request.filter || []
      if (filter.length > 0) {
        rows = rows.filter(row => filter.reduce((result, f, index) => {
          const match = matches(row, f)
          if (index === 0) {
            return match
          }
          return filter[index - 1].operator === 'or' ? (result || match) : (result && match)
        }, true))
      }

      // The order: the column clicked, else the most frequent first
      const orderBy = request.orderBy || 'count'
      const ascending = request.orderBy ? request.ascending === 1 : false
      rows.sort((a, b) => {
        const x = a[orderBy]
        const y = b[orderBy]
        const result = typeof x === 'number' ? x - y : `${x}`.localeCompare(`${y}`, undefined, { numeric: true, sensitivity: 'base' })
        return (ascending ? result : -result) || `${a.value}`.localeCompare(`${b.value}`)
      })

      const limit = request.limit || 10
      const page = request.page || 1
      // As the requests to the server: the page counted from 0 in the request (the table reads it back for its count)
      request.page = page - 1
      const start = Math.max(0, (page - 1) * limit)
      return Promise.resolve({
        data: {
          data: rows.slice(start, start + limit),
          count: rows.length
        }
      })
    }
  }
}
</script>

<style scoped>
.tvt-share {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  white-space: nowrap;
}
.tvt-share-bar {
  display: inline-block;
  width: 90px;
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--bt-neutral-bg, rgba(0, 0, 0, 0.08));
}
.tvt-share-bar > span {
  display: block;
  height: 100%;
  border-radius: 999px;
}
.tvt-share-text {
  min-width: 3.5rem;
  color: var(--bt-text-subtle);
  font-variant-numeric: tabular-nums;
}
</style>
