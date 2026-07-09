// src/utils/email.js
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
require('dotenv').config();

const DIGITAL_OFFLINE_BRANCHES = {
  "fatehgarh-sahib": {
    label: "Fatehgarh Sahib Digital Offline Demo",
    address: "Ist Floor, Showroom No 18, Above Pb 23 Out Fit, City Center Sirhind, Lincoln Road",
    mapsLink: "https://maps.app.goo.gl/x21iBBNnNLLeF72z8?g_st=iwb",
  },
  chandigarh: {
    label: "Chandigarh Offline Coaching",
    address: "SCO 144, Sector 24D, Chandigarh",
    mapsLink: "https://maps.app.goo.gl/nkiAPjq2FfHmsWcF6",
  },
};

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
    from: '"Elite Academy" <support@eliteacademy.pro>',
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

/**
 * Send email for single book purchase
 */
const sendBookEmail = async (to, userName, bookName, bookType, bookInfo, pdfLink, driveLink, amount, paymentId) => {
  const emoji = getBookEmoji(bookType);
  const displayName = getBookDisplayName(bookType);
  
  // Generate features list HTML
  const featuresHTML = bookInfo.features.map(feature => 
    `<li style="margin: 8px 0; color: #1f2937;">${feature}</li>`
  ).join('');
  
  // Generate highlights list HTML
  const highlightsHTML = bookInfo.highlights.map(highlight => 
    `<li style="margin: 6px 0; color: #475569; font-size: 14px;">✓ ${highlight}</li>`
  ).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px 20px; }
        .success-badge { background: #10b981; color: white; display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin-bottom: 20px; }
        .book-card { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
        .book-title { font-size: 22px; font-weight: bold; color: #1e293b; margin-bottom: 15px; }
        .book-stats { display: flex; gap: 15px; margin: 15px 0; }
        .stat-box { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; flex: 1; text-align: center; }
        .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; }
        .stat-value { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 5px; }
        .features-section { margin: 20px 0; background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 8px; }
        .highlights-section { margin: 20px 0; background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; border-radius: 8px; }
        .section-title { font-size: 16px; font-weight: bold; color: #1e293b; margin-bottom: 10px; }
        ul { margin: 10px 0; padding-left: 20px; }
        .download-btn { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 10px 0; text-align: center; width: 100%; box-sizing: border-box; }
        .download-btn:hover { background: linear-gradient(135deg, #059669, #047857); }
        .link-text { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 12px; margin-top: 12px; font-size: 13px; word-break: break-all; }
        .link-text strong { color: #b45309; }
        .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .info-table td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
        .info-table td:first-child { font-weight: 600; color: #64748b; width: 40%; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 13px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${emoji} ${bookName}</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">For PSSSB & Punjab Exams</p>
        </div>
        
        <div class="content">
          <div class="success-badge">✅ Payment Confirmed</div>
          <p style="font-size: 16px; color: #1e293b;">Hi <strong>${userName}</strong>,</p>
          <p style="font-size: 15px; color: #475569;">Your <strong>${displayName}</strong> book is ready! Download it now and start preparing. 🚀</p>
          
          <div class="book-card">
            <div class="book-title">${emoji} ${displayName} Book</div>
            
            <div class="book-stats">
              <div class="stat-box">
                <div class="stat-label">Pages</div>
                <div class="stat-value">${bookInfo.pages || 'N/A'}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">PYQ Questions</div>
                <div class="stat-value">${bookInfo.pyqPages || 'N/A'}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Price</div>
                <div class="stat-value">₹${bookInfo.price}</div>
              </div>
            </div>
            
            <div class="features-section">
              <div class="section-title">📦 What's Inside</div>
              <ul>${featuresHTML}</ul>
            </div>
            
            <div class="highlights-section">
              <div class="section-title">🎯 Topics Covered</div>
              <ul>${highlightsHTML}</ul>
            </div>
            
            <a href="${pdfLink}" class="download-btn">📥 Download PDF Now</a>
            
            <div class="link-text">
              <strong>⚠️ Button not working?</strong><br>
              <a href="${driveLink}" style="color: #b45309; text-decoration: none;">${driveLink}</a>
            </div>
          </div>
          
          <table class="info-table">
            <tr>
              <td>Amount Paid</td>
              <td><strong>₹${amount}</strong></td>
            </tr>
            <tr>
              <td>Payment ID</td>
              <td><strong>${paymentId}</strong></td>
            </tr>
            <tr style="border-bottom: none;">
              <td>Status</td>
              <td><strong style="color: #10b981;">✓ Delivered</strong></td>
            </tr>
          </table>
          
          <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
            <strong>📌 Need Help?</strong> Reply to this email or contact us at <strong>2025eliteacademy@gmail.com</strong>
          </p>
        </div>
        
        <div class="footer">
          <p style="margin: 0 0 10px 0;"><strong>Elite Academy</strong></p>
          <p style="margin: 0;">Your Success, Our Mission 🎓</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Elite Academy <noreply@eliteacademy.com>',
    to,
    subject: `${emoji} Your ${displayName} Book is Ready!`,
    html
  });
};

/**
 * Send email for package purchase (bundles)
 */
const sendPackageEmail = async (to, userName, packageName, packageInfo, books, pdfLinks, driveLinks, amount, paymentId) => {
  const booksCount = books.length;
  const packageEmoji = booksCount === 8 ? '📚' : '📖';
  
  // Calculate total pages
  const totalPages = books.reduce((sum, bookType) => {
    const bookInfo = require('../controllers/bookController').BOOK_INFO[bookType];
    return sum + (bookInfo?.pages || 0) + (bookInfo?.pyqPages || 0);
  }, 0);
  
  // Generate book download cards with full info
  const bookCards = books.map(bookType => {
    const emoji = getBookEmoji(bookType);
    const displayName = getBookDisplayName(bookType);
    const pdfLink = pdfLinks[bookType];
    const driveLink = driveLinks[bookType];
    const bookInfo = require('../controllers/bookController').BOOK_INFO[bookType];
    
    return `
      <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 10px; padding: 15px; margin: 10px 0;">
        <div style="font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 10px;">
          ${emoji} ${displayName}
        </div>
        <div style="font-size: 13px; color: #64748b; margin-bottom: 10px;">
          📄 ${bookInfo?.pages || 'N/A'} pages + ${bookInfo?.pyqPages || 'N/A'} PYQ questions
        </div>
        <a href="${pdfLink}" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">
          📥 Download PDF
        </a>
        <div style="margin-top: 10px; padding: 8px; background: #fef3c7; border-radius: 5px; font-size: 11px; word-break: break-all;">
          <strong>Link:</strong> <a href="${driveLink}" style="color: #b45309; text-decoration: none;">${driveLink}</a>
        </div>
      </div>
    `;
  }).join('');
  
  // Generate package features HTML
  const featuresHTML = packageInfo.features.map(feature => 
    `<li style="margin: 8px 0; color: #1f2937;">✓ ${feature}</li>`
  ).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 26px; }
        .content { padding: 30px 20px; }
        .success-badge { background: #10b981; color: white; display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin-bottom: 20px; }
        .package-stats { display: flex; gap: 10px; margin: 20px 0; }
        .stat-card { background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 12px; flex: 1; text-align: center; }
        .stat-label { font-size: 11px; color: #047857; text-transform: uppercase; font-weight: bold; }
        .stat-value { font-size: 20px; font-weight: bold; color: #065f46; margin-top: 5px; }
        .features-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .info-table td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
        .info-table td:first-child { font-weight: 600; color: #64748b; width: 40%; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 13px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${packageEmoji} ${packageName}</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">For PSSSB & Punjab Exams</p>
        </div>
        
        <div class="content">
          <div class="success-badge">✅ Payment Confirmed</div>
          <p style="font-size: 16px; color: #1e293b;">Hi <strong>${userName}</strong>,</p>
          <p style="font-size: 15px; color: #475569;">
            Your <strong>${packageName}</strong> is ready! You got <strong>${booksCount} books</strong> 🎉 Download all below.
          </p>
          
          <div class="package-stats">
            <div class="stat-card">
              <div class="stat-label">Books</div>
              <div class="stat-value">${booksCount}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total Pages</div>
              <div class="stat-value">${totalPages}+</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">You Saved</div>
              <div class="stat-value">₹${packageInfo.discount || 0}</div>
            </div>
          </div>
          
          <div class="features-box">
            <div style="font-size: 16px; font-weight: bold; color: #1e40af; margin-bottom: 10px;">🎁 Package Includes</div>
            <ul style="margin: 10px 0; padding-left: 20px;">${featuresHTML}</ul>
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 12px; margin: 20px 0; text-align: center; font-size: 14px;">
            <strong>💡 Pro Tip:</strong> Bookmark this email to access all PDFs anytime!
          </div>
          
          <h3 style="font-size: 18px; color: #1e293b; margin: 25px 0 15px 0;">📥 Download Your Books</h3>
          ${bookCards}
          
          <table class="info-table">
            <tr>
              <td>Total Books</td>
              <td><strong>${booksCount} Books</strong></td>
            </tr>
            <tr>
              <td>Amount Paid</td>
              <td><strong>₹${amount}</strong></td>
            </tr>
            <tr>
              <td>Payment ID</td>
              <td><strong>${paymentId}</strong></td>
            </tr>
            <tr style="border-bottom: none;">
              <td>Status</td>
              <td><strong style="color: #10b981;">✓ All Delivered</strong></td>
            </tr>
          </table>
          
          <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
            <strong>📌 Need Help?</strong> Reply to this email or contact us at <strong>2025eliteacademy@gmail.com</strong>
          </p>
        </div>
        
        <div class="footer">
          <p style="margin: 0 0 10px 0;"><strong>Elite Academy</strong></p>
          <p style="margin: 0;">Your Success, Our Mission 🎓</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Elite Academy <noreply@eliteacademy.com>',
    to,
    subject: `${packageEmoji} Your ${packageName} is Ready! (${booksCount} Books)`,
    html
  });
};

const sendDigitalOfflineDemoEmail = async (registration, paymentId) => {
  const admin = await User.findOne({ role: "admin" });
  const branchInfo = DIGITAL_OFFLINE_BRANCHES[registration.branch] || DIGITAL_OFFLINE_BRANCHES["fatehgarh-sahib"];
  const supportLine = "7696954686 / 9056653906";

  const userHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #0f172a; color: #e5e7eb; padding: 24px; border-radius: 16px;">
      <div style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 24px; border-radius: 14px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 26px;">Digital Offline Demo Registration Confirmed</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.92;">Elite Academy</p>
      </div>

      <div style="padding: 24px 8px 8px 8px;">
        <p style="font-size: 16px; line-height: 1.7;">Hi <strong>${registration.fullName}</strong>, your payment was successful.</p>

        <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 18px; margin: 18px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Amount Paid:</strong> ₹${registration.amount}</p>
          <p style="margin: 0 0 10px 0;"><strong>Branch:</strong> ${branchInfo.label}</p>
          <p style="margin: 0 0 10px 0;"><strong>Address:</strong> ${branchInfo.address}</p>
          <p style="margin: 0;"><strong>Google Maps:</strong> <a href="${branchInfo.mapsLink}" style="color: #93c5fd;">Open Location</a></p>
        </div>

        <div style="background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.25); border-radius: 14px; padding: 16px; margin: 18px 0;">
          <p style="margin: 0 0 10px 0; color: #a7f3d0; font-weight: bold;">Demo Dates: 1 June, 2 June, 3 June</p>
          <p style="margin: 0; color: #d1fae5;">Please be present on all demo days. Refund requests must be raised on the same day you attend the demo. If you continue with the course, this fee will be adjusted in the final fees.</p>
        </div>

        <p style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">
          If you do not receive the email within 5 minutes, please call or WhatsApp ${supportLine}.
        </p>
      </div>
    </div>
  `;

  const adminHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #111827; color: #e5e7eb; padding: 24px; border-radius: 16px;">
      <h2 style="margin-top: 0; color: #fbbf24;">New Digital Offline Demo Registration</h2>
      <p><strong>Name:</strong> ${registration.fullName}</p>
      <p><strong>Email:</strong> ${registration.email}</p>
      <p><strong>Phone:</strong> ${registration.mobile}</p>
      <p><strong>Address:</strong> ${registration.address}</p>
      <p><strong>Branch:</strong> ${branchInfo.label}</p>
      <p><strong>Amount:</strong> ₹${registration.amount}</p>
      <p><strong>Payment ID:</strong> ${paymentId}</p>
      <p><strong>Maps:</strong> <a href="${branchInfo.mapsLink}" style="color: #93c5fd;">${branchInfo.mapsLink}</a></p>
    </div>
  `;

  const emailPromises = [
    sendEmail({
      to: registration.email,
      subject: "Digital Offline Demo Registration Confirmed - Elite Academy",
      html: userHtml,
    }),
  ];

  if (admin && admin.email) {
    emailPromises.push(
      sendEmail({
        to: admin.email,
        subject: `New Digital Offline Demo Registration - ${registration.fullName}`,
        html: adminHtml,
      })
    );
  }

  await Promise.all(emailPromises);
};

/**
 * Sends Online Coaching confirmation with Premium UI
 */
const sendCoachingEmail = async (enrollment, pdfLinks, paymentId) => {
  const adminEmail = process.env.ADMIN_EMAIL || "2025eliteacademy@gmail.com";

  // --- GENERATE BOOKS DOWNLOAD SECTION ---
  const booksHtml = Object.entries(pdfLinks).map(([key, link]) => {
    const bookName = typeof getBookDisplayName === 'function' ? getBookDisplayName(key) : key;
    const emoji = typeof getBookEmoji === 'function' ? getBookEmoji(key) : '📚';
    
    return `
      <div style="margin-bottom: 10px; padding: 12px; background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 14px; color: #374151; padding-right: 15px;">${emoji} &nbsp; <strong>${bookName}</strong></span>
        <a href="${link}" style="background: #667eea; color: white; padding: 6px 14px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: bold; display: inline-block; min-width: 80px; text-align: center;">Download</a>
      </div>
    `;
  }).join('');

const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

        <!-- ═══ BANNER ═══ -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px 24px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0 0 4px 0; font-size: 24px; letter-spacing: -0.5px;">🎓 Enrollment Confirmed!</h1>
          <p style="color: #ddd6fe; margin: 0; font-size: 14px;">Welcome to Elite Academy's 5-Month Complete Coaching Program &nbsp;·&nbsp; Your Success, Our Mission</p>
        </div>

        <div style="padding: 32px 28px;">

          <p style="font-size: 16px; color: #374151; margin: 0 0 6px 0;">Dear <strong>${enrollment.fullName}</strong>,</p>
          <p style="font-size: 15px; color: #6b7280; line-height: 1.6; margin: 0 0 28px 0;">
            Congratulations! Your payment is confirmed and you are now officially part of Elite Academy's most comprehensive preparation program. Follow the steps below to get started immediately.
          </p>

          <!-- ═══ STEP 1 — WHATSAPP ═══ -->
          <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 22px 20px; margin-bottom: 16px;">
            <div style="display: flex; align-items: flex-start; gap: 14px;">
              <div style="background: #22c55e; color: white; font-size: 15px; font-weight: 800; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; line-height: 32px; text-align: center;">1</div>
              <div style="flex: 1;">
                <h3 style="margin: 0 0 4px 0; color: #15803d; font-size: 17px;">Join WhatsApp Community — Live Classes</h3>
                <p style="margin: 0 0 14px 0; font-size: 14px; color: #166534; line-height: 1.55;">
                  All <strong>live class links</strong> are shared exclusively on this WhatsApp Community. You will miss your live lectures if you are not in the group — join right now.
                </p>
                <a href="https://chat.whatsapp.com/HohIDkP6D954EZSj0SInt5"
                   style="display: inline-block; background: #25d366; color: white; padding: 11px 22px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px;">
                  📲 Join WhatsApp Community
                </a>
                <p style="margin: 10px 0 0 0; font-size: 11px; color: #6b7280;">
                  Direct link: https://chat.whatsapp.com/HohIDkP6D954EZSj0SInt5
                </p>
              </div>
            </div>
          </div>

          <!-- ═══ STEP 2 — TELEGRAM ═══ -->
          <div style="background: #eff6ff; border: 1.5px solid #93c5fd; border-radius: 12px; padding: 22px 20px; margin-bottom: 16px;">
            <div style="display: flex; align-items: flex-start; gap: 14px;">
              <div style="background: #229ED9; color: white; font-size: 15px; font-weight: 800; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; line-height: 32px; text-align: center;">2</div>
              <div style="flex: 1;">
                <h3 style="margin: 0 0 4px 0; color: #1d4ed8; font-size: 17px;">Join Telegram Channel — Notes &amp; Study Material</h3>
                <p style="margin: 0 0 14px 0; font-size: 14px; color: #1e40af; line-height: 1.55;">
                  All <strong>notes, PDFs, and study material</strong> are posted on our Telegram channel. Join to get instant access as soon as new material is released.
                </p>
                <a href="https://t.me/+5iOhJXmnnAFjOGM1"
                   style="display: inline-block; background: #229ED9; color: white; padding: 11px 22px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px;">
                  ✈️ Join Telegram Channel
                </a>
                <p style="margin: 10px 0 0 0; font-size: 11px; color: #6b7280;">
                  Direct link: https://t.me/+5iOhJXmnnAFjOGM1
                </p>
              </div>
            </div>
          </div>

          <!-- ═══ STEP 3 — MOBILE APP ═══ -->
          <div style="background: #fdf4ff; border: 1.5px solid #d8b4fe; border-radius: 12px; padding: 22px 20px; margin-bottom: 28px;">
            <div style="display: flex; align-items: flex-start; gap: 14px;">
              <div style="background: #9333ea; color: white; font-size: 15px; font-weight: 800; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; line-height: 32px; text-align: center;">3</div>
              <div style="flex: 1;">
                <h3 style="margin: 0 0 4px 0; color: #7e22ce; font-size: 17px;">Download the App — Recorded Lectures &amp; Tracker</h3>
                <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b21a8; line-height: 1.55;">
                  Watch <strong>recorded video lectures</strong> and track your progress subject-wise, topic-wise, and by previous year questions — all inside the app.
                </p>

                <!-- App Store Buttons — Bold & Clickable -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 18px;">
                  <tr>
                    <td style="padding-right: 8px;">
                      <a href="https://play.google.com/store/apps/details?id=com.johnnykhore.eliteacademy&hl=en"
                         style="display: block; text-decoration: none; background: linear-gradient(135deg, #00b09b, #16a34a); border-radius: 10px; padding: 14px 10px; text-align: center; box-shadow: 0 3px 8px rgba(0,0,0,0.15);">
                        <div style="font-size: 22px; line-height: 1;">🤖</div>
                        <div style="color: #d1fae5; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; margin-top: 4px; text-transform: uppercase;">Get it on</div>
                        <div style="color: #ffffff; font-size: 16px; font-weight: 800; margin-top: 1px;">Google Play</div>
                      </a>
                    </td>
                    <td style="padding-left: 8px;">
                      <a href="https://apps.apple.com/in/app/elite-academy-mock-tests/id6746954938"
                         style="display: block; text-decoration: none; background: linear-gradient(135deg, #434343, #000000); border-radius: 10px; padding: 14px 10px; text-align: center; box-shadow: 0 3px 8px rgba(0,0,0,0.25);">
                        <div style="font-size: 22px; line-height: 1;">🍎</div>
                        <div style="color: #d1d5db; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; margin-top: 4px; text-transform: uppercase;">Download on the</div>
                        <div style="color: #ffffff; font-size: 16px; font-weight: 800; margin-top: 1px;">App Store</div>
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- Login Credentials -->
                <div style="background: white; border: 1px solid #e9d5ff; border-radius: 10px; padding: 16px;">
                  <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #7e22ce; text-transform: uppercase; letter-spacing: 0.5px;">🔐 Your Login Credentials</p>
                  <p style="margin: 0 0 6px 0; font-size: 14px; color: #374151;"><strong>Email:</strong> &nbsp;<span style="color: #111827;">${enrollment.email}</span></p>
                  <p style="margin: 0 0 12px 0; font-size: 14px; color: #374151;"><strong>Password:</strong> &nbsp;<span style="color: #111827; font-family: monospace; background: #f3f4f6; padding: 3px 8px; border-radius: 4px;">${enrollment.appPassword}</span></p>
                  <div style="background: #fef9c3; border: 1px solid #fde047; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px;">
                    <p style="margin: 0; font-size: 12px; color: #713f12; line-height: 1.5;">
                      ⚠️ <strong>Important:</strong> Only <strong>${enrollment.email}</strong> is authorized to access lectures and the tracker. If you already have an account with this email, coaching access will be added automatically on the start date.
                    </p>
                  </div>
                  <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
                    Can't log in? Use <strong>Forgot Password</strong> on the app, or call us at <strong>7696954686</strong>.
                  </p>
                </div>

                <!-- Website Access -->
                <div style="margin-top: 14px; background: white; border: 1px solid #e9d5ff; border-radius: 10px; padding: 14px 16px;">
                  <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #7e22ce;">🌐 Web Access — Recorded Lectures on Laptop/PC</p>
                  <p style="margin: 0; font-size: 13px; color: #374151; line-height: 1.5;">
                    Visit <a href="https://eliteacademy.pro" style="color: #667eea; font-weight: 700;">eliteacademy.pro</a> and log in with the same email &amp; password above to watch recorded lectures on your browser.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- ═══ ENROLLMENT PROFILE ═══ -->
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 22px 20px; margin-bottom: 16px;">
            <h3 style="color: #111827; margin: 0 0 16px 0; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px;">📋 Enrollment Profile</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 0; color: #6b7280;">Full Name</td>
                <td style="padding: 10px 0; color: #111827; text-align: right; font-weight: 500;">${enrollment.fullName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 0; color: #6b7280;">Father's Name</td>
                <td style="padding: 10px 0; color: #111827; text-align: right; font-weight: 500;">${enrollment.fatherName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 0; color: #6b7280;">Mobile Number</td>
                <td style="padding: 10px 0; color: #111827; text-align: right; font-weight: 500;">${enrollment.mobile}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 0; color: #6b7280;">Course Duration</td>
                <td style="padding: 10px 0; color: #111827; text-align: right; font-weight: 500;">5 Months</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 0; color: #6b7280;">Amount Paid</td>
                <td style="padding: 10px 0; color: #059669; text-align: right; font-weight: 700; font-size: 15px;">₹${enrollment.amount}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #6b7280;">Payment ID</td>
                <td style="padding: 10px 0; color: #111827; text-align: right; font-size: 11px; font-family: monospace;">${paymentId}</td>
              </tr>
            </table>
          </div>

          <!-- ═══ VISIT OUR INSTITUTE ═══ -->
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px 20px; margin-bottom: 28px;">
            <h3 style="color: #111827; margin: 0 0 8px 0; font-size: 15px;">🏢 Visit Our Institute</h3>
            <p style="font-size: 13px; color: #475569; line-height: 1.7; margin: 0;">
              <strong>Elite Academy</strong><br>
              <a href="https://maps.app.goo.gl/4h3PjhtJYke4EaN46" style="color: #667eea; text-decoration: underline;">SCO-144 Sector 24D, Chandigarh</a><br>
              <strong>Contact:</strong> 7696954686
            </p>
          </div>

          <!-- ═══ 8 BONUS BOOKS ═══ -->
          <div style="background: #fffbeb; border: 1.5px solid #fcd34d; border-radius: 12px; padding: 22px 20px; margin-bottom: 28px;">
            <h3 style="margin: 0 0 4px 0; color: #92400e; font-size: 17px;">🎁 8 Bonus Books — Included with Your Coaching</h3>
            <p style="font-size: 13px; color: #78350f; margin: 0 0 16px 0;">Get a head start right now — download all 8 books immediately:</p>
            ${booksHtml}
          </div>

          <p style="font-size: 15px; color: #374151; margin: 0;">
            Best regards,<br>
            <strong>Elite Academy Team</strong>
          </p>

        </div>

        <!-- ═══ FOOTER ═══ -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 11px; margin: 5px 0;">© 2026 Elite Academy. All rights reserved.</p>
          <p style="color: #6b7280; font-size: 11px; margin: 5px 0;">Your Success, Our Mission 🎓</p>
        </div>

      </div>
    </body>
    </html>
  `;

  // 1. Send to Student
  await transporter.sendMail({
    from: '"Elite Academy" <support@eliteacademy.pro>',
    to: enrollment.email,
    subject: "🎉 Enrollment Confirmed — Welcome to Coaching Program",
    html: html
  });

  // 2. Send to Admin
  await transporter.sendMail({
    from: '"Elite Academy" <support@eliteacademy.pro>',
    to: adminEmail,
    subject: `🚀 NEW COACHING ENROLLMENT: ${enrollment.fullName}`,
    html: `<h3>Admin Enrollment Report:</h3>` + html
  });
};

const getBookDisplayName = (bookType) => {
  const names = {
    'polity': 'Polity',
    'economics': 'Economics',
    'geography': 'Geography',
    'environment': 'Environment',
    'science': 'Science',
    'modern-history': 'Modern History',
    'ancient-history': 'Ancient History',
    'medieval-history': 'Medieval History'
  };
  return names[bookType] || bookType;
};

// Helper to get book emoji
const getBookEmoji = (bookType) => {
  const emojis = {
    'polity': '⚖️',
    'economics': '💰',
    'geography': '🌍',
    'environment': '🌱',
    'science': '🔬',
    'modern-history': '📜',
    'ancient-history': '🏛️',
    'medieval-history': '🏰'
  };
  return emojis[bookType] || '📚';
};

/**
 * Sends crash course confirmation with Premium UI
 */
const sendCrashCourseEmail = async (enrollment, pdfLinks, paymentId) => {
  const adminEmail = process.env.ADMIN_EMAIL || "2025eliteacademy@gmail.com";

  // --- GENERATE BOOKS DOWNLOAD SECTION ---
  const booksHtml = Object.entries(pdfLinks).map(([key, link]) => {
    const bookName = typeof getBookDisplayName === 'function' ? getBookDisplayName(key) : key;
    const emoji = typeof getBookEmoji === 'function' ? getBookEmoji(key) : '📚';
    
    return `
      <div style="margin-bottom: 10px; padding: 12px; background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 14px; color: #374151; padding-right: 15px;">${emoji} &nbsp; <strong>${bookName}</strong></span>
        <a href="${link}" style="background: #667eea; color: white; padding: 6px 14px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: bold; display: inline-block; min-width: 80px; text-align: center;">Download</a>
      </div>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✅ Registration Complete!</h1>
          <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Welcome to the Elite Academy Crash Course</p>
        </div>

        <div style="padding: 30px;">
          <p style="font-size: 16px; color: #374151;">Dear <strong>${enrollment.fullName}</strong>,</p>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Congratulations! Your payment has been confirmed. Your seat is officially reserved for the upcoming Crash Course batch.
          </p>

          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 24px 0;">
             <p style="margin: 10px 0 5px 0; font-size: 14px; color: #78350f; line-height: 1.5;">
               <strong>Access Note:</strong> Only this email ID (<strong>${enrollment.email}</strong>) will be able to access the lectures and tracker app. 
               You can login with the credentials below. If you already have an account created with this email, it will work perfectly.
             </p>
          </div>

          <div style="background: linear-gradient(135deg, #667eea10 0%, #764ba210 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 2px solid #667eea;">
            <h2 style="color: #667eea; margin-top: 0; font-size: 18px;">🔐 Login Details (App & Web)</h2>
            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
               <p style="margin: 8px 0; font-size: 14px; color: #6b7280;"><strong>Email/User ID:</strong> <span style="color: #111827;">${enrollment.email}</span></p>
               <p style="margin: 8px 0; font-size: 14px; color: #6b7280;"><strong>Password:</strong> <span style="color: #111827; font-family: monospace; background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${enrollment.appPassword}</span></p>
            </div>
            <p style="font-size: 13px; color: #4b5563; margin-top: 15px; line-height: 1.4;">
              🌐 <strong>Web Access:</strong> You can also visit <a href="https://eliteacademy.pro" style="color: #667eea; font-weight: bold;">eliteacademy.pro</a> and login with these credentials (or your previous login) to view your lectures.
            </p>
            <p style="font-size: 12px; color: #ef4444; margin-top: 10px;">⚠️ Video lectures and app access will be enabled on February 1st.</p>
          </div>

          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">📚 Your 8 Bonus Books (Instant Access)</h3>
            <p style="font-size: 14px; color: #475569; margin-bottom: 15px;">Start your preparation immediately with our complete library:</p>
            ${booksHtml}
          </div>

          <h3 style="color: #111827; font-size: 18px;">📱 Download the App</h3>
          <p style="color: #374151; font-size: 14px;">Access your classes and mock tests on your mobile device:</p>
          <div style="margin: 20px 0;">
            <a href="https://play.google.com/store/apps/details?id=com.johnnykhore.eliteacademy&hl=en" style="display: inline-block; background: #34d399; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; margin-right: 10px; font-size: 13px; font-weight: bold;">📱 Play Store</a>
            <a href="https://apps.apple.com/in/app/elite-academy-mock-tests/id6746954938" style="display: inline-block; background: #60a5fa; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: bold;">📱 App Store</a>
          </div>

          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #111827; margin-top: 0; font-size: 18px;">📋 Enrollment Profile</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 0; color: #6b7280;">Father's Name</td><td style="padding: 10px 0; color: #111827; text-align: right; font-weight: 500;">${enrollment.fatherName}</td></tr>
              <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 0; color: #6b7280;">Mobile</td><td style="padding: 10px 0; color: #111827; text-align: right; font-weight: 500;">${enrollment.mobile}</td></tr>
              <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 0; color: #6b7280;">Amount Paid</td><td style="padding: 10px 0; color: #059669; text-align: right; font-weight: 600;">₹${enrollment.amount}</td></tr>
              <tr><td style="padding: 10px 0; color: #6b7280;">Payment ID</td><td style="padding: 10px 0; color: #111827; text-align: right; font-size: 11px; font-family: monospace;">${paymentId}</td></tr>
            </table>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
            <h3 style="color: #111827; font-size: 16px;">🏢 Visit Our Institute</h3>
            <p style="font-size: 13px; color: #475569; line-height: 1.5;">
              <strong>Elite Academy</strong><br>
              <a href="https://maps.app.goo.gl/4h3PjhtJYke4EaN46" style="color: #667eea; text-decoration: underline;">SCO-144 Sector 24D Chandigarh</a><br>
              <strong>Contact:</strong> 7696954686
            </p>
          </div>

          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin: 24px 0;">
            <p style="color: #1e40af; margin: 0; font-size: 14px; text-align: center;">
              <strong>📢 Action Required: Join Your Batch Group</strong><br>
              Since you are an enrolled student, this WhatsApp Community is your direct lifeline to the academy for all daily operations and lecture timings.
              <br><br>
              <strong>Secure Your Access Now:</strong> Click the link below to join your fellow batchmates and stay updated:
              <br><br>
              <a href="https://chat.whatsapp.com/HohIDkP6D954EZSj0SInt5" style="display: inline-block; background: #25d366; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 8px;">👉 Join the WhatsApp Broadcast Community Here</a>
              <br><br>
              https://chat.whatsapp.com/HohIDkP6D954EZSj0SInt5
            </p>
          </div>

          <p style="font-size: 15px; color: #374151; margin-top: 30px;">
            Best regards,<br>
            <strong>Elite Academy Team</strong>
          </p>
        </div>

        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 11px; margin: 5px 0;">© 2026 Elite Academy. All rights reserved.</p>
          <p style="color: #6b7280; font-size: 11px; margin: 5px 0;">Your Success, Our Mission 🎓</p>
        </div>

      </div>
    </body>
    </html>
  `;

  // Send to Student
  await sendEmail({
    to: enrollment.email,
    subject: "🚀 Welcome to Crash Course - Registration Successful",
    html: html
  });

  // Send to Admin
  await sendEmail({
    to: adminEmail,
    subject: `🎯 NEW CRASH COURSE ENROLLMENT: ${enrollment.fullName}`,
    html: `<h3>Admin Report:</h3>` + html
  });
};

async function sendWeeklyTestSeriesEnrollmentEmail({ email, fullName, mobile, appPassword, amount, paymentId, mode, fatherName }) {
  const modeInfo = mode === "online" 
    ? {
        title: "Online Test Series",
        accessInfo: "You can access the test series on your mobile device using the Elite Academy app.",
        downloadSection: `
          <h3 style="color: #2563eb; margin-top: 24px;">📱 Download the App</h3>
          <p style="margin: 12px 0;">Get started by downloading our app:</p>
          <div style="margin: 20px 0;">
            <a href="https://play.google.com/store/apps/details?id=com.johnnykhore.eliteacademy&hl=en" 
               style="display: inline-block; background: #34d399; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">
              📱 Download on Play Store
            </a>
            <a href="https://apps.apple.com/in/app/elite-academy-mock-tests/id6746954938" 
               style="display: inline-block; background: #60a5fa; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              📱 Download on App Store
            </a>
          </div>
        `,
        instructionsIcon: "📱",
        instructionsText: "Login to the app using your credentials and start taking tests from anywhere!"
      }
    : {
        title: "Offline Test Series",
        accessInfo: "You can give tests at our institute. Please visit the institute with your enrollment details.",
        downloadSection: `
          <div style="background: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0;">🏢 Visit Our Institute</h3>
            <p style="color: #78350f; margin: 8px 0;">
              <strong>Elite Academy</strong><br>
              SCO-144 Sector 24D Chandigarh<br>
              Contact: 7696954686
            </p>
            <p style="color: #78350f; margin: 8px 0;">
              <strong>Timing:</strong> Monday to Saturday, 9:00 AM - 6:00 PM
            </p>
          </div>
        `,
        instructionsIcon: "🏢",
        instructionsText: "Visit the institute and login at the test center using your credentials."
      };

  const subject = `🎉 Enrollment Confirmed - Weekly Test Series (${modeInfo.title})`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✅ Enrollment Confirmed!</h1>
          <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Welcome to Weekly Test Series</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 40px 30px;">
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Dear <strong>${fullName}</strong>,
          </p>

          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Congratulations! 🎉 Your payment has been confirmed and you're now enrolled in the <strong>${modeInfo.title}</strong>.
          </p>

          <!-- Login Credentials Box -->
          <div style="background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 2px solid #667eea;">
            <h2 style="color: #667eea; margin-top: 0; font-size: 20px;">🔐 Your Login Credentials</h2>
            
            <div style="background: white; padding: 16px; border-radius: 8px; margin: 12px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Email:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 500;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Password:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 500; font-family: monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${appPassword}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Mobile:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 500;">${mobile}</td>
                </tr>
              </table>
            </div>

            <div style="background: #fef3c7; padding: 12px; border-radius: 6px; margin-top: 16px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                ⚠️ <strong>Important:</strong> Please keep these credentials safe. You'll need them to access your tests.
              </p>
            </div>
          </div>

          <!-- Mode Specific Instructions -->
          <div style="margin: 24px 0;">
            <h3 style="color: #111827; font-size: 18px;">${modeInfo.instructionsIcon} How to Access</h3>
            <p style="color: #374151; line-height: 1.6; margin: 12px 0;">
              ${modeInfo.accessInfo}
            </p>
            ${modeInfo.downloadSection}
            <p style="color: #374151; line-height: 1.6; margin: 12px 0;">
              ${modeInfo.instructionsText}
            </p>
          </div>

          <!-- Enrollment Details -->
          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #111827; margin-top: 0; font-size: 18px;">📋 Enrollment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280;">Student Name</td>
                <td style="padding: 12px 0; color: #111827; text-align: right; font-weight: 500;">${fullName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280;">Father's Name</td>
                <td style="padding: 12px 0; color: #111827; text-align: right; font-weight: 500;">${fatherName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280;">Mode</td>
                <td style="padding: 12px 0; color: #111827; text-align: right; font-weight: 500;">${modeInfo.title}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280;">Amount Paid</td>
                <td style="padding: 12px 0; color: #059669; text-align: right; font-weight: 600;">₹${amount}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #6b7280;">Payment ID</td>
                <td style="padding: 12px 0; color: #111827; text-align: right; font-size: 12px; font-family: monospace;">${paymentId}</td>
              </tr>
            </table>
          </div>

          <!-- Support Section -->
          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin: 24px 0;">
            <h3 style="color: #1e40af; margin-top: 0; font-size: 16px;">💬 Need Help?</h3>
            <p style="color: #1e40af; margin: 8px 0; line-height: 1.6;">
              If you face any issues logging in or have questions, feel free to reach out to us:
            </p>
            <p style="color: #1e40af; margin: 8px 0;">
              📧 Email: <a href="mailto:2025eliteacademy@gmail.com" style="color: #2563eb;">2025eliteacademy@gmail.com</a><br>
              📱 WhatsApp: 7696954686
            </p>
          </div>

          <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-top: 24px;">
            Best regards,<br>
            <strong>Elite Academy Team</strong>
          </p>

          <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
            🌟 All the best for your exam preparation! We're here to help you succeed.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 5px 0;">
            © 2026 Elite Academy. All rights reserved.
          </p>
          <p style="color: #6b7280; font-size: 12px; margin: 5px 0;">
            This is an automated email. Please do not reply directly to this message.
          </p>
        </div>

      </div>
    </body>
    </html>
  `;

  const text = `
Enrollment Confirmed - Weekly Test Series (${modeInfo.title})

Dear ${fullName},

Congratulations! Your payment has been confirmed and you're now enrolled in the ${modeInfo.title}.

🔐 Your Login Credentials:
Email: ${email}
Password: ${appPassword}
Mobile: ${mobile}

${mode === "online" 
  ? "Access: You can access the test series on your mobile device using the Elite Academy app. Download from Play Store or App Store and login with your credentials."
  : "Access: Visit our institute to give tests. Please bring your enrollment details.\n\nInstitute Address: Elite Academy, [Your Address]\nTiming: Monday to Saturday, 9:00 AM - 6:00 PM"
}

📋 Enrollment Details:
- Student Name: ${fullName}
- Father's Name: ${fatherName}
- Mode: ${modeInfo.title}
- Amount Paid: ₹${amount}
- Payment ID: ${paymentId}


Need Help?
Email: 2025eliteacademy@gmail.com
WhatsApp: 7696954686

Best regards,
Elite Academy Team

All the best for your exam preparation! 🌟
  `;

  // await sendEmail(email, subject, text, html);
  await sendEmail({ 
    to: email, 
    subject: subject, 
    text: text, 
    html: html 
  });
};

// Sectional Test Series Enrollment Email
async function sendSectionalTestSeriesEnrollmentEmail({ email, fullName, mobile, appPassword, amount, paymentId, mode, fatherName }) {
  const modeInfo = mode === "online" 
    ? {
        title: "Online Test Series",
        accessInfo: "You can access the test series on your mobile device using the Elite Academy app.",
        downloadSection: `
          <h3 style="color: #2563eb; margin-top: 24px;">📱 Download the App</h3>
          <p style="margin: 12px 0;">Get started by downloading our app:</p>
          <div style="margin: 20px 0;">
            <a href="https://play.google.com/store/apps/details?id=com.johnnykhore.eliteacademy&hl=en" 
               style="display: inline-block; background: #34d399; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">
              📱 Download on Play Store
            </a>
            <a href="https://apps.apple.com/in/app/elite-academy-mock-tests/id6746954938" 
               style="display: inline-block; background: #60a5fa; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              📱 Download on App Store
            </a>
          </div>
        `,
        instructionsIcon: "📱",
        instructionsText: "Login to the app using your credentials and start taking tests from anywhere!"
      }
    : {
        title: "Offline Test Series",
        accessInfo: "You can give tests at our institute. Please visit the institute with your enrollment details.",
        downloadSection: `
          <div style="background: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0;">🏢 Visit Our Institute</h3>
            <p style="color: #78350f; margin: 8px 0;">
              <strong>Elite Academy</strong><br>
              SCO-144 Sector 24D Chandigarh<br>
              Contact: 7696954686
            </p>
            <p style="color: #78350f; margin: 8px 0;">
              <strong>Timing:</strong> Monday to Saturday, 9:00 AM - 6:00 PM
            </p>
          </div>
        `,
        instructionsIcon: "🏢",
        instructionsText: "Visit the institute and login at the test center using your credentials."
      };

  const subject = `🎉 Enrollment Confirmed - Sectional Test Series (${modeInfo.title})`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✅ Enrollment Confirmed!</h1>
          <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Welcome to Sectional Test Series</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 40px 30px;">
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Dear <strong>${fullName}</strong>,
          </p>

          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Congratulations! 🎉 Your payment has been confirmed and you're now enrolled in the <strong>${modeInfo.title}</strong>.
          </p>

          <!-- Login Credentials Box -->
          <div style="background: linear-gradient(135deg, #6366f115 0%, #8b5cf615 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 2px solid #6366f1;">
            <h2 style="color: #6366f1; margin-top: 0; font-size: 20px;">🔐 Your Login Credentials</h2>
            
            <div style="background: white; padding: 16px; border-radius: 8px; margin: 12px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Email:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 500;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Password:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 500; font-family: monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${appPassword}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Mobile:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 500;">${mobile}</td>
                </tr>
              </table>
            </div>

            <div style="background: #fef3c7; padding: 12px; border-radius: 6px; margin-top: 16px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                ⚠️ <strong>Important:</strong> Please keep these credentials safe. You'll need them to access your tests.
              </p>
            </div>
          </div>

          <!-- Test Schedule Info -->
          <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 6px; margin: 24px 0;">
            <h3 style="color: #1e40af; margin-top: 0; font-size: 18px;">📅 Test Schedule</h3>
            <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
              <p style="margin: 0; color: #c2410c; font-weight: 600; font-size: 14px;">⏱️ Duration: 3 Months • Starting from 7th March 2026</p>
            </div>
            <ul style="color: #1e40af; line-height: 1.8; margin: 8px 0; padding-left: 20px;">
              <li><strong>Monday - Thursday:</strong> Subject-wise Sectional Tests</li>
              <li><strong>Friday:</strong> Full-Length Mock Tests</li>
            </ul>
            <p style="color: #1e40af; margin: 12px 0; font-size: 14px;">
              Complete coverage of all Punjab Government Exams with detailed performance analytics!
            </p>
          </div>

          <!-- Mode Specific Instructions -->
          <div style="margin: 24px 0;">
            <h3 style="color: #111827; font-size: 18px;">${modeInfo.instructionsIcon} How to Access</h3>
            <p style="color: #374151; line-height: 1.6; margin: 12px 0;">
              ${modeInfo.accessInfo}
            </p>
            ${modeInfo.downloadSection}
            <p style="color: #374151; line-height: 1.6; margin: 12px 0;">
              ${modeInfo.instructionsText}
            </p>
          </div>

          <!-- Enrollment Details -->
          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #111827; margin-top: 0; font-size: 18px;">📋 Enrollment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280;">Student Name</td>
                <td style="padding: 12px 0; color: #111827; text-align: right; font-weight: 500;">${fullName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280;">Father's Name</td>
                <td style="padding: 12px 0; color: #111827; text-align: right; font-weight: 500;">${fatherName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280;">Mode</td>
                <td style="padding: 12px 0; color: #111827; text-align: right; font-weight: 500;">${modeInfo.title}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280;">Duration</td>
                <td style="padding: 12px 0; color: #c2410c; text-align: right; font-weight: 600;">3 Months (Starting 7th March 2026)</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280;">Amount Paid</td>
                <td style="padding: 12px 0; color: #059669; text-align: right; font-weight: 600;">₹${amount}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #6b7280;">Payment ID</td>
                <td style="padding: 12px 0; color: #111827; text-align: right; font-size: 12px; font-family: monospace;">${paymentId}</td>
              </tr>
            </table>
          </div>

          <!-- Support Section -->
          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin: 24px 0;">
            <h3 style="color: #1e40af; margin-top: 0; font-size: 16px;">💬 Need Help?</h3>
            <p style="color: #1e40af; margin: 8px 0; line-height: 1.6;">
              If you face any issues logging in or have questions, feel free to reach out to us:
            </p>
            <p style="color: #1e40af; margin: 8px 0;">
              📧 Email: <a href="mailto:2025eliteacademy@gmail.com" style="color: #2563eb;">2025eliteacademy@gmail.com</a><br>
              📱 WhatsApp/Call: 7696954686
            </p>
            <p style="color: #1e40af; margin: 12px 0 0 0; font-size: 13px;">
              ⏰ Your login details will be delivered within 5 minutes. If you don't receive them, please contact us immediately.
            </p>
            <p style="color: #1e40af; margin: 12px 0 0 0;">
              🎓 <strong>Join our WhatsApp Community:</strong> <a href="https://chat.whatsapp.com/BTxcDSBPHMg22ji2loxYsX" style="color: #2563eb; text-decoration: underline;">Click here to join</a> for updates, tips, and community support!
            </p>
          </div>

          <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-top: 24px;">
            Best regards,<br>
            <strong>Elite Academy Team</strong>
          </p>

          <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
            🌟 All the best for your exam preparation! We're here to help you succeed.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 5px 0;">
            © 2026 Elite Academy. All rights reserved.
          </p>
          <p style="color: #6b7280; font-size: 12px; margin: 5px 0;">
            This is an automated email. Please do not reply directly to this message.
          </p>
        </div>

      </div>
    </body>
    </html>
  `;

  const text = `
Enrollment Confirmed - Sectional Test Series (${modeInfo.title})

Dear ${fullName},

Congratulations! Your payment has been confirmed and you're now enrolled in the ${modeInfo.title}.

🔐 Your Login Credentials:
Email: ${email}
Password: ${appPassword}
Mobile: ${mobile}

📅 Test Schedule:
⏱️ Duration: 3 Months • Starting from 7th March 2026
- Monday - Thursday: Subject-wise Sectional Tests
- Friday: Full-Length Mock Tests

${mode === "online" 
  ? "Access: You can access the test series on your mobile device using the Elite Academy app. Download from Play Store or App Store and login with your credentials."
  : "Access: Visit our institute to give tests. Please bring your enrollment details.\n\nInstitute Address: Elite Academy, SCO-144 Sector 24D Chandigarh\nTiming: Monday to Saturday, 9:00 AM - 6:00 PM\nContact: 7696954686"
}

📋 Enrollment Details:
- Student Name: ${fullName}
- Father's Name: ${fatherName}
- Mode: ${modeInfo.title}
- Duration: 3 Months (Starting 7th March 2026)
- Amount Paid: ₹${amount}
- Payment ID: ${paymentId}

Need Help?
Email: 2025eliteacademy@gmail.com
WhatsApp/Call: 7696954686

⏰ Your login details will be delivered within 5 minutes. If you don't receive them, please contact us immediately.

🎓 Join our WhatsApp Community: https://chat.whatsapp.com/BTxcDSBPHMg22ji2loxYsX
Stay connected for updates, tips, and community support!

Best regards,
Elite Academy Team

All the best for your exam preparation! 🌟
  `;

  // Send email to user
  await sendEmail({ 
    to: email, 
    subject: subject, 
    text: text, 
    html: html 
  });

  // Send email to admin
  try {
    const admin = await User.findOne({ role: "admin" });
    if (admin && admin.email) {
      const adminHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #6366f1; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0;">🎯 New Sectional Test Series Enrollment!</h2>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px;">
            <p style="color: #374151; font-size: 15px;">You have a new enrollment for the Sectional Test Series.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <h3 style="color: #6366f1; margin-top: 0;">Student Information</h3>
              <p style="margin: 8px 0;"><strong>Name:</strong> ${fullName}</p>
              <p style="margin: 8px 0;"><strong>Father's Name:</strong> ${fatherName}</p>
              <p style="margin: 8px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 8px 0;"><strong>Mobile:</strong> ${mobile}</p>
              <p style="margin: 8px 0;"><strong>Password:</strong> ${appPassword}</p>
              <p style="margin: 8px 0;"><strong>Mode:</strong> ${modeInfo.title}</p>
              <p style="margin: 8px 0;"><strong>Amount:</strong> ₹${amount}</p>
              <p style="margin: 8px 0;"><strong>Payment ID:</strong> ${paymentId}</p>
              <p style="margin: 8px 0;"><strong>Enrollment Date:</strong> ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <p style="color: #6b7280; margin-top: 20px;">
              Best regards,<br>
              <strong>Elite Meet System</strong>
            </p>
          </div>
        </body>
        </html>
      `;

      await sendEmail({
        to: admin.email,
        subject: `🎯 New Sectional Test Series Enrollment - ${fullName} (${mode})`,
        html: adminHtml
      });
    }
  } catch (adminEmailError) {
    console.error("Error sending admin notification email:", adminEmailError);
    // Don't throw - user email already sent successfully
  }

  console.log(`✅ Sectional Test Series enrollment emails sent to ${email} and admin`);
};

const sendPstetEmail = async (enrollment, paymentId) => {
  try {
    const admin = await User.findOne({ role: "admin" });
    
    const userEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎯 Welcome to Elite Academy!</h1>
          <p style="color: #fce7f3; margin-top: 10px; font-size: 16px;">PSTET & CTET 1 Month Crash Course</p>
        </div>

        <!-- Main Content -->
        <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <p style="color: #1f2937; font-size: 16px; line-height: 1.6;">Dear <strong>${enrollment.fullName}</strong>,</p>
          
          <p style="color: #059669; font-size: 18px; font-weight: bold; margin: 20px 0;">
            ✅ Payment Confirmed! Your enrollment is confirmed.
          </p>

          <!-- Course Details -->
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin-top: 0; font-size: 18px;">📚 Course Details:</h3>
            <p style="color: #1f2937; margin: 8px 0; font-size: 15px;"><strong>Course:</strong> PSTET & CTET 1 Month Crash Course</p>
            <p style="color: #1f2937; margin: 8px 0; font-size: 15px;"><strong>Duration:</strong> 1 Month (Till Exam)</p>
            <p style="color: #1f2937; margin: 8px 0; font-size: 15px;"><strong>Start Date:</strong> 5th February 2026</p>
            <p style="color: #1f2937; margin: 8px 0; font-size: 15px;"><strong>Mode:</strong> Online via Zoom Meet</p>
            <p style="color: #1f2937; margin: 8px 0; font-size: 15px;"><strong>Syllabus:</strong> Complete Syllabus with Exam</p>
            <p style="color: #059669; margin: 15px 0 0 0; font-size: 16px; font-weight: bold;">🔥 Full syllabus coverage till exam!</p>
          </div>

          <!-- WhatsApp Community -->
          <div style="background: linear-gradient(135deg, #25d366 0%, #128c7e 100%); padding: 25px; border-radius: 10px; margin: 25px 0; text-align: center;">
            <h2 style="margin: 0 0 15px 0; color: white; font-size: 22px;">📱 Join WhatsApp Community</h2>
            <p style="color: #e6fffa; margin: 0 0 15px 0; font-size: 16px;">
              Get live class links, updates & study materials
            </p>
            
            <a href="https://chat.whatsapp.com/HoRxQj00hItCfWgEQbnc7t" 
               style="display: inline-block; background: white; color: #25d366; text-decoration: none; padding: 16px 50px; border-radius: 8px; font-weight: bold; font-size: 18px; margin: 15px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
              Join WhatsApp Group
            </a>
            
            <p style="color: #e6fffa; margin: 15px 0 5px 0; font-size: 13px;">
              Link: <a href="https://chat.whatsapp.com/HoRxQj00hItCfWgEQbnc7t" style="color: white; text-decoration: underline;">https://chat.whatsapp.com/HoRxQj00hItCfWgEQbnc7t</a>
            </p>
          </div>

          <!-- Purchase Details -->
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Amount Paid</td>
                <td style="padding: 6px 0; color: #059669; text-align: right; font-weight: bold; font-size: 16px;">₹${enrollment.amount}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Payment ID</td>
                <td style="padding: 6px 0; color: #1f2937; text-align: right; font-size: 13px;">${paymentId}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Email</td>
                <td style="padding: 6px 0; color: #1f2937; text-align: right; font-size: 13px;">${enrollment.email}</td>
              </tr>
            </table>
          </div>

          <p style="color: #6b7280; margin-top: 25px; font-size: 14px;">
            Best regards,<br>
            <strong style="color: #1f2937;">Elite Academy Team</strong>
          </p>
        </div>
      </div>
    `;

    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ec4899;">🎯 New PSTET Enrollment!</h2>
        <p>You have a new enrollment for the PSTET & CTET 1 Month Crash Course.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Student Name:</strong> ${enrollment.fullName}</p>
          <p><strong>Student Email:</strong> ${enrollment.email}</p>
          <p><strong>Mobile:</strong> ${enrollment.mobile}</p>
          <p><strong>Father's Name:</strong> ${enrollment.fatherName}</p>
          <p><strong>Amount:</strong> ₹${enrollment.amount}</p>
          <p><strong>Payment ID:</strong> ${paymentId}</p>
          <p><strong>Enrollment Date:</strong> ${new Date(enrollment.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <p style="color: #6b7280; margin-top: 30px;">
          Best regards,<br>
          <strong>Elite Meet System</strong>
        </p>
      </div>
    `;

    // Send emails
    const emailPromises = [];
    
    emailPromises.push(
      sendEmail({
        to: enrollment.email,
        subject: "🎯 Elite Academy - PSTET & CTET Enrollment Confirmed!",
        html: userEmailHtml
      })
    );

    if (admin && admin.email) {
      emailPromises.push(
        sendEmail({
          to: admin.email,
          subject: "🎯 New PSTET Enrollment - " + enrollment.fullName,
          html: adminEmailHtml
        })
      );
    }

    await Promise.all(emailPromises);
    console.log("✅ PSTET enrollment emails sent successfully to user and admin");
    
  } catch (error) {
    console.error(" Error sending PSTET enrollment email:", error);
    throw error;
  }
};

// const sendExciseInspectorEmail = async (enrollment, paymentId) => {
//   try {
//     const admin = await User.findOne({ role: "admin" });
//     const whatsappCommunityLink = process.env.EXCISE_INSPECTOR_WHATSAPP_LINK || "https://chat.whatsapp.com/K5QXPcLBC8aCE62BGerXoK";
//     const googleMeetLink = "https://meet.google.com/ekh-ertg-hti";
//     const userEmailHtml = `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        
//         <!-- Header -->
//         <div style="background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
//           <h1 style="color: white; margin: 0; font-size: 28px;">🎯 Welcome to Elite Academy!</h1>
//           <p style="color: #fed7aa; margin-top: 10px; font-size: 16px;">Excise Inspector Exam Strategy Session</p>
//         </div>

//         <!-- Main Content -->
//         <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
//           <p style="color: #1f2937; font-size: 16px; line-height: 1.6;">Dear <strong>${enrollment.fullName}</strong>,</p>
          
//           <p style="color: #059669; font-size: 18px; font-weight: bold; margin: 20px 0;">
//             ✅ Payment Confirmed! Your registration is confirmed.
//           </p>

//           <!-- Session Details -->
//           <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
//             <h3 style="color: #92400e; margin-top: 0; font-size: 18px;">📅 Session Details:</h3>
//             <p style="color: #1f2937; margin: 8px 0; font-size: 15px;"><strong>Session:</strong> Excise Inspector Exam Strategy Session</p>
//             <p style="color: #1f2937; margin: 8px 0; font-size: 15px;"><strong>Time:</strong> 10am - 11am</p>
//             <p style="color: #1f2937; margin: 8px 0; font-size: 15px;"><strong>Date:</strong> 22nd March(Sunday) 2026</p>
//             <p style="color: #1f2937; margin: 8px 0; font-size: 15px;"><strong>Platform:</strong> Google Meet</p>
//             <p style="color: #1f2937; margin: 8px 0; font-size: 15px;"><strong>What You'll Get:</strong> Complete Strategy to Crack Exam</p>
//             <p style="color: #059669; margin: 15px 0 0 0; font-size: 16px; font-weight: bold;"> Google Meet link will be shared in WhatsApp community!</p>
//           </div>

//           <!-- WhatsApp Community -->
//           <div style="background: linear-gradient(135deg, #25d366 0%, #128c7e 100%); padding: 25px; border-radius: 10px; margin: 25px 0; text-align: center;">
//             <h2 style="margin: 0 0 15px 0; color: white; font-size: 22px;">📱 Join WhatsApp Community</h2>
//             <p style="color: #e6fffa; margin: 0 0 15px 0; font-size: 16px;">
//               Get Google Meet link, updates & study materials
//             </p>
            
//             <a href="${whatsappCommunityLink}" 
//                style="display: inline-block; background: white; color: #25d366; text-decoration: none; padding: 16px 50px; border-radius: 8px; font-weight: bold; font-size: 18px; margin: 15px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
//               Join WhatsApp Group
//             </a>
            
//             <p style="color: #e6fffa; margin: 15px 0 5px 0; font-size: 13px;">
//               Link: <a href="${whatsappCommunityLink}" style="color: white; text-decoration: underline;">${whatsappCommunityLink}</a>
//             </p>
//           </div>

//           <!-- Payment Bill -->
//           <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
//             <h3 style="color: #1e40af; margin-top: 0; font-size: 18px;">🧾 Payment Details:</h3>
//             <table style="width: 100%; border-collapse: collapse;">
//               <tr>
//                 <td style="padding: 8px 0; color: #4b5563; border-bottom: 1px solid #e5e7eb;"><strong>Course</strong></td>
//                 <td style="padding: 8px 0; color: #1f2937; text-align: right; border-bottom: 1px solid #e5e7eb;">Excise Inspector Strategy Session</td>
//               </tr>
//               <tr>
//                 <td style="padding: 8px 0; color: #4b5563; border-bottom: 1px solid #e5e7eb;"><strong>Amount Paid</strong></td>
//                 <td style="padding: 8px 0; color: #059669; text-align: right; font-weight: bold; border-bottom: 1px solid #e5e7eb;">₹${enrollment.amount}</td>
//               </tr>
//               <tr>
//                 <td style="padding: 8px 0; color: #4b5563; border-bottom: 1px solid #e5e7eb;"><strong>Payment ID</strong></td>
//                 <td style="padding: 8px 0; color: #1f2937; text-align: right; font-size: 13px; border-bottom: 1px solid #e5e7eb;">${paymentId}</td>
//               </tr>
//               <tr>
//                 <td style="padding: 8px 0; color: #4b5563;"><strong>Payment Date</strong></td>
//                 <td style="padding: 8px 0; color: #1f2937; text-align: right;">${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' })}</td>
//               </tr>
//             </table>
//           </div>

//           <p style="color: #6b7280; margin-top: 25px; font-size: 14px;">
//             Best regards,<br>
//             <strong style="color: #1f2937;">Elite Academy Team</strong>
//           </p>
//         </div>
//       </div>
//     `;

//     const adminEmailHtml = `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//         <h2 style="color: #f97316;">🎯 New Excise Inspector Enrollment!</h2>
//         <p>You have a new enrollment for Excise Inspector Exam Strategy Session.</p>
        
//         <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
//           <p><strong>Student Name:</strong> ${enrollment.fullName}</p>
//           <p><strong>Student Email:</strong> ${enrollment.email}</p>
//           <p><strong>Mobile:</strong> ${enrollment.mobile}</p>
//           <p><strong>Session:</strong> Excise Inspector Exam Strategy Session</p>
//           <p><strong>Date:</strong> 22nd March(Sunday) 2026</p>
//           <p><strong>Amount:</strong> ₹${enrollment.amount}</p>
//           <p><strong>Meet Link Provided:</strong> ${googleMeetLink}</p>
//           <p><strong>Payment ID:</strong> ${paymentId}</p>
//           <p><strong>Enrollment Date:</strong> ${new Date(enrollment.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
//         </div>

//         <p style="color: #6b7280; margin-top: 30px;">
//           Best regards,<br>
//           <strong>Elite Academy Team</strong>
//         </p>
//       </div>
//     `;

//     // Send emails
//     const emailPromises = [];
    
//     emailPromises.push(
//       sendEmail({
//         to: enrollment.email,
//         subject: "🎯 Elite Academy - Excise Inspector Session Confirmed!",
//         html: userEmailHtml
//       })
//     );

//     if (admin && admin.email) {
//       emailPromises.push(
//         sendEmail({
//           to: admin.email,
//           subject: "🎯 New Excise Inspector Enrollment - " + enrollment.fullName,
//           html: adminEmailHtml
//         })
//       );
//     }

//     await Promise.all(emailPromises);
//     console.log("✅ Excise Inspector enrollment emails sent successfully to user and admin");
    
//   } catch (error) {
//     console.error("❌ Error sending Excise Inspector enrollment email:", error);
//     throw error;
//   }
// };

const JOB_MEET_LINK = "https://meet.google.com/odo-sbtm-syw";

const sendJobApplicationEmail = async (application, paymentId) => {
  try {
    const admin = await User.findOne({ role: "admin" });
    const roleLabels = { "data-entry": "Data Entry", "teacher": "Teacher", "content-creator": "Content Creator" };
    const roleLabel = roleLabels[application.role] || application.role;

    const userEmailHtml = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:12px;">
        <div style="background:linear-gradient(135deg,#0f766e 0%,#134e4a 100%);padding:20px 16px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:0.5px;">Elite Academy</h1>
          <p style="color:#99f6e4;margin:4px 0 0 0;font-size:13px;font-weight:600;">Job Application – Registration Confirmed</p>
        </div>
        <div style="background:#fff;padding:20px 16px;border-radius:0 0 8px 8px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <p style="color:#1e293b;font-size:15px;margin:0 0 12px 0;">Dear <strong>${application.fullName}</strong>,</p>
          <p style="color:#059669;font-size:16px;font-weight:bold;margin:0 0 16px 0;">Your registration and payment are successful.</p>
          <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:12px 14px;margin:0 0 14px 0;border-radius:4px;">
            <h3 style="color:#065f46;margin:0 0 8px 0;font-size:15px;">Application details</h3>
            <p style="margin:4px 0;font-size:14px;color:#374151;"><strong>Role:</strong> ${roleLabel}</p>
            <p style="margin:4px 0;font-size:14px;color:#374151;"><strong>Contract:</strong> ${(application.contract || "").replace("month", " Months")}</p>
            <p style="margin:4px 0;font-size:14px;color:#374151;"><strong>Interview slot:</strong> ${application.interviewSlot || "As selected"}</p>
          </div>
          <div style="background:#ecfdf5;border:1px solid #a7f3d0;padding:14px;margin:0 0 14px 0;border-radius:6px;text-align:center;">
            <h3 style="color:#047857;margin:0 0 8px 0;font-size:15px;">Interview – Google Meet</h3>
            <p style="margin:0 0 6px 0;font-size:13px;color:#065f46;">Please join <strong>5 minutes before</strong> your scheduled time.</p>
            <a href="${JOB_MEET_LINK}" style="color:#047857;font-size:14px;font-weight:bold;text-decoration:underline;word-break:break-all;">${JOB_MEET_LINK}</a>
          </div>
          <div style="background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #e2e8f0;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <tr><td style="padding:4px 0;color:#64748b;">Amount paid</td><td style="padding:4px 0;color:#059669;text-align:right;font-weight:bold;">${application.currency === 'INR' ? '₹' : '$'}${application.amount}</td></tr>
              <tr><td style="padding:4px 0;color:#64748b;">Payment ID</td><td style="padding:4px 0;color:#334155;text-align:right;">${paymentId}</td></tr>
            </table>
          </div>
          <p style="color:#64748b;margin:16px 0 0 0;font-size:13px;">Best regards,<br><strong style="color:#1e293b;">Elite Academy Team</strong></p>
        </div>
      </div>
    `;

    const adminEmailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#333;padding:12px;">
        <h2 style="color:#0f766e;margin:0 0 12px 0;font-size:18px;">New job application (paid)</h2>
        <div style="background:#f1f5f9;padding:14px;border-radius:6px;border:1px solid #e2e8f0;font-size:14px;">
          <p style="margin:4px 0;"><strong>Name:</strong> ${application.fullName}</p>
          <p style="margin:4px 0;"><strong>Email:</strong> ${application.email}</p>
          <p style="margin:4px 0;"><strong>Phone:</strong> ${application.phone}</p>
          <p style="margin:4px 0;"><strong>Country:</strong> ${application.country}</p>
          <p style="margin:4px 0;"><strong>Role:</strong> ${roleLabel}</p>
          <p style="margin:4px 0;"><strong>Contract:</strong> ${application.contract}</p>
          <p style="margin:4px 0;"><strong>Interview slot:</strong> ${application.interviewSlot}</p>
          <p style="margin:4px 0;"><strong>Amount:</strong> ${application.currency === 'INR' ? '₹' : '$'}${application.amount}</p>
          <p style="margin:4px 0;"><strong>Payment ID:</strong> ${paymentId}</p>
          <p style="margin:4px 0;"><strong>Resume:</strong> <a href="${application.resumeUrl}">View resume</a></p>
        </div>
        <p style="color:#64748b;margin:12px 0 0 0;font-size:13px;">Best regards,<br><strong>Elite Meet System</strong></p>
      </div>
    `;

    const emailPromises = [
      sendEmail({
        to: application.email,
        subject: "Elite Academy – Job application registered successfully",
        html: userEmailHtml,
      }),
    ];
    if (admin && admin.email) {
      emailPromises.push(
        sendEmail({
          to: admin.email,
          subject: "New job application (paid) – " + application.fullName,
          html: adminEmailHtml,
        })
      );
    }
    await Promise.all(emailPromises);
    console.log("Job application emails sent to user and admin");
  } catch (error) {
    console.error("Error sending job application email:", error);
    throw error;
  }
};

const sendExciseInspectorEmail = async (enrollment, paymentId) => {
  try {
    const admin = await User.findOne({ role: "admin" });
    const whatsappCommunityLink = process.env.EXCISE_INSPECTOR_WHATSAPP_LINK || "https://chat.whatsapp.com/K5QXPcLBC8aCE62BGerXoK";
    const googleMeetLink = "https://meet.google.com/ekh-ertg-hti";

    const userEmailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 550px; margin: 0 auto; background-color: #f3f4f6; padding: 15px;">
        
        <div style="background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); padding: 25px 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 26px; letter-spacing: 1px;">ELITE ACADEMY</h1>
          <p style="color: #fed7aa; margin: 5px 0 0 0; font-size: 14px; text-transform: uppercase; font-weight: bold;">Excise Inspector Strategy Session</p>
        </div>

        <div style="background-color: white; padding: 25px 20px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          
          <p style="color: #1f2937; font-size: 16px;">Dear <strong>${enrollment.fullName}</strong>,</p>
          
          <p style="color: #059669; font-size: 17px; font-weight: bold; margin: 15px 0;">
            ✅ Payment Confirmed! Your seat is reserved.
          </p>

          <div style="background: #fef2f2; border: 2px dashed #dc2626; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
            <h3 style="color: #991b1b; margin: 0 0 10px 0; font-size: 18px;">🔗 Your Google Meet Link</h3>
            <a href="${googleMeetLink}" style="color: #dc2626; font-size: 16px; font-weight: bold; text-decoration: underline; word-break: break-all;">
              ${googleMeetLink}
            </a>
            <p style="margin-top: 10px; font-size: 13px; color: #7f1d1d;">Please save this link. You will join the session using this.</p>
          </div>

          <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
            <h4 style="color: #9a3412; margin: 0 0 10px 0; font-size: 16px;">📅 Session Details</h4>
            <p style="margin: 4px 0; font-size: 14px; color: #4b5563;"><strong>Time:</strong> 10:00 AM - 11:00 AM</p>
            <p style="margin: 4px 0; font-size: 14px; color: #4b5563;"><strong>Date:</strong> 22nd March 2026 (Sunday)</p>
            <p style="margin: 4px 0; font-size: 14px; color: #4b5563;"><strong>Agenda:</strong> Complete Strategy to Crack Exam</p>
          </div>

          <div style="background: linear-gradient(135deg, #25d366 0%, #128c7e 100%); padding: 25px; border-radius: 12px; text-align: center; margin-bottom: 25px;">
            <h3 style="margin: 0 0 10px 0; color: white; font-size: 20px;">📱 Join WhatsApp Community</h3>
            <p style="color: #e6fffa; margin: 0 0 20px 0; font-size: 14px;">
              Join to receive the Meet link again before the session, plus study materials and updates.
            </p>
            <a href="${whatsappCommunityLink}" 
               style="display: inline-block; background: white; color: #25d366; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
              Join Community Now
            </a>
          </div>

          <div style="background: #f8fafc; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0;">
            <h3 style="color: #475569; margin: 0 0 15px 0; font-size: 15px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">🧾 Tax Invoice / Receipt</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Course</td>
                <td style="padding: 8px 0; color: #1e293b; text-align: right; font-weight: 500;">Excise Strategy Session</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Amount Paid</td>
                <td style="padding: 8px 0; color: #059669; text-align: right; font-weight: bold;">₹${enrollment.amount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Payment ID</td>
                <td style="padding: 8px 0; color: #1e293b; text-align: right; font-size: 12px;">${paymentId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Date</td>
                <td style="padding: 8px 0; color: #1e293b; text-align: right;">${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' })}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 30px; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 20px;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              Best regards,<br>
              <strong style="color: #1f2937;">Elite Academy Team</strong>
            </p>
          </div>
        </div>
      </div>
    `;

    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #f97316;">🎯 New Enrollment Alert!</h2>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
          <p><strong>Name:</strong> ${enrollment.fullName}</p>
          <p><strong>Email:</strong> ${enrollment.email}</p>
          <p><strong>Mobile:</strong> ${enrollment.mobile}</p>
          <p><strong>Amount:</strong> ₹${enrollment.amount}</p>
          <p><strong>Payment ID:</strong> ${paymentId}</p>
          <p><strong>Google Meet Link:</strong> ${googleMeetLink}</p>
        </div>
      </div>
    `;

    // Send emails
    const emailPromises = [];
    
    emailPromises.push(
      sendEmail({
        to: enrollment.email,
        subject: "🎯 Elite Academy - Your Session Link & Confirmation",
        html: userEmailHtml
      })
    );

    if (admin && admin.email) {
      emailPromises.push(
        sendEmail({
          to: admin.email,
          subject: "Elite Academy: New Excise Enrollment - " + enrollment.fullName,
          html: adminEmailHtml
        })
      );
    }

    await Promise.all(emailPromises);
    console.log("✅ Excise Inspector emails (with Meet link) sent successfully");
    
  } catch (error) {
    console.error("❌ Error sending Excise Inspector enrollment email:", error);
    throw error;
  }
};

// French Course Email
const sendFrenchCourseEmail = async (enrollment, paymentId) => {
  try {
    const admin = await User.findOne({ role: "admin" });
    const meetLink = "https://meet.google.com/qxi-matr-qqq";
    const whatsappLink = "https://chat.whatsapp.com/CakJQWEFTY56LVtPTZNJmM";

    const userEmailHtml = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f0f4f8;padding:20px;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:28px 20px;border-radius:12px 12px 0 0;text-align:center;">
          <div style="font-size:42px;margin-bottom:8px;">🇫🇷</div>
          <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;letter-spacing:0.5px;">Elite Academy</h1>
          <p style="color:#e0e7ff;margin:6px 0 0 0;font-size:14px;font-weight:500;">French Language Course – Enrollment Confirmed 🎉</p>
        </div>
        
        <!-- Body -->
        <div style="background:#fff;padding:28px 24px;border-radius:0 0 12px 12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <p style="color:#1e293b;font-size:16px;margin:0 0 14px 0;">Dear <strong style="color:#4f46e5;">${enrollment.fullName}</strong>,</p>
          
          <div style="background:linear-gradient(135deg,#dcfce7 0%,#d1fae5 100%);border:1px solid #86efac;border-radius:10px;padding:16px 20px;margin:0 0 20px 0;text-align:center;">
            <div style="font-size:28px;margin-bottom:6px;">✅</div>
            <p style="color:#166534;font-size:17px;font-weight:700;margin:0;">Your enrollment and payment are successful!</p>
            <p style="color:#22c55e;font-size:13px;margin:6px 0 0 0;">Welcome to your French learning journey</p>
          </div>
          
          <!-- Course Details -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px;margin:0 0 20px 0;">
            <h3 style="color:#4f46e5;margin:0 0 14px 0;font-size:16px;font-weight:600;display:flex;align-items:center;gap:8px;">
              <span>📚</span> Course Details
            </h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr>
                <td style="padding:8px 0;color:#64748b;width:100px;">Plan</td>
                <td style="padding:8px 0;color:#1e293b;font-weight:500;">${enrollment.planLabel}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#64748b;">Duration</td>
                <td style="padding:8px 0;color:#1e293b;font-weight:500;">${enrollment.plan === '1month' ? '1 Month (Basic to Intermediate)' : '3 Months (Basic to Advanced - PR Ready)'}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#64748b;">Schedule</td>
                <td style="padding:8px 0;color:#1e293b;font-weight:500;">Monday to Friday | 7:00 PM IST</td>
              </tr>
            </table>
          </div>

          <!-- Access Links Section -->
          <div style="background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);border:1px solid #3b82f6;border-radius:10px;padding:20px;margin:0 0 20px 0;">
            <h3 style="color:#1d4ed8;margin:0 0 16px 0;font-size:16px;font-weight:600;text-align:center;">
              🔗 Your Class Access Links
            </h3>
            
            <!-- Google Meet -->
            <div style="background:#fff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:0 0 12px 0;text-align:center;">
              <div style="font-size:24px;margin-bottom:6px;">🎥</div>
              <p style="margin:0 0 10px 0;font-size:13px;color:#64748b;font-weight:500;">Join Daily Live Classes</p>
              <a href="${meetLink}" style="display:inline-block;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;box-shadow:0 2px 8px rgba(34,197,94,0.3);">👉 Join Google Meet</a>
              <p style="margin:10px 0 0 0;font-size:11px;color:#94a3b8;word-break:break-all;">${meetLink}</p>
            </div>
            
            <!-- WhatsApp -->
            <div style="background:#fff;border:1px solid #86efac;border-radius:8px;padding:16px;text-align:center;">
              <div style="font-size:24px;margin-bottom:6px;">💬</div>
              <p style="margin:0 0 10px 0;font-size:13px;color:#64748b;font-weight:500;">Join WhatsApp Community</p>
              <a href="${whatsappLink}" style="display:inline-block;background:linear-gradient(135deg,#25d366 0%,#128c7e 100%);color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;box-shadow:0 2px 8px rgba(37,211,102,0.3);">👉 Join WhatsApp Group</a>
              <p style="margin:10px 0 0 0;font-size:11px;color:#94a3b8;word-break:break-all;">${whatsappLink}</p>
            </div>
          </div>

          <!-- Payment Info -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin:0 0 18px 0;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <tr>
                <td style="padding:6px 0;color:#64748b;">💳 Amount Paid</td>
                <td style="padding:6px 0;color:#16a34a;text-align:right;font-weight:700;font-size:15px;">${enrollment.currency === 'INR' ? '₹' : '$'}${enrollment.amount}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;">🆔 Payment ID</td>
                <td style="padding:6px 0;color:#475569;text-align:right;font-family:monospace;font-size:12px;">${paymentId}</td>
              </tr>
            </table>
          </div>

          <!-- Important Notes -->
          <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:0 0 18px 0;">
            <h4 style="color:#b45309;margin:0 0 10px 0;font-size:14px;font-weight:600;">⚠️ Important Guidelines</h4>
            <ul style="margin:0;padding-left:18px;font-size:13px;color:#92400e;line-height:1.8;">
              <li>Join Google Meet <strong>5 minutes before</strong> class starts</li>
              <li>Join WhatsApp group for announcements & recordings</li>
              <li>All class recordings will be shared in the WhatsApp community</li>
              <li>Keep your camera on during classes for better interaction</li>
            </ul>
          </div>

          <!-- Footer -->
          <div style="border-top:1px solid #e2e8f0;padding-top:18px;text-align:center;">
            <p style="color:#64748b;margin:0 0 4px 0;font-size:13px;">Need help? Contact us at</p>
            <a href="mailto:2025eliteacademy@gmail.com" style="color:#4f46e5;font-size:13px;font-weight:500;text-decoration:none;">2025eliteacademy@gmail.com</a>
            <p style="color:#94a3b8;margin:14px 0 0 0;font-size:12px;">Best regards,<br><strong style="color:#4f46e5;">Elite Academy Team</strong></p>
          </div>
        </div>
        
        <p style="color:#94a3b8;text-align:center;font-size:11px;margin-top:14px;">This is an automated email. Please do not reply.</p>
      </div>
    `;

    const adminEmailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#333;padding:12px;">
        <h2 style="color:#4f46e5;margin:0 0 12px 0;font-size:18px;">🇫🇷 New French Course Enrollment (paid)</h2>
        <div style="background:#eff6ff;padding:14px;border-radius:6px;border:1px solid #bfdbfe;font-size:14px;">
          <p style="margin:4px 0;"><strong>Name:</strong> ${enrollment.fullName}</p>
          <p style="margin:4px 0;"><strong>Email:</strong> ${enrollment.email}</p>
          <p style="margin:4px 0;"><strong>Phone:</strong> ${enrollment.phone}</p>
          <p style="margin:4px 0;"><strong>Country:</strong> ${enrollment.country}</p>
          <p style="margin:4px 0;"><strong>Plan:</strong> ${enrollment.planLabel}</p>
          <p style="margin:4px 0;"><strong>Amount:</strong> ${enrollment.currency === 'INR' ? '₹' : '$'}${enrollment.amount}</p>
          <p style="margin:4px 0;"><strong>Payment ID:</strong> ${paymentId}</p>
        </div>
        <p style="color:#64748b;margin:12px 0 0 0;font-size:13px;">Best regards,<br><strong>Elite Meet System</strong></p>
      </div>
    `;

    const emailPromises = [
      sendEmail({
        to: enrollment.email,
        subject: "🇫🇷 Elite Academy – French Course Enrollment Confirmed! 🎉",
        html: userEmailHtml,
      }),
    ];
    if (admin && admin.email) {
      emailPromises.push(
        sendEmail({
          to: admin.email,
          subject: "🇫🇷 New French Course Enrollment – " + enrollment.fullName,
          html: adminEmailHtml,
        })
      );
    }
    await Promise.all(emailPromises);
    console.log("✅ French course emails sent to user and admin");
  } catch (error) {
    console.error("❌ Error sending French course email:", error);
    throw error;
  }
};

// Send PYQs book confirmation with login details
const sendPyqsEmail = async (purchase, paymentId) => {
  try {
    const admin = await User.findOne({ role: 'admin' });
    const siteLink = process.env.PYQS_WEBSITE_LINK || 'https://elite-academy-pyqs-ebooks.vercel.app';
    const whatsappLink = process.env.EXCISE_INSPECTOR_WHATSAPP_LINK || 'https://chat.whatsapp.com/K5QXPcLBC8aCE62BGerXoK';
    const playStoreLink = 'https://play.google.com/store/apps/details?id=com.johnnykhore.eliteacademy';
    const appStoreLink = 'https://apps.apple.com/in/app/elite-academy-mock-tests/id6746954938';

    const userHtml = `
      <div style="font-family: Arial, sans-serif; max-width:640px; margin:0 auto; padding:10px; background:#f8fafc;">
        <div style="background:linear-gradient(135deg,#0f766e 0%,#2563eb 100%); padding:20px 18px; border-radius:14px 14px 0 0; color:#fff; text-align:center;">
          <div style="display:inline-block; background:rgba(255,255,255,0.16); padding:6px 12px; border-radius:999px; font-size:12px; font-weight:700; letter-spacing:0.3px; margin-bottom:10px;">PAYMENT CONFIRMED</div>
          <h1 style="margin:0; font-size:25px; line-height:1.2;">Your PYQs Book Access is Ready</h1>
          <p style="margin:8px 0 0 0; font-size:15px; opacity:0.95; line-height:1.5;">You can now open the <strong>PYQs Book</strong> and the <strong>Excise Inspector Mock Test</strong> on the app.</p>
        </div>

        <div style="background:#ffffff; padding:16px; border-radius:0 0 14px 14px; box-shadow:0 8px 24px rgba(15,23,42,0.08); border:1px solid #e5e7eb; border-top:none;">
          <p style="font-size:15px; color:#0f172a; margin:0 0 10px 0;">Hi <strong>${purchase.fullName}</strong>,</p>
          <p style="font-size:14px; color:#334155; line-height:1.6; margin:0 0 12px 0;">Your payment has been received successfully. Please use the same email address used for this purchase while logging in.</p>

          <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:12px; padding:12px; margin:12px 0;">
            <div style="font-size:15px; font-weight:700; color:#047857; margin-bottom:8px;">Step 1: Log in with this email</div>
            <div style="background:#fff; border:1px solid #d1fae5; border-radius:8px; padding:10px; font-family:monospace; font-size:13px; color:#065f46; word-break:break-all; margin-bottom:8px;">
              ${purchase.email}
            </div>
            <p style="margin:0; color:#64748b; font-size:12px; line-height:1.5;">Your login credentials for website access are this same email ID and the password below.</p>
          </div>

          <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:12px; padding:12px; margin:12px 0;">
            <div style="font-size:15px; font-weight:700; color:#047857; margin-bottom:8px;">Password for website access</div>
            <div style="background:#fff; border:1px solid #d1fae5; border-radius:8px; padding:10px; font-family:monospace; font-size:13px; color:#065f46; word-break:break-all; margin-bottom:8px;">
              ${purchase.appPassword}
            </div>
            <p style="margin:0; color:#64748b; font-size:12px; line-height:1.5;">If you already have an account, log in with this email and password. If not, create one using the same email only.</p>
          </div>

          <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:12px; padding:12px; margin:12px 0;">
            <div style="font-size:15px; font-weight:700; color:#c2410c; margin-bottom:8px;">Step 2: Open the website</div>
            <p style="margin:0 0 8px 0; color:#334155; font-size:13px; line-height:1.5;">Open the website below and log in with the same email and password to access your PYQs Book first.</p>
            <div style="margin-top:8px;">
              <a href="${siteLink}" style="display:inline-block; background:linear-gradient(135deg,#0f766e 0%,#2563eb 100%); color:#fff; text-decoration:none; padding:11px 18px; border-radius:9px; font-weight:700; font-size:13px; margin-right:8px; margin-bottom:8px;">Open Website</a>
            </div>
            <p style="margin:4px 0 0 0; color:#ea580c; font-weight:700; font-size:13px; word-break:break-all;">${siteLink}</p>
          </div>

          <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; padding:12px; margin:12px 0;">
            <div style="font-size:15px; font-weight:700; color:#1d4ed8; margin-bottom:8px;">Step 3: Download the Elite Academy app</div>
            <p style="margin:0 0 10px 0; color:#334155; font-size:13px; line-height:1.5;">Install the app to access Excise Inspector Mock Test anytime. Use the same email ID only, because only this email has access.</p>
            <div style="display:block; margin-bottom:8px;">
              <a href="${playStoreLink}" style="display:block; background:#16a34a; color:#fff; text-decoration:none; padding:11px 14px; border-radius:9px; font-weight:700; text-align:center; margin-bottom:8px;">Download on Google Play</a>
              <a href="${appStoreLink}" style="display:block; background:#111827; color:#fff; text-decoration:none; padding:11px 14px; border-radius:9px; font-weight:700; text-align:center;">Download on the App Store</a>
            </div>
          </div>

          <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:12px; padding:12px; margin:12px 0;">
            <div style="font-size:15px; font-weight:700; color:#c2410c; margin-bottom:8px;">Step 4: Open Courses and start learning</div>
            <p style="margin:0; color:#334155; font-size:13px; line-height:1.5;">First you will see <strong>PYQs Book access</strong>, and then you will also get <strong>Excise Inspector Mock Test</strong> access in the Courses section.</p>
          </div>

          <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:12px; padding:12px; margin:12px 0;">
            <div style="font-size:15px; font-weight:700; color:#c2410c; margin-bottom:8px;">Step 5: Join the Elite Academy Community</div>
            <p style="margin:0; color:#334155; font-size:13px; line-height:1.5;">Join our community of learners and stay updated with the latest news and updates and guidance sessions.</p>
            <p style="margin:0 0 10px 0;font-size:13px;color:#64748b;font-weight:500;">Join WhatsApp Community</p>
            <a href="${whatsappLink}" style="display:inline-block;background:linear-gradient(135deg,#25d366 0%,#128c7e 100%);color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;box-shadow:0 2px 8px rgba(37,211,102,0.3);">👉 Join WhatsApp Group</a>
            <p style="margin:10px 0 0 0;font-size:11px;color:#94a3b8;word-break:break-all;">${whatsappLink}</p>
          </div>

          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px; margin:12px 0;">
            <div style="font-size:14px; font-weight:700; color:#0f172a; margin-bottom:6px;">Need help?</div>
            <p style="margin:0; color:#475569; font-size:13px; line-height:1.6;">Call <strong>7696954686</strong> for any issue. Make sure the login email matches the payment email.</p>
          </div>

          <p style="margin:14px 0 0 0; color:#0f172a; font-size:13px;">Best regards,<br><strong>Elite Academy Team</strong></p>
        </div>
      </div>
    `;

    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width:600px;margin:0 auto;padding:16px;">
        <h3>New PYQs Purchase</h3>
        <p><strong>Name:</strong> ${purchase.fullName}</p>
        <p><strong>Email:</strong> ${purchase.email}</p>
        <p><strong>Mobile:</strong> ${purchase.mobile}</p>
        <p><strong>Amount:</strong> ₹${purchase.amount}</p>
        <p><strong>Payment ID:</strong> ${paymentId}</p>
      </div>
    `;

    await Promise.all([
      sendEmail({ to: purchase.email, subject: '📘 PYQs Book - Access Details', html: userHtml }),
      admin && admin.email ? sendEmail({ to: admin.email, subject: `New PYQs Purchase - ${purchase.fullName}`, html: adminHtml }) : Promise.resolve()
    ]);
    console.log('PYQs emails sent');
  } catch (err) {
    console.error('Error sending PYQs email', err);
    throw err;
  }
};

/**
 * Sends payment reminder email for pending payments
 */
const sendPaymentReminderEmail = async (enrollment) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">⚠️ Payment Reminder</h1>
          <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">Elite Academy - Pending Payment</p>
        </div>

        <div style="padding: 30px;">
          <p style="font-size: 16px; color: #374151;">Dear <strong>${enrollment.fullName}</strong>,</p>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            This is a friendly reminder that you have a pending payment for your coaching enrollment.
          </p>

          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 10px 0 5px 0; font-size: 14px; color: #78350f; line-height: 1.5;">
              <strong>Pending Amount:</strong> ₹${enrollment.pendingPaymentAmount}
            </p>
            <p style="margin: 5px 0; font-size: 14px; color: #78350f; line-height: 1.5;">
              <strong>Due Date:</strong> ${new Date(enrollment.paymentExpiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0; font-size: 15px; color: #991b1b; line-height: 1.6;">
              <strong>📞 Action Required:</strong> Your coaching payment is pending. Kindly call <strong>7696954686</strong> to complete your payment and avoid any disruption in your access.
            </p>
          </div>

          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #111827; margin-top: 0; font-size: 18px;">📋 Enrollment Details</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 0; color: #6b7280;">Name</td><td style="padding: 10px 0; color: #111827; text-align: right; font-weight: 500;">${enrollment.fullName}</td></tr>
              <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 0; color: #6b7280;">Email</td><td style="padding: 10px 0; color: #111827; text-align: right; font-weight: 500;">${enrollment.email}</td></tr>
              <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 0; color: #6b7280;">Mobile</td><td style="padding: 10px 0; color: #111827; text-align: right; font-weight: 500;">${enrollment.mobile}</td></tr>
              <tr><td style="padding: 10px 0; color: #6b7280;">Amount Paid</td><td style="padding: 10px 0; color: #059669; text-align: right; font-weight: 600;">₹${enrollment.amount}</td></tr>
            </table>
          </div>

          <p style="font-size: 15px; color: #374151; margin-top: 30px;">
            Best regards,<br>
            <strong>Elite Academy Team</strong>
          </p>
        </div>

        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 11px; margin: 5px 0;">© 2026 Elite Academy. All rights reserved.</p>
          <p style="color: #6b7280; font-size: 11px; margin: 5px 0;">Your Success, Our Mission 🎓</p>
        </div>

      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: '"Elite Academy" <support@eliteacademy.pro>',
    to: enrollment.email,
    subject: "⚠️ Payment Reminder - Elite Academy",
    html: html
  });

  console.log(`Payment reminder email sent to ${enrollment.email}`);
};

/**
 * Professional Softcopy Delivery Email
 */
const sendPlannerSoftcopyEmail = async (purchase, paymentId) => {
  const admin = await User.findOne({ role: 'admin' });
  console.log("Admin email for planner softcopy:", admin ? admin.email : "No admin found");
  const downloadLink = process.env.PLANNER_SOFTCOPY_LINK || "https://drive.google.com/...";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px;">🎯 90-Day Master Success Planner</h1>
        <p style="margin-top: 5px; opacity: 0.9;">Elite Academy Premium Materials</p>
      </div>
      <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); color: #334155;">
        <p>Dear <strong>${purchase.fullName}</strong>,</p>
        <p style="color: #10b981; font-weight: bold; font-size: 16px;">✓ Payment Confirmed Successfully!</p>
        <p>Your digital interactive planner structure is ready for access. It contains daily breakdowns for your entire PSSSB curriculum timeline.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${downloadLink}" style="display: inline-block; background: #1e3a8a; color: white; text-decoration: none; padding: 14px 35px; border-radius: 6px; font-weight: bold; box-shadow: 0 4px 10px rgba(30,58,138,0.25);">📥 Access Digital Planner</a>
        </div>

        <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; font-size: 13px;">
          <strong>Order Reference:</strong> ${purchase.razorpayOrderId || "Manual Order"}<br>
          <strong>Payment ID:</strong> ${paymentId}
        </div>
      </div>
    </div>
  `;
  await sendEmail({ to: purchase.email, subject: "📥 Download Your Elite Academy 90-Day Planner", html });
  await sendEmail({ to: admin.email, subject: "📥 New Planner Order Received of SoftCopy", html }); // Send to admin
};

/**
 * Professional Hardcopy Shipping Confirmation Email
 */
const sendPlannerHardcopyEmail = async (purchase, paymentId) => {
  const admin = await User.findOne({ role: 'admin' });
  console.log("Admin email for planner hardcopy:", admin ? admin.email : "No admin found");
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
      <div style="background: linear-gradient(135deg, #111827 0%, #1f2937 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px;">📦 Order Confirmed - Hardcopy Book</h1>
        <p style="margin-top: 5px; opacity: 0.9;">Elite Academy Publications</p>
      </div>
      <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); color: #334155;">
        <p>Dear <strong>${purchase.fullName}</strong>,</p>
        <p>Thank you for choosing Elite Academy. We are currently preparing your print order of the <strong>90-Day Master Success Planner</strong>.</p>
        
        <div style="border-left: 4px solid #1f2937; padding-left: 15px; margin: 20px 0; background: #f9fafb; padding: 12px;">
          <h4 style="margin: 0 0 5px 0;">📍 Shipping Address:</h4>
          <p style="margin: 0; font-size: 14px; color: #4b5563;">
            ${purchase.flatNo || ""}, ${purchase.area || ""}<br>
            ${purchase.city}, ${purchase.state} - ${purchase.pincode}
          </p>
        </div>
        <p>As soon as our warehouse updates shipment handoffs, tracking notifications with tracking links will follow automatically via email.</p>
      </div>
    </div>
  `;
  await sendEmail({ to: purchase.email, subject: "📦 Order Secured - Elite Academy 90-Day Master Planner", html });
  await sendEmail({ to: admin.email, subject: "📦 New Hardcopy Planner Order Received", html }); // Send to admin
};

/**
 * Live Courier Tracking Upgrades Email
 */
const sendTrackingEmail = async (purchase, trackerId) => {
  const admin = await User.findOne({ role: 'admin' });
  console.log("Admin email for tracking update:", admin ? admin.email : "No admin found");
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
      <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px;">🚚 Your Order Has Been Shipped!</h1>
        <p style="margin-top: 5px; opacity: 0.9;">Elite Academy Delivery Updates</p>
      </div>
      <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); color: #334155;">
        <p>Hi <strong>${purchase.fullName}</strong>,</p>
        <p>Good news! Your print parcel for the <strong>90-Day Master Success Planner</strong> has been dispatched.</p>
        
        <div style="text-align: center; background: #ecfdf5; border: 1px dashed #10b981; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <span style="font-size: 14px; color: #047857; display: block; font-weight: bold; margin-bottom: 5px;">TRACKING ID / CONSIGNMENT NUMBER</span>
          <span style="font-size: 22px; font-weight: bold; color: #065f46; letter-spacing: 1px;">${trackerId}</span>
        </div>
        
        <p>Use this number on the carrier tracking page to monitor live parcel delivery progress.</p>
      </div>
    </div>
  `;
  await sendEmail({ to: purchase.email, subject: "🚚 Shipped: Tracking Info for Your Elite Academy Order", html });
  await sendEmail({ to: admin.email, subject: "🚚 New Order Shipped", html }); // Send to admin

};

// CORRECT EXPORT
module.exports = {
  sendEmail,
  sendEmailWithPDF,
  sendBookingEmails,    // This is correct name (not sendBookingConfirmation)
  sendBookEmail,        // NEW - for single books
  sendPackageEmail,      // NEW - for packages
  sendCoachingEmail,
  sendCrashCourseEmail,   // NEW - for crash course
  sendWeeklyTestSeriesEnrollmentEmail,
  sendSectionalTestSeriesEnrollmentEmail,
  sendPstetEmail,
  sendExciseInspectorEmail,
  sendJobApplicationEmail,
  sendFrenchCourseEmail,
  sendPyqsEmail,
  sendDigitalOfflineDemoEmail,
  sendPaymentReminderEmail,
  sendPlannerSoftcopyEmail,
  sendPlannerHardcopyEmail,
  sendTrackingEmail
};
