import { useState, useEffect } from 'react';
import { collection, query, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { calculateDaysRemaining } from '../utils/dateUtils';

const useAttendanceData = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch all members from the 'members' collection, which contains membership details.
        const membersQuery = query(collection(db, 'members'));
        const membersSnapshot = await getDocs(membersQuery);
        const allMembers = membersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        // 2. Fetch today's attendance records
        const today = new Date();
        const startOfToday = new Date(today.setHours(0, 0, 0, 0));
        const endOfToday = new Date(today.setHours(23, 59, 59, 999));

        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('date', '>=', Timestamp.fromDate(startOfToday)),
          where('date', '<=', Timestamp.fromDate(endOfToday))
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const presentMemberIds = new Set(attendanceSnapshot.docs.map(doc => doc.data().userId));

        // 3. Combine member data with attendance status and remaining days efficiently.
        const combinedData = allMembers.map(member => ({
          ...member,
          // Ensure fullName is available, falling back to name or constructing from firstName/lastName.
          fullName: member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim(),
          isPresent: presentMemberIds.has(member.id),
          // Use the centralized utility function for calculating remaining days.
          remainingDays: calculateDaysRemaining(member.membershipExpiry),
        }));

        setMembers(combinedData);
      } catch (err) {
        console.error("Error fetching attendance data:", err);
        setError('Failed to fetch attendance data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { members, loading, error };
};

export default useAttendanceData;