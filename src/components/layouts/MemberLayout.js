import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
  useMediaQuery,
  useTheme,
  Container,
  Button,
  Chip,
  Paper,
  BottomNavigation,
  BottomNavigationAction
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  QrCodeScanner as QrCodeScannerIcon,
  CalendarMonth as CalendarIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  AccountCircle,
  Help as HelpIcon,
  Home as HomeIcon,
  Settings as SettingsIcon,
  FitnessCenter as FitnessCenterIcon,
  History as HistoryIcon,
  Payment as PaymentIcon,
  Message as MessageIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import NotificationMenu from '../common/NotificationMenu';

// Drawer width
const drawerWidth = 240;

const MemberLayout = ({ children }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State
  const [open, setOpen] = useState(!isMobile);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [anchorElNotifications, setAnchorElNotifications] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [memberData, setMemberData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch member data and notifications
  useEffect(() => {
    if (!currentUser) return;
    
    // Set up a real-time listener for the member's data to ensure UI is always up-to-date
    const memberDocRef = doc(db, 'members', currentUser.uid);
    const memberUnsubscribe = onSnapshot(memberDocRef, (doc) => {
      if (doc.exists()) {
        setMemberData({
          id: doc.id,
          ...doc.data()
        });
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching member data in real-time:', error);
      setLoading(false);
    });
    
    // Set up real-time listener for notifications
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    
    const notificationsUnsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      try {
        const notificationsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        }));
        setNotifications(notificationsList);
      } catch (error) {
        console.error('Error processing notifications snapshot:', error);
      }
    }, (error) => {
      console.error('Error fetching notifications:', error);
    });
    
    // Cleanup listeners on unmount
    return () => {
      memberUnsubscribe();
      notificationsUnsubscribe();
    };
  }, [currentUser]);
  
  // Handle drawer open/close
  const handleDrawerOpen = () => {
    setOpen(true);
  };
  
  const handleDrawerClose = () => {
    setOpen(false);
  };
  
  // Handle user menu open/close
  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };
  
  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };
  
  // Handle notifications menu open/close
  const handleOpenNotificationsMenu = (event) => {
    setAnchorElNotifications(event.currentTarget);
  };
  
  const handleCloseNotificationsMenu = () => {
    setAnchorElNotifications(null);
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };
  
  // Check if a route is active
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  // Main menu items
  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/member/dashboard',
      active: isActive('/member/dashboard')
    },
    {
      text: 'Scan QR Code',
      icon: <QrCodeScannerIcon />,
      path: '/member/qr-scanner',
      active: isActive('/member/qr-scanner')
    },
    {
      text: 'Attendance History',
      icon: <HistoryIcon />,
      path: '/member/attendance-history',
      active: isActive('/member/attendance-history')
    },
    {
      text: 'Class Schedule',
      icon: <CalendarIcon />,
      path: '/member/schedule',
      active: isActive('/member/schedule')
    },
    {
      text: 'Workout Plans',
      icon: <FitnessCenterIcon />,
      path: '/member/workout-plans',
      active: isActive('/member/workout-plans')
    },
    {
      text: 'Membership',
      icon: <PaymentIcon />,
      path: '/member/membership',
      active: isActive('/member/membership')
    },
    {
      text: 'Notifications',
      icon: <NotificationsIcon />,
      path: '/member/notifications',
      active: isActive('/member/notifications')
    },
    {
      text: 'Profile',
      icon: <PersonIcon />,
      path: '/member/profile',
      active: isActive('/member/profile')
    }
  ];
  
  // Secondary menu items
  const secondaryMenuItems = [
    {
      text: 'Help & Support',
      icon: <HelpIcon />,
      path: '/member/help-support',
      active: isActive('/member/help-support')
    },
    {
      text: 'Contact Us',
      icon: <MessageIcon />,
      path: '/member/contact-us',
      active: isActive('/member/contact-us')
    },
    {
      text: 'Back to Home',
      icon: <HomeIcon />,
      path: '/',
      active: isActive('/')
    }
  ];
  
  // Count unread notifications
  const unreadNotifications = notifications.filter(notification => !notification.read).length;
  
  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ...(open && {
            marginLeft: drawerWidth,
            width: `calc(100% - ${drawerWidth}px)`,
            transition: theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{
              marginRight: 5,
              ...(open && { display: 'none' }),
            }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}
          >
            GymTrack Pro - Member Portal
          </Typography>
          
          {/* Membership Status */}
          {memberData && memberData.membershipEnd && (
            <Chip 
              label={`Membership: ${new Date(memberData.membershipEnd.toDate()) > new Date() ? 'Active' : 'Expired'}`}
              color={new Date(memberData.membershipEnd.toDate()) > new Date() ? 'success' : 'error'}
              size="small"
              sx={{ mr: 2 }}
            />
          )}
          
          {/* Notifications */}
          <Box sx={{ flexGrow: 0, mr: 2 }}>
            <Tooltip title="Notifications">
              <IconButton onClick={handleOpenNotificationsMenu} sx={{ p: 0 }} color="inherit">
                <Badge badgeContent={unreadNotifications} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <NotificationMenu
              anchorEl={anchorElNotifications}
              open={Boolean(anchorElNotifications)}
              onClose={handleCloseNotificationsMenu}
              notifications={notifications}
              onViewAll={() => {
                handleCloseNotificationsMenu();
                navigate('/member/notifications');
              }}
              onNotificationClick={() => {
                handleCloseNotificationsMenu();
                navigate('/member/notifications');
              }}
            />
          </Box>
          
          {/* User Menu */}
          <Box sx={{ flexGrow: 0 }}>
            <Tooltip title="Open settings">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar 
                  alt={memberData?.name || currentUser?.displayName || 'Member'} 
                  src={memberData?.profileImageUrl || currentUser?.photoURL} 
                />
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: '45px' }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle1">{memberData?.name || currentUser?.displayName || 'Member'}</Typography>
                <Typography variant="body2" color="text.secondary">{currentUser?.email}</Typography>
              </Box>
              <Divider />
              <MenuItem onClick={() => { handleCloseUserMenu(); navigate('/member/profile'); }}>
                <ListItemIcon>
                  <AccountCircle fontSize="small" />
                </ListItemIcon>
                <ListItemText>Profile</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { handleCloseUserMenu(); navigate('/member/settings'); }}>
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Settings</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Logout</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* Drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={open}
        onClose={handleDrawerClose}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: '#1e293b',
            color: 'white',
          },
        }}
      >
        <Toolbar
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: [1],
            backgroundColor: '#1e293b',
            color: 'white',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
            <Typography variant="h6" noWrap component="div">
              GymTrack Pro
            </Typography>
          </Box>
          <IconButton onClick={handleDrawerClose} sx={{ color: 'white' }}>
            <ChevronLeftIcon />
          </IconButton>
        </Toolbar>
        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />
        
        {/* User Info */}
        {memberData && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Avatar
              src={memberData?.profileImageUrl || currentUser?.photoURL}
              alt={memberData?.name || currentUser?.displayName || 'Member'}
              sx={{ width: 80, height: 80, mx: 'auto', mb: 1 }}
            />
            <Typography variant="h6">
              {memberData?.name || currentUser?.displayName || 'Member'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              {memberData.membershipPlan || 'Basic Membership'}
            </Typography>
            {memberData.membershipEnd && (
              <Chip 
                label={`Expires: ${new Date(memberData.membershipEnd.toDate()).toLocaleDateString()}`}
                color={new Date(memberData.membershipEnd.toDate()) > new Date() ? 'primary' : 'error'}
                size="small"
                sx={{ mt: 1 }}
              />
            )}
          </Box>
        )}
        
        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)', my: 1 }} />
        
        {/* Main Menu Items */}
        <List sx={{ px: 1 }}>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                component={RouterLink}
                to={item.path}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  bgcolor: item.active ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  color: 'white',
                  borderLeft: item.active ? '3px solid #1976d2' : 'none',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.08)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'white' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
                {item.text === 'Notifications' && unreadNotifications > 0 && (
                  <Badge badgeContent={unreadNotifications} color="error" />
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        
        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)', my: 1 }} />
        
        {/* Secondary Menu Items */}
        <List sx={{ px: 1 }}>
          {secondaryMenuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                component={RouterLink}
                to={item.path}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  bgcolor: item.active ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.08)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'white' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          pb: { xs: 8, sm: 3 }, // Add padding bottom for mobile to avoid content being hidden by bottom nav
          width: { sm: `calc(100% - ${open ? drawerWidth : 0}px)` },
          ml: { sm: `${open ? drawerWidth : 0}px` },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar /> {/* This is for spacing below the AppBar */}
        {children}
      </Box>

      {/* Bottom Navigation for Mobile */}
      {isMobile && (
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: theme.zIndex.appBar }} elevation={3}>
          <BottomNavigation
            showLabels
            value={location.pathname}
            onChange={(event, newValue) => {
              navigate(newValue);
            }}
          >
            <BottomNavigationAction label="Dashboard" value="/member/dashboard" icon={<DashboardIcon />} />
            <BottomNavigationAction label="Scan QR" value="/member/qr-scanner" icon={<QrCodeScannerIcon />} />
            <BottomNavigationAction label="History" value="/member/attendance-history" icon={<HistoryIcon />} />
            <BottomNavigationAction label="Profile" value="/member/profile" icon={<PersonIcon />} />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};

export default MemberLayout;