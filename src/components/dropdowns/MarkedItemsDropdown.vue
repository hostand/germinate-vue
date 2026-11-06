<template>
  <!-- Marked items (germplasm, markers, locations) in the top navigation: how many of each, their page and a way to clear
       them (what the badges at the top of each page used to do) -->
  <b-nav-item-dropdown right class="marked-items-dropdown" menu-class="top-nav-menu marked-items-menu" aria-label="Marked items" v-b-tooltip.hover.bottom="'Marked items'" ref="dropdown" @shown="menuOpen = true" @hidden="menuOpen = false">
    <template #button-content>
      <!-- Something was just marked: the pin is stuck in (it tilts to the side) in green for a moment. Only the icon moves:
           its box keeps its size, so the bar doesn't change. -->
      <span :class="['marked-items-pin', { 'marked-items-pinning': alerting }]">
        <i class="fa-solid fa-thumbtack top-nav-fa-icon" aria-hidden="true" />
        <!-- All the marked items (any type), at the top left of the pin; not while it moves, nor when nothing is marked,
             nor while the menu is open (it shows them) -->
        <span class="marked-items-total" v-if="totalMarked > 0 && !alerting && !menuOpen" :title="totalMarked.toLocaleString()">{{ getNumberWithSuffix(totalMarked, 1) }}</span>
      </span>
    </template>

    <div class="top-nav-menu-title">Marked items</div>
    <div class="marked-items-list">
      <!-- The whole row opens the page of the marked items of the type; only the broom clears them (after "Confirm?") -->
      <div class="top-nav-menu-row marked-items-entry" v-for="itemType in Object.keys(markedItemTypes)" :key="'marked-items-' + itemType">
      <!-- Nothing marked of the type: disabled -->
      <div :class="['marked-items-row', { disabled: getCount(itemType) === 0 }]"
           role="link"
           :tabindex="getCount(itemType) === 0 ? -1 : 0"
           :aria-disabled="getCount(itemType) === 0 ? 'true' : null"
           :title="`${markedItemTypes[itemType].text()}: ${getCount(itemType).toLocaleString()}`"
           @click="openMarkedItems(itemType)"
           @keydown.enter="openMarkedItems(itemType)">
        <!-- The icon of the type, in a pastel version of its colour -->
        <span class="marked-items-icon" :style="getIconStyle(itemType)"><i :class="['fa-solid', faIcons[itemType]]" aria-hidden="true" v-if="faIcons[itemType]" /><MdiIcon :path="markedItemTypes[itemType].path" :size="15" v-else /></span>
        <span class="marked-items-name">{{ markedItemTypes[itemType].text() }}</span>
        <button type="button" class="marked-items-clear" v-if="getCount(itemType) > 0" :title="$t('chartTooltipMarkedItemsClear')" :aria-label="$t('chartTooltipMarkedItemsClear')" @click.stop="confirming = itemType" @keydown.enter.stop>
          <MdiIcon :path="mdiBroom" :size="16" />
        </button>
        <span class="marked-items-count" :title="getCount(itemType).toLocaleString()">{{ getNumberWithSuffix(getCount(itemType), 1) }}</span>
      </div>
      <!-- Clearing asked: confirmed or not on a line under the row -->
      <div class="marked-items-confirm" v-if="confirming === itemType" @click.stop>
        <span>Confirm?</span>
        <a href="#" class="marked-items-confirm-yes" @click.prevent.stop="clearMarkedItems(itemType)">Yes</a>
        <span class="marked-items-confirm-separator">-</span>
        <a href="#" @click.prevent.stop="confirming = null">No</a>
      </div>
      </div>
    </div>
  </b-nav-item-dropdown>
</template>

<script>
import { mapGetters } from 'vuex'
import MdiIcon from '@/components/icons/MdiIcon'
import { getNumberWithSuffix } from '@/mixins/formatting'
import { markedItemTypes } from '@/mixins/types'
import { Pages } from '@/mixins/pages'
import { mdiBroom } from '@mdi/js'

