const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

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
    const text = status === "Accepted" 
        ? `Dear ${application.name},\n\nYour application as ${application.role} has been accepted! Here is your unique code: ${application.uniqueCode}. Welcome aboard!\n\nBest regards,\nNavkshitij Team`
        : `Dear ${application.name},\n\nWe regret to inform you that your application as ${application.role} has been declined. We appreciate your interest and effort and encourage you to apply again in the future.\n\nBest regards,\nNavkshitij Team`;

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: application.email,
            subject,
            text,
        });
        console.log(`Email sent to ${application.email} regarding application status: ${status}`);
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

module.exports = { sendApplicationEmail, sendCredentialEmail };
