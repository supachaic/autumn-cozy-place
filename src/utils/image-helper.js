export async function getImageData(image) {
  if (!image) return;

  const width = image.width || image.naturalWidth;
  const height = image.height || image.naturalHeight;
  if (!width || !height) return;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return;

  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;

  const data = new Float32Array(width * height);
    for (let i = 0; i < data.length; i++) {
      data[i] = pixels[i * 4] / 255;
    }

  return { data, width, height };
}