// How long the pin swings after something was marked
const ALERT_DURATION = 3000

// A colour with some transparency (dark mode: behind the icon)
const withAlpha = (color, alpha) => {
  const hex = `${color || ''}`.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    return null
  }
  return `rgba(${parseInt(hex.substr(0, 2), 16)}, ${parseInt(hex.substr(2, 2), 16)}, ${parseInt(hex.substr(4, 2), 16)}, ${alpha})`
}

// A colour mixed with white (amount: how much white), for a pastel version of it
const mixWithWhite = (color, amount) => {
  const hex = `${color || ''}`.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    return null
  }
  const channel = index => Math.round(parseInt(hex.substr(index, 2), 16) * (1 - amount) + 255 * amount)
  return `rgb(${channel(0)}, ${channel(2)}, ${channel(4)})`
}

export default {
  components: {
    MdiIcon
  },
  data: function () {
    return {
      markedItemTypes,
      // Font Awesome icons of the types (as in the sidebar menu); the others keep the icon of their type
      faIcons: {
        germplasm: 'fa-seedling',
        markers: 'fa-dna',
        locations: 'fa-map-location-dot'
      },
      // The type whose clearing is being confirmed
      confirming: null,
      // Something was just marked (the pin swings)
      alerting: false,
      // The menu is open (the total is hidden)
      menuOpen: false,
      mdiBroom
    }
  },
  computed: {
    ...mapGetters([
      'storeMarkedIds'
    ]),
    totalMarked: function () {
      return Object.keys(markedItemTypes).reduce((total, itemType) => total + this.getCount(itemType), 0)
    }
  },
  watch: {
    // More marked items than before: the pin swings in green for about 3 seconds
    totalMarked: function (total, previous) {
      if (total > previous) {
        this.alerting = false
        clearTimeout(this.alertTimer)
        this.$nextTick(() => {
          this.alerting = true
          this.alertTimer = setTimeout(() => { this.alerting = false }, ALERT_DURATION)
        })
      }
    }
  },
  beforeDestroy: function () {
    clearTimeout(this.alertTimer)
  },
  methods: {
    getNumberWithSuffix,
    getCount: function (itemType) {
      return (this.storeMarkedIds && this.storeMarkedIds[itemType]) ? this.storeMarkedIds[itemType].length : 0
    },
    // The original colour of the type for the icon, a pastel version of it behind; in dark mode a transparent one
    // behind and a lighter icon (see the CSS variables)
    getIconStyle: function (itemType) {
      const color = markedItemTypes[itemType].color()
      return {
        '--marked-icon-bg': mixWithWhite(color, 0.72) || 'rgba(0, 0, 0, 0.06)',
        '--marked-icon-color': color || 'inherit',
        '--marked-icon-bg-dark': withAlpha(color, 0.22) || 'rgba(255, 255, 255, 0.08)',
        '--marked-icon-color-dark': mixWithWhite(color, 0.35) || 'inherit'
      }
    },
    // The page of the marked items of the type (the dropdown closes); nothing marked: nothing to open
    openMarkedItems: function (itemType) {
      if (this.getCount(itemType) === 0) {
        return
      }
      if (this.$refs.dropdown) {
        this.$refs.dropdown.hide(true)
      }
      this.$router.push({ name: Pages.markedItemsType, params: { itemType: itemType } }).catch(() => {})
    },
    // Confirmed under the row ("Yes")
    clearMarkedItems: function (itemType) {
      this.$store.dispatch('clearMarkedIds', itemType)
      this.confirming = null
    }
  }
}
</script>

<!-- The look of the dropdowns of the top navigation (card, arrow, title, rows, dark mode) -->
<style src="@/assets/top-nav-dropdown.css"></style>

