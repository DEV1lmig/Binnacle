import React, { useState } from 'react'
import Image from 'next/image'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement> & { 
  src?: string | null;
  alt?: string;
  quality?: number;
  unoptimized?: boolean;
}) {
  const [didError, setDidError] = useState(false)

  const handleError = () => {
    setDidError(true)
  }

  const { src, alt, style, className, width, height, quality, unoptimized } = props

  // If src is missing, empty, or null, show the fallback immediately
  const hasSrc = src && typeof src === 'string' && src.trim() !== ''

  // Default dimensions
  const imgWidth = typeof width === 'number' ? width : typeof width === 'string' ? parseInt(width) : 1920
  const imgHeight = typeof height === 'number' ? height : typeof height === 'string' ? parseInt(height) : 1080

  return !hasSrc || didError ? (
    <div
      className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
      style={style}
    >
      <div className="flex items-center justify-center w-full h-full">
        <Image 
          src={ERROR_IMG_SRC} 
          alt="Error loading image" 
          width={imgWidth} 
          height={imgHeight}
          data-original-url={src as string} 
        />
      </div>
    </div>
  ) : (
    <Image 
      src={src as string} 
      alt={alt || 'Image'} 
      className={className} 
      width={imgWidth} 
      height={imgHeight}
      quality={quality ?? 75}
      unoptimized={unoptimized}
      onError={handleError} 
    />
  )
}

