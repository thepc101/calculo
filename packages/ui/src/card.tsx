import { cn } from './utils';

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-800 bg-zinc-900/50 p-6',
        className,
      )}
    >
      {children}
    </div>
  );
}
