// Drill card chrome: the fixed backdrop + card frame, the zoom-from-origin
// animation, and esc/backdrop/X close. Port of the mockup's openDrill /
// closeDrill pair (mockup 321-353) plus the document-level Escape listener
// (1041-1043). Dumb component (P4): the caller supplies the origin rect,
// the dialog label, and the reduced-motion flag; this component owns only
// the animation and the close mechanics.
//
// Solid quirk this file leans on: the CALLER is responsible for giving each
// open card a fresh component instance (Floor1Brain does this with a keyed
// <Show>) -- DrillOverlay itself has no notion of "replace the previous
// card"; it only knows how to open and close ONE card.
import { onCleanup, onMount, type JSX } from 'solid-js'

interface Props {
  originRect: DOMRect
  label: string
  wide?: boolean
  /** P7c: when true, open and close are both instant -- no transform, no delay. */
  reduced?: boolean
  onClose: () => void
  children: JSX.Element
}

export default function DrillOverlay(props: Props) {
  let cardRef: HTMLDivElement | undefined
  let closing = false

  const requestClose = () => {
    if (closing) return
    closing = true
    if (props.reduced) {
      props.onClose()
      return
    }
    // Reverse of the open transition (mockup 350-352): scale down, fade out,
    // then unmount after the transition would have finished.
    if (cardRef) {
      cardRef.style.transform = 'scale(.7)'
      cardRef.style.opacity = '0'
    }
    setTimeout(() => props.onClose(), 260)
  }

  const onKeydown = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape') requestClose()
  }

  onMount(() => {
    // Document-level Escape listener (mockup 1041-1043), scoped to this
    // card's lifetime via onCleanup below -- a second open replaces this
    // component instance (Floor1Brain's keyed Show), so the old listener is
    // always torn down before a new one is attached. Never leaks.
    document.addEventListener('keydown', onKeydown)

    if (props.reduced || !cardRef) return
    // Zoom-from-origin (mockup 330-338): start the card translated/scaled
    // onto the clicked element, then release to identity on the next paint.
    const r = props.originRect
    const dx = r.left + r.width / 2 - window.innerWidth / 2
    const dy = r.top + r.height / 2 - window.innerHeight / 2
    cardRef.style.transform = `translate(${dx}px,${dy}px) scale(.1)`
    cardRef.style.opacity = '0'
    // Double rAF, exactly as the comp does it: one frame to let the browser
    // register the pre-transition state, the next to release it so the CSS
    // transition actually animates instead of snapping straight to rest.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cardRef) return
        cardRef.classList.remove('pre')
        cardRef.style.transform = 'none'
        cardRef.style.opacity = '1'
      })
    })
  })

  onCleanup(() => {
    document.removeEventListener('keydown', onKeydown)
  })

  return (
    <div class="drill" classList={{ wide: props.wide }}>
      <div class="backdrop" onClick={() => requestClose()} />
      <div
        class="dcard"
        classList={{ pre: !props.reduced }}
        ref={cardRef}
        role="dialog"
        aria-label={props.label}
      >
        <button class="x" aria-label="close" onClick={() => requestClose()}>
          ×
        </button>
        {props.children}
      </div>
    </div>
  )
}
