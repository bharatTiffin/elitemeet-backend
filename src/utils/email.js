// // src/utils/email.js
// const nodemailer = require("nodemailer");
// const path = require("path");
// const fs = require("fs");

// const transporter = nodemailer.createTransport({
//   host: process.env.EMAIL_HOST,      // e.g. smtp.gmail.com or your provider
//   port: Number(process.env.EMAIL_PORT) || 587,
//   secure: false,                     // true for 465, false for 587
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// /**
//  * Sends plain/simple email
//  */
// const sendEmail = async ({ to, subject, text, html }) => {
//   await transporter.sendMail({
//     from: process.env.EMAIL_FROM || `"Elite Meet" <no-reply@elitemeet.com>`,
//     to,
//     subject,
//     text,
//     html,
//   });
// };

// /**
//  * Sends booking confirmation emails to user and admin
//  */
// const sendBookingEmails = async ({ user, admin, slot, meetLink }) => {
//   const start = new Date(slot.startTime).toLocaleString("en-IN", {
//     timeZone: "Asia/Kolkata",
//   });
//   const end = new Date(slot.endTime).toLocaleString("en-IN", {
//     timeZone: "Asia/Kolkata",
//   });

//   const subject = "Your session is confirmed - Elite Meet";
//   const html = `
//     <p>Hi ${user.name || ""},</p>
//     <p>Your session is confirmed.</p>
//     <p><strong>Time:</strong> ${start} - ${end} (IST)</p>
//     <p><strong>Meet link:</strong> <a href="${meetLink}">${meetLink}</a></p>
//     <p>Thanks!</p>
//   `;

//   // to user
//   await sendEmail({
//     to: user.email,
//     subject,
//     html,
//   });

//   // to admin
//   await sendEmail({
//     to: admin.email,
//     subject: `New booking: ${user.name || user.email}`,
//     html: `
//       <p>New booking received.</p>
//       <p><strong>User:</strong> ${user.name || ""} (${user.email})</p>
//       <p><strong>Time:</strong> ${start} - ${end}</p>
//       <p><strong>Meet link:</strong> <a href="${meetLink}">${meetLink}</a></p>
//     `,
//   });
// };

// /**
//  * Sends email with PDF attachment
//  */
// const sendEmailWithPDF = async ({ to, subject, text, html, pdfPath, pdfName }) => {
//   // Check if PDF file exists
//   if (!fs.existsSync(pdfPath)) {
//     console.error(`❌ PDF file not found at path: ${pdfPath}`);
//     throw new Error(`PDF file not found: ${pdfPath}`);
//   }

//   const mailOptions = {
//     from: process.env.EMAIL_FROM || `"Elite Meet" <no-reply@elitemeet.com>`,
//     to,
//     subject,
//     text,
//     html,
//     attachments: [
//       {
//         filename: pdfName || "elite_academy_magazine.pdf",
//         path: pdfPath,
//       },
//     ],
//   };

//   await transporter.sendMail(mailOptions);
// };


// // ✅ Book name mapping
// const BOOK_NAMES = {
//   polity: 'Complete Polity Package',
//   economics: 'Complete Economics Package',
//   geography: 'Complete Geography Package',
//   environment: 'Complete Environment Package',
//   science: 'Complete Science Package',
//   modern_history: 'Complete Modern History Package',
//   ancient_history: 'Complete Ancient History Package',
//   medieval_history: 'Complete Medieval History Package'
// };

// // ✅ Send single book email
// const sendBookEmail = async ({ to, userName, bookType, pdfLink }) => {
//   const bookName = BOOK_NAMES[bookType] || 'Book';
//   const subject = `${bookName} - PDF Ready! 🎉`;

//   const html = `
//     <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
//       <h1 style="color: #3b82f6;">Thank you for your purchase! 🎉</h1>
//       <p>Hi <strong>${userName || 'Student'}</strong>,</p>
//       <p>Your <strong>${bookName}</strong> is ready to download!</p>
      
//       <div style="text-align: center; margin: 30px 0;">
//         <a href="${pdfLink}" 
//            style="background-color: #3b82f6; color: white; padding: 15px 30px; 
//                   text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px;">
//           📥 Download PDF
//         </a>
//       </div>

//       <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
//         <p style="margin: 0; font-size: 14px;"><strong>📌 Important:</strong></p>
//         <ul style="margin: 10px 0; font-size: 14px;">
//           <li>Save this link for future access</li>
//           <li>Download may take a few seconds depending on file size</li>
//           <li>All PDFs are lifetime accessible</li>
//         </ul>
//       </div>

//       <p>If you face any issues downloading, reply to this email or contact us at <strong>2025eliteacademy@gmail.com</strong></p>
      
//       <p style="margin-top: 30px;">Best regards,<br><strong>Elite Academy Team</strong></p>
//     </div>
//   `;

//   await sendEmail({ to, subject, html });
// };

// // ✅ Send package email (Complete Pack or Without Polity)
// const sendPackageEmail = async ({ to, userName, packageType, books }) => {
//   const packageNames = {
//     complete_pack: 'Complete Pack (All 8 Books)',
//     without_polity: 'All Books Except Polity (7 Books)'
//   };

//   const packageName = packageNames[packageType] || 'Book Package';
//   const subject = `${packageName} - All PDFs Ready! 🎉`;

//   const bookLinks = books.map((book, index) => `
//     <div style="margin: 15px 0; padding: 15px; background-color: #f9fafb; border-left: 4px solid #3b82f6; border-radius: 4px;">
//       <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;">
//         ${index + 1}. ${BOOK_NAMES[book.bookType]}
//       </h3>
//       <a href="${book.pdfLink}" 
//          style="background-color: #3b82f6; color: white; padding: 10px 20px; 
//                 text-decoration: none; border-radius: 6px; display: inline-block; font-size: 14px;">
//         📥 Download PDF
//       </a>
//     </div>
//   `).join('');

