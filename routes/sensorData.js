const express = require('express');
const verifyToken = require('../middlewares/jwtAuthMiddleware');
const SensorData = require('../models/SensorData');
const OfficialSensorTypes = require('../models/officialSensorTypes');
const Alert = require('../models/Alert');
const Sensor = require('../models/Sensor');
const User = require('../models/User');
const Group = require('../models/Group');
const router = express.Router();
const nodemailer = require('nodemailer');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// POST endpoint to add data to SensorData
router.post('/', async (req, res) => {
  try {
    const { secretKey, data } = req.body;

    // Check if the secretKey matches the Sensor's secretKey
    const sensor = await Sensor.findOne({ secretKey, _id: data.sensorId });
    if (!sensor) {
      return res.status(401).json({ error: 'Invalid secretKey' });
    }

    const currentUser = await Sensor.getOwner(sensor._id);

    for (const reading of data.readings) {
      const typeId = reading.typeId;

      if (typeId) {
        const officialSensorType = await OfficialSensorTypes.findOne({ _id: typeId });

        if (!officialSensorType) {
          return res.status(400).json({ error: `Invalid typeId: ${typeId}` });
        }
      }
    }

    const newSensorData = new SensorData(data);
    await newSensorData.save();

    try {
      const alerts = await Alert.find({ sensorType: { $in: data.readings.map(reading => reading.type) } });

      for (const reading of data.readings) {
        const matchingAlerts = alerts.filter(alert => alert.sensorType === reading.type);

        for (const alert of matchingAlerts) {
          const conditionMet =
            (alert.condition === 'under' && parseFloat(reading.value) < alert.conditionNumber) ||
            (alert.condition === 'above' && parseFloat(reading.value) > alert.conditionNumber);

          if (conditionMet) {
            const emails = alert.emails;
            const templatePath = path.join(__dirname, '../templates/mail-alert.html');
            const htmlTemplate = fs.readFileSync(templatePath, 'utf-8');

            const templateWithData = htmlTemplate
              .replaceAll('{username}', currentUser.username)
              .replaceAll('{sensor.name}', sensor.name)
              .replaceAll('{sensor.id}', sensor._id)
              .replaceAll('{reading.type}', reading.type)
              .replaceAll('{alert.condition}', alert.condition)
              .replaceAll('{alert.conditionNumber}', alert.conditionNumber)
              .replaceAll('{reading.unit}', reading.unit)
              .replaceAll('{reading.value}', reading.value);

            for (const ownerEmail of emails) {
              const subject = `Alert: ${reading.type} is ${alert.condition} ${alert.conditionNumber}`;
              const message = templateWithData/*`${reading.type} is ${alert.condition} ${alert.conditionNumber}: ${reading.value}`*/;

              await sendEmail(ownerEmail, subject, message);
            }

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
const sendEmail = async (to, subject, htmlBody) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html: htmlBody,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = router;