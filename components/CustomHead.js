import Head from 'next/head'

export default function CustomHead({
  title = 'Markel Mencía',
  description = 'Computer Engineering undergraduate interested in system-level research and cybersecurity.',
  canonical = 'https://markelmencia.com',
  ogImage = 'https://markelmencia.com/img/logo.png',
  ogType = 'website',
  twitterCard = 'summary_large_image',
  author = 'Markel Mencía',
  publishedTime,
}) {
  var fullTitle = "Markel Mencía"
  if (title != "Markel Mencía") {
    fullTitle = `${title} | Markel Mencía`
  }

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="author" content={author} />
      <link rel="canonical" href={canonical} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Markel Mencía" />
      <meta property="og:locale" content="en_US" />

      {publishedTime && (<meta property="article:published_time" content={publishedTime} />)}

      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      <meta name="robots" content="index, follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
    </Head>
  )
}