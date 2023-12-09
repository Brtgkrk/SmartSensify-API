const express = require('express');
const verifyToken = require('../middlewares/jwtAuthMiddleware');
const Group = require('../models/Group');
const Alert = require('../models/Alert');
const Sensor = require('../models/Sensor');
const User = require('../models/User');
const router = express.Router();

// GET alert details by ID
router.get('/:alertId', verifyToken, async (req, res) => {
    try {
        const { alertId } = req.params;
        const alert = await Alert.findById(alertId);

        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        const sensor = await Alert.findSensorByAlertId(alertId);
        if (!sensor || !await User.hasSensor(req.user._id, sensor._id)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({ alert });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET all alerts for a certain sensor ID
router.get('/sensor/:sensorId', verifyToken, async (req, res) => {
    try {
        const { sensorId } = req.params;

        // Check if the user has the specified sensor in their group
        const sensor = await Sensor.findById(sensorId);
        if (!sensor || !req.user.sensors.includes(sensor._id)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const alerts = await Alert.find({ sensor: sensorId });
        res.json({ alerts });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST create new alert
router.post('/', verifyToken, async (req, res) => {
    try {
        const { sensorId, sensorType, condition, conditionNumber, action } = req.body;
        
        const sensor = await Sensor.findById(sensorId);
        if (!sensor || !await User.hasSensor(req.user._id, sensorId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!sensor.types.includes(sensorType)) {
            return res.status(400).json({ error: 'Invalid sensor type' });
        }

        const emails = [req.user.email];

        const newAlert = await Alert.create({
            sensorType,
            condition,
            conditionNumber,
            action,
            emails
        });

        sensor.alerts.push(newAlert._id);
        await sensor.save();

        res.status(201).json({ message: 'Alert created successfully', alert: newAlert });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PATCH update alert fields
router.patch('/:alertId', verifyToken, async (req, res) => {
    try {
        const { alertId } = req.params;

        const sensor = await Alert.findSensorByAlertId(alertId);
        if (!sensor || !await User.hasSensor(req.user._id, sensor._id)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const updatedFields = req.body;
        const updatedAlert = await Alert.findByIdAndUpdate(alertId, updatedFields, { new: true });

        res.json({ message: 'Alert updated successfully', alert: updatedAlert });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE alert
router.delete('/:alertId', verifyToken, async (req, res) => {
    try {
        const { alertId } = req.params;

        const sensor = await Alert.findSensorByAlertId(alertId);
        if (!sensor || !await User.hasSensor(req.user._id, sensor._id)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const alert = await Alert.findByIdAndDelete(alertId);

        // Remove the alert ID from the sensor's alerts array
        const sensor1 = await Sensor.findOneAndUpdate({ alerts: alert._id }, { $pull: { alerts: alert._id } });
        await sensor1.save();

        res.json({ message: 'Alert deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
