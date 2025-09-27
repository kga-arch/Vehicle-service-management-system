const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const ServiceRequest = require('../models/ServiceRequest');
const Notification = require('../models/Notification');
const User = require('../models/User');

// Middleware to check if user is customer
const isCustomer = (req, res, next) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ success: false, error: 'Customer access required' });
  }
  next();
};

router.use(isCustomer);

// Get customer's vehicles
router.get('/vehicles', async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user._id });
    res.json({ success: true, vehicles });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch vehicles' });
  }
});

// Add new vehicle
router.post('/vehicles', async (req, res) => {
  try {
    const { make, model, year, licensePlate, vin } = req.body;
    
    const existingVehicle = await Vehicle.findOne({
      $or: [{ licensePlate }, { vin }]
    });

    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        error: 'Vehicle with this license plate or VIN already exists'
      });
    }

    const vehicle = new Vehicle({
      owner: req.user._id,
      make,
      model,
      year,
      licensePlate,
      vin
    });

    await vehicle.save();
    res.json({ success: true, vehicle });
  } catch (error) {
    console.error('Error adding vehicle:', error);
    res.status(500).json({ success: false, error: 'Failed to add vehicle' });
  }
});

// Get customer's service requests
router.get('/service-requests', async (req, res) => {
  try {
    const services = await ServiceRequest.find({ customer: req.user._id })
      .populate('vehicle')
      .populate('mechanic', '-passwordHash')
      .sort({ createdAt: -1 });
    res.json({ success: true, services });
  } catch (error) {
    console.error('Error fetching service requests:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch service requests' });
  }
});

// Create new service request
router.post('/service-requests', async (req, res) => {
    console.log('Creating service request - Full details:', {
      body: req.body,
      user: { id: req.user._id, role: req.user.role },
      headers: req.headers,
      method: req.method,
      path: req.path
    });
    
    try {
      // Parse and validate request body
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Invalid request body format'
        });
      }

      const { vehicleId, serviceType, description, scheduledDate } = req.body;    // Validate required fields
    if (!vehicleId || !serviceType || !description || !scheduledDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields. Please provide vehicleId, serviceType, description, and scheduledDate'
      });
    }

    // Validate and normalize date
    const parsedDate = new Date(scheduledDate);
    parsedDate.setHours(0, 0, 0, 0);

    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid scheduled date format'
      });
    }

    // Check for past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedDate < today) {
      return res.status(400).json({
        success: false,
        error: 'Cannot schedule service requests for past dates'
      });
    }

    console.log('Step 1: Finding and verifying vehicle ownership', {
      vehicleId,
      userId: req.user._id
    });

    // Find vehicle and verify ownership
    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      owner: req.user._id
    });

    console.log('Vehicle lookup result:', vehicle ? 'Found' : 'Not found');

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found or you do not have permission to create service requests for this vehicle'
      });
    }

    console.log('Step 2: Creating service request object');
    
    // Create service request
    const service = new ServiceRequest({
      vehicle: vehicleId,
      customer: req.user._id,
      serviceType,
      description: description.trim(),
      scheduledDate: parsedDate
    });

    console.log('Attempting to save service request:', {
      serviceData: service.toObject(),
      userId: req.user._id,
      vehicleId
    });

    try {
      console.log('Step 3: Validating service request');
      const validationError = service.validateSync();
      if (validationError) {
        console.error('Validation failed:', validationError);
        throw validationError;
      }

      console.log('Step 4: Saving service request');
      await service.save();
      console.log('Service request saved successfully:', service._id);
    } catch (saveError) {
      console.error('Error saving service request:', {
        error: saveError.message,
        stack: saveError.stack,
        validationErrors: saveError.errors
      });
      throw saveError;
    }

    // Notify admins
    try {
      // First find admins
      const admins = await User.find({ role: 'admin' });
      console.log(`Found ${admins.length} admins to notify`);
      
      // Create notifications with validation
      const notificationPromises = admins.map(admin => {
        if (!admin._id) {
          console.error('Invalid admin data:', admin);
          return null;
        }

        const notificationData = {
          recipient: admin._id,
          title: 'New Service Request',
          message: `New ${serviceType} service request from ${req.user.name} for ${vehicle.make} ${vehicle.model}`,
          type: 'service-update',
          relatedTo: { model: 'ServiceRequest', id: service._id }
        };

        console.log('Creating notification:', notificationData);
        return Notification.create(notificationData);
      }).filter(Boolean); // Remove any null promises

      await Promise.all(notificationPromises);
      console.log(`Successfully sent notifications to ${notificationPromises.length} admins`);
    } catch (notifyError) {
      console.error('Failed to send admin notifications:', notifyError);
      // Don't fail the request if notifications fail
    }

    console.log('Step 5: Populating service request details');
    // Populate and return the created service request
    const populatedService = await ServiceRequest.findById(service._id)
      .populate('vehicle')
      .populate('customer', '-passwordHash');

    console.log('Successfully populated service request');

    res.status(201).json({
      success: true,
      service: populatedService
    });

  } catch (error) {
    console.error('Service request creation error - Full details:', {
      error: {
        message: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack
      },
      request: {
        body: req.body,
        userId: req.user?._id,
        method: req.method,
        path: req.path
      },
      errorTime: new Date().toISOString()
    });

    // Log error to help with debugging
    if (error.errors) {
      console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
    }

    // Handle specific error cases
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data provided',
        details: Object.values(error.errors).map(err => err.message)
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        details: error.message
      });
    }

    // Default error response
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'development' 
        ? `Error: ${error.message}` 
        : 'Failed to create service request. Please try again.',
      errorCode: error.code || 'UNKNOWN_ERROR'
    });
  }
});

// Cancel service request
router.post('/service-requests/:id/cancel', async (req, res) => {
  try {
    const service = await ServiceRequest.findOne({
      _id: req.params.id,
      customer: req.user._id,
      status: 'pending'
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service request not found or cannot be cancelled'
      });
    }

    service.status = 'cancelled';
    await service.save();

    // Notify assigned mechanic if any
    if (service.mechanic) {
      await Notification.create({
        recipient: service.mechanic,
        title: 'Service Request Cancelled',
        message: 'A service request has been cancelled by the customer',
        type: 'service-update',
        relatedTo: { model: 'ServiceRequest', id: service._id }
      });
    }

    res.json({ success: true, service });
  } catch (error) {
    console.error('Error cancelling service request:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel service request' });
  }
});

module.exports = router;