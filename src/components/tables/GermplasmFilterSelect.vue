<template>
  <!-- A filter of the germplasm table as a searchable list: "<placeholder> <number of values>" while empty, a chevron in
       the corner, and for each value an optional flag or code, its name (cut when too long) and its count. The chosen
       value stays in the field. -->
  <div :class="['germplasm-filter-select', { 'italic-names': italicNames, 'has-value': hasValue, 'is-loading': showLoading, 'has-flag': !!selectedFlag }]" @focusin="focused = true" @focusout="onFocusOut" @click="onFieldClick">
    <VueTypeaheadBootstrap v-model="search"
                           :id="id"
                           ref="typeahead"
                           :disabled="showLoading"
                           :data="options"
                           :serializer="option => option.name"
                           :showOnFocus="true"
                           :minMatchingChars="0"
                           :maxMatches="options.length"
                           :showAllResults="isOption(search)"
                           :disableSort="true"
                           :autoClose="!multiple"
                           inputClass="germplasm-filter-input"
                           @hit="onSelected">
      <template #suggestion="{ data }">
        <span class="germplasm-filter-option">
          <span :class="`fi fi-${data.flag}`" v-if="data.flag" />
          <span class="germplasm-filter-code" v-if="data.code !== undefined && data.code !== null">{{ data.code }}</span>
          <span class="germplasm-filter-name" :title="data.name">{{ data.name }}<span class="germplasm-filter-suffix" v-if="data.suffix"> ({{ data.suffix }})</span></span>
          <span class="germplasm-filter-count" v-if="showCount"><i :class="countIcon" aria-hidden="true" v-if="countIcon" /> {{ getNumberWithSuffix(data.count, 2) }}</span>
          <i class="fa-solid fa-check germplasm-filter-check" aria-hidden="true" v-if="multiple && data.checked" />
        </span>
      </template>
    </VueTypeaheadBootstrap>
    <!-- The flag of the chosen country, before its name -->
    <span class="germplasm-filter-flag" v-if="selectedFlag" aria-hidden="true"><span :class="`fi fi-${selectedFlag}`" /></span>
    <!-- The suffix of the chosen value (e.g. the country code of a location), smaller, after its name: the name copied
         unseen in the font of the field, then the suffix (hidden while typing) -->
    <span class="germplasm-filter-suffix-overlay" v-if="selectedSuffix && !focused" aria-hidden="true"><span class="germplasm-filter-mirror">{{ search }}</span><span class="germplasm-filter-suffix"> ({{ selectedSuffix }})</span></span>
    <!-- While the values are counted (when it takes a while): disabled, with this message -->
    <span class="germplasm-filter-placeholder" v-if="showLoading" role="status">
      <b-spinner small /> Loading ...
    </span>
    <!-- A placeholder can't hold a badge: shown over the empty field, hidden while typing (clearOnClick: never while a
         value is chosen, the field only emptied to choose another one) -->
    <span class="germplasm-filter-placeholder" v-else-if="!search && !focused && !(clearOnClick && hasValue)" aria-hidden="true">
      {{ placeholder }} <span class="germplasm-filter-count" v-if="showCount">{{ options.length }}</span>
    </span>
    <!-- Only with a value: removes the filter, back to the placeholder. The chevron is always there. -->
    <button type="button" class="germplasm-filter-clear" v-if="hasValue && !showLoading" title="Clear" :aria-label="`Clear ${placeholder || 'filter'}`"
            @mousedown.prevent @click="clear">
      <MdiIcon :path="mdiBroom" />
    </button>
    <!-- Opens or closes the list -->
    <button type="button" class="germplasm-filter-chevron" tabindex="-1" :aria-label="`Show the ${placeholder || 'values'}`"
            :disabled="showLoading" @mousedown.prevent @click.stop="toggleList">
      <MdiIcon :path="mdiChevronDown" />
    </button>
  </div>
</template>

