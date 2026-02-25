import { Color, PDFFont, PDFImage, PDFPage, rgb } from 'pdf-lib';

export function writeText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  font: PDFFont,
  color = rgb(0, 0, 0),
  maxWidth?: number,
  align: 'left' | 'right' = 'left',
) {
  let finalText = text;

  // Handle max width truncation
  if (maxWidth) {
    const textWidth = font.widthOfTextAtSize(text, size);

    if (textWidth > maxWidth) {
      let truncated = text;

      while (
        truncated.length > 0 &&
        font.widthOfTextAtSize(truncated + '…', size) > maxWidth
      ) {
        truncated = truncated.slice(0, -1);
      }

      finalText = truncated + '…';
    }
  }

  // Handle right alignment
  let drawX = x;
  if (align === 'right') {
    const textWidth = font.widthOfTextAtSize(finalText, size);
    drawX = x - textWidth;
  }

  page.drawText(finalText, {
    x: drawX,
    y,
    size,
    font,
    color,
  });
}

export function writeLine(
  page: PDFPage,
  start: { x: number; y: number },
  end: { x: number; y: number },
  thickness: number,
  color?: Color,
) {
  page.drawLine({ start, end, thickness, color });
}

export function drawImage(
  page: PDFPage,
  image: PDFImage,
  x: number,
  y: number,
  width: number,
  height: number,
  opacity = 1,
) {
  page.drawImage(image, { x, y, width, height, opacity });
}

export function drawBadge(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  fontSize: number,
  bgColor: Color,
  textColor: Color,
) {
  const paddingX = 6;
  const paddingY = 3;

  const textWidth = font.widthOfTextAtSize(text, fontSize);

  page.drawRectangle({
    x: x - paddingX,
    y: y - paddingY,
    width: textWidth + paddingX * 2,
    height: fontSize + paddingY,
    color: bgColor,
  });

  page.drawText(text, { x, y, size: fontSize, font, color: textColor });
}
