import React from 'react';
import { Container, Typography, Grid, Card, CardContent, CircularProgress, Alert } from '@mui/material';
import useAttendanceData from '../../hooks/useAttendanceData';

const AttendanceGrid = () => {
  const { members, loading, error } = useAttendanceData();

  if (loading) {
    return (
      <Container>
        <CircularProgress />
        <Typography>Loading members and attendance...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Today's Attendance</Typography>
      <Grid container spacing={3}>
        {members.map((member) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={member.id}>
            <Card sx={{ backgroundColor: member.isPresent ? '#e8f5e9' : '#ffebee' }}>
              <CardContent>
                <Typography variant="h6">{member.firstName} {member.lastName}</Typography>
                <Typography variant="body2" color="textSecondary">{member.email}</Typography>
                <Typography variant="body2" color="textSecondary">Membership: {member.membershipPlan}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Remaining Days: {member.remainingDays !== 'N/A' ? `${member.remainingDays} days` : 'N/A'}
                </Typography>
                <Typography variant="body1" sx={{ color: member.isPresent ? 'green' : 'red', fontWeight: 'bold' }}>
                  Status: {member.isPresent ? 'Present' : 'Absent'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default AttendanceGrid;