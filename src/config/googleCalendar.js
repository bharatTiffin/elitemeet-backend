// src/config/googleCalendar.js
const { google } = require("googleapis");

const getAuthClient = async () => {
  // Option 1: keyFile
  // const auth = new google.auth.GoogleAuth({
  //   keyFile: "google-service-account.json",
  //   scopes: ["https://www.googleapis.com/auth/calendar"],
  // });

  // Option 2: env vars
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  const authClient = await auth.getClient();
  return authClient;
};

/**
 * Creates a Google Calendar event with Meet link
 * @param {Object} opts
 * @param {Date} opts.startTime
 * @param {Date} opts.endTime
 * @param {String} opts.userEmail
 * @param {String} opts.userName
 * @param {String} opts.adminEmail
 * @param {String} opts.bookingId
 */
const createGoogleMeetEvent = async ({
  startTime,
  endTime,
  userEmail,
  userName,
  adminEmail,
  bookingId,
}) => {
  const auth = await getAuthClient();
  const calendar = google.calendar({ version: "v3", auth });

  const event = {
    summary: `Session with ${userName}`,
    description: `Booking ID: ${bookingId}`,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: "Asia/Kolkata",
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: "Asia/Kolkata",
    },
    attendees: [
      { email: userEmail },
      { email: adminEmail },
    ],
    conferenceData: {
      createRequest: {
        requestId: `meet_${bookingId}_${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const res = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    resource: event,
    conferenceDataVersion: 1,
  });

  return {
    meetLink: res.data.hangoutLink,
    eventId: res.data.id,
  };
};

module.exports = {
  createGoogleMeetEvent,
};
