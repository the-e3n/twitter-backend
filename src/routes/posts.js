const { ObjectId } = require("mongodb");
const { Router } = require("express");
const fs = require("fs");
const { Post, User } = require("../Tables");

module.exports = async ({ app, db, project_root, upload, verifyToken }) => {
  const router = Router();
  router.get("/", verifyToken, async (req, res) => {
    let posts = await db.find({
      coll: Post,
      filter: {},
      options: { sort: { postedOn: -1 } },
    });
    res.json(posts);
  });
  router.get("/following", verifyToken, async (req, res) => {
    let userIds = req.user.following.map(({ _id }) => ObjectId(_id));
    console.log(
      `🚀 ~ file: posts.js ~ line 18 ~ router.get ~ userIds`,
      userIds
    );
    let posts = await db.find({
      coll: Post,
      filter: {
        "user._id": { $in: [...userIds, req.user._id] },
      },
      options: { sort: { postedOn: -1 } },
    });
    res.json(posts);
  });

  router.get("/post", verifyToken, async (req, res) => {
    const { postid } = req.query || {};
    let post = await db.findOne({
      coll: Post,
      filter: { _id: postid },
      options: {},
    });
    res.json(post);
  });
  router.post("/create", verifyToken, async (req, res) => {
    const { message } = req.body || {};
    let userid = req.user._id;
    let user = await db.findOne({
      coll: User,
      filter: { _id: userid },
      options: {},
    });
    if (!message) {
      res.json({
        status: "error",
        message: "Message is required",
      });
    }
    let result = await db.insertOne({
      coll: Post,
      doc: {
        message: message,
        user: {
          _id: ObjectId(user._id),
          name: user.name,
          email: user.email,
        },
        postedOn: new Date().toJSON(),
        likes: [],
        likeCount: 0,
      },
    });
    res.json({ status: "ok", result: result, message: "New Post Saved" });
  });
  router.get("/like", verifyToken, async (req, res) => {
    const { postid, type } = req.query || {};
    let user = req.user;
    let post = await db.findOne({
      coll: Post,
      filter: {
        _id: ObjectId(postid),
        likes: { _id: ObjectId(user._id), name: user.name },
      },
      options: {},
    });
    console.log(`🚀 ~ file: posts.js ~ line 67 ~ router.get ~ post`, post);
    if (post) {
      res.json({ status: "error", message: "Already Liked" });
    } else {
      let user = req.user;
      let result = await db.update({
        coll: Post,
        filter: { _id: ObjectId(postid) },
        updateDoc: {
          $push: {
            likes: {
              _id: user._id,
              name: user.name,
            },
          },
          $inc: {
            likeCount: 1,
          },
        },
      });
      res.json({ status: "ok", message: "New Like Added", result: result });
    }
  });
  router.get("/dislike", verifyToken, async (req, res) => {
    const { postid } = req.query || {};
    let user = req.user;
    let post = await db.findOne({
      coll: Post,
      filter: {
        _id: ObjectId(postid),
        likes: { _id: user._id, name: user.name },
      },
      options: {},
    });
    if (post) {
      let result = await db.update({
        coll: Post,
        filter: { _id: ObjectId(postid) },
        updateDoc: {
          $pull: { likes: { _id: user._id } },
          $inc: { likeCount: -1 },
        },
      });
      res.json({
        status: "ok",
        message: `Like Removed for User: ${user._id} on Post: ${postid}`,
        result: result,
      });
    } else {
      res.json({ status: "error", message: "Not Liked" });
    }
  });

  router.delete("/delete", verifyToken, async (req, res) => {
    const { postid } = req.query || {};
    let post = await db.findOne({
      coll: Post,
      filter: { _id: postid },
      options: {},
    });
    if (post) {
      let result = db.delete({ coll: Post, filter: { _id: id } });
      res.json({ status: "ok", message: "Post deleted successfully" });
    } else {
      res.json({ status: "error", message: "Invalid Post ID" });
    }
  });
  return router;
};
