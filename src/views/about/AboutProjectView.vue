<template>
  <!-- About the project, built on the home page (it extends HomeView: same images of the carousel behind the top, same
       hero, same styles). Title and text from "pageAboutProjectHeroText" (#Title##Text). Where the
       home page has its search bar: the tabs Context, Partners, Objectives, Activities and Germinate. -->
  <div class="custom-page home about-page" ref="home">
    <div class="home-backdrop" v-if="heroImages.length > 0" :style="backdropStyle" aria-hidden="true">
      <div v-for="(image, index) in heroImages"
           :key="'about-hero-image-' + image.name"
           :class="['home-hero-image', { active: index === heroIndex }]"
           :style="{ backgroundImage: `url('${image.src}')` }" />
      <div class="home-hero-veil" />
    </div>

    <!-- Hero -->
    <section class="home-hero" ref="hero">
      <div class="home-hero-slides" v-if="heroTexts.length > 0">
        <div v-for="(slide, index) in heroTexts"
             v-show="slide.title"
             :key="'about-hero-text-' + index"
             :class="['home-hero-text', { active: index === heroTextIndex }]"
             :aria-hidden="index === heroTextIndex ? null : 'true'">
          <div class="home-title" :role="index === heroTextIndex ? 'heading' : null" :aria-level="index === heroTextIndex ? 1 : null" v-html="slide.title" />
          <p class="home-lead" v-if="slide.text" v-html="slide.text" />
        </div>
      </div>
    </section>

    <!-- The tabs, where the home page has its search bar -->
    <b-tabs class="ab-tabs" nav-class="ab-tabs-nav" v-model="tabIndex">
      <!-- Context and the COUSIN Readiness Levels -->
      <b-tab>
        <template #title><i class="fa-solid fa-seedling ab-tab-icon" aria-hidden="true" />{{ $t('pageAboutProjectTabContext') }}</template>
        <div class="ab-panel">
          <p class="ab-text" v-for="(paragraph, index) in context.paragraphs" :key="`context-${index}`">{{ $t(paragraph) }}</p>

          <!-- The latest news of the project website: loading, then the cards; nothing at all when they can't be loaded -->
          <section class="ab-news" v-if="newsLoading || (news && news.length > 0)">
            <h3 class="ab-title"><i class="fa-solid fa-newspaper" aria-hidden="true" /> {{ $t('pageNewsLatestNewsTitle') }}</h3>
            <!-- Loading: three skeleton cards in the shape of the real ones -->
            <div class="ab-news-grid" v-if="newsLoading" aria-busy="true">
              <div class="ab-news-card ab-news-skeleton" v-for="n in 3" :key="`news-skeleton-${n}`" aria-hidden="true">
                <div class="ab-news-image ab-skeleton-block" />
                <div class="ab-news-body">
                  <span class="ab-skeleton-line" style="width: 35%" />
                  <span class="ab-skeleton-line is-title" style="width: 90%" />
                  <span class="ab-skeleton-line is-title" style="width: 60%" />
                  <span class="ab-skeleton-line" style="width: 100%" />
                  <span class="ab-skeleton-line" style="width: 95%" />
                  <span class="ab-skeleton-line" style="width: 70%" />
                </div>
              </div>
            </div>
            <div class="ab-news-grid" v-else>
              <a class="ab-news-card" v-for="item in news" :key="`news-${item.id}`" :href="item.link" target="_blank" rel="noopener noreferrer">
                <div class="ab-news-image">
                  <img :src="item.image" :alt="item.imageAlt" loading="lazy" v-if="item.image" @error="item.image = null" />
                  <!-- No image: a placeholder -->
                  <span class="ab-news-placeholder" v-else aria-hidden="true"><i class="fa-solid fa-newspaper" /></span>
                </div>
                <div class="ab-news-body">
                  <span class="ab-news-date" v-if="item.date">{{ item.date }}</span>
                  <h4 class="ab-news-title">{{ item.title }}</h4>
                  <p class="ab-news-preview" v-if="item.preview">{{ item.preview }}</p>
                  <span class="ab-news-more">{{ $t('pageNewsReadMore') }} <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></span>
                </div>
              </a>
            </div>
          </section>

          <h3 class="ab-title"><i class="fa-solid fa-stairs" aria-hidden="true" /> {{ $t('pageAboutProjectCrlTitle') }}</h3>
          <p class="ab-text">{{ $t('pageAboutProjectCrlText') }}</p>
          <ol class="ab-crl">
            <li v-for="level in context.crl" :key="`crl-${level.step}`" :class="['ab-crl-step', { 'is-platform': level.platform }]">
              <span class="ab-crl-number">{{ level.step }}</span>
              <span class="ab-crl-title">{{ $t(level.title) }}</span>
              <span class="ab-crl-text">{{ $t(level.text) }}</span>
            </li>
          </ol>
          <p class="ab-note"><i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ $t('pageAboutProjectPlatformNote') }}</p>

          <div class="ab-keywords">
            <span class="ab-keyword" v-for="keyword in keywords" :key="keyword"><i class="fa-solid fa-tag" aria-hidden="true" /> {{ $t(keyword) }}</span>
          </div>
        </div>
      </b-tab>

      <!-- Partners: those of the about file of the template folder (about.json, the list of the original about page), in
           alphabetical order. Their grey SVG logo; a click opens their description. -->
      <b-tab>
        <template #title><i class="fa-solid fa-handshake ab-tab-icon" aria-hidden="true" />{{ $t('pageAboutProjectTabPartners') }}</template>
        <div class="ab-panel">
          <div class="ab-partners" v-if="partners && partners.length > 0">
            <button type="button" class="ab-partner" v-for="(partner, index) in partners" :key="`partner-${index}`" :title="partner.name" @click="showPartner(partner)">
              <img :src="getPartnerLogo(partner)" :alt="partner.name" loading="lazy" @error="onLogoError(partner)" />
              <span class="ab-partner-name">{{ partner.name }}</span>
            </button>
          </div>
          <p class="ab-note" v-else-if="partners === null"><b-spinner small /></p>
          <p class="ab-funding"><i class="fa-solid fa-euro-sign" aria-hidden="true" /> <i18n path="pageAboutProjectFundingLine" tag="span"><template #grant><a :href="grantUrl" target="_blank" rel="noopener noreferrer">101135314 <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></a></template></i18n></p>

          <!-- The funders: the EU, the Swiss SERI and UKRI (logos in their colours in public/img/cousin-funding, a -dark
               version with lighter colours for the dark mode) and the disclaimer -->
          <div class="ab-funders">
            <figure class="ab-funder ab-funder-eu">
              <img :src="fundingLogo('eu-flag')" alt="Flag of the European Union" />
              <figcaption class="ab-funder-caption">{{ $t('pageAboutProjectFundersEu') }}</figcaption>
            </figure>
            <p class="ab-funders-text">{{ $t('pageAboutProjectFundersText') }}</p>
            <div class="ab-funders-logos">
              <img class="ab-funder-swiss" :src="fundingLogo('swiss-confederation')" alt="Swiss Confederation" />
              <figure class="ab-funder ab-funder-ukri">
                <img :src="fundingLogo('ukri')" alt="UK Research and Innovation" />
                <figcaption>UK Research<br />and Innovation</figcaption>
              </figure>
            </div>
          </div>
        </div>
      </b-tab>

      <!-- Objectives -->
      <b-tab>
        <template #title><i class="fa-solid fa-bullseye ab-tab-icon" aria-hidden="true" />{{ $t('pageAboutProjectTabObjectives') }}</template>
        <div class="ab-panel">
          <blockquote class="ab-vision"><i class="fa-solid fa-quote-left" aria-hidden="true" /> {{ $t('pageAboutProjectVision') }}</blockquote>
          <p class="ab-text">{{ $t('pageAboutProjectObjectivesText') }}</p>
          <div class="ab-objectives">
            <article class="ab-objective" v-for="item in objectives" :key="item.key">
              <span class="ab-icon" aria-hidden="true"><i :class="['fa-solid', item.icon]" /></span>
              <div>
                <h3 class="ab-objective-verb">{{ $t(item.verb) }}</h3>
                <p class="ab-objective-text">{{ $t(item.text) }}</p>
              </div>
            </article>
          </div>
          <p class="ab-note"><i class="fa-solid fa-arrows-rotate" aria-hidden="true" /> {{ $t('pageAboutProjectTransSitu') }}</p>
        </div>
      </b-tab>

      <!-- Activities: the work packages, opened one at a time -->
      <b-tab>
        <template #title><i class="fa-solid fa-diagram-project ab-tab-icon" aria-hidden="true" />{{ $t('pageAboutProjectTabActivities') }}</template>
        <div class="ab-panel">
          <p class="ab-text">{{ $t('pageAboutProjectActivitiesText') }}</p>
          <div class="ab-wps">
            <section :class="['ab-wp', { open: openWp === wp.key, 'is-platform': wp.platform }]" v-for="(wp, index) in workPackages" :key="wp.key">
              <button type="button" class="ab-wp-head" :aria-expanded="openWp === wp.key ? 'true' : 'false'" @click="openWp = openWp === wp.key ? null : wp.key">
                <span class="ab-icon" aria-hidden="true"><i :class="['fa-solid', wp.icon]" /></span>
                <span class="ab-wp-titles">
                  <span class="ab-wp-number">WP{{ index + 1 }}</span>
                  <span class="ab-wp-title">{{ $t(wp.title) }}</span>
                  <span class="ab-wp-subtitle">{{ $t(wp.subtitle) }}</span>
                </span>
                <span class="ab-wp-badge" v-if="wp.platform"><i class="fa-solid fa-server" aria-hidden="true" /> {{ $t('pageAboutProjectPlatformBadge') }}</span>
                <i :class="['fa-solid', openWp === wp.key ? 'fa-chevron-up' : 'fa-chevron-down', 'ab-wp-chevron']" aria-hidden="true" />
              </button>
              <ol class="ab-wp-tasks" v-show="openWp === wp.key">
                <li v-for="(task, taskIndex) in wp.tasks" :key="`${wp.key}-${taskIndex}`">
                  <span class="ab-wp-task-number">{{ index + 1 }}.{{ taskIndex + 1 }}</span> {{ $t(task) }}
                </li>
              </ol>
            </section>
          </div>
        </div>
      </b-tab>

      <!-- Germinate: the page about Germinate, built when opened -->
      <b-tab lazy>
        <!-- The Germinate icon of the former About Germinate menu entry -->
        <template #title><MdiIcon :path="mdiGerminate" className="ab-tab-svg" aria-hidden="true" />Germinate</template>
        <div class="ab-panel ab-germinate">
          <AboutGerminate />
        </div>
      </b-tab>
    </b-tabs>

    <!-- A partner: the logo, the name, the description and its website -->
    <b-modal ref="partnerModal" :title="$t('pageAboutProjectPartnerModalTitle')" modal-class="cp-modal ab-partner-modal" content-class="custom-page" centered size="lg">
      <div class="ab-partner-detail" v-if="selectedPartner">
        <img class="ab-partner-detail-logo" :src="getPartnerLogo(selectedPartner)" :alt="selectedPartner.name" />
        <div class="ab-partner-detail-text">
          <h3 class="ab-partner-detail-name">{{ selectedPartner.name }}</h3>
          <p class="ab-partner-detail-description" v-if="selectedPartner.description">{{ selectedPartner.description }}</p>
        </div>
      </div>
      <template #modal-footer="{ ok }">
        <a class="cp-modal-button" :href="selectedPartner.url" target="_blank" rel="noopener noreferrer" v-if="selectedPartner && selectedPartner.url">
          <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /> {{ $t('buttonVisit') }}
        </a>
        <button type="button" class="cp-modal-button is-primary" @click="ok()">{{ $t('buttonClose') }}</button>
      </template>
    </b-modal>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import HomeView from '@/views/HomeView'
