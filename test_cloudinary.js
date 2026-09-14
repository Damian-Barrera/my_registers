import "dotenv/config";

console.log("Cloud:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API Key:", process.env.CLOUDINARY_API_KEY ? "CARGADA" : "NO CARGADA");

import cloudinary from "./cloudinary_config.js";

try {
  const resultado = await cloudinary.api.ping();
  console.log(resultado);
} catch (error) {
  console.error("Error conectando con Cloudinary:", error.message);
}