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
const cors = require('cors');
const exphbs = require('express-handlebars');
const moment = require('moment'); 






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
app.engine('hbs', exphbs.engine({
    extname: 'hbs',
    defaultLayout: false,
    helpers: {
        formatDate: (date) => moment(date).format('DD-MM-YYYY') // Define the helper here
    }
}));


// Set up template engine and static files
app.set('view engine', 'hbs');
app.set("views", path.join(__dirname, '../templates'));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(cors());
const fs = require('fs');
const uploadDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// File Upload Middleware (Multer)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Ensure this directory exists
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Create a unique filename
    }
});

// Initialize Multer
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
app.get('/activities', async (req, res) => {
    try {
        const activities = await Activity.find().lean(); // Use .lean() for easy access in Handlebars
        res.render('activities', { activities });
    } catch (err) {
        console.error("Error retrieving activities:", err);
        res.status(500).send("Error retrieving activities");
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

/* app.delete("/delete-activity/:id", isAuthenticated, async (req, res) => {
    try {
        const deletedActivity = await Activity.findByIdAndDelete(req.params.id);
 */



app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});

app.get("/add-notice", (req, res) => {
    res.render('add-notice');
});
app.get("/view-calendar", isAuthenticated, (req, res) => {
    res.render("view-calendar"); // Ensure you have a view-calendar.hbs template
});
app.get("/activities", (req, res) => {
    res.render('activities');
});

app.get("/vol-management", (req, res) => {
    res.render('vol-management');
});


  
  // Handle image upload (POST request)
  app.post('/add-image', upload.array('images', 10), async (req, res) => {
    try {
        // Check if files were uploaded
        if (!req.files || req.files.length === 0) {
            return res.status(400).send('No files were uploaded.');
        }

        // Access uploaded files
        const files = req.files;

        // Save each file's details to the database
        const imagePromises = files.map(file => {
            const newImage = new Image({
                filename: file.filename,
                description: req.body.description // or use an array of descriptions if needed
            });
            return newImage.save();
        });

        // Wait for all images to be saved
        const savedImages = await Promise.all(imagePromises);
       
        

        res.redirect('/add-image');
    } catch (err) {
        console.error('Error uploading images:', err);
        res.status(500).send('Error saving images: ' + err.message); // Include error message
    }
});
app.get('/api/images', async (req, res) => {
    try {
      const images = await Image.find(); // Fetching images from the database
      res.json(images);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  

// Route to delete an image by ID
app.delete('/delete-image/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedImage = await Image.findByIdAndDelete(id);
        
        if (!deletedImage) {
            return res.status(404).json({ message: 'Image not found' });
        }

        res.status(200).json({ message: 'Image deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting image', error });
    }
});





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
app.get('/api/notices', async (req, res) => {
    try {
      const notices = await Notice.find();
      res.status(200).json(notices);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Route to delete a notice by ID
  app.delete('/api/notices/:id', async (req, res) => {
    try {
      const result = await Notice.findByIdAndDelete(req.params.id);
      if (!result) {
        return res.status(404).json({ message: 'Notice not found' });
      }
      res.status(200).json({ message: 'Notice deleted successfully' });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

app.get('/add-image', (req, res) => {
    res.render('add-image');
});

/* app.post('/add-image', upload.single('image'), async (req, res) => {
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
}); */
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
const Event = require('./mongodb'); // Adjust the path as necessary

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


// Example of a delete request
app.delete('/calendar/:id', async (req, res) => {
    try {
        const eventId = req.params.id;
        const result = await Event.findByIdAndDelete(eventId);

        if (!result) {
            return res.status(404).json({ error: 'Event not found' });
        }

        res.status(204).send(); // No content response
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});



// Delete an event by ID
// Example of a delete request








app.get('/get-images', async (req, res) => {
    try {
        const notices = await Notice.find({});
        res.render('view-notice', { notices });
    } catch (err) {
        console.error('Error fetching notices:', err);
        res.status(500).send('Error fetching notices');
    }
});



  app.get('/view-image', (req, res) => {
    res.render('view-image');
  });
  app.get('/activities', (req, res) => {
    res.render('activities');
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


// Route to fetch all activities or filter by date
app.get('/activities', async (req, res) => {
    try {
        const { date } = req.query; // Get the date from query parameters

        // Check if a date is provided and filter the activities
        let activities;
        if (date) {
            const startOfDay = new Date(date);
            const endOfDay = new Date(startOfDay);
            endOfDay.setDate(endOfDay.getDate() + 1); // Include all activities on the given date

            activities = await Activity.find({
                date: {
                    $gte: startOfDay,
                    $lt: endOfDay
                }
            });
        } else {
            activities = await Activity.find(); // No date filter, fetch all activities
        }

        res.render('activities', { activities });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error retrieving activities");
    }
});


app.get('/activities', async (req, res) => {
    try {
        const activities = await Activity.find(); // Fetch all activities from the database
        res.render('activities', { activities }); // Render the Handlebars template with activities
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).send('Server Error');
    }
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
