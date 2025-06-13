import { NextRequest, NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';

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
        const fingerprintCounts = new Map();
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const fingerprint = data.fingerprint;
          fingerprintCounts.set(fingerprint, (fingerprintCounts.get(fingerprint) || 0) + 1);
        });
        return Array.from(fingerprintCounts.entries()).filter(([, count]) => count > 1);
      })
    ]);

    // Analyze device patterns
    const deviceData = deviceHistory.docs.map(doc => doc.data());
    const ipData = ipHistory.docs.map(doc => doc.data());
    
    // Group by fingerprint to find repeat devices
    const fingerprintGroups = new Map();
    deviceData.forEach(device => {
      const fp = device.fingerprint;
      if (!fingerprintGroups.has(fp)) {
        fingerprintGroups.set(fp, []);
      }
      fingerprintGroups.get(fp).push(device);
    });

    // Group by IP to find repeat IPs
    const ipGroups = new Map();
    ipData.forEach(ip => {
      const addr = ip.ipAddress;
      if (!ipGroups.has(addr)) {
        ipGroups.set(addr, []);
      }
      ipGroups.get(addr).push(ip);
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
        repeatDevices: Array.from(fingerprintGroups.values()).filter(devices => devices.length > 1).length,
        repeatIPs: Array.from(ipGroups.values()).filter(ips => ips.length > 1).length
      },
      details: {
        topRepeatDevices: Array.from(fingerprintGroups.entries())
          .filter(([, devices]) => devices.length > 1)
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, 10)
          .map(([fingerprint, devices]) => ({
            fingerprint: fingerprint.substring(0, 12) + '...',
            registrations: devices.length,
            emails: devices.map(d => d.email),
            lastSeen: devices[devices.length - 1].lastSeen
          })),
        topRepeatIPs: Array.from(ipGroups.entries())
          .filter(([, ips]) => ips.length > 1)
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, 10)
          .map(([ip, ips]) => ({
            ipAddress: ip,
            registrations: ips.length,
            emails: ips.map(i => i.email),
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
