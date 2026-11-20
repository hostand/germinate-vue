<template>
  <!-- The locations compared (the climate data compared by location), under the head of a comparison: chips on a line
       (a cross each gives it back to the list; more than two: all cleared at once; more than a line: a chevron shows them
       all). A chip clicked (not its cross): the map of its location below them (the whole width, low; no details popup),
       again: hidden. -->
  <div class="clc" v-if="locations.length > 0">
    <div :class="['clc-chips-row', { expanded }]">
      <button type="button" class="clc-clear" @click="$emit('clear-locations')" v-if="locations.length > 2">
        <i class="fa-solid fa-xmark" aria-hidden="true" /> {{ $t('pageComparisonClimateClearLocations') }}
      </button>
      <div class="clc-chips" ref="chips">
        <span :class="['clc-chip', { active: mapLocationId === l.locationId, 'has-map': hasMap(l) }]"
              v-for="l in locations"
              :key="`clc-${l.locationId}`"
              :role="hasMap(l) ? 'button' : null"
              :tabindex="hasMap(l) ? 0 : null"
              :aria-expanded="hasMap(l) ? (mapLocationId === l.locationId ? 'true' : 'false') : null"
              @click="toggleMap(l)"
              @keydown.enter.self.prevent="toggleMap(l)">
          <i :class="`fi fi-${l.countryCode2.toLowerCase()}`" v-if="l.countryCode2" /> {{ l.locationName }}<span class="clc-code" v-if="l.countryCode3"> ({{ l.countryCode3 }})</span>
          <button type="button" class="clc-remove" :title="$t('genericRemove')" :aria-label="$t('genericRemove')" @click.stop="$emit('remove-location', l.locationId)"><i class="fa-solid fa-xmark" aria-hidden="true" /></button>
        </span>
      </div>
      <button type="button" class="clc-more" :aria-expanded="expanded ? 'true' : 'false'" :aria-label="$t('buttonReadMore')" @click="expanded = !expanded" v-if="overflow || expanded">
        <i class="fa-solid fa-chevron-down" aria-hidden="true" />
      </button>
    </div>
    <div class="clc-map" v-if="mapLocation">
      <LocationMap :locations="[mapLocation.row]" :showLinks="false" :popups="false" baseLayer="osm" border="" customLook :key="`clc-map-${mapLocation.locationId}`" />
    </div>
  </div>
</template>

<script>
import LocationMap from '@/components/map/LocationMap'

export default {
  components: {
    LocationMap
  },
  props: {
    // The chosen locations: { locationId, locationName, countryCode2, countryCode3, row (of the locations table) }
    locations: {
      type: Array,
      default: () => []
    }
  },
  data: function () {
    return {
      // More than a line (folded), shown all
      overflow: false,
      expanded: false,
      // The location whose map is shown
      mapLocationId: null
    }
  },
  computed: {
    mapLocation: function () {
      const l = this.locations.find(o => o.locationId === this.mapLocationId)
      return l && this.hasMap(l) ? l : null
    }
  },
  watch: {
    locations: function () {
      this.$nextTick(() => this.measure())
    }
  },
  methods: {
    // A location with its coordinates (its map can be shown)
    hasMap: function (l) {
      return !!l.row && l.row.locationLatitude !== null && l.row.locationLatitude !== undefined && l.row.locationLongitude !== null && l.row.locationLongitude !== undefined
    },
    toggleMap: function (l) {
      if (this.hasMap(l)) {
        this.mapLocationId = this.mapLocationId === l.locationId ? null : l.locationId
      }
    },
    // More than their line (when folded)
    measure: function () {
      const chips = this.$refs.chips
      if (chips && !this.expanded) {
        this.overflow = chips.scrollHeight > chips.clientHeight + 2
      }
    }
  },
  mounted: function () {
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.measure())
      this.observer.observe(this.$el)
    }
    this.$nextTick(() => this.measure())
  },
  beforeDestroy: function () {
    if (this.observer) {
      this.observer.disconnect()
    }
  }
}
</script>

<style scoped>
.clc-chips-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid var(--cp-border);
}
.clc-clear {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.35rem;
  height: 1.75rem;
  padding: 0 0.7rem;
  border: 1px solid var(--cp-border);
  border-radius: 999px;
  background: var(--cp-surface);
  color: var(--cp-muted);
  font-size: 0.78rem;
  white-space: nowrap;
}
.clc-clear:hover {
  border-color: #c8323f;
  color: #c8323f;
}
.clc-chips {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  gap: 0.4rem;
  min-width: 0;
  max-height: 1.9rem;
  overflow: hidden;
}
.clc-chips-row.expanded .clc-chips {
  max-height: none;
}
.clc-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  height: 1.75rem;
  padding: 0 0.35rem 0 0.65rem;
  border: 1px solid var(--cp-border);
  border-radius: 999px;
  background: var(--cp-neutral-bg);
  color: var(--cp-text);
  font-size: 0.8rem;
  white-space: nowrap;
}
/* A chip with a map: clickable; the one whose map is shown */
.clc-chip.has-map {
  cursor: pointer;
}
.clc-chip.has-map:hover {
  border-color: var(--cp-muted);
}
.clc-chip.active {
  border-color: var(--cp-green);
  background: var(--cp-surface);
  box-shadow: 0 1px 3px var(--cp-shadow);
}
.clc-code {
  color: var(--cp-muted);
  font-size: 0.72rem;
}
.clc-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.2rem;
  height: 1.2rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--cp-muted);
  font-size: 0.7rem;
}
.clc-remove:hover {
  background: var(--cp-border);
  color: var(--cp-text);
}
.clc-more {
  flex: 0 0 auto;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--cp-muted);
}
.clc-more:hover {
  background: var(--cp-neutral-bg);
  color: var(--cp-text);
}
.clc-more .fa-solid {
  transition: transform 0.2s;
}
.clc-chips-row.expanded .clc-more .fa-solid {
  transform: rotate(180deg);
}
/* The map: under the chips, the whole width of the block, low */
.clc-map {
  border-top: 1px solid var(--cp-border);
}
.clc-map >>> .location-map {
  height: 280px !important;
}
</style>
