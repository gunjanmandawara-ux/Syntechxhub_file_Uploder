const express = require("express");
const routes = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const controller = require("../controller/auth.controller");

routes.use(express.json());
routes.use(express.urlencoded({ extended: true }));

const uploadPath = path.join(__dirname, "../public/userImages");
fs.mkdirSync(uploadPath, { recursive: true });

routes.use(express.static(path.join(__dirname, "../public")));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const name = Date.now() + "-" + file.originalname;
        cb(null, name);
    }
});

const upload = multer({ storage });
const uploadMemory = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

routes.post("/register", upload.single("image"), controller.register);
routes.post("/upload", uploadMemory.single("file"), controller.uploadFile);
routes.get("/files/:id", controller.getFile);
routes.delete("/files/:id", controller.deleteFile);

module.exports = routes;
