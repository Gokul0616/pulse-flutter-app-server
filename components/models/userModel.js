import { Sequelize, DataTypes } from "sequelize";


// Initialize Sequelize for remote server
const sequelize = new Sequelize(
  "postgres://pulsedb_rciu_user:x0xznPP3PinIztSHOudk8UibIIClhzAc@dpg-csusm79u0jms73au5pm0-a.oregon-postgres.render.com:5432/pulsedb_rciu",
  {
    dialect: "postgres",
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,  // ensures SSL is used
        rejectUnauthorized: false  // set to true if the server has a valid SSL cert
      }
    }
  }
);
sequelize
  .sync({ force: false }) // Set force: true only if you want to recreate tables
  .then(() => {
    console.log("Database synced!");
  })
  .catch((error) => {
    console.error("Error syncing the database:", error);
  });



// Initialize database for local database
  
// const sequelize = new Sequelize(
//   "postgres://postgres:Gokul001@@localhost:5432/pulseDb",
//   {
//     dialect: "postgres",
//   }
// );
// sequelize
//   .sync({ force: false })
//   .then(() => {
//     console.log("Models synchronized.");
//   })
//   .catch((err) => {
//     console.error("Error syncing models:", err);
//   });

// // Authenticate the connection to the database
// sequelize
//   .authenticate()
//   .then(() => {
//     console.log("Connection to the database established successfully.");
//   })
//   .catch((err) => {
//     console.error("Unable to connect to the database:", err);
//   } );
  
  
export const User = sequelize.define("User", {
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  unique_user_key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  full_name: DataTypes.STRING,
  profile_picture: DataTypes.STRING,
  profile_picture_key: DataTypes.STRING,
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  bio: DataTypes.TEXT,
  followers_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  following_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  post_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  likes_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  streaks_percent: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0,
  },
  visibility: {
    type: DataTypes.STRING,
    defaultValue: "public",
    validate: {
      isIn: [["public", "private", "friends_only"]],
    },
  },
  notification_preferences: DataTypes.JSON,
  content_preferences: DataTypes.JSON,
  country: DataTypes.STRING,
  timezone: DataTypes.STRING,
  subscription_status: {
    type: DataTypes.STRING,
    validate: {
      isIn: [["active", "inactive", "expired"]],
    },
  },
  referral_code: DataTypes.STRING,
  last_password_change: DataTypes.DATE,
  failed_login_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  is_suspended: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  suspension_reason: DataTypes.TEXT,
  google_id: DataTypes.STRING,
  facebook_id: DataTypes.STRING,
  apple_id: DataTypes.STRING,
  theme_preference: {
    type: DataTypes.STRING,
    defaultValue: "light",
    validate: {
      isIn: [["light", "dark"]],
    },
  },
  language_preference: {
    type: DataTypes.STRING,
    defaultValue: "en",
  },
  verification_code: DataTypes.STRING,
  verified_at: DataTypes.DATE,
  created_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
  },
  last_login: DataTypes.DATE,
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  account_type: {
    type: DataTypes.STRING,
    defaultValue: "basic",
    validate: {
      isIn: [["basic", "premium"]],
    },
  },
  two_factor_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});
