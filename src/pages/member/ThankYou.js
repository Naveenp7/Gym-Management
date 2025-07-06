import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button
} from '@mui/material';
import { CheckCircleOutline, Home } from '@mui/icons-material';
import MemberLayout from '../../components/layouts/MemberLayout';

const ThankYou = () => {
  return (
    <MemberLayout>
      <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }} elevation={3}>
          <CheckCircleOutline color="success" sx={{ fontSize: 80, mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Thank You!
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" paragraph>
            Your message has been sent successfully. We will get back to you as soon as possible.
          </Typography>
          <Button
            component={RouterLink}
            to="/member/dashboard"
            variant="contained"
            startIcon={<Home />}
          >
            Go to Dashboard
          </Button>
        </Paper>
      </Container>
    </MemberLayout>
  );
};

export default ThankYou;