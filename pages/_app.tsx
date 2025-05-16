import "../styles/globals.css";
import type { AppProps } from "next/app";
import gtag from "../lib/gtag";
import React from "react";
import { ErrorBoundary } from "../components/layout/ErrorBoundary";

gtag.initialize(process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID);

export default function App({ Component, pageProps }: AppProps) {
  return (
    <React.StrictMode>
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
