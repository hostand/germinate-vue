<template>
  <div>
    <BaseTable :options="options"
               :columns="columns"
               primary-key="mapId"
               v-bind="$props"
               v-on="$listeners">
      <!-- Map id link -->
      <template v-slot:cell(mapId)="data">
        <router-link :to="{ name: Pages.mapDetails, params: { mapId: data.item.mapId } }" event="" @click.native.prevent="$emit('map-selected', data.item.mapId)">{{ data.item.mapId }}</router-link>
      </template>
      <!-- Map name link -->
      <template v-slot:cell(mapName)="data">
        <router-link :to="{ name: Pages.mapDetails, params: { mapId: data.item.mapId } }" event="" @click.native.prevent="$emit('map-selected', data.item.mapId)">{{ data.item.mapName }}</router-link>
      </template>
      <!-- Map description -->
      <template v-slot:cell(mapDescription)="data">
        <!-- If the description is HTML and contains a link, just show it -->
        <div v-if="isLink(data.item)"> <span v-html="data.item.mapDescription" />&nbsp;<i class="fa-solid fa-arrow-up-right-from-square bt-external" aria-hidden="true" /></div>
        <!-- Otherwise display the description as text -->
        <span v-else>{{ data.item.mapDescription }}</span>
      </template>
    </BaseTable>
  </div>
</template>

<script>
import BaseTable from '@/components/tables/BaseTable'
import defaultProps from '@/const/table-props.js'

import { Pages } from '@/mixins/pages'
import { formatNumber } from '@/mixins/formatting'

export default {
  name: 'MapTable',
  props: {
    ...defaultProps.FULL
  },
  data: function () {
    return {
      Pages,
      options: {
        idColumn: 'mapId',
        tableName: 'maps'
      }
    }
  },
  computed: {
    columns: function () {
      return [
        {
          key: 'mapId',
          type: Number,
          sortable: true,
          class: 'text-right',
          label: this.$t('tableColumnMapId')
        }, {
          key: 'mapName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnMapName'),
          preferredSortingColumn: true
        }, {
          key: 'mapDescription',
          type: String,
          sortable: true,
          label: this.$t('tableColumnMapDescription')
        }, {
          key: 'markerCount',
          type: Number,
          sortable: true,
          class: 'text-right',
          label: this.$t('tableColumnMapMarkerCount'),
          formatter: value => formatNumber(value)
        }
      ]
    }
  },
  components: {
    BaseTable
  },
  methods: {
    isLink: function (map) {
      if (!map.mapDescription || map.mapDescription.length < 1) {
        return false
      } else {
        return map.mapDescription.indexOf('https://') !== -1 ||
               map.mapDescription.indexOf('http://') !== -1 ||
               map.mapDescription.indexOf('sftp://') !== -1 ||
               map.mapDescription.indexOf('ftp://') !== -1
      }
    }
  }
}
</script>

<style>
</style>
