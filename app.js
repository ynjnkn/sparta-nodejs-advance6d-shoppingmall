const express = require("express");
const mongoose = require("mongoose");

const User = require("./models/user");

mongoose.connect("mongodb://localhost/shopping-demo", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));

const app = express();
const router = express.Router();

app.use("/api", express.urlencoded({ extended: false }), router);
app.use(express.static("assets"));


router.post("/users", async (req, res) => {
    const { nickname, email, password, confirmPassword } = req.body;
    const users = await User.find({}).exec();
    const existingNicknameUser = await User.findOne({ nickname }).exec();
    const existingEmailUser = await User.findOne({ email }).exec();

    if (password !== confirmPassword) {
        return res.status(400).send({
            msg: "비밀번호가 일치하지 않습니다.",
        });
    }
    else if (existingNicknameUser) {
        return res.status(400).send({
            msg: "사용 중인 닉네임입니다.",
        });
    }
    else if (existingEmailUser) {
        return res.status(400).send({
            msg: "사용 중인 이메일입니다.",
        });
    }
    else {
        const newUser = new User({
            nickname,
            email,
            password,
        })
        await newUser.save();
        return res.status(201).send({
            msg: "회원가입에 성공했습니다.",
        });
    };
});

app.listen(8080, () => {
    console.log("서버 실행 @ 8080 포트");
});