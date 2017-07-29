var express = require('express');
var app = express();
var bodyparser = require('body-parser');
var mongodb = require('mongodb').MongoClient
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var multer = require('multer');
var path = require('path');
var jwt = require('jsonwebtoken');
var config = require('./config/database');
var fs = require('fs');
var nodemailer = require('nodemailer');
var md5 = require('md5');
require('mongoose-query-random');
// var server = 'http://localhost:8081';


app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended: false}));
app.use('/profile',express.static(path.join(__dirname, 'public/images')));

var apiRoutes = express.Router(); 

mongoose.connect(config.database, {useMongoClient: true}); // connect to our database
app.set('superSecret', config.secret);

var User = require('./models/users');

var user = new User();
var user_data;
app.use('/users', apiRoutes);
// app.use('/upload', apiRoutes);


// Send email for verify
let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // secure:true for port 465, secure:false for port 587
    auth: {
        user: '',
        pass: ''
    }
});

// setup email data with unicode symbols
app.get('/', function(req, res){
    res.end("Hello Wolrd");
})

    
app.get('/users', function (req, res) {
    User.find({}, function(err, data){
        if(err)
            console.log('error')

        else
            res.json(data)
    });
});


app.post('/login', function(req, res){
    var email = req.body.email;
    var password = req.body.password;

    User.find({email: email, password: password}, function(err,data){
        if(err)
            res.json(err)
        else
            if(data[0]){
                var token = jwt.sign(user, app.get('superSecret'), {
                    expiresIn: 60*60*1440 // expires in 24 hours
                });
                
                user_data = data;
                // res.json(data[0])
                res.json({
                    success: true,
                    message: 'Enjoy your token!',
                    token: token,
                    data: data[0]
                });
            }
            else
                res.json({'message': 'username or password invald'});
    });
});

apiRoutes.use(function(req, res, next) {

  // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token'];

  // decode token
  if(token) {

    // verifies secret and checks exp
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {      
      if (err) {
        return res.json({ success: false, message: 'Failed to authenticate token.' });    
      } else {
        // if everything is good, save to request for use in other routes
        req.decoded = decoded;
        
        next();
      }
    });

  } else {

    // if there is no token
    // return an error
    return res.status(403).send({ 
        success: false, 
        message: 'No token provided.' 
    });

  }
});


app.post('/register', function(req, res){
    if(req.body.name != '' && req.body.email != '' && req.body.password != ''){
        user.name = req.body.name;
        user.email = req.body.email;
        user.password = req.body.password;

        User.find({email: req.body.email}, function(err,data){
            if(err)
                res.json(err)
            else
                if(data[0])
                    res.json({'message': 'email id exists'});

                else{
                    user.save(function(err){
                        if(err)
                            res.json({'message': 'error found'});
                        else{

                            var link = 'http://localhost:8081' + '/confirm?token=' + md5(req.body.email+req.body.name) + '&id=' + req.body.email;
                            var msg = 'Hi ' + req.body.name + ',<br/><br/>Click the below link to activate your Hot or Not Account. <br> <a href='+ link + '>' +link + '</a>';
                            let mailOptions = {
                                from: '"Hot Or Not App" <justdoit.hacker49@gmail.com>', // sender address
                                to: req.body.email, // list of receivers
                                subject: 'Verify your account', // Subject line
                                // text: 'Hello world ?', // plain text body

                                html: msg
                            };
                            transporter.sendMail(mailOptions, (error, info) => {
                            if (error) {
                                return console.log(error);
                            }
                            console.log('Message %s sent: %s', info.messageId, info.response);
                            res.json({message: 'register success', mailSent: true});
                            
                        });
                            

                        }
                
                    })
                }
                    // res.json({'message': 'username or password invald'});

        });

    }
    
    else
        res.json({'message': 'params empty'});
        
    
})
app.get('/confirm', function(req, res){
    var cnf_token = req.query.token;
    var email = req.query.id;
    if(cnf_token === ''){
        return res.end('Error Somethinh');
    }

    else{
            User.find({email: email}, function(err, data){
                if(err) console.log('error!')
                else{
                    if(data){
                        var m = md5(data[0].email+data[0].name);
                        // console.log(cnf_token);
                        // console.log(m);
                        if(cnf_token ===  m){
                            User.update({email: email}, { verified: true}, function(err, docs){
                                if(err) console.log('error!!')
                                else{
                                    res.json({success: true})
                                    // res.redirect('/')
                                }
                            })
                        }
                    }
                    else res.end('error!');
                }
            })
        }
    
})


// Image Upload
var name;
var Storage = multer.diskStorage({
    destination: function(req, file, callback) {
        callback(null, "./public/images");
    },

    filename: function(req, file, callback) {
        name = Date.now() + "xoxo" + path.extname(file.originalname);
        callback(null, name);
    },

});

app.post('/upload', function(req, res) {
	var upload = multer({
		storage: Storage,
		fileFilter: function(req, file, callback) {
			var ext = path.extname(file.originalname)
			if (ext !== '.png' && ext !== '.jpg' && ext !== '.gif' && ext !== '.jpeg') {
				return callback(res.end('Only images are allowed'), null)
			}
			callback(null, true)
		}
    }).single('imgUploader');
    
	upload(req, res, function(err) {
        User.find({_id: req.body.id}, function(err, data){
            if(err)
                console.log('error')
            else
                user_data = data;
        });
        User.update({_id: req.body.id}, { profile: name}, function(err, docs){
        if(err) 
            res.json(err);
        else
            // delete old profile pic
            if(user_data[0].profile !== 'unknown.jpg'){
                fs.unlinkSync("public/images/" + user_data[0].profile);    
            }


            // console.log(user_data)
            res.json({ success: true,
                        id: req.body.id,
                        image: name,
                        data: user_data
                    });
    })
});
});


// display 2 images
app.post('/play', function(req, res){
    user_id = req.body.id;
    filter = { _id: {$ne: user_id } }
    console.log(user_id)
    update_query = {$inc: {appear: 1}}
    User.find(filter).random(2, true, function(err, data) {
        if (err) 
            throw err;
        else
            // res.json(data[0].profile);
            // console.log(data)
            User.update({$or: [{_id: data[0]._id}, {_id: data[1]._id}] },update_query, {multi: true} ,function(err, data2){
                if(err)
                    console.log("error");

                else{
                    // console.log('data2 :' + data2 + '')
                    image1 = data[0].profile;
                    image2 = data[1].profile;
                    // console.log(data[0]._id)
                    // console.log(data[1]._id)
                    res.json({image1, image2});
                }
            })

    });

})

// vote the hot
// now simple vote post can hackable URGENT solve this
app.post('/vote', function(req, res){
    pic = req.body.pic;
    // x = "1501230500629xoxo.jpg"
    // console.log(parseInt(pic.slice(0,13))+8);
    if(pic === 'unknown.jpg')
        res.json({message: 'please update profile pic'});

    else{
        User.findOneAndUpdate({profile: pic}, {$inc: {hot: 1}}, function(err, data){
            if(err)
                console.log('error')
            else{
                res.json({message : 'success'});
            }
        })
    }
})

var server = app.listen(8081, function () {
    var host = server.address().address
    var port = server.address().port
    console.log("Example app listening at http://%s:%s", host, port)
})