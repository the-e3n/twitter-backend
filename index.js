//imports
require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const logger = require("morgan");
const app = express();

//added routes
let run = async () => {
  const db = await require("./src/MongoDB").setupDatabase({
    uri: process.env.MONGO_URL || "mongodb://localhost:27017",
    dbName: "twitter",
    projectDir: __dirname,
  });

  const verifyToken = require("./src/authentication")(db);
  const postRouter = await require("./src/routes/posts")({
    app,
    db,
    project_root: __dirname,
    verifyToken,
  });
  const userRouter = await require("./src/routes/users")({
    app,
    db,
    verifyToken,
  });
  // const upload = require("./routes/upload");
  app.use("/api/posts", postRouter);
  app.use("/api/users", userRouter);
};

//middleware setup
app.use(logger("dev"));
app.use(cors({}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

run();
app.listen(process.env.PORT || 5000);
