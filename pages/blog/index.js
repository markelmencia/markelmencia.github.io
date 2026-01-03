import fs from "fs"
import matter from "gray-matter"
import { useState } from "react"
import Header from "@/components/Header"
import PostDescription from "@/components/PostDescription"
import CustomHead from "@/components/CustomHead"
import { PersonSchema } from "@/components/JSON-LD"

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
        <CustomHead
          title="Blog"
          description="The blogs I've written over the years, about both Computer Science and other non-related topics."
          canonical="https://markelmencia.com/blog"
        />
        <PersonSchema/>
        <Header/>
        <h1 className="page-title">Blog</h1>
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