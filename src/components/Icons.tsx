type IconProps = { name: "home" | "box" | "plus" | "menu" | "search" | "shopping-cart" | "truck" | "edit" | "trash"; size?: number };

export function Icon({ name, size = 20 }: IconProps) {
  const paths = {
    home: <path d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5h-5.8v-6.3H9.3V21H3.5a.5.5 0 0 1-.5-.5z" />,
    box: <path d="m4 7 8-4 8 4v10l-8 4-8-4zm0 0 8 4m8-4-8 4m0 10V11M8 5l8 4" />,
    plus: <path d="M12 5v14M5 12h14" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    search: <path d="m20 20-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0" />,
    "shopping-cart": <path d="M9 20a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm11 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM3 3h2.3l2.8 11.2a2 2 0 0 0 2 1.5h8a2 2 0 0 0 1.9-1.4l1.6-6.3H7.7" />,
    truck: <path d="M10 17h4V5H2v12h3m10 0h3a2 2 0 0 0 2-2v-4l-3-4h-2M5 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />,
    edit: <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
    trash: <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />,
  };

  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
