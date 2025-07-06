import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  AppBar, 
  Box, 
  Button, 
  Container, 
  Grid, 
  Link, 
  Paper, 
  Toolbar, 
  Typography,
  Card,
  CardContent,
  CardMedia
} from '@mui/material';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useAuth } from '../contexts/AuthContext';

const LandingPage = () => {
  const { currentUser, userRole } = useAuth();

  const features = [
    {
      icon: <QrCodeScannerIcon sx={{ fontSize: 60, color: '#1976d2' }} />,
      title: 'QR Code Attendance',
      description: 'Easily track gym attendance with our QR code system. Members can scan once per day for accurate attendance records.'
    },
    {
      icon: <PeopleIcon sx={{ fontSize: 60, color: '#1976d2' }} />,
      title: 'Member Management',
      description: 'Comprehensive member management system for gym owners to add, edit, and track member information.'
    },
    {
      icon: <CalendarMonthIcon sx={{ fontSize: 60, color: '#1976d2' }} />,
      title: 'Membership Plans',
      description: 'Create and manage various membership plans with automatic expiry tracking and renewal notifications.'
    }
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Navigation Bar */}
      <AppBar position="static">
        <Toolbar>
          <FitnessCenterIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Gym Attendance System
          </Typography>
          
          {currentUser ? (
            <Button 
              color="inherit" 
              component={RouterLink} 
              to={userRole === 'admin' ? '/admin/dashboard' : '/member/dashboard'}
            >
              Dashboard
            </Button>
          ) : (
            <>
              <Button color="inherit" component={RouterLink} to="/login">
                Login
              </Button>
              <Button color="inherit" component={RouterLink} to="/register">
                Register
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Paper 
        sx={{
          position: 'relative',
          backgroundColor: 'grey.800',
          color: '#fff',
          mb: 4,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundImage: 'url(https://source.unsplash.com/random?gym)',
          height: '500px'
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            left: 0,
            backgroundColor: 'rgba(0,0,0,.5)',
          }}
        />
        <Grid container>
          <Grid item md={6}>
            <Box
              sx={{
                position: 'relative',
                p: { xs: 3, md: 6 },
                pr: { md: 0 },
                height: '500px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              <Typography component="h1" variant="h3" color="inherit" gutterBottom>
                Modern Gym Attendance System
              </Typography>
              <Typography variant="h5" color="inherit" paragraph>
                Streamline your gym operations with our QR code-based attendance tracking system.
                Perfect for gym owners and members alike.
              </Typography>
              <Box sx={{ mt: 3 }}>
                {!currentUser && (
                  <Button variant="contained" size="large" component={RouterLink} to="/register">
                    Get Started
                  </Button>
                )}
                {currentUser && (
                  <Button 
                    variant="contained" 
                    size="large" 
                    component={RouterLink} 
                    to={userRole === 'admin' ? '/admin/dashboard' : '/member/dashboard'}
                  >
                    Go to Dashboard
                  </Button>
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Features Section */}
      <Container sx={{ py: 8 }} maxWidth="lg">
        <Typography variant="h4" component="h2" align="center" gutterBottom>
          Key Features
        </Typography>
        <Grid container spacing={4} sx={{ mt: 2 }}>
          {features.map((feature, index) => (
            <Grid item key={index} xs={12} sm={6} md={4}>
              <Card
                sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}
                elevation={3}
              >
                <Box sx={{ py: 2 }}>
                  {feature.icon}
                </Box>
                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                  <Typography gutterBottom variant="h5" component="h3">
                    {feature.title}
                  </Typography>
                  <Typography>
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* How It Works Section */}
      <Box sx={{ bgcolor: 'background.paper', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" component="h2" align="center" gutterBottom>
            How It Works
          </Typography>
          <Grid container spacing={2} sx={{ mt: 4 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>For Gym Owners</Typography>
              <Typography paragraph>
                1. Register as an admin and set up your gym profile.
              </Typography>
              <Typography paragraph>
                2. Add members and create membership plans.
              </Typography>
              <Typography paragraph>
                3. Generate daily QR codes for attendance tracking.
              </Typography>
              <Typography paragraph>
                4. Monitor attendance and membership status in real-time.
              </Typography>
              <Typography paragraph>
                5. Get notifications for membership renewals and payments.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>For Gym Members</Typography>
              <Typography paragraph>
                1. Register as a member with your details.
              </Typography>
              <Typography paragraph>
                2. View your membership status and expiry date.
              </Typography>
              <Typography paragraph>
                3. Scan the daily QR code when you visit the gym.
              </Typography>
              <Typography paragraph>
                4. Track your attendance history.
              </Typography>
              <Typography paragraph>
                5. Receive reminders for membership renewal.
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: 'background.paper', py: 6 }}>
        <Container maxWidth="lg">
          <Typography variant="h6" align="center" gutterBottom>
            Gym Attendance System
          </Typography>
          <Typography variant="subtitle1" align="center" color="text.secondary" component="p">
            Streamline your gym operations with our modern attendance tracking solution
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            {'© '}
            <Link color="inherit" href="#">
              Gym Attendance System
            </Link>{' '}
            {new Date().getFullYear()}
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;