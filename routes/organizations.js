const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const verifyToken = require('../middlewares/jwtAuthMiddleware');
const Organization = require('../models/Organization');
const User = require('../models/User');

const router = express.Router();

// Get all public/current organization/s
router.get('/', verifyToken, async (req, res) => {
    try {
        const { showCurrent } = req.query;

        if (req.user && showCurrent) {
            // Show only organization that user is in
            const organizations = await Organization.findOne({
                'users.userId': req.user._id,
            });
            if (!organizations) return res.status(404).json({ error: 'User is not in any organization' });
            return res.json({ organizations });
        }
        else {
            const organizations = await Organization
                .find({ isPublic: true })
                .select('name description isPublic email phone address')
                .exec();
            return res.json({ organizations });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Server Error' });
    }
});

// GET certain organization
router.get('/:organizationId', verifyToken, async (req, res) => {
    try {
        const { organizationId } = req.params;

        const organization = await Organization
            .findById(organizationId)
            .select('name description isPublic email phone address')
            .exec();

        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        if (!organization.isPublic) {
            return res.status(403).json({ error: 'Access denied' });
        }

        return res.json({ organization });
    } catch (error) {
        return res.status(500).json({ error: 'Server Error' });
    }
});


// Create a new organization
router.post('/', verifyToken, async (req, res) => {
    let newOrganization;
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Please log in to create a sensor.' });
        }

        const { name, description, isPublic = false, phone, email, address, userId } = req.body;

        if (req.user.role === 'admin') { //If organization is created by SmartS admin account
            if (!userId) {
                return res.status(400).json({ error: 'As admin you must pass userId of account that gets organization.' });
            } else {
                newOrganization = await Organization.create({
                    name,
                    description,
                    isPublic,
                    phone,
                    email,
                    address,
                    users: [{ userId: userId, role: 'owner' }],
                })
            }
            res.status(201).json({ message: 'Organization created successfully', organization: newOrganization });
        } else {
            return res.status(400).json({ error: 'As normal user you cant create organization in this API version.' });
        }
    } catch (error) {
        res.status(400).json({ error: req.user });
    }
});

/*
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
*/

module.exports = router;