import mongoose, { Schema, Model, Document } from 'mongoose';

export interface ITransaction extends Document {
  type: 'fabric' | 'evm' | 'bridge';
  relatedId: string;
  txHash: string;
  network: string;
  from: string;
  to: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmedAt?: Date;
  raw?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    type: {
      type: String,
      enum: ['fabric', 'evm', 'bridge'],
      required: true,
    },
    relatedId: {
      type: String,
      required: true,
      index: true,
    },
    txHash: {
      type: String,
      required: true,
      index: true,
    },
    network: {
      type: String,
      required: true,
    },
    from: {
      type: String,
      required: true,
      lowercase: true,
    },
    to: {
      type: String,
      required: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'failed'],
      default: 'pending',
    },
    confirmedAt: Date,
    raw: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// TransactionSchema.index({ txHash: 1 }); // Defined in field
// TransactionSchema.index({ relatedId: 1 }); // Defined in field
TransactionSchema.index({ status: 1 });

export const Transaction: Model<ITransaction> =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>('Transaction', TransactionSchema);
