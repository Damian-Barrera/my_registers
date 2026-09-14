# My Registers

Aplicación web para la gestión de perfiles y registros, desarrollada con **Node.js**, **Express**, **EJS** y **MySQL**.

El proyecto permite administrar usuarios, crear y editar perfiles, gestionar fotografías y mantener autenticación para acceder al panel de administración.

## Tecnologías utilizadas

### Backend

* **Node.js** — entorno de ejecución de JavaScript.
* **Express.js** — framework para la creación del servidor y las rutas.
* **MySQL** — sistema de gestión de base de datos.
* **mysql2** — conexión y consultas a MySQL.
* **Express Session** — manejo de sesiones de usuario.
* **bcrypt** — cifrado seguro de contraseñas.
* **Multer** — procesamiento de archivos enviados mediante formularios.
* **dotenv** — gestión de variables de entorno.

### Frontend

* **EJS** — motor de plantillas para generar las páginas dinámicamente.
* **HTML5**
* **CSS3**
* **JavaScript**

### Servicios externos

* **Aiven** — alojamiento de la base de datos MySQL.
* **Cloudinary** — almacenamiento y gestión de imágenes.
* **Render** — alojamiento y despliegue de la aplicación.
* **GitHub** — control de versiones y repositorio del proyecto.

## Funcionalidades

* 🔐 Autenticación de administrador.
* 🔑 Contraseñas almacenadas mediante `bcrypt`.
* 👤 Creación de perfiles.
* ✏️ Edición de perfiles.
* 🖼️ Carga de imágenes.
* ☁️ Almacenamiento de imágenes mediante Cloudinary.
* 🗑️ Eliminación de perfiles e imágenes.
* 📷 Selección de fotografía de portada.
* 🔎 Perfiles accesibles mediante `slug`.
* 🗄️ Persistencia de datos mediante MySQL.
* 🌐 Aplicación desplegada en Render.
* 🔒 Variables sensibles gestionadas mediante variables de entorno.

## Arquitectura

La aplicación utiliza una arquitectura basada en rutas de Express y vistas EJS.

```text
my_registers/
├── index.js
├── db_config.js
├── cloudinary_config.js
├── package.json
│
├── routes/
│   ├── home.js
│   ├── login.js
│   ├── logout.js
│   ├── panel.js
│   ├── dashboard.js
│   ├── profile.js
│   ├── add_contact.js
│   └── edit.js
│
├── middlewares/
│   └── auth.js
│
├── views/
│   ├── home.ejs
│   ├── login.ejs
│   ├── panel.ejs
│   ├── dashboard.ejs
│   ├── profile.ejs
│   ├── edit.ejs
│   └── 404.ejs
│
└── public/
    ├── css/
    └── js/
```

## Base de datos

La aplicación utiliza MySQL con tres tablas principales:

### `user_admin`

Almacena los usuarios que pueden acceder al panel de administración.

### `chicas`

Contiene la información de los perfiles registrados.

### `imagenes`

Almacena las referencias a las imágenes asociadas a cada perfil.

Las imágenes no se almacenan directamente en MySQL. La base de datos conserva la URL proporcionada por Cloudinary.

## Almacenamiento de imágenes

Las imágenes son enviadas al servidor mediante **Multer** y posteriormente almacenadas en **Cloudinary**.

La base de datos guarda la URL segura (`secure_url`) de cada archivo.

La organización de los archivos utiliza carpetas asociadas a cada perfil:

```text
my_registers/
├── nombre-1/
├── nombre-2/
└── nombre-3/
```

Esto permite mantener separados los archivos correspondientes a cada registro.

## Seguridad

Las contraseñas de los administradores no se almacenan en texto plano.

Antes de guardarlas en la base de datos se utiliza **bcrypt** para generar un hash:

```text
Contraseña → bcrypt → Hash almacenado
```

Además, las credenciales de la base de datos, Cloudinary y las claves de sesión se manejan mediante **variables de entorno**.

Los archivos `.env` no forman parte del repositorio.

## Variables de entorno

El proyecto requiere variables de entorno para funcionar correctamente.

Ejemplo:

```env
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=

SESSION_SECRET=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Los valores reales deben configurarse tanto en el entorno local como en el servicio de producción.

## Desarrollo local

Instalar las dependencias:

```bash
npm install
```

Iniciar la aplicación:

```bash
node index.js
```

Por defecto, el servidor utiliza el puerto definido por `PORT` o el puerto `3000`.

## Producción

La aplicación está preparada para ejecutarse en **Render**.

El flujo de despliegue utiliza GitHub:

```text
Desarrollo local
      ↓
Git
      ↓
GitHub
      ↓
Render
      ↓
Aplicación en producción
```

Los cambios enviados al repositorio pueden desplegarse automáticamente mediante el sistema de integración de Render.


## Autor

**Damian Barrera**

Proyecto desarrollado como aplicación web full-stack utilizando tecnologías del ecosistema JavaScript y servicios cloud.
