<template>
  <div>
    <BaseTable :options="options"
               :columns="columns"
               primary-key="institutionId"
               v-bind="$props"
               ref="institutionTable"
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
          <a target="_blank" rel="noopener noreferrer" :href="`https://www.fao.org/wiews/data/organizations/en/?instcode=${data.item.institutionCode}`">{{ data.item.institutionCode }}</a>
        </div>
      </template>
      <template v-slot:cell(institutionAddress)="data">
        <div v-if="data.item.institutionAddress">
          <a target="_blank" rel="noopener noreferrer" :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.item.institutionAddress)}`">{{ data.item.institutionAddress }}</a>
        </div>
      </template>
      <template v-slot:cell(institutionType)="data">
        <b-badge v-if="data.item.institutionType" class="bt-chip" :style="{ '--bt-chip-color': germplasmInstitutionTypes[data.item.institutionType].color() }"><MdiIcon :path="germplasmInstitutionTypes[data.item.institutionType].path" /> {{ germplasmInstitutionTypes[data.item.institutionType].text() }}</b-badge>
      </template>
      <!-- Country flag -->
      <template v-slot:cell(countryCode)="data">
        <span class="table-country text-nowrap" v-b-tooltip.hover :title="data.item.countryName" v-if="data.item.countryCode">
          <i :class="'fi fi-' + data.item.countryCode.toLowerCase()"/> <span> {{ data.item.countryCode }}</span>
        </span>
        <span v-else>
          {{ data.item.countryName }}
        </span>
      </template>
    </BaseTable>
  </div>
</template>

<script>
import MdiIcon from '@/components/icons/MdiIcon'
import BaseTable from '@/components/tables/BaseTable'
import defaultProps from '@/const/table-props.js'
import { germplasmInstitutionTypes } from '@/mixins/types'
import { getHighContrastTextColor } from '@/mixins/colors'
import wiewsNames from '@/mixins/wiews-names'

export default {
  mixins: [wiewsNames],
  name: 'InstitutionTable',
  props: {
    ...defaultProps.BASE,
    showLinks: {
      type: Boolean,
      default: true
    }
  },
  data: function () {
    return {
      germplasmInstitutionTypes,
      options: {
        idColumn: 'institutionId',
        tableName: 'institutions'
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
        key: 'countryCode',
        type: String,
        sortable: true,
        label: this.$t('tableColumnInstitutionCountry')
      }]
    }
  },
  components: {
    BaseTable,
    MdiIcon
  },
  methods: {
    getHighContrastTextColor,
    refresh: function () {
      this.$refs.institutionTable.refresh()
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
