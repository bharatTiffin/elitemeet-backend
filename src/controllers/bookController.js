const Razorpay = require('razorpay');
const BookPurchase = require('../models/BookPurchase');
const { BookType, PackageType } = require('../models/BookPurchase');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Book metadata with prices
const BOOK_INFO = {
  [BookType.POLITY]: {
    name: 'Complete Polity Package',
    description: 'Complete PSSSB & Punjab Exams Polity Package for scoring full marks',
    price: process.env.POLITY_BOOK_PRICE || 199,
    originalPrice: process.env.POLITY_BOOK_PRICE ? parseInt(process.env.POLITY_BOOK_PRICE) + 100 : 299,
    pages: 90,
    pyqPages: 20,
    features: [
      '90 Pages Full Polity Notes',
      '20 Pages PYQs (2012–2025)',
      'December 2025 Updated',
      '100% PSSSB + Punjab Exam Oriented'
    ],
    highlights: [
      'Complete coverage of Indian Constitution',
      'Union & State Government structure',
      'Panchayati Raj & Local Bodies',
      'Judiciary & Constitutional Bodies',
      'Important Articles & Amendments',
      'Latest PYQs with solutions'
    ],
  },
  [BookType.ECONOMICS]: {
    name: 'Complete Economics Package',
    description: 'Master Economics for PSSSB exams — From basics to advanced concepts',
    price: process.env.ECONOMICS_BOOK_PRICE || 199,
    originalPrice: process.env.ECONOMICS_BOOK_PRICE ? parseInt(process.env.ECONOMICS_BOOK_PRICE) + 100 : 299,
    pages: 85,
    pyqPages: 18,
    features: [
      '85 Pages Full Economics Notes',
      '18 Pages PYQs (2012–2025)',
      'December 2025 Updated',
      '100% PSSSB + Punjab Exam Oriented'
    ],
    highlights: [
      'Indian Economy basics & structure',
      'Budget & Fiscal Policy',
      'Banking & Monetary Policy (RBI)',
      'Economic Survey highlights',
      'Punjab Economy specifics',
      'Latest economic developments'
    ],
  },
  [BookType.GEOGRAPHY]: {
    name: 'Complete Geography Package',
    description: 'Complete Geography preparation — India, Punjab & World Geography',
    price: process.env.GEOGRAPHY_BOOK_PRICE || 199,
    originalPrice: process.env.GEOGRAPHY_BOOK_PRICE ? parseInt(process.env.GEOGRAPHY_BOOK_PRICE) + 100 : 299,
    pages: 80,
    pyqPages: 16,
    features: [
      '80 Pages Full Geography Notes',
      '16 Pages PYQs (2012–2025)',
      'December 2025 Updated',
      'Maps & Diagrams included'
    ],
    highlights: [
      'Physical Geography essentials',
      'Indian Geography complete coverage',
      'Punjab Geography in depth',
      'World Geography key facts',
      'Rivers, Mountains, Climate zones',
      'Economic & Agricultural Geography'
    ],
  },
  [BookType.ENVIRONMENT]: {
    name: 'Complete Environment Package',
    description: 'Complete Environment & Ecology preparation with latest updates',
    price: process.env.ENVIRONMENT_BOOK_PRICE || 199,
    originalPrice: process.env.ENVIRONMENT_BOOK_PRICE ? parseInt(process.env.ENVIRONMENT_BOOK_PRICE) + 100 : 299,
    pages: 75,
    pyqPages: 15,
    features: [
      '75 Pages Full Environment Notes',
      '15 Pages PYQs (2012–2025)',
      'December 2025 Updated',
      'Climate Change & Biodiversity covered'
    ],
    highlights: [
      'Environmental Ecology basics',
      'Climate Change & Global Warming',
      'Biodiversity & Conservation',
      'Pollution types & control measures',
      'Environmental Acts & Policies',
      'Sustainable Development Goals (SDGs)',
      'Punjab Environmental issues',
      'Latest environmental updates'
    ],
  },
  [BookType.SCIENCE]: {
    name: 'Complete Science Package',
    description: 'Master General Science — Physics, Chemistry, Biology all covered',
    price: process.env.SCIENCE_BOOK_PRICE || 199,
    originalPrice: process.env.SCIENCE_BOOK_PRICE ? parseInt(process.env.SCIENCE_BOOK_PRICE) + 100 : 299,
    pages: 95,
    pyqPages: 22,
    features: [
      '95 Pages Full Science Notes',
      '22 Pages PYQs (2012–2025)',
      'December 2025 Updated',
      'Physics, Chemistry, Biology covered'
    ],
    highlights: [
      'Physics: Laws, Motion, Energy, Electricity',
      'Chemistry: Elements, Compounds, Reactions',
      'Biology: Human Body, Diseases, Genetics',
      'Scientific Inventions & Discoveries',
      'Latest Science & Technology updates',
      'Space & Defense technology',
      'Indian Scientists & their contributions',
      'Exam-focused numerical problems'
    ],
  },
  [BookType.MODERN_HISTORY]: {
    name: 'Complete Modern History Package',
    description: 'Complete Modern History (1757-1947) — Freedom struggle and British rule',
    price: process.env.MODERN_HISTORY_BOOK_PRICE || 199,
    originalPrice: process.env.MODERN_HISTORY_BOOK_PRICE ? parseInt(process.env.MODERN_HISTORY_BOOK_PRICE) + 100 : 299,
    pages: 88,
    pyqPages: 19,
    features: [
      '88 Pages Full Modern History Notes',
      '19 Pages PYQs (2012–2025)',
      'December 2025 Updated',
      '1757-1947 complete coverage'
    ],
    highlights: [
      'British East India Company & expansion',
      'Indian Freedom Struggle movements',
      'Important leaders & their contributions',
      'Revolt of 1857 in detail',
      'Indian National Congress formation',
      'Gandhi Era & Non-cooperation movements',
      'Partition of India & Independence',
      'Punjab role in freedom struggle'
    ],
  },
  [BookType.ANCIENT_HISTORY]: {
    name: 'Complete Ancient History Package',
    description: 'Complete Ancient History — From Indus Valley to 8th Century',
    price: process.env.ANCIENT_HISTORY_BOOK_PRICE || 199,
    originalPrice: process.env.ANCIENT_HISTORY_BOOK_PRICE ? parseInt(process.env.ANCIENT_HISTORY_BOOK_PRICE) + 100 : 299,
    pages: 82,
    pyqPages: 17,
    features: [
      '82 Pages Full Ancient History Notes',
      '17 Pages PYQs (2012–2025)',
      'December 2025 Updated',
      'Prehistoric to 8th Century CE'
    ],
    highlights: [
      'Indus Valley Civilization complete',
      'Vedic Age & Literature',
      'Mauryan & Gupta Empires',
      'Buddhist & Jain traditions',
      'Indian Art, Architecture & Sculptures',
      'Ancient Punjab history & culture',
      'Important dynasties & rulers',
      'Ancient Indian economy & trade'
    ],
  },
  [BookType.MEDIEVAL_HISTORY]: {
    name: 'Complete Medieval History Package',
    description: 'Complete Medieval History (8th-18th Century) — Delhi Sultanate, Mughal Empire',
    price: process.env.MEDIEVAL_HISTORY_BOOK_PRICE || 199,
    originalPrice: process.env.MEDIEVAL_HISTORY_BOOK_PRICE ? parseInt(process.env.MEDIEVAL_HISTORY_BOOK_PRICE) + 100 : 299,
    pages: 78,
    pyqPages: 16,
    features: [
      '78 Pages Full Medieval History Notes',
      '16 Pages PYQs (2012–2025)',
      'December 2025 Updated',
      '8th Century to 1757 CE'
    ],
    highlights: [
      'Delhi Sultanate period complete',
      'Mughal Empire & major rulers',
      'Sikh Gurus & Sikh Empire',
      'Bhakti & Sufi movements',
      'Medieval Indian architecture',
      'Regional kingdoms & their culture',
      'Punjab under Mughals & Sikhs',
      'Transition to British rule'
    ],
  }
};

