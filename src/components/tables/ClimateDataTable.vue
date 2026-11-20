<template>
  <BaseTable v-bind="$props"
            :getData="getTypedData"
            :getIds="getTypedIds"
            :downloadTable="downloadTable ? downloadTypedTable : null"
            :columns="columns"
            :options="options"
            itemType="locations"
            ref="climateDataTable"
            v-on="$listeners">
    <!-- Country name represented by a flag icon -->
    <template v-slot:cell(countryName)="data">
      <span class="table-country text-nowrap" v-b-tooltip.hover :title="data.item.countryName"><i :class="'fi fi-' + data.item.countryCode2.toLowerCase()" v-if="data.item.countryCode2"/> <span> {{ data.item.countryCode2 }}</span></span>
    </template>
    <!-- Location type with icon -->
    <template v-slot:cell(locationType)="data">
      <span class="bt-chip" :style="{ '--bt-chip-color': locationTypes[data.item.locationType].color() }"><MdiIcon :path="locationTypes[data.item.locationType].path" /> {{ locationTypes[data.item.locationType].text() }}</span>
    </template>

    <template v-slot:cell(climateValue)="data">
      <span v-if="data.item.climateValue !== undefined && data.item.climateValue !== null">
        <template v-if="data.item.climateDataType === 'numeric'">{{ formatNumber(+data.item.climateValue, 2) }}</template>
        <template v-else-if="data.item.climateDataType === 'date'">{{ formatDate(data.item.climateValue) }}</template>
        <template v-else>{{ isNaN(data.item.climateValue) ? data.item.climateValue : formatNumber(parseFloat(data.item.climateValue), 2) }}</template>
      </span>
    </template>

    <!-- Climate name: clickable when asked (its details) -->
    <template v-slot:cell(climateName)="data">
      <button type="button" class="tdt-trait-link" @click="$emit('climate-clicked', { climateId: data.item.climateId, climateName: data.item.climateName, climateDataType: data.item.climateDataType })" v-if="climateClickable">{{ data.item.climateName }}</button>
      <span v-else>{{ data.item.climateName }}</span>
    </template>
    <!-- The abbreviation of the unit of the climate (given by the page) -->
    <template v-slot:cell(unitAbbreviation)="data">
      <span v-if="unitAbbreviations && unitAbbreviations[data.item.climateId]">{{ unitAbbreviations[data.item.climateId] }}</span>
    </template>
    <!-- Climate type: by its data type (see climate-types.js) -->
    <template v-slot:cell(climateType)="data">
      <ClimateTypeChip :dataType="data.item.climateDataType" />
    </template>
    <!-- Climate data type icon (hidden by default: the climate type tells it) -->
    <template v-slot:cell(climateDataType)="data">
      <span class="bt-chip" :style="{ '--bt-chip-color': dataTypes[data.item.climateDataType].color() }"><MdiIcon :path="dataTypes[data.item.climateDataType].path" /> {{ dataTypes[data.item.climateDataType].text() }}</span>
    </template>
  </BaseTable>
</template>

<script>
import MdiIcon from '@/components/icons/MdiIcon'
import BaseTable from '@/components/tables/BaseTable'
import defaultProps from '@/const/table-props.js'
import { locationTypes, dataTypes } from '@/mixins/types.js'
import { formatDate, formatNumber } from '@/mixins/formatting'
import ClimateTypeChip from '@/components/tables/ClimateTypeChip'
import { CLIMATE_TYPES, translateClimateTypeRequest, addClimateTypeColumn } from '@/mixins/climate-types'

