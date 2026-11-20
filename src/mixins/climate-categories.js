// The categories of a categorical climate. The climates have no restrictions (unlike the traits): their categories are
// the values found in the data, counted by the database (dataset/categorical/climate: a GROUP BY on the indexed climate
// id), so only the list of the categories travels, never the observations. Each climate asked once per session (and
// per set of datasets): kept, a request already running shared; at most a few requests at once.
import { apiPostClimateStatsCategorical } from '@/mixins/api/dataset'

// At most this many requests at once (the rest wait their turn)
const CONCURRENT = 4

const cache = new Map()
const waiting = []
let running = 0

const next = () => {
  while (running < CONCURRENT && waiting.length > 0) {
    const task = waiting.shift()
    running++
    task().finally(() => {
      running--
      next()
    })
  }
}
const enqueue = task => new Promise(resolve => {
  waiting.push(() => task().then(resolve))
  next()
})

// The answer (tab separated: the value, then its count in each dataset): the categories, each with its total count, in
// the order of their names
const parse = text => {
  const lines = `${text || ''}`.split(/\r?\n/).filter(line => line.trim() !== '')
  return lines.slice(1).map(line => {
    const cells = line.split('\t')
    const count = cells.slice(1).reduce((sum, c) => sum + (isFinite(c) ? +c : 0), 0)
    return { value: `${cells[0]}`.trim(), count }
  }).filter(c => c.value !== '' && c.value.toLowerCase() !== 'null')
    .sort((a, b) => a.value.localeCompare(b.value, undefined, { sensitivity: 'base' }))
}

// The categories of a climate ({ value, count }), in some datasets (none given: all those the user can see)
const getClimateCategories = (climateId, datasetIds = null) => {
  const ids = datasetIds && datasetIds.length > 0 ? datasetIds.slice().sort((a, b) => a - b) : null
  const key = `${climateId}|${ids ? ids.join(',') : '*'}`
  if (!cache.has(key)) {
    cache.set(key, enqueue(() => new Promise(resolve => {
      apiPostClimateStatsCategorical({ datasetIds: ids, xIds: [climateId] }, result => {
        const read = result && typeof result.text === 'function' ? result.text() : Promise.resolve(result)
        read.then(text => resolve(parse(text))).catch(() => resolve([]))
      }, { codes: [], callback: () => resolve([]) })
    })))
  }
  return cache.get(key)
}

export {
  getClimateCategories
}
