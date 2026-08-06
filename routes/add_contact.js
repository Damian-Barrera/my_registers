import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import pool from "../db_config.js";

const router = Router();

// Convierte "Juan Pérez" en "juan_perez" (sin espacios, sin acentos)
function sanitizarNombre(nombre) {
  return nombre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_");
}

function obtenerCarpetaDisponible(basePath, nombreCarpeta) {
  let intento = nombreCarpeta;
  let contador = 1;
  while (fs.existsSync(path.join(basePath, intento))) {
    intento = `${nombreCarpeta}_${contador}`;
    contador++;
  }
  return intento;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!req.carpetaContacto) {
        const nombreBase = sanitizarNombre(req.body.nombre || "sin_nombre");
        const basePath = path.join("public", "imgs");
        const carpetaFinal = obtenerCarpetaDisponible(basePath, nombreBase);

        fs.mkdirSync(path.join(basePath, carpetaFinal), { recursive: true });
        req.carpetaContacto = carpetaFinal;
      }
      cb(null, path.join("public", "imgs", req.carpetaContacto));
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const carpeta = path.join("public", "imgs", req.carpetaContacto);
    const ext = path.extname(file.originalname);
    const nombreSinExt = path.basename(file.originalname, ext);

    let nombreFinal = file.originalname;
    let contador = 1;

    while (fs.existsSync(path.join(carpeta, nombreFinal))) {
      nombreFinal = `${nombreSinExt}_${contador}${ext}`;
      contador++;
    }

    cb(null, nombreFinal);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const tiposPermitidos = /jpeg|jpg|png|webp/;
    const extensionValida = tiposPermitidos.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimeValido = tiposPermitidos.test(file.mimetype);
    if (extensionValida && mimeValido) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten imágenes (jpg, jpeg, png, webp)"));
    }
  },
});

router.get("/", auth, (req, res) => {
  return res.render("add_contact");
});

router.post("/", auth, (req, res) => {
  upload.array("fotos", 10)(req, res, async (err) => {
    // "fotos", no "imagenes"
    if (err) return res.status(400).send(err.message);

    const conn = await pool.getConnection();

    try {
      const {
        nombre,
        apellido,
        edad,
        telefono,
        zona,
        direccion,
        altura,
        medidas,
        horarios,
        tarifa,
        descripcion,
      } = req.body;

      await conn.beginTransaction();

      // 1. Insertar la chica
      const [resultChica] = await conn.query(
        `INSERT INTO chicas (nombre, apellido, edad, telefono, zona, direccion, altura, medidas, horarios, tarifa, descripcion)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nombre,
          apellido,
          edad,
          telefono,
          zona,
          direccion,
          altura,
          medidas,
          horarios,
          tarifa,
          descripcion,
        ],
      );

      const chicaId = resultChica.insertId;

      // 2. Insertar cada imagen, guardando la ruta relativa (para poder usarla en <img src="...">)
      let primeraImagenId = null;

      for (const file of req.files) {
        const rutaRelativa = `/imgs/${req.carpetaContacto}/${file.filename}`;

        const [resultImagen] = await conn.query(
          `INSERT INTO imagenes (persona_id, ruta) VALUES (?, ?)`,
          [chicaId, rutaRelativa],
        );

        if (primeraImagenId === null) {
          primeraImagenId = resultImagen.insertId;
        }
      }

      // 3. Actualizar la foto de portada con la primera imagen subida
      if (primeraImagenId) {
        await conn.query(`UPDATE chicas SET foto_portada_id = ? WHERE id = ?`, [
          primeraImagenId,
          chicaId,
        ]);
      }

      await conn.commit();
      return res.redirect("/panel");
    } catch (error) {
      await conn.rollback();
      console.error("Error al guardar contacto:", error);
      return res.status(500).send("Error al guardar el contacto");
    } finally {
      conn.release();
    }
  });
});

export default router;
