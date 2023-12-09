const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const verifyToken = require('../middlewares/jwtAuthMiddleware');
const Organization = require('../models/Organization');
const Group = require('../models/Group');
const User = require('../models/User');
const Sensor = require('../models/Sensor');

const router = express.Router();

// Get information about a specific group
router.get('/:groupId', verifyToken, async (req, res) => {
    try {
        const groupId = req.params.groupId;

        const group = await Group.findById(groupId)
            //.populate('users') // Populate the 'users' field with user details
            //.populate('sensors'); // Populate the 'sensors' field with sensor details

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Check if the user is authorized to view this group
        if (
            req.user.role === 'admin' ||
            group.users.map(user => user._id.toString()).includes(req.user._id.toString())
        ) {
            return res.json({ group });
        } else {
            return res.status(403).json({ error: 'Access denied' });
        }

    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});


// Get all groups of a certain user
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id;

        // Check if the user making the request is the same as the requested user or has admin rights
        if (req.user.role !== 'admin' && !req.user._id.equals(userId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const groups = await Group.find({ _id: { $in: user.groups } });

        return res.json({ groups });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all users of a certain group
router.get('/:groupId/users', verifyToken, async (req, res) => {
    try {
        const groupId = req.params.groupId;

        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Check if the user making the request is part of the group or has admin rights
        if (req.user.role !== 'admin' && !group.users.includes(req.user._id)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const userIds = group.users;

        const users = await User.find({ _id: { $in: userIds } })
            .select('_id username email isActive');

        return res.json({ users });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Get groups of an organization
router.get('/:organizationId/groups', verifyToken, async (req, res) => {
    try {
        const organizationId = req.params.organizationId;
        const organization = await Organization.findById(organizationId);

        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Check if the user is authorized to view groups
        if (req.user.role === 'admin' || organization.users.some(user => user.userId.equals(req.user._id) && user.role === 'owner')) {
            const groups = await Group.find({ _id: { $in: organization.groups } });
            return res.json({ groups });
        } else {
            return res.status(403).json({ error: 'Access denied' });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});


// Get all sensors within a group
router.get('/:groupId/sensors', verifyToken, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Check if the user is authorized to view sensors in this group
        if (
            req.user.role === 'admin' ||
            group.users.map(userId => userId.toString()).includes(req.user._id.toString())
        ) {
            //const sensors = await Sensor.find({ _id: { $in: group.sensors } });

            const sensorIds = group.sensors;
            
            const sensors = await Sensor.find({ _id: { $in: sensorIds } });

            return res.json({ sensors });
        } else {
            return res.status(403).json({ error: 'Access denied' });
        }

    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new group for a user
router.post('/', verifyToken, async (req, res) => {

    try {
        const { name, description } = req.body;
        const userId = req.user._id;

        // Check if the user is in any organization
        if (await User.returnOrganization(userId) === null) {
            // Check if user in organization has owner property

            // User is not in any organization, create a new group for the user
            const group = await Group.create({ name, description, users: [req.user._id] });

            // Update user with the new group
            req.user.groups.push(group._id);
            await req.user.save();

            return res.json({ group });
        } else {
            // User is in an organization, check if the user has the owner role
            const organizationId = req.user.organizations[0].organizationId; // Assuming a user is in only one organization for simplicity

            const organization = await Organization.findById(organizationId);

            if (!organization) {
                return res.status(404).json({ error: 'Organization not found' });
            }

            const userInOrganization = organization.users.find(user => user.userId.equals(req.user._id) && user.role === 'owner');

            if (!userInOrganization) {
                return res.status(403).json({ error: 'Access denied. User does not have the owner role in the organization.' });
            }

            // User has the owner role, create a group with that user
            const group = await Group.create({ name, description, users: [req.user._id] });

            // Update user with the new group
            req.user.groups.push({ groupId: group._id, role: 'owner' });
            await req.user.save();

            return res.json({ group });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Update a group's information
router.patch('/:groupId', verifyToken, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const { name, description } = req.body;

        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Check if the user is authorized to update the group
        
        if (req.user.role === 'admin' || group.users.map(user => user._id.toString()).includes(req.user._id.toString())) {
            const group = await Group.findByIdAndUpdate(groupId, { name, description }, { new: true });

            if (!group) {
                return res.status(404).json({ error: 'Group not found' });
            }

            return res.json({ group });
        } else {
            return res.status(403).json({ error: 'Access denied' });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a group
router.delete('/:groupId', verifyToken, async (req, res) => {
    try {
        const groupId = req.params.groupId;

        const group = await Group.findById(groupId);
        const user = await User.findById(req.user._id);

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Check if the user is authorized to delete the group
        if (user.role === 'admin' || group.users.map(user => user._id.toString()).includes(req.user._id.toString())) {
            const group = await Group.findByIdAndDelete(groupId);

            if (!group) {
                return res.status(404).json({ error: 'Group not found' });
            }

            // Remove the group from the user
            user.groups = user.groups.filter(g => !g.equals(groupId));
            await user.save();

            // Remove the group from users
            //await User.updateMany({ 'groups.groupId': groupId }, { $pull: { groups: { groupId } } });

            return res.json({ message: 'Group deleted successfully' });
        } else {
            return res.status(403).json({ error: 'Access denied' });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;