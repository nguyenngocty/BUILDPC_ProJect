import os

# =========================================================
# CẤU HÌNH
# =========================================================

OUTPUT_FILE = "project_structure_be_fe.txt"

# Tên thư mục Backend / Frontend có thể gặp
BACKEND_CANDIDATES = [
    "be",
    "backend",
    "server",
]

FRONTEND_CANDIDATES = [
    "fe",
    "frontend",
    "client",
    "web",
]

# Các thư mục KHÔNG cần hiện trong cấu trúc
EXCLUDE_DIRS = {
    # Dependencies
    "node_modules",
    "vendor",
    "venv",
    ".venv",
    "env",

    # Git / IDE
    ".git",
    ".svn",
    ".idea",
    ".vscode",

    # Build
    "dist",
    "build",
    ".next",
    ".nuxt",
    ".output",
    "out",
    "target",

    # Cache
    "__pycache__",
    ".cache",
    ".turbo",
    "coverage",

    # Upload / generated files
    "uploads",

    # OS
    "$RECYCLE.BIN",
    "System Volume Information",
}

# Các file không cần liệt kê
EXCLUDE_FILES = {
    OUTPUT_FILE,

    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",

    ".DS_Store",
    "Thumbs.db",
}


# =========================================================
# HELPER
# =========================================================

def should_skip_dir(dirname):
    """
    Kiểm tra thư mục có cần bỏ qua không.
    """
    return (
        dirname in EXCLUDE_DIRS
        or dirname.startswith(".git")
    )


def should_skip_file(filename):
    """
    Kiểm tra file có cần bỏ qua không.
    """
    return filename in EXCLUDE_FILES


def find_project_folder(project_root, candidates):
    """
    Tìm folder BE hoặc FE dựa trên danh sách tên phổ biến.
    """
    for name in candidates:
        path = os.path.join(
            project_root,
            name
        )

        if os.path.isdir(path):
            return path

    return None


def generate_tree(
    root_path,
    prefix=""
):
    """
    Sinh cây thư mục dạng:

    ├── controllers/
    │   ├── client/
    │   │   └── productController.js
    └── models/
        └── Product.js
    """

    try:
        items = os.listdir(
            root_path
        )
    except (
        PermissionError,
        FileNotFoundError
    ):
        return ""

    # Bỏ thư mục/file không cần
    filtered_items = []

    for item in items:

        full_path = os.path.join(
            root_path,
            item
        )

        if os.path.isdir(full_path):

            if should_skip_dir(
                item
            ):
                continue

        else:

            if should_skip_file(
                item
            ):
                continue

        filtered_items.append(
            item
        )

    # Folder trước, file sau
    filtered_items.sort(
        key=lambda item: (
            not os.path.isdir(
                os.path.join(
                    root_path,
                    item
                )
            ),
            item.lower(),
        )
    )

    tree = ""

    for index, item in enumerate(
        filtered_items
    ):

        full_path = os.path.join(
            root_path,
            item
        )

        is_last = (
            index ==
            len(filtered_items) - 1
        )

        connector = (
            "└── "
            if is_last
            else "├── "
        )

        tree += (
            f"{prefix}"
            f"{connector}"
            f"{item}"
        )

        if os.path.isdir(
            full_path
        ):
            tree += "/\n"

            child_prefix = (
                prefix
                + (
                    "    "
                    if is_last
                    else "│   "
                )
            )

            tree += generate_tree(
                full_path,
                child_prefix
            )

        else:
            tree += "\n"

    return tree


def count_structure(root_path):
    """
    Đếm tổng folder và file.
    """

    folder_count = 0
    file_count = 0

    for root, dirs, files in os.walk(
        root_path
    ):

        # Bỏ folder không cần
        dirs[:] = [
            d
            for d in dirs
            if not should_skip_dir(d)
        ]

        folder_count += len(
            dirs
        )

        valid_files = [
            f
            for f in files
            if not should_skip_file(f)
        ]

        file_count += len(
            valid_files
        )

    return (
        folder_count,
        file_count
    )


# =========================================================
# MAIN
# =========================================================

