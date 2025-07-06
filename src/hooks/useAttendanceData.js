import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';
import { COLLECTIONS } from '../constants/firestore';

const useAttendanceData = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMembersAndAttendance = async () => {
      try {
        setLoading(true);
        const usersCollectionRef = collection(db, COLLECTIONS.USERS);
        const usersSnapshot = await getDocs(usersCollectionRef);
        const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const attendanceCollectionRef = collection(db, COLLECTIONS.ATTENDANCE);
        const q = query(
          attendanceCollectionRef,
          where('date', '>=', startOfDay),
          where('date', '<=', endOfDay)
        );
        const attendanceSnapshot = await getDocs(q);
        const presentUserIds = new Set(attendanceSnapshot.docs.map(doc => doc.data().userId));

        const membersWithStatus = await Promise.all(usersList.map(async (user) => {

          const isPresent = presentUserIds.has(user.id);
          let membershipPlan = 'N/A';
          let remainingDays = 'N/A';

          console.log('Processing user:', user.id, 'Membership Plan ID:', user.membershipPlanId, 'Membership End Date:', user.membershipEndDate);
          if (user.membershipPlanId) {
            const planDocRef = doc(db, COLLECTIONS.MEMBERSHIP_PLANS, user.membershipPlanId);
            const planDocSnap = await getDoc(planDocRef);
            console.log('Membership Plan Doc Exists:', planDocSnap.exists(), 'for user:', user.id);
            if (planDocSnap.exists()) {
              const planData = planDocSnap.data();
              membershipPlan = planData.name;

              if (user.membershipEndDate) {
                const endDate = new Date(user.membershipEndDate);
                const todayDate = new Date();
                const diffTime = endDate.getTime() - todayDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                remainingDays = diffDays > 0 ? diffDays : 0;
              } else {
                remainingDays = 'N/A'; // Explicitly set to N/A if membershipEndDate is missing
              }
            }
          }

          return { ...user, isPresent, membershipPlan, remainingDays };
        }));

        setMembers(membersWithStatus);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load members and attendance data.');
      } finally {
        setLoading(false);
      }
    };

    fetchMembersAndAttendance();
  }, []);

  return { members, loading, error };
};

export default useAttendanceData;