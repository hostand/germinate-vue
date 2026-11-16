<template>
  <!-- The name of a germplasm in a table cell: before it the passport icon, the preview of the passport (modal); the
       name links to the passport page. The same in every table with a germplasm name (GermplasmTable, trial data, ...) -->
  <span class="gt-name">
    <router-link :to="{ name: Pages.passport, params: { germplasmId: germplasmId } }" event="" @click.native.prevent="showPreview" class="gt-passport-preview" v-b-tooltip.hover="$t('tableTooltipGermplasmPreviewPassport')" :aria-label="$t('tableTooltipGermplasmPreviewPassport')">
      <i class="fa-solid fa-passport" aria-hidden="true" />
    </router-link>
    <router-link :to="{ name: Pages.passport, params: { germplasmId: germplasmId } }">{{ name }}</router-link>

    <!-- The preview of the passport (modal), only there while open -->
    <PassportPreviewModal :germplasmId="germplasmId" ref="passportPreview" v-if="previewShown" @hidden="previewShown = false" />
  </span>
</template>

<script>
import PassportPreviewModal from '@/components/germplasm/PassportPreviewModal'
import { Pages } from '@/mixins/pages'

export default {
  name: 'GermplasmNameCell',
  props: {
    germplasmId: {
      type: [Number, String],
      default: null
    },
    name: {
      type: String,
      default: null
    }
  },
  data: function () {
    return {
      Pages,
      previewShown: false
    }
  },
  components: {
    PassportPreviewModal
  },
  methods: {
    showPreview: function () {
      this.previewShown = true
      this.$nextTick(() => this.$refs.passportPreview.show())
    }
  }
}
</script>

<style>
/* The passport icon (preview of the passport), then the name */
.gt-name {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}
.gt-passport-preview {
  flex-shrink: 0;
  color: var(--bt-icon, #6c757d) !important;
  /* Larger than the text, but no taller than its line: the row keeps its height */
  font-size: 1.3em;
  line-height: 1;
  opacity: 0.8;
}
.gt-passport-preview:hover,
.gt-passport-preview:focus {
  color: var(--bt-accent, #3b6b35) !important;
  opacity: 1;
}
</style>
