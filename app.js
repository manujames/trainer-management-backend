const express = require('express');
const app = express();
// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({extended:false,limit:"2mb"}));
// Parse JSON bodies (as sent by API clients)
app.use(express.json({limit:"2mb"}));

const CourseData = require('./src/model/Database').CourseData;
const CredentialData = require('./src/model/Database').CredentialData;

const cors = require('cors');
app.use(cors());

const nodemailer = require("nodemailer");
const EMAIL_ID = 'projectdev.fsd@gmail.com';
const EMAIL_PWD = 'letmein@123';

// Generate test SMTP service account from ethereal.email
// Only needed if you don't have a real mail account for testing
// let mailAccount = await nodemailer.createTestAccount();

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_ID,
      pass: EMAIL_PWD
    }
});


const PORT = process.env.PORT || 3000;

const jwt = require('jsonwebtoken')
const secretKey = 'secretKey';

function createToken(user,pwd,role){
    let payload = {
        subject: {
            user:user,
            pwd:pwd,
            role:role
        }
    };
    return jwt.sign(payload, secretKey);
}

function verifyToken(req, res, next){
    if(!req.headers.authorization){
        return res.status(401).send('Unauthorized request');
    }
    
    let token = req.headers.authorization.split(' ')[1]
    if(token === 'null'){
        return res.status(401).send('Unauthorized request');   
    }
    
    try {
        let payload = jwt.verify(token, secretKey);
        if(!payload || !payload.subject || !payload.subject.user || !payload.subject.pwd || !payload.subject.role){
            return res.status(401).send('Unauthorized request');
        }

        CredentialData.findOne({email:payload.subject.user, password:payload.subject.pwd, role:payload.subject.role})
        .then((user)=>{
            if(user){
                req.user = user;    // store user information in req object
                next();
            }
            else{
                return res.status(401).send('Unauthorized request');
            }
        })
        .catch((err)=>{
            console.log(err);
            //Handle error here
            return res.status(500).send("Database read error");
        });
    } 
    catch(error){
        console.log(error);
        return res.status(401).send('Unauthorized request');
    }
}

let resetCodesObj = {};    // Object containing password reset codes eg:{TR1:487216}
let timeOutObj = {};       // Save timeout object for each otp request

const crypto = require('crypto');

function generateOTP(id){
    // Generate a 6 digit otp
    let otp = crypto.randomInt(100000,999999);
    // store it in object
    resetCodesObj[id] = otp;
    // If a timer already running for same id, cancel it.
    if(timeOutObj[id]){
        clearTimeout(timeOutObj[id]);
        delete timeOutObj[id];
    }
    // set a timer to clear otp after 5 minutes
    timeOutObj[id] = setTimeout(()=>{
        delete resetCodesObj[id];
        delete timeOutObj[id];
        console.log("timeout run",id);
    },5*60*1000,id);
    return otp;
}

const trainerRouter = require('./src/routes/trainerRoutes')(verifyToken,transporter,EMAIL_ID);
const adminRouter = require('./src/routes/adminRoutes')(verifyToken,transporter,EMAIL_ID);

app.use('/trainer',trainerRouter);
app.use('/admin',adminRouter);

app.get('/', (req,res)=>{
    res.send("Trainer Management API");
});

app.post('/login', (req,res)=>{
    // Fetch user inputs from form
    let credentials = req.body;
    // Check login credentials
    CredentialData.findOne({email:credentials.email,password:credentials.password,role:credentials.role})
    .then((user)=>{
        if(user){
            if(user.approved){
                let token = createToken(user.email,user.password,user.role);
                res.status(200).send({token:token,role:user.role});
            }
            else{
                res.status(401).send("Your enrollment is in verification stage. Please watch your email for updates regarding approval.")
            }
        }
        else{
            res.status(401).send('Invalid Username or Password');
        }
    })
    .catch((err)=>{
        console.log(err);
        //Handle error here
        res.status(500).send()
    });
});

