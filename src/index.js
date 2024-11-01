require('dotenv').config();
const express = require("express");
const path = require("path");
const hbs = require("hbs");
const multer = require("multer");
const bodyParser = require('body-parser');
const session = require('express-session');
const { User, Activity, Notice, Image, Calendar, Application } = require('./mongodb'); 
const mongoose = require('mongoose'); 
const setupEmailRoutes = require('./utils/email');
const crypto = require('crypto');

const app = express();
setupEmailRoutes(app);

hbs.registerHelper('json', function(context) {
    return JSON.stringify(context);
});

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set secure to true if you're using HTTPS
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set up template engine and static files
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, '../templates'));
app.use(express.static('public'));

const fs = require('fs');
const uploadDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// File Upload Middleware (Multer)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads')); // Ensure the correct relative path
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Authentication Middleware
function isAuthenticated(req, res, next) {
    console.log("Session before checking authentication:", req.session);
    if (req.session.user) {
        return next();
    } else {
        res.redirect('/login');
    }
}

// Login Route
app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    // Simple hardcoded login logic (replace with actual database query)
    if (email === "gargimittal@gmail.com" && password === "1234") {
        // Store user information in session
        req.session.user = { name: "Gargi Mittal", email: "gargimittal@gmail.com" };
        res.redirect("/volunteerDash");
    }
    else if(email==="garret@gmail.com" && password==="9876"){
        req.session.user = { name: "Garret Fernendez", email: "garret@gmail.com" };
        res.redirect("/staffDash");
    }
    else if(email==="anant@gmail.com" && password==="a123"){
        req.session.user = { name: "Anant Mishra", email: "anant@gmail.com" };
        res.redirect("/parents");
    }
    else if(email==="gargimittal.10102003@gmail.com" && password==="g123"){
        req.session.user={name: "Admin", email:"gargimittal.10102003@gmail.com" };
        res.redirect("/admin");
    }
    else {
        res.send("Invalid username or password");
    }
});

app.get('/admin', isAuthenticated, async (req, res) => {
    if (req.session.user && req.session.user.email === "gargimittal.10102003@gmail.com") {
        const applications = await Application.find(); // Fetch all applications
        res.render('admin', { applications }); // Render admin.hbs
    } else {
        res.status(403).send("Unauthorized access");
    }
});

// Volunteer Dashboard
app.get("/volunteerDash", isAuthenticated, (req, res) => {
    const username = req.session.user.name;
    res.render("volunteerDash", { username });
});

app.get("/staffDash", isAuthenticated,(req, res) => {
    const username = req.session.user.name;
    res.render("staffDash", { username });
  });

app.get("/parents", isAuthenticated,(req, res) => {
    const username = req.session.user.name;
    res.render("parents" , { username });  
  });
  

// My Activities Route
app.get("/my-activities", isAuthenticated, async (req, res) => {
    try {
        const activities = await Activity.find({ user: req.session.user.email });
        res.render("vol-management", { activities });
    } catch (err) {
        res.status(500).send("Error fetching activities: " + err.message);
    }
});

// Add Activity Route
app.post("/add-activity", isAuthenticated, upload.single('media'), async (req, res) => {
    try {
        const newActivity = new Activity({
            user: req.session.user.email,
            description: req.body.description,
            media: req.file ? req.file.path : null,
            hours: req.body.hours
        });

        await newActivity.save();
        res.json({
            description: newActivity.description,
            hours: newActivity.hours,
            media: req.file ? req.file.filename : null, // Send only the filename for client-side display
            date: newActivity.date.toLocaleString() 
        });

    } catch (err) {
        res.status(500).send("Error adding activity: " + err.message);
    }
});

// Delete Activity Route (DELETE request)
app.delete("/delete-activity/:id", isAuthenticated, async (req, res) => {
    try {
        const deletedActivity = await Activity.findByIdAndDelete(req.params.id);

        if (!deletedActivity) {
            return res.status(404).json({ message: "Activity not found" });
        }

        res.json({ message: "Activity deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting activity: " + err.message });
    }
});

// Logout Route
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});

app.get("/add-notice", (req, res) => {
    res.render('add-notice');
  });

  app.post('/add-notice', async (req, res) => {
    try {
      const newNotice = new Notice({
        notice: req.body.notice
      });
  
      await newNotice.save();  // Save the notice to the database
      res.redirect('/add-notice');
    } catch (err) {
      console.error('Error saving notice:', err);
      res.status(500).send('Error saving notice');
    }
  });

  app.get('/add-image', (req, res) => {
    res.render('add-image');
  });
  app.get("/calendar", isAuthenticated, (req, res) => {
    res.render("calendar"); // Ensure you have a calendar.hbs template to render
});
  
  // Handle image upload (POST request)
  app.post('/add-image', upload.single('image'), async (req, res) => {
    try {
      const { description } = req.body;
      const newImage = new Image({
        filename: req.file.filename,
        description: req.body.description
      });
  
      await newImage.save();  // Save the image to the database
      res.status(201).json(newImage);
    } catch (err) {
      console.error('Error uploading image:', err);
      res.status(500).send('Error saving image');
    }
  });

  app.get("/calendar", isAuthenticated, (req, res) => {
    res.render("calendar"); // Ensure you have a calendar.hbs template to render
});

app.post('/calendar', async (req, res) => {
    try {
        const { name, date, type, description } = req.body; // Extract data from the request body
        const newCalendar = new Calendar({
            name: name,
            date: date,
            type: type,
            description: description
        });

        const savedEvent = await newCalendar.save();  // Save the event to the database
        res.status(201).json({ id: savedEvent._id, ...req.body }); // Return the event ID and data

    } catch (err) {
        console.error('Error saving event:', err);
        res.status(500).send('Error saving event');
    }
});

