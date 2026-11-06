<template>
  <!-- The downloads of the germplasm (passport data, pedigree data): blocks in the look of the custom pages -->
  <div class="gd-download">
    <!-- Passport data -->
    <section class="gd-block">
      <header class="gd-block-head">
        <span class="gd-block-icon" aria-hidden="true"><i class="fa-solid fa-book-atlas" /></span>
        <div>
          <h3 class="gd-block-title">{{ $t('pageGermplasmDownloadTabGermplasmTitle') }}</h3>
          <p class="gd-block-subtitle">{{ $t('pageGermplasmDownloadTabGermplasmSubtitle') }}</p>
        </div>
      </header>
      <p class="gd-block-text">{{ $t('pageGermplasmDownloadTabGermplasmText') }}</p>
      <!-- Germplasm selection options (groups, marked items, all) -->
      <b-form-radio-group
        class="gd-choice"
        v-model="passportSelection"
        :options="selectionOptions"
        buttons />

      <!-- Germplasm groups -->
      <b-form-select
        class="gd-select"
        v-model="passportGroup"
        :options="groups"
        v-if="passportSelection === 'group'" />

      <!-- Export attributes? -->
      <b-form-checkbox class="gd-switch" v-model="passportIncludeAttributes" switch>{{ $t('pageGermplasmDownloadTabIncludeAttributes') }}</b-form-checkbox>

      <div class="gd-block-actions">
        <button type="button" class="gd-button" @click="downloadGermplasm"><i class="fa-solid fa-download" aria-hidden="true" /> {{ $t('buttonDownload') }}</button>
      </div>
    </section>

    <!-- Pedigree data -->
    <section class="gd-block" v-if="hasPedigreeData">
      <header class="gd-block-head">
        <span class="gd-block-icon" aria-hidden="true"><i class="fa-solid fa-sitemap" /></span>
        <div>
          <h3 class="gd-block-title">{{ $t('pageGermplasmDownloadTabPedigreeTitle') }}</h3>
          <p class="gd-block-subtitle">{{ $t('pageGermplasmDownloadTabPedigreeSubtitle') }}</p>
        </div>
      </header>
      <p class="gd-block-text">{{ $t('pageGermplasmDownloadTabPedigreeText') }}</p>
      <!-- Germplasm selection options (groups, marked items, all) -->
      <b-form-radio-group
        class="gd-choice"
        v-model="pedigreeSelection"
        :options="selectionOptions"
        buttons />

      <!-- Germplasm groups -->
      <b-form-select
        class="gd-select"
        v-model="pedigreeGroup"
        :options="groups"
        v-if="pedigreeSelection === 'group'" />

      <!-- Export attributes? -->
      <b-form-checkbox class="gd-switch" v-model="pedigreeIncludeAttributes" switch>{{ $t('pageGermplasmDownloadTabPedigreeIncludeAttributes') }}</b-form-checkbox>

      <b-form-group :label="$t('tableColumnDatasetName')" label-for="dataset" class="gd-field">
        <b-form-select class="gd-select" :options="datasetOptions" v-model="pedigreeDataset" id="dataset">
          <template #first>
            <b-form-select-option :value="null" disabled>{{ $t('formLabelPedigreeChartDatasetSelect') }}</b-form-select-option>
          </template>
        </b-form-select>
      </b-form-group>

      <div class="gd-block-actions">
        <button type="button" class="gd-button" @click="downloadPedigree" :disabled="!pedigreeDataset"><i class="fa-solid fa-download" aria-hidden="true" /> {{ $t('buttonDownload') }}</button>
      </div>
    </section>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { apiPostGroupTable } from '@/mixins/api/group'
import { apiPostDatasetTable } from '@/mixins/api/dataset'
import { apiExportPassport, apiPostPedigreeTable, apiPostPedigreeDatasetExport } from '@/mixins/api/germplasm'
import { getDateTimeString } from '@/mixins/formatting'
import { downloadBlob } from '@/mixins/util'

