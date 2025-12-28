# Journee Backend

A robust Node.js backend API for the Journee application - a social journaling platform that allows users to share their
daily experiences, thoughts, and memories.

## 🚀 Features

- **User Authentication & Authorization** - JWT-based auth with secure password hashing
- **Post Management** - Create, read, update, delete posts with images and journal entries
- **Social Interactions** - Like, comment, and react to posts
- **Journal System** - Personal journaling with privacy controls
- **Real-time Logging** - Comprehensive request/response and authentication logging
- **Firebase Integration** - Cloud Firestore for data storage
- **CORS Support** - Cross-origin resource sharing for frontend integration

## 📋 Prerequisites

- **Node.js**: `>=18.0.0` (Recommended: Node.js 18+ or 20+)
- **npm** or **yarn** package manager
- **Firebase Project** with Firestore enabled
- **Git** for version control

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd journee-backend
```

### 2. Install Dependencies

Using yarn (recommended):

```bash
yarn install
```

Using npm:

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```env
# Firebase Admin SDK Configuration
FIRESTORE_TYPE=service_account
FIRESTORE_PROJECT_ID=your-project-id
FIRESTORE_PRIVATE_KEY_ID=your-private-key-id
FIRESTORE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIRESTORE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIRESTORE_CLIENT_ID=your-client-id
FIRESTORE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIRESTORE_TOKEN_URI=https://oauth2.googleapis.com/token
FIRESTORE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIRESTORE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project-id.iam.gserviceaccount.com
FIRESTORE_UNIVERSE_DOMAIN=googleapis.com

# Firebase Client SDK Configuration
FIRESTORE_API_KEY=your-web-api-key
FIRESTORE_AUTH_DOMAIN=your-project-id.firebaseapp.com
FIRESTORE_STORAGE_BUCKET=your-project-id.firebasestorage.app
FIRESTORE_MESSAGING_SENDER_ID=your-messaging-sender-id
FIRESTORE_APP_ID=your-app-id
FIRESTORE_MEASUREMENT_ID=your-measurement-id

# Application Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
BCRYPT_SALT_ROUNDS=12
NODE_ENV=development
PORT=3001

# Frontend Configuration
FRONTEND_URL=http://localhost:8081
```

### 4. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable **Firestore Database**
4. Generate a **Service Account Key**:
    - Go to Project SettingComponents → Service Accounts
    - Generate new private key
    - Download the JSON file
5. Get **Web App Configuration**:
    - Go to Project SettingComponents → General
    - Add a web app if you don't have one
    - Copy the config object values

## 🏃 Running the Application

### Development Mode

```bash
yarn dev
# or
npm run dev
```

### Production Mode

```bash
yarn start
# or
npm start
```

The server will start on `http://localhost:3001` by default.

## 📁 Project Structure

```
journee-backend/
├── config/
│   └── firebase.js          # Firebase configuration
├── controllers/
│   ├── user.js              # User authentication & management
│   ├── post.js              # Post CRUD operations
│   └── journal.js           # Journal management
├── middlewares/
│   ├── logger.js            # Request/response logging
│   └── auth.js              # JWT authentication middleware
├── routes/
│   ├── user.js              # User API routes
│   ├── post.js              # Post API routes
│   └── journal.js           # Journal API routes
├── logs/                    # Application logs (auto-generated)
├── .env                     # Environment variables (create this)
├── .gitignore              # Git ignore rules
├── index.js                # Main application entry point
└── package.json            # Dependencies and scripts
```

## 🔌 API Endpoints

### Authentication

- `POST /api/users/` - User registration
- `POST /api/users/login` - User login
- `POST /api/users/logout` - User logout
- `GET /api/users/profile` - Get user profile (protected)
- `PUT /api/users/profile` - Update user profile (protected)

### Users

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID

### Posts

- `GET /api/posts` - Get all posts with reactions and comments
- `GET /api/posts/:id` - Get specific post with reactions and comments
- `POST /api/posts` - Create new post (protected)
- `PUT /api/posts/:id` - Update post (protected)
- `DELETE /api/posts/:id` - Delete post (protected)
- `POST /api/posts/:id/react` - React to post (protected)
- `DELETE /api/posts/:id/react` - Remove reaction (protected)
- `POST /api/posts/:id/comment` - Comment on post (protected)

### Journals

- `GET /api/journals` - Get all journals (protected)
- `GET /api/journals/:id` - Get specific journal (protected)
- `POST /api/journals` - Create journal entry (protected)
- `PUT /api/journals/:id` - Update journal entry (protected)
- `DELETE /api/journals/:id` - Delete journal entry (protected)

### Health Check

- `GET /health` - Server health status
- `GET /` - API information

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt with configurable salt rounds
- **CORS Protection** - Configurable cross-origin resource sharing
- **Request Logging** - Comprehensive logging for security monitoring
- **Environment Variables** - Sensitive data protection

## 📊 Logging

The application automatically logs:

- All HTTP requests/responses (`logs/access-YYYY-MM-DD.log`)
- Authentication events (`logs/auth-YYYY-MM-DD.log`)
- Errors (`logs/error-YYYY-MM-DD.log`)

Logs are automatically cleaned up after 30 days in production.

## 🚀 Deployment

### Render.com (Recommended)

1. Connect your GitHub repository to Render
2. Set the following build settings:
   ```
   Build Command: yarn install
   Start Command: yarn start
   ```
3. Add all environment variables from your `.env` file
4. Deploy!

Your API will be available at: `https://your-app-name.onrender.com`

### Other Platforms

The application is compatible with:

- **Heroku**
- **Railway**
- **DigitalOcean App Platform**
- **AWS Elastic Beanstalk**
- **Google Cloud Run**

## 🧪 Testing

```bash
# Run tests
yarn test
# or
npm test

# Run linting
yarn lint
# or
npm run lint
```

## 🔧 Development

### Adding New Routes

1. Create controller in `controllers/`
2. Define routes in `routes/`
3. Import and use in `index.js`

### Database Operations

Use Firebase Client SDK for standard operations:

```javascript
const {db} = require('@/config/firebase');
const {collection, addDoc, getDocs} = require('firebase/firestore');

// Example CRUD operation
const createDocument = async (data) => {
    const docRef = await addDoc(collection(db, 'collection-name'), data);
    return docRef.id;
};
```

Use Firebase Admin SDK for admin operations:

```javascript
const {adminDb, admin} = require('@/config/firebase');

// Example admin operation
const verifyToken = async (token) => {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
};
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE]() file for details.

## 🆘 Support

If you encounter any issues:

1. Check the logs in the `logs/` directory
2. Verify your Firebase configuration
3. Ensure all environment variables are set correctly
4. Check Node.js version compatibility

## 🔄 Version Requirements

- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **yarn**: 1.22.0 or higher (if using yarn)

---

**Happy Coding! 🎉**
