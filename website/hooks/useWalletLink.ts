import { useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { ethers } from 'ethers';
import { showToast } from '@/lib/toast';
import api from '@/lib/api-client';

export interface LinkedWallet {
  id: string;
  address: string;
  network: string;
  label: string;
  primary: boolean;
  source: string;
}

export function useWalletLink() {
  const { user } = useUser();
  const [wallets, setWallets] = useState<LinkedWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWallets = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      // We use the profile endpoint to get wallets
      const response = await api.get('/api/user/profile'); 
      if (response.data.user && response.data.user.wallets) {
         setWallets(response.data.user.wallets.map((w: any) => ({
            id: w._id,
            address: w.address,
            network: w.network,
            label: w.label,
            primary: w.primary,
            source: w.source
         })));
      }
    } catch (err: any) {
      console.error('Error fetching wallets:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const linkWallet = useCallback(async (address: string, network: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Get Nonce
      const nonceRes = await api.post('/api/wallets/nonce', { address, network });
      const { nonceId, typedData } = nonceRes.data;

      // 2. Sign Typed Data
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      // EIP-712 Signing
      const signature = await signer.signTypedData(
        typedData.domain,
        typedData.types,
        typedData.value
      );

      // 3. Verify & Link
      const verifyRes = await api.post('/api/wallets/verify', {
        nonceId,
        address,
        signature,
        network,
        typedData,
      });

      const newWallet = verifyRes.data.wallet;
      
      setWallets(prev => {
        const filtered = prev.filter(w => w.address.toLowerCase() !== address.toLowerCase());
        return [...filtered, {
            id: newWallet._id,
            address: newWallet.address,
            network: newWallet.network,
            label: newWallet.label,
            primary: newWallet.primary,
            source: newWallet.source
        }];
      });

      showToast.success('Wallet linked successfully!');
      return newWallet;

    } catch (err: any) {
      console.error('Link wallet error:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to link wallet';
      setError(msg);
      showToast.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const setPrimaryWallet = useCallback(async (walletId: string) => {
    try {
      setLoading(true);
      await api.post('/api/wallets/primary', { walletId });
      
      setWallets(prev => prev.map(w => ({
        ...w,
        primary: w.id === walletId
      })));
      
      showToast.success('Primary wallet updated');
    } catch (err: any) {
      console.error('Set primary error:', err);
      showToast.error('Failed to update primary wallet');
    } finally {
      setLoading(false);
    }
  }, []);

  const removeWallet = useCallback(async (walletId: string) => {
    try {
      setLoading(true);
      await api.post('/api/wallets/remove', { walletId });
      
      setWallets(prev => prev.filter(w => w.id !== walletId));
      showToast.success('Wallet removed');
    } catch (err: any) {
      console.error('Remove wallet error:', err);
      showToast.error('Failed to remove wallet');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    wallets,
    loading,
    error,
    fetchWallets,
    linkWallet,
    setPrimaryWallet,
    removeWallet,
  };
}