const emitter = require('tiny-emitter/instance')

export default {
  data: function () {
    return {
      selectionOptions: [],
      passportSelection: 'all',
      passportIncludeAttributes: false,
      passportGroup: null,
      pedigreeSelection: 'all',
      pedigreeGroup: null,
      pedigreeDatasets: [],
      pedigreeDataset: null,
      groups: null,
      hasPedigreeData: false,
      pedigreeIncludeAttributes: false
    }
  },
  computed: {
    ...mapGetters([
      'storeLocale',
      'storeMarkedGermplasm'
    ]),
    datasetOptions: function () {
      if (this.pedigreeDatasets) {
        return this.pedigreeDatasets.map(d => {
          return {
            value: d,
            text: d.datasetName
          }
        })
      } else {
        return []
      }
    }
  },
  watch: {
    storeMarkedGermplasm: function () {
      this.updateSelectionOptions()
    },
    storeLocale: function () {
      this.updateSelectionOptions()
    }
  },
  methods: {
    updateSelectionOptions: function () {
      this.selectionOptions = [{
        text: this.$t('pageGermplasmDownloadSelectAll'),
        value: 'all'
      }, {
        text: this.$t('pageGermplasmDownloadSelectMarked', { count: this.storeMarkedGermplasm.length }),
        value: 'marked',
        disabled: this.storeMarkedGermplasm.length < 1
      }, {
        text: this.$t('pageGermplasmDownloadSelectGroup'),
        value: 'group',
        disabled: !this.groups || this.groups.length < 1
      }]

      // Reset selection to "All" if there aren't any marked items
      if (this.passportSelection === 'marked' && this.storeMarkedGermplasm.length < 1) {
        this.passportSelection = 'all'
      }
      if (this.pedigreeSelection === 'marked' && this.storeMarkedGermplasm.length < 1) {
        this.pedigreeSelection = 'all'
      }
    },
    downloadGermplasm: function () {
      emitter.emit('show-loading', true)
      const request = {
        individualIds: this.passportSelection === 'marked' ? this.storeMarkedGermplasm : null,
        groupIds: this.passportSelection === 'group' ? [this.passportGroup] : null,
        includeAttributes: this.passportIncludeAttributes
      }

      apiExportPassport(request, result => {
        downloadBlob({
          blob: result,
          filename: `germplasm-${getDateTimeString()}`,
          extension: 'zip'
        })
        emitter.emit('show-loading', false)
      })
    },
    downloadPedigree: function () {
      emitter.emit('show-loading', true)
      const request = {
        yIds: this.pedigreeSelection === 'marked' ? this.storeMarkedGermplasm : null,
        yGroupIds: this.pedigreeSelection === 'group' ? [this.pedigreeGroup] : null,
        includeAttributes: this.pedigreeIncludeAttributes,
        datasetIds: [this.pedigreeDataset.datasetId]
      }

      emitter.emit('show-loading', true)
      this.$gtag.event('export', 'async', 'pedigree', request.datasetIds.join('-'))
      apiPostPedigreeDatasetExport(request, result => {
        result.forEach(r => this.$store.commit('ON_ASYNC_JOB_UUID_ADD_MUTATION', r.uuid))

        // Show the sidebar
        emitter.emit('toggle-aside', 'download')
        emitter.emit('show-loading', false)
      })
    }
  },
  mounted: function () {
    this.updateSelectionOptions()

    // Get germplasm groups
    const query = {
      page: 1,
      limit: this.JAVA_MAX_INTEGER,
      filter: [{
        column: 'groupType',
        comparator: 'equals',
        operator: 'and',
        values: ['germinatebase']
      }]
    }
    apiPostGroupTable(query, result => {
      this.groups = result.data.map(g => {
        return {
          value: g.groupId,
          text: `${g.groupName} (${g.count})`
        }
      })
      if (this.groups && this.groups.length > 0) {
        this.pedigreeGroup = this.groups[0].value
        this.passportGroup = this.groups[0].value
      }
      this.updateSelectionOptions()
    })

    // Check if there's pedigree data. Only get one row to keep load on server low.
    const pedigreeQuery = {
      page: 1,
      limit: 1
    }
    apiPostPedigreeTable(pedigreeQuery, result => {
      if (result && result.count) {
        this.hasPedigreeData = result.count > 0
      }
    })

    apiPostDatasetTable({
      filter: [{
        column: 'datasetType',
        comparator: 'equals',
        operator: 'and',
        values: ['pedigree']
      }]
    }, result => {
      if (result && result.data) {
        this.pedigreeDatasets = result.data

        if (result.data.length > 0) {
          this.pedigreeDataset = result.data.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn))[0]
        } else {
          this.pedigreeDataset = null
        }
      }
    })
  }
}
</script>

