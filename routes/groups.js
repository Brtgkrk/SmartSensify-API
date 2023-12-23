const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const verifyToken = require('../middlewares/jwtAuthMiddleware');
const Organization = require('../models/Organization');
const Group = require('../models/Group');
const User = require('../models/User');
const Sensor = require('../models/Sensor');
const { v4: uuidv4 } = require('uuid');

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

// Get data from the group
/*router.get('/:groupId/data', verifyToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { startDate, endDate, type, location, format } = req.query;
        const group = await Group.findById(groupId);
        const dataKey = req.get('dataKey');

        // If the group is not public, check user authentication
        if (!group || (!dataKey && !req.user)) {
            return res.status(404).json({ error: 'Not found' });
        }

        if (!group.dataKeys.some(key => key.uid === dataKey) && (!group.isPublic && !await User.hasSensor(req.user._id, sensorId))) {
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
});*/

// POST - Add new dataKey into certain group
router.post('/:groupId/dataKeys', verifyToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { name } = req.body;
        const group = await Group.findById(groupId);

        if (!group || !req.user || !await User.findByGroup(groupId)._id === req.user._id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const dataKey = {
            name: name,
            uid: uuidv4(),
        };
        group.dataKeys.push(dataKey);
        await group.save();

        res.status(201).json({ message: 'DataKey added successfully', dataKey });

    } catch (error) {
        console.error('Error adding dataKey:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE - Delete certain dataKey
router.delete('/:groupId/dataKeys', verifyToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { id } = req.body;
        const group = await Group.findById(groupId);

        if (!group || !req.user || !await User.findByGroup(groupId)._id === req.user._id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!id || !group.dataKeys.some(dataKey => dataKey._id.toString() === id.toString())) {
            return res.status(400).json({ error: 'Invalid dataKey' });
        }

        await Group.updateOne(
            { _id: groupId },
            { $pull: { dataKeys: { _id: id } } }
        );
        await group.save();

        res.json({ message: 'DataKey deleted successfully', id });

    } catch (error) {
        console.error('Error deleting dataKey:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;