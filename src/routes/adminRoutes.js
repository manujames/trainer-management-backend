const express = require('express');
const adminRouter = express.Router();
const TrainerData = require('../model/Database').TrainerData;
const CredentialData = require('../model/Database').CredentialData;
const CourseData = require('../model/Database').CourseData;

//Create default admin credentials if not already exist 
createDefaultAdminCredentials();

router = (verifyToken,mailTrasporter,EMAIL_ID)=>{
    adminRouter.get('/trainers',verifyToken,(req,res)=>{
        if(req.user.role == 'admin'){    
            TrainerData.find({"approved":true},{"_id":0,"ictId":1,"fname":1,"sname":1,"type":1,"qualification":1,"skills":1,"course":1})
            .then((trainers)=>{
                res.status(200).send(trainers);
            })
            .catch((err)=>{
                console.log(err);
                //Handle error here
                res.status(500).send("Database read error");
            });
        }
        else{
            return res.status(403).send('Forbidden');
        }
    })

    adminRouter.get('/enroll-requests',verifyToken,(req,res)=>{
        if(req.user.role == 'admin'){    
            TrainerData.find({"approved":false},{"_id":0,"ictId":1,"fname":1,"sname":1,"qualification":1,"skills":1,"course":1})
            .then((trainers)=>{
                res.status(200).send(trainers);
            })
            .catch((err)=>{
                console.log(err);
                //Handle error here
                res.status(500).send("Database read error");
            });
        }
        else{
            return res.status(403).send('Forbidden');
        }
    })

    adminRouter.get('/statistics',verifyToken,(req,res)=>{
        if(req.user.role == 'admin'){
            let response = {};
            TrainerData.countDocuments({"approved":true})
            .then((trainersCount)=>{
                response.trainers = trainersCount;
                TrainerData.countDocuments({"approved":false})
                .then((requestsCount)=>{
                    response.requests = requestsCount;
                    CourseData.countDocuments()
                    .then((courseCount)=>{
                        response.courses = courseCount;
                        res.status(200).send(response);
                    })
                })
            })
            .catch((err)=>{
                console.log(err);
                //Handle error here
                res.status(500).send("Database read error");
            });
        }
        else{
            return res.status(403).send('Forbidden');
        }
    })

    adminRouter.get('/trainer/:id',verifyToken,(req,res)=>{
        if(req.user.role == 'admin'){
            let trainerId = req.params.id;    
            TrainerData.findOne({"ictId":trainerId}, {"_id":0, "__v":0})     //Find by ictId. Exclude _id, __v fields
            .then((trainer)=>{
                if(trainer){
                    res.status(200).send(trainer);
                }
                else{
                    res.status(404).send("Trainer not found.");
                }
            })
            .catch((err)=>{
                console.log(err);
                // Handle errors
                res.status(500).send("Database read failed.");
            });
        }
        else{
            return res.status(403).send('Forbidden');
        }
    })

    adminRouter.put('/approve-enroll',verifyToken,(req,res)=>{
        if(req.user.role == 'admin'){
            let trainerId = req.body.id;
            let trainerType = req.body.type;
            TrainerData.findOneAndUpdate({"ictId":trainerId}, {"approved":true,"type":trainerType})
            .then(()=>{
                CredentialData.findOneAndUpdate({"ictId":trainerId}, {"approved":true})
                .then((trainer)=>{
                    let mailOptions = {
                        from: EMAIL_ID, // sender address
                        to: trainer.email, // list of receivers
                        subject: "Trainer Enrollment Approved", // Subject line
                        text: "Congrats, Your request for joining ICTAK as a trainer is approved. Now you can login using your username and password." // plain text body
                        // html: "<b>Hello world?</b>", // html body
                    };
                    mailTrasporter.sendMail(mailOptions);
                    return res.status(200).send();
                })
                .catch((error)=>{
                    console.log(error);
                    return res.status(500).send('Database access error');
                })
            })
            .catch((error)=>{
                console.log(error);
                return res.status(500).send('Database access error');
            })
        }
        else{
            return res.status(403).send('Forbidden');
        }
    })

    adminRouter.delete('/reject-enroll/:id',verifyToken,(req,res)=>{
        if(req.user.role == 'admin'){
            let trainerId = req.params.id;
            TrainerData.findOneAndDelete({"ictId":trainerId})
            .then(()=>{
                CredentialData.findOneAndDelete({"ictId":trainerId})
                .then((trainer)=>{
                    let mailOptions = {
                        from: EMAIL_ID, // sender address
                        to: trainer.email, // list of receivers
                        subject: "Trainer Enrollment Rejected", // Subject line
                        text: "Sorry, Your request for joining ICTAK as a trainer is rejected." // plain text body
                        // html: "<b>Hello world?</b>", // html body
                    };
                    mailTrasporter.sendMail(mailOptions);
                    return res.status(200).send();
                })
                .catch((error)=>{
                    console.log(error);
                    return res.status(500).send('Database access error');
                })
            })
            .catch((error)=>{
                console.log(error);
                return res.status(500).send('Database access error');
            })
        }
        else{
            return res.status(403).send('Forbidden');
        }
    })

    adminRouter.delete('/delete-trainer/:id',verifyToken,(req,res)=>{
        if(req.user.role == 'admin'){
            let trainerId = req.params.id;
            TrainerData.findOneAndDelete({"ictId":trainerId})
            .then(()=>{
                CredentialData.findOneAndDelete({"ictId":trainerId})
                .then((trainer)=>{
                    return res.status(200).send();
                })
                .catch((error)=>{
                    console.log(error);
                    return res.status(500).send('Database access error');
                })
            })
            .catch((error)=>{
                console.log(error);
                return res.status(500).send('Database access error');
            })
        }
        else{
            return res.status(403).send('Forbidden');
        }
    })

    adminRouter.post('/add-course',verifyToken,(req,res)=>{
        if(req.user.role == 'admin'){
            let newCourse = {};
            newCourse.courseId = req.body.id;
            newCourse.courseName = req.body.name;
            CourseData.findOne({"courseId":newCourse.courseId})
            .then(
                (course)=>{
                    if(course){     //Course code already exists
                        return res.status(409).send("Course code already exists, Please use a new course code for new course.");
                    }
                    else{           //Add new course
                        CourseData(newCourse).save();
                        return res.status(200).send();               
                    }
                }
            )
        }
        else{
            return res.status(403).send('Forbidden');
        }
    })

    adminRouter.post('/add-batch',verifyToken,(req,res)=>{
        if(req.user.role == 'admin'){
            let courseCode = req.body.course;
            let newBatch = {};
            newBatch.batchName = req.body.name;
            CourseData.findOne({"courseId":courseCode})
            .then(
                (course)=>{
                    if(course){
                        let batches = course.batches;
                        if(!batches){                //Create batches array if not exists and assign first id
                            batches = [];
                            newBatch.id = `${courseCode}1`
                        }
                        else if(batches.length == 0){     //Assign first id if no batches exists in array
                            newBatch.id = `${courseCode}1`
                        }
                        else{
                            // Find id of last object in batch array
                            // Locate position of number in that id (eg: FSD15 - position of '15' in this id string)
                            // Substring number from id string, convert to integer and increse by 1
                            // Create new batch id
                            let latestBatchId = batches[batches.length-1].id;
                            let numberPosition = courseCode.length;
                            let newIdNumber = parseInt(latestBatchId.substring(numberPosition)) + 1;
                            newBatch.id = `${courseCode}${newIdNumber}`
                        }
                        batches.push(newBatch);
                        CourseData.findOneAndUpdate({"courseId":courseCode},{"batches":batches})
                        .then((course)=>{
                            res.status(200).send();
                        })
                    }
                    else{
                        return res.status(404).send('Course not found');
                    }
                }
            )
        }
        else{
            return res.status(403).send('Forbidden');
        }
    })
    
    return adminRouter;
}

// Call this function to create default admin credentials if not already exist
function createDefaultAdminCredentials(){
    CredentialData.find({"role":"admin"})
    .then((admins)=>{
        if(admins.length == 0){
            CredentialData({"ictId":"AD1","email":"admin@ictak.com","password":"Admin@ictak123","role":"admin", "approved":true}).save()
        }
    });
}

module.exports = router;