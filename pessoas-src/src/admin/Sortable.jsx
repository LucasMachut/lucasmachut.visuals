// Une liste qu'on réordonne en tenant la poignée ⠿ et en glissant, au doigt
// comme à la souris (événements pointer : le glisser HTML5 ne marche pas au
// toucher). L'élément suit le doigt ; on lâche, la liste prend le nouvel ordre.
import { useRef, useState } from 'react';

export default function Sortable({ items, render, onMove, fixedTop = 0, fixedBottom = 0 }) {
  const listRef = useRef(null);
  const [drag, setDrag] = useState(null);   // { from, to, dy }

  const start = (i) => (e) => {
    if (i < fixedTop || i >= items.length - fixedBottom) return;
    e.preventDefault();
    const rows = [...listRef.current.children];
    const rects = rows.map((r) => r.getBoundingClientRect());
    const y0 = e.clientY;
    let to = i;
    e.currentTarget.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const dy = ev.clientY - y0;
      const mid = rects[i].top + rects[i].height / 2 + dy;
      // nouvelle place = nombre d'éléments mobiles dont le milieu est au-dessus
      to = fixedTop;
      for (let j = fixedTop; j < items.length - fixedBottom; j++) {
        if (j !== i && mid > rects[j].top + rects[j].height / 2) to++;
      }
      setDrag({ from: i, to, dy, h: rects[i].height + 8 });
    };
    const end = () => {
      e.target.removeEventListener('pointermove', move);
      e.target.removeEventListener('pointerup', end);
      e.target.removeEventListener('pointercancel', end);
      setDrag(null);
      if (to !== i) onMove(i, to);
    };
    e.target.addEventListener('pointermove', move);
    e.target.addEventListener('pointerup', end);
    e.target.addEventListener('pointercancel', end);
    setDrag({ from: i, to: i, dy: 0, h: rects[i].height + 8 });
  };

  const shift = (j) => {
    if (!drag || j === drag.from) return 0;
    if (drag.from < drag.to && j > drag.from && j <= drag.to) return -drag.h;
    if (drag.from > drag.to && j < drag.from && j >= drag.to) return drag.h;
    return 0;
  };

  return (
    <ul className="adm-sort" ref={listRef}>
      {items.map((item, i) => {
        const fixed = i < fixedTop || i >= items.length - fixedBottom;
        const moving = drag && drag.from === i;
        return (
          <li key={i} className={`adm-sort-row${moving ? ' is-moving' : ''}${fixed ? ' is-fixed' : ''}`}
            style={{ transform: `translateY(${moving ? drag.dy : shift(i)}px)` }}>
            <span className="adm-handle" onPointerDown={start(i)} aria-label="Glisser pour déplacer" role="button">
              {fixed ? '' : '⠿'}
            </span>
            {render(item, i)}
          </li>
        );
      })}
    </ul>
  );
}
