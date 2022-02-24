// [Libraries]
const express = require("express");
const { Server } = require("http");
const socketIo = require("socket.io");

// [Middlewares]
const authMiddleware = require("./middlewares/auth-middleware");

// [Models]
const { User, Goods, Cart } = require("./models");

// [Routers]
const userRouter = require("./routes/user");
const goodsRouter = require("./routes/goods");

const app = express();
const http = Server(app);
const io = socketIo(http);
const router = express.Router();

io.on("connection", (socket) => {
    console.log("새로운 소켓 연결");

    socket.emit("BUY_GOODS", {
        nickname: "allnighter01",
        goodsId: 1,
        goodsName: "인테이크 슈가로로 복숭아 무설탕 탄산음로 스파클링 350ml (24개입)",
        date: "2022-02-24",
    });

    socket.on("disconnect", () => {
        console.log(socket.id, "연결이 끊어졌어요!");
    });

    socket.on("BUY", (data) => {
        console.log(data);
    });
});

app.use("/api", express.urlencoded({ extended: false }), [router, userRouter, goodsRouter]);
app.use(express.static("assets"));

http.listen(8080, () => {
    console.log("서버 실행 @ 8080 포트");
});