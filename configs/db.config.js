// config.js
require('dotenv').config({ path: '.env' });
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    logging: false, // Set to true if you want to see SQL logs
});


module.exports = { sequelize, DataTypes };