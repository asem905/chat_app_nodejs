// utils/idempotency_cleanup.js
const cron = require('node-cron');
const { Op } = require('sequelize');
const Idempotency = require('../models/helpers/idempotency.model');

const startIdempotencyCleanup = () => {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    try {
      // Delete tokens older than 24 hours
      const deleted = await Idempotency.destroy({
        where: {
          created_at: {
            [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });
      
      if (deleted > 0) {
        console.log(`🧹 Cleaned up ${deleted} idempotency tokens`);
      }
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }
  });
  
  console.log('🕐 Idempotency cleanup started (runs every hour)');
};

module.exports = startIdempotencyCleanup;