import express from "express";
import dotenv from "dotenv/config";
import session from "express-session";
import homeRoutes from "./routes/home.js";
import panelroutes from "./routes/panel.js";
import dashboardroutes from "./routes/dashboard.js";
import profileRoutes from "./routes/profile.js";
import editRoutes from "./routes/edit.js";
import addContactRoutes from "./routes/add_contact.js";
import loginRoutes from "./routes/login.js";
import logoutRoutes from "./routes/logout.js";
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

if (!process.env.SESSION_SECRET) {
  throw new Error("Falta SESSION_SECRET en el archivo .env");
}
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 }, // 1 hora
  }),
);

//Esto me permite acceder a la variable de sesion en todas las vistas.
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.use("/", homeRoutes);
app.use("/panel", panelroutes);
app.use("/dashboard", dashboardroutes);
app.use("/profile", profileRoutes);
app.use("/edit", editRoutes);
app.use("/add_contact", addContactRoutes);
app.use("/login", loginRoutes);
app.use("/logout", logoutRoutes);

//Esta ruta se ejecuta si ninguna de las anteriores coincide, es decir, si la ruta no existe. Redirige al home.
app.use((req, res) => {
  // res.redirect("/dashboard");
  res.status(404).render("404");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
