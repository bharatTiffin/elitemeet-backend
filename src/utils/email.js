// src/utils/email.js
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
require('dotenv').config();

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
    from: process.env.EMAIL_FROM || `"Elite Academy" <noreply@eliteacademy.com>`,
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
                <div class="stat-label">PYQ Pages</div>
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
          📄 ${bookInfo?.pages || 'N/A'} pages + ${bookInfo?.pyqPages || 'N/A'} PYQ pages
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





// Helper to get book display name
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

// ✅ CORRECT EXPORT
module.exports = {
  sendEmail,
  sendEmailWithPDF,
  sendBookingEmails,    // ✅ This is the correct name (not sendBookingConfirmation)
  sendBookEmail,        // ✅ NEW - for single books
  sendPackageEmail      // ✅ NEW - for packages
};
