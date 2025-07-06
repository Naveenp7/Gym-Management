const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {getAuth} = require("firebase-admin/auth");
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
        // We only abort if the user has EXPLICITLY opted out.
        // If the preference is not set, we assume they want to receive emails.
        if (memberData?.preferences?.receiveEmails === false) {
          console.log(`User ${userId} has opted out of email notifications. Aborting.`);
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

// Function to create a notification when a member's plan is updated or assigned.
// This will then trigger sendCustomNotificationEmail to send the email.
exports.createMembershipUpdateNotification = functions.firestore
    .document("members/{memberId}")
    .onWrite(async (change, context) => {
      const beforeData = change.before.data();
      const afterData = change.after.data();
      const userId = context.params.memberId;

      // Exit if the document was deleted or if membership expiry is not set.
      if (!afterData || !afterData.membershipExpiry) {
        console.log("No 'after' data or no membership expiry. Exiting.");
        return null;
      }

      // Check if the membershipExpiry date or plan has actually changed.
      const oldExpiry = beforeData ? beforeData.membershipExpiry : null;
      const newExpiry = afterData.membershipExpiry;

      if (oldExpiry && newExpiry && oldExpiry.isEqual(newExpiry) &&
        beforeData.membershipPlan === afterData.membershipPlan) {
        console.log("Membership expiry date has not changed. Exiting.");
        return null;
      }

      try {
        // Fetch user data to get their name for the notification message.
        const userDoc = await admin.firestore()
            .collection("users").doc(userId).get();
        const userData = userDoc.data();

        // Construct the notification message.
        const notificationMessage = `Your membership plan has been updated to ${
          afterData.membershipPlan
        }. It is now valid until ${new Date(
    afterData.membershipExpiry.toDate(),
).toLocaleDateString()}.`;

        // Create the in-app notification document.
        await admin.firestore().collection("notifications").add({
          title: "Membership Updated",
          message: notificationMessage,
          userId: userId,
          type: "membership",
          category: "membership",
          priority: "normal",
          read: false,
          adminView: true, // So admin can see this was sent
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: "System",
          createdByName: "System Automation",
          userName: userData ? (userData.firstName || "Member") : "Member",
        });

        console.log("Membership update notification created for:", userId);
        return null;
      } catch (error) {
        console.error("Error creating membership update notification:", error);
        return null;
      }
    });

// Sets a custom 'role' claim on a user when their document in the 'users'
// collection is created or updated.
exports.setUserRole = functions.firestore
    .document("users/{userId}")
    .onWrite(async (change, context) => {
      const userData = change.after.data();
      const userId = context.params.userId;

      // Check if the role field exists and has a value
      if (userData && userData.role) {
        try {
          // Set custom claims for the user
          await getAuth().setCustomUserClaims(userId, {role: userData.role});
          console.log(
              `Custom claim 'role: ${userData.role}' set for user ${userId}`,
          );
        } catch (error) {
          console.error(
              `Error setting custom claim for user ${userId}:`, error);
        }
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
        // We only abort if the user has EXPLICITLY opted out.
        // If the preference is not set, we assume they want to receive emails.
        if (memberData?.preferences?.receiveEmails === false) {
          console.log(`User ${userId} has opted out of email notifications. Aborting.`);
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
                ${notificationData.imageUrl ? `<img src="${notificationData.imageUrl}" alt="Notification Image" style="max-width: 100%; height: auto; display: block; margin-top: 10px; border-radius: 8px;"/>` : ''}
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