import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { exec } from "child_process"; // Import exec from child_process to run Python script
import multer from "multer";
import path from "path";
import { Sequelize, DataTypes } from "sequelize";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { User } from "./components/models/userModel.js";
import { dirname } from "path";
import { sendEmail } from "./components/mail services/mailService.js";

// Resolve the current directory for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
const SALT_ROUNDS = 10;
// Utility function to send email by triggering the Python script
// const sendEmail = (recipient, subject, body) => {
//   return new Promise((resolve, reject) => {
//     // Construct the command to run the Python script
//     const command = `cd components/mail services && python3 send_email.py ${recipient} "${subject}" "${body}"`;

//     // Execute the Python script
//     exec(command, (error, stdout, stderr) => {
//       if (error) {
//         console.error(`exec error: ${error}`);
//         return reject(error);
//       }
//       if (stderr) {
//         console.error(`stderr: ${stderr}`);
//         return reject(stderr);
//       }
//       console.log(`stdout: ${stdout}`);
//       resolve(stdout);
//     });
//   });
// };

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
  const existingUser = await User.findOne({
    where: {
      email: email, // Filter by email only
    },
  });
  if (existingUser) {
    return res
      .status(422)
      .json({ message: "Email already exists.", code: 422 });
  } else if (email) {
    const subject = "Verify OTP for signup process";
    const body = `Your OTP is: ${otp}. Please use this to complete your signup process and enjoy your online presence.`;

    try {
      await sendEmail(email, subject, body); // Trigger the Python email service
      console.log(`OTP email sent to ${email}`);
      // Respond with success and OTP (for development/testing purposes only)
      res.status(201).json({
        message: "OTP sent successfully. Please verify to complete signup.",
        recipient,
        otp, // Include the OTP in the response for frontend verification
        code: 201,
      });
    } catch (error) {
      return res.status(500).json({ error: "Error sending OTP email." });
    }
  }
});
// Create a storage engine to handle file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "user_images"); // Folder to save images
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // Get the original file extension
    const profileKey = req.body.profile_key || req.headers.authorization; // Extract profile unique key from request
    if (!profileKey) {
      cb(new Error("Profile unique key is missing."), null); // Handle missing key
    } else {
      cb(null, `${profileKey}${ext}`); // Save file with profile unique key as name
    }
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const mimeTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (mimeTypes.includes(file.mimetype)) {
      cb(null, true); // Accept the file
    } else {
      cb(new Error("Invalid file type, only JPEG and PNG are allowed"), false); // Reject file
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

// Make sure 'user_images' directory exists
if (!fs.existsSync("user_images")) {
  fs.mkdirSync("user_images");
}

// Serve static files from the 'user_images' directory
app.use(
  "/api/user_images",
  express.static(path.join(__dirname, "user_images"))
);

// Route to handle image upload
app.post("/api/upload/userprofile", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  // Get the filename (UUID + extension)
  const imageFilename = req.file.filename;

  // Construct the full URL for the uploaded image
  const imageUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/user_images/${imageFilename}`;

  // Optionally save the file path (or UUID) in the database
  // Example: save 'imageFilename' (UUID.ext) to the user's profile

  res.status(200).json({
    message: "Profile image uploaded successfully!",
    imageUuid: path.parse(imageFilename).name, // Send back the UUID (without extension)
    imageUrl: imageUrl, // Full URL to access the image
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
app.post("/api/check-username", async (req, res) => {
  const { username } = req.body;

  // Validate the username input
  if (!username || typeof username !== "string" || username.trim() === "") {
    return res.status(400).json({
      error: "Username must be a non-empty string.",
    });
  }

  try {
    // Check if the username exists in the database (using Sequelize ORM)
    const user = await User.findOne({
      where: { username: username.toLowerCase() },
    });

    // If user is found, the username is taken
    if (user) {
      return res.status(200).json({
        available: false,
        message: "Username is already taken.",
      });
    } else {
      return res.status(200).json({
        available: true,
        message: "Username is available.",
      });
    }
  } catch (error) {
    // Handle any errors that occur during the database query
    console.error(error);
    return res.status(500).json({
      error: "An error occurred while checking username availability.",
      details: error.message,
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
    profileimagekey,
    profilepath,
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
    const lowerUser = username.toLowerCase();
    // Create a new user
    const newUser = await User.create({
      unique_user_key: uniqueUserKey,
      username: lowerUser,
      profile_picture: profilepath,
      profile_picture_key: profileimagekey,
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
        uuid: newUser.unique_user_key,
      },
    });
  } catch (error) {
    console.error("Error during user signup:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Route to get user details by unique user ID (via POST request)
app.get("/api/user-details", async (req, res) => {
  const unique_user_id = req.headers.authorization;

  try {
    // Validate the unique user ID
    if (!unique_user_id) {
      return res.status(400).json({ error: "Unique user ID is required." });
    }

    // Fetch user details from the database using Sequelize
    const user = await User.findOne({
      where: { unique_user_key: unique_user_id },

      attributes: [
        "unique_user_key",
        "username",
        "email",
        "full_name",
        "bio",
        "followers_count",
        "following_count",
        "post_count",
        "likes_count",
        "visibility",
        "streaks_percent",
        "profile_picture",
        "profile_picture_key",
        "country",
        "timezone",
        "createdAt", // Include additional attributes if needed
      ],
    });
    // If user is not found
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    // Respond with user details
    res.status(200).json({
      message: "User details retrieved successfully.",
      user,
    });
  } catch (error) {
    console.error("Error retrieving user details:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});
// Route to update user profile information// Route to update user profile information
app.put(
  "/api/user-updateprofile",
  upload.single("profile_picture"),
  async (req, res) => {
    const { full_name, username, bio } = req.body;
    const userId = req.headers.authorization; // Get userId from Authorization header
    try {
      // Validate inputs
      if (!userId) {
        return res.status(400).json({ error: "User ID is required." });
      }
      if (
        !full_name &&
        !username &&
        !bio &&
        !req.file &&
        !req.body.profile_picture
      ) {
        return res.status(400).json({ error: "No data to update." });
      }

      // Fetch user from the database
      const user = await User.findOne({
        where: { unique_user_key: userId },
      });
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      // If the profile picture is being updated and the user already has a profile picture
      if (req.body.profile_picture && user.profile_picture) {
        // Delete the old profile picture if it exists
        const oldImagePath = path.join(
          __dirname,
          user.profile_picture.replace(
            `${req.protocol}://${req.get("host")}/api/`,
            ""
          )
        );
        console.log(oldImagePath);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath); // Delete the old image
        }
        console.log(req.body.profile_picture + " pforliewl");

        // Update the profile picture URL
        // user.profile_picture = `${req.protocol}://${req.get(
        //   "host"
        // )}/api/user_images/${req.file.filename}`;
      }

      // Update the user's profile details
      await user.update({
        full_name: full_name || user.full_name,
        username: username || user.username,
        bio: bio || user.bio,
        profile_picture: req.body.profile_picture, // Update profile picture if new one uploaded
      });

      // Respond with success message
      res.status(200).json({
        message: "User profile updated successfully.",
        user: {
          full_name: user.full_name,
          username: user.username,
          bio: user.bio,
          profile_picture: user.profile_picture, // Send the updated profile picture URL
        },
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);
app.post("/api/user/profile-key", async (req, res) => {
  const { user_id } = req.body;

  try {
    if (user_id) {
      // If user_id is provided, check for existing profile key
      const user = await User.findOne({ where: { unique_user_key: user_id } });

      if (user && user.dataValues.profile_picture_key) {
        return res
          .status(200)
          .json({ profile_key: user.dataValues.profile_picture_key });
      }

      // Generate and save a new profile key for the user
      const uuidKey = `UUID_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      await User.update({ profileKey: uuidKey }, { where: { id: user_id } });
      return res.status(200).json({ profile_key: uuidKey });
    } else {
      // If no user_id is provided, generate a standalone UUID
      const uuidKey = `UUID_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      return res.status(200).json({ uuid: uuidKey });
    }
  } catch (error) {
    console.error("Error fetching or generating profile key:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});


app.post("/api/auth/signin", async (req, res) => {
  const { emailOrPhone, password } = req.body;

  try {
    // Validate input
    if (!emailOrPhone || !password) {
      return res
        .status(400)
        .json({ message: "Email/Phone and password are required." });
    }

    // Find user by email or phone
    // const user = await User.findOne({
    //   where: {
    //     [Sequelize.Op.or]: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    //   },
    // });
    const user = await User.findOne({
      where: {
        email: emailOrPhone, // Filter by email only
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Generate JWT token
    // const token = jwt.sign(
    //   { userId: user.unique_user_key },
    //   process.env.JWT_SECRET, // Use a strong secret from your .env file
    //   { expiresIn: "1d" } // Token expiration time
    // );
    const token = jwt.sign(
      { userId: user.unique_user_key },
      "your_hardcoded_secret_key",
      { expiresIn: "1d" }
    );

    // Respond with user data and token
    res.status(200).json({
      message: "Sign-in successful.",
      token,
      user: {
        id: user.unique_user_key,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error during sign-in:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
