// [Libraries]
const express = require("express");
const jwt = require("jsonwebtoken");
const joi = require("joi");
const { Op } = require("sequelize");

// [Middlewares]
const authMiddleware = require("../middlewares/auth-middleware");

// [Models]
const { User, Goods, Cart } = require("../models");
const postUsersSchema = joi.object({
    nickname: joi.string().required(),
    email: joi.string().email().required(),
    password: joi.string().required(),
    confirmPassword: joi.string().required(),
});
const postAuthSchema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().required(),
});

const router = express.Router();

// [API] 회원가입
router.post("/users", async (req, res) => {
    try {
        const { nickname, email, password, confirmPassword } = await postUsersSchema.validateAsync(req.body);

        const existingNicknameUser = await User.findOne({
            where: { nickname: { [Op.eq]: nickname } }
        });
        const existingEmailUser = await User.findOne({
            where: { email: { [Op.eq]: email } }
        });

        if (password !== confirmPassword) {
            return res.status(400).send({
                errorMessage: "비밀번호가 일치하지 않습니다.",
            });
        }
        else if (existingNicknameUser) {
            return res.status(400).send({
                errorMessage: "사용 중인 닉네임입니다.",
            });
        }
        else if (existingEmailUser) {
            return res.status(400).send({
                errorMessage: "사용 중인 이메일입니다.",
            });
        }
        else {
            await User.create({ email, nickname, password });
            return res.status(201).send("회원가입 성공");
        };
    }
    catch (err) {
        console.log(err);
        res.status(400).send({
            errorMessage: "올바르지 않은 회원가입 형식입니다.",
        });
    };
});

// [API] 로그인
router.post("/auth", async (req, res) => {
    try {
        const { email, password } = await postAuthSchema.validateAsync(req.body);
        const user = await User.findOne({
            where: {
                email: { [Op.eq]: email }
            },
        });

        if (!user || password != user.password) {
            return res
                .status(400)
                .json({
                    errorMessage: "잘못된 이메일 또는 패스워드 입니다.",
                })
        }

        const token = jwt.sign({ userId: user.userId }, "whitenoise", { expiresIn: 1 * 1000 * 60 * 60 });

        return res
            .status(200)
            .send({
                token,
            });
    }
    catch (err) {
        console.log(err);
        res
            .status(400)
            .send({
                errorMessage: "잘못된 이메일 또는 패스워드 형식입니다.",
            });
    };
});

// [API] 사용자 인증
router.get("/users/me", authMiddleware, async (req, res) => {
    const { user } = res.locals;
    res.send({
        user,
    });
});

module.exports = router;