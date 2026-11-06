<template>
  <b-modal :title="$t('widgetPublicationModalTitle')"
           ref="referenceModal"
           :ok-title="$t('buttonClose')"
           ok-only
           :modal-class="customLook ? 'cp-modal' : null"
           :content-class="customLook ? 'custom-page' : null"
           :centered="customLook"
           :size="customLook ? 'lg' : null"
           v-if="publication">
    <!-- Custom look: the copy button beside Close -->
    <template #modal-footer="{ ok }" v-if="customLook">
      <button type="button" :class="['cp-modal-button', { 'is-copied': copied }]" @click="copy">
        <i :class="['fa-solid', copied ? 'fa-check' : 'fa-copy']" aria-hidden="true" /> {{ copied ? $t('tooltipCopiedToClipboard') : $t('tooltipCopyToClipboard') }}
      </button>
      <button type="button" class="cp-modal-button is-primary" @click="ok()">{{ $t('buttonClose') }}</button>
    </template>

    <template v-if="customLook">
      <!-- The styles as separate rounded buttons -->
      <div class="rm-styles" role="radiogroup" :aria-label="$t('formLabelReferenceTemplate')">
        <span class="rm-styles-label">{{ $t('formLabelReferenceTemplate') }}</span>
        <button type="button" v-for="template in templateOptions" :key="template.value"
                :class="['rm-style', { active: selectedTemplate === template.value }]"
                role="radio" :aria-checked="selectedTemplate === template.value ? 'true' : 'false'"
                @click="selectedTemplate = template.value">{{ template.text }}</button>
      </div>
      <!-- The citation in a soft block, a quote mark on its left -->
      <div class="rm-citation">
        <i class="fa-solid fa-quote-left rm-citation-mark" aria-hidden="true" />
        <div class="rm-citation-text" v-html="html" />
      </div>
    </template>
    <template v-else>
      <b-form-group :label="$t('formLabelReferenceTemplate')" label-for="referenceStyle">
        <b-form-select id="referenceStyle" :options="templates" v-model="selectedTemplate" />
      </b-form-group>
      <p v-html="html" />
    </template>
  </b-modal>
</template>

<script>
const { Cite } = require('@citation-js/core')
require('@citation-js/plugin-doi')
require('@citation-js/plugin-csl')

export default {
  props: {
    publication: {
      type: Object,
      default: () => null
    },
    // In the look of the custom pages (publication details), with a button copying the citation
    customLook: {
      type: Boolean,
      default: false
    }
  },
  data: function () {
    return {
      templates: ['apa', 'vancouver', 'harvard1'],
      templateOptions: [{ value: 'apa', text: 'APA' }, { value: 'vancouver', text: 'Vancouver' }, { value: 'harvard1', text: 'Harvard' }],
      selectedTemplate: 'apa',
      copied: false,
      copiedTimer: null
    }
  },
  computed: {
    citation: function () {
      if (this.publication) {
        return new Cite(this.publication.publicationFallbackCache || this.publication.publicationDoi)
      } else {
        return null
      }
    },
    html: function () {
      if (this.citation) {
        return this.citation.format('bibliography', { format: 'html', template: this.selectedTemplate })
      } else {
        return null
      }
    }
  },
  watch: {
    selectedTemplate: function () {
      this.copied = false
    }
  },
  methods: {
    hide: function () {
      this.$refs.referenceModal.hide()
    },
    show () {
      this.copied = false
      this.$nextTick(() => this.$refs.referenceModal.show())
    },
    // The citation in the chosen style to the clipboard: formatted (italics) for word processors and as plain text
    copy: async function () {
      if (!this.citation) {
        return
      }
      const text = this.citation.format('bibliography', { format: 'text', template: this.selectedTemplate }).trim()
      const html = this.html

      let done = false
      try {
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([new window.ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([text], { type: 'text/plain' })
          })])
          done = true
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(text)
          done = true
        }
      } catch (err) {
        done = false
      }

      // Without the clipboard API (page not served over HTTPS): through a hidden text field
      if (!done) {
        const field = document.createElement('textarea')
        field.value = text
        field.setAttribute('readonly', '')
        field.style.position = 'fixed'
        field.style.opacity = '0'
        this.$refs.referenceModal.$el.appendChild(field)
        field.select()
        try {
          done = document.execCommand('copy')
        } catch (err) {
          done = false
        }
        field.remove()
      }

      if (done) {
        this.copied = true
        clearTimeout(this.copiedTimer)
        this.copiedTimer = setTimeout(() => { this.copied = false }, 2500)
      }
    }
  },
  beforeDestroy: function () {
    clearTimeout(this.copiedTimer)
  }
}
</script>

<style src="@/assets/custom-page.css"></style>
<style src="@/assets/cp-modal.css"></style>
<style>
/* Custom look: the styles as separate rounded buttons, the current one in green */
.cp-modal .rm-styles {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 1.1rem;
}
.cp-modal .rm-styles-label {
  margin-right: 0.35rem;
  color: var(--cp-text-subtle);
  font-size: 0.85rem;
  font-weight: 500;
}
.cp-modal .rm-style {
  height: 36px;
  padding: 0 1rem;
  border: 1px solid var(--cp-border);
  border-radius: 10px;
  background: var(--cp-surface);
  color: var(--cp-text);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
}
.cp-modal .rm-style:hover,
.cp-modal .rm-style:focus {
  border-color: var(--cp-muted);
  background: var(--cp-surface-hover);
}
.cp-modal .rm-style.active {
  border-color: var(--cp-green);
  background: var(--cp-green-soft);
  color: var(--cp-green);
}
/* The citation: a soft block with a green line on the left */
.cp-modal .rm-citation {
  display: flex;
  gap: 0.9rem;
  padding: 1.1rem 1.25rem;
  border: 1px solid var(--cp-border);
  border-left: 4px solid var(--cp-green);
  border-radius: 12px;
  background: var(--cp-surface-hover);
}
.cp-modal .rm-citation-mark {
  flex-shrink: 0;
  margin-top: 0.2rem;
  color: var(--cp-green);
  font-size: 1.1rem;
}
.cp-modal .rm-citation-text {
  min-width: 0;
  color: var(--cp-text);
  font-size: 0.95rem;
  line-height: 1.65;
  overflow-wrap: anywhere;
}
.cp-modal .rm-citation-text .csl-bib-body,
.cp-modal .rm-citation-text .csl-entry {
  margin: 0;
}
.cp-modal .rm-citation-text a {
  color: var(--cp-green);
}
/* The copy button once copied */
.cp-modal .cp-modal-button.is-copied {
  border-color: var(--cp-green);
  color: var(--cp-green);
}
</style>
