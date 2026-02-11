"use client";

import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";

interface AddToMetaMaskProps {
  tokenAddress: string;
  tokenId: string;
  tokenImage: string;
  className?: string;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function AddToMetaMask({ tokenAddress, tokenId, tokenImage, className }: AddToMetaMaskProps) {
  const addAsset = async () => {
    if (!window.ethereum) {
      toast.error("MetaMask is not installed!");
      return;
    }

    try {
      // Note: wallet_watchAsset for ERC721 is experimental and may not work on all MetaMask versions (especially desktop)
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC721',
          options: {
            address: tokenAddress,
            tokenId: tokenId,
            symbol: 'LAND', 
            decimals: 0,
            image: tokenImage,
          },
        },
      });
      toast.success("Token added to MetaMask!");
    } catch (error: any) {
      console.error("MetaMask Error:", error);
      
      // Fallback: Copy details to clipboard
      const details = `Address: ${tokenAddress}\nToken ID: ${tokenId}`;
      await navigator.clipboard.writeText(tokenAddress);
      
      toast.error("Automatic adding not supported on this device.");
      toast.info("Contract Address copied! Add manually in MetaMask 'NFTs' tab.");
    }
  };

  return (
    <Button variant="outline" onClick={addAsset} className={className}>
      <PlusCircle className="w-4 h-4 mr-2" />
      Add to MetaMask
    </Button>
  );
}
