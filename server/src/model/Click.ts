import mongoose, { Document, Schema } from 'mongoose';

// 1. Define the TypeScript Interface
export interface IClick extends Document {
  clickId: string;
  campaign: string;
  source: string;
  sourceId: string;
  deep_link: string;
  
  // Fingerprint Signals
  ip: string;
  ua: string;
  deviceModel?: string;
  osVersion?: string;
  screenSize?: string; // <--- Added
  locale?: string;     // <--- Added
  timezone?: string;   // <--- Added
  
  // Identity (Optional, if you capture it on web)
  gaid?: string;
  idfv?: string;

  createdAt: Date;
}

// 2. Define the Mongoose Schema
const ClickSchema = new Schema<IClick>({
  clickId: { type: String, required: true, unique: true },
  campaign: { type: String, default: 'organic' },
  source: { type: String, default: '' },
  sourceId: { type: String, default: '' },
  deep_link: { type: String, default: '' },
  
  ip: { type: String, required: true },
  ua: { type: String, required: true },
  deviceModel: { type: String },
  osVersion: { type: String },
  screenSize: { type: String }, // <--- Added to Schema
  locale: { type: String },     // <--- Added to Schema
  timezone: { type: String },   // <--- Added to Schema
  
  gaid: { type: String },
  idfv: { type: String },

  createdAt: { type: Date, default: Date.now }
});

ClickSchema.index({ ip: 1, createdAt: -1 });
ClickSchema.index({ gaid: 1 });
ClickSchema.index({ idfv: 1 });

export const Click = mongoose.model<IClick>('Click', ClickSchema);