const routes = require('./routes.js');
const auth = require('./auth.js');
"use strict";
require('dotenv').config();
const express = require("express");
const myDB = require('./connection');
const fccTesting = require("./freeCodeCamp/fcctesting.js");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const FileStore = require('session-file-store')(session);
const ObjectID = require('mongodb').ObjectID;


// Create the server
const app = express();

// Mount the http server on the express application
const http = require('http').createServer(app);
// 
const io = require('socket.io')(http);
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI});

// Middleware
fccTesting(app); //For FCC testing purposes
app.use("/public", express.static(process.cwd() + "/public"));

// Set the view engine and directory
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, "views/pug"));

// Use bodyParser on json responses.
app.use(bodyParser.json());
// The data in the POST request from the frontend will come through as 'application/x-www-form-urlencoded'
app.use(bodyParser.urlencoded({ extended: true }));


// Filestore Options
// var fileStoreOptions = {};

// Using session secret
app.use(session({
  key: 'express.sid',
  store: store,
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: {secure: false}
}));

app.use(passport.initialize());
app.use(passport.session());


 // Tell io to use the following settings
  io.use(
    passportSocketIo.authorize({
      cookieParser: cookieParser,
      key: 'express.sid',
      secret: process.env.SESSION_SECRET,
      store: store,
      success: onAuthorizeSuccess,
      fail: onAuthorizeFail
    })
  );

// Connect to mongodb
myDB(async client => {
  const myDatabase = await client.db('fcc-adv-node').collection('users');

// From routes.js
routes(app, myDatabase);

// From auth.js
auth(app, myDatabase);

// Number of connected users  
let currentUsers = 0;
  
 

  // Listen for connections to your server
  io.on('connection', (socket) => {
    ++currentUsers;
    io.emit('user', {
      name: socket.request.user.name,
      currentUsers,
      connected: true
    });

    // Listen for chat messages
    socket.on('chat message', (message) => {
      // Emit a chat message event for the client to receive
      io.emit('chat message', { name: socket.request.user.name, message});
    })

    // Place the user's name into a variable 
    const user = socket.request.user.name;
    console.log("User " + user + ' has connected!');
    // Listen for disconnections
    socket.on('disconnect', () => {
      console.log("A user disconnected");
      --currentUsers;
      io.emit('user count', currentUsers);
      
    });
  });

}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('index', {
      title: e,
      message: 'Sorry, unable to login. =('
    });
  });
});

function onAuthorizeSuccess(data, accept) {
  console.log('Successful connection to socket.io!');

  accept(null, true);

}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('Failed to connect to socket.io: ', message);
  accept(null, false);
}

// Listen on PORT or 3000
http.listen(process.env.PORT || 3000, () => {
  console.log("Listening on port " + process.env.PORT);
});