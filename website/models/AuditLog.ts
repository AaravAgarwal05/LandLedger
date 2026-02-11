import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  actorClerkId: string;
  actorWallet?: string;
  target: {
    type: 'land' | 'wallet' | 'token' | 'case';
    id: string;
  };
  details: Record<string, any>;
  ip?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    actorClerkId: {
      type: String,
      required: true,
      index: true,
    },
    actorWallet: {
      type: String,
      lowercase: true,
    },
    target: {
      type: {
        type: String,
        enum: ['land', 'wallet', 'token', 'case'],
        required: true,
      },
      id: {
        type: String,
        required: true,
        index: true,
      },
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ip: String,
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// Indexes
// AuditLogSchema.index({ action: 1 }); // Defined in field
// AuditLogSchema.index({ actorClerkId: 1 }); // Defined in field
// AuditLogSchema.index({ 'target.id': 1 }); // Defined in field
AuditLogSchema.index({ timestamp: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