import { parseHeroText } from '@/mixins/hero-text'
import { apiGetTemplateAboutConfig } from '@/mixins/api/misc'
import { mdiGerminate } from '@/mixins/types'
import { ABOUT_CONTEXT, ABOUT_OBJECTIVES, ABOUT_WORK_PACKAGES, ABOUT_KEYWORDS } from '@/const/about-project'

// Everything of the home page that is not shown here is not loaded: statistics, publications, news
const noop = function () {}

// The project website (WordPress), whose latest posts are shown in the Context tab
const NEWS_SITE = 'https://cousinproject.eu'

export default {
  name: 'about-project-view',
  extends: HomeView,
  components: {
    AboutGerminate: () => import('@/views/about/AboutGerminate')
  },
  data: function () {
    return {
      tabIndex: 0,
      mdiGerminate,
      // All work packages closed
      openWp: null,
      grantUrl: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/projects-details/43108390/101135314/HORIZON',
      context: ABOUT_CONTEXT,
      // The latest news of the project website; null when they can't be loaded
      news: null,
      newsLoading: true,
      // From about.json; null while loading
      partners: null,
      selectedPartner: null,
      objectives: ABOUT_OBJECTIVES,
      workPackages: ABOUT_WORK_PACKAGES,
      keywords: ABOUT_KEYWORDS
    }
  },
  computed: {
    ...mapGetters([
      'storeBaseUrl',
      'storeDarkMode'
    ]),
    // The title and text of this page
    heroTexts: function () {
      return parseHeroText(this.$t('pageAboutProjectHeroText'))
    }
  },
  methods: {
    // The images end at the tabs (on the home page: at the search bar)
    updateHeroBottom: function () {
      const home = this.$refs.home
      const nav = home ? home.querySelector('.ab-tabs-nav') : null
      this.heroBottom = (home && nav) ? nav.getBoundingClientRect().bottom - home.getBoundingClientRect().top : 0
    },
    // The partners of about.json, in alphabetical order. The logo: the colour SVG named after the image without its size
    // (JHI-300x300.png: JHI-color.svg, and JHI-color-dark.svg in dark mode, its dark colours lightened), or the ones
    // given as "svg" and "svgDark"; the image itself when there is no SVG.
    loadPartners: function () {
      apiGetTemplateAboutConfig(result => {
        this.partners = (result || []).filter(p => p && p.name).map(p => {
          const image = p.image || ''
          const base = image ? image.replace(/\.[^.]+$/, '').replace(/-\d+x\d+$/, '') : null
          const svg = p.svg || (base ? `${base}-color.svg` : null)
          const svgDark = p.svgDark || (p.svg ? p.svg : (base ? `${base}-color-dark.svg` : null))
          return {
            name: p.name,
            description: p.description || null,
            url: p.url || null,
            image,
            svg,
            svgDark,
            fallback: false
          }
        }).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      }, {
        codes: [404],
        callback: () => {
          this.partners = []
        }
      })
    },
    getPartnerImage: function (image) {
      return `${this.storeBaseUrl}image/src/?name=${encodeURIComponent(image)}&type=template`
    },
    // The 3 latest posts of the project website (those of the news block of its home page), with their featured
    // image, title and preview (the excerpt without HTML). Any problem: no news section.
    loadProjectNews: async function () {
      this.newsLoading = true
      try {
        const response = await fetch(`${NEWS_SITE}/wp-json/wp/v2/posts?per_page=3&_embed=wp:featuredmedia&_fields=id,date,link,title,excerpt,_links,_embedded`)
        if (!response.ok) {
          throw new Error(response.status)
        }
        const posts = await response.json()
        const text = html => {
          const element = document.createElement('div')
          element.innerHTML = html || ''
          return (element.textContent || '').replace(/\s*\[(…|&hellip;|\.\.\.)\]\s*$/, '…').replace(/\s+/g, ' ').trim()
        }
        const locale = (this.storeLocale || 'en_GB').replace('_', '-')
        this.news = (Array.isArray(posts) ? posts : []).slice(0, 3).map(post => {
          const media = post._embedded && post._embedded['wp:featuredmedia'] ? post._embedded['wp:featuredmedia'][0] : null
          const sizes = media && media.media_details && media.media_details.sizes ? media.media_details.sizes : {}
          const size = sizes.medium_large || sizes.large || sizes.medium || null
          return {
            id: post.id,
            link: post.link,
            title: text(post.title ? post.title.rendered : ''),
            preview: text(post.excerpt ? post.excerpt.rendered : ''),
            date: post.date ? new Date(post.date).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' }) : null,
            image: size ? size.source_url : (media && media.source_url ? media.source_url : null),
            imageAlt: media && media.alt_text ? media.alt_text : ''
          }
        }).filter(item => item.title && item.link)
      } catch (err) {
        this.news = null
      }
      this.newsLoading = false
    },
    // A funding logo in its colours, for the current mode
    fundingLogo: function (name) {
      return `img/cousin-funding/${name}-color${this.storeDarkMode ? '-dark' : ''}.svg`
    },
    // The logo for the current mode (light or dark)
    getPartnerLogo: function (partner) {
      const svg = this.storeDarkMode ? partner.svgDark : partner.svg
      if (partner.fallback || !svg) {
        return this.getPartnerImage(partner.image)
      }
      return `${this.storeBaseUrl}image/src-svg/${encodeURIComponent(svg)}`
    },
    // No SVG for this partner: its image
    onLogoError: function (partner) {
      if (!partner.fallback && partner.image) {
        partner.fallback = true
      }
    },
    showPartner: function (partner) {
      this.selectedPartner = partner
      this.$nextTick(() => this.$refs.partnerModal.show())
    },
    // No flagship crops here
    loadCropGroups: noop,
    updateStatsVisible: noop,
    loadTotals: noop,
    loadRecentPublications: noop,
    loadNews: noop
  },
  mounted: function () {
    this.loadPartners()
    this.loadProjectNews()
  }
}
</script>

