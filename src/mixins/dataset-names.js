import Vue from 'vue'
import { apiPostDatasetTable } from '@/mixins/api/dataset'

// The names of the datasets by their id, for the filters on datasets (chips of the filter, the line of the active
// filters): known once chosen, else loaded (e.g. a filter of the address)
const state = Vue.observable({
  names: {}
})
const loading = new Set()

const getDatasetName = id => state.names[id] || null

const setDatasetName = (id, name) => {
  if (id !== null && id !== undefined && name) {
    Vue.set(state.names, id, name)
  }
}

const loadDatasetNames = ids => {
  const missing = (ids || []).map(id => parseInt(id)).filter(id => !isNaN(id) && !state.names[id] && !loading.has(id))
  if (missing.length === 0) {
    return
  }
  missing.forEach(id => loading.add(id))
  apiPostDatasetTable({
    page: 1,
    limit: missing.length,
    filter: [{ column: 'datasetId', comparator: 'inSet', operator: 'and', values: missing }]
  }, result => {
    ((result && result.data) || []).forEach(dataset => setDatasetName(dataset.datasetId, dataset.datasetName))
    missing.forEach(id => loading.delete(id))
  }, {
    codes: [],
    callback: () => missing.forEach(id => loading.delete(id))
  })
}

export {
  getDatasetName,
  setDatasetName,
  loadDatasetNames
}
