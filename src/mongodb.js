const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/LoginTut")
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB:", error);
  });

// Schema for User Data (volunteer/intern)
const FormSchema = new mongoose.Schema({
    photo: String,
    aadhar: String,
    signature: String, 
    role: { type: String, enum: ['volunteer', 'intern'], required: true },
    name: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    dob: { type: Date, required: true },
    age: { type: Number, required: true },
    marital_status: { type: String, enum: ['unmarried', 'married'], required: true },
    occupation: String,
    designation: String,
    address: { type: String, required: true },
    passport: String,
    arrival: Date,
    contact_residence: String,
    contact_office: String,
    mobile: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    education: { type: String, required: true },
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
    }
});

// Correctly name the model as User (instead of Collection1)
const User = mongoose.model("User", FormSchema);

// Schema for Activities
const ActivitySchema = new mongoose.Schema({
    user: { type: String, required: true },  // Reference by user's email
    description: { type: String, required: true },
    media: { type: String },  // Optional for media files
    date: { type: Date, default: Date.now },
    hours: { type: Number, required: true },
    date: { type: Date, default: Date.now },
});

// Create a model for activities
const Activity = mongoose.model("Activity", ActivitySchema);

//notice schema
const NoticeSchema = new mongoose.Schema({
  notice: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});
const Notice = mongoose.model('Notice', NoticeSchema);

//notice schema
const ImageSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

// Create image model for the image database
const Image = mongoose.model('Image', ImageSchema);

const CalendarSchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['event', 'holiday'], required: true },
  description: { type: String }
});
const Calendar = mongoose.model('Calendar', CalendarSchema);

const applicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, enum: ['Volunteer', 'Intern'], required: true },
  status: { type: String, enum: ['Pending', 'Accepted', 'Declined'], default: 'Pending' },
  uniqueCode: { type: String } // New field for storing the unique code
});



const Application = mongoose.model('Application', applicationSchema);

// Export the models
module.exports = {
    User,     // Export User model (previously Collection1)
    Activity,
    Notice,
    Image,
    Calendar,
    Application // Export Activity model
};