<!-- Not scoped: the page takes the scope of HomeView (extends), so the home styles apply to it; these are its own -->
<style src="@/assets/cp-modal.css"></style>
<style>
/* Room between the end of the tabs and the footer */
.about-page .ab-tabs {
  margin-top: 4.5rem;
  margin-bottom: 4rem;
}
.about-page .ab-tabs-nav {
  flex-wrap: wrap;
  border-bottom: 1px solid var(--home-border);
}
.about-page .ab-tabs-nav .nav-link {
  display: inline-flex;
  align-items: center;
  padding: 0.75rem 1.35rem;
  border: 1px solid transparent;
  border-radius: 10px 10px 0 0;
  color: var(--home-muted);
  font-size: 1.02rem;
  font-weight: 600;
  line-height: 1.5;
}
.about-page .ab-tabs-nav .nav-link:hover,
.about-page .ab-tabs-nav .nav-link:focus {
  border-color: transparent;
  color: var(--home-text);
}
.about-page .ab-tabs-nav .nav-link.active,
body.dark-mode .about-page .ab-tabs-nav .nav-link.active {
  border-color: var(--home-border) var(--home-border) var(--home-surface);
  background: var(--home-surface);
  color: var(--home-text);
}
.about-page .ab-tab-icon {
  width: 1.1em;
  margin-right: 0.5rem;
  font-size: 0.95em;
  line-height: 1;
  text-align: center;
}
.about-page .ab-tabs-nav .nav-link.active .ab-tab-icon {
  color: var(--home-green);
}
/* The Germinate icon (SVG): as big as the Font Awesome ones, in the colour of the text, green when active */
.about-page .ab-tabs-nav .nav-link .mdi-icon-wrapper {
  display: inline-flex;
  margin-right: 0.5rem;
}
.about-page .ab-tabs-nav .nav-link .ab-tab-svg {
  width: 1.05em;
  height: 1.05em;
  fill: currentColor;
}
.about-page .ab-tabs-nav .nav-link.active .ab-tab-svg {
  fill: var(--home-green);
}
.about-page .ab-panel {
  padding: 2rem 0.25rem 0;
}
.about-page .ab-text {
  margin: 0 0 1rem;
  color: var(--home-text-subtle);
  font-size: 1.05rem;
  line-height: 1.75;
}
.about-page .ab-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 2.25rem 0 0.75rem;
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--home-text);
}
.about-page .ab-title > i,
.about-page .ab-note > i,
.about-page .ab-funding > i {
  color: var(--home-green);
}
.about-page .ab-note {
  display: flex;
  align-items: baseline;
  gap: 0.55rem;
  margin: 1.25rem 0 0;
  color: var(--home-muted);
  font-size: 0.95rem;
}
/* An icon in a soft green square */
.about-page .ab-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--home-green-soft);
  color: var(--home-green);
  font-size: 1.25rem;
}

