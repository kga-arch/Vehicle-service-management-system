const express = require('express');
const router = express.Router();
const ServiceRequest = require('../models/ServiceRequest');
const Notification = require('../models/Notification');

// Middleware to check if user is mechanic
const isMechanic = (req, res, next) => {
  if (req.user.role !== 'mechanic') {
    return res.status(403).json({ success: false, error: 'Mechanic access required' });
  }
  next();
};

router.use(isMechanic);

// Get assigned service requests
router.get('/service-requests', async (req, res) => {
  try {
    const services = await ServiceRequest.find({
      $or: [
        { mechanic: req.user._id },
        { status: 'pending' }
      ]
    })
      .populate('vehicle')
      .populate('customer', '-passwordHash')
      .sort({ createdAt: -1 });
    res.json({ success: true, services });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Update service request status
router.put('/service-requests/:id', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const service = await ServiceRequest.findOne({
      _id: req.params.id,
      mechanic: req.user._id
    });

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service request not found' });
    }

    if (status) {
      service.status = status;
      if (status === 'completed') {
        service.completedDate = new Date();
      }
    }

    if (notes) {
      service.notes.push({
        content: notes,
        addedBy: req.user._id
      });
    }

    await service.save();

    // Create notification for customer
    await Notification.create({
      recipient: service.customer,
      title: 'Service Request Update',
      message: `Your service request status has been updated to ${status}`,
      type: 'service-update',
      relatedTo: { model: 'ServiceRequest', id: service._id }
    });

    res.json({ success: true, service });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get mechanic's statistics
router.get('/statistics', async (req, res) => {
  try {
    const totalAssigned = await ServiceRequest.countDocuments({
      mechanic: req.user._id
    });
    const completed = await ServiceRequest.countDocuments({
      mechanic: req.user._id,
      status: 'completed'
    });
    const inProgress = await ServiceRequest.countDocuments({
      mechanic: req.user._id,
      status: 'in-progress'
    });

    res.json({
      success: true,
      statistics: {
        totalAssigned,
        completed,
        inProgress,
        completion_rate: totalAssigned ? (completed / totalAssigned * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Assign service request to self
router.put('/service-requests/:id/assign', async (req, res) => {
  try {
    const service = await ServiceRequest.findOne({
      _id: req.params.id,
      status: 'pending'
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service request not found or already assigned'
      });
    }

    service.mechanic = req.user._id;
    service.status = 'assigned';
    await service.save();

    // Notify the customer
    await Notification.create({
      recipient: service.customer,
      title: 'Service Request Assigned',
      message: `A mechanic has been assigned to your service request for ${service.serviceType}`,
      type: 'service-update',
      relatedTo: { model: 'ServiceRequest', id: service._id }
    });

    res.json({ success: true, service });
  } catch (error) {
    console.error('Error assigning service request:', error);
    res.status(500).json({ success: false, error: 'Failed to assign service request' });
  }
});

module.exports = router;