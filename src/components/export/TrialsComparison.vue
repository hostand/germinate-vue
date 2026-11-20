<template>
  <!-- The Comparison tab of the trials export: the kinds of comparison (as the views of the statistics of a trait), then
       the one chosen. Single trait: one numeric trait across the chosen datasets; categorical: one categorical trait; multi-trait: several
       numeric traits; accessions: the germplasm grown in several of the datasets; temporal: a trait over time (its date trait).
       The climate export: its comparisons by dataset or by location (on the left of the views, glued to them, in grey;
       its label outside). Location clicked: the field of the
       locations not chosen yet stretches out between them and the views (the common list, opened by its chevron,
       several chosen one after the other; no counts), folded back when a click lands outside it or when none is left
       (none left: it does not open); the chosen ones are chips in the block of the comparison (their cross gives them
       back to the list; more than two: all cleared at once; two or more compared). None chosen at first. -->
  <div class="tds tcmp">
    <div class="tcmp-bar">
      <!-- The climate data: compared by dataset or by location -->
      <span class="tcmp-by-label" v-if="variable === 'climate'">{{ $t('pageComparisonCompareBy') }}</span>
      <div class="tcmp-by" role="radiogroup" :aria-label="$t('pageComparisonCompareBy')" v-if="variable === 'climate'">
        <button type="button"
                role="radio"
                :aria-checked="compareBy === option.key ? 'true' : 'false'"
                :class="['tcmp-by-option', { active: compareBy === option.key }]"
                v-for="option in compareOptions"
                :key="`tcmp-by-${option.key}`"
                @click="setCompareBy(option.key)">
          <i :class="['fa-solid', option.icon]" aria-hidden="true" /> {{ option.text }}
        </button>
      </div>
      <!-- By location: the list of the locations, stretched out while it has the focus -->
      <div :class="['tcmp-locations', { open: locationListOpen }]"
           ref="locationList"
           v-if="variable === 'climate'">
        <GermplasmFilterSelect id="tcmp-location-list"
                               ref="locationSelect"
                               :options="locationOptions"
                               :value="null"
                               :placeholder="$t('pageComparisonClimateChooseLocations')"
                               :loading="locationsLoading"
                               :showCount="false"
                               multiple
                               @select="toggleLocation" />
      </div>
      <div class="tds-views" role="tablist">
        <button type="button"
                :class="['tds-view', { active: view === option.key }]"
                role="tab"
                :aria-selected="view === option.key ? 'true' : 'false'"
                v-for="option in views"
                :key="`tcmp-view-${option.key}`"
                @click="showView(option.key)">
          <MdiIcon :path="option.path" className="tcmp-view-icon" v-if="option.path" />
          <i :class="['fa-solid', option.icon]" aria-hidden="true" v-else /> {{ option.text }}
        </button>
      </div>
    </div>
    <!-- Each view kept once shown (its trait and charts stay when another view is shown and back); all gone with other
         datasets (the tab built again) or when leaving the page -->
    <SingleTraitComparison :datasets="datasets" :variable="variable" :compareBy="compareBy" :locationIds="comparedLocationIds" :chosenLocations="chosenLocations" @remove-location="toggleLocation" @clear-locations="clearLocations" v-show="view === 'single'" v-if="visited.includes('single')" />
    <CategoricalComparison :datasets="datasets" v-show="view === 'categorical'" v-if="visited.includes('categorical')" />
    <MultiTraitComparison :datasets="datasets" :variable="variable" :compareBy="compareBy" :locationIds="comparedLocationIds" :chosenLocations="chosenLocations" @remove-location="toggleLocation" @clear-locations="clearLocations" v-show="view === 'multi'" v-if="visited.includes('multi')" />
    <AccessionComparison :datasets="datasets" v-show="view === 'accessions'" v-if="visited.includes('accessions')" />
    <TemporalComparison :datasets="datasets" v-show="view === 'temporal'" v-if="visited.includes('temporal') && variable !== 'climate'" />
    <!-- The climate data: its own temporal comparison (the date of each value, the events of its date variables) -->
    <ClimateTemporalComparison :datasets="datasets" :compareBy="compareBy" :locationIds="comparedLocationIds" :chosenLocations="chosenLocations" @remove-location="toggleLocation" @clear-locations="clearLocations" v-show="view === 'temporal'" v-if="visited.includes('temporal') && variable === 'climate'" />
  </div>
</template>

