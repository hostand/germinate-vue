<template>
  <!-- The Germinate tab of the about page, in the look of the custom pages, built from the elements of the original
       About Germinate page (src/views/about/AboutGerminate.vue, still at /about/germinate): the fork notice, the logo,
       title and text, the four links and the team -->
  <div class="custom-page ag-page">
    <!-- This platform is a fork -->
    <aside class="ag-fork" role="note">
      <span class="ag-fork-icon" aria-hidden="true"><i class="fa-solid fa-code-fork" /></span>
      <i18n path="pageAboutGerminateForkText" tag="p" class="ag-fork-text">
        <template #version><a :href="forkReleaseUrl" target="_blank" rel="noopener noreferrer">{{ $t('pageAboutGerminateForkVersion', { version: forkVersion }) }} <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></a></template>
      </i18n>
    </aside>

    <!-- Logo, title and subtitle -->
    <header class="ag-header">
      <img class="ag-logo" src="img/germinate-square.svg" alt="Germinate logo" />
      <h2 class="ag-title">{{ $t('pageAboutGerminateTitle') }}</h2>
      <p class="ag-subtitle">{{ $t('pageAboutGerminateSubtitle') }}</p>
    </header>

    <!-- Text: its first two paragraphs side by side (the last one, about the GitHub page, is left out) -->
    <div class="ag-text">
      <div class="ag-text-column" v-for="(paragraph, index) in textParagraphs" :key="`germinate-text-${index}`" v-html="paragraph" />
    </div>

    <!-- Links: homepage, source code, publication, documentation -->
    <div class="ag-cards">
      <a class="ag-card" v-for="card in cards" :key="card.key" :href="card.link" target="_blank" rel="noopener noreferrer">
        <span class="ag-icon" aria-hidden="true"><i :class="card.icon" /></span>
        <span class="ag-card-text">{{ $t(card.text) }}</span>
        <i class="fa-solid fa-arrow-up-right-from-square ag-card-external" aria-hidden="true" />
      </a>
    </div>

    <!-- Team: the round photo beside the name, the job and the text; below a line, the links and the logo of the
         James Hutton Institute (a static image, light and dark versions); three per row -->
    <section class="ag-section">
      <h3 class="ag-section-title"><i class="fa-solid fa-people-group" aria-hidden="true" /> {{ $t('pageAboutGerminateTeamTitle') }}</h3>
      <div class="ag-team">
        <article class="ag-member" v-for="member in team" :key="member.name">
          <div class="ag-member-main">
            <img class="ag-member-photo" :src="`./img/${member.img}`" :alt="member.name" loading="lazy" />
            <div class="ag-member-body">
              <div class="ag-member-head">
                <h4 class="ag-member-name">{{ member.name }}</h4>
                <span class="ag-member-job">{{ $t(member.job) }}</span>
              </div>
              <p class="ag-member-about">{{ $t(member.about) }}</p>
            </div>
          </div>
          <div class="ag-member-foot">
            <div class="ag-member-links">
              <a v-for="link in member.links" :key="link.href" :href="link.href" target="_blank" rel="noopener noreferrer" :title="link.title" :aria-label="link.title" :class="`is-${link.key}`"><i :class="link.icon" aria-hidden="true" /></a>
            </div>
            <img class="ag-member-org" :src="storeDarkMode ? 'img/team/hutton-logo-dark.svg' : 'img/team/hutton-logo.svg'" alt="The James Hutton Institute" title="The James Hutton Institute" />
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

// The Germinate release this platform was forked from
const FORK_VERSION = '4.9.3'

