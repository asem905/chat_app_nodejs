// app.js
const express = require('express');
const cors = require('cors');
const { httpStatusCodes, httpStatusText } = require('./utils/http_status');
const app =new express();
const usersRoutes=require('./routes/auth/users.routes');
const roomsRoutes=require('./routes/chat/rooms.routes');
// Middleware example
app.use(express.json());
app.use(cors());
// RouteS
const path=require("path");
app.use('/api/v1/uploads',express.static(path.join(__dirname,'./uploads')));
app.use('/api/v1/users',usersRoutes);
app.use('/api/v1/rooms',roomsRoutes);
// Additional middleware and route setups can be added here

app.use((err,req,res,next)=>{
    res.status(err.statusCode || httpStatusCodes.SERVER_ERROR).json({status:httpStatusText.ERROR,message:err.message ||'Internal Server Error'});
});
app.all(/.*/,(req,res)=>{
    res.status(httpStatusCodes.NOT_FOUND).json({status:httpStatusText.ERROR,message:'Route not found'});
});
// Export the singleton instance
module.exports = app;