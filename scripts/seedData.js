const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const Batch = require('../src/models/Batch');
const { BATCHES } = require('./datatoseed');

const normalizeVideo = (video) => {
  const normalized = {
    ...video,
    youtubeUniqueId: video.youtubeUniqueId || video.videoId || '',
  };
  delete normalized.videoId;
  return normalized;
};

const seedData = async () => {
  await connectDB();

  for (const batchPayload of BATCHES) {
    const videos = batchPayload.videos.map(normalizeVideo);
    const existing = await Batch.findOne({ id: batchPayload.id });
    if (existing) {
      existing.name = batchPayload.name;
      existing.icon = batchPayload.icon;
      existing.videos = videos;
      await existing.save();
      console.log(`Updated batch ${batchPayload.id} with ${videos.length} videos.`);
    } else {
      const batch = new Batch({ ...batchPayload, videos });
      await batch.save();
      console.log(`Created batch ${batchPayload.id} with ${videos.length} videos.`);
    }
  }

  process.exit(0);
};

seedData().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});