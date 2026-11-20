<template>
  <!-- Spatial analysis (a tab of the climate export): the locations of the chosen datasets on a map, in four views; every
       view takes the variables the user picks (measurements: numeric; events: dates), nothing told from their names.
       - Climate wheels: at each site, the 12 months of a measurement as a wheel (January at the top, clockwise), each
         month the mean of the month in each year (of each dataset), then their mean.
       - Time-lapse: a measurement step by step (month or day): each site coloured and sized by its mean of the step, a
         dashed ring the step before; the events (date variables) appear at their place in their step; play / pause.
       - Climate analogs: two or more measurements; each site by the means of them, standardized (z); the sites most
         similar to a reference site (the closest in that space) joined to it, thicker when more similar; a click on a
         site makes it the reference; the ranking below.
       - Coverage: every variable: the values of each site (circle: values or variables), its share of the recording
         dates of its measurements with a value (colour), its period.
       The observations of the variables needed by the view are loaded (in pages; very many: once confirmed). -->
  <section class="stc csp">
    <header class="stc-head" key="csp-head">
      <span class="stc-icon" :style="{ '--stc-type-color': typeColor }" aria-hidden="true"><i class="fa-solid fa-satellite csp-head-icon" /></span>
      <div class="stc-heading">
        <h3 class="stc-title">{{ $t('pageClimateSpatialTitle') }}</h3>
        <p class="stc-text">{{ currentView.help }}</p>
      </div>
      <!-- One measurement (wheels, time-lapse), several (analogs) -->
      <div class="stc-select" v-if="view === 'wheels' || view === 'timelapse'">
        <GermplasmFilterSelect id="csp-measure"
                               key="csp-measure"
                               :options="measureOptions"
                               :value="measureKey"
                               :placeholder="$t('pageComparisonClimatePlaceholder')"
                               :loading="traitsLoading"
                               countIcon="fa-solid fa-database"
                               @select="chooseMeasure"
                               @clear="chooseMeasure(null)" />
      </div>
      <div class="stc-select" v-else-if="view === 'analogs'">
        <GermplasmFilterSelect id="csp-analog"
                               key="csp-analog"
                               :options="analogOptions"
                               :value="null"
                               :placeholder="$t('pageClimateComparisonMultiTraitPlaceholder')"
                               :loading="traitsLoading"
                               countIcon="fa-solid fa-location-dot"
                               multiple
                               @select="addAnalog" />
      </div>
    </header>
    <!-- Analogs: the chosen measurements, chips -->
    <div class="csp-chips" key="csp-chips" v-if="view === 'analogs' && analogKeys.length > 0">
      <span class="csp-chip" v-for="key in analogKeys" :key="`csp-chip-${key}`">
        {{ labelOf(key) }}
        <button type="button" class="csp-chip-remove" :title="$t('genericRemove')" :aria-label="$t('genericRemove')" @click="removeAnalog(key)"><i class="fa-solid fa-xmark" aria-hidden="true" /></button>
      </span>
    </div>

    <div class="stc-body tvs csp-body" key="csp-body" :id="id">
      <!-- The views -->
      <div class="tds csp-views" key="csp-views">
        <div class="tds-views" role="tablist">
          <button type="button"
                  :class="['tds-view', { active: view === option.key }]"
                  role="tab"
                  :aria-selected="view === option.key ? 'true' : 'false'"
                  v-for="option in views"
                  :key="`csp-view-${option.key}`"
                  @click="view = option.key">
            <i :class="option.icon" aria-hidden="true" /> {{ option.text }}
          </button>
        </div>
      </div>
      <!-- The options of the view -->
      <div class="csp-options" key="csp-options-step" v-if="view === 'timelapse' && selected">
        <span class="csp-option-label">{{ $t('pageClimateSpatialStep') }}</span>
        <button type="button" :class="['csp-option', { active: step === 'month' }]" @click="setStep('month')">{{ $t('pageClimateSpatialStepMonth') }}</button>
        <button type="button" :class="['csp-option', { active: step === 'day' }]" @click="setStep('day')">{{ $t('pageClimateSpatialStepDay') }}</button>
      </div>
      <div class="csp-options" key="csp-options-reference" v-if="view === 'analogs' && analogProfiles.length > 1">
        <span class="csp-option-label">{{ $t('pageClimateSpatialReference') }}</span>
        <select class="csp-select" v-model.number="referenceId" @change="drawMap">
          <option v-for="p in analogProfiles" :key="`csp-ref-${p.locationId}`" :value="p.locationId">{{ p.name }}</option>
        </select>
      </div>
      <div class="csp-options" key="csp-options-size" v-if="view === 'coverage'">
        <span class="csp-option-label">{{ $t('pageClimateSpatialSize') }}</span>
        <button type="button" :class="['csp-option', { active: coverageSize === 'values' }]" @click="setCoverageSize('values')">{{ $t('pageClimateSpatialSizeValues') }}</button>
        <button type="button" :class="['csp-option', { active: coverageSize === 'variables' }]" @click="setCoverageSize('variables')">{{ $t('pageClimateSpatialSizeVariables') }}</button>
      </div>

      <!-- The map (always there: the sites in grey until the data of the view is ready), its legend, the state of the
           data over it (what to choose, the loading, the confirmation of a large loading) -->
      <p class="tvs-empty" key="csp-no-sites" v-if="!mapShown">{{ $t('pageLocationProfileNone') }}</p>
      <div class="csp-map-wrap" key="csp-map-wrap" v-show="mapShown">
        <div class="csp-map" ref="map" />
        <div class="csp-legend" v-html="legend" v-if="legend && dataReady" />
        <div class="csp-state" v-if="!dataReady">
          <span v-if="!selected"><i class="fa-solid fa-hand-pointer" aria-hidden="true" /> {{ view === 'analogs' ? $t('pageClimateSpatialChooseMany') : $t('pageClimateSpatialChoose') }}</span>
          <span v-else-if="rowsState === 'loading'"><b-spinner small /> {{ rowsProgress || $t('tooltipTableLoadingIndicator') }}</span>
          <template v-else-if="rowsState === 'confirm'">
            <span><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ $t('pageClimateSpatialLarge', { count: formatNumber(rowsTotal) }) }}</span>
            <button type="button" class="tvs-values-link" @click="loadRows"><i class="fa-solid fa-download" aria-hidden="true" /> {{ $t('pageTraitDetailsStatsLoadObservations') }}</button>
          </template>
          <span v-else-if="rowsState === 'loaded' && view === 'analogs'"><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ $t('pageClimateSpatialNoAnalogs') }}</span>
        </div>
      </div>
      <!-- Time-lapse: the player -->
      <div class="csp-player" key="csp-player" v-if="view === 'timelapse' && dataReady && frames.length > 0">
        <button type="button" class="csp-play" :aria-label="playing ? $t('pageClimateSpatialPause') : $t('pageClimateSpatialPlay')" @click="togglePlay">
          <i :class="['fa-solid', playing ? 'fa-pause' : 'fa-play']" aria-hidden="true" />
        </button>
        <span class="csp-player-end">{{ frames[0] }}</span>
        <div class="csp-track">
          <input type="range" min="0" :max="frames.length - 1" v-model.number="frameIndex" @input="stop(); drawMap()" :aria-label="$t('pageClimateSpatialStep')" />
          <span class="csp-track-event" v-for="mark in eventMarks" :key="`csp-mark-${mark.index}`" :style="{ left: `${mark.position}%` }" :title="mark.names"><i class="fa-solid fa-diamond" aria-hidden="true" /></span>
        </div>
        <span class="csp-player-end">{{ frames[frames.length - 1] }}</span>
        <span class="csp-player-now">{{ frames[frameIndex] }}</span>
      </div>
      <!-- Analogs: the ranking -->
      <div class="csp-ranking" key="csp-ranking" v-if="view === 'analogs' && dataReady && analogRanking.length > 0">
        <h4 class="stc-chart-title">{{ $t('pageClimateSpatialRanking', { name: referenceName }) }}</h4>
        <div class="csp-rank" v-for="(r, index) in analogRanking" :key="`csp-rank-${r.locationId}`">
          <span class="csp-rank-index">{{ index + 1 }}</span>
          <span class="csp-rank-name">{{ r.name }}</span>
          <span class="csp-rank-bar"><span :style="{ width: `${r.similarity}%` }" /></span>
          <span class="csp-rank-value">{{ formatNumber(Math.round(r.similarity)) }} %</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import GermplasmFilterSelect from '@/components/tables/GermplasmFilterSelect'
