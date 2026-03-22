"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import api from "@/lib/api-client";
import { useUserSync } from "@/hooks/useUserSync";

export default function ListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, loading: authLoading } = useUserSync();
  const prefillTokenId = searchParams.get("tokenId");

  const [tokenId, setTokenId] = useState(prefillTokenId || "");
  const [price, setPrice] = useState("");
  const [inrPrice, setInrPrice] = useState<number | null>(null);
  const [ethToInrRate, setEthToInrRate] = useState<number | null>(null);
  const [currency, setCurrency] = useState("ETH");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isSignedIn) {
      router.push("/");
    }
  }, [authLoading, isSignedIn, router]);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await api.get('/api/eth-price');
        if (res.data.success) {
          setEthToInrRate(res.data.inrPrice);
        }
      } catch (err) {
        console.error("Failed to fetch ETH exchange rate", err);
      }
    };
    fetchRate();
  }, []);

  const handlePriceChange = (val: string) => {
    setPrice(val);
    if (!val || isNaN(Number(val))) {
      setInrPrice(null);
    } else if (ethToInrRate) {
      if (currency === 'ETH') {
        setInrPrice(Number(val) * ethToInrRate);
      } else if (currency === 'INR') {
        setInrPrice(Number(val) / ethToInrRate); // Store ETH eq in inrPrice to display it!
      }
    }
  };

  const handleCurrencyChange = (val: string) => {
    setCurrency(val);
    if (ethToInrRate && price && !isNaN(Number(price))) {
       if (val === 'ETH') {
         setInrPrice(Number(price) * ethToInrRate);
       } else if (val === 'INR') {
         setInrPrice(Number(price) / ethToInrRate); // This string stores ETH amount when INR is selected!
       } else {
         setInrPrice(null);
       }
    } else {
      setInrPrice(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenId || !price) return;
    setIsSubmitting(true);
    
    try {
      // If user listed in INR, convert to ETH before submitting
      let finalPrice = price;
      let finalCurrency = currency;
      
      if (currency === 'INR' && ethToInrRate) {
         finalPrice = String(Number(price) / ethToInrRate);
         finalCurrency = 'ETH';
      }

      const response = await api.post('/api/market/list', {
        tokenId,
        price: finalPrice,
        currency: finalCurrency
      });

      if (response.data.success) {
        toast.success("Item listed for sale successfully!");
        router.push("/marketplace");
      }
    } catch (error: any) {
      console.error("Listing error:", error);
      toast.error(error.response?.data?.error || "Failed to list item");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>List NFT for Sale</CardTitle>
            <CardDescription>Set a price for your land asset.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="tokenId">Token ID</Label>
                <Input 
                  id="tokenId" 
                  placeholder="e.g. 1" 
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  readOnly={!!prefillTokenId}
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="price" 
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="0.5" 
                    className="pl-9" 
                    value={price}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    required 
                  />
                </div>
                {inrPrice !== null && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {currency === 'ETH' 
                      ? `≈ ₹${inrPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` 
                      : currency === 'INR' 
                        ? `≈ ${inrPrice.toFixed(4)} ETH` 
                        : ''}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ETH">ETH</SelectItem>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="USDT">USDT</SelectItem>
                    <SelectItem value="MATIC">MATIC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Listing..." : "Approve & List"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
