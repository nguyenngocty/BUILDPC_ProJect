import { useEffect, useMemo, useState } from "react";

import { getProductImageUrl } from "../../../utils/productClient";

function ProductGallery({ product, gallery = [] }) {
  const images = useMemo(() => {
    const result = [];

    const seen = new Set();

    const addImage = (image) => {
      if (!image?.image_url || seen.has(image.image_url)) {
        return;
      }

      seen.add(image.image_url);

      result.push(image);
    };

    gallery.forEach(addImage);

    if (result.length === 0 && product?.thumbnail) {
      addImage({
        id: null,
        image_url: product.thumbnail,
        sort_order: 0,
        is_thumbnail: true,
      });
    }

    return result;
  }, [gallery, product?.thumbnail]);

  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    setCurrentImage(0);
  }, [product?.id]);

  const activeImage = images[currentImage] || images[0];

  return (
    <section className="gallery">
      <div className="gallery-sidebar">
        {images.map((image, index) => (
          <button
            key={image.id ?? `${image.image_url}-${index}`}
            type="button"
            className={`gallery-thumb ${
              currentImage === index ? "gallery-thumb-active" : ""
            }`}
            onClick={() => setCurrentImage(index)}
          >
            <img
              src={getProductImageUrl(image.image_url)}
              alt={`${product.name} ${index + 1}`}
              onError={(event) => {
                event.currentTarget.src = "/images/no-image.png";
              }}
            />
          </button>
        ))}
      </div>

      <div className="gallery-preview">
        <img
          key={activeImage?.image_url}
          src={getProductImageUrl(activeImage?.image_url || product.thumbnail)}
          alt={product.name}
          onError={(event) => {
            event.currentTarget.src = "/images/no-image.png";
          }}
        />

        {product.discount_percent > 0 && (
          <span className="pd-gallery-sale">-{product.discount_percent}%</span>
        )}
      </div>
    </section>
  );
}

export default ProductGallery;
