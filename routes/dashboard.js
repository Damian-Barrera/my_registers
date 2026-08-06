import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import pool from "../db_config.js";

const router = Router();

router.get("/", auth, async (req, res) => {
  const [chicas] = await pool.query(
    "SELECT chicas.id, chicas.nombre, imagenes.ruta FROM chicas  JOIN imagenes ON chicas.foto_portada_id = imagenes.id",
  );
   res.render("dashboard", { chicas });
});

export default router;
