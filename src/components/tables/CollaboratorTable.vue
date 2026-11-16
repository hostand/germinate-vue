<template>
  <div>
    <BaseTable :options="options"
               :columns="columns"
               v-bind="$props"
               ref="collaboratorTable"
               v-on="$listeners"
               @loaded="updateRoleColors">
      <!-- Collaborator email link -->
      <template v-slot:cell(collaboratorEmail)="data">
        <a :href="`mailto:${data.item.collaboratorEmail}`" v-if="data.item.collaboratorEmail">{{ data.item.collaboratorEmail }}</a>
      </template>
      <!-- Collaborator country represented by a flag icon -->
      <template v-slot:cell(countryName)="data">
        <span class="table-country" v-b-tooltip.hover :title="data.item.countryName"><i :class="'fi fi-' + data.item.countryCode2.toLowerCase()" v-if="data.item.countryCode2"/> <span> {{ data.item.countryCode2 }}</span></span>
      </template>
      <!-- Roles (several separated by ";"): one chip each, in the colour of the role (the same role, the same colour
           among the rows shown), on one line; when they do not fit, the chevron of the table (cut columns) shows all -->
      <template v-slot:cell(collaboratorRoles)="data">
        <span class="bt-chips" v-if="getRoles(data.item).length > 0">
          <span class="bt-chip" :style="{ '--bt-chip-color': getRoleColor(role) }" v-for="(role, index) in getRoles(data.item)" :key="`role-${index}`"><i class="fa-solid fa-id-badge" aria-hidden="true" /> {{ role }}</span>
        </span>
      </template>
      <!-- External ID link if URL or ORCID -->
      <template v-slot:cell(collaboratorExternalId)="data">
        <template v-if="data.item.collaboratorExternalId">
          <a rel="noopener noreferrer" :href="`https://orcid.org/${data.item.collaboratorExternalId}`" v-if="isOrcid(data.item.collaboratorExternalId)">{{ `https://orcid.org/${data.item.collaboratorExternalId}` }}</a>
          <a rel="noopener noreferrer" :href="data.item.collaboratorExternalId" v-else-if="data.item.collaboratorExternalId.startsWith('https')">{{ data.item.collaboratorExternalId }}</a>
          <span v-else>{{ data.item.collaboratorExternalId }}</span>
        </template>
      </template>
    </BaseTable>
  </div>
</template>

<script>
import BaseTable from '@/components/tables/BaseTable'
import defaultProps from '@/const/table-props.js'
import { getColors } from '@/mixins/colors'

export default {
  name: 'CollaboratorTable',
  props: {
    ...defaultProps.BASE
  },
  data: function () {
    return {
      options: {
        idColumn: 'collaboratorId',
        tableName: 'collaborators'
      },
      // The colour of each role of the rows shown (by its name in lower case)
      roleColors: {}
    }
  },
  computed: {
    columns: function () {
      return [
        {
          key: 'projectIds',
          type: 'json',
          sortable: false,
          class: 'd-none text-right',
          label: this.$t('tableColumnProjectId')
        }, {
          key: 'collaboratorId',
          type: Number,
          sortable: true,
          class: 'text-right',
          label: this.$t('tableColumnCollaboratorId')
        }, {
          key: 'collaboratorFirstName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnCollaboratorFirstName')
        }, {
          key: 'collaboratorLastName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnCollaboratorLastName')
        }, {
          key: 'collaboratorEmail',
          type: String,
          sortable: true,
          label: this.$t('tableColumnCollaboratorEmail')
        }, {
          key: 'collaboratorExternalId',
          type: String,
          sortable: true,
          label: this.$t('tableColumnCollaboratorExternalId')
        }, {
          key: 'collaboratorRoles',
          type: String,
          sortable: true,
          label: this.$t('tableColumnCollaboratorRoles')
        }, {
          key: 'institutionName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnInstitutionName')
        }, {
          key: 'institutionAddress',
          type: String,
          sortable: true,
          label: this.$t('tableColumnInstitutionAddress')
        }, {
          key: 'countryName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnCountryName')
        }
      ]
    }
  },
  components: {
    BaseTable
  },
  methods: {
    // The roles of a collaborator, one per ";" (empty ones left out), the first letter of each word in capitals, in
    // alphabetical order
    getRoles: function (item) {
      return (item.collaboratorRoles || '').split(';')
        .map(role => role.trim().replace(/(^|\s)(\S)/g, (match, space, letter) => space + letter.toUpperCase()))
        .filter(role => role.length > 0)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    },
    // The roles of the rows shown, in alphabetical order, each a colour of its own (again when the colours run out)
    updateRoleColors: function (result) {
      const roles = new Set()
      ;((result && result.data) || []).forEach(item => this.getRoles(item).forEach(role => roles.add(role.toLowerCase())))
      const colors = getColors() || []
      const roleColors = {}
      ;[...roles].sort().forEach((role, index) => {
        roleColors[role] = colors.length > 0 ? colors[index % colors.length] : null
      })
      this.roleColors = roleColors
    },
    getRoleColor: function (role) {
      return this.roleColors[role.toLowerCase()] || 'var(--bt-accent)'
    },
    isOrcid: function (input) {
      return /^(\d{4}-){3}\d{3}(\d|X)$/.test(input)
    },
    refresh: function () {
      this.$refs.collaboratorTable.refresh()
    }
  }
}
</script>

<style>
</style>
