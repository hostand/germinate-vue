// A menu placed next to the element that opened it (a button in a row of a table), in a container of its own: placed
// again whenever the container changes size (a row expanded or folded above or below the button, the columns or the
// window resized), so it always stays next to its button. Returns the function that stops following.
const followAnchor = (container, place) => {
  let frame = null
  const update = () => {
    if (frame !== null) {
      return
    }
    frame = window.requestAnimationFrame(() => {
      frame = null
      place()
    })
  }
  let observer = null
  if (container && window.ResizeObserver) {
    observer = new window.ResizeObserver(update)
    observer.observe(container)
  }
  window.addEventListener('resize', update)
  return () => {
    if (observer) {
      observer.disconnect()
    }
    window.removeEventListener('resize', update)
    if (frame !== null) {
      window.cancelAnimationFrame(frame)
      frame = null
    }
  }
}

export {
  followAnchor
}
