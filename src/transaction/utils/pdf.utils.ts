import { Color, PDFFont, PDFImage, PDFPage, rgb } from 'pdf-lib';

export function writeText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  font: PDFFont,
  color = rgb(0, 0, 0),
) {
  page.drawText(text, { x, y, size, font, color });
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
