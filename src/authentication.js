const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { User, Tokens } = require("./Tables");
module.exports = (db) => {
  const verifyToken = async (req, res, next) => {
    let token = req.headers["authorization"]
      ? req.headers["authorization"].split(" ")[1]
      : false;

    if (!token) {
      return res.status(403).send("A token is required for authentication");
    }
    let valid = await db.findOne({
      coll: Tokens,
      filter: { token: token },
    });
    try {
      if (valid._id) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let user = await db.findOne({
          coll: User,
          filter: { _id: ObjectId(decoded._id) },
          options: {},
        });
        req.user = user;
      } else {
        return res.status(401).send("Invalid Token");
      }
    } catch (err) {
      console.log(
        `🚀 ~ file: authentication.js ~ line 42 ~ verifyToken ~ err`,
        err
      );
      return res.status(401).send("Something went wrong");
    }
    return next();
  };

  return verifyToken;
};
