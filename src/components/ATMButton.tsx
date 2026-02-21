import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ATMButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "secondary" | "mtn" | "zamtel" | "airtel" | "danger" | "numpad";
  size?: "default" | "sm" | "lg" | "numpad";
}

const variantClasses: Record<string, string> = {
  default: "bg-muted text-foreground border-border hover:bg-border hover:shadow-[var(--glow-green)]",
  primary: "bg-primary text-primary-foreground border-primary hover:brightness-110 hover:shadow-[var(--glow-green)]",
  secondary: "bg-secondary text-secondary-foreground border-secondary hover:brightness-110 hover:shadow-[var(--glow-amber)]",
  mtn: "bg-mtn text-secondary-foreground border-mtn hover:brightness-110",
  zamtel: "bg-zamtel text-primary-foreground border-zamtel hover:brightness-110",
  airtel: "bg-airtel text-destructive-foreground border-airtel hover:brightness-110",
  danger: "bg-destructive text-destructive-foreground border-destructive hover:brightness-110",
  numpad: "bg-muted text-foreground border-border hover:bg-primary hover:text-primary-foreground active:scale-95",
};

const sizeClasses: Record<string, string> = {
  default: "px-4 py-2 text-sm",
  sm: "px-3 py-1.5 text-xs",
  lg: "px-6 py-3 text-base",
  numpad: "w-16 h-12 text-lg font-display",
};

const ATMButton = ({
  variant = "default",
  size = "default",
  className,
  children,
  ...props
}: ATMButtonProps) => {
  return (
    <button
      className={cn(
        "font-mono rounded border-2 transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export default ATMButton;
