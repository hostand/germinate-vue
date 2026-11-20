<template>
  <div class="image-table">
    <CoolLightBox
      :items="coolboxImages"
      :index="coolboxIndex"
      effect="fade"
      @close="coolboxIndex = null" />
    <BaseTable :options="options"
               :columns="columns"
               v-bind="$props"
               ref="table"
               v-on="$listeners">
      <!-- Reference table -->
      <template v-slot:cell(imageRefTable)="data">
        <b-badge class="bt-chip" :style="{ '--bt-chip-color': imageTypes[data.item.imageRefTable].color() }"><MdiIcon :path="imageTypes[data.item.imageRefTable].path" /> {{ imageTypes[data.item.imageRefTable].text() }}</b-badge>
      </template>
      <!-- Image -->
      <!-- New look: an image button opening it large; the old look: the thumbnail -->
      <template v-slot:cell(image)="data">
        <button type="button" class="it-open" @click="update(data.item)" v-b-tooltip.hover :title="$t('tableTooltipImageOpen')" :aria-label="$t('tableTooltipImageOpen')" v-if="modernLook">
          <i class="fa-solid fa-image" aria-hidden="true" />
        </button>
        <a :href="getSrc(data.item, 'large')" @click.prevent="update(data.item)" v-else>
          <b-img-lazy :src="getSrc(data.item, 'small')" class="table-image" alt="Image" />
        </a>
      </template>
      <!-- EXIF -->
      <!-- The EXIF data in a table below the row (new look); the modal in the old look -->
      <template v-slot:cell(imageExif)="data">
        <template v-if="hasExif(data.item)">
          <button type="button"
                  :class="['it-exif-toggle', { open: data.item._showDetails === true }]"
                  @click="toggleExif(data.item)"
                  :aria-expanded="data.item._showDetails === true ? 'true' : 'false'"
                  v-b-tooltip.hover
                  :title="$t('tableTooltipImageExifShow')"
                  :aria-label="$t('tableTooltipImageExifShow')"
                  v-if="modernLook">
            <i class="fa-solid fa-camera-retro" aria-hidden="true" />
            <i class="fa-solid fa-chevron-down it-exif-chevron" aria-hidden="true" />
          </button>
          <b-button @click="showImageExif(data.item)" v-else><MdiIcon :path="mdiImageText" /> {{ $t('buttonShow') }}</b-button>
        </template>
      </template>
      <!-- Show whether it's a trait reference image. -->
      <template v-slot:cell(imageIsReference)="data">
        <span :class="['it-reference', { active: data.item.imageIsReference === true }]" v-b-tooltip.hover :title="$t('tableTooltipImagesIsReference')" v-if="modernLook">
          <i class="fa-solid fa-thumbtack" aria-hidden="true" />
        </span>
        <span v-else-if="data.item.imageIsReference === true" class="text-nowrap text-primary" v-b-tooltip.hover :title="$t('tableTooltipImagesIsReference')"><MdiIcon :path="mdiBookInformationVariant"/> <span> {{ data.item.collaborators }}</span></span>
        <MdiIcon :path="mdiBookInformationVariant" className="text-muted" v-else />
      </template>
      <!-- Reference name -->
      <template v-slot:cell(referenceName)="data">
        <!-- Germplasm: the passport icon (its preview) before the name (new look) -->
        <GermplasmNameCell :germplasmId="data.item.imageForeignId" :name="data.item.referenceName" v-if="data.item.imageRefTable === 'germinatebase' && modernLook" />
        <router-link :to="{ name: Pages.passport, params: { germplasmId: data.item.imageForeignId } }" v-else-if="data.item.imageRefTable === 'germinatebase'">{{ data.item.referenceName }}</router-link>
        <!-- Trait -->
        <router-link :to="{ name: Pages.traitDetails, params: { traitId: data.item.imageForeignId } }" v-else-if="data.item.imageRefTable === 'phenotypes'">{{ data.item.referenceName }}</router-link>
        <!-- Anything else -->
        <span v-else>{{ data.item.referenceName }}</span>
      </template>
      <!-- Tags -->
      <template v-slot:cell(tags)="data">
        <div v-if="data.item.tags">
          <b-badge v-for="(tag, index) in data.item.tags" :key="`image-tag-${data.item.imageId}-${index}`" class="mr-1 bt-chip" href="#" @click.native.prevent="$emit('tag-clicked', tag)" :style="{ '--bt-chip-color': getTagColor(tag) }">
            {{ tag.tagName }}
          </b-badge>
        </div>
      </template>
      <!-- The EXIF data of the image -->
      <template v-slot:row-details="data">
        <div class="it-details">
          <ImageExifDetails :image="data.item" />
        </div>
      </template>
    </BaseTable>

    <ImageExifModal :image="selectedImage" ref="imageExifModal" v-if="selectedImage" @hidden="() => { selectedImage = null }" />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

import MdiIcon from '@/components/icons/MdiIcon'
import CoolLightBox from 'vue-cool-lightbox'
import 'vue-cool-lightbox/dist/vue-cool-lightbox.min.css'
import BaseTable from '@/components/tables/BaseTable'
import ImageExifModal from '@/components/modals/ImageExifModal'
import ImageExifDetails from '@/components/tables/details/ImageExifDetails'
import GermplasmNameCell from '@/components/germplasm/GermplasmNameCell'
import defaultProps from '@/const/table-props'
import { imageTypes } from '@/mixins/types'
import { getHighContrastTextColor } from '@/mixins/colors'
import { getImageUrl } from '@/mixins/image'
import { Pages } from '@/mixins/pages'

