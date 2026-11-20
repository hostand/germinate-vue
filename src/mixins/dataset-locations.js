// The locations of some datasets (their own list of locations), with their country, coordinates and elevation (from the
// locations table): a Promise of [{ locationId, locationName, datasetIds, countryCode2, countryCode3, countryName,
// latitude, longitude, elevation, row (the row of the locations table) }], by name
import { apiPostDatasetTable } from '@/mixins/api/dataset'
import { apiPostLocationTable } from '@/mixins/api/location'

const loadDatasetLocations = datasetIds => new Promise(resolve => {
  const ids = (datasetIds || []).slice()
  if (ids.length < 1) {
    resolve([])
    return
  }
  apiPostDatasetTable({
    page: 1,
    limit: ids.length,
    filter: [{ column: 'datasetId', comparator: 'inSet', operator: 'and', values: ids }]
  }, result => {
    const byId = {}
    ;((result && result.data) || []).forEach(d => (d.locations || []).forEach(l => {
      const location = byId[l.locationId] = byId[l.locationId] || { locationId: l.locationId, locationName: `${l.locationName}`, datasetIds: [], countryCode2: null, countryCode3: null, countryName: null, latitude: null, longitude: null, elevation: null, row: null }
      if (!location.datasetIds.includes(d.datasetId)) {
        location.datasetIds.push(d.datasetId)
      }
    }))
    const sorted = () => Object.values(byId).sort((a, b) => a.locationName.localeCompare(b.locationName))
    const locationIds = Object.keys(byId).map(Number)
    if (locationIds.length < 1) {
      resolve([])
      return
    }
    apiPostLocationTable({
      page: 1,
      limit: locationIds.length,
      filter: [{ column: 'locationId', comparator: 'inSet', operator: 'and', values: locationIds }]
    }, details => {
      ;((details && details.data) || []).forEach(l => {
        if (byId[l.locationId]) {
          Object.assign(byId[l.locationId], {
            countryCode2: l.countryCode2 || null,
            countryCode3: l.countryCode3 || null,
            countryName: l.countryName || null,
            latitude: l.locationLatitude,
            longitude: l.locationLongitude,
            elevation: l.locationElevation,
            row: l
          })
        }
      })
      resolve(sorted())
    }, { codes: [], callback: () => resolve(sorted()) })
  }, { codes: [], callback: () => resolve([]) })
})

export {
  loadDatasetLocations
}
