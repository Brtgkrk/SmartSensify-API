const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const sensorRoutes = require('./routes/sensors');
const userRoutes = require('./routes/users');
const sensorDataRouter = require('./routes/sensorData');
const organizations = require('./routes/organizations');
const groups = require('./routes/groups');
require('dotenv').config();

const app = express();
app.use(cors());

mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

app.use(bodyParser.json());

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/sensors/data', sensorDataRouter);
app.use('/api/organizations', organizations);
app.use('/api/groups', groups);