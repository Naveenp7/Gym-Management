import React, { useState } from 'react';
import { Container, Typography, Grid, Card, CardContent, CircularProgress, Alert, Divider, Box, Avatar, Chip, Slider, Stack, Tooltip } from '@mui/material';
import { ViewComfy, ViewModule } from '@mui/icons-material';
import useAttendanceData from '../../hooks/useAttendanceData';

const AttendanceGrid = () => {
  const { members, loading, error } = useAttendanceData();
  const [columns, setColumns] = useState(4); // Default number of columns for large screens

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

  const renderMemberCard = (member) => {
    // Calculate responsive grid columns based on slider value
    const lg = 12 / columns;
    const md = 12 / Math.min(columns, 4);
    const sm = 12 / Math.min(columns, 2);

    const getInitials = (name) => {
      if (!name) return '?';
      const names = name.split(' ');
      if (names.length > 1 && names[0] && names[names.length - 1]) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    };

    return (
      <Grid item xs={12} sm={sm} md={md} lg={lg} key={member.id}>
        <Card
          sx={{
            backgroundColor: member.isPresent ? '#e8f5e9' : '#ffebee',
            border: `1px solid ${member.isPresent ? '#c8e6c9' : '#ffcdd2'}`,
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}
        >
          <CardContent sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar
                src={member.profileImageUrl}
                alt={member.fullName}
                sx={{ width: 56, height: 56, mr: 2, bgcolor: 'primary.main' }}
              >
                {getInitials(member.fullName)}
              </Avatar>
              <Box>
                <Typography variant="h6" noWrap title={member.fullName}>
                  {member.fullName || 'Unnamed Member'}
                </Typography>
                <Typography variant="body2" color="textSecondary" noWrap title={member.email}>
                  {member.email}
                </Typography>
              </Box>
            </Box>
            
            <Divider sx={{ my: 1 }} />

            <Typography variant="body2" color="textSecondary">
              Membership: {member.membershipPlan || 'N/A'}
            </Typography>
            <Typography 
              variant="body2" 
              color={member.remainingDays > 7 ? 'text.secondary' : (member.remainingDays > 0 ? 'warning.dark' : 'error.dark')}
            >
              {member.remainingDays > 0 ? `Remaining Days: ${member.remainingDays}` : 'Membership Expired'}
            </Typography>
            
            <Chip 
              label={member.isPresent ? 'Present' : 'Absent'}
              color={member.isPresent ? 'success' : 'error'}
              size="small"
              sx={{ mt: 2, width: '100%', fontWeight: 'bold' }}
            />
          </CardContent>
        </Card>
      </Grid>
    );
  };

  return (
    <Container sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ m: 0 }}>
          Today's Attendance
        </Typography>
        <Stack spacing={2} direction="row" sx={{ width: { xs: '100%', sm: 250 } }} alignItems="center">
          <Tooltip title="Fewer Cards per Row">
            <ViewComfy />
          </Tooltip>
          <Slider
            aria-label="Grid Size"
            value={columns}
            onChange={(e, newValue) => setColumns(newValue)}
            valueLabelDisplay="auto"
            step={1}
            marks
            min={2}
            max={6}
          />
          <Tooltip title="More Cards per Row">
            <ViewModule />
          </Tooltip>
        </Stack>
      </Box>

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