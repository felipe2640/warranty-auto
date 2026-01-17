"use client"

import type React from "react"

import { memo, useRef, useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Eraser, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface SignaturePadProps {
  onSave: (dataUrl: string) => void
  onClear: () => void
  disabled?: boolean
  width?: number
  height?: number
  maxExportWidth?: number
  maxExportHeight?: number
  className?: string
  canvasClassName?: string
}

const DEFAULT_SIGNATURE_WIDTH = 400
const DEFAULT_SIGNATURE_HEIGHT = 200
const DEFAULT_EXPORT_MAX_WIDTH = 320
const DEFAULT_EXPORT_MAX_HEIGHT = 160

function exportSignatureDataUrl(canvas: HTMLCanvasElement, maxWidth: number, maxHeight: number) {
  const scale = Math.min(1, maxWidth / canvas.width, maxHeight / canvas.height)
  const targetWidth = Math.max(1, Math.round(canvas.width * scale))
  const targetHeight = Math.max(1, Math.round(canvas.height * scale))

  const output = document.createElement("canvas")
  output.width = targetWidth
  output.height = targetHeight

  const ctx = output.getContext("2d")
  if (!ctx) {
    return canvas.toDataURL("image/png")
  }

  ctx.fillStyle = "#fff"
  ctx.fillRect(0, 0, targetWidth, targetHeight)
  ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight)

  return output.toDataURL("image/png")
}

function SignaturePadComponent({
  onSave,
  onClear,
  disabled,
  width = DEFAULT_SIGNATURE_WIDTH,
  height = DEFAULT_SIGNATURE_HEIGHT,
  maxExportWidth = DEFAULT_EXPORT_MAX_WIDTH,
  maxExportHeight = DEFAULT_EXPORT_MAX_HEIGHT,
  className,
  canvasClassName,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  const getContext = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext("2d")
  }, [height, width])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set up canvas
    ctx.strokeStyle = "#000"
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    // Fill with white background
    ctx.fillStyle = "#fff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return

    const ctx = getContext()
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    setHasSignature(true)
  }

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return

    const ctx = getContext()
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    const ctx = getContext()
    if (!canvas || !ctx) return

    ctx.fillStyle = "#fff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    onClear()
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasSignature) return

    const dataUrl = exportSignatureDataUrl(canvas, maxExportWidth, maxExportHeight)
    onSave(dataUrl)
  }

  return (
    <div className="space-y-3">
      <div className={cn("border border-border rounded-lg overflow-hidden bg-background", className)}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={cn("w-full touch-none", canvasClassName)}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
        />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleClear} disabled={disabled}>
          <Eraser className="h-4 w-4 mr-2" />
          Limpar
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={disabled || !hasSignature}>
          <Check className="h-4 w-4 mr-2" />
          Salvar Assinatura
        </Button>
      </div>
    </div>
  )
}

export const SignaturePad = memo(SignaturePadComponent)
