<template>
  <!-- Markers in the look of the custom pages: only the title and the table -->
  <div class="custom-page markers-page">
    <header class="cp-page-header">
      <h1 class="cp-page-title">{{ $t('pageMarkersTitle') }}</h1>
    </header>

    <div class="mk-table">
      <MarkerTable :getData="getData" :getIds="getIds"/>
    </div>
  </div>
</template>

<script>
import MarkerTable from '@/components/tables/MarkerTable'
import { apiPostMarkerTable, apiPostMarkerTableIds } from '@/mixins/api/genotype.js'

export default {
  components: {
    MarkerTable
  },
  methods: {
    getData: function (data, callback) {
      return apiPostMarkerTable(data, callback)
    },
    getIds: function (data, callback) {
      return apiPostMarkerTableIds(data, callback)
    }
  }
}
</script>

<style src="@/assets/custom-page.css"></style>
<style scoped>
.markers-page {
  padding: 0.5rem 0 3rem;
}
.mk-table {
  margin-top: 2rem;
}
</style>
