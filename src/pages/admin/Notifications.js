import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Divider,
  Button,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  Badge,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
  Tooltip,
  FormControlLabel,
  Switch,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Fab
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsActive,
  NotificationsOff,
  Delete,
  MoreVert,
  CheckCircle,
  Info,
  Warning,
  Error as ErrorIcon,
  Event,
  CardMembership,
  Announcement,
  Settings,
  MarkEmailRead,
  DeleteSweep,
  Add,
  Send,
  People,
  Person,
  Group
} from '@mui/icons-material';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  writeBatch,
  Timestamp,
  onSnapshot,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/layouts/AdminLayout';
import { format, formatDistanceToNow } from 'date-fns';

const Notifications = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [notificationDetailOpen, setNotificationDetailOpen] = useState(false);
  const [notificationDetail, setNotificationDetail] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // New notification form state
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'announcement',
    priority: 'normal',
    recipients: 'all',
    selectedMembers: []
  });
  
  // Count unread notifications
  const unreadCount = notifications.filter(notification => !notification.read).length;
  
  // Set up real-time listener for notifications
  useEffect(() => {
    if (!currentUser) return;
    
    let unsubscribe;
    
    if (autoRefresh) {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('adminView', '==', true),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      
      unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
        const notificationsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        }));
        
        setNotifications(notificationsList);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching notifications:', error);
        setSnackbar({
          open: true,
          message: 'Error fetching notifications: ' + error.message,
          severity: 'error'
        });
        setLoading(false);
      });
    } else {
      // If auto-refresh is disabled, fetch notifications once
      fetchNotifications();
    }
    
    // Fetch members for notification creation
    fetchMembers();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser, autoRefresh]);
  
  // Filter notifications when tab changes
  useEffect(() => {
    filterNotifications();
  }, [tabValue, notifications]);
  
  // Fetch notifications from Firestore
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('adminView', '==', true),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      
      const notificationsSnapshot = await getDocs(notificationsQuery);
      
      const notificationsList = notificationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      
      setNotifications(notificationsList);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching notifications: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch members for notification creation
  const fetchMembers = async () => {
     try {
       // Query the 'members' collection which is the source of truth for member data.
       const membersQuery = query(
         collection(db, 'members'),
         orderBy('name', 'asc')
       );
       
       const membersSnapshot = await getDocs(membersQuery);
       
       const membersList = membersSnapshot.docs.map(doc => ({
         id: doc.id,
         ...doc.data(),
         // Add a 'displayName' field for the dropdown component to use.
         displayName: doc.data().name || doc.data().email
       }));
       
       setMembers(membersList);
     } catch (error) {
       console.error('Error fetching members:', error);
       setSnackbar({ open: true, message: 'Could not load member list for notifications.', severity: 'warning' });
     }
   };
  
  // Filter notifications based on selected tab
  const filterNotifications = () => {
    switch (tabValue) {
      case 0: // All
        setFilteredNotifications(notifications);
        break;
      case 1: // Unread
        setFilteredNotifications(notifications.filter(notification => !notification.read));
        break;
      case 2: // Membership
        setFilteredNotifications(notifications.filter(notification => 
          notification.type === 'membership' || notification.category === 'membership'
        ));
        break;
      case 3: // Attendance
        setFilteredNotifications(notifications.filter(notification => 
          notification.type === 'attendance' || notification.category === 'attendance'
        ));
        break;
      case 4: // Announcements
        setFilteredNotifications(notifications.filter(notification => 
          notification.type === 'announcement' || notification.category === 'announcement'
        ));
        break;
      case 5: // System
        setFilteredNotifications(notifications.filter(notification => 
          notification.type === 'system' || notification.category === 'system'
        ));
        break;
      default:
        setFilteredNotifications(notifications);
    }
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Open notification menu
  const handleMenuOpen = (event, notification) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedNotification(notification);
  };
  
  // Close notification menu
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedNotification(null);
  };
  
  // Mark notification as read
  const markAsRead = async (notification) => {
    try {
      await updateDoc(doc(db, 'notifications', notification.id), {
        read: true,
        readAt: Timestamp.now()
      });
      
      // Update local state
      setNotifications(notifications.map(item => 
        item.id === notification.id ? { ...item, read: true, readAt: new Date() } : item
      ));
      
      handleMenuClose();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      setSnackbar({
        open: true,
        message: 'Error marking notification as read: ' + error.message,
        severity: 'error'
      });
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      const unreadNotifications = notifications.filter(notification => !notification.read);
      
      unreadNotifications.forEach(notification => {
        const notificationRef = doc(db, 'notifications', notification.id);
        batch.update(notificationRef, {
          read: true,
          readAt: Timestamp.now()
        });
      });
      
      await batch.commit();
      
      // Update local state
      setNotifications(notifications.map(item => 
        !item.read ? { ...item, read: true, readAt: new Date() } : item
      ));
      
      setSnackbar({
        open: true,
        message: `Marked ${unreadNotifications.length} notifications as read`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      setSnackbar({
        open: true,
        message: 'Error marking all notifications as read: ' + error.message,
        severity: 'error'
      });
    }
  };
  
  // Delete notification
  const deleteNotification = async () => {
    try {
      await deleteDoc(doc(db, 'notifications', selectedNotification.id));
      
      // Update local state
      setNotifications(notifications.filter(item => item.id !== selectedNotification.id));
      
      setSnackbar({
        open: true,
        message: 'Notification deleted successfully',
        severity: 'success'
      });
      
      handleMenuClose();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting notification:', error);
      setSnackbar({
        open: true,
        message: 'Error deleting notification: ' + error.message,
        severity: 'error'
      });
    }
  };
  
  // Delete all read notifications
  const deleteAllReadNotifications = async () => {
    try {
      const batch = writeBatch(db);
      const readNotifications = notifications.filter(notification => notification.read);
      
      readNotifications.forEach(notification => {
        const notificationRef = doc(db, 'notifications', notification.id);
        batch.delete(notificationRef);
      });
      
      await batch.commit();
      
      // Update local state
      setNotifications(notifications.filter(item => !item.read));
      
      setSnackbar({
        open: true,
        message: `Deleted ${readNotifications.length} read notifications`,
        severity: 'success'
      });
      
      setDeleteAllDialogOpen(false);
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      setSnackbar({
        open: true,
        message: 'Error deleting read notifications: ' + error.message,
        severity: 'error'
      });
    }
  };
  
  // View notification details
  const viewNotificationDetails = (notification) => {
    setNotificationDetail(notification);
    setNotificationDetailOpen(true);
    
    // Mark as read if not already read
    if (!notification.read) {
      markAsRead(notification);
    }
    
    handleMenuClose();
  };
  
  // Handle new notification form change
  const handleNewNotificationChange = (e) => {
    const { name, value } = e.target;
    setNewNotification({
      ...newNotification,
      [name]: value
    });
  };
  
  // Create new notification
  const createNotification = async () => {
    try {
      if (!newNotification.title || !newNotification.message) {
        setSnackbar({
          open: true,
          message: 'Please fill in all required fields',
          severity: 'error'
        });
        return;
      }
      
      // Determine recipients
      let recipientIds = [];
      
      if (newNotification.recipients === 'all') {
        // All members
        recipientIds = members.map(member => member.id);
      } else if (newNotification.recipients === 'selected' && newNotification.selectedMembers.length > 0) {
        // Selected members
        recipientIds = newNotification.selectedMembers;
      } else if (newNotification.recipients === 'selected' && newNotification.selectedMembers.length === 0) {
        setSnackbar({
          open: true,
          message: 'Please select at least one member',
          severity: 'error'
        });
        return;
      }
      
      // Create notifications for each recipient
      const batch = writeBatch(db);

      for (const userId of recipientIds) {
        const member = members.find(m => m.id === userId); // Find the member details
        const notificationData = {
          title: newNotification.title,
          message: newNotification.message,
          type: newNotification.type,
          category: newNotification.type, // For backward compatibility
          priority: newNotification.priority,
          userId: userId,
          adminView: true, // For admin to see in their list
          read: false,
          timestamp: serverTimestamp(),
          createdBy: currentUser.uid,
          createdByName: currentUser.displayName || 'Admin',
          // Set the recipient's name for display purposes in the admin list
          userName: member ? member.displayName : 'Unknown Member'
        };

        const notificationRef = doc(collection(db, 'notifications'));
        batch.set(notificationRef, notificationData);
      }

      await batch.commit();
      
      setSnackbar({
        open: true,
        message: `Notification sent to ${recipientIds.length} members`,
        severity: 'success'
      });
      
      // Reset form and close dialog
      setNewNotification({
        title: '',
        message: '',
        type: 'announcement',
        priority: 'normal',
        recipients: 'all',
        selectedMembers: []
      });
      
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating notification:', error);
      setSnackbar({
        open: true,
        message: 'Error creating notification: ' + error.message,
        severity: 'error'
      });
    }
  };
  
  // Get avatar icon based on notification type
  const getNotificationAvatar = (notification) => {
    switch (notification.type || notification.category) {
      case 'membership':
        return <CardMembership />;
      case 'attendance':
        return <Event />;
      case 'announcement':
        return <Announcement />;
      case 'system':
        return <Settings />;
      default:
        return <Info />;
    }
  };
  
  // Get avatar color based on notification priority
  const getAvatarColor = (notification) => {
    switch (notification.priority) {
      case 'high':
        return 'error.main';
      case 'medium':
        return 'warning.main';
      case 'low':
        return 'success.main';
      default:
        return 'primary.main';
    }
  };
  
  // Get notification status icon
  const getStatusIcon = (notification) => {
    if (!notification.read) {
      return (
        <Tooltip title="Unread">
          <NotificationsActive color="primary" fontSize="small" />
        </Tooltip>
      );
    }
    return null;
  };
  
  // Format notification timestamp
  const formatTimestamp = (timestamp) => {
    return formatDistanceToNow(timestamp, { addSuffix: true });
  };
  
  // Render loading state
  if (loading) {
    return (
      <AdminLayout>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <CircularProgress />
          </Box>
        </Container>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Notification Management
            {unreadCount > 0 && (
              <Chip 
                label={`${unreadCount} unread`} 
                color="primary" 
                size="small" 
                sx={{ ml: 2 }}
              />
            )}
          </Typography>
          
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  color="primary"
                />
              }
              label="Auto-refresh"
            />
            
            <Button
              variant="outlined"
              startIcon={<MarkEmailRead />}
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              sx={{ mr: 1 }}
            >
              Mark All Read
            </Button>
            
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteSweep />}
              onClick={() => setDeleteAllDialogOpen(true)}
              disabled={notifications.filter(n => n.read).length === 0}
              sx={{ mr: 1 }}
            >
              Delete Read
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Notification
            </Button>
          </Box>
        </Box>
        
        <Paper sx={{ mb: 3 }} elevation={3}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="notification tabs">
              <Tab 
                label="All" 
                icon={<Badge badgeContent={notifications.length} color="primary">
                  <NotificationsIcon />
                </Badge>} 
              />
              <Tab 
                label="Unread" 
                icon={<Badge badgeContent={unreadCount} color="error">
                  <NotificationsActive />
                </Badge>} 
                disabled={unreadCount === 0}
              />
              <Tab 
                label="Membership" 
                icon={<CardMembership />} 
                disabled={!notifications.some(n => n.type === 'membership' || n.category === 'membership')}
              />
              <Tab 
                label="Attendance" 
                icon={<Event />} 
                disabled={!notifications.some(n => n.type === 'attendance' || n.category === 'attendance')}
              />
              <Tab 
                label="Announcements" 
                icon={<Announcement />} 
                disabled={!notifications.some(n => n.type === 'announcement' || n.category === 'announcement')}
              />
              <Tab 
                label="System" 
                icon={<Settings />} 
                disabled={!notifications.some(n => n.type === 'system' || n.category === 'system')}
              />
            </Tabs>
          </Box>
          
          <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem 
                    alignItems="flex-start"
                    sx={{
                      bgcolor: notification.read ? 'inherit' : 'action.hover',
                      transition: 'background-color 0.3s',
                      '&:hover': {
                        bgcolor: 'action.selected',
                      },
                    }}
                    button
                    onClick={() => viewNotificationDetails(notification)}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: getAvatarColor(notification) }}>
                        {getNotificationAvatar(notification)}
                      </Avatar>
                    </ListItemAvatar>
                    
                    <ListItemText
                      secondaryTypographyProps={{ component: 'div' }}
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography
                            variant="subtitle1"
                            component="span"
                            sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}
                          >
                            {notification.title}
                          </Typography>
                          {getStatusIcon(notification)}
                        </Box>
                      }
                      secondary={
                        <React.Fragment>
                          <Typography
                            sx={{ display: 'inline' }}
                            component="span"
                            variant="body2"
                            color="text.primary"
                          >
                            {notification.message && notification.message.length > 100
                              ? `${notification.message.substring(0, 100)}...`
                              : notification.message}
                          </Typography>
                          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                            <Typography
                              component="span"
                              variant="caption"
                              color="text.secondary"
                            >
                              {formatTimestamp(notification.timestamp)}
                            </Typography>
                            
                            <Typography
                              component="span"
                              variant="caption"
                              color="text.secondary"
                            >
                              Recipient: {notification.userName || 'Unknown'}
                            </Typography>
                          </Box>
                        </React.Fragment>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={(e) => handleMenuOpen(e, notification)}>
                        <MoreVert />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  {index < filteredNotifications.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))
            ) : (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <NotificationsOff sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="textSecondary">
                  No notifications found
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {tabValue === 0
                    ? "There are no notifications yet"
                    : tabValue === 1
                    ? "There are no unread notifications"
                    : "No notifications in this category"}
                </Typography>
              </Box>
            )}
          </List>
        </Paper>
      </Container>
      
      {/* Floating Action Button for creating notifications */}
      <Fab 
        color="primary" 
        aria-label="add" 
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setCreateDialogOpen(true)}
      >
        <Add />
      </Fab>
      
      {/* Notification Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => viewNotificationDetails(selectedNotification)}>
          <Info fontSize="small" sx={{ mr: 1 }} /> View Details
        </MenuItem>
        
        {selectedNotification && !selectedNotification.read && (
          <MenuItem onClick={() => markAsRead(selectedNotification)}>
            <CheckCircle fontSize="small" sx={{ mr: 1 }} /> Mark as Read
          </MenuItem>
        )}
        
        <MenuItem onClick={() => { handleMenuClose(); setDeleteDialogOpen(true); }}>
          <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Notification</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this notification? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={deleteNotification} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete All Read Notifications Dialog */}
      <Dialog
        open={deleteAllDialogOpen}
        onClose={() => setDeleteAllDialogOpen(false)}
      >
        <DialogTitle>Delete Read Notifications</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete all read notifications? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAllDialogOpen(false)}>Cancel</Button>
          <Button onClick={deleteAllReadNotifications} color="error">
            Delete All Read
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification Detail Dialog */}
      <Dialog
        open={notificationDetailOpen}
        onClose={() => setNotificationDetailOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        {notificationDetail && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: getAvatarColor(notificationDetail), mr: 2 }}>
                  {getNotificationAvatar(notificationDetail)}
                </Avatar>
                {notificationDetail.title}
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" paragraph>
                {notificationDetail.message}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Sent:
                  </Typography>
                  <Typography variant="body2">
                    {format(notificationDetail.timestamp, 'PPpp')}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Status:
                  </Typography>
                  <Typography variant="body2">
                    {notificationDetail.read ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CheckCircle fontSize="small" color="success" sx={{ mr: 0.5 }} />
                        Read {notificationDetail.readAt && `(${format(notificationDetail.readAt, 'PPpp')})`}
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <NotificationsActive fontSize="small" color="primary" sx={{ mr: 0.5 }} />
                        Unread
                      </Box>
                    )}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Type:
                  </Typography>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {notificationDetail.type || notificationDetail.category || 'General'}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Priority:
                  </Typography>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {notificationDetail.priority || 'Normal'}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Recipient:
                  </Typography>
                  <Typography variant="body2">
                    {notificationDetail.userName || 'Unknown'}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Created By:
                  </Typography>
                  <Typography variant="body2">
                    {notificationDetail.createdByName || 'System'}
                  </Typography>
                </Grid>
                
                {notificationDetail.link && (
                  <Grid item xs={12}>
                    <Button 
                      variant="outlined" 
                      fullWidth
                      onClick={() => {
                        window.location.href = notificationDetail.link;
                        setNotificationDetailOpen(false);
                      }}
                    >
                      View Related Content
                    </Button>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setNotificationDetailOpen(false)}>Close</Button>
              <Button 
                color="error" 
                onClick={() => {
                  setSelectedNotification(notificationDetail);
                  setNotificationDetailOpen(false);
                  setDeleteDialogOpen(true);
                }}
              >
                Delete
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      
      {/* Create Notification Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Notification</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                name="title"
                value={newNotification.title}
                onChange={handleNewNotificationChange}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Message"
                name="message"
                value={newNotification.message}
                onChange={handleNewNotificationChange}
                multiline
                rows={4}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  name="type"
                  value={newNotification.type}
                  label="Type"
                  onChange={handleNewNotificationChange}
                >
                  <MenuItem value="announcement">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Announcement sx={{ mr: 1 }} /> Announcement
                    </Box>
                  </MenuItem>
                  <MenuItem value="membership">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CardMembership sx={{ mr: 1 }} /> Membership
                    </Box>
                  </MenuItem>
                  <MenuItem value="attendance">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Event sx={{ mr: 1 }} /> Attendance
                    </Box>
                  </MenuItem>
                  <MenuItem value="system">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Settings sx={{ mr: 1 }} /> System
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  name="priority"
                  value={newNotification.priority}
                  label="Priority"
                  onChange={handleNewNotificationChange}
                >
                  <MenuItem value="low">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CheckCircle sx={{ mr: 1, color: 'success.main' }} /> Low
                    </Box>
                  </MenuItem>
                  <MenuItem value="normal">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Info sx={{ mr: 1, color: 'primary.main' }} /> Normal
                    </Box>
                  </MenuItem>
                  <MenuItem value="medium">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Warning sx={{ mr: 1, color: 'warning.main' }} /> Medium
                    </Box>
                  </MenuItem>
                  <MenuItem value="high">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ErrorIcon sx={{ mr: 1, color: 'error.main' }} /> High
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Recipients</InputLabel>
                <Select
                  name="recipients"
                  value={newNotification.recipients}
                  label="Recipients"
                  onChange={handleNewNotificationChange}
                >
                  <MenuItem value="all">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <People sx={{ mr: 1 }} /> All Members
                    </Box>
                  </MenuItem>
                  <MenuItem value="selected">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Person sx={{ mr: 1 }} /> Selected Members
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {newNotification.recipients === 'selected' && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Select Members</InputLabel>
                  <Select
                    multiple
                    name="selectedMembers"
                    value={newNotification.selectedMembers}
                    label="Select Members"
                    onChange={(e) => setNewNotification({
                      ...newNotification,
                      selectedMembers: e.target.value
                    })}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const member = members.find(m => m.id === value);
                          return (
                            <Chip 
                              key={value} 
                              label={member ? (member.displayName || member.email) : value} 
                              size="small" 
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {members.map((member) => (
                      <MenuItem key={member.id} value={member.id}>
                        {member.displayName || member.email}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={createNotification} 
            color="primary" 
            variant="contained"
            startIcon={<Send />}
          >
            Send Notification
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

export default Notifications;