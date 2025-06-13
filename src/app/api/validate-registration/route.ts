import { NextRequest, NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';

interface RegistrationValidationRequest {
  email: string;
  deviceFingerprint: string;
  ipAddress?: string;
}

interface ValidationResult {
  allowed: boolean;
  reasons: string[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendedAction: 'allow' | 'warn' | 'block';
  details?: {
    emailHistory?: Record<string, unknown>;
    deviceHistory?: Record<string, unknown>;
    ipHistory?: Record<string, unknown>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { email, deviceFingerprint, ipAddress }: RegistrationValidationRequest = await request.json();

    if (!email || !deviceFingerprint) {
      return NextResponse.json(
        { error: 'Email and device fingerprint are required' },
        { status: 400 }
      );
    }

    const adminDB = getAdminDB();
    if (!adminDB) {
      // If we can't check, allow registration but log the issue
      console.warn('Firebase Admin not available for registration validation');
      return NextResponse.json({
        allowed: true,
        reasons: ['Unable to validate - Firebase Admin unavailable'],
        riskLevel: 'medium',
        recommendedAction: 'allow'
      } as ValidationResult);
    }

    const result: ValidationResult = {
      allowed: true,
      reasons: [],
      riskLevel: 'low',
      recommendedAction: 'allow',
      details: {}
    };

    // Check 1: Email blacklist (deleted emails)
    const emailCheck = await adminDB
      .collection('deletedEmails')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (!emailCheck.empty) {
      const emailData = emailCheck.docs[0].data();
      result.allowed = false;
      result.riskLevel = 'high';
      result.recommendedAction = 'block';
      result.reasons.push(`Email was previously used and deleted on ${emailData.deletedAt?.toDate?.()?.toLocaleDateString()}`);
      result.details.emailHistory = {
        deletedAt: emailData.deletedAt,
        workoutsUsed: emailData.workoutsUsed,
        plan: emailData.plan
      };
    }

    // Check 2: Device fingerprint history
    const deviceCheck = await adminDB
      .collection('deviceHistory')
      .where('fingerprint', '==', deviceFingerprint)
      .get();

    if (!deviceCheck.empty) {
      const registrations = deviceCheck.docs.length;
      const deviceData = deviceCheck.docs.map(doc => doc.data());
      
      // Count recent registrations (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentRegistrations = deviceData.filter(d => 
        d.registeredAt?.toDate?.() > thirtyDaysAgo
      ).length;

      result.details.deviceHistory = {
        totalRegistrations: registrations,
        recentRegistrations,
        lastSeen: deviceData[deviceData.length - 1]?.lastSeen,
        emails: deviceData.map(d => d.email)
      };

      if (registrations >= 3) {
        result.riskLevel = 'high';
        result.allowed = false;
        result.recommendedAction = 'block';
        result.reasons.push(`Device has been used for ${registrations} registrations`);
      } else if (recentRegistrations >= 2) {
        result.riskLevel = 'medium';
        result.recommendedAction = 'warn';
        result.reasons.push(`Device used for ${recentRegistrations} recent registrations`);
      }
    }

    // Check 3: IP address patterns (if provided)
    if (ipAddress) {
      const ipCheck = await adminDB
        .collection('ipHistory')
        .where('ipAddress', '==', ipAddress)
        .get();

      if (!ipCheck.empty) {
        const ipRegistrations = ipCheck.docs.length;
        result.details.ipHistory = {
          registrations: ipRegistrations,
          firstSeen: ipCheck.docs[0].data().firstSeen
        };

        if (ipRegistrations >= 5) {
          result.riskLevel = 'high';
          result.recommendedAction = 'warn';
          result.reasons.push(`IP address has ${ipRegistrations} registrations`);
        }
      }
    }

    // Check 4: Current active users with similar patterns
    const activeUsersCheck = await adminDB
      .collection('users')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (!activeUsersCheck.empty) {
      result.allowed = false;
      result.riskLevel = 'high';
      result.recommendedAction = 'block';
      result.reasons.push('Email is already registered');
    }

    console.log(`🔍 Registration validation for ${email}:`, {
      allowed: result.allowed,
      riskLevel: result.riskLevel,
      reasons: result.reasons
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error validating registration:', error);
    // If validation fails, allow registration but log the error
    return NextResponse.json({
      allowed: true,
      reasons: ['Validation system error - allowing registration'],
      riskLevel: 'medium',
      recommendedAction: 'allow',
      error: 'Validation system unavailable'
    } as ValidationResult);
  }
}

// GET endpoint to get registration statistics
export async function GET(request: NextRequest) {
  try {
    const adminDB = getAdminDB();
    if (!adminDB) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7'; // days

    const periodDays = parseInt(period);
    const sinceDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    // Get registration stats
    const [deletedEmails, deviceHistory, users] = await Promise.all([
      adminDB.collection('deletedEmails').where('deletedAt', '>', sinceDate).get(),
      adminDB.collection('deviceHistory').where('registeredAt', '>', sinceDate).get(),
      adminDB.collection('users').where('createdAt', '>', sinceDate).get()
    ]);

    return NextResponse.json({
      period: `${periodDays} days`,
      stats: {
        newRegistrations: users.size,
        deletedAccounts: deletedEmails.size,
        deviceRegistrations: deviceHistory.size,
        suspiciousActivity: deviceHistory.docs.filter(doc => {
          // Count as suspicious if device was used multiple times
          return deviceHistory.docs.filter(d => 
            d.data().fingerprint === doc.data().fingerprint
          ).length > 1;
        }).length
      }
    });

  } catch (error) {
    console.error('Error getting registration stats:', error);
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}
