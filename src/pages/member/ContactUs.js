import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  Grid
} from '@mui/material';
import { Email, Phone, LocationOn, Send } from '@mui/icons-material';
import MemberLayout from '../../components/layouts/MemberLayout';

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <MemberLayout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4 }} elevation={3}>
          <Typography variant="h4" component="h1" gutterBottom>
            Contact Us
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" paragraph>
            Have questions or need assistance? Fill out the form below and we'll get back to you as soon as possible.
          </Typography>

          <Grid container spacing={5} sx={{ mt: 3 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Send us a message</Typography>
              <Box component="form" action="https://formsubmit.co/naveensanthosh830@gmail.com" method="POST">
                <TextField fullWidth label="Your Name" name="name" value={formData.name} onChange={handleChange} margin="normal" required />
                <TextField fullWidth label="Your Email" name="email" value={formData.email} onChange={handleChange} margin="normal" type="email" required />
                <TextField fullWidth label="Subject" name="subject" value={formData.subject} onChange={handleChange} margin="normal" required />
                <TextField fullWidth label="Your Message" name="message" value={formData.message} onChange={handleChange} margin="normal" multiline rows={4} required />
                
                {/* Formsubmit.co settings: redirect to a thank you page */}
                <input type="hidden" name="_next" value={`${window.location.origin}/member/thank-you`} />
                <input type="hidden" name="_captcha" value="false" />

                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  sx={{ mt: 2 }}
                  startIcon={<Send />}
                >
                  Send Message
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Contact Information</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocationOn color="primary" sx={{ mr: 2 }} />
                <Typography>Malappuram, Ponnani, Kerala, India</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Phone color="primary" sx={{ mr: 2 }} />
                <Typography>+91-7012895181</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                <Email color="primary" sx={{ mr: 2 }} />
                <Typography>naveensanthosh830@gmail.com</Typography>
              </Box>

              <Typography variant="h6" gutterBottom>Business Hours</Typography>
              <Typography>Monday - Friday: 6:00 AM - 10:00 PM</Typography>
              <Typography>Saturday - Sunday: 8:00 AM - 8:00 PM</Typography>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </MemberLayout>
  );
};

export default ContactUs;
