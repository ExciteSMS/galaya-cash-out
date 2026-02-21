import { ReactNode } from "react";

interface ATMScreenProps {
  children: ReactNode;
}

const ATMScreen = ({ children }: ATMScreenProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      {/* ATM Machine Frame */}
      <div className="w-full max-w-md">
        {/* Top bezel */}
        <div className="bg-muted rounded-t-lg border border-border p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-display text-xs text-primary tracking-[0.3em] uppercase">
              Galaya Payment Solution
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground">v2.1</div>
        </div>

        {/* Screen area */}
        <div className="relative bg-card border-x border-border overflow-hidden atm-scanline">
          <div className="p-6 min-h-[480px] flex flex-col">
            {children}
          </div>
        </div>

        {/* Bottom bezel with card slot */}
        <div className="bg-muted rounded-b-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-6 h-1 rounded-full bg-border" />
              ))}
            </div>
            <div className="w-16 h-3 rounded-sm bg-background border border-border" />
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-6 h-1 rounded-full bg-border" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ATMScreen;
