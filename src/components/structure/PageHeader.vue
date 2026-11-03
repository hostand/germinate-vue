<template>
  <!-- No title above the pages (logo, name of the database, line): only a space between the navigation and the page,
       and the selected projects when there are some -->
  <div :class="['page-header-space', { 'page-header-story': storeActiveStory }]">
    <div class="d-flex justify-content-end mb-3" v-if="selectedProjects && selectedProjects.length > 0">
      <div class="d-flex flex-row flex-wrap justify-content-end">
        <!-- Selected projects -->
        <h5 v-if="selectedProjects && selectedProjects.length > 0"
            class="d-flex align-items-stretch mx-1 marked-item-badges">
          <div tabindex="100" id="popover-target-projects" class="d-flex align-items-stretch" v-b-tooltip="$t('tooltipPageHeaderShowSelectedProjects')">
            <b-badge variant="primary">
              <MdiIcon :path="mdiClipboardList" />
            </b-badge>
            <b-badge>{{ getNumberWithSuffix(selectedProjects.length, 1) }}</b-badge>
          </div>
          <b-popover target="popover-target-projects" triggers="focus" placement="top">
            <template #title>{{ `${$t('widgetHeaderSelectedProjects')}: ${(selectedProjects || []).length.toLocaleString()}` }}</template>

            <b-list-group>
              <b-list-group-item v-for="project in selectedProjects" :key="`selected-project-${project.projectId}`" class="d-flex justify-content-between align-items-center">
                <span class="text-truncate mr-2">{{ project.projectName }}</span>
                <b-badge variant="danger" href="#" @click.prevent="removeSelectedProject(project)">
                  <MdiIcon :path="mdiDelete" />
                </b-badge>
              </b-list-group-item>
            </b-list-group>
          </b-popover>
          <b-badge :href="selectedProjects.length < 1 ? null : '#'"
                   :disabled="selectedProjects.length < 1"
                   @click.prevent="selectedProjects.length < 1 ? null : clearSelectedProjects()"
                   v-b-tooltip="$t('chartTooltipSelectedProjectsClear')">
            <span :class="{ 'text-danger': selectedProjects.length >= 1 }"><MdiIcon :path="mdiDelete" /></span>
          </b-badge>
        </h5>
        <!-- Marked items: in the top navigation (MarkedItemsDropdown) -->
      </div>
    </div>
  </div>
</template>

<script>
import MdiIcon from '@/components/icons/MdiIcon'
import { getHighContrastTextColor } from '@/mixins/colors'
import { getNumberWithSuffix } from '@/mixins/formatting'
import { markedItemTypes } from '@/mixins/types'
import { Pages } from '@/mixins/pages'

import { mdiClipboardList, mdiDelete } from '@mdi/js'

import { mapGetters } from 'vuex'
import { apiPostProjectTable } from '@/mixins/api/project'

export default {
  components: {
    MdiIcon
  },
  data: function () {
    return {
      Pages,
      markedItemTypes,
      mdiDelete,
      mdiClipboardList,
      selectedProjects: []
    }
  },
  computed: {
    ...mapGetters([
      'storeBaseUrl',
      'storeServerSettings',
      'storeMarkedIds',
      'storeActiveStory',
      'storeSelectedProjects'
    ])
  },
  watch: {
    storeSelectedProjects: function (newValue) {
      if (newValue && newValue.length > 0) {
        this.fetchSelectedProjects()
      } else {
        this.selectedProjects = []
      }
    }
  },
  methods: {
    getNumberWithSuffix,
    getHighContrastTextColor,
    fetchSelectedProjects: function () {
      const data = {
        page: 1,
        limit: this.storeSelectedProjects.length,
        prevCount: -1,
        orderBy: null,
        ascending: null,
        minimal: true,
        filter: [
          {
            column: 'projectId',
            operator: 'and',
            comparator: 'inSet',
            values: this.storeSelectedProjects
          }
        ]
      }
      apiPostProjectTable(data, result => {
        if (result && result.data) {
          this.selectedProjects = result.data || []
        }
      })
    },
    removeSelectedProject: function (project) {
      const copy = this.storeSelectedProjects.concat().filter(p => p !== project.projectId)

      this.$store.dispatch('setSelectedProjects', copy)
    },
    clearSelectedProjects: function () {
      // Ask for confirmation
      this.$bvModal.msgBoxConfirm(this.$t('modalTitleSure'), {
        okVariant: 'danger',
        okTitle: this.$t('genericYes'),
        cancelTitle: this.$t('genericNo')
      })
        .then(value => {
          if (value) {
            this.$store.dispatch('setSelectedProjects', [])
          }
        })
    },
    clearMarkedItems: function (itemType) {
      // Ask for confirmation
      this.$bvModal.msgBoxConfirm(this.$t('modalTitleSure'), {
        okVariant: 'danger',
        okTitle: this.$t('genericYes'),
        cancelTitle: this.$t('genericNo')
      })
        .then(value => {
          if (value) {
            this.$store.dispatch('clearMarkedIds', itemType)
          }
        })
    }
  },
  mounted: function () {
    this.fetchSelectedProjects()
  }
}
</script>

<style scoped>
/* The space between the navigation and the page */
.page-header-space {
  padding-top: 1.75rem;
}
/* Under the navigation of a story: a little less */
.page-header-space.page-header-story {
  padding-top: 1rem;
}
#popover-target-projects:hover {
  cursor: pointer;
}
.marked-item-badges {
  white-space: nowrap;
}
.marked-item-badges a .badge:first-child {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
.marked-item-badges a .badge:last-child {
  border-radius: 0;
}
.marked-item-badges a:hover {
  text-decoration: none;
}
.marked-item-badges > .badge {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
</style>
