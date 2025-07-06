import React, { useState, useEffect } from 'react';
import { calculateDaysRemaining } from '../../utils/dateUtils';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Avatar,
  Button,
  TextField,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  PhotoCamera,
  Email,
  Phone,
  CalendarToday,
  Visibility,
  VisibilityOff,
  FitnessCenter,
  LocationOn,
  Person
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updatePassword, updateEmail } from 'firebase/auth';
import { db, storage } from '../../firebase';
import MemberLayout from '../../components/layouts/MemberLayout';
import { format } from 'date-fns';

const Profile = () => {
  const { currentUser, reloadUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    dateOfBirth: '',
    gender: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    },
    healthInfo: {
      conditions: '',
      allergies: '',
      medications: ''
    },
    preferences: {
      receiveEmails: true,
      receiveSMS: true
    }
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch member profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        
        if (!currentUser) {
          setLoading(false);
          return;
        }
        
        const memberDoc = await getDoc(doc(db, 'members', currentUser.uid));
        
        if (memberDoc.exists()) {
          const data = memberDoc.data();
          setProfileData(data);
          
          // Initialize form data
          setFormData({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || currentUser.email || '',
            phone: data.phone || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            zipCode: data.zipCode || '',
            dateOfBirth: data.dateOfBirth || '',
            gender: data.gender || '',
            emergencyContact: data.emergencyContact || {
              name: '',
              phone: '',
              relationship: ''
            },
            healthInfo: data.healthInfo || {
              conditions: '',
              allergies: '',
              medications: ''
            },
            preferences: data.preferences || {
              receiveEmails: true,
              receiveSMS: true
            }
          });
          
          // Set profile image URL if available
          if (data.profileImageUrl) {
            setProfileImageUrl(data.profileImageUrl);
          }
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        setSnackbar({
          open: true,
          message: 'Error loading profile data: ' + error.message,
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfileData();
  }, [currentUser]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      // Handle nested properties
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      });
    } else {
      // Handle top-level properties
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };

  // Handle password input changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value
    });
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setShowPassword({
      ...showPassword,
      [field]: !showPassword[field]
    });
  };

  // Handle profile image change
  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setProfileImage(e.target.files[0]);
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = () => {
        setProfileImageUrl(reader.result);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // Upload profile image to Firebase Storage
  const uploadProfileImage = async () => {
    if (!profileImage) return null;
    
    try {
      const storageRef = ref(storage, `profile_images/${currentUser.uid}`);
      await uploadBytes(storageRef, profileImage);
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch (error) {
      console.error('Error uploading profile image:', error);
      throw error;
    }
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      
      // Validate form data
      if (!formData.firstName || !formData.lastName || !formData.email) {
        setSnackbar({
          open: true,
          message: 'Please fill in all required fields',
          severity: 'error'
        });
        setSaving(false);
        return;
      }
      
      // Upload profile image if changed
      let profileImageUrl = null;
      if (profileImage) {
        profileImageUrl = await uploadProfileImage();
      }
      
      // Prepare profile data
      const profileUpdateData = {
        ...formData,
        updatedAt: Timestamp.now()
      };
      
      // Add profile image URL if uploaded
      if (profileImageUrl) {
        profileUpdateData.profileImageUrl = profileImageUrl;
      }
      
      // Update email in Firebase Auth if changed
      if (formData.email !== currentUser.email) {
        await updateEmail(currentUser, formData.email);
      }
      
      // Update profile in Firestore
      await updateDoc(doc(db, 'members', currentUser.uid), profileUpdateData);
      
      // Reload user to get updated data
      await reloadUser();
      
      setSnackbar({
        open: true,
        message: 'Profile updated successfully!',
        severity: 'success'
      });
      
      setEditMode(false);
      setProfileData({ ...profileData, ...profileUpdateData });
    } catch (error) {
      console.error('Error updating profile:', error);
      setSnackbar({
        open: true,
        message: 'Error updating profile: ' + error.message,
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    try {
      setSaving(true);
      
      // Validate password data
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        setSnackbar({
          open: true,
          message: 'Please fill in all password fields',
          severity: 'error'
        });
        setSaving(false);
        return;
      }
      
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setSnackbar({
          open: true,
          message: 'New passwords do not match',
          severity: 'error'
        });
        setSaving(false);
        return;
      }
      
      if (passwordData.newPassword.length < 6) {
        setSnackbar({
          open: true,
          message: 'Password must be at least 6 characters long',
          severity: 'error'
        });
        setSaving(false);
        return;
      }
      
      // Update password in Firebase Auth
      await updatePassword(currentUser, passwordData.newPassword);
      
      setSnackbar({
        open: true,
        message: 'Password changed successfully!',
        severity: 'success'
      });
      
      // Reset password fields and close dialog
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordDialogOpen(false);
    } catch (error) {
      console.error('Error changing password:', error);
      setSnackbar({
        open: true,
        message: 'Error changing password: ' + error.message,
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  // Format membership dates
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'MMM dd, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  // Get member since date
  const getMemberSinceDate = () => {
    if (!profileData || !profileData.createdAt) return 'N/A';
    return formatDate(profileData.createdAt);
  };

  // Calculate days remaining in membership
  // The call is now simplified and uses the utility function
  const daysRemaining = calculateDaysRemaining(profileData?.membershipExpiry);

  return (
    <MemberLayout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          My Profile
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Profile Summary Card */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, height: '100%' }} elevation={3}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                  <Box sx={{ position: 'relative' }}>
                    <Avatar 
                      src={profileImageUrl} 
                      alt={`${formData.firstName} ${formData.lastName}`}
                      sx={{ width: 120, height: 120, mb: 2 }}
                    />
                    {editMode && (
                      <Box sx={{ position: 'absolute', bottom: 10, right: -10 }}>
                        <input
                          accept="image/*"
                          style={{ display: 'none' }}
                          id="profile-image-upload"
                          type="file"
                          onChange={handleImageChange}
                        />
                        <label htmlFor="profile-image-upload">
                          <IconButton 
                            component="span" 
                            color="primary" 
                            sx={{ bgcolor: 'background.paper' }}
                          >
                            <PhotoCamera />
                          </IconButton>
                        </label>
                      </Box>
                    )}
                  </Box>
                  
                  <Typography variant="h5" gutterBottom>
                    {formData.firstName} {formData.lastName}
                  </Typography>
                  
                  <Chip 
                    label={profileData?.membershipPlan || 'No Membership'} 
                    color="primary" 
                    sx={{ mb: 1 }}
                  />
                  
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Member since: {getMemberSinceDate()}
                  </Typography>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Membership Status
                  </Typography>
                  
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        Start Date:
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" fontWeight="medium">
                        {formatDate(profileData?.membershipStartDate)}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        End Date:
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" fontWeight="medium">
                        {profileData?.membershipEndDate ? formatDate(profileData.membershipEndDate) : 'N/A'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        Days Remaining:
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography 
                        variant="body2" 
                        fontWeight="medium"
                        color={daysRemaining < 7 ? 'error.main' : 'inherit'}
                      >
                        {daysRemaining}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Contact Information
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Email fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">{formData.email}</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Phone fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">{formData.phone || 'Not provided'}</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                    <LocationOn fontSize="small" sx={{ mr: 1, mt: 0.5, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {formData.address ? (
                        <>
                          {formData.address}<br />
                          {formData.city}{formData.city && formData.state ? ', ' : ''}{formData.state} {formData.zipCode}
                        </>
                      ) : (
                        'Address not provided'
                      )}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ mt: 3 }}>
                  {!editMode ? (
                    <Button
                      variant="contained"
                      startIcon={<Edit />}
                      onClick={() => setEditMode(true)}
                      fullWidth
                    >
                      Edit Profile
                    </Button>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        startIcon={<Cancel />}
                        onClick={() => setEditMode(false)}
                        fullWidth
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<Save />}
                        onClick={handleSaveProfile}
                        disabled={saving}
                        fullWidth
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                    </Box>
                  )}
                  
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => setPasswordDialogOpen(true)}
                    fullWidth
                    sx={{ mt: 2 }}
                  >
                    Change Password
                  </Button>
                </Box>
              </Paper>
            </Grid>
            
            {/* Profile Details */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }} elevation={3}>
                <Typography variant="h6" gutterBottom>
                  {editMode ? 'Edit Profile Information' : 'Profile Information'}
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="First Name"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      fullWidth
                      margin="normal"
                      disabled={!editMode}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Last Name"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      fullWidth
                      margin="normal"
                      disabled={!editMode}
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      fullWidth
                      margin="normal"
                      disabled={!editMode}
                      required
                      type="email"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      fullWidth
                      margin="normal"
                      disabled={!editMode}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Date of Birth"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      fullWidth
                      margin="normal"
                      disabled={!editMode}
                      type="date"
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      fullWidth
                      margin="normal"
                      disabled={!editMode}
                      select
                      SelectProps={{ native: true }}
                    >
                      <option value=""></option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </TextField>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" gutterBottom>
                      Address Information
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      label="Street Address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      fullWidth
                      margin="normal"
                      disabled={!editMode}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="City"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      fullWidth
                      margin="normal"
                      disabled={!editMode}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="State/Province"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      fullWidth
                      margin="normal"
                      disabled={!editMode}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Zip/Postal Code"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      fullWidth
                      margin="normal"
                      disabled={!editMode}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" gutterBottom>
                      Emergency Contact
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Emergency Contact Name"
                      name="emergencyContact.name"
                      value={formData.emergencyContact.name}
                      onChange={handleInputChange}
                      fullWidth
                      margin="normal"
                      disabled={!editMode}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Emergency Contact Phone"
                      name="emergencyContact.phone"
                      value={formData.emergencyContact.phone}
                      onChange={handleInputChange}
                      fullWidth
                      margin="normal"
                      disabled={!editMode}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Relationship"
                      name="emergencyContact.relationship"
                      value={formData.emergencyContact.relationship}
                      onChange={handleInputChange}
                      fullWidth
                      margin="normal"
                      disabled={!editMode}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" gutterBottom>
                      Health Information
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Medical Conditions"
                      name="healthInfo.conditions"
                      value={formData.healthInfo.conditions}
                      onChange={handleInputChange}
                      fullWidth
                      margin="normal"
                      disabled={!editMode}
                      multiline
                      rows={2}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Allergies"
                      name="healthInfo.allergies"
                      value={formData.healthInfo.allergies}
                      onChange={handleInputChange}
                      fullWidth
                      margin="normal"
                      disabled={!editMode}
                      multiline
                      rows={2}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Current Medications"
                      name="healthInfo.medications"
                      value={formData.healthInfo.medications}
                      onChange={handleInputChange}
                      fullWidth
                      margin="normal"
                      disabled={!editMode}
                      multiline
                      rows={2}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" gutterBottom>
                      Communication Preferences
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.preferences.receiveEmails}
                          onChange={handleInputChange}
                          name="preferences.receiveEmails"
                          disabled={!editMode}
                          color="primary"
                        />
                      }
                      label="Receive Email Notifications"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.preferences.receiveSMS}
                          onChange={handleInputChange}
                          name="preferences.receiveSMS"
                          disabled={!editMode}
                          color="primary"
                        />
                      }
                      label="Receive SMS Notifications"
                    />
                  </Grid>
                </Grid>
              </Paper>
              
              {/* Membership History */}
              <Paper sx={{ p: 3, mt: 3 }} elevation={3}>
                <Typography variant="h6" gutterBottom>
                  Membership History
                </Typography>
                
                {profileData?.membershipHistory && profileData.membershipHistory.length > 0 ? (
                  <Box>
                    {profileData.membershipHistory.map((history, index) => (
                      <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                        <CardContent>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                              <Typography variant="subtitle2" color="textSecondary">
                                Plan
                              </Typography>
                              <Typography variant="body2">
                                {history.planName}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <Typography variant="subtitle2" color="textSecondary">
                                Period
                              </Typography>
                              <Typography variant="body2">
                                {formatDate(history.startDate)} - {formatDate(history.endDate)}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <Typography variant="subtitle2" color="textSecondary">
                                Amount Paid
                              </Typography>
                              <Typography variant="body2">
                                ${history.amountPaid}
                              </Typography>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No membership history available
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
        
        {/* Password Change Dialog */}
        <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Change Password</DialogTitle>
          <DialogContent>
            <TextField
              label="Current Password"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              fullWidth
              margin="normal"
              type={showPassword.current ? 'text' : 'password'}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility('current')}
                      edge="end"
                    >
                      {showPassword.current ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            <TextField
              label="New Password"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              fullWidth
              margin="normal"
              type={showPassword.new ? 'text' : 'password'}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility('new')}
                      edge="end"
                    >
                      {showPassword.new ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            <TextField
              label="Confirm New Password"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              fullWidth
              margin="normal"
              type={showPassword.confirm ? 'text' : 'password'}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility('confirm')}
                      edge="end"
                    >
                      {showPassword.confirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleChangePassword} 
              variant="contained" 
              color="primary"
              disabled={saving}
            >
              {saving ? 'Changing...' : 'Change Password'}
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
      </Container>
    </MemberLayout>
  );
};

export default Profile;