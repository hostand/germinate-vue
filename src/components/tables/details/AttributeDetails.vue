<template>
  <div>
    <template v-if="dataset">
      <!-- Heading in the new look (no block around it: it is inside the row of a table): the icon in a square, the title
           and the text below it -->
      <header class="ad-head">
        <span class="ad-icon" aria-hidden="true"><i class="fa-solid fa-ellipsis-vertical" /></span>
        <div>
          <h3 class="ad-title">{{ $t('modalTitleDatasetAttributes') }}</h3>
          <p class="ad-text">{{ $t('modalTextDatasetAttributes') }}</p>
        </div>
      </header>
      <!-- Dataset attribute table -->
      <DatasetAttributeTable :getData="getAttributeData" :downloadTable="downloadAttributes" />
    </template>
    <!-- Dublin core -->
    <div v-if="dataset && dataset.dublinCore" class="ad-section">
      <header class="ad-head">
        <span class="ad-icon" aria-hidden="true"><DublinCoreIcon /></span>
        <div>
          <h3 class="ad-title">{{ $t('modalTitleDatasetDublinCore') }}</h3>
          <p class="ad-text">{{ $t('modalTextDatasetDublinCore') }}</p>
        </div>
      </header>
      <!-- The Dublin Core in the look of the tables (a fixed list: its tools shown but disabled); the language with the
           flag of its country; the download of all of it (JSON) below -->
      <div class="base-table bt-modern dc-table">
        <div class="bt-toolbar">
          <div class="bt-tools">
            <button type="button" class="bt-tool" disabled :aria-label="$t('tooltipTableHelp')"><i class="fa-solid fa-circle-question" aria-hidden="true" /></button>
            <span class="bt-tools-separator" aria-hidden="true" />
            <button type="button" class="btn bt-select" disabled :aria-label="$t('tooltipTableColumnSelector')"><i class="fa-solid fa-table-columns" aria-hidden="true" /> <i class="fa-solid fa-chevron-down" aria-hidden="true" /></button>
            <button type="button" class="bt-tool" disabled :aria-label="$t('tooltipTableFilter')"><i class="fa-solid fa-filter" aria-hidden="true" /></button>
          </div>
          <div class="bt-toolbar-end">
            <span class="bt-count">{{ $tc('paginationCountCustom', 1, { from: 1, to: 1, count: 1 }) }}</span>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table b-table">
            <!-- One record: the fields as the columns, their values on the row -->
            <thead>
              <tr>
                <th class="text-nowrap" v-for="row in dublinCoreRows" :key="`dublin-core-head-${row.key}`">{{ row.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td v-for="row in dublinCoreRows" :key="`dublin-core-${row.key}`">
                  <template v-if="row.key === 'language'">
                    <span class="dc-language text-nowrap" v-for="(language, index) in row.values" :key="`dublin-core-language-${index}`">
                      <i :class="`fi fi-${getLanguageFlag(language)}`" v-if="getLanguageFlag(language)" /> {{ getLanguageName(language) }}
                    </span>
                  </template>
                  <template v-else>{{ row.values.join(', ') }}</template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="bt-footer">
          <div class="bt-footer-start">
            <a class="bt-tool" :href="href" :download="`dataset-${dataset.datasetId}-dublin-core.json`" v-b-tooltip.hover.bottom :title="$t('buttonDownload')" :aria-label="$t('buttonDownload')">
              <i class="fa-solid fa-download" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import DatasetAttributeTable from '@/components/tables/DatasetAttributeTable'
import DublinCoreIcon from '@/components/icons/DublinCoreIcon'
import { apiPostDatasetAttributeTableExport, apiPostDatasetAttributeTable } from '@/mixins/api/dataset.js'

// The fields of the Dublin Core, in their order
const DUBLIN_CORE_FIELDS = ['title', 'creator', 'subject', 'description', 'publisher', 'contributor', 'date', 'type', 'format', 'identifier', 'source', 'language', 'relation', 'coverage', 'rights']
// Languages (ISO 639-2, as the Dublin Core gives them; both forms where there are two): "code:flag country:ISO 639-1"
// (the two-letter code for their names in the language of the page)
const LANGUAGES = {}
;[
  'eng:gb:en por:pt:pt spa:es:es deu:de:de ger:de:de fra:fr:fr fre:fr:fr ita:it:it nld:nl:nl dut:nl:nl',
  'hun:hu:hu dan:dk:da swe:se:sv nor:no:no nob:no:nb nno:no:nn fin:fi:fi isl:is:is ice:is:is pol:pl:pl',
  'ces:cz:cs cze:cz:cs slk:sk:sk slo:sk:sk slv:si:sl hrv:hr:hr srp:rs:sr bos:ba:bs bul:bg:bg ron:ro:ro',
  'rum:ro:ro ell:gr:el gre:gr:el est:ee:et lav:lv:lv lit:lt:lt ukr:ua:uk rus:ru:ru bel:by:be tur:tr:tr',
  'heb:il:he ara:sa:ar fas:ir:fa per:ir:fa hin:in:hi ben:bd:bn urd:pk:ur zho:cn:zh chi:cn:zh jpn:jp:ja',
  'kor:kr:ko vie:vn:vi tha:th:th ind:id:id msa:my:ms may:my:ms fil:ph:fil tgl:ph:tl swa:ke:sw amh:et:am',
  'afr:za:af gle:ie:ga cym:gb-wls:cy wel:gb-wls:cy cat:es-ct:ca eus:es-pv:eu baq:es-pv:eu glg:es-ga:gl',
  'kat:ge:ka geo:ge:ka hye:am:hy arm:am:hy aze:az:az kaz:kz:kk uzb:uz:uz mon:mn:mn nep:np:ne sin:lk:si',
  'khm:kh:km lao:la:lo mya:mm:my bur:mm:my mlt:mt:mt ltz:lu:lb sqi:al:sq alb:al:sq mkd:mk:mk mac:mk:mk'
].join(' ').split(' ').forEach(entry => {
  const [code, flag, iso1] = entry.split(':')
  LANGUAGES[code] = { flag, iso1 }
})

export default {
  props: {
    dataset: {
      type: Object,
      default: null
    }
  },
  computed: {
    ...mapGetters([
      'storeLocale'
    ]),
    // The fields of the Dublin Core with values (empty values left out)
    dublinCoreRows: function () {
      const dublinCore = this.dataset ? this.dataset.dublinCore : null
      if (!dublinCore) {
        return []
      }
      return DUBLIN_CORE_FIELDS.map(key => ({
        key,
        label: this.$t(`dublinCore${key.charAt(0).toUpperCase()}${key.slice(1)}`),
        values: (dublinCore[key] || []).filter(value => value !== null && value !== undefined && `${value}`.trim() !== '')
      })).filter(row => row.values.length > 0)
    },
    href: function () {
      if (this.dataset && this.dataset.dublinCore) {
        return 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.dataset.dublinCore))
      } else {
        return null
      }
    }
  },
  components: {
    DatasetAttributeTable,
    DublinCoreIcon
  },
  methods: {
    // The flag of a language (its ISO 639-2 code): the country where it is spoken
    getLanguageFlag: function (language) {
      const entry = LANGUAGES[`${language}`.trim().toLowerCase()]
      return entry ? entry.flag : null
    },
    // The name of a language in the language of the page, else its code
    getLanguageName: function (language) {
      const entry = LANGUAGES[`${language}`.trim().toLowerCase()]
      const code = entry ? entry.iso1 : null
      if (code && typeof Intl !== 'undefined' && Intl.DisplayNames) {
        try {
          const locale = this.storeLocale ? this.storeLocale.split('_')[0] : 'en'
          const name = new Intl.DisplayNames([locale, 'en'], { type: 'language' }).of(code)
          if (name) {
            return name.charAt(0).toUpperCase() + name.slice(1)
          }
        } catch (error) {
          // The code as it is
        }
      }
      return language
    },
    getAttributeData: function (data, callback) {
      return apiPostDatasetAttributeTable(this.dataset.datasetId, data, callback)
    },
    downloadAttributes: function (data, callback) {
      return apiPostDatasetAttributeTableExport(this.dataset.datasetId, data, callback)
    }
  }
}
</script>

<style>
/* Headings: the icon in a soft green square beside the title, the text below the title */
.ad-section {
  margin-top: 1.5rem;
}
.ad-head {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  margin-bottom: 1rem;
}
.ad-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--bt-accent-soft);
  color: var(--bt-accent);
  font-size: 1.25rem;
}
.ad-title {
  margin: 0.1rem 0 0.3rem;
  color: var(--bt-text);
  font-size: 1.1rem;
  font-weight: 600;
}
.ad-text {
  margin: 0;
  color: var(--bt-muted);
  font-size: 0.85rem;
  line-height: 1.55;
}
.dc-table .dc-language + .dc-language {
  margin-left: 0.75rem;
}
.dc-table .dc-language .fi {
  margin-right: 0.3rem;
}
.dc-table a.bt-tool,
.dc-table a.bt-tool:hover {
  text-decoration: none;
}
</style>
