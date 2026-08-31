import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import pool from "../db_config.js";

const router = Router();

router.get("/:slug", auth, async (req, res) => {
  const { slug } = req.params;

  try {
    const [rows] = await pool.query("SELECT * FROM chicas WHERE slug = ?", [
      slug,
    ]);

    if (rows.length === 0) {
      // return res.send("Usuario no encontrado");
      return res.status(404).render("404");
      // return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const chica = rows[0];
    const [imagenes] = await pool.query(
      "SELECT * FROM imagenes WHERE persona_id = ?",
      [chica.id],
    );

    //consultar la portada de la chica
    let portada = null;

    if (chica.foto_portada_id) {
      const [resultadoPortada] = await pool.query(
        "SELECT ruta FROM imagenes WHERE id = ?",
        [chica.foto_portada_id],
      );

      if (resultadoPortada.length > 0) {
        portada = resultadoPortada[0];
      }
    }

    return res.render("profile", { chica, imagenes, portada: portada });
  } catch (error) {
    console.error("Error al cargar el perfil", error);
    res.status(500).send("Error al cargar el perfil");
  }
});

export default router;
