"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { connectWallet, getConnectedAddress, disconnectWallet } from '@/lib/ethers';
import { Wallet, LogOut } from 'lucide-react';

export default function ConnectButton() {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    const storedAddress = getConnectedAddress();
    if (storedAddress) {
      setAddress(storedAddress);
    }
  }, []);

  const handleConnect = async () => {
    const addr = await connectWallet();
    if (addr) {
      setAddress(addr);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setAddress(null);
  };

  if (address) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium font-mono">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleDisconnect} title="Disconnect">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={handleConnect} variant="gradient" className="gap-2">
      <Wallet className="w-4 h-4" />
      Connect Wallet
    </Button>
  );
}
