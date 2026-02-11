"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Hexagon, Map, ShoppingBag, Info, LayoutDashboard } from 'lucide-react';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Home', href: '/', icon: Hexagon },
  { name: 'Explore', href: '/explore', icon: Map },
  { name: 'Marketplace', href: '/marketplace', icon: ShoppingBag },
  { name: 'About', href: '/about', icon: Info },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useUser();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 glass-panel">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <motion.div 
            className="relative w-8 h-8 bg-gradient-emerald rounded-lg flex items-center justify-center shadow-glow-emerald"
            whileHover={{ rotate: 12, scale: 1.1 }}
            transition={{ duration: 0.3 }}
          >
            <Hexagon className="w-5 h-5 text-white" />
          </motion.div>
          <span className="text-xl font-bold text-gradient-emerald">
            LandLedger
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "gap-2 transition-all duration-300 relative",
                    isActive && "bg-secondary/50 font-medium"
                  )}
                >
                  <item.icon className={cn(
                    "w-4 h-4 transition-colors",
                    isActive && "text-primary"
                  )} />
                  {item.name}
                  {isActive && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-emerald"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Button>
              </Link>
            );
          })}
        </div>

        {/* Right Side - Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {isLoaded && (
            <>
              {isSignedIn ? (
                <UserButton 
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "w-9 h-9 ring-2 ring-primary/20 hover:ring-primary/40 transition-all",
                    },
                  }}
                />
              ) : (
                <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
                  <Button variant="gradient" size="sm" className="gap-2">
                    Sign In
                  </Button>
                </SignInButton>
              )}
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            className="p-2 rounded-md hover:bg-secondary/50 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-border/50 glass-panel"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                >
                  <Button
                    variant={pathname === item.href ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Button>
                </Link>
              ))}
              
              {/* Mobile Auth */}
              <div className="pt-4 mt-2 border-t border-border/50">
                {isLoaded && (
                  <>
                    {isSignedIn ? (
                      <div className="flex items-center gap-3 p-2">
                        <UserButton 
                          afterSignOutUrl="/"
                          appearance={{
                            elements: {
                              avatarBox: "w-9 h-9 ring-2 ring-primary/20",
                            },
                          }}
                        />
                        <span className="text-sm text-muted-foreground">Account</span>
                      </div>
                    ) : (
                      <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
                        <Button variant="gradient" className="w-full">
                          Sign In
                        </Button>
                      </SignInButton>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
