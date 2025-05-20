const express = require("express");
const path = require("path");
const fs = require("fs");
const Busboy = require("busboy");

const router = express.Router();
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

router.post("/upload", (req, res) => {
    const busboy = Busboy({ headers: req.headers });

    busboy.on("file", (fieldname, file, info) => {
        const filename = info.filename;
        if (!filename) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const saveTo = path.join(uploadDir, filename);
        file.pipe(fs.createWriteStream(saveTo));

        file.on("end", () => {
            res.json({ message: "Upload successful", filePath: saveTo });
        });
    });

    busboy.on("error", (err) => {
        console.error("Busboy Error:", err);
        res.status(500).json({ error: "File upload failed" });
    });

    req.pipe(busboy);
});

module.exports = router;
