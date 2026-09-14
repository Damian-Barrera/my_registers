import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import multer from "multer";
import cloudinary from "../cloudinary_config.js";
import pool from "../db_config.js";

const router = Router();

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

function generarSlug(nombre, id) {
  return `${nombre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}-${id}`;
}

function sanitizarNombre(nombre) {
  return nombre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_");
}

function obtenerPublicId(url) {
  const pathname = new URL(url).pathname;
  const partes = pathname.split("/upload/")[1].split("/");

  if (partes[0].startsWith("v")) {
    partes.shift();
  }

  const publicId = partes.join("/");
  return publicId.replace(/\.[^/.]+$/, "");
}

function obtenerCarpetaCloudinary(url) {
  const publicId = obtenerPublicId(url);
  const partes = publicId.split("/");

  partes.pop();

  return partes.join("/");
}

router.get("/:slug", auth, async (req, res) => {
  const { slug } = req.params;

  try {
    const [rows] = await pool.query("SELECT * FROM chicas WHERE slug = ?", [
      slug,
    ]);

    if (rows.length === 0) {
      return res.status(404).send("Usuario no encontrado");
    }

    const chica = rows[0];

    const [imagenes] = await pool.query(
      "SELECT * FROM imagenes WHERE persona_id = ?",
      [chica.id],
    );

    return res.render("edit", {
      title: "Editar Perfil",
      chica,
      imagenes,
    });
  } catch (error) {
    console.error("Error al cargar usuario", error);
    return res.status(500).send("Error al obtener el usuario");
  }
});

router.post("/:slug", auth, (req, res) => {
  upload.array("fotos", 10)(req, res, async (err) => {
    if (err) return res.status(400).send(err.message);

    const { slug } = req.params;

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
      imagenesEliminar,
    } = req.body;

    const telefonoLimpio = telefono.replace(/\D/g, "");
    const edadLimpia = edad === "" ? null : edad;
    const alturaLimpia = altura === "" ? null : altura;

    try {
      const [rows] = await pool.query("SELECT id FROM chicas WHERE slug = ?", [
        slug,
      ]);

      if (rows.length === 0) {
        return res.status(404).send("Usuario no encontrado");
      }

      const id = rows[0].id;
      const nuevoSlug = generarSlug(nombre, id);

      const [imagenesActuales] = await pool.query(
        "SELECT id, ruta FROM imagenes WHERE persona_id = ?",
        [id],
      );

      await pool.query(
        `UPDATE chicas SET nombre = ?, apellido = ?, edad = ?, telefono = ?, zona = ?, direccion = ?, altura = ?, medidas = ?, horarios = ?, tarifa = ?, descripcion = ?, instagram = ?, facebook = ?, telegram = ?, slug = ? WHERE id = ?`,
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
          nuevoSlug,
          id,
        ],
      );

      if (imagenesEliminar) {
        const ids = imagenesEliminar.split(",");

        for (const imagenId of ids) {
          const [rowsImagen] = await pool.query(
            "SELECT ruta FROM imagenes WHERE id = ? AND persona_id = ?",
            [imagenId, id],
          );

          if (rowsImagen.length === 0) continue;

          const publicId = obtenerPublicId(rowsImagen[0].ruta);

          await cloudinary.uploader.destroy(publicId);

          await pool.query(
            "DELETE FROM imagenes WHERE id = ? AND persona_id = ?",
            [imagenId, id],
          );
        }

        const [nuevaPortada] = await pool.query(
          "SELECT id FROM imagenes WHERE persona_id = ? LIMIT 1",
          [id],
        );

        if (nuevaPortada.length > 0) {
          await pool.query(
            "UPDATE chicas SET foto_portada_id = ? WHERE id = ?",
            [nuevaPortada[0].id, id],
          );
        } else {
          await pool.query(
            "UPDATE chicas SET foto_portada_id = NULL WHERE id = ?",
            [id],
          );
        }
      }

      let carpeta = null;

      if (imagenesActuales.length > 0) {
        const [imagenExistente] = await pool.query(
          "SELECT ruta FROM imagenes WHERE persona_id = ? LIMIT 1",
          [id],
        );

        if (imagenExistente.length > 0) {
          carpeta = obtenerCarpetaCloudinary(imagenExistente[0].ruta);
        }
      }

      if (!carpeta) {
        carpeta = `my_registers/${sanitizarNombre(nombre)}-${id}`;
      }

      for (const file of req.files) {
        const resultado = await cloudinary.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
          { folder: carpeta },
        );

        const [resultImagen] = await pool.query(
          "INSERT INTO imagenes (persona_id, ruta) VALUES (?, ?)",
          [id, resultado.secure_url],
        );

        const [portadaActual] = await pool.query(
          "SELECT foto_portada_id FROM chicas WHERE id = ?",
          [id],
        );

        if (!portadaActual[0].foto_portada_id) {
          await pool.query(
            "UPDATE chicas SET foto_portada_id = ? WHERE id = ?",
            [resultImagen.insertId, id],
          );
        }
      }

      return res.redirect(`/profile/${nuevoSlug}`);
    } catch (error) {
      console.error("Error al actualizar usuario", error);
      return res.status(500).send("Error al actualizar el contacto");
    }
  });
});

router.post("/delete/:slug", auth, async (req, res) => {
  const { slug } = req.params;

  try {
    const [rows] = await pool.query("SELECT id FROM chicas WHERE slug = ?", [
      slug,
    ]);

    if (rows.length === 0) {
      return res.status(404).send("Usuario no encontrado");
    }

    const id = rows[0].id;

    const [imagenes] = await pool.query(
      "SELECT ruta FROM imagenes WHERE persona_id = ?",
      [id],
    );
    const carpeta =
      imagenes.length > 0 ? obtenerCarpetaCloudinary(imagenes[0].ruta) : null;
    
    for (const imagen of imagenes) {
      const publicId = obtenerPublicId(imagen.ruta);
      await cloudinary.uploader.destroy(publicId);
    }
    
    if (carpeta) {
      await cloudinary.api.delete_folder(carpeta);
    }

    await pool.query("DELETE FROM chicas WHERE id = ?", [id]);

    return res.redirect("/dashboard");
  } catch (error) {
    console.error("Error al eliminar usuario", error);
    return res.status(500).send("Error al eliminar el contacto");
  }
});

export default router;
