import mongoose from 'mongoose';

const ClickSchema = new mongoose.Schema({
  clickId: { type: String, required: true, unique: true },
  campaign: { type: String, default: 'organic' },
  source: { type: String, default: '' },
  sourceId: { type: String, default: '' }, // Added sourceId
  deep_link: { type: String, default: '' },
  ip: { type: String, required: true },
  ua: { type: String, required: true },
  deviceModel: { type: String },
  osVersion: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Index for faster matching
ClickSchema.index({ ip: 1, deviceModel: 1, createdAt: -1 });

export const Click = mongoose.model('Click', ClickSchema);