// Package metadata
const PACKAGE_INFO = {
  [PackageType.COMPLETE_PACK]: {
    name: 'Complete Pack (All 8 Books)',
    description: 'Get all 8 subjects at massive discount — Complete exam preparation',
    price: process.env.COMPLETE_PACK_PRICE || 999,
    originalPrice: process.env.COMPLETE_PACK_PRICE ? parseInt(process.env.COMPLETE_PACK_PRICE) + 200 : 1199,
    discount: 200,
    books: Object.values(BookType),
    features: [
      'All 8 Subject Books (630+ pages)',
      'Complete PYQs Collection (140+ pages)',
      'Save ₹593 (37% discount)',
      'Lifetime access to all PDFs',
      'Email delivery within 5 minutes'
    ]
  },
  [PackageType.WITHOUT_POLITY]: {
    name: 'All Books Except Polity',
    description: 'Already have Polity? Get the remaining 7 books at discounted price',
    price: process.env.WITHOUT_POLITY_PRICE || 899,
    originalPrice: process.env.WITHOUT_POLITY_PRICE ? parseInt(process.env.WITHOUT_POLITY_PRICE) + 200 : 1099,
    discount: 200,
    books: Object.values(BookType).filter(b => b !== BookType.POLITY),
    features: [
      '7 Subject Books (540+ pages)',
      'Complete PYQs Collection (120+ pages)',
      'Save ₹494 (35% discount)',
      'Perfect for existing Polity buyers',
      'Email delivery within 5 minutes'
    ]
  }
};

