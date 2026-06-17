const Batch = require('../models/Batch');

// Create a new batch
exports.createBatch = async (req, res, next) => {
  try {
    const { id, name, icon } = req.body;
    if (!id || !name) return res.status(400).json({ message: 'id and name are required' });
    const existing = await Batch.findOne({ id });
    if (existing) return res.status(409).json({ message: 'Batch with this id already exists' });
    const batch = new Batch({ id, name, icon });
    await batch.save();
    res.status(201).json({ batch });
  } catch (err) {
    next(err);
  }
};

// Get all batches
exports.getAllBatches = async (req, res, next) => {
  try {
    const batches = await Batch.find({}).sort({ createdAt: 1 });
    res.json({ batches });
  } catch (err) { next(err); }
};

// Get single batch
exports.getBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findOne({ id: req.params.id });
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    res.json({ batch });
  } catch (err) { next(err); }
};

// Add a video to a batch
exports.addVideo = async (req, res, next) => {
  try {
    const { id } = req.params; // batch id
    const videoBody = req.body || {};
    // accept either `youtubeUniqueId` or legacy `videoId` from client
    const video = { ...videoBody };
    if (video.videoId && !video.youtubeUniqueId) {
      video.youtubeUniqueId = video.videoId;
      delete video.videoId;
    }
    if (!video || !video._id) return res.status(400).json({ message: 'video with _id required' });
    const batch = await Batch.findOne({ id });
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    batch.videos.push(video);
    await batch.save();
    res.status(201).json({ batch });
  } catch (err) { next(err); }
};

// Update video inside batch
exports.updateVideo = async (req, res, next) => {
  try {
    const { id, videoId } = req.params; // videoId is the _id field of video
    const batch = await Batch.findOne({ id });
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    const idx = batch.videos.findIndex(v => v._id === videoId);
    if (idx === -1) return res.status(404).json({ message: 'Video not found' });
    const incoming = { ...req.body };
    if (incoming.videoId && !incoming.youtubeUniqueId) {
      incoming.youtubeUniqueId = incoming.videoId;
      delete incoming.videoId;
    }
    batch.videos[idx] = { ...batch.videos[idx].toObject(), ...incoming };
    await batch.save();
    res.json({ batch });
  } catch (err) { next(err); }
};

// Delete video from batch
exports.deleteVideo = async (req, res, next) => {
  try {
    const { id, videoId } = req.params;
    const batch = await Batch.findOne({ id });
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    batch.videos = batch.videos.filter(v => v._id !== videoId);
    await batch.save();
    res.json({ batch });
  } catch (err) { next(err); }
};

// Delete batch
exports.deleteBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Batch.deleteOne({ id });
    res.json({ message: 'Batch deleted' });
  } catch (err) { next(err); }
};
