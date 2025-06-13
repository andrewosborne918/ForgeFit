import { NextRequest, NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';

interface DeviceRegistrationRequest {
  fingerprint: string;
  userId: string;
  email: string;
  ipAddress?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { fingerprint, userId, email, ipAddress }: DeviceRegistrationRequest = await request.json();

    if (!fingerprint || !userId || !email) {
      return NextResponse.json(
        { error: 'Fingerprint, userId, and email are required' },
        { status: 400 }
      );
    }

    const adminDB = getAdminDB();
    if (!adminDB) {
      console.warn('Firebase Admin not available for device registration');
      // Don't fail registration if this fails
      return NextResponse.json({ success: true, message: 'Registration recorded (admin unavailable)' });
    }

    const now = new Date();

    // Record device history
    await adminDB.collection('deviceHistory').add({
      fingerprint,
      userId,
      email: email.toLowerCase(),
      registeredAt: now,
      lastSeen: now,
      ipAddress: ipAddress || null,
      userAgent: request.headers.get('user-agent') || null
    });

    // Record IP history if provided
    if (ipAddress) {
      await adminDB.collection('ipHistory').add({
        ipAddress,
        userId,
        email: email.toLowerCase(),
        firstSeen: now,
        lastSeen: now,
        deviceFingerprint: fingerprint
      });
    }

    console.log(`📱 Device registration recorded for ${email} (${fingerprint.substring(0, 8)}...)`);

    return NextResponse.json({ 
      success: true, 
      message: 'Device registration recorded' 
    });

  } catch (error) {
    console.error('Error recording device registration:', error);
    // Don't fail registration if this fails
    return NextResponse.json({ 
      success: true, 
      message: 'Registration partially recorded',
      error: 'Device tracking failed'
    });
  }
}
