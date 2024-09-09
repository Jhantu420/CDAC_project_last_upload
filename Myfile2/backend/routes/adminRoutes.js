const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { Admin } = require("../models");
const jwt = require("jsonwebtoken");
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
    const { newMail, newpassword } = req.body;
    // const token = req.cookies.jwt_token; 
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      return res.status(401).send("Unauthorized because token is not present");
    }
console.log("first")
    try {
      const decodedToken = jwt.verify(token, secretKey);
      const adminId = decodedToken.adminId;

      // Step 1: Check if the user is present based on adminId
      const existingUser = await Admin.findOne({
        where: {
          id: adminId,
          role: "super", // Make sure the user has a super role
        },
      });

      if (!existingUser) {
        return res
          .status(404)
          .json({ error: "Super Admin not found with the provided adminId." });
      }

      // Step 2: Check if the user's active status is false
      if (!existingUser.active) {
        console.log(
          "User is not active. Proceeding to create a new super admin."
        );

        // Step 3: Check if newpassword is provided
        if (!newpassword) {
          return res.status(400).json({ error: "New password is required." });
        }

        // Step 4: Hash the new password
        let hashedPassword;
        try {
          hashedPassword = await bcrypt.hash(newpassword, 10);
        } catch (hashError) {
          console.error("Error hashing the password:", hashError.message);
          return res
            .status(500)
            .json({ error: "Server error. Unable to hash the password." });
        }

        // Step 5: Create a new super admin with the specified details
        const newSuperAdmin = await Admin.create({
          email: newMail,
          password: hashedPassword,
          role: "super",
          active: true,
        });

        console.log("New Super Admin Details:", newSuperAdmin.toJSON());

        res.json({ success: true });
      } else {
        console.log(
          "Existing Super Admin Details (Before Update):",
          existingUser.toJSON()
        );

        // Step 6: Update the existing user's active status to false
        await existingUser.update({ active: false });

        console.log(
          "Existing Super Admin Details (After Update):",
          existingUser.toJSON()
        );

        // Step 7: Hash the new password
        const hashedPassword = await bcrypt.hash(newpassword, 10);

        // Step 8: Create a new super admin with the specified details
        const newSuperAdmin = await Admin.create({
          email: newMail,
          password: hashedPassword,
          role: "super",
          active: true,
        });

        console.log("New Super Admin Details:", newSuperAdmin.toJSON());

        res.json({ success: true });
      }
    } catch (error) {
      console.error("Token verification failed:", error.message);
      res.status(401).send("Unauthorized because token varification faield");
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
