import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
  Card,
  CardContent,
  Divider,
  Switch,
  FormControlLabel,
  Chip // Added Chip import
} from '@mui/material';
import { 
  QrCode,
  Download,
  Refresh,
  Share,
  LocationOn
} from '@mui/icons-material';
import { collection, addDoc, Timestamp, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/layouts/AdminLayout';
import QRCode from 'qrcode.react';
import html2canvas from 'html2canvas';

const QRGenerator = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [qrSize, setQrSize] = useState(256);
  const [validityHours, setValidityHours] = useState(24);
  const [qrType, setQrType] = useState('daily');
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationRadius, setLocationRadius] = useState(100); // in meters
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [recentQRCodes, setRecentQRCodes] = useState([]);
  const qrRef = useRef(null);

  // Generate a new QR code value on component mount
  useEffect(() => {
    generateQRValue();
    fetchRecentQRCodes();
  }, []);

  // Fetch user's current location if location is enabled
  useEffect(() => {
    if (locationEnabled) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLatitude(position.coords.latitude);
            setLongitude(position.coords.longitude);
          },
          (error) => {
            console.error('Error getting location:', error);
            setSnackbar({
              open: true,
              message: 'Error getting location. Please enable location services.',
              severity: 'error'
            });
            setLocationEnabled(false);
          }
        );
      } else {
        setSnackbar({
          open: true,
          message: 'Geolocation is not supported by this browser.',
          severity: 'error'
        });
        setLocationEnabled(false);
      }
    }
  }, [locationEnabled]);

  // Fetch recent QR codes
  const fetchRecentQRCodes = async () => {
    try {
      const qrCodesQuery = query(
        collection(db, 'qrCodes'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      
      const qrCodesSnapshot = await getDocs(qrCodesQuery);
      const qrCodesData = qrCodesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        expiresAt: doc.data().expiresAt?.toDate()
      }));
      
      setRecentQRCodes(qrCodesData);
    } catch (error) {
      console.error('Error fetching recent QR codes:', error);
    }
  };

  // Generate a new QR code value
  const generateQRValue = () => {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + validityHours * 60 * 60 * 1000);
    
    // Create QR code data object
    const qrData = {
      type: qrType,
      gymId: 'gym_' + currentUser.uid.substring(0, 8),
      timestamp: now.getTime(),
      expiresAt: expiryDate.getTime()
    };
    
    // Add location data if enabled
    if (locationEnabled && latitude && longitude) {
      qrData.location = {
        latitude,
        longitude,
        radius: locationRadius
      };
    }
    
    // Convert to JSON string and encode
    const qrString = JSON.stringify(qrData);
    setQrValue(qrString);
  };

  // Save QR code to Firestore
  const saveQRCode = async () => {
    try {
      setLoading(true);
      
      // Generate QR code image as data URL
      const canvas = await html2canvas(qrRef.current);
      const qrImageData = canvas.toDataURL('image/png');
      
      // Upload QR code image to Firebase Storage
      const storageRef = ref(storage, `qrCodes/${Date.now()}.png`);
      await uploadString(storageRef, qrImageData, 'data_url');
      const downloadURL = await getDownloadURL(storageRef);
      
      // Parse QR data safely
      let qrData = null;
      try {
        qrData = JSON.parse(qrValue);
      } catch (e) {
        setLoading(false);
        setSnackbar({
          open: true,
          message: 'Invalid QR data. Please check the input.',
          severity: 'error'
        });
        return;
      }
      
      // Save QR code data to Firestore
      const qrCodeData = {
        value: qrValue,
        type: qrType,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(qrData.expiresAt),
        createdBy: currentUser.uid,
        imageUrl: downloadURL,
        validityHours
      };
      
      // Add location data if enabled
      if (locationEnabled && latitude && longitude) {
        qrCodeData.location = {
          latitude,
          longitude,
          radius: locationRadius
        };
      }
      
      await addDoc(collection(db, 'qrCodes'), qrCodeData);
      
      setSnackbar({
        open: true,
        message: 'QR code saved successfully!',
        severity: 'success'
      });
      
      // Refresh the list of recent QR codes
      fetchRecentQRCodes();
    } catch (error) {
      console.error('Error saving QR code:', error);
      setSnackbar({
        open: true,
        message: 'Error saving QR code: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Download QR code as image
  const downloadQRCode = async () => {
    try {
      const canvas = await html2canvas(qrRef.current);
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `qrcode-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading QR code:', error);
      setSnackbar({
        open: true,
        message: 'Error downloading QR code',
        severity: 'error'
      });
    }
  };

  // Share QR code
  const shareQRCode = async () => {
    try {
      const canvas = await html2canvas(qrRef.current);
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'qrcode.png', { type: 'image/png' });
        
        if (navigator.share) {
          await navigator.share({
            title: 'Gym Attendance QR Code',
            text: 'Scan this QR code to mark your attendance',
            files: [file]
          });
        } else {
          setSnackbar({
            open: true,
            message: 'Web Share API not supported in this browser',
            severity: 'warning'
          });
        }
      });
    } catch (error) {
      console.error('Error sharing QR code:', error);
      setSnackbar({
        open: true,
        message: 'Error sharing QR code',
        severity: 'error'
      });
    }
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

  // Check if QR code is expired
  const isExpired = (expiryDate) => {
    return new Date() > new Date(expiryDate);
  };

  return (
    <AdminLayout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          QR Code Generator
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" paragraph>
          Generate QR codes for gym attendance tracking
        </Typography>
        
        <Grid container spacing={4}>
          {/* QR Code Generation Panel */}
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3 }} elevation={3}>
              <Typography variant="h6" gutterBottom>
                Generate New QR Code
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>QR Code Type</InputLabel>
                    <Select
                      value={qrType}
                      label="QR Code Type"
                      onChange={(e) => setQrType(e.target.value)}
                    >
                      <MenuItem value="daily">Daily Attendance</MenuItem>
                      <MenuItem value="event">Special Event</MenuItem>
                      <MenuItem value="class">Fitness Class</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Validity (hours)"
                    type="number"
                    value={validityHours}
                    onChange={(e) => setValidityHours(Math.max(1, parseInt(e.target.value) || 1))}
                    InputProps={{ inputProps: { min: 1, max: 168 } }}
                    helperText="How long this QR code will be valid"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={locationEnabled}
                        onChange={(e) => setLocationEnabled(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Enable Location Verification"
                  />
                </Grid>
                
                {locationEnabled && (
                  <>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Latitude"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        disabled={true}
                        helperText="Auto-detected from your location"
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Longitude"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        disabled={true}
                        helperText="Auto-detected from your location"
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Radius (meters)"
                        type="number"
                        value={locationRadius}
                        onChange={(e) => setLocationRadius(Math.max(10, parseInt(e.target.value) || 10))}
                        InputProps={{ inputProps: { min: 10, max: 1000 } }}
                        helperText="Allowed distance from gym"
                      />
                    </Grid>
                  </>
                )}
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="QR Size (pixels)"
                    type="number"
                    value={qrSize}
                    onChange={(e) => setQrSize(Math.max(128, parseInt(e.target.value) || 128))}
                    InputProps={{ inputProps: { min: 128, max: 512, step: 32 } }}
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={generateQRValue}
                  sx={{ mr: 1 }}
                >
                  Regenerate
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={saveQRCode}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={24} /> : <QrCode />}
                >
                  {loading ? 'Saving...' : 'Save QR Code'}
                </Button>
              </Box>
            </Paper>
          </Grid>
          
          {/* QR Code Preview */}
          <Grid item xs={12} md={5}>
            <Paper 
              sx={{ 
                p: 3, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px'
              }} 
              elevation={3}
            >
              <Typography variant="h6" gutterBottom>
                QR Code Preview
              </Typography>
              
              <Box 
                ref={qrRef} 
                sx={{ 
                  p: 3, 
                  bgcolor: 'white', 
                  borderRadius: 2,
                  boxShadow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  mb: 3
                }}
              >
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Gym Attendance
                </Typography>
                
                <QRCode 
                  value={qrValue} 
                  size={qrSize} 
                  level="H"
                  includeMargin
                  renderAs="canvas"
                />
                
                <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary', textAlign: 'center' }}>
                  {(() => {
                    try {
                      return `Valid until: ${formatDate(JSON.parse(qrValue).expiresAt)}`;
                    } catch (e) {
                      return 'Invalid QR data';
                    }
                  })()}
                  {locationEnabled && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                      <LocationOn fontSize="small" sx={{ mr: 0.5 }} />
                      <span>Location verification enabled</span>
                    </Box>
                  )}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={downloadQRCode}
                >
                  Download
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Share />}
                  onClick={shareQRCode}
                >
                  Share
                </Button>
              </Box>
            </Paper>
          </Grid>
          
          {/* Recent QR Codes */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }} elevation={3}>
              <Typography variant="h6" gutterBottom>
                Recent QR Codes
              </Typography>
              
              {recentQRCodes.length > 0 ? (
                <Grid container spacing={2}>
                  {recentQRCodes.map((qrCode) => (
                    <Grid item xs={12} sm={6} md={4} key={qrCode.id}>
                      <Card 
                        sx={{ 
                          height: '100%',
                          opacity: isExpired(qrCode.expiresAt) ? 0.7 : 1
                        }}
                        elevation={2}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Typography variant="subtitle1" component="div">
                              {qrCode.type.charAt(0).toUpperCase() + qrCode.type.slice(1)} QR
                            </Typography>
                            <Chip 
                              label={isExpired(qrCode.expiresAt) ? 'Expired' : 'Active'} 
                              color={isExpired(qrCode.expiresAt) ? 'error' : 'success'} 
                              size="small" 
                            />
                          </Box>
                          
                          <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                            {qrCode.imageUrl ? (
                              <img 
                                src={qrCode.imageUrl} 
                                alt="QR Code" 
                                style={{ 
                                  width: '120px', 
                                  height: '120px',
                                  filter: isExpired(qrCode.expiresAt) ? 'grayscale(100%)' : 'none'
                                }} 
                              />
                            ) : (
                              <Box 
                                sx={{ 
                                  width: '120px', 
                                  height: '120px', 
                                  bgcolor: 'grey.200',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <QrCode color="disabled" />
                              </Box>
                            )}
                          </Box>
                          
                          <Divider sx={{ my: 1 }} />
                          
                          <Typography variant="body2" color="text.secondary">
                            Created: {formatDate(qrCode.createdAt)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Expires: {formatDate(qrCode.expiresAt)}
                          </Typography>
                          {qrCode.location && (
                            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                              <LocationOn fontSize="small" sx={{ mr: 0.5 }} />
                              Location enabled ({qrCode.location.radius}m)
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography variant="body1" color="textSecondary" sx={{ py: 2 }}>
                  No QR codes generated yet. Create your first QR code above.
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
      
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
    </AdminLayout>
  );
};

export default QRGenerator;