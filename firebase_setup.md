# Firebase Setup for Gym Management System

## Firestore Collections

Based on the codebase analysis, the following Firestore collections are being used:

1. **users** - Stores user authentication data
   - Fields: email, role, createdAt, ...

2. **members** - Stores detailed member information
   - Fields: firstName, lastName, email, phone, address, city, state, zipCode, dateOfBirth, gender, emergencyContact, healthInfo, preferences, profileImageUrl, membershipPlan, membershipStartDate, membershipEndDate, createdAt, updatedAt

3. **attendance** - Stores check-in records
   - Fields: memberId, timestamp, location, qrCodeId

4. **notifications** - Stores system notifications
   - Fields: userId, title, message, type, category, priority, read, readAt, timestamp, createdBy, createdByName, link

5. **settings** - Stores application configuration
   - Documents: general, qrCode, notifications, security, backup

## Firestore Indexes

The following composite indexes should be created in Firebase Console:

1. **notifications collection**
   - Fields indexed: userId (Ascending), timestamp (Descending)
   - Query: Used in Notifications.js to fetch user notifications sorted by date

2. **attendance collection**
   - Fields indexed: memberId (Ascending), timestamp (Descending)
   - Query: Used in AttendanceHistory.js to fetch member attendance records sorted by date

## Firebase Storage

The application uses Firebase Storage for:

1. **profile_images/** - Stores member profile pictures
2. **gym_logo/** - Stores gym logo

## Firebase Authentication

The application uses Firebase Authentication with:

1. Email/Password authentication
2. Password reset functionality

## Security Rules

Recommended Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection: users can read/write/create their own user document
    // Admins can read all user documents
    match /users/{userId} {
      allow create: if request.auth != null && request.auth.uid == userId;
      allow read, update, delete: if request.auth != null && (
        request.auth.uid == userId ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );
    }

    // Members collection:
    // - Admins can read, create, update, and delete any member
    // - Members can create/read/update their own member profile
    match /members/{memberId} {
      allow read: if request.auth != null && (
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
        request.auth.uid == memberId
      );
      allow create, update, delete: if request.auth != null && (
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
        request.auth.uid == memberId
      );
    }

    // Attendance collection:
    // - Admins can read, create, update, delete all attendance
    // - Members can read their own attendance and create their own attendance record
    match /attendance/{attendanceId} {
      allow read: if request.auth != null && (
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
        resource.data.userId == request.auth.uid
      );
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow update, delete: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Notifications collection:
    // - Members can read/update their own notifications
    // - Admins can create/delete
    match /notifications/{notificationId} {
      allow read: if request.auth != null && (resource.data.userId == request.auth.uid || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow update: if request.auth != null && (resource.data.userId == request.auth.uid || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow create, delete: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Settings collection: only admins can read/write
    match /settings/{settingId} {
      allow read, write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

Recommended Storage security rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow users to read and write their own profile images
    match /profile_images/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow only admins to manage gym logo
    match /gym_logo/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## Firebase Configuration

Update the firebase.js file with your actual Firebase project credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```