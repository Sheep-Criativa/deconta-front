import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BaseCardProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export function BaseCard({ children, className, id }: BaseCardProps) {
  return (
    <div
      id={id}
      className={cn(
        "bg-white rounded-2xl p-6 shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}
