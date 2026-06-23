/**
 * A container component that adds a "Demo Only" ribbon to the top-right corner.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - The content to display inside the container.
 */
export function DemoRibbon({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden border border-gray-300 rounded-lg shadow-lg">
      {/* Content Area */}
      <div>{children}</div>

      {/* The Ribbon Element */}
      <div className="z-100 w-sm fixed top-0 right-0 transform translate-x-[32%] translate-y-[225%] rotate-45">
        <span className="block bg-red-600 text-white text-center text-sm font-semibold tracking-wider uppercase px-8 py-1 shadow-md">
          Demo Only
        </span>
      </div>
    </div>
  );
}
