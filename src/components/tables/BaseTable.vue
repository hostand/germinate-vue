<template>
  <div :class="['base-table', modernLook ? 'bt-modern' : 'mb-3']" :id="id">
    <!-- New look: one card with a toolbar (tools on the left; count, jump to page and page size on the right), the active
         filters on a line below it, the table and the pagination at the bottom right -->
    <template v-if="modernLook">
      <div class="bt-toolbar">
        <TableFilter :columns="columns"
                     :texts="options.headings"
                     :tableName="options.tableName"
                     :filterOn="filterOn"
                     :storeUrlParameters="storeUrlParameters"
                     modernLook
                     :filterLocked="filterLocked"
                     :autoHiddenColumns="autoHiddenColumns"
                     ref="tableFilter"
                     v-if="filterEnabled"
                     v-on:on-column-toggle="onColumnToggle"
                     v-on:filter-changed="onFilterChanged"
                     v-on:filter-opened="filterShown = true"
                     v-on:help-clicked="$refs.tableTour.start()"/>
        <div v-else />

        <div class="bt-toolbar-end">
          <template v-if="currentRequestData !== null && pagination.totalCount >= 0">
            <span v-if="showAllItems" class="bt-count" id="table-row-count">{{ $tc('paginationCountCustom', pagination.totalCount, { from: 1, to: formatNumber(pagination.totalCount), count: formatNumber(pagination.totalCount) }) }}</span>
            <span v-else class="bt-count" id="table-row-count">{{ $tc('paginationCountCustom', pagination.totalCount, { from: formatNumber(currentRequestData.page * currentRequestData.limit + 1), to: formatNumber(Math.min((currentRequestData.page + 1) * currentRequestData.limit, pagination.totalCount)), count: formatNumber(pagination.totalCount) }) }}</span>
          </template>
          <template v-if="!showAllItems">
            <button type="button" class="bt-tool" id="table-jump-to-page" :disabled="maxPage < 2" @click="showJumpToPage" v-b-tooltip.hover :title="$t('modalTitleJumpToPage')" :aria-label="$t('modalTitleJumpToPage')">
              <i class="fa-solid fa-book-open" aria-hidden="true" />
            </button>
            <b-dropdown id="table-page-size-dropdown" right no-caret variant="link" toggle-class="bt-select" v-b-tooltip.hover :title="$t('tooltipTableItemsPerPage')">
              <template #button-content>{{ storeTablePerPage }} <i class="fa-solid fa-chevron-down" aria-hidden="true" /></template>
              <b-dropdown-item v-for="value in perPageValues" @click="onPerPageChanged(value)" :key="'table-per-page-' + value" :active="value === storeTablePerPage">{{ value }}</b-dropdown-item>
            </b-dropdown>
          </template>
        </div>
      </div>

      <!-- Active filters: "Filter: 'Column' comparator 'values'", joined by their operator -->
      <!-- On one line, cut with "…" when wider than the table; then the chevron shows all of it -->
      <!-- Not the fixed filters of the page (the context of the table, e.g. the institutions of one dataset) -->
      <div :class="['bt-filter-line', { 'is-expanded': filterExpanded }]" v-if="filterShown && visibleFilters.length > 0">
        <div class="bt-filter-content" ref="filterContent">
          <span class="bt-filter-label">{{ $t('paginationFilter') }}:</span>
          <template v-for="(item, index) in visibleFilters">
            <span :key="`bt-filter-${index}`" :class="['bt-filter-item', { 'is-invalid': !isValidFilter(item.filter) }]" v-b-tooltip="isValidFilter(item.filter) ? null : $t('tooltipTableFilterInvalid')">{{ item.text }}</span>
            <span :key="`bt-filter-operator-${index}`" class="bt-filter-operator" v-if="index < visibleFilters.length - 1">{{ getOperatorText(item.filter.operator) }}</span>
          </template>
        </div>
        <button type="button" class="bt-filter-toggle" v-if="filterOverflows || filterExpanded" @click="filterExpanded = !filterExpanded" :aria-expanded="filterExpanded ? 'true' : 'false'" :aria-label="$t('paginationFilter')">
          <i class="fa-solid fa-chevron-down" aria-hidden="true" />
        </button>
      </div>

      <!-- Loading: a thin moving line above the table -->
      <div class="bt-progress" :title="isLoading ? $t('tooltipTableLoadingIndicator') : null"><div class="bt-progress-bar" v-if="isLoading" /></div>
    </template>

    <div v-if="!modernLook">
      <!-- Filter display: as the breadcrumb of the Search page, or as badges -->
      <SearchCrumbs v-if="filterCrumbs && filter && filter.length > 0" :crumbs="filterCrumbTexts" class="base-table-crumbs" />
      <div v-else-if="filter" class="mb-2">
        <span v-for="(f, index) in filter" :key="f.column.name">
          <!-- Comparison -->
          <b-badge :variant="isValidFilter(f) ? 'info' : 'danger'" class="mr-2" v-b-tooltip="isValidFilter(f) ? null : $t('tooltipTableFilterInvalid')" >
            {{ (filterLabel && filterLabel(f)) || getFilterText(f) }}
          </b-badge>
          <!-- Operator -->
          <b-badge v-if="index < filter.length - 1" class="mr-2">
            {{ Object.keys(operators).filter(o => operators[o].value === f.operator).map(o => operators[o])[0].text() }}
          </b-badge>
        </span>
      </div>
    </div>
    <!-- Table container -->
    <div class="d-flex flex-row flex-wrap justify-content-between align-items-end" v-if="!modernLook">
      <!-- Table filter mechanism including column selector -->
      <TableFilter :columns="columns"
                   :texts="options.headings"
                   :tableName="options.tableName"
                   :filterOn="filterOn"
                   :storeUrlParameters="storeUrlParameters"
                   divClass="order-1 order-sm-0"
                   ref="tableFilter"
                   v-if="filterEnabled"
                   v-on:filter-changed="onFilterChanged"
                   v-on:help-clicked="$refs.tableTour.start()"/>

      <!-- Content in the middle -->
      <div class="flex-grow-1 order-0 order-sm-1">
        <div class="d-flex flex-row justify-content-between">
          <!-- Table filtering info -->
          <div class="d-none d-sm-flex mx-1 text-info" v-if="filterEnabled && (filter === null || filter.length < 1)">
            <MdiIcon :path="mdiArrowLeftBold" className="mr-1" /> <span class="mb-1"> {{ $t('widgetTableFilterInfo') }}</span>
          </div>
          <div v-else />
          <!-- Row count -->
          <template v-if="currentRequestData !== null && pagination.totalCount >= 0">
            <div v-if="showAllItems" class="d-flex mx-2 mb-1" id="table-row-count">{{ $tc('paginationCountCustom', pagination.totalCount, { from: 1, to: formatNumber(pagination.totalCount), count: formatNumber(pagination.totalCount) }) }}</div>
            <div v-else class="d-flex mx-2 mb-1" id="table-row-count">{{ $tc('paginationCountCustom', pagination.totalCount, { from: formatNumber(currentRequestData.page * currentRequestData.limit + 1), to: formatNumber(Math.min((currentRequestData.page + 1) * currentRequestData.limit, pagination.totalCount)), count: formatNumber(pagination.totalCount) }) }}</div>
          </template>
        </div>
        <!-- Progress bar below it all that indicates the loading state -->
        <b-progress :value="100" height="6px" variant="primary" v-b-tooltip.hover :title="$t('tooltipTableLoadingIndicator')" striped animated v-if="isLoading" class="table-loading-indicator" />
        <div v-else style="height: 6px;" />
      </div>

      <!-- Item per page dropdown -->
      <b-button-group class="per-page-dropdown order-2 order-sm-2" v-if="!showAllItems">
        <b-dropdown v-b-tooltip.hover :title="$t('tooltipTableItemsPerPage')" id="table-page-size-dropdown" right>
          <template slot="button-content">
            <MdiIcon :path="mdiBookOpenPageVariant" /><span> {{ storeTablePerPage }}</span>
          </template>
          <b-dropdown-item v-for="value in perPageValues" @click="onPerPageChanged(value)" :key="'table-per-page-' + value" :active="value === storeTablePerPage">{{ value }}</b-dropdown-item>
        </b-dropdown>
        <!-- Item marking mechanism -->
        <MarkedItems :itemType="itemType" />
      </b-button-group>
    </div>

    <!-- Actual table -->
    <b-table :items="getDataLocal"
            :fields="reformattedColumns"
            :striped="!modernLook"
            responsive
            hover
            :outlined="!modernLook"
            show-empty
            :busy="isLoading"
            :head-variant="modernLook ? null : 'dark'"
            table-class="position-relative"
            :empty-text="$t('paginationNoResult')"
            :sort-by="options.orderBy"
            :sort-desc="options.orderByDesc"
            :tbody-tr-class="options ? options.rowClassCallback : defaultRowClassCallback"
            @refreshed="notifyLoaded"
            @sort-changed="updateSort"
            ref="table">
      <!-- Pass on all named slots -->
      <slot v-for="slot in Object.keys($slots)" :name="slot" :slot="slot"/>
      <!-- Pass on all scoped slots. New look, every table: the dataset name and description (clampSlots, with or without
           a slot of the table) on one line, "..." where cut, and then a chevron that shows all of it (the row grows
           downwards); the chevron again folds it. One loop for both: two loops of slots lose the first one. -->
      <template v-for="slot in getPassedSlots()" :slot="slot" slot-scope="scope">
        <div :class="['bt-clamp', { expanded: clampExpanded[getClampKey(scope)], cut: clampCut[getClampKey(scope)] }]" :data-clamp="getClampKey(scope)" :key="`clamp-${slot}`" v-if="clampSlots.includes(slot)">
          <span class="bt-clamp-text"><slot :name="slot" v-bind="scope">{{ scope.value }}</slot></span>
          <button type="button" class="bt-clamp-toggle" v-if="clampCut[getClampKey(scope)] || clampExpanded[getClampKey(scope)]" @click="toggleClamp(scope)" :aria-label="$t('buttonReadMore')">
            <i class="fa-solid fa-chevron-down" aria-hidden="true" />
          </button>
        </div>
        <!-- Every table: an attribute value that is a web address (http:// or https://) opens it in a new window; the
             look of the cell stays the same (a table with its own slot for the column keeps it) -->
        <a :href="scope.value" target="_blank" rel="noopener noreferrer" :key="`url-${slot}`" v-else-if="urlSlots.includes(slot) && !$scopedSlots[slot] && isUrl(scope.value)">{{ scope.value }}</a>
        <!-- The slot of the table, without content of its own when it renders nothing (an empty cell stays empty) -->
        <slot :name="slot" v-bind="scope" v-else-if="$scopedSlots[slot]" />
        <span :key="`value-${slot}`" v-else>{{ scope.value }}</span>
      </template>

      <!-- Selected column (first checkbox) -->
      <template v-slot:head(selected)>
        <div v-if="(reformattedColumns.map(c => c.key).indexOf('selected') !== -1) && (getIds !== null) && selectionMode == 'multi'">
          <b-form-checkbox :checked="allSelected" @change="onSelectionHeaderClicked"/>
        </div>
      </template>
      <template v-slot:cell(selected)="data">
        <b-form-checkbox :value="data.item[options.idColumn]" v-model="selectedItems" @change="updateRowVariant(data.item)" v-if="reformattedColumns.map(c => c.key).indexOf('selected') !== -1"/>
      </template>
      <template #table-colgroup v-if="hasSelectionColumn">
        <col key="selected" :style="{ width: '40px' }" />
      </template>

      <!-- New look: the marking checkboxes in the first column. The head: the items of the page (checked when all are
           marked, a dash when some are) and a chevron with the other options; a row: its checkbox and, if the table has
           more marking options, a chevron shown on hover. One menu for all of them (markMenu), not one per row. The old look: its dropdowns. -->
      <template v-slot:head(marked)>
        <div class="bt-mark" v-if="modernLook && itemType">
          <input type="checkbox" class="bt-mark-input" :checked="pageMarkState === 'all'" :indeterminate.prop="pageMarkState === 'some'" :disabled="!pageItems || pageItems.length < 1" @change="markPageItems($event.target.checked)" :aria-label="$t('tableItemMarkingMarkAll')" />
          <button type="button" class="bt-mark-more" @click.stop="openMarkMenu($event, null)" :aria-label="$t('pageMarkedItemsTitle')"><i class="fa-solid fa-chevron-down" aria-hidden="true" /></button>
        </div>
        <b-dropdown size="sm" dropleft variant="outline-light" boundary="window" v-else-if="!modernLook">
          <template slot="button-content">
            <MdiIcon :path="mdiCheckboxMultipleOutline" />
          </template>
          <b-dropdown-item @click="markAllItems(true)"><MdiIcon :path="mdiCheckboxMultipleMarked" /> {{ $t('tableItemMarkingMarkAll') }}</b-dropdown-item>
          <b-dropdown-item @click="markAllItems(false)"><MdiIcon :path="mdiCheckboxMultipleBlankOutline" /> {{ $t('tableItemMarkingUnmarkAll') }}</b-dropdown-item>
          <b-dropdown-item @click="createGroup" v-if="storeToken" :disabled="!storeMarkedIds[itemType] || storeMarkedIds[itemType].length < 1"><MdiIcon :path="mdiGroup" /> {{ $t('tableItemMarkingCreateGroup') }}</b-dropdown-item>
          <template v-if="options.additionalMarkingOptions">
            <b-dropdown-divider />
            <b-dropdown-item v-for="item in options.additionalMarkingOptions" :key="item.key" @click="item.callback(null)">
              <MdiIcon :path="item.path" /> {{ item.text() }}
            </b-dropdown-item>
          </template>
        </b-dropdown>
      </template>
      <template v-slot:cell(marked)="data">
        <div class="bt-mark" v-if="modernLook && itemType">
          <input type="checkbox" class="bt-mark-input" :checked="isMarked(data.item)" @change="markItem(data.item[options.idColumn], $event.target.checked)" :aria-label="$t('tableItemMarkingMarkAll')" />
          <button type="button" class="bt-mark-more is-row" v-if="options.additionalMarkingOptions" @click.stop="openMarkMenu($event, data.item)" :aria-label="$t('pageMarkedItemsTitle')"><i class="fa-solid fa-chevron-down" aria-hidden="true" /></button>
        </div>
        <template v-else-if="!modernLook && itemType">
          <template v-if="options.additionalMarkingOptions">
            <b-dropdown size="sm" split text="Split Dropdown" class="m-2" @click="markItem(data.item[options.idColumn], !isMarked(data.item))">
              <template #button-content>
                <b-form-checkbox :checked="isMarked(data.item)" :style="{ pointerEvents: 'none' }" />
              </template>
              <b-dropdown-item href="#" v-for="item in options.additionalMarkingOptions" :key="item.key" @click.prevent="item.callback(data.item)">
                <MdiIcon :path="item.path" /> {{ item.text() }}
              </b-dropdown-item>
            </b-dropdown>
          </template>
          <b-form-checkbox :checked="isMarked(data.item)" @change="markItem(data.item[options.idColumn], $event)" v-else/>
        </template>
      </template>
    </b-table>

    <!-- New look: the menu of the marking checkboxes (head: all the items, the marked items; a row: its own options) -->
    <div class="bt-mark-menu dropdown-menu show" v-if="modernLook && markMenu" :style="{ top: markMenu.top + 'px', left: markMenu.left + 'px' }" ref="markMenu" role="menu" @click.stop>
      <template v-if="markMenu.item">
        <button type="button" class="dropdown-item" v-for="option in options.additionalMarkingOptions" :key="option.key" @click="runMarkOption(option.callback, markMenu.item)">
          <MdiIcon :path="option.path" /> {{ option.text() }}
        </button>
      </template>
      <template v-else>
        <button type="button" class="dropdown-item" @click="runMarkOption(() => markAllItems(true))"><i class="fa-solid fa-square-check fa-fw" aria-hidden="true" /> {{ $t('tableItemMarkingMarkAll') }}</button>
        <button type="button" class="dropdown-item" @click="runMarkOption(() => markAllItems(false))"><i class="fa-regular fa-square fa-fw" aria-hidden="true" /> {{ $t('tableItemMarkingUnmarkAll') }}</button>
        <div class="dropdown-divider" />
        <router-link class="dropdown-item" :to="{ name: Pages.markedItemsType, params: { itemType: itemType } }" @click.native="closeMarkMenu"><i class="fa-solid fa-list-check fa-fw" aria-hidden="true" /> {{ $t('pageMarkedItemsTitle') }} <span class="bt-mark-count">{{ markedCount }}</span></router-link>
        <button type="button" class="dropdown-item" v-if="storeToken" :disabled="markedCount < 1" @click="runMarkOption(createGroup)"><i class="fa-solid fa-object-group fa-fw" aria-hidden="true" /> {{ $t('tableItemMarkingCreateGroup') }}</button>
        <button type="button" class="dropdown-item is-danger" :disabled="markedCount < 1" @click="runMarkOption(clearMarkedItems)"><i class="fa-solid fa-trash-can fa-fw" aria-hidden="true" /> {{ $t('tooltipTableMarkedItemsClear') }}</button>
        <template v-if="options.additionalMarkingOptions">
          <div class="dropdown-divider" />
          <button type="button" class="dropdown-item" v-for="option in options.additionalMarkingOptions" :key="option.key" @click="runMarkOption(option.callback, null)">
            <MdiIcon :path="option.path" /> {{ option.text() }}
          </button>
        </template>
      </template>
    </div>

    <!-- New look: below the table, the actions on the left and the pagination on the right -->
    <div class="bt-footer" v-if="modernLook && (tableActions || downloadTable || (hasSelectionColumn && selectionMode === 'multi') || (!showAllItems && pagination.totalCount > storeTablePerPage))">
      <div class="bt-footer-start">
        <!-- Selecting several items: how -->
        <span class="bt-footer-info" v-if="hasSelectionColumn && selectionMode === 'multi'"><i class="fa-solid fa-arrow-up" aria-hidden="true" /> {{ $t('widgetTableMultiSelectInfo') }}</span>
        <!-- Download: only when the table has rows (nothing to download otherwise) -->
        <button type="button" class="bt-tool" v-if="downloadTable !== null && pagination.totalCount !== 0" @click="onDownloadTableClicked" id="table-download" v-b-tooltip.hover.bottom :title="$t('buttonDownload')" :aria-label="$t('buttonDownload')">
          <i class="fa-solid fa-download" aria-hidden="true" />
        </button>
        <template v-if="tableActions">
          <!-- An action: its icon (Font Awesome "icon" or MDI "path"), highlighted while active() -->
          <button type="button"
                  :class="['bt-tool', { 'is-active': action.active && action.active() }]"
                  v-for="action in tableActions"
                  :key="`base-table-action-${action.id}`"
                  :disabled="action.disabled(selectedItems)"
                  @click="action.callback(selectedItems)"
                  v-b-tooltip.hover.bottom
                  :title="action.text"
                  :aria-label="action.text"
                  :aria-pressed="action.active ? (action.active() ? 'true' : 'false') : null">
            <i :class="action.icon" aria-hidden="true" v-if="action.icon" />
            <MdiIcon :path="action.path" v-else-if="action.path" />
            <span v-else>{{ action.text }}</span>
          </button>
        </template>
      </div>
      <b-pagination v-model="pagination.currentPage"
                    :total-rows="pagination.totalCount"
                    :per-page="storeTablePerPage"
                    :limit="5"
                    last-number
                    class="bt-pagination"
                    id="table-pagination"
                    v-if="!showAllItems && pagination.totalCount > storeTablePerPage">
        <template #first-text><i class="fa-solid fa-angles-left" aria-hidden="true" /></template>
        <template #prev-text><i class="fa-solid fa-angle-left" aria-hidden="true" /></template>
        <template #next-text><i class="fa-solid fa-angle-right" aria-hidden="true" /></template>
        <template #last-text><i class="fa-solid fa-angles-right" aria-hidden="true" /></template>
      </b-pagination>
    </div>

    <!-- Container below the table -->
    <div class="d-flex flex-wrap-reverse justify-content-between align-items-end" v-if="!modernLook">
      <div class="table-bottom-left">
        <!-- Information about selecting multiple items in the table -->
        <template v-if="reformattedColumns.map(c => c.key).indexOf('selected') !== -1 && selectionMode === 'multi'">
          <div>
            <span class="ml-2"><MdiIcon :path="mdiArrowUpBold" /></span><span>{{ $t('widgetTableMultiSelectInfo') }}</span>
          </div>
        </template>

        <!-- Any additional actions and the download button -->
        <b-button-group v-if="tableActions || downloadTable">
          <!-- Download button -->
          <b-button class="table-download" v-if="downloadTable !== null" @click="onDownloadTableClicked" id="table-download" v-b-tooltip.hover.bottom :title="$t('buttonDownload')"><MdiIcon :path="mdiDownload" /></b-button>
          <template v-if="tableActions">
            <!-- Table actions -->
            <b-button v-for="action in tableActions"
                      :key="`base-table-action-${action.id}`"
                      :variant="action.variant"
                      :disabled="action.disabled(selectedItems)"
                      @click="action.callback(selectedItems)"
                      v-b-tooltip.hover.bottom
                      :title="action.text">
              <MdiIcon :path="action.path" v-if="action.path" />
              <span v-else>{{ action.text }}</span>
            </b-button>
          </template>
        </b-button-group>
      </div>

      <!-- Page indicator and pagination -->
      <div class="d-flex" v-if="!showAllItems">
        <b-button-group class="table-pagination" v-show="pagination.totalCount > storeTablePerPage">
          <b-button class="text-primary page-link" @click="showJumpToPage" id="table-jump-to-page"><MdiIcon :path="mdiBookOpenPageVariant" /> {{ $t('paginationPageCustom', { from: pagination.currentPage, to: maxPage }) }}</b-button>
          <b-pagination v-model="pagination.currentPage"
                        :total-rows="pagination.totalCount"
                        :per-page="storeTablePerPage"
                        id="table-pagination"
                        v-if="pagination.totalCount > 0" />
        </b-button-group>
      </div>
    </div>

    <!-- Group edit/add modal -->
    <GroupEditAddModal v-if="storeToken && storeMarkedIds[itemType] && storeMarkedIds[itemType].length > 0" :groupToEdit="newGroup" :groupTypeSelect="groupTypeSelect" ref="groupAddModal" v-on:ok="putGroup"/>

    <!-- Jump to page modal -->
    <b-modal :title="$t('modalTitleJumpToPage')"
             @shown="$refs.pageNumberInput.select()"
             @ok="jumpToPage"
             :ok-title="$t('buttonOk')"
             ok-only
             ref="jumpToPageModal">
      <b-form @submit.prevent="jumpToPage" ref="jumpToPageForm">
        <b-form-group
          :label="$t('modalMessageJumpToPage', { maxPage: maxPage })"
          label-for="pageNumber"
          :description="$t('modalTextJumpToPage')">
          <b-form-input
            v-model.number="jumpToPageValue"
            type="number"
            required
            :min="1"
            :max="maxPage"
            ref="pageNumberInput" />
        </b-form-group>
      </b-form>
    </b-modal>

    <!-- Tour showing how to use the table -->
    <Tour ref="tableTour" :steps="tableTourSteps" :modernLook="modernLook" />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

import MdiIcon from '@/components/icons/MdiIcon'
import GroupEditAddModal from '@/components/modals/GroupEditAddModal'
import MarkedItems from '@/components/tables/MarkedItems'
import TableFilter from '@/components/tables/TableFilter'
import Tour from '@/components/util/Tour'
import { apiPutGroup, apiPatchGroupMembers, apiGetGroupTypes } from '@/mixins/api/group'
import { operators, comparators } from '@/mixins/search'
import SearchCrumbs from '@/components/search/SearchCrumbs'
import { groupTypes } from '@/mixins/types'
import { getDateTimeString, formatNumber } from '@/mixins/formatting'
import { uuidv4, getTableColumnStyle, downloadBlob } from '@/mixins/util'
import { MAX_JAVA_INTEGER } from '@/mixins/api/base'

import { mdiArrowLeftBold, mdiBookOpenPageVariant, mdiArrowUpBold, mdiCheckboxMultipleOutline, mdiCheckboxMultipleMarked, mdiCheckboxMultipleBlankOutline, mdiGroup, mdiDownload } from '@mdi/js'
import { Pages } from '@/mixins/pages'
import { followAnchor } from '@/mixins/anchored-menu'
import { getDatasetName, loadDatasetNames } from '@/mixins/dataset-names'

const emitter = require('tiny-emitter/instance')

// Display rule of every table with germplasm (trials data, attributes, pedigree, entities ...): its GID, synonyms and
// entity type columns start hidden, the column selector shows them again. Each column hidden once per table (kept in
// the store with the hidden columns, as below), then it is the user's choice. The germplasm table has its own, longer
// list (GermplasmTable). A column of any table marked "defaultHidden: true" starts hidden the same way.
const GERMPLASM_DEFAULT_HIDDEN_COLUMNS = [
  'germplasmGid',
  'entityParentGid',
  'entityChildGid',
  'entityParentGeneralIdentifier',
  'parentGid',
  'childGid',
  'germplasmSynonyms',
  'entityTypeName',
  'entityType',
  'entityParentType',
  'entityChildType'
]
const GERMPLASM_DEFAULT_HIDDEN_APPLIED = 'germplasmColumnsDefaultHidden'

// Columns cut on one line in every table (new look), a chevron showing all of the text
const CLAMP_COLUMNS = ['datasetName', 'datasetDescription']
// Columns whose web addresses (http:// or https://) are links, in every table
const URL_COLUMNS = ['attributeValue']
const URL_PATTERN = /^https?:\/\/\S+$/i
// A filter as text (column, comparator, values), to compare those of the table with the fixed ones of the page
const getFilterKey = (column, comparator, values) => `${column}|${comparator}|${(values || []).map(v => `${v}`).join(',')}`
// The key of a filter of the table (its column a name or an object)
const getKeyOfFilter = f => getFilterKey(f.column && f.column.name !== undefined ? f.column.name : f.column, f.comparator, f.values)

export default {
  name: 'base-table',
  props: {
    // The new look of the tables (table-modern.css): one card, toolbar, filter line, pagination at the bottom. The look of
    // all the tables; false only for the former look
    modernLook: {
      type: Boolean,
      default: true
    },
    // The filter button shown but disabled (the table shows a fixed selection)
    filterLocked: {
      type: Boolean,
      default: false
    },
    // Columns with less than half of their values filled in hidden when the table loads (autoHideSparseColumns)
    autoHideColumns: {
      type: Boolean,
      default: true
    },
    // Page and sorting not read from nor written to the URL (another table of the same name on the page)
    noUrlParams: {
      type: Boolean,
      default: false
    },
    // The filters above the table as the breadcrumb of the Search page (instead of badges)
    filterCrumbs: {
      type: Boolean,
      default: false
    },
    showAllItems: {
      type: Boolean,
      default: null
    },
    storeUrlParameters: {
      type: Boolean,
      default: true
    },
    filterOn: {
      type: Array,
      default: null
    },
    filterEnabled: {
      type: Boolean,
      default: true
    },
    columns: {
      type: Array,
      default: () => []
    },
    itemType: {
      type: String,
      default: null
    },
    options: {
      type: Object,
      default: () => {}
    },
    tableActions: {
      type: Array,
      default: () => null
    },
    // Own text for the badge of a filter above the table: (filter) => text, or null for the usual one
    filterLabel: {
      type: Function,
      default: null
    },
    downloadTable: {
      type: Function,
      default: null
    },
    getData: {
      type: Function,
      default: () => {
        return {
          data: [],
          count: 0
        }
      }
    },
    getIds: {
      type: Function,
      default: null
    },
    selectionMode: {
      type: String,
      default: 'multi'
    }
  },
  data: function () {
    const id = 'table-' + uuidv4()

    return {
      operators,
      comparators,
      mdiArrowLeftBold,
      mdiDownload,
      mdiBookOpenPageVariant,
      mdiArrowUpBold,
      mdiCheckboxMultipleOutline,
      mdiCheckboxMultipleMarked,
      mdiCheckboxMultipleBlankOutline,
      mdiGroup,
      pagination: {
        currentPage: 1,
        totalCount: -1
      },
      filter: null,
      perPageValues: this.showAllItems ? [MAX_JAVA_INTEGER] : [10, 25, 50, 100],
      currentRequestData: null,
      isLoading: false,
      groupTypeSelect: null,
      newGroup: null,
      selectedItems: [],
      jumpToPageValue: 1,
      tableTourSteps: [],
      // New look: the filter line wider than the table (cut), and shown in full
      filterOverflows: false,
      // Columns hidden when the table loaded because less than half of their values were filled in (not kept: the
      // user's own choices are in the store); evaluated once, on the first page with data
      autoHiddenColumns: [],
      autoHideDone: false,
      // New look: the items of the page (state of the head checkbox) and the open marking menu ({ item, top, left })
      pageItems: [],
      // The line of the active filters: shown once the user opened or set the filter (filter button, onFilterChanged)
      filterShown: false,
      markMenu: null,
      // Cut columns (CLAMP_COLUMNS): the cells shown in full and those cut on their line ("<column>-<row index>")
      clampExpanded: {},
      clampCut: {},
      Pages,
      filterExpanded: false,
      resizeObserver: null,
      id: id
    }
  },
  watch: {
    filter: function () {
      this.filterExpanded = false
      this.$nextTick(() => this.checkFilterOverflow())
    },
    filterExpanded: function () {
      this.$nextTick(() => this.checkFilterOverflow())
    },
    'pagination.currentPage': function (newValue) {
      this.$refs.table.refresh()

      this.updateQuery(newValue)
    },
    'pagination.totalCount': function () {
      this.updateTableTour()
    },
    storeTablePerPage: function () {
      this.$nextTick(() => this.$refs.table.refresh())
    },
    selectedItems: function (newValue) {
      if (this.selectionMode !== 'multi' && newValue && newValue.length > 1) {
        this.$nextTick(() => {
          this.selectedItems = [newValue[newValue.length - 1]]
        })
      } else {
        // One selected only: the row selected before loses its tint
        if (this.selectionMode !== 'multi') {
          (this.pageItems || []).forEach(item => this.updateRowVariant(item))
        }
        this.$emit('selection-changed', newValue)
      }
    }
  },
  computed: {
    ...mapGetters([
      'storeHiddenColumns',
      'storeMarkedIds',
      'storeTablePerPage',
      'storeToken'
    ]),
    // Marked items of the type of the table
    markedCount: function () {
      return (this.itemType && this.storeMarkedIds[this.itemType]) ? this.storeMarkedIds[this.itemType].length : 0
    },
    // Head checkbox: 'all', 'some' or 'none' of the items of the page marked
    pageMarkState: function () {
      if (!this.itemType || !this.pageItems || this.pageItems.length < 1) {
        return 'none'
      }
      const marked = this.storeMarkedIds[this.itemType] || []
      const count = this.pageItems.filter(item => marked.includes(item[this.options.idColumn])).length
      return count === 0 ? 'none' : (count === this.pageItems.length ? 'all' : 'some')
    },
    allSelected: function () {
      return this.selectedItems.length > 0 && this.selectedItems.length === this.pagination.totalCount
    },
    maxPage: function () {
      return Math.ceil(this.pagination.totalCount / this.storeTablePerPage)
    },
    hasSelectionColumn: function () {
      if (!this.columns) {
        return false
      } else {
        return this.columns.some(c => c.key === 'selected')
      }
    },
    // The text of each filter, as on the badges, for the breadcrumb
    filterCrumbTexts: function () {
      return (this.filter || []).map(f => (this.filterLabel && this.filterLabel(f)) || this.getFilterText(f))
    },
    // The fixed filters given by the page (canBeChanged false, e.g. the institutions of one dataset): the context of the
    // table, not a filter of the user
    fixedFilterKeys: function () {
      return (this.filterOn || [])
        .filter(f => f.canBeChanged === false)
        .map(f => getFilterKey(f.column && f.column.name !== undefined ? f.column.name : f.column, f.comparator, f.values))
    },
    // The line of the active filters (new look): without the fixed filters, each with its text
    visibleFilters: function () {
      return (this.filter || [])
        .map((f, index) => ({ filter: f, text: this.filterCrumbTexts[index] }))
        .filter(item => !this.fixedFilterKeys.includes(getFilterKey(item.filter.column, item.filter.comparator, item.filter.values)))
    },
    // The cell slots of the cut columns of this table
    clampSlots: function () {
      if (!this.modernLook || !this.columns) {
        return []
      }
      return this.columns.filter(c => CLAMP_COLUMNS.includes(c.key)).map(c => `cell(${c.key})`)
    },
    // The cell slots of the columns with web addresses as links
    urlSlots: function () {
      return (this.columns || []).filter(c => URL_COLUMNS.includes(c.key)).map(c => `cell(${c.key})`)
    },
    reformattedColumns: function () {
      if (this.columns) {
        let columns = this.columns
        if (this.modernLook && columns.some(c => c.key === 'marked')) {
          const marked = columns.find(c => c.key === 'marked')
          columns = columns.filter(c => c.key !== 'marked')
          columns.splice(columns.length > 0 && columns[0].key === 'selected' ? 1 : 0, 0, marked)
        }
        return columns.map(c => {
          const result = Object.assign({}, c)

          // The key as a class too, so a page can style a column (e.g. bt-col-germplasmPuid)
          let clazz = `${result.class || ''} bt-col-${c.key}`
          if (this.options && this.options.tableName) {
            clazz = `${clazz} ${getTableColumnStyle(this.options.tableName, c.key)}`
          }

          if (result.isHidden || this.autoHiddenColumns.includes(c.key)) {
            clazz = 'd-none'
          }

          if (c.type === Number && !result.formatter && !/(^id$|Ids?$|year)/i.test(c.key)) {
            result.formatter = value => formatNumber(value)
          }

          result.class = clazz

          return result
        })
      } else {
        return []
      }
    }
  },
  components: {
    MdiIcon,
    GroupEditAddModal,
    SearchCrumbs,
    MarkedItems,
    TableFilter,
    Tour
  },
  methods: {
    formatNumber,
    updateRowVariant: function (item) {
      let variant = null

      if (this.options.rowVariant !== null && typeof this.options.rowVariant === 'function') {
        variant = this.options.rowVariant(item)
      }

      if (variant === null) {
        variant = this.getDefaultRowVariant(item)
      }

      this.$set(item, '_rowVariant', variant)
    },
    getDefaultRowVariant: function (item) {
      if (!item) {
        return null
      } else if (this.hasSelectionColumn && this.selectedItems && this.selectedItems.includes(item[this.options.idColumn])) {
        return 'primary'
      } else {
        return null
      }
    },
    updateQuery: async function (newValue) {
      if (this.storeUrlParameters && !this.noUrlParams) {
        const query = Object.assign({}, this.$route.query)
        query[`${this.options.tableName}-page`] = newValue

        await this.$router.replace({ query })
      }
    },
    updateSort: async function (ctx) {
      if (this.storeUrlParameters && !this.noUrlParams) {
        const query = Object.assign({}, this.$route.query)
        if (ctx.sortBy) {
          query[`${this.options.tableName}-sort`] = ctx.sortBy
        } else {
          delete query[`${this.options.tableName}-sort`]
        }

        if (ctx.sortDesc) {
          query[`${this.options.tableName}-sort-desc`] = ctx.sortDesc
        } else {
          delete query[`${this.options.tableName}-sort-desc`]
        }

        await this.$router.replace({ query })
      }
    },
    jumpToPage: function () {
      if (this.jumpToPageValue > 0 && this.jumpToPageValue <= this.maxPage) {
        this.pagination.currentPage = this.jumpToPageValue
      }
      this.$refs.jumpToPageModal.hide()
    },
    showJumpToPage: function () {
      this.jumpToPageValue = this.pagination.currentPage
      this.$refs.jumpToPageModal.show()
    },
    getSelected: function () {
      return this.selectedItems
    },
    // The scoped slots of the table and those of the cut columns
    getPassedSlots: function () {
      const slots = Object.keys(this.$scopedSlots)
      return slots.concat(this.clampSlots.concat(this.urlSlots).filter(slot => !slots.includes(slot)))
    },
    isUrl: function (value) {
      return typeof value === 'string' && URL_PATTERN.test(value.trim())
    },
    getClampKey: function (scope) {
      return `${scope.field.key}-${scope.index}`
    },
    toggleClamp: function (scope) {
      const key = this.getClampKey(scope)
      this.$set(this.clampExpanded, key, !this.clampExpanded[key])
    },
    // Which cut cells do not fit on their line (after the rows are shown, and when the width changes)
    measureClamps: function () {
      if (this.clampSlots.length === 0 || !this.$el || !this.$el.querySelectorAll) {
        return
      }
      this.$nextTick(() => {
        this.$el.querySelectorAll('.bt-clamp').forEach(element => {
          const key = element.getAttribute('data-clamp')
          if (this.clampExpanded[key]) {
            return
          }
          const text = element.querySelector('.bt-clamp-text')
          const cut = text.scrollWidth > text.clientWidth + 1
          if (this.clampCut[key] !== cut) {
            this.$set(this.clampCut, key, cut)
          }
        })
      })
    },
    notifyLoaded: function () {
      // New rows: nothing shown in full, cut cells measured again
      this.clampExpanded = {}
      this.clampCut = {}
      this.measureClamps()
      this.$emit('loaded', {
        data: this.$refs.table.paginatedItems,
        count: this.pagination.totalCount
      })
    },
    // As the delete button of the table filter
    clearFilter: function () {
      if (this.$refs.tableFilter) {
        this.$refs.tableFilter.clearFilter()
      }
    },
    refresh: function () {
      this.pagination.totalCount = -1
      this.selectedItems = []
      this.readUrlParams()
      this.$refs.table.refresh()
    },
    setSelectedItems: function (toSelect) {
      this.selectedItems = toSelect
    },
    getCurrentRequestData: function () {
      return this.currentRequestData
    },
    isMarked: function (row) {
      if (this.itemType) {
        return this.storeMarkedIds[this.itemType].indexOf(row[this.options.idColumn]) !== -1
      } else {
        return false
      }
    },
    markItem: function (id, event) {
      if (event) {
        this.$store.dispatch('addMarkedIds', { type: this.itemType, ids: [id] })
      } else {
        this.$store.dispatch('removeMarkedIds', { type: this.itemType, ids: [id] })
      }
    },
    // "'Column' comparator 'values'" of a filter
    getFilterText: function (f) {
      const column = this.columns.find(c => c.key === f.column)
      // Datasets: their names ("Datasets: 'A' or 'B'")
      if (column && column.type === 'datasets') {
        loadDatasetNames(f.values)
        const names = (f.values || []).map(id => `'${getDatasetName(id) || `#${id}`}'`)
        return `'${column.filterLabel || column.label}': ${names.join(` ${this.$t('operatorsOr').toLowerCase()} `)}`
      }
      const comparator = comparators[f.comparator]
      // Only the values the comparator uses, without the empty ones (the second field of the filter stays "")
      const needed = comparator ? (comparator.values || 0) : (f.values || []).length
      const values = (f.values || []).slice(0, needed).filter(v => v !== null && v !== undefined && `${v}`.trim() !== '')
      return `'${column ? column.label : f.column}' ${comparator ? comparator.text() : f.comparator}${values.length > 0 ? ` '${values.join(', ')}'` : ''}`
    },
    /**
     * Hides the columns with less than half of their values filled in, in the rows of the first page with data (all the
     * rows are not in the browser). Rows x columns checks, once: no cost worth mentioning. Only the columns of the
     * database: those with a type (filtered by the server); those without one are computed in the page from other values
     * (e.g. the title of a publication), and the server leaves the empty values out of the rows, so the rows cannot tell
     * them apart. Not evaluated either: the checkboxes, the columns without a name and those marked autoHide: false
     * (computed in the page although with a type, e.g. conservation). A value is filled in unless null, missing, an empty
     * text or an empty list (false and 0 are values).
     */
    autoHideSparseColumns: function (rows) {
      this.autoHideDone = true
      const filled = value => value !== null && value !== undefined && !(typeof value === 'string' && value.trim() === '') && !(Array.isArray(value) && value.length === 0)
      this.autoHiddenColumns = (this.columns || [])
        .filter(c => c.key !== 'marked' && c.key !== 'selected' && c.label && c.type !== undefined && !c.isHidden && c.autoHide !== false)
        .filter(c => rows.filter(row => filled(row[c.key])).length / rows.length < 0.5)
        .map(c => c.key)
    },
    // A column shown again in the column selector: not hidden by the rule above any more
    onColumnToggle: function (key) {
      this.autoHiddenColumns = this.autoHiddenColumns.filter(k => k !== key)
    },
    // New look: marks or unmarks the items of the page (head checkbox)
    markPageItems: function (mark) {
      const ids = (this.pageItems || []).map(item => item[this.options.idColumn])
      if (ids.length > 0) {
        this.$store.dispatch(mark ? 'addMarkedIds' : 'removeMarkedIds', { type: this.itemType, ids })
      }
    },
    // The marking menu below its chevron (positioned in the table, which is its parent)
    openMarkMenu: function (event, item) {
      if (this.markMenu && this.markMenu.button === event.currentTarget) {
        this.closeMarkMenu()
        return
      }
      this.closeMarkMenu()
      this.markMenu = { item, button: event.currentTarget, top: 0, left: 0 }
      this.placeMarkMenu()
      // Placed again whenever the table changes (a row expanded or folded above it, the width): next to its chevron
      this.stopFollowingMark = followAnchor(this.$el, this.placeMarkMenu)
      document.addEventListener('click', this.closeMarkMenu)
      document.addEventListener('keydown', this.onMarkMenuKey)
    },
    placeMarkMenu: function () {
      if (!this.markMenu) {
        return
      }
      if (!this.markMenu.button.isConnected) {
        this.closeMarkMenu()
        return
      }
      const button = this.markMenu.button.getBoundingClientRect()
      const root = this.$el.getBoundingClientRect()
      this.markMenu.top = button.bottom - root.top + 4
      this.markMenu.left = button.left - root.left
    },
    closeMarkMenu: function () {
      if (this.stopFollowingMark) {
        this.stopFollowingMark()
        this.stopFollowingMark = null
      }
      this.markMenu = null
      document.removeEventListener('click', this.closeMarkMenu)
      document.removeEventListener('keydown', this.onMarkMenuKey)
    },
    onMarkMenuKey: function (event) {
      if (event.key === 'Escape') {
        this.closeMarkMenu()
      }
    },
    runMarkOption: function (callback, item) {
      this.closeMarkMenu()
      callback(item)
    },
    clearMarkedItems: function () {
      this.$bvModal.msgBoxConfirm(this.$t('modalTitleSure'), {
        okVariant: 'danger',
        okTitle: this.$t('genericYes'),
        cancelTitle: this.$t('genericNo')
      }).then(value => {
        if (value) {
          this.$store.dispatch('clearMarkedIds', this.itemType)
        }
      })
    },
    // New look: the only link of a cell, if it has exactly one (a cell with more is left as it is)
    getCellLink: function (target) {
      const cell = target && target.closest ? target.closest('tbody td') : null
      if (!cell || !this.$el.contains(cell)) {
        return null
      }
      const links = cell.querySelectorAll('a[href]')
      return links.length === 1 ? { cell, link: links[0] } : null
    },
    // A click anywhere in such a cell follows its link (same handlers, so router links and tabs work as when the link
    // itself is clicked). One listener on the table, nothing per cell: no cost when the data is shown.
    onCellClick: function (event) {
      if (event.defaultPrevented || event.button !== 0) {
        return
      }
      // The link itself, or another control in the cell, handles its own click; a text selection is not a click
      if (event.target.closest('a, button, input, select, textarea, label, .dropdown')) {
        return
      }
      const selection = window.getSelection ? window.getSelection().toString() : ''
      if (selection) {
        return
      }
      const found = this.getCellLink(event.target)
      if (found) {
        found.link.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey
        }))
      }
    },
    // The pointer on such a cell: marked when the mouse enters it (the content of a cell changes with the data)
    onCellHover: function (event) {
      const cell = event.target && event.target.closest ? event.target.closest('tbody td') : null
      if (!cell || cell === this.hoveredCell) {
        return
      }
      this.hoveredCell = cell
      if (this.getCellLink(cell)) {
        cell.classList.add('bt-cell-link')
      } else {
        cell.classList.remove('bt-cell-link')
      }
    },
    // Whether the filter line (on one line) is wider than the table
    checkFilterOverflow: function () {
      const element = this.$refs.filterContent
      if (!this.modernLook || !element || this.filterExpanded) {
        if (!element) {
          this.filterOverflows = false
        }
        return
      }
      this.filterOverflows = element.scrollWidth > element.clientWidth + 1
    },
    // "AND" / "OR" between two filters
    getOperatorText: function (value) {
      const key = Object.keys(operators).find(o => operators[o].value === value)
      return key ? operators[key].text() : value
    },
    isValidFilter: function (filter) {
      if (filter.column.type === Number) {
        return filter.values.filter(v => isNaN(v)).length === 0
      } else if (filter.column.type === Date) {
        return filter.values.filter(v => isNaN(new Date(v).getTime())).length === 0
      } else {
        return true
      }
    },
    markAllItems: function (mark) {
      if (this.getIds) {
        emitter.emit('show-loading', true)
        this.getIds(this.currentRequestData, result => {
          if (mark) {
            this.$store.dispatch('addMarkedIds', { type: this.itemType, ids: result.data })
          } else {
            this.$store.dispatch('removeMarkedIds', { type: this.itemType, ids: result.data })
          }
          emitter.emit('show-loading', false)
        })
      }
    },
    onPerPageChanged: function (value) {
      this.$store.dispatch('setTablePerPage', value)
    },
    getDataLocal: function (ctx) {
      // Set the API pagination information fields
      const localCtx = JSON.parse(JSON.stringify(ctx))
      localCtx.page = this.pagination.currentPage
      localCtx.limit = this.storeTablePerPage
      localCtx.prevCount = this.pagination.totalCount
      localCtx.orderBy = localCtx.sortBy.length > 0 ? localCtx.sortBy : null
      localCtx.ascending = localCtx.sortBy.length > 0 ? (localCtx.sortDesc ? 0 : 1) : null
      localCtx.filter = this.filter

      // Delete fields that the bootstrap-vue table sets itself
      delete localCtx.sortBy
      delete localCtx.sortDesc
      delete localCtx.apiUrl
      delete localCtx.currentPage
      delete localCtx.perPage

      this.currentRequestData = localCtx

      this.isLoading = true
      return new Promise((resolve) => {
        this.getData(localCtx).then(result => {
          let localResult = null
          if (result && result.data && result.data.data) {
            this.pagination.totalCount = result.data.count
            localResult = result.data.data

            localResult.forEach(r => this.updateRowVariant(r))
            this.pageItems = localResult
            if (this.autoHideColumns && !this.autoHideDone && localResult.length > 0) {
              this.autoHideSparseColumns(localResult)
            }
          } else {
            this.pagination.totalCount = 0
            this.pageItems = []
          }
          // Notify that the data has changed
          this.$emit('data-changed', this.currentRequestData, {
            data: localResult,
            count: this.pagination.totalCount
          })
          this.isLoading = false
          resolve(localResult)
        })
      })
    },
    createGroup: function () {
      this.newGroup = {
        groupId: null,
        groupName: null,
        groupDescription: null,
        userId: this.storeToken.id
      }
      apiGetGroupTypes(result => {
        this.groupTypeSelect = result.data.map(g => {
          return {
            value: g.id,
            text: groupTypes[g.targetTable].text()
          }
        })
        const groupTypeLocal = Object.keys(groupTypes).filter(i => groupTypes[i].itemType === this.itemType)[0]
        const groupType = result.data.filter(g => g.targetTable === groupTypeLocal)[0]
        this.newGroup.groupTypeId = groupType.id
        this.newGroup.groupType = groupType.targetTable

        this.$nextTick(() => this.$refs.groupAddModal.show())
      })
    },
    putGroup: function () {
      // The new group to create
      const group = {
        name: this.newGroup.groupName,
        description: this.newGroup.groupDescription,
        grouptypeId: this.newGroup.groupTypeId,
        visibility: true,
        createdBy: this.newGroup.userId
      }

      emitter.emit('show-loading', true)
      apiPutGroup(group, result => {
        const data = {
          ids: this.storeMarkedIds[this.itemType],
          addition: true
        }
        const groupId = result
        const groupTypeLocal = Object.keys(groupTypes).filter(i => groupTypes[i].itemType === this.itemType)[0]
        const type = groupTypes[groupTypeLocal].apiName
        // Now add the group members
        apiPatchGroupMembers(groupId, type, data, result => {
          this.$root.$bvToast.toast(this.$t('toastGroupCreateWithMembers', { count: result }), {
            title: this.$t('genericSuccess'),
            variant: 'success',
            autoHideDelay: 5000,
            appendToast: true
          })

          emitter.emit('show-loading', false)
          this.$router.push({ name: Pages.groupDetails, params: { groupId: groupId } })
        })
      })
    },
    onFilterChanged: function (filter) {
      // A filter taken away by the user (cleared, or removed in the filter modal): the rows expanded below them are
      // folded, the table showing other rows now (the tables showing details on every row stop doing so)
      const newKeys = (filter.filter || []).map(getKeyOfFilter)
      const removed = filter.byUser && (this.filter || []).some(f => f.canBeChanged !== false && !newKeys.includes(getKeyOfFilter(f)))
      if (removed) {
        ;(this.pageItems || []).forEach(item => {
          if (item._showDetails) {
            this.$set(item, '_showDetails', false)
          }
        })
        this.$emit('filter-removed')
      }
      this.filter = filter.filter
      // The filters the table loads with (of the page, of the address) are not shown: only once the user set the filter
      if (filter.byUser) {
        this.filterShown = true
      }
      this.pagination.totalCount = -1

      // Trigger an update on the table
      if (filter.triggerUpdate) {
        this.$refs.table.refresh()
      }

      this.$emit('filter-changed', filter)
    },
    onDownloadTableClicked: function () {
      if (this.downloadTable !== null) {
        // Warn user that it's a lot of data and it'll take a while
        if (this.pagination.totalCount > 100000) {
          this.$bvModal.msgBoxConfirm(this.$t('modalTextWarningLargeAmountOfData', { size: formatNumber(this.pagination.totalCount) }), {
            title: this.$t('modalTitleWarning'),
            okTitle: this.$t('genericYes'),
            cancelTitle: this.$t('genericNo'),
            okVariant: 'primary'
          })
            .then(value => {
              if (value === true) {
                this.requestDownload()
              }
            })
        } else {
          this.requestDownload()
        }
      }
    },
    onSelectionHeaderClicked: function (value) {
      if (value && this.getIds) {
        emitter.emit('show-loading', true)
        // Get all ids in the current table
        this.getIds(this.currentRequestData, result => {
          this.selectedItems = result.data
          emitter.emit('show-loading', false)
          this.$refs.table.refresh()
        })
      } else {
        this.selectedItems = []
        this.$refs.table.refresh()
      }
    },
    requestDownload: function () {
      emitter.emit('show-loading', true)
      // Download the current table data
      this.downloadTable(this.currentRequestData, result => {
        downloadBlob({
          blob: result,
          filename: `${this.options.tableName}-table-${getDateTimeString()}`,
          extension: 'zip'
        })
        emitter.emit('show-loading', false)
      })
    },
    updateTableTour: function () {
      const tableTourSteps = [
        {
          title: () => this.$t('popoverTableTourColumnSelectorTitle'),
          text: () => this.$t('popoverTableTourColumnSelectorText'),
          target: () => `#${this.id} #column-selector`,
          position: 'top'
        }, {
          title: () => this.$t('popoverTableTourTableFilteringTitle'),
          text: () => this.$t('popoverTableTourTableFilteringText'),
          target: () => `#${this.id} #filter-toggle`,
          position: 'top'
        }, {
          title: () => this.$t('popoverTableTourResultSizeTitle'),
          text: () => this.$t('popoverTableTourResultSizeText'),
          target: () => `#${this.id} #table-row-count`,
          position: 'top'
        }, {
          title: () => this.$t('popoverTableTourPageSizeTitle'),
          text: () => this.$t('popoverTableTourPageSizeText'),
          target: () => `#${this.id} #table-page-size-dropdown`,
          position: 'top'
        }
      ]

      if (this.itemType !== null) {
        tableTourSteps.push({
          title: () => this.$t('popoverTableTourMarkedItemsTitle'),
          text: () => this.$t('popoverTableTourMarkedItemsText'),
          target: () => `#${this.id} #marked-items-count`,
          position: 'top'
        })
        tableTourSteps.push({
          title: () => this.$t('popoverTableTourMarkedItemsClearTitle'),
          text: () => this.$t('popoverTableTourMarkedItemsClearText'),
          target: () => `#${this.id} #marked-items-clear`,
          position: 'top'
        })
      }

      if (this.downloadTable !== null) {
        tableTourSteps.push({
          title: () => this.$t('popoverTableTourDownloadTitle'),
          text: () => this.$t('popoverTableTourDownloadText'),
          target: () => `#${this.id} #table-download`,
          position: 'bottom'
        })
      }

      if (this.pagination.totalCount > this.storeTablePerPage) {
        tableTourSteps.push({
          title: () => this.$t('popoverTableTourPaginationTitle'),
          text: () => this.$t('popoverTableTourPaginationText'),
          target: () => `#${this.id} #table-pagination`,
          position: 'bottom'
        })

        tableTourSteps.push({
          title: () => this.$t('popoverTableTourPaginationJumpToPageTitle'),
          text: () => this.$t('popoverTableTourPaginationJumpToPageText'),
          target: () => `#${this.id} #table-jump-to-page`,
          position: 'bottom'
        })
      }

      this.tableTourSteps = tableTourSteps
    },
    readUrlParams: function () {
      // Check the URL query parameters and adjust the pagination and sorting
      if (this.$route.query && !this.noUrlParams) {
        if (this.$route.query[`${this.options.tableName}-page`]) {
          this.pagination.currentPage = +this.$route.query[`${this.options.tableName}-page`]
        }
        if (this.$route.query[`${this.options.tableName}-sort`]) {
          this.options.orderBy = this.$route.query[`${this.options.tableName}-sort`]
        }
        if (this.$route.query[`${this.options.tableName}-sort-desc`]) {
          this.options.orderByDesc = (this.$route.query[`${this.options.tableName}-sort-desc`] === 'true')
        }
      }
    }
  },
  created: function () {
    // The columns hidden by default (see above: germplasm columns, "defaultHidden"), once per table ("<table>:<column>"
    // among the applied ones); before the column selector reads the hidden columns. The germplasm table has its own.
    const tableName = this.options ? this.options.tableName : null
    if (tableName) {
      const applied = this.storeHiddenColumns[GERMPLASM_DEFAULT_HIDDEN_APPLIED] || []
      const toHide = (this.columns || [])
        .filter(c => c.defaultHidden === true || (tableName !== 'germplasm' && GERMPLASM_DEFAULT_HIDDEN_COLUMNS.includes(c.key)))
        .map(c => c.key)
        .filter(key => !applied.includes(`${tableName}:${key}`))
      if (toHide.length > 0) {
        this.$store.dispatch('addHiddenColumns', { type: tableName, columns: toHide })
        if (!this.storeHiddenColumns[GERMPLASM_DEFAULT_HIDDEN_APPLIED]) {
          this.$store.dispatch('setHiddenColumns', { type: GERMPLASM_DEFAULT_HIDDEN_APPLIED, columns: [] })
        }
        this.$store.dispatch('addHiddenColumns', { type: GERMPLASM_DEFAULT_HIDDEN_APPLIED, columns: toHide.map(key => `${tableName}:${key}`) })
      }
    }
  },
  mounted: function () {
    this.updateTableTour()

    this.readUrlParams()

    // New look: the filter line measured again when the width of the table changes
    if (this.modernLook && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.checkFilterOverflow()
        this.measureClamps()
      })
      this.resizeObserver.observe(this.$el)
    }

    // New look: a cell with a single link is clickable as a whole (see onCellClick)
    if (this.modernLook) {
      this.hoveredCell = null
      this.$el.addEventListener('click', this.onCellClick)
      this.$el.addEventListener('mouseover', this.onCellHover)
    }
  },
  beforeDestroy: function () {
    this.closeMarkMenu()
    if (this.modernLook) {
      this.$el.removeEventListener('click', this.onCellClick)
      this.$el.removeEventListener('mouseover', this.onCellHover)
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }
  }
}
</script>

<style src="@/assets/table-modern.css"></style>
<style>
.base-table table th[aria-sort="none"] {
  padding-right: 0.75em !important;
  background-image: none !important;
}
.base-table table thead tr {
  background-color: #2f353a;
}
.table-loading-indicator {
  border-radius: 0;
}
.per-page-dropdown .btn {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
  border-bottom: 0;
}
.base-table .table-responsive {
  margin-bottom: 0;
}

.base-table .pagination .page-link {
  border-top: 0;
}
.base-table .pagination .page-item:first-child .page-link {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
.base-table .pagination .page-item:last-child .page-link {
  border-top-right-radius: 0;
}
.base-table .table-download {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-top: 0;
}
.base-table .table-pagination .pagination {
  margin-bottom: 0;
}
.base-table .table-pagination .btn {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-right: 0;
  margin-top: -1px;
}
/* .base-table table.b-table[aria-busy='true'] {
  opacity: 1;
} */
.base-table .table-bottom-left .btn-group:first-child .btn {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-top: 0;
}
</style>
