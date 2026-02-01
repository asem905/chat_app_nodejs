// models/idempotency.model.js
const { sequelize, DataTypes } = require('../../configs/db.config');
const Idempotency = sequelize.define('Idempotency', {
  token: {
    type: DataTypes.STRING(255),
    primaryKey: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    expiresAfter: 60 * 1000, // 1 minute in milliseconds
  },
}, {
  tableName: 'idempotency',
  timestamps: false,
  indexes: [
    {
      name: 'idx_token_created_at',
      unique: true,
      fields: ['token', 'created_at'],
    },
  ],
});

Idempotency.sync({ alter: true });

module.exports = Idempotency;