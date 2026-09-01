# Environment Variables for Elite Academy Backend

## Required Environment Variables

### Database
- `MONGODB_URI` - MongoDB connection string

### Firebase
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_CLIENT_EMAIL` - Firebase service account email
- `FIREBASE_PRIVATE_KEY` - Firebase private key
- `FIREBASE_DATABASE_URL` - Firebase database URL

### Razorpay Payment Gateway
- `RAZORPAY_KEY_ID` - Razorpay API key ID
- `RAZORPAY_KEY_SECRET` - Razorpay API secret
- `RAZORPAY_WEBHOOK_SECRET` - Razorpay webhook secret for payment verification

### Email Configuration
- `EMAIL_HOST` - SMTP server host
- `EMAIL_PORT` - SMTP server port
- `EMAIL_USER` - SMTP username
- `EMAIL_PASS` - SMTP password

### One-on-One Booking Contact
- `ADMIN_WHATSAPP_NUMBER` - 10-digit number shown to users as the admin's WhatsApp/call contact in booking confirmation emails (default: 9988414686)

### Course Prices
- `COACHING_PRICE` - Price for regular coaching course (default: 5999)
- `PSTET_PRICE` - Price for PSTET & CTET 1 Month Crash Course (default: 2999)
- `CRASH_COURSE_PRICE` - Price for crash course
- `WEEKLY_TEST_SERIES_PRICE` - Price for weekly test series
- `TYPING_PRICE` - Price for typing course (default: 499)
- `POLITY_PRICE` - Price for polity book (default: 199)

### PDF Links (Google Drive)
- `POLITY_PDF_LINK` - Google Drive link for Polity PDF
- `ECONOMICS_PDF_LINK` - Google Drive link for Economics PDF
- `GEOGRAPHY_PDF_LINK` - Google Drive link for Geography PDF
- `ENVIRONMENT_PDF_LINK` - Google Drive link for Environment PDF
- `SCIENCE_PDF_LINK` - Google Drive link for Science PDF
- `MODERN_HISTORY_PDF_LINK` - Google Drive link for Modern History PDF
- `ANCIENT_HISTORY_PDF_LINK` - Google Drive link for Ancient History PDF
- `MEDIEVAL_HISTORY_PDF_LINK` - Google Drive link for Medieval History PDF

### Server Configuration
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)

## PSTET Course Specific Information

### Course Details
- **Name**: PSTET & CTET 1 Month Crash Course
- **Duration**: 1 Month (Till Exam)
- **Start Date**: 5th February 2026
- **Mode**: Online via Zoom Meet
- **Syllabus**: Complete Syllabus with Exam
- **Price**: Set via `PSTET_PRICE` environment variable (default: 2999)

### WhatsApp Community
- **Group Link**: https://chat.whatsapp.com/HoRxQj00hItCfWgEQbnc7t

### Purchase Type for Webhook
- **Identifier**: `pstet_ctet`

## API Endpoints

### PSTET Routes
- `GET /api/pstet/info` - Get PSTET course information
- `POST /api/pstet/enroll` - Enroll in PSTET course (requires authentication)

### Webhook Handling
- `POST /api/webhook` - Handle Razorpay payment webhooks
  - Processes `pstet_ctet` purchase type
  - Updates enrollment status to "confirmed"
  - Sends confirmation emails to user and admin
