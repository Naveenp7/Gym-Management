import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { 
  QrCodeScanner, 
  CheckCircle,
  Error as ErrorIcon,
  LocationOn,
  CameraAlt
} from '@mui/icons-material';
import { collection, addDoc, Timestamp, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import MemberLayout from '../../components/layouts/MemberLayout';
import { Scanner } from '@yudiel/react-qr-scanner';

const QRScanner = () => {
  const { currentUser } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: ''
  });
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [locationStatus, setLocationStatus] = useState({
    checking: false,
    verified: false,
    error: null
  });

  // Check if user has already marked attendance today
  useEffect(() => {
    const checkTodayAttendance = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowTimestamp = Timestamp.fromDate(tomorrow);
        
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('userId', '==', currentUser.uid),
          where('date', '>=', todayTimestamp),
          where('date', '<', tomorrowTimestamp),
          limit(1)
        );
        
        const attendanceSnapshot = await getDocs(attendanceQuery);
        
        if (!attendanceSnapshot.empty) {
          const attendanceData = {
            id: attendanceSnapshot.docs[0].id,
            ...attendanceSnapshot.docs[0].data(),
            date: attendanceSnapshot.docs[0].data().date.toDate()
          };
          setTodayAttendance(attendanceData);
        }
      } catch (error) {
        console.error('Error checking today\'s attendance:', error);
      }
    };
    
    if (currentUser) {
      checkTodayAttendance();
    }
  }, [currentUser]);

  // Handle QR code scan result
  const handleScan = (result) => {
    if (!currentUser) {
      setError('Please log in to scan QR codes.');
      setScanning(false);
      return;
    }
    
    if (result && result.text) {
      setScanning(false);
      try {
        // Parse QR code data
        let qrData;
        if (typeof result.text === 'object' && result.text !== null) {
          qrData = result.text; // It's already an object
        } else {
          qrData = JSON.parse(result.text); // Try parsing as JSON string
        }
        setScannedData(qrData);
        
        // Check if QR code is expired
        const now = new Date().getTime();
        if (qrData.expiresAt < now) {
          setError('This QR code has expired. Please ask for a new one.');
          return;
        }
        
        // Check if location verification is required
        if (qrData.location) {
          verifyLocation(qrData.location);
        } else {
          // If no location verification, show confirmation dialog
          setConfirmDialog({
            open: true,
            title: 'Confirm Attendance',
            message: 'Do you want to mark your attendance for today?'
          });
        }
      } catch (error) {
        console.error('Error parsing QR code:', error);
        setError('Invalid QR code format. Please try again.');
      }
    }
  };

  // Enhanced QR scan error handler for camera issues
  const handleScanError = (error) => {
    console.error('QR scan error:', error);
    setScanning(false);
    if (error && error.name === 'NotAllowedError') {
      setError('Camera access was denied. Please allow camera permissions in your browser settings.');
    } else if (error && error.name === 'NotFoundError') {
      setError('No camera device found. Please connect a camera and try again.');
    } else if (error && error.message && error.message.includes('Track is in an invalid state')) {
      setError('Camera stream was interrupted. Please close other apps using the camera and try again.');
    } else {
      setError('Error scanning QR code. Please try again.');
    }
  };

  // Verify user's location against QR code location
  const verifyLocation = (qrLocation) => {
    setLocationStatus({
      checking: true,
      verified: false,
      error: null
    });
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          const qrLat = parseFloat(qrLocation.latitude);
          const qrLng = parseFloat(qrLocation.longitude);
          const radius = qrLocation.radius || 100; // Default 100m radius
          
          // Calculate distance between user and QR code location (Haversine formula)
          const distance = calculateDistance(userLat, userLng, qrLat, qrLng);
          
          if (distance <= radius) {
            setLocationStatus({
              checking: false,
              verified: true,
              error: null,
              distance: Math.round(distance)
            });
            
            // Show confirmation dialog
            setConfirmDialog({
              open: true,
              title: 'Confirm Attendance',
              message: `Location verified (${Math.round(distance)}m from gym). Do you want to mark your attendance for today?`
            });
          } else {
            setLocationStatus({
              checking: false,
              verified: false,
              error: `You are ${Math.round(distance)}m away from the gym. You need to be within ${radius}m to mark attendance.`,
              distance: Math.round(distance)
            });
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationStatus({
            checking: false,
            verified: false,
            error: 'Error getting your location. Please enable location services.'
          });
        }
      );
    } else {
      setLocationStatus({
        checking: false,
        verified: false,
        error: 'Geolocation is not supported by this browser.'
      });
    }
  };

  // Calculate distance between two coordinates in meters (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance; // Distance in meters
  };

  // Mark attendance in Firestore
  const markAttendance = async () => {
    try {
      setLoading(true);
      
      // Verify user authentication and role
      if (!currentUser) {
        throw new Error('You must be logged in to mark attendance.');
      }
      
      // Get current user's role
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) {
        throw new Error('User profile not found.');
      }
      
      const userData = userDoc.data();
      if (userData.role !== 'member') {
        throw new Error('Only members can mark attendance.');
      }
      
      // Check if already marked attendance today
      if (todayAttendance) {
        setSnackbar({
          open: true,
          message: 'You have already marked your attendance today.',
          severity: 'info'
        });
        setLoading(false);
        return;
      }
      
      // Create attendance record
      const attendanceData = {
        userId: currentUser.uid,  // This matches the security rules requirement
        memberId: currentUser.uid,  // Keep this for backward compatibility
        date: Timestamp.now(),
        qrCodeType: scannedData.type || 'unknown',
        gymId: scannedData.gymId || 'unknown_gym',
      };
      
      // Add location data if verified
      if (locationStatus.verified) {
        attendanceData.locationVerified = true;
        attendanceData.distance = locationStatus.distance;
      }
      
      // Save to Firestore
      const docRef = await addDoc(collection(db, 'attendance'), attendanceData);
      
      // Update state
      setTodayAttendance({
        id: docRef.id,
        ...attendanceData,
        date: new Date()
      });
      
      setSuccess(true);
      setSnackbar({
        open: true,
        message: 'Attendance marked successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error marking attendance:', error);
      setError('Error marking attendance. Please try again.');
      setSnackbar({
        open: true,
        message: 'Error marking attendance: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };

  // Reset scanner state
  const resetScanner = () => {
    setScanning(false);
    setScannedData(null);
    setError(null);
    setSuccess(false);
    setLocationStatus({
      checking: false,
      verified: false,
      error: null
    });
  };

  // Format date for display
  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <MemberLayout>
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          QR Code Scanner
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" paragraph>
          Scan the gym's QR code to mark your attendance
        </Typography>
        
        {/* Today's Attendance Status */}
        {todayAttendance && (
          <Paper sx={{ p: 3, mb: 4, bgcolor: 'success.light', color: 'white' }} elevation={3}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CheckCircle sx={{ fontSize: 40, mr: 2 }} />
              <Box>
                <Typography variant="h6">
                  Attendance Already Marked Today
                </Typography>
                <Typography variant="body1">
                  You checked in at {formatDate(todayAttendance.date)}
                </Typography>
              </Box>
            </Box>
          </Paper>
        )}
        
        {/* Scanner */}
        <Paper sx={{ p: 3, mb: 4 }} elevation={3}>
          {!scanning && !success && !todayAttendance && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CameraAlt sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Ready to Scan
              </Typography>
              <Typography variant="body1" color="textSecondary" paragraph>
                Click the button below to start scanning the QR code
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<QrCodeScanner />}
                onClick={() => setScanning(true)}
                sx={{ mt: 2 }}
              >
                Start Scanning
              </Button>
            </Box>
          )}
          
          {scanning && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Scanning QR Code
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Position the QR code within the frame
              </Typography>
              
              <Box sx={{ maxWidth: 400, margin: '0 auto', mb: 3 }}>
                <Scanner
                  onScan={(result) => {
                    if (result) {
                      handleScan({ text: result });
                    }
                  }}
                  onError={handleScanError}
                  styles={{ container: { width: '100%' } }}
                  constraints={{ facingMode: 'environment' }}
                />
              </Box>
              
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setScanning(false)}
              >
                Cancel
              </Button>
            </Box>
          )}
          
          {error && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <ErrorIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
              <Typography variant="h6" color="error" gutterBottom>
                Error
              </Typography>
              <Typography variant="body1" paragraph>
                {error}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={resetScanner}
              >
                Try Again
              </Button>
            </Box>
          )}
          
          {locationStatus.checking && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Verifying Location
              </Typography>
              <Typography variant="body1" color="textSecondary">
                Please wait while we verify your location...
              </Typography>
            </Box>
          )}
          
          {locationStatus.error && !locationStatus.verified && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <LocationOn sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
              <Typography variant="h6" color="error" gutterBottom>
                Location Verification Failed
              </Typography>
              <Typography variant="body1" paragraph>
                {locationStatus.error}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={resetScanner}
              >
                Try Again
              </Button>
            </Box>
          )}
          
          {success && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" color="success.main" gutterBottom>
                Attendance Marked Successfully!
              </Typography>
              <Typography variant="body1" paragraph>
                Your attendance has been recorded for today.
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Time: {formatDate(new Date())}
              </Typography>
            </Box>
          )}
        </Paper>
        
        {/* Instructions */}
        <Card sx={{ mb: 4 }} elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              How to Mark Attendance
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" paragraph>
              1. Click on "Start Scanning" to activate the camera
            </Typography>
            <Typography variant="body2" paragraph>
              2. Point your camera at the gym's QR code displayed at the entrance
            </Typography>
            <Typography variant="body2" paragraph>
              3. Hold steady until the QR code is recognized
            </Typography>
            <Typography variant="body2" paragraph>
              4. If location verification is enabled, allow location access when prompted
            </Typography>
            <Typography variant="body2">
              5. Confirm your attendance when prompted
            </Typography>
          </CardContent>
        </Card>
      </Container>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
            Cancel
          </Button>
          <Button 
            onClick={markAttendance} 
            color="primary" 
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MemberLayout>
  );
};

export default QRScanner;