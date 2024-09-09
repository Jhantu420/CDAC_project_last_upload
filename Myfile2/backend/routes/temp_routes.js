const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Users, Admin } = require("../models");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
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
          { expiresIn: 3600 } // token expires after one hour
        );

        // Update token
        await admin.update({ token });

        // Set the token as a cookie
        res.cookie("jwt_token", token, {
          httpOnly: true,
          expires: new Date(Date.now() + 3600 * 1000),
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
          { expiresIn: 3600 } // tokens are expired after one hour
        );

        // Update token

        await user.update({ token });

        // await user.update({ token, login: [...user.login, new Date()] });
        // Set the token as a cookie
        res.cookie("jwt_token", token, {
          httpOnly: true,
          expires: new Date(Date.now() + 3600 * 1000),
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

// Forgot Password route
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    // Check if the email exists in either the Admin or Users model
    const admin = await Admin.findOne({ where: { email } });
    const user = await Users.findOne({ where: { email } });

    if (!admin && !user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Determine which model the email belongs to
    const userModel = admin || user;
    // Log dynamically fetched email and password
    console.log("Dynamically fetched email:", userModel.email);
    console.log("Dynamically fetched password:", userModel.password);
    // Fetch email and password dynamically
    const { email: userEmail, password: userPassword } = userModel;
    // Generate a unique token for password reset
    const resetToken = uuidv4();

    // Save the reset token and its expiration date in the user document
    userModel.resetPasswordToken = resetToken;
    userModel.resetPasswordExpires = Date.now() + 3600000; // Token expires in 1 hour
    await userModel.save();

    // Send email with reset token
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: userEmail, // Use dynamically fetched email
        pass: userPassword, // Use dynamically fetched password
      },
    });

    const mailOptions = {
      from: userEmail,
      to: userEmail,
      subject: "Password Reset",
      text: `Click the following link to reset your password: ${getResetLink(
        resetToken
      )}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Email sending error:", error);
        res.status(500).json({ message: "Error sending email" });
      } else {
        console.log("Email sent:", info.response);
        res
          .status(200)
          .json({ message: "Password reset instructions sent to your email" });
      }
    });
  } catch (error) {
    console.error("Forgot Password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// Define the getResetLink function
function getResetLink(token) {
  let frontendUrl;

  // Set the frontend URL based on the environment or configuration
  if (process.env.NODE_ENV === "production") {
    frontendUrl = "http://localhost:3000";
  } else if (process.env.NODE_ENV === "staging") {
    frontendUrl = "http://localhost:3000";
  } else {
    frontendUrl = "http://localhost:3000"; // Default for development
  }

  return `${frontendUrl}/${token}`;
}

module.exports = router;
