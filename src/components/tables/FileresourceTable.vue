<template>
  <div class="fileresource-table">
    <BaseTable :options="options"
               :columns="columns"
               v-bind="$props"
               ref="fileresourceTable"
               v-on="$listeners">
      <!-- Name: after the icon of the file (by its extension, in the colour of its family; new look) -->
      <template v-slot:cell(fileresourceName)="data">
        <span class="fr-name" v-if="modernLook">
          <i :class="['fa-solid', getIcon(data.item).icon, 'fr-file-icon']" :style="{ color: getIcon(data.item).color }" :title="getIcon(data.item).extension ? getIcon(data.item).extension.toUpperCase() : null" aria-hidden="true" />
          <span>{{ data.item.fileresourceName }}</span>
        </span>
        <span v-else>{{ data.item.fileresourceName }}</span>
      </template>
      <!-- Fileresource description -->
      <template v-slot:cell(fileresourceDescription)="data">
        <!-- New look: all of it (cut by the table, its chevron shows the rest); else cut after 10 words, "read more" -->
        <span v-if="modernLook && data.item.fileresourceDescription">{{ data.item.fileresourceDescription }}</span>
        <span :title="data.item.fileresourceDescription" v-else-if="data.item.fileresourceDescription">{{ truncateAfterWords(data.item.fileresourceDescription, 10) }}</span>
        <a href="#" class="table-icon-link" @click.prevent="showFullDescription('tableColumnFileresourceDescription', data.item.fileresourceDescription)" v-b-tooltip="$t('buttonReadMore')" v-if="!modernLook && isTruncatedAfterWords(data.item.fileresourceDescription, 10)" >&nbsp;
          <MdiIcon :path="mdiPageNext" /></a>
      </template>
      <!-- Fileresource type: a chip (new look) -->
      <template v-slot:cell(fileresourcetypeName)="data">
        <span class="bt-chip fr-type" :style="{ '--bt-chip-color': getTypeColor(data.item) }" v-if="modernLook && data.item.fileresourcetypeName"><i class="fa-solid fa-file-fragment" aria-hidden="true" /> {{ data.item.fileresourcetypeName }}</span>
        <span v-else>{{ data.item.fileresourcetypeName }}</span>
      </template>
      <!-- Fileresource type description -->
      <template v-slot:cell(fileresourcetypeDescription)="data">
        <!-- New look: all of it (cut by the table, its chevron shows the rest); else cut after 10 words, "read more" -->
        <span v-if="modernLook && data.item.fileresourcetypeDescription">{{ data.item.fileresourcetypeDescription }}</span>
        <span :title="data.item.fileresourcetypeDescription" v-else-if="data.item.fileresourcetypeDescription">{{ truncateAfterWords(data.item.fileresourcetypeDescription, 10) }}</span>
        <a href="#" class="table-icon-link" @click.prevent="showFullDescription('tableColumnFileresourcetypeDescription', data.item.fileresourcetypeDescription)" v-b-tooltip="$t('buttonReadMore')" v-if="!modernLook && isTruncatedAfterWords(data.item.fileresourcetypeDescription, 10)" >&nbsp;
          <MdiIcon :path="mdiPageNext" /></a>
      </template>
      <!-- Download -->
      <template v-slot:cell(download)="data">
        <!-- New look: one button, the icon and "Download" (the size in the column "File size"); delete next to it for
             data curators -->
        <div class="fr-actions" v-if="modernLook">
          <a class="fr-download" :href="getFileResourceUrl(data.item)">
            <i class="fa-solid fa-download" aria-hidden="true" /> {{ $t('buttonDownload') }}
          </a>
          <button type="button" class="fr-action is-danger" @click="onDeleteResource(data.item)" v-b-tooltip.hover :title="$t('buttonDelete')" :aria-label="$t('buttonDelete')" v-if="isDataCurator">
            <i class="fa-solid fa-trash-can" aria-hidden="true" />
          </button>
        </div>
        <div class="d-flex flex-column justify-content-center align-items-center" v-else>
          <b-button class="text-nowrap" variant="primary" :href="getFileResourceUrl(data.item)"><MdiIcon :path="mdiDownload"/> {{ $t('buttonDownload') }}</b-button>
          <small>({{ getNumberWithSuffix(data.item.fileresourceSize, 2, 1024, ' ') }})</small>
        </div>
      </template>
      <!-- Show datasets -->
      <template v-slot:cell(datasetIds)="data">
        <!-- New look: a chip with their number, opening the datasets page filtered to them -->
        <a href="#" class="bt-chip fr-datasets" @click.prevent="showDatasets(data.item)" v-b-tooltip.hover :title="$t('tableTooltipFileresourcesDataset')" v-if="modernLook && data.item.datasetIds && data.item.datasetIds.length > 0">
          <i class="fa-solid fa-database" aria-hidden="true" /> {{ data.item.datasetIds.length }}
        </a>
        <b-button class="text-nowrap" @click="showDatasets(data.item)" v-else-if="!modernLook && data.item.datasetIds && data.item.datasetIds.length > 0"><MdiIcon :path="mdiDatabase"/> {{ $t('buttonShow') }}</b-button>
      </template>
      <!-- Delete resource (old look; the new look has it next to the download) -->
      <template v-slot:cell(deleteFileresource)="data">
        <b-button variant="danger" class="ml-3" v-if="storeToken && userIsAtLeast(storeToken.userType, USER_TYPE_DATA_CURATOR)" @click="onDeleteResource(data.item)"><MdiIcon :path="mdiDelete" /></b-button>
      </template>
    </BaseTable>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import BaseTable from '@/components/tables/BaseTable'
