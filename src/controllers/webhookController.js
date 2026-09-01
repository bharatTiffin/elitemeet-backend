// src/controllers/webhookController.js
const crypto = require("crypto");
const path = require("path");
const Booking = require("../models/Booking");
const Coupon = require("../models/Coupon");
const { buildWhatsAppLink, normalizePhone } = require("../utils/phone");
const Slot = require("../models/Slot");
const User = require("../models/User");
const MentorshipEnrollment = require("../models/MentorshipEnrollment");
const MentorshipProgram = require("../models/MentorshipProgram");
const PDFPurchase = require("../models/PDFPurchase");
const { sendEmail, sendEmailWithPDF, sendDigitalOfflineDemoEmail } = require("../utils/email");
const TypingPurchase = require("../models/TypingPurchase");
const PolityPurchase = require("../models/PolityPurchase");
const BookPurchase = require("../models/BookPurchase");
const { PackageType } = require("../models/BookPurchase");
const { sendBookEmail, sendPackageEmail,sendCoachingEmail, sendCrashCourseEmail, sendPstetEmail, sendExciseInspectorEmail, sendJobApplicationEmail, sendFrenchCourseEmail, sendPyqsEmail } = require("../utils/email");
const { BOOK_INFO, PACKAGE_INFO } = require('./bookController');
const CurrentAffair = require("../models/CurrentAffair");
const CoachingEnrollment = require("../models/CoachingEnrollment");
const CrashCourse = require("../models/CrashCourse");
const PyqsPurchase = require("../models/PyqsPurchase");
const WeeklyTestSeries = require("../models/WeeklyTestSeries");
const SectionalTestSeries = require("../models/SectionalTestSeries");
const { sendWeeklyTestSeriesEnrollmentEmail } = require("../utils/email");
const { sendSectionalTestSeriesEnrollmentEmail } = require("../utils/email");
const MonthlyCurrentAffairPurchase = require("../models/MonthlyCurrentAffairPurchase");
const MonthlyCurrentAffair = require("../models/MonthlyCurrentAffair");
const PstetEnrollment = require("../models/PstetEnrollment");
const ExciseInspectorEnrollment = require("../models/ExciseInspectorEnrollment");
const JobApplication = require("../models/jobApplication");
const FrenchCourse = require("../models/frenchCourse");
const DigitalOfflineDemoRegistration = require("../models/DigitalOfflineDemoRegistration");
const PlannerPurchase = require("../models/PlannerPurchase");
const { sendPlannerSoftcopyEmail, sendPlannerHardcopyEmail } = require("../utils/email");

// Get PDF links from ENV
const getPDFLinks = () => ({
  'polity': process.env.POLITY_PDF_LINK,
  'economics': process.env.ECONOMICS_PDF_LINK,
  'geography': process.env.GEOGRAPHY_PDF_LINK,
  'environment': process.env.ENVIRONMENT_PDF_LINK,
  'science': process.env.SCIENCE_PDF_LINK,
  'modern-history': process.env.MODERN_HISTORY_PDF_LINK,  // ✅ Hyphen
  'ancient-history': process.env.ANCIENT_HISTORY_PDF_LINK,  // ✅ Hyphen
  'medieval-history': process.env.MEDIEVAL_HISTORY_PDF_LINK  // ✅ Hyphen
});

