"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FileCheck, Clock, ArrowRightLeft, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import api from "@/lib/api-client";
import { useUserSync } from "@/hooks/useUserSync";
import { AddToMetaMask } from "@/components/AddToMetaMask";

export default function LandDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn, loading: authLoading } = useUserSync();
  const landId = params.landId as string;
  
  const [land, setLand] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLand = async () => {
      if (!isSignedIn) return;
      try {
        const response = await api.get(`/api/lands/${landId}`);
        if (response.data.success) {
          setLand(response.data.land);
        } else {
          setError("Land not found");
        }
      } catch (err: any) {
        console.error("Error fetching land:", err);
        setError("Failed to load land details");
      } finally {
        setLoading(false);
      }
    };

    if (isSignedIn) {
      fetchLand();
    } else if (!authLoading) {
      // Redirect if not signed in
      router.push('/');
    }
  }, [landId, isSignedIn, authLoading, router]);

  const handleMintRequest = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Requesting bridge to public chain...',
        success: 'Mint request submitted! Status: Pending',
        error: 'Failed to request mint',
      }
    );
  };

  if (authLoading || loading) {
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
        <p className="text-muted-foreground">{error || "Land not found"}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl mb-2">{land.landTitle || 'Land Details'}</CardTitle>
                  <p className="text-muted-foreground">
                    {[
                      land.address?.plotNo,
                      land.address?.street1,
                      land.address?.street2,
                      land.address?.city,
                      land.address?.state,
                      land.address?.pincode
                    ].filter(Boolean).join(', ')}
                  </p>
                </div>
                <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium uppercase">
                  {land.status}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Survey Number</p>
                  <p className="font-semibold">{land.surveyNo || 'N/A'}</p>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Area</p>
                  <p className="font-semibold">{land.area} sq.m</p>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Owner Wallet</p>
                  <p className="font-mono text-sm truncate" title={land.ownerWallet}>
                    {land.ownerWallet || 'Not linked'}
                  </p>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Fabric Tx ID</p>
                  <p className="font-mono text-sm truncate" title={land.fabricTxId}>
                    {land.fabricTxId || 'Pending'}
                  </p>
                </div>
              </div>

              {/* NFT Details Section */}
              {land.status === 'minted' && land.tokenId && (
                <div className="p-4 border rounded-lg bg-primary/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      NFT Minted on Sepolia
                    </h3>
                    <span className="text-xs font-mono bg-background px-2 py-1 rounded border">
                      Token ID #{land.tokenId}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contract:</span>
                      <a 
                        href={`https://sepolia.etherscan.io/address/${land.tokenAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-primary hover:underline truncate max-w-[200px]"
                      >
                        {land.tokenAddress}
                      </a>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mint Tx:</span>
                      <a 
                        href={`https://sepolia.etherscan.io/tx/${land.mintTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-primary hover:underline truncate max-w-[200px]"
                      >
                        {land.mintTxHash}
                      </a>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => window.open(`https://sepolia.etherscan.io/token/${land.tokenAddress}?a=${land.tokenId}`, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-2" />
                      View on Explorer
                    </Button>
                    {/* Dynamic Import or Component for AddToMetaMask to avoid SSR issues if needed, but client component is fine */}
                    <AddToMetaMask 
                      tokenAddress={land.tokenAddress} 
                      tokenId={land.tokenId} 
                      tokenImage={`https://gateway.pinata.cloud/ipfs/${land.ipfsCid}`} // Assuming image is same as metadata CID for now, or we need to parse metadata
                      className="flex-1 h-9 text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="pt-6 border-t">
                <h3 className="font-semibold mb-4">Actions</h3>
                {land.status === 'minted' ? (
                  <Button className="w-full gap-2" onClick={() => router.push(`/nfts/${land.tokenId}`)}>
                    <ExternalLink className="w-4 h-4" />
                    View NFT Page
                  </Button>
                ) : (
                  <Button onClick={handleMintRequest} className="gap-2" disabled={land.status !== 'verified'}>
                    <ArrowRightLeft className="w-4 h-4" />
                    Request Mint (Bridge to Ethereum)
                  </Button>
                )}
                {land.status !== 'verified' && land.status !== 'minted' && (
                   <p className="text-xs text-muted-foreground mt-2">
                     Minting is only available for verified lands.
                   </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative border-l border-muted ml-2 space-y-8 pb-2">
                <div className="ml-6 relative">
                  <span className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-primary" />
                  <h4 className="font-semibold">Registration</h4>
                  <p className="text-sm text-muted-foreground">Land registered on Fabric ledger</p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(land.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {land.verifiedAt && (
                  <div className="ml-6 relative">
                    <span className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-green-500" />
                    <h4 className="font-semibold">Verification</h4>
                    <p className="text-sm text-muted-foreground">Document verified</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(land.verifiedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2" 
                disabled={!land.ipfsCid}
                onClick={() => window.open(`https://gateway.pinata.cloud/ipfs/${land.ipfsCid}`, '_blank')}
              >
                <FileCheck className="w-4 h-4" /> View Deed (IPFS)
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2" 
                disabled={!land.ipfsCid}
                onClick={() => window.open(`https://ipfs.io/ipfs/${land.ipfsCid}`, '_blank')}
              >
                <ExternalLink className="w-4 h-4" /> Verify on Public Gateway
              </Button>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
