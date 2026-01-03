const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getBookInfo,
  getPackageInfo,
  createBookPurchase,
  createPackagePurchase,
  getMyPurchases,
  checkBookAccess,
  getAllBooks
} = require('../controllers/bookController');

// ✅ Public routes - Get info
router.get('/book/:bookType/info', getBookInfo);
router.get('/package/:packageType/info', getPackageInfo);
router.get('/books/all', getAllBooks);
// ✅ Protected routes - Purchases
router.post('/book/:bookType/purchase', auth, createBookPurchase);
router.post('/package/:packageType/purchase', auth, createPackagePurchase);
router.get('/my-purchases', auth, getMyPurchases);
router.get('/book/:bookType/check-access', auth, checkBookAccess);

module.exports = router;