export default {
  computed: {
    ...mapGetters([
      'storeDarkMode'
    ]),
    // The paragraphs of the Germinate text, without the last one (the GitHub page and the thanks of the team)
    textParagraphs: function () {
      const element = document.createElement('div')
      element.innerHTML = this.$t('pageAboutGerminateText')
      const paragraphs = Array.from(element.querySelectorAll('p')).map(p => p.innerHTML.trim()).filter(p => p)
      return paragraphs.length > 1 ? paragraphs.slice(0, 2) : [element.innerHTML]
    }
  },
  data: function () {
    return {
      forkVersion: FORK_VERSION,
      forkReleaseUrl: `https://github.com/germinateplatform/germinate-vue/releases/tag/v${FORK_VERSION}`,
      cards: [
        { key: 'homepage', icon: 'fa-solid fa-globe', text: 'pageAboutGerminateCardHomepageText', link: 'https://ics.hutton.ac.uk/get-germinate' },
        { key: 'github', icon: 'fa-brands fa-github', text: 'pageAboutGerminateCardGithubText', link: 'https://github.com/germinateplatform/germinate-vue' },
        { key: 'publication', icon: 'fa-solid fa-file-lines', text: 'pageAboutGerminateCardPublicationText', link: 'https://dl.sciencesocieties.org/publications/cs/articles/57/3/1259' },
        { key: 'documentation', icon: 'fa-solid fa-book-open', text: 'pageAboutGerminateCardDocumentationText', link: 'https://germinateplatform.github.io/germinate-server' }
      ],
      team: [
        {
          name: 'Sebastian Raubach',
          job: 'pageAboutGerminateTeamJobSebastian',
          about: 'pageAboutGerminateTeamSebastian',
          img: 'team/sebastian-raubach.jpg',
          links: [
            { key: 'bluesky', icon: 'fa-brands fa-bluesky', title: 'Bluesky', href: 'https://bsky.app/profile/bazraubach.bsky.social' },
            { key: 'x', icon: 'fa-brands fa-x-twitter', title: 'X (Twitter)', href: 'https://twitter.com/BazRaubach' },
            { key: 'website', icon: 'fa-solid fa-globe', title: 'Website', href: 'http://www.hutton.ac.uk/staff/sebastian-raubach' }
          ]
        },
        {
          name: 'Iain Milne',
          job: 'pageAboutGerminateTeamJobIain',
          about: 'pageAboutGerminateTeamIain',
          img: 'team/iain-milne.jpg',
          links: [
            { key: 'website', icon: 'fa-solid fa-globe', title: 'Website', href: 'http://www.hutton.ac.uk/staff/iain-milne' }
          ]
        },
        {
          name: 'Paul Shaw',
          job: 'pageAboutGerminateTeamJobPaul',
          about: 'pageAboutGerminateTeamPaul',
          img: 'team/paul-shaw.jpg',
          links: [
            { key: 'bluesky', icon: 'fa-brands fa-bluesky', title: 'Bluesky', href: 'https://bsky.app/profile/cardinalb.bsky.social' },
            { key: 'x', icon: 'fa-brands fa-x-twitter', title: 'X (Twitter)', href: 'https://twitter.com/cardinalb' },
            { key: 'website', icon: 'fa-solid fa-globe', title: 'Website', href: 'http://www.hutton.ac.uk/staff/paul-shaw' }
          ]
        }
      ]
    }
  }
}
</script>

<style src="@/assets/custom-page.css"></style>
<style scoped>
.ag-page {
  font-family: 'DM Sans', -apple-system, 'Segoe UI', Roboto, sans-serif;
}

/* Fork notice: a soft amber card with the fork icon */
.ag-fork {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2.5rem;
  padding: 1rem 1.25rem;
  border: 1px solid #f0d68f;
  border-left: 4px solid #c9a227;
  border-radius: 14px;
  background: #fdf6e3;
  color: #5c4a10;
}
body.dark-mode .ag-fork {
  border-color: rgba(201, 162, 39, 0.4);
  border-left-color: #c9a227;
  background: rgba(201, 162, 39, 0.12);
  color: #ecd9a0;
}
.ag-fork-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba(201, 162, 39, 0.18);
  color: #946f0c;
  font-size: 1.2rem;
}
body.dark-mode .ag-fork-icon {
  color: #e3c158;
}
.ag-fork-text {
  margin: 0;
  font-size: 0.98rem;
  line-height: 1.6;
}
.ag-fork-text a {
  color: inherit;
  font-weight: 700;
  text-decoration: underline;
}
.ag-fork-text a > i {
  font-size: 0.75em;
}

/* Logo, title and subtitle, centred */
.ag-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.ag-logo {
  width: 150px;
  height: 150px;
}
.ag-title {
  margin: 1.1rem 0 0.25rem;
  color: var(--cp-text);
  font-size: 3.2rem;
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: -0.01em;
}
.ag-subtitle {
  margin: 0;
  color: var(--cp-text-subtle);
  font-size: 1.2rem;
}

