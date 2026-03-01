import React, { useState } from 'react'
import { C } from '@/app/lib/design-system'
import { Gamepad2 } from 'lucide-react'

interface ImageWithFallbackProps {
  src?: string | null;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ImageWithFallback({ src, alt, className, style }: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false)

  const hasSrc = src && typeof src === 'string' && src.trim() !== ''

  if (!hasSrc || didError) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: C.bgAlt,
          ...style,
        }}
      >
        <Gamepad2 style={{ width: 24, height: 24, color: C.textDim, opacity: 0.5 }} />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt || 'Image'}
      className={className}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        background: C.bg,
        ...style,
      }}
      onError={() => setDidError(true)}
    />
  )
}