/* News of the project website: three cards with the image on top */
.about-page .ab-news {
  margin-bottom: 0.5rem;
}
.about-page .ab-news-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem;
  margin-top: 1.25rem;
}
@media (max-width: 991px) {
  .about-page .ab-news-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
.about-page .ab-news-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--home-border);
  border-radius: 16px;
  background: var(--home-surface);
  color: inherit;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.about-page .ab-news-card:hover,
.about-page .ab-news-card:focus {
  color: inherit;
  text-decoration: none;
  transform: translateY(-2px);
  box-shadow: 0 10px 24px -12px var(--home-shadow);
}
.about-page .ab-news-image {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--home-neutral-bg);
}
.about-page .ab-news-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.about-page .ab-news-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: var(--home-green-soft);
  color: var(--home-green);
  font-size: 2.5rem;
  opacity: 0.8;
}
.about-page .ab-news-body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.45rem;
  padding: 1.1rem 1.25rem 1.25rem;
}
.about-page .ab-news-date {
  color: var(--home-muted);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.about-page .ab-news-title {
  margin: 0;
  color: var(--home-text);
  font-size: 1.08rem;
  font-weight: 600;
  line-height: 1.35;
}
/* The preview: four lines at most */
.about-page .ab-news-preview {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--home-text-subtle);
  font-size: 0.92rem;
  line-height: 1.55;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}
