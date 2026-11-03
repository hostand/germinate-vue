<template>
  <!-- In the look of the new pages (custom-page): the images like those of the germplasm page (cards, 8 per page), the
       font of the new pages and rounded buttons -->
  <b-modal
    ref="carouselEditModal"
    size="xl"
    :title="$t('modalTitleEditCarousel')"
    header-class="custom-page"
    title-class="carousel-edit-modal-title"
    dialog-class="carousel-edit-modal"
    scrollable>
    <div class="custom-page carousel-edit" v-if="loaded">
      <!-- The images (the same for every language), in their order (drag them), each with its description in English and
           in the other languages ticked below. A description is "#Title##Text" (HTML allowed): the title and text of the
           home page. -->
      <section class="ce-block">
        <div class="ce-block-header">
          <h3 class="ce-block-title">Images</h3>
          <span class="ce-block-hint" v-if="images.length > 1">Drag an image to change its place</span>
        </div>

        <template v-if="images.length > 0">
          <draggable v-model="pageImages" class="ce-grid" handle=".ce-thumb">
            <div class="ce-card" v-for="(image, index) in pageImages" :key="`carousel-image-${image.name}`">
              <div class="ce-thumb" title="Drag to change its place">
                <img :src="getImage(image.name)" :alt="`Image ${pageStart + index + 1}`" />
              </div>
              <!-- Its place in the carousel -->
              <span class="ce-order">{{ pageStart + index + 1 }}</span>
              <button type="button" class="ce-delete" @click="deleteImage(image.name)" :title="$t('buttonDelete')" :aria-label="$t('buttonDelete')">
                <MdiIcon :path="mdiDelete" :size="16" />
              </button>
              <div class="ce-card-body">
                <div class="ce-text" v-for="locale in shownLocales" :key="`carousel-text-${image.name}-${locale.locale}`">
                  <i :class="`fi fi-${locale.flag} ce-flag`" :title="locale.name" />
                  <textarea v-model="texts[locale.locale][image.name]" rows="2" class="ce-textarea" placeholder="#Title##Text (HTML allowed)" :aria-label="`Description (${locale.name})`" />
                </div>
              </div>
            </div>
          </draggable>

          <!-- Pagination, 8 images per page (like the images of the germplasm page) -->
          <nav class="ce-pager" v-if="pageCount > 1" aria-label="Image pages">
            <button type="button" class="ce-pager-button" :disabled="page <= 1" @click="page--" aria-label="Previous page">
              <MdiIcon :path="mdiChevronLeft" :size="20" />
            </button>
            <button type="button"
                    v-for="p in pageCount"
                    :key="'ce-page-' + p"
                    :class="['ce-pager-button', { active: p === page }]"
                    :aria-current="p === page ? 'page' : null"
                    @click="page = p">
              {{ p }}
            </button>
            <button type="button" class="ce-pager-button" :disabled="page >= pageCount" @click="page++" aria-label="Next page">
              <MdiIcon :path="mdiChevronRight" :size="20" />
            </button>
          </nav>
        </template>
        <div class="ce-empty" v-else>
          <MdiIcon :path="mdiImageOffOutline" :size="36" />
          <p>No images yet: the home page shows its texts only.</p>
        </div>
      </section>

      <!-- The languages of the descriptions: English always, the others ticked (already ticked when their file on the
           server has the texts) -->
      <section class="ce-block">
        <div class="ce-block-header">
          <h3 class="ce-block-title">Descriptions in</h3>
        </div>
        <div class="ce-locales">
          <b-form-checkbox v-for="locale in locales"
                           :key="`carousel-locale-${locale.locale}`"
                           :checked="selectedLocales.includes(locale.locale)"
                           :disabled="locale.locale === DEFAULT_LOCALE"
                           @change="toggleLocale(locale.locale, $event)">
            <i :class="`fi fi-${locale.flag} ce-flag`" /> {{ locale.name }}
          </b-form-checkbox>
        </div>
      </section>

      <!-- A new image: in every language, at the end -->
      <section class="ce-block">
        <div class="ce-block-header">
          <h3 class="ce-block-title">{{ $t('formLabelCarouselImageAdd') }}</h3>
        </div>
        <div class="ce-upload">
          <b-form-file id="image-file" accept=".jpeg, .png, .jpg" v-model="imageFile" class="ce-file" />
          <button type="button" class="ce-button ce-button-save" @click="uploadImage" :disabled="!imageFile || uploading">
            <MdiIcon :path="mdiFileImagePlusOutline" :size="16" /> {{ $t('buttonUpload') }}
          </button>
        </div>
      </section>
    </div>
    <div class="custom-page carousel-edit ce-loading" v-else>
      <b-spinner small /> Loading ...
    </div>

    <!-- Update (saves the images and their descriptions), then Cancel -->
    <template #modal-footer>
      <div class="custom-page ce-footer">
        <button type="button" class="ce-button ce-button-save" :disabled="!canContinue || saving" @click="okPressed">
          <MdiIcon :path="saving ? mdiReload : mdiContentSave" :size="16" :className="saving ? 'ce-spin' : ''" />
          {{ saving ? 'Saving ...' : $t('buttonUpdate') }}
        </button>
        <button type="button" class="ce-button" :disabled="saving" @click="hide">
          <MdiIcon :path="mdiClose" :size="16" /> {{ $t('buttonCancel') }}
        </button>
      </div>
    </template>
  </b-modal>
