const Razorpay = require("razorpay");
const User = require("../models/User");
const DigitalOfflineDemoRegistration = require("../models/DigitalOfflineDemoRegistration");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const DIGITAL_OFFLINE_DEMO_PRICE = Number(process.env.DIGITAL_OFFLINE_DEMO_PRICE || 500);

const DEMO_BRANCHES = {
  "fatehgarh-sahib": {
    label: "Fatehgarh Sahib Digital Offline Demo",
    shortLabel: "Fatehgarh Sahib",
    address: "Ist Floor, Showroom No 18, Above Pb 23 Out Fit, City Center Sirhind, Lincoln Road",
    mapsLink: "https://maps.app.goo.gl/x21iBBNnNLLeF72z8?g_st=iwb",
  },
  chandigarh: {
    label: "Chandigarh Offline Coaching",
    shortLabel: "Chandigarh",
    address: "SCO 144, Sector 24D, Chandigarh",
    mapsLink: "https://maps.app.goo.gl/nkiAPjq2FfHmsWcF6",
  },
};

exports.getInfo = (req, res) => {
  res.json({
    package: {
      name: "Digital Offline Demo Classes - Fatehgarh Sahib & Chandigarh",
      price: DIGITAL_OFFLINE_DEMO_PRICE,
      originalPrice: 1000,
      description:
        "Registration open for 1, 2, 3 June demo classes. Choose Fatehgarh Sahib digital offline or Chandigarh offline coaching and attend in person.",
      highlights: [
        "Registration open for 1, 2, 3 June",
        "100% refundable on same-day request if you attend the demo",
        "Refund request must be made on the same day",
        "Demo fee will be adjusted in the final course fee if you join",
      ],
      branches: Object.entries(DEMO_BRANCHES).map(([key, value]) => ({
        key,
        ...value,
      })),
      supportPhones: ["7696954686", "9056653906"],
    },
  });
};

exports.createOrder = async (req, res) => {
  try {
    const { fullName, email, mobile, address, branch } = req.body;

    if (!fullName || !email || !mobile || !address || !branch) {
      return res.status(400).json({
        message: "fullName, email, mobile, address, and branch are required.",
      });
    }

    if (!DEMO_BRANCHES[branch]) {
      return res.status(400).json({
        message: "Invalid branch selection.",
      });
    }

    const amount = DIGITAL_OFFLINE_DEMO_PRICE;

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `digital_demo_${Date.now()}`,
      notes: {
        purchaseType: "digital_offline_registration",
        userEmail: email,
        branch,
        studentName: fullName,
      },
    });

    let userFirebaseUid = null;
    if (req.user && req.user.id) {
      userFirebaseUid = req.user.id;
    } else if (email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        userFirebaseUid = existingUser._id.toString();
      }
    }

    const registration = new DigitalOfflineDemoRegistration({
      userFirebaseUid,
      fullName,
      email,
      mobile,
      address,
      branch,
      amount,
      razorpayOrderId: order.id,
      status: "pending",
    });

    await registration.save();

    return res.status(201).json({
      order,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Digital offline demo create-order error:", error);
    return res.status(500).json({
      message: "Could not create digital offline demo registration.",
      error: error.message,
    });
  }
};