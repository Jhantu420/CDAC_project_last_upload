const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { Admin } = require("../models");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");

// Load environment variables
require("dotenv").config();
const secretKey = process.env.SECRET_KEY;

const decodeTokenMiddleware = (req, res, next) => {
  try {
    const token =
      req.headers.authorization && req.headers.authorization.split(" ")[1];

    if (!token) {
      console.log("No token found in the headers.");
      return res.status(401).json({ error: "Missing token" });
    }

    const decodedToken = jwt.verify(token, secretKey);
    console.log("Decoded Token:", decodedToken);
    req.tokenPayload = decodedToken;

    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = decodeTokenMiddleware;

// Sync the model with the database
const syncAdminModel = async () => {
  try {
    await Admin.sync(); // Sync Admin model with database
    // Check if default admin already exists
    const defaultAdmin = await Admin.findOne({
      where: { email: "super@gmail.com" },
    });
    if (!defaultAdmin) {
      // Hash default password
      const hashedPassword = await bcrypt.hash("password", 10);
      // Create default admin
      await Admin.create({
        email: "super@gmail.com",
        password: hashedPassword,
        role: "super",
      });
      console.log("Default admin created successfully.");
    } else {
      console.log("Default admin already exists.");
    }
  } catch (error) {
    console.error("Error syncing Admin model:", error);
  }
};

syncAdminModel(); // Call function to sync Admin model and create default admin

// Logout route
router.post("/logouttime", decodeTokenMiddleware, async (req, res) => {
  try {
    // Get the user ID from the decoded token
    const adminId = req.tokenPayload.adminId;

    if (!adminId) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    // Find the user from the database
    const admin = await admins.findByPk(adminId);

    if (!admin) {
      return res.status(404).json({ error: "User not found" });
    }
    await admin.update({ logout: new Date() });

    // Send a successful logout response
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// Registration of admin
router.post("/register", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new admin with hashed password
    await Admin.create({
      email: email,
      password: hashedPassword,
      role: role,
    });

    res.json("Success");
  } catch (error) {
    console.error("Error creating admin:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/updateSuper", async (req, res) => {
  try {
    const { newMail, newPassword } = req.body;
    // const token = req.cookies.jwt_token;
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      return res.status(401).send("Unauthorized because token is not present");
    }
    if (!newPassword) {
      return res.status(400).json({ error: "New password is required" });
    }

    try {
      const decodedToken = jwt.verify(token, secretKey);
      const adminId = decodedToken.adminId;

      // Step 3: Hash the new password
      let hashedPassword;

      try {
        // Hash the new password
        hashedPassword = await bcrypt.hash(newPassword, 10);
      } catch (error) {
        console.error("Error hashing password:", error);
        return res
          .status(500)
          .json({ error: "Server error. Unable to hash password." });
      }

      // Step 4: Create a new super admin with the specified details and active status as true
      const newSuperAdmin = await Admin.create({
        email: newMail,
        password: hashedPassword,
        role: "super",
        active: 1, // Ensure the new super admin is active
      });

      console.log("New Super Admin Details:", newSuperAdmin.toJSON());

      // Step 5: Update the active status of all existing super admins to false except the newly created one
      const existingSuperAdmins = await Admin.findAll({
        where: {
          role: "super", // Find all super admins
          id: { [Op.ne]: newSuperAdmin.id }, // Exclude the newly created super admin
        },
      });

      await Promise.all(
        existingSuperAdmins.map(async (existingAdmin) => {
          await existingAdmin.update({ active: false });
        })
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Token verification failed:", error.message);
      res.status(401).send("Unauthorized because token verification failed");
    }
  } catch (error) {
    console.error(
      "Error updating super admin or creating a new super admin:",
      error
    );
    res.status(500).json({
      error:
        "Server error. Unable to update super admin or create a new super admin.",
    });
  }
});

module.exports = router;
