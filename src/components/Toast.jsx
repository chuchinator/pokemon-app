export default function Toast({ toast }) {
  return (
    <div className={`toast ${toast.visible ? 'show' : ''} ${toast.type}`}>
      {toast.msg}
    </div>
  );
}
