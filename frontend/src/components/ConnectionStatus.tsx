'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConnectionStatusProps {
  isConnected: boolean;
  isReconnecting?: boolean;
  onRetry?: () => void;
  className?: string;
}

export default function ConnectionStatus({ 
  isConnected, 
  isReconnecting = false, 
  onRetry,
  className = '' 
}: ConnectionStatusProps) {
  const [showStatus, setShowStatus] = useState(false);
  const [wasConnected, setWasConnected] = useState(isConnected);

  useEffect(() => {
    if (isConnected !== wasConnected) {
      setShowStatus(true);
      setWasConnected(isConnected);
      
      // Auto-hide success message after 3 seconds
      if (isConnected) {
        setTimeout(() => setShowStatus(false), 3000);
      }
    }
  }, [isConnected, wasConnected]);

  if (!showStatus && isConnected) {
    return null;
  }

  const getStatusInfo = () => {
    if (isReconnecting) {
      return {
        icon: <AlertCircle className="w-4 h-4 animate-pulse" />,
        text: 'Reconnecting...',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-200'
      };
    }
    
    if (isConnected) {
      return {
        icon: <Wifi className="w-4 h-4" />,
        text: 'Connected',
        bgColor: 'bg-green-50',
        textColor: 'text-green-800',
        borderColor: 'border-green-200'
      };
    }
    
    return {
      icon: <WifiOff className="w-4 h-4" />,
      text: 'Disconnected',
      bgColor: 'bg-red-50',
      textColor: 'text-red-800',
      borderColor: 'border-red-200'
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className={`
        flex items-center space-x-2 px-3 py-2 rounded-lg border
        ${statusInfo.bgColor} ${statusInfo.textColor} ${statusInfo.borderColor}
        shadow-lg transition-all duration-300
      `}>
        {statusInfo.icon}
        <span className="text-sm font-medium">{statusInfo.text}</span>
        
        {!isConnected && !isReconnecting && onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="ml-2 h-6 px-2 text-xs"
          >
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
