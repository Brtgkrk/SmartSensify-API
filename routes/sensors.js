const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const verifyToken = require('../middlewares/jwtAuthMiddleware');
const Sensor = require('../models/Sensor');
const SensorData = require('../models/SensorData');
const User = require('../models/User');

const router = express.Router();

// Get all sensors based on user preference
router.get('/', verifyToken, async (req, res) => {
    try {
        const { showOwned, showPublic } = req.query;

        if (!req.user) {
            // If the user is not logged in, return only public sensors without the secretKey
            const sensors = await Sensor.find({ isPublic: true }).select('-secretKey');
            res.json({ sensors });
        } else {
            if (showOwned && !showPublic) {
                // Show only user's owned sensors with the secretKey
                const sensors = await Sensor.find({ _id: { $in: req.user.sensors } });
                res.json({ sensors });
            } else if (!showOwned && showPublic) {
                // Show only public sensors, removing the secretKey if the sensor is not owned by the user
                const sensors = await Sensor.find({ isPublic: true });

                // Remove the secretKey field from public sensors that do not belong to the user
                const sanitizedSensors = sensors.map((sensor) => {
                    if (sensor.isPublic && !req.user.sensors.includes(sensor._id)) {
                        return { ...sensor._doc, secretKey: undefined };
                    }
                    return sensor;
                });

                res.json({ sensors: sanitizedSensors });
            } else {
                // Show both user's owned sensors with the secretKey and public sensors without the secretKey
                const sensors = await Sensor.find({
                    $or: [
                        { isPublic: true, _id: { $nin: req.user.sensors } },
                        { _id: { $in: req.user.sensors } },
                    ],
                });

                // Remove the secretKey field from public sensors that do not belong to the user
                const sanitizedSensors = sensors.map((sensor) => {
                    if (sensor.isPublic && !req.user.sensors.includes(sensor._id)) {
                        return { ...sensor._doc, secretKey: undefined };
                    }
                    return sensor;
                });

                res.json({ sensors: sanitizedSensors });
            }
        }
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET certain sensor
router.get('/:sensorId', verifyToken, async (req, res) => {
    try {
        const { sensorId } = req.params;

        const sensor = await Sensor.findById(sensorId);

        if (!sensor) {
            return res.status(404).json({ error: 'Sensor not found' });
        }

        if (!req.user) {
            if (!sensor.isPublic) {
                return res.status(403).json({ error: 'Access denied' });
            }
            const sanitizedSensor = { ...sensor._doc, secretKey: undefined };
            return res.json({ sensor: sanitizedSensor });
        }

        if (!req.user.sensors.includes(sensorId) && sensor.isPublic) {
            const sanitizedSensor = { ...sensor._doc, secretKey: undefined };
            return res.json({ sensor: sanitizedSensor });
        }

        if (!req.user.sensors.includes(sensorId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({ sensor });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
});


// Create a new sensor
router.post('/', verifyToken, async (req, res) => {
    let newSensor;
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Please log in to create a sensor.' });
        }

        const { name, type, isPublic = false } = req.body;
        const secretKey = Math.random().toString(36).substring(2, 22);
        newSensor = await Sensor.create({ name, type, isPublic, secretKey });

        req.user.sensors.push(newSensor._id);
        await req.user.save();

        res.status(201).json({ message: 'Sensor created successfully', sensor: newSensor });
    } catch (error) {
        res.status(400).json({ error: req.user });
    }
});

// Modify an existing sensor
router.patch('/:sensorId', verifyToken, async (req, res) => {
    const { sensorId } = req.params;
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Please log in to update a sensor.' });
        }

        if (!req.user.sensors.includes(sensorId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { name, description, isPublic } = req.body;
        const updateFields = {};

        if (name) {
            updateFields.name = name;
        }
        if (description) {
            updateFields.description = description;
        }
        if (isPublic !== undefined) {
            updateFields.isPublic = isPublic;
        }

        const updatedSensor = await Sensor.findByIdAndUpdate(
            sensorId,
            updateFields,
            { new: true }
        );

        res.json({ message: 'Sensor updated successfully', sensor: updatedSensor });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});


// Delete a sensor
router.delete('/:sensorId', verifyToken, async (req, res) => {
    const { sensorId } = req.params;
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Please log in to delete a sensor.' });
        }

        if (!req.user.sensors.includes(sensorId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await Sensor.findByIdAndDelete(sensorId);

        req.user.sensors = req.user.sensors.filter((id) => id.toString() !== sensorId);
        await req.user.save();

        res.json({ message: 'Sensor deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// GET endpoint to get sensor data for a specific sensor
// When user is not logged {
//    "error": "Cannot read properties of null (reading '_id')"
//}
// Change this error to something else
/*router.get('/:sensorId/data', verifyToken, async (req, res) => {
    try {
        const { sensorId } = req.params;
        const { startDate, endDate, type, location } = req.query;
        const loggedInUserId = req.user._id;

        if (!req.user.sensors.includes(sensorId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const sensorData = await SensorData.find({ sensorId });

        res.json(sensorData);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});*/

router.get('/:sensorId/data', verifyToken, async (req, res) => {
    try {
        const { sensorId } = req.params;
        const { startDate, endDate, type, location, format } = req.query;
        const sensor = await Sensor.findById(sensorId);

        // If the sensor is not public, check user authentication
        if (!sensor.isPublic && !req.user) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!sensor.isPublic && !req.user.sensors.includes(sensorId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Construct the date filter based on the provided startDate and endDate
        const dateFilter = {};

        if (startDate) {
            dateFilter.$gte = new Date(startDate);
        }

        if (endDate) {
            dateFilter.$lte = new Date(endDate);
        }

        // Include date filter in the query only if at least one of startDate or endDate is provided
        const sensorDataQuery = {
            sensorId,
        };

        if (Object.keys(dateFilter).length > 0) {
            sensorDataQuery.timestamp = dateFilter;
        }

        const sensorData = await SensorData.find(sensorDataQuery);

        if (format && format.toLowerCase() === 'csv') {
            // Convert JSON to CSV and send as a downloadable file
            const csvRows = [];

            // Add header row
            const headerRow = ['Timestamp'];
            const typeSet = new Set();
            sensorData.forEach(data => {
                data.readings.forEach(reading => {
                    typeSet.add(reading.type);
                });
            });
            const uniqueTypes = Array.from(typeSet);
            headerRow.push(...uniqueTypes);

            csvRows.push(headerRow);

            // Add data rows
            sensorData.forEach(data => {
                const dataRow = [data.timestamp.toISOString()];

                uniqueTypes.forEach(type => {
                    const reading = data.readings.find(r => r.type === type);
                    dataRow.push(reading ? reading.value : '');
                });

                csvRows.push(dataRow);
            });

            // Convert to CSV string
            const csvString = csvRows.map(row => row.join(',')).join('\n');

            // Send as a downloadable file
            res.attachment('sensor_data.csv');
            res.status(200).send(csvString);
        } else {
            // Send JSON response
            res.json(sensorData);
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;