const Idempotency = require('../models/helpers/idempotency.model');
const { Op } = require('sequelize');
const idempotencyMiddleware = async (req, res, next) => {
  const token = req.headers['idempotency-token'];

  if (!token) {
    return next();
  }

  try {
    // i want to compare with message of just second before
    const exists = await Idempotency.findOne({ where: { token: token, created_at: { [Op.gte]: new Date(Date.now() - 1000) } } });

    if (exists) {
      console.log(`Duplicate request blocked: ${token}`);
      return res.status(409).json({
        status: 'fail',
        message: 'Duplicate request. Message already sent.',
      });
    }

    await Idempotency.create({ token });
    console.log(`New idempotency token: ${token}`);

    next();

  } catch (error) {
    console.error('Idempotency error:', error);
    next();
  }
};

module.exports = idempotencyMiddleware;