// The icon of a climate variable by its name (Font Awesome): the first entry with a word of the name starting with one
// of its keywords ("rain" also finds "Rainfall", "harvest" "Harvesting"); keywords of three letters or fewer only as
// whole words ("ph" is not "phosphorus"). Only an icon: nothing else is told from the name.
const VARIABLE_ICONS = [
  { keywords: ['temperature', 'thermal'], icon: 'fa-solid fa-temperature-half' },
  { keywords: ['humidity', 'moisture'], icon: 'fa-solid fa-droplet' },
  { keywords: ['wind'], icon: 'fa-solid fa-wind' },
  { keywords: ['rain', 'rainfall'], icon: 'fa-solid fa-cloud-rain' },
  { keywords: ['precipitation'], icon: 'fa-solid fa-cloud-showers-heavy' },
  { keywords: ['snow'], icon: 'fa-solid fa-snowflake' },
  { keywords: ['light', 'solar', 'radiation', 'sunshine'], icon: 'fa-solid fa-sun' },
  { keywords: ['pressure'], icon: 'fa-solid fa-gauge' },
  { keywords: ['dew'], icon: 'fa-solid fa-droplet' },
  { keywords: ['evapotranspiration'], icon: 'fa-solid fa-water' },
  { keywords: ['cloud'], icon: 'fa-solid fa-cloud' },
  { keywords: ['frost'], icon: 'fa-solid fa-icicles' },
  { keywords: ['heat'], icon: 'fa-solid fa-temperature-high' },
  { keywords: ['drought'], icon: 'fa-solid fa-sun' },
  { keywords: ['flood'], icon: 'fa-solid fa-water' },
  { keywords: ['hail'], icon: 'fa-solid fa-cloud-meatball' },
  { keywords: ['storm'], icon: 'fa-solid fa-cloud-bolt' },
  { keywords: ['ph'], icon: 'fa-solid fa-flask' },
  { keywords: ['nitrogen', 'phosphorus', 'potassium'], icon: 'fa-solid fa-flask' },
  { keywords: ['carbon'], icon: 'fa-solid fa-leaf' },
  { keywords: ['salinity'], icon: 'fa-solid fa-water' },
  { keywords: ['conductivity'], icon: 'fa-solid fa-bolt' },
  { keywords: ['density'], icon: 'fa-solid fa-weight-hanging' },
  { keywords: ['elevation'], icon: 'fa-solid fa-mountain-sun' },
  { keywords: ['latitude', 'longitude', 'location', 'site'], icon: 'fa-solid fa-location-dot' },
  { keywords: ['slope'], icon: 'fa-solid fa-mountain' },
  { keywords: ['vegetation', 'plant', 'crop'], icon: 'fa-solid fa-seedling' },
  { keywords: ['leaf', 'chlorophyll'], icon: 'fa-solid fa-leaf' },
  { keywords: ['biomass', 'weight'], icon: 'fa-solid fa-weight-hanging' },
  { keywords: ['ndvi'], icon: 'fa-solid fa-satellite' },
  { keywords: ['disease'], icon: 'fa-solid fa-virus' },
  { keywords: ['pest', 'insect'], icon: 'fa-solid fa-bug' },
  { keywords: ['weed'], icon: 'fa-solid fa-seedling' },
  { keywords: ['irrigation'], icon: 'fa-solid fa-faucet-drip' },
  { keywords: ['fertilizer'], icon: 'fa-solid fa-flask' },
  { keywords: ['pesticide', 'herbicide', 'fungicide', 'spray'], icon: 'fa-solid fa-spray-can' },
  { keywords: ['insecticide'], icon: 'fa-solid fa-bug' },
  { keywords: ['sowing', 'planting'], icon: 'fa-solid fa-seedling' },
  { keywords: ['harvest', 'yield'], icon: 'fa-solid fa-chart-column' },
  { keywords: ['tillage'], icon: 'fa-solid fa-tractor' },
  { keywords: ['area'], icon: 'fa-solid fa-vector-square' },
  { keywords: ['soil'], icon: 'fa-solid fa-layer-group' }
]

const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const MATCHERS = VARIABLE_ICONS.map(entry => ({
  icon: entry.icon,
  regex: new RegExp(entry.keywords.map(k => k.length <= 3 ? `\\b${escape(k)}\\b` : `\\b${escape(k)}`).join('|'), 'i')
}))

// The icon of a variable by its name; none (null) without a keyword in it
const getVariableIcon = name => {
  const text = `${name === null || name === undefined ? '' : name}`.replace(/[_-]+/g, ' ')
  const match = MATCHERS.find(m => m.regex.test(text))
  return match ? match.icon : null
}

export {
  VARIABLE_ICONS,
  getVariableIcon
}
