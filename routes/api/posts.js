const express = require("express");
const router = express.Router();

const auth = require("../../middleware/auth");

const User = require("../../models/User");

const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const Post = require("../../models/Post");

// @route   POST api/posts
// @desc    Create a new post
// @access  Private
router.post(
  "/",
  [auth, [body("text", "Text is required").not().isEmpty()]],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.user.id).select("-password");
      const newPost = new Post({
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id,
      });

      const post = await newPost.save();
      res.json(post);
    } catch (error) {
      console.log(error.message);
      res.status(500).send("server error");
    }
  }
);

// @route   GET api/posts
// @desc    Get all posts
// @access  Private

router.get("/", auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });

    res.json(posts);
  } catch (error) {
    console.log(error.message);
    res.status(500).send("server error");
  }
});

// @route   GET api/posts
// @desc    Get post by id
// @access  Private

router.get("/:post_id", auth, async (req, res) => {
  try {
    const posts = await Post.findById(req.params.post_id);
    if (!posts) {
      return res.status(404).send({ msg: "post not found" });
    }
    res.json(posts);
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).send({ msg: "post not found" });
    }
    console.log(error.message);
    res.status(500).send("server error");
  }
});

// @route   GET api/posts
// @desc    delete post by id
// @access  Private

router.delete("/:post_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);
    if (!post) {
      return res.status(404).send({ msg: "post not found" });
    }
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "user not authorized" });
    }
    await post.remove();

    res.json({ msg: "post removed" });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).send({ msg: "post not found" });
    }
    console.log(error.message);
    res.status(500).send("server error");
  }
});

// @route   PUT api/posts/like/:post_id
// @desc    like a post
// @access  Private

router.put("/like/:post_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);
    //   check if post has already been liked
    if (
      post.likes.filter((like) => like.user.toString() === req.user.id).length >
      0
    ) {
      return res.status(400).send({ msg: "post already liked" });
    }

    post.likes.unshift({ user: req.user.id });

    await post.save();
    res.json(post.likes);
  } catch (error) {
    console.log(error.message);
    res.status(500).send("server error");
  }
});

// @route   PUT api/posts/unlike/:post_id
// @desc    unlike a post
// @access  Private

router.put("/unlike/:post_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);
    //   check if post has not been liked yet
    if (
      post.likes.filter((like) => like.user.toString() === req.user.id)
        .length === 0
    ) {
      return res.status(400).send({ msg: "post has not been liked yet" });
    }

    //   get removed index

    const removeIdx = post.likes
      .map((like) => like.user.toString())
      .indexOf(req.user.id);
    post.likes.splice(removeIdx, 1);

    await post.save();
    res.json(post.likes);
  } catch (error) {
    console.log(error.message);
    res.status(500).send("server error");
  }
});

// @route   POST api/posts/comment/:post_id
// @desc    Create a comment on a post
// @access  Private
router.post(
  "/comment/:post_id",
  [auth, [body("text", "Text is required").not().isEmpty()]],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.user.id).select("-password");
      const post = await Post.findById(req.params.post_id);
      const newComment = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id,
      };

      post.comments.unshift(newComment);

      await post.save();

      res.json(post.comments);
    } catch (error) {
      console.log(error.message);
      res.status(500).send("server error");
    }
  }
);

// @route   DELETE api/posts/comment/:post_id/cmt_id
// @desc    delete comment of a post
// @access  Private

router.delete("/comment/:post_id/:cmt_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);
    // get comment from post
    const comment = post.comments.find(
      (comment) => comment.id === req.params.cmt_id
    );
    if (!comment) {
      return res.status(404).send({ msg: "no comment for this post" });
    }
    // check owner user

    if (comment.user.toString() !== req.user.id) {
      return res.status(401).send({ msg: "user not authorized" });
    }
    //   get removed index

    const removeIdx = post.comments
      .map((comment) => comment.user.toString())
      .indexOf(req.user.id);
    post.comments.splice(removeIdx, 1);

    await post.save();
    res.json(post.comments);
  } catch (error) {
    console.log(error.message);
    res.status(500).send("server error");
  }
});

module.exports = router;