<script>
import MdiIcon from '@/components/icons/MdiIcon'
import GermplasmFilterSelect from '@/components/tables/GermplasmFilterSelect'
import SingleTraitComparison from '@/components/export/SingleTraitComparison'
import CategoricalComparison from '@/components/export/CategoricalComparison'
import MultiTraitComparison from '@/components/export/MultiTraitComparison'
import AccessionComparison from '@/components/export/AccessionComparison'
import TemporalComparison from '@/components/export/TemporalComparison'
import ClimateTemporalComparison from '@/components/export/ClimateTemporalComparison'
import { loadDatasetLocations } from '@/mixins/dataset-locations'
import { datasetTypes } from '@/mixins/types'
import { mdiShovel, mdiShapeSquarePlus } from '@mdi/js'

export default {
  components: {
    MdiIcon,
    GermplasmFilterSelect,
    SingleTraitComparison,
    CategoricalComparison,
    MultiTraitComparison,
    AccessionComparison,
    TemporalComparison,
    ClimateTemporalComparison
  },
  props: {
    // The chosen datasets: { datasetId, datasetName }
    datasets: {
      type: Array,
      default: () => []
    },
    // trait (the trials export) or climate (the climate export: its comparisons of the climate data)
    variable: {
      type: String,
      default: 'trait'
    }
  },
  data: function () {
    return {
      view: 'single',
      // The views shown so far (kept)
      visited: ['single'],
      // The climate data: compared by dataset or by location
      compareBy: 'dataset',
      // The locations of the chosen datasets, those chosen to compare (by location)
      locations: [],
      locationsLoading: false,
      chosenLocationIds: [],
      // The list of the locations stretched out (Location clicked, until it loses the focus)
      locationListOpen: false
    }
  },
  methods: {
    // Another view: built the first time, else shown as it was left (its charts fitted to the width again)
    showView: function (key) {
      this.view = key
      if (!this.visited.includes(key)) {
        this.visited.push(key)
      }
      this.$nextTick(() => window.dispatchEvent(new Event('resize')))
    },
    // Location clicked (also again): the field of the locations stretched out (its list opened by its chevron); none
    // left to choose: nothing
    setCompareBy: function (key) {
      this.compareBy = key
      this.locationListOpen = key === 'location' && this.locationOptions.length > 0
      this.$nextTick(() => window.dispatchEvent(new Event('resize')))
    },
    // A click outside the field of the locations (and outside the way of comparing): folded back
    onDocumentMouseDown: function (event) {
      if (!this.locationListOpen) {
        return
      }
      const list = this.$refs.locationList
      const by = this.$el.querySelector('.tcmp-by')
      if (list && !list.contains(event.target) && !(by && by.contains(event.target))) {
        this.locationListOpen = false
      }
    },
    // The chips all cleared: every location back in the list
    clearLocations: function () {
      this.chosenLocationIds = []
    },
    // A location chosen (from the list) or given back (its chip); none left in the list: folded back
    toggleLocation: function (id) {
      this.chosenLocationIds = this.chosenLocationIds.includes(id) ? this.chosenLocationIds.filter(l => l !== id) : this.locations.map(l => l.locationId).filter(l => l === id || this.chosenLocationIds.includes(l))
      if (this.locationOptions.length < 1) {
        this.locationListOpen = false
      }
    },
    // The locations of the chosen datasets (none chosen at first); compared by location at first when the datasets share
    // none (by dataset their differences would mix place and period)
    loadLocations: function () {
      if (this.variable !== 'climate') {
        return
      }
      this.locationsLoading = true
      const ids = this.datasets.map(d => d.datasetId)
      loadDatasetLocations(ids).then(locations => {
        if (ids.join(',') !== this.datasets.map(d => d.datasetId).join(',')) {
          return
        }
        this.locations = locations
        this.chosenLocationIds = []
        this.locationsLoading = false
        this.compareBy = locations.some(l => l.datasetIds.length > 1) ? 'dataset' : 'location'
      })
    }
  },
  computed: {
    // The options of the list: the locations not chosen yet (the chosen ones are chips), their flag, name, country code
    locationOptions: function () {
      return this.locations.filter(l => !this.chosenLocationIds.includes(l.locationId))
        .map(l => ({ value: l.locationId, name: l.locationName, flag: l.countryCode2 ? l.countryCode2.toLowerCase() : null, suffix: l.countryCode3 || null }))
    },
    // The chosen locations (their chips), in the order of the list
    chosenLocations: function () {
      return this.locations.filter(l => this.chosenLocationIds.includes(l.locationId))
    },
    // The locations compared (by location): two or more chosen, else none
    comparedLocationIds: function () {
      return this.chosenLocationIds.length > 1 ? this.chosenLocationIds : []
    },
    compareOptions: function () {
      return [
        { key: 'dataset', icon: 'fa-database', text: this.$t('pageComparisonCompareByDataset') },
        { key: 'location', icon: 'fa-location-dot', text: this.$t('pageComparisonCompareByLocation') }
      ]
    },
    views: function () {
      // The climate data: its comparisons (by dataset or by location)
      if (this.variable === 'climate') {
        return [
          { key: 'single', path: datasetTypes.climate.path, text: this.$t('pageComparisonClimateSingle') },
          { key: 'multi', path: mdiShapeSquarePlus, text: this.$t('pageComparisonClimateMulti') },
          { key: 'temporal', icon: 'fa-hourglass-half', text: this.$t('pageComparisonClimateTemporal') }
        ]
      }
      return [{
        key: 'single',
        path: mdiShovel,
        text: this.$t('pageComparisonSingleTrait')
      }, {
        key: 'multi',
        path: mdiShapeSquarePlus,
        text: this.$t('pageComparisonMultiTrait')
      }, {
        key: 'categorical',
        icon: 'fa-list',
        text: this.$t('pageComparisonCategorical')
      }, {
        key: 'accessions',
        icon: 'fa-seedling',
        text: this.$t('pageComparisonAccessions')
      }, {
        key: 'temporal',
        icon: 'fa-hourglass-half',
        text: this.$t('pageComparisonTemporal')
      }]
    }
  },
  watch: {
    datasets: function () {
      this.loadLocations()
    }
  },
  mounted: function () {
    this.loadLocations()
    document.addEventListener('mousedown', this.onDocumentMouseDown)
  },
  beforeDestroy: function () {
    document.removeEventListener('mousedown', this.onDocumentMouseDown)
  }
}
</script>

