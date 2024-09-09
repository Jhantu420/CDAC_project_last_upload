const express = require("express");
const stream = require("stream");
const multer = require("multer");
const admzip = require("adm-zip");
const mysql = require('mysql');
const fs = require("fs");
const csvParser = require("csv-parser");
const corsOptions = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  exposedHeaders: ["Access-Control-Allow-Origin"],
  credentials: true,
};
const upload = multer({ dest: "uploads/" });
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;
const { CsvRecord } = require("./models");
const Sequelize = require('sequelize');
//app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.json());
app.use(cors());
app.use(cors(corsOptions));
const db = require("./models");
// Handle file uploads

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'cdac_project'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to database');
});


app.post(
  "/uploads",
  upload.fields([{ name: "file" }, { name: "transcriptionFile" }]),
  (req, res) => {
    const uploadedFiles = req.files;
    const isWavFile = uploadedFiles["file"][0].originalname.endsWith(".wav");

    if (isWavFile) {
      const agegroup = req.body.ageGroup;
      const gender = req.body.gender;
      const tags = req.body.tags;
      const date = new Date();
      const songname =
        date.toISOString() + "-" + uploadedFiles["file"][0].originalname;
      const newPath = `/var/www/html/uploads/` + songname;
      const textfileName = `${songname.replace(".wav", ".txt")}`;
      const textfilePath = `/var/www/html/uploads/${textfileName}`;
      fs.renameSync(uploadedFiles["file"][0].path, newPath);
      fs.renameSync(uploadedFiles["transcriptionFile"][0].path, textfilePath);
      // Insert data into the database using Sequelize model
      CsvRecord.create({
        filename: songname,
        filepath: newPath,
        gender: gender,
        agegroup: agegroup,
        textfile: textfileName,
        tags: tags,
        uploadDate: new Date(),
      })
        .then((record) => {
          res
            .status(200)
            .send(
              "WAV file uploaded, transcription file moved, and data inserted"
            );
        })
        .catch((error) => {
          console.error("Error inserting record:", error);
          res.status(500).send("Database error");
        });
    } else {
      // Handle ZIP file upload
      let uniqueBaseFileName;
      let uniqueTextFileName, uniqueWavFileName;
      const zip = new admzip(uploadedFiles["file"][0].path);
      const zipEntries = zip.getEntries();
      let csvData = null;
      let csvFileStream = new stream.Readable(); // Create a readable stream
      const timestamp = new Date();
      const formatted = timestamp.toISOString();
      zipEntries.forEach((entry) => {
        if (entry.entryName.endsWith(".csv")) {
          csvData = zip.readAsText(entry);
          csvFileStream.push(csvData); // Push CSV data to the stream
          csvFileStream.push(null); // Signal the end of the stream
          if (csvData) {
            const parsedRows = [];
            csvFileStream
              .pipe(csvParser()) // Pipe the stream to csv-parser
              .on("data", (row) => {
                // Generate the new names for filename and textfile
                uniqueBaseFileName = `${formatted}`;
                const newWavFileName = `${uniqueBaseFileName}-${row.filename}`;
                const newTextFileName = `${uniqueBaseFileName}-${row.textfile}`;
                // Update the row with the new names
                row.filename = newWavFileName;
                row.textfile = newTextFileName;
                row.filepath = `/var/www/html/uploads/${newWavFileName}`;
                parsedRows.push(row);
              })
              .on("end", () => {
                // Insert the updated rows into the database using Sequelize model
                parsedRows.forEach((row) => {
                  CsvRecord.create({
                    filename: row.filename,
                    filepath: row.filepath,
                    gender: row.gender,
                    agegroup: row.agegroup,
                    textfile: row.textfile,
                    tags: row.tags,
                    uploadDate: new Date(),
                  }).catch((error) => {
                    console.error("Error inserting record:", error);
                  });
                });

                res
                  .status(200)
                  .send(
                    "ZIP file uploaded, WAV files extracted, and CSV data inserted"
                  );
              });
          } else {
            res.status(400).send("No CSV file found in the ZIP archive");
          }
        } else if (entry.entryName.endsWith(".wav")) {
          uniqueBaseFileName = `${formatted}`;
          uniqueWavFileName = `${uniqueBaseFileName}-${entry.name}`;
          const wavPath = `/var/www/html/uploads/${uniqueBaseFileName}-${entry.name}`;
          entry.getDataAsync((data, err) => {
            if (err) {
              console.error("Error extracting WAV file:", err);
            } else {
              fs.writeFileSync(wavPath, data);
            }
          });
        } else if (entry.entryName.endsWith(".txt")) {
          uniqueTextFileName = `${uniqueBaseFileName}-${entry.name}`;
          const textPath = `/var/www/html/uploads/${uniqueBaseFileName}-${entry.name}`;
          entry.getDataAsync((data, err) => {
            if (err) {
              console.error("Error extracting TXT file:", err);
            } else {
              fs.writeFileSync(textPath, data);
            }
          });
        }
      });
    }
  }
);
app.get("/transcription/:filename", (req, res) => {
  const { filename } = req.params;
  const textFilePath = `/var/www/html/uploads/${filename.replace(
    ".wav",
    ".txt"
  )}`;
  //const {range} = req.headers;
  fs.readFile(textFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading transcription file:", err);
      res.status(500).send("Error reading transcription file");
    } else {
      res.header("Access-Control-Allow-Origin", "*");
      res.status(200).json({ transcription: data });
    }
  });
});

// ... (rest of the existing code)

app.get("/getdata", (req, res) => {
  const selectQuery = "SELECT * FROM CsvRecords";
  connection.query(selectQuery, (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      res.status(500).send("Error fetching data");
    } else {
      res.status(200).json(results);
    }
  });
});

// Routes for Admin
const adminRouter = require("./routes/adminRoutes");
app.use("/adminroute", adminRouter);

// Routes for Users
const postRouter = require("./routes/UsersRoute");
app.use("/userRoutes", postRouter);

// Routes for Login
const temp_Router = require("./routes/temp_routes");
app.use("/temp_route", temp_Router);

db.sequelize.sync().then(() => {
  app.listen(port, () => {
    console.log(`server is running at ${port}`);
  });
});
