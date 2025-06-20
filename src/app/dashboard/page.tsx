"use client";

import { useEffect, useState, Suspense } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { app, isFirebaseConfigured } from '@/lib/firebase';
import { getFirestore, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Loading fallback
function DashboardLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4 text-orange-500" />
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  );
}

// Main Dashboard component
function DashboardContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (!app || !isFirebaseConfigured) {
      setError('Firebase is not properly configured');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        if (!user?.uid) return;
        
        const db = getFirestore();
        const workoutsRef = collection(db, 'users', user.uid, 'workouts');
        const q = query(workoutsRef, orderBy('timestamp', 'desc'));
        
        const querySnapshot = await getDocs(q);
        // Process the data as needed
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) return <DashboardLoading />;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <p className="text-muted-foreground">Welcome to your dashboard!</p>
      </div>
    </div>
  );
}

// Main export with ErrorBoundary and Suspense
export default function DashboardPage() {
  return (
    <ErrorBoundary 
      fallback={
        <div className="container mx-auto p-8 text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h2>
          <p className="mb-4">We're having trouble loading the dashboard. Please try refreshing the page.</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-orange-500 hover:bg-orange-600"
          >
            Refresh Page
          </Button>
        </div>
      }
    >
      <Suspense fallback={<DashboardLoading />}>
        <DashboardContent />
      </Suspense>
    </ErrorBoundary>
  );
}