<style src="@/assets/trait-stats.css"></style>
<style scoped>
.tcmp >>> .tcmp-view-icon {
  width: 1.05em;
  height: 1.05em;
  fill: currentColor;
}
/* The way of comparing (the climate data), its label outside on its left, then the views glued to it */
.tcmp-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
}
.tcmp-bar .tds-views {
  align-self: stretch;
  margin: 0;
}
.tcmp-by + .tds-views {
  margin-left: -1px;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
.tcmp-by-label {
  margin-right: 0.6rem;
  color: var(--cp-muted);
  font-family: 'DM Sans', -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
/* The way of comparing: a grey toggle (darker than the views) */
.tcmp-by {
  display: flex;
  align-self: stretch;
  align-items: center;
  gap: 0.2rem;
  padding: 0.25rem;
  border: 1px solid var(--cp-border);
  border-radius: 10px 0 0 10px;
  background: color-mix(in srgb, var(--cp-text) 9%, var(--cp-neutral-bg));
}
.tcmp-by-option {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--cp-text-subtle);
  font-family: 'DM Sans', -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
}
.tcmp-by-option:hover,
.tcmp-by-option:focus-visible {
  color: var(--cp-text);
  outline: none;
}
.tcmp-by-option.active {
  background: var(--cp-surface);
  color: var(--cp-text);
  box-shadow: 0 1px 3px var(--cp-shadow);
}
.tcmp-by-option.active .fa-solid {
  color: var(--cp-green);
}
/* By location: the list of the locations between the way of comparing and the views, glued to both; stretched out
   (animated) while open */
.tcmp-locations {
  display: flex;
  align-self: stretch;
  align-items: center;
  width: 0;
  overflow: hidden;
  border-top: 1px solid var(--cp-border);
  border-bottom: 1px solid var(--cp-border);
  background: var(--cp-surface);
  transition: width 0.3s ease;
}
.tcmp-locations.open {
  width: 21rem;
  overflow: visible;
}
.tcmp-locations >>> .germplasm-filter-select {
  flex: 0 0 21rem;
  width: 21rem;
}
.tcmp-locations >>> .form-control {
  height: 100%;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 0.88rem;
}
.tcmp-locations >>> .germplasm-filter-placeholder {
  font-size: 0.85rem;
}
.tcmp-locations + .tds-views {
  margin-left: -1px;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
</style>
