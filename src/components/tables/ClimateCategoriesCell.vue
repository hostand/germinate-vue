<template>
  <!-- The categories of a categorical climate, found in its data when the cell is shown (see climate-categories.js):
       chips, as the constraints of the traits; their counts in their tooltip -->
  <span class="ccc" v-if="categories === null"><b-spinner small /></span>
  <span class="ccc" v-else-if="categories.length > 0">
    <span class="ccc-chip" v-for="category in categories" :key="`ccc-${climateId}-${category.value}`" :title="$t('tableTooltipClimateCategoryCount', { count: category.count })">{{ category.value }}</span>
  </span>
</template>

<script>
import { getClimateCategories } from '@/mixins/climate-categories'

export default {
  props: {
    climateId: {
      type: Number,
      required: true
    },
    // Only in these datasets (none: all of them)
    datasetIds: {
      type: Array,
      default: null
    }
  },
  data: function () {
    return {
      categories: null
    }
  },
  mounted: function () {
    const climateId = this.climateId
    getClimateCategories(climateId, this.datasetIds).then(categories => {
      if (climateId === this.climateId) {
        this.categories = categories
      }
    })
  }
}
</script>

<style scoped>
.ccc {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}
.ccc-chip {
  padding: 0.15rem 0.6rem;
  border: 1px solid var(--bt-border, #e2e3df);
  border-radius: 999px;
  background: var(--bt-head-bg, #f7f7f5);
  color: var(--bt-text-subtle, #4a4d4b);
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}
</style>