import { mdiBookInformationVariant, mdiImageText } from '@mdi/js'
import { formatDateTime } from '@/mixins/formatting'

export default {
  name: 'ImageTable',
  props: {
    ...defaultProps.BASE,
    ...defaultProps.DOWNLOAD
  },
  data: function () {
    return {
      Pages,
      imageTypes,
      mdiImageText,
      mdiBookInformationVariant,
      options: {
        idColumn: 'imageId',
        tableName: 'images'
      },
      selectedImage: null,
      tags: [],
      coolboxIndex: null,
      coolboxImages: []
    }
  },
  computed: {
    ...mapGetters([
      'storeToken',
      'storeServerSettings'
    ]),
    columns: function () {
      return [
        {
          key: 'imageId',
          type: Number,
          sortable: true,
          class: 'text-right',
          label: this.$t('tableColumnImageId')
        }, {
          key: 'referenceName',
          type: String,
          sortable: true,
          label: this.$t('tableColumnImageReferenceName'),
          preferredSortingColumn: true
        }, {
          key: 'imageRefTable',
          type: String,
          sortable: true,
          label: this.$t('tableColumnImageReferenceTable')
        }, {
          key: 'imageDescription',
          type: String,
          sortable: true,
          label: this.$t('tableColumnImageDescription')
        }, {
          key: 'imageIsReference',
          type: Boolean,
          sortable: true,
          label: this.$t('tableColumnImageIsReference')
        }, {
          key: 'imagePath',
          type: String,
          sortable: true,
          defaultHidden: true,
          label: this.$t('tableColumnImagePath')
        }, {
          key: 'imageExif',
          type: 'json',
          sortable: false,
          label: this.$t('tableColumnImageExif')
        }, {
          key: 'tags',
          type: 'json',
          sortable: false,
          label: this.$t('tableColumnImageTags')
        }, {
          key: 'createdOn',
          type: Date,
          sortable: true,
          label: this.$t('tableColumnImageCreatedOn'),
          formatter: value => formatDateTime(value)
        }, {
          key: 'image',
          type: undefined,
          sortable: false,
          class: this.modernLook ? 'text-center' : 'p-0',
          label: ''
        }
      ]
    }
  },
  components: {
    BaseTable,
    CoolLightBox,
    MdiIcon,
    ImageExifModal,
    ImageExifDetails,
    GermplasmNameCell
  },
  methods: {
    getHighContrastTextColor,
    hasExif: function (image) {
      return !!image.imageExif && Object.keys(image.imageExif).length > 0
    },
    // The EXIF data below the row; one row open at a time
    toggleExif: function (item) {
      const shown = item._showDetails === true
      const table = this.$refs.table
      ;((table && table.pageItems) || []).forEach(other => {
        if (other !== item && other._showDetails) {
          this.$set(other, '_showDetails', false)
        }
      })
      this.$set(item, '_showDetails', !shown)
    },
    showImageExif: function (image) {
      this.selectedImage = image
      this.$nextTick(() => this.$refs.imageExifModal.show())
    },
    getTextColor: function (tag) {
      const color = this.getTagColor(tag)

      return getHighContrastTextColor(color)
    },
    getTagColor: function (tag) {
      let index = this.tags.indexOf(tag.tagName)
      if (index === -1) {
        this.tags.push(tag.tagName)
        index = this.tags.length
      }

      return this.storeServerSettings.colorsTemplate[index % this.storeServerSettings.colorsTemplate.length]
    },
    getSrc: function (image, size) {
      return getImageUrl(image.imagePath, {
        name: image.imagePath,
        type: 'database',
        size: size,
        token: this.storeToken ? this.storeToken.imageToken : ''
      })
    },
    update: function (i) {
      this.coolboxImages = [{
        src: this.getSrc(i, 'large'),
        title: i.imageDescription
      }]
      this.coolboxIndex = 0
    },
    refresh: function () {
      this.$refs.table.refresh()
    }
  }
}
</script>

<style>
/* New look: the EXIF button (camera and chevron), the reference image pin, the EXIF table below the row */
.image-table .it-exif-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  height: 30px;
  padding: 0 0.6rem;
  border: 1px solid var(--bt-border);
  border-radius: 8px;
  background: var(--bt-surface);
  color: var(--bt-icon);
  cursor: pointer;
}
.image-table .it-exif-toggle:hover,
.image-table .it-exif-toggle.open {
  border-color: var(--bt-accent);
  color: var(--bt-accent);
}
.image-table .it-exif-chevron {
  font-size: 0.65rem;
  transition: transform 0.15s ease;
}
.image-table .it-exif-toggle.open .it-exif-chevron {
  transform: rotate(180deg);
}
.image-table .it-open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 30px;
  border: 1px solid var(--bt-border);
  border-radius: 8px;
  background: var(--bt-surface);
  color: var(--bt-icon);
  font-size: 1rem;
  cursor: pointer;
}
.image-table .it-open:hover {
  border-color: var(--bt-accent);
  color: var(--bt-accent);
}
.image-table .it-reference {
  color: var(--bt-icon);
  font-size: 1rem;
  opacity: 0.2;
}
.image-table .it-reference.active {
  color: var(--bt-accent);
  opacity: 1;
}
.image-table .it-details {
  padding: 0.75rem 1rem;
}
</style>

<style scoped>
.table-image {
  min-width: 200px;
  width: 100%;
  height: 200px;
  object-fit: cover;
}
</style>
