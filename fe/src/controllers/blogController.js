import blogs from "../models/BlogModel";

export const getFeaturedBlogs = () => {
  return blogs.filter((item) => item.featured);
};

export const getPopularBlogs = () => {
  return [...blogs].sort((a, b) => b.views - a.views).slice(0, 5);
};

export const getCategories = () => {
  return ["Tất cả", "CPU", "GPU", "RAM", "SSD", "Monitor", "Build PC"];
};

export const filterBlogs = (search, category) => {
  return blogs.filter((blog) => {
    const matchSearch = blog.title.toLowerCase().includes(search.toLowerCase());

    const matchCategory = category === "Tất cả" || blog.category === category;

    return matchSearch && matchCategory;
  });
};

export const getCategoryCount = () => {
  const categories = {};

  blogs.forEach((blog) => {
    categories[blog.category] = (categories[blog.category] || 0) + 1;
  });

  return categories;
};

export const getPopularTags = () => {
  return [
    "CPU",
    "GPU",
    "Intel",
    "AMD",
    "RTX",
    "Gaming",
    "DDR5",
    "Build PC",
    "SSD",
    "Monitor",
  ];
};

export const searchBlogs = (data, keyword) => {
  if (!keyword) return data;

  const key = keyword.toLowerCase();

  return data.filter((blog) => {
    return (
      blog.title.toLowerCase().includes(key) ||
      blog.desc.toLowerCase().includes(key) ||
      blog.category.toLowerCase().includes(key)
    );
  });
};

export const filterByCategory = (data, category) => {
  if (!category || category === "Tất cả") return data;

  return data.filter((blog) => blog.category === category);
};

export const getAllBlogs = () => {
  return blogs;
};

export const sortBlogs = (data, type = "latest") => {
  const sorted = [...data];

  switch (type) {
    case "views":
      return sorted.sort((a, b) => b.views - a.views);

    case "oldest":
      return sorted.sort((a, b) => new Date(a.date) - new Date(b.date));

    case "latest":
    default:
      return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
};

export const paginateBlogs = (data, page, perPage) => {
  const start = (page - 1) * perPage;
  const end = start + perPage;

  return data.slice(start, end);
};

export const getProcessedBlogs = ({
  search,
  category,
  sort,
  page,
  perPage,
}) => {
  let result = blogs;

  // 1. search
  result = searchBlogs(result, search);

  // 2. filter
  result = filterByCategory(result, category);

  // 3. sort
  result = sortBlogs(result, sort);

  const total = result.length;

  // 4. paginate
  const paginated = paginateBlogs(result, page, perPage);

  return {
    data: paginated,
    total,
  };
};
