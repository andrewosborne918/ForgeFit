import { NextApiRequest, NextApiResponse } from 'next';
import { createCanvas, loadImage } from 'canvas';
import path from 'path';
import fs from 'fs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { workoutImage, title, duration } = req.query;

  if (!workoutImage || !title) {
    return res.status(400).json({ error: 'Missing required parameters: workoutImage and title' });
  }

  try {
    // Canvas dimensions optimized for social media (1200x630 is ideal for Facebook/Twitter)
    const width = 1200;
    const height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    let baseImage = null;
    
    // Try to load the workout image, but don't fail if it doesn't exist
    if (workoutImage) {
      const workoutImagePath = path.join(process.cwd(), 'public', workoutImage as string);
      
      if (fs.existsSync(workoutImagePath)) {
        try {
          baseImage = await loadImage(workoutImagePath);
        } catch (error) {
          console.warn('Failed to load workout image:', error);
        }
      }
    }

    if (baseImage) {
      // Draw the base workout image (scaled to fit)
      const aspectRatio = baseImage.width / baseImage.height;
      let drawWidth = width;
      let drawHeight = height;
      let offsetX = 0;
      let offsetY = 0;

      if (aspectRatio > width / height) {
        // Image is wider - fit by height
        drawHeight = height;
        drawWidth = height * aspectRatio;
        offsetX = (width - drawWidth) / 2;
      } else {
        // Image is taller - fit by width
        drawWidth = width;
        drawHeight = width / aspectRatio;
        offsetY = (height - drawHeight) / 2;
      }

      ctx.drawImage(baseImage, offsetX, offsetY, drawWidth, drawHeight);
    } else {
      // Create a default gradient background if no image
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#1e293b'); // slate-800
      gradient.addColorStop(1, '#334155'); // slate-700
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Add orange overlay with transparency
    ctx.fillStyle = 'rgba(239, 119, 47, 0.7)'; // Orange with 70% opacity
    ctx.fillRect(0, 0, width, height);

    // Load and draw the white ForgeFit logo
    const logoPath = path.join(process.cwd(), 'public', 'images', 'Logo', 'forgefit-logo-all-white.png');
    
    if (fs.existsSync(logoPath)) {
      const logo = await loadImage(logoPath);
      
      // Calculate logo size (make it 30% of canvas width, max 300px)
      const logoMaxWidth = Math.min(width * 0.3, 300);
      const logoAspectRatio = logo.width / logo.height;
      const logoWidth = logoMaxWidth;
      const logoHeight = logoMaxWidth / logoAspectRatio;
      
      // Center the logo
      const logoX = (width - logoWidth) / 2;
      const logoY = (height - logoHeight) / 2;
      
      ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
    }

    // Add workout title text at the bottom
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    
    // Add text shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Wrap text if it's too long
    const maxWidth = width - 100; // 50px padding on each side
    const words = (title as string).split(' ');
    let line = '';
    let y = height - 100; // 100px from bottom
    
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, width / 2, y);
        line = words[n] + ' ';
        y -= 60; // Line height
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, width / 2, y);

    // Add duration if provided
    if (duration) {
      ctx.font = 'bold 32px Arial, sans-serif';
      ctx.fillText(`Duration: ${duration}`, width / 2, height - 30);
    }

    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png');

    // Set appropriate headers
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.setHeader('Content-Length', buffer.length);

    // Send the image
    res.end(buffer);

  } catch (error) {
    console.error('Error generating social image:', error);
    res.status(500).json({ error: 'Failed to generate social image' });
  }
}