app.put('/changepassword', verifyToken ,(req,res)=>{
    // Fetch user inputs from form
    let credential = {
        role: req.user.role,        //role stored in req object in verifyToken middleware
        email: req.user.email,      //email stored in req object in verifyToken middleware
        currentPassword: req.body.currentPassword,
        newPassword: req.body.newPassword
    }
    CredentialData.findOne({email:credential.email, password:credential.currentPassword, role:credential.role})
    .then((user)=>{
        if(user){
            CredentialData.updateOne({email:credential.email},{password:credential.newPassword})
            .then(()=>{
                // generate new token
                let token = createToken(credential.email, credential.newPassword, credential.role);
                res.status(200).send({token:token});
            })
        }
        else{
            res.status(401).send('Invalid credentials');
        }
    });
});

app.post('/getresetcode',(req,res)=>{
    let email = req.body.email;
    CredentialData.findOne({email:email})
    .then((user)=>{
        if(user){
            let otp = generateOTP(user.ictId);

            let mailOptions = {
                from: EMAIL_ID, // sender address
                to: user.email, // list of receivers
                subject: "Password reset request", // Subject line
                text: `Your password reset code is ${otp}. This code is valid for 5 minutes only.` // plain text body
                // html: "<b>Hello world?</b>", // html body
            };
            transporter.sendMail(mailOptions);
            res.status(200).send();
        }
        else{
            res.status(404).send("Sorry, We could not find any account with this email id.");
        }
    })
    .catch((err)=>{
        console.log(err);
        //Handle error here
        res.status(500).send("Database read error")
    });
})

app.post('/reset-password',(req,res)=>{
    let email = req.body.email;
    let password = req.body.password;
    let resetCode = req.body.resetCode;
    CredentialData.findOne({email:email})
    .then((user)=>{
        if(user){
            if(resetCodesObj[user.ictId] == resetCode){     //otp matched
                CredentialData.findOneAndUpdate({"ictId":user.ictId},{"password":password})
                .then(()=>{
                    // Clear otp and timer
                    delete resetCodesObj[user.ictId];
                    if(timeOutObj[user.ictId]){
                        clearTimeout(timeOutObj[user.ictId]);
                        delete timeOutObj[user.ictId];
                    }
                    res.status(200).send();
                })
            }
            else if(resetCodesObj[user.ictId] == undefined){    //no otp found
                res.status(410).send("Reset code expired. Please generate new code.");
            }
            else{
                res.status(401).send("Wrong reset code. Please try again.");
            }
        }
        else{
            res.status(404).send("Sorry, We could not find any account with this email id.");
        }
    })
    .catch((err)=>{
        console.log(err);
        //Handle error here
        res.status(500).send("Database read error")
    });
})

app.get('/courses',(req,res)=>{
    CourseData.find({},{"_id":0,"__v":0})
    .then((courses)=>{
        res.status(200).send(courses);
    })
    .catch((err)=>{
        console.log(err);
        // Handle errors
        res.status(500).send("Database read failed.");
    });
});
 
app.listen(PORT,()=>{
    console.log(`Server started on port ${PORT}.`);
});

/*
 db.courses.insert([{"courseId":"01_DSA", "courseName":"CERTIFIED SPECIALIST IN DATA SCIENCE & ANALYTICS"},{"courseId":"02_FSD", "courseName":"CERTIFIED SPECIALIST IN FULL STACK DEVELOPMENT"},{"courseId":"03_RPA", "courseName":"ROBOTIC PROCESS AUTOMATION"},{"courseId":"04_CSA", "courseName":"CERTIFIED CYBER SECURITY ANALYST"},{"courseId":"05_XLP", "courseName":"CERTIFIED XR ASSOCIATE"},{"courseId":"06_DM", "courseName":"DIGITAL MARKETING"}])
*/