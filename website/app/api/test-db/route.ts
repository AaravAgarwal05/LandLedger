import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';

/**
 * GET /api/test-db
 * Test MongoDB connection and show database info
 */
export async function GET() {
  try {
    // Connect to MongoDB
    await dbConnect();

    // Get connection info
    const dbName = mongoose.connection.db?.databaseName;
    const collections = await mongoose.connection.db?.listCollections().toArray();
    
    return NextResponse.json({
      success: true,
      message: 'MongoDB connected successfully!',
      database: dbName,
      collections: collections?.map(c => c.name) || [],
      connectionState: mongoose.connection.readyState, // 1 = connected
    });

  } catch (error: any) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to connect to MongoDB',
        details: error.message,
        mongoUri: process.env.MONGODB_URI ? 'Set' : 'Not set',
      },
      { status: 500 }
    );
  }
}
