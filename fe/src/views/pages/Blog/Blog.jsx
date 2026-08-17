import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import BlogHero from "../../components/Blog/BlogHero";
import BlogSearch from "../../components/Blog/BlogSearch";
import FeaturedPosts from "../../components/Blog/FeaturedPosts";
import CategorySidebar from "../../components/Blog/CategorySidebar";
import PopularPosts from "../../components/Blog/PopularPosts";
import BlogCard from "../../components/Blog/BlogCard";
import Pagination from "../../components/Blog/Pagination";
import { getBlogs } from "../../../services/postService";
import categoryService from "../../../services/categoryService";
import "./Blog.css";

function Blog() {
  const [blogs, setBlogs] = useState([]);
  const [popularBlogs, setPopularBlogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [sort, setSort] = useState("latest");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [categoryList, setCategoryList] = useState([]);
  const perPage = 6;
  
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryService.getCategories({ status: 1 });
        setCategoryList([{ id: "all", name: "Tất cả" }, ...(res.data || [])]);
      } catch (err) {
        console.error("Lỗi tải danh mục", err);
        setCategoryList([{ id: "all", name: "Tất cả" }]);
      }
    };
    fetchCategories();
    loadPopularPosts();
  }, []);

  const loadPopularPosts = async () => {
    try {
      // Gọi API lấy Top bài xem nhiều
      const res = await getBlogs({
        sort: "views",
        page: 1,
        limit: 5
      });
      const rows = res.data.data.posts || [];
      
      // ✅ QUAN TRỌNG: Tự sắp xếp lại theo lượt xem giảm dần để đảm bảo thứ hạng đúng 100%
      rows.sort((a, b) => (b.views || 0) - (a.views || 0));

      // Cắt lấy tối đa 5 bài
      const newPopular = rows.slice(0, 5).map((item) => ({
        id: item.id,
        title: item.title,
        slug: item.slug,
        image: item.thumbnail ? `http://localhost:5000${item.thumbnail}` : "https://placehold.co/600x400?text=No+Image",
        category: item.category_name || "Chưa phân loại",
        date: new Date(item.created_at).toLocaleDateString("vi-VN"),
        views: item.views || 0,
        featured: item.is_featured === 1,
        desc: item.excerpt,
        content: item.content,
        author: item.author_name || "Ẩn danh"
      }));
      setPopularBlogs(newPopular);
    } catch (err) {
      console.error("Lỗi load bài xem nhiều:", err);
    }
  };

  const loadBlogs = async () => {
    try {
      setLoading(true);
      const res = await getBlogs({
        search,
        category_id: categoryId,
        sort,
        page,
        limit: perPage,
      });

      const rows = res.data.data.posts || [];
      const newBlogs = rows.map((item) => ({
        id: item.id,
        title: item.title,
        slug: item.slug,
        image: item.thumbnail ? `http://localhost:5000${item.thumbnail}` : "https://placehold.co/600x400?text=No+Image",
        category: item.category_name || "Chưa phân loại",
        date: new Date(item.created_at).toLocaleDateString("vi-VN"),
        views: item.views || 0,
        featured: item.is_featured === 1,
        desc: item.excerpt,
        content: item.content,
        author: item.author_name || "Ẩn danh"
      }));

      setBlogs(newBlogs);
      setTotal(res.data.data.pagination.total || 0);
    } catch (err) {
      console.error("Load blogs error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, [search, categoryId, sort, page]);

  const sidebarCategories = categoryList.map((cat) => cat.name);
  const counts = {};
  blogs.forEach((item) => { counts[item.category] = (counts[item.category] || 0) + 1; });
  const featuredBlogs = blogs.slice(0, 3);

  return (
    <>
      <Header />
      <div className="blogs-breadcrumb">
        <div className="container">
          <Link to="/">Trang chủ</Link> <span>/</span> <span>Bài viết</span>
        </div>
      </div>
      <BlogHero />
      <div className="blog-wrapper">
        <aside>
          <CategorySidebar categories={sidebarCategories} category={categoryList.find(c => c.id === categoryId)?.name || "Tất cả"} setCategory={(name) => { const found = categoryList.find((c) => c.name === name); setCategoryId(found ? found.id : "all"); setPage(1); }} counts={counts} />
          <PopularPosts blogs={popularBlogs} />
        </aside>
        <main>
          <div className="blog-sort">
            <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
              <option value="latest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="views">Xem nhiều</option>
            </select>
          </div>
          <FeaturedPosts blogs={featuredBlogs} />
          <BlogSearch search={search} setSearch={(value) => { setSearch(value); setPage(1); }} category={categoryList.find(c => c.id === categoryId)?.name || "Tất cả"} setCategory={(name) => { const found = categoryList.find((c) => c.name === name); setCategoryId(found ? found.id : "all"); setPage(1); }} categories={sidebarCategories} />
          <div className="blog-grid">
            {loading ? (
              <div className="blog-empty"><h3>Đang tải dữ liệu...</h3></div>
            ) : blogs.length > 0 ? (
              blogs.map((blog) => <BlogCard key={blog.id} blog={blog} />)
            ) : (
              <div className="blog-empty"><h3>Không tìm thấy bài viết</h3><p>Hãy thử từ khóa hoặc danh mục khác.</p></div>
            )}
          </div>
          <Pagination total={total} current={page} perPage={perPage} setCurrent={setPage} />
        </main>
      </div>
      <Footer />
    </>
  );
}
export default Blog;