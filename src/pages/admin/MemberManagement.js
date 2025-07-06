import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Button,
  TextField,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  InputAdornment,
  Snackbar,
  Alert,
  CircularProgress,
  Tooltip,
  Divider
} from '@mui/material';
import { 
  Add, 
  Edit, 
  Delete, 
  Search, 
  Refresh,
  FilterList,
  CheckCircle,
  Warning,
  Email,
  Phone,
  CalendarToday,
  QrCode,
  FileDownload
} from '@mui/icons-material';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  Timestamp,
  orderBy,
  startAfter,
  limit
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/layouts/AdminLayout';
import * as XLSX from 'xlsx';

const MemberManagement = () => {
  const { currentUser } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'edit'
  const [selectedMember, setSelectedMember] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    address: '',
    membershipPlan: 'monthly',
    membershipStartDate: '',
    membershipExpiry: '',
    notes: ''
  });

  // Fetch members from Firestore
  useEffect(() => {
    fetchMembers();
  }, [filterStatus]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      
      let membersQuery;
      
      if (filterStatus === 'all') {
        membersQuery = query(
          collection(db, 'members'),
          orderBy('firstName') // or 'lastName' or any field you want to sort by
        );
      } else if (filterStatus === 'active') {
        const now = Timestamp.now();
        membersQuery = query(
          collection(db, 'members'),
          where('membershipExpiry', '>', now),
          orderBy('membershipExpiry')
        );
      } else if (filterStatus === 'expired') {
        const now = Timestamp.now();
        membersQuery = query(
          collection(db, 'members'),
          where('membershipExpiry', '<', now),
          orderBy('membershipExpiry', 'desc')
        );
      } else if (filterStatus === 'expiring') {
        const now = Timestamp.now();
        const sevenDaysLater = new Date();
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
        const sevenDaysLaterTimestamp = Timestamp.fromDate(sevenDaysLater);
        
        membersQuery = query(
          collection(db, 'members'),
          where('membershipExpiry', '>', now),
          where('membershipExpiry', '<', sevenDaysLaterTimestamp),
          orderBy('membershipExpiry')
        );
      }
      
      const membersSnapshot = await getDocs(membersQuery);
      const membersData = membersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        membershipStartDate: doc.data().membershipStartDate?.toDate(),
        membershipExpiry: doc.data().membershipExpiry?.toDate()
      }));
      
      setMembers(membersData);
    } catch (error) {
      console.error('Error fetching members:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching members: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  // Filter members based on search term
  const filteredMembers = members.filter(member => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (member.name && member.name.toLowerCase().includes(searchLower)) ||
      (member.email && member.email.toLowerCase().includes(searchLower)) ||
      (member.phone && member.phone.includes(searchTerm))
    );
  });

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Open dialog for adding new member
  const handleAddMember = () => {
    setDialogMode('add');
    setFormData({
      email: '',
      name: '',
      phone: '',
      address: '',
      membershipPlan: 'monthly',
      membershipStartDate: new Date().toISOString().split('T')[0],
      membershipExpiry: '',
      notes: ''
    });
    setOpenDialog(true);
  };

  // Open dialog for editing member
  const handleEditMember = (member) => {
    setDialogMode('edit');
    setSelectedMember(member);
    
    // Format dates for form inputs
    const startDate = member.membershipStartDate 
      ? new Date(member.membershipStartDate).toISOString().split('T')[0]
      : '';
      
    const expiryDate = member.membershipExpiry 
      ? new Date(member.membershipExpiry).toISOString().split('T')[0]
      : '';
    
    setFormData({
      email: member.email || '',
      name: member.name || '',
      phone: member.phone || '',
      address: member.address || '',
      membershipPlan: member.membershipPlan || 'monthly',
      membershipStartDate: startDate,
      membershipExpiry: expiryDate,
      notes: member.notes || ''
    });
    
    setOpenDialog(true);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Auto-calculate expiry date when start date or plan changes
    if (name === 'membershipStartDate' || name === 'membershipPlan') {
      if (formData.membershipStartDate) {
        const startDate = new Date(formData.membershipStartDate);
        let expiryDate = new Date(startDate);
        
        // Calculate expiry date based on plan
        const plan = name === 'membershipPlan' ? value : formData.membershipPlan;
        
        switch (plan) {
          case 'monthly':
            expiryDate.setMonth(expiryDate.getMonth() + 1);
            break;
          case 'quarterly':
            expiryDate.setMonth(expiryDate.getMonth() + 3);
            break;
          case 'halfYearly':
            expiryDate.setMonth(expiryDate.getMonth() + 6);
            break;
          case 'yearly':
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            break;
          default:
            expiryDate.setMonth(expiryDate.getMonth() + 1);
        }
        
        // Format expiry date for input
        const formattedExpiryDate = expiryDate.toISOString().split('T')[0];
        
        setFormData(prevData => ({
          ...prevData,
          membershipExpiry: formattedExpiryDate,
          [name]: value // Make sure to update the changed field
        }));
      }
    }
  };

  // Save member data
  const handleSaveMember = async () => {
    try {
      setLoading(true);
      
      // Validate form data
      if (!formData.email || !formData.name || !formData.membershipStartDate || !formData.membershipExpiry) {
        setSnackbar({
          open: true,
          message: 'Please fill in all required fields',
          severity: 'error'
        });
        setLoading(false);
        return;
      }
      
      // Prepare member data
      const memberData = {
        email: formData.email,
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        membershipPlan: formData.membershipPlan,
        membershipStartDate: Timestamp.fromDate(new Date(formData.membershipStartDate)),
        membershipExpiry: Timestamp.fromDate(new Date(formData.membershipExpiry)),
        notes: formData.notes,
        role: 'member',
        updatedAt: Timestamp.now()
      };
      // Determine membership status based on expiry date
      const now = new Date();
      const expiry = new Date(formData.membershipExpiry);
      memberData.membershipStatus = expiry >= now ? "active" : "inactive";
      
      if (dialogMode === 'add') {
        // Create new user in Firebase Auth
        const tempPassword = Math.random().toString(36).slice(-8); // Generate random password
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, tempPassword);
        // Add user data to Firestore (members collection)
        memberData.createdAt = Timestamp.now();
        await setDoc(doc(db, 'members', userCredential.user.uid), memberData);
        // Add user data to Firestore (users collection)
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          role: 'member',
          createdAt: Timestamp.now()
        });
        // Send password reset email
        await sendPasswordResetEmail(auth, formData.email);
        setSnackbar({
          open: true,
          message: 'Member added successfully! A password reset email has been sent.',
          severity: 'success'
        });
        console.log('Member added, staying on admin panel. No redirect will occur.');
      } else if (dialogMode === 'edit') {
        // Update existing user in Firestore
        await updateDoc(doc(db, 'members', selectedMember.id), memberData);
        
        setSnackbar({
          open: true,
          message: 'Member updated successfully!',
          severity: 'success'
        });
      }
      
      // Close dialog and refresh members list
      setOpenDialog(false);
      fetchMembers();
    } catch (error) {
      console.error('Error saving member:', error);
      setSnackbar({
        open: true,
        message: 'Error saving member: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (member) => {
    setMemberToDelete(member);
    setDeleteConfirmOpen(true);
  };

  // Delete member
  const handleDeleteMember = async () => {
    try {
      setLoading(true);
      
      // Delete user from Firestore
      await deleteDoc(doc(db, 'members', memberToDelete.id));
      
      setSnackbar({
        open: true,
        message: 'Member deleted successfully!',
        severity: 'success'
      });
      
      // Close dialog and refresh members list
      setDeleteConfirmOpen(false);
      fetchMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
      setSnackbar({
        open: true,
        message: 'Error deleting member: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Export members to Excel
  const exportToExcel = () => {
    try {
      // Prepare data for export
      const exportData = filteredMembers.map(member => ({
        'Name': member.name || '',
        'Email': member.email || '',
        'Phone': member.phone || '',
        'Address': member.address || '',
        'Membership Plan': member.membershipPlan || '',
        'Start Date': member.membershipStartDate ? new Date(member.membershipStartDate).toLocaleDateString() : '',
        'Expiry Date': member.membershipExpiry ? new Date(member.membershipExpiry).toLocaleDateString() : '',
        'Status': isMembershipActive(member.membershipExpiry) ? 'Active' : 'Expired',
        'Notes': member.notes || ''
      }));
      
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Members');
      
      // Generate Excel file
      XLSX.writeFile(workbook, `Gym_Members_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      setSnackbar({
        open: true,
        message: 'Members exported to Excel successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setSnackbar({
        open: true,
        message: 'Error exporting to Excel: ' + error.message,
        severity: 'error'
      });
    }
  };

  // Check if membership is active
  const isMembershipActive = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) > new Date();
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate days remaining in membership
  const calculateDaysRemaining = (expiryDate) => {
    if (!expiryDate) return 0;
    
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <AdminLayout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Member Management
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" paragraph>
          Add, edit, and manage gym members
        </Typography>
        
        {/* Actions Bar */}
        <Paper sx={{ p: 2, mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }} elevation={3}>
          <TextField
            label="Search Members"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={handleSearch}
            sx={{ flexGrow: 1, minWidth: '200px' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl variant="outlined" size="small" sx={{ minWidth: '150px' }}>
            <InputLabel>Status Filter</InputLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              label="Status Filter"
            >
              <MenuItem value="all">All Members</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="expired">Expired</MenuItem>
              <MenuItem value="expiring">Expiring Soon</MenuItem>
            </Select>
          </FormControl>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={handleAddMember}
          >
            Add Member
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchMembers}
          >
            Refresh
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            onClick={exportToExcel}
          >
            Export
          </Button>
        </Paper>
        
        {/* Members Table */}
        <Paper sx={{ width: '100%', overflow: 'hidden' }} elevation={3}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
              <CircularProgress />
            </Box>
          ) : filteredMembers.length > 0 ? (
            <>
              <TableContainer sx={{ maxHeight: 440 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell>Membership</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMembers
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((member) => {
                        const isActive = isMembershipActive(member.membershipExpiry);
                        const daysRemaining = calculateDaysRemaining(member.membershipExpiry);
                        
                        return (
                          <TableRow hover key={member.id}>
                            <TableCell>
                              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                  {member.name || 'No Name'}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                  ID: {member.id.substring(0, 8)}
                                </Typography>
                              </Box>
                            </TableCell>
                            
                            <TableCell>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Email fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                  <Typography variant="body2">{member.email}</Typography>
                                </Box>
                                {member.phone && (
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Phone fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                    <Typography variant="body2">{member.phone}</Typography>
                                  </Box>
                                )}
                              </Box>
                            </TableCell>
                            
                            <TableCell>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <Chip 
                                  label={member.membershipPlan ? member.membershipPlan.charAt(0).toUpperCase() + member.membershipPlan.slice(1) : 'No Plan'} 
                                  size="small" 
                                  color="primary" 
                                  variant="outlined" 
                                />
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <CalendarToday fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                  <Typography variant="body2">
                                    Expires: {formatDate(member.membershipExpiry)}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            
                            <TableCell>
                              {isActive ? (
                                <Chip 
                                  icon={<CheckCircle />} 
                                  label={daysRemaining <= 7 ? `${daysRemaining} days left` : 'Active'} 
                                  color={daysRemaining <= 7 ? 'warning' : 'success'} 
                                  size="small" 
                                />
                              ) : (
                                <Chip 
                                  icon={<Warning />} 
                                  label="Expired" 
                                  color="error" 
                                  size="small" 
                                />
                              )}
                            </TableCell>
                            
                            <TableCell align="right">
                              <Tooltip title="Edit Member">
                                <IconButton onClick={() => handleEditMember(member)} color="primary">
                                  <Edit />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Member">
                                <IconButton onClick={() => handleDeleteClick(member)} color="error">
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredMembers.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary">
                No members found
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {searchTerm ? 'Try a different search term' : 'Add your first member to get started'}
              </Typography>
            </Box>
          )}
        </Paper>
      </Container>
      
      {/* Add/Edit Member Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New Member' : 'Edit Member'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="email"
                label="Email Address"
                value={formData.email}
                onChange={handleInputChange}
                fullWidth
                required
                disabled={dialogMode === 'edit'} // Email cannot be changed for existing users
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="name"
                label="Full Name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                required
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="phone"
                label="Phone Number"
                value={formData.phone}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Membership Plan</InputLabel>
                <Select
                  name="membershipPlan"
                  value={formData.membershipPlan}
                  onChange={handleInputChange}
                  label="Membership Plan"
                >
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly (3 months)</MenuItem>
                  <MenuItem value="halfYearly">Half-Yearly (6 months)</MenuItem>
                  <MenuItem value="yearly">Yearly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="membershipStartDate"
                label="Membership Start Date"
                type="date"
                value={formData.membershipStartDate}
                onChange={handleInputChange}
                fullWidth
                required
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="membershipExpiry"
                label="Membership Expiry Date"
                type="date"
                value={formData.membershipExpiry}
                onChange={handleInputChange}
                fullWidth
                required
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="address"
                label="Address"
                value={formData.address}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={2}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="notes"
                label="Notes"
                value={formData.notes}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={3}
                margin="normal"
              />
            </Grid>
          </Grid>
          
          {dialogMode === 'add' && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="body2">
                A temporary password will be generated and a password reset email will be sent to the member.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveMember} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete the member: <strong>{memberToDelete?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            This action cannot be undone. All member data will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteMember} 
            variant="contained" 
            color="error"
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      
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

export default MemberManagement;