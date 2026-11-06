// Content of the About page of the project (src/views/about/AboutProjectView.vue), from the COUSIN project description
// (EU CAP Network project page, grant agreement 101135314). Only the structure is here: the texts are keys of the
// language files (pageAboutProject...).

// Context: the paragraphs and the 9 COUSIN Readiness Levels (CRL); "platform" marks the step this platform serves.
// Step n: pageAboutProjectCrl<n>Title and pageAboutProjectCrl<n>Text.
export const ABOUT_CONTEXT = {
  paragraphs: ['pageAboutProjectContextText1', 'pageAboutProjectContextText2'],
  crl: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(step => ({
    step,
    title: `pageAboutProjectCrl${step}Title`,
    text: `pageAboutProjectCrl${step}Text`,
    platform: step === 4
  }))
}

// Objectives: the six main objectives (pageAboutProjectObjective<Name> and pageAboutProjectObjective<Name>Text)
export const ABOUT_OBJECTIVES = [
  { key: 'Identify', icon: 'fa-route' },
  { key: 'Recognize', icon: 'fa-map-location-dot' },
  { key: 'Determine', icon: 'fa-clipboard-list' },
  { key: 'Implement', icon: 'fa-dna' },
  { key: 'Provide', icon: 'fa-database' },
  { key: 'Train', icon: 'fa-graduation-cap' }
].map(item => ({
  key: item.key,
  icon: item.icon,
  verb: `pageAboutProjectObjective${item.key}`,
  text: `pageAboutProjectObjective${item.key}Text`
}))

// Activities: the seven work packages, their icon and number of tasks (pageAboutProjectWp<n>Title, ...Subtitle and
// ...Task<k>); "platform" marks the one producing this platform
export const ABOUT_WORK_PACKAGES = [
  { icon: 'fa-people-group', tasks: 4 },
  { icon: 'fa-leaf', tasks: 4 },
  { icon: 'fa-microscope', tasks: 5 },
  { icon: 'fa-tractor', tasks: 3 },
  { icon: 'fa-server', tasks: 4, platform: true },
  { icon: 'fa-bullhorn', tasks: 3 },
  { icon: 'fa-sitemap', tasks: 5 }
].map((wp, index) => ({
  key: `wp${index + 1}`,
  icon: wp.icon,
  platform: !!wp.platform,
  title: `pageAboutProjectWp${index + 1}Title`,
  subtitle: `pageAboutProjectWp${index + 1}Subtitle`,
  tasks: Array.from({ length: wp.tasks }, (v, k) => `pageAboutProjectWp${index + 1}Task${k + 1}`)
}))

export const ABOUT_KEYWORDS = [
  'pageAboutProjectKeywordGeneticResources',
  'pageAboutProjectKeywordAgroecology',
  'pageAboutProjectKeywordBiodiversity',
  'pageAboutProjectKeywordOrganicFarming',
  'pageAboutProjectKeywordFoodSecurity'
]
