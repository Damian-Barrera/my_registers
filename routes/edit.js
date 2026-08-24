import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import pool from "../db_config.js";

const router = Router();

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const { slug } = req.params;

      const [rows] = await pool.query(
        "SELECT id, nombre FROM chicas WHERE slug = ?",
        [slug],
      );

      if (rows.length === 0) return cb(new Error("Usuario no encontrado"));

      const id = rows[0].id;

      const [imagenes] = await pool.query(
        "SELECT ruta FROM imagenes WHERE persona_id = ? LIMIT 1",
        [id],
      );

      let carpeta;

      if (imagenes.length > 0) {
        carpeta = path.dirname(imagenes[0].ruta).replace(/^\/imgs\//, "");
      } else {
        carpeta = sanitizarNombre(rows[0].nombre);

        const rutaCarpeta = path.join("public", "imgs", carpeta);

        if (!fs.existsSync(rutaCarpeta)) {
          fs.mkdirSync(rutaCarpeta, { recursive: true });
        }
      }

      req.carpetaContacto = carpeta;

      cb(null, path.join("public", "imgs", carpeta));
    } catch (error) {
      cb(error);
    }
  },

  filename: (req, file, cb) => {
    const carpeta = path.join("public", "imgs", req.carpetaContacto);
    const ext = path.extname(file.originalname);
    const nombre = path.basename(file.originalname, ext);

    let nombreFinal = file.originalname;
    let contador = 1;

    while (fs.existsSync(path.join(carpeta, nombreFinal))) {
      nombreFinal = `${nombre}_${contador}${ext}`;
      contador++;
    }

    cb(null, nombreFinal);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
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

function obtenerCarpetaDisponible(basePath, nombreCarpeta, carpetaActual) {
  let intento = nombreCarpeta;
  let contador = 1;

  while (
    fs.existsSync(path.join(basePath, intento)) &&
    intento !== carpetaActual
  ) {
    intento = `${nombreCarpeta}_${contador}`;
    contador++;
  }

  return intento;
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

    try {
      const [rows] = await pool.query("SELECT id FROM chicas WHERE slug = ?", [
        slug,
      ]);

      if (rows.length === 0) {
        return res.status(404).send("Usuario no encontrado");
      }

      const id = rows[0].id;
      const nuevoSlug = generarSlug(nombre, id);
      const [imagenActual] = await pool.query(
        "SELECT ruta FROM imagenes WHERE persona_id = ? LIMIT 1",
        [id],
      );

      let carpetaActual = null;

      if (imagenActual.length > 0) {
        carpetaActual = path
          .dirname(imagenActual[0].ruta)
          .replace(/^\/imgs\//, "");
      }

      await pool.query(
        `UPDATE chicas SET nombre = ?, apellido = ?, edad = ?, telefono = ?, zona = ?, direccion = ?, altura = ?, medidas = ?, horarios = ?, tarifa = ?, descripcion = ?, instagram = ?, facebook = ?, telegram = ?, slug = ? WHERE id = ?`,
        [
          nombre,
          apellido,
          edad,
          telefonoLimpio,
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
          nuevoSlug,
          id,
        ],
      );
      if (carpetaActual) {
        const nuevaCarpetaBase = sanitizarNombre(nombre);
        const nuevaCarpeta = obtenerCarpetaDisponible(
          path.join("public", "imgs"),
          nuevaCarpetaBase,
          carpetaActual,
        );

        if (carpetaActual !== nuevaCarpeta) {
          const rutaVieja = path.join("public", "imgs", carpetaActual);
          const rutaNueva = path.join("public", "imgs", nuevaCarpeta);

          fs.renameSync(rutaVieja, rutaNueva);

          await pool.query(
            "UPDATE imagenes SET ruta = REPLACE(ruta, ?, ?) WHERE persona_id = ?",
            [`/imgs/${carpetaActual}/`, `/imgs/${nuevaCarpeta}/`, id],
          );

          req.carpetaContacto = nuevaCarpeta;
        }
      }
      if (imagenesEliminar) {
        const ids = imagenesEliminar.split(",");

        for (const imagenId of ids) {
          const [rowsImagen] = await pool.query(
            "SELECT ruta FROM imagenes WHERE id = ? AND persona_id = ?",
            [imagenId, id],
          );

          if (rowsImagen.length === 0) continue;

          const rutaArchivo = path.join("public", rowsImagen[0].ruta);

          await pool.query(
            "DELETE FROM imagenes WHERE id = ? AND persona_id = ?",
            [imagenId, id],
          );

          if (fs.existsSync(rutaArchivo)) {
            fs.unlinkSync(rutaArchivo);
          }
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
      for (const file of req.files) {
        const rutaRelativa = `/imgs/${req.carpetaContacto}/${file.filename}`;

        await pool.query(
          "INSERT INTO imagenes (persona_id, ruta) VALUES (?, ?)",
          [id, rutaRelativa],
        );
      }
      const [portadaActual] = await pool.query(
        "SELECT foto_portada_id FROM chicas WHERE id = ?",
        [id],
      );

      if (!portadaActual[0].foto_portada_id) {
        const [nuevaPortada] = await pool.query(
          "SELECT id FROM imagenes WHERE persona_id = ? LIMIT 1",
          [id],
        );

        if (nuevaPortada.length > 0) {
          await pool.query(
            "UPDATE chicas SET foto_portada_id = ? WHERE id = ?",
            [nuevaPortada[0].id, id],
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
    const [rows] = await pool.query("SELECT id FROM chicas WHERE slug = ?", [slug]);

    if (rows.length === 0) {
      return res.status(404).send("Usuario no encontrado");
    }

    const id = rows[0].id;

    const [imagenes] = await pool.query("SELECT ruta FROM imagenes WHERE persona_id = ?", [id]);

    await pool.query("DELETE FROM chicas WHERE id = ?", [id]);

    for (const imagen of imagenes) {
      const rutaArchivo = path.join("public", imagen.ruta);

      if (fs.existsSync(rutaArchivo)) {
        fs.unlinkSync(rutaArchivo);
      }
    }

    const carpetas = [...new Set(imagenes.map(imagen => path.dirname(imagen.ruta)))];

    for (const carpeta of carpetas) {
      const rutaCarpeta = path.join("public", carpeta);

      if (fs.existsSync(rutaCarpeta) && fs.readdirSync(rutaCarpeta).length === 0) {
        fs.rmdirSync(rutaCarpeta);
      }
    }

    return res.redirect("/dashboard");
  } catch (error) {
    console.error("Error al eliminar usuario", error);
    return res.status(500).send("Error al eliminar el contacto");
  }
});
export default router;
