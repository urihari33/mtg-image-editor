import { useEffect, useMemo, useState } from 'react'
import { formatCardNames } from '../utils/formatCardNames'
import type { Layout } from '../types/card'

type Props = {
  layout: Layout
}

export function TextOutput({ layout }: Props) {
  const text = useMemo(() => formatCardNames(layout), [layout])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  const handleCopy = async () => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // Clipboard API can fail in non-secure contexts or when permission is denied.
      // Silent fail is acceptable for MVP — user can copy manually from the textarea.
    }
  }

  return (
    <section className="text-output" aria-label="カード名テキスト出力">
      <div className="text-output-header">
        <h2>カード名テキスト</h2>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!text}
          aria-live="polite"
        >
          {copied ? 'コピーしました' : 'コピー'}
        </button>
      </div>
      <pre className="text-output-body">
        {text || '(カードが追加されると表示されます)'}
      </pre>
    </section>
  )
}
