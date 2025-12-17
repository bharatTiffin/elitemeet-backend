// src/utils/email.js
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,      // e.g. smtp.gmail.com or your provider
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,                     // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends plain/simple email
 */
const sendEmail = async ({ to, subject, text, html }) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"Elite Meet" <no-reply@elitemeet.com>`,
    to,
    subject,
    text,
    html,
  });
};

/**
 * Sends booking confirmation emails to user and admin
 */
const sendBookingEmails = async ({ user, admin, slot, meetLink }) => {
  const start = new Date(slot.startTime).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });
  const end = new Date(slot.endTime).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });

  const subject = "Your session is confirmed - Elite Meet";
  const html = `
    <p>Hi ${user.name || ""},</p>
    <p>Your session is confirmed.</p>
    <p><strong>Time:</strong> ${start} - ${end} (IST)</p>
    <p><strong>Meet link:</strong> <a href="${meetLink}">${meetLink}</a></p>
    <p>Thanks!</p>
  `;

  // to user
  await sendEmail({
    to: user.email,
    subject,
    html,
  });

  // to admin
  await sendEmail({
    to: admin.email,
    subject: `New booking: ${user.name || user.email}`,
    html: `
      <p>New booking received.</p>
      <p><strong>User:</strong> ${user.name || ""} (${user.email})</p>
      <p><strong>Time:</strong> ${start} - ${end}</p>
      <p><strong>Meet link:</strong> <a href="${meetLink}">${meetLink}</a></p>
    `,
  });
};

/**
 * Sends email with PDF attachment
 */
const sendEmailWithPDF = async ({ to, subject, text, html, pdfPath, pdfName }) => {
  // Check if PDF file exists
  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ PDF file not found at path: ${pdfPath}`);
    throw new Error(`PDF file not found: ${pdfPath}`);
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"Elite Meet" <no-reply@elitemeet.com>`,
    to,
    subject,
    text,
    html,
    attachments: [
      {
        filename: pdfName || "elite_academy_magazine.pdf",
        path: pdfPath,
      },
    ],
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendEmail,
  sendBookingEmails,
  sendEmailWithPDF,
};
