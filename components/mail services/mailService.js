// mailService.js

import nodemailer from "nodemailer";
sendEmail = "gokulgokul10203@gmail.com";
sender_password = "ymza fxgz pgmn edki";
// Create a transporter using SMTP or your preferred email service
const transporter = nodemailer.createTransport({
  service: "gmail", // or use other email services like SendGrid, SES, etc.
  auth: {
    user: sendEmail, // Your email (from your .env file)
    pass: sender_password, // Your email password or app-specific password
  },
});

// Common function to send email
export const sendEmail = (to, subject, text) => {
  const mailOptions = {
    from: process.env.EMAIL_USER, // Your email address
    to,
    subject,
    text, // Plain text email content
  };

  return transporter.sendMail(mailOptions);
};
