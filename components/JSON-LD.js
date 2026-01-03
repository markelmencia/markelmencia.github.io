import Head from 'next/head'

export function PersonSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Markel Mencía",
    "url": "https://markelmencia.com",
    "sameAs": [
      "https://github.com/markelmencia"
    ],
    "description": "Computer Engineering undergraduate interested in system-level research and cybersecurity."
  }

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </Head>
  )
}

export function ArticleSchema({ title, description, date, url}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": title,
    "description": description,
    "datePublished": date,
    "author": {
      "@type": "Person",
      "name": "Markel Mencía",
      "url": "https://markelmencia.com"
    },
    "publisher": {
      "@type": "Person",
      "name": "Markel Mencía"
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": url
    }
  }

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </Head>
  )
}