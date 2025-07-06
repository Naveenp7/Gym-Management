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
  Collapse,
  Button,
  Paper,
  BottomNavigation,
  BottomNavigationAction
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  CreditCard as CreditCardIcon,
  QrCode as QrCodeIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  ExpandLess,
  ExpandMore,
  Notifications as NotificationsIcon,
  AccountCircle,
  Help as HelpIcon,
  Home as HomeIcon,
  CalendarMonth as CalendarIcon,
  Inventory as InventoryIcon,
  BarChart as BarChartIcon,
  Email as EmailIcon,
  Payments as PaymentsIcon
} from '@mui/icons-material';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { formatDistanceToNow } from 'date-fns';
// Drawer width
const drawerWidth = 240;

const AdminLayout = ({ children }) => {
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
  const [menuExpanded, setMenuExpanded] = useState({
    members: false,
    memberships: false,
    reports: false
  });
  
  // Fetch notifications in real-time
  useEffect(() => {
    if (!currentUser) return;

    // Set up real-time listener for notifications
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('adminView', '==', true), // Fetch notifications intended for admins
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      setNotifications(notificationsList);
    }, (error) => {
      console.error('Error fetching notifications:', error);
    });

    return () => unsubscribe();
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
  
  // Toggle submenu
  const toggleSubmenu = (menu) => {
    setMenuExpanded({
      ...menuExpanded,
      [menu]: !menuExpanded[menu]
    });
  };
  
  // Check if a route is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Format timestamp for notifications
  const formatTimestamp = (date) => {
    if (!date || !(date instanceof Date)) {
      return '';
    }
    // e.g., "about 5 hours ago"
    return formatDistanceToNow(date, { addSuffix: true });
  };
  
  // Main menu items
  const mainMenuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/admin/dashboard',
      active: isActive('/admin/dashboard')
    },
    {
      text: 'Members',
      icon: <PeopleIcon />,
      submenu: true,
      expanded: menuExpanded.members,
      onClick: () => toggleSubmenu('members'),
      items: [
        {
          text: 'Member Management',
          path: '/admin/members',
          active: isActive('/admin/members')
        },
        {
          text: 'Member Analytics',
          path: '/admin/member-analytics',
          active: isActive('/admin/member-analytics')
        }
      ]
    },
    {
      text: 'Memberships',
      icon: <CreditCardIcon />,
      submenu: true,
      expanded: menuExpanded.memberships,
      onClick: () => toggleSubmenu('memberships'),
      items: [
        {
          text: 'Membership Plans',
          path: '/admin/membership-plans',
          active: isActive('/admin/membership-plans')
        },
        {
          text: 'Payments',
          path: '/admin/payments',
          active: isActive('/admin/payments')
        }
      ]
    },
    {
      text: 'QR Codes',
      icon: <QrCodeIcon />,
      path: '/admin/qr-generator',
      active: isActive('/admin/qr-generator')
    },
    {
      text: 'Attendance',
      icon: <CalendarIcon />,
      path: '/admin/attendance-grid',
      active: isActive('/admin/attendance')
    },
    {
      text: 'Reports',
      icon: <AssessmentIcon />,
      submenu: true,
      expanded: menuExpanded.reports,
      onClick: () => toggleSubmenu('reports'),
      items: [
        {
          text: 'Attendance Reports',
          path: '/admin/attendance-reports',
          active: isActive('/admin/attendance-reports')
        },
        {
          text: 'Financial Reports',
          path: '/admin/financial-reports',
          active: isActive('/admin/financial-reports')
        },
        {
          text: 'Member Reports',
          path: '/admin/member-reports',
          active: isActive('/admin/member-reports')
        }
      ]
    },
    {
      text: 'Inventory',
      icon: <InventoryIcon />,
      path: '/admin/inventory',
      active: isActive('/admin/inventory')
    },
    {
      text: 'Notifications',
      icon: <NotificationsIcon />,
      path: '/admin/notifications',
      active: isActive('/admin/notifications')
    },
    {
      text: 'Settings',
      icon: <SettingsIcon />,
      path: '/admin/settings',
      active: isActive('/admin/settings')
    }
  ];
  
  // Secondary menu items
  const secondaryMenuItems = [
    {
      text: 'Help & Support',
      icon: <HelpIcon />,
      path: '/admin/help',
      active: isActive('/admin/help')
    },
    {
      text: 'Back to Home',
      icon: <HomeIcon />,
      path: '/',
      active: isActive('/')
    }
  ];
  
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
            Gym Management System - Admin Panel
          </Typography>
          
          {/* Notifications */}
          <Box sx={{ flexGrow: 0, mr: 2 }}>
            <Tooltip title="Notifications">
              <IconButton onClick={handleOpenNotificationsMenu} sx={{ p: 0 }} color="inherit">
                <Badge badgeContent={unreadNotifications} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: '45px' }}
              id="notifications-menu"
              anchorEl={anchorElNotifications}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElNotifications)}
              onClose={handleCloseNotificationsMenu}
            >
              <Box sx={{ width: 320, maxHeight: 400, overflow: 'auto', p: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6">Notifications</Typography>
                  <Button 
                    size="small" 
                    onClick={() => {
                      handleCloseNotificationsMenu();
                      navigate('/admin/notifications');
                    }}
                  >
                    View All
                  </Button>
                </Box>
                <Divider sx={{ mb: 1 }} />
                {notifications.length > 0 ? (
                  notifications.slice(0, 5).map((notification) => (
                    <MenuItem 
                      key={notification.id} 
                      onClick={handleCloseNotificationsMenu}
                      sx={{ 
                        whiteSpace: 'normal', 
                        py: 1,
                        borderLeft: notification.read ? 'none' : `4px solid ${theme.palette.primary.main}`,
                        bgcolor: notification.read ? 'inherit' : 'action.hover'
                      }}
                    >
                      <Box sx={{ width: '100%' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}>
                          {notification.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          {formatTimestamp(notification.timestamp)}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))
                ) : (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No notifications
                    </Typography>
                  </Box>
                )}
              </Box>
            </Menu>
          </Box>
          
          {/* User Menu */}
          <Box sx={{ flexGrow: 0 }}>
            <Tooltip title="Open settings">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar alt={currentUser?.displayName || 'Admin'} src={currentUser?.photoURL} />
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
                <Typography variant="subtitle1">{currentUser?.displayName || 'Admin'}</Typography>
                <Typography variant="body2" color="text.secondary">{currentUser?.email}</Typography>
              </Box>
              <Divider />
              <MenuItem onClick={() => { handleCloseUserMenu(); navigate('/admin/profile'); }}>
                <ListItemIcon>
                  <AccountCircle fontSize="small" />
                </ListItemIcon>
                <ListItemText>Profile</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { handleCloseUserMenu(); navigate('/admin/settings'); }}>
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
        
        {/* Main Menu Items */}
        <List component="nav" sx={{ px: 1 }}>
          {mainMenuItems.map((item) => (
            <React.Fragment key={item.text}>
              {item.submenu ? (
                <>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={item.onClick}
                      sx={{
                        borderRadius: 1,
                        mb: 0.5,
                        color: 'white',
                      }}
                    >
                      <ListItemIcon sx={{ color: 'white' }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText primary={item.text} />
                      {item.expanded ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>
                  </ListItem>
                  <Collapse in={item.expanded} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {item.items.map((subItem) => (
                        <ListItem key={subItem.text} disablePadding>
                          <ListItemButton
                            component={RouterLink}
                            to={subItem.path}
                            sx={{
                              pl: 4,
                              borderRadius: 1,
                              mb: 0.5,
                              bgcolor: subItem.active ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                              color: 'white',
                              borderLeft: subItem.active ? '3px solid #1976d2' : 'none',
                              '&:hover': {
                                bgcolor: 'rgba(255, 255, 255, 0.08)',
                              },
                            }}
                          >
                            <ListItemText primary={subItem.text} />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                </>
              ) : (
                <ListItem disablePadding>
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
                  </ListItemButton>
                </ListItem>
              )}
            </React.Fragment>
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
            <BottomNavigationAction label="Dashboard" value="/admin/dashboard" icon={<DashboardIcon />} />
            <BottomNavigationAction label="Members" value="/admin/members" icon={<PeopleIcon />} />
            <BottomNavigationAction label="Attendance" value="/admin/attendance-grid" icon={<CalendarIcon />} />
            <BottomNavigationAction label="Reports" value="/admin/attendance-reports" icon={<AssessmentIcon />} />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};

export default AdminLayout;