export default {
  name: 'LocationTable',
  props: {
    ...defaultProps.FULL,
    ...defaultProps.ACTIONS,
    // The abbreviation of the unit of each climate ({ climateId: abbreviation }): a column of its own after the unit
    unitAbbreviations: {
      type: Object,
      default: null
    },
    // The name of a climate clickable: "climate-clicked" with { climateId, climateName, climateDataType } (the climate
    // export opens its details)
    climateClickable: {
      type: Boolean,
      default: false
    },
    // The data exports: no marking column
    plainLocations: {
      type: Boolean,
      default: false
    }
  },
  data: function () {
    return {
      locationTypes,
      dataTypes,
      options: {
        idColumn: 'locationId',
        tableName: 'climateData'
      }
    }
  },
  computed: {
    columns: function () {
      let result = [
        {
          key: 'locationId',
          type: Number,
          sortable: true,
          label: this.$t('tableColumnLocationId')
        }, {
          key: 'locationName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnLocationName')
        }, {
          key: 'locationRegion',
          type: String,
          sortable: true,
          label: this.$t('tableColumnLocationRegion')
        }, {
          key: 'locationState',
          type: String,
          sortable: true,
          label: this.$t('tableColumnLocationState')
        }, {
          key: 'locationType',
          type: 'locationType',
          sortable: true,
          label: this.$t('tableColumnLocationType')
        }, {
          key: 'locationLatitude',
          type: Number,
          sortable: true,
          class: 'text-right',
          label: this.$t('tableColumnLocationLatitude'),
          formatter: value => formatNumber(value, 2)
        }, {
          key: 'locationLongitude',
          type: Number,
          sortable: true,
          class: 'text-right',
          label: this.$t('tableColumnLocationLongitude'),
          formatter: value => formatNumber(value, 2)
        }, {
          key: 'locationElevation',
          type: Number,
          sortable: true,
          class: 'text-right',
          label: this.$t('tableColumnLocationElevation'),
          formatter: value => formatNumber(value, 2)
        }, {
          key: 'countryName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnLocationCountryName')
        }, {
          key: 'datasetName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnDatasetName')
        }, {
          key: 'climateId',
          type: Number,
          sortable: true,
          class: 'text-right',
          label: this.$t('tableColumnClimateId')
        }, {
          key: 'climateName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnClimateName'),
          preferredSortingColumn: true
        }, {
          // Virtual: the type of the climate by its data type (sorted and filtered by the data type on the server)
          key: 'climateType',
          type: 'climateType',
          sortable: true,
          autoHide: false,
          label: this.$t('tableColumnClimateType'),
          filterValueText: value => this.getTypeText(value)
        }, {
          key: 'climateDataType',
          type: 'dataType',
          sortable: true,
          defaultHidden: true,
          label: this.$t('tableColumnTraitDataType')
        }, {
          key: 'unitName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnClimateUnitName')
        }, {
          key: 'recordingDate',
          type: Date,
          sortable: true,
          label: this.$t('tableColumnClimateDataRecordingDate'),
          formatter: value => formatDate(value)
        }, {
          key: 'climateValue',
          type: String,
          sortable: true,
          label: this.$t('tableColumnClimateDataClimateValue')
        }, {
          key: 'marked',
          type: null,
          sortable: false,
          class: 'text-right',
          label: ''
        }
      ]

      // The abbreviation of the unit (not in the rows of the server: not sortable nor filtered)
      if (this.unitAbbreviations) {
        const unit = result.findIndex(c => c.key === 'unitName')
        result.splice(unit + 1, 0, {
          key: 'unitAbbreviation',
          type: undefined,
          sortable: false,
          label: this.$t('tableColumnTraitUnitAbbreviation')
        })
      }
      // The exports: no marking
      if (this.plainLocations) {
        result = result.filter(c => c.key !== 'marked')
      }

      if (this.selectable === true) {
        result.unshift({
          key: 'selected',
          type: undefined,
          sortable: false,
          class: 'table-primary',
          label: ''
        })
      }

      return result
    }
  },
  components: {
    BaseTable,
    ClimateTypeChip,
    MdiIcon
  },
  methods: {
    formatNumber,
    formatDate,
    getTypeText: function (key) {
      const type = CLIMATE_TYPES.find(t => t.key === key)
      return type ? this.$t(type.text) : key
    },
    // The requests of the table: the climate type (filter, order) turned into the data type first
    getTypedData: function (data, callback) {
      return this.getData(translateClimateTypeRequest(data, 'climateDataType'), callback)
    },
    getTypedIds: function (data, callback) {
      return this.getIds(translateClimateTypeRequest(data, 'climateDataType'), callback)
    },
    // The download: the climate type also as a column of its file (put in by the browser, see climate-types.js)
    downloadTypedTable: function (data, callback, onError) {
      return this.downloadTable(translateClimateTypeRequest(data, 'climateDataType'), blob => addClimateTypeColumn(blob).then(callback), onError)
    },
    refresh: function () {
      this.$refs.climateDataTable.refresh()
    }
  }
}
</script>

<style>

</style>
