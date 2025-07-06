import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  CardHeader,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Snackbar,
  Alert,
  CircularProgress,
  Tooltip,
  Divider,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  Add, 
  Edit, 
  Delete, 
  CalendarToday,
  AttachMoney,
  Check,
  FitnessCenter,
  Pool,
  DirectionsRun,
  SportsGymnastics,
  LocalCafe,
  Shower,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  Timestamp,
  orderBy,
  addDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/layouts/AdminLayout';

const MembershipPlans = () => {
  const { currentUser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'edit'
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 30, // in days
    durationType: 'days',
    price: '',
    features: [],
    isActive: true,
    color: '#2196f3',
    showOnWebsite: true,
    maxMembers: 0, // 0 means unlimited
    newFeature: ''
  });

  // Fetch plans from Firestore
  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      
      const plansQuery = query(
        collection(db, 'membershipPlans'),
        orderBy('createdAt', 'desc')
      );
      
      const plansSnapshot = await getDocs(plansQuery);
      const plansData = plansSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));
      
      setPlans(plansData);
    } catch (error) {
      console.error('Error fetching plans:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching plans: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Open dialog for adding new plan
  const handleAddPlan = () => {
    setDialogMode('add');
    setFormData({
      name: '',
      description: '',
      duration: 30,
      durationType: 'days',
      price: '',
      features: [
        'Access to gym equipment',
        'Locker room access'
      ],
      isActive: true,
      color: '#2196f3',
      showOnWebsite: true,
      maxMembers: 0,
      newFeature: ''
    });
    setOpenDialog(true);
  };

  // Open dialog for editing plan
  const handleEditPlan = (plan) => {
    setDialogMode('edit');
    setSelectedPlan(plan);
    
    setFormData({
      name: plan.name || '',
      description: plan.description || '',
      duration: plan.duration || 30,
      durationType: plan.durationType || 'days',
      price: plan.price || '',
      features: plan.features || [],
      isActive: plan.isActive !== undefined ? plan.isActive : true,
      color: plan.color || '#2196f3',
      showOnWebsite: plan.showOnWebsite !== undefined ? plan.showOnWebsite : true,
      maxMembers: plan.maxMembers || 0,
      newFeature: ''
    });
    
    setOpenDialog(true);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Add a new feature to the list
  const handleAddFeature = () => {
    if (formData.newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, formData.newFeature.trim()],
        newFeature: ''
      });
    }
  };

  // Remove a feature from the list
  const handleRemoveFeature = (index) => {
    const updatedFeatures = [...formData.features];
    updatedFeatures.splice(index, 1);
    setFormData({
      ...formData,
      features: updatedFeatures
    });
  };

  // Save plan data
  const handleSavePlan = async () => {
    try {
      setLoading(true);
      
      // Validate form data
      if (!formData.name || !formData.duration || !formData.price) {
        setSnackbar({
          open: true,
          message: 'Please fill in all required fields',
          severity: 'error'
        });
        setLoading(false);
        return;
      }
      
      // Prepare plan data
      const planData = {
        name: formData.name,
        description: formData.description,
        duration: parseInt(formData.duration),
        durationType: formData.durationType,
        price: parseFloat(formData.price),
        features: formData.features,
        isActive: formData.isActive,
        color: formData.color,
        showOnWebsite: formData.showOnWebsite,
        maxMembers: parseInt(formData.maxMembers),
        updatedAt: Timestamp.now()
      };
      
      if (dialogMode === 'add') {
        // Add new plan to Firestore
        planData.createdAt = Timestamp.now();
        planData.createdBy = currentUser.uid;
        
        await addDoc(collection(db, 'membershipPlans'), planData);
        
        setSnackbar({
          open: true,
          message: 'Membership plan added successfully!',
          severity: 'success'
        });
      } else if (dialogMode === 'edit') {
        // Update existing plan in Firestore
        await updateDoc(doc(db, 'membershipPlans', selectedPlan.id), planData);
        
        setSnackbar({
          open: true,
          message: 'Membership plan updated successfully!',
          severity: 'success'
        });
      }
      
      // Close dialog and refresh plans list
      setOpenDialog(false);
      fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      setSnackbar({
        open: true,
        message: 'Error saving plan: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (plan) => {
    setPlanToDelete(plan);
    setDeleteConfirmOpen(true);
  };

  // Delete plan
  const handleDeletePlan = async () => {
    try {
      setLoading(true);
      
      // Delete plan from Firestore
      await deleteDoc(doc(db, 'membershipPlans', planToDelete.id));
      
      setSnackbar({
        open: true,
        message: 'Membership plan deleted successfully!',
        severity: 'success'
      });
      
      // Close dialog and refresh plans list
      setDeleteConfirmOpen(false);
      fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      setSnackbar({
        open: true,
        message: 'Error deleting plan: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Format duration for display
  const formatDuration = (duration, type) => {
    if (type === 'days') {
      if (duration === 30) return '1 Month';
      if (duration === 90) return '3 Months';
      if (duration === 180) return '6 Months';
      if (duration === 365) return '1 Year';
      return `${duration} Days`;
    } else if (type === 'months') {
      return duration === 1 ? '1 Month' : `${duration} Months`;
    } else if (type === 'years') {
      return duration === 1 ? '1 Year' : `${duration} Years`;
    }
    return `${duration} ${type}`;
  };

  // Get icon for feature
  const getFeatureIcon = (feature) => {
    const lowerFeature = feature.toLowerCase();
    if (lowerFeature.includes('gym') || lowerFeature.includes('equipment')) return <FitnessCenter />;
    if (lowerFeature.includes('pool') || lowerFeature.includes('swim')) return <Pool />;
    if (lowerFeature.includes('run') || lowerFeature.includes('cardio')) return <DirectionsRun />;
    if (lowerFeature.includes('class') || lowerFeature.includes('train')) return <SportsGymnastics />;
    if (lowerFeature.includes('cafe') || lowerFeature.includes('drink')) return <LocalCafe />;
    if (lowerFeature.includes('shower') || lowerFeature.includes('locker')) return <Shower />;
    return <Check />;
  };

  return (
    <AdminLayout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Membership Plans
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" paragraph>
          Create and manage gym membership plans
        </Typography>
        
        {/* Actions Bar */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={handleAddPlan}
          >
            Add New Plan
          </Button>
        </Box>
        
        {/* Plans Grid */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
            <CircularProgress />
          </Box>
        ) : plans.length > 0 ? (
          <Grid container spacing={3}>
            {plans.map((plan) => (
              <Grid item xs={12} sm={6} md={4} key={plan.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    opacity: plan.isActive ? 1 : 0.7,
                    borderTop: `4px solid ${plan.color || '#2196f3'}`
                  }}
                  elevation={3}
                >
                  {!plan.isActive && (
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        top: 10, 
                        right: 10, 
                        bgcolor: 'error.main', 
                        color: 'white',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}
                    >
                      INACTIVE
                    </Box>
                  )}
                  
                  {!plan.showOnWebsite && (
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        top: 10, 
                        left: 10, 
                        display: 'flex',
                        alignItems: 'center',
                        color: 'text.secondary',
                        fontSize: '0.75rem'
                      }}
                    >
                      <VisibilityOff fontSize="small" sx={{ mr: 0.5 }} />
                      Hidden
                    </Box>
                  )}
                  
                  <CardHeader
                    title={plan.name}
                    titleTypographyProps={{ variant: 'h6' }}
                    subheader={formatDuration(plan.duration, plan.durationType)}
                    sx={{ pb: 0 }}
                  />
                  
                  <CardContent sx={{ flexGrow: 1, pt: 1 }}>
                    <Typography variant="h5" color="primary" gutterBottom>
                      ${plan.price}
                    </Typography>
                    
                    {plan.description && (
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {plan.description}
                      </Typography>
                    )}
                    
                    <Divider sx={{ my: 1.5 }} />
                    
                    <List dense>
                      {plan.features && plan.features.map((feature, index) => (
                        <ListItem key={index} disableGutters>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            {getFeatureIcon(feature)}
                          </ListItemIcon>
                          <ListItemText primary={feature} />
                        </ListItem>
                      ))}
                    </List>
                    
                    {plan.maxMembers > 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Limited to {plan.maxMembers} members
                      </Typography>
                    )}
                  </CardContent>
                  
                  <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
                    <Tooltip title="Edit Plan">
                      <IconButton onClick={() => handleEditPlan(plan)} color="primary">
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Plan">
                      <IconButton onClick={() => handleDeleteClick(plan)} color="error">
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Paper sx={{ p: 3, textAlign: 'center' }} elevation={3}>
            <Typography variant="h6" color="textSecondary">
              No membership plans found
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Create your first membership plan to get started
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={handleAddPlan}
              sx={{ mt: 2 }}
            >
              Add New Plan
            </Button>
          </Paper>
        )}
      </Container>
      
      {/* Add/Edit Plan Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New Membership Plan' : 'Edit Membership Plan'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="name"
                label="Plan Name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                required
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="price"
                label="Price"
                value={formData.price}
                onChange={handleInputChange}
                fullWidth
                required
                margin="normal"
                type="number"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="duration"
                label="Duration"
                value={formData.duration}
                onChange={handleInputChange}
                fullWidth
                required
                margin="normal"
                type="number"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Duration Type</InputLabel>
                <Select
                  name="durationType"
                  value={formData.durationType}
                  onChange={handleInputChange}
                  label="Duration Type"
                >
                  <MenuItem value="days">Days</MenuItem>
                  <MenuItem value="months">Months</MenuItem>
                  <MenuItem value="years">Years</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="color"
                label="Color"
                value={formData.color}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                type="color"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="maxMembers"
                label="Maximum Members (0 for unlimited)"
                value={formData.maxMembers}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                type="number"
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                value={formData.description}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={2}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Plan Features
              </Typography>
              <Box sx={{ display: 'flex', mb: 2 }}>
                <TextField
                  name="newFeature"
                  label="Add Feature"
                  value={formData.newFeature}
                  onChange={handleInputChange}
                  fullWidth
                  size="small"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddFeature();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleAddFeature}
                  sx={{ ml: 1 }}
                >
                  Add
                </Button>
              </Box>
              <Paper variant="outlined" sx={{ p: 2, maxHeight: '200px', overflow: 'auto' }}>
                {formData.features.length > 0 ? (
                  <List dense>
                    {formData.features.map((feature, index) => (
                      <ListItem 
                        key={index}
                        secondaryAction={
                          <IconButton edge="end" onClick={() => handleRemoveFeature(index)} size="small">
                            <Delete fontSize="small" />
                          </IconButton>
                        }
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {getFeatureIcon(feature)}
                        </ListItemIcon>
                        <ListItemText primary={feature} />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="textSecondary" align="center">
                    No features added yet
                  </Typography>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    name="isActive"
                    color="primary"
                  />
                }
                label="Active Plan"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.showOnWebsite}
                    onChange={handleInputChange}
                    name="showOnWebsite"
                    color="primary"
                  />
                }
                label="Show on Website"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSavePlan} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete the plan: <strong>{planToDelete?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            This action cannot be undone. The plan will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeletePlan} 
            variant="contained" 
            color="error"
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
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
    </AdminLayout>
  );
};

export default MembershipPlans;