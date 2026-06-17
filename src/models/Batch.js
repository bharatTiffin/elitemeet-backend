const mongoose = require('mongoose');

const videoSubSchema = new mongoose.Schema({
  _id: { type: String },
  youtubeUniqueId: { type: String },
  title: { type: String },
  description: { type: String },
  subject: { type: String },
  subSubject: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const batchSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  icon: { type: String, default: 'school-outline' },
  videos: { type: [videoSubSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Batch', batchSchema);
