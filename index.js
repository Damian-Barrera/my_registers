import express from 'express';
import homeRoutes from './routes/home.js';
import panelroutes from './routes/panel.js';
import dashboardroutes from './routes/dashboard.js';
import profileRoutes from './routes/profile.js';
import editRoutes from './routes/edit.js';

const app = express();

app.use(express.static('public'));
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');


app.use('/', homeRoutes);
app.use('/panel', panelroutes);
app.use('/dashboard', dashboardroutes)
app.use('/profile', profileRoutes);
app.use('/edit', editRoutes);


app.listen(PORT, ()=> {
    console.log(`Servidor corriendo en el puerto ${PORT}`)
});

