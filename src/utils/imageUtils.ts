// Utility functions for handling background grid images

/**
 * Generates a shuffled list of image URLs from the females and males folders
 * @param count Number of images to return (defaults to 50 for good coverage)
 * @returns Array of shuffled image URLs
 */
export function getShuffledWorkoutImages(count: number = 50): string[] {
  // Generate female image URLs (f_workout_1.jpg to f_workout_35.jpg)
  const femaleImages = Array.from({ length: 35 }, (_, i) => 
    `/images/females/f_workout_${i + 1}.jpg`
  );

  // Generate male image URLs (m_workout_1.jpg to m_workout_35.jpg) 
  const maleImages = Array.from({ length: 35 }, (_, i) => 
    `/images/males/m_workout_${i + 1}.jpg`
  );

  // Combine both arrays
  const allImages = [...femaleImages, ...maleImages];

  // Shuffle the array using Fisher-Yates algorithm
  const shuffled = [...allImages];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Return the requested number of images, cycling through if needed
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(shuffled[i % shuffled.length]);
  }

  return result;
}

/**
 * Preloads images to improve performance
 * @param imageUrls Array of image URLs to preload
 */
export function preloadImages(imageUrls: string[]): void {
  imageUrls.forEach(url => {
    const img = new Image();
    img.src = url;
  });
}
