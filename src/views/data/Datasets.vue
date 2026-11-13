<template>
  <!-- Datasets in the look of the custom pages: the internal datasets in the first tab, the external ones in the second.
       Internal / external is part of the request of each table, not one of its filters (no filter shown for it). -->
  <div class="custom-page datasets-page">
    <header class="cp-page-header">
      <h1 class="cp-page-title">{{ $t('pageDatasetsTitle') }}</h1>
    </header>

    <b-tabs class="ds-tabs" nav-class="ds-tabs-nav" @activate-tab="closeMenus">
      <!-- Internal datasets: held in Germinate -->
      <b-tab>
        <template #title><i class="fa-solid fa-database ds-tab-icon" aria-hidden="true" />{{ $t('datasetMenuInternal') }}</template>
        <div class="ds-tab-panel">
          <DatasetTable :getData="getInternalData" :filterOn="filterOn" ref="internalTable" />
        </div>
      </b-tab>

      <!-- External datasets: held elsewhere (loaded when the tab is opened) -->
      <b-tab lazy>
        <template #title><i class="fa-solid fa-arrow-up-right-from-square ds-tab-icon" aria-hidden="true" />{{ $t('datasetMenuExternal') }}</template>
        <div class="ds-tab-panel">
          <DatasetTable :getData="getExternalData" :filterOn="filterOn" external ref="externalTable" />
        </div>
      </b-tab>
    </b-tabs>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import DatasetTable from '@/components/tables/DatasetTable'
import { apiPostDatasetTable } from '@/mixins/api/dataset.js'

export default {
  data: function () {
    return {
      datasetId: null
    }
  },
  components: {
    DatasetTable
  },
  computed: {
    ...mapGetters([
      'storeSelectedProjects'
    ]),
    // The filters shown by the tables: the dataset of the address, the selected projects
    filterOn: function () {
      const filter = []

      if (this.datasetId) {
        filter.push({
          column: {
            name: 'datasetId',
            type: Number
          },
          comparator: 'equals',
          operator: 'and',
          values: [this.datasetId],
          canBeChanged: true
        })
      }

      if (this.storeSelectedProjects && this.storeSelectedProjects.length > 0) {
        filter.push({
          column: {
            name: 'projectId',
            type: Number
          },
          comparator: 'inSet',
          operator: 'and',
          values: this.storeSelectedProjects,
          canBeChanged: false
        })
      }

      return filter
    }
  },
  methods: {
    // Another tab: the options menu of a table closes (it would stay open in the hidden tab)
    closeMenus: function () {
      ['internalTable', 'externalTable'].forEach(ref => {
        if (this.$refs[ref]) {
          this.$refs[ref].closeMoreMenu()
        }
      })
    },
    // The request of a table with internal / external added to its filters (not shown by the table)
    getDataOf: function (isExternal, data, callback) {
      const request = Object.assign({}, data, {
        filter: (data.filter || []).concat([{
          column: 'isExternal',
          comparator: 'equals',
          operator: 'and',
          values: [isExternal]
        }])
      })
      const result = apiPostDatasetTable(request, callback)
      // The page as the request sent it (counted from 0): the table reads it back for its count ("Showing 1 to 8")
      data.page = request.page
      return result
    },
    getInternalData: function (data, callback) {
      return this.getDataOf(0, data, callback)
    },
    getExternalData: function (data, callback) {
      return this.getDataOf(1, data, callback)
    }
  },
  beforeMount: function () {
    if (this.$route.params && this.$route.params.datasetId) {
      this.datasetId = +(this.$route.params.datasetId)
    }
  }
}
</script>

<style src="@/assets/custom-page.css"></style>
<style scoped>
.datasets-page {
  padding: 0.5rem 0 3rem;
}
/* Tabs: as on the maps and publications pages */
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
.ds-tab-icon {
  width: 1.1em;
  margin-right: 0.5rem;
  font-size: 0.95em;
  line-height: 1;
  text-align: center;
}
.ds-tabs >>> .ds-tabs-nav .nav-link.active .ds-tab-icon {
  color: var(--cp-green);
}
.ds-tab-panel {
  margin-top: 2rem;
}
</style>
