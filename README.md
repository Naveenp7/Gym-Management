# Gym Management System

A comprehensive gym management system built with React, Material-UI, and Firebase.

## Features

### Admin Panel
- Member Management
- Membership Plan Management
- QR Code Generator
- Attendance Reports
- Notifications
- Settings

### Member Panel
- Dashboard
- QR Scanner
- Profile Management
- Attendance History
- Notifications

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository
   ```
   git clone <repository-url>
   cd Gym
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Configure Firebase
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Enable Storage
   - Get your Firebase configuration (Project settings > General > Your apps > Firebase SDK snippet > Config)
   - Update the `src/firebase.js` file with your configuration

4. Set up Firestore indexes
   - Go to Firebase Console > Firestore Database > Indexes
   - Add the following composite indexes:
     1. Collection: `notifications`
        - Fields: `userId` (Ascending), `timestamp` (Descending)
     2. Collection: `attendance`
        - Fields: `memberId` (Ascending), `timestamp` (Descending)

5. Set up Firestore Security Rules
   - Go to Firebase Console > Firestore Database > Rules
   - Copy and paste the security rules from `firebase_setup.md`

6. Set up Storage Security Rules
   - Go to Firebase Console > Storage > Rules
   - Copy and paste the storage rules from `firebase_setup.md`

7. Initialize Firebase with default data (optional)
   ```
   node scripts/initializeFirebase.js
   ```

8. Start the development server
   ```
   npm start
   ```

### First-time Setup

1. Register a new user through the application
2. Go to Firebase Console > Firestore Database > Data
3. Find the user document in the `users` collection
4. Edit the document and change the `role` field to `admin`
5. Now you can log in as an admin

## Project Structure

```
/src
  /components        # Reusable components
    /layouts         # Layout components (AdminLayout, MemberLayout)
  /contexts          # React contexts (AuthContext)
  /pages             # Page components
    /admin           # Admin panel pages
    /member          # Member panel pages
  /firebase.js       # Firebase configuration
  /App.js            # Main application component with routing
  /index.js          # Entry point
```

## Firebase Collections

- `users`: User authentication data
- `members`: Member profile information
- `attendance`: Check-in records
- `notifications`: System notifications
- `settings`: Application configuration
- `membershipPlans`: Available membership plans

Refer to `firebase_setup.md` for detailed information about the Firebase setup.

## Development

### Adding New Features

1. Create new components in the appropriate directories
2. Update the routing in `App.js`
3. Add navigation links in the layout components

### Deployment

1. Build the application
   ```
   npm run build
   ```

2. Deploy to Firebase Hosting (optional)
   ```
   npm install -g firebase-tools
   firebase login
   firebase init
   firebase deploy
   ```

## License

[MIT](LICENSE)