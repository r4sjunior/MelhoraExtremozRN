// Prepara fotos no aparelho: reduz, regrava em JPEG (o que elimina metadados como GPS) e converte HEIC de iPhone.

function ehHeic(f: File) {
  return /heic|heif/i.test(f.type || '') || /\.(heic|heif)$/i.test(f.name || '');
}

function reduzir(arquivo: Blob, ladoMax = 1600, qualidade = 0.82): Promise<Blob> {
  return new Promise((ok, falha) => {
    const img = new Image();
    const u = URL.createObjectURL(arquivo);
    img.onload = () => {
      const s = Math.min(1, ladoMax / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      c.toBlob((b) => (b ? ok(b) : falha(new Error('conversão'))), 'image/jpeg', qualidade);
    };
    img.onerror = () => { URL.revokeObjectURL(u); falha(new Error('imagem')); };
    img.src = u;
  });
}

export async function prepararFoto(f: File): Promise<Blob> {
  try {
    return await reduzir(f);
  } catch (e) {
    if (!ehHeic(f)) throw e;
    const { default: heic2any } = await import('heic2any');
    const saida = await heic2any({ blob: f, toType: 'image/jpeg', quality: 0.85 });
    return reduzir(Array.isArray(saida) ? saida[0] : saida);
  }
}

export const aceitaFoto = (f: File) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name || '');
