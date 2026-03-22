"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Tag, Share2, ExternalLink, Loader2, ArrowLeft, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api-client";
import { AddToMetaMask } from "@/components/AddToMetaMask";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

export default function NFTDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const tokenId = params.tokenId as string;
  
  const [land, setLand] = useState<any>(null);
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchNFT = async () => {
      try {
        const response = await api.get(`/api/nfts/${tokenId}`);
        if (response.data.success) {
          setLand(response.data.land);
          setListing(response.data.listing);
        } else {
          setError("NFT not found");
        }
      } catch (err) {
        console.error("Error fetching NFT:", err);
        setError("Failed to load NFT details");
      } finally {
        setLoading(false);
      }
    };

    if (tokenId) {
      fetchNFT();
    }
  }, [tokenId]);

const handleTradeNow = async () => {
      if (!user) {
        toast.error("Please sign in to trade");
        return;
      }
      setActionLoading(true);
      try {
        const response = await api.post('/api/trades', { landId: land.id, price: { amount: listing.price.amount, currency: listing.price.currency } });
        if (response.data.success) {
          toast.success("Trade request created successfully!");
          router.push(`/trades/${response.data.data.id}`);
        }
      } catch (error: any) {
        toast.error(error.response?.data?.error || "Failed to create trade request");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !land) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-destructive mb-2">Error</h2>
        <p className="text-muted-foreground">{error || "NFT not found"}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const ipfsImage = land.ipfsCid ? `https://gateway.pinata.cloud/ipfs/${land.ipfsCid}` : 'https://placehold.co/600x400/png?text=LandLedger+NFT';
  const isOwner = user && user.id === land.ownerClerkId;

  return (
    <div className="container mx-auto px-4 py-12">
      <Button variant="ghost" className="mb-6 gap-2" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Image Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl border bg-muted"
        >
          <img 
            src={ipfsImage} 
            alt={land.landTitle} 
            className="object-cover w-full h-full"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/png?text=LandLedger+NFT'; }} 
          />
          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-sm font-mono">
            #{land.tokenId}
          </div>
          {listing && (
            <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg">
              <Tag className="w-3 h-3" /> FOR SALE: {listing.price.amount} {listing.price.currency}
            </div>
          )}
        </motion.div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          <div>
            <h1 className="text-4xl font-bold mb-2">{land.landTitle}</h1>
            <p className="text-xl text-muted-foreground">Token ID #{land.tokenId}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                Minted on Sepolia
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium font-mono truncate max-w-[150px]">
                {land.tokenAddress}
              </span>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Description</h3>
                <p className="text-muted-foreground">
                  This NFT represents the legal ownership of land parcel {land.surveyNo} located at {land.address?.city}, {land.address?.state}.
                  The ownership is verified and recorded on both Hyperledger Fabric and the Ethereum Sepolia testnet.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-secondary/30 border-none">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Area</p>
                <p className="font-semibold">{land.area} {land.areaUnit}</p>
              </CardContent>
            </Card>
            <Card className="bg-secondary/30 border-none">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Survey No</p>
                <p className="font-semibold">{land.surveyNo}</p>
              </CardContent>
            </Card>
            <Card className="bg-secondary/30 border-none">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Location</p>
                <p className="font-semibold truncate">{land.address?.city}, {land.address?.state}</p>
              </CardContent>
            </Card>
            <Card className="bg-secondary/30 border-none">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Owner</p>
                <p className="font-semibold truncate text-xs font-mono" title={land.ownerWallet}>
                  {land.ownerWallet}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            {!listing && isOwner && (
              <Button 
                onClick={() => router.push(`/marketplace/list?tokenId=${land.tokenId}`)} 
                className="w-full gap-2 text-lg py-6"
              >
                <Tag className="w-5 h-5" /> List on Marketplace
              </Button>
            )}

            {listing && !isOwner && (
              <Button 
                  onClick={handleTradeNow} 
                  disabled={actionLoading}
                  className="w-full gap-2 text-lg py-6 bg-primary hover:bg-primary/90"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {actionLoading ? "Processing..." : `Start Trade for ${listing.price.amount} ${listing.price.currency}`}

            {listing && isOwner && (
              <div className="p-4 border border-primary/30 bg-primary/5 rounded-lg text-center">
                <p className="font-semibold text-primary mb-1">Your item is listed for sale</p>
                <p className="text-sm text-muted-foreground">Price: {listing.price.amount} {listing.price.currency}</p>
              </div>
            )}

            <div className="flex gap-4">
              <Button 
                variant="outline" 
                className="flex-1 gap-2"
                onClick={() => window.open(`https://sepolia.etherscan.io/token/${land.tokenAddress}?a=${land.tokenId}`, '_blank')}
              >
                <ExternalLink className="w-4 h-4" /> View on Etherscan
              </Button>
              <AddToMetaMask 
                tokenAddress={land.tokenAddress} 
                tokenId={land.tokenId} 
                tokenImage={ipfsImage}
                className="flex-1"
              />
            </div>
            <Button variant="secondary" className="w-full gap-2" onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Link copied!");
            }}>
              <Share2 className="w-4 h-4" /> Share NFT Link
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
