import { useState } from "react";

export function useAdjacentColumnResize(initialWidths: number[], minimum = 72) {
  const [widths, setWidths] = useState(initialWidths);
  const startResize = (index: number, event: React.PointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const initial = [...widths];
    const move = (next: PointerEvent) => {
      const delta = next.clientX - startX;
      const adjusted = Math.max(minimum - initial[index], Math.min(delta, initial[index + 1] - minimum));
      setWidths(initial.map((width, column) => column === index ? width + adjusted : column === index + 1 ? width - adjusted : width));
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };
  return { widths, startResize, totalWidth: widths.reduce((total, width) => total + width, 0) };
}
