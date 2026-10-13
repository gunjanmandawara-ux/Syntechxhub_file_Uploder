
const User = require("../models/auth.model");
const bcryptjs = require("bcryptjs");
const mongoose = require("mongoose");
const { GridFSBucket, ObjectId } = require("mongodb");

// Get GridFS bucket
const getBucket = () => {
    if (!mongoose.connection.db) {
        throw new Error("MongoDB is not connected");
    }

    return new GridFSBucket(mongoose.connection.db, {
        bucketName: "uploads",
    });
};

// 1. Register API
const register = async (req, res) => {
    try {
        const { name, email, password, mobile, type } = req.body;

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            typeof mobile !== "string" ||
            !name.trim() ||
            !email.trim() ||
            !password ||
            !mobile.trim() ||
            type === undefined ||
            type === ""
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, email, password, mobile and type are required",
            });
        }

        const numericType = Number(type);
        if (!Number.isFinite(numericType)) {
            return res.status(400).json({
                success: false,
                message: "Type must be a valid number",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already exists",
            });
        }

        const hashedPassword = await bcryptjs.hash(password, 10);

        const newUser = new User({
            name,
            email: normalizedEmail,
            password: hashedPassword,
            image: req.file ? req.file.filename : "",
            mobile,
            type: numericType,
        });

        const savedUser = await newUser.save();

        const userData = savedUser.toObject();
        delete userData.password;

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: userData,
        });
    } catch (error) {
        console.error("Register error:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Email already exists",
            });
        }

        if (error.name === "ValidationError" || error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// 2. Upload File API
const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select a file",
            });
        }

        if (!req.file.buffer) {
            return res.status(400).json({
                success: false,
                message: "File buffer missing. Check Multer memoryStorage.",
            });
        }

        const bucket = getBucket();

        const uploadStream = bucket.openUploadStream(
            req.file.originalname,
            {
                metadata: {
                    contentType: req.file.mimetype,
                },
            }
        );

        uploadStream.on("error", (error) => {
            console.error("Upload error:", error);

            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: "File upload failed",
                });
            }
        });

        uploadStream.on("finish", () => {
            if (!res.headersSent) {
                return res.status(201).json({
                    success: true,
                    message: "File uploaded successfully",
                    fileId: uploadStream.id.toString(),
                    filename: req.file.originalname,
                    contentType: req.file.mimetype,
                });
            }
        });

        uploadStream.end(req.file.buffer);
    } catch (error) {
        console.error("Upload error:", error);

        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }
};

// 3. Get / Display File API

const getFile = async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid file ID",
            });
        }

        const bucket = getBucket();
        const fileId = new ObjectId(id);

        const file = await bucket.find({ _id: fileId }).next();

        if (!file) {
            return res.status(404).json({
                success: false,
                message: "File not found",
            });
        }

        const contentType =
            file.contentType ||
            file.metadata?.contentType ||
            "application/octet-stream";

        console.log("File:", file.filename);
        console.log("Content-Type:", contentType);

        res.setHeader("Content-Type", contentType);
        res.setHeader(
            "Content-Disposition",
            `inline; filename="${encodeURIComponent(file.filename)}"`
        );
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "no-cache");

        const downloadStream = bucket.openDownloadStream(fileId);

        downloadStream.on("error", (error) => {
            console.error("GridFS download error:", error);

            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: "Unable to retrieve file",
                });
            } else {
                res.destroy(error);
            }
        });

        downloadStream.pipe(res);
    } catch (error) {
        console.error("Get file error:", error);

        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }
};


// 4. Delete File API
const deleteFile = async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid file ID",
            });
        }

        const bucket = getBucket();
        const fileId = new ObjectId(id);

        const file = await bucket.find({ _id: fileId }).next();

        if (!file) {
            return res.status(404).json({
                success: false,
                message: "File not found",
            });
        }

        await bucket.delete(fileId);

        return res.status(200).json({
            success: true,
            message: "File deleted successfully",
        });
    } catch (error) {
        console.error("Delete file error:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = {
    register,
    uploadFile,
    getFile,
    deleteFile,
};
