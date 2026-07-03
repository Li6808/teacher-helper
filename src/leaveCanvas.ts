import { wday } from './utils';
import type { SubRow } from './types';

interface LeaveData {
  name: string;
  reason: string;
  type: string;
  days: number;
  start: Date;
  end: Date;
  sp: string;
  ep: string;
  sw: number;
  ew: number;
  subs: SubRow[];
  schoolName: string;
  semesterText: string;
}

interface TextFrag {
  text: string;
  ul?: boolean;
  ulW?: number;
  nowrap?: boolean;
}

interface Line {
  frags: Array<{ frag: TextFrag; x: number }>;
  y: number;
}

function measure(ctx: CanvasRenderingContext2D, text: string): number {
  return ctx.measureText(text).width;
}

function layoutLines(
  ctx: CanvasRenderingContext2D,
  frags: TextFrag[],
  startX: number,
  lm: number,
  rm: number,
  lineH: number,
  startY: number
): Line[] {
  const lines: Line[] = [];
  let cy = startY;
  let cx = startX;
  let currentFrags: Array<{ frag: TextFrag; x: number }> = [];

  for (const frag of frags) {
    if (frag.nowrap) {
      if (currentFrags.length > 0) {
        lines.push({ frags: currentFrags, y: cy });
        cy += lineH;
        currentFrags = [];
      }
      const w = frag.ulW || measure(ctx, frag.text);
      lines.push({ frags: [{ frag, x: lm }], y: cy });
      cy += lineH;
      cx = lm;
      continue;
    }

    const textW = measure(ctx, frag.text);
    const fragW = frag.ulW || textW;

    if (cx + fragW > rm && currentFrags.length > 0) {
      lines.push({ frags: currentFrags, y: cy });
      cy += lineH;
      currentFrags = [];
      cx = lm;
    }

    currentFrags.push({ frag, x: cx });
    cx += fragW;
  }

  if (currentFrags.length > 0) {
    lines.push({ frags: currentFrags, y: cy });
  }

  return lines;
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: Line[],
  lineH: number
) {
  for (const line of lines) {
    for (const item of line.frags) {
      const ly = line.y + lineH * 0.72;
      if (item.frag.ul && item.frag.ulW) {
        const centerX = item.x + item.frag.ulW / 2;
        ctx.textAlign = 'center';
        ctx.fillText(item.frag.text, centerX, ly);
        ctx.beginPath();
        ctx.moveTo(item.x, ly + 3);
        ctx.lineTo(item.x + item.frag.ulW, ly + 3);
        ctx.stroke();
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(item.frag.text, item.x, ly);
      }
    }
  }
}

function drawSubTable(
  ctx: CanvasRenderingContext2D,
  subs: SubRow[],
  startY: number,
  lm: number,
  cw: number
): number {
  if (subs.length === 0) return startY;

  const colX = [lm, lm + 60, lm + 130, lm + 280, lm + 430, lm + 580];
  const colW = [60, 70, 150, 150, 150, cw - lm - 580 - 40];
  const headers = ['周次', '星期', '节次', '班级科目', '代课教师', '备注'];
  const rowH = 36;
  const headerY = startY + 30;

  ctx.fillStyle = '#fde8eb';
  ctx.fillRect(lm, headerY, cw - lm - 40, rowH);
  ctx.strokeStyle = '#c41e3a';
  ctx.lineWidth = 1;
  ctx.strokeRect(lm, headerY, cw - lm - 40, rowH);

  ctx.fillStyle = '#c41e3a';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < headers.length; i++) {
    ctx.fillText(headers[i], colX[i] + colW[i] / 2, headerY + rowH / 2 + 5);
  }

  let y = headerY + rowH;
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#333';

  for (let idx = 0; idx < subs.length; idx++) {
    const s = subs[idx];
    ctx.fillStyle = idx % 2 === 0 ? '#fafafa' : '#fff';
    ctx.fillRect(lm, y, cw - lm - 40, rowH);
    ctx.strokeStyle = '#e0e0e0';
    ctx.strokeRect(lm, y, cw - lm - 40, rowH);

    ctx.fillStyle = '#333';
    const values = [
      String(s.week),
      s.dayShort,
      s.period,
      s.classSubject || '-',
      s.teacher || '-',
      ''
    ];
    for (let i = 0; i < values.length; i++) {
      ctx.fillText(values[i], colX[i] + colW[i] / 2, y + rowH / 2 + 5);
    }
    y += rowH;
  }

  return y + 20;
}

