import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { exec } from "child_process"; // Import exec from child_process to run Python script
import multer from 'multer';
import path from 'path';import { Sequelize, DataTypes } from "sequelize";
import bcrypt from "bcrypt"; import jwt from "jsonwebtoken";
import fs from 'fs'; import { User } from './components/models/userModel.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
const SALT_ROUNDS = 10;
// Utility function to send email by triggering the Python script
const sendEmail = (recipient, subject, body) => {
  return new Promise((resolve, reject) => {
    // Construct the command to run the Python script
    const command = `cd components/mail services && python3 send_email.py ${recipient} "${subject}" "${body}"`;

    // Execute the Python script
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return reject(error);
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return reject(stderr);
      }
      console.log(`stdout: ${stdout}`);
      resolve(stdout);
    });
  });
};

// Example route to send OTP via email
app.post("/api/PhoneOrEmailValidate", async (req, res) => {
  const { email, phone } = req.body; // Destructure email and phone from the request body

  if (!email && !phone) {
    return res
      .status(400)
      .json({ error: "Either 'email' or 'phone' must be provided." });
  }

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000); // Generate a random OTP

  // Store OTP in-memory (Optional, based on your logic)
  const recipient = email || phone;

  // Send OTP via email (if email is provided)
  if (email) {
    const subject = "Verify OTP for signup process";
    const body = `Your OTP is: ${otp}. Please use this to complete your signup process and enjoy your online presence.`;
    try {
      await sendEmail(email, subject, body); // Trigger the Python email service
      console.log(`OTP email sent to ${email}`);
    } catch (error) {
      return res.status(500).json({ error: "Error sending OTP email." });
    }
  }

  // Respond with success and OTP (for development/testing purposes only)
  res.status(201).json({
    message: "OTP sent successfully. Please verify to complete signup.",
    recipient,
    otp, // Include the OTP in the response for frontend verification
    code: 201,
  });
});
// Create a storage engine to handle file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'user_images'); // Folder to save images
  },
  filename: (req, file, cb) => {
    const userId = req.body.user_id || 'default_user'; // Use the user_id provided in the request body
    const ext = path.extname(file.originalname); // Get file extension
    cb(null, `${userId}_profile_image${ext}`); // Save file with userId_profile_image.extension
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const mimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (mimeTypes.includes(file.mimetype)) {
      cb(null, true); // Accept the file
    } else {
      cb(new Error('Invalid file type, only JPEG and PNG are allowed'), false); // Reject file
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // Limit file size to 5MB
});

// Make sure 'user_images' directory exists
if (!fs.existsSync('user_images')) {
  fs.mkdirSync('user_images');
}

// Route to handle image upload
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  const imagePath = `user_images/${req.file.filename}`; // Path to the saved file

  // Optionally save the file path in the database

  res.status(200).json({
    message: 'Profile image uploaded successfully!',
    imagePath: imagePath, // Send the image path to the client
  });
});


// Auto-login API
app.post("/api/auto-login", async (req, res) => {
  const { unique_user_key } = req.body;

  try {
    // Validate input
    if (!unique_user_key) {
      return res.status(400).json({ error: "Missing unique_user_key." });
    }

    // Check if the user exists
    const user = await User.findOne({
      where: { unique_user_key },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.status(200).json({
      message: "User is authenticated.",
      user: {
        uuid: user.unique_user_key,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error during auto-login:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Mock Database or Data Source (replace with your actual database logic)

//  Route to check username availability
app.post('/api/check-username', async (req, res) => {
  const { username } = req.body;

  console.log("Checking username availability...");

  // Validate the username input
  if (!username || typeof username !== 'string' || username.trim() === '') {
    return res.status(400).json({
      error: "Username must be a non-empty string.",
    });
  }

  try {
    // Check if the username exists in the database (using Sequelize ORM)
    const user = await User.findOne({ where: { username: username } });

    // If user is found, the username is taken
    if (user) {
      return res.status(200).json({
        available: false,
        message: "Username is already taken."
      });
    } else {
      return res.status(200).json({
        available: true,
        message: "Username is available."
      });
    }
  } catch (error) {
    // Handle any errors that occur during the database query
    console.error(error);
    return res.status(500).json({
      error: "An error occurred while checking username availability.",
      details: error.message
    });
  }
});


// API for user signup
app.post("/api/signup", async (req, res) => {
  const {
    username,
    email,
    password,
    full_name,
    dob,
    country,
    timezone,
  } = req.body;
  
  try {
    // Validate required fields
    if (!username || !email || !password || !dob) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // Check for duplicate users
    const existingUser = await User.findOne({
      where: {
        [Sequelize.Op.or]: [{ username }, { email }],
      },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Username or email already exists." });
    }

    // Generate a unique user key
    const uniqueUserKey = `USER_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 15)}`;

    // Hash the password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create a new user
    const newUser = await User.create({
      unique_user_key: uniqueUserKey,
      username,
      email,
      password_hash: passwordHash,
      full_name,
      dob,
      country,
      timezone,
    });

    res.status(201).json({
      message: "User registered successfully!",
      user: {
       uuid:newUser.unique_user_key 
      },
    });
  } catch (error) {
    console.error("Error during user signup:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});
// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});