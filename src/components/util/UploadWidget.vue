<template>
<div>
  <div v-show="$refs.upload && $refs.upload.dropActive" class="drop-active">
    <h3>{{ $t('widgetDataUploadLabelDragDrop') }}</h3>
  </div>
  <div class="upload">
    <!-- In the card of the new look of the tables (table-modern.css) -->
    <div class="bt-modern bt-plain">
      <b-table hover
              sticky-header="60vh"
              responsive
              show-empty
              :empty-text="$t('widgetDataUploadLabelDropTable')"
              :items="files"
              :fields="fields"
              class="file-table">
        <template #cell(thumb)="data">
          <img class="td-image-thumb" v-if="data.item.thumb" :src="data.item.thumb" />
          <span v-else>{{ $t('widgetDataUploadLabelNoImage') }}</span>
        </template>
        <template #cell(name)="data">
          <div class="filename">{{ data.item.name }}</div>
          <div class="progress" v-if="data.item.active || data.item.progress !== '0.00'">
            <div :class="{'progress-bar': true, 'progress-bar-striped': true, 'bg-success': data.item.success, 'bg-danger': data.item.error, 'progress-bar-animated': data.item.active}" role="progressbar" :style="{width: data.item.progress + '%'}">{{data.item.progress}}%</div>
          </div>
        </template>
        <template #cell(width)="data">
          {{data.item.width || 'N/A'}}
        </template>
        <template #cell(height)="data">
          {{data.item.height || 'N/A'}}
        </template>
        <template #cell(size)="data">
          {{ getNumberWithSuffix(data.item.size, 1, 1024, ' ') }}
        </template>
        <template #cell(speed)="data">
          <span v-if="data.item.speed">{{getNumberWithSuffix(data.item.speed, 1, 1024, ' ')}}/s</span>
        </template>
        <template #cell(status)="data">
          <b-badge variant="danger" v-if="data.item.error">{{data.item.error}}</b-badge>
          <b-badge variant="success" v-else-if="data.item.success">{{ $t('genericSuccess') }}</b-badge>
          <b-badge variant="info" v-else-if="data.item.active">{{ $t('genericActive') }}</b-badge>
          <span v-else></span>
        </template>
        <template #cell(actions)="data">
          <b-dropdown right>
            <b-dropdown-item :disabled="!data.item.active" @click="data.item.active ? $refs.upload.update(data.item, {error: 'cancel'}) : false">{{ $t('genericCancel') }}</b-dropdown-item>
            <b-dropdown-item v-if="data.item.active" @click="$refs.upload.update(data.item, {active: false})">{{ $t('genericCancel') }}</b-dropdown-item>
            <b-dropdown-item v-else-if="data.item.error && data.item.error !== 'compressing' && data.item.error !== 'image parsing' && $refs.upload.features.html5" @click="$refs.upload.update(data.item, {active: true, error: '', progress: '0.00'})">{{ $t('genericRetry') }}</b-dropdown-item>
            <b-dropdown-item :disabled="data.item.success || data.item.error === 'compressing' || data.item.error === 'image parsing'" v-else @click="data.item.success || data.item.error === 'compressing' || data.item.error === 'image parsing' ? false : $refs.upload.update(data.item, {active: true})">{{ $t('buttonUpload') }}</b-dropdown-item>
            <b-dropdown-divider />
            <b-dropdown-item @click="$refs.upload.remove(data.item)">{{ $t('genericRemove') }}</b-dropdown-item>
          </b-dropdown>
        </template>
      </b-table>
    </div>

    <div>
      <div>
        <!-- Buttons in the look of the custom pages (outlined and rounded; start in green, stop in red) -->
        <file-upload
          class="uw-button mb-3"
          :post-action="postAction"
          :accept="accept"
          :multiple="multiple"
          :thread="thread < 1 ? 1 : (thread > 5 ? 5 : thread)"
          :headers="headers"
          :drop="drop"
          :name="name"
          v-model="files"
          @input-filter="inputFilter"
          @input-file="inputFile"
          ref="upload">
          <i class="fa-solid fa-image" aria-hidden="true" /><span>{{ $t('genericAdd') }}</span>
        </file-upload>
      </div>
      <template v-if="files && files.length > 0">
        <button type="button" class="uw-button is-primary" @click="$refs.upload.active = true" v-if="!$refs.upload || !$refs.upload.active"><i class="fa-solid fa-upload" aria-hidden="true" /> {{ $t('widgetDataUploadLabelStartUpload') }}</button>
        <button type="button" class="uw-button is-danger" @click="$refs.upload.active = false" v-else><i class="fa-solid fa-ban" aria-hidden="true" /> {{ $t('widgetDataUploadLabelStopUpload') }}</button>
      </template>
    </div>
  </div>
</div>
</template>

<script>
import { getNumberWithSuffix } from '@/mixins/formatting'
import { getToken } from '@/mixins/api/base'
import FileUpload from 'vue-upload-component'

