import mongoose, { Document, Schema } from 'mongoose';

export interface IInstall extends Document {
  installId: string;
  gaid?: string;
  idfv?: string;
  androidId?: string;
  ip: string;
  ua: string;
  deviceModel?: string;
  osVersion?: string;
  screenSize?: string;
  locale?: string;    
  timezone?: string;  
  referrer?: string;
  clickTimestamp?: number;
  installBeginTimestamp?: number;
  isInstantApp?: boolean; 
  attributedTo: string;
  sourceId: string;
  attributionType: string;
  createdAt: Date;
}

const InstallSchema = new Schema<IInstall>({
  installId: { type: String, required: true, unique: true },
  
  gaid: { type: String },
  idfv: { type: String },
  androidId: { type: String },
  ip: { type: String, required: true },
  ua: { type: String, required: true },
  deviceModel: { type: String },
  osVersion: { type: String },
  screenSize: { type: String },
  locale: { type: String },    
  timezone: { type: String },  
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