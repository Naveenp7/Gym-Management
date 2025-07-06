const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Configure the email transport using the default SMTP transport and a GMail account.
// For Gmail, enable less secure apps in your account settings.
// See: https://support.google.com/accounts/answer/6010255
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().gmail.email,
    pass: functions.config().gmail.password,
  },
});

exports.sendAttendanceEmail = functions.firestore
  .document('attendance/{attendanceId}')
  .onCreate(async (snap, context) => {
    const attendanceData = snap.data();
    const userId = attendanceData.userId;

    try {
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      const userData = userDoc.data();

      if (!userData || !userData.email) {
        console.log('No email found for user:', userId);
        return null;
      }

      const mailOptions = {
        from: 'Your Gym <your-gym-email@gmail.com>', // Sender address
        to: userData.email, // List of recipients
        subject: 'Attendance Confirmation - Gym Check-in',
        html: `
          <p>Dear ${userData.firstName || 'Member'},</p>
          <p>This is to confirm your attendance at the gym on <strong>${new Date(attendanceData.date.toDate()).toLocaleString()}</strong>.</p>
          <p>Thank you for checking in!</p>
          <p>Best regards,</p>
          <p>The Gym Management Team</p>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log('Attendance confirmation email sent to:', userData.email);
      return null;
    } catch (error) {
      console.error('Error sending attendance email:', error);
      return null;
    }
  });