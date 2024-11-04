const nodemailer = require('nodemailer');
require('dotenv').config();
const { Applicant } = require('../mongodb');
const crypto = require('crypto');

// Function to generate a unique code
function generateUniqueCode() {
    return crypto.randomBytes(3).toString('hex'); // Generates a 6-character unique code
}

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

// Function to send acceptance/rejection emails
async function sendApplicationEmail(application, status) {
    const subject = status === "Accepted" ? "Application Accepted" : "Application Declined";
    const uniqueCode = generateUniqueCode();

    const text = status === "Accepted" 
        ? `Dear ${application.name},\n\nYour application as ${application.role} has been accepted! Here is your unique code: ${uniqueCode}. Welcome aboard!\n\nBest regards,\nNavkshitij Team`
        : `Dear ${application.name},\n\nWe regret to inform you that your application as ${application.role} has been declined. We appreciate your interest and encourage you to apply again.\n\nBest regards,\nNavkshitij Team`;

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: application.email,
            subject,
            text,
        });

        console.log(`Email sent to ${application.email} regarding application status: ${status}`);

        if (status === "Accepted") {
            // Save accepted applicant to the Applicant schema
            const newApplicant = new Applicant({
                email: application.email,
                uniqueCode: uniqueCode,
                role: application.role
            });
            await newApplicant.save();
        }
    } catch (error) {
        console.error(`Failed to send application email to ${application.email}:`, error.message);
    }
}

// Function to send credential email with unique code
async function sendCredentialEmail(email, role) {
    const uniqueCode = generateUniqueCode();
    const subject = `Credentials for ${role}`;
    const text = `Hello, welcome on board! Here is your unique code: ${uniqueCode}. \n\nBest regards,\nNavkshitij Team`;

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject,
            text,
        });
        console.log(`Credential email sent to ${email} with role: ${role}`);
    } catch (error) {
        console.error(`Failed to send credential email to ${email}:`, error.message);
    }

    return uniqueCode;
}

module.exports = { sendApplicationEmail, sendCredentialEmail,generateUniqueCode };
