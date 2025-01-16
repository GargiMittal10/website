const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(
  process.env.MONGODB_URI,
  { useNewUrlParser: true, useUnifiedTopology: true }
)
  .then(() => console.log("MongoDB connected to Atlas"))
  .catch((error) => console.error("Failed to connect to MongoDB Atlas:", error));


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
  user: { type: String, required: true },
  description: { type: String, required: true },
  media: { type: [String] }, 
  hours: { type: Number, required: true },
  date: { type: Date, default: Date.now }
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
    required: true, // Store the original filename for reference
  },
  contentType: {
    type: String, // Store the MIME type of the image (e.g., image/jpeg, image/png)
    required: true,
  },
  data: {
    type: Buffer, // Store the binary data of the image
    required: true, // Make this field required for storing the image
  },
  description: {
    type: String,
    required: true, // Description of the image
  },
  uploadedAt: {
    type: Date,
    default: Date.now, // Store the time when the image is uploaded
  },
});


// Create image model for the image database
const Image = mongoose.model('Image', ImageSchema);

module.exports = Image;


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

const ParentSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  uniqueCode: { type: String, required: true }
});
const Parent = mongoose.model('Parent', ParentSchema);

// Staff Schema
const StaffSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  uniqueCode: { type: String, required: true }
});
const Staff = mongoose.model('Staff', StaffSchema);

const applicantSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  uniqueCode: { type: String, required: true },
  role: { type: String, enum: ['Volunteer', 'Intern', 'volunteer', 'intern'], required: true },
  dateAccepted: { type: Date, default: Date.now }
});

const Applicant = mongoose.model('Applicant', applicantSchema);

ParentSchema.index({ email: 1, uniqueCode: 1 }, { unique: true });
StaffSchema.index({ email: 1, uniqueCode: 1 }, { unique: true });
applicantSchema.index({ email: 1, uniqueCode: 1 }, { unique: true });

const VolunteerRecordSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  uniqueCode: { type: String, required: true },
  password: { type: String, required: true }, // Store the hashed password
  role: { type: String, default: "volunteer" }
});
const VolunteerRecord = mongoose.model("VolunteerRecord", VolunteerRecordSchema);

// Staff Record Schema
const StaffRecordSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  uniqueCode: { type: String, required: true },
  password: { type: String, required: true }, // Store the hashed password
  role: { type: String, default: "staff" }
});
const StaffRecord = mongoose.model("StaffRecord", StaffRecordSchema);

// Parent Record Schema
const ParentRecordSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  uniqueCode: { type: String, required: true },
  password: { type: String, required: true }, // Store the hashed password
  role: { type: String, default: "parent" }
});
const ParentRecord = mongoose.model("ParentRecord", ParentRecordSchema);

// Export the models
module.exports = {
    User,     // Export User model (previously Collection1)
    Activity,
    Notice,
    Image,
    Calendar,
    Application,
    Parent, // Export Parent model
    Staff,
    Applicant,
    VolunteerRecord,
    StaffRecord,
    ParentRecord
};