</template>

<script>
import MdiIcon from '@/components/icons/MdiIcon'

import draggable from 'vuedraggable'

import { mapGetters } from 'vuex'
import { apiGetLocales, apiGetLocaleFile, apiGetTemplateCarouselConfig, apiDeleteTemplateImageByName, apiPostCarouselImage, apiPostTemplateCarouselConfig, apiPatchTemplateI18n } from '@/mixins/api/misc'
import { i18n } from '@/plugins/i18n'
import { parseHeroText } from '@/mixins/hero-text'

import { getImageUrl } from '@/mixins/image'

import { mdiDelete, mdiFileImagePlusOutline, mdiChevronLeft, mdiChevronRight, mdiContentSave, mdiReload, mdiClose, mdiImageOffOutline } from '@mdi/js'

// Always shown and saved: the texts of the home page are in English when a language doesn't translate them
const DEFAULT_LOCALE = 'en_GB'
// The key of the language files with the descriptions of all the images: "#Title 1##Text 1#Title 2##Text 2..."
const HERO_TEXT_KEY = 'homeHeroText'
// Without images (carousel turned off): the value of the key in every language, to be written there
const HERO_TEXT_PLACEHOLDER = '#Hero Title##Hero Paragraph'
// Like the images of the germplasm page
const IMAGES_PER_PAGE = 8

// "#Title 1##Text 1#Title 2##Text 2..." as one description ("#Title##Text", HTML kept) per image, in their order
const splitHeroText = value => parseHeroText(value).map(entry => entry.raw === '#' ? '' : entry.raw)

