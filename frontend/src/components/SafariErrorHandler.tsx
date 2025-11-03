'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SafariErrorHandlerProps {
  children: React.ReactNode;
}

export default function SafariErrorHandler({ children }: SafariErrorHandlerProps) {
  const [hasError, setHasError] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    // Detect Safari
    const userAgent = navigator.userAgent;
    const isSafariBrowser = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    setIsSafari(isSafariBrowser);

    // Global error handler for Safari
    const handleError = (event: ErrorEvent) => {
      console.error('Safari Error:', event.error);
      setErrorCount(prev => prev + 1);
      
      // If too many errors, show error screen
      if (errorCount >= 3) {
        setHasError(true);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Safari Unhandled Promise Rejection:', event.reason);
      setErrorCount(prev => prev + 1);
      
      if (errorCount >= 3) {
        setHasError(true);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [errorCount]);

  const handleRetry = () => {
    setHasError(false);
    setErrorCount(0);
    window.location.reload();
  };

  const handleClearCache = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
      });
    }
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  if (hasError && isSafari) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <CardTitle className="text-xl text-gray-900">
              Safari Compatibility Issue
            </CardTitle>
            <CardDescription>
              Safari is having trouble loading the app. This is a known issue with Safari's WebSocket handling.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
              <strong>Error Count:</strong> {errorCount} errors detected
            </div>
            
            <div className="flex flex-col space-y-2">
              <Button 
                onClick={handleRetry}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Loading
              </Button>
              
              <Button 
                onClick={handleClearCache}
                className="w-full"
                variant="outline"
              >
                Clear Cache & Retry
              </Button>
            </div>

            <div className="text-xs text-gray-500 text-center space-y-1">
              <p><strong>Alternative Solutions:</strong></p>
              <p>• Try using Chrome or Firefox browser</p>
              <p>• Clear Safari's cache and cookies</p>
              <p>• Disable Safari's "Prevent Cross-Site Tracking"</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
