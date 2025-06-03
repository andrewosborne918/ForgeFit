# BackgroundGrid Component

A responsive background grid component that displays workout images from the `/images/females` and `/images/males` directories with elegant styling and overlay effects.

## Features

- **Responsive Grid Layout**: Adapts from 2 columns on mobile to 5 columns on large screens
- **Image Shuffling**: Randomly mixes images from both male and female workout directories
- **Performance Optimized**: Preloads first 20 images for better loading experience
- **Hover Effects**: Subtle scale and overlay transitions on hover
- **Dark Mode Support**: Consistent styling across light and dark themes
- **Error Handling**: Graceful fallback for failed image loads
- **Accessibility**: Proper alt text and loading attributes

## Usage

```tsx
import { BackgroundGrid } from "@/components/BackgroundGrid"

export default function MyPage() {
  return (
    <div className="relative min-h-screen">
      <BackgroundGrid imageCount={60} />
      
      {/* Your content with relative z-10 positioning */}
      <div className="relative z-10">
        {/* Form or content goes here */}
      </div>
    </div>
  )
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `imageCount` | `number` | `45` | Number of images to display in the grid |
| `className` | `string` | `""` | Additional CSS classes to apply |

## Styling

The component uses a layered approach:

1. **Fixed positioning** to cover the entire viewport
2. **Responsive grid** that adapts to screen size
3. **Individual image styling** with rounded corners and hover effects
4. **Gradient overlays** for form readability
5. **Backdrop blur** for modern glass-morphism effect

## Image Structure

The component expects images to be organized as:
- `/public/images/females/f_workout_1.jpg` to `/public/images/females/f_workout_35.jpg`
- `/public/images/males/m_workout_1.jpg` to `/public/images/males/m_workout_35.jpg`

## Dependencies

- React hooks (`useState`, `useEffect`)
- Custom utility functions from `@/utils/imageUtils`
- Tailwind CSS for styling

## Implementation Details

- Uses Fisher-Yates algorithm for true randomization
- Implements lazy loading for performance
- Includes error boundaries for missing images
- Supports both SSR and client-side rendering
- Optimized for mobile and desktop viewports

## Pages Using This Component

- `/auth/signin` - Sign In page
- `/auth/signup` - Sign Up page  
- `/(app)/profile` - Profile setup page

## Customization

To modify the grid layout, adjust the grid column classes:

```tsx
// Current responsive breakpoints
"grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"

// Example for even larger images (fewer columns)
"grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
```

To adjust spacing, modify the gap and padding:

```tsx
// Current spacing
"gap-4 p-4"

// Tighter spacing
"gap-2 p-2"

// Looser spacing  
"gap-6 p-6"
```

To adjust overlay intensity, modify the gradient classes:

```tsx
// Current overlay
"bg-gradient-to-br from-slate-900/70 via-slate-800/60 to-slate-900/70"

// Lighter overlay
"bg-gradient-to-br from-slate-900/50 via-slate-800/40 to-slate-900/50"
```
