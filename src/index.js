require('dotenv').config();
const express = require("express");
const path = require("path");
const hbs = require("hbs");
const multer = require("multer");
const bodyParser = require('body-parser');
const session = require('express-session');
const { User, Activity, Notice, Image, Calendar, Application } = require('./mongodb'); 
const mongoose = require('mongoose'); 
const { sendApplicationEmail, sendCredentialEmail } = require('./utils/email');
const crypto = require('crypto');



const app = express();



hbs.registerHelper('json', function(context) {
    return JSON.stringify(context);
});

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set up template engine and static files
app.set('view engine', 'hbs');
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
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Authentication Middleware
function isAuthenticated(req, res, next) {
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

    if (email === "gargimittal@gmail.com" && password === "1234") {
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
        req.session.user = { name: "Admin", email:"gargimittal.10102003@gmail.com" };
        res.redirect("/admin");
    }
    else {
        res.send("Invalid username or password");
    }
});

app.post("/signup", async (req, res) => {
    const { name, email, password, role, uniqueCode } = req.body;

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.send("User already exists with this email.");
        }

        // Create new user
        const newUser = new User({ name, email, password, role, uniqueCode });
        await newUser.save();

        req.session.user = { name: newUser.name, email: newUser.email, role: newUser.role };
        res.redirect("/login"); // Redirect after sign-up
    } catch (error) {
        console.error("Error during sign-up:", error);
        res.status(500).send("Error during sign-up.");
    }
});

// Admin Dashboard Route
app.get('/admin', isAuthenticated, async (req, res) => {
    if (req.session.user && req.session.user.email === "gargimittal.10102003@gmail.com") {
        try {
            const applications = await Application.find();
            const volunteersInterns = await User.find({ role: { $in: ["volunteer", "intern"] } });
            const staff = await User.find({ role: "staff" });
            const parents = await User.find({ role: "parent" });

            res.render('admin', { applications, volunteersInterns, staff, parents });
        } catch (err) {
            console.error("Error fetching data for admin dashboard:", err.message);
            res.status(500).send("Error loading dashboard");
        }
    } else {
        res.status(403).send("Unauthorized access");
    }
});

app.get('/admin/add-credential', (req, res) => {
    const role = req.query.role || ''; // Get role from query, if any
    res.render('add-credential', { role });
});


// Route to render applications page for admin
app.get('/admin/applications', isAuthenticated, async (req, res) => {
    try {
        const applications = await Application.find(); // Fetch all applications
        res.render("application", { applications });
    } catch (err) {
        console.error("Error fetching applications:", err.message);
        res.status(500).send("Error loading applications");
    }
});

app.post("/admin/send-credential", isAuthenticated, async (req, res) => {
    try {
        const { email, role } = req.body;
        const uniqueCode = await sendCredentialEmail(email, role);
        
        // Render the same page with a success message
        res.render("add-credential", { 
            role,
            successMessage: `Credential email sent successfully to ${email}`
        });
    } catch (err) {
        res.status(500).send("Error sending credentials");
    }
});


app.get("/volunteerDash", isAuthenticated, (req, res) => {
    const username = req.session.user.name;
    res.render("volunteerDash", { username });
});

app.get("/staffDash", isAuthenticated, (req, res) => {
    const username = req.session.user.name;
    res.render("staffDash", { username });
});

app.get("/parents", isAuthenticated, (req, res) => {
    const username = req.session.user.name;
    res.render("parents", { username });
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
            media: req.file ? req.file.filename : null,
            date: newActivity.date.toLocaleString() 
        });

    } catch (err) {
        res.status(500).send("Error adding activity: " + err.message);
    }
});

