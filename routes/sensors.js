const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const Sensor = require('../models/Sensor');
const User = require('../models/User');

const router = express.Router();


const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization;

    if (!token) {
        // If no token is provided, it means the user is not logged in
        // Guest users have access to public sensors
        req.user = null;
        return next();
    }

    try {
        // Verify the token and get the user data
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch the user data from the database based on the userId
        const user = await User.findById(decoded.userId);

        if (!user) {
            // If the user is not found, it means the token is invalid or expired
            req.user = null;
        } else {
            // If the user is found, attach the user data to the req.user object
            req.user = user;
        }

        next();
    } catch (error) {
        // If there's an error verifying the token, treat the user as a guest
        req.user = null;
        next();
    }
};

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

router.get('/:sensorId', verifyToken, async (req, res) => {
    try {
        const { sensorId } = req.params;

        // Find the sensor by ID
        const sensor = await Sensor.findById(sensorId);

        if (!sensor) {
            // If the sensor is not found, return an error
            return res.status(404).json({ error: 'Sensor not found' });
        }

        if (!req.user) {
            // If the user is not logged in, and the sensor is not public, return an error
            if (!sensor.isPublic) {
                return res.status(403).json({ error: 'Access denied' });
            }
            // If the sensor is public and the user is not logged in, return the sensor data without the secretKey
            const sanitizedSensor = { ...sensor._doc, secretKey: undefined };
            return res.json({ sensor: sanitizedSensor });
        }

        if (!req.user.sensors.includes(sensorId) && sensor.isPublic) {
            // If the user is logged in, the sensor is not owned by the user, but the sensor is public, return the sensor data without the secretKey
            const sanitizedSensor = { ...sensor._doc, secretKey: undefined };
            return res.json({ sensor: sanitizedSensor });
        }

        if (!req.user.sensors.includes(sensorId)) {
            // If the user is logged in, and the sensor is not owned by the user and not public, throw an error
            return res.status(403).json({ error: 'Access denied' });
        }

        // If the sensor is owned by the user or is public and owned by the user, return all sensor data
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
            // If the user is not logged in, return an error message
            return res.status(401).json({ error: 'Please log in to create a sensor.' });
        }
        
        const { name, type, isPublic = false } = req.body;
        // Generate a random secret key
        const secretKey = Math.random().toString(36).substring(2, 22);
        // Create the new sensor
        newSensor = await Sensor.create({ name, type, isPublic, secretKey});

        // Add the new sensor's ID to the logged-in user's sensors array
        req.user.sensors.push(newSensor._id);
        await req.user.save();

        res.status(201).json({ message: 'Sensor created successfully', sensor: newSensor });
    } catch (error) {
        res.status(400).json({ error: req.user });
    }
});

// Modify an existing sensor
router.put('/:sensorId', verifyToken, async (req, res) => {
    const { sensorId } = req.params;
    try {
        // Check if the user is logged in
        if (!req.user) {
            return res.status(401).json({ error: 'Please log in to update a sensor.' });
        }

        // Check if the logged-in user has access to the sensor
        if (!req.user.sensors.includes(sensorId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { name, type, isPublic } = req.body;

        // Find and update the sensor
        const updatedSensor = await Sensor.findByIdAndUpdate(
            sensorId,
            { name, type, isPublic },
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
        // Check if the user is logged in
        if (!req.user) {
            return res.status(401).json({ error: 'Please log in to delete a sensor.' });
        }

        // Check if the logged-in user has access to the sensor
        if (!req.user.sensors.includes(sensorId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Find and delete the sensor
        await Sensor.findByIdAndDelete(sensorId);

        // Remove the sensor's ID from the logged-in user's sensors array
        req.user.sensors = req.user.sensors.filter((id) => id.toString() !== sensorId);
        await req.user.save();

        res.json({ message: 'Sensor deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