// ✅ Get info for a single book
exports.getBookInfo = async (req, res) => {
  try {
    console.log('Received request for book info:', req.params);
    const { bookType } = req.params;
    console.log('Fetching book info for type:', bookType);
    const bookInfo = BOOK_INFO[bookType];
    console.log('Book info found:', bookInfo);
    if (!bookInfo) {
      return res.status(404).json({ error: 'Book not found' });
    }

    console.log('Sending book info response');
    res.json({ 
      book: {
        type: bookType,
        ...bookInfo
      }
    });
  } catch (error) {
    console.error('❌ Error fetching book info:', error);
    res.status(500).json({ error: 'Failed to fetch book info' });
  }
};

// ✅ Get info for a package (bundle)
exports.getPackageInfo = async (req, res) => {
  try {
    const { packageType } = req.params;
    
    const packageInfo = PACKAGE_INFO[packageType];
    
    if (!packageInfo) {
      return res.status(404).json({ error: 'Package not found' });
    }

    res.json({ 
      package: {
        type: packageType,
        ...packageInfo
      }
    });
  } catch (error) {
    console.error('❌ Error fetching package info:', error);
    res.status(500).json({ error: 'Failed to fetch package info' });
  }
};

// ✅ Create purchase for single book
exports.createBookPurchase = async (req, res) => {
  try {
    const { bookType } = req.params;
    const userId = req.user.id;
    const userEmail = req.user.email;
    const userName = req.user.name || req.user.displayName;

    console.log(`Creating book purchase: ${bookType} for user ${userEmail}`);
    console.log('User ID:', userId);
    console.log('User Name:', userName);
    console.log('Book Type:', bookType);
    console.log('User Email:', userEmail);
    console.log('Fetching book info from BOOK_INFO');

    const bookInfo = BOOK_INFO[bookType];
    if (!bookInfo) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Check if user already purchased this book
    const existingPurchase = await BookPurchase.findOne({
      userId,
      $or: [
        { bookType, packageType: PackageType.SINGLE },
        { packageType: PackageType.COMPLETE_PACK },
        { 
          packageType: PackageType.WITHOUT_POLITY,
          booksIncluded: bookType
        }
      ],
      status: 'completed'
    });

    if (existingPurchase) {
      return res.status(400).json({ 
        error: 'You have already purchased this book',
        alreadyPurchased: true
      });
    }

    // Create Razorpay order
    const amount = bookInfo.price * 100;
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `book_${bookType}_${Date.now()}`,
      notes: {
        purchaseType: 'book',
        packageType: PackageType.SINGLE,
        bookType,
        userId: userId.toString(),
        userEmail,
        userName: userName || ''
      }
    });

    // Create purchase record
    const purchase = new BookPurchase({
      userId,
      userEmail,
      userName,
      packageType: PackageType.SINGLE,
      bookType,
      booksIncluded: [bookType],
      orderId: order.id,
      amount: bookInfo.price,
      status: 'pending'
    });

    await purchase.save();

    console.log(`✅ Book order created: ${bookType} for ${userEmail}`);

    res.json({
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency
      },
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      bookName: bookInfo.name
    });

  } catch (error) {
    console.error('❌ Error creating book purchase:', error);
    res.status(500).json({ error: 'Failed to create purchase order' });
  }
};

