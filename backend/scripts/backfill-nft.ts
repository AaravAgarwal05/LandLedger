import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Land } from '../src/db/models/Land';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function backfill() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected');

    const landId = 'L-2025-KAN-UT-OMDTO';
    const tokenId = '2';
    const tokenAddress = '0x0A795E54e13927520A96457da763986834800bA7';
    const mintTxHash = '0xe23d832b0b8c70496a141f7c04b76033c4eb86a1ea356265ac821cd263ea9b33';

    console.log(`🔄 Updating land ${landId}...`);

    const result = await Land.findOneAndUpdate(
      { landId },
      {
        $set: {
          status: 'minted',
          tokenId,
          tokenAddress,
          mintTxHash,
          mintedAt: new Date()
        }
      },
      { new: true }
    );

    if (result) {
      console.log('✅ Land updated successfully:', result);
    } else {
      console.error('❌ Land not found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected');
  }
}

backfill();
