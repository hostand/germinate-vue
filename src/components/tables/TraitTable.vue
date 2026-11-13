<template>
  <div>
    <BaseTable :options="options"
               :columns="columns"
               primary-key="traitId"
               v-bind="$props"
               ref="traitTable"
               @data-changed="measureConstraints"
               v-on="$listeners">
      <!-- HEADS -->
      <!-- HEAD: Germplasm PUID -->
      <template v-slot:head(traitSetSize)="data">
        <span>{{ data.label }} </span> <span class="text-muted" v-b-tooltip.bottom.hover :title="$t('tableColumnTooltipTraitSet')"><MdiIcon :path="mdiHelpCircle" /></span>
      </template>
      <!-- /HEADS -->
      <!-- Trait id link -->
      <template v-slot:cell(traitId)="data">
        <router-link :to="{ name: Pages.traitDetails, params: { traitId: data.item.traitId } }">{{ data.item.traitId }}</router-link>
      </template>
      <!-- Trait name link -->
      <template v-slot:cell(traitName)="data">
        <router-link :to="{ name: Pages.traitDetails, params: { traitId: data.item.traitId } }">{{ data.item.traitName }}</router-link>
      </template>
      <!-- Trait short name link -->
      <template v-slot:cell(traitNameShort)="data">
        <router-link :to="{ name: Pages.traitDetails, params: { traitId: data.item.traitId } }">{{ data.item.traitNameShort }}</router-link>
      </template>
      <!-- Trait description link -->
      <template v-slot:cell(traitDescription)="data">
        <router-link :to="{ name: Pages.traitDetails, params: { traitId: data.item.traitId } }">{{ data.item.traitDescription }}</router-link>
      </template>
      <!-- Dataset type icon -->
      <template v-slot:cell(dataType)="data">
        <span class="bt-chip" :style="{ '--bt-chip-color': dataTypes[data.item.dataType].color() }"><MdiIcon :path="dataTypes[data.item.dataType].path" /> {{ dataTypes[data.item.dataType].text() }}</span>
      </template>
      <!-- Dataset ids -->
      <!-- Its datasets in the row below (the traits page): one of them selected is the dataset of its statistics -->
      <template v-slot:cell(datasetIds)="data">
        <template v-if="data.item.datasetIds">
          <a href="#"
             @click.prevent="toggleDatasets(data.item)"
             :aria-expanded="data.item._showDetails === true ? 'true' : 'false'"
             v-b-tooltip.hover
             :title="$t('tableTooltipTraitDatasets')"
             v-if="!onlyColumns && data.item.datasetIds.length > 0">
            {{ data.item.datasetIds.length }}
          </a>
          <span v-else>{{ data.item.datasetIds.length }}</span>
        </template>
      </template>
      <!-- Constraints: chips side by side on one line, cut when too many (a chevron then); a click on the cell shows them
           all, the row growing downwards, and another one folds them again -->
      <template v-slot:cell(traitRestrictions)="data">
        <div :class="['tt-constraints', { expanded: expandedConstraints[data.item.traitId], cut: cutConstraints[data.item.traitId] }]"
             v-if="getConstraints(data.item).length > 0"
             @click="toggleConstraints(data.item)"
             :ref="`constraints-${data.item.traitId}`">
          <div class="tt-constraint-list">
            <span class="tt-constraint" v-for="(constraint, index) in getConstraints(data.item)" :key="`constraint-${data.item.traitId}-${index}`">
              <i :class="constraint.icon" aria-hidden="true" v-if="constraint.icon" /> {{ constraint.text }}
            </span>
          </div>
          <i class="fa-solid fa-chevron-down tt-constraints-toggle" aria-hidden="true" v-if="cutConstraints[data.item.traitId] || expandedConstraints[data.item.traitId]" />
        </div>
      </template>
      <!-- Synonyms -->
      <template v-slot:cell(synonyms)="data">
        <span v-if="data.item.synonyms">{{ data.item.synonyms.join(', ') }}</span>
      </template>
      <!-- Edit trait -->
      <template v-slot:cell(edit)="data">
        <a href="#" class="text-decoration-none" @click.prevent="onTraitEditClicked(data.item)" v-if="storeToken && userIsAtLeast(storeToken.userType, USER_TYPE_DATA_CURATOR)" v-b-tooltip.hover :title="$t('tableTooltipTraitEdit')">
          <i class="fa-solid fa-pen-to-square tt-edit-icon" aria-hidden="true" />
        </a>
      </template>

      <!-- The datasets of the trait -->
      <template v-slot:row-details="data">
        <TraitDatasetDetails :traitId="data.item.traitId" v-if="!onlyColumns" />
      </template>
    </BaseTable>

    <!-- Trait state modal -->
    <TraitEditModal :trait="trait" v-if="trait && storeToken && userIsAtLeast(storeToken.userType, USER_TYPE_ADMINISTRATOR)" @changed="refresh" ref="traitEditModal" />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import MdiIcon from '@/components/icons/MdiIcon'