import defaultProps from '@/const/table-props.js'
import { userIsAtLeast, USER_TYPE_DATA_CURATOR } from '@/mixins/api/auth'
import { isTruncatedAfterWords, truncateAfterWords, getNumberWithSuffix, formatDateTime } from '@/mixins/formatting'
import { apiDeleteFileresource, apiGetDataResource } from '@/mixins/api/dataset'
import { downloadBlob } from '@/mixins/util'

import MdiIcon from '@/components/icons/MdiIcon'

import { mdiPageNext, mdiDownload, mdiDelete, mdiDatabase } from '@mdi/js'
import { Pages } from '@/mixins/pages'
import { getFileIcon } from '@/mixins/file-icons'

const emitter = require('tiny-emitter/instance')

// The colours of the type chips (one per type, by its id)
const TYPE_COLORS = ['#4e79a7', '#3f9a4a', '#f28e2b', '#8e5ea2', '#2a9d8f', '#c9a227', '#d16b8e', '#9c755f']

export default {
  components: {
    BaseTable,
    MdiIcon
  },
  name: 'FileresourceTable',
  props: {
    ...defaultProps.BASE,
    ...defaultProps.ACTIONS
  },
  data: function () {
    return {
      mdiPageNext,
      mdiDownload,
      mdiDelete,
      mdiDatabase,
      options: {
        idColumn: 'fileresourceId',
        tableName: 'fileresources'
      },
      USER_TYPE_DATA_CURATOR
    }
  },
  computed: {
    ...mapGetters([
      'storeToken',
      'storeBaseUrl'
    ]),
    isDataCurator: function () {
      return !!this.storeToken && userIsAtLeast(this.storeToken.userType, USER_TYPE_DATA_CURATOR)
    },
    columns: function () {
      const result = [
        {
          key: 'fileresourceId',
          type: Number,
          sortable: true,
          class: 'text-right',
          defaultHidden: true,
          label: this.$t('tableColumnFileresourceId')
        }, {
          key: 'fileresourceName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnFileresourceName')
        }, {
          key: 'fileresourceDescription',
          type: String,
          sortable: true,
          label: this.$t('tableColumnFileresourceDescription')
        }, {
          key: 'fileresourceCreatedOn',
          type: Date,
          sortable: true,
          label: this.$t('tableColumnFileresourceCreatedOn'),
          formatter: value => formatDateTime(value)
        }, {
          key: 'fileresourcetypeId',
          type: String,
          sortable: true,
          class: 'text-right',
          defaultHidden: true,
          label: this.$t('tableColumnFileresourcetypeId')
        }, {
          key: 'fileresourcetypeName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnFileresourcetypeName')
        }, {
          key: 'fileresourcetypeDescription',
          type: String,
          sortable: true,
          defaultHidden: true,
          label: this.$t('tableColumnFileresourcetypeDescription')
        }, {
          key: 'datasetIds',
          type: 'json',
          sortable: false,
          class: 'px-1',
          label: this.$t('tableColumnFileresourceDatasets')
        }, {
          // The size (bytes, sorted and filtered as a number), shown in KB, MB...
          key: 'fileresourceSize',
          type: Number,
          sortable: true,
          class: 'text-right text-nowrap',
          label: this.$t('tableColumnFileresourceFileSize'),
          formatter: value => value !== null && value !== undefined ? getNumberWithSuffix(value, 2, 1024, ' ') : ''
        }, {
          key: 'download',
          type: undefined,
          sortable: false,
          label: this.$t('tableColumnFileresourceSize')
        }
      ]

      if (!this.modernLook && this.isDataCurator) {
        result.push({
          key: 'deleteFileresource',
          type: undefined,
          sortable: false,
          label: ''
        })
      }

      return result
    }
  },
  methods: {
    userIsAtLeast,
    // The icon of the file: by the extension of its name, else of its stored file
    getIcon: function (item) {
      return getFileIcon(item.fileresourceName, item.fileresourcePath)
    },
    // A colour per type of resource (by its id), the same on every page
    getTypeColor: function (item) {
      const id = parseInt(item.fileresourcetypeId)
      return TYPE_COLORS[(isNaN(id) ? 0 : Math.abs(id)) % TYPE_COLORS.length]
    },
    isTruncatedAfterWords,
    truncateAfterWords,
    getNumberWithSuffix,
    getFileResourceUrl: function (fileresource) {
      return `${this.storeBaseUrl}fileresource/${fileresource.fileresourceId}/download?token=${this.storeToken ? this.storeToken.token : null}`
    },
    showDatasets: function (fileresource) {
      const filter = [{
        column: 'fileresourceIds',
        comparator: 'contains',
        operator: 'and',
        values: [fileresource.fileresourceId]
      }]
      this.$router.push({
        name: Pages.datasets,
        query: {
          'datasets-filter': JSON.stringify(filter)
        }
      })
    },
    onDeleteResource: function (resource) {
      this.$bvModal.msgBoxConfirm(this.$t('modalTitleSure'), {
        okVariant: 'danger',
        okTitle: this.$t('genericYes'),
        cancelTitle: this.$t('genericNo')
      })
        .then(value => {
          if (value) {
            apiDeleteFileresource(resource.fileresourceId, result => {
              if (result) {
                this.refresh()
                emitter.emit('update-sidebar-menu')
              }
            })
          }
        })
    },
    downloadFileresource: function (resource) {
      apiGetDataResource(resource.fileresourceId, result => {
        downloadBlob({
          blob: result,
          filename: resource.fileresourcePath
        })
      })
    },
    showFullDescription: function (title, description) {
      this.$bvModal.msgBoxOk(description, {
        title: this.$t(title),
        okTitle: this.$t('genericOk')
      })
    },
    refresh: function () {
      this.$refs.fileresourceTable.refresh()
    }
  }
}
</script>

