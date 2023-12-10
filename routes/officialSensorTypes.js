const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/jwtAuthMiddleware');
const OfficialSensorTypes = require('../models/officialSensorTypes');

// Get all OfficialSensorTypes
router.get('/', async (req, res) => {
  try {
    const OfficialSensorTypes = await OfficialSensorTypes.find();
    res.json({ OfficialSensorTypes });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new OfficialSensorTypes
router.post('/', verifyToken, async (req, res) => {
  try {
    // Check if the user has 'admin' role
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. User does not have admin role' });
    }

    const { name, description, unit } = req.body;
    const newOfficialSensorTypes = await OfficialSensorTypes.create({ name, description, unit });
    res.status(201).json({ OfficialSensorTypes: newOfficialSensorTypes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update an OfficialSensorTypes
router.patch('/:sensorTypeId', verifyToken, async (req, res) => {
  try {
    // Check if the user has 'admin' role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. User does not have admin role' });
    }

    const { name, description, unit } = req.body;
    const sensorTypeId = req.params.sensorTypeId;

    const updatedSensorType = await OfficialSensorTypes.findByIdAndUpdate(
      sensorTypeId,
      { name, description, unit },
      { new: true }
    );

    if (!updatedSensorType) {
      return res.status(404).json({ error: 'Official Sensor Type not found' });
    }

    res.json({ OfficialSensorTypes: updatedSensorType });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an OfficialSensorTypes
router.delete('/:sensorTypeId', verifyToken, async (req, res) => {
  try {
    // Check if the user has 'admin' role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. User does not have admin role' });
    }

    const sensorTypeId = req.params.sensorTypeId;
    const deletedSensorType = await OfficialSensorTypes.findByIdAndDelete(sensorTypeId);

    if (!deletedSensorType) {
      return res.status(404).json({ error: 'Official Sensor Type not found' });
    }

    res.json({ message: 'Official Sensor Type deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