export default {
  components: {
    draggable,
    MdiIcon
  },
  data: function () {
    return {
      DEFAULT_LOCALE,
      mdiFileImagePlusOutline,
      mdiDelete,
      mdiChevronLeft,
      mdiChevronRight,
      mdiContentSave,
      mdiReload,
      mdiClose,
      mdiImageOffOutline,
      loaded: false,
      saving: false,
      uploading: false,
      imageFile: null,
      page: 1,
      // The languages of the server (locales.json), with their flag
      locales: [{ locale: DEFAULT_LOCALE, name: 'English', flag: 'gb' }],
      // Those whose descriptions are shown (and saved)
      selectedLocales: [DEFAULT_LOCALE],
      // The images, in their order: [{ name }]
      images: [],
      // The descriptions: { locale: { imageName: "#Title##Text" } }
      texts: {},
      // "homeHeroText" of the language files of the server: { locale: [descriptions] } (null: no key, or no file)
      fileTexts: {},
      // The carousel configuration as read ({ locale: [{ name, text }] })
      settings: null
    }
  },
  computed: {
    ...mapGetters([
      'storeToken'
    ]),
    canContinue: function () {
      return this.settings !== null || this.images.length > 0
    },
    // English first, then the languages ticked
    shownLocales: function () {
      return this.locales.filter(locale => this.selectedLocales.includes(locale.locale))
    },
    pageCount: function () {
      return Math.max(1, Math.ceil(this.images.length / IMAGES_PER_PAGE))
    },
    pageStart: function () {
      return (this.page - 1) * IMAGES_PER_PAGE
    },
    // The images of the page; dragging them changes their place in the whole list
    pageImages: {
      get: function () {
        return this.images.slice(this.pageStart, this.pageStart + IMAGES_PER_PAGE)
      },
      set: function (value) {
        const images = this.images.concat()
        images.splice(this.pageStart, value.length, ...value)
        this.images = images
      }
    }
  },
  watch: {
    // Fewer pages (an image deleted): the last one
    pageCount: function (count) {
      if (this.page > count) {
        this.page = count
      }
    }
  },
  methods: {
    okPressed: function () {
      this.saving = true
      // Every language of the server gets the same images; its descriptions are those shown, or what it had
      const settings = {}
      this.locales.forEach(locale => {
        settings[locale.locale] = this.images.map(image => ({ name: image.name, text: this.getText(locale.locale, image.name) }))
      })
      apiPostTemplateCarouselConfig(settings, () => {
        this.saveHeroTexts(() => {
          this.saving = false
          this.$emit('change')
          this.hide()
        })
      }, {
        codes: [],
        callback: () => {
          this.saving = false
        }
      })
    },
    // The description of an image in a language: typed here, else the one of the configuration
    getText: function (locale, name) {
      if (this.texts[locale] && this.texts[locale][name] !== undefined) {
        return this.texts[locale][name]
      }
      const saved = this.settings && this.settings[locale] ? this.settings[locale].find(image => image && image.name === name) : null
      return saved && saved.text ? saved.text : ''
    },
    // "homeHeroText" of each language shown, in its file on the server (the key is added when missing, its value
    // replaced otherwise). No images left: the placeholder in every language.
    saveHeroTexts: function (done) {
      const failed = []
      const noImages = this.images.length === 0
      const locales = noImages ? this.locales : this.shownLocales
      const save = index => {
        if (index >= locales.length) {
          if (failed.length > 0) {
            this.$bvToast.toast(`The images were saved, but not the descriptions in: ${failed.join(', ')}. The server could not update the language file (missing, or not valid JSON for it, e.g. a key defined twice).`, {
              title: this.$t('modalTitleEditCarousel'),
              variant: 'warning',
              solid: true
            })
          }
          done()
          return
        }
        const locale = locales[index]
        const value = noImages
          ? HERO_TEXT_PLACEHOLDER
          : this.images.map(image => {
            const description = (this.texts[locale.locale][image.name] || '').trim()
            return description.startsWith('#') ? description : `#${description}`
          }).join('')
        apiPatchTemplateI18n({ [HERO_TEXT_KEY]: value }, locale.locale, () => {
          // Shown at once (the files of the server are only read when the page loads)
          i18n.mergeLocaleMessage(locale.locale, { [HERO_TEXT_KEY]: value })
          this.$set(this.fileTexts, locale.locale, splitHeroText(value))
          save(index + 1)
        }, {
          codes: [],
          callback: () => {
            failed.push(locale.name)
            save(index + 1)
          }
        })
      }
      save(0)
    },
    // A language ticked: its descriptions open under the others
    toggleLocale: function (locale, checked) {
      if (locale === DEFAULT_LOCALE) {
        return
      }
      if (checked) {
        this.fillTexts(locale)
        this.selectedLocales = this.locales.map(l => l.locale).filter(l => l === locale || this.selectedLocales.includes(l))
      } else {
        this.selectedLocales = this.selectedLocales.filter(l => l !== locale)
      }
    },
    // "homeHeroText" of the file of every language on the server; those that have it are ticked
    loadLocaleTexts: function (done) {
      let pending = this.locales.length
      const finished = () => {
        pending--
        if (pending === 0) {
          this.selectedLocales = this.locales.map(l => l.locale).filter(l => l === DEFAULT_LOCALE || (this.fileTexts[l] && this.fileTexts[l].length > 0))
          done()
        }
      }
      this.locales.forEach(({ locale }) => {
        apiGetLocaleFile(locale, result => {
          const messages = typeof result === 'string' ? JSON.parse(result) : result
          this.$set(this.fileTexts, locale, messages && messages[HERO_TEXT_KEY] ? splitHeroText(messages[HERO_TEXT_KEY]) : null)
          finished()
        }, {
          codes: [],
          // No file: the descriptions of the configuration
          callback: () => {
            this.$set(this.fileTexts, locale, null)
            finished()
          }
        })
      })
    },
    // The descriptions of a language for the images without one yet: from "homeHeroText" of its file (by position),
    // else from the configuration
    fillTexts: function (locale) {
      if (!this.texts[locale]) {
        this.$set(this.texts, locale, {})
      }
      const fromFile = this.fileTexts[locale]
      this.images.forEach((image, index) => {
        if (this.texts[locale][image.name] === undefined) {
          const saved = this.settings && this.settings[locale] ? this.settings[locale].find(i => i && i.name === image.name) : null
          const text = (fromFile && fromFile[index] !== undefined) ? fromFile[index] : (saved && saved.text ? saved.text : '')
          this.$set(this.texts[locale], image.name, text)
        }
      })
    },
    uploadImage: function () {
      if (this.imageFile) {
        // Into the languages the configuration already has (the server fails on one it lacks); without a configuration
        // yet, into all of them. Update gives the same images to every language.
        const formData = new FormData()
        const locales = this.settings ? Object.keys(this.settings) : this.locales.map(l => l.locale)
        locales.forEach(locale => formData.append('locales', locale))
        formData.append('imageFile', this.imageFile)

        this.uploading = true
        apiPostCarouselImage(formData, () => {
          this.imageFile = null
          this.uploading = false
          // The new image is the last one: its page
          this.update(() => { this.page = this.pageCount })
        }, {
          codes: [],
          callback: () => {
            this.uploading = false
          }
        })
      }
    },
    deleteImage: function (name) {
      this.$bvModal.msgBoxConfirm(this.$t('modalTitleSure'), {
        okTitle: this.$t('buttonDelete'),
        okVariant: 'danger',
        cancelTitle: this.$t('buttonCancel')
      })
        .then(value => {
          if (value === true) {
            apiDeleteTemplateImageByName(name, () => {
              this.update(() => {
                // The last one: the carousel is turned off, the texts become the placeholder
                if (this.images.length === 0) {
                  this.saveHeroTexts(() => this.$emit('change'))
                }
              })
            })
          }
        })
    },
    getImage: function (name) {
      return getImageUrl(name, {
        name: name,
        token: this.storeToken ? this.storeToken.imageToken : null,
        type: 'template',
        size: 'large'
      })
    },
    // The configuration of the carousel; the descriptions typed so far are kept (an image uploaded or deleted)
    update: function (onLoaded) {
      const done = result => {
        this.settings = result || null
        // The images: those of English (else of any language), in their order
        const list = (result && (result[DEFAULT_LOCALE] || result[Object.keys(result)[0]])) || []
        const names = new Set()
        this.images = list.filter(image => image && image.name && !names.has(image.name) && names.add(image.name)).map(image => ({ name: image.name }))
        this.locales.forEach(({ locale }) => this.fillTexts(locale))
        if (onLoaded) {
          onLoaded()
        }
      }
      apiGetTemplateCarouselConfig(done, {
        codes: [404],
        // No carousel file yet
        callback: () => done(null)
      })
    },
    show: function () {
      this.imageFile = null
      this.loaded = false
      this.saving = false
      this.uploading = false
      this.page = 1
      this.selectedLocales = [DEFAULT_LOCALE]
      this.texts = {}
      this.fileTexts = {}
      this.settings = null
      this.images = []
      this.$refs.carouselEditModal.show()
      // The languages, the texts of their files, then the images with their descriptions
      const load = () => this.loadLocaleTexts(() => this.update(() => { this.loaded = true }))
      apiGetLocales(result => {
        if (result && result.length > 0) {
          this.locales = result
        }
        load()
      }, {
        codes: [],
        callback: load
      })
    },
    hide: function () {
      this.$refs.carouselEditModal.hide()
    }
  }
}
</script>

