import mongoose, { Document, Schema } from 'mongoose';

export interface IClick extends Document {
  clickId: string;
  campaign: string;
  source: string;
  sourceId: string;
  deep_link: string;
  ip: string;
  ua: string;
  deviceModel?: string;
  osVersion?: string;
  screenSize?: string;
  locale?: string;
  gaid?: string;
  idfv?: string;
  createdAt: Date;
}

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
  screenSize: { type: String },
  locale: { type: String },
  gaid: { type: String },
  idfv: { type: String },
  createdAt: { type: Date, default: Date.now }
});

ClickSchema.index({ ip: 1, createdAt: -1 });
ClickSchema.index({ clickId: 1 });

export const Click = mongoose.model<IClick>('Click', ClickSchema);