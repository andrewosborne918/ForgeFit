"use client"

// Device fingerprinting utility
export class DeviceFingerprint {
  static async generateFingerprint(): Promise<string> {
    const components = [
      // Screen information
      `${screen.width}x${screen.height}`,
      screen.colorDepth,
      
      // Timezone
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      
      // Language
      navigator.language,
      
      // Platform
      navigator.platform,
      
      // User agent (partial - avoid full UA string for privacy)
      navigator.userAgent.substring(0, 50),
      
      // Available fonts (simplified)
      await this.getAvailableFonts(),
      
      // Canvas fingerprint (simplified)
      await this.getCanvasFingerprint(),
    ];

    // Create hash of combined components
    const combined = components.join('|');
    return await this.hashString(combined);
  }

  private static async getAvailableFonts(): Promise<string> {
    // Test for common fonts
    const testFonts = [
      'Arial', 'Helvetica', 'Times New Roman', 'Courier New',
      'Verdana', 'Georgia', 'Palatino', 'Garamond',
      'Comic Sans MS', 'Trebuchet MS', 'Arial Black', 'Impact'
    ];

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return 'no-canvas';

    const availableFonts: string[] = [];
    const testText = 'ForgeFit123';
    
    // Get baseline measurements
    context.font = '72px monospace';
    const baselineWidth = context.measureText(testText).width;

    for (const font of testFonts) {
      context.font = `72px ${font}, monospace`;
      const width = context.measureText(testText).width;
      
      if (width !== baselineWidth) {
        availableFonts.push(font);
      }
    }

    return availableFonts.sort().join(',');
  }

  private static async getCanvasFingerprint(): Promise<string> {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return 'no-canvas';

    // Draw some shapes and text
    context.textBaseline = 'top';
    context.font = '14px Arial';
    context.fillStyle = '#FF6600';
    context.fillRect(125, 1, 62, 20);
    context.fillStyle = '#069';
    context.fillText('ForgeFit Anti-Abuse System', 2, 15);
    context.fillStyle = 'rgba(102, 204, 0, 0.7)';
    context.fillText('Device fingerprint for security', 4, 45);

    // Get image data and create hash
    const imageData = canvas.toDataURL();
    return await this.hashString(imageData);
  }

  private static async hashString(str: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    } else {
      // Fallback for older browsers
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(16);
    }
  }

  static async checkDeviceHistory(fingerprint: string): Promise<{
    hasHistory: boolean;
    registrations: number;
    lastSeen?: Date;
    workoutsUsed?: number;
  }> {
    try {
      const response = await fetch('/api/check-device-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint })
      });

      if (!response.ok) {
        throw new Error('Failed to check device history');
      }

      return await response.json();
    } catch (error) {
      console.warn('Failed to check device history:', error);
      return { hasHistory: false, registrations: 0 };
    }
  }

  static async recordDeviceRegistration(fingerprint: string, userId: string, email: string): Promise<void> {
    try {
      await fetch('/api/record-device-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint, userId, email })
      });
    } catch (error) {
      console.warn('Failed to record device registration:', error);
    }
  }
}
