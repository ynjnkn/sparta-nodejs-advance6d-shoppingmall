const jwt = require('jsonwebtoken');
const User = require('../models/user');

module.exports = (req, res, next) => {
    const { authorization } = req.headers;
    const [authType, authToken] = (authorization || "").split(" ");

    if (!authToken || authType !== "Bearer") {
        res
            .status(401)
            .send({ errorMessage: "로그인 후 이용 가능합니다." });
        return;
    }
    try {
        const { userId } = jwt.verify(authToken, "whitenoise");
        User.findById(userId).then((user) => {
            res.locals.user = user;
            next();
        });
    }
    catch (err) {
        console.log(err);
        res.status(401).send({
            errorMessage: "로그인 후 이용 가능한 기능입니다.",
        });
    }
};