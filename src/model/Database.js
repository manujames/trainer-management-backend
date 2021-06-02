const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/TrainersData', {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});
const Schema = mongoose.Schema;

const TrainerSchema = new Schema({
    ictId: String,
    fname: String,
    sname: String,
    email: String,
    phone: String,
    gender:String,
    address: String,
    qualification: String,
    skills: Array,
    course: Array,
    type:String,
    currentCompany: String,
    currentDesignation: String,
    website:String,
    github:String,
    approved: Boolean,  //true or false
    img:{
        data: String,
        contentType: String
    }
});
const TrainerData = mongoose.model('trainer', TrainerSchema);

const CredentialSchema = new Schema({
    ictId: String,
    email: String,
    password: String,
    role: String,       //trainer or admin
    approved: Boolean   //true or false
});
const CredentialData = mongoose.model('credential', CredentialSchema);

const CourseSchema = new Schema({
    courseId: String,
    courseName: String
});
const CourseData = mongoose.model('course', CourseSchema);


module.exports.TrainerData = TrainerData;
module.exports.CredentialData = CredentialData;
module.exports.CourseData = CourseData;