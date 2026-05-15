export function fmt(n) {
  return (
    '€' +
    (Math.round((n || 0) * 100) / 100).toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