/* Text: two columns, one paragraph each (one column on smaller screens) */
.ag-text {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem 3rem;
  margin-top: 2.25rem;
  color: var(--cp-text-subtle);
  font-size: 1.02rem;
  line-height: 1.75;
}
@media (max-width: 991px) {
  .ag-text {
    grid-template-columns: minmax(0, 1fr);
  }
}
/* Justified, with hyphenation so the justified lines don't get wide gaps */
.ag-text-column {
  text-align: justify;
  hyphens: auto;
}
.ag-text >>> a {
  color: var(--cp-green);
}

/* The four links: cards with an icon in a soft green square */
.ag-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 2rem;
}
@media (max-width: 1199px) {
  .ag-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 575px) {
  .ag-cards {
    grid-template-columns: minmax(0, 1fr);
  }
}
.ag-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  min-height: 110px;
  padding: 1.25rem 2.25rem 1.25rem 1.25rem;
  border: 1px solid var(--cp-border);
  border-radius: 16px;
  background: var(--cp-surface);
  color: var(--cp-text);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.ag-card:hover,
.ag-card:focus {
  color: var(--cp-text);
  text-decoration: none;
  transform: translateY(-2px);
  box-shadow: 0 10px 24px -12px var(--cp-shadow);
}
.ag-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--cp-green-soft);
  color: var(--cp-green);
  font-size: 1.25rem;
}
.ag-card-text {
  margin-top: 0.2rem;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.ag-card-external {
  position: absolute;
  top: 1.1rem;
  right: 1.1rem;
  color: var(--cp-muted);
  font-size: 0.75rem;
}

/* Team */
.ag-section {
  margin-top: 3.5rem;
}
.ag-section-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0;
  color: var(--cp-text);
  font-size: 1.6rem;
  font-weight: 500;
}
.ag-section-title > i {
  color: var(--cp-green);
  font-size: 0.85em;
}
/* Three cards per row (one on smaller screens): the round photo beside the text, the links and the logo below a line */
.ag-team {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem;
  margin-top: 1.5rem;
}
@media (max-width: 1199px) {
  .ag-team {
    grid-template-columns: minmax(0, 1fr);
  }
}
.ag-member {
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1.25rem 0.9rem;
  border: 1px solid var(--cp-border);
  border-radius: 16px;
  background: var(--cp-surface);
  box-shadow: 0 1px 2px var(--cp-shadow), 0 6px 18px -10px var(--cp-shadow);
}
.ag-member-main {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 1.1rem;
}
.ag-member-photo {
  flex-shrink: 0;
  width: 92px;
  height: 92px;
  border-radius: 50%;
  object-fit: cover;
}
.ag-member-body {
  flex: 1 1 auto;
  min-width: 0;
}
.ag-member-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem 0.75rem;
}
.ag-member-name {
  margin: 0;
  color: var(--cp-green);
  font-size: 1.2rem;
  font-weight: 700;
}
.ag-member-job {
  padding: 0.2rem 0.75rem;
  border-radius: 999px;
  background: var(--cp-green-soft);
  color: var(--cp-green);
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}
.ag-member-about {
  margin: 0.6rem 0 0;
  color: var(--cp-text-subtle);
  font-size: 0.92rem;
  line-height: 1.6;
}
.ag-member-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--cp-border);
}
.ag-member-links {
  display: flex;
  gap: 1rem;
}
.ag-member-links a {
  color: var(--cp-text-subtle);
  font-size: 1.1rem;
  transition: color 0.15s ease;
}
.ag-member-links a:hover {
  text-decoration: none;
}
.ag-member-links a.is-bluesky:hover {
  color: #0085ff;
}
.ag-member-links a.is-x:hover {
  color: var(--cp-text);
}
.ag-member-links a.is-website:hover {
  color: var(--cp-green);
}
/* The logo of the James Hutton Institute, small in the corner */
.ag-member-org {
  height: 26px;
  width: auto;
}
@media (max-width: 575px) {
  .ag-member-main {
    flex-direction: column;
    text-align: center;
  }
  .ag-member-head {
    justify-content: center;
  }
}
</style>
