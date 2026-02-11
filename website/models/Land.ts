import mongoose, { Schema, Model, Document } from 'mongoose';

// Status history entry interface
export interface IStatusHistory {
  status: string;
  changedAt: Date;
  changedBy: string; // Clerk user ID
  notes?: string;
}

export interface ILand extends Document {
  landId: string;
  parentId?: string;
  childrenIds: string[];
  ownerWallet: string;
  ownerClerkId: string;
  status: 
    | 'registered' 
    | 'pending_metadata' 
    | 'metadata_pinned' 
    | 'pending_fabric_commit' 
    | 'fabric_registered' 
    | 'pending_mint' 
    | 'minted' 
    | 'subdivided' 
    | 'retired' 
    | 'disputed';
  statusHistory: IStatusHistory[];
  area: number;
  landTitle: string;
  areaUnit: string;
  surveyNo: string;
  address: {
    plotNo: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  geo?: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  geoBBox?: number[]; // [minLon, minLat, maxLon, maxLat]
  computedArea?: number; // Area in square meters computed from geo
  canonicalHash: string; // SHA256 hash of canonical object
  ipfsCid?: string;
  fabricTxId: string;
  tokenId?: string;
  tokenAddress?: string;
  mintTxHash?: string;
  mintedAt?: Date;
  privateDataRef?: string; // Reference to private/encrypted data stored separately
  notes?: string; // General notes about the land
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  updateStatus(newStatus: ILand['status'], changedBy: string, notes?: string): void;
}

// Status history sub-schema
const StatusHistorySchema = new Schema<IStatusHistory>(
  {
    status: {
      type: String,
      required: true,
    },
    changedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    changedBy: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      default: undefined,
    },
  },
  { _id: false } // Don't create _id for sub-documents
);

const LandSchema = new Schema<ILand>(
  {
    landId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    parentId: {
      type: String,
      default: null,
    },
    childrenIds: {
      type: [String],
      default: [],
    },
    ownerWallet: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    ownerClerkId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        'registered',
        'pending_metadata',
        'metadata_pinned',
        'pending_fabric_commit',
        'fabric_registered',
        'pending_mint',
        'minted',
        'subdivided',
        'retired',
        'disputed',
      ],
      default: 'registered',
      index: true,
    },
    statusHistory: {
      type: [StatusHistorySchema],
      default: [],
    },
    area: {
      type: Number,
      required: true,
    },
    surveyNo: {
      type: String,
      required: true,
    },
    landTitle: {
      type: String,
      required: true,
    },
    areaUnit: {
      type: String,
      required: true,
    },
    address: {
      plotNo: String,
      street1: String,
      street2: String,
      city: String,
      state: String,
      pincode: String,
    },
    geo: {
      type: {
        type: String,
        enum: ['Polygon'],
      },
      coordinates: {
        type: [[[Number]]],
      },
    },
    geoBBox: {
      type: [Number],
      default: undefined,
    },
    computedArea: {
      type: Number,
      default: undefined,
    },
    canonicalHash: {
      type: String,
      required: true,
      index: true,
    },
    ipfsCid: {
      type: String,
      default: undefined,
      index: true,
    },
    fabricTxId: {
      type: String,
      required: true,
      index: true,
    },
    tokenId: String,
    tokenAddress: String,
    mintTxHash: String,
    mintedAt: Date,
    privateDataRef: {
      type: String,
      default: undefined,
    },
    notes: {
      type: String,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// LandSchema.index({ landId: 1 }, { unique: true }); // Defined in field
LandSchema.index({ geo: '2dsphere' });
// LandSchema.index({ ownerWallet: 1 }); // Defined in field
// LandSchema.index({ ownerClerkId: 1 }); // Defined in field
// LandSchema.index({ status: 1 }); // Defined in field
// LandSchema.index({ fabricTxId: 1 }); // Defined in field

// Helper method to update status with history tracking
LandSchema.methods.updateStatus = function(
  newStatus: ILand['status'],
  changedBy: string,
  notes?: string
) {
  // Add current status to history before changing
  this.statusHistory.push({
    status: this.status,
    changedAt: new Date(),
    changedBy,
    notes,
  });
  
  // Update to new status
  this.status = newStatus;
};

export const Land: Model<ILand> =
  mongoose.models.Land || mongoose.model<ILand>('Land', LandSchema);
