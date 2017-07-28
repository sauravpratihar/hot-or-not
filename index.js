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


app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended: false}));
// app.use("/public/images", express.static(path.join(__dirname, 'images')));
// app.use(express.static(__dirname + '/public'));
// app.use('/static', express.static(__dirname + '/public'));
app.use('/profile',express.static(path.join(__dirname, 'public/images')));
// app.use(express.static(__dirname + '/public'));

var apiRoutes = express.Router(); 

mongoose.connect(config.database, {useMongoClient: true}); // connect to our database
app.set('superSecret', config.secret);

var User = require('./models/users');

var user = new User();
var user_data;
app.use('/users', apiRoutes);
// app.use('/upload', apiRoutes);

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
                        else
                            res.json({'message': 'register success'});
                
                    })
                }
                    // res.json({'message': 'username or password invald'});

        });

    }
    
    else
        res.json({'message': 'params empty'});
        
    
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
                        'data': user_data
                    });
    })
});
});



var server = app.listen(8081, function () {

var host = server.address().address
var port = server.address().port

console.log("Example app listening at http://%s:%s", host, port)

})