const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Users, Admin } = require("../models");
// Load environment variables
require("dotenv").config();
// Secret key for signing and verifying tokens
const secretKey = process.env.SECRET_KEY;

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find admin from the database by email
    const admin = await Admin.findOne({ where: { email } });

    if (admin) {
      // It's an admin login
      if (admin.password) {
        const passwordMatch = await bcrypt.compare(password, admin.password);

        if (!passwordMatch) {
          return res.status(401).json({ error: "Invalid Credentials" });
        }

        // Check admin role
        if (
          !["datapre", "training", "testing", "super", "report"].includes(
            admin.role
          )
        ) {
          res.json({ error: "Not a correct Admin" });
          return;
        }

        // Check if the admin is 'super' and active
        if (admin.role === "super" && !admin.active) {
          return res.status(401).json({ error: "Super Admin is not active" });
        }

        // Generate a new JWT token with current date and time on each login
        const token = jwt.sign(
          {
            adminId: admin.id,
            loginTime: new Date(),
            role: admin.role,
          },
          secretKey,
          { expiresIn: 120 } // token expires after one hour
        );

        // Update token
        await admin.update({ token });

        // Set the token as a cookie
        res.cookie("jwt_token", token, {
          httpOnly: true,
          expires: new Date(Date.now() + 120 * 1000),
        });

        // Send the response
        res.status(200).json({ message: "Login Successful", token });

        return;
      }
    }

    // If not an admin, check if it's a user
    const user = await Users.findOne({ where: { email } });

    if (user) {
      if (user.password) {
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
          return res.status(401).json({ error: "Invalid Credentials" });
        }

        // Check user role
        if (
          ![
            "datapreuser",
            "traininguser",
            "testinguser",
            "reportuser",
          ].includes(user.role)
        ) {
          res.json({ error: "Not a correct User" });
          return;
        }
        await user.update({ login: new Date() }); // update the login ti
        // Generate a new JWT token with current date and time on each login
        const token = jwt.sign(
          { userId: user.id, role: user.role, loginTime: new Date() },
          secretKey,
          { expiresIn: 120 } // tokens are expired after one hour
        );

        // Update token

        await user.update({ token });

        // await user.update({ token, login: [...user.login, new Date()] });
        // Set the token as a cookie
        res.cookie("jwt_token", token, {
          httpOnly: true,
          expires: new Date(Date.now() + 120 * 1000),
        });

        // Send the response
        res.status(200).json({ message: "Login Successful", token });

        return;
      }
    }

    return res.status(401).json({ error: "Invalid Credentials" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



module.exports = router;
