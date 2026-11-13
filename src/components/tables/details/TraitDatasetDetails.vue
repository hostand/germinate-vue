<template>
  <!-- The datasets a trait is scored in (below its row in the traits table): one of them selected is the dataset of the
       statistics of the trait, shown selected in its datasets tab too -->
  <div class="trait-dataset-details">
    <DatasetTable :getData="getData"
                  selectable
                  selectionMode="single"
                  :allowEditing="false"
                  :storeUrlParameters="false"
                  @selection-changed="datasetSelected"
                  @data-changed="restoreSelection"
                  ref="datasetTable" />
  </div>
</template>

<script>
import { apiPostTraitDatasetTable } from '@/mixins/api/trait'
import { getTraitDataset, setTraitDataset } from '@/mixins/trait-dataset-selection'

export default {
  props: {
    traitId: {
      type: Number,
      required: true
    }
  },
  components: {
    // Loaded when a row is expanded (the dataset table is large)
    DatasetTable: () => import('@/components/tables/DatasetTable')
  },
  data: function () {
    return {
      // The dataset selected before (kept for the trait), selected in the table once its rows arrived
      pendingDatasetId: getTraitDataset(this.traitId)
    }
  },
  computed: {
    storedDatasetId: function () {
      return getTraitDataset(this.traitId)
    }
  },
  watch: {
    // Another dataset selected in the datasets tab of the trait while this row is open
    storedDatasetId: function (newValue) {
      const baseTable = this.$refs.datasetTable && this.$refs.datasetTable.$refs.datasetTable
      if (this.pendingDatasetId !== null || !baseTable) {
        return
      }
      const current = baseTable.selectedItems.length > 0 ? baseTable.selectedItems[0] : null
      if (current !== newValue) {
        baseTable.setSelectedItems(newValue === null ? [] : [newValue])
      }
    }
  },
  methods: {
    getData: function (data, callback) {
      return apiPostTraitDatasetTable(this.traitId, data, callback)
    },
    restoreSelection: function (request, result) {
      if (this.pendingDatasetId === null) {
        return
      }
      const datasetId = this.pendingDatasetId
      this.pendingDatasetId = null
      const rows = (result && result.data) || []
      const baseTable = this.$refs.datasetTable && this.$refs.datasetTable.$refs.datasetTable
      if (baseTable && rows.some(row => row.datasetId === datasetId)) {
        baseTable.setSelectedItems([datasetId])
      }
    },
    datasetSelected: function (selected) {
      // The selection emptied when the table loads does not replace the one kept
      if (this.pendingDatasetId !== null) {
        return
      }
      setTraitDataset(this.traitId, selected && selected.length > 0 ? selected[0] : null)
    }
  }
}
</script>

<style scoped>
.trait-dataset-details {
  padding: 0.5rem 0.25rem;
}
</style>
