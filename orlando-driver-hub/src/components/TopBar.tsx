import { LogIn, LogOut, RefreshCw, SlidersHorizontal } from 'lucide-react';
import type { User } from 'firebase/auth';
import { Button } from './ui';

export function TopBar(props: {
  weekLabel: string;
  timeLabel: string;
  canRegenerate: boolean;
  loading: boolean;
  onRegenerate: () => void;
  onSetup: () => void;
  user: User | null;
  firebaseEnabled: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 bg-canvas/95 backdrop-blur-none border-b border-slate-800/90">
      <div className="h-14 px-4 md:px-6 grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="grid place-items-center h-7 w-7 rounded-md bg-amber text-slate-950 text-xs font-extrabold">OD</span>
          <span className="font-bold text-white tracking-tight whitespace-nowrap hidden sm:inline">Orlando Driver Hub</span>
        </div>
        <div className="num text-[11px] sm:text-xs text-slate-400 text-center truncate">
          WEEK OF <span className="text-slate-200">{props.weekLabel.toUpperCase()}</span>
          <span className="text-slate-600"> · </span>
          <span className="text-amber">{props.timeLabel} ET</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" onClick={props.onRegenerate} disabled={!props.canRegenerate} title="Regenerate with a fresh web search">
            <RefreshCw className={`h-4 w-4 ${props.loading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Regenerate</span>
          </Button>
          <Button variant="ghost" onClick={props.onSetup} title="Setup">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden md:inline">Setup</span>
          </Button>
          {props.firebaseEnabled &&
            (props.user ? (
              <Button variant="ghost" onClick={props.onSignOut} title="Sign out">
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Sign Out</span>
              </Button>
            ) : (
              <Button variant="ghost" onClick={props.onSignIn} title="Sign in with Google">
                <LogIn className="h-4 w-4" />
                <span className="hidden md:inline">Sign In</span>
              </Button>
            ))}
        </div>
      </div>
    </header>
  );
}
