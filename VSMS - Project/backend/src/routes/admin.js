const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const ServiceRequest = require('../models/ServiceRequest');
const Notification = require('../models/Notification');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
};

router.use(isAdmin);

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-passwordHash');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Create new user (mechanic)
router.post('/users', async (req, res) => {
  try {
    const { name, email, role, password } = req.body;
    
    if (!['mechanic', 'customer'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    let existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ name, email, passwordHash, role });
    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get service statistics
router.get('/statistics', async (req, res) => {
  try {
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalMechanics = await User.countDocuments({ role: 'mechanic' });
    const totalVehicles = await Vehicle.countDocuments();
    const totalServices = await ServiceRequest.countDocuments();
    const pendingServices = await ServiceRequest.countDocuments({ status: 'pending' });
    const completedServices = await ServiceRequest.countDocuments({ status: 'completed' });

    res.json({
      success: true,
      statistics: {
        totalCustomers,
        totalMechanics,
        totalVehicles,
        totalServices,
        pendingServices,
        completedServices
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Assign mechanic to service request
router.post('/assign-mechanic', async (req, res) => {
  try {
    const { serviceId, mechanicId } = req.body;

    const service = await ServiceRequest.findById(serviceId);
    if (!service) {
      return res.status(404).json({ success: false, error: 'Service request not found' });
    }

    const mechanic = await User.findOne({ _id: mechanicId, role: 'mechanic' });
    if (!mechanic) {
      return res.status(404).json({ success: false, error: 'Mechanic not found' });
    }

    service.mechanic = mechanicId;
    service.status = 'assigned';
    await service.save();

    // Create notifications
    await Notification.create({
      recipient: mechanicId,
      title: 'New Service Assignment',
      message: `You have been assigned to service request #${service._id}`,
      type: 'service-update',
      relatedTo: { model: 'ServiceRequest', id: service._id }
    });

    await Notification.create({
      recipient: service.customer,
      title: 'Service Request Update',
      message: 'A mechanic has been assigned to your service request',
      type: 'service-update',
      relatedTo: { model: 'ServiceRequest', id: service._id }
    });

    res.json({ success: true, service });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;