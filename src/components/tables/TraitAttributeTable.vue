<template>
  <div>
    <BaseTable :options="options"
               :columns="columns"
               v-bind="$props"
               ref="traitAttributeTable"
               v-on="$listeners">
      <!-- Trait id link -->
      <template v-slot:cell(traitId)="data">
        <router-link :to="{ name: Pages.traitDetails, params: { traitId: data.item.traitId } }">{{ data.item.traitId }}</router-link>
      </template>
      <!-- Trait name link -->
      <template v-slot:cell(traitName)="data">
        <router-link :to="{ name: Pages.traitDetails, params: { traitId: data.item.traitId } }">{{ data.item.traitName }}</router-link>
      </template>
      <template v-slot:cell(attributeDescription)="data">
        <!-- New look: all of it (cut by the table, its chevron shows the rest); else cut after 10 words, "read more" -->
        <span v-if="modernLook && data.item.attributeDescription">{{ data.item.attributeDescription }}</span>
        <span :title="data.item.attributeDescription" v-else-if="data.item.attributeDescription">{{ truncateAfterWords(data.item.attributeDescription, 10) }}</span>
        <a href="#" class="table-icon-link" @click.prevent="showFullAttributeDescription(data.item.attributeDescription)" v-b-tooltip="$t('buttonReadMore')" v-if="!modernLook && isTruncatedAfterWords(data.item.attributeDescription, 10)" >&nbsp;
          <MdiIcon :path="mdiPageNext" />
        </a>
      </template>
      <!-- Attribute type -->
      <template v-slot:cell(attributeType)="data">
        <span class="bt-chip" v-if="data.item.attributeType" :style="{ '--bt-chip-color': dataTypes[data.item.attributeType].color() }"><MdiIcon :path="dataTypes[data.item.attributeType].path" /> {{ dataTypes[data.item.attributeType].text() }}</span>
      </template>
    </BaseTable>
  </div>
</template>

<script>
import MdiIcon from '@/components/icons/MdiIcon'
import BaseTable from '@/components/tables/BaseTable'
import defaultProps from '@/const/table-props.js'
import { dataTypes } from '@/mixins/types'
import { Pages } from '@/mixins/pages'
import { isTruncatedAfterWords, truncateAfterWords } from '@/mixins/formatting'
import { mdiPageNext } from '@mdi/js'

export default {
  name: 'TraitAttributeTable',
  props: {
    ...defaultProps.BASE
  },
  data: function () {
    return {
      Pages,
      dataTypes,
      mdiPageNext,
      options: {
        idColumn: 'traitId',
        tableName: 'traitAttributes'
      }
    }
  },
  computed: {
    columns: function () {
      return [
        {
          key: 'traitId',
          type: String,
          sortable: true,
          class: 'text-right',
          label: this.$t('tableColumnTraitId')
        }, {
          key: 'traitName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnTraitName'),
          preferredSortingColumn: true
        }, {
          key: 'attributeName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnAttributeName')
        }, {
          key: 'attributeDescription',
          type: String,
          sortable: true,
          label: this.$t('tableColumnAttributeDescription')
        }, {
          key: 'attributeType',
          type: 'dataType',
          sortable: true,
          label: this.$t('tableColumnAttributeDataType')
        }, {
          key: 'attributeValue',
          type: String,
          sortable: true,
          label: this.$t('tableColumnAttributeValue')
        }
      ]
    }
  },
  components: {
    BaseTable,
    MdiIcon
  },
  methods: {
    isTruncatedAfterWords,
    truncateAfterWords,
    showFullAttributeDescription: function (description) {
      this.$bvModal.msgBoxOk(description, {
        title: this.$t('tableColumnAttributeDescription'),
        okTitle: this.$t('genericOk')
      })
    },
    refresh: function () {
      this.$refs.traitAttributeTable.refresh()
    }
  }
}
</script>

<style>
</style>
