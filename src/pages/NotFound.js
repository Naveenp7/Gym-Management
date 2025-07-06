import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Grid
} from '@mui/material';
import { Home, ArrowBack } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const NotFound = () => {
  const { currentUser, userRole } = useAuth();

  // Determine where to redirect the user based on their authentication status and role
  const getRedirectPath = () => {
    if (!currentUser) {
      return '/';
    }
    
    return userRole === 'admin' ? '/admin/dashboard' : '/member/dashboard';
  };

  const redirectPath = getRedirectPath();
  const redirectLabel = !currentUser ? 'Home' : 'Dashboard';

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          py: 4
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            borderRadius: 2,
            textAlign: 'center'
          }}
        >
          <Typography 
            variant="h1" 
            component="h1" 
            sx={{ 
              fontSize: { xs: '6rem', md: '8rem' },
              fontWeight: 700,
              color: 'primary.main',
              mb: 2
            }}
          >
            404
          </Typography>
          
          <Typography 
            variant="h4" 
            component="h2"
            gutterBottom
            sx={{ 
              fontWeight: 500,
              mb: 3
            }}
          >
            Page Not Found
          </Typography>
          
          <Typography 
            variant="body1" 
            color="text.secondary"
            paragraph
            sx={{ 
              maxWidth: '600px',
              mx: 'auto',
              mb: 4
            }}
          >
            The page you are looking for might have been removed, had its name changed, 
            or is temporarily unavailable. Please check the URL or navigate back to a known page.
          </Typography>
          
          <Grid container spacing={2} justifyContent="center">
            <Grid item>
              <Button
                component={RouterLink}
                to={redirectPath}
                variant="contained"
                size="large"
                startIcon={<Home />}
              >
                Go to {redirectLabel}
              </Button>
            </Grid>
            <Grid item>
              <Button
                component={RouterLink}
                to="#"
                variant="outlined"
                size="large"
                startIcon={<ArrowBack />}
                onClick={() => window.history.back()}
              >
                Go Back
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default NotFound;