"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export default function AdminMintPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.success("Mint simulated successfully! Token ID: T123");
    router.push("/dashboard");
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Simulate Mint</CardTitle>
          <CardDescription>Manually trigger a mint event for testing purposes.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="landId">Land ID</Label>
              <Input id="landId" placeholder="L-1001" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tokenId">Token ID</Label>
              <Input id="tokenId" placeholder="T123" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ipfsCid">IPFS CID</Label>
              <Input id="ipfsCid" placeholder="bafy..." required />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Minting..." : "Simulate Mint"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