<script>
import VueTypeaheadBootstrap from 'vue-typeahead-bootstrap'
import MdiIcon from '@/components/icons/MdiIcon'
import { getNumberWithSuffix } from '@/mixins/formatting'

import { mdiChevronDown, mdiBroom } from '@mdi/js'

// Milliseconds a count may take before "Loading ..." is shown
const LOADING_DELAY = 300

export default {
  components: {
    MdiIcon,
    VueTypeaheadBootstrap
  },
  props: {
    // The typeahead adds "typeahead-input-" to it for its text field
    id: {
      type: String,
      required: true
    },
    // [{ value, name, count, flag?, code?, suffix? (after the name, smaller: e.g. the country code of a location),
    // checked? (multiple: chosen) }]
    options: {
      type: Array,
      default: () => []
    },
    // e.g. "Countries"
    placeholder: {
      type: String,
      default: null
    },
    // The value the table is filtered by, null when it isn't: the field always shows it
    value: {
      default: null
    },
    // Names in italics while hovered or focused in the list (taxa)
    italicNames: {
      type: Boolean,
      default: false
    },
    // The values are being counted
    loading: {
      type: Boolean,
      default: false
    },
    // An icon before the count of each value (e.g. "fa-solid fa-database": the count is of datasets)
    countIcon: {
      type: String,
      default: null
    },
    // The counts of the values (and of the list in the placeholder) shown
    showCount: {
      type: Boolean,
      default: true
    },
    // A click in the field with a value: its text emptied (the cursor there, the whole list shown); the value kept until
    // another one is chosen (leaving the field: its name back)
    clearOnClick: {
      type: Boolean,
      default: false
    },
    // Several values: each one chosen in the list switches it (its tick: the option "checked"); the field stays empty
    // and the list open for the next one
    multiple: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    // The suffix of the chosen value while the field shows it
    selectedSuffix: function () {
      if (!this.hasValue || this.showLoading) {
        return null
      }
      const option = this.options.find(o => o.value === this.value)
      return option && option.suffix && this.search === option.name ? option.suffix : null
    },
    hasValue: function () {
      return this.value !== null && this.value !== undefined
    },
    // Flag of the chosen value while the field shows it (not while typing something else or loading)
    selectedFlag: function () {
      if (!this.hasValue || this.showLoading) {
        return null
      }
      const option = this.options.find(o => o.value === this.value)
      return option && option.flag && this.search === option.name ? option.flag : null
    }
  },
  watch: {
    // "Loading ..." only when it takes a while, so a quick count doesn't make the field flicker
    loading: {
      immediate: true,
      handler: function (loading) {
        clearTimeout(this.loadingTimer)
        if (loading) {
          this.loadingTimer = setTimeout(() => { this.showLoading = true }, LOADING_DELAY)
        } else {
          this.showLoading = false
        }
      }
    },
    value: {
      immediate: true,
      handler: function () {
        this.showValue()
      }
    },
    options: function () {
      this.showValue()
    }
  },
  data: function () {
    return {
      mdiChevronDown,
      mdiBroom,
      showLoading: false,
      loadingTimer: null,
      search: '',
      focused: false
    }
  },
  beforeDestroy: function () {
    clearTimeout(this.loadingTimer)
  },
  methods: {
    getNumberWithSuffix,
    // The field shows the value of the filter (by its name), and is empty without one
    showValue: function () {
      if (this.value === null || this.value === undefined) {
        this.search = ''
        return
      }
      const option = this.options.find(o => o.value === this.value)
      this.search = option ? option.name : `${this.value}`
    },
    // The text is one of the values (case ignored): the whole list is offered, it only filters while typing something else
    isOption: function (text) {
      const query = text ? `${text}`.trim().toLowerCase() : ''
      return query !== '' && this.options.some(option => option.name.toLowerCase() === query)
    },
    // Leaving the field (not for its own list): emptied, the filter is removed ("clear"); anything else not chosen from
    // the list goes back to the filtered value
    onFocusOut: function (event) {
      if (event.relatedTarget && this.$el.contains(event.relatedTarget)) {
        return
      }
      this.focused = false
      if (`${this.search || ''}`.trim() === '') {
        if (this.clearOnClick) {
          this.showValue()
        } else if (this.value !== null && this.value !== undefined) {
          this.$emit('clear')
        }
      } else {
        this.showValue()
      }
    },
    getInput: function () {
      const typeahead = this.$refs.typeahead
      return typeahead && typeahead.$refs ? typeahead.$refs.input : null
    },
    // The typeahead shows its list while it considers itself focused. A click in a field that already has the focus (e.g.
    // after choosing a value) doesn't focus it again, so the click opens the list itself.
    onFieldClick: function (event) {
      const typeahead = this.$refs.typeahead
      if (typeahead && event.target === this.getInput()) {
        // A value shown: its text emptied, the whole list offered
        if (this.clearOnClick && this.hasValue && !this.showLoading) {
          this.search = ''
        }
        typeahead.isFocused = true
      }
    },
    // The chevron: opens the list (focusing the field) or closes it
    toggleList: function () {
      const typeahead = this.$refs.typeahead
      const input = this.getInput()
      if (!typeahead || !input) {
        return
      }
      if (typeahead.isFocused) {
        typeahead.isFocused = false
      } else {
        input.focus()
        typeahead.isFocused = true
      }
    },
    // The broom of the field: the filter is removed and the placeholder shown again
    clear: function () {
      this.search = ''
      this.$emit('clear')
      const typeahead = this.$refs.typeahead
      if (typeahead && typeahead.$refs && typeahead.$refs.input) {
        typeahead.$refs.input.blur()
      }
      this.focused = false
    },
    // Opens the list (the field focused), e.g. when the field is shown
    open: function () {
      const typeahead = this.$refs.typeahead
      const input = this.getInput()
      if (typeahead && input) {
        input.focus()
        typeahead.isFocused = true
      }
    },
    // Hands the chosen value over; the field keeps showing it (multiple: empty, the list open for the next one)
    onSelected: function (option) {
      this.$emit('select', option.value)
      // Several values: the field emptied and the list opened again once the click is over (the list reacts to the focus
      // leaving its option: done first)
      if (this.multiple) {
        this.search = ''
        setTimeout(() => {
          this.search = ''
          // The text of the typeahead itself too (its value went from empty to the name and back in one go: not seen)
          if (this.$refs.typeahead) {
            this.$refs.typeahead.inputValue = ''
          }
          this.open()
        }, 50)
        return
      }
      this.$nextTick(() => {
        this.search = option.name
        const typeahead = this.$refs.typeahead
        if (typeahead && typeahead.$refs && typeahead.$refs.input) {
          typeahead.$refs.input.blur()
        }
      })
    }
  }
}
</script>

