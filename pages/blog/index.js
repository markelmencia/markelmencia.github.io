import fs from "fs"
import matter from "gray-matter"
import { useState } from "react"
import Header from "@/components/Header"
import PostDescription from "@/components/PostDescription"
import Head from "next/head"

export async function getStaticProps() {
  const files = fs.readdirSync("posts")
  const posts = files.map((filename) => {
    const slug = filename.replace(".md", "")
    const readFiles = fs.readFileSync(`posts/${filename}`)
    const {data: frontMatter} = matter(readFiles)
    
    return {
      slug, frontMatter
    }
  })

  const sorted = posts.sort((a, b) => {
    return new Date(b.frontMatter.date) - new Date(a.frontMatter.date)
  })

  return {
    props: {
      posts: sorted
    }
  }
}

function Blogs({posts}) {
    const [query, setQuery] = useState("")

    const filteredPosts = posts.filter((post) => {
    const searchLower = query.toLowerCase()
    const titleMatch = post.frontMatter.title?.toLowerCase().includes(searchLower)
    const descMatch = post.frontMatter.description?.toLowerCase().includes(searchLower)
    
    return titleMatch || descMatch
  })

    return <div>
        <Head>
          <title>Blog - Markel Mencía</title>
          <meta property="og:title" content="Blog - Markel Mencía"/>
          <meta property="og:description" content="The blogs I've written over the years, about both Computer Science and other non-related topics."/>
          <meta property="og:type" content="website"/>
          <meta property="og:url" content="https://markelmencia.com/blog"/>
          <meta property="og:image" content="https://markelmencia.com/img/logo.png"/>
        </Head>
        <Header/>
        <h1 className="page-title">Blogs</h1>
        <input value={query} onChange={(e) => setQuery(e.target.value)} className="search-bar" type="text" placeholder="Search..."></input>
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => {
            return (
              <PostDescription key={post.slug} title={post.frontMatter.title} date={post.frontMatter.date} slug={post.slug} desc={post.frontMatter.description} type="blog"
              />
            )
          })
        ) : (
          <p className="no-posts-found">No posts found for "{query}"</p>
        )}
      </div>
}

export default Blogs