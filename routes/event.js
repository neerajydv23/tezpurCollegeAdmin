const mongoose = require('mongoose');
require('dotenv').config({path:"./.env"})

const eventSchema = new mongoose.Schema({
    eventName:{
        type:String,
        trim:true,
        required:[true,"eventName is required"],
        minLength:[3,"eventName must be at least 3 characters long"],
    },
    eventImage:{
        type:String,
        trim:true,
    },
    eventDescription:{
        type:String,
        trim:true,
        required:[true,"eventDescription is required"],
        minLength:[3,"eventDescription must be at least 3 characters long"],
    }
},{timestamps:true})

module.exports = mongoose.model('Event',eventSchema);