/* Skeleton while loading: grey shapes with a light passing over them */
.about-page .ab-news-skeleton {
  pointer-events: none;
}
.about-page .ab-skeleton-block,
.about-page .ab-skeleton-line {
  position: relative;
  overflow: hidden;
  background: var(--home-neutral-bg);
}
.about-page .ab-skeleton-line {
  display: block;
  height: 0.75rem;
  border-radius: 6px;
}
.about-page .ab-skeleton-line.is-title {
  height: 1.05rem;
}
.about-page .ab-skeleton-block::after,
.about-page .ab-skeleton-line::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent);
  transform: translateX(-100%);
  animation: ab-skeleton-shine 1.4s ease-in-out infinite;
}
body.dark-mode .about-page .ab-skeleton-block::after,
body.dark-mode .about-page .ab-skeleton-line::after {
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.06), transparent);
}
@keyframes ab-skeleton-shine {
  to {
    transform: translateX(100%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .about-page .ab-skeleton-block::after,
  .about-page .ab-skeleton-line::after {
    animation: none;
  }
}
.about-page .ab-news-more {
  margin-top: auto;
  padding-top: 0.35rem;
  color: var(--home-green);
  font-size: 0.88rem;
  font-weight: 600;
}
.about-page .ab-news-more > i {
  font-size: 0.75em;
}

/* CRL: nine numbered steps on a line (wrapping on smaller screens), joined by a thin line */
.about-page .ab-crl {
  display: grid;
  grid-template-columns: repeat(9, minmax(0, 1fr));
  gap: 0.75rem;
  margin: 1.5rem 0 0;
  padding: 0;
  list-style: none;
  counter-reset: none;
}
@media (max-width: 1399px) {
  .about-page .ab-crl {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 767px) {
  .about-page .ab-crl {
    grid-template-columns: minmax(0, 1fr);
  }
}
.about-page .ab-crl-step {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1rem;
  border: 1px solid var(--home-border);
  border-radius: 14px;
  background: var(--home-surface);
}
.about-page .ab-crl-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--home-neutral-bg);
  color: var(--home-text-subtle);
  font-size: 0.9rem;
  font-weight: 700;
}
.about-page .ab-crl-title {
  color: var(--home-text);
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.3;
}
.about-page .ab-crl-text {
  color: var(--home-muted);
  font-size: 0.82rem;
  line-height: 1.45;
}
/* The step of the platform: in green */
.about-page .ab-crl-step.is-platform {
  border-color: var(--home-green);
  box-shadow: 0 0 0 3px var(--home-green-soft);
}
.about-page .ab-crl-step.is-platform .ab-crl-number {
  background: var(--home-green);
  color: #ffffff;
}
body.dark-mode .about-page .ab-crl-step.is-platform .ab-crl-number {
  color: #18191a;
}
.about-page .ab-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 2rem;
}
.about-page .ab-keyword {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.8rem;
  border: 1px solid var(--home-border);
  border-radius: 999px;
  color: var(--home-text-subtle);
  font-size: 0.82rem;
}
.about-page .ab-keyword > i {
  color: var(--home-muted);
  font-size: 0.75em;
}

