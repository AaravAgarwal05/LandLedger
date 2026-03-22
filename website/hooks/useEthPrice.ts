import { useState, useEffect } from 'react';
import api from '@/lib/api-client';

export function useEthPrice() {
  const [ethRate, setEthRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const fetchPrice = async () => {
      try {
        const res = await api.get('/api/eth-price');
        if (mounted && res.data.success) {
          setEthRate(res.data.inrPrice);
        }
      } catch (err) {
        console.error('Error fetching ETH price', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchPrice();

    return () => {
      mounted = false;
    };
  }, []);

  const convertEthToInr = (ethAmount: number) => {
    if (!ethRate) return null;
    return ethAmount * ethRate;
  };

  const formatInr = (inrAmount: number | null) => {
    if (inrAmount === null) return '';
    return `₹${inrAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  return { ethRate, loading, convertEthToInr, formatInr };
}
