import { Router } from "express";
import { storagePut } from "../storage";

const router = Router();

router.post("/upload-logo", async (req, res) => {
  try {
    const { image, filename } = req.body;

    if (!image || !filename) {
      return res.status(400).json({ error: "Imagem e nome do arquivo são obrigatórios" });
    }

    // Extrair dados base64
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Determinar content type
    const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
    const contentType = mimeMatch ? mimeMatch[1] : "image/png";

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const ext = filename.split(".").pop() || "png";
    const key = `logos/logo-${timestamp}.${ext}`;

    // Upload para S3
    const result = await storagePut(key, buffer, contentType);

    res.json({ url: result.url, key: result.key });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Erro ao fazer upload da imagem" });
  }
});

export default router;