<style scoped>
/* A little more space after the search of the top navigation (the total badge sticks out on the left of the pin) */
.marked-items-dropdown {
  margin-left: 0.75rem;
}
/* A row of the shared card (top-nav-menu-row) holds the line itself and, under it, the confirmation */
.marked-items-entry {
  display: block;
  padding: 0;
  cursor: default;
}
.marked-items-entry:hover,
.marked-items-entry:focus,
body.dark-mode .marked-items-entry:hover,
body.dark-mode .marked-items-entry:focus {
  background: transparent;
}
.marked-items-entry:last-child {
  overflow: hidden;
}
.marked-items-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
.marked-items-row:hover,
.marked-items-row:focus {
  background: rgba(0, 0, 0, 0.04);
  outline: none;
}
/* "Confirm? Yes - No" under the row, aligned with its text */
.marked-items-confirm {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 1rem 0.55rem 3.4rem;
  font-size: 0.85rem;
  color: #4a4d4b;
}
.marked-items-confirm a {
  font-weight: 600;
}
.marked-items-confirm-yes {
  color: var(--danger, #dc3545);
}
.marked-items-confirm-separator {
  color: #8a8d8a;
}
.marked-items-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 6px;
  background: var(--marked-icon-bg);
  color: var(--marked-icon-color);
  font-size: 0.85rem;
}
body.dark-mode .marked-items-icon {
  background: var(--marked-icon-bg-dark);
  color: var(--marked-icon-color-dark);
}
/* Nothing marked: the row can't be opened */
.marked-items-row.disabled {
  cursor: default;
  opacity: 0.5;
}
.marked-items-row.disabled:hover {
  background: transparent;
}
/* Something was just marked: the pin is stuck in, in the green of the search button. The box of the icon keeps its
   size and only the icon is transformed (a transform never moves what is around it). */
.marked-items-pin {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.4rem;
  overflow: visible;
  /* On the line of the other icons of the bar */
  vertical-align: middle;
}
.marked-items-pin > i {
  display: inline-block;
  transform-origin: 50% 100%;
}
/* The total: a small notification badge over the top left corner of the pin (it doesn't change the size of the bar);
   1K, 1.5M... from 1000 */
.marked-items-total {
  position: absolute;
  top: -0.45rem;
  left: -0.6rem;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  /* The dark green of the project, white text */
  background: #3b6b35;
  color: #ffffff;
  font-family: 'DM Sans', -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1.1rem;
  text-align: center;
  white-space: nowrap;
  pointer-events: none;
}
/* Dark mode: the same green, a little lighter */
body.dark-mode .marked-items-total {
  background: #4a7f42;
}
.marked-items-pinning {
  color: #3b6b35;
}
body.dark-mode .marked-items-pinning {
  color: #8cc47e;
}
.marked-items-pinning > i {
  animation: marked-items-pin-in 1.5s ease-in-out 2;
}
/* Pushed in (a little down), then tilted to the side on its tip, held, and back up */
@keyframes marked-items-pin-in {
  0% { transform: translateY(0) rotate(0); }
  15% { transform: translateY(2px) rotate(0); }
  35% { transform: translateY(2px) rotate(-30deg); }
  70% { transform: translateY(2px) rotate(-30deg); }
  100% { transform: translateY(0) rotate(0); }
}
.marked-items-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* The broom: dark grey, on the line of the text */
.marked-items-clear {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem;
  border: none;
  background: transparent;
  color: #4a4d4b;
  line-height: 1;
  cursor: pointer;
}
.marked-items-clear:hover {
  color: #1f2120;
}
.marked-items-count {
  min-width: 1.75rem;
  text-align: right;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
}
body.dark-mode .marked-items-confirm,
body.dark-mode .marked-items-clear {
  color: #c4beb5;
}
body.dark-mode .marked-items-row:hover,
body.dark-mode .marked-items-row:focus {
  background: rgba(255, 255, 255, 0.06);
}
</style>
