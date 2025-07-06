import React from 'react';
import { Container, Typography, Grid, Card, CardContent, CircularProgress, Alert, Divider } from '@mui/material';
import useAttendanceData from '../../hooks/useAttendanceData';

const AttendanceGrid = () => {
  const { members, loading, error } = useAttendanceData();

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography>Loading members and attendance...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const presentMembers = members.filter(member => member.isPresent);
  const absentMembers = members.filter(member => !member.isPresent);

  const renderMemberCard = (member) => (
    <Grid item xs={12} sm={6} md={4} lg={3} key={member.id}>
      <Card
        sx={{
          backgroundColor: member.isPresent ? '#e8f5e9' : '#ffebee',
          border: `1px solid ${member.isPresent ? '#4caf50' : '#f44336'}`, // Green for present, red for absent
        }}
      >
        <CardContent>
          <Typography variant="h6">{member.firstName} {member.lastName}</Typography>
          <Typography variant="body2" color="textSecondary">{member.email}</Typography>
          <Typography variant="body2" color="textSecondary">Membership: {member.membershipPlan}</Typography>
          <Typography variant="body2" color="textSecondary">
            Remaining Days: {member.remainingDays !== 'N/A' ? `${member.remainingDays} days` : 'N/A'}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: member.isPresent ? '#4caf50' : '#f44336',
              fontWeight: 'bold',
              mt: 1,
            }}
          >
            Status: {member.isPresent ? 'Present' : 'Absent'}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );

  return (
    <Container sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Today's Attendance
      </Typography>

      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        Members Present
      </Typography>
      {presentMembers.length === 0 ? (
        <Typography variant="body1" color="textSecondary">No members present today.</Typography>
      ) : (
        <Grid container spacing={3}>
          {presentMembers.map(renderMemberCard)}
        </Grid>
      )}

      <Divider sx={{ my: 4 }} />

      <Typography variant="h5" gutterBottom>
        Members Absent
      </Typography>
      {absentMembers.length === 0 ? (
        <Typography variant="body1" color="textSecondary">All members are present today.</Typography>
      ) : (
        <Grid container spacing={3}>
          {absentMembers.map(renderMemberCard)}
        </Grid>
      )}
    </Container>
  );
};

export default AttendanceGrid;