// server-only's real package throws unconditionally unless resolved via
// Next.js's "react-server" bundler condition — outside that, aliased here
// to a no-op so server-side modules can be imported directly in tests.
export {};
