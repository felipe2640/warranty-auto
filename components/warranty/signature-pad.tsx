"use client"

import type React from "react"

import { memo, useRef, useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Eraser, Check } from "lucide-react"

interface SignaturePadProps {
  onSave: (dataUrl: string) => void
  onClear: () => void
  disabled?: boolean
}

function SignaturePadComponent({ onSave, onClear, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  const getContext = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext("2d")
  }, [])

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

    const dataUrl = canvas.toDataURL("image/png")
    onSave(dataUrl)
  }

  return (
    <div className="space-y-3">
      <div className="border border-border rounded-lg overflow-hidden bg-background">
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          className="w-full touch-none"
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