import BaseTable from '@/components/tables/BaseTable'
import TraitEditModal from '@/components/modals/TraitEditModal'
import TraitDatasetDetails from '@/components/tables/details/TraitDatasetDetails'
import defaultProps from '@/const/table-props.js'
import { dataTypes } from '@/mixins/types.js'
import { userIsAtLeast, USER_TYPE_ADMINISTRATOR, USER_TYPE_DATA_CURATOR } from '@/mixins/api/auth'
import { getNumberWithSuffix, formatNumber } from '@/mixins/formatting'
import { Pages } from '@/mixins/pages'

import { mdiHelpCircle } from '@mdi/js'

export default {
  name: 'TraitTable',
  props: {
    ...defaultProps.BASE,
    ...defaultProps.IDS,
    ...defaultProps.ACTIONS,
    // Only these columns, in this order (e.g. the trait details); the table then has a name of its own
    onlyColumns: {
      type: Array,
      default: null
    },
    selectionMode: {
      type: String,
      default: 'multi'
    }
  },
  data: function () {
    return {
      Pages,
      dataTypes,
      mdiHelpCircle,
      options: {
        idColumn: 'traitId',
        tableName: this.onlyColumns ? 'traitDetails' : 'traits'
      },
      trait: null,
      // Constraints of a trait (by its id) shown in full, and those cut on one line (measured)
      expandedConstraints: {},
      cutConstraints: {},
      USER_TYPE_ADMINISTRATOR,
      USER_TYPE_DATA_CURATOR
    }
  },
  computed: {
    ...mapGetters([
      'storeToken'
    ]),
    columns: function () {
      const result = [
        {
          key: 'traitId',
          type: Number,
          class: 'text-right',
          sortable: true,
          label: this.$t('tableColumnTraitId')
        }, {
          key: 'traitName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnTraitName'),
          preferredSortingColumn: true
        }, {
          key: 'traitNameShort',
          type: String,
          sortable: true,
          label: this.$t('tableColumnTraitNameShort')
        }, {
          key: 'traitDescription',
          type: String,
          sortable: true,
          label: this.$t('tableColumnTraitDescription')
        }, {
          key: 'dataType',
          type: 'dataType',
          sortable: true,
          label: this.$t('tableColumnTraitDataType')
        }, {
          key: 'traitRestrictions',
          type: undefined,
          sortable: false,
          label: this.$t('tableColumnTraitConstraints')
        }, {
          key: 'synonyms',
          type: 'json',
          sortable: true,
          label: this.$t('tableColumnTraitSynonyms')
        }, {
          key: 'categoryName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnTraitCategoryName')
        }, {
          key: 'traitSetSize',
          type: Number,
          sortable: true,
          label: this.$t('tableColumnTraitSetSize')
        }, {
          key: 'traitIsTimeseries',
          type: Boolean,
          sortable: true,
          label: this.$t('tableColumnTraitIsTimeseries')
        }, {
          key: 'unitName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnTraitUnitName')
        }, {
          key: 'unitDescription',
          type: String,
          sortable: true,
          label: this.$t('tableColumnTraitUnitDescription')
        }, {
          key: 'unitAbbreviation',
          type: String,
          sortable: true,
          label: this.$t('tableColumnTraitUnitAbbreviation')
        }, {
          key: 'datasetIds',
          // Filtered by the datasets chosen by their name (the trait in any of them)
          type: 'datasets',
          filterLabel: this.$t('pageDatasetsTitle'),
          filterDatasetType: 'trials',
          sortable: false,
          label: this.$t('tableColumnTraitNrDataset')
        }, {
          key: 'count',
          type: Number,
          class: 'text-right',
          sortable: true,
          label: this.$t('tableColumnTraitDataPoints'),
          formatter: value => getNumberWithSuffix(value, 2)
        }
      ]

      if (this.storeToken && userIsAtLeast(this.storeToken.userType, USER_TYPE_DATA_CURATOR)) {
        result.push({
          key: 'edit',
          type: undefined,
          sortable: false,
          label: ''
        })
      }

      if (this.selectionMode === 'multi') {
        result.unshift({
          key: 'selected',
          type: undefined,
          sortable: false,
          class: 'table-primary',
          label: ''
        })
      }

      // Only some columns, in their order (the trait details)
      if (this.onlyColumns) {
        return this.onlyColumns.map(key => result.find(c => c.key === key)).filter(c => c)
      }

      return result
    }
  },
  components: {
    BaseTable,
    MdiIcon,
    TraitEditModal,
    TraitDatasetDetails
  },
  methods: {
    // The datasets of a trait below its row; one row open at a time
    toggleDatasets: function (item) {
      const shown = item._showDetails === true
      const table = this.$refs.traitTable
      ;((table && table.pageItems) || []).forEach(other => {
        if (other !== item && other._showDetails) {
          this.$set(other, '_showDetails', false)
        }
      })
      this.$set(item, '_showDetails', !shown)
    },
    // The constraints of a trait as chips: minimum, maximum, then each category
    getConstraints: function (item) {
      const restrictions = item.traitRestrictions
      if (!restrictions) {
        return []
      }
      const result = []
      if (restrictions.min !== undefined && restrictions.min !== null) {
        result.push({ text: `≥ ${formatNumber(restrictions.min)}`, icon: null })
      }
      if (restrictions.max !== undefined && restrictions.max !== null) {
        result.push({ text: `≤ ${formatNumber(restrictions.max)}`, icon: null })
      }
      ;(restrictions.categories || []).forEach(category => {
        (Array.isArray(category) ? category : [category]).forEach(value => {
          if (value !== null && value !== undefined && `${value}`.trim() !== '') {
            result.push({ text: `${value}`, icon: null })
          }
        })
      })
      return result
    },
    toggleConstraints: function (item) {
      if (!this.expandedConstraints[item.traitId] && !this.cutConstraints[item.traitId]) {
        return
      }
      this.$set(this.expandedConstraints, item.traitId, !this.expandedConstraints[item.traitId])
    },
    // Which constraint cells are cut on their line (after the rows are shown, and when the width changes)
    measureConstraints: function () {
      // The rows are drawn after the data arrived
      setTimeout(() => {
        Object.keys(this.$refs).filter(key => key.startsWith('constraints-')).forEach(key => {
          const element = Array.isArray(this.$refs[key]) ? this.$refs[key][0] : this.$refs[key]
          if (!element) {
            return
          }
          const id = key.replace('constraints-', '')
          const list = element.querySelector('.tt-constraint-list')
          if (!this.expandedConstraints[id]) {
            this.$set(this.cutConstraints, id, list.scrollWidth > list.clientWidth + 1)
          }
        })
      }, 50)
    },
    userIsAtLeast,
    refresh: function () {
      this.$refs.traitTable.refresh()
    },
    onTraitEditClicked: function (trait) {
      this.$emit('trait-edit', trait)
      this.trait = trait

      this.$nextTick(() => this.$refs.traitEditModal.show())
    },
    // The width changed: the constraints cut on their line again (once the resizing stopped)
    onResize: function () {
      clearTimeout(this.resizeTimer)
      this.resizeTimer = setTimeout(this.measureConstraints, 150)
    }
  },
  mounted: function () {
    window.addEventListener('resize', this.onResize)
  },
  beforeDestroy: function () {
    window.removeEventListener('resize', this.onResize)
    clearTimeout(this.resizeTimer)
  }
}
</script>

