import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { marked } from 'marked';
import { WORKSPACE_DIR, getExportPath } from './storage';

const execAsync = promisify(exec);

export type ExportFormat = 'docx' | 'pdf' | 'epub' | 'html' | 'txt';

export async function exportDocument(
  docId: string,
  format: ExportFormat
): Promise<string> {
  const inputPath = path.join(WORKSPACE_DIR, `${docId}.md`);
  const outputPath = getExportPath(docId, format);

  const formatArgs: Record<ExportFormat, string> = {
    docx: '-t docx',
    pdf: '--pdf-engine=xelatex -t pdf',
    epub: '-t epub',
    html: '-t html5 --standalone',
    txt: '-t plain',
  };

  const cmd = `pandoc "${inputPath}" ${formatArgs[format]} -o "${outputPath}"`;

  try {
    await execAsync(cmd);
    return outputPath;
  } catch (err: unknown) {
    const error = err as { message?: string; code?: number };
    if (error.message?.includes('not found') || error.code === 127) {
      throw new Error(
        'Pandoc is not installed. Please install it from https://pandoc.org/installing.html'
      );
    }
    throw err;
  }
}

export async function checkPandoc(): Promise<boolean> {
  try {
    await execAsync('pandoc --version');
    return true;
  } catch {
    return false;
  }
}

export function exportToHTML(content: string, title: string): string {
  const looksLikeHtml = /^<[a-z][\s\S]*>/i.test(content.trim());
  const body = looksLikeHtml ? content : marked.parse(content);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { max-width: 720px; margin: 40px auto; font-family: Georgia, serif;
           line-height: 1.8; color: #333; }
    h1, h2, h3 { color: #111; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 16px; border-radius: 6px; overflow-x: auto; }
  </style>
</head>
<body>${body}</body>
</html>`;
}