<style src="@/assets/custom-page.css"></style>
<style>
/* Wider than the xl modals, within the window */
.carousel-edit-modal {
  max-width: min(1500px, 96vw);
}
/* Title in the font of the custom pages (the header has the custom-page class) */
.carousel-edit-modal-title {
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--cp-text);
}
.carousel-edit-modal .modal-body {
  padding: 1rem 1.5rem;
}
</style>
<style scoped>
.carousel-edit {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.ce-loading {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem 0;
  color: var(--cp-muted);
}

/* Blocks: images, languages, new image */
.ce-block {
  padding: 1.1rem 1.25rem 1.25rem;
  border: 1px solid var(--cp-border);
  border-radius: 12px;
  background: var(--cp-surface);
}
.ce-block-header {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.ce-block-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--cp-text);
}
.ce-block-hint {
  font-size: 0.85rem;
  color: var(--cp-muted);
}

/* The images: four per row, like the images of the germplasm page */
.ce-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1.25rem;
}
.ce-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--cp-border);
  border-radius: 12px;
  background: var(--cp-surface);
  overflow: hidden;
}
.ce-thumb {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: var(--cp-neutral-bg);
  overflow: hidden;
  cursor: move;
}
.ce-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s;
}
.ce-thumb:hover img {
  transform: scale(1.03);
}
.ce-order {
  position: absolute;
  top: 0.6rem;
  left: 0.6rem;
  min-width: 1.6rem;
  padding: 0.1rem 0.55rem;
  border-radius: 999px;
  background: var(--cp-button);
  color: var(--cp-on-button);
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
}
.ce-delete {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #ffffff;
  cursor: pointer;
  transition: background 0.15s;
}
.ce-delete:hover {
  background: #dc3545;
}
.ce-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.85rem 0.9rem 0.95rem;
}
/* A description per language shown, its flag on the left */
.ce-text {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}
.ce-flag {
  flex-shrink: 0;
  border-radius: 2px;
}
.ce-text .ce-flag {
  margin-top: 0.55rem;
}
.ce-textarea {
  flex: 1;
  min-width: 0;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--cp-border);
  border-radius: 8px;
  background: var(--cp-surface);
  color: var(--cp-text);
  font: inherit;
  font-size: 0.85rem;
  resize: vertical;
}
.ce-textarea:focus {
  outline: none;
  border-color: var(--cp-green);
}
.ce-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem 1rem;
  border: 1px dashed var(--cp-border);
  border-radius: 12px;
  color: var(--cp-muted);
  text-align: center;
}
.ce-empty p {
  margin: 0;
}

