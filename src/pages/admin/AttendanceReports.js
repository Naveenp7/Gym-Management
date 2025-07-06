import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Divider,
  Tabs,
  Tab,
  Autocomplete,
  Alert,
  Snackbar
} from '@mui/material';
import {
  CalendarToday,
  TrendingUp,
  PeopleAlt,
  AccessTime,
  FilterList,
  GetApp,
  Print,
  Refresh,
  Search,
  BarChart,
  PieChart,
  Timeline,
  Person
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip as ChartTooltip, Legend } from 'chart.js';
import * as XLSX from 'xlsx';
import AdminLayout from '../../components/layouts/AdminLayout';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend
);

const AttendanceReports = () => {
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [members, setMembers] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabValue, setTabValue] = useState(0);
  const [dateRange, setDateRange] = useState('week');
  const [startDate, setStartDate] = useState(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState(new Date());
  const [selectedMember, setSelectedMember] = useState(null);
  const [filters, setFilters] = useState({
    timeOfDay: 'all',
    dayOfWeek: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch initial data
  useEffect(() => {
    fetchMembers();
    handleDateRangeChange(dateRange);
  }, []);

  // Update filtered data when filters change
  useEffect(() => {
    applyFilters();
  }, [attendanceData, filters, selectedMember]);

  // Fetch members data
  const fetchMembers = async () => {
    try {
      const membersQuery = query(collection(db, 'users'), orderBy('lastName'));
      const membersSnapshot = await getDocs(membersQuery);
      const membersData = membersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fullName: `${doc.data().firstName} ${doc.data().lastName}`
      }));
      setMembers(membersData);
    } catch (error) {
      console.error('Error fetching members:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching members: ' + error.message,
        severity: 'error'
      });
    }
  };

  // Fetch attendance data based on date range
  const fetchAttendanceData = async (start, end) => {
    try {
      setLoading(true);
      
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('date', '>=', Timestamp.fromDate(startOfDay(start))),
        where('date', '<=', Timestamp.fromDate(endOfDay(end))),
        orderBy('date', 'desc'),
        limit(100)
      );
      
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const lastVisible = attendanceSnapshot.docs[attendanceSnapshot.docs.length - 1];
      setLastDoc(lastVisible);
      setHasMore(attendanceSnapshot.docs.length === 100);
      
      // Process attendance data
      const attendanceList = [];
      
      for (const doc of attendanceSnapshot.docs) {
        const attendance = doc.data();
        attendance.id = doc.id;
        attendance.date = attendance.date.toDate();
        
        // Fetch member data if not already included
        if (attendance.userid) {
          const memberDoc = await getDoc(doc(db, 'users', attendance.userid));
          if (memberDoc.exists()) {
            const memberData = memberDoc.data();
            attendance.member = {
              id: memberDoc.id,
              firstName: memberData.firstName,
              lastName: memberData.lastName,
              email: memberData.email,
              membershipPlan: memberData.membershipPlan,
              fullName: `${memberData.firstName} ${memberData.lastName}`
            };
            console.log(`Member document found for userid: ${attendance.userid}`);
          } else {
            console.warn(`Member document not found for userid: ${attendance.userid}`);
          }
        }
        
        attendanceList.push(attendance);
      }
      
      setAttendanceData(attendanceList);
      setFilteredData(attendanceList);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching attendance data: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Load more attendance data
  const loadMoreAttendance = async () => {
    if (!hasMore || !lastDoc) return;
    
    try {
      setLoading(true);
      
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('date', '>=', Timestamp.fromDate(startOfDay(startDate))),
        where('date', '<=', Timestamp.fromDate(endOfDay(endDate))),
        orderBy('date', 'desc'),
        startAfter(lastDoc),
        limit(100)
      );
      
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const lastVisible = attendanceSnapshot.docs[attendanceSnapshot.docs.length - 1];
      setLastDoc(lastVisible);
      setHasMore(attendanceSnapshot.docs.length === 100);
      
      // Process attendance data
      const newAttendanceList = [];
      
      for (const doc of attendanceSnapshot.docs) {
        const attendance = doc.data();
        attendance.id = doc.id;
        attendance.date = attendance.date.toDate();
        
        // Fetch member data if not already included
        if (attendance.userid) {
          const memberDoc = await getDoc(doc(db, 'users', attendance.userid));
          if (memberDoc.exists()) {
            const memberData = memberDoc.data();
            attendance.member = {
              id: memberDoc.id,
              firstName: memberData.firstName,
              lastName: memberData.lastName,
              email: memberData.email,
              membershipPlan: memberData.membershipPlan,
              fullName: `${memberData.firstName} ${memberData.lastName}`
            };
          }
        }
        
        newAttendanceList.push(attendance);
      }
      
      setAttendanceData(prev => [...prev, ...newAttendanceList]);
      applyFilters([...attendanceData, ...newAttendanceList]);
    } catch (error) {
      console.error('Error loading more attendance data:', error);
      setSnackbar({
        open: true,
        message: 'Error loading more attendance data: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle date range change
  const handleDateRangeChange = (range) => {
    let start, end;
    const today = new Date();
    
    switch (range) {
      case 'today':
        start = today;
        end = today;
        break;
      case 'yesterday':
        start = subDays(today, 1);
        end = subDays(today, 1);
        break;
      case 'week':
        start = startOfWeek(today);
        end = today;
        break;
      case 'last_week':
        start = startOfWeek(subDays(today, 7));
        end = endOfWeek(subDays(today, 7));
        break;
      case 'month':
        start = startOfMonth(today);
        end = today;
        break;
      case 'last_month':
        start = startOfMonth(subMonths(today, 1));
        end = endOfMonth(subMonths(today, 1));
        break;
      case 'custom':
        // Keep existing custom dates
        start = startDate;
        end = endDate;
        break;
      default:
        start = subDays(today, 7);
        end = today;
    }
    
    setDateRange(range);
    setStartDate(start);
    setEndDate(end);
    fetchAttendanceData(start, end);
  };

  // Apply filters to attendance data
  const applyFilters = (data = attendanceData) => {
    let filtered = [...data];

    
    // Filter by member
    if (selectedMember) {
      filtered = filtered.filter(item => item.userid === selectedMember.id);
    }
    
    // Filter by time of day
    if (filters.timeOfDay !== 'all') {
      filtered = filtered.filter(item => {
        const hour = item.date.getHours();
        switch (filters.timeOfDay) {
          case 'morning':
            return hour >= 5 && hour < 12;
          case 'afternoon':
            return hour >= 12 && hour < 17;
          case 'evening':
            return hour >= 17 && hour < 21;
          case 'night':
            return hour >= 21 || hour < 5;
          default:
            return true;
        }
      });
    }
    
    // Filter by day of week
    if (filters.dayOfWeek !== 'all') {
      filtered = filtered.filter(item => {
        const day = item.date.getDay();
        return day.toString() === filters.dayOfWeek;
      });
    }
    
    setFilteredData(filtered);
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Export data to Excel
  const exportToExcel = () => {
    const exportData = filteredData.map(item => ({
      'Date': format(item.date, 'yyyy-MM-dd'),
      'Time': format(item.date, 'HH:mm:ss'),
      'Member ID': item.userid || 'N/A',
      'Member Name': item.member ? `${item.member.firstName} ${item.member.lastName}` : 'N/A',
      'Email': item.member ? item.member.email : 'N/A',
      'Membership Plan': item.member && item.member.membershipPlan ? item.member.membershipPlan : 'N/A',
      'Location': item.location ? `${item.location.latitude}, ${item.location.longitude}` : 'N/A',
      'QR Code ID': item.qrCodeId || 'N/A'
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    
    // Generate filename with date range
    const fromDate = format(startDate, 'yyyy-MM-dd');
    const toDate = format(endDate, 'yyyy-MM-dd');
    const fileName = `Attendance_${fromDate}_to_${toDate}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
  };

  // Print report
  const printReport = () => {
    window.print();
  };

  // Calculate attendance statistics
  const calculateStats = () => {
    if (!filteredData.length) return { total: 0, uniqueMembers: 0, avgPerDay: 0, peakDay: 'N/A', peakHour: 'N/A' };
    
    // Total attendance count
    const total = filteredData.length;
    
    // Unique members count
    const uniqueMemberIds = new Set(filteredData.map(item => item.userid).filter(Boolean));
    const uniqueMembers = uniqueMemberIds.size;
    
    // Average attendance per day
    const dayCount = {};
    filteredData.forEach(item => {
      const day = format(item.date, 'yyyy-MM-dd');
      dayCount[day] = (dayCount[day] || 0) + 1;
    });
    const avgPerDay = Object.keys(dayCount).length > 0 
      ? (total / Object.keys(dayCount).length).toFixed(1) 
      : 0;
    
    // Peak day
    let maxDay = '';
    let maxDayCount = 0;
    Object.entries(dayCount).forEach(([day, count]) => {
      if (count > maxDayCount) {
        maxDay = day;
        maxDayCount = count;
      }
    });
    const peakDay = maxDay ? `${format(parseISO(maxDay), 'EEE, MMM d')} (${maxDayCount})` : 'N/A';
    
    // Peak hour
    const hourCount = {};
    filteredData.forEach(item => {
      const hour = item.date.getHours();
      hourCount[hour] = (hourCount[hour] || 0) + 1;
    });
    let maxHour = -1;
    let maxHourCount = 0;
    Object.entries(hourCount).forEach(([hour, count]) => {
      if (count > maxHourCount) {
        maxHour = parseInt(hour);
        maxHourCount = count;
      }
    });
    const peakHour = maxHour >= 0 ? `${maxHour}:00 - ${maxHour + 1}:00 (${maxHourCount})` : 'N/A';
    
    return { total, uniqueMembers, avgPerDay, peakDay, peakHour };
  };

  // Prepare chart data
  const prepareChartData = () => {
    // Daily attendance chart data
    const dailyData = {};
    filteredData.forEach(item => {
      const day = format(item.date, 'yyyy-MM-dd');
      dailyData[day] = (dailyData[day] || 0) + 1;
    });
    
    const sortedDays = Object.keys(dailyData).sort();
    
    const dailyChartData = {
      labels: sortedDays.map(day => format(parseISO(day), 'MMM d')),
      datasets: [
        {
          label: 'Daily Attendance',
          data: sortedDays.map(day => dailyData[day]),
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.2)',
          tension: 0.4,
          fill: true
        }
      ]
    };
    
    // Hourly distribution chart data
    const hourlyData = Array(24).fill(0);
    filteredData.forEach(item => {
      const hour = item.date.getHours();
      hourlyData[hour]++;
    });
    
    const hourlyChartData = {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [
        {
          label: 'Hourly Distribution',
          data: hourlyData,
          backgroundColor: 'rgba(46, 125, 50, 0.7)'
        }
      ]
    };
    
    // Day of week distribution chart data
    const dayOfWeekData = Array(7).fill(0);
    filteredData.forEach(item => {
      const dayOfWeek = item.date.getDay();
      dayOfWeekData[dayOfWeek]++;
    });
    
    const dayOfWeekChartData = {
      labels: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      datasets: [
        {
          label: 'Day of Week Distribution',
          data: dayOfWeekData,
          backgroundColor: [
            '#f44336', '#e91e63', '#9c27b0', '#673ab7', 
            '#3f51b5', '#2196f3', '#03a9f4'
          ]
        }
      ]
    };
    
    return { dailyChartData, hourlyChartData, dayOfWeekChartData };
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };

  // Get statistics
  const stats = calculateStats();
  
  // Get chart data
  const { dailyChartData, hourlyChartData, dayOfWeekChartData } = prepareChartData();

  return (
    <AdminLayout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Attendance Reports
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" paragraph>
          View and analyze gym attendance data
        </Typography>
        
        {/* Date Range Selector */}
        <Paper sx={{ p: 2, mb: 3 }} elevation={3}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={dateRange}
                  label="Date Range"
                  onChange={(e) => handleDateRangeChange(e.target.value)}
                >
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="yesterday">Yesterday</MenuItem>
                  <MenuItem value="week">This Week</MenuItem>
                  <MenuItem value="last_week">Last Week</MenuItem>
                  <MenuItem value="month">This Month</MenuItem>
                  <MenuItem value="last_month">Last Month</MenuItem>
                  <MenuItem value="custom">Custom Range</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {dateRange === 'custom' && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Start Date"
                      value={startDate}
                      onChange={(newValue) => {
                        setStartDate(newValue);
                        fetchAttendanceData(newValue, endDate);
                      }}
                      renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="End Date"
                      value={endDate}
                      onChange={(newValue) => {
                        setEndDate(newValue);
                        fetchAttendanceData(startDate, newValue);
                      }}
                      renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                    />
                  </LocalizationProvider>
                </Grid>
              </>
            )}
          </Grid>
          
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Autocomplete
              options={members}
              getOptionLabel={(option) => option.fullName}
              value={selectedMember}
              onChange={(event, newValue) => setSelectedMember(newValue)}
              sx={{ width: 250 }}
              renderInput={(params) => <TextField {...params} label="Filter by Member" size="small" />}
            />
            
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setShowFilters(!showFilters)}
              size="small"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => handleDateRangeChange(dateRange)}
              size="small"
            >
              Refresh
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<GetApp />}
              onClick={exportToExcel}
              size="small"
              disabled={filteredData.length === 0}
            >
              Export
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={printReport}
              size="small"
              disabled={filteredData.length === 0}
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
              Print
            </Button>
          </Box>
          
          {showFilters && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Time of Day</InputLabel>
                    <Select
                      value={filters.timeOfDay}
                      label="Time of Day"
                      onChange={(e) => setFilters({ ...filters, timeOfDay: e.target.value })}
                    >
                      <MenuItem value="all">All Times</MenuItem>
                      <MenuItem value="morning">Morning (5AM - 12PM)</MenuItem>
                      <MenuItem value="afternoon">Afternoon (12PM - 5PM)</MenuItem>
                      <MenuItem value="evening">Evening (5PM - 9PM)</MenuItem>
                      <MenuItem value="night">Night (9PM - 5AM)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Day of Week</InputLabel>
                    <Select
                      value={filters.dayOfWeek}
                      label="Day of Week"
                      onChange={(e) => setFilters({ ...filters, dayOfWeek: e.target.value })}
                    >
                      <MenuItem value="all">All Days</MenuItem>
                      <MenuItem value="0">Sunday</MenuItem>
                      <MenuItem value="1">Monday</MenuItem>
                      <MenuItem value="2">Tuesday</MenuItem>
                      <MenuItem value="3">Wednesday</MenuItem>
                      <MenuItem value="4">Thursday</MenuItem>
                      <MenuItem value="5">Friday</MenuItem>
                      <MenuItem value="6">Saturday</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>
        
        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="subtitle2">
                  Total Check-ins
                </Typography>
                <Typography variant="h4" component="div">
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="subtitle2">
                  Unique Members
                </Typography>
                <Typography variant="h4" component="div">
                  {stats.uniqueMembers}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="subtitle2">
                  Avg. Per Day
                </Typography>
                <Typography variant="h4" component="div">
                  {stats.avgPerDay}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="subtitle2">
                  Peak Day
                </Typography>
                <Typography variant="h6" component="div">
                  {stats.peakDay}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="subtitle2">
                  Peak Hour
                </Typography>
                <Typography variant="h6" component="div">
                  {stats.peakHour}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Tabs for different views */}
        <Paper sx={{ mb: 3 }} elevation={3}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab icon={<BarChart />} label="Charts" />
            <Tab icon={<PeopleAlt />} label="Attendance List" />
          </Tabs>
          
          {/* Charts View */}
          {tabValue === 0 && (
            <Box sx={{ p: 3 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : filteredData.length > 0 ? (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      <Timeline sx={{ verticalAlign: 'middle', mr: 1 }} />
                      Daily Attendance
                    </Typography>
                    <Box sx={{ height: 300, mb: 4 }}>
                      <Line data={dailyChartData} options={chartOptions} />
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      <BarChart sx={{ verticalAlign: 'middle', mr: 1 }} />
                      Hourly Distribution
                    </Typography>
                    <Box sx={{ height: 300 }}>
                      <Bar data={hourlyChartData} options={chartOptions} />
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      <PieChart sx={{ verticalAlign: 'middle', mr: 1 }} />
                      Day of Week Distribution
                    </Typography>
                    <Box sx={{ height: 300 }}>
                      <Pie data={dayOfWeekChartData} />
                    </Box>
                  </Grid>
                </Grid>
              ) : (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" color="textSecondary">
                    No attendance data found for the selected period
                  </Typography>
                </Box>
              )}
            </Box>
          )}
          
          {/* Attendance List View */}
          {tabValue === 1 && (
            <Box>
              {loading && filteredData.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : filteredData.length > 0 ? (
                <>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Time</TableCell>
                          <TableCell>Member</TableCell>
                          <TableCell>Membership</TableCell>
                          <TableCell>Location</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredData
                          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                          .map((row) => (
                            <TableRow key={row.id}>
                              <TableCell>{format(row.date, 'yyyy-MM-dd')}</TableCell>
                              <TableCell>{format(row.date, 'HH:mm:ss')}</TableCell>
                              <TableCell>
                                {row.member ? (
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Person sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
                                    {row.member.firstName} {row.member.lastName}
                                  </Box>
                                ) : (
                                  'N/A'
                                )}
                              </TableCell>
                              <TableCell>
                                {row.member && row.member.membershipPlan ? (
                                  <Chip 
                                    label={row.member.membershipPlan} 
                                    size="small" 
                                    color="primary" 
                                    variant="outlined" 
                                  />
                                ) : (
                                  'N/A'
                                )}
                              </TableCell>
                              <TableCell>
                                {row.location ? (
                                  <Tooltip title={`${row.location.latitude}, ${row.location.longitude}`}>
                                    <Chip 
                                      label="Location Verified" 
                                      size="small" 
                                      color="success" 
                                      variant="outlined" 
                                    />
                                  </Tooltip>
                                ) : (
                                  <Chip 
                                    label="No Location" 
                                    size="small" 
                                    color="default" 
                                    variant="outlined" 
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                    <Box>
                      {loading && <CircularProgress size={24} sx={{ mr: 2 }} />}
                      {hasMore && (
                        <Button 
                          onClick={loadMoreAttendance} 
                          disabled={loading}
                          size="small"
                        >
                          Load More
                        </Button>
                      )}
                    </Box>
                    
                    <TablePagination
                      component="div"
                      count={filteredData.length}
                      page={page}
                      onPageChange={handleChangePage}
                      rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={handleChangeRowsPerPage}
                      rowsPerPageOptions={[10, 25, 50, 100]}
                    />
                  </Box>
                </>
              ) : (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" color="textSecondary">
                    No attendance data found for the selected period
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Paper>
      </Container>
      
      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </AdminLayout>
  );
};

export default AttendanceReports;