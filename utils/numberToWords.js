const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const teens = ["", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const thousands = ["", "Thousand", "Million", "Billion", "Trillion"];

const convertToWords = (num) => {
  if (num === 0) return "Zero";

  const getChunkWords = (chunk) => {
    let chunkWords = "";
    if (chunk >= 100) {
      chunkWords += units[Math.floor(chunk / 100)] + " Hundred ";
      chunk %= 100;
    }
    if (chunk >= 11 && chunk <= 19) {
      chunkWords += teens[chunk - 10] + " ";
    } else {
      chunkWords += tens[Math.floor(chunk / 10)] + " ";
      chunkWords += units[chunk % 10] + " ";
    }
    return chunkWords;
  };

  let words = "";
  let chunkIndex = 0;

  while (num > 0) {
    let chunk = num % 1000;
    if (chunk) {
      words = getChunkWords(chunk) + thousands[chunkIndex] + " " + words;
    }
    num = Math.floor(num / 1000);
    chunkIndex++;
  }

  return words.trim();
};

module.exports = { convertToWords };
