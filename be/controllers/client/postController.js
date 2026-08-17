const Post = require("../../models/Post");

exports.getPosts = async (req, res) => {
  try {
    const { search = "", category_id = "", sort = "latest", page = 1, limit = 6 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const catId = category_id && category_id !== "all" ? parseInt(category_id, 10) : null;

    const rows = await Post.getClientList({ search, category_id: catId, sort, page: pageNum, limit: limitNum });
    const total = await Post.countClientList({ search, category_id: catId });

    res.json({ success: true, data: { posts: rows, pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } } });
  } catch (err) { console.log(err); res.status(500).json({ success: false, message: err.message }); }
};

exports.getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    await Post.incrementView(id);
    const post = await Post.getClientDetail(id);
    if (!post) return res.status(404).json({ success: false, message: "Không tìm thấy bài viết" });
    
    if (post.excerpt) {
      post.excerpt = post.excerpt.replace(/<[^>]+>|&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    }
    res.json({ success: true, data: post });
  } catch (err) { console.log(err); res.status(500).json({ success: false, message: err.message }); }
};