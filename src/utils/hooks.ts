import { reactive, ref } from 'vue'
import { IImgState, IImgWrapperState, IStatus } from '../types'
import { cancelRaf, raf } from './raf'

export function getDistance(p1: Touch, p2: Touch) {
  const x = p1.clientX - p2.clientX
  const y = p1.clientY - p2.clientY
  return Math.sqrt(x * x + y * y)
}

export const useImage = () => {
  const imgRef = ref<HTMLImageElement>()
  const imgState = reactive<IImgState>({
    width: 0,
    height: 0,
    maxScale: 1
  })

  const setImgSize = () => {
    if (imgRef.value) {
      const { width, height, naturalWidth } = imgRef.value
      imgState.maxScale = naturalWidth / width
      imgState.width = width
      imgState.height = height
    }
  }

  return {
    imgRef,
    imgState,
    setImgSize
  }
}

export const useMouse = (
  wrapperState: IImgWrapperState,
  status: IStatus,
  canMove: (button?: number) => boolean
) => {
  let rafId: number
  let ticking = false

  const onMouseDown = (e: MouseEvent) => {
    if (!canMove(e.button)) return
    wrapperState.lastX = e.clientX
    wrapperState.lastY = e.clientY
    status.dragging = true
    e.stopPropagation()
  }

  const onMouseUp = (e: MouseEvent) => {
    if (!canMove(e.button)) return
    cancelRaf(rafId)
    status.dragging = false
  }

  const onMouseMove = (e: MouseEvent) => {
    if (!canMove(e.button) || ticking) return
    if (status.dragging) {
      ticking = true
      rafId = raf(() => {
        const { top, left, lastY, lastX } = wrapperState
        wrapperState.top = top - lastY + e.clientY
        wrapperState.left = left - lastX + e.clientX
        wrapperState.lastX = e.clientX
        wrapperState.lastY = e.clientY
        ticking = false
      })
    }
    e.stopPropagation()
  }

  return {
    onMouseDown,
    onMouseUp,
    onMouseMove
  }
}

export const useTouch = (
  imgState: IImgState,
  wrapperState: IImgWrapperState,
  status: IStatus,
  canMove: (button?: number) => boolean
) => {
  // touch event handler
  let rafId: number
  let ticking = false

  const onTouchStart = (e: TouchEvent) => {
    const { touches } = e
    if (touches.length > 1) {
      status.gesturing = true
      wrapperState.touches = touches
    } else {
      wrapperState.lastX = touches[0].clientX
      wrapperState.lastY = touches[0].clientY
      status.dragging = true
    }
    e.stopPropagation()
  }

  const onTouchMove = (e: TouchEvent) => {
    if (ticking) return
    const { touches } = e
    const { lastX, lastY, left, top, scale } = wrapperState

    if (canMove() && !status.gesturing && status.dragging) {
      rafId = raf(() => {
        if (!touches[0]) return
        const curX = touches[0].clientX
        const curY = touches[0].clientY
        wrapperState.top = top - lastY + curY
        wrapperState.left = left - lastX + curX
        wrapperState.lastX = curX
        wrapperState.lastY = curY
        ticking = false
      })
    } else if (
      status.gesturing &&
      wrapperState.touches.length > 1 &&
      touches.length > 1
    ) {
      rafId = raf(() => {
        const calcScale =
          (getDistance(wrapperState.touches[0], wrapperState.touches[1]) -
            getDistance(touches[0], touches[1])) /
          imgState.width
        wrapperState.touches = touches

        const newScale = scale - calcScale * 1.3

        if (newScale > 0.5 && newScale < imgState.maxScale * 1.5) {
          wrapperState.scale = newScale
        }
        ticking = false
      })
    }
  }

  const onTouchEnd = () => {
    cancelRaf(rafId)
    status.dragging = false
    status.gesturing = false
  }

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  }
}