//   const html = `
//     <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
//       <h1 style="color: #3b82f6;">Thank you for your purchase! 🎉</h1>
//       <p>Hi <strong>${userName || 'Student'}</strong>,</p>
//       <p>Your <strong>${packageName}</strong> is ready!</p>
      
//       <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
//         <p style="margin: 0; font-size: 16px;"><strong>📚 You got ${books.length} books!</strong></p>
//         <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">Download all PDFs below ↓</p>
//       </div>

//       <h2 style="color: #1f2937; font-size: 18px;">📥 Download Your Books</h2>
//       ${bookLinks}

//       <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
//         <p style="margin: 0; font-size: 14px;"><strong>💡 Pro Tip:</strong></p>
//         <p style="margin: 5px 0 0 0; font-size: 14px;">
//           Bookmark this email or save all PDF links in a document for easy access anytime!
//         </p>
//       </div>

//       <p>If you face any issues downloading, reply to this email or contact us at <strong>2025eliteacademy@gmail.com</strong></p>
      
//       <p style="margin-top: 30px;">Best regards,<br><strong>Elite Academy Team</strong></p>
//     </div>
//   `;

//   await sendEmail({ to, subject, html });
// };

// // ✅ Export the new functions
// module.exports = {
//   sendEmail,
//   sendEmailWithPDF,
//   sendBookingConfirmation,
//   sendBookEmail,        // ADD THIS
//   sendPackageEmail      // ADD THIS
// };


// // module.exports = {
// //   sendEmail,
// //   sendBookingEmails,
// //   sendEmailWithPDF,
// // };



// src/utils/email.js
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
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

// ✅ Book name mapping
const BOOK_NAMES = {
  polity: 'Complete Polity Package',
  economics: 'Complete Economics Package',
  geography: 'Complete Geography Package',
  environment: 'Complete Environment Package',
  science: 'Complete Science Package',
  modern_history: 'Complete Modern History Package',
  ancient_history: 'Complete Ancient History Package',
  medieval_history: 'Complete Medieval History Package'
};

// ✅ Send single book email
const sendBookEmail = async ({ to, userName, bookType, pdfLink }) => {
  const bookName = BOOK_NAMES[bookType] || 'Book';
  const subject = `${bookName} - PDF Ready! 🎉`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #3b82f6;">Thank you for your purchase! 🎉</h1>
      <p>Hi <strong>${userName || 'Student'}</strong>,</p>
      <p>Your <strong>${bookName}</strong> is ready to download!</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${pdfLink}" 
           style="background-color: #3b82f6; color: white; padding: 15px 30px; 
                  text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px;">
          📥 Download PDF
        </a>
      </div>

      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px;"><strong>📌 Important:</strong></p>
        <ul style="margin: 10px 0; font-size: 14px;">
          <li>Save this link for future access</li>
          <li>Download may take a few seconds depending on file size</li>
          <li>All PDFs are lifetime accessible</li>
        </ul>
      </div>

      <p>If you face any issues downloading, reply to this email or contact us at <strong>2025eliteacademy@gmail.com</strong></p>
      
      <p style="margin-top: 30px;">Best regards,<br><strong>Elite Academy Team</strong></p>
    </div>
  `;

  await sendEmail({ to, subject, html });
};

// ✅ Send package email (Complete Pack or Without Polity)
const sendPackageEmail = async ({ to, userName, packageType, books }) => {
  const packageNames = {
    complete_pack: 'Complete Pack (All 8 Books)',
    without_polity: 'All Books Except Polity (7 Books)'
  };

  const packageName = packageNames[packageType] || 'Book Package';
  const subject = `${packageName} - All PDFs Ready! 🎉`;

  const bookLinks = books.map((book, index) => `
    <div style="margin: 15px 0; padding: 15px; background-color: #f9fafb; border-left: 4px solid #3b82f6; border-radius: 4px;">
      <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;">
        ${index + 1}. ${BOOK_NAMES[book.bookType]}
      </h3>
      <a href="${book.pdfLink}" 
         style="background-color: #3b82f6; color: white; padding: 10px 20px; 
                text-decoration: none; border-radius: 6px; display: inline-block; font-size: 14px;">
        📥 Download PDF
      </a>
    </div>
  `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #3b82f6;">Thank you for your purchase! 🎉</h1>
      <p>Hi <strong>${userName || 'Student'}</strong>,</p>
      <p>Your <strong>${packageName}</strong> is ready!</p>
      
      <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 16px;"><strong>📚 You got ${books.length} books!</strong></p>
        <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">Download all PDFs below ↓</p>
      </div>

      <h2 style="color: #1f2937; font-size: 18px;">📥 Download Your Books</h2>
      ${bookLinks}

      <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px;"><strong>💡 Pro Tip:</strong></p>
        <p style="margin: 5px 0 0 0; font-size: 14px;">
          Bookmark this email or save all PDF links in a document for easy access anytime!
        </p>
      </div>

      <p>If you face any issues downloading, reply to this email or contact us at <strong>2025eliteacademy@gmail.com</strong></p>
      
      <p style="margin-top: 30px;">Best regards,<br><strong>Elite Academy Team</strong></p>
    </div>
  `;

  await sendEmail({ to, subject, html });
};

// ✅ CORRECT EXPORT
module.exports = {
  sendEmail,
  sendEmailWithPDF,
  sendBookingEmails,    // ✅ This is the correct name (not sendBookingConfirmation)
  sendBookEmail,        // ✅ NEW - for single books
  sendPackageEmail      // ✅ NEW - for packages
};
