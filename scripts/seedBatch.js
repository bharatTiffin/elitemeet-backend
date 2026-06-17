const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const Batch = require('../src/models/Batch');

const seedBatch = async () => {
  await connectDB();

  const batchPayload = {
    id: 'RecordedClasses',
    name: 'Recorded Classes',
    icon: 'school-outline',
    videos: [
      {
        _id: '3937dbcf-3171-40d0-a2d6-857c0fe11223',
        youtubeUniqueId: 'uFBWxBXxq94',
        title: 'Class 1: Important Civil Services Exam Pattern (2024) | IAS/IPS/IRS | 10th Class' ,
        description: 'Welcome to an important session for students preparing for the Civil Services Exam pattern and exam strategy for 2024.',
        subject: 'Social Studies',
        subSubject: 'Civics',
        createdAt: new Date('2024-07-31T10:25:45.179Z'),
      },
      {
        _id: '52fa4d52-06e7-4bbb-b85b-87f38f3b7f09',
        youtubeUniqueId: 'oU7vFQfZEvU',
        title: 'Class 2: History Foundation for Civil Services | 10th Class',
        description: 'Foundational history concepts and timelines for Civil Services exam preparation.',
        subject: 'History',
        subSubject: 'Modern History',
        createdAt: new Date('2024-07-31T10:25:45.179Z'),
      },
      {
        _id: 'd7a25a8d-2a0d-4689-b6d9-e2bce5b36842',
        youtubeUniqueId: 'V8_Ia3nFmr4',
        title: 'Class 3: Geography Essentials for Civil Services | 10th Class',
        description: 'Key geography topics and map skills required for the Civil Services exam.',
        subject: 'Geography',
        subSubject: 'Physical Geography',
        createdAt: new Date('2024-07-31T10:25:45.179Z'),
      },
      {
        _id: 'e4f2d885-82e5-4589-a0c1-ff7b8931f61c',
        youtubeUniqueId: 'QvFpo6XDvA0',
        title: 'Class 4: Important Polity Concepts for Civil Services | 10th Class',
        description: 'Important polity concepts and constitutional basics for the Civil Services exam.',
        subject: 'Political Science',
        subSubject: 'Indian Polity',
        createdAt: new Date('2024-07-31T10:25:45.179Z'),
      },
      {
        _id: 'd5a2b3e4-9a7f-4d2b-8721-bd296d5f3c1e',
        youtubeUniqueId: 'J5a3gQzB2yM',
        title: 'Class 5: Economic Fundamentals for Civil Services | 10th Class',
        description: 'Basic economics topics that help build the foundation for Civil Services exam studies.',
        subject: 'Economics',
        subSubject: 'Macroeconomics',
        createdAt: new Date('2024-07-31T10:25:45.179Z'),
      }
    ],
  };

  const result = await Batch.findOneAndUpdate(
    { id: batchPayload.id },
    {
      $set: {
        name: batchPayload.name,
        icon: batchPayload.icon,
        videos: batchPayload.videos,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`Seeded batch ${result.id} with ${result.videos.length} videos.`);
  process.exit(0);
};

seedBatch().catch((err) => {
  console.error('Batch seeding failed:', err);
  process.exit(1);
});
