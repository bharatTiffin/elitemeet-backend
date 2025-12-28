// src/controllers/webhookController.js
const crypto = require("crypto");
const path = require("path");
const Booking = require("../models/Booking");
const Slot = require("../models/Slot");
const User = require("../models/User");
const MentorshipEnrollment = require("../models/MentorshipEnrollment");
const MentorshipProgram = require("../models/MentorshipProgram");
const PDFPurchase = require("../models/PDFPurchase");
const { sendEmail, sendEmailWithPDF } = require("../utils/email");
const TypingPurchase = require("../models/TypingPurchase");
const PolityPurchase = require("../models/PolityPurchase");

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

        
    const isTypingPurchase =
    orderDetails?.notes?.type === "typing_purchase" ||
    (await TypingPurchase.findOne({ razorpayOrderId: orderId }));



    const isPolityPurchase =
  orderDetails?.notes?.type === "polity_purchase" ||
  (await PolityPurchase.findOne({ razorpayOrderId: orderId }));

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

  // Path to the Polity PDF (make sure you upload it to your server)
  const polityPdfPath = path.join(__dirname, "../../elite_academy_polity.pdf");

  // Email to User with Polity PDF attached
  if (purchase.userEmail) {
    emailPromises.push(
      sendEmailWithPDF({
        to: purchase.userEmail,
        subject: "Elite Academy - Complete Polity Package 📘",
        html: `
          <h2>📘 Complete Polity Package</h2>
          <p>Dear ${purchase.userName},</p>
          <p>Your purchase of the <strong>Complete Polity Package</strong> has been confirmed.</p>
          
          <h3>Purchase Details:</h3>
          <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;"><strong>Product</strong></td>
              <td style="border: 1px solid #ddd; padding: 8px;">Complete Polity Package</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;"><strong>Description</strong></td>
              <td style="border: 1px solid #ddd; padding: 8px;">PSSSB & Punjab Exams - 110 Pages</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;"><strong>Amount Paid</strong></td>
              <td style="border: 1px solid #ddd; padding: 8px;">₹${purchase.amount}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;"><strong>Payment ID</strong></td>
              <td style="border: 1px solid #ddd; padding: 8px;">${paymentId}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;"><strong>Purchase Date</strong></td>
              <td style="border: 1px solid #ddd; padding: 8px;">${new Date(purchase.purchaseDate).toLocaleDateString('en-IN', {
                timeZone: 'Asia/Kolkata',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</td>
            </tr>
          </table>
          
          <p><strong>📎 Please find the Polity Book PDF attached to this email.</strong></p>
          
          <h3>What's Included:</h3>
          <ul>
            <li>🔥 90 Pages Full Polity Notes</li>
            <li>🔥 20 Pages PYQs (2012–2025 | Dec Updated)</li>
            <li>🔥 100% PSSSB + Punjab Exam Oriented</li>
          </ul>
          
          <p>Best regards,<br><strong>Elite Academy Team</strong></p>
        `,
        attachmentPath: polityPdfPath,
        attachmentName: "Elite_Academy_Complete_Polity_Package.pdf",
      })
    );
  }

  // Email to Admin
  if (admin && admin.email) {
    emailPromises.push(
      sendEmail({
        to: admin.email,
        subject: "New Polity Book Purchase - Elite Academy",
        html: `
          <h2>📘 New Polity Book Purchase</h2>
          <p>You have a new purchase of the Complete Polity Package.</p>
          
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
          
          <p>Best regards,<br><strong>Elite Meet System</strong></p>
        `,
      })
    );
  }

  await Promise.all(emailPromises);

  console.log("✅ Polity purchase processed successfully");
  return res.json({ status: "ok" });
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

      // Fetch admin details
      const admin = await User.findOne({ firebaseUid: slot.adminFirebaseUid });

      console.log("📧 Sending confirmation emails...");

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

module.exports = {
  handleRazorpayWebhook,
};
