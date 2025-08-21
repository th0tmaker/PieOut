//src/components/AboutPortal.tsx
import ReactDOM from 'react-dom'

// Define an about portal that will act as an modal overlay on which to display details about the main modal underneath
function AboutPortal({ title, text, onClose }: { title: string; text: string | React.ReactNode; onClose: () => void }) {
  return ReactDOM.createPortal(
    // Outer overlay: covers the whole screen, semi-transparent black background, closes modal when clicked
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal-overlay" onClick={onClose}>
      {/* Inner modal container: stops click propagation so clicking inside does not close the modal */}
      <div
        className="bg-slate-800 rounded-lg p-6 max-w-md mx-4 border-2 border-pink-400 relative z-tooltip"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal title: bold, large, underlined, centered */}
        <div className="font-bold text-white text-2xl text-center underline mb-2">
          <h1>{title}</h1>
        </div>
        {/* Modal content: displays the text or JSX content passed in */}
        <div className="mb-4">{text}</div>
        {/* Button container: centers the Close button */}
        <div className="flex justify-center">
          <button
            className="mt-2 px-4 py-2 bg-pink-600 text-white rounded hover:bg-lime-700 transition-colors duration-200"
            onClick={onClose} // Close the modal when button is clicked
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.getElementById('modal-root')!, // Render the portal into the #modal-root element
  )
}

export default AboutPortal