export default {
  components: {
    FileUpload
  },
  props: {
    postAction: {
      type: String,
      default: null
    },
    accept: {
      type: String,
      default: null
    },
    name: {
      type: String,
      default: 'file'
    }
  },
  data () {
    return {
      files: [],
      multiple: true,
      drop: true,
      thread: 3,
      headers: {
        Authorization: `Bearer ${getToken()}`
      },
      uploadAuto: false,
      fields: [
        { key: 'thumb', label: this.$t('tableColumnDataUploadThumb') },
        { key: 'name', label: this.$t('tableColumnDataUploadName') },
        { key: 'width', label: this.$t('tableColumnDataUploadWidth') },
        { key: 'height', label: this.$t('tableColumnDataUploadHeight') },
        { key: 'size', label: this.$t('tableColumnDataUploadSize') },
        { key: 'speed', label: this.$t('tableColumnDataUploadSpeed') },
        { key: 'status', label: this.$t('tableColumnDataUploadStatus') },
        { key: 'actions', label: this.$t('tableColumnDataUploadActions') }
      ]
    }
  },
  methods: {
    getNumberWithSuffix,
    clear: function () {
      this.$refs.upload.clear()
    },
    inputFilter (newFile, oldFile, prevent) {
      if (newFile && !oldFile) {
        // Before adding a file
        // Filter system files or hide files
        if (/(\/|^)(Thumbs\.db|desktop\.ini|\..+)$/.test(newFile.name)) {
          return prevent()
        }
        // Filter php html js file
        if (/\.(php5?|html?|jsx?)$/i.test(newFile.name)) {
          return prevent()
        }
      }
      if (newFile && newFile.error === '' && newFile.file && (!oldFile || newFile.file !== oldFile.file)) {
        // Create a blob field
        newFile.blob = ''
        const URL = (window.URL || window.webkitURL)
        if (URL) {
          newFile.blob = URL.createObjectURL(newFile.file)
        }
        // Thumbnails
        newFile.thumb = ''
        if (newFile.blob && newFile.type.substr(0, 6) === 'image/') {
          newFile.thumb = newFile.blob
        }
      }
      // image size
      if (newFile && newFile.error === '' && newFile.type.substr(0, 6) === 'image/' && newFile.blob && (!oldFile || newFile.blob !== oldFile.blob)) {
        newFile.error = this.$t('widgetDataUploadLabelParsingImage')
        const img = new Image()
        img.onload = () => {
          this.$refs.upload.update(newFile, { error: '', height: img.height, width: img.width })
        }
        img.οnerrοr = () => this.$refs.upload.update(newFile, { error: 'parsing image size' })
        img.src = newFile.blob
      }
    },
    // add, update, remove File Event
    inputFile (newFile, oldFile) {
      if (newFile && oldFile) {
        // update
        if (newFile.active && !oldFile.active) {
          // beforeSend
          // min size
          if (newFile.size >= 0 && this.minSize > 0 && newFile.size < this.minSize) {
            this.$refs.upload.update(newFile, { error: 'size' })
          }
        }
        if (newFile.progress !== oldFile.progress) {
          // progress
        }
        if (newFile.error && !oldFile.error) {
          // error
        }
        if (newFile.success && !oldFile.success) {
          // success
        }
      }
      if (!newFile && oldFile) {
        // remove
        if (oldFile.success && oldFile.response.id) {
          // $.ajax({
          //   type: 'DELETE',
          //   url: '/upload/delete?id=' + oldFile.response.id,
          // })
        }
      }
      // Automatically activate upload
      if (Boolean(newFile) !== Boolean(oldFile) || oldFile.error !== newFile.error) {
        if (this.uploadAuto && !this.$refs.upload.active) {
          this.$refs.upload.active = true
        }
      }
    },
    alert (message) {
      alert(message)
    }
  }
}
</script>

<style src="@/assets/table-modern.css"></style>
<style>
/* Buttons in the look of the custom pages (the tokens of the modals and pages, with fallbacks) */
.uw-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  height: 40px;
  padding: 0 1.1rem;
  border: 1px solid var(--cp-border, #e2e3df);
  border-radius: 10px;
  background: var(--cp-surface, #ffffff);
  color: var(--cp-text, #1f2120);
  font: inherit;
  font-size: 0.92rem;
  font-weight: 500;
  cursor: pointer;
}
.uw-button:hover,
.uw-button:focus-within {
  border-color: var(--cp-muted, #6b6f6c);
  background: var(--cp-surface-hover, #fafaf8);
}
/* The add button is also the file input (vue-upload-component: .file-uploads, inline-block): flex like the others,
   the icon and the word centred on one line */
.file-uploads.uw-button {
  display: inline-flex;
  justify-content: center;
  line-height: 1;
  vertical-align: middle;
}
.uw-button .fa-solid {
  font-size: 1rem;
  line-height: 1;
}
/* The file input of the add button covers it: the pointer there too */
.uw-button label {
  cursor: pointer;
}
.uw-button.is-primary {
  border-color: var(--cp-button, #3b6b35);
  background: var(--cp-button, #3b6b35);
  color: var(--cp-on-button, #ffffff);
}
.uw-button.is-primary:hover {
  border-color: var(--cp-button-hover, #2f5a2a);
  background: var(--cp-button-hover, #2f5a2a);
}
.uw-button.is-danger {
  border-color: var(--cp-danger, #c8323f);
  background: var(--cp-danger, #c8323f);
  color: #ffffff;
}
.uw-button.is-danger:hover {
  border-color: var(--cp-danger-hover, #a92733);
  background: var(--cp-danger-hover, #a92733);
}
.file-table {
  min-height: 300px;
}
.td-image-thumb {
  max-width: 4em;
  max-height: 4em;
}
.filename {
  margin-bottom: .3rem
}
.drop-active {
  top: 0;
  bottom: 0;
  right: 0;
  left: 0;
  position: fixed;
  z-index: 9999;
  opacity: .6;
  text-align: center;
  background: #000;
}
.drop-active h3 {
  margin: -.5em 0 0;
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  -webkit-transform: translateY(-50%);
  -ms-transform: translateY(-50%);
  transform: translateY(-50%);
  font-size: 40px;
  color: #fff;
  padding: 0;
}
</style>
