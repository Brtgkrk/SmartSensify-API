const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const verifyToken = require('../middlewares/jwtAuthMiddleware');
const Sensor = require('../models/Sensor');
const SensorData = require('../models/SensorData');
const User = require('../models/User');
const Group = require('../models/Group');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get all sensors based on user preference
router.get('/', verifyToken, async (req, res) => {
    try {
        const { showOwned, showPublic } = req.query;

        // If the user is not logged in, return only public sensors
        if (!req.user) {
            const sensors = await Sensor.find({ isPublic: true });

            const selectedSensors = sensors.map(sensor => ({
                _id: sensor._id,
                name: sensor.name,
                types: sensor.types,
                isPublic: sensor.isPublic,
            }));
            
            res.json({ selectedSensors });
        } else {
            if (showOwned && !showPublic) {
                // Show only user's owned sensors with the secretKey
                const sensors = await User.getAllSensors(req.user._id);
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
        res.status(500).json({ message: error.message });
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

        if (await !User.hasSensor(req.user._id, sensorId) && sensor.isPublic) {
            const sanitizedSensor = { ...sensor._doc, secretKey: undefined };
            return res.json({ sensor: sanitizedSensor });
        }

        if (await !User.hasSensor(req.user._id, sensorId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({ sensor });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// Create a new sensor
router.post('/', verifyToken, async (req, res) => {
    let newSensor;
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Please log in to create a sensor.' });
        }

        const { groupId, name, type, isPublic = false } = req.body;
        const secretKey = Math.random().toString(36).substring(2, 22);
        newSensor = await Sensor.create({ name, type, isPublic, secretKey });

        //req.user.sensors.push(newSensor._id);
        const group = await Group.findById(groupId);
        if (!group /*|| !group.users.some(userId => userId.equals(req.user._id))*/) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        //return res.status(201).json({ message: group });
        // Check if user is in certain group
        group.sensors.push(newSensor._id);
        await group.save();

        res.status(201).json({ message: 'Sensor created successfully', sensor: newSensor });
    } catch (error) {
        res.status(400).json({ error: error.message });
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

// Modify existing sensor settings
router.patch('/:sensorId/settings', verifyToken, async (req, res) => {
    try {
        const { newSettings } = req.body;
        const { sensorId } = req.params;

        const sensor = await Sensor.findById(sensorId);
        if (!sensor) {
            return res.status(404).json({ error: 'Sensor not found' });
        }

        if (!req.user || await !User.hasSensor(req.user._id, sensorId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        sensor.newOptions = newSettings;
        await sensor.save();

        res.status(200).json({ message: 'New options updated successfully', sensor });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Delete a sensor
router.delete('/:sensorId', verifyToken, async (req, res) => {
    const { sensorId } = req.params;
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Please log in to delete a sensor.' });
        }

        await Group.find({ users: req.user._id })
            .then(groups => {
                if (groups.length === 0) {
                    return Promise.reject({ status: 403, message: 'Access denied - no groups found for the user.' });
                }
                groups.forEach(group => {
                    const sensorIndex = group.sensors.indexOf(sensorId);
                    if (sensorIndex !== -1) {
                        group.sensors.splice(sensorIndex, 1);
                    }
                });
                const promises = groups.map(group => group.save());
                return Promise.all(promises);
            })
            .catch(error => {
                if (error.status === 403) {
                    res.status(403).send(error.message);
                } else {
                    console.error('Error removing sensor from user groups:', error);
                    res.status(500).send('Internal Server Error');
                }
            });

        await Sensor.findByIdAndDelete(sensorId);

        res.json({ message: 'Sensor deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get data from the sensor
router.get('/:sensorId/data', verifyToken, async (req, res) => {
    try {
        const { sensorId } = req.params;
        const { startDate, endDate, type, location, format } = req.query;
        const sensor = await Sensor.findById(sensorId);
        const dataKey = req.get('dataKey');

        // If the sensor is not public, check user authentication
        if (!sensor || (!dataKey && !req.user)) {
            return res.status(404).json({ error: 'Not found' });
        }

        if (!sensor.dataKeys.some(key => key.uid === dataKey) && (!sensor.isPublic && !await User.hasSensor(req.user._id, sensorId))) {
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

// Sensor Data Keys //

// POST - Add new dataKey into certain sensor
router.post('/:sensorId/dataKeys', verifyToken, async (req, res) => {
    try {
        const { sensorId } = req.params;
        const { name } = req.body;
        const sensor = await Sensor.findById(sensorId);

        if (!sensor || !req.user || !await User.hasSensor(req.user._id, sensorId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const dataKey = {
            name: name,
            uid: uuidv4(),
        };
        sensor.dataKeys.push(dataKey);
        await sensor.save();

        res.status(201).json({ message: 'DataKey added successfully', dataKey });

    } catch (error) {
        console.error('Error adding dataKey:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE - Delete certain dataKey
router.delete('/:sensorId/dataKeys', verifyToken, async (req, res) => {
    try {
        const { sensorId } = req.params;
        const { id } = req.body;
        const sensor = await Sensor.findById(sensorId);

        if (!sensor || !req.user || !await User.hasSensor(req.user._id, sensorId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!id || !sensor.dataKeys.some(dataKey => dataKey._id.toString() === id.toString())) {
            return res.status(400).json({ error: 'Invalid dataKey' });
        }

        await Sensor.updateOne(
            { _id: sensorId },
            { $pull: { dataKeys: { _id: id } } }
        );
        await sensor.save();

        res.json({ message: 'DataKey deleted successfully', id });

    } catch (error) {
        console.error('Error deleting dataKey:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;