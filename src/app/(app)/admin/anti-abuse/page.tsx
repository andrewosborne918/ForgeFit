"use client"

import { useState, useEffect, useCallback } from 'react';

interface AntiAbuseStats {
  period: string;
  summary: {
    newRegistrations: number;
    deletedAccounts: number;
    deviceRegistrations: number;
    uniqueDevices: number;
    uniqueIPs: number;
    suspiciousDevices: number;
    repeatDevices: number;
    repeatIPs: number;
  };
  details: {
    topRepeatDevices: Array<{
      fingerprint: string;
      registrations: number;
      emails: string[];
      lastSeen: Date | string | null;
    }>;
    topRepeatIPs: Array<{
      ipAddress: string;
      registrations: number;
      emails: string[];
      lastSeen: Date | string | null;
    }>;
    recentDeletions: Array<{
      email: string;
      deletedAt: Date | string | { seconds: number, nanoseconds: number } | null;
      workoutsUsed: number;
      plan: string;
    }>;
  };
}

export default function AntiAbuseDashboard() {
  const [stats, setStats] = useState<AntiAbuseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/anti-abuse-stats?days=${days}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch anti-abuse stats:', error);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchStats();
  }, [days, fetchStats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">Loading anti-abuse statistics...</div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center text-red-500">Failed to load anti-abuse statistics</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            🛡️ Anti-Abuse Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Period:
            </label>
            <select 
              value={days} 
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value={1}>1 day</option>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
            <button 
              onClick={fetchStats}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-green-600">{stats.summary.newRegistrations}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">New Registrations</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-red-600">{stats.summary.deletedAccounts}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Deleted Accounts</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-orange-600">{stats.summary.repeatDevices}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Repeat Devices</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-purple-600">{stats.summary.suspiciousDevices}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Suspicious Devices</div>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Repeat Devices */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Top Repeat Devices
            </h3>
            <div className="space-y-3">
              {stats.details.topRepeatDevices.map((device, index) => (
                <div key={index} className="border-l-4 border-orange-500 pl-4">
                  <div className="font-mono text-sm text-slate-600 dark:text-slate-400">
                    {device.fingerprint}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">{device.registrations}</span> registrations
                  </div>
                  <div className="text-xs text-slate-500">
                    {device.emails.slice(0, 3).join(', ')}
                    {device.emails.length > 3 && ` +${device.emails.length - 3} more`}
                  </div>
                </div>
              ))}
              {stats.details.topRepeatDevices.length === 0 && (
                <div className="text-slate-500 dark:text-slate-400">No repeat devices detected</div>
              )}
            </div>
          </div>

          {/* Recent Deletions */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Recent Account Deletions
            </h3>
            <div className="space-y-3">
              {stats.details.recentDeletions.map((deletion, index) => (
                <div key={index} className="border-l-4 border-red-500 pl-4">
                  <div className="font-medium text-sm text-slate-700 dark:text-slate-300">
                    {deletion.email}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {deletion.workoutsUsed} workouts used • {deletion.plan} plan
                  </div>
                  <div className="text-xs text-slate-500">
                    {(() => {
                      const deletedAt = deletion.deletedAt as { seconds: number } | string | number | Date | null | undefined;
                      
                      const date = 
                        deletedAt && typeof deletedAt === 'object' && 'seconds' in deletedAt
                          ? new Date((deletedAt as { seconds: number }).seconds * 1000)
                          : new Date(deletedAt as string | number | Date);
                      
                      return `Deleted: ${date.toLocaleDateString()}`;
                    })()}
                  </div>
                </div>
              ))}
              {stats.details.recentDeletions.length === 0 && (
                <div className="text-slate-500 dark:text-slate-400">No recent deletions</div>
              )}
            </div>
          </div>
        </div>

        {/* Registration Validation Test */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Test Registration Validation
          </h3>
          <TestValidation />
        </div>
      </div>
    </div>
  );
}

function TestValidation() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [testing, setTesting] = useState(false);

  const testValidation = async () => {
    if (!email) return;
    
    setTesting(true);
    try {
      // Generate a test device fingerprint
      const testFingerprint = `test-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      
      const response = await fetch('/api/validate-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          deviceFingerprint: testFingerprint
        })
      });
      
      const data = await response.json();
      setResult(data);
    } catch {
      setResult({ error: 'Failed to test validation' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="test@example.com"
          className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
        />
        <button
          onClick={testValidation}
          disabled={testing || !email}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
        >
          {testing ? 'Testing...' : 'Test'}
        </button>
      </div>
      
      {result && (
        <div className={`p-4 rounded-md ${
          result.allowed 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          <div className="font-medium">
            {result.allowed ? '✅ Registration Allowed' : '❌ Registration Blocked'}
          </div>
          <div className="text-sm mt-1">
            Risk Level: <span className="font-medium">
              {typeof result.riskLevel === 'string' || typeof result.riskLevel === 'number'
                ? result.riskLevel
                : 'Unknown'}
            </span>
          </div>
          {Array.isArray(result.reasons) && result.reasons.length > 0 ? (
            <div className="text-sm mt-2">
              <strong>Reasons:</strong>
              <ul className="list-disc list-inside ml-2">
                {result.reasons.map((reason: unknown, i: number) => (
                  <li key={i}>{typeof reason === 'string' ? reason : 'Unknown reason'}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
