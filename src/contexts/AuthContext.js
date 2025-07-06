import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password, role, userData) {
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Add user data to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        ...userData, // Contains firstName, lastName, phone
        email: user.email,
        role: role,
        createdAt: Timestamp.now(),
      });
      
      // If the new user is a member, also create a document in the 'members' collection
      if (role === 'member') {
        await setDoc(doc(db, 'members', user.uid), {
          ...userData, // Contains firstName, lastName, phone
          email: user.email,
          role: 'member',
          name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          membershipStatus: 'inactive',
          membershipExpiry: null,
          membershipStartDate: null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      // Return the full userCredential object for downstream use
      return userCredential;
    } catch (error) {
      throw error;
    }
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  async function getUserRole(uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.role;
      }
      return null;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        const role = await getUserRole(user.uid);
        setUserRole(role);
      } else {
        setUserRole(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    signup,
    login,
    logout,
    resetPassword,
    getUserRole
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}