require('dotenv').config();
const express = require("express");
const path = require("path");
const exphbs = require('express-handlebars');
const multer = require("multer");
const bodyParser = require('body-parser');
const session = require('express-session');
const { User, Activity, Notice, Image, Calendar, Application, Parent, Staff, Applicant, VolunteerRecord, StaffRecord, ParentRecord } = require('./mongodb'); 
const mongoose = require('mongoose'); 
const { sendApplicationEmail, sendCredentialEmail, generateUniqueCode } = require('./utils/email');
const crypto = require('crypto');
const cors = require('cors');
const moment = require('moment');
const app = express();
const bcrypt = require('bcrypt');
const saltRounds = 10;

// hbs.registerHelper('json', function(context) {
//     return JSON.stringify(context);
// });

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
        formatDate: (date) => moment(date).format('DD-MM-YYYY'),
        eq: (a, b) => a === b,  // Helper for equality check
        json: (context) => JSON.stringify(context),  // Convert context to JSON string
        isArray: (value) => Array.isArray(value)  // Add the isArray helper
      },
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true
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
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = require('multer')({ dest: 'uploads/' });

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

// Route to render signup page
app.get("/signup", (req, res) => {
    res.render("signup");
});

app.post("/signup", async (req, res) => {
    const { name, email, password, uniqueCode, role } = req.body;

    try {
        let matchedSchema = null;

        // Find the record based on the uniqueCode, email combination, and role
        const parentRecord = await Parent.findOne({ uniqueCode, email });
        const staffRecord = await Staff.findOne({ uniqueCode, email });
        const applicantRecord = await Applicant.findOne({ uniqueCode, email, role: "Volunteer" }); // Assuming 'Volunteer' role as example

        if (parentRecord && role === "Parent") {
            matchedSchema = "Parent";
        } else if (staffRecord && role === "Staff") {
            matchedSchema = "Staff";
        } else if (applicantRecord && role === "Volunteer") {
            matchedSchema = "Volunteer";
        }

        // If no match is found, or if role is incorrect, deny access and show an error
        if (!matchedSchema) {
            return res.status(400).send("Invalid role, unique code, or email. Access denied.");
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Store data in the appropriate schema based on matchedSchema
        if (matchedSchema === "Parent") {
            const newParentRecord = new ParentRecord({ name, email, password: hashedPassword, uniqueCode, role: "Parent" });
            await newParentRecord.save();
            req.session.user = { name, email, role: "Parent" };
            return res.redirect("/parents");
        } else if (matchedSchema === "Staff") {
            const newStaffRecord = new StaffRecord({ name, email, password: hashedPassword, uniqueCode, role: "Staff" });
            await newStaffRecord.save();
            req.session.user = { name, email, role: "Staff" };
            return res.redirect("/staffDash");
        } else if (matchedSchema === "Volunteer") {
            const newVolunteerRecord = new VolunteerRecord({ name, email, password: hashedPassword, uniqueCode, role: "Volunteer" });
            await newVolunteerRecord.save();
            req.session.user = { name, email, role: "Volunteer" };
            return res.redirect("/volunteerDash");
        }

        res.status(400).send("Error identifying user schema.");
    } catch (error) {
        console.error("Error during sign-up:", error);
        res.status(500).send("Error during sign-up.");
    }
});

async function findUserAndRole(email, password) {
    // Check VolunteerRecord
    const volunteer = await VolunteerRecord.findOne({ email });
    if (volunteer && volunteer.password && await bcrypt.compare(password, volunteer.password)) {
        return { user: volunteer, role: 'Volunteer' };
    }

    // Check StaffRecord
    const staff = await StaffRecord.findOne({ email });
    if (staff && staff.password && await bcrypt.compare(password, staff.password)) {
        return { user: staff, role: 'Staff' };
    }

    // Check ParentRecord
    const parent = await ParentRecord.findOne({ email });
    if (parent && parent.password && await bcrypt.compare(password, parent.password)) {
        return { user: parent, role: 'Parent' };
    }

    // If no match is found in any schema
    return null;
}

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        if (email === "gargimittal.10102003@gmail.com" && password === "g123") {
            req.session.user = { name: "Admin", email: "gargimittal.10102003@gmail.com", role: "Admin" };
            return res.redirect("/admin"); // Redirect to the admin dashboard
        }
        // Find user and role based on email and password
        const result = await findUserAndRole(email, password);

        if (result) {
            const { user, role } = result;

            // Store session data with role-specific information
            req.session.user = { name: user.name, email: user.email, role };

            // Redirect to the corresponding dashboard based on role
            if (role === 'Volunteer') {
                res.redirect("/volunteerDash");
            } else if (role === 'Staff') {
                res.redirect("/staffDash");
            } else if (role === 'Parent') {
                res.redirect("/parents");
            }
        } else {
            res.send("Invalid email or password.");
        }
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).send("Error during login.");
    }
});

