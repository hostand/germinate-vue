// The statistics of a variable per data type (TraitValueStats and the components extending it) serve traits and climates.
// Climate data has a location and a recording date per observation (no germplasm, rep or block): the location takes the
// place of the germplasm, the views by rep / block are left out. The texts naming the trait or the germplasm have a
// climate version: CLIMATE_KEYS gives it for each key (the key itself otherwise).
const CLIMATE_KEYS = {
  pageTraitDetailsStatsAllGermplasm: 'pageClimateDetailsStatsAllLocations',
  pageTraitDetailsStatsConsistentGermplasm: 'pageClimateDetailsStatsConsistentLocations',
  pageTraitDetailsStatsGermplasmRange: 'pageClimateDetailsStatsLocationRange',
  pageTraitDetailsStatsMostlyUnique: 'pageClimateDetailsStatsMostlyUnique',
  pageTraitDetailsStatsNextGermplasm: 'pageClimateDetailsStatsNextLocations',
  pageTraitDetailsStatsPreviousGermplasm: 'pageClimateDetailsStatsPreviousLocations',
  pageTraitDetailsStatsNoOutliers: 'pageClimateDetailsStatsNoOutliers',
  pageTraitDetailsStatsObservationsLarge: 'pageClimateDetailsStatsObservationsLarge',
  pageTraitDetailsStatsOnlyMixed: 'pageClimateDetailsStatsOnlyMixed',
  pageTraitDetailsStatsOutlierReps: 'pageClimateDetailsStatsOutlierLocation',
  pageTraitDetailsStatsRankingRaw: 'pageClimateDetailsStatsRankingRaw',
  pageTraitDetailsStatsRepeatability: 'pageClimateDetailsStatsLocationShare',
  pageTraitDetailsStatsRepeatabilityTooltip: 'pageClimateDetailsStatsLocationShareTooltip',
  pageTraitDetailsStatsSingleDate: 'pageClimateDetailsStatsSingleDate',
  pageTraitDetailsStatsTimelineLarge: 'pageClimateDetailsStatsTimelineLarge',
  pageTraitDetailsStatsTimelineSummary: 'pageClimateDetailsStatsTimelineSummary',
  pageTraitDetailsStatsViewByGermplasm: 'pageClimateDetailsStatsViewByLocation',
  tableColumnGermplasmName: 'tableColumnLocationName',
  pageTraitDetailsTourCategoricalDistribution: 'pageClimateDetailsTourCategoricalDistribution',
  pageTraitDetailsTourCategoricalGermplasm: 'pageClimateDetailsTourCategoricalLocation',
  pageTraitDetailsTourDateTimeline: 'pageClimateDetailsTourDateTimeline',
  pageTraitDetailsTourNumberCv: 'pageClimateDetailsTourNumberCv',
  pageTraitDetailsTourNumberMissing: 'pageClimateDetailsTourNumberMissing',
  pageTraitDetailsTourNumberMissingShare: 'pageClimateDetailsTourNumberMissingShare',
  pageTraitDetailsTourNumberObservations: 'pageClimateDetailsTourNumberObservations',
  pageTraitDetailsTourNumberSd: 'pageClimateDetailsTourNumberSd',
  pageTraitDetailsTourNumbersText: 'pageClimateDetailsTourNumbersText',
  pageTraitDetailsTourNumericDistribution: 'pageClimateDetailsTourNumericDistribution',
  pageTraitDetailsTourNumericOutliers: 'pageClimateDetailsTourNumericOutliers',
  pageTraitDetailsTourNumericRanking: 'pageClimateDetailsTourNumericRanking'
}

// The variable types: the column of the value in the file of the counts per value, and the columns of the data table
const VARIABLES = {
  trait: {
    valueColumn: 'phenotype_value',
    idColumn: 'traitId',
    dataValueColumn: 'traitValue',
    orderBy: 'germplasmId'
  },
  climate: {
    valueColumn: 'climate_value',
    idColumn: 'climateId',
    dataValueColumn: 'climateValue',
    orderBy: 'locationId'
  }
}

export {
  CLIMATE_KEYS,
  VARIABLES
}
