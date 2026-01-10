import mongoose, { Document, Schema } from 'mongoose';

// 1. Define the TypeScript Interface
export interface IInstall extends Document {
  installId: string;
  
  // Identity
  gaid?: string;
  idfv?: string;
  androidId?: string;

  // Fingerprint
  ip: string;
  ua: string;
  deviceModel?: string;
  osVersion?: string;
  screenSize?: string; // <--- Added
  locale?: string;     // <--- Added
  timezone?: string;   // <--- Added

  referrer?: string;
  
  // Timestamps
  clickTimestamp?: number;
  installBeginTimestamp?: number;
  isInstantApp?: boolean;

  // Results
  attributedTo: string;
  sourceId: string;
  attributionType: string;
  
  createdAt: Date;
}

// 2. Define the Mongoose Schema
const InstallSchema = new Schema<IInstall>({
  installId: { type: String, required: true, unique: true },
  
  gaid: { type: String },
  idfv: { type: String },
  androidId: { type: String },

  ip: { type: String, required: true },
  ua: { type: String, required: true },
  deviceModel: { type: String },
  osVersion: { type: String },
  screenSize: { type: String }, // <--- Added
  locale: { type: String },     // <--- Added
  timezone: { type: String },   // <--- Added

  referrer: { type: String },
  
  clickTimestamp: { type: Number },
  installBeginTimestamp: { type: Number },
  isInstantApp: { type: Boolean, default: false },

  attributedTo: { type: String, default: 'organic' },
  sourceId: { type: String, default: '' },
  attributionType: { type: String, default: 'none' },

  createdAt: { type: Date, default: Date.now }
});

export const Install = mongoose.model<IInstall>('Install', InstallSchema);