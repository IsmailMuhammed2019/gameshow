'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface MobileErrorHandlerProps {
  children: React.ReactNode;
}

export default function MobileErrorHandler({ children }: MobileErrorHandlerProps) {
  const [hasError, setHasError] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [connectionIssues, setConnectionIssues] = useState<string[]>([]);
  const [lastErrorTime, setLastErrorTime] = useState<number>(0);

  useEffect(() => {
    // Detect mobile device
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(isMobileDevice);

    // Global error handler for all browsers
    const handleError = (event: ErrorEvent) => {
      console.error('Mobile Error:', event.error);
      const now = Date.now();
      
      // Reset error count if it's been more than 30 seconds since last error
      if (now - lastErrorTime > 30000) {
        setErrorCount(1);
      } else {
        setErrorCount(prev => prev + 1);
      }
      
      setLastErrorTime(now);
      
      // Track specific error types
      const errorMessage = event.error?.message || event.message || 'Unknown error';
      if (errorMessage.includes('WebSocket') || errorMessage.includes('socket')) {
        setConnectionIssues(prev => [...prev, 'WebSocket connection failed']);
      }
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        setConnectionIssues(prev => [...prev, 'Network request failed']);
      }
      
      // If too many errors in short time, show error screen
      if (errorCount >= 3) {
        setHasError(true);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Mobile Unhandled Promise Rejection:', event.reason);
      const now = Date.now();
      
      if (now - lastErrorTime > 30000) {
        setErrorCount(1);
      } else {
        setErrorCount(prev => prev + 1);
      }
      
      setLastErrorTime(now);
      
      if (errorCount >= 3) {
        setHasError(true);
      }
    };

    // Listen for network status changes
    const handleOnline = () => {
      console.log('Network: Online');
      setConnectionIssues(prev => prev.filter(issue => !issue.includes('Network')));
    };

    const handleOffline = () => {
      console.log('Network: Offline');
      setConnectionIssues(prev => [...prev, 'Network connection lost']);
    };

    // Listen for WebSocket connection issues
    const handleWebSocketError = () => {
      setConnectionIssues(prev => [...prev, 'WebSocket connection lost']);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for WebSocket events globally
    window.addEventListener('websocket-error', handleWebSocketError);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('websocket-error', handleWebSocketError);
    };
  }, [errorCount, lastErrorTime]);

  const handleRetry = () => {
    setHasError(false);
    setErrorCount(0);
    setConnectionIssues([]);
    setLastErrorTime(0);
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
    setHasError(false);
    setErrorCount(0);
    setConnectionIssues([]);
    window.location.reload();
  };

  const handleForceReconnect = () => {
    // Force close all WebSocket connections
    if ((window as any).io) {
      (window as any).io.disconnect();
    }
    
    // Clear any pending requests
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    setHasError(false);
    setErrorCount(0);
    setConnectionIssues([]);
    window.location.reload();
  };

  if (hasError && isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-xl text-gray-900">
              Mobile Connection Issue
            </CardTitle>
            <CardDescription>
              The app is having trouble maintaining a stable connection on your mobile device.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
              <strong>Error Count:</strong> {errorCount} errors detected
              {connectionIssues.length > 0 && (
                <div className="mt-2">
                  <strong>Issues:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {connectionIssues.slice(-3).map((issue, index) => (
                      <li key={index} className="text-xs">{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="flex flex-col space-y-2">
              <Button 
                onClick={handleRetry}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Connection
              </Button>
              
              <Button 
                onClick={handleForceReconnect}
                className="w-full"
                variant="outline"
              >
                <Wifi className="w-4 h-4 mr-2" />
                Force Reconnect
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
              <p><strong>Mobile Tips:</strong></p>
              <p>• Check your WiFi/cellular connection</p>
              <p>• Try switching between WiFi and mobile data</p>
              <p>• Close and reopen the browser</p>
              <p>• Restart your mobile browser</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
