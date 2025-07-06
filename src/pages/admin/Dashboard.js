import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Card,
  CardContent,
  CardHeader,
  CircularProgress
} from '@mui/material';
import { 
  PeopleOutline, 
  CalendarToday, 
  QrCode, 
  Assessment,
  TrendingUp,
  Warning,
  CheckCircleOutline
} from '@mui/icons-material';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/layouts/AdminLayout';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    expiringMembers: 0,
    todayAttendance: 0,
    weeklyAttendance: [],
    membershipDistribution: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get all members from the 'members' collection, which contains detailed membership info.
        const membersQuery = query(collection(db, 'members'));
        const membersSnapshot = await getDocs(membersQuery);
        const members = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Calculate total members
        const totalMembers = members.length;
        
        // Calculate active and expiring members
        const now = new Date();
        const sevenDaysLater = new Date();
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
        const activeMembers = members.filter(member => {
          const expiryDate = member.membershipExpiry?.toDate ? member.membershipExpiry.toDate() : new Date(member.membershipExpiry);
          return expiryDate && expiryDate > now;
        }).length;
        
        const expiringMembers = members.filter(member => {
          const expiryDate = member.membershipExpiry?.toDate ? member.membershipExpiry.toDate() : new Date(member.membershipExpiry);
          return expiryDate && expiryDate > now && expiryDate < sevenDaysLater;
        }).length;
        
        // Get today's attendance
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayStartTimestamp = Timestamp.fromDate(today);
        const todayEndTimestamp = Timestamp.fromDate(tomorrow);
        
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('date', '>=', todayStartTimestamp),
          where('date', '<', todayEndTimestamp)
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const todayAttendance = attendanceSnapshot.size;
        
        // Fetch real data for weekly attendance
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const weeklyAttendanceQuery = query(
          collection(db, 'attendance'),
          where('date', '>=', Timestamp.fromDate(sevenDaysAgo))
        );
        const weeklyAttendanceSnapshot = await getDocs(weeklyAttendanceQuery);
        const weeklyAttendanceData = {};
        for (let i = 0; i < 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          weeklyAttendanceData[date.toLocaleDateString('en-US', { weekday: 'long' })] = 0;
        }

        weeklyAttendanceSnapshot.docs.forEach(doc => {
          const attendanceDate = doc.data().date.toDate();
          const dayOfWeek = attendanceDate.toLocaleDateString('en-US', { weekday: 'long' });
          if (weeklyAttendanceData.hasOwnProperty(dayOfWeek)) {
            weeklyAttendanceData[dayOfWeek]++;
          }
        });

        const weeklyAttendance = Object.keys(weeklyAttendanceData).map(day => ({
          day,
          count: weeklyAttendanceData[day]
        }));
        
        // Fetch real data for membership distribution
        const membershipDistributionData = {};
        members.forEach(member => {
          const plan = member.membershipPlan || 'Unknown'; // Assuming a 'membershipPlan' field exists
          membershipDistributionData[plan] = (membershipDistributionData[plan] || 0) + 1;
        });

        const membershipDistribution = Object.keys(membershipDistributionData).map(plan => ({
          plan,
          count: membershipDistributionData[plan]
        }));
        
        setStats({
          totalMembers,
          activeMembers,
          expiringMembers,
          todayAttendance,
          weeklyAttendance,
          membershipDistribution
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  // Chart data for weekly attendance
  const attendanceChartData = {
    labels: stats.weeklyAttendance.map(item => item.day),
    datasets: [
      {
        label: 'Attendance',
        data: stats.weeklyAttendance.map(item => item.count),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }
    ]
  };

  // Chart data for membership distribution
  const membershipChartData = {
    labels: stats.membershipDistribution.map(item => item.plan),
    datasets: [
      {
        label: 'Members',
        data: stats.membershipDistribution.map(item => item.count),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  const adminFeatures = [
    { 
      title: 'Member Management', 
      icon: <PeopleOutline />, 
      description: 'Add, edit, and manage gym members',
      link: '/admin/members'
    },
    { 
      title: 'Membership Plans', 
      icon: <CalendarToday />, 
      description: 'Create and manage membership plans',
      link: '/admin/plans'
    },
    { 
      title: 'QR Code Generator', 
      icon: <QrCode />, 
      description: 'Generate QR codes for attendance',
      link: '/admin/qr-generator'
    },
    { 
      title: 'Attendance Reports', 
      icon: <Assessment />, 
      description: 'View and export attendance reports',
      link: '/admin/attendance'
    }
  ];

  if (loading) {
    return (
      <AdminLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Admin Dashboard
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" paragraph>
          Welcome back, {currentUser?.email}! Here's an overview of your gym.
        </Typography>
        
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: 140,
                bgcolor: 'primary.light',
                color: 'white'
              }}
              elevation={3}
            >
              <Typography component="h2" variant="h6" gutterBottom>
                Total Members
              </Typography>
              <Typography component="p" variant="h3">
                {stats.totalMembers}
              </Typography>
              <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center' }}>
                <PeopleOutline />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  All registered members
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: 140,
                bgcolor: 'success.light',
                color: 'white'
              }}
              elevation={3}
            >
              <Typography component="h2" variant="h6" gutterBottom>
                Active Members
              </Typography>
              <Typography component="p" variant="h3">
                {stats.activeMembers}
              </Typography>
              <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center' }}>
                <CheckCircleOutline />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  Members with active membership
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: 140,
                bgcolor: 'warning.light',
                color: 'white'
              }}
              elevation={3}
            >
              <Typography component="h2" variant="h6" gutterBottom>
                Expiring Soon
              </Typography>
              <Typography component="p" variant="h3">
                {stats.expiringMembers}
              </Typography>
              <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center' }}>
                <Warning />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  Memberships expiring in 7 days
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: 140,
                bgcolor: 'info.light',
                color: 'white'
              }}
              elevation={3}
            >
              <Typography component="h2" variant="h6" gutterBottom>
                Today's Attendance
              </Typography>
              <Typography component="p" variant="h3">
                {stats.todayAttendance}
              </Typography>
              <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center' }}>
                <TrendingUp />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  Members checked in today
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
        
        {/* Charts */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }} elevation={3}>
              <Typography variant="h6" gutterBottom>
                Weekly Attendance
              </Typography>
              <Box sx={{ height: 300 }}>
                <Bar 
                  data={attendanceChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                      },
                      title: {
                        display: false,
                      },
                    },
                  }}
                />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }} elevation={3}>
              <Typography variant="h6" gutterBottom>
                Membership Distribution
              </Typography>
              <Box sx={{ height: 300 }}>
                <Pie 
                  data={membershipChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      },
                    },
                  }}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
        
        {/* Quick Access */}
        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          Quick Access
        </Typography>
        <Grid container spacing={3}>
          {adminFeatures.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card sx={{ height: '100%' }} elevation={2}>
                <CardHeader
                  avatar={feature.icon}
                  title={feature.title}
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {feature.description}
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    component={RouterLink} 
                    to={feature.link}
                    fullWidth
                  >
                    Access
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        
        {/* Recent Activity */}
        <Paper sx={{ p: 2, mt: 4 }} elevation={3}>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <PeopleOutline />
              </ListItemIcon>
              <ListItemText 
                primary="New member registered" 
                secondary="John Doe - 2 hours ago" 
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemIcon>
                <CalendarToday />
              </ListItemIcon>
              <ListItemText 
                primary="Membership renewed" 
                secondary="Jane Smith - 3 hours ago" 
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemIcon>
                <QrCode />
              </ListItemIcon>
              <ListItemText 
                primary="QR Code generated" 
                secondary="For today's attendance - 8 hours ago" 
              />
            </ListItem>
          </List>
        </Paper>
      </Container>
    </AdminLayout>
  );
};

export default AdminDashboard;