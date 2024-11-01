const nodemailer = require('nodemailer');
const { Application } = require('../mongodb');
const crypto = require('crypto');
require('dotenv').config(); // Load environment variables

// Function to generate a unique code
function generateUniqueCode() {
    return crypto.randomBytes(3).toString('hex'); // Generates a 6-character unique code
}

function setupEmailRoutes(app) {
    app.post("/admin/accept/:id", async (req, res) => {
        try {
            const applicationId = req.params.id;
            const uniqueCode = generateUniqueCode(); // Generate the unique code

            // Update the application with the accepted status and unique code
            await Application.findByIdAndUpdate(applicationId, { status: "Accepted", uniqueCode: uniqueCode });

            // Fetch updated application to get email and other details
            const application = await Application.findById(applicationId);

            // Confirm environment variables are loaded
            console.log("Email User:", process.env.EMAIL_USER);
            console.log("Email Pass:", process.env.EMAIL_PASS ? "Loaded" : "Not Loaded");

            // Nodemailer transporter setup
            const transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });

            // Send email
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: application.email,
                subject: "Application Accepted",
                text: `Dear ${application.name},\n\nYour application as ${application.role} has been accepted! Here is your unique code: ${uniqueCode}. Welcome aboard!\n\nBest regards,\nNavkshitij Team`,
            });

            res.redirect("/admin");
        } catch (err) {
            console.error("Error accepting application and sending email:", err.message);
            res.status(500).send("Error processing application acceptance.");
        }
    });

    app.post("/admin/decline/:id", async (req, res) => {
        try {
            const applicationId = req.params.id;

            // Update the application with the declined status
            await Application.findByIdAndUpdate(applicationId, { status: "Declined" });

            // Fetch updated application to get email and other details
            const application = await Application.findById(applicationId);

            // Nodemailer transporter setup
            const transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });

            // Send rejection email
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: application.email,
                subject: "Application Declined",
                text: `Dear ${application.name},\n\nWe regret to inform you that your application as ${application.role} has been declined. We appreciate your interest and effort and encourage you to apply again in the future.\n\nBest regards,\nNavkshitij Team`,
            });

            res.redirect("/admin");
        } catch (err) {
            console.error("Error declining application and sending email:", err.message);
            res.status(500).send("Error processing application declination.");
        }
    });

}

module.exports = setupEmailRoutes;
