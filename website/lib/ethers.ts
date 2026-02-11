import { ethers } from 'ethers';

export const getConnectedAddress = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('walletAddress');
  }
  return null;
};

export const connectWallet = async (): Promise<string | null> => {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts.length > 0) {
        const address = accounts[0];
        localStorage.setItem('walletAddress', address);
        return address;
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  } else {
    console.warn("MetaMask not installed");
  }
  return null;
};

export const disconnectWallet = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('walletAddress');
  }
};
