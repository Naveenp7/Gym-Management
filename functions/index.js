const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configure the email transport using the default SMTP transport and a GMail account.
// For Gmail, enable less secure apps in your account settings.
// See: https://support.google.com/accounts/answer/6010255
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: functions.config().gmail.email,
    pass: functions.config().gmail.password,
  },
});

exports.sendAttendanceEmail = functions.firestore
    .document("attendance/{attendanceId}")
    .onCreate(async (snap, context) => {
      const attendanceData = snap.data();
      const userId = attendanceData.userId;

      try {
        // Fetch user, member, and settings data in parallel
        const userDocPromise = admin.firestore()
            .collection("users").doc(userId).get();
        const memberDocPromise = admin.firestore()
            .collection("members").doc(userId).get();
        const settingsDocPromise = admin.firestore()
            .collection("settings").doc("notifications").get();

        const [userDoc, memberDoc, settingsDoc] = await Promise.all([
          userDocPromise,
          memberDocPromise,
          settingsDocPromise,
        ]);

        const userData = userDoc.data();
        const memberData = memberDoc.data();
        const settingsData = settingsDoc.data();

        // --- Start of validation checks ---

        // 1. Check if global email notifications are enabled
        // AND if attendance notifications are enabled
        if (
          !settingsData ||
        !settingsData.enableEmailNotifications ||
        !settingsData.notifyOnAttendance
        ) {
          console.log("Attendance email notifications are disabled. Aborting.");
          return null;
        }

        // 2. Check if the user has an email address
        if (!userData || !userData.email) {
          console.log("No email found for user:", userId);
          return null;
        }

        // 3. Check if the member has opted-in to receive emails
        if (
          !memberData ||
        !memberData.preferences ||
        memberData.preferences.receiveEmails === false
        ) {
          const msg = `User ${userId} has opted out of email notifications. Aborting.`;
          console.log(msg);
          return null;
        }

        // --- End of validation checks ---

        const mailOptions = {
          from: `"${settingsData.gymName || "Your Gym"}" <${
            functions.config().gmail.email
          }>`,
          to: userData.email,
          subject: "Attendance Confirmation - Gym Check-in",
          html: `
            <p>Dear ${userData.firstName || "Member"},</p>
            <p>This is to confirm your attendance at the gym on 
            <strong>${new Date(
      attendanceData.date.toDate(),
  ).toLocaleString()}</strong>.</p>
            <p>Thank you for checking in!</p>
            <p>Best regards,</p>
            <p>The Gym Management Team</p>
          `,
        };

        await transporter.sendMail(mailOptions);
        console.log("Attendance confirmation email sent to:", userData.email);
        return null;
      } catch (error) {
        console.error("Error sending attendance email:", error);
        return null;
      }
    });
    
// New function to send email for general notifications created by an admin
exports.sendCustomNotificationEmail = functions.firestore
    .document("notifications/{notificationId}")
    .onCreate(async (snap, context) => {
      const notificationData = snap.data();
      const userId = notificationData.userId;

      if (!userId) {
        console.log("Notification has no userId, skipping email.");
        return null;
      }

      try {
        // Fetch user, member, and settings data in parallel
        const userDocPromise = admin.firestore()
            .collection("users").doc(userId).get();
        const memberDocPromise = admin.firestore()
            .collection("members").doc(userId).get();
        const settingsDocPromise = admin.firestore()
            .collection("settings").doc("notifications").get();

        const [userDoc, memberDoc, settingsDoc] = await Promise.all([
          userDocPromise,
          memberDocPromise,
          settingsDocPromise,
        ]);

        const userData = userDoc.data();
        const memberData = memberDoc.data();
        const settingsData = settingsDoc.data();

        // --- Start of validation checks ---

        // 1. Check if global email notifications are enabled
        if (!settingsData || !settingsData.enableEmailNotifications) {
          console.log("Global email notifications are disabled. Aborting.");
          return null;
        }

        // 2. Check if the user has an email address
        if (!userData || !userData.email) {
          console.log("No email found for user:", userId);
          return null;
        }

        // 3. Check if the member has opted-in to receive emails
        if (
          !memberData ||
        !memberData.preferences ||
        memberData.preferences.receiveEmails === false
        ) {
          console.log(
              `User ${userId} has opted out of email notifications. Aborting.`,
          );
          return null;
        }

        // --- End of validation checks ---

        const mailOptions = {
          from: `"${settingsData.gymName || "Your Gym"}" <${
            functions.config().gmail.email
          }>`,
          to: userData.email,
          subject: `New Notification: ${notificationData.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <h2>Hello ${userData.firstName || "Member"},</h2>
              <p>You have a new notification from the gym:</p>
              <div 
                style="
                  border-left: 4px solid #1976d2; 
                  padding-left: 16px; 
                  margin: 16px 0;
                "
              >
                <h3 style="margin: 0;">${notificationData.title}</h3>
                <p>${notificationData.message}</p>
              </div>
              <p>
                You can view this and other notifications by logging into 
                your member portal.
              </p>
              <p>Best regards,<br/>The Gym Management Team</p>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        console.log("Custom notification email sent to:", userData.email);
        return null;
      } catch (error) {
        console.error("Error sending custom notification email:", error);
        return null;
      }
    });