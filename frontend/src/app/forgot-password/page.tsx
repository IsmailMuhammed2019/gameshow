'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setResetToken(null);
    setIsLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { emailOrUsername });
      setSuccess(true);
      
      // In development, show the token if provided
      if (response.data.resetToken) {
        setResetToken(response.data.resetToken);
      }
    } catch (err: any) {
      let errorMessage = 'Failed to process request';
      
      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;
        
        if (status === 500) {
          errorMessage = data?.message || 'Internal server error. Please try again later.';
        } else {
          errorMessage = data?.message || `Server error (${status})`;
        }
      } else if (err.request) {
        errorMessage = 'Cannot connect to server. Please check if the backend is running.';
      } else {
        errorMessage = err.message || 'An error occurred';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="question-card w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-48 h-24"
            />
          </div>
          <CardTitle className="text-2xl text-orange-600">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email or username to receive a password reset token
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-start">
                <CheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Reset token sent!</p>
                  <p className="text-sm mt-1">
                    {resetToken 
                      ? 'A password reset token has been generated. Use the token below to reset your password:'
                      : 'If an account with that email or username exists, a password reset token has been sent. Check your email or console logs.'}
                  </p>
                  {resetToken && (
                    <div className="mt-3 p-3 bg-white rounded border border-green-300">
                      <p className="text-xs font-mono text-gray-800 break-all">{resetToken}</p>
                      <p className="text-xs text-gray-600 mt-2">
                        Copy this token and use it on the reset password page
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => router.push('/reset-password')}
                  variant="orange"
                  className="flex-1"
                >
                  Go to Reset Password
                </Button>
                <Button
                  onClick={() => {
                    setSuccess(false);
                    setEmailOrUsername('');
                    setResetToken(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Request Another Token
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              
              <div>
                <label htmlFor="emailOrUsername" className="block text-sm font-medium text-gray-700 mb-1">
                  Email or Username
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="emailOrUsername"
                    type="text"
                    required
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    placeholder="Enter your email or username"
                    className="w-full pl-10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="orange"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </div>
                ) : (
                  'Send Reset Token'
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/login')}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center justify-center mx-auto"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