import traitComparison, { getNumericComparable, climateAsObservation } from '@/mixins/trait-comparison'
import { apiPostClimateDataTable } from '@/mixins/api/climate'
import { loadDatasetLocations } from '@/mixins/dataset-locations'
import { formatNumber, formatDate } from '@/mixins/formatting'
import { getGradientScale } from '@/mixins/chart-palettes'
import { mean } from '@/mixins/stats-math'

// The events of the datasets loaded at once
const EVENTS_LIMIT = 10000
// The analogs joined to the reference
const ANALOGS_SHOWN = 5
// Time-lapse: milliseconds a step
const PLAY_STEP = 700
// The colours of the share of dates with values (none to all)
const SHARE_COLORS = ['#c8323f', '#f4a261', '#e9c46a', '#8ab17d', '#2a9d8f']
const VIRIDIS = ['#440154', '#472d7b', '#3b528b', '#2c728e', '#21918c', '#28ae80', '#5ec962', '#addc30', '#fde725']

// A value of the data as a number (also with a decimal comma); null when not a number
const parseNumber = value => {
  const text = `${value === null || value === undefined ? '' : value}`.trim().replace(/^(-?\d+),(\d+)$/, '$1.$2')
  return text !== '' && isFinite(text) ? +text : null
}
const toDay = value => {
  const text = `${value === null || value === undefined ? '' : value}`.trim()
  let match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text)
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`
  }
  match = /^(\d{4})(\d{2})(\d{2})$/.exec(text)
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null
}
const escapeHtml = text => `${text}`.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
// A colour between colours (t from 0 to 1)
const mix = (colors, t) => {
  const x = Math.max(0, Math.min(1, isFinite(t) ? t : 0)) * (colors.length - 1)
  const i = Math.min(Math.floor(x), colors.length - 2)
  const f = x - i
  const rgb = c => [1, 3, 5].map(k => parseInt(c.substring(k, k + 2), 16))
  const a = rgb(colors[i])
  const b = rgb(colors[i + 1])
  return `#${a.map((v, k) => Math.round(v + (b[k] - v) * f).toString(16).padStart(2, '0')).join('')}`
}

