<template>
  <!-- The climate type of a climate variable, by its data type (see climate-types.js): a chip with its icon (an SVG path
       or a Font Awesome icon) and its name, in its colour -->
  <span class="bt-chip" :style="{ '--bt-chip-color': type.color() || 'currentColor' }" v-if="type">
    <MdiIcon :path="type.path" v-if="type.path" /><i :class="[type.icon, 'climate-type-icon']" aria-hidden="true" v-else /> {{ $t(type.text) }}
  </span>
</template>

<script>
import MdiIcon from '@/components/icons/MdiIcon'
import { getClimateType } from '@/mixins/climate-types'

export default {
  components: {
    MdiIcon
  },
  props: {
    dataType: {
      type: String,
      default: null
    }
  },
  computed: {
    type: function () {
      return getClimateType(this.dataType)
    }
  }
}
</script>

<style scoped>
/* The Font Awesome icon: as the SVG icons of the chips (their size, the colour of the chip) */
.climate-type-icon {
  width: 0.95rem;
  color: var(--bt-chip-color);
  font-size: 0.85rem;
  text-align: center;
}
</style>
