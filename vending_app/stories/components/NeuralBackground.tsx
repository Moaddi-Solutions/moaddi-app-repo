export function NeuralBackground() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-10">
      <defs>
        <linearGradient
          id="neuralGradient1"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#2cb4cc" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#7287e2" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient
          id="neuralGradient2"
          x1="100%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#7287e2" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#e0bd5f" stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {/* Connection Lines */}
      <line
        x1="10%"
        y1="20%"
        x2="90%"
        y2="30%"
        stroke="url(#neuralGradient1)"
        strokeWidth="1"
      />
      <line
        x1="20%"
        y1="40%"
        x2="80%"
        y2="60%"
        stroke="url(#neuralGradient2)"
        strokeWidth="1"
      />
      <line
        x1="30%"
        y1="70%"
        x2="70%"
        y2="40%"
        stroke="url(#neuralGradient1)"
        strokeWidth="1"
      />
      <line
        x1="50%"
        y1="10%"
        x2="60%"
        y2="90%"
        stroke="url(#neuralGradient2)"
        strokeWidth="1"
      />
      {/* Nodes */}
      <circle cx="10%" cy="20%" r="7" fill="#2cb4cc" opacity="0.9">
        <animate
          attributeName="opacity"
          values="0.3;0.8;0.3"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="20%" cy="40%" r="7" fill="#e0bd5f" opacity="0.9">
        <animate
          attributeName="opacity"
          values="0.5;0.9;0.5"
          dur="2.5s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="60%" cy="90%" r="7" fill="#e0bd5f" opacity="0.9">
        <animate
          attributeName="opacity"
          values="0.5;0.9;0.5"
          dur="2.5s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="30%" cy="70%" r="7" fill="#2cb4cc" opacity="0.9">
        <animate
          attributeName="opacity"
          values="0.9;0.4;0.9"
          dur="2.5s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}
