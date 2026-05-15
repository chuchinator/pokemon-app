export default function Lightbox({ src, onClose }) {
  if (!src) return null;

  return (
    <div className="lightbox open" onClick={onClose} role="presentation">
      <img src={src} alt="" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
