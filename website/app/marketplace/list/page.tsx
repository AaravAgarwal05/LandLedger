"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { IndianRupee, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import api from "@/lib/api-client";
import { useUserSync } from "@/hooks/useUserSync";
import { fetchEthToInrRate, inrToWei } from "@/lib/utils/pricing";
import { ethers } from "ethers";

function ListFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, loading: authLoading } = useUserSync();
  const prefillTokenId = searchParams.get("tokenId");

  const [tokenId, setTokenId] = useState(prefillTokenId || "");
  const [priceInr, setPriceInr] = useState("");   // what user types — always INR
  const [ethRate, setEthRate] = useState<number>(250000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isSignedIn) router.push("/");
  }, [authLoading, isSignedIn, router]);

  useEffect(() => {
    fetchEthToInrRate().then(setEthRate);
  }, []);

  // Derived ETH preview
  const ethPreview = priceInr && !isNaN(Number(priceInr)) && ethRate
    ? (Number(priceInr) / ethRate).toFixed(6)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenId || !priceInr || isNaN(Number(priceInr)) || Number(priceInr) <= 0) {
      toast.error("Please enter a valid price in ₹ INR");
      return;
    }
    setIsSubmitting(true);

    try {
      // Convert INR → ETH (float) for the DB
      const priceEth = Number(priceInr) / ethRate;

      const response = await api.post('/api/market/list', {
        tokenId,
        price: priceEth.toFixed(8),  // ETH as string with 8 decimal places
        currency: 'ETH',              // Always ETH in the backend
        priceInr: Number(priceInr),   // Store original INR for display convenience
      });

      if (response.data.success) {
        toast.success("Land listed for sale successfully!");
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
            <CardTitle>List Land NFT for Sale</CardTitle>
            <CardDescription>
              Enter your asking price in ₹ INR — we handle the ETH conversion automatically.
            </CardDescription>
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
                <Label htmlFor="price">Price (₹ INR)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="price"
                    type="number"
                    step="1"
                    min="1"
                    placeholder="e.g. 500000"
                    className="pl-9"
                    value={priceInr}
                    onChange={(e) => setPriceInr(e.target.value)}
                    required
                  />
                </div>
                {ethPreview && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ≈ <span className="font-mono">{ethPreview} ETH</span>
                    <span className="ml-2 text-xs opacity-60">(at today's rate: ₹{ethRate.toLocaleString('en-IN')}/ETH)</span>
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting || !priceInr}>
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Listing...</>
                ) : (
                  "List for Sale"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function ListPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ListFormContent />
    </Suspense>
  );
}
