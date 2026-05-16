import { NextRequest } from 'next/server';
import { exportDocument, checkPandoc, ExportFormat, exportToHTML } from '@/lib/pandoc';
import { readDocument } from '@/lib/storage';
import fs from 'fs';

export async function POST(req: NextRequest) {
  const { docId, format } = await req.json();

  if (!docId || !format) {
    return Response.json({ error: 'docId and format required' }, { status: 400 });
  }

  const content = readDocument(docId);
  if (content === null) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }

  // Client-side formats (no Pandoc needed)
  if (format === 'txt') {
    return new Response(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${docId}.txt"`,
      },
    });
  }

  if (format === 'html') {
    const html = exportToHTML(content, docId);
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${docId}.html"`,
      },
    });
  }

  // Pandoc-dependent formats
  const hasPandoc = await checkPandoc();
  if (!hasPandoc) {
    return Response.json({
      error: 'Pandoc is required for DOCX/PDF/EPUB export. Install from https://pandoc.org/installing.html',
    }, { status: 400 });
  }

  try {
    const outputPath = await exportDocument(docId, format as ExportFormat);
    const fileBuffer = fs.readFileSync(outputPath);

    const mimeTypes: Record<string, string> = {
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      pdf: 'application/pdf',
      epub: 'application/epub+zip',
    };

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': mimeTypes[format] || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${docId}.${format}"`,
      },
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
