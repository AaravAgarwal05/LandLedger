import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IEthRate extends Document {
  date: string;       // Format: "YYYY-MM-DD" (IST date of the previous trading day)
  ethInr: number;     // Closing price in INR
  ethUsd: number;     // Closing price in USD (stored for reference)
  source: string;     // Data source, e.g., "coingecko"
  updatedAt: Date;
  createdAt: Date;
}

const EthRateSchema = new Schema<IEthRate>(
  {
    date: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ethInr: {
      type: Number,
      required: true,
    },
    ethUsd: {
      type: Number,
      default: 0,
    },
    source: {
      type: String,
      default: 'coingecko',
    },
  },
  {
    timestamps: true,
  }
);

export const EthRate: Model<IEthRate> =
  mongoose.models.EthRate || mongoose.model<IEthRate>('EthRate', EthRateSchema);
