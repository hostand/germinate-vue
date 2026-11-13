<template>
  <!-- The datasets of a filter: a dropdown with the list of the datasets (a page at a time when there are many), several
       of them ticked. The list placed on the window (fixed): over the edges of the modal, above the field without room
       below it -->
  <b-dropdown class="dfi"
              toggle-class="dfi-toggle"
              menu-class="dfi-menu"
              variant="link"
              block
              boundary="window"
              :popper-opts="{ positionFixed: true }"
              @show="onShow">
    <template #button-content>
      <span :class="['dfi-toggle-text', { 'is-empty': value.length === 0 }]">{{ toggleText }}</span>
    </template>
    <b-dropdown-form form-class="dfi-form">
      <div class="dfi-message" v-if="loading && datasets.length === 0"><b-spinner small /></div>
      <div class="dfi-message" v-else-if="datasets.length === 0">{{ $t('tableFilterDatasetsNone') }}</div>
      <template v-else>
        <b-form-checkbox v-for="dataset in datasets"
                         :key="`dfi-dataset-${dataset.datasetId}`"
                         class="dfi-item"
                         :checked="value.includes(dataset.datasetId)"
                         @change="toggle(dataset, $event)">
          <span class="dfi-item-name" :title="dataset.datasetName">{{ dataset.datasetName }}</span>
        </b-form-checkbox>
      </template>
      <!-- More datasets than a page: the pages -->
      <div class="dfi-pages" v-if="count > LIMIT">
        <button type="button" class="dfi-page" :disabled="page <= 1 || loading" @click="load(page - 1)" :aria-label="$t('tableFilterDatasetsPreviousPage')"><i class="fa-solid fa-chevron-left" aria-hidden="true" /></button>
        <span class="dfi-pages-text">{{ (page - 1) * LIMIT + 1 }}–{{ Math.min(page * LIMIT, count) }} / {{ count }}</span>
        <button type="button" class="dfi-page" :disabled="page >= maxPage || loading" @click="load(page + 1)" :aria-label="$t('tableFilterDatasetsNextPage')"><i class="fa-solid fa-chevron-right" aria-hidden="true" /></button>
      </div>
    </b-dropdown-form>
  </b-dropdown>
</template>

<script>
import { apiPostDatasetTable } from '@/mixins/api/dataset'
import { getDatasetName, setDatasetName, loadDatasetNames } from '@/mixins/dataset-names'

// Datasets on a page of the list
const LIMIT = 8

export default {
  props: {
    // The ids of the datasets ticked
    value: {
      type: Array,
      default: () => []
    },
    // Only datasets of this type (e.g. 'trials' for the traits)
    datasetType: {
      type: String,
      default: null
    }
  },
  data: function () {
    return {
      LIMIT,
      datasets: [],
      count: 0,
      page: 1,
      loading: false,
      loaded: false,
      requestId: 0
    }
  },
  computed: {
    maxPage: function () {
      return Math.max(1, Math.ceil(this.count / LIMIT))
    },
    // None: what to do; one: its name; more: how many
    toggleText: function () {
      if (this.value.length === 0) {
        return this.$t('tableFilterDatasetsPlaceholder')
      } else if (this.value.length === 1) {
        return getDatasetName(this.value[0]) || `#${this.value[0]}`
      } else {
        return this.$t('tableFilterDatasetsSelected', { count: this.value.length })
      }
    }
  },
  watch: {
    value: {
      immediate: true,
      handler: function (newValue) {
        loadDatasetNames(newValue)
      }
    }
  },
  methods: {
    // The list loaded when the dropdown opens the first time
    onShow: function () {
      if (!this.loaded) {
        this.load(1)
      }
    },
    load: function (page) {
      const id = ++this.requestId
      this.loading = true
      const filter = this.datasetType ? [{ column: 'datasetType', comparator: 'equals', operator: 'and', values: [this.datasetType] }] : []
      apiPostDatasetTable({
        page,
        limit: LIMIT,
        orderBy: 'datasetName',
        ascending: 1,
        filter
      }, result => {
        if (id !== this.requestId) {
          return
        }
        const datasets = (result && result.data) || []
        datasets.forEach(dataset => setDatasetName(dataset.datasetId, dataset.datasetName))
        this.datasets = datasets
        this.count = (result && result.count) || 0
        this.page = page
        this.loading = false
        this.loaded = true
      }, {
        codes: [],
        callback: () => {
          if (id === this.requestId) {
            this.loading = false
          }
        }
      })
    },
    toggle: function (dataset, checked) {
      if (checked && !this.value.includes(dataset.datasetId)) {
        this.$emit('input', this.value.concat([dataset.datasetId]))
      } else if (!checked) {
        this.$emit('input', this.value.filter(v => v !== dataset.datasetId))
      }
    }
  }
}
</script>

<style scoped>
.dfi {
  flex: 1 1 auto;
  min-width: 0;
}
/* The button as the other fields of the filter: the text on the left, the caret of the dropdowns on the right */
.dfi >>> .dfi-toggle {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  text-align: left;
  text-decoration: none;
}
.dfi-toggle-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dfi-toggle-text.is-empty {
  color: var(--cp-muted, #6b6f6c);
  font-weight: 400;
}
.dfi >>> .dfi-menu {
  width: 100%;
  min-width: 18rem;
  padding: 0.3rem 0;
}
.dfi >>> .dfi-form {
  padding: 0.2rem 0.5rem;
}
.dfi-item {
  display: flex;
  align-items: center;
  margin: 0;
  padding: 0.35rem 0.4rem 0.35rem 2rem;
  border-radius: 8px;
}
.dfi-item:hover {
  background: var(--cp-surface-hover, #f2f3f0);
}
.dfi-item >>> .custom-control-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  cursor: pointer;
}
.dfi-item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dfi-message {
  padding: 0.5rem 0.4rem;
  color: var(--cp-muted, #6b6f6c);
}
.dfi-pages {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.3rem;
  padding-top: 0.4rem;
  border-top: 1px solid var(--cp-border, #e2e3df);
}
.dfi-pages-text {
  color: var(--cp-muted, #6b6f6c);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}
.dfi-page {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--cp-border, #e2e3df);
  border-radius: 8px;
  background: var(--cp-surface, #fff);
  color: var(--cp-text, #1f2421);
  font-size: 0.7rem;
  cursor: pointer;
}
.dfi-page:disabled {
  opacity: 0.45;
  cursor: default;
}
</style>
