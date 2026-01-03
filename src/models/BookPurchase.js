const mongoose = require('mongoose');

const BookType = {
  POLITY: 'polity',
  ECONOMICS: 'economics',
  GEOGRAPHY: 'geography',
  ENVIRONMENT: 'environment',
  SCIENCE: 'science',
  MODERN_HISTORY: 'modern-history',
  ANCIENT_HISTORY: 'ancient-history',
  MEDIEVAL_HISTORY: 'medieval-history'
};

const PackageType = {
  SINGLE: 'single',                    // Individual book
  COMPLETE_PACK: 'complete-pack',      // All 8 books
  WITHOUT_POLITY: 'without-polity'     // 7 books (no polity)
};

const bookPurchaseSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userName: {
    type: String
  },
  
  // Package type
  packageType: {
    type: String,
    enum: Object.values(PackageType),
    required: true
  },
  
  // For single book purchases
  bookType: {
    type: String,
    enum: [...Object.values(BookType), null],
    default: null
  },
  
  // For bundle purchases - array of book types
  booksIncluded: [{
    type: String,
    enum: Object.values(BookType)
  }],
  
  // Payment details
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  paymentId: {
    type: String
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  emailSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for faster queries
bookPurchaseSchema.index({ userId: 1, bookType: 1 });
bookPurchaseSchema.index({ userId: 1, packageType: 1 });
bookPurchaseSchema.index({ orderId: 1 });
bookPurchaseSchema.index({ status: 1 });

module.exports = mongoose.model('BookPurchase', bookPurchaseSchema);
module.exports.BookType = BookType;
module.exports.PackageType = PackageType;
