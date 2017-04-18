let bodyParser = require('body-parser');
let express = require('express');
let app = express();
let morgan = require('morgan');
let mongoose = require('mongoose');
let passport = require('passport');
let config = require('./config/database');
let User = require('./app/models/user');
let port = process.env.PORT || 8000;
let jwt = require('jwt-simple');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(morgan('dev'));
mongoose.promise = global.promise;

app.use(passport.initialize());

app.get('/', function (req, res) {
  res.send('Hello! The API is at http://localhost:' + port + '/api')
});

mongoose.connect(config.database);

require('./config/passport')(passport);

app.post('/signup', function (req, res) {

  if (!req.body.name || !req.body.password) {
    res.json({success: false, msg: 'Please provide your name with password'});
  } else {

    let newUser = new User({
      name: req.body.name,
      password: req.body.password
    });

    newUser.save(function (err) {
      if (err) {
        res.json({success: false, msg: 'Username already exists'});
      } else {
        res.json({success: true, msg: 'Successful created user!'});
      }
    });
  }
});

app.post('/authenticate', function (req, res) {
  User.findOne({name: req.body.name}).then(user => {
    if (!user) {
      return res.status(403).send({success: false, msg: 'Ouuups.... User not found.'});
    } else {
      user.comparePassword(req.body.password, function (err, isMatch) {
        if (isMatch && !err) {
          let token = jwt.encode(user, config.secret);
          res.json({success: true, token: 'JWT-' + token});
        } else {
          return res.status(403).send({success: false, msg: 'Wrong password'});
        }
      })
    }
  }).catch(error => {
    return res.status(403).send({success: false, msg: 'Something goes wrong'});
  });
});

app.get('/memberinfo', passport.authenticate('jwt', {session: false}), function (req, res) {
  let token = getToken(req.headers);
  if (token) {
    let decoded = jwt.decode(token, config.secret);
    User.findOne({name: decoded.name}).then(user => {
      if (!user) {
        res.status(403).send({success: false, msg: 'User not found'});
      } else {
        res.json({success: true, token: 'Welcome'});
      }
    }).catch(error => {
      res.status(403).send({success: false, msg: 'Error'});
    });
  } else {
    return res.status(403).send({success: false, msg: 'No token provided'});
  }
});

let getToken = function (headers) {
  if (headers && headers.authorization) {
    if (headers.authorization.startsWith('JWT-')) {
      return headers.authorization.replace('JWT-', '');
    }
  }
  return null;
};

app.listen(port);

console.log('SERVER STARTED AT http://localhost:' + port);