app.get('/get-images', async (req, res) => {
    try {
        const images = await Image.find(); // Fetch all images from the database
        res.json(images); // Send images as a JSON response
    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).send('Internal Server Error');
    }
});


  app.get('/view-notice', (req, res) => {
    res.render('view-notice');
  });

  app.get('/view-image', (req, res) => {
    res.render('view-image');
  });

  app.get('/view-notice', async (req, res) => {
    try {
      // Fetch all notices from the database
      const notices = await Notice.find({});
      console.log('Fetched Notices:', notices);
  
      // Render the view-notices.ejs page and pass the notices to the view
      res.render('view-notice', { notices });
    } catch (err) {
      console.error('Error fetching notices:', err);
      res.status(500).send('Error fetching notices');
    }
  });

app.get('/view-images', (req, res) => {
    Image.find({}, (err, images) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error retrieving images");
        }
        res.render('view-images', { images }); // Make sure 'view-images' is the name of your HBS file
    });
});


// Route to serve form1.hbs
app.get("/form1", (req, res) => {
    res.render("form1");
});

// Mongoose schema for form submission
const formSchema = new mongoose.Schema({
    photo: String,
    aadhar: String,
    role: String,
    name: String,
    gender: String,
    dob: Date,
    age: Number,
    marital_status: String,
    occupation: String,
    designation: String,
    address: String,
    passport: String,
    arrival: Date,
    contact_residence: String,
    contact_office: String,
    mobile: String,
    email: String,
    education: String,
    mother_tongue: String,
    hobbies: String,
    experience: String,
    interest: String,
    know_navkshitij: String,
    motivation: String,
    duration: String,
    languages: {
        english: { speak: Boolean, write: Boolean, understand: Boolean },
        hindi: { speak: Boolean, write: Boolean, understand: Boolean },
        marathi: { speak: Boolean, write: Boolean, understand: Boolean },
        other: { speak: Boolean, write: Boolean, understand: Boolean }
    },
    signature: String,
    date_place: String
});

const Form = mongoose.model('Form', formSchema);

// Route to handle form submission
app.post("/submit-form", upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'aadhar', maxCount: 1 },
    { name: 'signature', maxCount: 1 }
]), async (req, res) => {
    try {
        // Check if an application with the same email already exists
        const existingApplication = await Application.findOne({ email: req.body.email });
        if (existingApplication) {
            return res.status(400).send("Application with this email already exists.");
        }

        // Save the full data in the User model
        const newUser = new User({
            photo: req.files['photo'] ? req.files['photo'][0].path : null,
            aadhar: req.files['aadhar'] ? req.files['aadhar'][0].path : null,
            signature: req.files['signature'] ? req.files['signature'][0].path : null,
            role: req.body.role,
            name: req.body.name,
            gender: req.body.gender,
            dob: req.body.dob,
            age: req.body.age,
            marital_status: req.body.marital_status,
            occupation: req.body.occupation,
            designation: req.body.designation,
            address: req.body.address,
            passport: req.body.passport,
            arrival: req.body.arrival,
            contact_residence: req.body.contact_residence,
            contact_office: req.body.contact_office,
            mobile: req.body.mobile,
            email: req.body.email,
            education: req.body.education,
            mother_tongue: req.body.mother_tongue,
            hobbies: req.body.hobbies,
            experience: req.body.experience,
            interest: req.body.interest,
            know_navkshitij: req.body.know_navkshitij,
            motivation: req.body.motivation,
            duration: req.body.duration,
            languages: {
                english: {
                    speak: req.body.english_speak === "on",
                    write: req.body.english_write === "on",
                    understand: req.body.english_understand === "on"
                },
                hindi: {
                    speak: req.body.hindi_speak === "on",
                    write: req.body.hindi_write === "on",
                    understand: req.body.hindi_understand === "on"
                },
                marathi: {
                    speak: req.body.marathi_speak === "on",
                    write: req.body.marathi_write === "on",
                    understand: req.body.marathi_understand === "on"
                },
                other: {
                    speak: req.body.other_speak === "on",
                    write: req.body.other_write === "on",
                    understand: req.body.other_understand === "on"
                }
            }
        });

        await newUser.save(); // Save full user details in User model

        // Save essential application data in the Application model
        const newApplication = new Application({
            name: req.body.name,
            email: req.body.email,
            role: req.body.role.charAt(0).toUpperCase() + req.body.role.slice(1),  // 'Volunteer' or 'Intern'
            status: 'Pending' // Default status for admin review

        });

        await newApplication.save(); // Save application data in Application model

        res.redirect("/subm"); // Redirect to submission confirmation page
    } catch (err) {
        console.error("Error saving form data:", err.message);
        res.status(500).send("Error saving form data: " + err.message);
    }
});

app.get("/subm", (req, res) => {
    res.render("subm"); // Render subm.hbs
});

// Fetch all applications
app.get("/admin", isAuthenticated, async (req, res) => {
    if (req.session.user && req.session.user.email === "gargimittal.10102003@gmail.com") { // Check if user is admin
        try {
            const applications = await Application.find(); // Fetch all applications (voluntneer/intern)
            res.render("admin", { applications }); 
        } catch (err) {
            console.error("Error fetching applications:", err.message);
            res.status(500).send("Error loading dashboard");
        }
    } else {
        res.status(403).send("Unauthorized access");
    }
});

// Start the server
app.listen(3000, () => console.log("Server running on port 3000"));
