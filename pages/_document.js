import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
      <link href="/fonts/style.css" rel="stylesheet"/>
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <link 
          rel="alternate" 
          type="application/rss+xml" 
          title="RSS Feed for Markel Mencía's Blog" 
          href="/rss.xml" 
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
