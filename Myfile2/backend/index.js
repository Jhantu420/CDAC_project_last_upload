const express = require("express");
const app = express();
const cors = require('cors');
const cookieParser = require('cookie-parser');
const db = require("./models");

app.use(express.json());
app.use(cors());
app.use(cookieParser()); 



// Routes for Admin
const adminRouter = require('./routes/adminRoutes');
app.use("/adminroute", adminRouter);

// Routers for Users
const postRouter = require("./routes/UsersRoute");
app.use("/userRoutes", postRouter);

const temp_Router = require('./routes/temp_routes');
app.use("/temp_route", temp_Router);

db.sequelize.sync().then(() => {
  app.listen(3001, () => {
    console.log("Server is running on port 3001");
  });
});

