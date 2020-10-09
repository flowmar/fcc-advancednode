const passport = require('passport');
const bcrypt = require('bcrypt');

module.exports = function (app, myDatabase) {
  // Route for index page
app.route("/").get((req, res) => {
  console.log("Inside the homepage callback function");
  console.log(req.sessionID);
  //Change the response to render the Pug template
  res.render('index', {
    title: 'Successfully Connected to Database!', 
    message: 'Please login', 
    showLogin: true, 
    showRegistration: true, 
    showSocialAuth: true
    });
});

// POST for login
app.route('/login').post(passport.authenticate('local', {failureRedirect: '/'}), (req, res) => {
  res.redirect('/profile');
  });

// GET for /profile
app.route('/profile').get(ensureAuthenticated, (req, res) => {
  res.render('profile', {username: req.user.username})
});

// GET for /chat
app.route('/chat').get(ensureAuthenticated, (req, res) => {
  res.render("chat", { user: req.user });
});

// GET for logout
app.route('/logout').get((req, res) => {
  req.logout();
  res.redirect('/');
});


// POST Route for registering a user
app.route('/register')
  .post((req, res, next) => {
    // Create a hash from the password
    const hash = bcrypt.hashSync(req.body.password, 12);
    // Search the database for the values in the input fields
    myDatabase.findOne({ username: req.body.username}, 
    function(err, user) {
      if (err) {
        next(err);
      } else if (user){
        // If the user exists, redirect back home
        res.redirect('/');
      } else {
        // If they don't exist, insert the username and password into the database
        myDatabase.insertOne({
          username: req.body.username,
          password: hash
        },
        // Handlers for the insertOne function
        (err, doc) => {
          if (err) {
            res.redirect('/');
          } else {
            // The inserted document is held within the ops property of the doc
            next(null, doc.ops[0]);
          }
        })
      }
    })
  },
  // Authenticate with the local Strategy, give a redirect option if authentication fails
    passport.authenticate('local', { failureRedirect: '/'}), (req, res, next) => {
      // If it is successful, redirect to the user's profile
      res.redirect('/profile');
    }
  );

// GET for github
app.route('/auth/github').get(
  passport.authenticate('github'));

// GET github/callback
app.route('/auth/github/callback').get(
  passport.authenticate('github',{ failureRedirect: '/' }),
  function(req, res){
    // Successful authentication, go to profile
    req.session.user_id = req.user.id;
    res.redirect('/chat');
  }); 

// 404 Error page if page is not found
app.use((req, res, next) => {
  console.log("404 Error: Page Not Found");
  res.status(404)
  .type('text')
  .send('404 Error: Page Not Found, sorry.');
});

function ensureAuthenticated(req, res, next){
  if (req.isAuthenticated()){
    return next();
  }
    res.redirect('/');
  }
  };