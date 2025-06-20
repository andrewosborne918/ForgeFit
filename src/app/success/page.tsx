'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';

// Client component that uses useSearchParams
function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get('session_id');
  const success = searchParams?.get('success');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (sessionId || success) {
      // Redirect to dashboard with success parameter
      const redirectUrl = new URL('/dashboard', window.location.origin);
      if (success) redirectUrl.searchParams.set('success', 'true');
      if (sessionId) redirectUrl.searchParams.set('session_id', sessionId);
      
      router.replace(redirectUrl.toString());
    }
  }, [sessionId, success, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Payment Successful!
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Thank you for subscribing to ForgeFit Pro! Your subscription is now active.
        </p>
        
        <div className="flex flex-col space-y-3">
          <Button 
            onClick={() => router.push('/dashboard')}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            Go to Dashboard
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => router.push('/')}
            className="w-full"
          >
            Back to Home
          </Button>
        </div>
        
        <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          <p>Need help? <a href="mailto:support@forgefit.pro" className="text-orange-500 hover:underline">Contact support</a></p>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense
export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
