<template>
  <!-- The EXIF data of an image (below its row in the images table): a read-only table, its tools shown but inactive.
       One column per property the image has, one row, each value after its icon (Font Awesome, MDI or the drawing of
       the old EXIF modal) -->
  <BaseTable :columns="columns"
             :options="options"
             :getData="getData"
             :getIds="null"
             toolsLocked
             :autoHideColumns="false"
             :storeUrlParameters="false"
             primary-key="key"
             class="image-exif-details">
    <template v-for="property in properties" v-slot:[`cell(${property.key})`]>
      <span class="ied-value" :key="`ied-${property.key}`">
        <span class="ied-icon">
          <i :class="['fa-solid', property.fa]" aria-hidden="true" v-if="property.fa" />
          <MdiIcon :path="property.mdi" :size="17" v-else-if="property.mdi" />
          <img :src="property.img" alt="" v-else-if="property.img" />
        </span>
        <span>{{ property.value }}</span>
      </span>
    </template>
  </BaseTable>
</template>

<script>
import BaseTable from '@/components/tables/BaseTable'
import MdiIcon from '@/components/icons/MdiIcon'
import { formatDateTime, formatDecimals } from '@/mixins/formatting'
import { mdiCameraIris, mdiFocusField } from '@mdi/js'

export default {
  components: {
    BaseTable,
    MdiIcon
  },
  props: {
    image: {
      type: Object,
      default: null
    }
  },
  data: function () {
    return {
      options: {
        idColumn: 'key',
        tableName: 'imageExif'
      }
    }
  },
  computed: {
    // The properties the image has, with their icon and value
    properties: function () {
      const exif = (this.image && this.image.imageExif) || {}
      const join = (...values) => values.filter(v => v !== null && v !== undefined && `${v}`.trim() !== '').join(' ')
      const dateTime = exif.dateTime || exif.dateTimeOriginal || null
      const hasLocation = exif.gpsLatitude !== null && exif.gpsLatitude !== undefined && exif.gpsLongitude !== null && exif.gpsLongitude !== undefined
      return [
        { key: 'cameraMake', fa: 'fa-camera-retro', text: this.$t('widgetExifCameraMake'), value: exif.cameraMake ? join(exif.cameraMake, exif.cameraModel) : null },
        { key: 'lensMake', img: require('@/assets/img/image-icon-lens.svg'), text: this.$t('widgetExifLensMake'), value: exif.lensMake ? join(exif.lensMake, exif.lensModel) : null },
        { key: 'focalLength', mdi: mdiFocusField, text: this.$t('widgetExifFocalLength'), value: exif.focalLength },
        { key: 'fNumber', mdi: mdiCameraIris, text: this.$t('widgetExifAperture'), value: exif.fNumber },
        { key: 'exposureTime', fa: 'fa-stopwatch', text: this.$t('widgetExifExposure'), value: exif.exposureTime },
        { key: 'isoSpeedRatings', img: require('@/assets/img/image-icon-iso.svg'), text: this.$t('widgetExifIso'), value: exif.isoSpeedRatings },
        { key: 'flash', fa: 'fa-bolt-lightning', text: this.$t('widgetExifFlash'), value: exif.flash },
        { key: 'gps', img: require('@/assets/img/image-icon-gps.svg'), text: this.$t('widgetExifLocation'), value: hasLocation ? `${formatDecimals(exif.gpsLatitude, 4, 4)}, ${formatDecimals(exif.gpsLongitude, 4, 4)}${exif.gpsAltitude ? ` · ${exif.gpsAltitude} m` : ''}` : null },
        { key: 'dateTime', fa: 'fa-calendar-days', text: this.$t('widgetExifDateTime'), value: dateTime ? formatDateTime(dateTime, true) : null }
      ].filter(p => p.value !== null && p.value !== undefined && `${p.value}`.trim() !== '')
    },
    columns: function () {
      return this.properties.map(p => ({
        key: p.key,
        type: String,
        sortable: false,
        label: p.text
      }))
    }
  },
  methods: {
    // One row: the values of the properties
    getData: function (request) {
      request.page = 0
      const row = { key: 'exif' }
      this.properties.forEach(p => { row[p.key] = p.value })
      return Promise.resolve({ data: { data: [row], count: 1 } })
    }
  }
}
</script>

<style scoped>
.ied-value {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  white-space: nowrap;
}
/* The icons: small, black (light grey in dark mode), whatever the colours of the drawings */
.ied-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 16px;
  color: #000000;
  font-size: 0.9rem;
}
.ied-icon img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  filter: brightness(0);
}
body.dark-mode .ied-icon {
  color: #e8e6e3;
}
body.dark-mode .ied-icon img {
  filter: brightness(0) invert(0.9);
}
</style>
