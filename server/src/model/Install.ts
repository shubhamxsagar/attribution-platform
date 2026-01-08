import mongoose from 'mongoose';

const InstallSchema = new mongoose.Schema({
  installId: { type: String, required: true, unique: true },
  ip: { type: String, required: true },
  ua: { type: String, required: true },
  deviceModel: { type: String },
  osVersion: { type: String },
  referrer: { type: String },
  
  // Fraud / Timestamps
  clickTimestamp: { type: Number },
  installBeginTimestamp: { type: Number },
  isInstantApp: { type: Boolean, default: false },

  // Attribution Results
  attributedTo: { type: String, default: 'organic' },
  sourceId: { type: String, default: '' }, // Added sourceId
  attributionType: { type: String, default: 'none' }, // 'deterministic', 'probabilistic', 'organic'

  createdAt: { type: Date, default: Date.now }
});

export const Install = mongoose.model('Install', InstallSchema);