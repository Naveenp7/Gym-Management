import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Avatar
} from '@mui/material';
import { 
  CalendarToday, 
  QrCode, 
  FitnessCenter,
  AccessTime,
  CheckCircleOutline,
  Payment,
  Today
} from '@mui/icons-material';
import { collection, query, where, getDocs, orderBy, limit, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import MemberLayout from '../../components/layouts/MemberLayout';
import StatCard from '../../components/dashboard/StatCard';
import { calculateDaysRemaining } from '../../utils/dateUtils';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const MemberDashboard = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [memberData, setMemberData] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({
    thisWeek: 0,
    lastWeek: 0,
    thisMonth: 0,
    streak: 0
  });

  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        setLoading(true);
        
        // Fetch member profile data from 'members' collection
        const memberDocRef = doc(db, 'members', currentUser.uid);
        const memberDoc = await getDoc(memberDocRef);
        if (memberDoc.exists()) {
          setMemberData(memberDoc.data());
        }
        
        // Fetch attendance history
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('userId', '==', currentUser.uid),
          orderBy('date', 'desc'),
          limit(30)
        );
        
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendanceData = attendanceSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate()
        }));
        
        setAttendanceHistory(attendanceData);
        
        // Calculate attendance stats
        const now = new Date();
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(now.getDate() - 7);
        
        const twoWeeksAgo = new Date(now);
        twoWeeksAgo.setDate(now.getDate() - 14);
        
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(now.getMonth() - 1);
        
        const thisWeekAttendance = attendanceData.filter(record => 
          record.date >= oneWeekAgo
        ).length;
        
        const lastWeekAttendance = attendanceData.filter(record => 
          record.date >= twoWeeksAgo && record.date < oneWeekAgo
        ).length;
        
        const thisMonthAttendance = attendanceData.filter(record => 
          record.date >= oneMonthAgo
        ).length;
        
        // Calculate streak (consecutive days)
        let streak = 0;
        const dateStrings = attendanceData.map(record => {
          const date = record.date;
          return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        });
        
        const uniqueDates = [...new Set(dateStrings)].sort((a, b) => new Date(b) - new Date(a));
        
        if (uniqueDates.length > 0) {
          const today = new Date();
          const todayString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
          
          if (uniqueDates[0] === todayString) {
            streak = 1;
            let checkDate = new Date(today);
            
            for (let i = 1; i < 30; i++) {
              checkDate.setDate(checkDate.getDate() - 1);
              const checkDateString = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
              
              if (uniqueDates.includes(checkDateString)) {
                streak++;
              } else {
                break;
              }
            }
          }
        }
        
        setAttendanceStats({
          thisWeek: thisWeekAttendance,
          lastWeek: lastWeekAttendance,
          thisMonth: thisMonthAttendance,
          streak
        });
        
      } catch (error) {
        console.error('Error fetching member data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (currentUser) {
      fetchMemberData();
    }
  }, [currentUser]);

  // Format date for display
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Prepare attendance chart data
  const prepareAttendanceChartData = () => {
    // Get last 14 days
    const dates = [];
    const attendanceMap = {};
    
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dates.push(dateString);
      attendanceMap[dateString] = 0;
    }
    
    // Map attendance data to dates
    attendanceHistory.forEach(record => {
      const dateString = record.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (attendanceMap[dateString] !== undefined) {
        attendanceMap[dateString] = 1; // Mark as attended
      }
    });
    
    return {
      labels: dates,
      datasets: [
        {
          label: 'Attendance',
          data: dates.map(date => attendanceMap[date]),
          fill: false,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          tension: 0.1,
          pointRadius: 5,
          pointHoverRadius: 7
        }
      ]
    };
  };

  if (loading) {
    return (
      <MemberLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
          <CircularProgress />
        </Box>
      </MemberLayout>
    );
  }

  // Helper to get expiry date as JS Date
  const getExpiryDate = () => {
    if (!memberData?.membershipExpiry) return null;
    if (memberData.membershipExpiry.toDate) {
      return memberData.membershipExpiry.toDate();
    }
    return new Date(memberData.membershipExpiry);
  };
  const expiryDate = getExpiryDate();

  const daysRemaining = calculateDaysRemaining(memberData?.membershipExpiry);
  const membershipStatus = memberData?.membershipStatus === 'active' ? 'Active' : 'Expired';
  const statusColor = memberData?.membershipStatus === 'active' ? 'success' : 'error';

  return (
    <MemberLayout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Member Dashboard
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" paragraph>
          Welcome back, {memberData?.name || currentUser?.email}!
        </Typography>
        
        {/* Membership Status Card */}
        <Paper 
          sx={{ 
            p: 3, 
            mb: 4, 
            bgcolor: statusColor === 'success' ? 'success.light' : 'error.light',
            color: 'white'
          }} 
          elevation={3}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h5" gutterBottom>
                Membership Status: <Chip 
                  label={membershipStatus} 
                  color={statusColor} 
                  sx={{ ml: 1, color: 'white', fontWeight: 'bold', bgcolor: statusColor === 'success' ? 'success.dark' : 'error.dark' }} 
                />
              </Typography>
              <Typography variant="body1">
                Plan: {memberData?.membershipPlan || 'Not specified'}
              </Typography>
              {memberData?.membershipStatus === 'active' ? (
                <Typography variant="body1">
                  Your membership expires on {expiryDate ? formatDate(expiryDate) : 'N/A'}
                </Typography>
              ) : (
                <Typography variant="body1">
                  Your membership has expired. Please renew to continue using gym facilities.
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
              <Button 
                variant="contained" 
                color={statusColor === 'success' ? 'primary' : 'error'}
                size="large"
                startIcon={<Payment />}
                sx={{ mt: { xs: 2, md: 0 } }}
              >
                {statusColor === 'success' ? 'Extend Membership' : 'Renew Now'}
              </Button>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <StatCard
            title="This Week"
            value={attendanceStats.thisWeek}
            icon={<Today />}
            description="Visits this week"
            color="primary.light"
          />
          <StatCard
            title="Last Week"
            value={attendanceStats.lastWeek}
            icon={<CalendarToday />}
            description="Visits last week"
            color="info.light"
          />
          <StatCard
            title="This Month"
            value={attendanceStats.thisMonth}
            icon={<CheckCircleOutline />}
            description="Total monthly visits"
            color="success.light"
          />
          <StatCard
            title="Current Streak"
            value={attendanceStats.streak}
            icon={<FitnessCenter />}
            description="Consecutive days"
            color="warning.light"
          />
        </Grid>
        
        {/* Attendance Chart */}
        <Paper sx={{ p: 2, mb: 4 }} elevation={3}>
          <Typography variant="h6" gutterBottom>
            Your Attendance (Last 14 Days)
          </Typography>
          <Box sx={{ height: 300 }}>
            <Line 
              data={prepareAttendanceChartData()} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 1,
                    ticks: {
                      stepSize: 1,
                      callback: function(value) {
                        return value === 0 ? 'Absent' : 'Present';
                      }
                    }
                  }
                },
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        return context.raw === 0 ? 'Absent' : 'Present';
                      }
                    }
                  }
                },
              }}
            />
          </Box>
        </Paper>
        
        {/* Quick Actions */}
        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          Quick Actions
        </Typography>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%' }} elevation={2}>
              <CardHeader
                avatar={<QrCode />}
                title="Scan QR Code"
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Scan the gym's QR code to mark your attendance for today.
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary" 
                  fullWidth
                  href="/member/qr-scanner"
                >
                  Scan Now
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%' }} elevation={2}>
              <CardHeader
                avatar={<CalendarToday />}
                title="View Schedule"
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Check the gym's class schedule and book your spot.
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary" 
                  fullWidth
                  href="/member/schedule"
                >
                  View Schedule
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%' }} elevation={2}>
              <CardHeader
                avatar={<AccessTime />}
                title="Attendance History"
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary" paragraph>
                  View your complete attendance history and statistics.
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary" 
                  fullWidth
                  href="/member/attendance-history"
                >
                  View History
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Recent Attendance */}
        <Paper sx={{ p: 2 }} elevation={3}>
          <Typography variant="h6" gutterBottom>
            Recent Attendance
          </Typography>
          {attendanceHistory.length > 0 ? (
            <List>
              {attendanceHistory.slice(0, 5).map((record, index) => (
                <React.Fragment key={record.id || index}>
                  <ListItem>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <CheckCircleOutline />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText 
                      primary={`Checked in on ${formatDate(record.date)}`} 
                      secondary={new Date(record.date).toLocaleTimeString()} 
                    />
                  </ListItem>
                  {index < 4 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant="body1" color="textSecondary" sx={{ py: 2 }}>
              No recent attendance records found. Start visiting the gym to build your history!
            </Typography>
          )}
        </Paper>
      </Container>
    </MemberLayout>
  );
};

export default MemberDashboard;