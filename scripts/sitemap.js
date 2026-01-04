import fs from 'fs'
import matter from 'gray-matter'

function generateSitemap() {
  const postFiles = fs.readdirSync('posts')
  const posts = postFiles.map((filename) => {
    const slug = filename.replace('.md', '')
    const readFiles = fs.readFileSync(`posts/${filename}`, 'utf-8')
    const { data: frontMatter } = matter(readFiles)
    return { slug, date: frontMatter.date, type: 'blog' }
  })
  
  const writeupFiles = fs.readdirSync('writeups')
  const writeups = writeupFiles.map((filename) => {
    const slug = filename.replace('.md', '')
    const readFiles = fs.readFileSync(`writeups/${filename}`, 'utf-8')
    const { data: frontMatter } = matter(readFiles)
    return { slug, date: frontMatter.date, type: 'writeups' }
  })
  
  const allPosts = [...posts, ...writeups]
  
  const staticPages = [
    { url: '', changefreq: 'weekly', priority: '1.0' },
    { url: '/blog', changefreq: 'weekly', priority: '0.9' },
    { url: '/writeups', changefreq: 'weekly', priority: '0.9' },
    { url: '/projects', changefreq: 'weekly', priority: '0.8' },
  ]
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(page => `  <url>
    <loc>https://markelmencia.com${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
${allPosts.map(post => `  <url>
    <loc>https://markelmencia.com/${post.type}/${post.slug}</loc>
    <lastmod>${post.date}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n')}
</urlset>`
  
  fs.writeFileSync('./public/sitemap.xml', sitemap)
}

generateSitemap()