app.get('/application', isAuthenticated, (req, res) => {
    // Load and render the application page
    res.render('application'); // Assuming 'application' is the template name
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

app.get('/admin/view-parents', isAuthenticated, async (req, res) => {
    try {
        const parents = await ParentRecord.find(); // Fetch all entries in ParentRecord
        res.render('view-parents', { parents });
    } catch (error) {
        console.error("Error fetching parents:", error);
        res.status(500).send("Error loading parent records.");
    }
});

// Route to view all staff in the admin dashboard
app.get('/admin/view-staff', isAuthenticated, async (req, res) => {
    try {
        const staff = await StaffRecord.find(); // Fetch all entries in StaffRecord
        res.render('view-staff', { staff });
    } catch (error) {
        console.error("Error fetching staff:", error);
        res.status(500).send("Error loading staff records.");
    }
});

// Route to view all volunteers in the admin dashboard
app.get('/admin/view-volunteers', isAuthenticated, async (req, res) => {
    try {
        const volunteers = await VolunteerRecord.find(); // Fetch all entries in VolunteerRecord
        res.render('view-volunteers', { volunteers });
    } catch (error) {
        console.error("Error fetching volunteers:", error);
        res.status(500).send("Error loading volunteer records.");
    }
});

app.get('/admin/add-credential', (req, res) => {
    const role = req.query.role || ''; // Get role from query, if any
    res.render('add-credential', { role });
});

app.get('/admin/applications', isAuthenticated, async (req, res) => {
    try {
        // Fetch applications that have corresponding user data with files uploaded
        const applications = await Application.find().lean();

        // Filter applications to include only those with a User record that has photo, aadhar, and signature uploaded
        const validApplications = [];
        for (const application of applications) {
            const userDetails = await User.findOne({ email: application.email }).lean();
            if (userDetails && userDetails.photo && userDetails.aadhar && userDetails.signature) {
                validApplications.push({
                    ...application,
                    userDetails,
                });
            }
        }

        // Render applications with valid user details only
        res.render("application", { applications: validApplications });
    } catch (err) {
        console.error("Error fetching applications:", err.message);
        res.status(500).send("Error loading applications");
    }
});

app.post("/admin/send-credential", isAuthenticated, async (req, res) => {
    try {
        const { email, role } = req.body;
        const uniqueCode = await sendCredentialEmail(email, role);

        // Save email and unique code in the respective schema based on role
        if (role === "parent") {
            const newParent = new Parent({ email, uniqueCode });
            await newParent.save();
        } else if (role === "staff") {
            const newStaff = new Staff({ email, uniqueCode });
            await newStaff.save();
        }

        res.render("add-credential", { 
            role,
            successMessage: `Credential email sent successfully to ${email}`
        });
    } catch (err) {
        console.error("Error sending credentials:", err.message);
        res.status(500).send("Error sending credentials");
    }
});

app.post("/admin/accept/:id", isAuthenticated, async (req, res) => {
    try {
        const applicationId = req.params.id;
        const application = await Application.findById(applicationId);

        if (application) {
            application.status = "Accepted";
            application.uniqueCode = generateUniqueCode(); // Generate a unique code
            await application.save();

            // Send acceptance email and save to Applicant schema
            await sendApplicationEmail(application, "Accepted");

            res.redirect("/admin/applications");
        } else {
            res.status(404).send("Application not found");
        }
    } catch (err) {
        console.error("Error accepting application:", err.message);
        res.status(500).send("Error accepting application");
    }
});

app.post("/admin/decline/:id", isAuthenticated, async (req, res) => {
    try {
        const applicationId = req.params.id;
        const application = await Application.findById(applicationId);

        if (application) {
            application.status = "Declined";
            await application.save();

            // Send decline email (optional)
            await sendApplicationEmail(application, "Declined");

            res.redirect("/admin/applications");
        } else {
            res.status(404).send("Application not found");
        }
    } catch (err) {
        console.error("Error declining application:", err.message);
        res.status(500).send("Error declining application");
    }
});

app.get('/admin/application-details/:id', isAuthenticated, async (req, res) => {
    try {
        const application = await Application.findById(req.params.id);
        const userDetails = await User.findOne({ email: application.email });

        if (application && userDetails) {
            res.render('application-details', {
                application,
                userDetails,
                photoUrl: `/uploads/${userDetails.photo}`,
                aadharUrl: `/uploads/${userDetails.aadhar}`,
                signatureUrl: `/uploads/${userDetails.signature}`
            });
        } else {
            res.status(404).send("Application not found");
        }
    } catch (error) {
        console.error("Error fetching application details:", error);
        res.status(500).send("Error fetching application details");
    }
});

app.delete('/api/staff/:id', isAuthenticated, async (req, res) => {
    try {
        const staffId = req.params.id;
        const deletedStaff = await StaffRecord.findByIdAndDelete(staffId);

        if (deletedStaff) {
            res.json({ success: true });
        } else {
            res.json({ success: false, message: "Staff record not found" });
        }
    } catch (error) {
        console.error("Error deleting staff record:", error);
        res.status(500).json({ success: false, message: "Error deleting staff record" });
    }
});

app.delete('/api/parents/:id', isAuthenticated, async (req, res) => {
    try {
        const parentId = req.params.id;
        const deletedParent = await ParentRecord.findByIdAndDelete(parentId);

        if (deletedParent) {
            res.json({ success: true });
        } else {
            res.json({ success: false, message: "Parent record not found" });
        }
    } catch (error) {
        console.error("Error deleting parent record:", error);
        res.status(500).json({ success: false, message: "Error deleting parent record" });
    }
});

app.delete('/api/volunteers/:id', isAuthenticated, async (req, res) => {
    try {
        const volunteerId = req.params.id;
        const deletedVolunteer = await VolunteerRecord.findByIdAndDelete(volunteerId);

        if (deletedVolunteer) {
            res.json({ success: true });
        } else {
            res.json({ success: false, message: "Volunteer record not found" });
        }
    } catch (error) {
        console.error("Error deleting volunteer record:", error);
        res.status(500).json({ success: false, message: "Error deleting volunteer record" });
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

app.get('/vol-management', isAuthenticated, async (req, res) => {
    try {
        // Fetch activities for the logged-in user
        const activities = await Activity.find({ user: req.session.user.email });
        res.render('vol-management', { activities });
    } catch (err) {
        console.error('Error fetching activities:', err);
        res.status(500).send('Error fetching activities');
    }
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

app.post("/add-activity", isAuthenticated, upload.array('media'), async (req, res) => {
    try {
        // Collect media file paths for multiple files
        const mediaFiles = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

        const newActivity = new Activity({
            user: req.session.user.email,
            description: req.body.description,
            media: mediaFiles,  // Store all file paths in an array
            hours: req.body.hours
        });

        await newActivity.save();
        res.json(newActivity);  // Return the entire saved activity object
    } catch (err) {
        res.status(500).send("Error adding activity: " + err.message);
    }
});


//garret
app.delete('/activity/:id', isAuthenticated, async (req, res) => {
    try {
        const activityId = req.params.id;

        // Check if the activityId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(activityId)) {
            return res.status(400).json({ message: 'Invalid activity ID' });
        }

        const deletedActivity = await Activity.findByIdAndDelete(activityId);
        
        if (deletedActivity) {
            res.status(200).json({ message: 'Activity deleted successfully' });
        } else {
            res.status(404).json({ message: 'Activity not found' });
        }
    } catch (error) {
        console.error('Error deleting activity:', error);
        res.status(500).json({ message: 'Error deleting activity' });
    }
});

app.get('/activities', async (req, res) => {
    try {
        const activities = await Activity.find().lean(); // Use .lean() for easy access in Handlebars
        res.render('activities', { activities });
    } catch (err) {
        console.error("Error retrieving activities:", err);
        res.status(500).send("Error retrieving activities");
    }
});
app.get("/activities", (req, res) => {
    res.render('activities');
});
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

app.post('/add-image', upload.array('images', 10), async (req, res) => {
    try {
        // Check if files were uploaded
        if (!req.files || req.files.length === 0) {
            return res.status(400).send('No files were uploaded.');
        }

        // Save each file's details and binary data to the database
        const imagePromises = req.files.map(file => {
            const newImage = new Image({
                filename: file.originalname, // Store the original filename
                contentType: file.mimetype,  // Store MIME type of the file
                data: file.buffer,           // Store binary data
                description: req.body.description || 'No description provided', // Optional description
            });
            return newImage.save();
        });

        // Wait for all images to be saved
        await Promise.all(imagePromises);

        console.log('Images saved successfully');
        res.redirect('/add-image');
    } catch (err) {
        console.error('Error uploading images:', err);
        res.status(500).send('Error saving images: ' + err.message);
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
app.get('/add-image', (req, res) => {
    res.render('add-image');
});

app.get("/add-notice", (req, res) => {
    res.render('add-notice');
});

app.post('/add-notice', async (req, res) => {
    try {
        console.log('Notice request received:', req.body.notice); // Debug log
        const newNotice = new Notice({
            notice: req.body.notice,
            date: new Date() // Default date
        });
        await newNotice.save();
        console.log('Notice saved:', newNotice); // Confirm save
        res.status(200).json({ message: 'Notice added successfully' });
    } catch (err) {
        console.error('Error saving notice:', err);
        res.status(500).json({ message: 'Error saving notice' });
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

  app.get("/view-calendar", isAuthenticated, (req, res) => {
    res.render("view-calendar"); // Ensure you have a view-calendar.hbs template
});

app.get('/view-images', async (req, res) => {
    try {
        const { date } = req.query;
        let images;

        if (date) {
            const startOfDay = new Date(date);
            const endOfDay = new Date(startOfDay);
            endOfDay.setDate(endOfDay.getDate() + 1);

            images = await Image.find({
                uploadedAt: { $gte: startOfDay, $lt: endOfDay }
            });
        } else {
            images = await Image.find(); // Fetch all images if no date filter is applied
        }

        res.render('view-images', { images });
    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).send('Error fetching images');
    }
});


app.get('/view-notice', async (req, res) => {
    try {
        const notices = await Notice.find({}); // Fetch notices from the database
        console.log('Fetched Notices:', notices); // Log the fetched data for debugging
        res.render('view-notice', { notices }); // Render the view-notice page with notices data
    } catch (err) {
        console.error('Error fetching notices:', err);
        res.status(500).send('Error fetching notices'); // Handle errors if any
    }
});
//garret end

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});

app.get("/calendar", isAuthenticated, (req, res) => {
    res.render("calendar");
});

app.use(express.json()); // To parse JSON bodies

// Get all events
app.get('/calendar/events', async (req, res) => {
    try {
        const events = await Calendar.find();

        // Format each event's id and date for the calendar
        const formattedEvents = events.map(event => {
            if (!event._id) {
                console.error('Event missing _id:', event);
                return null;  // Skip or handle invalid event
            }
            return {
                id: event._id.toString(),
                name: event.name,
                date: moment(event.date).format('YYYY-MM-DD'),
                type: event.type,
                description: event.description
            };
        }).filter(event => event !== null);  // Filter out any invalid events        
        console.log("Formatted Events:", formattedEvents); // Log to verify structure
        res.json(formattedEvents); // Send events to the client
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ message: 'Failed to fetch events.' });
    }
});

// Add a new event
// Add a new event
app.post('/calendar', async (req, res) => {
    const { name, date, type, description } = req.body;
  
    if (!name || !date || !type) {
      return res.status(400).json({ message: 'Name, date, and type are required fields.' });
    }
  
    try {
      const newEvent = new Calendar({
          name, date, type, description
      });
  
      const savedEvent = await newEvent.save();
  
      // Log the saved event to ensure id is present
      console.log('Saved Event:', savedEvent);
  
      res.json({
        id: savedEvent._id.toString(),  // Ensure the ID is included in the response
        name: savedEvent.name,
        date: savedEvent.date,
        type: savedEvent.type,
        description: savedEvent.description
      });
    } catch (error) {
      console.error('Error adding event:', error);
      res.status(500).json({ message: 'Failed to add event.' });
    }
  });
  

// Delete an event by ID
app.delete('/calendar/:id', async (req, res) => {
    const eventId = req.params.id;

    console.log("Event ID received in delete request:", eventId);  // Log received event ID

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
        return res.status(400).json({ message: "Invalid event ID format." });
    }

    try {
        const deletedEvent = await Calendar.findByIdAndDelete(eventId);
        if (deletedEvent) {
            res.status(200).json({ message: "Event deleted successfully." });
        } else {
            console.error("Event not found with ID:", eventId);
            res.status(404).json({ message: "Event not found." });
        }
    } catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).json({ message: "Error deleting event" });
    }
});

app.get('/get-images', async (req, res) => {
    try {
        const notices = await Notice.find({});
        res.render('view-notice', { notices });
    } catch (err) {
        console.error('Error fetching notices:', err);
        res.status(500).send('Error fetching notices');
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

        // Create a new User instance, explicitly setting file paths from req.files
        const newUser = new User({
            ...req.body,
            photo: req.files['photo'] ? req.files['photo'][0].filename : null,
            aadhar: req.files['aadhar'] ? req.files['aadhar'][0].filename : null,
            signature: req.files['signature'] ? req.files['signature'][0].filename : null,
        });

        await newUser.save();
        console.log('Saved User:', newUser); // Confirm saved data

        // Create a new Application instance
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