<style>
/* Constraints: rounded neutral chips side by side, cut (fading) on one line; expanded: all of them, on several lines */
.tt-constraints {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  max-width: 22rem;
}
.tt-constraints.cut,
.tt-constraints.expanded {
  cursor: pointer;
}
.tt-constraint-list {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: nowrap;
  gap: 0.3rem;
  min-width: 0;
  overflow: hidden;
}
.tt-constraints.cut:not(.expanded) .tt-constraint-list {
  -webkit-mask-image: linear-gradient(to right, #000 80%, transparent 100%);
  mask-image: linear-gradient(to right, #000 80%, transparent 100%);
}
.tt-constraints.expanded .tt-constraint-list {
  flex-wrap: wrap;
}
.tt-constraint {
  flex-shrink: 0;
  padding: 0.15rem 0.6rem;
  border: 1px solid var(--bt-border, #e2e3df);
  border-radius: 999px;
  background: var(--bt-head-bg, #f7f7f5);
  color: var(--bt-text-subtle, #4a4d4b);
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}
.tt-constraints-toggle {
  flex-shrink: 0;
  margin-top: 0.3rem;
  color: var(--bt-muted, #6b6f6c);
  font-size: 0.65rem;
  transition: transform 0.15s ease;
}
.tt-constraints.expanded .tt-constraints-toggle {
  transform: rotate(180deg);
}
/* Edit: the Font Awesome pen, larger than the text but no taller than the line (the rows keep their height) */
.tt-edit-icon {
  font-size: 1.25em;
  line-height: 1;
  vertical-align: middle;
}
</style>
