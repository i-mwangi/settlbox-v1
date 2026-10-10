import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { renderWorkspacePdf } from '../services/server/workspace-pdf.ts';
const data = JSON.parse(readFileSync('public/demo-data-entity-3.json','utf8'));
const invoice = data.invoices[0];
invoice.invoiceNumber = 'INV-PREVIEW-001'; invoice.amount=0.001; invoice.amountExact='0.001'; invoice.currency='USDC'; invoice.from='Pods Finance'; invoice.to='Browser QA Client'; invoice.recipient='0x5807412f16da9077917270ebd157f30f2ab94da1'; invoice.items=[{description:'Browser draft verification',quantity:1,unitPrice:0.001}];
mkdirSync('output/pdf',{recursive:true});
writeFileSync('output/pdf/invoice-preview.pdf',await renderWorkspacePdf(data,invoice.uuid));