<style>
/* New look: the type as a chip, the download as one outlined button with the size, the datasets as a chip with their
   number, delete as an icon */
.fileresource-table .fr-type .fa-solid {
  color: var(--bt-chip-color);
}
.fileresource-table .fr-name {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.fileresource-table .fr-file-icon {
  flex-shrink: 0;
  font-size: 1.15rem;
}
/* Dark mode: the colours of the files lighter, readable on the dark background */
body.dark-mode .fileresource-table .fr-file-icon {
  filter: brightness(1.6) saturate(0.9);
}
.fileresource-table .fr-datasets {
  --bt-chip-color: var(--bt-accent);
  text-decoration: none;
}
.fileresource-table .fr-datasets .fa-solid {
  color: var(--bt-chip-color);
}
.fileresource-table .fr-datasets:hover {
  border-color: var(--bt-chip-color);
  text-decoration: none;
}
.fileresource-table .fr-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  white-space: nowrap;
}
.fileresource-table .fr-download {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  height: 32px;
  padding: 0 0.75rem;
  border: 1px solid var(--bt-border);
  border-radius: 8px;
  background: var(--bt-surface);
  color: var(--bt-text);
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
  text-decoration: none;
}
.fileresource-table .fr-download .fa-download {
  color: var(--bt-accent);
}
.fileresource-table .fr-download:hover {
  border-color: var(--bt-accent);
  color: var(--bt-text);
  text-decoration: none;
}
.fileresource-table .fr-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--bt-icon);
  font-size: 1rem;
  cursor: pointer;
}
.fileresource-table .fr-action:hover {
  background: var(--bt-icon-hover-bg);
}
.fileresource-table .fr-action.is-danger:hover {
  color: var(--bt-danger);
}
</style>
