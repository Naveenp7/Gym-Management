import React from 'react';
import {
  Menu,
  Box,
  Typography,
  Button,
  Divider,
  MenuItem,
  useTheme
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';

const NotificationMenu = ({
  anchorEl,
  open,
  onClose,
  notifications,
  onViewAll,
  onNotificationClick,
}) => {
  const theme = useTheme();

  const formatTimestamp = (date) => {
    if (!date || !(date instanceof Date)) {
      return '';
    }
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <Menu
      sx={{ mt: '45px' }}
      id="notifications-menu"
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={open}
      onClose={onClose}
    >
      <Box sx={{ width: 320, maxHeight: 400, overflow: 'auto', p: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ pl: 1 }}>Notifications</Typography>
          <Button size="small" onClick={onViewAll}>
            View All
          </Button>
        </Box>
        <Divider sx={{ mb: 1 }} />
        {notifications.length > 0 ? (
          notifications.slice(0, 5).map((notification) => (
            <MenuItem
              key={notification.id}
              onClick={() => onNotificationClick(notification)}
              sx={{
                whiteSpace: 'normal',
                py: 1,
                borderLeft: notification.read ? 'none' : `4px solid ${theme.palette.primary.main}`,
                bgcolor: notification.read ? 'inherit' : 'action.hover',
                borderRadius: 1,
                mb: 0.5,
              }}
            >
              <Box sx={{ width: '100%' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}>
                  {notification.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {notification.message && notification.message.length > 60
                    ? `${notification.message.substring(0, 60)}...`
                    : notification.message}
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
              No new notifications
            </Typography>
          </Box>
        )}
      </Box>
    </Menu>
  );
};

export default NotificationMenu;