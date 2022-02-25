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


// [Functions]
const socketIdMap = {};
function emitSamePageViewerCount() {
    const countByUrl = Object.values(socketIdMap).reduce((accumulatedUrl, url) => {
        return {
            ...accumulatedUrl,
            [url]: accumulatedUrl[url] ? accumulatedUrl[url] + 1 : 1,
        };
    }, {});

    // console.log("countByUrl", countByUrl);

    for (const [socketId, url] of Object.entries(socketIdMap)) {
        const count = countByUrl[url];
        io.to(socketId).emit("SAME_PAGE_VIEWER_COUNT", count);
    }
};

const app = express();
const http = Server(app);
const io = socketIo(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    }
});
const router = express.Router();

// [Socket.IO]
io.on("connection", (socket) => {
    socketIdMap[socket.id] = null;
    // console.log("새로운 소켓 연결");

    socket.on("CHANGED_PAGE", (data) => {
        console.log("페이지 전환 실행", data, socket.id);
        socketIdMap[socket.id] = data;
        // console.log("socketIdMap 업데이트", socketIdMap);

        emitSamePageViewerCount();
    });

    socket.on("BUY", (data) => {
        const payload = {
            nickname: data.nickname,
            goodsId: data.goodsId,
            goodsName: data.goodsName,
            date: new Date().toISOString(),
        };
        console.log("클라이언트가 구매한 데이터", data, new Date());
        socket.broadcast.emit("BUY_GOODS", payload);
    });

    socket.on("disconnect", () => {
        delete socketIdMap[socket.id];
        console.log(socket.id, "소켓 연결 해제");
        emitSamePageViewerCount();
    });
});

app.use("/api", express.urlencoded({ extended: false }), [router, userRouter, goodsRouter]);
app.use(express.static("assets"));

http.listen(8080, () => {
    console.log("서버 실행 @ 8080 포트");
});