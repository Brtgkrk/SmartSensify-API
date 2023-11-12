const express = require('express');
const verifyToken = require('../middlewares/jwtAuthMiddleware');
const SensorData = require('../models/SensorData');
const router = express.Router();
const Sensor = require('../models/Sensor');

// GET endpoint to get sensor data for a specific sensor 
/*
router.get('/:sensorId/data', verifyToken, async (req, res) => {
  try {
    const { sensorId } = req.params;
    const { startDate, endDate, type, location } = req.query;
    const loggedInUserId = req.user._id;

    // Check if provided sensorId is owned by the current logged-in user
    const isOwnedByCurrentUser = await Sensor.isOwnedByUser(sensorId, loggedInUserId);
    if (!isOwnedByCurrentUser) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create the query object to retrieve the sensor data
    const query = { sensorId: sensorId };

    // Add timestamp filters if startDate and/or endDate are provided
    if (startDate) {
      query.timestamp = { $gte: new Date(startDate) };
    }
    if (endDate) {
      if (!query.timestamp) query.timestamp = {};
      query.timestamp.$lte = new Date(endDate);
    }

    // If type option is provided, filter the readings based on the specified type
    if (type) {
      query['readings.type'] = type;
    }

    // If location option is true, only include timestamp and location fields in the response
    const projection = location ? { timestamp: 1, location: 1 } : {};

    // Execute the query and return the results
    const sensorData = await SensorData.find(query, projection);

    res.json(sensorData);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}); */

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

        res.status(201).json({ message: 'Sensor data added successfully', data: newSensorData });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;