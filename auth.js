const passport = require('passport');
const LocalStrategy = require('passport-local');
// const GitHubStrategy = require('passport-github');
const GitHubStrategy = require('passport-github2');
const ObjectID = require('mongodb').ObjectID;
const bcrypt = require('bcrypt');

module.exports = function (app, myDatabase){
// Tell passport how to serialize the user
  passport.serializeUser((user, done) => {
    console.log('Inside serializeUser callback. User id is saved to the session file store here.');
    done(null, user._id);
  });
// Deserialize user
passport.deserializeUser((id, done) => {
  myDatabase.findOne({_id: new ObjectID(id)}, (err, doc) => {
    done(null, doc);
  })
  });

// Set up passport-github2 strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "https://fcc-advancednode.omarimam512.repl.co/auth/github/callback"
},
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    // Push user information to the database
    myDatabase.findAndModify(
      // Find user by profile id
      {id: profile.id},
      {},
      {$setOnInsert:{
        id: profile.id,
        name: profile.displayName || 'John Doe',
        photo: profile.photos[0].value || '',
        email: Array.isArray(profile.emails) ? profile.emails[0].value : 'No public email',
        created_on: new Date(),
        provider: profile.provider || ''
      },$set:{
        last_login: new Date()
      }, $inc:{
        login_count: 1
      }},
      {upsert:true, new: true},
      (err, doc) => {
        console.log(doc);
        return cb(null, doc.value);
      }
    );
    }));

  // Set up passport-local strategy
passport.use(new LocalStrategy(
  function(username, password, done){
    console.log('Inside the local strategy callback');
    myDatabase.findOne({username: username}, function(err, user) {
      if (err) {return done(err);}
      if (!user) {
        return done(null, false, {message: 'Incorrect username.'});
      }
      if (!bcrypt.compareSync(password, user.password)) {
        return done(null, false);
      }
      return done(null, user);
    });
  }
  ));
}