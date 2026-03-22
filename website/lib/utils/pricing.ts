/**
 * Shared ETH/INR pricing utilities for LandLedger.
 *
 * All conversion functions require the rate as a parameter so
 * they work identically server-side and client-side.
 *
 * Usage:
 *   const rate = await fetchEthToInrRate();   // client-side
 *   const inr  = weiToInr("1000000000000000000", rate); // → "₹2,50,000.00"
 */

import { ethers } from 'ethers';

// ─── Formatting ──────────────────────────────────────────────────────────────

/** Format a number as Indian-locale INR currency string */
export function formatInr(amount: number): string {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });
}

// ─── Conversion (pure, rate-aware) ───────────────────────────────────────────

/**
 * Convert a WEI string (or BigInt) to INR using the given rate.
 * Gracefully handles corrupted decimals from the DB.
 */
export function weiToInr(weiStr: string | bigint, ethInrRate: number): string {
  try {
    const cleanWei = String(weiStr || '0').split('.')[0];
    const eth = Number(ethers.formatEther(cleanWei));
    return formatInr(eth * ethInrRate);
  } catch {
    return '₹0';
  }
}

/**
 * Convert WEI to ETH string. Safely handles decimal corruption.
 */
export function weiToEth(weiStr: string | bigint): string {
  try {
    const cleanWei = String(weiStr || '0').split('.')[0];
    return Number(ethers.formatEther(cleanWei)).toFixed(6);
  } catch {
    return '0.000000';
  }
}

/**
 * Convert an INR amount (number) to a WEI string.
 */
export function inrToWei(inrAmount: number, ethInrRate: number): string {
  if (!ethInrRate || !inrAmount) return '0';
  const eth = inrAmount / ethInrRate;
  return ethers.parseEther(eth.toFixed(18)).toString();
}

/**
 * Convert ETH (float) to INR.
 */
export function ethToInr(eth: number, ethInrRate: number): string {
  return formatInr(eth * ethInrRate);
}

// ─── Client-side Rate Fetcher ────────────────────────────────────────────────

let _cachedRate: number | null = null;
let _cachedAt: number = 0;
const RATE_TTL_MS = 60 * 60 * 1000; // Re-use for 1 hour per page session

/**
 * Fetch the current daily ETH/INR rate from the API.
 * Caches in-module for the browser session to avoid repeated network calls.
 */
export async function fetchEthToInrRate(): Promise<number> {
  const now = Date.now();
  if (_cachedRate && now - _cachedAt < RATE_TTL_MS) {
    return _cachedRate;
  }
  try {
    const res = await fetch('/api/eth-price');
    const data = await res.json();
    if (data.ethInr) {
      _cachedRate = data.ethInr;
      _cachedAt = now;
      return data.ethInr;
    }
  } catch {
    // ignore, use last known
  }
  return _cachedRate || 250000; // safe fallback
}
