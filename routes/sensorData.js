const express = require('express');
const verifyToken = require('../middlewares/jwtAuthMiddleware');
const SensorData = require('../models/SensorData');
const Alert = require('../models/Alert');
const router = express.Router();
const Sensor = require('../models/Sensor');
const nodemailer = require('nodemailer');
require('dotenv').config();

// POST endpoint to add data to SensorData
router.post('/', async (req, res) => {
  try {
    const { secretKey, data } = req.body;

    // Check if the secretKey matches the Sensor's secretKey
    const sensor = await Sensor.findOne({ secretKey, _id: data.sensorId });
    if (!sensor) {
      return res.status(401).json({ error: 'Invalid secretKey' });
    }

    // Create a new SensorData object and save it
    const newSensorData = new SensorData(data);
    await newSensorData.save();


    // Process sensor data
    try {
      // Get alerts for the specified sensor
      const alerts = await Alert.find({ sensorType: { $in: data.readings.map(reading => reading.type) } });

      // Iterate through newSensorData readings
      for (const reading of data.readings) {
        // Find corresponding alerts for the reading type
        const matchingAlerts = alerts.filter(alert => alert.sensorType === reading.type);

        // Check conditions for each matching alert
        for (const alert of matchingAlerts) {
          const conditionMet =
            (alert.condition === 'under' && parseFloat(reading.value) < alert.conditionNumber) ||
            (alert.condition === 'above' && parseFloat(reading.value) > alert.conditionNumber);

          if (conditionMet) {

            // Send email to sensor owner
            //const sensor = await Sensor.findById(sensorId);
            const emails = alert.emails; // Assuming alert.emails is an array of email addresses

            for (const ownerEmail of emails) {
              const subject = `Alert: ${reading.type} is ${alert.condition} ${alert.conditionNumber}`;
              const message = `${reading.type} is ${alert.condition} ${alert.conditionNumber}: ${reading.value}`;

              await sendEmail(ownerEmail, subject, message);
            }

            // Update alert with sending information
            alert.sendings.push({
              timestamp: new Date(),
              message: `${reading.type} is ${alert.condition} ${alert.conditionNumber}: ${reading.value}`,
            });

            await alert.save();
          }
        }
      }

    } catch (error) {
      res.status(400).json({ message: `Error processing sensor data: ${error.message}` });
    }




    res.status(201).json({ message: 'Sensor data added successfully', data: newSensorData });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Set up nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to send email
const sendEmail = async (to, subject, message) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text: message,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = router;