<style scoped>
.germplasm-filter-select {
  position: relative;
}
.germplasm-filter-select >>> .germplasm-filter-input {
  padding-right: 2rem;
}
.germplasm-filter-select >>> .germplasm-filter-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}
.germplasm-filter-select >>> .germplasm-filter-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* Chosen country: its flag in the field, before the name */
.germplasm-filter-flag {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0.75rem;
  z-index: 4;
  display: flex;
  align-items: center;
  pointer-events: none;
}
.germplasm-filter-select.has-flag >>> .germplasm-filter-input {
  padding-left: 2.25rem;
}
/* The suffix of a value: smaller and lighter; in the field, after the name (at the place of the text of the field) */
.germplasm-filter-select >>> .germplasm-filter-suffix {
  color: #6c757d;
  font-size: 0.8em;
}
.germplasm-filter-suffix-overlay {
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(0.75rem + 1px);
  z-index: 4;
  display: flex;
  align-items: center;
  white-space: pre;
  pointer-events: none;
}
.germplasm-filter-select.has-flag .germplasm-filter-suffix-overlay {
  left: calc(2.25rem + 1px);
}
.germplasm-filter-mirror {
  visibility: hidden;
}
/* Count and code badges: same shape as the codes of COLLSRC in the passport editing (codes in its green, counts grey) */
.germplasm-filter-select >>> .germplasm-filter-count,
.germplasm-filter-select >>> .germplasm-filter-code {
  display: inline-block;
  flex: 0 0 auto;
  min-width: 2.6rem;
  padding: 0.1rem 0.4rem;
  border-radius: 6px;
  background: var(--gfs-badge-bg);
  color: var(--gfs-badge-text);
  font-size: 0.8rem;
  font-weight: 600;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
/* Count badges: light grey with darker grey digits */
.germplasm-filter-select >>> .germplasm-filter-count {
  background: var(--gfs-count-bg);
  color: var(--gfs-count-text);
}
/* Several values: the tick of the chosen ones */
.germplasm-filter-select >>> .germplasm-filter-check {
  flex: 0 0 auto;
  color: var(--cp-green, #3b6b35);
}
/* The list scrolls instead of pushing the page down */
.germplasm-filter-select >>> .vbt-autcomplete-list {
  max-height: 16rem;
  overflow-y: auto;
}
/* Placeholder and chevron over the field; clicks go through to it */
.germplasm-filter-placeholder,
.germplasm-filter-chevron {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  pointer-events: none;
  color: #6c757d;
}
.germplasm-filter-placeholder {
  left: 0.75rem;
  gap: 0.5rem;
}
/* The chevron is a button (the placeholder lets clicks through) */
.germplasm-filter-chevron {
  right: 0.35rem;
  top: 50%;
  bottom: auto;
  transform: translateY(-50%);
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  pointer-events: auto;
  cursor: pointer;
}
.germplasm-filter-chevron:hover:not(:disabled) {
  background: rgba(108, 117, 125, 0.15);
  color: #343a40;
}
.germplasm-filter-chevron:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
/* While loading the field is disabled: the text it shows isn't readable behind the message */
.germplasm-filter-select.is-loading >>> .germplasm-filter-input {
  color: transparent;
}
/* Above the field: Bootstrap raises a focused field of an input group (z-index 3), which would cover them */
.germplasm-filter-placeholder,
.germplasm-filter-chevron,
.germplasm-filter-clear {
  z-index: 4;
}
/* With a value: the broom before the chevron, room for both */
.germplasm-filter-select.has-value >>> .germplasm-filter-input {
  padding-right: 3.6rem;
}
.germplasm-filter-clear {
  position: absolute;
  top: 50%;
  right: 2rem;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #6c757d;
  cursor: pointer;
}
.germplasm-filter-clear:hover {
  background: rgba(108, 117, 125, 0.15);
  color: #343a40;
}
/* Taxa: their name in italics while hovered or chosen with the keyboard */
.germplasm-filter-select.italic-names >>> .vbt-autcomplete-list a:hover .germplasm-filter-name,
.germplasm-filter-select.italic-names >>> .vbt-autcomplete-list a:focus .germplasm-filter-name,
.germplasm-filter-select.italic-names >>> .vbt-autcomplete-list a.active .germplasm-filter-name {
  font-style: italic;
}
</style>

<style>
/* Colours of the badges (the green of the custom pages), with their dark mode version */
.germplasm-filter-select {
  --gfs-badge-bg: #eaf2e6;
  --gfs-badge-text: #3b6b35;
  --gfs-count-bg: #e9ecef;
  --gfs-count-text: #495057;
}
body.dark-mode .germplasm-filter-select {
  --gfs-badge-bg: rgba(106, 168, 79, 0.16);
  --gfs-badge-text: #8cc47e;
  --gfs-count-bg: rgba(255, 255, 255, 0.12);
  --gfs-count-text: #ced4da;
}
</style>