// ✅ Create purchase for package (bundle)
exports.createPackagePurchase = async (req, res) => {
  try {
    const { packageType } = req.params;
    const userId = req.user.id;
    const userEmail = req.user.email;
    const userName = req.user.name || req.user.displayName;

    const packageInfo = PACKAGE_INFO[packageType];
    if (!packageInfo) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Check if user already purchased this package
    const existingPackage = await BookPurchase.findOne({
      userId,
      packageType,
      status: 'completed'
    });

    if (existingPackage) {
      return res.status(400).json({ 
        error: 'You have already purchased this package',
        alreadyPurchased: true
      });
    }

    // Check if complete pack and user has any book
    // if (packageType === PackageType.COMPLETE_PACK) {
    //   const anyPurchase = await BookPurchase.findOne({
    //     userId,
    //     status: 'completed'
    //   });

    //   if (anyPurchase) {
    //     return res.status(400).json({
    //       error: 'You have already purchased some books. Complete pack cannot be purchased.',
    //       suggestion: 'Consider buying remaining books individually.'
    //     });
    //   }
    // }

    // Check if without_polity pack and user has polity or complete pack
    // if (packageType === PackageType.WITHOUT_POLITY) {
    //   const hasPolityOrComplete = await BookPurchase.findOne({
    //     userId,
    //     $or: [
    //       { bookType: BookType.POLITY, status: 'completed' },
    //       { packageType: PackageType.COMPLETE_PACK, status: 'completed' }
    //     ]
    //   });

    //   if (!hasPolityOrComplete) {
    //     return res.status(400).json({
    //       error: 'This package is for users who already have Polity book',
    //       suggestion: 'Consider buying Complete Pack (All 8 Books) instead.'
    //     });
    //   }

    //   // Check if already has other books
    //   const otherBooks = await BookPurchase.find({
    //     userId,
    //     bookType: { $in: packageInfo.books },
    //     status: 'completed'
    //   });

    //   if (otherBooks.length > 0) {
    //     return res.status(400).json({
    //       error: `You already own: ${otherBooks.map(b => b.bookType).join(', ')}`,
    //       suggestion: 'Buy remaining books individually.'
    //     });
    //   }
    // }

    // Create Razorpay order
    const amount = packageInfo.price * 100;
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `package_${packageType}_${Date.now()}`,
      notes: {
        purchaseType: 'package',
        packageType,
        userId: userId.toString(),
        userEmail,
        userName: userName || '',
        booksCount: packageInfo.books.length
      }
    });

    // Create purchase record
    const purchase = new BookPurchase({
      userId,
      userEmail,
      userName,
      packageType,
      bookType: null,
      booksIncluded: packageInfo.books,
      orderId: order.id,
      amount: packageInfo.price,
      status: 'pending'
    });

    await purchase.save();

    console.log(`✅ Package order created: ${packageType} for ${userEmail}`);

    res.json({
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency
      },
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      packageName: packageInfo.name,
      booksIncluded: packageInfo.books
    });

  } catch (error) {
    console.error('❌ Error creating package purchase:', error);
    res.status(500).json({ error: 'Failed to create package purchase order' });
  }
};

// ✅ Get user's purchases
exports.getMyPurchases = async (req, res) => {
  try {
    const userId = req.user.id;

    const purchases = await BookPurchase.find({ 
      userId, 
      status: 'completed' 
    }).sort({ createdAt: -1 });

    res.json({ purchases });
  } catch (error) {
    console.error('❌ Error fetching purchases:', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
};

// ✅ Check if user has access to a specific book
exports.checkBookAccess = async (req, res) => {
  try {
    const { bookType } = req.params;
    const userId = req.user.id;

    const purchase = await BookPurchase.findOne({
      userId,
      $or: [
        { bookType, packageType: PackageType.SINGLE },
        { packageType: PackageType.COMPLETE_PACK },
        { 
          packageType: PackageType.WITHOUT_POLITY,
          booksIncluded: bookType
        }
      ],
      status: 'completed'
    });

    res.json({ hasAccess: !!purchase });
  } catch (error) {
    console.error('❌ Error checking book access:', error);
    res.status(500).json({ error: 'Failed to check access' });
  }
};


exports.getAllBooks = async (req, res) => {
  try {
    const booksArray = Object.entries(BOOK_INFO).map(([bookType, info]) => ({
      id: bookType,
      type: bookType,
      ...info
    }));
    
    res.json({ books: booksArray });
  } catch (error) {
    console.error('❌ Error fetching all books:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
};

module.exports.BOOK_INFO = BOOK_INFO;
module.exports.PACKAGE_INFO = PACKAGE_INFO;