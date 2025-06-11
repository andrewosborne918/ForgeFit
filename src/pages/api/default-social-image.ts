import { NextApiRequest, NextApiResponse } from 'next';
import { createCanvas, loadImage } from 'canvas';
import path from 'path';
import fs from 'fs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Canvas dimensions for social media
    const width = 1200;
    const height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Create default gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1e293b'); // slate-800
    gradient.addColorStop(1, '#334155'); // slate-700
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add orange overlay
    ctx.fillStyle = 'rgba(239, 119, 47, 0.8)';
    ctx.fillRect(0, 0, width, height);

    // Load and draw the white ForgeFit logo
    const logoPath = path.join(process.cwd(), 'public', 'images', 'Logo', 'forgefit-logo-all-white.png');
    
    if (fs.existsSync(logoPath)) {
      const logo = await loadImage(logoPath);
      
      const logoMaxWidth = Math.min(width * 0.4, 400);
      const logoAspectRatio = logo.width / logo.height;
      const logoWidth = logoMaxWidth;
      const logoHeight = logoMaxWidth / logoAspectRatio;
      
      const logoX = (width - logoWidth) / 2;
      const logoY = (height - logoHeight) / 2;
      
      ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
    }

    // Add text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    ctx.fillText('ForgeFit Workout', width / 2, height - 100);
    
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.fillText('AI-Generated Fitness Plans', width / 2, height - 40);

    const buffer = canvas.toBuffer('image/png');

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800'); // Cache for 1 week
    res.setHeader('Content-Length', buffer.length);

    res.end(buffer);

  } catch (error) {
    console.error('Error generating default social image:', error);
    res.status(500).json({ error: 'Failed to generate default social image' });
  }
}
