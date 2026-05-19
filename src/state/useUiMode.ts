import { useEffect, useState } from 'react'
import type { UiMode } from './preferences'

const MOBILE_MAX_WIDTH = 768

function detectAuto(): 'mobile' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop'
  const narrow = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH - 1}px)`).matches
  const coarse = window.matchMedia('(pointer: coarse)').matches
  return narrow && coarse ? 'mobile' : 'desktop'
}

export function useEffectiveUiMode(preference: UiMode): 'mobile' | 'desktop' {
  const [auto, setAuto] = useState<'mobile' | 'desktop'>(() => detectAuto())

  useEffect(() => {
    if (typeof window === 'undefined') return
    const narrow = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH - 1}px)`)
    const coarse = window.matchMedia('(pointer: coarse)')
    // 初期値は useState(detectAuto) で取得済みなので、ここでは変化検知のみ。
    const update = () =>
      setAuto(narrow.matches && coarse.matches ? 'mobile' : 'desktop')
    narrow.addEventListener('change', update)
    coarse.addEventListener('change', update)
    return () => {
      narrow.removeEventListener('change', update)
      coarse.removeEventListener('change', update)
    }
  }, [])

  if (preference === 'mobile') return 'mobile'
  if (preference === 'desktop') return 'desktop'
  return auto
}
