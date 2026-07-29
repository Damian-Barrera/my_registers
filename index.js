import express from 'express';
import session from 'express-session';
import homeRoutes from './routes/home.js';
import panelroutes from './routes/panel.js';
import dashboardroutes from './routes/dashboard.js';
import profileRoutes from './routes/profile.js';
import editRoutes from './routes/edit.js';
import addContactRoutes from './routes/add_contact.js';
import loginRoutes from './routes/login.js';
import logoutRoutes from './routes/logout.js';
const app = express();


const PORT = process.env.PORT || 3000;


app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.use(session({
    secret: 'esta_es_la_clave_secreta_para_la_sesion',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 *60 *60 } // 1 hora
  }));  

  //Esto me permite acceder a la variable de sesion en todas las vistas.
  app.use((req, res, next) => {                    
    res.locals.user = req.session.user || null;
    next();
});

app.use('/', homeRoutes);
app.use('/panel', panelroutes);
app.use('/dashboard', dashboardroutes)
app.use('/profile', profileRoutes);
app.use('/edit', editRoutes);
app.use('/add_contact', addContactRoutes);
app.use('/login', loginRoutes);
app.use('/logout', logoutRoutes);



app.listen(PORT, ()=> {
    console.log(`Servidor corriendo en el puerto ${PORT}`)
});



