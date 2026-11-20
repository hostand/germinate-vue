<template>
  <div>
    <BaseTable :options="options"
               :columns="columns"
               primary-key="institutionId"
               v-bind="$props"
               ref="institutionDatasetTable"
               v-on="$listeners"
               @data-changed="lookUpWiewsNames">
      <!-- The name of the database; without one but with a code, the name from FAO WIEWS (a spinner while looking it up) -->
      <template v-slot:cell(institutionName)="data">
        <b-spinner small class="text-muted" v-if="isLookingUpWiewsName(data.item)" />
        <div v-else-if="getInstitutionName(data.item)">
          <a v-if="showLinks" href="#" @click.prevent="redirectToGermplasmPage(data.item)">{{ getInstitutionName(data.item) }}</a>
          <span v-else>{{ getInstitutionName(data.item) }}</span>
        </div>
      </template>
      <template v-slot:cell(institutionCode)="data">
        <div v-if="data.item.institutionCode">
          <a :href="`https://www.fao.org/wiews/data/organizations/en/?instcode=${data.item.institutionCode}`">{{ data.item.institutionCode }}</a>
        </div>
      </template>
      <template v-slot:cell(institutionAddress)="data">
        <div v-if="data.item.institutionAddress">
          <a :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.item.institutionAddress)}`">{{ data.item.institutionAddress }}</a>
        </div>
      </template>
      <template v-slot:cell(institutionType)="data">
        <b-badge v-if="data.item.institutionType" class="bt-chip" :style="{ '--bt-chip-color': germplasmInstitutionTypes[data.item.institutionType].color() }"><MdiIcon :path="germplasmInstitutionTypes[data.item.institutionType].path" /> {{ germplasmInstitutionTypes[data.item.institutionType].text() }}</b-badge>
      </template>
      <!-- Country flag -->
      <template v-slot:cell(countryCode2)="data">
        <span class="table-country text-nowrap" v-b-tooltip.hover :title="data.item.countryName" v-if="data.item.countryCode2">
          <i :class="'fi fi-' + data.item.countryCode2.toLowerCase()"/> <span> {{ data.item.countryCode2 }}</span>
        </span>
        <span v-else>
          {{ data.item.countryName }}
        </span>
      </template>
      <!-- The datasets of the institution: a chip for all of them, then one per type it has, each with its count; a click
           shows them on the datasets page -->
      <template v-slot:cell(datasets)="data">
        <span class="bt-chips">
          <a href="#"
             class="badge bt-chip"
             v-for="chip in getDatasetChips(data.item)"
             :key="`institution-datasets-${data.item.institutionId}-${chip.key}`"
             :style="{ '--bt-chip-color': chip.color }"
             :title="chip.title"
             @click.prevent="redirectToDatasets(chip.ids)">
            <MdiIcon :path="chip.path" /> {{ chip.ids.length }}
          </a>
        </span>
      </template>
    </BaseTable>
  </div>
</template>

<script>
import MdiIcon from '@/components/icons/MdiIcon'
import BaseTable from '@/components/tables/BaseTable'
import defaultProps from '@/const/table-props.js'
import { datasetTypes, germplasmInstitutionTypes } from '@/mixins/types'
import { getHighContrastTextColor, getPrimaryColor } from '@/mixins/colors'
import { mdiDatabase } from '@mdi/js'
import { Pages } from '@/mixins/pages'
import wiewsNames from '@/mixins/wiews-names'

export default {
  mixins: [wiewsNames],
  name: 'InstitutionDatasetTable',
  props: {
    ...defaultProps.BASE,
    showLinks: {
      type: Boolean,
      default: true
    }
  },
  data: function () {
    return {
      datasetTypes,
      mdiDatabase,
      germplasmInstitutionTypes,
      options: {
        idColumn: 'institutionId',
        tableName: 'institutiondatasets'
      }
    }
  },
  computed: {
    columns: function () {
      return [{
        key: 'institutionId',
        type: Number,
        class: 'text-right',
        sortable: true,
        label: this.$t('tableColumnInstitutionId')
      }, {
        key: 'institutionName',
        // Names of the database may be missing: those from WIEWS fill them (never hidden for being mostly empty)
        autoHide: false,
        type: String,
        sortable: true,
        label: this.$t('tableColumnInstitutionName'),
        preferredSortingColumn: true
      }, {
        key: 'institutionAcronym',
        type: String,
        sortable: true,
        label: this.$t('tableColumnInstitutionAcronym')
      }, {
        key: 'institutionCode',
        type: String,
        sortable: true,
        label: this.$t('tableColumnInstitutionCode')
      }, {
        key: 'institutionType',
        type: String,
        sortable: true,
        label: this.$t('tableColumnInstitutionType')
      }, {
        key: 'institutionAddress',
        type: String,
        sortable: true,
        label: this.$t('tableColumnInstitutionAddress')
      }, {
        key: 'institutionEmail',
        type: String,
        sortable: true,
        label: this.$t('tableColumnInstitutionEmail')
      }, {
        key: 'institutionPhone',
        type: String,
        sortable: true,
        label: this.$t('tableColumnInstitutionPhone')
      }, {
        key: 'institutionContact',
        type: String,
        sortable: true,
        label: this.$t('tableColumnInstitutionContact')
      }, {
        key: 'countryCode2',
        type: String,
        sortable: true,
        label: this.$t('tableColumnInstitutionCountry')
      }, {
        key: 'datasets',
        type: undefined,
        sortable: false,
        label: this.$t('menuDatasets')
      }]
    }
  },
  components: {
    BaseTable,
    MdiIcon
  },
  methods: {
    getPrimaryColor,
    getHighContrastTextColor,
    refresh: function () {
      this.$refs.institutionDatasetTable.refresh()
    },
    // The chips of the datasets of an institution: all of them, then each type it has (none: nothing)
    getDatasetChips: function (item) {
      const all = item.allDatasetIds || []
      if (all.length === 0) {
        return []
      }
      const primary = getPrimaryColor()
      const chips = [{ key: 'all', ids: all, path: mdiDatabase, text: this.$t('menuDatasets'), title: this.$t('tableTooltipInstitutionDatasetsAll'), color: primary }]
      ;['trials', 'genotype', 'pedigree', 'climate'].forEach(type => {
        const ids = item[`${type}DatasetIds`] || []
        if (ids.length > 0) {
          const t = datasetTypes[type]
          const color = t.color()
          chips.push({ key: type, ids, path: t.path, text: t.text(), title: t.text(), color })
        }
      })
      return chips
    },
    redirectToDatasets: function (datasetIds) {
      const filter = [{
        column: 'datasetId',
        comparator: 'inSet',
        operator: 'and',
        values: datasetIds
      }]

      this.$router.push({
        name: Pages.datasets,
        query: {
          'datasets-filter': JSON.stringify(filter)
        }
      })
    },
    redirectToGermplasmPage: function (institution) {
      const filter = []

      if (institution.institutionName) {
        filter.push({
          column: 'institutions',
          comparator: 'jsonSearch',
          operator: 'or',
          values: [institution.institutionName]
        })
      }
      if (institution.institutionCode) {
        filter.push({
          column: 'institutions',
          comparator: 'jsonSearch',
          operator: 'or',
          values: [institution.institutionCode]
        })
      }
      if (institution.institutionAddress) {
        filter.push({
          column: 'institutions',
          comparator: 'jsonSearch',
          operator: 'or',
          values: [institution.institutionAddress]
        })
      }

      if (filter.length > 0) {
        this.$router.push({
          name: 'germplasm',
          query: {
            'germplasm-filter': JSON.stringify(filter)
          }
        })
      }
    }
  }
}
</script>
