import { useEffect, useState } from 'react'
import type { Layout } from '../types/card'
import { canvasToBlob, renderLayoutToCanvas } from '../utils/renderLayout'

type Props = {
  layout: Layout
  disabled?: boolean
  onClearAll?: () => void
}

type Status =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string }

export function ImageExport({ layout, disabled, onClearAll }: Props) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  useEffect(() => {
    if (status.kind !== 'done' && status.kind !== 'error') return
    const timer = setTimeout(() => setStatus({ kind: 'idle' }), 2000)
    return () => clearTimeout(timer)
  }, [status])

  const isWorking = status.kind === 'working'

  const handleDownload = async () => {
    setStatus({ kind: 'working' })
    try {
      const canvas = await renderLayoutToCanvas(layout)
      const blob = await canvasToBlob(canvas)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `mtg-layout-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setStatus({ kind: 'done', message: 'ダウンロードしました' })
    } catch (error) {
      setStatus({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'ダウンロードに失敗しました',
      })
    }
  }

  const handleCopyImage = async () => {
    if (typeof ClipboardItem === 'undefined') {
      setStatus({
        kind: 'error',
        message: 'このブラウザは画像コピーに未対応です',
      })
      return
    }
    setStatus({ kind: 'working' })
    try {
      const canvas = await renderLayoutToCanvas(layout)
      const blob = await canvasToBlob(canvas)
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setStatus({ kind: 'done', message: '画像をコピーしました' })
    } catch (error) {
      setStatus({
        kind: 'error',
        message:
          error instanceof Error ? error.message : '画像コピーに失敗しました',
      })
    }
  }

  const buttonDisabled = disabled || isWorking

  return (
    <section className="image-export" aria-label="画像書き出し">
      <div className="image-export-buttons">
        <button type="button" onClick={handleDownload} disabled={buttonDisabled}>
          PNG ダウンロード
        </button>
        <button type="button" onClick={handleCopyImage} disabled={buttonDisabled}>
          画像をクリップボードへ
        </button>
        {onClearAll && (
          <button
            type="button"
            className="image-export-clear"
            onClick={() => {
              if (window.confirm('配置済みのカードを全て削除しますか？')) {
                onClearAll()
              }
            }}
            disabled={disabled}
          >
            全削除
          </button>
        )}
        {isWorking && (
          <span className="image-export-status" aria-live="polite">
            生成中…
          </span>
        )}
        {status.kind === 'done' && (
          <span className="image-export-status is-success" aria-live="polite">
            {status.message}
          </span>
        )}
        {status.kind === 'error' && (
          <span className="image-export-status is-error" role="alert">
            {status.message}
          </span>
        )}
      </div>
    </section>
  )
}
