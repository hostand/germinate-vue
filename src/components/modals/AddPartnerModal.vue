<template>
  <!-- A new partner of the about page (about.json of the template folder), in the look of the custom pages. Same request
       as the original AddAboutPartnerModal: the name, the URL and the image are required, the image is stored in the
       template images under a random name. -->
  <b-modal ref="addPartnerModal"
           :title="$t('modalTitleAddAboutPartner')"
           modal-class="cp-modal"
           content-class="custom-page"
           size="lg"
           centered
           :no-close-on-backdrop="sending"
           @hidden="reset">
    <form class="apm-form" @submit.prevent="submit">
      <label class="apm-field">
        <span class="apm-label">{{ $t('formLabelAboutPartnerName') }} <span class="apm-required" aria-hidden="true">*</span></span>
        <input class="apm-input" type="text" v-model.trim="name" required />
      </label>
      <label class="apm-field">
        <span class="apm-label">{{ $t('formLabelAboutPartnerUrl') }} <span class="apm-required" aria-hidden="true">*</span></span>
        <input class="apm-input" type="url" v-model.trim="url" placeholder="https://" required />
      </label>
      <label class="apm-field">
        <span class="apm-label">{{ $t('formLabelAboutPartnerDescription') }}</span>
        <textarea class="apm-input apm-textarea" rows="4" v-model.trim="description" />
      </label>

      <!-- The image: a drop area showing the chosen file -->
      <div class="apm-field">
        <span class="apm-label">{{ $t('formLabelAboutPartnerImage') }} <span class="apm-required" aria-hidden="true">*</span></span>
        <label :class="['apm-drop', { 'has-file': image, dragging }]"
               @dragover.prevent="dragging = true"
               @dragleave.prevent="dragging = false"
               @drop.prevent="onDrop">
          <input class="apm-file" type="file" accept=".jpeg,.jpg,.png,.svg" @change="onFile" />
          <img class="apm-preview" :src="preview" alt="" v-if="preview" />
          <span class="apm-drop-icon" aria-hidden="true" v-else><i class="fa-solid fa-image" /></span>
          <span class="apm-drop-text">{{ image ? image.name : $t('pageDataUploadFilePlaceholder') }}</span>
        </label>
      </div>
    </form>

    <template #modal-footer="{ cancel }">
      <button type="button" class="cp-modal-button" @click="cancel()" :disabled="sending">{{ $t('buttonCancel') }}</button>
      <button type="button" class="cp-modal-button is-primary" @click="submit" :disabled="!canSubmit || sending">
        <b-spinner small v-if="sending" /><i class="fa-solid fa-check" aria-hidden="true" v-else /> {{ $t('buttonSubmit') }}
      </button>
    </template>
  </b-modal>
</template>

<script>
import { apiPostAboutPartner } from '@/mixins/api/misc'
import { handleError } from '@/mixins/api/base'

export default {
  data: function () {
    return {
      name: null,
      url: null,
      description: null,
      image: null,
      preview: null,
      dragging: false,
      sending: false
    }
  },
  computed: {
    canSubmit: function () {
      return !!(this.name && this.url && this.image)
    }
  },
  methods: {
    show: function () {
      this.reset()
      this.$refs.addPartnerModal.show()
    },
    hide: function () {
      this.$refs.addPartnerModal.hide()
    },
    reset: function () {
      if (this.preview) {
        URL.revokeObjectURL(this.preview)
      }
      this.name = null
      this.url = null
      this.description = null
      this.image = null
      this.preview = null
      this.dragging = false
      this.sending = false
    },
    setImage: function (file) {
      if (!file || !/\.(jpe?g|png|svg)$/i.test(file.name)) {
        return
      }
      if (this.preview) {
        URL.revokeObjectURL(this.preview)
      }
      this.image = file
      this.preview = URL.createObjectURL(file)
    },
    onFile: function (event) {
      this.setImage(event.target.files && event.target.files[0])
    },
    onDrop: function (event) {
      this.dragging = false
      this.setImage(event.dataTransfer.files && event.dataTransfer.files[0])
    },
    submit: function () {
      if (!this.canSubmit || this.sending) {
        return
      }
      const formData = new FormData()
      formData.append('name', this.name)
      if (this.description) {
        formData.append('description', this.description)
      }
      formData.append('url', this.url)
      formData.append('imageFile', this.image)

      this.sending = true
      apiPostAboutPartner(formData, () => {
        this.sending = false
        this.$emit('partner-added')
        this.hide()
      }, {
        codes: [],
        callback: error => {
          this.sending = false
          handleError(error)
        }
      })
    }
  },
  beforeDestroy: function () {
    if (this.preview) {
      URL.revokeObjectURL(this.preview)
    }
  }
}
</script>

<style src="@/assets/custom-page.css"></style>
<style src="@/assets/cp-modal.css"></style>
<style>
.cp-modal .apm-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.cp-modal .apm-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin: 0;
}
.cp-modal .apm-label {
  color: var(--cp-text-subtle);
  font-size: 0.85rem;
  font-weight: 600;
}
.cp-modal .apm-required {
  color: #c8323f;
}
.cp-modal .apm-input {
  width: 100%;
  height: 42px;
  padding: 0 0.85rem;
  border: 1px solid var(--cp-border);
  border-radius: 10px;
  background: var(--cp-surface);
  color: var(--cp-text);
  font: inherit;
  font-size: 0.95rem;
}
.cp-modal .apm-textarea {
  height: auto;
  padding: 0.6rem 0.85rem;
  line-height: 1.5;
  resize: vertical;
}
.cp-modal .apm-input:focus {
  border-color: var(--cp-green);
  outline: none;
  box-shadow: 0 0 0 3px var(--cp-green-soft);
}
/* The image: a dashed drop area, the preview inside once chosen */
.cp-modal .apm-drop {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0;
  padding: 1rem 1.1rem;
  border: 2px dashed var(--cp-border);
  border-radius: 12px;
  background: var(--cp-surface);
  color: var(--cp-muted);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.cp-modal .apm-drop:hover,
.cp-modal .apm-drop.dragging {
  border-color: var(--cp-green);
  background: var(--cp-green-soft);
}
.cp-modal .apm-drop.has-file {
  border-style: solid;
}
.cp-modal .apm-file {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.cp-modal .apm-drop-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: var(--cp-green-soft);
  color: var(--cp-green);
  font-size: 1.5rem;
}
.cp-modal .apm-preview {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 12px;
  object-fit: contain;
  background: #ffffff;
}
.cp-modal .apm-drop-text {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 0.92rem;
}
.cp-modal .cp-modal-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
