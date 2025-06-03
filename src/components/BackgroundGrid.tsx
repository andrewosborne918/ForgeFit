"use client"

import { useEffect, useState } from "react"
import { getShuffledWorkoutImages, preloadImages } from "@/utils/imageUtils"

interface BackgroundGridProps {
  /** Number of images to display in the grid */
  imageCount?: number
  /** Additional CSS classes */
  className?: string
}

/**
 * BackgroundGrid component that displays a responsive grid of workout images
 * with a dark overlay for better form readability
 */
export function BackgroundGrid({ imageCount = 45, className = "" }: BackgroundGridProps) {
  const [images, setImages] = useState<string[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Generate shuffled images
    const shuffledImages = getShuffledWorkoutImages(imageCount)
    setImages(shuffledImages)
    
    // Preload images for better performance (first 20 images)
    preloadImages(shuffledImages.slice(0, 20))
    
    setIsLoaded(true)
  }, [imageCount])

  if (!isLoaded) {
    return (
      <div className={`fixed inset-0 bg-black ${className}`}>
        <div className="absolute inset-0 bg-black/80" />
      </div>
    )
  }

  return (
    <div className={`fixed inset-0 overflow-hidden bg-black ${className}`}>
      {/* Background Grid */}
      <div className="absolute inset-0">
        <div 
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 animate-in fade-in duration-1000"
          style={{
            minHeight: '200vh', // Ensure the grid extends beyond viewport
            gridAutoRows: 'minmax(0, 1fr)', // Allow natural sizing
          }}
        >
          {images.map((imageUrl, index) => (
            <div
              key={`${imageUrl}-${index}`}
              className="relative w-full aspect-square overflow-hidden rounded-xl bg-slate-800 hover:scale-105 transition-all duration-300 ease-out group shadow-lg"
              style={{
                animationDelay: `${index * 50}ms`,
                animation: 'fadeInScale 0.6s ease-out forwards',
              }}
            >
            <img
              src={imageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
              onError={(e) => {
                // Fallback to a solid color if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            {/* Individual image overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent group-hover:from-slate-900/70 transition-all duration-300" />
          </div>
        ))}
        </div>
      </div>
      
      {/* Main overlay for form readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70 backdrop-blur-[0.5px]" />
      
      {/* Additional subtle pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.3),transparent_70%)]" />
    </div>
  )
}
