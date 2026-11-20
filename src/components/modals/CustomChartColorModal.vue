<template>
  <!-- The colours of the charts (in the look of the custom pages, for every chart): a palette (those of the Germinate
       configuration by default, and those of palette.js), listed when they cover the series of the chart (when they do
       not, Paul Tol's rainbow is taken); colour-blind friendly ones only, when asked; the colours of the palette, each
       removable, and a new colour (the primary colour of the configuration first) to add; back to the defaults. -->
  <b-modal ref="customChartColorModal"
           :title="$t('modalTitleChartColors')"
           modal-class="cp-modal"
           content-class="custom-page"
           centered
           @ok.prevent="onSubmit">
    <template #modal-footer="{ ok, cancel }">
      <button type="button" class="cp-modal-button" @click="cancel()">{{ $t('buttonCancel') }}</button>
      <button type="button" class="cp-modal-button is-primary" @click="ok()">{{ $t('buttonUpdate') }}</button>
    </template>
    <b-form @submit.prevent class="cp-color-form">
      <!-- The palette and the colour-blind filter -->
      <b-form-group :label="$t('formLabelChartColorsPalette')" label-for="ccm-palette">
        <div class="ccm-row">
          <b-dropdown id="ccm-palette"
                      class="ccm-palette"
                      toggle-class="ccm-palette-toggle"
                      menu-class="ccm-menu"
                      boundary="window"
                      block
                      no-caret
                      no-flip
                      variant="link"
                      @shown="focusSearch"
                      @hidden="search = ''">
            <template #button-content>
              <template v-if="selectedPalette">
                <span class="ccm-name">{{ getPaletteName(selectedPalette) }}</span>
                <span class="ccm-strip is-large"><i v-for="(c, index) in getPaletteColors(selectedPalette)" :key="`ccm-selected-${index}`" :style="{ background: c }" /></span>
                <span class="ccm-badge is-cbf" v-if="isColourBlindSafe(selectedPalette)" v-b-tooltip.hover="$t('chartColorsColourBlindSafe')"><i class="fa-solid fa-eye" aria-hidden="true" /></span>
                <span class="ccm-badge">{{ getMaxText(selectedPalette) }}</span>
              </template>
              <span class="ccm-name is-custom" v-else>{{ $t('chartColorsCustom') }}</span>
              <i class="fa-solid fa-chevron-down ccm-caret" aria-hidden="true" />
            </template>
            <b-dropdown-form form-class="ccm-search">
              <i class="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input type="search" ref="search" v-model="search" :placeholder="$t('chartColorsSearch')" :aria-label="$t('chartColorsSearch')" @keydown.stop>
            </b-dropdown-form>
            <template v-for="group in groups">
              <b-dropdown-header :key="`ccm-group-${group.key}`">{{ $t(group.key) }}</b-dropdown-header>
              <b-dropdown-item-button v-for="p in group.items"
                                      :key="`ccm-palette-${p.key}`"
                                      :active="p.key === paletteKey"
                                      button-class="ccm-option"
                                      @click="choosePalette(p)">
                <span class="ccm-name">{{ getPaletteName(p) }}</span>
                <span class="ccm-strip"><i v-for="(c, index) in getPaletteColors(p)" :key="`ccm-${p.key}-${index}`" :style="{ background: c }" /></span>
                <span class="ccm-badge is-cbf" v-if="isColourBlindSafe(p)"><i class="fa-solid fa-eye" aria-hidden="true" /></span>
                <span class="ccm-badge">{{ getMaxText(p) }}</span>
              </b-dropdown-item-button>
            </template>
            <b-dropdown-text v-if="groups.length < 1" text-class="ccm-none">{{ $t('chartColorsNoPalette') }}</b-dropdown-text>
          </b-dropdown>
          <button type="button"
                  :class="['ccm-toggle', { 'is-on': colourBlind }]"
                  :aria-pressed="colourBlind ? 'true' : 'false'"
                  v-b-tooltip.hover="$t('chartColorsColourBlindTooltip')"
                  @click="toggleColourBlind">
            <i class="fa-solid fa-eye" aria-hidden="true" /> {{ $t('chartColorsColourBlind') }}
          </button>
        </div>
      </b-form-group>
      <!-- The colours, each removable -->
      <b-form-group :label="$t('formLabelChartColorsCurrent')" label-for="ccm-colors">
        <b-form-tags id="ccm-colors">
          <!-- Dragged to another place: the order of the colours in the charts (small sets only: 12 colours or fewer) -->
          <b-form-tag v-for="(c, index) in colors"
                      :class="['p-1 m-1', { 'ccm-tag': canReorder, 'is-dragged': dragIndex === index, 'is-target-before': dropIndex === index && dragIndex !== null && dragIndex > index, 'is-target-after': dropIndex === index && dragIndex !== null && dragIndex < index }]"
                      :key="`custom-color-${c}-${index}`"
                      :style="{ backgroundColor: c, color: getHighContrastTextColor(c) }"
                      :title="canReorder ? $t('chartColorsDragTooltip') : null"
                      :draggable="canReorder ? 'true' : 'false'"
                      @dragstart.native="onDragStart($event, index)"
                      @dragover.native.prevent="onDragOver(index)"
                      @drop.native.prevent="onDrop(index)"
                      @dragend.native="onDragEnd"
                      @remove="removeColor(index)">
            {{ c }}
          </b-form-tag>
        </b-form-tags>
      </b-form-group>
      <!-- A new colour (the primary colour of the configuration first) -->
      <b-form-group :label="$t('formLabelChartColorsNew')" label-for="ccm-new-color" :invalid-feedback="message" :state="colorValid">
        <b-input-group>
          <template v-slot:append>
            <button type="button" class="cp-color-add" v-b-tooltip="$t('genericAdd')" @click="addColor" :aria-label="$t('genericAdd')"><i class="fa-solid fa-plus" aria-hidden="true" /></button>
          </template>
          <b-form-input type="color" v-model="color" id="ccm-new-color" :state="colorValid" required />
        </b-input-group>
      </b-form-group>
      <button type="button" class="cp-modal-button" @click="resetColors"><i class="fa-solid fa-rotate-left" aria-hidden="true" /> {{ $t('buttonResetColorsToDefault') }}</button>
    </b-form>
  </b-modal>
</template>

<script>
import { mapGetters } from 'vuex'
import { getColors, getHighContrastTextColor } from '@/mixins/colors.js'
import { DEFAULT, FALLBACK, INFINITE, getPalettes, getPalette } from '@/mixins/chart-palettes'

// Without a number of series: the colours shown (and kept) of a palette
const DEFAULT_SIZE = 9
// The colours can be put in another order (their chips dragged) only up to this many
const REORDER_MAX = 12
// The colours kept of a qualitative palette: at least these many (the charts take them in turn)
const QUALITATIVE_SIZE = 12

export default {
  props: {
    // Kept for the charts that give it: the modal has the look of the custom pages everywhere
    customLook: {
      type: Boolean,
      default: true
    }
  },
  data: function () {
    return {
      // How many series the chart shows (null: not known)
      count: null,
      // The chosen palette (null: colours edited by hand)
      paletteKey: DEFAULT,
      colourBlind: false,
      search: '',
      colors: [],
      color: '#5a9e79',
      message: null,
      colorValid: null,
      // The chip being dragged and the one it is over (their indexes)
      dragIndex: null,
      dropIndex: null
    }
  },
  computed: {
    ...mapGetters([
      'storeServerSettings',
      'storeCustomChartColors',
      'storeCustomChartPalette'
    ]),
    need: function () {
      return Math.max(this.count || 1, 1)
    },
    // Few colours: their order can be changed (large sets: not)
    canReorder: function () {
      return this.colors.length <= REORDER_MAX
    },
    selectedPalette: function () {
      return this.paletteKey ? getPalette(this.paletteKey) : null
    },
    // The palettes that cover the series (colour-blind friendly ones only, when asked), found by their name, by group
    groups: function () {
      const search = this.search.trim().toLowerCase()
      const groups = []
      getPalettes().filter(p => this.covers(p)).forEach(p => {
        if (search && !this.getPaletteName(p).toLowerCase().includes(search)) {
          return
        }
        let group = groups.find(g => g.key === p.group)
        if (!group) {
          groups.push(group = { key: p.group, items: [] })
        }
        group.items.push(p)
      })
      return groups
    }
  },
  methods: {
    getHighContrastTextColor,
    covers: function (p) {
      return p.max >= this.need && (!this.colourBlind || p.cbfMax >= this.need)
    },
    isColourBlindSafe: function (p) {
      return p.cbfMax >= Math.max(this.need, 2)
    },
    getPaletteName: function (p) {
      if (p.own) {
        return p.name
      }
      return typeof p.name === 'object' ? this.$t(p.name.key, p.name.params) : this.$t(p.name)
    },
    getMaxText: function (p) {
      return p.max >= INFINITE ? '∞' : `≤ ${p.max}`
    },
    // The colours taken of a palette: as many as the series (a qualitative palette: at least a dozen, the charts take
    // them in turn), its own number at most
    getSize: function (p) {
      const wanted = this.count ? this.count : DEFAULT_SIZE
      return Math.min(p.max, p.qualitative ? Math.max(wanted, QUALITATIVE_SIZE) : Math.max(wanted, 2))
    },
    getPaletteColors: function (p) {
      return p.colors(this.getSize(p)) || []
    },
    choosePalette: function (p) {
      this.paletteKey = p.key
      this.colors = this.getPaletteColors(p)
      this.message = null
      this.colorValid = null
    },
    // Colour-blind friendly only: a palette that is not, changed for Paul Tol's rainbow
    toggleColourBlind: function () {
      this.colourBlind = !this.colourBlind
      if (this.colourBlind && this.selectedPalette && !this.covers(this.selectedPalette)) {
        this.choosePalette(getPalette(FALLBACK))
      }
    },
    focusSearch: function () {
      this.$nextTick(() => this.$refs.search && this.$refs.search.focus())
    },
    // A chip dragged onto another: the colour moved to its place (the colours edited by hand)
    onDragStart: function (event, index) {
      if (!this.canReorder) {
        event.preventDefault()
        return
      }
      this.dragIndex = index
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', `${index}`)
      }
    },
    onDragOver: function (index) {
      if (this.dragIndex !== null) {
        this.dropIndex = index
      }
    },
    onDrop: function (index) {
      const from = this.dragIndex
      this.onDragEnd()
      if (from === null || from === index) {
        return
      }
      const colors = this.colors.slice()
      const [moved] = colors.splice(from, 1)
      colors.splice(index, 0, moved)
      this.colors = colors
      this.paletteKey = null
    },
    onDragEnd: function () {
      this.dragIndex = null
      this.dropIndex = null
    },
    removeColor: function (index) {
      this.colors.splice(index, 1)
      this.paletteKey = null
    },
    addColor: function () {
      if (this.colors.map(c => c.toLowerCase()).indexOf(this.color.toLowerCase()) === -1) {
        this.colors.push(this.color)
        this.paletteKey = null
        this.message = null
        this.colorValid = null
      } else {
        this.colorValid = false
        this.message = this.$t('chartColorsAlreadyAdded')
      }
    },
    // Opened for a chart of `count` series (null: not known): its palette (the default one: the chart colours of the
    // configuration); a palette that does not cover the series changed for Paul Tol's rainbow
    show: function (count) {
      this.count = typeof count === 'number' && count > 0 ? count : null
      this.color = (this.storeServerSettings && this.storeServerSettings.colorPrimary) ? this.storeServerSettings.colorPrimary : '#5a9e79'
      this.message = null
      this.colorValid = null
      this.search = ''
      const custom = this.storeCustomChartColors && this.storeCustomChartColors.length > 0
      this.paletteKey = custom ? (this.storeCustomChartPalette || null) : DEFAULT
      if (this.paletteKey && !getPalette(this.paletteKey)) {
        this.paletteKey = getPalette(DEFAULT) ? DEFAULT : FALLBACK
      }
      if (this.selectedPalette && !this.covers(this.selectedPalette)) {
        this.paletteKey = FALLBACK
      }
      this.colors = this.selectedPalette ? this.getPaletteColors(this.selectedPalette) : (getColors() || []).slice()

      this.$refs.customChartColorModal.show()
    },
    hide: function () {
      this.$refs.customChartColorModal.hide()
    },
    onSubmit: function () {
      if (this.colors && this.colors.length > 0) {
        this.$store.dispatch('setCustomChartColors', this.colors.slice())
        this.$store.dispatch('setCustomChartPalette', this.paletteKey)
        this.$emit('colors-changed')
        this.$nextTick(() => this.hide())
      }
    },
    resetColors: function () {
      this.$store.dispatch('setCustomChartColors', null)
      this.$store.dispatch('setCustomChartPalette', null)
      this.$emit('colors-changed')
      this.hide()
    }
  }
}
</script>

