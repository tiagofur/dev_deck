import React, { useState, useEffect, useRef } from 'react'

export interface CropModalProps {
  imageSrc: string
  onClose: () => void
  onCrop: (blob: Blob) => void
  isSubmitting: boolean
}

export function CropModal({ imageSrc, onClose, onCrop, isSubmitting }: CropModalProps) {
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  // Load image
  useEffect(() => {
    const img = new Image()
    img.src = imageSrc
    img.onload = () => {
      imageRef.current = img
      setZoom(1)
      setOffset({ x: 0, y: 0 })
      draw()
    }
  }, [imageSrc])

  // Draw on canvas whenever zoom, offset, or image changes
  const draw = () => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Brutalist styling light gray bg
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.scale(zoom, zoom)
    ctx.translate(offset.x, offset.y)

    const imgRatio = img.width / img.height
    let drawWidth: number
    let drawHeight: number

    if (imgRatio > 1) {
      drawHeight = canvas.height
      drawWidth = canvas.height * imgRatio
    } else {
      drawWidth = canvas.width
      drawHeight = canvas.width / imgRatio
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
    ctx.restore()

    // Draw solid brutalist crop border
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 3
    ctx.strokeRect(0, 0, canvas.width, canvas.height)
  }

  useEffect(() => {
    draw()
  }, [zoom, offset])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - offset.x * zoom, y: e.clientY - offset.y * zoom })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return
    const dx = (e.clientX - dragStart.x) / zoom
    const dy = (e.clientY - dragStart.y) / zoom
    setOffset({ x: dx, y: dy })
  }

  const handleMouseUpOrLeave = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const zoomFactor = 0.05
    const nextZoom = e.deltaY < 0 ? Math.min(zoom + zoomFactor, 4) : Math.max(zoom - zoomFactor, 0.5)
    setZoom(nextZoom)
  }

  const handleConfirm = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob((blob) => {
      if (blob) {
        onCrop(blob)
      }
    }, 'image/png')
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" />

      <div className="bg-bg-card border-4 border-ink p-6 max-w-md w-full shadow-hard relative z-10 flex flex-col items-center">
        <h3 className="font-display font-black text-xl uppercase mb-4 w-full text-left border-b-3 border-ink pb-2">
          ✂️ Recortar Imagen
        </h3>

        <div className="border-3 border-ink shadow-hard overflow-hidden bg-bg-primary relative cursor-move">
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onWheel={handleWheel}
            className="block select-none touch-none"
          />
        </div>

        <p className="font-mono text-[10px] text-ink-soft mt-3 text-center">
          Arrastra para mover la foto · Usa la rueda o el control para hacer zoom
        </p>

        <div className="w-full mt-4 flex items-center gap-3">
          <span className="font-mono text-xs uppercase font-bold">Zoom:</span>
          <input
            type="range"
            min="0.5"
            max="4"
            step="0.01"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1 accent-ink h-2 bg-bg-primary border-2 border-ink rounded-none cursor-pointer"
          />
          <span className="font-mono text-xs font-bold w-8 text-right">{Math.round(zoom * 100)}%</span>
        </div>

        <div className="flex justify-end gap-3 w-full border-t-3 border-ink pt-4 mt-6">
          <button
            onClick={onClose}
            className="border-3 border-ink px-4 py-2 font-display font-bold uppercase bg-white text-ink hover:-translate-y-0.5 hover:shadow-hard-sm active:translate-y-0 active:shadow-none transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="border-3 border-ink px-4 py-2 font-display font-bold uppercase bg-accent-pink text-white hover:-translate-y-0.5 hover:shadow-hard-sm active:translate-y-0 active:shadow-none transition-all cursor-pointer flex items-center gap-2"
          >
            {isSubmitting ? 'Subiendo...' : 'Aceptar'}
          </button>
        </div>
      </div>
    </div>
  )
}