<style scoped>
/* Two blocks side by side (one below the other on small screens) */
.gd-download {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
  margin-top: 1.5rem;
  font-family: 'DM Sans', -apple-system, 'Segoe UI', Roboto, sans-serif;
}
@media (max-width: 991px) {
  .gd-download {
    grid-template-columns: minmax(0, 1fr);
  }
}
.gd-block {
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  border: 1px solid var(--cp-border);
  border-radius: 16px;
  background: var(--cp-surface);
  box-shadow: 0 1px 2px var(--cp-shadow);
}
.gd-block-head {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
}
/* The icon in a soft green square with rounded corners */
.gd-block-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--cp-green-soft);
  color: var(--cp-green);
  font-size: 1.3rem;
}
.gd-block-title {
  margin: 0.1rem 0 0.15rem;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--cp-text);
}
.gd-block-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: var(--cp-muted);
}
.gd-block-text {
  margin: 1rem 0 1.1rem;
  font-size: 0.95rem;
  line-height: 1.55;
  color: var(--cp-text-subtle);
}
/* All / marked / group: separate rounded buttons, the chosen one in green */
.gd-choice {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 1rem;
}
.gd-choice >>> .btn {
  flex: 0 0 auto;
  margin-left: 0 !important;
  padding: 0.45rem 0.95rem;
  border: 1px solid var(--cp-border);
  border-radius: 10px !important;
  background: var(--cp-surface);
  color: var(--cp-text);
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  box-shadow: none;
}
.gd-choice >>> .btn:hover {
  border-color: var(--cp-muted);
  background: var(--cp-surface-hover);
}
.gd-choice >>> .btn.active {
  border-color: var(--cp-green);
  background: var(--cp-green-soft);
  color: var(--cp-green);
}
.gd-choice >>> .btn.focus,
.gd-choice >>> .btn:focus-within {
  box-shadow: 0 0 0 3px var(--cp-green-soft);
}
.gd-choice >>> .btn.disabled {
  opacity: 0.5;
}
.gd-select,
.gd-field >>> .custom-select {
  height: 40px;
  margin-bottom: 1rem;
  border: 1px solid var(--cp-border);
  border-radius: 10px;
  background-color: var(--cp-surface);
  color: var(--cp-text);
  font-family: inherit;
}
.gd-field >>> .custom-select {
  margin-bottom: 0;
}
.gd-field >>> label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--cp-text-subtle);
}
.gd-switch {
  margin-bottom: 1rem;
  color: var(--cp-text);
}
.gd-switch >>> .custom-control-input:checked ~ .custom-control-label::before {
  border-color: var(--cp-button);
  background-color: var(--cp-button);
}
/* The download button at the bottom of the block, green and rounded */
.gd-block-actions {
  margin-top: auto;
  padding-top: 0.5rem;
}
.gd-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 42px;
  padding: 0 1.25rem;
  border: 1px solid var(--cp-button);
  border-radius: 10px;
  background: var(--cp-button);
  color: var(--cp-on-button);
  font: inherit;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
}
.gd-button:hover:not(:disabled) {
  border-color: var(--cp-button-hover);
  background: var(--cp-button-hover);
}
.gd-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
