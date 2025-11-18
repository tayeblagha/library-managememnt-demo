import React from "react";

type SpinnerProps = {
  size?: number; // px
  message?: string;
  className?: string;
};

export default function Spinner({
  size = 32,
  message,
  className = "",
}: SpinnerProps) {

  
  const borderSize = Math.max(2, Math.round(size / 16));
  const style: React.CSSProperties = {
    height: size,
    width: size,
    borderWidth: borderSize,
  };

  return (
    <div
      className={`flex flex-col items-center ${className}`}
     
    >
      <div
        className="inline-block animate-spin rounded-full border-t-2 border-b-2"
        style={style}
        role="status"
      />
      {message && <p className="mt-2 text-gray-600 text-sm">{message}</p>}
    </div>
  );
}
