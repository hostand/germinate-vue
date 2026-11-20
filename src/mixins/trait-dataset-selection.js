import Vue from 'vue'

// The dataset selected for a trait (its statistics): chosen in the datasets of a row of the traits table or in the
// datasets tab of the trait, the other one shows it selected too. One dataset per trait, kept while the app is open.
// The same for a climate (chosen in the climates table or in the datasets tab of the climate).
const state = Vue.observable({
  byTrait: {},
  byClimate: {}
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

const getClimateDataset = climateId => {
  const datasetId = state.byClimate[climateId]
  return datasetId === undefined ? null : datasetId
}

const setClimateDataset = (climateId, datasetId) => {
  if (climateId === null || climateId === undefined) {
    return
  }
  if (datasetId === null || datasetId === undefined) {
    Vue.delete(state.byClimate, climateId)
  } else {
    Vue.set(state.byClimate, climateId, datasetId)
  }
}

export {
  getTraitDataset,
  setTraitDataset,
  getClimateDataset,
  setClimateDataset
}
