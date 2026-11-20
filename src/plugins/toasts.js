// Every toast of the app in one look (ToastContent: the card of the cookie consent), whatever calls it:
// this.$bvToast.toast(message, { title, variant, autoHideDelay, noAutoHide, ... }) keeps working everywhere, the
// message and the title are drawn by ToastContent instead of the BootstrapVue header and body.
// Installed once, on the shared prototype of $bvToast (one instance per component, the same class).
import ToastContent from '@/components/util/ToastContent'

const VARIANTS = ['success', 'danger', 'warning', 'info']
const DEFAULT_DELAY = 5000

let count = 0

const installToasts = vm => {
  const proto = Object.getPrototypeOf(vm.$bvToast)
  if (!proto || proto.__customToasts) {
    return
  }
  const original = proto.toast

  proto.toast = function (content, options = {}) {
    if (!content) {
      return
    }
    const variant = VARIANTS.includes(options.variant) ? options.variant : 'info'
    const id = options.id || `custom-toast-${++count}`
    const delay = options.noAutoHide ? null : (options.autoHideDelay || DEFAULT_DELAY)
    const title = typeof options.title === 'string' ? options.title : null

    const body = this._vm.$createElement(ToastContent, {
      props: {
        title,
        message: content,
        variant,
        delay,
        onClose: () => this.hide(id)
      }
    })

    return original.call(this, body, {
      ...options,
      id,
      title: null,
      variant: null,
      solid: true,
      noCloseButton: true,
      autoHideDelay: delay || DEFAULT_DELAY,
      toaster: options.toaster || 'b-toaster-top-right',
      toastClass: ['ct-toast', `ct-${variant}`],
      headerClass: 'd-none',
      bodyClass: 'ct-toast-body'
    })
  }

  Object.defineProperty(proto, '__customToasts', { value: true })
}

export {
  installToasts
}
