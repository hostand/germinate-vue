<template>
  <!-- Same add-by-DOI flow as the modal inside PublicationsWidget, usable on its own -->
  <b-modal ref="addPublicationModal"
           :title="$t('modalTitlePublicationAddNew')"
           :ok-title="$t('buttonSubmit')"
           :cancel-title="$t('buttonCancel')"
           :ok-disabled="!newPublication.html"
           @ok.prevent="onSubmit"
           @show="resetForm">
    <b-form-group :label="$t('formLabelPublicationDOI')" label-for="add-publication-doi">
      <b-form-input id="add-publication-doi" v-model="newPublication.doi" :state="!newPublication.errorMessage"/>
      <b-form-invalid-feedback>
        {{ newPublication.errorMessage }}
      </b-form-invalid-feedback>
    </b-form-group>
    <!-- New look: the rounded, outlined button of the modals -->
    <button type="button" class="cp-modal-button is-primary" @click="getPublication" :disabled="!newPublication.doi || newPublication.loading">
      <i class="fa-solid fa-angles-down" aria-hidden="true" /> {{ $t('buttonUpdate') }} <b-spinner small v-if="newPublication.loading" />
    </button>

    <p v-html="newPublication.html" v-if="newPublication.html" />
  </b-modal>
</template>

<script>
import { apiPutPublication, apiPutPublicationReference } from '@/mixins/api/misc'

const { Cite } = require('@citation-js/core')
require('@citation-js/plugin-doi')
require('@citation-js/plugin-csl')

export default {
  props: {
    referenceType: {
      type: String,
      default: 'database'
    },
    referencingId: {
      type: Number,
      default: null
    }
  },
  data: function () {
    return {
      newPublication: {
        doi: null,
        html: null,
        json: null,
        errorMessage: null,
        loading: false,
        date: null
      }
    }
  },
  methods: {
    show: function () {
      this.$refs.addPublicationModal.show()
    },
    hide: function () {
      this.$refs.addPublicationModal.hide()
    },
    resetForm: function () {
      this.newPublication = {
        doi: null,
        html: null,
        json: null,
        errorMessage: null,
        loading: false,
        date: null
      }
    },
    getPublication: function () {
      this.newPublication.html = null
      this.newPublication.json = null
      this.newPublication.errorMessage = null
      this.newPublication.loading = true
      this.newPublication.date = null

      Cite.async(this.newPublication.doi.trim())
        .then(result => {
          this.newPublication.json = JSON.stringify(result.data[0])
          this.newPublication.html = result.format('bibliography', { format: 'html', template: 'apa' })

          if (result.data[0].created && result.data[0].created['date-time']) {
            this.newPublication.date = new Date(result.data[0].created['date-time'])
          }
        })
        .catch(error => {
          this.newPublication.errorMessage = error.message
        })
        .finally(() => {
          this.newPublication.loading = false
        })
    },
    onSubmit: function () {
      apiPutPublication({
        doi: this.newPublication.doi,
        fallbackCache: this.newPublication.json,
        createdOn: this.newPublication.date
      }, publicationId => {
        apiPutPublicationReference(publicationId, {
          publicationId: publicationId,
          referenceType: this.referenceType,
          foreignId: this.referencingId
        }, () => {
          this.hide()
          this.$emit('publication-added', publicationId)
        })
      })
    }
  }
}
</script>

<style src="@/assets/cp-modal.css"></style>
