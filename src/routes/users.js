const crypto = require("crypto");
const { v4: uuid } = require("uuid");
const { Router } = require("express");
const jwt = require("jsonwebtoken");
const { User, Post } = require("../Tables");
const { ObjectId } = require("mongodb");

module.exports = async ({ app, db, mailer, upload, verifyToken }) => {
  const router = Router();
  router.get("/", async (req, res) => {
    let data = await db.find({
      coll: User,
      filter: {},
      options: {
        projection: { _id: 0, password: 0, forget_code: 0, updatedOn: 0 },
      },
    });

    res.json(data);
  });
  router.get("/get/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    let data = await db.findOne({
      coll: User,
      filter: { _id: ObjectId(id) },
      options: {
        projection: {
          _id: 0,
          password: 0,
          forget_code: 0,
          updatedOn: 0,
          verifyOtp: 0,
        },
      },
    });
    res.json(data || {});
  });
  router.post("/update/:id", async (req, res) => {
    const { id } = req.params || {};
    const { name, email, phone } = req.body || {};
    let user = await db.findOne({ coll: User, filter: { _id: id } });

    if (user) {
      let data = await db.update({
        coll: User,
        filter: { _id: id },
        updateDoc: {
          $set: {
            name: name || user.name,
            email: email || user.email,
            phone: phone || user.phone,
            updatedOn: new Date().toJSON(),
          },
        },
      });
      res.json({ status: "ok", result: data });
    } else {
      res.status(404).send({ staus: "error", message: "User does not exist" });
    }
  });
  router.post("/follow/:id", verifyToken, async (req, res) => {
    const { id } = req.params || {};
    let user = await db.findOne({
      coll: User,
      filter: {
        _id: ObjectId(id),
        followers: {
          _id: ObjectId(req.user._id),
          name: req.user.name,
        },
      },
    });

    if (!user) {
      let user = await db.findOne({
        coll: User,
        filter: {
          _id: ObjectId(id),
        },
      });
      await db.update({
        coll: User,
        filter: { _id: ObjectId(req.user._id) },
        updateDoc: {
          $push: {
            following: {
              _id: ObjectId(user._id),
              name: user.name,
            },
          },
          $set: {
            updatedOn: new Date().toJSON(),
          },
        },
      });
      await db.update({
        coll: User,
        filter: { _id: ObjectId(user._id) },
        updateDoc: {
          $push: {
            followers: {
              _id: ObjectId(req.user._id),
              name: req.user.name,
            },
          },
          $set: {
            updatedOn: new Date().toJSON(),
          },
        },
      });
      let data = await db.findOne({
        coll: User,
        filter: { _id: ObjectId(user._id) },
        options: {
          projection: {
            _id: 0,
            password: 0,
            forget_code: 0,
            updatedOn: 0,
            verifyOtp: 0,
          },
        },
      });

      res.json({ status: "ok", result: data });
    } else {
      res.status.send({ staus: "error", message: "" });
    }
  });
  router.post("/unfollow/:id", verifyToken, async (req, res) => {
    const { id } = req.params || {};
    let user = await db.findOne({
      coll: User,
      filter: {
        _id: ObjectId(id),
        followers: { _id: ObjectId(req.user._id), name: req.user.name },
      },
    });

    if (user) {
      await db.update({
        coll: User,
        filter: { _id: ObjectId(req.user._id) },
        updateDoc: {
          $pull: {
            following: {
              _id: ObjectId(user._id),
              name: user.name,
            },
          },
          $set: {
            updatedOn: new Date().toJSON(),
          },
        },
      });
      await db.update({
        coll: User,
        filter: { _id: ObjectId(user._id) },
        updateDoc: {
          $pull: {
            followers: {
              _id: ObjectId(req.user._id),
              name: req.user.name,
            },
          },
          $set: {
            updatedOn: new Date().toJSON(),
          },
        },
      });
      let data = await db.findOne({
        coll: User,
        filter: { _id: ObjectId(user._id) },
        options: {
          projection: {
            _id: 0,
            password: 0,
            forget_code: 0,
            updatedOn: 0,
            verifyOtp: 0,
          },
        },
      });
      res.json({ status: "ok", result: data });
    } else {
      res.status(404).send({ staus: "error", message: "User does not exist" });
    }
  });
  router.post("/register", async (req, res) => {
    const { name, email, password1, password2, dob, phone } = req.body || {};
    console.log(name, email, password1, password2, dob, phone);
    if (!email) {
      res.json({ status: "error", message: "No email Provided" });
    } else if (!password1 || !password2) {
      res.json({ status: "error", message: "Please Provide both password" });
    } else if (!(password1 === password2 && password1.length >= 8)) {
      res.json({
        status: "error",
        message: "Length Of password must be at least 8 character",
      });
    } else {
      let exists = await db.findOne({
        coll: User,
        filter: { email: email },
        options: {},
      });
      if (exists) {
        res.json({
          status: "error",
          message: "Email Already Exists. Please Login Password",
        });
      } else {
        let passHash = crypto
          .createHash("sha256")
          .update(password1)
          .digest("hex");
        let result = await db.insertOne({
          coll: User,
          doc: {
            name: name,
            email: email,
            password: passHash,
            createdOn: new Date().toJSON(),
            updatedOn: new Date().toJSON(),
            followers: [],
            following: [],
          },
        });
        let user = await db.findOne({
          coll: User,
          filter: { _id: result.insertedId },
          options: {},
        });
        res.json({
          status: "ok",
          message: `Registeration Successfull. Please Login with your email and password`,
        });
      }
    }
  });

  router.post("/login", async (req, res) => {
    const { email = "", password = "" } = req.body || {};
    console.log(email, password);
    let user = await db.findOne({
      coll: User,
      filter: { email: email },
      options: {},
    });
    if (req.user) {
      res.json({
        status: "ok",
        message: "Logged In successfully",
        user: req.user,
      });
    } else if (password.length < 8) {
      res.json({
        status: "error",
        message: "Password Must be at least 8 character long",
      });
    } else if (!user) {
      console.log(user);
      res.json({
        status: "error",
        message: "Invalid Email",
      });
    } else {
      let passHash = crypto.createHash("sha256").update(password).digest("hex");
      console.log(passHash, user.password);
      if (user.password === passHash) {
        const { name, email, dob, verified, phone, _id } = user;
        let token = jwt.sign(
          { name, email, dob, verified, phone, _id },
          process.env.JWT_SECRET
        );
        await db.insertOne({ coll: "userTokens", doc: { token: token } });
        res.json({
          status: "ok",
          message: "Logged In successfully",
          token,
          user: { name, email, dob, verified, phone, _id },
        });
      } else {
        res.json({ status: "error", message: "Invalid or Wrong Password" });
      }
    }
  });

  router.get("/validate", verifyToken, async (req, res) => {
    if (req.user) {
      res.json({
        status: "ok",
        message: "Token Valid",
        user: req.user,
      });
    } else {
      res.send({
        status: "error",
        message: "Token Invalid",
      });
    }
  });

  router.get("/logout", verifyToken, async (req, res) => {
    const { token } = req.query;
    if (req.user) {
      await db.deleteOne({ coll: "userTokens", filter: { token: token } });
      res.json({
        status: "ok",
        message: "Logout Successfully",
      });
    } else {
      res.json({
        status: "error",
        message: "Token Invalid",
      });
    }
  });
  router.delete("/delete/:id", verifyToken, async (req, res) => {
    const { id } = req.user._id;
    let data = await db.deleteOne({
      coll: User,
      filter: { _id: id },
      options: {},
    });
    res.json({ status: "ok", message: result });
  });
  return router;
};
