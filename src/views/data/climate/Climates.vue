<template>
  <!-- Climates in the look of the custom pages: the title and the table (new look) -->
  <div class="custom-page climates-page">
    <header class="cp-page-header">
      <h1 class="cp-page-title">{{ $t('pageClimatesTitle') }}</h1>
    </header>

    <div class="cl-table">
      <ClimateTable :getData="getData" modernLook />
    </div>
  </div>
</template>

<script>
import ClimateTable from '@/components/tables/ClimateTable'
import { apiPostClimateTable } from '@/mixins/api/climate.js'

export default {
  components: {
    ClimateTable
  },
  methods: {
    getData: function (data, callback) {
      return apiPostClimateTable(data, callback)
    }
  }
}
</script>

<style src="@/assets/custom-page.css"></style>
<style scoped>
.climates-page {
  padding: 0.5rem 0 3rem;
}
.cl-table {
  margin-top: 2rem;
}
</style>
