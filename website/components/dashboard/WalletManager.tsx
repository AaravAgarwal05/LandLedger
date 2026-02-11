"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wallet, Trash2, ShieldCheck, Plus, Loader2, AlertCircle } from 'lucide-react';
import { useWalletLink } from '@/hooks/useWalletLink';
import { connectWallet } from '@/lib/ethers';
import { showToast } from '@/lib/toast';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';

export default function WalletManager() {
  const { wallets, loading, error, fetchWallets, linkWallet, removeWallet, setPrimaryWallet } = useWalletLink();
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch wallets on mount
  useEffect(() => {
    fetchWallets();
  }, []);

  const handleConnectAndLink = async () => {
    try {
      setIsConnecting(true);
      
      // 1. Connect to browser wallet (MetaMask)
      const address = await connectWallet();
      if (!address) {
        throw new Error("Failed to connect wallet");
      }

      // 2. Get network ID
      const provider = (window as any).ethereum;
      const chainId = await provider.request({ method: 'eth_chainId' });
      const networkName = parseInt(chainId, 16) === 11155111 ? 'sepolia' : 'unknown';

      // 3. Link to backend
      await linkWallet(address, networkName);

    } catch (err: any) {
      console.error("Wallet connection error:", err);
      // Error is handled by linkWallet or showToast
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Connected Wallets
            </CardTitle>
            <CardDescription>
              Manage wallets linked to your account
            </CardDescription>
          </div>
          <Button 
            onClick={handleConnectAndLink} 
            disabled={isConnecting || loading}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Link New Wallet
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && wallets.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : wallets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            <p>No wallets linked yet.</p>
            <p className="text-sm mt-1">Connect a wallet to start trading.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {wallets.map((wallet) => (
              <div 
                key={wallet.id} 
                className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary rounded-full">
                    <ShieldCheck className={`w-4 h-4 ${wallet.primary ? 'text-green-500' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{wallet.label}</span>
                      {wallet.primary && (
                        <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-500 hover:bg-green-500/20">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                      <span className="mx-2">•</span>
                      {wallet.network}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!wallet.primary && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setPrimaryWallet(wallet.id)}
                      className="text-xs h-8"
                    >
                      Make Primary
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => removeWallet(wallet.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
