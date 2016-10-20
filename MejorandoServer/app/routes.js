// app/routes.js
var User = require('../app/models/user');
var Content = require('../app/models/content');
var recovery = require("../config/passwordRecoveryAccount");
var allContents = []; 
var mongo = require('mongodb');

module.exports = function(app, passport, pengin, fs, nodemailer, async, crypto){



  // Base para las lecciones
  app.get('/lecciones/*', function(req, res) {
    const path = require('path');
    var fileRequired = path.basename(req.params[0]);
      console.log(fileRequired)
      res.render('base', {
        request : req,
        title : "Inducción Matemática:",
        fileRead : fileRequired,
        subTitle : "En la medida en que las leyes de las matemáticas se refieren a la realidad, no son exactas, y en tanto son exactas, no se refieren a la realidad.-Albert Einstein."
        // console.log("error connecting" + e.message);
      });
  });

  // index

  app.get('/', isNotLogged, function(req, res) {
    res.render('index',{
      request : req,
    });
  });

  // Login GET & POST METHODS
  app.get('/login', isNotLogged, function(req, res) {
    res.render('login', {
      request : req, 
      message: req.flash('loginMessage') 
    });
  });

  app.post('/login', isNotLogged,  passport.authenticate('local-login', {
    successRedirect : '/profile', // redirecciona al perfil si pasa
    failureRedirect : '/login', // redirecciona de vuelta si falla
    failureFlash : true // habilita mensajes de error
  }));

  // Signup GET & POST METHODS
  app.get('/signup', isNotLogged,  function(req, res) {
    res.render('signup', { 
      request : req, 
      message: req.flash('signupMessage') 
    });
  });

  app.post('/signup', isNotLogged, passport.authenticate('local-signup', {
    successRedirect : '/profile', // redirecciona al perfil si pasa
    failureRedirect : '/signup', // redirecciona de vuelta si falla
    failureFlash : true
  }));

  // Olvido contraseña GET & POST METHODS
  app.get('/forgot', isNotLogged,  function(req, res) {
    res.render('forgot', {
      request : req, 
      messages: req.flash(),
      user: req.user// obtiene el usuario de la sesión y lo pasa al template
    });
  });

  app.post('/forgot', isNotLogged, function(req, res, next) {
    async.waterfall([
      function(done) {
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        User.findOne({ 'local.email': req.body.email }, function(err, user) {
          if (!user) {
            req.flash('error', 'No account with that email address exists.');
            return res.redirect('/forgot');
          }
          user.local.resetPasswordToken = token;
          user.local.resetPasswordExpires = Date.now() + 3600000; // 1 hour

          user.save(function(err) {
            done(err, token, user);
          });
        });
      },/*//////////////  SE PODRIA MODIFICAR PARA USAR EL PASSPORT //////////////////
      passport.authenticate('local-forgot', {
        successRedirect : '/', // redirecciona al inicio si pasa
        failureRedirect : '/forgot', // redirecciona de vuelta si falla
        failureFlash : true
      }),*/

      function(token, user, done) {
          console.log("intentando conectar......");
          //hay que usar tecnologia de desarrollo OAuth 2.0, solicitar credenciales,
          //para usar el correo Gmail en el envio de correos
          //http://stackoverflow.com/questions/19877246/nodemailer-with-gmail-and-nodejs
        var smtpTransport = nodemailer.createTransport(
          /*////////////////////configuracion Mail Ula ///////////////////
          smtpConfig = {
              host: 'smtp-mail.ula.com',
              port: 465,
              secure: true, // use SSL
              auth: {
                  user: 'user@ula.com',
                  pass: 'pass'
              }
          },

          poolConfig = {
              pool: true,
              host: 'smtp-mail.gmail.com',
              port: 465,
              secure: true, // use SSL
              auth: {
                  user: 'user@ula.com',
                  pass: 'pass'
              }
          },

          directConfig = {
              name: 'localhost:8080' // must be the same that can be reverse resolved by DNS for your IP
          }*/

          smtpConfig = 'smtps://'+ recovery.email + ':' + recovery.pass + "@smtp.gmail.com",
          poolConfig = 'smtps://' + recovery.email + ':' +  recovery.pass + '@smtp.gmail.com/?pool=true',
          directConfig = 'direct:?name=localhost:8080'

        );
          console.log("intentando verificar......");

        smtpTransport.verify(function(error, success) {
           if (error) {
                console.log(error);
           } else {
                console.log('Server is ready to take our messages');
           }
        });

        var mailOptions = {
          to: user.local.email,
          from: 'user@gmail.com',
          subject: 'Node.js Password Reset',
          text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'https://' + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          req.flash('info', 'An e-mail has been sent to ' + user.local.email + ' with further instructions.');
          done(err, 'done');
        });
      }
    ], function(err) {
      if (err) return next(err);
      res.redirect('/forgot');
    });
  });

  //RESET PASSWORD
  ////info extraida de :
  ///http://sahatyalkabov.com/how-to-implement-password-reset-in-nodejs/
  app.get('/reset/:token', isNotLogged,  function(req, res) {
    User.findOne({ "local.resetPasswordToken": req.params.token, "local.resetPasswordExpires": { $gt: Date.now() } }, function(err, user) {
      if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot');
      }
      res.render('reset', {
        request : req, 
        user: user
      });
    });
  });

  app.post('/reset/:token', isNotLogged,  function(req, res) {
    if (req.body.password != req.body.confirm){
      req.flash('error','Contraseñas no coinciden');
      res.redirect('/');
    }
    User.findOne({ "local.resetPasswordToken": req.params.token, "local.resetPasswordExpires": { $gt: Date.now() } }, function(err, user) {
      if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/');
      }

      user.local.password = user.generateHash(req.body.password);
      user.local.resetPasswordToken = undefined;
      user.local.resetPasswordExpires = undefined;

      user.save(function(err) {
        if(err) console.error(err);
        res.redirect("/login");

        /*req.logIn(user, function(err) {
        done(err, user);
      });*/
    });
  });

  });

  // home
  app.get('/home', function(req, res) {
    res.render('home', {
      request : req,
      question: 'Nothing',
      answer: 'undefined',
      answerObject: 'undefined'
    });
  });

  // profile
  app.get('/profile', isLoggedIn, function(req, res) {
    res.render('profile', {
      request : req,
      user : req.user, // obtiene el usuario de la sesión y lo pasa al template
      question: 'Nothing',
      answer: 'undefined',
      answerObject: 'undefined'
    });
  });

  //post al realizar una pregunta
  app.post('/profile', isLoggedIn, function(req,res){

    //si existe una pregunta
    if((1 == 1) || (req.body.inputToProlog.length > 0 &&  (req.body.inputToProlog.search('X') != (-1)))){
      //
      var readStream = fs.readFileSync("./prolog/0000.pl", 'utf8'); 
      // var readStream = fs.readFileSync("./prolog/buscador.pl", 'utf8');

      console.log('inputToProlog D');
      //creando objeto pengine
      var m = new pengin({
            server: "http://localhost:3030/pengine",
            sourceText: readStream,
            format: "json",
            chunk: 50,
            //ask: "pr(0000-1, [color, caballo, blanco, 'Simón'], X, 20/20, [anonimo]).",
            ask: req.body.inputToProlog,
            destroy: true,
        }).on('success', function(result){


            var responseAlgebra = result.data[0].X.forEach(function(item) {

            if(typeof item == "string") {
              res.render('profile', {
                request : req,
                user : req.user,  // obtiene el usuario de la sesión y lo pasa al template
                question: req.body.inputToProlog,
                answer: "X = " + item,
                answerObject: JSON.stringify(result.data)
              });
          }
          else {
            var resu = printResult(item);
            res.render('profile', {
                        request : req,
                        user : req.user,  // obtiene el usuario de la sesión y lo pasa al template
                        question: req.body.inputToProlog,
                        answer: "X = [" + resu.substring(1, resu.length-1) + "]",
                        answerObject: JSON.stringify(result.data)
                      });
          }
        });

                                          }).on("error", function(error){

                      console.log(error.data);
                        res.render('profile', {
                          request : req,
                          user : req.user,  // obtiene el usuario de la sesión y lo pasa al template
                          question: req.body.inputToProlog,
                          answer: error.data
                        });

                    });

        //interpretation a string del JSON que viene de prolog

        var printItems = function(item) {
          if(typeof item == "string") return ("X = " + item);
          else {
            var res = printResult(item);
            return ("X = [" + res.substring(1, res.length-1) + "]");
          }
        };

        var printResult = function(item) {
          var ret = "";
          if(typeof item.args[0] != "string" ) ret += "(" + printResult(item.args[0]);
          else ret += "(" + item.args[0];

          if(typeof item.args[1] != "string") ret += item.functor + printResult(item.args[1]) + ")";
          else ret += item.functor + item.args[1] + ")";

          return ret;
        };

        //m.destroy();

    //si no hay pregunta
    }else{
      res.render('profile', {
      request : req,
      user : req.user, // obtiene el usuario de la sesión y lo pasa al template
      question: req.body.inputToProlog,
      answer: 'escriba algo!, quizas no hallas colocado la X, LOL...!! :V',
      answerObject: 'undefined'
    });
    }

  });

  // // lecciones
  // app.get('/lecciones', isLoggedIn, function(req, res) {
  //   res.render('lecciones', {
  //     request : req, 
  //     user : req.user, // obtiene el usuario de la sesión y lo pasa al template
  //   });
  // });

  // ejercicios induccion
  app.get('/ejercicios/induccion', isLoggedIn, function(req, res) {
    res.render('ejeInduc', {
      request : req, 
      user : req.user, // obtiene el usuario de la sesión y lo pasa al template
    });
  });

  // ejercicios combinatoria
  app.get('/ejercicios/combinatoria', isLoggedIn, function(req, res) {
    res.render('ejeComb', {
      request : req, 
      user : req.user, // obtiene el usuario de la sesión y lo pasa al template
    });
  });

  // lecciones induccion
  // app.get('/lecciones/induccion', isLoggedIn, function(req, res) {
  //   res.render('induccion', {
  //     request : req, 
  //     user : req.user, // obtiene el usuario de la sesión y lo pasa al template
  //   });
  // });

  // // lecciones combinatoria
  // app.get('/lecciones/combinatoria', isLoggedIn, function(req, res) {
  //   res.render('combinatoria', {
  //     request : req, 
  //     user : req.user, // obtiene el usuario de la sesión y lo pasa al template
  //   });
  // });

  // logout
  app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
  });











  // Begin the admin area

  // app.get("/admin/", isLoggedIn, function(req, res){
  app.get("/admin", function(req, res){
    Content.find({}, function(err, content) {
      if (err) throw err;

        // object of all the users
      // console.log("The contents");
      allContents = content;
      // console.log(allContents);

      console.log("The all contents are be");
      console.log(allContents);

      res.render('admin-panel',{
        request : req, 
        title: "",
        edit : false,
        subTitle : "",
        textContent: "",
        contents : content
      });
      // return allContents;
    });
  });

  app.get("/admin/edit/*", function(req, res){

    var theidID = req.params[0];
    var o_id = new mongo.ObjectID(theidID);
    Content.find({_id : theidID}, function(err, content) {
      if (err) throw err;

        // object of all the users
      console.log("The contents");
      console.log(content);
      // allContents = content;
      // return allContents;
      content = !content.length ? {title : "", subTitle: "", textContent: ""} : content;
      res.render('admin-panel',{
        request : req,
        edit : true,
        title: content[0].title,
        subTitle : content[0].subTitle,
        textContent: content[0].textContent,  
        contents : content
      });
    

    });


  });

  app.get("/admin/leccion/*", function(req, res){

    var theidID = req.params[0];
    var o_id = new mongo.ObjectID(theidID);
    Content.find({_id : theidID}, function(err, content) {
      if (err) throw err;

        // object of all the users
      console.log("The contents");
      console.log(content);
      allContents = content;
      res.render('admin-panel',{
        request : req, 
        title: "",
        subTitle : "",
        textContent: "",
        contents : content
      });
      // return allContents;
    });


  });
    

  app.post("/admin/createContent", function(req, res){

    var newContent = Content({
      textContent: req.body.textContent,
      title: req.body.title,
      subTitle : req.body.subtitle,
      user: "admin"
    });

    newContent.save(function(err) {
      if (err) throw err;

      console.log('Content created!');
      res.redirect('/admin');

    });
  });
  // función que revisa si el usuario esta autenticado
  function isLoggedIn(req, res, next) {

    // si esta autenticado siga
    if (req.isAuthenticated())
    return next();

    // si no redireccione a la pagina principal
    res.redirect('/');
  }
  function isNotLogged(req, res, next) {

    // si esta autenticado siga
    if (!req.isAuthenticated())
    return next();

    // si no redireccione a la pagina principal
    res.redirect('/home');
  }

  app.use(function(err, req, res, next) {
    console.error(err.stack);
    // res.status(500).send('Something broke!');
    res.render('error', {
      request : req, 
      user : req.user, // obtiene el usuario de la sesión y lo pasa al template
    });
  });
};
