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

    const userId = jwt.verify(authToken, "whitenoise", function (err, decoded) {
        if (err) {
            return;
        }
        return decoded.userId;
    });

    User.findById(userId, function (err, user) {
        if (err) {
            res.status(401).send({
                errorMessage: "로그인 후 이용 가능합니다.",
            })
        }
        res.locals.user = user;
        next();
    });
};
