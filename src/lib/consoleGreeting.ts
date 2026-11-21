let hasPrinted = false;

const ASCII_BANNER = `
 __        _____  ____  _  _____ _   _  ____     ____ ___  ______   __
 \\ \\      / / _ \\|  _ \\| |/ /_ _| \\ | |/ ___|   / ___/ _ \\|  _ \\ \\ / /
  \\ \\ /\\ / / | | | |_) | ' / | ||  \\| | |  _   | |  | | | | |_) \\ V / 
   \\ V  V /| |_| |  _ <| . \\ | || |\\  | |_| |  | |__| |_| |  __/ | |  
    \\_/\\_/  \\___/|_| \\_\\_|\\_\\___|_| \\_|\\____|___\\____\\___/|_|    |_|  
                                           |_____|                .md
`;

/**
 * Prints a friendly ASCII-art note in DevTools for curious engineers.
 * Guarded so React StrictMode never prints it twice.
 */
export function printConsoleGreeting() {
  if (hasPrinted || typeof window === 'undefined') return;
  hasPrinted = true;

  const wallUrl = `${window.location.origin}/wall`;
  const terminalUrl = `${window.location.origin}/terminal`;

  console.log(
    `%c${ASCII_BANNER}\n%cHey, fellow engineer 👋\n%cGlad you popped the hood open. Everything here is built with plain text, careful margins, and zero tracking scripts.\n\nIf you have a one-line rule you learned the hard way, pin it on the Wall:\n%c→ ${wallUrl}\n\n%cShortcuts: press Cmd/Ctrl+K to jump anywhere, "/" to search, "?" for shortcuts, or visit ${terminalUrl}`,
    'color: #f0642d; font-family: monospace; font-size: 10px; line-height: 1.2;',
    'color: #f2eee8; font-family: monospace; font-size: 13px; font-weight: bold;',
    'color: #b8b1a7; font-family: monospace; font-size: 11px; line-height: 1.6;',
    'color: #6ec49c; font-family: monospace; font-size: 11px; font-weight: bold;',
    'color: #968f86; font-family: monospace; font-size: 10px;',
  );
}
