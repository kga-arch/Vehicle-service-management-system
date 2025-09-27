require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vsms';

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing users
    await User.deleteMany({});

    // Create admin user
    const adminHash = await bcrypt.hash('admin123', 10);
    await User.create({
      name: 'Admin User',
      email: 'admin@vsms.com',
      passwordHash: adminHash,
      role: 'admin'
    });

    // Create mechanic user
    const mechanicHash = await bcrypt.hash('mechanic123', 10);
    await User.create({
      name: 'Test Mechanic',
      email: 'mechanic@vsms.com',
      passwordHash: mechanicHash,
      role: 'mechanic'
    });

    // Create customer user
    const customerHash = await bcrypt.hash('customer123', 10);
    await User.create({
      name: 'Test Customer',
      email: 'customer@vsms.com',
      passwordHash: customerHash,
      role: 'customer'
    });

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();