const handleRazorpayWebhook = async (req, res) => {
  try {
    console.log("handleRazorpayWebhook");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    console.log("secret: ", secret);
    console.log("signature: ", signature);

    // ✅ Handle different body formats safely
    let bodyString;
    let event;

    if (Buffer.isBuffer(req.body)) {
      // Raw buffer (ideal case from express.raw())
      bodyString = req.body.toString("utf-8");
      event = JSON.parse(bodyString);
    } else if (typeof req.body === "string") {
      // Already stringified
      bodyString = req.body;
      event = JSON.parse(bodyString);
    } else if (typeof req.body === "object" && req.body !== null) {
      // Already parsed as JSON (Vercel might do this)
      bodyString = JSON.stringify(req.body);
      event = req.body;
    } else {
      console.error("❌ Unexpected body type:", typeof req.body);
      return res.status(400).send("Invalid body format");
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(bodyString)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("❌ Invalid webhook signature");
      console.error("Expected:", expectedSignature);
      console.error("Received:", signature);
      return res.status(400).send("Invalid webhook signature");
    }

    console.log("✅ Webhook signature verified");
    console.log("📦 Webhook event type:", event?.event);

    if (event.event === "payment.captured") {
      const paymentEntity = event.payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      console.log("💰 Processing payment.captured for order:", orderId);
      console.log("💰 Payment ID:", paymentId);
      console.log("💰 Payment amount:", paymentEntity.amount ? paymentEntity.amount / 100 : "N/A");

      // Check if it's a mentorship enrollment by checking order notes
      // First, get the order to check its notes
      const Razorpay = require("razorpay");
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      let orderDetails;
      try {
        orderDetails = await razorpay.orders.fetch(orderId);
      } catch (err) {
        console.error("Error fetching order:", err);
        // Continue with existing logic if order fetch fails
      }

      const isPDFPurchase = orderDetails?.notes?.type === "pdf_purchase" ||
                            (await PDFPurchase.findOne({ razorpayOrderId: orderId }));

      const isMentorshipEnrollment = orderDetails?.notes?.type === "mentorship_enrollment" ||
                                     (await MentorshipEnrollment.findOne({ razorpayOrderId: orderId }));

      const isCurrentAffairPurchase =
      orderDetails?.notes?.type === "currentaffair_purchase" ||
      (await CurrentAffair.findOne({ razorpayOrderId: orderId }));

        
    const isTypingPurchase =
    orderDetails?.notes?.type === "typing_purchase" ||
    (await TypingPurchase.findOne({ razorpayOrderId: orderId }));



    const isPolityPurchase =
  orderDetails?.notes?.type === "polity_purchase" ||
  (await PolityPurchase.findOne({ razorpayOrderId: orderId }));

    const isPyqsPurchase = orderDetails?.notes?.purchaseType === "pyqs_book" ||
                           (await PyqsPurchase.findOne({ razorpayOrderId: orderId }));


  const isBookPurchase = orderDetails?.notes?.purchaseType === "book" ||
  orderDetails?.notes?.purchaseType === "package" ||
  (await BookPurchase.findOne({ orderId: orderId }));

  const isCoachingPurchase = orderDetails?.notes?.purchaseType === "coaching" || 
                           (await CoachingEnrollment.findOne({ razorpayOrderId: orderId }));                

  const isMonthlyCurrentAffairPurchase = orderDetails?.notes?.purchaseType === "monthly_magazine" ||
                                         (await MonthlyCurrentAffairPurchase.findOne({ orderId: orderId }));

  if (orderDetails?.notes.purchaseType === "weekly-testseries-online" || orderDetails?.notes.purchaseType === "weekly-testseries-offline") {
    await handleWeeklyTestSeriesPayment(paymentEntity, paymentEntity.id);
  }

  if (orderDetails?.notes.purchaseType === "sectional-testseries-online" || orderDetails?.notes.purchaseType === "sectional-testseries-offline") {
    await handleSectionalTestSeriesPayment(paymentEntity, paymentEntity.id);
  }

  // Inside handleRazorpayWebhook -> after verifying the signature and checking if event === "payment.captured"
  const isPlannerPurchase = orderDetails?.notes?.purchaseType === "planner" || 
                           (await PlannerPurchase.findOne({ razorpayOrderId: orderId }));

  if (isPlannerPurchase || orderDetails?.notes?.purchaseType === "hardcopy" || orderDetails?.notes?.purchaseType === "softcopy") {
    await handlePlannerPayment(event.payload.payment.entity, paymentId);
    return res.json({ status: "ok" });
  }

  if (orderDetails?.notes.purchaseType === "pstet_ctet") {
    await handlePstetPayment(paymentEntity, paymentEntity.id);
  }

  if (orderDetails?.notes.purchaseType === "excise-inspector") {
    await handleExciseInspectorPayment(paymentEntity, paymentEntity.id);
  }

  if (orderDetails?.notes.purchaseType === "job_application") {
    await handleJobApplicationPayment(paymentEntity, paymentEntity.id);
    return res.json({ status: "ok" });
  }

  if (orderDetails?.notes.purchaseType === "french_course") {
    await handleFrenchCoursePayment(paymentEntity, paymentEntity.id);
    return res.json({ status: "ok" });
  }

  if (orderDetails?.notes.purchaseType === "digital_offline_registration") {
    await handleDigitalOfflineDemoPayment(paymentEntity, paymentEntity.id);
    return res.json({ status: "ok" });
  }

  if (orderDetails?.notes.purchaseType === "pyqs_book") {
    await handlePyqsPayment(paymentEntity, paymentEntity.id);
    return res.json({ status: "ok" });
  }

  if (isCoachingPurchase) {
    console.log("📘 Processing Online Coaching enrollment payment");

    const enrollment = await CoachingEnrollment.findOneAndUpdate(
      { razorpayOrderId: orderId },
      { 
        status: "confirmed", 
        razorpayPaymentId: paymentId,
        expiresAt: null 
      },
      { new: true }
    );

    if (enrollment) {
      console.log(`✅ Enrollment confirmed for: ${enrollment.email}`);
      const pdfLinks = getPDFLinks();
      // Call the helper function we just added to email.js
      try {
        await sendCoachingEmail(enrollment, pdfLinks, paymentId);
        console.log("📧 Success: Enrollment emails sent to User and Admin");
      } catch (emailErr) {
        console.error("❌ Email Error:", emailErr);
      }
    }

  // if (enrollment) {
  //   console.log(`✅ Coaching Enrollment Confirmed: ${enrollment.email}`);
  //   try {
  //     await sendCoachingConfirmationEmail(enrollment);
  //     console.log("📧 Coaching confirmation emails sent successfully");
  //   } catch (emailErr) {
  //     console.error("❌ Error sending coaching emails:", emailErr);
  //   }
  // }
}

// Handle Crash Course Enrollment
const isCrashCoursePurchase = orderDetails?.notes?.purchaseType === "crash-course" || 
                             (await CrashCourse.findOne({ razorpayOrderId: orderId }));

if (isCrashCoursePurchase) {
  console.log("🚀 Processing Crash Course enrollment payment");

  const enrollment = await CrashCourse.findOneAndUpdate(
    { razorpayOrderId: orderId },
    { 
      status: "confirmed", 
      razorpayPaymentId: paymentId,
      expiresAt: null 
    },
    { new: true }
  );

  if (enrollment) {
    console.log(`✅ Crash Course enrollment confirmed for: ${enrollment.email}`);
    const pdfLinks = getPDFLinks();
    try {
      await sendCrashCourseEmail(enrollment, pdfLinks, paymentId);
      console.log("📧 Success: Crash Course emails sent to User and Admin");
    } catch (emailErr) {
      console.error("❌ Email Error:", emailErr);
    }
  }
}

// Add this handler after the PDF purchase handler
// Handle Polity Purchase
if (isPolityPurchase) {
  console.log("📘 Processing Polity Book purchase payment");

  // Find purchase
  let purchase = await PolityPurchase.findOne({ razorpayOrderId: orderId });

  if (purchase) {
    // Prevent duplicate processing
    if (purchase.status === "confirmed") {
      console.log("ℹ️ Polity purchase already confirmed:", purchase._id);
      return res.json({ status: "ok" });
    }

    // Update existing purchase
    purchase.status = "confirmed";
    purchase.razorpayPaymentId = paymentId;
    await purchase.save();
  } else {
    // Create new purchase from order notes
    if (!orderDetails || !orderDetails.notes) {
      console.error("❌ Cannot create polity purchase: order details missing");
      return res.status(400).json({ error: "Order details missing" });
    }

    const userFirebaseUid = orderDetails.notes.userFirebaseUid;
    const userName = orderDetails.notes.userName;
    const userEmail = orderDetails.notes.userEmail;

    if (!userFirebaseUid || !userEmail) {
      console.error("❌ Cannot create polity purchase: missing user info");
      return res.status(400).json({ error: "User information missing" });
    }

    // Get polity price from environment
    const getPolityPrice = () => {
      const price = process.env.POLITY_PRICE;
      if (price) {
        const parsedPrice = parseInt(price, 10);
        if (!isNaN(parsedPrice) && parsedPrice > 0) {
          return parsedPrice;
        }
      }
      return 199; // Default price
    };

    purchase = new PolityPurchase({
      userFirebaseUid: userFirebaseUid,
      userName: userName,
      userEmail: userEmail,
      amount: getPolityPrice(),
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      status: "confirmed",
    });

    await purchase.save();
    console.log("✅ Created polity purchase after payment:", purchase._id);
  }

  console.log("📧 Sending Polity Book PDF email...");

// Get admin details
const admin = await User.findOne({ role: "admin" });

// ✅ SEND EMAILS
const emailPromises = [];

// Get Google Drive link from environment variable
const polityPdfLink = process.env.POLITY_PDF_GOOGLE_DRIVE_LINK || "https://drive.google.com/file/d/1M3781NiqdVZMfTB6PmiRXmC0L1zxdTSP/view?usp=sharing";

// Email to User with Google Drive download link (NO PDF attachment)
if (purchase.userEmail) {
  emailPromises.push(
    sendEmail({
      to: purchase.userEmail,
      subject: "📘 Elite Academy - Complete Polity Package",
   html: `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">📘 Complete Polity Package</h1>
      <p style="color: #e0e7ff; margin-top: 10px; font-size: 16px;">PSSSB & Punjab Exams</p>
    </div>

    <!-- Main Content -->
    <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      
      <p style="color: #1f2937; font-size: 16px; line-height: 1.6;">Dear <strong>${purchase.userName}</strong>,</p>
      
      <p style="color: #059669; font-size: 18px; font-weight: bold; margin: 20px 0;">
        ✅ Payment Confirmed! Download your PDF now.
      </p>

      <!-- What's Inside - Numbered List -->
      <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
        <h3 style="color: #1e40af; margin-top: 0; font-size: 18px;">🎯 What's Inside:</h3>
        <p style="color: #1f2937; margin: 8px 0; font-size: 15px;"><strong>1.</strong> 90 Pages Full Polity Notes</p>
        <p style="color: #1f2937; margin: 8px 0; font-size: 15px;"><strong>2.</strong> 20 Pages PYQs (2012–2025 | Dec Updated)</p>
        <p style="color: #1f2937; margin: 8px 0; font-size: 15px;"><strong>3.</strong> 100% PSSSB + Punjab Exam Oriented</p>
        <p style="color: #059669; margin: 15px 0 0 0; font-size: 16px; font-weight: bold;">🔥 Score Full Marks – No Extra Books Needed</p>
      </div>

      <!-- Download Button Section -->
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 25px; border-radius: 10px; margin: 25px 0; text-align: center;">
        <h2 style="margin: 0 0 15px 0; color: white; font-size: 22px;">📥 Download Your PDF</h2>
        
        <a href="${polityPdfLink}" 
           style="display: inline-block; background: white; color: #059669; text-decoration: none; padding: 16px 50px; border-radius: 8px; font-weight: bold; font-size: 18px; margin: 15px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
          Click Here to Download
        </a>
        
        <p style="color: #d1fae5; margin: 15px 0 5px 0; font-size: 13px;">
          If button doesn't work, copy this link:<br>
          <a href="${polityPdfLink}" style="color: white; word-break: break-all; text-decoration: underline; font-size: 12px;">${polityPdfLink}</a>
        </p>
      </div>

      <!-- Purchase Details -->
      <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Amount Paid</td>
            <td style="padding: 6px 0; color: #059669; text-align: right; font-weight: bold; font-size: 16px;">₹${purchase.amount}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Payment ID</td>
            <td style="padding: 6px 0; color: #1f2937; text-align: right; font-size: 13px;">${paymentId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Date</td>
            <td style="padding: 6px 0; color: #1f2937; text-align: right; font-size: 13px;">${new Date(purchase.purchaseDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}</td>
          </tr>
        </table>
      </div>

      <p style="color: #6b7280; margin-top: 25px; font-size: 14px;">
        Best regards,<br>
        <strong style="color: #1f2937;">Elite Academy Team</strong>
      </p>
    </div>
  </div>
`

    })
  );
}

// Email to Admin notification
if (admin && admin.email) {
  emailPromises.push(
    sendEmail({
      to: admin.email,
      subject: "🎉 New Polity Package Purchase",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">New Purchase Notification</h2>
          <p>You have a new purchase of the <strong>Complete Polity Package</strong>.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Customer Name:</strong> ${purchase.userName}</p>
            <p><strong>Customer Email:</strong> ${purchase.userEmail}</p>
            <p><strong>Amount:</strong> ₹${purchase.amount}</p>
            <p><strong>Payment ID:</strong> ${paymentId}</p>
            <p><strong>Purchase Date:</strong> ${new Date(purchase.purchaseDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <p style="color: #6b7280; margin-top: 30px;">
            Best regards,<br>
            <strong>Elite Meet System</strong>
          </p>
        </div>
      `
    })
  );
}

await Promise.all(emailPromises);
console.log("✅ Polity purchase emails sent successfully");

return res.json({ status: "ok" });
}


// Handle Book Purchase - UPDATED VERSION
if (isBookPurchase) {
  console.log('📚 Processing Book/Package purchase payment');
  
  let purchase = await BookPurchase.findOne({ orderId: orderId });
  
  if (!purchase) {
    console.error('❌ Book purchase not found for order:', orderId);
    return res.status(404).json({ error: 'Purchase not found' });
  }
  
  // Prevent duplicate processing
  if (purchase.status === 'completed') {
    console.log('ℹ️ Book purchase already completed:', purchase._id);
    return res.json({ status: 'ok' });
  }
  
  // Update purchase status
  purchase.status = 'completed';
  purchase.paymentId = paymentId;
  await purchase.save();
  
  console.log('✅ Book purchase completed:', orderId);
  
  // Get PDF links
  const pdfLinks = getPDFLinks();
  
  // Get admin details
  const admin = await User.findOne({ role: 'admin' });
  
  // Send appropriate email based on package type
  try {
    if (purchase.packageType === 'single') {
      // Single book purchase
      const bookType = purchase.bookType;
      const bookInfo = BOOK_INFO[bookType]; // Full book info
      
      // ✅ Send email to USER with full book details
      await sendBookEmail(
        purchase.userEmail,
        purchase.userName,
        bookInfo?.name + " Book",
        bookType,
        bookInfo,
        pdfLinks[bookType],
        pdfLinks[bookType],
        purchase.amount,
        paymentId
      )
      
      console.log('✅ Single book email sent to:', purchase.userEmail);
      
      // ✅ Send email to ADMIN
      if (admin && admin.email) {
        await sendEmail({
          to: admin.email,
          subject: '🔔 New Book Purchase - ' + (bookInfo?.name || 'Book'),
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #3b82f6;">📚 New Book Purchase Notification</h2>
              <p>You have a new purchase of <strong>${bookInfo?.name || 'a book'}</strong>.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Customer Name:</strong> ${purchase.userName}</p>
                <p><strong>Customer Email:</strong> ${purchase.userEmail}</p>
                <p><strong>Book Type:</strong> ${bookType}</p>
                <p><strong>Amount:</strong> ₹${purchase.amount}</p>
                <p><strong>Payment ID:</strong> ${paymentId}</p>
                <p><strong>Purchase Date:</strong> ${new Date(purchase.createdAt).toLocaleDateString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
              </div>
              
              <p style="color: #6b7280; margin-top: 30px;">
                Best regards,<br>
                <strong>Elite Meet System</strong>
              </p>
            </div>
          `
        });
        
        console.log('✅ Admin notification sent for book purchase');
      }
      
    } else {
      // Package purchase (complete-pack or without-polity)
      const packageInfo = PACKAGE_INFO[purchase.packageType];
      const booksIncluded = purchase.booksIncluded;
      
      // Create pdfLinks and driveLinks objects for the package
      const packagePdfLinks = {};
      const packageDriveLinks = {};
      booksIncluded.forEach(bookType => {
        packagePdfLinks[bookType] = pdfLinks[bookType];
        packageDriveLinks[bookType] = pdfLinks[bookType];
      });
      
      // ✅ Send email to USER with full package details
      // Around line 492 - CORRECT WAY
      await sendPackageEmail(
        purchase.userEmail,
        purchase.userName,
        packageInfo?.name + " Package",
        packageInfo,
        booksIncluded,
        packagePdfLinks,
        packageDriveLinks,
        purchase.amount,
        paymentId
      )

      
      console.log('✅ Package email sent to:', purchase.userEmail);
      
      // ✅ Send email to ADMIN
      if (admin && admin.email) {
        const booksList = booksIncluded.map(bt => 
          `<li>${BOOK_INFO[bt]?.name || bt}</li>`
        ).join('');
        
        await sendEmail({
          to: admin.email,
          subject: '🔔 New Package Purchase - ' + (packageInfo?.name || 'Package'),
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #10b981;">📦 New Package Purchase Notification</h2>
              <p>You have a new purchase of <strong>${packageInfo?.name || 'a package'}</strong>.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Customer Name:</strong> ${purchase.userName}</p>
                <p><strong>Customer Email:</strong> ${purchase.userEmail}</p>
                <p><strong>Package Type:</strong> ${purchase.packageType}</p>
                <p><strong>Books Included (${booksIncluded.length}):</strong></p>
                <ul>${booksList}</ul>
                <p><strong>Amount:</strong> ₹${purchase.amount}</p>
                <p><strong>Payment ID:</strong> ${paymentId}</p>
                <p><strong>Purchase Date:</strong> ${new Date(purchase.createdAt).toLocaleDateString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
              </div>
              
              <p style="color: #6b7280; margin-top: 30px;">
                Best regards,<br>
                <strong>Elite Meet System</strong>
              </p>
            </div>
          `
        });
        
        console.log('✅ Admin notification sent for package purchase');
      }
    }
    
  } catch (emailError) {
    console.error('❌ Error sending book/package email:', emailError);
  }
  
  return res.json({ status: 'ok' });
}




        
    // Handle Typing Purchase
    if (isTypingPurchase) {
    console.log("⌨️ Processing Typing course purchase payment");
    
    // Find purchase
    let purchase = await TypingPurchase.findOne({ razorpayOrderId: orderId });
    
    if (purchase) {
      // Prevent duplicate processing
      if (purchase.status === "confirmed") {
        console.log("ℹ️ Typing purchase already confirmed:", purchase._id);
        return res.json({ status: "ok" });
      }
    
      // Update existing purchase
      purchase.status = "confirmed";
      purchase.razorpayPaymentId = paymentId;
      await purchase.save();
    } else {
      // Create new purchase from order notes
      if (!orderDetails || !orderDetails.notes) {
        console.error("❌ Cannot create typing purchase: order details missing");
        return res.status(400).json({ error: "Order details missing" });
      }
    
      const userFirebaseUid = orderDetails.notes.userFirebaseUid;
      const userName = orderDetails.notes.userName;
      const userEmail = orderDetails.notes.userEmail;
    
      if (!userFirebaseUid || !userEmail) {
        console.error("❌ Cannot create typing purchase: missing user info");
        return res.status(400).json({ error: "User information missing" });
      }

      // Get typing price from environment
      const getTypingPrice = () => {
        const price = process.env.TYPING_PRICE;
        if (price) {
          const parsedPrice = parseInt(price, 10);
          if (!isNaN(parsedPrice) && parsedPrice > 0) {
            return parsedPrice;
          }
        }
        return 499; // Default price
      };
    
      purchase = new TypingPurchase({
        userFirebaseUid: userFirebaseUid,
        userName: userName,
        userEmail: userEmail,
        amount: getTypingPrice(),
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        status: "confirmed",
      });
    
      await purchase.save();
      console.log("✅ Created typing purchase after payment:", purchase._id);
    }

    console.log("📧 Sending typing course access email...");

    // Get admin details
    const admin = await User.findOne({ role: "admin" });

    // ✅ SEND EMAILS
    const emailPromises = [];

    // Email to User with access details
    if (purchase.userEmail) {
      emailPromises.push(
        sendEmail({
          to: purchase.userEmail,
          subject: "Elite Academy - Punjabi Typing Course Access 🎉",
          html: `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Elite Academy</h1>
      <p style="color: #e0e7ff; margin-top: 10px; font-size: 16px;">Punjabi & English Typing Training</p>
    </div>
    
    <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      
      <p style="color: #1f2937; font-size: 16px; line-height: 1.6;">Dear <strong>${purchase.userName}</strong>,</p>
      
      <p style="color: #1f2937; font-size: 16px; line-height: 1.6;">
        ✅ Congratulations! Your enrollment in the <strong>Punjabi & English Typing Training</strong> course has been confirmed.
      </p>

      <!-- MOVE THIS TO TOP - Platform Access Section -->
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 25px; border-radius: 10px; margin: 25px 0; text-align: center;">
        <h2 style="margin: 0 0 15px 0; color: white; font-size: 22px;">🚀 Start Learning Now!</h2>
        <a href="https://elite-academy-punjabi-typing.vercel.app/" 
           style="display: inline-block; background: white; color: #059669; text-decoration: none; padding: 16px 50px; border-radius: 8px; font-weight: bold; font-size: 18px; margin: 15px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
          Access Typing Platform →
        </a>
        <p style="color: #d1fae5; margin: 15px 0 5px 0; font-size: 15px;">
          <strong>Platform URL:</strong><br>
          <a href="https://elite-academy-punjabi-typing.vercel.app/" style="color: white; text-decoration: underline;">
            elite-academy-punjabi-typing.vercel.app
          </a>
        </p>
        <p style="color: #d1fae5; margin: 5px 0; font-size: 14px;">
          Login with: <strong style="background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 4px;">${purchase.userEmail}</strong>
        </p>
      </div>

      <!-- Purchase Details - NOW BELOW -->
      <div style="background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%); padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
        <h3 style="margin-top: 0; color: #1e40af; font-size: 18px;">📋 Purchase Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #4b5563;"><strong>Course</strong></td>
            <td style="padding: 8px 0; color: #1f2937; text-align: right;">Punjabi & English Typing Training</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4b5563;"><strong>Level</strong></td>
            <td style="padding: 8px 0; color: #1f2937; text-align: right;">Clerk / Senior Assistant</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4b5563;"><strong>Amount Paid</strong></td>
            <td style="padding: 8px 0; color: #059669; text-align: right; font-weight: bold;">₹${purchase.amount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4b5563;"><strong>Payment ID</strong></td>
            <td style="padding: 8px 0; color: #1f2937; text-align: right; font-size: 12px;">${paymentId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4b5563;"><strong>Purchase Date</strong></td>
            <td style="padding: 8px 0; color: #1f2937; text-align: right;">${new Date(purchase.purchaseDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' })}</td>
          </tr>
        </table>
      </div>

      <!-- Rest of the sections remain the same -->
      <!-- How to Access, What You'll Learn, etc. -->
      
    </div>
  </div>
`,

        })
      );
    }
  
    // Email to Admin
    if (admin && admin.email) {
      emailPromises.push(
        sendEmail({
          to: admin.email,
          subject: "New Typing Course Purchase ⌨️",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #3b82f6;">New Typing Course Purchase ⌨️</h2>
              
              <p>You have a new purchase of the Punjabi & English Typing Training course.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Customer Name:</strong> ${purchase.userName}</p>
                <p><strong>Customer Email:</strong> ${purchase.userEmail}</p>
                <p><strong>Amount:</strong> ₹${purchase.amount}</p>
                <p><strong>Payment ID:</strong> ${paymentId}</p>
                <p><strong>Purchase Date:</strong> ${new Date(purchase.purchaseDate).toLocaleDateString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
              </div>
  
              <p style="color: #6b7280;">
                The customer will receive access to the typing platform at:<br>
                <a href="https://elite-academy-punjabi-typing.vercel.app" style="color: #3b82f6;">
                  elite-academy-punjabi-typing.vercel.app
                </a>
              </p>
              
              <p style="color: #6b7280; margin-top: 30px;">
                Best regards,<br>
                <strong>Elite Meet System</strong>
              </p>
            </div>
          `,
        })
      );
    }
  
    try {
      await Promise.all(emailPromises);
      console.log("✅ Typing course emails sent successfully");
    } catch (emailError) {
      console.error("❌ Error sending typing course emails:", emailError);
    }
  
    return res.json({ status: "ok" });
    }

    // Handle Monthly Current Affairs Purchase
    if (isMonthlyCurrentAffairPurchase) {
      console.log("📰 Processing Monthly Current Affairs purchase payment");

      // Find purchase
      let purchase = await MonthlyCurrentAffairPurchase.findOne({ orderId: orderId });

      if (purchase) {
        // Prevent duplicate processing
        if (purchase.status === "completed") {
          console.log("ℹ️ Monthly Current Affairs purchase already confirmed:", purchase._id);
          return res.json({ status: "ok" });
        }

        // Update existing purchase
        purchase.status = "completed";
        purchase.paymentId = paymentId;
        await purchase.save();
      } else {
        // Create new purchase from order notes
        if (!orderDetails || !orderDetails.notes) {
          console.error("❌ Cannot create monthly current affairs purchase: order details missing");
          return res.status(400).json({ error: "Order details missing" });
        }

        const userId = orderDetails.notes.userId;
        const userName = orderDetails.notes.userName;
        const userEmail = orderDetails.notes.userEmail;
        const purchaseSubType = orderDetails.notes.purchaseSubType;
        const month = orderDetails.notes.month;
        const monthsIncluded = orderDetails.notes.monthsIncluded || [];

        if (!userId || !userEmail) {
          console.error("❌ Cannot create monthly current affairs purchase: missing user info");
          return res.status(400).json({ error: "User information missing" });
        }

        purchase = new MonthlyCurrentAffairPurchase({
          userId,
          userName,
          userEmail,
          purchaseType: purchaseSubType,
          month: purchaseSubType === 'single' ? month : null,
          monthsIncluded: purchaseSubType === 'complete-pack' ? monthsIncluded : [month],
          orderId: orderId,
          paymentId: paymentId,
          amount: paymentEntity.amount / 100,
          status: "completed"
        });

        await purchase.save();
        console.log("✅ Created monthly current affairs purchase after payment:", purchase._id);
      }

      console.log("📧 Sending Monthly Current Affairs emails...");

      try {
        const admin = await User.findOne({ role: "admin" });
        const emailPromises = [];

        // Get magazine details for email
        let magazineDetails = [];
        if (purchase.purchaseType === 'single' && purchase.month) {
          const magazine = await MonthlyCurrentAffair.findOne({ 
            month: purchase.month, 
            isActive: true 
          });
          if (magazine) {
            magazineDetails.push({
              month: magazine.month,
              title: magazine.title,
              driveLink: magazine.driveLink
            });
          }
        } else if (purchase.purchaseType === 'complete-pack' && purchase.monthsIncluded) {
          const magazines = await MonthlyCurrentAffair.find({ 
            month: { $in: purchase.monthsIncluded },
            isActive: true 
          });
          magazineDetails = magazines.map(mag => ({
            month: mag.month,
            title: mag.title,
            driveLink: mag.driveLink
          }));
        }

        // Email to User
        if (purchase.userEmail) {
          const magazinesHtml = magazineDetails.map(mag => `
            <div class="magazine-card">
              <h3 class="magazine-title">📰 ${mag.title}</h3>
              <p class="magazine-month">Month: ${mag.month.toUpperCase()}</p>
              <div>
                <a href="${mag.driveLink}" class="download-btn">
                  Download Magazine →
                </a>
              </div>
            </div>
          `).join('');

          emailPromises.push(
            sendEmail({
              to: purchase.userEmail,
              subject: `📰 Elite Academy - Monthly Current Affairs Magazine${purchase.purchaseType === 'complete-pack' ? 's' : ''}`,
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <meta name="color-scheme" content="light dark">
                  <style>
                    body { 
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
                      margin: 0; 
                      padding: 16px; 
                      background-color: #f8fafc; 
                      color: #1e293b;
                    }
                    @media (prefers-color-scheme: dark) {
                      body { background-color: #0f172a; color: #f1f5f9; }
                    }
                    .container { 
                      max-width: 600px; 
                      margin: 0 auto; 
                      background: #ffffff; 
                      border-radius: 16px; 
                      overflow: hidden; 
                      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                    }
                    @media (prefers-color-scheme: dark) {
                      .container { background: #1e293b; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
                    }
                    .header { 
                      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
                      padding: 32px 24px; 
                      text-align: center; 
                    }
                    .header h1 { 
                      color: #ffffff; 
                      margin: 0; 
                      font-size: 24px; 
                      font-weight: 700; 
                    }
                    .header p { 
                      color: #dbeafe; 
                      margin: 8px 0 0 0; 
                      font-size: 16px; 
                      font-weight: 500;
                    }
                    .content { 
                      padding: 24px; 
                    }
                    .success-badge { 
                      display: inline-flex; 
                      align-items: center; 
                      background: #dcfce7; 
                      color: #166534; 
                      padding: 8px 16px; 
                      border-radius: 20px; 
                      font-weight: 600; 
                      font-size: 14px; 
                      margin-bottom: 20px;
                    }
                    @media (prefers-color-scheme: dark) {
                      .success-badge { background: #14532d; color: #86efac; }
                    }
                    .greeting { 
                      font-size: 16px; 
                      color: #374151; 
                      margin: 0 0 16px 0;
                    }
                    @media (prefers-color-scheme: dark) {
                      .greeting { color: #d1d5db; }
                    }
                    .confirmation { 
                      font-size: 18px; 
                      font-weight: 600; 
                      color: #059669; 
                      margin: 20px 0;
                    }
                    @media (prefers-color-scheme: dark) {
                      .confirmation { color: #34d399; }
                    }
                    .details-box { 
                      background: #f1f5f9; 
                      border: 1px solid #e2e8f0; 
                      border-radius: 12px; 
                      padding: 20px; 
                      margin: 20px 0;
                    }
                    @media (prefers-color-scheme: dark) {
                      .details-box { background: #334155; border-color: #475569; }
                    }
                    .details-box h3 { 
                      margin: 0 0 16px 0; 
                      color: #1e40af; 
                      font-size: 16px; 
                      font-weight: 600;
                    }
                    @media (prefers-color-scheme: dark) {
                      .details-box h3 { color: #60a5fa; }
                    }
                    .details-table { 
                      width: 100%; 
                      border-collapse: collapse; 
                    }
                    .details-table td { 
                      padding: 8px 0; 
                      border-bottom: 1px solid #e2e8f0; 
                      font-size: 14px;
                    }
                    .details-table td:first-child { 
                      color: #64748b; 
                      font-weight: 500;
                    }
                    .details-table td:last-child { 
                      text-align: right; 
                      color: #1f2937; 
                      font-weight: 600;
                    }
                    @media (prefers-color-scheme: dark) {
                      .details-table td { border-bottom-color: #475569; }
                      .details-table td:first-child { color: #94a3b8; }
                      .details-table td:last-child { color: #f1f5f9; }
                    }
                    .magazine-card { 
                      background: #f8fafc; 
                      border: 1px solid #e2e8f0; 
                      border-radius: 12px; 
                      padding: 20px; 
                      margin: 16px 0;
                    }
                    @media (prefers-color-scheme: dark) {
                      .magazine-card { background: #0f172a; border-color: #334155; }
                    }
                    .magazine-title { 
                      margin: 0 0 8px 0; 
                      color: #1e40af; 
                      font-size: 18px; 
                      font-weight: 600;
                    }
                    @media (prefers-color-scheme: dark) {
                      .magazine-title { color: #60a5fa; }
                    }
                    .magazine-month { 
                      margin: 0 0 16px 0; 
                      color: #64748b; 
                      font-size: 14px; 
                      font-weight: 500;
                    }
                    @media (prefers-color-scheme: dark) {
                      .magazine-month { color: #94a3b8; }
                    }
                    .download-btn { 
                      display: inline-block; 
                      background: #3b82f6; 
                      color: #ffffff; 
                      text-decoration: none; 
                      padding: 12px 24px; 
                      border-radius: 8px; 
                      font-weight: 600; 
                      font-size: 14px; 
                      transition: all 0.2s ease;
                    }
                    .download-btn:hover { 
                      background: #2563eb; 
                      transform: translateY(-1px);
                    }
                    .note-box { 
                      background: #fef3c7; 
                      border: 1px solid #fbbf24; 
                      border-radius: 8px; 
                      padding: 16px; 
                      margin: 20px 0;
                    }
                    @media (prefers-color-scheme: dark) {
                      .note-box { background: #451a03; border-color: #d97706; }
                    }
                    .note-box p { 
                      margin: 0; 
                      color: #92400e; 
                      font-size: 14px;
                    }
                    @media (prefers-color-scheme: dark) {
                      .note-box p { color: #fbbf24; }
                    }
                    .footer { 
                      text-align: center; 
                      margin-top: 24px; 
                      padding-top: 20px; 
                      border-top: 1px solid #e2e8f0;
                    }
                    @media (prefers-color-scheme: dark) {
                      .footer { border-top-color: #334155; }
                    }
                    .footer p { 
                      margin: 0; 
                      color: #64748b; 
                      font-size: 14px;
                    }
                    @media (prefers-color-scheme: dark) {
                      .footer p { color: #94a3b8; }
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>📰 Monthly Current Affairs</h1>
                      <p>${purchase.purchaseType === 'complete-pack' ? 'Complete Pack' : 'Single Magazine'}</p>
                    </div>

                    <div class="content">
                      <p class="greeting">Dear <strong>${purchase.userName}</strong>,</p>
                      
                      <div class="success-badge">✅ Payment Confirmed</div>
                      
                      <p class="confirmation">Your magazine${purchase.purchaseType === 'complete-pack' ? 's' : ''} are ready for download!</p>

                      <div class="details-box">
                        <h3>📋 Purchase Details</h3>
                        <table class="details-table">
                          <tr>
                            <td>Type</td>
                            <td>${purchase.purchaseType === 'complete-pack' ? 'Complete Pack' : 'Single Magazine'}</td>
                          </tr>
                          <tr>
                            <td>Amount Paid</td>
                            <td>₹${purchase.amount}</td>
                          </tr>
                          <tr>
                            <td>Payment ID</td>
                            <td>${paymentId}</td>
                          </tr>
                          <tr>
                            <td>Purchase Date</td>
                            <td>${new Date().toLocaleDateString('en-IN', { 
                              timeZone: 'Asia/Kolkata', 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })}</td>
                          </tr>
                        </table>
                      </div>

                      <h3 style="color: #1e40af; margin: 30px 0 16px 0; font-size: 18px; font-weight: 600;">
                        📚 Your Magazine${purchase.purchaseType === 'complete-pack' ? 's' : ''}
                      </h3>
                      ${magazinesHtml}

                      <div class="note-box">
                        <p><strong>📌 Important:</strong> These are Google Drive links. Download the PDF files and save them for future reference. Lifetime access guaranteed.</p>
                      </div>

                      <div class="footer">
                        <p>Thank you for choosing Elite Academy!</p>
                        <p><strong>Happy Reading! 📖</strong></p>
                      </div>
                    </div>
                  </div>
                </body>
                </html>
              `
            })
          );
        }

        // Email to Admin
        if (admin && admin.email) {
          const magazinesList = magazineDetails.map(mag => 
            `<li><strong>${mag.title}</strong> (${mag.month.toUpperCase()})</li>`
          ).join('');

          emailPromises.push(
            sendEmail({
              to: admin.email,
              subject: `📰 New Monthly Current Affairs Purchase - ${purchase.purchaseType === 'complete-pack' ? 'Complete Pack' : 'Single Magazine'}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #3b82f6;">📰 New Monthly Current Affairs Purchase</h2>
                  
                  <p>You have a new purchase of <strong>${purchase.purchaseType === 'complete-pack' ? 'Complete Pack' : 'Single Magazine'}</strong>.</p>
                  
                  <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Customer Name:</strong> ${purchase.userName}</p>
                    <p><strong>Customer Email:</strong> ${purchase.userEmail}</p>
                    <p><strong>Purchase Type:</strong> ${purchase.purchaseType === 'complete-pack' ? 'Complete Pack' : 'Single Magazine'}</p>
                    <p><strong>Magazines (${magazineDetails.length}):</strong></p>
                    <ul>${magazinesList}</ul>
                    <p><strong>Amount:</strong> ₹${purchase.amount}</p>
                    <p><strong>Payment ID:</strong> ${paymentId}</p>
                    <p><strong>Purchase Date:</strong> ${new Date().toLocaleDateString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</p>
                  </div>
                  
                  <p style="color: #6b7280; margin-top: 30px;">
                    Best regards,<br>
                    <strong>Elite Meet System</strong>
                  </p>
                </div>
              `
            })
          );
        }

        await Promise.all(emailPromises);
        console.log("✅ Monthly Current Affairs emails sent successfully");

      } catch (emailError) {
        console.error("❌ Error sending Monthly Current Affairs emails:", emailError);
      }

      return res.json({ status: "ok" });
    }


      // Handle PDF Purchase
      if (isPDFPurchase) {
        console.log("📄 Processing PDF purchase payment");

        // Find or create purchase
        let purchase = await PDFPurchase.findOne({ razorpayOrderId: orderId });
        let isNewPurchase = false;

        if (purchase) {
          // Prevent duplicate processing
          if (purchase.status === "confirmed") {
            console.log("ℹ️ Purchase already confirmed:", purchase._id);
            return res.json({ status: "ok" });
          }

          // Update existing purchase
          purchase.status = "confirmed";
          purchase.razorpayPaymentId = paymentId;
          await purchase.save();
        } else {
          // Create new purchase from order notes (payment was successful)
          if (!orderDetails || !orderDetails.notes) {
            console.error("❌ Cannot create purchase: order details or notes missing");
            return res.status(400).json({ error: "Order details missing" });
          }

          const userFirebaseUid = orderDetails.notes.userFirebaseUid;
          const userName = orderDetails.notes.userName;
          const userEmail = orderDetails.notes.userEmail;

          if (!userFirebaseUid || !userEmail) {
            console.error("❌ Cannot create purchase: missing user info in order notes");
            return res.status(400).json({ error: "User information missing" });
          }
          
          // Get PDF price from environment variable
          const getPDFPrice = () => {
            const price = process.env.PDF_PRICE;
            if (price) {
              const parsedPrice = parseInt(price, 10);
              if (!isNaN(parsedPrice) && parsedPrice > 0) {
                return parsedPrice;
              }
            }
            return 99; // Default price
          };
          
          // Create purchase record (only after successful payment)
          purchase = new PDFPurchase({
            userFirebaseUid: userFirebaseUid,
            userName: userName,
            userEmail: userEmail,
            amount: getPDFPrice(), // PDF price from env
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
            status: "confirmed", // Directly confirmed since payment is successful
          });

          await purchase.save();
          isNewPurchase = true;
          console.log("✅ Created new PDF purchase after successful payment:", purchase._id);
        }

        console.log("📧 Sending PDF to user email...");

        // Get admin details (first admin user)
        const admin = await User.findOne({ role: "admin" });

        // ✅ SEND EMAILS WITH PDF ATTACHMENT
        const emailPromises = [];

        // Email to User with PDF attachment
        if (purchase.userEmail) {
          const pdfPath = path.join(__dirname, "..", "elite_academy_magazine.pdf");
          
          emailPromises.push(
            sendEmailWithPDF({
              to: purchase.userEmail,
              subject: "Elite Academy Magazine - Your PDF Download",
              html: `
                <h2>Thank you for your purchase! 🎉</h2>
                <p>Dear ${purchase.userName},</p>
                <p>Your purchase of the Elite Academy Magazine has been confirmed.</p>
                <p><strong>Product:</strong> Elite Academy Magazine</p>
                <p><strong>Description:</strong> PSSSB Exam Preparation Guide</p>
                <ul>
                  <li>Sports - 10 pages</li>
                  <li>Index - 10 pages</li>
                  <li>Days & Themes - 10 pages</li>
                  <li>Military Exercises - 10 pages</li>
                  <li>Appointments - 10 pages</li>
                  <li>Awards & Honours - 10 pages</li>
                </ul>
                <p><strong>Amount Paid:</strong> ₹${purchase.amount}</p>
                <p><strong>Payment ID:</strong> ${paymentId}</p>
                <p><strong>Purchase Date:</strong> ${new Date(purchase.purchaseDate).toLocaleDateString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
                <p>Please find the PDF attached to this email.</p>
                <p>Best regards,<br>Elite Meet Team</p>
              `,
              pdfPath: pdfPath,
              pdfName: "elite_academy_magazine.pdf",
            })
          );
        }

        // Email to Admin
        if (admin && admin.email) {
          emailPromises.push(
            sendEmail({
              to: admin.email,
              subject: "New PDF Purchase - Elite Academy Magazine",
              html: `
                <h2>New PDF Purchase! 📄</h2>
                <p>You have a new purchase of the Elite Academy Magazine.</p>
                <p><strong>Customer Name:</strong> ${purchase.userName}</p>
                <p><strong>Customer Email:</strong> ${purchase.userEmail}</p>
                <p><strong>Amount:</strong> ₹${purchase.amount}</p>
                <p><strong>Payment ID:</strong> ${paymentId}</p>
                <p><strong>Purchase Date:</strong> ${new Date(purchase.purchaseDate).toLocaleDateString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
                <p>Best regards,<br>Elite Meet Team</p>
              `,
            })
          );
        }

        // Send emails (non-blocking, catch errors)
        const results = await Promise.allSettled(emailPromises);
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            console.log(`✅ Email ${index + 1} sent successfully`);
          } else {
            console.error(`❌ Email ${index + 1} failed:`, result.reason);
          }
        });

        console.log("✅ PDF purchase webhook processed successfully:", purchase._id);
        return res.json({ status: "ok" });
      }


      // Handle Current Affairs Purchase
if (isCurrentAffairPurchase) {
  console.log("📰 Processing Current Affairs purchase payment");

  // Find purchase
  let purchase = await CurrentAffair.findOne({ razorpayOrderId: orderId });

  if (purchase) {
    // Prevent duplicate processing
    if (purchase.status === "confirmed") {
      console.log("ℹ️ Current Affairs purchase already confirmed:", purchase._id);
      return res.json({ status: "ok" });
    }

    // Update existing purchase
    purchase.status = "confirmed";
    purchase.razorpayPaymentId = paymentId;
    await purchase.save();
  } else {
    // Create new purchase from order notes
    if (!orderDetails || !orderDetails.notes) {
      console.error("❌ Cannot create current affairs purchase: order details missing");
      return res.status(400).json({ error: "Order details missing" });
    }

    const userFirebaseUid = orderDetails.notes.userFirebaseUid;
    const userName = orderDetails.notes.userName;
    const userEmail = orderDetails.notes.userEmail;

    if (!userFirebaseUid || !userEmail) {
      console.error("❌ Cannot create current affairs purchase: missing user info");
      return res.status(400).json({ error: "User information missing" });
    }

    // Get current affairs price from environment
    const getCurrentAffairPrice = () => {
      const price = process.env.CurrentAffair_PRICE;
      if (price) {
        const parsedPrice = parseInt(price, 10);
        if (!isNaN(parsedPrice) && parsedPrice > 0) {
          return parsedPrice;
        }
      }
      return 13; // Default price
    };

    purchase = new CurrentAffair({
      userFirebaseUid: userFirebaseUid,
      userName: userName,
      userEmail: userEmail,
      amount: getCurrentAffairPrice(),
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      status: "confirmed",
    });

    await purchase.save();
    console.log("✅ Created current affairs purchase after payment:", purchase._id);
  }

  console.log("📧 Sending Current Affairs PDF email...");

  // Get admin details
  const admin = await User.findOne({ role: "admin" });

  // ✅ SEND EMAILS
  const emailPromises = [];

  // Get Google Drive link from environment variable
  const currentAffairPdfLink =
    process.env.CURRENT_AFFAIR_PDF_GOOGLE_DRIVE_LINK ||
    "https://drive.google.com/file/d/YOUR_DEFAULT_LINK/view?usp=sharing";

  // Email to User with Google Drive download link (NO PDF attachment)
  if (purchase.userEmail) {
    emailPromises.push(
      sendEmail({
        to: purchase.userEmail,
        subject: "Elite Academy Magazine 2024",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
              .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              td { padding: 10px; border-bottom: 1px solid #ddd; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .highlight { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 15px 0; }
              .feature-list { list-style: none; padding: 0; }
              .feature-list li { padding: 8px 0; padding-left: 25px; position: relative; }
              .feature-list li:before { content: "✓"; position: absolute; left: 0; color: #28a745; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Elite Academy Magazine 2024</h1>
                <p style="margin: 0;">PSSSB & Punjab Exams</p>
              </div>
              
              <div class="content">
                <p>Dear <strong>${purchase.userName}</strong>,</p>
                
                <p>✅ <strong>Payment Confirmed!</strong> Download your PDF now.</p>
                
                <div class="highlight">
                  <h3 style="margin-top: 0;">📚 What's Inside (215 Pages)</h3>
                  <ul class="feature-list">
                    <li>Important Days & Themes – 16 Pages</li>
                    <li>Index – 31 Pages</li>
                    <li>Military & Defence – 16 Pages</li>
                    <li>Appointments – 30 Pages</li>
                    <li>Sports – 35 Pages</li>
                    <li>Awards & Honours – 60 Pages</li>
                    <li>Nuclear Power Plants – 27 Pages</li>
                  </ul>
                </div>
                
                <div style="text-align: center;">
                  <a href="${currentAffairPdfLink}" class="button">📥 Download PDF Now</a>
                </div>
                
                <p style="font-size: 12px; color: #666;">If button doesn't work, copy this link:<br>
                <a href="${currentAffairPdfLink}">${currentAffairPdfLink}</a></p>
                
                <div class="highlight" style="background: #d4edda; border-left-color: #28a745;">
                  <h3 style="margin-top: 0;">❤️ A Noble Cause</h3>
                  <p style="margin: 0;"><strong>100% of the money collected will be donated to Bhai Kanhaiya Ji Foundation.</strong></p>
                  <p style="margin: 10px 0 0 0;">By purchasing this book, you are not only helping your exam preparation but also supporting a beautiful humanitarian cause. 🙏</p>
                </div>
                
                <div class="details">
                  <h3>Payment Details</h3>
                  <table>
                    <tr>
                      <td><strong>Amount Paid</strong></td>
                      <td>₹${purchase.amount}</td>
                    </tr>
                    <tr>
                      <td><strong>Payment ID</strong></td>
                      <td>${paymentId}</td>
                    </tr>
                    <tr>
                      <td><strong>Date</strong></td>
                      <td>${new Date(purchase.purchaseDate).toLocaleDateString('en-IN', { 
                        timeZone: 'Asia/Kolkata', 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}</td>
                    </tr>
                  </table>
                </div>
                
                <p>Best regards,<br><strong>Elite Academy Team</strong></p>
                <p style="font-size: 12px; color: #666;">Join us in this beautiful cause. Learn • Prepare • Help Others 🌟</p>
              </div>
              
              <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
                <p>© ${new Date().getFullYear()} Elite Academy. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      })
    );
  }

  // Email to Admin
  if (admin && admin.email) {
    emailPromises.push(
      sendEmail({
        to: admin.email,
        subject: "📰 Elite Academy Magazine 2024 Purchase",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #28a745; color: white; padding: 20px; text-align: center; }
              .content { background: #f9f9f9; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin: 15px 0; background: white; }
              th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background: #667eea; color: white; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>📰 Elite Academy Magazine 2024 Purchase</h2>
              </div>
              
              <div class="content">
                <p>You have a new purchase of the <strong>Elite Academy Magazine 2024</strong>.</p>
                
                <table>
                  <tr>
                    <th>Detail</th>
                    <th>Value</th>
                  </tr>
                  <tr>
                    <td><strong>Customer Name</strong></td>
                    <td>${purchase.userName}</td>
                  </tr>
                  <tr>
                    <td><strong>Customer Email</strong></td>
                    <td>${purchase.userEmail}</td>
                  </tr>
                  <tr>
                    <td><strong>Amount</strong></td>
                    <td>₹${purchase.amount}</td>
                  </tr>
                  <tr>
                    <td><strong>Payment ID</strong></td>
                    <td>${paymentId}</td>
                  </tr>
                  <tr>
                    <td><strong>Purchase Date</strong></td>
                    <td>${new Date(purchase.purchaseDate).toLocaleDateString('en-IN', { 
                      timeZone: 'Asia/Kolkata', 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</td>
                  </tr>
                </table>
                
                <p style="background: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin: 15px 0;">
                  <strong>❤️ Noble Cause:</strong> This amount will be donated to Bhai Kanhaiya Ji Foundation.
                </p>
                
                <p>Best regards,<br><strong>Elite Meet System</strong></p>
              </div>
            </div>
          </body>
          </html>
        `,
      })
    );
  }

  // Send all emails
  try {
    await Promise.all(emailPromises);
    console.log("✅ Current Affairs purchase emails sent successfully");
  } catch (emailError) {
    console.error("❌ Error sending current affairs purchase emails:", emailError);
  }

  return res.json({ status: "ok" });
}


      if (isMentorshipEnrollment) {
        // Handle mentorship enrollment
        console.log("🎓 Processing mentorship enrollment payment");

        // Get program (needed for amount and email)
        const program = await MentorshipProgram.getProgram();
        
        // Find or create enrollment
        let enrollment = await MentorshipEnrollment.findOne({ razorpayOrderId: orderId });
        let isNewEnrollment = false;

        if (enrollment) {
          // Prevent duplicate processing
          if (enrollment.status === "confirmed") {
            console.log("ℹ️ Enrollment already confirmed:", enrollment._id);
            return res.json({ status: "ok" });
          }

          // Update existing enrollment
          enrollment.status = "confirmed";
          enrollment.razorpayPaymentId = paymentId;
          await enrollment.save();
        } else {
          // Create new enrollment from order notes (payment was successful)
          if (!orderDetails || !orderDetails.notes) {
            console.error("❌ Cannot create enrollment: order details or notes missing");
            return res.status(400).json({ error: "Order details missing" });
          }

          const userFirebaseUid = orderDetails.notes.userFirebaseUid;
          const userName = orderDetails.notes.userName;
          const userEmail = orderDetails.notes.userEmail;

          if (!userFirebaseUid || !userEmail) {
            console.error("❌ Cannot create enrollment: missing user info in order notes");
            return res.status(400).json({ error: "User information missing" });
          }
          
          // Create enrollment record (only after successful payment)
          enrollment = new MentorshipEnrollment({
            userFirebaseUid: userFirebaseUid,
            userName: userName,
            userEmail: userEmail,
            amount: program.price,
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
            status: "confirmed", // Directly confirmed since payment is successful
          });

          await enrollment.save();
          isNewEnrollment = true;
          console.log("✅ Created new enrollment after successful payment:", enrollment._id);
        }

        // Update program enrolled count only for new enrollments
        if (isNewEnrollment) {
          program.enrolledCount += 1;
          await program.save();
          console.log("📊 Updated program enrolled count:", program.enrolledCount);
        }

        console.log("📧 Sending mentorship enrollment confirmation emails...");

        // Get admin details (first admin user)
        const admin = await User.findOne({ role: "admin" });

        // ✅ SEND EMAILS
        const emailPromises = [];

        // Email to User
        if (enrollment.userEmail) {
          emailPromises.push(
            sendEmail({
              to: enrollment.userEmail,
              subject: "Mentorship Program Enrollment Confirmed - Elite Meet",
              html: `
                <h2>Welcome to the Full Mentor Guidance Program! 🎉</h2>
                <p>Dear ${enrollment.userName},</p>
                <p>Congratulations! Your enrollment in our premium mentorship program has been confirmed.</p>
                <p><strong>Program Details:</strong></p>
                <ul>
                  <li>full mentor guidance with Happy</li>
                  <li>Regular feedback and guidance</li>
                  <li>Personalized sessions</li>
                  <li>Full commitment</li>
                  <li>Dedicated support</li>
                </ul>
                <p><strong>Amount Paid:</strong> ₹${enrollment.amount}</p>
                <p><strong>Payment ID:</strong> ${paymentId}</p>
                <p><strong>Enrollment Date:</strong> ${new Date(enrollment.enrollmentDate).toLocaleDateString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
                <p>You will receive further instructions and access details via email shortly.</p>
                <p>We're excited to have you on this journey!</p>
                <p>Best regards,<br>Elite Meet Team</p>
              `,
            })
          );
        }

        // Email to Admin
        if (admin && admin.email) {
          emailPromises.push(
            sendEmail({
              to: admin.email,
              subject: "New Mentorship Program Enrollment - Elite Meet",
              html: `
                <h2>New Mentorship Enrollment! 🎓</h2>
                <p>You have a new enrollment in the mentorship program.</p>
                <p><strong>Student Name:</strong> ${enrollment.userName}</p>
                <p><strong>Student Email:</strong> ${enrollment.userEmail}</p>
                <p><strong>Amount:</strong> ₹${enrollment.amount}</p>
                <p><strong>Payment ID:</strong> ${paymentId}</p>
                <p><strong>Enrollment Date:</strong> ${new Date(enrollment.enrollmentDate).toLocaleDateString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
                <p><strong>Remaining Seats:</strong> ${program.totalSeats - program.enrolledCount}</p>
                <p>Please reach out to the student to begin their mentorship journey.</p>
                <p>Best regards,<br>Elite Meet Team</p>
              `,
            })
          );
        }

        // Send emails (non-blocking, catch errors)
        const results = await Promise.allSettled(emailPromises);
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            console.log(`✅ Email ${index + 1} sent successfully`);
          } else {
            console.error(`❌ Email ${index + 1} failed:`, result.reason);
          }
        });

        console.log("✅ Mentorship enrollment webhook processed successfully:", enrollment._id);
        return res.json({ status: "ok" });
      }

      // Handle regular booking
      const booking = await Booking.findOne({ razorpayOrderId: orderId })
        .populate('slotId');

      if (!booking) {
        console.warn("⚠️ Booking not found for order", orderId);
        console.warn("⚠️ Searching for booking with orderId:", orderId);
        return res.json({ status: "ok" });
      }

      console.log("✅ Found booking:", booking._id);
      console.log("✅ Booking status:", booking.status);
      console.log("✅ Booking amount:", booking.amount);
      console.log("✅ Slot ID:", booking.slotId?._id);
      console.log("✅ Slot status:", booking.slotId?.status);

      // Prevent duplicate processing
      if (booking.status === "confirmed") {
        console.log("ℹ️ Booking already confirmed:", booking._id);
        return res.json({ status: "ok" });
      }

      // Update booking
      booking.status = "confirmed";
      booking.razorpayPaymentId = paymentId;
      await booking.save();

      const slot = booking.slotId;

      // ATOMIC UPDATE: Mark slot as booked (regardless of current status)
      // This ensures the slot is marked as booked even if cleanup robot changed it to "free"
      const slotUpdateResult = await Slot.findOneAndUpdate(
        { _id: slot._id },
        {
          $set: {
            status: "booked",
            bookedBy: booking.userFirebaseUid,
          },
        },
        { new: true }
      );

      if (!slotUpdateResult) {
        console.warn("⚠️ Slot not found for booking:", booking._id);
      } else {
        console.log("✅ Slot marked as booked:", slot._id, "Previous status:", slot.status);
      }

      // Consume one use of the coupon applied to this booking, if any
      if (booking.couponCode) {
        await Coupon.findOneAndUpdate(
          { code: booking.couponCode, $expr: { $lt: ["$usedCount", "$maxUses"] } },
          { $inc: { usedCount: 1 } }
        ).catch((err) => console.error("Failed to increment coupon usage:", err));
      }

      // Fetch admin details
      const admin = await User.findOne({ firebaseUid: slot.adminFirebaseUid });

      console.log("📧 Sending confirmation emails...");

      // WhatsApp contact details for both sides of the booking email
      const adminWhatsAppNumber = normalizePhone(process.env.ADMIN_WHATSAPP_NUMBER || "7696954686");
      const adminWhatsAppLink = buildWhatsAppLink(adminWhatsAppNumber);
      const userWhatsAppNumber = normalizePhone(booking.userPhone);
      const userWhatsAppLink = buildWhatsAppLink(booking.userPhone);

      // ✅ SEND EMAILS
      const emailPromises = [];

      // Email to User
      if (booking.userEmail) {
        emailPromises.push(
          sendEmail({
            to: booking.userEmail,
            subject: "Booking Confirmed - Elite Meet",
            html: `
              <h2>Booking Confirmed! 🎉</h2>
              <p>Your consultation slot has been successfully booked.</p>
              <p><strong>Date:</strong> ${new Date(slot.startTime).toLocaleDateString('en-IN', {
                timeZone: 'Asia/Kolkata',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</p>
              <p><strong>Time:</strong> ${new Date(slot.startTime).toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}</p>
              <p><strong>Duration:</strong> ${slot.duration} minutes</p>
              <p><strong>Amount Paid:</strong> ₹${booking.amount}</p>
              <p><strong>Payment ID:</strong> ${paymentId}</p>
              <p>You will receive the meeting link 15 minutes before the scheduled time.</p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
              <p>📱 <strong>Need help, or the link doesn't reach you in time?</strong><br>
              WhatsApp or call us anytime — we're happy to help.</p>
              ${adminWhatsAppLink ? `<p><a href="${adminWhatsAppLink}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:bold;">💬 Chat on WhatsApp</a></p>` : ''}
              <p>WhatsApp / Call: <strong>${adminWhatsAppNumber}</strong></p>
              <p>Best regards,<br>Elite Meet Team</p>
            `,
          })
        );
      }

      // Email to Admin
      if (admin && admin.email) {
        emailPromises.push(
          sendEmail({
            to: admin.email,
            subject: "New Booking Received - Elite Meet",
            html: `
              <h2>New Booking Alert! 📅</h2>
              <p>You have a new booking for your consultation slot.</p>
              <p><strong>Client Name:</strong> ${booking.userName}</p>
              <p><strong>Client Email:</strong> ${booking.userEmail}</p>
              <p><strong>Client Phone:</strong> ${userWhatsAppNumber || 'Not provided'}</p>
              ${booking.purpose ? `<p><strong>Purpose/Topic:</strong> ${booking.purpose}</p>` : ''}
              <p><strong>Date:</strong> ${new Date(slot.startTime).toLocaleDateString('en-IN', {
                timeZone: 'Asia/Kolkata',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</p>
              <p><strong>Time:</strong> ${new Date(slot.startTime).toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}</p>
              <p><strong>Duration:</strong> ${slot.duration} minutes</p>
              <p><strong>Amount:</strong> ₹${booking.amount}</p>
              <p>Please prepare for the scheduled consultation.</p>
              ${userWhatsAppLink ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" /><p><a href="${userWhatsAppLink}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:bold;">💬 WhatsApp ${booking.userName}</a></p><p>WhatsApp / Call: <strong>${userWhatsAppNumber}</strong></p>` : ''}
              <p>Best regards,<br>Elite Meet Team</p>
            `,
          })
        );
      }

      // Send emails (non-blocking, catch errors)
      const results = await Promise.allSettled(emailPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          console.log(`✅ Email ${index + 1} sent successfully`);
        } else {
          console.error(`❌ Email ${index + 1} failed:`, result.reason);
        }
      });

      console.log("✅ Webhook processed successfully:", booking._id);
    } else if (event.event === "payment.failed") {
      const paymentEntity = event.payload.payment.entity;
      const orderId = paymentEntity.order_id;

      console.log("⚠️ Handling payment.failed for order:", orderId);

      // Check if it's a PDF purchase
      const purchase = await PDFPurchase.findOne({ razorpayOrderId: orderId });

      if (purchase) {
        // Handle PDF purchase failure
        if (purchase.status === "pending") {
          purchase.status = "cancelled";
          await purchase.save();
          console.log("✅ Cancelled PDF purchase after payment failure:", purchase._id);
        }
        return res.json({ status: "ok" });
      }

      // Check if it's a mentorship enrollment
      const enrollment = await MentorshipEnrollment.findOne({ razorpayOrderId: orderId });

      if (enrollment) {
        // Handle mentorship enrollment failure
        if (enrollment.status === "pending") {
          enrollment.status = "cancelled";
          await enrollment.save();
          console.log("✅ Cancelled mentorship enrollment after payment failure:", enrollment._id);
        }
        return res.json({ status: "ok" });
      }

      // Handle regular booking failure
      const booking = await Booking.findOne({ razorpayOrderId: orderId });

      if (!booking) {
        console.warn("⚠️ Booking not found for failed payment", orderId);
        return res.json({ status: "ok" });
      }

      // Only revert pending bookings
      if (booking.status === "pending") {
        booking.status = "cancelled";
        await booking.save();

        await Slot.findOneAndUpdate(
          { _id: booking.slotId, status: "pending" },
          { $set: { status: "free", bookedBy: null } }
        );

        console.log("✅ Released slot after payment failure:", booking.slotId.toString());
      }
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.status(500).send("Webhook error");
  }
};



// Handle Weekly Test Series Payment Success
async function handleWeeklyTestSeriesPayment(paymentEntity, paymentId) {
  try {
    const orderId = paymentEntity.order_id;
    const enrollment = await WeeklyTestSeries.findOne({ razorpayOrderId: orderId });

    if (!enrollment) {
      console.error(`No enrollment found for order ID: ${orderId}`);
      return;
    }

    if (enrollment.status === "confirmed") {
      console.log(`Payment already processed for order ${orderId}`);
      return;
    }

    // Update enrollment status
    enrollment.status = "confirmed";
    enrollment.razorpayPaymentId = paymentId;
    await enrollment.save();

    // Determine if online or offline based on notes
    const isOnline = paymentEntity.notes?.purchaseType === "weekly-testseries-online";
    const mode = isOnline ? "online" : "offline";

    // Send enrollment confirmation email
    await sendWeeklyTestSeriesEnrollmentEmail({
      email: enrollment.email,
      fullName: enrollment.fullName,
      mobile: enrollment.mobile,
      appPassword: enrollment.appPassword,
      amount: enrollment.amount,
      paymentId: paymentId,
      mode: mode,
      fatherName: enrollment.fatherName
    });

    console.log(`Weekly Test Series enrollment confirmed for ${enrollment.email} - ${mode} mode`);
  } catch (error) {
    console.error("Error handling weekly test series payment:", error);
    throw error;
  }
}

// Handle Sectional Test Series Payment Success
async function handleSectionalTestSeriesPayment(paymentEntity, paymentId) {
  try {
    const orderId = paymentEntity.order_id;
    const enrollment = await SectionalTestSeries.findOne({ razorpayOrderId: orderId });

    if (!enrollment) {
      console.error(`No sectional test series enrollment found for order ID: ${orderId}`);
      return;
    }

    if (enrollment.status === "confirmed") {
      console.log(`Sectional test series payment already processed for order ${orderId}`);
      return;
    }

    // Update enrollment status
    enrollment.status = "confirmed";
    enrollment.razorpayPaymentId = paymentId;
    await enrollment.save();

    // Determine if online or offline based on enrollment mode
    const mode = enrollment.mode;

    // Send enrollment confirmation email
    await sendSectionalTestSeriesEnrollmentEmail({
      email: enrollment.email,
      fullName: enrollment.fullName,
      mobile: enrollment.mobile,
      appPassword: enrollment.appPassword,
      amount: enrollment.amount,
      paymentId: paymentId,
      mode: mode,
      fatherName: enrollment.fatherName
    });

    console.log(`Sectional Test Series enrollment confirmed for ${enrollment.email} - ${mode} mode`);
  } catch (error) {
    console.error("Error handling sectional test series payment:", error);
    throw error;
  }
}

// Handle PSTET Payment Success
async function handlePstetPayment(paymentEntity, paymentId) {
  try {
    const orderId = paymentEntity.order_id;
    const enrollment = await PstetEnrollment.findOne({ razorpayOrderId: orderId });

    if (!enrollment) {
      console.error(`No PSTET enrollment found for order ID: ${orderId}`);
      return;
    }

    if (enrollment.status === "confirmed") {
      console.log(`PSTET payment already processed for order ${orderId}`);
      return;
    }

    // Update enrollment status
    enrollment.status = "confirmed";
    enrollment.razorpayPaymentId = paymentId;
    enrollment.expiresAt = null;
    await enrollment.save();

    // Send enrollment confirmation email
    await sendPstetEmail(enrollment, paymentId);

    console.log(`PSTET enrollment confirmed for ${enrollment.email}`);
  } catch (error) {
    console.error("Error handling PSTET payment:", error);
    throw error;
  }
}

// Handle Excise Inspector Payment Success
async function handleExciseInspectorPayment(paymentEntity, paymentId) {
  try {
    const orderId = paymentEntity.order_id;
    const enrollment = await ExciseInspectorEnrollment.findOne({ razorpayOrderId: orderId });

    if (!enrollment) {
      console.error(`No Excise Inspector enrollment found for order ID: ${orderId}`);
      return;
    }

    if (enrollment.status === "confirmed") {
      console.log(`Excise Inspector payment already processed for order ${orderId}`);
      return;
    }

    // Update enrollment status
    enrollment.status = "confirmed";
    enrollment.razorpayPaymentId = paymentId;
    enrollment.expiresAt = null;
    await enrollment.save();

    // Send enrollment confirmation email
    await sendExciseInspectorEmail(enrollment, paymentId);

    console.log(`Excise Inspector enrollment confirmed for ${enrollment.email}`);
  } catch (error) {
    console.error("Error handling Excise Inspector payment:", error);
    throw error;
  }
}

// Handle Job Application Payment Success
async function handleJobApplicationPayment(paymentEntity, paymentId) {
  try {
    const orderId = paymentEntity.order_id;
    const application = await JobApplication.findOne({ razorpayOrderId: orderId });

    if (!application) {
      console.error(`No job application found for order ID: ${orderId}`);
      return;
    }

    if (application.status === "confirmed") {
      console.log(`Job application payment already processed for order ${orderId}; sending confirmation email.`);
      await sendJobApplicationEmail(application, paymentId);
      return;
    }

    application.status = "confirmed";
    application.razorpayPaymentId = paymentId;
    application.expiresAt = null;
    await application.save();

    await sendJobApplicationEmail(application, paymentId);
    console.log(`Job application confirmed for ${application.email}`);
  } catch (error) {
    console.error("Error handling job application payment:", error);
    throw error;
  }
}

// Handle French Course Payment Success
async function handleFrenchCoursePayment(paymentEntity, paymentId) {
  try {
    const orderId = paymentEntity.order_id;
    const enrollment = await FrenchCourse.findOne({ razorpayOrderId: orderId });

    if (!enrollment) {
      console.error(`No French course enrollment found for order ID: ${orderId}`);
      return;
    }

    if (enrollment.status === "confirmed") {
      console.log(`French course payment already processed for order ${orderId}; sending confirmation email.`);
      await sendFrenchCourseEmail(enrollment, paymentId);
      return;
    }

    enrollment.status = "confirmed";
    enrollment.razorpayPaymentId = paymentId;
    enrollment.expiresAt = null;
    await enrollment.save();

    await sendFrenchCourseEmail(enrollment, paymentId);
    console.log(`French course enrollment confirmed for ${enrollment.email}`);
  } catch (error) {
    console.error("Error handling French course payment:", error);
    throw error;
  }
}

// Handle Digital Offline Demo Registration Payment Success
async function handleDigitalOfflineDemoPayment(paymentEntity, paymentId) {
  try {
    const orderId = paymentEntity.order_id;
    const registration = await DigitalOfflineDemoRegistration.findOne({ razorpayOrderId: orderId });

    if (!registration) {
      console.error(`No digital offline demo registration found for order ID: ${orderId}`);
      return;
    }

    if (registration.status === "confirmed") {
      console.log(`Digital offline demo payment already processed for order ${orderId}`);
      return;
    }

    registration.status = "confirmed";
    registration.razorpayPaymentId = paymentId;
    registration.expiresAt = null;
    await registration.save();

    await sendDigitalOfflineDemoEmail(registration, paymentId);

    console.log(`Digital offline demo registration confirmed for ${registration.email}`);
  } catch (error) {
    console.error("Error handling digital offline demo payment:", error);
    throw error;
  }
}

// Handle PYQs Book Payment Success
async function handlePyqsPayment(paymentEntity, paymentId) {
  try {
    const orderId = paymentEntity.order_id;
    const purchase = await PyqsPurchase.findOne({ razorpayOrderId: orderId });

    if (!purchase) {
      console.warn('PYQS purchase not found for order:', orderId);
      return;
    }

    if (purchase.status === 'confirmed') {
      console.log('PYQS purchase already confirmed:', purchase._id);
      return;
    }

    purchase.status = 'confirmed';
    purchase.razorpayPaymentId = paymentId;
    purchase.expiresAt = null;
    await purchase.save();

    // Send confirmation email with login details
    try {
      await sendPyqsEmail(purchase, paymentId);
      console.log('📧 PYQS confirmation emails sent');
    } catch (emailErr) {
      console.error('❌ Error sending PYQS emails:', emailErr);
    }

    console.log(`✅ PYQS purchase confirmed for ${purchase.email}`);
  } catch (error) {
    console.error('Error handling PYQS payment:', error);
    throw error;
  }
}

async function handlePlannerPayment(paymentEntity, paymentId) {
  try {
    const orderId = paymentEntity.order_id;
    const purchase = await PlannerPurchase.findOne({ razorpayOrderId: orderId });

    if (!purchase) {
      console.warn("Planner purchase record not found for order:", orderId);
      return;
    }

    if (purchase.status === "confirmed") {
      console.log("Planner purchase already processed & confirmed:", purchase._id);
      return;
    }

    // Mark as paid
    purchase.status = "confirmed";
    purchase.razorpayPaymentId = paymentId;
    purchase.expiresAt = null; // Remove the expiration timer
    await purchase.save();

    // Differentiate workflows depending on purchase type
    if (purchase.purchaseType === "softcopy") {
      await sendPlannerSoftcopyEmail(purchase, paymentId);
      console.log(`📧 Digital Planner Email dispatched to ${purchase.email}`);
    } else if (purchase.purchaseType === "hardcopy") {
      await sendPlannerHardcopyEmail(purchase, paymentId);
      console.log(`📦 Hardcopy Tracking/Order Confirmation Email dispatched to ${purchase.email}`);
    }
  } catch (error) {
    console.error("Critical failure during handling planner webhook payment:", error);
    throw error;
  }
}

module.exports = {
  handleRazorpayWebhook,
};
