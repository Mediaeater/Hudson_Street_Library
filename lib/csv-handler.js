const fs = require("fs");
const { parse } = require("csv-parse");

const readBooks = (filePath) => {
  return new Promise((resolve, reject) => {
    const data = [];
    fs.createReadStream(filePath)
      .pipe(parse({
        columns: true,
        trim: true,
        relax_column_count: true,
        skip_empty_lines: true,
        relax_quotes: true
      }))
      .on("data", (row) => {
        data.push(row);
      })
      .on("end", () => {
        resolve(data);
      })
      .on("error", (err) => {
        reject(err);
      });
  });
};

module.exports = {
  readBooks,
};
