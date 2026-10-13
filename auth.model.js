const mongoose = require("mongoose")

const user = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        default: "",
    },
    mobile: {
        type: String,
        required: true,
    },
    type: {
        type: Number,
        required: true,
    }
});
module.exports = mongoose.model("user",user)