<<<<<<< HEAD
app.delete("/delete-activity/:id", isAuthenticated, async (req, res) => {
    try {
        const deletedActivity = await Activity.findByIdAndDelete(req.params.id);
=======
>>>>>>> 6ef68d63de5bc81b07fe2d158acf09f37e4fd8f0




app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});

app.get("/add-notice", (req, res) => {
    res.render('add-notice');
});
<<<<<<< HEAD
=======
app.get("/view-calendar", isAuthenticated, (req, res) => {
    res.render("view-calendar"); // Ensure you have a view-calendar.hbs template
});


  
  // Handle image upload (POST request)
  app.post('/add-image', upload.single('image'), async (req, res) => {
    try {
        const { description } = req.body;
        const newImage = new Image({
            filename: req.file.filename,
            description: description
        });
        await newImage.save();
        res.redirect('/add-image');  // Save the image to the database
        // Redirect to a success page or back to upload page
        // Change '/success' to your desired path
    } catch (err) {
        console.error('Error uploading image:', err);
        res.status(500).send('Error saving image');
    }
});


>>>>>>> 6ef68d63de5bc81b07fe2d158acf09f37e4fd8f0

app.post('/add-notice', async (req, res) => {
    try {
        const newNotice = new Notice({
            notice: req.body.notice
        });
  
        await newNotice.save();
        res.redirect('/add-notice');
    } catch (err) {
        console.error('Error saving notice:', err);
        res.status(500).send('Error saving notice');
    }
});

app.get('/add-image', (req, res) => {
    res.render('add-image');
});

app.post('/add-image', upload.single('image'), async (req, res) => {
    try {
        const newImage = new Image({
            filename: req.file.filename,
            description: req.body.description
        });
  
        await newImage.save();
        res.status(201).json(newImage);
    } catch (err) {
        console.error('Error uploading image:', err);
        res.status(500).send('Error saving image');
    }
});

app.get("/calendar", isAuthenticated, (req, res) => {
    res.render("calendar");
});

app.use(express.json()); // To parse JSON bodies

// Get all events
app.get('/calendar/events', async (req, res) => {
  try {
    const events = await Calendar.find();
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Failed to fetch events.' });
  }
});

// Add a new event
app.post('/calendar', async (req, res) => {
  const { name, date, type, description } = req.body;

  if (!name || !date || !type) {
    return res.status(400).json({ message: 'Name, date, and type are required fields.' });
  }

  try {
    const newEvent = new Calendar({ name, date, type, description });
    const savedEvent = await newEvent.save();
    res.json(savedEvent);
  } catch (error) {
    console.error('Error adding event:', error);
    res.status(500).json({ message: 'Failed to add event.' });
  }
});

// Delete an event by ID
// Delete an event by ID
app.delete('/calendar/:id', async (req, res) => {
    try {
<<<<<<< HEAD
        const newCalendar = new Calendar(req.body);
        const savedEvent = await newCalendar.save();
        res.status(201).json(savedEvent);
    } catch (err) {
        console.error('Error saving event:', err);
        res.status(500).send('Error saving event');
    }
});

app.get('/view-notice', async (req, res) => {
=======
        const eventId = req.params.id;
        const deletedEvent = await Calendar.findByIdAndDelete(eventId);
        
        if (deletedEvent) {
            res.status(200).send({ message: 'Event deleted successfully' });
        } else {
            res.status(404).send({ message: 'Event not found' });
        }
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).send({ message: 'Error deleting event' });
    }
});




app.get('/get-images', async (req, res) => {
>>>>>>> 6ef68d63de5bc81b07fe2d158acf09f37e4fd8f0
    try {
        const notices = await Notice.find({});
        res.render('view-notice', { notices });
    } catch (err) {
        console.error('Error fetching notices:', err);
        res.status(500).send('Error fetching notices');
    }
});

<<<<<<< HEAD
=======


  app.get('/view-image', (req, res) => {
    res.render('view-image');
  });

  app.get('/view-notice', async (req, res) => {
    try {
        const notices = await Notice.find({});
        console.log('Fetched Notices:', notices); // Check if notices are being fetched

        // Render the view-notice.hbs page without using a layout
        res.render('view-notice', { notices, layout: false });
    } catch (err) {
        console.error('Error fetching notices:', err);
        res.status(500).send('Error fetching notices');
    }
});




>>>>>>> 6ef68d63de5bc81b07fe2d158acf09f37e4fd8f0
app.get('/view-images', (req, res) => {
    Image.find({}, (err, images) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error retrieving images");
        }
        res.render('view-images', { images });
    });
});

app.get("/form1", (req, res) => {
    res.render("form1");
});

app.post("/submit-form", upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'aadhar', maxCount: 1 },
    { name: 'signature', maxCount: 1 }
]), async (req, res) => {
    try {
        const existingApplication = await Application.findOne({ email: req.body.email });
        if (existingApplication) {
            return res.status(400).send("Application with this email already exists.");
        }

        const newUser = new User(req.body);
        await newUser.save();

        const newApplication = new Application({
            name: req.body.name,
            email: req.body.email,
            role: req.body.role.charAt(0).toUpperCase() + req.body.role.slice(1),
            status: 'Pending'
        });

        await newApplication.save();
        res.redirect("/subm");
    } catch (err) {
        console.error("Error saving form data:", err.message);
        res.status(500).send("Error saving form data: " + err.message);
    }
});

app.get("/subm", (req, res) => {
    res.render("subm");
});

app.listen(3000, () => console.log("Server running on port 3000"));
