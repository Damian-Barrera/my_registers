import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import multer from "multer";
import cloudinary from "../cloudinary_config.js";
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
function generarSlug(nombre, id) {
  return `${nombre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}-${id}`;
}

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const tiposPermitidos = /jpeg|jpg|png|webp/;

    if (tiposPermitidos.test(file.mimetype)) {
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
        instagram,
        facebook,
        telegram,
      } = req.body;

      await conn.beginTransaction();
      //Evitar que el teléfono tenga caracteres no numéricos, como espacios o guiones
      const telefonoLimpio = telefono.replace(/\D/g, "");
      const edadLimpia = edad === "" ? null : edad;
      const alturaLimpia = altura === "" ? null : altura;
      // 1. Insertar la chica
      const [resultChica] = await conn.query(
        `INSERT INTO chicas (nombre, apellido, edad, telefono, zona, direccion, altura, medidas, horarios, tarifa, descripcion,instagram, facebook, telegram)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?)`,
        [
          nombre,
          apellido,
          edadLimpia,
          telefonoLimpio,
          zona,
          direccion,
          alturaLimpia,
          medidas,
          horarios,
          tarifa,
          descripcion,
          instagram,
          facebook,
          telegram,
        ],
      );

      const chicaId = resultChica.insertId;
      const slug = generarSlug(nombre, chicaId);

      await conn.query("UPDATE chicas SET slug = ? WHERE id = ?", [
        slug,
        chicaId,
      ]);

      let primeraImagenId = null;
      const carpeta = `my_registers/${sanitizarNombre(nombre)}-${chicaId}`;

      for (const file of req.files) {
        const resultado = await cloudinary.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
          { folder: carpeta },
        );

        const [resultImagen] = await conn.query(
          `INSERT INTO imagenes (persona_id, ruta) VALUES (?, ?)`,
          [chicaId, resultado.secure_url],
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
      return res.redirect("/dashboard");
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
