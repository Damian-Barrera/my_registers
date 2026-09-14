 
import { Router } from "express";
import bcrypt from "bcrypt";
import pool from "../db_config.js";

const router = Router();

router.post("/", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM user_admin WHERE email = ?",
      [email],
    );

    if (rows.length === 0) {
      return res.send("Usuario no encontrado");
    }

    const usuario = rows[0];

    const passwordCorrecta = await bcrypt.compare(password, usuario.password);

    if (!passwordCorrecta) {
      return res.send("Contraseña incorrecta");
    }

    req.session.user = {
      id: usuario.id,
      email: usuario.email,
    };

    return res.redirect("/panel");
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    return res.status(500).send("Error al iniciar sesión");
  }
});

export default router;
 
