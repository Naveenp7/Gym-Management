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
  Switch
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
  DeleteSweep
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
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import MemberLayout from '../../components/layouts/MemberLayout';
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
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Count unread notifications
  const unreadCount = notifications.filter(notification => !notification.read).length;
  
  // Set up real-time listener for notifications
  useEffect(() => {
    if (!currentUser) return;
    
    let unsubscribe;
    
    if (autoRefresh) {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', currentUser.uid),
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
        where('userId', '==', currentUser.uid),
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
      <MemberLayout>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <CircularProgress />
          </Box>
        </Container>
      </MemberLayout>
    );
  }
  
  return (
    <MemberLayout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, mb: 3, gap: 2 }}>
          <Typography variant="h4" gutterBottom={false}>
            My Notifications
            {unreadCount > 0 && (
              <Chip 
                label={`${unreadCount} unread`} 
                color="primary" 
                size="small" 
                sx={{ ml: 2, mt: { xs: 1, md: 0 } }}
              />
            )}
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, flexWrap: 'wrap' }}>
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
            >
              Mark All Read
            </Button>
            
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteSweep />}
              onClick={() => setDeleteAllDialogOpen(true)}
              disabled={notifications.filter(n => n.read).length === 0}
            >
              Delete Read
            </Button>
          </Box>
        </Box>
        
        <Paper sx={{ mb: 3 }} elevation={3}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="notification tabs"
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
            >
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
                          <Box sx={{ mt: 1, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}>
                            <Typography
                              component="span"
                              variant="caption"
                              color="text.secondary"
                            >
                              {formatTimestamp(notification.timestamp)}
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
                    ? "You don't have any notifications yet"
                    : tabValue === 1
                    ? "You don't have any unread notifications"
                    : "You don't have any notifications in this category"}
                </Typography>
              </Box>
            )}
          </List>
        </Paper>
        
        {/* Empty state card with tips */}
        {notifications.length === 0 && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                What to expect in your notifications
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mb: 1 }}>
                      <CardMembership />
                    </Avatar>
                    <Typography variant="subtitle1" gutterBottom>
                      Membership Updates
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Renewal reminders, plan changes, and payment confirmations
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <Avatar sx={{ bgcolor: 'success.main', mb: 1 }}>
                      <Event />
                    </Avatar>
                    <Typography variant="subtitle1" gutterBottom>
                      Attendance Records
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Check-in confirmations and attendance streak achievements
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <Avatar sx={{ bgcolor: 'warning.main', mb: 1 }}>
                      <Announcement />
                    </Avatar>
                    <Typography variant="subtitle1" gutterBottom>
                      Gym Announcements
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Special events, holiday hours, and important gym updates
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <Avatar sx={{ bgcolor: 'info.main', mb: 1 }}>
                      <Settings />
                    </Avatar>
                    <Typography variant="subtitle1" gutterBottom>
                      System Notifications
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Account updates, password changes, and security alerts
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </Container>
      
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
              <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
                {notificationDetail.message}
              </Typography>
              {notificationDetail.imageUrl && (
                <Box sx={{ mt: 2, mb: 2, display: 'flex', justifyContent: 'center' }}>
                  <img src={notificationDetail.imageUrl} alt="Notification" style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }} />
                </Box>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Sent:
                  </Typography>
                  <Typography variant="body2">
                    {notificationDetail.timestamp && typeof notificationDetail.timestamp.toDate === 'function' ? format(notificationDetail.timestamp.toDate(), 'PPpp') : 'N/A'}
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
                        Read {notificationDetail.readAt && typeof notificationDetail.readAt.toDate === 'function' && `(${format(notificationDetail.readAt.toDate(), 'PPpp')})`}
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
                
                {notificationDetail.createdByName && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="textSecondary">
                      From:
                    </Typography>
                    <Typography variant="body2">
                      {notificationDetail.createdByName}
                    </Typography>
                  </Grid>
                )}
                
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

export default Notifications;