var express = require('express');
var app = express();
var bodyparser = require('body-parser');
var mongodb = require('mongodb').MongoClient
var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;


app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended: false}));

mongoose.connect('mongodb://localhost:27017/hotornot', {useMongoClient: true}); // connect to our database

var User = require('./models/users');

var user = new User();


app.get('/users', function (req, res) {
    User.find({}, function(err, data){
        if(err)
            console.log('error')

        else
            res.json(data)
    });

    // user.name = 'Saurav';
    // user.email = 'saurav@gmail.com';
    // user.password = 'mypassword';

    // user.save(function(err){
    //     if(err)
    //         console.log('err')

    //     else
    //         res.json({'data': 'success'})
    // })

   });


app.post('/login', function(req, res){
    var email = req.body.email;
    var password = req.body.password;

    User.find({email: email, password: password}, function(err,data){
        if(err)
            res.json(err)
        else
            if(data[0])
                res.json(data[0])
            else
                res.json({'message': 'username or password invald'});
    });
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


var server = app.listen(8081, function () {

  var host = server.address().address
  var port = server.address().port

  console.log("Example app listening at http://%s:%s", host, port)

})