export default {
  components: {
    GermplasmFilterSelect
  },
  // The variables of the datasets, their observations (of the view), the theme and the colours (the climate data)
  mixins: [traitComparison],
  props: {
    variable: {
      type: String,
      default: 'climate'
    }
  },
  data: function () {
    return {
      // wheels, timelapse, analogs or coverage
      view: 'wheels',
      // The measurement of the wheels and the time-lapse; those of the analogs
      measureKey: null,
      analogKeys: [],
      referenceId: null,
      // Time-lapse: month or day, the step shown, playing
      step: 'month',
      frameIndex: 0,
      playing: false,
      // Coverage: the size of the circles (values or variables)
      coverageSize: 'values',
      // The locations of the datasets (their coordinates), the events (date variables)
      locations: [],
      events: []
    }
  },
  computed: {
    // The measurements with the same name and unit in the datasets (one dataset is enough: the sites are compared)
    comparable: function () {
      return getNumericComparable(this.datasets, this.traitsByDataset, 1)
    },
    measureOptions: function () {
      return this.comparable.map(o => ({ value: o.key, name: this.labelOf(o.key), count: o.datasetIds.length }))
    },
    // The analogs: the measurements that share two sites or more with those chosen (the sites of their datasets); their
    // count: those sites
    analogOptions: function () {
      const chosen = this.analogKeys.map(key => this.comparable.find(o => o.key === key)).filter(o => o)
      return this.comparable.filter(o => !this.analogKeys.includes(o.key)).map(o => {
        const shared = chosen.concat([o]).reduce((ids, c) => ids.filter(id => this.siteIdsOf(c).includes(id)), this.siteIdsOf(o))
        return { value: o.key, name: this.labelOf(o.key), count: shared.length }
      }).filter(o => o.count > 1)
    },
    measure: function () {
      return this.comparable.find(o => o.key === this.measureKey) || null
    },
    // What the view needs loaded (replaces the trait of the mixin): its key, datasets and variables
    selected: function () {
      const ids = this.datasets.map(d => d.datasetId)
      if (this.view === 'coverage') {
        const traitIds = [...new Set(Object.values(this.traitsByDataset).flatMap(list => (list || []).map(t => t.traitId)))]
        return traitIds.length > 0 ? { key: 'coverage', name: 'coverage', datasetIds: ids, traitIds } : null
      }
      if (this.view === 'analogs') {
        const chosen = this.analogKeys.map(key => this.comparable.find(o => o.key === key)).filter(o => o)
        return chosen.length > 1 ? { key: `analogs|${chosen.map(o => o.key).join('||')}`, name: 'analogs', datasetIds: ids, traitIds: [...new Set(chosen.flatMap(o => o.traitIds))] } : null
      }
      return this.measure ? { key: `measure|${this.measure.key}`, name: this.measure.name, datasetIds: this.measure.datasetIds, traitIds: this.measure.traitIds } : null
    },
    views: function () {
      return [
        { key: 'wheels', icon: 'fa-solid fa-dharmachakra', text: this.$t('pageClimateSpatialWheels'), help: this.$t('pageClimateSpatialWheelsText') },
        { key: 'timelapse', icon: 'fa-solid fa-film', text: this.$t('pageClimateSpatialTimelapse'), help: this.$t('pageClimateSpatialTimelapseText') },
        { key: 'analogs', icon: 'fa-solid fa-diagram-project', text: this.$t('pageClimateSpatialAnalogs'), help: this.$t('pageClimateSpatialAnalogsText') },
        { key: 'coverage', icon: 'fa-solid fa-table-cells', text: this.$t('pageClimateSpatialCoverage'), help: this.$t('pageClimateSpatialCoverageText') }
      ]
    },
    currentView: function () {
      return this.views.find(v => v.key === this.view) || this.views[0]
    },
    // The sites with coordinates (by id)
    sites: function () {
      const map = {}
      this.locations.filter(l => l.latitude !== null && l.latitude !== undefined && l.longitude !== null && l.longitude !== undefined)
        .forEach(l => { map[l.locationId] = l })
      return map
    },
    // The map: as soon as there are sites with coordinates
    mapShown: function () {
      return Object.keys(this.sites).length > 0
    },
    // The data of the view ready (its drawing over the sites)
    dataReady: function () {
      return !!this.selected && this.rowsState === 'loaded' && !(this.view === 'analogs' && this.analogProfiles.length < 2)
    },
    // The unit of a variable key
    unit: function () {
      return this.measure ? this.measure.unitLabel : ''
    },
    // The gradient of the server
    gradient: function () {
      const scale = getGradientScale()
      return Array.isArray(scale) ? scale.map(s => s[1]) : VIRIDIS
    },
    // Wheels: each site, the mean of each month (the mean of the month in each dataset and year, then their mean)
    wheels: function () {
      const groups = {}
      this.rows.filter(r => r.value !== null && r.day && this.sites[r.locationId]).forEach(r => {
        const key = `${r.locationId}|${r.datasetId}|${r.day.substring(0, 7)}`
        ;(groups[key] = groups[key] || []).push(r.value)
      })
      const bySite = {}
      Object.keys(groups).forEach(key => {
        const [locationId, , month] = key.split('|')
        const site = bySite[locationId] = bySite[locationId] || [...Array(12)].map(() => [])
        site[+month.substring(5, 7) - 1].push(mean(groups[key]))
      })
      return Object.keys(bySite).map(id => ({ locationId: +id, months: bySite[id].map(values => values.length > 0 ? mean(values) : null) }))
    },
    // Time-lapse: the steps (YYYY-MM or YYYY-MM-DD) with values, in order
    frames: function () {
      const width = this.step === 'month' ? 7 : 10
      return [...new Set(this.rows.filter(r => r.value !== null && r.day).map(r => r.day.substring(0, width)))].sort()
    },
    // Each step: the mean of each site
    frameMeans: function () {
      const width = this.step === 'month' ? 7 : 10
      const groups = {}
      this.rows.filter(r => r.value !== null && r.day && this.sites[r.locationId]).forEach(r => {
        const key = `${r.day.substring(0, width)}|${r.locationId}`
        ;(groups[key] = groups[key] || []).push(r.value)
      })
      const result = {}
      Object.keys(groups).forEach(key => {
        const [frame, locationId] = key.split('|')
        ;(result[frame] = result[frame] || {})[locationId] = mean(groups[key])
      })
      return result
    },
    // The range of the values of the steps (the same scale for all of them)
    frameRange: function () {
      const values = Object.values(this.frameMeans).flatMap(f => Object.values(f))
      return values.length > 0 ? { min: Math.min(...values), max: Math.max(...values) } : { min: 0, max: 1 }
    },
    // The events on the track of the player: their step
    eventMarks: function () {
      if (this.frames.length < 2) {
        return []
      }
      const width = this.step === 'month' ? 7 : 10
      const byIndex = {}
      this.events.forEach(e => {
        const index = this.frames.indexOf(e.day.substring(0, width))
        if (index >= 0) {
          (byIndex[index] = byIndex[index] || new Set()).add(e.name)
        }
      })
      return Object.keys(byIndex).map(index => ({ index: +index, position: +index / (this.frames.length - 1) * 100, names: [...byIndex[index]].join(', ') }))
    },
    // Analogs: each site with a mean of every chosen measurement, standardized (z) over the sites
    analogProfiles: function () {
      if (this.view !== 'analogs') {
        return []
      }
      const keyByTrait = {}
      this.analogKeys.forEach(key => {
        const o = this.comparable.find(c => c.key === key)
        if (o) {
          o.traitIds.forEach(id => { keyByTrait[id] = key })
        }
      })
      const groups = {}
      this.rows.filter(r => r.value !== null && this.sites[r.locationId] && keyByTrait[r.traitId]).forEach(r => {
        const site = groups[r.locationId] = groups[r.locationId] || {}
        ;(site[keyByTrait[r.traitId]] = site[keyByTrait[r.traitId]] || []).push(r.value)
      })
      const profiles = Object.keys(groups).filter(id => this.analogKeys.every(key => groups[id][key]))
        .map(id => ({ locationId: +id, name: this.siteName(+id), means: this.analogKeys.map(key => mean(groups[id][key])) }))
      // Standardized over the sites (a measurement that does not vary: left out)
      const k = this.analogKeys.length
      const stats = [...Array(k).keys()].map(j => {
        const values = profiles.map(p => p.means[j])
        const m = values.length > 0 ? mean(values) : 0
        const sd = values.length > 1 ? Math.sqrt(values.reduce((s, v) => s + (v - m) * (v - m), 0) / (values.length - 1)) : 0
        return { m, sd }
      })
      return profiles.map(p => Object.assign(p, { z: p.means.map((v, j) => stats[j].sd > 0 ? (v - stats[j].m) / stats[j].sd : 0) }))
    },
    // The other sites by their similarity to the reference (100 %: the same profile)
    analogRanking: function () {
      const ref = this.analogProfiles.find(p => p.locationId === this.referenceId)
      if (!ref) {
        return []
      }
      const scale = 2 * Math.sqrt(this.analogKeys.length)
      return this.analogProfiles.filter(p => p !== ref).map(p => {
        const distance = Math.hypot(...p.z.map((v, j) => v - ref.z[j]))
        return { locationId: p.locationId, name: p.name, distance, similarity: Math.max(0, 1 - distance / scale) * 100 }
      }).sort((a, b) => a.distance - b.distance)
    },
    referenceName: function () {
      return this.referenceId !== null ? this.siteName(this.referenceId) : ''
    },
    // Coverage: each site, its variables, values, period and share of the dates of its measurements with a value
    coverage: function () {
      const sites = {}
      const numericIds = new Set(Object.values(this.traitsByDataset).flatMap(list => (list || []).filter(t => t.dataType === 'numeric').map(t => t.traitId)))
      this.rows.filter(r => this.sites[r.locationId] && r.raw !== null && `${r.raw}`.trim() !== '').forEach(r => {
        const s = sites[r.locationId] = sites[r.locationId] || { variables: new Set(), values: 0, days: [], expected: {}, present: {} }
        s.variables.add(r.traitId)
        s.values++
        if (r.day) {
          s.days.push(r.day)
          if (numericIds.has(r.traitId)) {
            (s.expected[r.datasetId] = s.expected[r.datasetId] || new Set()).add(r.day)
            if (r.value !== null) {
              (s.present[`${r.datasetId}|${r.traitId}`] = s.present[`${r.datasetId}|${r.traitId}`] || new Set()).add(r.day)
            }
          }
        }
      })
      return Object.keys(sites).map(id => {
        const s = sites[id]
        let expected = 0
        let present = 0
        Object.keys(s.present).forEach(key => {
          const datasetId = key.split('|')[0]
          expected += (s.expected[datasetId] || new Set()).size
          present += s.present[key].size
        })
        const days = s.days.sort()
        return { locationId: +id, variables: s.variables.size, values: s.values, first: days[0] || null, last: days[days.length - 1] || null, share: expected > 0 ? present / expected : null }
      })
    },
    // The legend of the view (HTML, its texts escaped)
    legend: function () {
      const ramp = colors => `<div class="csp-ramp" style="background:linear-gradient(90deg,${colors.join(',')})"></div>`
      const row = (a, b) => `<div class="csp-ramp-row"><span>${escapeHtml(a)}</span><span>${escapeHtml(b)}</span></div>`
      if (this.view === 'wheels' && this.wheelRange) {
        return `${escapeHtml(this.$t('pageClimateSpatialWheelsLegend'))}${ramp(this.gradient)}${row(this.formatValue(this.wheelRange.min), this.formatValue(this.wheelRange.max))}<div class="csp-legend-note">${escapeHtml(this.$t('pageClimateSpatialWheelsNote'))}</div>`
      }
      if (this.view === 'timelapse' && this.frames.length > 0) {
        return `${escapeHtml(this.frames[this.frameIndex] || '')}${ramp(this.gradient)}${row(this.formatValue(this.frameRange.min), this.formatValue(this.frameRange.max))}<div class="csp-legend-note">${escapeHtml(this.$t('pageClimateSpatialTimelapseNote'))}</div>`
      }
      if (this.view === 'analogs' && this.analogRanking.length > 0) {
        return `<div><i class="fa-solid fa-star csp-star"></i> ${escapeHtml(this.$t('pageClimateSpatialReference'))}</div><div class="csp-legend-note">${escapeHtml(this.$t('pageClimateSpatialAnalogsNote', { count: ANALOGS_SHOWN }))}</div>`
      }
      if (this.view === 'coverage' && this.coverage.length > 0) {
        return `${escapeHtml(this.$t('pageClimateSpatialCoverageLegend'))}${ramp(SHARE_COLORS)}${row('0 %', '100 %')}<div class="csp-legend-note">${escapeHtml(this.coverageSize === 'values' ? this.$t('pageClimateSpatialSizeValues') : this.$t('pageClimateSpatialSizeVariables'))}</div>`
      }
      return ''
    },
    wheelRange: function () {
      const values = this.wheels.flatMap(w => w.months.filter(v => v !== null))
      return values.length > 0 ? { min: Math.min(...values), max: Math.max(...values) } : null
    }
  },
  watch: {
    // What the view needs changed: its observations loaded (the mixin: in pages)
    'selected.key': function () {
      this.stop()
      this.rows = []
      this.selectedKey = this.selected ? this.selected.key : null
      if (this.selected) {
        this.prepareRows()
      } else {
        this.rowsState = 'none'
      }
      this.$nextTick(() => this.drawMap())
    },
    view: function () {
      this.stop()
      this.$nextTick(() => this.drawMap())
    },
    rowsState: function (state) {
      if (state === 'loaded') {
        this.frameIndex = 0
      }
      this.$nextTick(() => this.drawMap())
    },
    // The reference of the analogs: the first site while none is chosen (or it is gone)
    analogProfiles: function (profiles) {
      if (!profiles.some(p => p.locationId === this.referenceId)) {
        this.referenceId = profiles.length > 0 ? profiles[0].locationId : null
      }
    },
    traitsLoading: function (loading) {
      if (!loading) {
        this.loadEvents()
      }
    },
    datasets: function () {
      this.loadLocations()
    },
    storeDarkMode: function () {
      this.setBaseLayer()
    }
  },
  methods: {
    formatNumber,
    chooseMeasure: function (key) {
      this.measureKey = key
    },
    addAnalog: function (key) {
      if (key && !this.analogKeys.includes(key)) {
        this.analogKeys = this.analogKeys.concat([key])
      }
    },
    removeAnalog: function (key) {
      this.analogKeys = this.analogKeys.filter(k => k !== key)
    },
    // A variable key: "name (unit)"
    labelOf: function (key) {
      const o = this.comparable.find(c => c.key === key)
      return o ? (o.unitLabel ? `${o.name} (${o.unitLabel})` : o.name) : key
    },
    // The sites (with coordinates) of the datasets of a measurement
    siteIdsOf: function (o) {
      return Object.values(this.sites).filter(l => l.datasetIds.some(id => o.datasetIds.includes(id))).map(l => l.locationId)
    },
    siteName: function (id) {
      const l = this.sites[id]
      return l ? (l.countryCode3 ? `${l.locationName} (${l.countryCode3})` : l.locationName) : `${id}`
    },
    // An observation: its dataset, location, variable, day and value
    toRow: function (o) {
      return { datasetId: o.datasetId, locationId: o.germplasmId, traitId: o.traitId, day: o.recordingDate || null, raw: o.traitValue, value: parseNumber(o.traitValue) }
    },
    // The draw of the mixin (colours, theme changed): the map
    draw: function () {
      this.drawMap()
    },
    loadLocations: function () {
      const ids = this.datasets.map(d => d.datasetId)
      loadDatasetLocations(ids).then(locations => {
        if (ids.join(',') === this.datasets.map(d => d.datasetId).join(',')) {
          this.locations = locations
          this.$nextTick(() => this.drawMap())
        }
      })
    },
    // The events of the datasets: their date variables (their value, else their recording date)
    loadEvents: function () {
      const ids = [...new Set(Object.values(this.traitsByDataset).flatMap(list => (list || []).filter(t => t.dataType === 'date').map(t => t.traitId)))]
      const datasetIds = this.datasets.map(d => d.datasetId)
      if (ids.length < 1 || datasetIds.length < 1) {
        this.events = []
        return
      }
      apiPostClimateDataTable({ page: 1, limit: EVENTS_LIMIT, datasetIds, filter: [{ column: 'climateId', comparator: 'inSet', operator: 'and', values: ids }] }, result => {
        this.events = ((result && result.data) || []).map(climateAsObservation).map(o => {
          const day = toDay(o.traitValue) || o.recordingDate || null
          return day ? { name: `${o.traitName}`.trim(), day, locationId: o.germplasmId, datasetId: o.datasetId } : null
        }).filter(e => e)
      }, { codes: [], callback: () => { this.events = [] } })
    },
    setStep: function (step) {
      this.stop()
      this.step = step
      this.frameIndex = 0
      this.$nextTick(() => this.drawMap())
    },
    setCoverageSize: function (size) {
      this.coverageSize = size
      this.drawMap()
    },
    togglePlay: function () {
      if (this.playing) {
        this.stop()
        return
      }
      if (this.frameIndex >= this.frames.length - 1) {
        this.frameIndex = 0
      }
      this.playing = true
      this.timer = setInterval(() => {
        if (this.frameIndex >= this.frames.length - 1) {
          this.stop()
          return
        }
        this.frameIndex++
        this.drawMap()
      }, PLAY_STEP)
    },
    stop: function () {
      this.playing = false
      clearInterval(this.timer)
    },
    // The base layer: light or dark grey with the names of the places (as the theme layer of the maps)
    setBaseLayer: function () {
      if (!this.map) {
        return
      }
      ;(this.baseLayers || []).forEach(layer => this.map.removeLayer(layer))
      const shade = this.storeDarkMode ? 'Dark' : 'Light'
      this.baseLayers = [`World_${shade}_Gray_Base`, `World_${shade}_Gray_Reference`].map(name => L.tileLayer(`//services.arcgisonline.com/arcgis/rest/services/Canvas/${name}/MapServer/tile/{z}/{y}/{x}`, {
        maxZoom: 16,
        attribution: 'Esri, HERE, Garmin, FAO, NOAA, USGS, © OpenStreetMap contributors, and the GIS User Community'
      }).addTo(this.map))
      this.baseLayers.forEach(layer => layer.bringToBack())
    },
    ensureMap: function () {
      // Its container replaced (the block built again): the map built again on the new one
      if (this.map && this.map.getContainer() !== this.$refs.map) {
        this.map.remove()
        this.map = null
        this.baseLayers = null
      }
      if (this.map || !this.$refs.map) {
        return
      }
      this.map = L.map(this.$refs.map, { scrollWheelZoom: false, zoomSnap: 0.25 }).setView([45, 10], 4)
      this.setBaseLayer()
      this.layer = L.layerGroup().addTo(this.map)
      this.fitted = null
    },
    // The map of the view drawn again (its layer emptied first); fitted to the sites when they changed
    drawMap: function () {
      if (!this.mapShown) {
        return
      }
      this.$nextTick(() => {
        this.ensureMap()
        if (!this.map) {
          return
        }
        this.map.invalidateSize()
        this.layer.clearLayers()
        const ids = Object.keys(this.sites).sort().join(',')
        if (ids && this.fitted !== ids) {
          this.map.fitBounds(Object.values(this.sites).map(l => [l.latitude, l.longitude]), { padding: [40, 40], maxZoom: 9 })
          this.fitted = ids
        }
        if (!this.dataReady) {
          this.drawSites()
        } else if (this.view === 'wheels') {
          this.drawWheels()
        } else if (this.view === 'timelapse') {
          this.drawFrame()
        } else if (this.view === 'analogs') {
          this.drawAnalogs()
        } else {
          this.drawCoverage()
        }
      })
    },
    // The sites only (grey), while the data of the view is not ready
    drawSites: function () {
      Object.keys(this.sites).forEach(id => {
        const site = this.sites[id]
        L.circleMarker([site.latitude, site.longitude], { radius: 6, color: '#6b6f6c', weight: 1, fillColor: '#d0d3cf', fillOpacity: 0.9 })
          .bindTooltip(this.tooltip([this.siteName(+id)]))
          .addTo(this.layer)
      })
    },
    tooltip: function (lines) {
      return lines.filter(l => l !== null && l !== undefined && l !== '').map((l, i) => i === 0 ? `<b>${escapeHtml(l)}</b>` : escapeHtml(l)).join('<br>')
    },
    // A wheel per site: 12 slices (January at the top, clockwise), each the colour of its mean (none: grey)
    drawWheels: function () {
      const range = this.wheelRange
      if (!range) {
        return
      }
      const months = [...Array(12).keys()].map(m => new Date(Date.UTC(2000, m, 15)).toLocaleDateString(this.locale, { month: 'short', timeZone: 'UTC' }))
      const unit = this.unit ? ` ${this.unit}` : ''
      this.wheels.forEach(w => {
        const site = this.sites[w.locationId]
        const R = 24
        const r = 9
        const c = 28
        const pt = (radius, a) => `${(c + radius * Math.cos(a)).toFixed(2)},${(c + radius * Math.sin(a)).toFixed(2)}`
        const slices = w.months.map((v, m) => {
          const a0 = (m / 12) * 2 * Math.PI - Math.PI / 2
          const a1 = ((m + 1) / 12) * 2 * Math.PI - Math.PI / 2
          const color = v === null ? '#d0d3cf' : mix(this.gradient, (v - range.min) / ((range.max - range.min) || 1))
          return `<path d="M${pt(r, a0)} L${pt(R, a0)} A${R},${R} 0 0 1 ${pt(R, a1)} L${pt(r, a1)} A${r},${r} 0 0 0 ${pt(r, a0)} Z" fill="${color}" stroke="#fff" stroke-width="0.8"><title>${escapeHtml(months[m])}: ${v === null ? '–' : escapeHtml(this.formatValue(v) + unit)}</title></path>`
        }).join('')
        const html = `<svg width="56" height="56" viewBox="0 0 56 56"><circle cx="${c}" cy="${c}" r="27" fill="#fff" opacity=".85"/>${slices}<circle cx="${c}" cy="${c}" r="${r - 1}" fill="#fff"/><line x1="${c}" y1="2" x2="${c}" y2="7" stroke="#1f2120" stroke-width="1.5"/></svg>`
        L.marker([site.latitude, site.longitude], { icon: L.divIcon({ className: 'csp-glyph', html, iconSize: [56, 56], iconAnchor: [28, 28] }) })
          .bindTooltip(this.tooltip([this.siteName(w.locationId)]), { direction: 'top', offset: [0, -26] })
          .addTo(this.layer)
      })
    },
    // A step: each site coloured and sized by its mean of the step, a dashed ring the step before; its events
    drawFrame: function () {
      const frame = this.frames[this.frameIndex]
      if (!frame) {
        return
      }
      const now = this.frameMeans[frame] || {}
      const before = this.frameIndex > 0 ? (this.frameMeans[this.frames[this.frameIndex - 1]] || {}) : {}
      const range = this.frameRange
      const t = v => (v - range.min) / ((range.max - range.min) || 1)
      const unit = this.unit ? ` ${this.unit}` : ''
      Object.keys(this.sites).forEach(id => {
        const site = this.sites[id]
        if (before[id] !== undefined) {
          L.circleMarker([site.latitude, site.longitude], { radius: 7 + 14 * t(before[id]), color: '#1f2120', weight: 1, dashArray: '2 3', fill: false, opacity: 0.5, interactive: false }).addTo(this.layer)
        }
        if (now[id] !== undefined) {
          L.circleMarker([site.latitude, site.longitude], { radius: 7 + 14 * t(now[id]), color: '#1f2120', weight: 1, fillColor: mix(this.gradient, t(now[id])), fillOpacity: 0.85 })
            .bindTooltip(this.tooltip([this.siteName(+id), `${frame}: ${this.formatValue(now[id])}${unit}`]))
            .addTo(this.layer)
        } else {
          L.circleMarker([site.latitude, site.longitude], { radius: 4, color: '#9a9d99', weight: 1, fillColor: '#d0d3cf', fillOpacity: 0.8 })
            .bindTooltip(this.tooltip([this.siteName(+id), `${frame}: –`]))
            .addTo(this.layer)
        }
      })
      // The events of the step, at their place
      const width = this.step === 'month' ? 7 : 10
      const byPlace = {}
      this.events.filter(e => e.day.substring(0, width) === frame && this.sites[e.locationId]).forEach(e => {
        (byPlace[e.locationId] = byPlace[e.locationId] || []).push(`${e.name} · ${formatDate(e.day)}`)
      })
      Object.keys(byPlace).forEach(id => {
        const site = this.sites[id]
        L.marker([site.latitude, site.longitude], { icon: L.divIcon({ className: 'csp-glyph', html: '<div class="csp-burst"><i class="fa-solid fa-diamond"></i></div>', iconSize: [26, 26], iconAnchor: [-6, 30] }) })
          .bindTooltip(this.tooltip([this.siteName(+id)].concat(byPlace[id])), { permanent: true, direction: 'right', className: 'csp-event-tip' })
          .addTo(this.layer)
      })
    },
    // The reference (a star), the most similar sites joined to it (thicker when more similar), the others grey; a click
    // on a site makes it the reference
    drawAnalogs: function () {
      const ref = this.analogProfiles.find(p => p.locationId === this.referenceId)
      if (!ref) {
        return
      }
      const refSite = this.sites[ref.locationId]
      const shown = new Set(this.analogRanking.slice(0, ANALOGS_SHOWN).map(r => r.locationId))
      this.analogRanking.slice(0, ANALOGS_SHOWN).forEach(r => {
        const site = this.sites[r.locationId]
        const s = r.similarity / 100
        L.polyline([[refSite.latitude, refSite.longitude], [site.latitude, site.longitude]], { color: '#00748C', weight: 1.5 + 7 * s, opacity: 0.25 + 0.6 * s, interactive: false }).addTo(this.layer)
        L.marker([(refSite.latitude + site.latitude) / 2, (refSite.longitude + site.longitude) / 2], { icon: L.divIcon({ className: 'csp-glyph', html: `<span class="csp-sim">${formatNumber(Math.round(r.similarity))} %</span>`, iconSize: [44, 16], iconAnchor: [22, 8] }), interactive: false }).addTo(this.layer)
      })
      this.analogProfiles.forEach(p => {
        const site = this.sites[p.locationId]
        if (p.locationId === ref.locationId) {
          L.marker([site.latitude, site.longitude], { icon: L.divIcon({ className: 'csp-glyph', html: '<i class="fa-solid fa-star csp-star csp-star-map"></i>', iconSize: [24, 24], iconAnchor: [12, 12] }) })
            .bindTooltip(this.tooltip([this.siteName(p.locationId), this.$t('pageClimateSpatialReference')]))
            .addTo(this.layer)
          return
        }
        const r = this.analogRanking.find(a => a.locationId === p.locationId)
        L.circleMarker([site.latitude, site.longitude], { radius: 7, color: '#1f2120', weight: 1, fillColor: shown.has(p.locationId) ? '#00748C' : '#d0d3cf', fillOpacity: 0.9 })
          .bindTooltip(this.tooltip([this.siteName(p.locationId), r ? `${formatNumber(Math.round(r.similarity))} %` : '']))
          .on('click', () => { this.referenceId = p.locationId; this.drawMap() })
          .addTo(this.layer)
      })
    },
    // A circle per site: its size the values (or variables), its colour the share of the dates with a value
    drawCoverage: function () {
      const list = this.coverage
      const sizeOf = c => this.coverageSize === 'values' ? c.values : c.variables
      const max = Math.max(1, ...list.map(sizeOf))
      list.forEach(c => {
        const site = this.sites[c.locationId]
        L.circleMarker([site.latitude, site.longitude], { radius: 5 + 16 * Math.sqrt(sizeOf(c) / max), color: '#1f2120', weight: 1, fillColor: c.share === null ? '#d0d3cf' : mix(SHARE_COLORS, c.share), fillOpacity: 0.85 })
          .bindTooltip(this.tooltip([
            this.siteName(c.locationId),
            this.$t('pageClimateSpatialCoverageTip', { variables: formatNumber(c.variables), values: formatNumber(c.values) }),
            c.first ? `${formatDate(c.first)} – ${formatDate(c.last)}` : '',
            c.share === null ? '' : this.$t('pageClimateSpatialCoverageShare', { share: formatNumber(Math.round(c.share * 100)) })
          ]))
          .addTo(this.layer)
      })
    },
    getFileName: function () {
      return `climate-spatial-${this.view}`
    }
  },
  mounted: function () {
    this.loadLocations()
  },
  beforeDestroy: function () {
    this.stop()
    if (this.map) {
      this.map.remove()
    }
  }
}
</script>

