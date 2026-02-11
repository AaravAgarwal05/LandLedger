"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import apiClient from '@/lib/api-client';
import { showToast } from '@/lib/toast';

interface DbUser {
  id: string;
  clerkUserId: string;
  email?: string;
  displayName: string;
  roles: string[];
  kycStatus: string;
  publicProfile?: any;
  primaryWalletId?: string;
}

/**
 * Custom hook to sync Clerk user with database
 * Automatically creates/updates user in MongoDB when Clerk user is loaded
 */
export function useUserSync() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function syncUser() {
      if (!isLoaded) return;

      if (!isSignedIn || !user) {
        setDbUser(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // First, try to get existing user
        const getResponse = await apiClient.get('/api/auth/sync-user');
        
        if (getResponse.data.success) {
          setDbUser(getResponse.data.user);
          setLoading(false);
          return;
        }
      } catch (getError: any) {
        // User doesn't exist, create them
        if (getError.response?.status === 404) {
          try {
            const createResponse = await apiClient.post('/api/auth/sync-user', {
              email: user.primaryEmailAddress?.emailAddress,
              displayName: user.fullName || user.username || 'User',
            });

            if (createResponse.data.success) {
              setDbUser(createResponse.data.user);
              showToast.success('Welcome! Your account has been created.');
            }
          } catch (createError: any) {
            console.error('Error creating user:', createError);
            setError('Failed to create user account');
            showToast.error('Failed to create account. Please try again.');
          }
        } else {
          console.error('Error fetching user:', getError);
          setError('Failed to load user data');
        }
      } finally {
        setLoading(false);
      }
    }

    syncUser();
  }, [isLoaded, isSignedIn, user]);

  return {
    user: dbUser,
    clerkUser: user,
    loading,
    error,
    isSignedIn,
    refetch: async () => {
      if (!isSignedIn) return;
      
      try {
        const response = await apiClient.get('/api/auth/sync-user');
        if (response.data.success) {
          setDbUser(response.data.user);
        }
      } catch (error) {
        console.error('Error refetching user:', error);
      }
    },
  };
}
