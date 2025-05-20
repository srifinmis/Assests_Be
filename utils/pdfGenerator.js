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
handlebars.registerHelper("formatCurrency", function (number) {
  if (!number) return "0";
  return parseFloat(number).toLocaleString("en-IN", { minimumFractionDigits: 2 });
});
handlebars.registerHelper("formatDateWithMonth", function (dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
});

const generatePOPDF = async (poData) => {
  try {
    const poNum = poData.po_num;
    if (!poNum) {
      throw new Error("Missing PO number");
    }

    // ✅ Convert amount to words safely (supports paise)
    const total = parseFloat(poData.totals?.grandTotal || poData.total);
    if (!isNaN(total) && isFinite(total)) {
      const rupees = Math.floor(total);
      let amountInWords = `${numWords(rupees)} rupees`;
      poData.amount_in_words = `${amountInWords} only`;
    } else {
      poData.amount_in_words = '-';
    }

    // Add default values
    poData.vendor_address = poData.vendor_address || 'Not Provided';
    poData.client_address = poData.client_address || 'Not Provided';

    const companypath = path.join(__dirname, '../../Assests_FE/src/assets/srifin_final.svg');
    const imagePath = path.join(__dirname, '../templates/Esign.png');
    const imageData = await fs.readFile(imagePath);
    const companyData = await fs.readFile(companypath);
    const base64Image = `data:image/png;base64,${imageData.toString('base64')}`;
    const base64CompanyImage = `data:image/svg+xml;base64,${companyData.toString('base64')}`;  // Note: svg uses 'image/svg+xml'

    poData.image_path = base64Image;
    poData.company_path = base64CompanyImage;

    const templatePath = path.join(__dirname, '../templates/po_template.hbs');

    if (!await fs.pathExists(templatePath)) {
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

    // Create pdf directory if it doesn't exist
    const pdfFolder = path.join(__dirname, 'pdf');
    await fs.ensureDir(pdfFolder);

    // Sanitize poNum for filename
    const sanitizedPONum = poNum.replace(/[^a-zA-Z0-9-]/g, "-");
    const pdfFileName = `po_${sanitizedPONum}.pdf`;
    const pdfPath = path.join(pdfFolder, pdfFileName);

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
    });

    await browser.close();

    return pdfPath;
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw error;
  }
};

module.exports = { generatePOPDF };