/* Partners: the logos five per row (fewer on smaller screens), their name below, no frame */
.about-page .ab-partners {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1rem 1.5rem;
}
@media (max-width: 991px) {
  .about-page .ab-partners {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 575px) {
  .about-page .ab-partners {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.about-page .ab-partner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0.75rem 1rem;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: center;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}
.about-page .ab-partner:hover,
.about-page .ab-partner:focus {
  background: var(--home-surface-hover);
  transform: translateY(-2px);
  outline: none;
}
.about-page .ab-partner img {
  width: 100%;
  max-width: 170px;
  aspect-ratio: 1 / 1;
  object-fit: contain;
}
.about-page .ab-partner-name {
  color: var(--home-text-subtle);
  font-size: 0.82rem;
  font-weight: 500;
  line-height: 1.35;
}
/* The grant line, centred, the number linked */
.about-page .ab-funding {
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 0.55rem;
  margin: 2.25rem 0 0;
  color: var(--home-muted);
  font-size: 0.95rem;
  text-align: center;
}
.about-page .ab-funding a {
  color: var(--home-green);
  font-weight: 600;
}
.about-page .ab-funding a:hover {
  text-decoration: underline;
}
.about-page .ab-funding a > i {
  font-size: 0.75em;
}
/* Funders: EU on the left, the text in the middle, Switzerland and UKRI on the right (stacked on smaller screens) */
.about-page .ab-funders {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 2.5rem;
  margin-top: 2rem;
  padding: 1.75rem 0 0;
  border-top: 1px solid var(--home-border);
}
@media (max-width: 991px) {
  .about-page .ab-funders {
    grid-template-columns: minmax(0, 1fr);
    justify-items: center;
    gap: 1.5rem;
    text-align: center;
  }
}
.about-page .ab-funder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}
.about-page .ab-funder figcaption {
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
}
.about-page .ab-funder-eu img {
  width: 130px;
}
.about-page .ab-funder-caption {
  white-space: pre-line;
}
/* The captions in the colour of their logo (lighter in dark mode, 4.5:1 on its background) */
.about-page .ab-funder-eu figcaption {
  color: #003399;
}
body.dark-mode .about-page .ab-funder-eu figcaption {
  color: #387aff;
}
.about-page .ab-funder-ukri figcaption {
  color: #2e2d62;
}
body.dark-mode .about-page .ab-funder-ukri figcaption {
  color: #7c7ac2;
}
.about-page .ab-funders-text {
  margin: 0;
  color: var(--home-text-subtle);
  font-size: 0.98rem;
  line-height: 1.6;
  text-align: justify;
}
@media (max-width: 991px) {
  .about-page .ab-funders-text {
    text-align: center;
  }
}
.about-page .ab-funders-logos {
  display: flex;
  align-items: center;
  gap: 1.75rem;
}
.about-page .ab-funder-swiss {
  width: 95px;
}
.about-page .ab-funder-ukri {
  align-items: flex-start;
}
.about-page .ab-funder-ukri img {
  width: 70px;
}
.about-page .ab-funder-ukri figcaption {
  text-align: left;
}

/* Objectives */
.about-page .ab-vision {
  margin: 0 0 1.5rem;
  padding: 1.25rem 1.5rem;
  border-left: 4px solid var(--home-green);
  border-radius: 0 14px 14px 0;
  background: var(--home-green-soft);
  color: var(--home-text);
  font-size: 1.15rem;
  line-height: 1.7;
}
.about-page .ab-vision > i {
  margin-right: 0.35rem;
  color: var(--home-green);
}
.about-page .ab-objectives {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}
@media (max-width: 1199px) {
  .about-page .ab-objectives {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 767px) {
  .about-page .ab-objectives {
    grid-template-columns: minmax(0, 1fr);
  }
}
.about-page .ab-objective {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  padding: 1.25rem;
  border: 1px solid var(--home-border);
  border-radius: 16px;
  background: var(--home-surface);
}
.about-page .ab-objective-verb {
  margin: 0.1rem 0 0.3rem;
  color: var(--home-text);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.about-page .ab-objective-text {
  margin: 0;
  color: var(--home-muted);
  font-size: 0.92rem;
  line-height: 1.55;
}

/* Activities: the work packages, one open at a time */
.about-page .ab-wps {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.about-page .ab-wp {
  overflow: hidden;
  border: 1px solid var(--home-border);
  border-radius: 16px;
  background: var(--home-surface);
}
.about-page .ab-wp.is-platform {
  border-color: var(--home-green);
}
.about-page .ab-wp-head {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 1rem 1.25rem;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.about-page .ab-wp-head:hover {
  background: var(--home-surface-hover);
}
.about-page .ab-wp-titles {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.2rem 0.75rem;
  min-width: 0;
}
.about-page .ab-wp-number {
  color: var(--home-green);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.about-page .ab-wp-title {
  color: var(--home-text);
  font-size: 1.1rem;
  font-weight: 600;
}
.about-page .ab-wp-subtitle {
  flex-basis: 100%;
  color: var(--home-muted);
  font-size: 0.9rem;
}
.about-page .ab-wp-badge {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.7rem;
  border-radius: 999px;
  background: var(--home-green-soft);
  color: var(--home-green);
  font-size: 0.78rem;
  font-weight: 600;
}
.about-page .ab-wp-chevron {
  flex-shrink: 0;
  color: var(--home-muted);
}
.about-page .ab-wp-tasks {
  margin: 0;
  padding: 0.25rem 1.25rem 1.1rem calc(1.25rem + 46px + 1rem);
  list-style: none;
}
.about-page .ab-wp-tasks > li {
  padding: 0.45rem 0;
  color: var(--home-text-subtle);
  font-size: 0.95rem;
  line-height: 1.5;
}
.about-page .ab-wp-tasks > li + li {
  border-top: 1px dashed var(--home-border);
}
.about-page .ab-wp-task-number {
  display: inline-block;
  min-width: 2.4rem;
  color: var(--home-muted);
  font-size: 0.85rem;
  font-weight: 600;
}
@media (max-width: 767px) {
  .about-page .ab-wp-tasks {
    padding-left: 1.25rem;
  }
}
/* Partner modal: the logo on the left, name and description on the right */
.ab-partner-modal .ab-partner-detail {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
}
.ab-partner-modal .ab-partner-detail-logo {
  flex-shrink: 0;
  width: 180px;
  height: 180px;
  object-fit: contain;
}
.ab-partner-modal .ab-partner-detail-name {
  margin: 0.5rem 0 0.75rem;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--cp-text);
}
.ab-partner-modal .ab-partner-detail-description {
  margin: 0;
  color: var(--cp-text-subtle);
  font-size: 0.98rem;
  line-height: 1.7;
}
.ab-partner-modal a.cp-modal-button:hover {
  color: var(--cp-text);
  text-decoration: none;
}
@media (max-width: 575px) {
  .ab-partner-modal .ab-partner-detail {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
}
/* The Germinate page: without its own outer margins */
.about-page .ab-germinate > div {
  margin: 0;
}
</style>
