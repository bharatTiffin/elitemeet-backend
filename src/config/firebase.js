// src/config/firebase.js
const admin = require("firebase-admin");

if (!admin.apps.length) {
  // Option 1: using service account JSON file path
  // const serviceAccount = require("../../firebase-service-account.json");
  // admin.initializeApp({
  //   credential: admin.credential.cert(serviceAccount),
  // });

  // Option 2: using env vars (recommended for deployment)
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

module.exports = admin;
