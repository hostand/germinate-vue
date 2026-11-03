// The texts of the home page hero ("homeHeroText" of the language files): "#Title 1##Text 1#Title 2##Text 2...", one
// per image of the carousel. Titles and texts may hold HTML: a "#" inside a tag (e.g. href="#top") or an entity
// (e.g. "&#233;") is part of the text, not a separator.

// The positions of the "#" that separate
const findSeparators = value => {
  const separators = []
  let inTag = false
  for (let i = 0; i < value.length; i++) {
    const c = value[i]
    if (c === '<') {
      inTag = true
    } else if (c === '>') {
      inTag = false
    } else if (c === '#' && !inTag && value[i - 1] !== '&') {
      separators.push(i)
    }
  }
  return separators
}

/**
 * The entries of a hero text: [{ title, text, valid, raw }]. "valid": in the pattern #Title##Text with a title; "raw":
 * the entry as written ("#Title##Text"). An empty one ("#") keeps its place. Without any "#": the whole value is the
 * title.
 */
const parseHeroText = value => {
  const source = value || ''
  const separators = findSeparators(source)
  const entries = []
  let k = 0
  while (k < separators.length) {
    const start = separators[k]
    k++
    let titleEnd = null
    let textStart = null
    let end = source.length
    // "##" at once: no title
    if (separators[k] === start + 1) {
      titleEnd = start + 1
      textStart = start + 2
      k++
    }
    while (k < separators.length) {
      // The first "##": title, then text
      if (titleEnd === null && separators[k + 1] === separators[k] + 1) {
        titleEnd = separators[k]
        textStart = separators[k] + 2
        k += 2
        continue
      }
      // Any other "#": the next entry
      end = separators[k]
      break
    }
    const title = source.substring(start + 1, titleEnd === null ? end : titleEnd).trim()
    const text = textStart === null ? '' : source.substring(textStart, end).trim()
    entries.push({ title, text, valid: textStart !== null && title !== '', raw: source.substring(start, end) })
  }
  if (entries.length === 0 && source.trim()) {
    entries.push({ title: source.trim(), text: '', valid: false, raw: `#${source.trim()}` })
  }
  return entries
}

export {
  parseHeroText
}
