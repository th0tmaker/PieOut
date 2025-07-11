import ReactDOM from 'react-dom'

function BlurbPortal({ title, text, onClose }: { title: string; text: string | React.ReactNode; onClose: () => void }) {
  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal-overlay" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-lg p-6 max-w-md mx-4 border-2 border-pink-400 relative z-tooltip"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-bold text-white text-2xl text-center underline mb-2">
          <h1>{title}</h1>
        </div>
        <div className="mb-4">{text}</div>
        <div className="flex justify-center">
          <button
            className="mt-2 px-4 py-2 bg-pink-600 text-white rounded hover:bg-lime-700 transition-colors duration-200"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.getElementById('modal-root')!,
  )
}

export default BlurbPortal
