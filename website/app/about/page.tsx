"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-6">About LandLedger</h1>
        <p className="text-xl text-muted-foreground mb-12 leading-relaxed">
          LandLedger is a revolutionary platform that bridges the gap between physical real estate and the digital world. 
          By leveraging blockchain technology, we provide a secure, transparent, and efficient way to register, trade, and manage land assets.
        </p>

        <div className="grid gap-8 md:grid-cols-2 mb-16">
          <Card className="bg-secondary/20 border-none">
            <CardContent className="p-8">
              <h3 className="text-2xl font-semibold mb-4">Our Mission</h3>
              <p className="text-muted-foreground">
                To democratize real estate ownership and streamline the property registration process using decentralized technologies.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-secondary/20 border-none">
            <CardContent className="p-8">
              <h3 className="text-2xl font-semibold mb-4">Technology</h3>
              <p className="text-muted-foreground">
                Built on a hybrid architecture using Hyperledger Fabric for private records and Ethereum for public tokenization.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <h2 className="text-3xl font-bold">How It Works</h2>
          <div className="grid gap-6">
            {[
              "Land owners register their property on our private ledger (Fabric).",
              "Documents are verified and hashed to IPFS for immutability.",
              "Verified assets can be bridged to the public blockchain (Ethereum) as NFTs.",
              "NFTs can be traded, collateralized, or fractionalized on the open market."
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="mt-1">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <p className="text-lg">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