def main():

    script_dir = os.path.dirname(
        os.path.abspath(__file__)
    )

    project_root = script_dir

    backend_root = find_project_folder(
        project_root,
        BACKEND_CANDIDATES
    )

    frontend_root = find_project_folder(
        project_root,
        FRONTEND_CANDIDATES
    )

    output_path = os.path.join(
        project_root,
        OUTPUT_FILE
    )

    print()
    print("=" * 70)
    print("🔍 ĐANG QUÉT CẤU TRÚC PROJECT")
    print("=" * 70)

    print(
        f"📁 Project root: "
        f"{project_root}"
    )

    if backend_root:
        print(
            f"✅ Backend: "
            f"{backend_root}"
        )
    else:
        print(
            "❌ Không tìm thấy Backend"
        )

    if frontend_root:
        print(
            f"✅ Frontend: "
            f"{frontend_root}"
        )
    else:
        print(
            "❌ Không tìm thấy Frontend"
        )

    with open(
        output_path,
        "w",
        encoding="utf-8"
    ) as outfile:

        # =================================================
        # HEADER
        # =================================================

        outfile.write(
            "=" * 90 + "\n"
        )

        outfile.write(
            "BUILDPC DATN - PROJECT STRUCTURE\n"
        )

        outfile.write(
            "=" * 90 + "\n\n"
        )

        outfile.write(
            f"Project root:\n"
            f"{project_root}\n\n"
        )

        # =================================================
        # BACKEND
        # =================================================

        outfile.write(
            "=" * 90 + "\n"
        )

        outfile.write(
            "BACKEND STRUCTURE\n"
        )

        outfile.write(
            "=" * 90 + "\n\n"
        )

        if backend_root:

            backend_name = os.path.basename(
                backend_root
            )

            outfile.write(
                f"{backend_name}/\n"
            )

            outfile.write(
                generate_tree(
                    backend_root
                )
            )

            be_dirs, be_files = (
                count_structure(
                    backend_root
                )
            )

            outfile.write(
                "\n"
            )

            outfile.write(
                f"Backend folders: "
                f"{be_dirs}\n"
            )

            outfile.write(
                f"Backend files: "
                f"{be_files}\n"
            )

        else:

            outfile.write(
                "NOT FOUND\n"
            )

        # =================================================
        # FRONTEND
        # =================================================

        outfile.write(
            "\n\n"
        )

        outfile.write(
            "=" * 90 + "\n"
        )

        outfile.write(
            "FRONTEND STRUCTURE\n"
        )

        outfile.write(
            "=" * 90 + "\n\n"
        )

        if frontend_root:

            frontend_name = os.path.basename(
                frontend_root
            )

            outfile.write(
                f"{frontend_name}/\n"
            )

            outfile.write(
                generate_tree(
                    frontend_root
                )
            )

            fe_dirs, fe_files = (
                count_structure(
                    frontend_root
                )
            )

            outfile.write(
                "\n"
            )

            outfile.write(
                f"Frontend folders: "
                f"{fe_dirs}\n"
            )

            outfile.write(
                f"Frontend files: "
                f"{fe_files}\n"
            )

        else:

            outfile.write(
                "NOT FOUND\n"
            )

        # =================================================
        # SRC FRONTEND RIÊNG
        # =================================================

        if frontend_root:

            src_path = os.path.join(
                frontend_root,
                "src"
            )

            if os.path.isdir(
                src_path
            ):

                outfile.write(
                    "\n\n"
                )

                outfile.write(
                    "=" * 90 + "\n"
                )

                outfile.write(
                    "FRONTEND SRC STRUCTURE "
                    "(ƯU TIÊN CHO CHATGPT)\n"
                )

                outfile.write(
                    "=" * 90 + "\n\n"
                )

                outfile.write(
                    "src/\n"
                )

                outfile.write(
                    generate_tree(
                        src_path
                    )
                )

    print()
    print("=" * 70)
    print("🎉 HOÀN THÀNH")
    print("=" * 70)

    print(
        f"📄 File kết quả:\n"
        f"{output_path}"
    )

    print()

    if backend_root:

        be_dirs, be_files = (
            count_structure(
                backend_root
            )
        )

        print(
            f"🔵 Backend:"
            f" {be_dirs} folders,"
            f" {be_files} files"
        )

    if frontend_root:

        fe_dirs, fe_files = (
            count_structure(
                frontend_root
            )
        )

        print(
            f"🟢 Frontend:"
            f" {fe_dirs} folders,"
            f" {fe_files} files"
        )

    print()
    print(
        "👉 Copy nội dung file "
        f"{OUTPUT_FILE} "
        "và gửi cho ChatGPT."
    )

    print("=" * 70)


if __name__ == "__main__":
    main()