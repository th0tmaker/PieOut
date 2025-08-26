// Create a custom tooltip that displays an user message when you hover the mouse over an element
export const Tooltip = ({ children, message }: { children: React.ReactNode; message: React.ReactNode }) => (
  <div className="group inline-block relative">
    <span className="text-gray-400 cursor-help">{children}</span>
    <div className="absolute left-full top-full -ml-10 mt-4 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
      {message}
    </div>
  </div>
)
