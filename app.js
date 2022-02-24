// [Libraries]
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const joi = require("joi");
const { Op } = require("sequelize");

// [Middlewares]
const authMiddleware = require("./middlewares/auth-middleware");

// [Models]
const { User, Goods } = require("./models");
const Cart = require("./models/cart");

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


const postUsersSchema = joi.object({
    nickname: joi.string().required(),
    email: joi.string().email().required(),
    password: joi.string().required(),
    confirmPassword: joi.string().required(),
});

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

const postAuthSchema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().required(),
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


// [API] 상품 추가
router.post("/goods", async (req, res) => {
    const { name, thumbnail, category, price } = req.body;

    await Goods.create({ name, thumbnail, category, price });

    res.send("상품 추가 API 실행");
});

// [API] 상품 삭제
router.delete("/goods/:goodsId", async (req, res) => {
    const { goodsId } = req.params;

    const goods = await Goods.findOne({
        where: { goodsId: { [Op.eq]: goodsId } }
    });

    if (!goods) {
        return res.send("삭제하려는 상품이 없습니다.");
    }

    Goods.destroy({
        where: {
            goodsId: {
                [Op.eq]: goodsId
            }
        }
    });

    console.log("goods", goods.dataValues);

    return res.send("상품 삭제 API 실행");
});

// [API] 모든 상품 목록 조회
router.get("/goods", authMiddleware, async (req, res) => {
    const { category } = req.query;

    const goods = await Goods.findAll({
        order: ["goodsId"],
        where: category ? { category } : undefined,
    });

    res.send({ goods });
});


// [API] 장바구니 목록 조회
router.get("/goods/cart", authMiddleware, async (req, res) => {
    const { userId } = res.locals.user;

    const cart = await Cart.find({
        userId,
    }).exec();

    const goodsIds = cart.map((c) => c.goodsId);

    // 루프 줄이기 위해 Mapping 가능한 객체로 만든것
    const goodsKeyById = await Goods.find({
        _id: { $in: goodsIds },
    })
        .exec()
        .then((goods) =>
            goods.reduce(
                (prev, g) => ({
                    ...prev,
                    [g.goodsId]: g,
                }),
                {}
            )
        );

    res.send({
        cart: cart.map((c) => ({
            quantity: c.quantity,
            goods: goodsKeyById[c.goodsId],
        })),
    });
});


// [API] 상품 상세 조회
router.get("/goods/:goodsId", authMiddleware, async (req, res) => {
    const { goodsId } = req.params;
    const goods = await Goods.findByPk(goodsId);

    if (!goods) {
        res.status(404).send({});
    } else {
        res.send({ goods });
    }
});


// [API] 장바구니에 상품 추가
router.put("/goods/:goodsId/cart", authMiddleware, async (req, res) => {
    const { userId } = res.locals.user;
    const { goodsId } = req.params;
    const { quantity } = req.body;

    const existsCart = await Cart.findOne({
        userId,
        goodsId,
    }).exec();

    if (existsCart) {
        existsCart.quantity = quantity;
        await existsCart.save();
    } else {
        const cart = new Cart({
            userId,
            goodsId,
            quantity,
        });
        await cart.save();
    }

    // NOTE: 성공했을때 응답 값을 클라이언트가 사용하지 않는다.
    res.send({});
});


// [API] 장바구니의 상품 삭제
router.delete("/goods/:goodsId/cart", authMiddleware, async (req, res) => {
    const { userId } = res.locals.user;
    const { goodsId } = req.params;

    const existsCart = await Cart.findOne({
        userId,
        goodsId,
    }).exec();

    // 있든 말든 신경 안쓴다. 그냥 있으면 지운다.
    if (existsCart) {
        existsCart.delete();
    }

    // NOTE: 성공했을때 딱히 정해진 응답 값이 없다.
    res.send({});
});


app.listen(8080, () => {
    console.log("서버 실행 @ 8080 포트");
});