<template>
  <div>
    <BaseTable v-bind="$props"
              :columns="columns"
              :options="options"
              class="publication-table"
              ref="publicationTable"
              v-on="$listeners">
      <template v-slot:cell(publicationId)="data">
        <router-link v-if="data.item.referenceType !== 'database'" :to="{ name: Pages.publicationDetails, params: { publicationId: data.item.publicationId } }" event="" @click.native.prevent="$emit('publication-selected', { publicationId: data.item.publicationId })">{{ data.item.publicationId }}</router-link>
        <span v-else>{{ data.item.publicationId }}</span>
      </template>
      <template v-slot:cell(publicationName)="data">
        <template v-if="data.item.publicationFallbackCache">
          <router-link v-if="data.item.referenceType !== 'database'" :to="{ name: Pages.publicationDetails, params: { publicationId: data.item.publicationId } }" event="" @click.native.prevent="$emit('publication-selected', { publicationId: data.item.publicationId })" v-html="data.item.publicationFallbackCache.title" />
          <span v-else v-html="data.item.publicationFallbackCache.title" />
        </template>
      </template>
      <template v-slot:cell(publicationJournal)="data">
        <span v-if="data.item.publicationFallbackCache">{{ data.item.publicationFallbackCache['container-title'] }}</span>
      </template>
      <template v-slot:cell(publicationDoi)="data">
        <span><a rel="noopener noreferrer" :href="data.item.publicationDoi">{{ data.item.publicationDoi }}</a> <i class="fa-solid fa-arrow-up-right-from-square bt-external" aria-hidden="true" /></span>
      </template>
      <!-- New look: the referenced items as rounded chips in the colour of their type -->
      <template v-slot:cell(publicationDetails)="data" v-if="modernLook">
        <span class="bt-chips">
          <span class="bt-chip" v-for="chip in getReferenceChips(data.item)" :key="chip.key" :style="{ '--bt-chip-color': chip.color }">
            <MdiIcon :path="chip.path" /> {{ chip.text }}<span class="bt-chip-count" v-if="chip.count !== null" :style="{ color: chip.countColor }">{{ chip.count }}</span>
          </span>
        </span>
      </template>
      <template v-slot:cell(publicationDetails)="data" v-else>
        <b-badge class="mr-1 bt-chip" v-if="data.item.isDatabasePub" :style="{ '--bt-chip-color': publicationTypes.database.color }">
          <MdiIcon :path="publicationTypes.database.path" /> {{ publicationTypes.database.text() }}
        </b-badge>
        <b-badge class="mr-1 bt-chip" v-if="data.item.germplasmIds && data.item.germplasmIds.length > 0" :style="{ '--bt-chip-color': publicationTypes.germplasm.color }">
          <MdiIcon :path="publicationTypes.germplasm.path" /> {{ publicationTypes.germplasm.text() }} ({{ data.item.germplasmIds.length }})
        </b-badge>
        <b-badge class="mr-1 bt-chip" v-if="data.item.datasetIds && data.item.datasetIds.length > 0" :style="{ '--bt-chip-color': publicationTypes.dataset.color }">
          <MdiIcon :path="publicationTypes.dataset.path" /> {{ publicationTypes.dataset.text() }} ({{ data.item.datasetIds.length }})
        </b-badge>
        <b-badge class="mr-1 bt-chip" v-if="data.item.experimentIds && data.item.experimentIds.length > 0" :style="{ '--bt-chip-color': publicationTypes.experiment.color }">
          <MdiIcon :path="publicationTypes.experiment.path" /> {{ publicationTypes.experiment.text() }} ({{ data.item.experimentIds.length }})
        </b-badge>
        <b-badge class="mr-1 bt-chip" v-if="data.item.groupIds && data.item.groupIds.length > 0" :style="{ '--bt-chip-color': publicationTypes.group.color }">
          <MdiIcon :path="publicationTypes.group.path" /> {{ publicationTypes.group.text() }} ({{ data.item.groupIds.length }})
        </b-badge>
      </template>
      <!-- Publication type icon -->
      <!-- <template v-slot:cell(referenceType)="data">
        <b-badge class="bt-chip" :style="{ '--bt-chip-color': publicationTypes[data.item.referenceType].color }"><MdiIcon :path="publicationTypes[data.item.referenceType].path" /> {{ publicationTypes[data.item.referenceType].text }}</b-badge>
      </template> -->
    </BaseTable>
  </div>
</template>

<script>
import MdiIcon from '@/components/icons/MdiIcon'
import BaseTable from '@/components/tables/BaseTable'
import defaultProps from '@/const/table-props.js'

import { publicationTypes } from '@/mixins/types'
import { getHighContrastTextColor } from '@/mixins/colors'
import { Pages } from '@/mixins/pages'

import { formatDateTime } from '@/mixins/formatting'

export default {
  name: 'PublicationTable',
  props: {
    ...defaultProps.FULL
  },
  data: function () {
    return {
      Pages,
      publicationTypes,
      options: {
        idColumn: 'publicationId',
        tableName: 'publications'
      }
    }
  },
  computed: {
    columns: function () {
      const result = [
        {
          key: 'projectIds',
          type: 'json',
          sortable: false,
          class: 'd-none text-right',
          label: this.$t('tableColumnProjectId')
        }, {
          key: 'publicationId',
          type: Number,
          sortable: true,
          class: 'text-right',
          label: this.$t('tableColumnPublicationId')
        }, {
          key: 'publicationName',
          type: undefined,
          sortable: false,
          label: this.$t('tableColumnPublicationName')
        }, {
          key: 'publicationDoi',
          type: Number,
          sortable: true,
          label: this.$t('tableColumnPublicationDoi')
        }, {
          key: 'publicationJournal',
          type: undefined,
          sortable: false,
          label: this.$t('tableColumnPublicationJournal')
        }, {
          key: 'publicationDetails',
          type: undefined,
          sortable: false,
          label: this.$t('tableColumnPublicationDetails')
        }, {
          key: 'createdOn',
          type: Date,
          sortable: true,
          label: this.$t('tableColumnPublicationCreatedOn'),
          formatter: value => formatDateTime(value)
        }
      ]

      return result
    }
  },
  components: {
    BaseTable,
    MdiIcon
  },
  methods: {
    getHighContrastTextColor,
    // The items a publication references (database publication, germplasm, datasets, experiments, groups)
    getReferenceChips: function (item) {
      const chips = []
      if (item.isDatabasePub) {
        chips.push({ key: 'database', count: null })
      }
      ;[['germplasm', 'germplasmIds'], ['dataset', 'datasetIds'], ['experiment', 'experimentIds'], ['group', 'groupIds']].forEach(([key, ids]) => {
        if (item[ids] && item[ids].length > 0) {
          chips.push({ key, count: item[ids].length })
        }
      })
      return chips.map(chip => {
        const type = publicationTypes[chip.key]
        return Object.assign(chip, { path: type.path, text: type.text(), color: type.color || 'currentColor', countColor: getHighContrastTextColor(type.color) })
      })
    },
    refresh: function () {
      this.$refs.publicationTable.refresh()
    }
  }
}
</script>

<style>
</style>
