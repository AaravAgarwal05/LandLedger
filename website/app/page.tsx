"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { ArrowRight, ShieldCheck, Coins, Globe, ChevronRight, Sparkles, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRef } from "react";
import { containerVariants, itemVariants, cardVariants } from "@/lib/animations";

const stats = [
  { label: "Total Lands", value: "12,543", icon: Globe },
  { label: "Active Users", value: "8,234", icon: Users },
  { label: "Trading Volume", value: "$2.4M", icon: TrendingUp },
];

export default function Home() {
  const statsRef = useRef(null);
  const featuresRef = useRef(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-100px" });
  const featuresInView = useInView(featuresRef, { once: true, margin: "-100px" });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-animated -z-10 opacity-20" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/30 rounded-full blur-[150px] -z-10 animate-float" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] -z-10 animate-float" style={{ animationDelay: '2s' }} />
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="max-w-4xl mx-auto space-y-8"
          >
            {/* Badge */}
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <Sparkles className="w-4 h-4 text-accent" />
              Live on Testnet - Join the Future
            </motion.div>
            
            {/* Headline */}
            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-tight">
              The Future of <br />
              <span className="text-gradient-emerald inline-block mt-2">
                Land Ownership
              </span>
            </motion.h1>
            
            {/* Subheadline */}
            <motion.p variants={itemVariants} className="text-lg md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Securely register, trade, and manage land assets on the blockchain. 
              A hybrid solution combining private ledgers with public verification.
            </motion.p>
            
            {/* CTA Buttons */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
              <Link href="/auth/connect">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto gap-2 text-lg h-14 px-10 bg-gradient-emerald hover:shadow-glow-emerald-lg transition-all duration-300 hover:scale-105 group"
                >
                  Get Started 
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/explore">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full sm:w-auto gap-2 text-lg h-14 px-10 glass-panel hover:bg-secondary/50 transition-all duration-300 hover:scale-105"
                >
                  Explore Market
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="py-16 border-y border-border/50 glass-panel">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={statsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={statsInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center space-y-2"
              >
                <div className="flex items-center justify-center gap-3">
                  <stat.icon className="w-6 h-6 text-accent" />
                  <p className="text-4xl md:text-5xl font-bold text-gradient-emerald">{stat.value}</p>
                </div>
                <p className="text-muted-foreground text-lg">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/20 to-background -z-10" />
        
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16 space-y-4"
          >
            <h2 className="text-4xl md:text-5xl font-bold">
              Why <span className="text-gradient-emerald">LandLedger</span>?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We bridge the gap between traditional real estate and decentralized finance.
            </p>
          </motion.div>

          <motion.div 
            initial="hidden"
            animate={featuresInView ? "visible" : "hidden"}
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            <FeatureCard 
              icon={ShieldCheck}
              title="Secure Registration"
              description="Immutable land records stored on a private ledger with public proofs."
              delay={0}
            />
            <FeatureCard 
              icon={Coins}
              title="Instant Liquidity"
              description="Tokenize your land assets and trade them instantly on the marketplace."
              delay={0.1}
            />
            <FeatureCard 
              icon={Globe}
              title="Global Access"
              description="Access real estate opportunities from anywhere in the world."
              delay={0.2}
            />
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-10 -z-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/20 rounded-full blur-[150px] -z-10" />
        
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto space-y-8"
          >
            <h2 className="text-4xl md:text-6xl font-bold">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of users already transforming land ownership with blockchain technology.
            </p>
            <Link href="/auth/connect">
              <Button 
                size="lg" 
                className="gap-2 text-lg h-14 px-10 bg-gradient-emerald hover:shadow-glow-emerald-lg transition-all duration-300 hover:scale-105 group"
              >
                Connect Wallet
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, delay }: { icon: any, title: string, description: string, delay: number }) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover="hover"
      className="group"
    >
      <Card className="h-full border-border/50 glass-panel hover:shadow-glow-emerald transition-all duration-500 relative overflow-hidden">
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-emerald opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
        
        <CardHeader>
          <div className="w-14 h-14 rounded-xl bg-gradient-emerald flex items-center justify-center mb-4 shadow-glow-emerald group-hover:scale-110 transition-transform duration-300">
            <Icon className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-2xl group-hover:text-primary transition-colors">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
