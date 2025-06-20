"use client";

import { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface WorkoutPlan {
  id?: string;
  title?: string;
  duration?: string | number;
  imageUrl?: string;
}

interface CompletedPlan {
  id: string;
  plan?: WorkoutPlan;
  image?: string;
  timestamp?: number;
  createdAt?: string;
}

export default function DashboardContent() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedPlans, setCompletedPlans] = useState<CompletedPlan[]>([]);

  useEffect(() => {
    console.log('DashboardContent mounted');
    
    if (!authLoading && !user) {
      console.log('No user, redirecting to signin');
      router.push('/auth/signin');
      return;
    }

    if (user) {
      console.log('User found, loading data...');
      loadUserData();
    }
  }, [user, authLoading, router]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      // Add your data loading logic here
      // For now, we'll simulate a successful load
      setTimeout(() => {
        setCompletedPlans([]);
        setLoading(false);
      }, 1000);
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Failed to load dashboard data. Please try again.');
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Something went wrong</h3>
          <p className="text-red-700 dark:text-red-300 mt-2">{error}</p>
          <Button 
            onClick={loadUserData} 
            variant="outline" 
            className="mt-4 bg-white dark:bg-gray-900"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.displayName || 'User'}</h1>
        <p className="text-muted-foreground">Here's your fitness dashboard</p>
      </div>

      <div className="grid gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          {completedPlans.length > 0 ? (
            <div className="space-y-4">
              {completedPlans.map((plan) => (
                <div key={plan.id} className="border-b pb-4 last:border-0 last:pb-0">
                  <h3 className="font-medium">{plan.plan?.title || 'Workout'}</h3>
                  {plan.timestamp && (
                    <p className="text-sm text-muted-foreground">
                      Completed on {new Date(plan.timestamp).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No recent activity found.</p>
              <Button className="mt-4">Start a Workout</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
