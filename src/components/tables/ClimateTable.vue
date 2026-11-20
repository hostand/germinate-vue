<template>
  <div>
    <BaseTable :options="options"
               :columns="columns"
               primary-key="climateId"
               v-bind="$props"
               :getData="getTypedData"
               ref="climateTable"
               v-on="$listeners">
      <!-- Climate id link -->
      <template v-slot:cell(climateId)="data">
        <router-link :to="{ name: Pages.climateDetails, params: { climateId: data.item.climateId } }">{{ data.item.climateId }}</router-link>
      </template>
      <!-- Climate name link -->
      <template v-slot:cell(climateName)="data">
        <router-link :to="{ name: Pages.climateDetails, params: { climateId: data.item.climateId } }">{{ data.item.climateName }}</router-link>
      </template>
      <!-- Climate short name link -->
      <template v-slot:cell(climateNameShort)="data">
        <router-link :to="{ name: Pages.climateDetails, params: { climateId: data.item.climateId } }">{{ data.item.climateNameShort }}</router-link>
      </template>
      <!-- Climate description link -->
      <template v-slot:cell(climateDescription)="data">
        <router-link :to="{ name: Pages.climateDetails, params: { climateId: data.item.climateId } }">{{ data.item.climateDescription }}</router-link>
      </template>
      <!-- Dataset type icon -->
      <!-- New look: a rounded chip in the colour of the type -->
      <template v-slot:cell(dataType)="data" v-if="modernLook">
        <span class="bt-chip" :style="{ '--bt-chip-color': dataTypes[data.item.dataType].color() }"><MdiIcon :path="dataTypes[data.item.dataType].path" /> {{ dataTypes[data.item.dataType].text() }}</span>
      </template>
      <template v-slot:cell(dataType)="data" v-else>
        <span class="bt-chip" :style="{ '--bt-chip-color': dataTypes[data.item.dataType].color() }"><MdiIcon :path="dataTypes[data.item.dataType].path" /> {{ dataTypes[data.item.dataType].text() }}</span>
      </template>
      <!-- Climate type: by its data type (see climate-types.js), a chip with its icon and name -->
      <template v-slot:cell(climateType)="data">
        <ClimateTypeChip :dataType="data.item.dataType" />
      </template>
      <!-- Data points: (the climates page) a click shows its datasets in the row below, one of them selected is the
           dataset of its statistics (as the datasets of a trait; the climates have no list of their datasets) -->
      <!-- Categorical climates: their categories, found in the data when the row is shown -->
      <template v-slot:cell(climateCategories)="data">
        <ClimateCategoriesCell :climateId="data.item.climateId" :key="`climate-categories-${data.item.climateId}`" v-if="data.item.dataType === 'categorical'" />
      </template>
      <template v-slot:cell(count)="data">
        <a href="#"
           @click.prevent="toggleDatasets(data.item)"
           :aria-expanded="data.item._showDetails === true ? 'true' : 'false'"
           v-b-tooltip.hover
           :title="$t('tableTooltipClimateDatasets')"
           v-if="!onlyColumns && data.item.count > 0">
          {{ formatCount(data.item.count) }}
        </a>
        <span v-else>{{ formatCount(data.item.count) }}</span>
      </template>

      <!-- The datasets of the climate -->
      <template v-slot:row-details="data">
        <TraitDatasetDetails :traitId="data.item.climateId" variable="climate" v-if="!onlyColumns" />
      </template>
    </BaseTable>
  </div>
</template>

<script>
import MdiIcon from '@/components/icons/MdiIcon'
import BaseTable from '@/components/tables/BaseTable'
import ClimateCategoriesCell from '@/components/tables/ClimateCategoriesCell'
import TraitDatasetDetails from '@/components/tables/details/TraitDatasetDetails'
import defaultProps from '@/const/table-props.js'
import { dataTypes } from '@/mixins/types.js'
import { getNumberWithSuffix } from '@/mixins/formatting'
import { Pages } from '@/mixins/pages'
import ClimateTypeChip from '@/components/tables/ClimateTypeChip'
import { CLIMATE_TYPES, translateClimateTypeRequest } from '@/mixins/climate-types'

export default {
  name: 'ClimateTable',
  props: {
    ...defaultProps.BASE,
    ...defaultProps.ACTIONS,
    // Only these columns, in this order (e.g. the climate details); the table then has a name of its own
    onlyColumns: {
      type: Array,
      default: null
    }
  },
  data: function () {
    return {
      Pages,
      dataTypes,
      options: {
        idColumn: 'climateId',
        tableName: this.onlyColumns ? 'climateDetails' : 'climates'
      }
    }
  },
  computed: {
    columns: function () {
      const result = [
        {
          key: 'climateId',
          type: Number,
          class: 'text-right',
          sortable: true,
          label: this.$t('tableColumnClimateId')
        }, {
          key: 'climateName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnClimateName'),
          preferredSortingColumn: true
        }, {
          key: 'climateNameShort',
          type: String,
          sortable: true,
          label: this.$t('tableColumnClimateNameShort')
        }, {
          key: 'climateDescription',
          type: String,
          sortable: true,
          label: this.$t('tableColumnClimateDescription')
        }, {
          key: 'dataType',
          type: 'dataType',
          sortable: true,
          label: this.$t('tableColumnClimateDataType')
        }, {
          // Virtual: the type of the climate by its data type (its filter: data types for the server)
          key: 'climateType',
          type: 'climateType',
          sortable: false,
          autoHide: false,
          label: this.$t('tableColumnClimateType'),
          filterValueText: value => this.getTypeText(value)
        }, {
          key: 'climateCategories',
          type: undefined,
          sortable: false,
          label: this.$t('tableColumnTraitConstraints')
        }, {
          key: 'unitName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnClimateUnitName')
        }, {
          key: 'unitDescription',
          type: String,
          sortable: true,
          label: this.$t('tableColumnClimateUnitDescription')
        }, {
          key: 'unitAbbreviation',
          type: String,
          sortable: true,
          label: this.$t('tableColumnClimateUnitAbbreviation')
        }, {
          key: 'count',
          type: Number,
          class: 'text-right',
          sortable: true,
          label: this.$t('tableColumnClimateDataPoints'),
          formatter: value => getNumberWithSuffix(value, 2)
        }
      ]
      // Only some columns, in their order (the climate details)
      if (this.onlyColumns) {
        return this.onlyColumns.map(key => result.find(c => c.key === key)).filter(c => c)
      }
      return result
    }
  },
  components: {
    ClimateCategoriesCell,
    ClimateTypeChip,
    BaseTable,
    MdiIcon,
    TraitDatasetDetails
  },
  methods: {
    getTypeText: function (key) {
      const type = CLIMATE_TYPES.find(t => t.key === key)
      return type ? this.$t(type.text) : key
    },
    // The data of the table: the climate type filter turned into data types first
    getTypedData: function (data, callback) {
      return this.getData(translateClimateTypeRequest(data), callback)
    },
    formatCount: function (value) {
      return getNumberWithSuffix(value, 2)
    },
    // The datasets of a climate below its row; one row open at a time
    toggleDatasets: function (item) {
      const shown = item._showDetails === true
      const table = this.$refs.climateTable
      ;((table && table.pageItems) || []).forEach(other => {
        if (other !== item && other._showDetails) {
          this.$set(other, '_showDetails', false)
        }
      })
      this.$set(item, '_showDetails', !shown)
    },
    refresh: function () {
      this.$refs.climateTable.refresh()
    }
  }
}
</script>

<style>
</style>