<style src="@/assets/trait-stats.css"></style>
<style scoped src="@/assets/variable-stats.css"></style>
<style scoped src="@/assets/trait-comparison.css"></style>
<style scoped>
.csp-head-icon {
  color: var(--stc-type-color);
  font-size: 1.3rem;
}
.csp-body {
  padding-bottom: 1rem;
}
.csp-views {
  padding-top: 1rem;
}
/* Analogs: the chosen measurements */
.csp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0 1.25rem 1rem;
}
.csp-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  height: 1.75rem;
  padding: 0 0.35rem 0 0.65rem;
  border: 1px solid var(--cp-border);
  border-radius: 999px;
  background: var(--cp-neutral-bg);
  font-size: 0.8rem;
}
.csp-chip-remove {
  width: 1.2rem;
  height: 1.2rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--cp-muted);
  font-size: 0.7rem;
}
.csp-chip-remove:hover {
  background: var(--cp-border);
  color: var(--cp-text);
}
/* The options of a view */
.csp-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.csp-option-label {
  color: var(--cp-muted);
  font-size: 0.8rem;
}
.csp-option {
  padding: 0.2rem 0.65rem;
  border: 1px solid var(--cp-border);
  border-radius: 999px;
  background: transparent;
  color: var(--cp-muted);
  font-size: 0.8rem;
}
.csp-option.active {
  border-color: var(--cp-green);
  background: var(--cp-surface);
  color: var(--cp-text);
}
.csp-select {
  height: 30px;
  padding: 0 0.5rem;
  border: 1px solid var(--cp-border);
  border-radius: 8px;
  background: var(--cp-surface);
  color: var(--cp-text);
  font-size: 0.82rem;
}
/* The map and its legend */
.csp-map-wrap {
  position: relative;
  margin: 0 1.25rem;
  border: 1px solid var(--cp-border);
  border-radius: 12px;
  overflow: hidden;
}
.csp-map {
  height: 520px;
}
.csp-legend {
  position: absolute;
  z-index: 500;
  right: 10px;
  bottom: 22px;
  padding: 8px 10px;
  border: 1px solid var(--cp-border);
  border-radius: 10px;
  background: var(--cp-surface);
  color: var(--cp-text);
  font-size: 0.74rem;
  opacity: 0.95;
}
.csp-legend >>> .csp-ramp {
  width: 170px;
  height: 10px;
  margin: 4px 0 2px;
  border-radius: 5px;
}
.csp-legend >>> .csp-ramp-row {
  display: flex;
  justify-content: space-between;
  color: var(--cp-muted);
}
.csp-legend >>> .csp-legend-note {
  margin-top: 4px;
  color: var(--cp-muted);
}
/* The state of the data over the map (what to choose, loading, confirmation) */
.csp-state {
  position: absolute;
  z-index: 500;
  top: 12px;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  max-width: calc(100% - 2rem);
  padding: 0.5rem 0.9rem;
  border: 1px solid var(--cp-border);
  border-radius: 10px;
  background: var(--cp-surface);
  box-shadow: 0 2px 6px var(--cp-shadow);
  color: var(--cp-text);
  font-size: 0.85rem;
  transform: translateX(-50%);
}
.csp-state .fa-solid {
  margin-right: 0.3rem;
  color: var(--cp-green);
}
/* Time-lapse: the player */
.csp-player {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.75rem 1.25rem 0;
  font-size: 0.8rem;
}
.csp-play {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: var(--cp-green);
  color: #fff;
}
.csp-player-end {
  color: var(--cp-muted);
  font-variant-numeric: tabular-nums;
}
.csp-player-now {
  min-width: 6rem;
  font-weight: 600;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.csp-track {
  position: relative;
  flex: 1 1 auto;
}
.csp-track input {
  width: 100%;
  accent-color: var(--cp-green);
}
.csp-track-event {
  position: absolute;
  top: -12px;
  transform: translateX(-50%);
  color: #c8323f;
  font-size: 0.6rem;
}
/* Analogs: the ranking */
.csp-ranking {
  margin: 1rem 1.25rem 0;
}
.csp-rank {
  display: grid;
  grid-template-columns: 1.5rem minmax(10rem, 18rem) 1fr 3.5rem;
  align-items: center;
  gap: 0.75rem;
  padding: 0.3rem 0;
  border-top: 1px solid var(--cp-border);
  font-size: 0.85rem;
}
.csp-rank-index {
  color: var(--cp-muted);
  text-align: right;
}
.csp-rank-bar {
  height: 8px;
  border-radius: 4px;
  background: var(--cp-neutral-bg);
  overflow: hidden;
}
.csp-rank-bar span {
  display: block;
  height: 100%;
  background: #00748C;
}
.csp-rank-value {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>

<style>
/* The glyphs drawn on the map (outside the scope of the component: Leaflet builds them) */
.csp-glyph {
  border: 0;
  background: none;
}
.csp-burst {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 2px solid #c8323f;
  border-radius: 50%;
  background: #fff;
  color: #c8323f;
  font-size: 11px;
  box-shadow: 0 0 0 6px rgba(200, 50, 63, 0.18);
}
.csp-sim {
  padding: 0 4px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.92);
  color: #00748C;
  font-size: 10px;
  font-weight: 700;
}
.csp-star {
  color: #FF9E15;
}
.csp-star-map {
  font-size: 22px;
  text-shadow: 0 0 3px #fff;
}
.csp-event-tip {
  font-size: 11px;
}
</style>
