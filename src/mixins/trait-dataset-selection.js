import Vue from 'vue'

// The dataset selected for a trait (its statistics): chosen in the datasets of a row of the traits table or in the
// datasets tab of the trait, the other one shows it selected too. One dataset per trait, kept while the app is open.
const state = Vue.observable({
  byTrait: {}
})

const getTraitDataset = traitId => {
  const datasetId = state.byTrait[traitId]
  return datasetId === undefined ? null : datasetId
}

const setTraitDataset = (traitId, datasetId) => {
  if (traitId === null || traitId === undefined) {
    return
  }
  if (datasetId === null || datasetId === undefined) {
    Vue.delete(state.byTrait, traitId)
  } else {
    Vue.set(state.byTrait, traitId, datasetId)
  }
}

export {
  getTraitDataset,
  setTraitDataset
}
