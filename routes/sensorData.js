const express = require('express');
const verifyToken = require('../middlewares/jwtAuthMiddleware');
const emailService = require('../utils/emailService');
const SensorData = require('../models/SensorData');
const OfficialSensorTypes = require('../models/officialSensorTypes');
const Alert = require('../models/Alert');
const Sensor = require('../models/Sensor');
const User = require('../models/User');
const Group = require('../models/Group');
const router = express.Router();
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// POST endpoint to add data to SensorData
router.post('/', async (req, res) => {
  try {
    const { secretKey, data, currentSettings } = req.body;

    // Check if the secretKey matches the Sensor's secretKey
    const sensor = await Sensor.findOne({ secretKey, _id: data.sensorId });
    if (!sensor) {
      return res.status(401).json({ error: 'Invalid secretKey' });
    }

    const newSensor = await Sensor.findOneAndUpdate(
      { _id: sensor._id },
      { $set: { currentOptions: currentSettings } },
      { new: true }
    );

    if (!data.readings) return res.status(201).json({ message: 'Settings has been changed', data: newSensor.currentOptions });

    const currentUser = await Sensor.getOwner(sensor._id);

    for (const reading of data.readings) {
      const typeId = reading.typeId;
      const typeName = reading.typeName;

      if (typeId) {
        const officialSensorType = await OfficialSensorTypes.findOne({ _id: typeId });
        // TODO: Check also in custom sensor types

        if (!officialSensorType) {
          return res.status(400).json({ error: `Invalid typeId: ${typeId}` });
        }
      } else if (typeName) {

        // TODO: Search trought user's types and set typeId or crete new

      } else {
        return res.status(400).json({ error: 'There is no type in one of the readings' });
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

              await emailService.sendEmail(ownerEmail, subject, message);
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

    let newSensorSettings;

    // If sensor current settings and new settings are different 
    if (!newSensor.areOptionsEqual()) {
      newSensorSettings = newSensor.newOptions;
    }

    res.status(201).json({ message: 'Sensor data added successfully', data: newSensorSettings });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});



module.exports = router;