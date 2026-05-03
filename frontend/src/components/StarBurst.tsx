import { useEffect } from 'react';

const COLORS = [
  '#FF6B9D', // pembe
  '#C084FC', // mor
  '#60A5FA', // mavi
  '#FB923C', // turuncu
  '#FACC15', // sarı
  '#4ADE80', // yeşil
];

const SHAPES = ['★', '✦', '✸', '◆', '●', '▲'];

export default function StarBurst() {
  useEffect(() => {
    function burst(e: MouseEvent) {
      const count = Math.floor(Math.random() * 6) + 15; // 15–20 yıldız

      for (let i = 0; i < count; i++) {
        const el = document.createElement('span');

        const size     = Math.random() * 10 + 5;                     // 5–15 px
        const color    = COLORS[Math.floor(Math.random() * COLORS.length)];
        const shape    = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        const angle    = Math.random() * Math.PI * 2;                 // rastgele yön
        const distance = Math.random() * 110 + 60;                   // 60–170 px
        const dx       = Math.cos(angle) * distance;
        const dy       = Math.sin(angle) * distance;
        const spin     = (Math.random() * 720 - 360) + 'deg';        // ±360° dönüş
        const duration = 800 + Math.random() * 300;                   // 800–1100 ms

        el.textContent = shape;
        el.style.cssText = `
          position: fixed;
          left: ${e.clientX}px;
          top: ${e.clientY}px;
          font-size: ${size}px;
          color: ${color};
          pointer-events: none;
          z-index: 99999;
          user-select: none;
          line-height: 1;
          text-shadow: 0 0 8px ${color}, 0 0 16px ${color}80;
        `;

        document.body.appendChild(el);

        el.animate(
          [
            {
              transform: 'translate(-50%, -50%) scale(1.4) rotate(0deg)',
              opacity: 1,
            },
            {
              transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0) rotate(${spin})`,
              opacity: 0,
            },
          ],
          {
            duration,
            easing: 'cubic-bezier(0, 0.9, 0.57, 1)',
            fill: 'forwards',
          }
        ).onfinish = () => el.remove();
      }
    }

    document.addEventListener('dblclick', burst);
    return () => document.removeEventListener('dblclick', burst);
  }, []);

  return null;
}
