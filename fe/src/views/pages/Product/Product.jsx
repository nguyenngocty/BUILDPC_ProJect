import { Link } from "react-router-dom";

import "./Product.css";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import ProductToolbar from "../../components/Products/ProductToolbar";
import ProductSidebar from "../../components/Products/ProductSidebar";
import ProductPagination from "../../components/Products/ProductPagination";
import ProductCard from "../../components/Products/ProductCard";
import ProductSkeleton from "../../components/Products/ProductSkeleton";
import ProductEmpty from "../../components/Products/ProductEmpty";

import useClientProducts from "../../../hooks/useClientProducts";

function Products() {
  const {
    products,
    filters,
    filterData,
    pagination,

    searchInput,
    setSearchInput,

    loading,
    error,

    updateFilters,
    setPage,
    clearFilters,
    refresh,
  } = useClientProducts();

  return (
    <section className="products-page">
      <Header />

      <div className="products-breadcrumb">
        <div className="products-shell">
          <Link to="/">Trang chủ</Link>

          <span>/</span>

          <span>Sản phẩm</span>
        </div>
      </div>

      <main className="products-shell">
        <header className="products-header">
          <div>
            <h1>Danh sách sản phẩm</h1>

            <p>
              Khám phá linh kiện và thiết bị máy tính chính hãng phù hợp với nhu
              cầu của bạn.
            </p>
          </div>
        </header>

        <div className="products-layout">
          <ProductSidebar
            filters={filters}
            filterData={filterData}
            updateFilters={updateFilters}
            clearFilters={clearFilters}
          />

          <div className="products-content">
            <ProductToolbar
              filters={filters}
              pagination={pagination}
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              updateFilters={updateFilters}
            />

            {error && (
              <div className="products-error">
                <i className="bi bi-exclamation-triangle"></i>

                <div>
                  <strong>Không thể tải sản phẩm</strong>

                  <p>{error}</p>
                </div>

                <button type="button" onClick={refresh}>
                  Thử lại
                </button>
              </div>
            )}

            {!error && (
              <>
                {loading ? (
                  <div className="products-grid">
                    {Array.from({
                      length: 9,
                    }).map((_, index) => (
                      <ProductSkeleton key={index} />
                    ))}
                  </div>
                ) : products.length > 0 ? (
                  <div className="products-grid">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <ProductEmpty onClear={clearFilters} />
                )}

                {!loading && products.length > 0 && (
                  <ProductPagination
                    pagination={pagination}
                    onPageChange={setPage}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </section>
  );
}

export default Products;
