// 支付截图模块的辅助函数

export interface TimeEntry {
  id: string;
  date: string;
  timeSlot: '早上' | '中午' | '晚上';
  finalTime: string;
  editedSrc: string;
}

export function generateDoubaoPrompt(entries: TimeEntry[]): string {
  const timeList = entries.map((e, i) => {
    const timeStr = e.finalTime.trim() || autoGenerateTime(e.date, e.timeSlot);
    return `第${i + 1}张：${timeStr}（${e.timeSlot}）`;
  }).join('\n');

  return `你是一个专业的图片编辑助手。请帮我修改以下微信零钱明细截图中的支付时间/转账时间，其他所有内容保持不变。

【修改要求】
1. 只修改"支付时间"或"转账时间"后面的时间值，其他文字、图标、布局完全不动
2. 修改后的字体、大小、颜色、位置要和原图完全一致，看不出来修改过
3. 时间格式保持：XXXX年X月X日 XX:XX:XX
4. 如果原图有"转账时间"标签，就修改转账时间；如果是"支付时间"标签，就修改支付时间

【每张截图要修改的时间】
${timeList}

【输出要求】
- 直接输出修改后的图片
- 保持原图的分辨率和清晰度
- 不要添加任何水印、标记、边框或其他装饰`;
}

function autoGenerateTime(date: string, slot: '早上' | '中午' | '晚上'): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  let hour: number;
  if (slot === '早上') hour = 7 + Math.floor(Math.random() * 2);
  else if (slot === '中午') hour = 12 + Math.floor(Math.random() * 2);
  else hour = 17 + Math.floor(Math.random() * 2);
  const minute = Math.floor(Math.random() * 60).toString().padStart(2, '0');
  const second = Math.floor(Math.random() * 60).toString().padStart(2, '0');
  return `${year}年${month}月${day}日 ${hour.toString().padStart(2, '0')}:${minute}:${second}`;
}

// 裁剪图片底部（去除水印）
export function cropImageBottom(src: string, cropPercent: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const cropH = Math.floor(img.height * cropPercent / 100);
      canvas.width = img.width;
      canvas.height = img.height - cropH;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('No context')); return; }
      ctx.drawImage(img, 0, 0, img.width, img.height - cropH, 0, 0, img.width, img.height - cropH);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Load failed'));
    img.src = src;
  });
}

// 导出A4图片排版
export async function exportA4PureImages(
  imageSrcs: string[],
  colsPerRow: number,
  rowsPerPage: number
): Promise<string[]> {
  const a4w = 794;
  const a4h = 1123;
  const margin = 30;
  const gap = 10;
  const imgW = (a4w - margin * 2 - gap * (colsPerRow - 1)) / colsPerRow;
  const imgH = (a4h - margin * 2 - gap * (rowsPerPage - 1)) / rowsPerPage;
  const perPage = colsPerRow * rowsPerPage;

  const pages: string[] = [];

  for (let p = 0; p < imageSrcs.length; p += perPage) {
    const canvas = document.createElement('canvas');
    canvas.width = a4w;
    canvas.height = a4h;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, a4w, a4h);

    const pageImages = imageSrcs.slice(p, p + perPage);
    for (let i = 0; i < pageImages.length; i++) {
      const row = Math.floor(i / colsPerRow);
      const col = i % colsPerRow;
      const x = margin + col * (imgW + gap);
      const y = margin + row * (imgH + gap);

      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, x, y, imgW, imgH);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = pageImages[i];
      });
    }

    pages.push(canvas.toDataURL('image/png'));
  }

  return pages;
}

// 打开打印窗口
export function openPrintWindow(
  imageSrcs: string[],
  colsPerRow: number,
  rowsPerPage: number
) {
  const win = window.open('', '_blank');
  if (!win) return;

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>截图排版打印</title>
<style>
@page { size: A4; margin: 10mm; }
body { margin: 0; padding: 0; font-family: sans-serif; }
.page { width: 210mm; height: 297mm; padding: 10mm; box-sizing: border-box; page-break-after: always; display: grid; }
.page:last-child { page-break-after: auto; }
.img { width: 100%; height: 100%; object-fit: contain; border: 1px solid #eee; }
.back-btn { position: fixed; top: 10px; left: 10px; padding: 8px 16px; background: #c62828; color: #fff; border: none; border-radius: 6px; cursor: pointer; z-index: 1000; }
@media print { .back-btn { display: none !important; } .page { padding: 5mm; } }
</style></head><body>
<button class="back-btn" onclick="window.close()">← 返回</button>`;

  const perPage = colsPerRow * rowsPerPage;
  const gap = '5mm';
  const gridStyle = `grid-template-columns: repeat(${colsPerRow}, 1fr); grid-template-rows: repeat(${rowsPerPage}, 1fr); gap: ${gap};`;

  for (let p = 0; p < imageSrcs.length; p += perPage) {
    html += `<div class="page" style="${gridStyle}">`;
    const pageImages = imageSrcs.slice(p, p + perPage);
    for (const src of pageImages) {
      html += `<img class="img" src="${src}" />`;
    }
    // Fill empty slots
    for (let i = pageImages.length; i < perPage; i++) {
      html += `<div></div>`;
    }
    html += `</div>`;
  }

  html += `</body></html>`;
  win.document.write(html);
  win.document.close();
}
