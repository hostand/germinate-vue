// Flagship crops of this Germinate instance, shared by the home page and the passport page.
// "groupName" is the name of the matching germplasm group in Germinate. The colours are the "cp-crop-<key>" classes
// in src/assets/custom-page.css. "homeIcon": the line drawing of the home page (the other pages use "icon").
import { mdiBarley, mdiFlowerOutline } from '@mdi/js'
import { customBarley, customLettuce, customPea, customHomeWheat, customHomeBarley, customHomePea, customHomeLettuce, customHomeBrassica } from '@/components/icons/custom-icons'

const FLAGSHIP_CROPS = [
  { key: 'wheat', name: 'Wheat', groupName: 'Wheat', icon: mdiBarley, homeIcon: customHomeWheat },
  { key: 'barley', name: 'Barley', groupName: 'Barley', icon: customBarley, homeIcon: customHomeBarley },
  { key: 'pea', name: 'Pea', groupName: 'Pea', icon: customPea, homeIcon: customHomePea },
  { key: 'lettuce', name: 'Lettuce', groupName: 'Lettuce', icon: customLettuce, homeIcon: customHomeLettuce },
  { key: 'brassica', name: 'Brassica', groupName: 'Brassicas', icon: mdiFlowerOutline, homeIcon: customHomeBrassica }
]

// The flagship crop of a germplasm group name (case-insensitive), or null
const findFlagshipCrop = groupName => {
  const name = groupName ? `${groupName}`.trim().toLowerCase() : null
  return name ? FLAGSHIP_CROPS.find(c => c.groupName.toLowerCase() === name) || null : null
}

export {
  FLAGSHIP_CROPS,
  findFlagshipCrop
}
