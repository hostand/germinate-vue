<template>
  <!-- The preview of the passport of a germplasm: the passport page, in a modal wider than "xl", in the look of the custom
       pages (cp-modal). No padding around the page: its reference images go to the edges and the top; the page keeps its
       own (below). Used by the germplasm names of the tables (GermplasmNameCell) and the charts (e.g. the timeline of a
       date trait). -->
  <b-modal size="xl" dialog-class="passport-preview-modal" modal-class="cp-modal" content-class="custom-page" ref="passportModal" @hidden="$emit('hidden')" scrollable>
    <!-- Only the X, at the top right over the page (it stays there while the page scrolls) -->
    <template #modal-header="{ close }">
      <button type="button" class="passport-preview-close" @click="close()" :title="$t('buttonClose')" :aria-label="$t('buttonClose')"><i class="fa-solid fa-xmark" aria-hidden="true" /></button>
    </template>
    <PassportView :germplasmId="germplasmId" :isPopup="true" />
    <template #modal-footer="{ close }">
      <button type="button" class="cp-modal-button" @click="close()">{{ $t('buttonClose') }}</button>
    </template>
  </b-modal>
</template>

<script>
export default {
  name: 'PassportPreviewModal',
  props: {
    germplasmId: {
      type: [Number, String],
      default: null
    }
  },
  components: {
    // Loaded when a preview is opened (the passport page is large, and uses tables itself)
    PassportView: () => import(/* webpackChunkName: "passport" */ '@/views/data/germplasm/PassportView.vue')
  },
  methods: {
    show: function () {
      this.$nextTick(() => this.$refs.passportModal.show())
    },
    hide: function () {
      this.$refs.passportModal.hide()
    }
  }
}
</script>

<style src="@/assets/custom-page.css"></style>
<style src="@/assets/cp-modal.css"></style>
<style>
/* Passport preview: wider than the "xl" modal, within the window */
.passport-preview-modal {
  max-width: min(1320px, 96vw);
}
/* The rounded corners cut the images too */
.passport-preview-modal .modal-content {
  overflow: hidden;
}
.passport-preview-modal .modal-header {
  position: absolute;
  top: 0.75rem;
  right: 1.25rem;
  z-index: 5;
  padding: 0;
  border: 0;
}
.passport-preview-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--cp-border);
  border-radius: 10px;
  background: var(--cp-surface);
  color: var(--cp-muted);
  font-size: 1rem;
  box-shadow: 0 2px 6px var(--cp-shadow);
  cursor: pointer;
}
.passport-preview-close:hover,
.passport-preview-close:focus {
  border-color: var(--cp-muted);
  color: var(--cp-text);
  outline: none;
}
.passport-preview-modal .modal-body {
  padding: 0;
  /* A thin scroll bar: the images reach (almost) the right edge too */
  scrollbar-width: thin;
}
.passport-preview-modal .passport-page.is-popup {
  padding: 1.5rem 1.5rem 0.5rem;
}
.passport-preview-modal .modal-footer {
  border-top: 1px solid var(--cp-border);
  padding-top: 0.9rem;
}
</style>