<style src="@/assets/custom-page.css"></style>
<style src="@/assets/cp-modal.css"></style>
<style>
/* The colours: rounded field, pill-shaped tags */
.cp-color-form .b-form-tags {
  padding: 0.35rem;
  border: 1px solid var(--cp-border);
  border-radius: 12px;
  background: var(--cp-surface);
}
.cp-color-form .b-form-tag {
  border-radius: 999px;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 500;
}
/* A chip that can be dragged: the grab cursor; the one dragged faded; where it would go: a bar on that side */
.cp-color-form .ccm-tag {
  position: relative;
  cursor: grab;
}
.cp-color-form .ccm-tag:active {
  cursor: grabbing;
}
.cp-color-form .ccm-tag.is-dragged {
  opacity: 0.4;
}
.cp-color-form .ccm-tag.is-target-before::before,
.cp-color-form .ccm-tag.is-target-after::after {
  content: '';
  position: absolute;
  top: 2px;
  bottom: 2px;
  width: 3px;
  border-radius: 2px;
  background: var(--cp-green);
}
.cp-color-form .ccm-tag.is-target-before::before {
  left: -6px;
}
.cp-color-form .ccm-tag.is-target-after::after {
  right: -6px;
}
.cp-color-form .input-group > .form-control {
  height: 40px;
  padding: 0.25rem;
  border: 1px solid var(--cp-border);
  border-radius: 10px 0 0 10px;
  background: var(--cp-surface);
}
.cp-color-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 40px;
  border: 1px solid var(--cp-button);
  border-radius: 0 10px 10px 0;
  background: var(--cp-button);
  color: var(--cp-on-button);
  cursor: pointer;
}
.cp-color-add:hover,
.cp-color-add:focus {
  border-color: var(--cp-button-hover);
  background: var(--cp-button-hover);
}
/* The palette (a rounded field, its name, its colours, its badges) and the colour-blind filter */
.ccm-row {
  display: flex;
  gap: 0.5rem;
}
.ccm-palette {
  flex: 1 1 auto;
  min-width: 0;
}
.ccm-palette .ccm-palette-toggle {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  height: 40px;
  padding: 0 0.75rem;
  border: 1px solid var(--cp-border);
  border-radius: 10px;
  background: var(--cp-surface);
  color: var(--cp-text);
  font-size: 0.9rem;
  text-decoration: none;
  box-shadow: none;
}
.ccm-palette .ccm-palette-toggle:hover,
.ccm-palette .ccm-palette-toggle:focus,
.ccm-palette.show .ccm-palette-toggle {
  border-color: var(--cp-green);
  box-shadow: 0 0 0 3px var(--cp-green-soft);
  color: var(--cp-text);
  text-decoration: none;
}
.ccm-name {
  flex: 0 0 9.5rem;
  overflow: hidden;
  font-weight: 500;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ccm-name.is-custom {
  flex: 1 1 auto;
}
.ccm-caret {
  margin-left: auto;
  color: var(--cp-muted);
  font-size: 0.75rem;
}
.ccm-strip {
  display: inline-flex;
  flex: 1 1 auto;
  min-width: 4rem;
  height: 14px;
  overflow: hidden;
  border-radius: 4px;
}
.ccm-strip.is-large {
  height: 16px;
}
.ccm-strip i {
  flex: 1 1 0;
}
.ccm-badge {
  flex-shrink: 0;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: var(--cp-hover, rgba(0, 0, 0, 0.05));
  color: var(--cp-muted);
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
}
.ccm-badge.is-cbf {
  background: var(--cp-green-soft);
  color: var(--cp-green);
}
.ccm-toggle {
  flex-shrink: 0;
  height: 40px;
  padding: 0 0.8rem;
  border: 1px solid var(--cp-border);
  border-radius: 10px;
  background: var(--cp-surface);
  color: var(--cp-text-subtle, var(--cp-muted));
  font-size: 0.85rem;
  white-space: nowrap;
  cursor: pointer;
}
.ccm-toggle.is-on {
  border-color: var(--cp-green);
  background: var(--cp-green-soft);
  color: var(--cp-green);
  font-weight: 600;
}
/* The list: as wide as the field, scrolled, its search on top, its groups */
.dropdown-menu.ccm-menu {
  width: 100%;
  max-height: 380px;
  overflow-y: auto;
  padding: 0.35rem;
  border: 1px solid var(--cp-border, #e2e3df);
  border-radius: 12px;
  background: var(--cp-surface, #fff);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.16);
  font-family: 'DM Sans', -apple-system, 'Segoe UI', Roboto, sans-serif;
}
.ccm-menu .ccm-search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.1rem 0.1rem 0.35rem;
  padding: 0.4rem 0.65rem;
  border: 1px solid var(--cp-border, #e2e3df);
  border-radius: 8px;
  color: var(--cp-muted, #6b6f6c);
}
.ccm-menu .ccm-search input {
  flex: 1 1 auto;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--cp-text, #1f2120);
  font-size: 0.85rem;
}
.ccm-menu .dropdown-header {
  padding: 0.5rem 0.65rem 0.25rem;
  color: var(--cp-muted, #6b6f6c);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.ccm-menu .ccm-option {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.35rem 0.65rem;
  border-radius: 8px;
  color: var(--cp-text, #1f2120);
  font-size: 0.85rem;
}
.ccm-menu .ccm-option:hover,
.ccm-menu .ccm-option:focus,
.ccm-menu .ccm-option.active {
  background: var(--cp-green-soft, #eaf2e6);
  color: var(--cp-text, #1f2120);
}
.ccm-menu .ccm-none {
  color: var(--cp-muted, #6b6f6c);
  font-size: 0.85rem;
}
</style>
