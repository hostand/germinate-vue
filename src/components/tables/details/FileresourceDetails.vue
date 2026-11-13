<template>
  <!-- The data resources linked to a dataset (below its row in the datasets table) -->
  <FileresourceTable :getData="getData" :storeUrlParameters="false" />
</template>

<script>
import { mapGetters } from 'vuex'
import FileresourceTable from '@/components/tables/FileresourceTable'
import { userIsAtLeast, USER_TYPE_ADMINISTRATOR } from '@/mixins/api/auth'
import { apiPostFileResourceTable, apiGetFileResourceTypes } from '@/mixins/api/dataset'

// Data resources of this type are only listed for administrators (as on the data resources page)
const ADMIN_ONLY_TYPE = 'Video'

export default {
  props: {
    dataset: {
      type: Object,
      default: null
    }
  },
  components: {
    FileresourceTable
  },
  data: function () {
    return {
      // Names of the resource types everyone can see, loaded once when needed
      visibleTypeNames: null
    }
  },
  computed: {
    ...mapGetters([
      'storeToken'
    ]),
    isAdmin: function () {
      return !!this.storeToken && userIsAtLeast(this.storeToken.userType, USER_TYPE_ADMINISTRATOR)
    }
  },
  methods: {
    getVisibleTypeNames: function () {
      if (this.visibleTypeNames) {
        return Promise.resolve(this.visibleTypeNames)
      }
      return new Promise(resolve => {
        apiGetFileResourceTypes(result => {
          this.visibleTypeNames = (result || []).map(t => t.name).filter(name => name !== ADMIN_ONLY_TYPE)
          resolve(this.visibleTypeNames)
        })
      })
    },
    // The resources of the dataset (and, for non-administrators, not those of the administrators only): added to the
    // request, not shown in the filter of the table. The request itself is changed (as on the data resources page): the
    // table reads its page back from it.
    getData: function (data, callback) {
      data.filter = [...(data.filter || []), {
        column: 'datasetIds',
        comparator: 'contains',
        operator: 'and',
        values: [this.dataset.datasetId]
      }]
      if (this.isAdmin) {
        return apiPostFileResourceTable(data, callback)
      }
      return this.getVisibleTypeNames().then(names => {
        data.filter = [...data.filter, {
          column: 'fileresourcetypeName',
          comparator: 'inSet',
          operator: 'and',
          // An empty set would not filter anything
          values: names.length > 0 ? names : ['']
        }]
        return apiPostFileResourceTable(data, callback)
      })
    }
  }
}
</script>
