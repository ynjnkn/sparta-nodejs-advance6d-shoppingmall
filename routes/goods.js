// [Libraries]
const express = require("express");
const { Op } = require("sequelize");

// [Middlewares]
const authMiddleware = require("../middlewares/auth-middleware");

// [Models]
const { User, Goods, Cart } = require("../models");

const router = express.Router();

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

// [API] 상품 목록 조회
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

    const cart = await Cart.findAll({
        where: {
            userId,
        },
    });

    const goodsIds = cart.map((c) => c.goodsId);

    // 루프 줄이기 위해 Mapping 가능한 객체로 만든것
    const goodsKeyById = await Goods.findAll({
        where: {
            goodsId: goodsIds,
        },
    }).then((goods) =>
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
        where: {
            userId,
            goodsId,
        },
    });

    if (existsCart) {
        existsCart.quantity = quantity;
        await existsCart.save();
    } else {
        await Cart.create({
            userId,
            goodsId,
            quantity,
        });
    }

    // NOTE: 성공했을때 응답 값을 클라이언트가 사용하지 않는다.
    res.send({});
});

// [API] 장바구니의 상품 삭제
router.delete("/goods/:goodsId/cart", authMiddleware, async (req, res) => {
    const { userId } = res.locals.user;
    const { goodsId } = req.params;

    const existsCart = await Cart.findOne({
        where: {
            userId,
            goodsId,
        },
    });

    // 있든 말든 신경 안쓴다. 그냥 있으면 지운다.
    if (existsCart) {
        await existsCart.destroy();
    }

    // NOTE: 성공했을때 딱히 정해진 응답 값이 없다.
    res.send({});
});

module.exports = router;