//utils/pdfGenerator.js
const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs-extra');
const path = require('path');
const numWords = require('num-words');

// Register increment helper
handlebars.registerHelper('increment', (value) => parseInt(value) + 1);
handlebars.registerHelper('multiply', function (a, b) {
  return (parseFloat(a) * parseFloat(b)).toFixed(2);
});
const generatePOPDF = async (poData) => {
  try {
    const poNum = poData.po_num;
    if (!poNum) {
      throw new Error("Missing PO number");
    }

    // ✅ Convert amount to words safely (supports paise)
    // ✅ Convert amount to words safely (supports decimals & checks for null/invalid)
    const total = parseFloat(poData.totals?.grandTotal || poData.total);
    if (!isNaN(total) && isFinite(total)) {
      const rupees = Math.floor(total);
      let amountInWords = `${numWords(rupees)} rupees`;
      poData.amount_in_words = `${amountInWords} only`;
    } else {
      poData.amount_in_words = '-';
    }
    console.log('Total received:', total);



    // Add default values
    poData.vendor_address = poData.vendor_address || 'Not Provided';
    poData.client_address = poData.client_address || 'Not Provided';

    const templatePath = path.join(__dirname, '../templates/po_template.hbs');
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found at: ${templatePath}`);
    }

    const templateHtml = await fs.readFile(templatePath, 'utf8');
    const compiledTemplate = handlebars.compile(templateHtml);
    const html = compiledTemplate(poData);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });

    const pdfFolder = path.join(__dirname, '../pdf');
    if (!fs.existsSync(pdfFolder)) {
      fs.mkdirSync(pdfFolder, { recursive: true });
    }

    const pdfFileName = `po_${poNum.replace(/\.pdf$/, '')}.pdf`;
    const pdfPath = path.posix.join(pdfFolder, pdfFileName);

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
    });

    await browser.close();

    console.log(`✅ PDF generated at path: ${pdfPath}`);
    return pdfPath;
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw error;
  }
};

module.exports = { generatePOPDF };
