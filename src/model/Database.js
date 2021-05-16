const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/TrainersData', {useNewUrlParser: true, useUnifiedTopology: true});
const Schema = mongoose.Schema;

const TrainerSchema = new Schema({
    name: String,
    email: String,
    password: String,
    phone: String,
    address: String,
    qualification: String,
    skills: String,
    course: String,
    currentCompany: String,
    currentDesignation: String,
    img:{
        data: Buffer,
        contentType: String
    }
});
const TrainerData = mongoose.model('trainer', TrainerSchema);


module.exports.TrainerData = TrainerData;