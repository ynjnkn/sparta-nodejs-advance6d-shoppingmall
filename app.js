// [Libraries]
const express = require("express");


// [Middlewares]
const authMiddleware = require("./middlewares/auth-middleware");

// [Models]
const { User, Goods, Cart } = require("./models");

// [Routers]
const userRouter = require("./routes/user");
const goodsRouter = require("./routes/goods");

const app = express();
const router = express.Router();

app.use("/api", express.urlencoded({ extended: false }), [router, userRouter, goodsRouter]);
app.use(express.static("assets"));

app.listen(8080, () => {
    console.log("서버 실행 @ 8080 포트");
});