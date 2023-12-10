const express = require('express');
const verifyToken = require('../middlewares/jwtAuthMiddleware');
const CustomSensorType = require('../models/CustomSensorType');

const router = express.Router();

// Get all custom sensor types
router.get('/', verifyToken, async (req, res) => {
    try {
        const customSensorTypes = await CustomSensorType.find();
        return res.json({ customSensorTypes });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new custom sensor type
router.post('/', verifyToken, async (req, res) => {
    try {
        const { name, description, unit } = req.body;
        const customSensorType = await CustomSensorType.create({ name, description, unit });
        return res.json({ customSensorType });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a custom sensor type's information
router.patch('/:typeId', verifyToken, async (req, res) => {
    try {
        const typeId = req.params.typeId;
        const { name, description, unit } = req.body;

        const customSensorType = await CustomSensorType.findByIdAndUpdate(typeId, { name, description, unit }, { new: true });

        if (!customSensorType) {
            return res.status(404).json({ error: 'Custom sensor type not found' });
        }

        return res.json({ customSensorType });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a custom sensor type
router.delete('/:typeId', verifyToken, async (req, res) => {
    try {
        const typeId = req.params.typeId;

        const customSensorType = await CustomSensorType.findByIdAndDelete(typeId);

        if (!customSensorType) {
            return res.status(404).json({ error: 'Custom sensor type not found' });
        }

        return res.json({ message: 'Custom sensor type deleted successfully' });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
