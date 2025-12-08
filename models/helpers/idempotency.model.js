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
  },
}, {
  tableName: 'idempotency',
  timestamps: false,
});

module.exports = Idempotency;