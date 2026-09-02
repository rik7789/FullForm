import { useRef, useState } from 'react'

export default function Button({
  children,
  href,
  variant = 'solid',   // solid | outline | ghost
  size = 'md',         // md | lg
  onClick,
  className = '',
  ...props
}) {
  const [ripples, setRipples] = useState([])
  const ref = useRef(null)

  function handleClick(e) {
    const rect = ref.current.getBoundingClientRect()
    const id = Date.now() + Math.random()
    const ripple = { id, x: e.clientX - rect.left, y: e.clientY - rect.top }
    setRipples((r) => [...r, ripple])
    onClick && onClick(e)
  }

  const Tag = href ? 'a' : 'button'

  return (
    <Tag
      ref={ref}
      href={href}
      onClick={handleClick}
      className={`btn btn--${variant} btn--${size} ${className}`}
      {...props}
    >
      <span className="btn__label">{children}</span>
      {ripples.map((r) => (
        <span
          key={r.id}
          className="ripple"
          style={{ left: r.x, top: r.y }}
          onAnimationEnd={() =>
            setRipples((cur) => cur.filter((rp) => rp.id !== r.id))
          }
        />
      ))}
    </Tag>
  )
}
