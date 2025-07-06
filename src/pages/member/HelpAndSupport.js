import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Link
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { HelpOutline } from '@mui/icons-material';
import MemberLayout from '../../components/layouts/MemberLayout';

const faqs = [
  {
    question: 'How do I mark my attendance?',
    answer: 'Navigate to the "Scan QR Code" page from your dashboard and scan the QR code displayed at the gym entrance. Your attendance will be marked automatically.'
  },
  {
    question: 'Where can I see my attendance history?',
    answer: 'You can view your complete attendance history, including stats and charts, on the "Attendance History" page, accessible from the main menu.'
  },
  {
    question: 'How do I update my profile information?',
    answer: 'Go to the "Profile" page. Click the "Edit Profile" button to make changes to your personal information, then click "Save".'
  },
  {
    question: 'What happens if my membership expires?',
    answer: 'Once your membership expires, you will not be able to mark attendance. You can renew your membership from the "Membership" page or by contacting the gym administration.'
  },
  {
    question: 'I forgot my password. What should I do?',
    answer: 'On the login page, click the "Forgot Password?" link. Enter your email address, and you will receive instructions on how to reset your password.'
  }
];

const HelpAndSupport = () => {
  return (
    <MemberLayout>
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4 }} elevation={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <HelpOutline color="primary" sx={{ fontSize: 40, mr: 2 }} />
            <Typography variant="h4" component="h1">
              Help & Support
            </Typography>
          </Box>
          <Typography variant="subtitle1" color="text.secondary" paragraph>
            Find answers to frequently asked questions below. If you can't find what you're looking for, please feel free to <Link component={RouterLink} to="/member/contact-us">contact us</Link>.
          </Typography>

          <Box sx={{ mt: 4 }}>
            {faqs.map((faq, index) => (
              <Accordion key={index} defaultExpanded={index === 0}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls={`panel${index}a-content`}
                  id={`panel${index}a-header`}
                >
                  <Typography variant="h6">{faq.question}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography>
                    {faq.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Paper>
      </Container>
    </MemberLayout>
  );
};

export default HelpAndSupport;