/* Pagination, like that of the images of the germplasm page */
.ce-pager {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 1.5rem;
}
.ce-pager-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0 0.6rem;
  border: 1px solid var(--cp-border);
  border-radius: 8px;
  background: var(--cp-surface);
  color: var(--cp-text);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}
.ce-pager-button:hover:not(:disabled):not(.active) {
  background: var(--cp-surface-hover);
  border-color: var(--cp-green);
}
.ce-pager-button.active {
  background: var(--cp-green-soft);
  border-color: var(--cp-green);
  color: var(--cp-green);
  font-weight: 600;
}
.ce-pager-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Languages */
.ce-locales {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.75rem;
}

/* New image */
.ce-upload {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
.ce-file {
  flex: 1 1 320px;
  max-width: 560px;
}
.ce-file >>> .custom-file-label,
.ce-file >>> .custom-file-label::after {
  border-radius: 8px;
}

/* Rounded buttons of the passport page (like those of Add Germplasm) */
.ce-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  width: 100%;
  margin: 0;
}
.ce-button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.9rem;
  border: 1px solid var(--cp-border);
  border-radius: 8px;
  background: var(--cp-surface);
  color: var(--cp-text);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.ce-button:hover:not(:disabled) {
  background: var(--cp-surface-hover);
  border-color: var(--cp-green);
}
.ce-button.ce-button-save {
  border-color: var(--cp-green);
  background: var(--cp-green-soft);
  color: var(--cp-green);
}
.ce-button.ce-button-save:hover:not(:disabled) {
  background: var(--cp-green);
  color: var(--cp-on-button);
}
.ce-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.ce-spin {
  animation: ce-spin 1s linear infinite;
}
@keyframes ce-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Four images per row, fewer on small screens */
@media (max-width: 1199px) {
  .ce-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 767px) {
  .ce-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 479px) {
  .ce-grid {
    grid-template-columns: 1fr;
  }
}
</style>
