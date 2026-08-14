const fs = require("fs");
const path = require("path");

const deleteFile = (filePath) => {
  if (!filePath) return;

  const fullPath = path.join(__dirname, "..", filePath.replace(/^\//, ""));

  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

const deleteUploadedFiles = (files = []) => {
  files.forEach((file) => {
    if (!file?.path) return;

    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  });
};

module.exports = {
  deleteFile,
  deleteUploadedFiles,
};