export function drawLeaveCanvasA4(canvas: HTMLCanvasElement, data: LeaveData) {
  const W = 1240;
  const lm = 80;
  const rm = W - 80;
  const ctx = canvas.getContext('2d')!;

  canvas.width = W;

  const titleF = 'bold 32px "SimHei","Microsoft YaHei","PingFang SC",sans-serif';
  const bodyF = '16px "SimSun","Songti SC","PingFang SC",serif';
  const bodyBold = 'bold 16px "SimSun","Songti SC","PingFang SC",serif';
  const hintF = '12px "SimSun","Songti SC","PingFang SC",serif';

  ctx.font = titleF;
  const title = data.schoolName + '教师请假条';
  const tw = ctx.measureText(title).width;

  ctx.font = hintF;
  const semesterW = ctx.measureText(data.semesterText).width;
  const pGap = 22;
  const lineH = 26;

  const startY = 80;
  let cy = startY;

  // Title
  ctx.font = titleF;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#000';
  ctx.fillText(title, W / 2, cy + 24);
  cy += 50;

  // Semester
  ctx.font = hintF;
  ctx.fillText(data.semesterText, W / 2, cy + 14);
  cy += pGap + 10;

  // Body content
  const sd = data.start;
  const ed = data.end;
  const sdStr = `${sd.getFullYear()}年${sd.getMonth() + 1}月${sd.getDate()}日`;
  const edStr = `${ed.getFullYear()}年${ed.getMonth() + 1}月${ed.getDate()}日`;
  const daysStr = data.days % 1 === 0 ? String(data.days) : data.days.toFixed(1);

  const frags: TextFrag[] = [
    { text: '    本人因' },
    { text: data.reason, ul: true, ulW: 320 },
    { text: '，需' },
    { text: data.type, ul: true, ulW: 80 },
    { text: '，共计' },
    { text: daysStr + '天', ul: true, ulW: 100 },
    { text: '（从' },
    { text: sdStr, ul: true, ulW: 180 },
    { text: data.sp },
    { text: '至' },
    { text: edStr, ul: true, ulW: 180 },
    { text: data.ep },
    { text: '）。特此申请，望批准！' },
  ];

  ctx.font = bodyF;
  const lines = layoutLines(ctx, frags, lm, lm, rm, lineH, cy);
  drawLines(ctx, lines, lineH);
  cy = lines[lines.length - 1].y + lineH + pGap;

  // Time info
  ctx.font = bodyF;
  ctx.textAlign = 'left';
  ctx.fillText(`第${data.sw}周 星期${wday(data.start)} 至 第${data.ew}周 星期${wday(data.end)}`, lm, cy + 16);
  cy += pGap + 10;

  // Substitute table
  if (data.subs.length > 0) {
    cy = drawSubTable(ctx, data.subs, cy, lm, W);
  }

  // Signatures
  const signY = cy + 30;
  const signGap = (W - lm * 2) / 3;
  ctx.font = bodyF;
  ctx.textAlign = 'left';

  const signs = [
    { label: '申请人：', x: lm },
    { label: data.name, x: lm + 70, ul: true, ulW: 120 },
    { label: '年级组长签字：', x: lm + signGap },
    { label: '', x: lm + signGap + 130, ul: true, ulW: 120 },
    { label: '处室负责人签字：', x: lm + signGap * 2 },
    { label: '', x: lm + signGap * 2 + 150, ul: true, ulW: 120 },
  ];

  for (const s of signs) {
    if (s.ul && s.ulW) {
      ctx.fillStyle = '#000';
      ctx.fillText(s.label, s.x, signY + 16);
      ctx.beginPath();
      ctx.moveTo(s.x, signY + 20);
      ctx.lineTo(s.x + s.ulW, signY + 20);
      ctx.stroke();
    } else {
      ctx.fillText(s.label, s.x, signY + 16);
    }
  }

  cy = signY + 50;

  // More signatures
  const signY2 = cy;
  const signs2 = [
    { label: '分管领导签字：', x: lm },
    { label: '', x: lm + 130, ul: true, ulW: 120 },
    { label: '学校领导签字：', x: W / 2 - 20 },
    { label: '', x: W / 2 + 130, ul: true, ulW: 120 },
  ];

  for (const s of signs2) {
    if (s.ul && s.ulW) {
      ctx.fillText(s.label, s.x, signY2 + 16);
      ctx.beginPath();
      ctx.moveTo(s.x, signY2 + 20);
      ctx.lineTo(s.x + s.ulW, signY2 + 20);
      ctx.stroke();
    } else {
      ctx.fillText(s.label, s.x, signY2 + 16);
    }
  }

  cy = signY2 + 50;

  // Hint
  ctx.font = hintF;
  ctx.fillStyle = '#999';
  ctx.fillText('备注：公假需附相关通知或文件；病假需附医院诊断证明；事假需提前说明原因。', lm, cy + 12);

  // Dynamic height
  const minH = 800;
  const finalH = Math.max(cy + 60, minH);
  canvas.height = finalH;

  // Redraw with correct height
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, finalH);

  // Redraw border
  ctx.strokeStyle = '#c41e3a';
  ctx.lineWidth = 2;
  ctx.strokeRect(lm - 20, 40, W - (lm - 20) * 2, finalH - 60);

  // Redraw all content
  cy = startY;
  ctx.font = titleF;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#000';
  ctx.fillText(title, W / 2, cy + 24);
  cy += 50;

  ctx.font = hintF;
  ctx.fillText(data.semesterText, W / 2, cy + 14);
  cy += pGap + 10;

  ctx.font = bodyF;
  const lines2 = layoutLines(ctx, frags, lm, lm, rm, lineH, cy);
  drawLines(ctx, lines2, lineH);
  cy = lines2[lines2.length - 1].y + lineH + pGap;

  ctx.font = bodyF;
  ctx.textAlign = 'left';
  ctx.fillText(`第${data.sw}周 星期${wday(data.start)} 至 第${data.ew}周 星期${wday(data.end)}`, lm, cy + 16);
  cy += pGap + 10;

  if (data.subs.length > 0) {
    cy = drawSubTable(ctx, data.subs, cy, lm, W);
  }

  const signY3 = cy + 30;
  for (const s of signs) {
    if (s.ul && s.ulW) {
      ctx.fillText(s.label, s.x, signY3 + 16);
      ctx.beginPath();
      ctx.moveTo(s.x, signY3 + 20);
      ctx.lineTo(s.x + s.ulW, signY3 + 20);
      ctx.stroke();
    } else {
      ctx.fillText(s.label, s.x, signY3 + 16);
    }
  }

  const signY4 = signY3 + 50;
  for (const s of signs2) {
    if (s.ul && s.ulW) {
      ctx.fillText(s.label, s.x, signY4 + 16);
      ctx.beginPath();
      ctx.moveTo(s.x, signY4 + 20);
      ctx.lineTo(s.x + s.ulW, signY4 + 20);
      ctx.stroke();
    } else {
      ctx.fillText(s.label, s.x, signY4 + 16);
    }
  }

  ctx.font = hintF;
  ctx.fillStyle = '#999';
  ctx.fillText('备注：公假需附相关通知或文件；病假需附医院诊断证明；事假需提前说明原因。', lm, signY4 + 50 + 12);
}
