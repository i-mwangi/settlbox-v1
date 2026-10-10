import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { DemoData } from "../../presentation/contexts/DemoProvider";
import { formatInvoiceAmount as money, formatInvoiceDate as date } from "../../types/invoice-format.ts";

export async function renderWorkspacePdf(data: DemoData, id: string): Promise<Uint8Array> {
  const invoice = data.invoices.find(row => row.uuid === id);
  const bill = data.bills.find(row => row.uuid === id);
  if (!invoice && !bill) throw new Error("Document record not found");
  const linked = invoice || data.invoices.find(row => row.uuid === bill?.invoiceUuid);
  const number = invoice?.invoiceNumber || `BILL-${bill!.id}`;
  const issuer = invoice?.from || bill!.vendor;
  const recipient = invoice?.to || data.company.companyName;
  const amount = invoice?.amountExact || bill?.amountExact || String(invoice?.amount ?? bill!.amount);
  const wallet = [invoice?.recipient, bill?.recipient, ...data.accounts.map(account => account.accountId)].find(address => address && /^0x[0-9a-fA-F]{40}$/.test(address)) || "";
  const items = linked?.items || [{ description: bill!.description, quantity: 1, unitPrice: bill!.amount }];
  const document = await PDFDocument.create();
  document.setTitle(number);
  document.setAuthor("Settlbox");
  const font = await document.embedFont(StandardFonts.Courier);
  const bold = await document.embedFont(StandardFonts.CourierBold);
  const dark = rgb(0.09, 0.09, 0.09), gray = rgb(0.48, 0.48, 0.48), border = rgb(0.88, 0.88, 0.88);
  let page = document.addPage([595.28, 841.89]);
  let y = 748;
  const clean = (value: string) => value.replace(/[^\x20-\x7e\n]/g, "?");
  function text(value: string, x: number, top: number, size = 9, strong = false, muted = false) {
    page.drawText(clean(value), { x, y: top, size, font: strong ? bold : font, color: muted ? gray : dark });
  }
  function right(value: string, edge: number, top: number, strong = false) { text(value, edge - (strong ? bold : font).widthOfTextAtSize(clean(value), 9), top, 9, strong); }
  function wrap(value: string, width: number, size = 9) {
    const lines: string[] = [];
    for (const paragraph of clean(value).split("\n")) {
      let rest = paragraph;
      do {
        let length = Math.min(rest.length, Math.floor(width / (size * 0.6)));
        if (length < rest.length && rest.lastIndexOf(" ", length) > 0) length = rest.lastIndexOf(" ", length);
        lines.push(rest.slice(0, length)); rest = rest.slice(length).trimStart();
      } while (rest.length);
    }
    return lines;
  }
  function rule(top: number) { page.drawLine({ start: { x: 40, y: top }, end: { x: 555, y: top }, thickness: 0.6, color: border }); }
  function frame() {
    page.drawRectangle({ x: 24, y: 24, width: 547, height: 794, borderColor: border, borderWidth: 0.7 });
    text(`SETTLBOX.COM/INVOICE/${number}`, 40, 792, 9, false, true);
    right((invoice?.status || bill!.status).replaceAll("_", " "), 555, 792); rule(778); y = 748;
  }
  function nextPage() { page = document.addPage([595.28, 841.89]); frame(); }
  function tableHeader() { text("SUBJECT", 40, y, 9, false, true); text("QTY", 305, y); text("UNIT", 345, y); right("PRICE", 455, y); right("AMOUNT", 555, y); rule(y - 10); y -= 30; }
  frame();
  const logo = readFileSync(resolve("public/logo/settlbox-icon.svg"), "utf8");
  for (const polygon of logo.matchAll(/<polygon points="([^"]+)" fill="#([0-9a-f]{6})"\/>/gi)) {
    const points = polygon[1].split(" "), color = Number.parseInt(polygon[2], 16);
    page.drawSvgPath(`M${points[0]} ${points.slice(1).map(point => `L${point}`).join(" ")} Z`, { x: 24, y: 768, scale: 0.09, color: rgb((color >> 16) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255) });
  }
  const issuerLines = wrap(issuer.toUpperCase(), 175);
  issuerLines.forEach((line, index) => text(line, 80, y - index * 14, 9, true));
  if (invoice?.issuerCompany && invoice.issuerCompany !== issuer) wrap(invoice.issuerCompany.toUpperCase(), 175).forEach((line, index) => text(line, 80, y - (issuerLines.length + index) * 14, 9, false, true));
  text("ARC TESTNET NETWORK", 275, y); text("(TOKEN) USDC", 275, y - 17, 9, false, true);
  text(`(WALLET) ${wallet.length > 18 ? `${wallet.slice(0, 8)}...${wallet.slice(-6)}` : wallet || "-"}`, 275, y - 34, 9, false, true);
  right("(WEB) SETTLBOX.COM", 555, y - 55);
  if (invoice?.issuerEmail) wrap(`(MAIL) ${invoice.issuerEmail}`, 270).forEach((line, index) => right(line, 555, y - 72 - index * 12));
  y -= Math.max(105, issuerLines.length * 14 + 50);
  text("BILLED TO", 40, y, 9, false, true);
  const receiverLines = wrap(recipient.toUpperCase(), 245);
  receiverLines.forEach((line, index) => text(line, 40, y - 20 - index * 14, 9, true));
  wrap(invoice?.toEmail || data.user.email, 245).forEach((line, index) => text(line, 40, y - 36 - receiverLines.length * 14 - index * 13, 9, false, true));
  right(`(INVOICE DATE) ${date(invoice?.createdAt || bill!.createdAt)}`, 555, y);
  right(`(INVOICE NO) ${number}`, 555, y - 18); right(`(DUE DATE) ${date(invoice?.dueDate || bill!.dueDate)}`, 555, y - 36);
  y -= Math.max(125, receiverLines.length * 14 + 70); tableHeader();
  for (const item of items) {
    const lines = wrap(item.description.toUpperCase(), 245);
    let offset = 0;
    while (offset < lines.length) {
      if (y < 110) { nextPage(); tableHeader(); }
      const count = Math.max(1, Math.min(lines.length - offset, Math.floor((y - 80) / 14)));
      lines.slice(offset, offset + count).forEach((line, index) => text(line, 40, y - index * 14));
      if (offset === 0) {
        text(String(item.quantity), 305, y); text(invoice?.payrollContractId || bill?.invoiceUuid ? "MONTH" : "ITEM", 345, y, 9, false, true);
        right(money(item.unitPrice), 455, y); right(money(item.quantity * item.unitPrice), 555, y, true);
      }
      y -= Math.max(36, count * 14 + 16); offset += count;
      if (offset < lines.length) { nextPage(); tableHeader(); }
    }
    rule(y + 12);
  }
  if (y < 245) nextPage();
  y -= 20; text("SUBTOTAL", 345, y, 9, false, true); right(money(amount), 555, y);
  y -= 24; text("TAX (0%)", 345, y, 9, false, true); right("0.00", 555, y);
  y -= 17; rule(y); y -= 24; text("TOTAL", 345, y, 9, true); right(`${money(amount)} USDC`, 555, y, true);
  y -= 55;
  if (y < 160) nextPage();
  text("WITH BEST REGARDS,", 230, y, 9, false, true);
  const signature = clean(issuer);
  const signatureSize = Math.min(110, 490 / Math.max(bold.widthOfTextAtSize(signature, 1), 1));
  y -= signatureSize + 12;
  text(signature, (595.28 - bold.widthOfTextAtSize(signature, signatureSize)) / 2, y, signatureSize, true, true);
  if (data.invoiceSettings?.footerText) {
    y -= 20;
    for (const line of wrap(data.invoiceSettings.footerText, 510, 8)) { if (y < 60) nextPage(); text(line, 40, y, 8, false, true); y -= 12; }
  }
  document.getPages().forEach((sheet, index) => sheet.drawText(`${index + 1} / ${document.getPageCount()}`, { x: 520, y: 12, size: 8, font, color: gray }));
  return document.save();
}
