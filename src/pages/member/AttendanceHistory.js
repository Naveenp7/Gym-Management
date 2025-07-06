import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Divider,
  Button,
  TextField,
  Tooltip,
  IconButton,
  Snackbar,
  Alert
} from '@mui/material';
import {
  CalendarToday,
  AccessTime,
  LocationOn,
  FilterList,
  GetApp,
  Refresh,
  TrendingUp,
  CheckCircle,
  Today,
  DateRange,
  Event
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
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import MemberLayout from '../../components/layouts/MemberLayout';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, parseISO, isWithinInterval, addDays } from 'date-fns';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip as ChartTooltip, Legend } from 'chart.js';
import * as XLSX from 'xlsx';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
);

const AttendanceHistory = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());
  const [filters, setFilters] = useState({
    timeOfDay: 'all',
    dayOfWeek: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    thisWeek: 0,
    lastWeek: 0,
    thisMonth: 0,
    streak: 0
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch attendance data when component mounts or date range changes
  useEffect(() => {
    if (currentUser) {
      fetchAttendanceData();
    }
  }, [currentUser, dateRange, startDate, endDate]);

  // Apply filters when attendance data or filters change
  useEffect(() => {
    applyFilters();
    calculateStats();
  }, [attendanceData, filters]);

  // Fetch attendance data from Firestore
  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      
      // Determine date range
      let start, end;
      const today = new Date();
      
      switch (dateRange) {
        case 'week':
          start = startOfWeek(today);
          end = today;
          break;
        case 'month':
          start = startOfMonth(today);
          end = today;
          break;
        case 'three_months':
          start = subMonths(today, 3);
          end = today;
          break;
        case 'six_months':
          start = subMonths(today, 6);
          end = today;
          break;
        case 'year':
          start = subMonths(today, 12);
          end = today;
          break;
        case 'custom':
          start = startDate;
          end = endDate;
          break;
        default:
          start = subDays(today, 30);
          end = today;
      }
      
      // Create Firestore query
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('userId', '==', currentUser.uid),
        where('date', '>=', Timestamp.fromDate(startOfDay(start))),
        where('date', '<=', Timestamp.fromDate(endOfDay(end))),
        orderBy('date', 'desc')
      );
      
      // Execute query
      const attendanceSnapshot = await getDocs(attendanceQuery);
      
      // Process attendance data
      const attendanceList = attendanceSnapshot.docs.map(doc => {
        const data = doc.data();
        let dateObj = null;
        // Check if data.date exists and is a Firestore Timestamp with toDate() method
        if (data.date) {
          if (typeof data.date.toDate === 'function') {
            dateObj = data.date.toDate();
          } else {
            // Attempt to create a Date object from other potential formats
            const parsedDate = new Date(data.date);
            if (!isNaN(parsedDate.getTime())) { // Check if it's a valid date
              dateObj = parsedDate;
            }
          }
        }
        
        return {
          id: doc.id,
          date: dateObj, // Store the Date object or null
          location: data.location,
          qrCodeId: data.qrCodeId,
          ...data
        };
      }).filter(item => item.date instanceof Date && !isNaN(item.date.getTime())); // Ensure it's a Date object and valid
      
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

  // Apply filters to attendance data
  const applyFilters = () => {
    let filtered = [...attendanceData];
    
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

  // Calculate attendance statistics
  const calculateStats = () => {
    const today = new Date();
    const thisWeekStart = startOfWeek(today);
    const lastWeekStart = startOfWeek(subDays(thisWeekStart, 7));
    const lastWeekEnd = endOfWeek(lastWeekStart);
    const thisMonthStart = startOfMonth(today);
    
    // Count check-ins for different periods
    const thisWeekCount = attendanceData.filter(item => 
      isWithinInterval(item.date, { start: thisWeekStart, end: today })
    ).length;
    
    const lastWeekCount = attendanceData.filter(item => 
      isWithinInterval(item.date, { start: lastWeekStart, end: lastWeekEnd })
    ).length;
    
    const thisMonthCount = attendanceData.filter(item => 
      isWithinInterval(item.date, { start: thisMonthStart, end: today })
    ).length;
    
    // Calculate attendance streak
    let streak = 0;
    let currentDate = today;
    let foundGap = false;
    
    // Get all attendance dates and format them to YYYY-MM-DD for comparison
    const attendanceDates = attendanceData.map(item => 
      format(item.date, 'yyyy-MM-dd')
    );
    
    // Check for consecutive days, going backwards from today
    while (!foundGap && streak < 365) { // Cap at 365 days to prevent infinite loop
      const dateString = format(currentDate, 'yyyy-MM-dd');
      
      if (attendanceDates.includes(dateString)) {
        streak++;
        currentDate = subDays(currentDate, 1);
      } else {
        foundGap = true;
      }
    }
    
    setStats({
      total: attendanceData.length,
      thisWeek: thisWeekCount,
      lastWeek: lastWeekCount,
      thisMonth: thisMonthCount,
      streak
    });
  };

  // Handle date range change
  const handleDateRangeChange = (event) => {
    setDateRange(event.target.value);
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

  // Export attendance data to Excel
  const exportToExcel = () => {
    const exportData = filteredData.map(item => ({
      'Date': format(item.date, 'yyyy-MM-dd'),
      'Time': format(item.date, 'HH:mm:ss'),
      'Day of Week': format(item.date, 'EEEE'),
      'Location': item.location ? `${item.location.latitude}, ${item.location.longitude}` : 'N/A',
      'QR Code ID': item.qrCodeId || 'N/A'
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    
    // Generate filename with date range
    const fromDate = format(startDate, 'yyyy-MM-dd');
    const toDate = format(endDate, 'yyyy-MM-dd');
    const fileName = `My_Attendance_${fromDate}_to_${toDate}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
  };

  // Prepare chart data for attendance visualization
  const prepareChartData = () => {
    // Get last 14 days for the chart
    const today = new Date();
    const days = [];
    const attendanceByDay = {};
    
    // Initialize all days with 0 attendance
    for (let i = 13; i >= 0; i--) {
      const day = subDays(today, i);
      const dayStr = format(day, 'yyyy-MM-dd');
      days.push(dayStr);
      attendanceByDay[dayStr] = 0;
    }
    
    // Count attendance for each day
    attendanceData.forEach(item => {
      // Check if item.date is a valid Date object before formatting
      if (item.date && !isNaN(item.date.getTime())) {
        const dayStr = format(item.date, 'yyyy-MM-dd');
        if (attendanceByDay[dayStr] !== undefined) {
          attendanceByDay[dayStr] = 1; // Mark as attended (we only care about if they attended, not how many times)
        }
      }
    });
    
    // Prepare chart data
    const chartData = {
      labels: days.map(day => format(parseISO(day), 'MMM d')),
      datasets: [
        {
          label: 'Attendance',
          data: days.map(day => attendanceByDay[day]),
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.2)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#4caf50'
        }
      ]
    };
    
    return chartData;
  };

  // Chart options
  const chartOptions = {
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
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return context.raw === 0 ? 'Absent' : 'Present';
          }
        }
      }
    }
  };

  return (
    <MemberLayout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          My Attendance History
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" paragraph>
          View and track your gym attendance records
        </Typography>
        
        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CalendarToday color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" component="div">
                    Total Check-ins
                  </Typography>
                </Box>
                <Typography variant="h3" component="div" color="primary">
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Today color="secondary" sx={{ mr: 1 }} />
                  <Typography variant="h6" component="div">
                    This Week
                  </Typography>
                </Box>
                <Typography variant="h3" component="div" color="secondary">
                  {stats.thisWeek}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Last Week: {stats.lastWeek}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <DateRange color="info" sx={{ mr: 1 }} />
                  <Typography variant="h6" component="div">
                    This Month
                  </Typography>
                </Box>
                <Typography variant="h3" component="div" color="info.main">
                  {stats.thisMonth}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUp color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6" component="div">
                    Current Streak
                  </Typography>
                </Box>
                <Typography variant="h3" component="div" color="success.main">
                  {stats.streak}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Consecutive Days
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Attendance Chart */}
        <Paper sx={{ p: 3, mb: 3 }} elevation={3}>
          <Typography variant="h6" gutterBottom>
            Last 14 Days Attendance
          </Typography>
          <Box sx={{ height: 250 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : (
              <Line data={prepareChartData()} options={chartOptions} />
            )}
          </Box>
        </Paper>
        
        {/* Filters and Controls */}
        <Paper sx={{ p: 2, mb: 3 }} elevation={3}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={dateRange}
                  label="Date Range"
                  onChange={handleDateRangeChange}
                >
                  <MenuItem value="week">This Week</MenuItem>
                  <MenuItem value="month">This Month</MenuItem>
                  <MenuItem value="three_months">Last 3 Months</MenuItem>
                  <MenuItem value="six_months">Last 6 Months</MenuItem>
                  <MenuItem value="year">Last Year</MenuItem>
                  <MenuItem value="custom">Custom Range</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {dateRange === 'custom' && (
              <>
                <Grid item xs={12} sm={6} md={4}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Start Date"
                      value={startDate}
                      onChange={(newValue) => setStartDate(newValue)}
                      renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="End Date"
                      value={endDate}
                      onChange={(newValue) => setEndDate(newValue)}
                      renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                    />
                  </LocalizationProvider>
                </Grid>
              </>
            )}
          </Grid>
          
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
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
              onClick={fetchAttendanceData}
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
        
        {/* Attendance Table */}
        <Paper sx={{ width: '100%', mb: 3 }} elevation={3}>
          <TableContainer>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <CircularProgress />
              </Box>
            ) : filteredData.length > 0 ? (
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Day</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Location</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Event sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                            {format(row.date, 'yyyy-MM-dd')}
                          </Box>
                        </TableCell>
                        <TableCell>{format(row.date, 'EEEE')}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <AccessTime sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                            {format(row.date, 'HH:mm:ss')}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {row.location ? (
                            <Tooltip title={`${row.location.latitude}, ${row.location.longitude}`}>
                              <Chip 
                                icon={<LocationOn />}
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
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6" color="textSecondary">
                  No attendance records found
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Try changing your filters or date range
                </Typography>
              </Box>
            )}
          </TableContainer>
          
          {filteredData.length > 0 && (
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredData.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
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
    </MemberLayout>
  );
};

export default AttendanceHistory;
