const express = require("express");
const { hash } = require("bcrypt");
const router = express.Router();
const { Users } = require("../models");
const jwt = require("jsonwebtoken");
require("dotenv").config();
// const decodeTokenMiddleware = require('../middleware/auth');

// Define secretKey
const secretKey = process.env.SECRET_KEY;

const decodeTokenMiddleware = (req, res, next) => {
  try {
    const token_abc = req.headers.authorization && req.headers.authorization.split(" ")[1];
    // const token_abc = req.cookies.jwt_token;

    if (!token_abc) {
      console.log("No token found in the headers.");
      return res.status(401).json({ error: "Missing token" });
    } else {
      const decodedToken = jwt.verify(token_abc, secretKey);
      console.log("Decoded Token:", decodedToken);
      req.tokenPayload = decodedToken;
    }
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
    const userId = req.tokenPayload.userId;

    if (!userId) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    // Find the user from the database
    const user = await Users.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    await user.update({ logout: new Date() });

    // Send a successful logout response
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Register route
router.post("/register", decodeTokenMiddleware, async (req, res) => {
  try {
    const { name, email, phoneno, password} = req.body;

    const { role: adminRole } = req.tokenPayload;
    const userRole = `${adminRole}user`;

    if (!name || !email || !phoneno || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const role = userRole;
    const hashedPassword = await hash(password, 10);

    const newUser = await Users.create({
      name,
      email,
      phoneno,
      password: hashedPassword,
      role,
    });

    res.json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



// PUT route to update a user by ID
router.put("/update/:id", async (req, res) => {
  const userId = req.params.id;
  const { name, email, phoneno, password } = req.body;

  try {
    // Find the user by ID
    const user = await Users.findByPk(userId);

    if (!user) {
      // User not found
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Update user data
    if (name) {
      user.name = name;
    }
    if (email) {
      user.email = email;
    }
    if (phoneno) {
      user.phoneno = phoneno;
    }
    if (password) {
      // Update password if provided
      const hashedPassword = await hash(password, 10);
      user.password = hashedPassword;
    }

    // Save the updated user
    await user.save();

    res.json({ success: true, message: "User updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE route to delete a user by ID
router.delete("/delete/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    // Find the user by ID
    const user = await Users.findByPk(userId);

    if (!user) {
      // User not found
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Delete the user
    await user.destroy();

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/super_register", decodeTokenMiddleware, async (req, res) => {
  try {
    const { name, email, phoneno, password, user } = req.body;
    // const token = req.cookies.jwt_token;
    // const { role: adminRole } = req.tokenPayload;

    if (!name || !email || !phoneno || !password || !user) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (
      user == "datapreuser" ||
      user == "traininguser" ||
      user == "testinguser" ||
      user == "reportuser"
    ) {
      role = user;
    }

    const hashedPassword = await hash(password, 10);

    const newUser = await Users.create({
      name,
      email,
      phoneno,
      password: hashedPassword,
      role,
    });

    res.json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get user details route
router.get("/userDetails", async (req, res) => {
  try {
    const userdetails = await Users.findAll();
    res.json(userdetails);
  } catch (error) {
    console.error("Error fetching users data:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
