import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  url?: string;
  userId?: string;
  role?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

export function useWebSocket({
  url,
  userId,
  role,
  onConnect,
  onDisconnect,
  onError
}: UseWebSocketOptions) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxAttempts = 5;
  const baseDelay = 2000;

  const connect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const wsUrl = url || process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    console.log('🔌 Connecting to WebSocket:', wsUrl);

    const newSocket = io(wsUrl, {
      transports: ['polling', 'websocket'],
      timeout: 30000,
      forceNew: true,
      reconnection: false, // We'll handle reconnection manually
      autoConnect: true,
      upgrade: true,
      rememberUpgrade: false,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
      setIsReconnecting(false);
      setConnectionAttempts(0);
      
      if (userId && role) {
        newSocket.emit('join_game', { userId, role });
      }
      
      onConnect?.();
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      setIsConnected(false);
      onDisconnect?.();
      
      // Only attempt reconnection for certain disconnect reasons
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        // Server or client initiated disconnect - don't reconnect
        return;
      }
      
      // Network issues - attempt reconnection
      if (connectionAttempts < maxAttempts) {
        const delay = baseDelay * Math.pow(2, connectionAttempts);
        console.log(`🔄 Attempting reconnection in ${delay}ms (attempt ${connectionAttempts + 1}/${maxAttempts})`);
        
        setIsReconnecting(true);
        setConnectionAttempts(prev => prev + 1);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      } else {
        console.log('❌ Max reconnection attempts reached');
        setIsReconnecting(false);
        onError?.(new Error('Max reconnection attempts reached'));
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      setIsConnected(false);
      onError?.(error);
      
      // Emit global error event for MobileErrorHandler
      window.dispatchEvent(new CustomEvent('websocket-error', { detail: error }));
    });

    newSocket.on('reconnect', () => {
      console.log('✅ WebSocket reconnected');
      setIsReconnecting(false);
      setConnectionAttempts(0);
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 WebSocket reconnection attempt ${attemptNumber}`);
      setIsReconnecting(true);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('❌ WebSocket reconnection error:', error);
      onError?.(error);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ WebSocket reconnection failed');
      setIsReconnecting(false);
      onError?.(new Error('Reconnection failed'));
    });
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setSocket(null);
    setIsConnected(false);
    setIsReconnecting(false);
    setConnectionAttempts(0);
  };

  const forceReconnect = () => {
    console.log('🔄 Force reconnecting WebSocket...');
    disconnect();
    setConnectionAttempts(0);
    setTimeout(() => {
      connect();
    }, 1000);
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [url, userId, role]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    socket,
    isConnected,
    isReconnecting,
    connectionAttempts,
    connect,
    disconnect,
    forceReconnect
  };
}
