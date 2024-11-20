// mailService.js

import nodemailer from "nodemailer";

// Create a transporter using SMTP or your preferred email service
const transporter = nodemailer.createTransport({
  service: "gmail", // or use other email services like SendGrid, SES, etc.
  auth: {
    user: process.env.EMAIL_USER, // Your email (from your .env file)
    pass: process.env.EMAIL_PASS, // Your email password or app-specific password
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
