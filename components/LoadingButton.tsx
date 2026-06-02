"use client";

interface LoadingButtonProps {
  loading: boolean;
  text: string;
  loadingText: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}

export default function LoadingButton({
  loading,
  text,
  loadingText,
  onClick,
  className,
  disabled,
  type = "button",
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={`
        flex items-center justify-center gap-2
        transition-all duration-300
        disabled:opacity-60 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {loading && (
        <span className="silent-loader" aria-hidden="true" />
      )}

      {loading ? loadingText : text}
    </button>
  );
}
