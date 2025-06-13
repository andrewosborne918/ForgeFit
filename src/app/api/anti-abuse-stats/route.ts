import { NextRequest, NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';

interface DeviceDoc {
  fingerprint: string;
  email: string;
  lastSeen: Date | string | { seconds: number, nanoseconds: number };
  // Add other properties from your Firestore document if they exist
}

interface IPDoc {
  ipAddress: string;
  email: string;
  lastSeen: Date | string | { seconds: number, nanoseconds: number };
  // Add other properties from your Firestore document if they exist
}

export async function GET(request: NextRequest) {
  try {
    const adminDB = getAdminDB();
    if (!adminDB) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get comprehensive anti-abuse stats
    const [
      deletedEmails,
      deviceHistory, 
      ipHistory,
      users,
      suspiciousDevices
    ] = await Promise.all([
      adminDB.collection('deletedEmails').where('deletedAt', '>', sinceDate).get(),
      adminDB.collection('deviceHistory').where('registeredAt', '>', sinceDate).get(),
      adminDB.collection('ipHistory').where('firstSeen', '>', sinceDate).get(),
      adminDB.collection('users').where('createdAt', '>', sinceDate).get(),
      // Get devices with multiple registrations (suspicious)
      adminDB.collection('deviceHistory').get().then(snapshot => {
        const fingerprintCounts = new Map<string, number>();
        snapshot.docs.forEach(doc => {
          const data = doc.data() as DeviceDoc; // Added type assertion
          const fingerprint = data.fingerprint;
          fingerprintCounts.set(fingerprint, (fingerprintCounts.get(fingerprint) || 0) + 1);
        });
        return Array.from(fingerprintCounts.entries()).filter(([, count]: [string, number]) => count > 1);
      })
    ]);

    // Analyze device patterns
    const deviceData: DeviceDoc[] = deviceHistory.docs.map(doc => doc.data() as DeviceDoc);
    const ipData: IPDoc[] = ipHistory.docs.map(doc => doc.data() as IPDoc);
    
    // Group by fingerprint to find repeat devices
    const fingerprintGroups = new Map<string, DeviceDoc[]>();
    deviceData.forEach(device => {
      const fp = device.fingerprint;
      if (!fingerprintGroups.has(fp)) {
        fingerprintGroups.set(fp, []);
      }
      fingerprintGroups.get(fp)!.push(device); // Added non-null assertion
    });

    // Group by IP to find repeat IPs
    const ipGroups = new Map<string, IPDoc[]>();
    ipData.forEach(ip => {
      const addr = ip.ipAddress;
      if (!ipGroups.has(addr)) {
        ipGroups.set(addr, []);
      }
      ipGroups.get(addr)!.push(ip); // Added non-null assertion
    });

    const stats = {
      period: `${days} days`,
      summary: {
        newRegistrations: users.size,
        deletedAccounts: deletedEmails.size,
        deviceRegistrations: deviceHistory.size,
        uniqueDevices: fingerprintGroups.size,
        uniqueIPs: ipGroups.size,
        suspiciousDevices: suspiciousDevices.length,
        repeatDevices: Array.from(fingerprintGroups.values()).filter((devices: DeviceDoc[]) => devices.length > 1).length,
        repeatIPs: Array.from(ipGroups.values()).filter((ips: IPDoc[]) => ips.length > 1).length
      },
      details: {
        topRepeatDevices: Array.from(fingerprintGroups.entries())
          .filter(([, devices]: [string, DeviceDoc[]]) => devices.length > 1)
          .sort((a: [string, DeviceDoc[]], b: [string, DeviceDoc[]]) => b[1].length - a[1].length)
          .slice(0, 10)
          .map(([fingerprint, devices]: [string, DeviceDoc[]]) => ({
            fingerprint: fingerprint.substring(0, 12) + '...',
            registrations: devices.length,
            emails: devices.map((d: DeviceDoc) => d.email),
            lastSeen: devices[devices.length - 1].lastSeen
          })),
        topRepeatIPs: Array.from(ipGroups.entries())
          .filter(([, ips]: [string, IPDoc[]]) => ips.length > 1)
          .sort((a: [string, IPDoc[]], b: [string, IPDoc[]]) => b[1].length - a[1].length)
          .slice(0, 10)
          .map(([ip, ips]: [string, IPDoc[]]) => ({
            ipAddress: ip,
            registrations: ips.length,
            emails: ips.map((i: IPDoc) => i.email),
            lastSeen: ips[ips.length - 1].lastSeen
          })),
        recentDeletions: deletedEmails.docs.map(doc => {
          const data = doc.data();
          return {
            email: data.email,
            deletedAt: data.deletedAt,
            workoutsUsed: data.workoutsUsed || 0,
            plan: data.plan || 'free'
          };
        })
      }
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error getting anti-abuse stats:', error);
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}
